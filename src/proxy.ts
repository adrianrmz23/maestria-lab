import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, accessTokenFor, getAccessPassword } from "@/lib/access/personal-gate";

export function proxy(request: NextRequest) {
  const password = getAccessPassword();
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/acceso" || pathname.startsWith("/api/access/")) return NextResponse.next();

  const provided = request.cookies.get(ACCESS_COOKIE)?.value;
  if (provided === accessTokenFor(password)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Maestría Lab está protegido. Inicia sesión para continuar." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/acceso";
  url.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
