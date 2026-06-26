import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getRepoContents, checkRepoAccess } from "@/lib/github";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const path = searchParams.get("path") || "";

  if (!owner || !repo) {
    return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
  }

  const session = await getSession();

  const publicToken = process.env.GITHUB_PUBLIC_TOKEN || "";

  let token = publicToken;
  let canWrite = false;

  if (session.user) {
    const access = await checkRepoAccess(session.user.accessToken, owner, repo);
    if (access.isPrivate && !access.canRead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    token = session.user.accessToken;
    canWrite = access.canWrite;
  }

  try {
    const contents = await getRepoContents(token || session.user?.accessToken || "", owner, repo, path);
    return NextResponse.json({ contents, canWrite });
  } catch {
    return NextResponse.json({ error: "Failed to fetch contents" }, { status: 500 });
  }
}
