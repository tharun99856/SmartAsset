import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function GET(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const assetId = parseInt(id);

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        category: true
      }
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // the scan station needs every in-flight allocation, not just recent rows
    const bookings = await prisma.booking.findMany({
      where: { assetId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return NextResponse.json({ asset, bookings });
  } catch (error) {
    console.error("GET asset detail error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { id } = await params;
    const assetId = parseInt(id);

    const { name, categoryId, description, totalQuantity, status } = await request.json();

    const oldAsset = await prisma.asset.findUnique({
      where: { id: assetId }
    });
    if (!oldAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;

    if (categoryId) {
      const catId = parseInt(categoryId);
      const category = await prisma.category.findUnique({ where: { id: catId } });
      if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });
      updateData.categoryId = catId;
    }

    if (totalQuantity !== undefined) {
      const newTotal = parseInt(totalQuantity);
      if (newTotal < 0) {
        return NextResponse.json({ error: "Total quantity cannot be negative" }, { status: 400 });
      }

      const allocated = oldAsset.totalQuantity - oldAsset.availableQuantity;
      const newAvailable = newTotal - allocated;

      if (newAvailable < 0) {
        return NextResponse.json({
          error: `Cannot reduce total quantity to ${newTotal}. There are currently ${allocated} units allocated to active bookings.`
        }, { status: 400 });
      }

      updateData.totalQuantity = newTotal;
      updateData.availableQuantity = newAvailable;
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: updateData,
      include: {
        category: true
      }
    });

    await logAction(user.id, "UPDATE_ASSET", "Asset", assetId, { name: updatedAsset.name, changes: updateData });

    return NextResponse.json({ message: "Asset updated successfully", asset: updatedAsset });
  } catch (error) {
    console.error("PUT asset error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { id } = await params;
    const assetId = parseInt(id);

    const asset = await prisma.asset.findUnique({
      where: { id: assetId }
    });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // block deletion while any booking still holds or awaits this asset
    const activeBookings = await prisma.booking.count({
      where: {
        assetId,
        status: {
          in: ["Pending", "Approved", "Issued", "Overdue"]
        }
      }
    });

    if (activeBookings > 0) {
      return NextResponse.json({
        error: "Cannot delete asset. There are active bookings (Pending, Approved, Issued, or Overdue) associated with this asset."
      }, { status: 400 });
    }

    await prisma.asset.delete({
      where: { id: assetId }
    });

    await logAction(user.id, "DELETE_ASSET", "Asset", assetId, { name: asset.name });

    return NextResponse.json({ message: "Asset deleted successfully" });
  } catch (error) {
    console.error("DELETE asset error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
