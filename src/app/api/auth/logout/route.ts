import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

function getAppUrl(req: NextRequest): string {
  const host = req.headers.get("host") || process.env.NEXT_PUBLIC_VERCEL_URL || "";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(getAppUrl(req));
}
