import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q") || "";
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const availableOnly = searchParams.get("available") === "true";

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    if (status) {
      where.status = status;
    }

    if (availableOnly) {
      where.availableQuantity = { gt: 0 };
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        category: true
      },
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("GET assets error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { name, categoryId, description, totalQuantity, status } = await request.json();

    if (!name || !categoryId || totalQuantity === undefined) {
      return NextResponse.json({ error: "Name, categoryId, and totalQuantity are required" }, { status: 400 });
    }

    const parsedCategoryId = parseInt(categoryId);
    const parsedTotalQuantity = parseInt(totalQuantity);
    
    if (parsedTotalQuantity < 0) {
      return NextResponse.json({ error: "Total quantity cannot be negative" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({
      where: { id: parsedCategoryId }
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        categoryId: parsedCategoryId,
        description,
        totalQuantity: parsedTotalQuantity,
        availableQuantity: parsedTotalQuantity,
        status: status || "Available",
      },
      include: {
        category: true
      }
    });

    await logAction(user.id, "CREATE_ASSET", "Asset", asset.id, { name, totalQuantity: parsedTotalQuantity });

    return NextResponse.json({ message: "Asset created successfully", asset }, { status: 201 });
  } catch (error) {
    console.error("POST asset error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
