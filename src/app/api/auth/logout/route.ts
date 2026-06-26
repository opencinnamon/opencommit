import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  session.destroy();
  const appUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return NextResponse.redirect(`${appUrl}/`);
}
