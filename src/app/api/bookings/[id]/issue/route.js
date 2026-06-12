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

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { asset: true }
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "Approved") {
      return NextResponse.json({ error: "Only approved bookings can be marked as physically issued" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "Issued"
        }
      });

      const transaction = await tx.assetTransaction.create({
        data: {
          bookingId,
          action: "issued",
          performedById: user.id,
          notes: "Physically handed over to user"
        }
      });

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: "booking_status",
          message: `The asset "${booking.asset.name}" (Quantity: ${booking.quantityRequested}) has been physically issued to you. Due date is ${new Date(booking.dueDate).toLocaleDateString()}.`
        }
      });

      return { updatedBooking, transaction };
    });

    await logAction(user.id, "ISSUE_ASSET", "Booking", bookingId, {
      assetId: booking.asset.id,
      quantity: booking.quantityRequested
    });

    return NextResponse.json({
      message: "Booking marked as issued successfully",
      booking: result.updatedBooking,
      transaction: result.transaction
    });
  } catch (error) {
    console.error("PATCH issue booking error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
