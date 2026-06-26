import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { checkRepoAccess, getRepoContents } from "@/lib/github";
import RepoClient from "./RepoClient";

interface Props {
  params: Promise<{ user: string; repo: string }>;
}

export default async function RepoPage({ params }: Props) {
  const { user, repo } = await params;
  const session = await getSession();

  const token = session.user?.accessToken;

  if (!token) {
    const res = await fetch(
      `https://api.github.com/repos/${user}/${repo}`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) notFound();
    const data = await res.json();
    if (data.private) notFound();

    const contents = await getRepoContents("", user, repo, "").catch(() => []);

    return (
      <RepoClient
        owner={user}
        repoName={repo}
        initialContents={contents}
        canWrite={false}
        sessionUser={null}
      />
    );
  }

  const access = await checkRepoAccess(token, user, repo);
  if (!access.canRead) notFound();

  const contents = await getRepoContents(token, user, repo, "").catch(() => []);

  return (
    <RepoClient
      owner={user}
      repoName={repo}
      initialContents={contents}
      canWrite={access.canWrite}
      sessionUser={{ username: session.user!.username, avatarUrl: session.user!.avatarUrl }}
    />
  );
}
