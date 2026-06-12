import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { updateOverdueBookings } from "../../bookings/route";

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    await updateOverdueBookings();

    const overdueBookings = await prisma.booking.findMany({
      where: {
        status: "Overdue"
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        asset: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        dueDate: "asc"
      }
    });

    const now = new Date();
    const result = overdueBookings.map(b => {
      const diffTime = Math.abs(now - new Date(b.dueDate));
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...b,
        daysOverdue
      };
    });

    return NextResponse.json({ overdue: result });
  } catch (error) {
    console.error("GET overdue bookings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
