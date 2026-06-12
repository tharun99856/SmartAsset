"use client";

import { useEffect, useRef, useState } from "react";
import { useDashboard } from "../layout";

// a QR might hold the scan-station URL or just a bare asset number
function parseAssetId(text) {
  if (!text) return null;
  const trimmed = text.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  try {
    const url = new URL(trimmed, "http://placeholder.local");
    const fromParam = url.searchParams.get("assetId");
    if (fromParam && /^\d+$/.test(fromParam)) return parseInt(fromParam, 10);
  } catch {
    // not a URL — fall through
  }
  return null;
}

export default function ScanStationPage() {
  const { user, fetchNotifications } = useDashboard();
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualId, setManualId] = useState("");
  const [asset, setAsset] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [lookupError, setLookupError] = useState("");
  const [actionBusy, setActionBusy] = useState(null);
  const [flash, setFlash] = useState("");
  const scannerRef = useRef(null);

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // already stopped
      }
    }
  };

  const loadAsset = async (assetId) => {
    setLookupError("");
    setFlash("");
    try {
      const res = await fetch(`/api/assets/${assetId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That ID didn't match anything in the inventory");
      setAsset(data.asset);
      setBookings(data.bookings || []);
    } catch (error) {
      setAsset(null);
      setBookings([]);
      setLookupError(error.message);
    }
  };

  const handleDetected = async (decodedText) => {
    const assetId = parseAssetId(decodedText);
    await stopScanner();
    if (assetId == null) {
      setLookupError("Scanned a code, but it doesn't look like one of ours.");
      return;
    }
    loadAsset(assetId);
  };

  const startScanner = async () => {
    setCameraError("");
    setLookupError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-viewport");
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decodedText) => handleDetected(decodedText),
        () => {} // per-frame misses are normal, stay quiet
      );
    } catch (error) {
      scannerRef.current = null;
      setScanning(false);
      setCameraError(
        "Couldn't open the camera. Check browser permissions, or type the asset ID below instead."
      );
      console.error("Scanner start failed:", error);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // printed labels deep-link here with ?assetId=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = parseAssetId(params.get("assetId") || "");
    if (fromUrl != null) loadAsset(fromUrl);
  }, []);

  const handleManualLookup = (e) => {
    e.preventDefault();
    const assetId = parseAssetId(manualId);
    if (assetId == null) {
      setLookupError("Asset IDs are plain numbers — check the label under the QR code.");
      return;
    }
    loadAsset(assetId);
  };

  const transition = async (booking, action) => {
    setActionBusy(booking.id);
    setLookupError("");
    setFlash("");
    try {
      const res = await fetch(`/api/bookings/${booking.id}/${action}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That didn't go through — try again");
      setFlash(
        action === "issue"
          ? `Handed over to ${booking.user.name}. Booking #${booking.id} is now Issued.`
          : `Checked back in from ${booking.user.name}. Stock updated.`
      );
      loadAsset(booking.assetId);
      fetchNotifications();
    } catch (error) {
      setLookupError(error.message);
    } finally {
      setActionBusy(null);
    }
  };

  if (user && user.role !== "admin") {
    return <p style={{ padding: "2rem", textAlign: "center" }}>This page is for warehouse admins.</p>;
  }

  const approvedBookings = bookings.filter((b) => b.status === "Approved");
  const outBookings = bookings.filter((b) => b.status === "Issued" || b.status === "Overdue");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 420px) 1fr", gap: "1.5rem", alignItems: "start" }}>

      <div className="glass-card" style={{ background: "var(--bg-panel)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "1.1rem" }}>Scan a QR label</h3>
          <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Point the camera at the code on the equipment tag. The matching
            allocations show up on the right — no typing, no logbook.
          </p>
        </div>

        <div
          id="qr-viewport"
          style={{
            width: "100%",
            minHeight: scanning ? "280px" : "0px",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            background: scanning ? "#000" : "transparent"
          }}
        ></div>

        {cameraError && (
          <p style={{ fontSize: "0.8rem", color: "var(--status-overdue)" }}>{cameraError}</p>
        )}

        {scanning ? (
          <button className="btn btn-secondary" onClick={stopScanner}>Stop camera</button>
        ) : (
          <button className="btn btn-primary" onClick={startScanner}>Open camera</button>
        )}

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            No camera handy? Enter the asset ID printed under the code:
          </p>
          <form onSubmit={handleManualLookup} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 12"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-secondary">Look up</button>
          </form>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {flash && (
          <div className="alert alert-success">
            ✅ {flash}
          </div>
        )}

        {lookupError && (
          <div className="alert alert-error">
            ⚠️ {lookupError}
          </div>
        )}

        {!asset ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg-panel)" }}>
            <h3 style={{ fontSize: "1.1rem" }}>Nothing scanned yet</h3>
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "var(--text-muted)" }}>
              Scan a tag or look up an ID and the item's live allocations will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="glass-card" style={{ background: "var(--bg-panel)" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: "600", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {asset.category?.name} · Asset #{asset.id}
              </span>
              <h2 style={{ fontSize: "1.4rem", marginTop: "0.25rem" }}>{asset.name}</h2>
              <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>{asset.description || ""}</p>
              <div style={{ display: "flex", gap: "2rem", marginTop: "1rem", fontSize: "0.9rem" }}>
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>In stock</span>
                  <strong>{asset.availableQuantity} / {asset.totalQuantity}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>Condition</span>
                  <strong>{asset.status}</strong>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ background: "var(--bg-panel)" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Ready for pickup ({approvedBookings.length})</h3>
              {approvedBookings.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No approved requests waiting on this item.</p>
              ) : (
                approvedBookings.map((b) => (
                  <div key={b.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0.75rem 0", borderBottom: "1px solid var(--border-color)", gap: "1rem", flexWrap: "wrap"
                  }}>
                    <div>
                      <strong style={{ fontSize: "0.9rem" }}>{b.user.name}</strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>
                        {b.quantityRequested} unit{b.quantityRequested > 1 ? "s" : ""} · {new Date(b.startDate).toLocaleDateString()} → {new Date(b.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      className="btn btn-success"
                      disabled={actionBusy === b.id}
                      onClick={() => transition(b, "issue")}
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    >
                      {actionBusy === b.id ? "Issuing…" : "Hand over"}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="glass-card" style={{ background: "var(--bg-panel)" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Currently out ({outBookings.length})</h3>
              {outBookings.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Every unit of this item is accounted for.</p>
              ) : (
                outBookings.map((b) => (
                  <div key={b.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0.75rem 0", borderBottom: "1px solid var(--border-color)", gap: "1rem", flexWrap: "wrap"
                  }}>
                    <div>
                      <strong style={{ fontSize: "0.9rem" }}>{b.user.name}</strong>
                      {b.status === "Overdue" && (
                        <span className="badge badge-overdue" style={{ marginLeft: "0.5rem", fontSize: "0.6rem" }}>Overdue</span>
                      )}
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>
                        {b.quantityRequested} unit{b.quantityRequested > 1 ? "s" : ""} · due {new Date(b.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      className="btn btn-secondary"
                      disabled={actionBusy === b.id}
                      onClick={() => transition(b, "return")}
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    >
                      {actionBusy === b.id ? "Checking in…" : "Check in"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
