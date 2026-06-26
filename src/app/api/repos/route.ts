import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserRepos, getOrgRepos } from "@/lib/github";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org");

  try {
    const repos = org
      ? await getOrgRepos(session.user.accessToken, org)
      : await getUserRepos(session.user.accessToken);
    return NextResponse.json(repos);
  } catch {
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
  }
}
