import { NextResponse } from "next/server";
import { ACCESS_COOKIE, accessTokenFor, getAccessPassword, isValidAccessPassword } from "@/lib/access/personal-gate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const configured = getAccessPassword();
  if (!configured) return NextResponse.json({ ok: true, gateEnabled: false });

  let body: { password?: string } = {};
  try { body = await request.json(); } catch { /* respuesta controlada abajo */ }
  const candidate = body.password?.trim() || "";
  if (!candidate || !isValidAccessPassword(candidate)) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, gateEnabled: true });
  response.cookies.set(ACCESS_COOKIE, accessTokenFor(configured), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
