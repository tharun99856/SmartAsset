"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "../layout";

export default function OverdueItemsPage() {
  const { user } = useDashboard();
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchOverdue = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics/overdue");
      if (res.ok) {
        const data = await res.json();
        setOverdue(data.overdue || []);
      }
    } catch (error) {
      console.error("Failed to fetch overdue items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchOverdue();
    }
  }, [user]);

  const handleReturn = async (id) => {
    setErrorMsg("");
    setSuccessMsg("");
    setActionLoading(id);

    try {
      const res = await fetch(`/api/bookings/${id}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to process return");
      setSuccessMsg(`Delinquency settled. Asset for Booking #${id} checked back in!`);
      fetchOverdue();
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="skeleton" style={{ height: "200px", borderRadius: "12px" }}></div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {errorMsg && (
        <div className="alert alert-error">
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          ✅ {successMsg}
        </div>
      )}

      <div className="glass-card" style={{ background: "var(--bg-panel)", padding: "1.5rem" }}>
        {overdue.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
            <span style={{ fontSize: "3rem" }}>🎉</span>
            <h3 style={{ fontSize: "1.25rem", marginTop: "1rem", color: "var(--status-issued)" }}>No Overdue Returns</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              All checked out resources are currently within their due return windows.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Borrower / Contact</th>
                  <th>Resource</th>
                  <th>Quantity</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((item) => {
                  const dueStr = new Date(item.dueDate).toLocaleDateString();
                  const isProcessing = actionLoading === item.id;
                  
                  return (
                    <tr key={item.id}>
                      <td><strong>#{item.id}</strong></td>
                      <td>
                        <strong style={{ display: "block" }}>{item.user.name}</strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.user.email}</span>
                      </td>
                      <td>
                        <strong style={{ display: "block" }}>{item.asset.name}</strong>
                      </td>
                      <td><strong>{item.quantityRequested}</strong></td>
                      <td><span style={{ color: "var(--status-overdue)" }}>{dueStr}</span></td>
                      <td>
                        <span className="badge badge-overdue" style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}>
                          {item.daysOverdue} days
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => handleReturn(item.id)}
                          className="btn btn-primary"
                          disabled={isProcessing}
                          style={{
                            padding: "0.4rem 0.8rem",
                            fontSize: "0.8rem",
                            background: "var(--status-overdue-bg)",
                            borderColor: "var(--status-overdue)",
                            color: "var(--status-overdue)"
                          }}
                        >
                          {isProcessing ? "Checking In..." : "Force Return"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
