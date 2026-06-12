import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_ONLY = [
  "/dashboard/requests",
  "/dashboard/allocations",
  "/dashboard/overdue",
  "/dashboard/inventory",
  "/dashboard/scan",
  "/dashboard/audit",
];

async function getSession(token) {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "super-secret-key-123456789"
    );
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const session = await getSession(token);

  // Protect all dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Non-admins can't access admin-only pages
    if (session.role !== "admin") {
      if (
        pathname === "/dashboard" ||
        ADMIN_ONLY.some((p) => pathname.startsWith(p))
      ) {
        return NextResponse.redirect(new URL("/dashboard/catalog", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
