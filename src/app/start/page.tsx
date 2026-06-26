import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserOrgs } from "@/lib/github";
import StartClient from "./StartClient";

export default async function StartPage() {
  const session = await getSession();
  if (!session.user) redirect("/");

  const orgs = await getUserOrgs(session.user.accessToken).catch(() => []);

  return (
    <StartClient
      username={session.user.username}
      avatarUrl={session.user.avatarUrl}
      orgs={orgs}
    />
  );
}
