import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/github";
import { upsertUser } from "@/lib/supabase";

function getAppUrl(req: NextRequest): string {
  const host = req.headers.get("host") || process.env.NEXT_PUBLIC_VERCEL_URL || "";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const appUrl = getAppUrl(req);

  if (!code) {
    return NextResponse.redirect(`${appUrl}/?error=no_code`);
  }

  try {
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_APP_CLIENT_ID,
          client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(`${appUrl}/?error=token_failed`);
    }

    const ghUser = await getAuthenticatedUser(tokenData.access_token);

    await upsertUser({
      github_id: ghUser.id,
      github_username: ghUser.login,
      github_avatar_url: ghUser.avatar_url,
      github_access_token: tokenData.access_token,
    });

    const session = await getSession();
    session.user = {
      githubId: ghUser.id,
      username: ghUser.login,
      avatarUrl: ghUser.avatar_url,
      accessToken: tokenData.access_token,
    };
    await session.save();

    return NextResponse.redirect(`${appUrl}/start`);
  } catch {
    return NextResponse.redirect(`${appUrl}/?error=auth_failed`);
  }
}
