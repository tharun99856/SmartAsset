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

      if (booking.status !== "Issued" && booking.status !== "Overdue") {
        throw new Error("Only currently checked out (Issued or Overdue) bookings can be returned");
      }

      const asset = booking.asset;

      const updatedAsset = await tx.asset.update({
        where: { id: asset.id },
        data: {
          availableQuantity: asset.availableQuantity + booking.quantityRequested
        }
      });

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "Returned"
        }
      });

      const transaction = await tx.assetTransaction.create({
        data: {
          bookingId,
          action: "returned",
          performedById: user.id,
          notes: "Physically returned by user"
        }
      });

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: "booking_status",
          message: `The asset "${asset.name}" (Quantity: ${booking.quantityRequested}) has been marked as returned. Thank you!`
        }
      });

      return { updatedBooking, updatedAsset, transaction };
    });

    await logAction(user.id, "RETURN_ASSET", "Booking", bookingId, {
      assetId: result.updatedAsset.id,
      quantity: result.updatedBooking.quantityRequested
    });

    return NextResponse.json({
      message: "Booking returned and stock replenished successfully",
      booking: result.updatedBooking,
      asset: result.updatedAsset,
      transaction: result.transaction
    });
  } catch (error) {
    console.error("PATCH return booking error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 400 });
  }
}
