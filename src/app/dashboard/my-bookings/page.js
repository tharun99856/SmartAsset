"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "../layout";

export default function MyBookingsPage() {
  const { user, fetchNotifications } = useDashboard();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Failed to fetch user bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyBookings();
    }
  }, [user]);

  const handleCancel = async (booking) => {
    const sure = window.confirm(
      `Cancel your request for ${booking.asset.name}? This frees the slot for someone else.`
    );
    if (!sure) return;

    setErrorMsg("");
    setCancellingId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't cancel that booking");
      fetchMyBookings();
      fetchNotifications();
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="skeleton" style={{ height: "150px", borderRadius: "12px" }}></div>
        <div className="skeleton" style={{ height: "150px", borderRadius: "12px" }}></div>
      </div>
    );
  }

  const activeBookings = bookings.filter((b) =>
    b.status === "Approved" || b.status === "Issued" || b.status === "Overdue"
  );
  const pendingBookings = bookings.filter((b) => b.status === "Pending");
  const historicalBookings = bookings.filter((b) =>
    ["Returned", "Rejected", "Cancelled", "Expired"].includes(b.status)
  );

  const renderBookingTable = (bookingsList, title, emptyMsg) => {
    return (
      <div className="glass-card" style={{
        background: "var(--bg-panel)",
        padding: "1.5rem",
        marginBottom: "2rem"
      }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>{title} ({bookingsList.length})</h3>

        {bookingsList.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "1.5rem 0", textAlign: "center" }}>
            {emptyMsg}
          </p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {bookingsList.map((booking) => {
                  const startStr = new Date(booking.startDate).toLocaleDateString();
                  const endStr = new Date(booking.endDate).toLocaleDateString();
                  const canCancel = booking.status === "Pending" || booking.status === "Approved";

                  return (
                    <tr key={booking.id}>
                      <td>
                        <strong style={{ display: "block" }}>{booking.asset.name}</strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Request #{booking.id}</span>
                      </td>
                      <td>{booking.asset.category.name}</td>
                      <td><strong>{booking.quantityRequested}</strong></td>
                      <td>
                        <div style={{ fontSize: "0.85rem" }}>
                          <span>{startStr}</span>
                          <span style={{ margin: "0 0.5rem", color: "var(--text-muted)" }}>➔</span>
                          <span>{endStr}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${booking.status.toLowerCase()}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-start" }}>
                          {booking.status === "Rejected" && (
                            <div style={{ fontSize: "0.8rem", color: "var(--status-rejected)" }}>
                              <span style={{ fontWeight: "600", display: "block" }}>Reason given:</span>
                              <span>{booking.rejectionReason}</span>
                            </div>
                          )}
                          {booking.status === "Issued" && (
                            <span style={{ fontSize: "0.8rem", color: "var(--status-issued)", fontWeight: "500" }}>
                              With you - due back {endStr}
                            </span>
                          )}
                          {booking.status === "Overdue" && (
                            <strong style={{ fontSize: "0.8rem", color: "var(--status-overdue)" }}>
                              Past due - please return it as soon as you can
                            </strong>
                          )}
                          {booking.status === "Approved" && (
                            <span style={{ fontSize: "0.8rem", color: "var(--status-approved)" }}>
                              Approved - pick it up at the equipment desk
                            </span>
                          )}
                          {booking.status === "Returned" && (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              Returned, all done
                            </span>
                          )}
                          {booking.status === "Expired" && (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              Start date passed before review
                            </span>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => handleCancel(booking)}
                              className="btn btn-danger"
                              disabled={cancellingId === booking.id}
                              style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}
                            >
                              {cancellingId === booking.id ? "Cancelling…" : "Cancel"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {errorMsg && (
        <div className="alert alert-error">
          ⚠️ {errorMsg}
        </div>
      )}

      {renderBookingTable(
        activeBookings,
        "Out & upcoming",
        "Nothing reserved right now - browse the catalog when you need gear."
      )}

      {renderBookingTable(
        pendingBookings,
        "Waiting on approval",
        "No requests in the queue."
      )}

      {renderBookingTable(
        historicalBookings,
        "History",
        "Past bookings will show up here once you've borrowed something."
      )}
    </div>
  );
}
