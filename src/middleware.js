import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const ADMIN_ONLY = [
  "/dashboard/requests",
  "/dashboard/allocations",
  "/dashboard/overdue",
  "/dashboard/inventory",
  "/dashboard/scan",
  "/dashboard/audit",
];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const session = token ? verifyToken(token) : null;

  if (pathname === "/login" && session) {
    const home = session.role === "admin" ? "/dashboard" : "/dashboard/catalog";
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== "admin") {
      // dashboard root is the admin analytics view; students land on the catalog
      if (pathname === "/dashboard" || ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL("/dashboard/catalog", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
