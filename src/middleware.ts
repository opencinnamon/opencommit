import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/start")) {
    const cookie = req.cookies.get("opencommit_session");
    if (!cookie?.value) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/start/:path*"],
};
