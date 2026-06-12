// A window [start, end] has room for `qty` more units only if at every moment
// allocated(t) + qty <= totalQuantity. Two ranges overlap unless one ends before
// the other starts, so summing every overlapping active booking gives a safe
// upper bound for allocated(t) across the whole window.

const BLOCKING_STATUSES = ["Approved", "Issued", "Overdue"];

export async function allocatedInWindow(client, assetId, start, end, excludeBookingId = null) {
  const overlapping = await client.booking.findMany({
    where: {
      assetId,
      status: { in: BLOCKING_STATUSES },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      NOT: {
        OR: [
          { endDate: { lte: start } },
          { startDate: { gte: end } },
        ],
      },
    },
    select: { quantityRequested: true },
  });

  return overlapping.reduce((sum, b) => sum + b.quantityRequested, 0);
}

export async function assertWindowHasCapacity(client, asset, start, end, requestedQty, excludeBookingId = null) {
  const allocated = await allocatedInWindow(client, asset.id, start, end, excludeBookingId);
  const freeInWindow = asset.totalQuantity - allocated;

  if (requestedQty > freeInWindow) {
    const noun = freeInWindow === 1 ? "unit is" : "units are";
    throw new Error(
      freeInWindow <= 0
        ? `Every unit of "${asset.name}" is already reserved for those dates. Try a different window.`
        : `Only ${freeInWindow} ${noun} free for those dates — ${requestedQty} requested.`
    );
  }

  return freeInWindow;
}
