import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const logs = await prisma.auditLog.findMany({
      where: action ? { action } : undefined,
      include: {
        actor: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { timestamp: "desc" },
      take: 200
    });

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        metadata: safeParse(log.metadata)
      }))
    });
  } catch (error) {
    console.error("GET audit error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
