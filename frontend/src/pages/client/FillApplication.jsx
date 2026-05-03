import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { createApplication, listCategories } from "../../api/applications.js";
import { listPorts } from "../../api/ports.js";
import { createDocumentRecord } from "../../api/documents.js";
import { submitPayment } from "../../api/payments.js";

const FALLBACK_CATEGORIES = [
  { CategoryID: 1, Name: "Imports" },
  { CategoryID: 2, Name: "Exports" },
  { CategoryID: 3, Name: "Personal effects" },
  { CategoryID: 4, Name: "Re-export" },
];

const FALLBACK_PORTS = [
  { PortID: 1, PortName: "Alexandria", PortType: "Sea" },
  { PortID: 2, PortName: "Damietta", PortType: "Sea" },
  { PortID: 3, PortName: "Port Said", PortType: "Sea" },
  { PortID: 4, PortName: "Cairo International", PortType: "Air" },
  { PortID: 5, PortName: "Suez", PortType: "Sea" },
];

const DOCUMENT_TYPES = [
  "National ID / Passport",
  "Proof Of Payment",
  "Delegation",
  "Other",
];

const MAX_DOC_BYTES = 5 * 1024 * 1024;

const STEPS = ["Details", "Documents", "Payment", "Tracking"];

/* ---------- Brand logos (inline, design-system-aligned) ---------- */
const VisaLogo = () => (
  <svg viewBox="0 0 64 22" width="44" height="16" aria-label="Visa">
    <text
      x="0"
      y="17"
      fontFamily="var(--font-mono)"
      fontSize="20"
      fontWeight="700"
      letterSpacing="-1"
      fontStyle="italic"
      fill="var(--harbor-800)"
    >
      VISA
    </text>
  </svg>
);

const MastercardLogo = () => (
  <svg viewBox="0 0 40 24" width="36" height="22" aria-label="Mastercard">
    <circle cx="14" cy="12" r="9" fill="var(--signal-stop)" opacity="0.85" />
    <circle cx="26" cy="12" r="9" fill="var(--safety)" opacity="0.85" />
    <path
      d="M20 6.4a9 9 0 0 1 0 11.2 9 9 0 0 1 0-11.2Z"
      fill="var(--accent-dark)"
    />
  </svg>
);

const BankLogo = () => (
  <svg viewBox="0 0 32 22" width="32" height="22" aria-label="Bank">
    <path
      d="M16 2 2 8h28L16 2Zm-12 8h4v8H4v-8Zm9 0h4v8h-4v-8Zm9 0h4v8h-4v-8ZM2 20h28v2H2v-2Z"
      fill="var(--harbor-800)"
    />
  </svg>
);

/* ---------- Step components ---------- */
function Stepper({ current }) {
  return (
    <div className="card" style={{ padding: 20, marginBottom: 24 }}>
      <div className="timeline">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`timeline-step ${i < current ? "done" : i === current ? "active" : ""}`}
          >
            <span className="dot" />
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailsStep({ form, update, categories, ports, submitting }) {
  return (
    <div className="card card-pad-lg">
      <h3 className="card-title">Shipment details</h3>
      <p className="card-subtitle">Tell the company what you're clearing and where it should go.</p>

      <div className="stack">
        <label className="field">
          <span className="field-label">Service category *</span>
          <select
            className="select"
            value={form.CategoryID}
            onChange={update("CategoryID")}
            disabled={submitting}
            required
          >
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.CategoryID} value={c.CategoryID}>{c.Name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Port *</span>
          <select
            className="select"
            value={form.PortID}
            onChange={update("PortID")}
            disabled={submitting}
            required
          >
            <option value="">Select a port…</option>
            {ports.map((p) => (
              <option key={p.PortID} value={p.PortID}>
                {p.PortName}{p.PortType ? ` (${p.PortType})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Delivery address *</span>
          <div className="input-with-icon">
            <span className="input-icon"><Icon name="pin" size={16} /></span>
            <input
              className="input"
              value={form.DeliveryAddress}
              onChange={update("DeliveryAddress")}
              required
              disabled={submitting}
              placeholder="Street, district, city"
            />
          </div>
          <span className="hint">Where the shipment should be delivered after clearance.</span>
        </label>
      </div>
    </div>
  );
}

function DocumentsStep({ documents, setDocuments, submitting, error, setError }) {
  const updateType = (id, value) =>
    setDocuments((list) => list.map((d) => (d.id === id ? { ...d, type: value } : d)));

  const updateFile = (id, file) =>
    setDocuments((list) => list.map((d) => (d.id === id ? { ...d, file } : d)));

  const addDocument = () =>
    setDocuments((list) => [
      ...list,
      { id: Date.now() + Math.random(), type: "", file: null },
    ]);

  const removeDocument = (id) =>
    setDocuments((list) =>
      list.length === 1 ? list : list.filter((d) => d.id !== id)
    );

  const onPickFile = (id) => (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return updateFile(id, null);
    if (file.size > MAX_DOC_BYTES) {
      setError("Each document must be 5 MB or smaller.");
      e.target.value = "";
      return updateFile(id, null);
    }
    setError("");
    updateFile(id, file);
  };

  return (
    <div className="card card-pad-lg">
      <h3 className="card-title">Supporting documents</h3>
      <p className="card-subtitle">
        Choose a document type for each upload. Add more rows as needed.
      </p>

      <div className="stack">
        {documents.map((d, i) => (
          <div
            key={d.id}
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              background: "var(--surface)",
            }}
          >
            <div
              className="row"
              style={{ justifyContent: "space-between", marginBottom: 10 }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink-faint)",
                }}
              >
                Document #{i + 1}
              </span>
              {documents.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeDocument(d.id)}
                  disabled={submitting}
                >
                  Remove
                </button>
              )}
            </div>

            <div
              className="grid"
              style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: 12 }}
            >
              <label className="field">
                <span className="field-label">Document type *</span>
                <select
                  className="select"
                  value={d.type}
                  onChange={(e) => updateType(d.id, e.target.value)}
                  disabled={submitting}
                  required
                >
                  <option value="">Select type…</option>
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">File *</span>
                <input
                  type="file"
                  className="input"
                  accept="application/pdf,image/*"
                  onChange={onPickFile(d.id)}
                  disabled={submitting}
                  required
                />
                <span className="hint">
                  {d.file ? `Selected: ${d.file.name}` : "PDF or image, up to 5 MB."}
                </span>
              </label>
            </div>
          </div>
        ))}

        {/* (+) add another document */}
        <button
          type="button"
          onClick={addDocument}
          disabled={submitting}
          className="btn btn-secondary"
          style={{
            alignSelf: "flex-start",
            borderStyle: "dashed",
          }}
          aria-label="Add another document"
        >
          <span
            aria-hidden="true"
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "1px solid var(--ink-soft)",
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            +
          </span>
          Add another document
        </button>
      </div>

      {error && <div className="banner-error" style={{ marginTop: 16 }}><Icon name="bell" size={16} />{error}</div>}
    </div>
  );
}

function PaymentStep({ payment, setPayment, submitting }) {
  const update = (key) => (e) =>
    setPayment((p) => ({ ...p, [key]: e.target.value }));

  const setGateway = (val) => setPayment((p) => ({ ...p, Gateway: val }));
  const setType = (val) => setPayment((p) => ({ ...p, Type: val }));

  const optionStyle = (active) => ({
    border: `1px solid ${active ? "var(--brand)" : "var(--line-strong)"}`,
    background: active ? "var(--harbor-100)" : "var(--surface)",
    borderRadius: "var(--radius-md)",
    padding: "14px 16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 12,
    transition: "border-color 200ms var(--ease), background 200ms var(--ease)",
  });

  const isCard = payment.Gateway === "Credit Card";
  const isBank = payment.Gateway === "Bank Transfer";
  const isFull = payment.Type === "FULL";
  const isPartial = payment.Type === "PARTIAL";

  return (
    <div className="card card-pad-lg">
      <h3 className="card-title">Payment</h3>
      <p className="card-subtitle">
        Choose how much to pay now and your preferred payment method.
      </p>

      <div className="stack">
        {/* Payment type */}
        <div className="field">
          <span className="field-label">Payment type *</span>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={optionStyle(isFull)}>
              <input
                type="radio"
                name="payment-type"
                value="FULL"
                checked={isFull}
                onChange={() => setType("FULL")}
                disabled={submitting}
                style={{ accentColor: "var(--brand)" }}
              />
              <div>
                <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
                  Full payment
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Settle the entire amount upfront.
                </div>
              </div>
            </label>

            <label style={optionStyle(isPartial)}>
              <input
                type="radio"
                name="payment-type"
                value="PARTIAL"
                checked={isPartial}
                onChange={() => setType("PARTIAL")}
                disabled={submitting}
                style={{ accentColor: "var(--brand)" }}
              />
              <div>
                <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
                  Partial payment
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Pay a deposit now, the balance later.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Amount */}
        <label className="field">
          <span className="field-label">
            {isPartial ? "Deposit amount (EGP) *" : "Total amount (EGP) *"}
          </span>
          <div className="input-with-icon">
            <span className="input-icon"><Icon name="receipt" size={16} /></span>
            <input
              className="input"
              inputMode="decimal"
              value={payment.Amount}
              onChange={update("Amount")}
              placeholder="0.00"
              disabled={submitting}
              required
            />
          </div>
          <span className="hint">
            {isPartial
              ? "Remaining balance is collected once the company completes clearance."
              : "Funds are held until the milestone “Released”."}
          </span>
        </label>

        {/* Gateway */}
        <div className="field">
          <span className="field-label">Payment gateway *</span>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={optionStyle(isCard)}>
              <input
                type="radio"
                name="payment-gateway"
                value="Credit Card"
                checked={isCard}
                onChange={() => setGateway("Credit Card")}
                disabled={submitting}
                style={{ accentColor: "var(--brand)" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
                  Credit Card
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Visa or Mastercard. Held in escrow.
                </div>
              </div>
              <div className="row" style={{ gap: 8 }} aria-hidden="true">
                <VisaLogo />
                <MastercardLogo />
              </div>
            </label>

            <label style={optionStyle(isBank)}>
              <input
                type="radio"
                name="payment-gateway"
                value="Bank Transfer"
                checked={isBank}
                onChange={() => setGateway("Bank Transfer")}
                disabled={submitting}
                style={{ accentColor: "var(--brand)" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
                  Bank Transfer
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Wire from your bank. 1–2 business days.
                </div>
              </div>
              <BankLogo />
            </label>
          </div>
        </div>

        {/* Card details (only when Credit Card chosen) */}
        {isCard && (
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              background: "var(--surface-2)",
            }}
          >
            <div className="stack">
              <label className="field">
                <span className="field-label">Card number</span>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="lock" size={16} /></span>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={payment.CardNumber}
                    onChange={update("CardNumber")}
                    placeholder="1234 5678 9012 3456"
                    disabled={submitting}
                  />
                </div>
              </label>
              <label className="field">
                <span className="field-label">Cardholder name</span>
                <input
                  className="input"
                  value={payment.CardName}
                  onChange={update("CardName")}
                  disabled={submitting}
                />
              </label>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span className="field-label">Expiry</span>
                  <input
                    className="input"
                    placeholder="MM/YY"
                    value={payment.Expiry}
                    onChange={update("Expiry")}
                    disabled={submitting}
                  />
                </label>
                <label className="field">
                  <span className="field-label">CVC</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={payment.CVC}
                    onChange={update("CVC")}
                    disabled={submitting}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Bank transfer instructions (only when Bank Transfer) */}
        {isBank && (
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              background: "var(--surface-2)",
              fontSize: 13,
              color: "var(--ink-soft)",
              lineHeight: 1.6,
            }}
          >
            <div
              className="row"
              style={{ gap: 8, color: "var(--ink)", marginBottom: 6, fontWeight: 600 }}
            >
              <Icon name="building" size={14} /> Wire instructions
            </div>
            Beneficiary: <span className="mono">Takhlees Escrow Ltd.</span><br />
            IBAN: <span className="mono">EG12 3456 7890 1234 5678 9012</span><br />
            Reference: include your application number (issued after submission).
          </div>
        )}

        <div
          style={{
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--ink-faint)",
          }}
        >
          <Icon name="shield" size={13} /> Secured by 256-bit TLS · PCI-DSS compliant
        </div>
      </div>
    </div>
  );
}

const TRACKING_STEPS = ["Submitted", "Accepted", "Clearing", "Released"];

function trackingStepIndex(status) {
  switch (String(status || "").toLowerCase()) {
    case "pending":
    case "in_review":
      return 0;
    case "accepted":
      return 1;
    case "in progress":
    case "in_progress":
      return 2;
    case "completed":
      return 3;
    default:
      return 0;
  }
}

function TrackingStep({ submitted, applicationId, status, onLeaveReview }) {
  if (!submitted) {
    return (
      <div className="card card-pad-lg" style={{ textAlign: "center" }}>
        <Icon name="package" size={28} color="var(--ink-faint)" />
        <h3 className="h3" style={{ marginTop: 12 }}>Tracking unlocks after submission</h3>
        <p className="muted" style={{ margin: 0 }}>
          Complete the previous steps to start tracking your shipment in real time.
        </p>
      </div>
    );
  }

  const stepIdx = trackingStepIndex(status);
  const isCompleted = stepIdx === 3;

  return (
    <div className="card card-pad-lg">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span className="eyebrow" style={{ color: "var(--teal-dark)" }}>
            Application #{applicationId}
          </span>
          <h3 className="card-title">Live shipment status</h3>
          <p className="card-subtitle">
            Updates here are mirrored from the company's dashboard in real time.
          </p>
        </div>
        <span
          className={`badge ${
            isCompleted
              ? "badge-success"
              : stepIdx === 0
              ? "badge-pending"
              : "badge-info"
          }`}
        >
          <span className="dot" />
          {isCompleted ? "Completed" : stepIdx === 0 ? "Pending" : "In progress"}
        </span>
      </div>

      <hr className="divider" />

      <div className="timeline">
        {TRACKING_STEPS.map((s, i) => (
          <div
            key={s}
            className={`timeline-step ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}
          >
            <span className="dot" />
            {s}
          </div>
        ))}
      </div>

      <hr className="divider" />

      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link to="/tracking" className="btn btn-ghost btn-sm">
          <Icon name="package" size={14} /> View all shipments
        </Link>
        {isCompleted && (
          <button
            type="button"
            className="btn btn-accent"
            onClick={onLeaveReview}
          >
            <Icon name="star" size={14} /> Leave a review
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Main page ---------- */
function FillApplication() {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0..3 (Details, Documents, Payment, Tracking)
  const [categories, setCategories] = useState([]);
  const [ports, setPorts] = useState([]);
  const [error, setError] = useState("");
  const [docError, setDocError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    CategoryID: "",
    PortID: "",
    DeliveryAddress: "",
  });

  const [documents, setDocuments] = useState([
    { id: 1, type: "", file: null },
  ]);

  const [payment, setPayment] = useState({
    Type: "FULL",
    Amount: "",
    Gateway: "Credit Card",
    CardNumber: "",
    CardName: "",
    Expiry: "",
    CVC: "",
  });

  const [submitted, setSubmitted] = useState(null);
  // submitted = { applicationId, status }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [catData, portData] = await Promise.all([
          listCategories().catch(() => null),
          listPorts().catch(() => null),
        ]);
        if (!active) return;
        const cats = Array.isArray(catData) ? catData : catData?.data || [];
        const prts = Array.isArray(portData) ? portData : portData?.data || [];
        setCategories(cats.length ? cats : FALLBACK_CATEGORIES);
        setPorts(prts.length ? prts : FALLBACK_PORTS);
      } catch {
        if (!active) return;
        setCategories(FALLBACK_CATEGORIES);
        setPorts(FALLBACK_PORTS);
      }
    })();
    return () => { active = false; };
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validateStep = (idx) => {
    if (idx === 0) {
      if (!form.CategoryID) return "Please select a service category.";
      if (!form.PortID) return "Please select a port.";
      if (!form.DeliveryAddress.trim()) return "Delivery address is required.";
      return null;
    }
    if (idx === 1) {
      if (!documents.length) return "Add at least one document.";
      for (const d of documents) {
        if (!d.type) return "Choose a type for every document.";
        if (!d.file) return "Attach a file for every document.";
      }
      return null;
    }
    if (idx === 2) {
      if (!payment.Type) return "Choose a payment type.";
      const amt = Number(payment.Amount);
      if (!amt || amt <= 0) return "Enter a valid amount.";
      if (!payment.Gateway) return "Choose a payment gateway.";
      if (payment.Gateway === "Credit Card") {
        if (payment.CardNumber.replace(/\s/g, "").length < 12)
          return "Enter a valid card number.";
        if (!payment.CardName.trim()) return "Cardholder name is required.";
        if (!/^\d{2}\/\d{2}$/.test(payment.Expiry)) return "Expiry must be MM/YY.";
        if (!/^\d{3,4}$/.test(payment.CVC)) return "CVC must be 3 or 4 digits.";
      }
      return null;
    }
    return null;
  };

  const goNext = async () => {
    const v = validateStep(step);
    if (v) return setError(v);
    setError("");

    // Final submission happens at end of step 2 (Payment)
    if (step === 2) {
      await handleFinalSubmit();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await createApplication({
        CategoryID: Number(form.CategoryID),
        PortID: Number(form.PortID),
        DeliveryAddress: form.DeliveryAddress.trim(),
        PaymentType: payment.Type, // 'FULL' | 'PARTIAL'
        CompanyID: companyId ? Number(companyId) : undefined,
      });

      const applicationId =
        res?.data?.ApplicationID || res?.ApplicationID || res?.data?.insertId || null;

      // Best-effort attach document records & payment
      try {
        await Promise.all(
          documents.map((d) =>
            createDocumentRecord({
              DocType: `${d.type}:${d.file?.name || ""}`,
              ApplicationID: applicationId || null,
            })
          )
        );
      } catch { /* document metadata best-effort */ }

      try {
        await submitPayment({
          ApplicationID: applicationId,
          Amount: Number(payment.Amount),
          Method: payment.Gateway,
          Type: payment.Type,
        });
      } catch { /* payment best-effort */ }

      setSubmitted({
        applicationId: applicationId || "—",
        status: "pending",
      });
      setStep(3);
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

  const subtitle = useMemo(() => {
    switch (step) {
      case 0: return "Tell the company what you're shipping and where it's headed.";
      case 1: return "Attach the supporting documents the company will need.";
      case 2: return "Choose how to pay and review your selection.";
      case 3: return "Track your shipment from submission to release.";
      default: return "";
    }
  }, [step]);

  return (
    <DashboardLayout
      title="New application"
      subtitle={subtitle}
      role="Client"
    >
      <Reveal as="div" style={{ maxWidth: 820, margin: "0 auto" }}>
        <Stepper current={step} />

        {error && <div className="banner-error"><Icon name="bell" size={16} />{error}</div>}

        {step === 0 && (
          <DetailsStep
            form={form}
            update={update}
            categories={categories}
            ports={ports}
            submitting={submitting}
          />
        )}

        {step === 1 && (
          <DocumentsStep
            documents={documents}
            setDocuments={setDocuments}
            submitting={submitting}
            error={docError}
            setError={setDocError}
          />
        )}

        {step === 2 && (
          <PaymentStep
            payment={payment}
            setPayment={setPayment}
            submitting={submitting}
          />
        )}

        {step === 3 && (
          <TrackingStep
            submitted={!!submitted}
            applicationId={submitted?.applicationId}
            status={submitted?.status}
            onLeaveReview={() =>
              navigate(`/tracking?review=${submitted?.applicationId}`)
            }
          />
        )}

        {step < 3 && (
          <div
            className="row"
            style={{ justifyContent: "space-between", marginTop: 20 }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={step === 0 ? () => navigate(-1) : goBack}
              disabled={submitting}
            >
              {step === 0 ? "Cancel" : "Back"}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={goNext}
              disabled={submitting}
            >
              {submitting ? (
                <ContainerSpinner inline size={20} label="Submitting…" />
              ) : step === 2 ? (
                <>Submit application <Icon name="arrow_right" size={16} /></>
              ) : (
                <>Continue <Icon name="arrow_right" size={16} /></>
              )}
            </button>
          </div>
        )}

        {step === 3 && (
          <div
            className="row"
            style={{ justifyContent: "space-between", marginTop: 20 }}
          >
            <Link to="/tracking" className="btn btn-secondary">
              <Icon name="package" size={14} /> Go to my shipments
            </Link>
            <Link to="/companies" className="btn btn-primary">
              File another application <Icon name="arrow_right" size={16} />
            </Link>
          </div>
        )}
      </Reveal>
    </DashboardLayout>
  );
}

export default FillApplication;
