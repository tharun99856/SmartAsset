"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const DashboardContext = createContext(null);

export function useDashboard() {
  return useContext(DashboardContext);
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        throw new Error("Session invalid");
      }
      const data = await res.json();
      setUser(data.user);
      setLoading(false);
      
      if (pathname === "/dashboard" && data.user.role !== "admin") {
        router.replace("/dashboard/catalog");
      }
    } catch (err) {
      router.replace("/login");
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications.filter(n => !n.isRead).length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markNotificationsRead = async () => {
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error("Failed to mark notifications read:", error);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [pathname]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        color: "var(--text-secondary)"
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div className="skeleton" style={{ width: "40px", height: "40px", borderRadius: "50%" }}></div>
          <p style={{ fontSize: "0.875rem" }}>Getting your workspace ready…</p>
        </div>
      </div>
    );
  }

  // sidebar tags read like crate labels
  const adminLinks = [
    { name: "Overview", href: "/dashboard", icon: "OVR" },
    { name: "Requests", href: "/dashboard/requests", icon: "REQ" },
    { name: "Allocations", href: "/dashboard/allocations", icon: "OUT" },
    { name: "Overdue", href: "/dashboard/overdue", icon: "DUE" },
    { name: "Inventory", href: "/dashboard/inventory", icon: "INV" },
    { name: "Scan station", href: "/dashboard/scan", icon: "SCN" },
    { name: "Audit trail", href: "/dashboard/audit", icon: "LOG" },
  ];

  const userLinks = [
    { name: "Catalog", href: "/dashboard/catalog", icon: "CAT" },
    { name: "My bookings", href: "/dashboard/my-bookings", icon: "BKG" },
  ];

  const navLinks = user.role === "admin" ? adminLinks : userLinks;

  const currentLink = navLinks.find(link => link.href === pathname);
  const pageTitle = currentLink ? currentLink.name : "Smart Asset Management";

  return (
    <DashboardContext.Provider value={{ user, fetchNotifications }}>
      <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
        
        <aside style={{
          width: "280px",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem",
          flexShrink: 0,
          zIndex: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "1.35rem" }}>SmartAsset</h1>
          </div>

          <div className="glass-card" style={{
            padding: "1rem",
            marginBottom: "2rem",
            background: "var(--bg-inset)",
            border: "1px solid var(--border-color)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div className="logo-plate" style={{ width: "40px", height: "40px", fontSize: "0.95rem" }}>
                {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <h3 style={{ fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.name}
                </h3>
                <span className={`badge badge-${user.role}`} style={{ fontSize: "0.65rem", marginTop: "0.25rem" }}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    background: isActive ? "var(--accent-soft)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                    textDecoration: "none",
                    fontWeight: isActive ? "600" : "500",
                    fontSize: "0.925rem",
                    transition: "var(--transition)"
                  }}
                >
                  <span
                    className="tag-chip"
                    style={isActive ? { color: "var(--primary)", borderColor: "var(--primary)" } : undefined}
                  >
                    {link.icon}
                  </span>
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{
              marginTop: "auto",
              justifyContent: "flex-start",
              padding: "0.75rem 1rem",
              background: "transparent",
              borderColor: "transparent",
              color: "var(--status-rejected)"
            }}
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
          
          <header style={{
            height: "70px",
            borderBottom: "1px solid var(--border-color)",
            padding: "0 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-header)",
            backdropFilter: "blur(8px)",
            position: "sticky",
            top: 0,
            zIndex: 5
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600" }}>{pageTitle}</h2>
            
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", position: "relative" }}>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications && unreadCount > 0) {
                      markNotificationsRead();
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                    padding: "0.5rem",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    transition: "var(--transition)"
                  }}
                  className="btn-secondary"
                >
                  🔔
                </button>
                {unreadCount > 0 && (
                  <span style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    background: "var(--status-rejected)",
                    color: "#fff",
                    fontSize: "0.65rem",
                    fontWeight: "700",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid var(--bg-primary)"
                  }}>
                    {unreadCount}
                  </span>
                )}

                {showNotifications && (
                  <div className="glass-card" style={{
                    position: "absolute",
                    top: "45px",
                    right: "0",
                    width: "360px",
                    maxHeight: "400px",
                    overflowY: "auto",
                    zIndex: 20,
                    padding: "1rem",
                    background: "var(--bg-secondary)",
                    boxShadow: "var(--shadow-lg)",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                      <h3 style={{ fontSize: "0.95rem" }}>Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markNotificationsRead}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--primary)",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            fontWeight: "600"
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", padding: "1.5rem 0" }}>
                        No notifications to show.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            style={{
                              padding: "0.75rem",
                              borderRadius: "var(--radius-sm)",
                              background: n.isRead ? "transparent" : "var(--accent-soft)",
                              borderLeft: `3px solid ${n.isRead ? "transparent" : "var(--primary)"}`,
                              fontSize: "0.8rem",
                              lineHeight: "1.3"
                            }}
                          >
                            <p style={{ color: "var(--text-primary)", marginBottom: "0.25rem" }}>{n.message}</p>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                              {new Date(n.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                fontSize: "0.85rem",
                color: "var(--text-primary)"
              }}>
                {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
              </div>
            </div>
          </header>

          <main style={{ flex: 1, padding: "2rem", overflowY: "auto", position: "relative", zIndex: 1 }}>
            {children}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
