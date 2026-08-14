import { NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/access/personal-gate";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
