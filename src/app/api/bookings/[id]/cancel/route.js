import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function PATCH(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

      if (user.role !== "admin" && booking.userId !== user.id) {
        throw new Error("You can only cancel your own bookings");
      }

      if (booking.status !== "Pending" && booking.status !== "Approved") {
        throw new Error("Only pending or approved bookings can be cancelled. Checked-out items must be returned instead.");
      }

      // Approved bookings already hold stock, so cancelling gives it back.
      let updatedAsset = booking.asset;
      if (booking.status === "Approved") {
        updatedAsset = await tx.asset.update({
          where: { id: booking.assetId },
          data: {
            availableQuantity: booking.asset.availableQuantity + booking.quantityRequested
          }
        });
      }

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "Cancelled" }
      });

      if (user.role === "admin" && booking.userId !== user.id) {
        await tx.notification.create({
          data: {
            userId: booking.userId,
            type: "booking_status",
            message: `Your booking for "${booking.asset.name}" was cancelled by an administrator.`
          }
        });
      }

      return { updatedBooking, updatedAsset };
    });

    await logAction(user.id, "CANCEL_BOOKING", "Booking", bookingId, {
      assetId: result.updatedAsset.id,
      quantity: result.updatedBooking.quantityRequested
    });

    return NextResponse.json({
      message: "Booking cancelled",
      booking: result.updatedBooking,
      asset: result.updatedAsset
    });
  } catch (error) {
    console.error("PATCH cancel booking error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 400 });
  }
}
