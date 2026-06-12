"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useDashboard } from "../layout";

export default function InventoryCRUDPage() {
  const { user } = useDashboard();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null); // null if adding
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    description: "",
    totalQuantity: 1,
    status: "Available"
  });
  const [modalLoading, setModalLoading] = useState(false);

  // QR label modal
  const [qrAsset, setQrAsset] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/assets");
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

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchAssets();
      fetchCategories();
    }
  }, [user]);

  const openAddModal = () => {
    setEditingAsset(null);
    setFormData({
      name: "",
      categoryId: categories[0]?.id || "",
      description: "",
      totalQuantity: 1,
      status: "Available"
    });
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const openEditModal = (asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      categoryId: asset.categoryId,
      description: asset.description || "",
      totalQuantity: asset.totalQuantity,
      status: asset.status
    });
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setModalLoading(true);

    const isEdit = !!editingAsset;
    const endpoint = isEdit ? `/api/assets/${editingAsset.id}` : "/api/assets";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save asset details");

      setSuccessMsg(isEdit ? "Asset updated successfully!" : "Asset added to inventory!");
      closeModal();
      fetchAssets();
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setModalLoading(false);
    }
  };

  const openQrModal = async (asset) => {
    setErrorMsg("");
    try {
      // the QR is a deep link to the scan station, so any phone camera works
      const target = `${window.location.origin}/dashboard/scan?assetId=${asset.id}`;
      const dataUrl = await QRCode.toDataURL(target, {
        width: 360,
        margin: 2,
        color: { dark: "#0b0f19", light: "#ffffff" }
      });
      setQrAsset(asset);
      setQrDataUrl(dataUrl);
    } catch (error) {
      setErrorMsg("Couldn't draw the QR code - try again.");
      console.error("QR generation failed:", error);
    }
  };

  const printQrLabel = () => {
    if (!qrAsset || !qrDataUrl) return;
    const win = window.open("", "_blank", "width=420,height=560");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>QR label - ${qrAsset.name}</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 24px;">
          <img src="${qrDataUrl}" style="width: 320px; height: 320px;" />
          <h2 style="margin: 12px 0 4px;">${qrAsset.name}</h2>
          <p style="margin: 0; color: #555;">Asset #${qrAsset.id} · ${qrAsset.category?.name || ""}</p>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleDelete = async (asset) => {
    setErrorMsg("");
    setSuccessMsg("");
    
    const confirmed = window.confirm(`Are you absolutely sure you want to delete "${asset.name}" from the inventory database?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to delete asset");

      setSuccessMsg(`Asset "${asset.name}" deleted successfully.`);
      fetchAssets();
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  if (loading) {
    return <div className="skeleton" style={{ height: "200px", borderRadius: "12px" }}></div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          Everything the council owns, in one list. Stock, condition and printable QR labels.
        </p>
        <button className="btn btn-primary" onClick={openAddModal} style={{ padding: "0.6rem 1.25rem" }}>
          Add asset
        </button>
      </div>

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
        {assets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
            <span style={{ fontSize: "3rem" }}>🛠️</span>
            <h3 style={{ fontSize: "1.25rem", marginTop: "1rem" }}>Nothing registered yet</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Add your first asset and it'll show up in the student catalog right away.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Resource Name</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Current Stock</th>
                  <th>Condition</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const isOutOfStock = asset.availableQuantity === 0;
                  const statusClass = isOutOfStock ? "rejected" : asset.status === "Under Maintenance" ? "overdue" : "issued";
                  
                  return (
                    <tr key={asset.id}>
                      <td>
                        <strong style={{ display: "block" }}>{asset.name}</strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID: #{asset.id}</span>
                      </td>
                      <td>{asset.category.name}</td>
                      <td style={{ maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {asset.description || ""}
                      </td>
                      <td>
                        <strong>{asset.availableQuantity}</strong>
                        <span style={{ color: "var(--text-muted)", fontWeight: "400" }}> / {asset.totalQuantity} units</span>
                      </td>
                      <td>
                        <span className={`badge badge-${statusClass}`} style={{ fontSize: "0.65rem" }}>
                          {isOutOfStock ? "Out of Stock" : asset.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => openQrModal(asset)}
                            className="btn btn-secondary"
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                          >
                            QR label
                          </button>
                          <button
                            onClick={() => openEditModal(asset)}
                            className="btn btn-secondary"
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(asset)}
                            className="btn btn-danger"
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                          >
                            Delete
                          </button>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content"
            style={{ maxWidth: "500px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.25rem", marginBottom: "1.25rem" }}>
              {editingAsset ? `Edit Asset: ${editingAsset.name}` : "Add New Asset"}
            </h3>

            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Asset Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sony Alpha A7 III"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="categoryId">Category</label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    className="form-select"
                    required
                    value={formData.categoryId}
                    onChange={handleInputChange}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="status">Condition Status</label>
                  <select
                    id="status"
                    name="status"
                    className="form-select"
                    required
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Available">Available</option>
                    <option value="Partially Available">Partially Available</option>
                    <option value="Unavailable">Unavailable</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="totalQuantity">Total Pool Quantity</label>
                <input
                  id="totalQuantity"
                  name="totalQuantity"
                  type="number"
                  min="0"
                  className="form-input"
                  required
                  value={formData.totalQuantity}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="description">Asset Description</label>
                <textarea
                  id="description"
                  name="description"
                  className="form-textarea"
                  placeholder="Enter specifications, serial numbers, accessory checklists..."
                  rows="3"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={modalLoading}
                  style={{ flex: 1 }}
                >
                  {modalLoading ? "Saving..." : "Save Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Label Modal */}
      {qrAsset && (
        <div className="modal-overlay" onClick={() => setQrAsset(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "400px", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.15rem" }}>{qrAsset.name}</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Asset #{qrAsset.id} · stick this on the kit so the warehouse can scan it in and out.
            </p>
            <div style={{
              background: "#fff",
              borderRadius: "var(--radius-sm)",
              padding: "1rem",
              margin: "1.25rem 0",
              display: "inline-block"
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt={`QR code for ${qrAsset.name}`} style={{ width: "240px", height: "240px", display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-secondary" onClick={() => setQrAsset(null)} style={{ flex: 1 }}>
                Close
              </button>
              <button className="btn btn-primary" onClick={printQrLabel} style={{ flex: 1 }}>
                Print label
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
