"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "./layout";

export default function AdminDashboardPage() {
  const { user } = useDashboard();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics/summary");
      if (!res.ok) throw new Error("Failed to load dashboard data");
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchAnalytics();
    }
  }, [user]);

  if (user && user.role !== "admin") {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <p>Redirecting to catalog...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton" style={{ height: "120px", borderRadius: "12px" }}></div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div className="skeleton" style={{ height: "300px", borderRadius: "12px" }}></div>
          <div className="skeleton" style={{ height: "300px", borderRadius: "12px" }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        ⚠️ {error}
      </div>
    );
  }

  const { summary, mostUtilized, utilizationRate, trends } = data;

  const totalInv = utilizationRate.total || 1;
  const allocatedPercent = Math.round((utilizationRate.allocated / totalInv) * 100);
  const availablePercent = 100 - allocatedPercent;
  
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (allocatedPercent / 100) * circumference;

  const maxTrendVal = Math.max(...trends.map(t => t.count), 5); // Fallback to 5 to avoid flat charts
  const linePoints = trends.map((t, idx) => {
    const x = 50 + idx * 80;
    const y = 200 - (t.count / maxTrendVal) * 150;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `50,200 ${linePoints} ${50 + (trends.length - 1) * 80},200`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1.5rem"
      }}>
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", borderLeft: "4px solid var(--primary)" }}>
          <div style={{ fontSize: "2rem" }}>🛠️</div>
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600" }}>Total Assets</p>
            <h3 style={{ fontSize: "1.75rem", fontWeight: "700", marginTop: "0.1rem" }}>{summary.totalAssets}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", borderLeft: "4px solid var(--secondary)" }}>
          <div style={{ fontSize: "2rem" }}>📅</div>
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600" }}>Total Bookings</p>
            <h3 style={{ fontSize: "1.75rem", fontWeight: "700", marginTop: "0.1rem" }}>{summary.totalBookings}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", borderLeft: "4px solid var(--status-approved)" }}>
          <div style={{ fontSize: "2rem" }}>📋</div>
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600" }}>Active Allocations</p>
            <h3 style={{ fontSize: "1.75rem", fontWeight: "700", marginTop: "0.1rem" }}>{summary.activeAllocations}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", borderLeft: "4px solid var(--status-issued)" }}>
          <div style={{ fontSize: "2rem" }}>✅</div>
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600" }}>Available Stock</p>
            <h3 style={{ fontSize: "1.75rem", fontWeight: "700", marginTop: "0.1rem" }}>{summary.availableInventory}</h3>
          </div>
        </div>

        <div className="glass-card" style={{
          display: "flex",
          alignItems: "center",
          gap: "1.25rem",
          borderLeft: "4px solid var(--status-overdue)",
          boxShadow: summary.overdueReturns > 0 ? "0 4px 12px -2px rgba(194, 87, 26, 0.15)" : "var(--shadow-md)"
        }}>
          <div style={{ fontSize: "2rem" }}>⚠️</div>
          <div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600" }}>Overdue Returns</p>
            <h3 style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              marginTop: "0.1rem",
              color: summary.overdueReturns > 0 ? "var(--status-overdue)" : "inherit"
            }}>{summary.overdueReturns}</h3>
          </div>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
        gap: "1.5rem"
      }}>
        
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem" }}>Inventory Utilization Rate</h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flex: 1, padding: "1rem 0" }}>
            
            <div style={{ position: "relative", width: "160px", height: "160px" }}>
              <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="80" cy="80" r={radius} fill="transparent" stroke="var(--bg-inset)" strokeWidth="14" />
                <circle cx="80" cy="80" r={radius} fill="transparent" stroke="var(--status-issued)" strokeWidth="14" strokeDasharray={circumference} strokeDashoffset="0" />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="var(--primary)"
                  strokeWidth="14"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center"
              }}>
                <span style={{ fontSize: "1.5rem", fontWeight: "700" }}>{allocatedPercent}%</span>
                <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Allocated</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "var(--primary)" }}></div>
                <div style={{ fontSize: "0.85rem" }}>
                  <p style={{ color: "var(--text-secondary)" }}>Allocated Units</p>
                  <strong style={{ fontSize: "1rem" }}>{utilizationRate.allocated} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({allocatedPercent}%)</span></strong>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "var(--status-issued)" }}></div>
                <div style={{ fontSize: "0.85rem" }}>
                  <p style={{ color: "var(--text-secondary)" }}>Available Units</p>
                  <strong style={{ fontSize: "1rem" }}>{utilizationRate.available} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({availablePercent}%)</span></strong>
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.5rem", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Total Capacity: </span>
                <strong>{utilizationRate.total}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem" }}>Top Utilized Assets</h3>
          {mostUtilized.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "auto" }}>No booking data yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1, justifyContent: "center" }}>
              {mostUtilized.map((item, idx) => {
                const maxVal = Math.max(...mostUtilized.map(m => m.bookingsCount), 1);
                const percent = (item.bookingsCount / maxVal) * 100;
                return (
                  <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <span style={{ fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80%" }}>{item.name}</span>
                      <strong style={{ color: "var(--text-primary)" }}>{item.bookingsCount} bookings</strong>
                    </div>
                    <div style={{
                      height: "8px",
                      background: "var(--bg-inset)",
                      borderRadius: "4px",
                      overflow: "hidden",
                      border: "1px solid var(--border-color)"
                    }}>
                      <div style={{
                        width: `${percent}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, var(--primary), var(--secondary))`,
                        borderRadius: "4px",
                        transition: "width 0.8s ease"
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ fontSize: "1.1rem" }}>Booking Request Trends (Last 7 Days)</h3>
        <div style={{ position: "relative", width: "100%", height: "240px", overflow: "hidden" }}>
          <svg style={{ width: "100%", height: "100%" }} viewBox="0 0 600 240" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <line x1="50" y1="50" x2="530" y2="50" stroke="var(--bg-inset)" strokeDasharray="3,3" />
            <line x1="50" y1="125" x2="530" y2="125" stroke="var(--bg-inset)" strokeDasharray="3,3" />
            <line x1="50" y1="200" x2="530" y2="200" stroke="var(--border-color)" />

            <polygon points={areaPoints} fill="url(#areaGrad)" />

            <polyline points={linePoints} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {trends.map((t, idx) => {
              const x = 50 + idx * 80;
              const y = 200 - (t.count / maxTrendVal) * 150;
              return (
                <g key={idx}>
                  <circle cx={x} cy={y} r="5" fill="var(--bg-primary)" stroke="var(--primary)" strokeWidth="2" />
                  <text x={x} y={y - 10} fill="var(--text-primary)" fontSize="10" textAnchor="middle" fontWeight="600">
                    {t.count}
                  </text>
                  <text x={x} y="220" fill="var(--text-muted)" fontSize="9" textAnchor="middle">
                    {t.date}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      
    </div>
  );
}
