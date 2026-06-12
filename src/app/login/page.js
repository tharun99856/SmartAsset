"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // Check if there's already a logged-in admin session (needed to show admin role option)
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user?.role) setCurrentUserRole(data.user.role);
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setFormData({ name: "", email: "", password: "", role: "user" });
      setCurrentUserRole(null);
      setError("");
      setSigningOut(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const payload = isRegister 
      ? formData 
      : { email: formData.email, password: formData.password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      padding: "2rem"
    }}>


      <div className="glass-card" style={{
        width: "100%",
        maxWidth: "440px",
        zIndex: 1,
        borderRadius: "var(--radius-lg)",
        padding: "2.5rem 2rem",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow-lg)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.25rem" }}>
            {isRegister ? "Create account" : "Sign in"}
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            {isRegister
              ? "Fill in the fields below to register."
              : "Enter your email and password to continue."}
          </p>
        </div>

        <div style={{
          display: "flex",
          background: "var(--bg-inset)",
          padding: "4px",
          borderRadius: "var(--radius-sm)",
          marginBottom: "1.5rem",
          border: "1px solid var(--border-color)"
        }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(""); }}
            style={{
              flex: 1,
              padding: "0.6rem",
              borderRadius: "6px",
              border: "none",
              background: !isRegister ? "var(--bg-secondary)" : "transparent",
              color: !isRegister ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: "600",
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "var(--transition)"
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(""); }}
            style={{
              flex: 1,
              padding: "0.6rem",
              borderRadius: "6px",
              border: "none",
              background: isRegister ? "var(--bg-secondary)" : "transparent",
              color: isRegister ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: "600",
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "var(--transition)"
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div style={{
            background: "rgba(226, 92, 74, 0.1)",
            border: "1px solid rgba(226, 92, 74, 0.2)",
            color: "var(--status-rejected)",
            fontSize: "0.875rem",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-sm)",
            marginBottom: "1.25rem",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                placeholder="Your full name"
                required
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="name@example.com"
              required
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={handleInputChange}
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="role">I'm signing up as</label>
              <select
                id="role"
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="user">Student / borrower</option>
                {currentUserRole === "admin" && (
                  <option value="admin">Equipment desk admin</option>
                )}
              </select>
              {currentUserRole !== "admin" && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                  Admin accounts can only be created by an existing admin.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: "1rem", height: "46px" }}
          >
            {loading ? (
              <div className="skeleton" style={{ width: "24px", height: "24px", borderRadius: "50%" }}></div>
            ) : isRegister ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {!isRegister && (
          <div style={{
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-color)"
          }}>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", marginBottom: "0.75rem" }}>
              Demo accounts — click to fill credentials:
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
                onClick={() => setFormData((prev) => ({ ...prev, email: "admin_r@ee.iitr.ac.in", password: "admin123" }))}
              >
                Admin account
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
                onClick={() => setFormData((prev) => ({ ...prev, email: "student_t@ee.iitr.ac.in", password: "student123" }))}
              >
                Student account
              </button>
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.75rem", fontFamily: "var(--font-mono)" }}>
              admin_r@ee.iitr.ac.in · admin123 &nbsp;|&nbsp; student_t@ee.iitr.ac.in · student123
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={signingOut}
              style={{ width: "100%", marginTop: "0.75rem", padding: "0.5rem", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
              onClick={handleSignOut}
            >
              <span>🚪</span>
              <span>{signingOut ? "Signing out…" : "Sign Out"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
