import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/auth/session";

const PUBLIC_ROUTES = ["/login", "/change-password"];
const STATIC_PREFIXES = ["/_next", "/icon-", "/sw.js", "/manifest", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and public routes
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Check session
  const token = request.cookies.get("session")?.value;
  const session = token ? await decrypt(token) : null;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin route protection
  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  // Root redirect
  if (pathname === "/") {
    const target = session.role === "admin" ? "/admin" : "/app";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
