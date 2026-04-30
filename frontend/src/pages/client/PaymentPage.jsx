import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Icon from "../../components/Icon.jsx";
import { submitPayment } from "../../api/payments.js";

function PaymentPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState({ Number: "", Name: "", Expiry: "", CVC: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const update = (key) => (e) => setCard((c) => ({ ...c, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (card.Number.replace(/\s/g, "").length < 12) return setError("Enter a valid card number.");
    if (!card.Name.trim()) return setError("Cardholder name is required.");
    if (!/^\d{2}\/\d{2}$/.test(card.Expiry)) return setError("Expiry must be MM/YY.");
    if (!/^\d{3,4}$/.test(card.CVC)) return setError("CVC must be 3 or 4 digits.");

    setSubmitting(true);
    try {
      await submitPayment({ ApplicationID: applicationId, Amount: 1280, Method: "card" });
      setSuccess("Payment confirmed. Redirecting to tracking…");
      setTimeout(() => navigate("/tracking", { replace: true }), 1200);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Payment failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Complete your payment"
      subtitle={`Application #${applicationId} — funds are held until the company confirms completion.`}
      role="Client"
    >
      <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 24 }}>
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="timeline">
              <div className="timeline-step done"><span className="dot" />Details</div>
              <div className="timeline-step done"><span className="dot" />Documents</div>
              <div className="timeline-step active"><span className="dot" />Payment</div>
              <div className="timeline-step"><span className="dot" />Tracking</div>
            </div>
          </div>

          {error && <div className="banner-error"><Icon name="bell" size={16} />{error}</div>}
          {success && <div className="banner-success"><Icon name="check" size={16} />{success}</div>}

          <form className="card-glow" style={{ padding: 28 }} onSubmit={handleSubmit} noValidate>
            <h3 className="card-title">Card details</h3>
            <p className="card-subtitle">We use bank-grade encryption — your details never touch our servers.</p>

            <div className="stack">
              <label className="field">
                <span className="field-label">Card number</span>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="lock" size={16} /></span>
                  <input className="input" inputMode="numeric" value={card.Number} onChange={update("Number")} placeholder="1234 5678 9012 3456" required disabled={submitting} />
                </div>
              </label>
              <label className="field">
                <span className="field-label">Cardholder name</span>
                <input className="input" value={card.Name} onChange={update("Name")} required disabled={submitting} />
              </label>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span className="field-label">Expiry</span>
                  <input className="input" placeholder="MM/YY" value={card.Expiry} onChange={update("Expiry")} required disabled={submitting} />
                </label>
                <label className="field">
                  <span className="field-label">CVC</span>
                  <input className="input" inputMode="numeric" value={card.CVC} onChange={update("CVC")} required disabled={submitting} />
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
                {submitting ? "Processing…" : <>Pay EGP 1,280 <Icon name="arrow_right" size={16} /></>}
              </button>
              <div className="muted" style={{ textAlign: "center", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                <Icon name="shield" size={13} /> Secured by 256-bit TLS · PCI-DSS compliant
              </div>
            </div>
          </form>
        </div>

        <aside>
          <div className="card-glow" style={{ position: "sticky", top: 88, padding: 24 }}>
            <h3 className="card-title">Order summary</h3>
            <p className="card-subtitle">Application #{applicationId}</p>

            <div className="stack" style={{ gap: 10, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">Service fee</span>
                <span style={{ color: "var(--gray-800)" }}>EGP 1,200.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">Platform fee</span>
                <span style={{ color: "var(--gray-800)" }}>EGP 80.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">VAT</span>
                <span style={{ color: "var(--gray-800)" }}>Included</span>
              </div>
            </div>

            <hr className="divider" />

            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18, color: "var(--navy)" }}>
              <span>Total due</span>
              <span>EGP 1,280.00</span>
            </div>

            <hr className="divider" />

            <div className="muted" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="check" size={14} color="var(--success)" />
              Held until milestone "Released"
            </div>
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}

export default PaymentPage;
