import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { assertWindowHasCapacity } from "@/lib/availability";

export async function PATCH(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { id } = await params;
    const bookingId = parseInt(id);

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { asset: true }
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.status !== "Pending") {
        throw new Error("Only pending bookings can be approved");
      }

      const asset = booking.asset;

      // both the stock counter and the window formula must agree
      if (asset.availableQuantity < booking.quantityRequested) {
        throw new Error(`Insufficient stock. Only ${asset.availableQuantity} available, but ${booking.quantityRequested} requested.`);
      }
      await assertWindowHasCapacity(tx, asset, booking.startDate, booking.endDate, booking.quantityRequested, booking.id);

      const updatedAsset = await tx.asset.update({
        where: { id: asset.id },
        data: {
          availableQuantity: asset.availableQuantity - booking.quantityRequested
        }
      });

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "Approved"
        }
      });

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: "booking_status",
          message: `Your booking request for "${asset.name}" (Quantity: ${booking.quantityRequested}) has been approved.`
        }
      });

      return { updatedBooking, updatedAsset };
    });

    await logAction(user.id, "APPROVE_BOOKING", "Booking", bookingId, {
      assetId: result.updatedAsset.id,
      quantity: result.updatedBooking.quantityRequested
    });

    return NextResponse.json({
      message: "Booking approved successfully",
      booking: result.updatedBooking,
      asset: result.updatedAsset
    });
  } catch (error) {
    console.error("PATCH approve booking error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 400 });
  }
}
