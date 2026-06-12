import Link from "next/link";

export const metadata = {
  title: "SmartAsset — campus equipment, without the logbook",
  description:
    "SmartAsset tracks shared equipment, manages bookings, approvals, QR-based workflows, and inventory visibility from one system.",
};

const features = [
  {
    title: "Booking engine",
    body: "Availability is verified inside database transactions, ensuring overlapping bookings can never exceed inventory.",
  },
  {
    title: "QR operations",
    body: "Every asset carries a QR code. One scan identifies the item, verifies the booking, and records issue or return instantly.",
  },
  {
    title: "Audit trail",
    body: "Every approval, issue, return and inventory update is recorded in an append-only audit trail, making accountability a search instead of a guessing game.",
  },
  {
    title: "Approval workflow",
    body: "Students request equipment. Administrators approve or reject from a unified dashboard while users track request status in real time.",
  },
  {
    title: "Inventory management",
    body: "Assets are categorized, searchable, quantity-aware, and maintain accurate availability throughout their lifecycle.",
  },
  {
    title: "Analytics",
    body: "Monitor utilization rates, active bookings, overdue returns and inventory health through a live dashboard.",
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
          <div className="logo-plate" style={{ width: "34px", height: "34px", fontSize: "1.05rem" }}>
            SA
          </div>
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
            For the cultural council equipment room
          </p>
          <h1 style={{
            fontSize: "clamp(2.6rem, 6.5vw, 4.8rem)",
            lineHeight: 1.05,
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: "1.5rem"
          }}>
            The logbook retired.<br />
            Nobody misses it.
          </h1>
          <p style={{
            fontSize: "1.1rem",
            maxWidth: "60ch",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: "1.5rem"
          }}>
            SmartAsset tracks every camera, cable and cajón the council owns — who has it, 
            who's next in line, and when it's due back. Students book in seconds, 
            admins approve from one queue, and the warehouse runs on QR scans.
          </p>

          <div style={{ display: "flex", gap: "1rem", marginTop: "2.5rem", flexWrap: "wrap" }}>
            <Link href="/login" className="btn btn-primary" style={{ padding: "0.85rem 2rem", fontSize: "0.95rem" }}>
              Browse the catalog
            </Link>
            <Link href="/login" className="btn btn-secondary" style={{ padding: "0.85rem 2rem", fontSize: "0.95rem" }}>
              Admin console
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
          Built with Next.js, Prisma and PostgreSQL. The only thing we retired was the logbook.
        </div>
      </footer>
    </div>
  );
}
