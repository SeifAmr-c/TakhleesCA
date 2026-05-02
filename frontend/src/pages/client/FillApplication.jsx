import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { createApplication, listCategories } from "../../api/applications.js";

const FALLBACK_CATEGORIES = [
  { CategoryID: 1, Name: "Imports" },
  { CategoryID: 2, Name: "Exports" },
  { CategoryID: 3, Name: "Personal effects" },
  { CategoryID: 4, Name: "Re-export" },
];

function FillApplication() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    CategoryID: "",
    Origin: "",
    Destination: "",
    CargoType: "",
    Weight: "",
    Description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listCategories();
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        setCategories(list.length ? list : FALLBACK_CATEGORIES);
      } catch {
        if (active) setCategories(FALLBACK_CATEGORIES);
      }
    })();
    return () => { active = false; };
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.CategoryID) return setError("Please select a service category.");
    if (!form.Origin.trim() || !form.Destination.trim()) {
      return setError("Origin and destination are required.");
    }
    setSubmitting(true);
    try {
      const res = await createApplication({
        ...form,
        CompanyID: companyId ? Number(companyId) : undefined,
      });
      const applicationId = res?.data?.ApplicationID || res?.ApplicationID || "new";
      navigate(`/payment/${applicationId}`, { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Could not submit the application. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="New application"
      subtitle="Tell the company what you're shipping and any special requirements."
      role="Client"
    >
      <Reveal as="div" style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Stepper */}
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div className="timeline">
            <div className="timeline-step active"><span className="dot" />Details</div>
            <div className="timeline-step"><span className="dot" />Documents</div>
            <div className="timeline-step"><span className="dot" />Payment</div>
            <div className="timeline-step"><span className="dot" />Tracking</div>
          </div>
        </div>

        {error && <div className="banner-error"><Icon name="bell" size={16} />{error}</div>}

        <form onSubmit={handleSubmit} className="card card-pad-lg">
          <h3 className="card-title">Shipment details</h3>
          <p className="card-subtitle">All fields marked with * are required.</p>

          <div className="stack">
            <label className="field">
              <span className="field-label">Service category *</span>
              <select className="select" value={form.CategoryID} onChange={update("CategoryID")} disabled={submitting} required>
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.CategoryID} value={c.CategoryID}>{c.Name}</option>
                ))}
              </select>
            </label>

            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label className="field">
                <span className="field-label">Origin port *</span>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="pin" size={16} /></span>
                  <input className="input" value={form.Origin} onChange={update("Origin")} required disabled={submitting} placeholder="Shanghai" />
                </div>
              </label>
              <label className="field">
                <span className="field-label">Destination port *</span>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="pin" size={16} /></span>
                  <input className="input" value={form.Destination} onChange={update("Destination")} required disabled={submitting} placeholder="Alexandria" />
                </div>
              </label>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label className="field">
                <span className="field-label">Cargo type</span>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="package" size={16} /></span>
                  <input className="input" value={form.CargoType} onChange={update("CargoType")} disabled={submitting} placeholder="Electronics" />
                </div>
              </label>
              <label className="field">
                <span className="field-label">Weight (kg)</span>
                <input className="input" inputMode="numeric" value={form.Weight} onChange={update("Weight")} disabled={submitting} />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Description / special notes</span>
              <textarea className="textarea" rows={4} value={form.Description} onChange={update("Description")} disabled={submitting} placeholder="Anything the company should know…" />
            </label>
          </div>

          <hr className="divider" />

          <div className="row" style={{ justifyContent: "space-between" }}>
            <div
              style={{
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--ink-faint)",
              }}
            >
              <Icon name="lock" size={14} /> Your application is encrypted in transit.
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                {submitting ? (
                  <ContainerSpinner inline size={20} label="Submitting…" />
                ) : (
                  <>Continue to payment <Icon name="arrow_right" size={16} /></>
                )}
              </button>
            </div>
          </div>
        </form>
      </Reveal>
    </DashboardLayout>
  );
}

export default FillApplication;
