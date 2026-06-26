import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  checkRepoAccess,
  createOrUpdateFile,
  deleteFile,
  getFileContent,
} from "@/lib/github";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const path = searchParams.get("path");

  if (!owner || !repo || !path) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const session = await getSession();
  const token = session.user?.accessToken;

  if (!token) {
    const ghRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!ghRes.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = await ghRes.json();
    return NextResponse.json({ ...data, canWrite: false });
  }

  try {
    const access = await checkRepoAccess(token, owner, repo);
    if (access.isPrivate && !access.canRead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data = await getFileContent(token, owner, repo, path);
    return NextResponse.json({ ...data, canWrite: access.canWrite });
  } catch {
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { owner, repo, path, content, message, sha } = await req.json();
  if (!owner || !repo || !path || content === undefined || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const access = await checkRepoAccess(session.user.accessToken, owner, repo);
    if (!access.canWrite) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await createOrUpdateFile(
      session.user.accessToken,
      owner,
      repo,
      path,
      content,
      message,
      sha
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { owner, repo, path, sha, message } = await req.json();
  if (!owner || !repo || !path || !sha || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const access = await checkRepoAccess(session.user.accessToken, owner, repo);
    if (!access.canWrite) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await deleteFile(session.user.accessToken, owner, repo, path, sha, message);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
