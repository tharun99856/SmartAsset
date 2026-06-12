import Link from "next/link";

export const metadata = {
  title: "SmartAsset | Campus Equipment Management",
  description:
    "SmartAsset tracks shared equipment, manages bookings, approvals, QR-based workflows, and inventory visibility from one system.",
};

const features = [
  {
    title: "Booking engine",
    body: "Booking requests are validated against all overlapping approved and issued bookings. A request is rejected if the quantity requested would exceed available stock for that date range.",
  },
  {
    title: "QR check-in/out",
    body: "Each asset has a QR code. Scanning it on the desk opens the asset's booking record. The admin can issue or check in from the same screen.",
  },
  {
    title: "Audit trail",
    body: "Every create, approve, issue, return and delete is written to an append-only log with a timestamp and actor. The log cannot be edited.",
  },
  {
    title: "Approval workflow",
    body: "Users submit booking requests with a date range and quantity. Admins review, approve, or reject from a single queue. Users see status updates in real time.",
  },
  {
    title: "Inventory management",
    body: "Assets are organised by category with total and available quantity tracked separately. Available quantity updates automatically when bookings are approved or returned.",
  },
  {
    title: "Analytics",
    body: "The admin dashboard shows total assets, active allocations, available stock, overdue count, top-borrowed assets, and a 7-day booking request chart.",
  }
];

export default function LandingPage() {
  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }}>


      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1.5rem clamp(1.5rem, 6vw, 4rem)",
        zIndex: 1
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <strong style={{
            fontSize: "1.2rem",
            fontFamily: "var(--font-display)",
            textTransform: "uppercase",
            letterSpacing: "0.06em"
          }}>SmartAsset</strong>
        </div>
        <Link href="/login" className="btn btn-secondary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
          Sign in
        </Link>
      </header>

      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "3rem clamp(1.5rem, 6vw, 4rem) 4rem",
        zIndex: 1,
        maxWidth: "1100px",
        margin: "0 auto",
        width: "100%"
      }}>
        <div style={{ maxWidth: "800px" }}>
          <p style={{
            fontSize: "0.8rem",
            fontWeight: "600",
            color: "var(--primary)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "1.25rem"
          }}>
            Asset management for shared equipment rooms
          </p>
          <h1 style={{
            fontSize: "clamp(2.6rem, 6.5vw, 4.8rem)",
            lineHeight: 1.05,
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: "1.5rem"
          }}>
            Track, book, and manage shared equipment.
          </h1>
          <p style={{
            fontSize: "1.1rem",
            maxWidth: "60ch",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: "1.5rem"
          }}>
            SmartAsset tracks inventory, handles booking requests and approvals, and records every handover via QR scan. Admins manage the full lifecycle from one dashboard.
          </p>

          <div style={{ display: "flex", gap: "1rem", marginTop: "2.5rem", flexWrap: "wrap" }}>
            <Link href="/login" className="btn btn-primary" style={{ padding: "0.85rem 2rem", fontSize: "0.95rem" }}>
              Browse catalog
            </Link>
            <Link href="/login" className="btn btn-secondary" style={{ padding: "0.85rem 2rem", fontSize: "0.95rem" }}>
              Admin login
            </Link>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
          marginTop: "5rem"
        }}>
          {features.map((f) => (
            <div key={f.title} className="glass-card" style={{ 
              background: "var(--bg-panel)",
              padding: "2rem",
              border: "1px solid var(--border-color)",
              boxShadow: "var(--shadow-sm)"
            }}>
              <h3 style={{ 
                fontSize: "1.1rem", 
                marginBottom: "0.75rem",
                color: "var(--text-primary)",
                fontWeight: 600
              }}>{f.title}</h3>
              <p style={{ 
                fontSize: "0.95rem", 
                lineHeight: 1.6,
                color: "var(--text-secondary)"
              }}>{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer style={{
        padding: "2rem clamp(1.5rem, 6vw, 4rem)",
        fontSize: "0.85rem",
        color: "var(--text-muted)",
        zIndex: 1,
        fontFamily: "var(--font-mono)",
        borderTop: "1px solid var(--border-color)",
        background: "var(--bg-panel)",
        marginTop: "auto"
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          Built with Next.js, Prisma and PostgreSQL.
        </div>
      </footer>
    </div>
  );
}
