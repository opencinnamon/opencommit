import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { AppSession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/start")) {
    const session = await getIronSession<AppSession>(req.cookies, res.cookies, {
      password: process.env.SESSION_SECRET as string,
      cookieName: "opencommit_session",
    });

    if (!session.user) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/start/:path*"],
};
