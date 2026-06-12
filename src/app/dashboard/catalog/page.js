"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDashboard } from "../layout";

function CatalogSkeleton() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "1.5rem"
    }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton" style={{ height: "240px", borderRadius: "12px" }}></div>
      ))}
    </div>
  );
}

function AssetCatalog() {
  const { fetchNotifications } = useDashboard();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // filters live in the URL so views are shareable and survive refresh
  const search = searchParams.get("q") || "";
  const selectedCategory = searchParams.get("category") || "";
  const availableOnly = searchParams.get("available") === "1";

  const [searchInput, setSearchInput] = useState(search);
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [bookingQty, setBookingQty] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const setParam = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // debounce typing into ?q=
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== search) setParam("q", searchInput);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("q", search);
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (availableOnly) params.append("available", "true");

      const res = await fetch(`/api/assets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [search, selectedCategory, availableOnly]);

  const openBookingModal = (asset) => {
    setSelectedAsset(asset);
    setBookingQty(1);
    setBookingError("");
    setBookingSuccess("");

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(tomorrow.toISOString().split("T")[0]);
  };

  const closeBookingModal = () => {
    setSelectedAsset(null);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError("");
    setBookingSuccess("");

    if (!bookingQty || bookingQty <= 0) {
      setBookingError("Quantity needs to be at least 1.");
      return;
    }

    setBookingLoading(true);
    try {
      // availability is decided server-side per date window, not by today's stock
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          quantityRequested: bookingQty,
          startDate,
          endDate
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Couldn't submit that request");
      }

      setBookingSuccess("Request sent! You'll get a notification once an admin reviews it.");
      fetchAssets();
      fetchNotifications();

      setTimeout(() => {
        closeBookingModal();
      }, 2000);
    } catch (error) {
      setBookingError(error.message);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      <div className="glass-card" style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "1.25rem",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--bg-panel)",
        padding: "1.25rem"
      }}>
        <div style={{ display: "flex", flex: 1, minWidth: "260px", gap: "1rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              placeholder="Search for cameras, mics, lights…"
              className="form-input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ paddingLeft: "2.5rem" }}
            />
            <span style={{ position: "absolute", left: "0.95rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.95rem" }}>
              🔍
            </span>
          </div>

          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => setParam("category", e.target.value)}
            style={{ width: "200px" }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <label style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          cursor: "pointer",
          fontSize: "0.9rem",
          color: "var(--text-secondary)",
          userSelect: "none"
        }}>
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setParam("available", e.target.checked ? "1" : "")}
            style={{
              width: "16px",
              height: "16px",
              accentColor: "var(--primary)",
              cursor: "pointer"
            }}
          />
          <span>In stock today only</span>
        </label>
      </div>

      {loading ? (
        <CatalogSkeleton />
      ) : assets.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-panel)" }}>
          <span style={{ fontSize: "3rem" }}>📦</span>
          <h3 style={{ marginTop: "1rem", fontSize: "1.25rem" }}>Nothing matched that</h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            Try a shorter search term, or clear the filters and browse everything.
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.5rem"
        }}>
          {assets.map((asset) => {
            const isOutOfStock = asset.availableQuantity === 0;
            const statusClass = isOutOfStock ? "rejected" : asset.status === "Under Maintenance" ? "overdue" : "issued";

            return (
              <div
                key={asset.id}
                className="glass-card"
                onClick={() => openBookingModal(asset)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer"
                }}
              >
                <div>
                  <span style={{
                    fontSize: "0.7rem",
                    fontWeight: "600",
                    color: "var(--primary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}>
                    {asset.category.name}
                  </span>

                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", margin: "0.25rem 0 0.5rem 0" }}>
                    {asset.name}
                  </h3>

                  <p style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    minHeight: "3.75rem",
                    marginBottom: "1rem"
                  }}>
                    {asset.description || "No description yet."}
                  </p>
                </div>

                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", textTransform: "uppercase", fontWeight: "500" }}>In stock now</span>
                    <strong style={{ fontSize: "0.95rem" }}>
                      {asset.availableQuantity} <span style={{ fontWeight: "400", color: "var(--text-muted)" }}>of {asset.totalQuantity}</span>
                    </strong>
                  </div>
                  <span className={`badge badge-${statusClass}`} style={{ fontSize: "0.65rem" }}>
                    {isOutOfStock ? "All out" : asset.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedAsset && (
        <div className="modal-overlay" onClick={closeBookingModal}>
          <div
            className="modal-content"
            style={{ maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--primary)", textTransform: "uppercase" }}>
                  {selectedAsset.category.name}
                </span>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginTop: "0.25rem" }}>{selectedAsset.name}</h2>
              </div>
              <button
                onClick={closeBookingModal}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  color: "var(--text-muted)"
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              {selectedAsset.description || "No description yet."}
            </p>

            <div style={{
              background: "var(--bg-inset)",
              borderRadius: "var(--radius-sm)",
              padding: "1rem",
              border: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1.5rem"
            }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>In stock now</span>
                <strong style={{ fontSize: "1.2rem", color: "var(--status-issued)" }}>{selectedAsset.availableQuantity} units</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Total pool</span>
                <strong style={{ fontSize: "1.2rem" }}>{selectedAsset.totalQuantity} units</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Condition</span>
                <strong style={{ fontSize: "1.2rem", color: "var(--primary)" }}>{selectedAsset.status}</strong>
              </div>
            </div>

            {bookingError && (
              <div className="alert alert-error">
                {bookingError}
              </div>
            )}

            {bookingSuccess && (
              <div className="alert alert-success">
                {bookingSuccess}
              </div>
            )}

            {selectedAsset.status === "Available" || selectedAsset.status === "Partially Available" ? (
              <form onSubmit={handleBookingSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="startDate">Pick up on</label>
                    <input
                      id="startDate"
                      type="date"
                      className="form-input"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="endDate">Return by</label>
                    <input
                      id="endDate"
                      type="date"
                      className="form-input"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="qty">How many do you need?</label>
                  <input
                    id="qty"
                    type="number"
                    min="1"
                    max={selectedAsset.totalQuantity}
                    className="form-input"
                    required
                    value={bookingQty}
                    onChange={(e) => setBookingQty(parseInt(e.target.value) || "")}
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeBookingModal}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={bookingLoading || bookingSuccess}
                    style={{ flex: 2 }}
                  >
                    {bookingLoading ? "Sending…" : "Request booking"}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="alert alert-error" style={{ justifyContent: "center" }}>
                  This item is {selectedAsset.status === "Under Maintenance" ? "in the workshop for maintenance" : "not bookable right now"}. Check back soon.
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeBookingModal}
                  style={{ width: "100%", marginTop: "1.5rem" }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssetCatalogPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <AssetCatalog />
    </Suspense>
  );
}
