"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "../layout";

// Plain-English labels for the raw action codes the backend writes.
const ACTION_LABELS = {
  CREATE_ASSET: { text: "added an asset", tone: "issued" },
  UPDATE_ASSET: { text: "edited an asset", tone: "approved" },
  DELETE_ASSET: { text: "deleted an asset", tone: "rejected" },
  CREATE_BOOKING: { text: "requested a booking", tone: "pending" },
  APPROVE_BOOKING: { text: "approved a booking", tone: "approved" },
  REJECT_BOOKING: { text: "rejected a booking", tone: "rejected" },
  ISSUE_ASSET: { text: "handed over equipment", tone: "issued" },
  RETURN_ASSET: { text: "checked equipment back in", tone: "returned" },
  CANCEL_BOOKING: { text: "cancelled a booking", tone: "returned" },
};

export default function AuditTrailPage() {
  const { user } = useDashboard();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = async (action) => {
    try {
      setLoading(true);
      const qs = action ? `?action=${encodeURIComponent(action)}` : "";
      const res = await fetch(`/api/audit${qs}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchLogs(actionFilter);
    }
  }, [user, actionFilter]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton" style={{ height: "72px", borderRadius: "12px" }}></div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <p style={{ fontSize: "0.9rem" }}>
          Every write to the system lands here, append-only. Nothing on this page can be edited or deleted.
        </p>
        <select
          className="form-select"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ width: "240px" }}
        >
          <option value="">All activity</option>
          {Object.entries(ACTION_LABELS).map(([code, { text }]) => (
            <option key={code} value={code}>{text}</option>
          ))}
        </select>
      </div>

      {logs.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-panel)" }}>
          <h3 style={{ fontSize: "1.1rem" }}>Nothing logged yet</h3>
          <p style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "var(--text-muted)" }}>
            As soon as someone creates, approves, or returns anything, it shows up here.
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ background: "var(--bg-panel)", padding: "0.5rem 1.5rem" }}>
          {logs.map((log) => {
            const label = ACTION_LABELS[log.action] || { text: log.action.toLowerCase().replace(/_/g, " "), tone: "returned" };
            const meta = log.metadata || {};
            return (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  padding: "1rem 0",
                  borderBottom: "1px solid var(--border-color)",
                  flexWrap: "wrap"
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
                    <strong>{log.actor?.name || "System"}</strong>{" "}
                    <span style={{ color: "var(--text-secondary)" }}>{label.text}</span>
                    {meta.name ? <span style={{ color: "var(--text-secondary)" }}> — “{meta.name}”</span> : null}
                    {meta.assetName ? <span style={{ color: "var(--text-secondary)" }}> — “{meta.assetName}”</span> : null}
                  </p>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {log.entityType} #{log.entityId}
                    {meta.quantity ? ` · qty ${meta.quantity}` : ""}
                    {meta.quantityRequested ? ` · qty ${meta.quantityRequested}` : ""}
                  </span>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span className={`badge badge-${label.tone}`} style={{ fontSize: "0.6rem" }}>{log.action}</span>
                  <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
