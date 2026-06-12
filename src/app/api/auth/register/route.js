import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken, getUserFromRequest } from "@/lib/auth";

export async function POST(request) {
  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Only an existing admin can register a new admin account
    if (role === "admin") {
      const caller = await getUserFromRequest(request);
      if (!caller || caller.role !== "admin") {
        return NextResponse.json(
          { error: "Only an admin can register another admin account." },
          { status: 403 }
        );
      }
    }

    const assignedRole = role === "admin" ? "admin" : "user";

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: assignedRole,
      },
    });

    const token = signToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      message: "Registration successful",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }, { status: 201 });

    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
