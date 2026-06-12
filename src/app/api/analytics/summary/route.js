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

    const totalAssets = await prisma.asset.count();
    const totalBookings = await prisma.booking.count();
    const activeAllocations = await prisma.booking.count({
      where: {
        status: { in: ["Approved", "Issued", "Overdue"] }
      }
    });
    const overdueReturns = await prisma.booking.count({
      where: { status: "Overdue" }
    });

    const assetsList = await prisma.asset.findMany();
    const totalInventoryCount = assetsList.reduce((sum, a) => sum + a.totalQuantity, 0);
    const availableInventoryCount = assetsList.reduce((sum, a) => sum + a.availableQuantity, 0);
    const allocatedInventoryCount = totalInventoryCount - availableInventoryCount;

    const assetsWithBookings = await prisma.asset.findMany({
      include: {
        bookings: true
      }
    });

    const mostUtilized = assetsWithBookings
      .map(asset => ({
        id: asset.id,
        name: asset.name,
        bookingsCount: asset.bookings.length
      }))
      .sort((a, b) => b.bookingsCount - a.bookingsCount)
      .slice(0, 5);

    const utilizationRate = {
      allocated: allocatedInventoryCount,
      available: availableInventoryCount,
      total: totalInventoryCount
    };

    const trends = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      
      const count = await prisma.booking.count({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        }
      });
      
      trends.push({ date: dateStr, count });
    }

    return NextResponse.json({
      summary: {
        totalAssets,
        totalBookings,
        activeAllocations,
        availableInventory: availableInventoryCount,
        overdueReturns
      },
      mostUtilized,
      utilizationRate,
      trends
    });
  } catch (error) {
    console.error("GET analytics summary error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
