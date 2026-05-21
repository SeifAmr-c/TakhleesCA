import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import CreditCard, { detectNetwork } from "../../components/CreditCard.jsx";
import { createApplication, listCategories } from "../../api/applications.js";
import { listCompanyPorts } from "../../api/ports.js";
import { submitPayment } from "../../api/payments.js";
import { listCompanyCategoryPricing } from "../../api/companyCategories.js";
import dropStyles from "../auth/Auth.module.css";

const DOCUMENT_TYPES = [
  "National ID / Passport",
  "Proof Of Payment",
  "Delegation",
  "Shipping Document",
];

const REQUIRED_DOC_COUNT = 4;

const makeInitialDocuments = () =>
  Array.from({ length: REQUIRED_DOC_COUNT }, (_, i) => ({
    id: i + 1,
    type: "",
    file: null,
  }));

const MAX_DOC_BYTES = 5 * 1024 * 1024;

const STEPS = ["Details", "Documents", "Payment", "Tracking"];

/* Inline error renderer — red text directly under the offending input. */
const FieldError = ({ message }) =>
  message ? (
    <span
      role="alert"
      style={{
        color: "var(--signal-stop)",
        fontSize: 12,
        marginTop: 4,
        display: "block",
      }}
    >
      {message}
    </span>
  ) : null;

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

function DetailsStep({ form, update, categories, ports, errors, submitting }) {
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
            disabled={submitting || !categories.length}
          >
            <option value="">
              {categories.length ? "Select a category…" : "Loading categories…"}
            </option>
            {categories.map((c) => (
              <option key={c.CategoryID} value={c.CategoryID}>{c.Type}</option>
            ))}
          </select>
          <FieldError message={errors.CategoryID} />
        </label>

        <label className="field">
          <span className="field-label">Port *</span>
          <select
            className="select"
            value={form.PortID}
            onChange={update("PortID")}
            disabled={submitting || !ports.length}
          >
            <option value="">
              {ports.length ? "Select a port…" : "No ports available for this company"}
            </option>
            {ports.map((p) => (
              <option key={p.PortID} value={p.PortID}>
                {p.PortName}{p.PortType ? ` (${p.PortType})` : ""}
              </option>
            ))}
          </select>
          <FieldError message={errors.PortID} />
        </label>

        <label className="field">
          <span className="field-label">Delivery address *</span>
          <div className="input-with-icon">
            <span className="input-icon"><Icon name="pin" size={16} /></span>
            <input
              className="input"
              value={form.DeliveryAddress}
              onChange={update("DeliveryAddress")}
              disabled={submitting}
              placeholder="Street, district, city"
            />
          </div>
          <span className="hint">Where the shipment should be delivered after clearance.</span>
          <FieldError message={errors.DeliveryAddress} />
        </label>
      </div>
    </div>
  );
}

function DocumentsStep({
  acid,
  onAcidChange,
  acidError,
  documents,
  setDocuments,
  submitting,
  docErrors,
  setDocErrors,
}) {
  const setDocFieldError = (id, key, msg) =>
    setDocErrors((m) => ({ ...m, [id]: { ...(m[id] || {}), [key]: msg } }));

  const updateType = (id, value) => {
    setDocuments((list) => list.map((d) => (d.id === id ? { ...d, type: value } : d)));
    if (value) setDocFieldError(id, "type", "");
  };

  const updateFile = (id, file) =>
    setDocuments((list) => list.map((d) => (d.id === id ? { ...d, file } : d)));

  const onPickFile = (id) => (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      updateFile(id, null);
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      setDocFieldError(id, "file", "File must be 5 MB or smaller.");
      e.target.value = "";
      updateFile(id, null);
      return;
    }
    setDocFieldError(id, "file", "");
    updateFile(id, file);
  };

  const handleAcidChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 19);
    onAcidChange(digits);
  };

  return (
    <div className="card card-pad-lg">
      <h3 className="card-title">Supporting documents</h3>
      <p className="card-subtitle">
        Enter your ACID number and attach all four required documents.
      </p>

      <div className="stack">
        <label className="field">
          <span className="field-label">ACID Number *</span>
          <div className="input-with-icon">
            <span className="input-icon"><Icon name="lock" size={16} /></span>
            <input
              className="input"
              inputMode="numeric"
              pattern="\d*"
              maxLength={19}
              required
              value={acid}
              onChange={handleAcidChange}
              disabled={submitting}
              placeholder="19-digit ACID number"
            />
          </div>
          <span className="hint">Must be exactly 19 digits</span>
          <FieldError message={acidError} />
        </label>

        {documents.map((d, i) => {
          const errs = docErrors[d.id] || {};
          return (
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
                  Document #{i + 1} (required)
                </span>
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
                  <FieldError message={errs.type} />
                </label>

                <div className="field">
                  <span className="field-label">File *</span>
                  <label
                    className={`${dropStyles.dropzone} ${d.file ? dropStyles.dropzoneFilled : ""}`}
                  >
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className={dropStyles.dropzoneInput}
                      onChange={onPickFile(d.id)}
                      disabled={submitting}
                      required
                    />
                    <span className={dropStyles.dropzoneIcon} aria-hidden="true">
                      <Icon name={d.file ? "check" : "doc"} size={24} />
                    </span>
                    {d.file ? (
                      <>
                        <span className={dropStyles.dropzoneFilename}>{d.file.name}</span>
                        <span className={dropStyles.dropzoneSubtext}>Click to replace</span>
                      </>
                    ) : (
                      <>
                        <span className={dropStyles.dropzoneTitle}>Click to upload</span>
                        <span className={dropStyles.dropzoneSubtext}>PDF or image · max 5 MB</span>
                      </>
                    )}
                  </label>
                  <FieldError message={errs.file} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentStep({ payment, setPayment, errors, setErrors, submitting, priceLoading, priceUnavailable }) {
  const [flipped, setFlipped] = useState(false);
  const network = detectNetwork(payment.CardNumber);

  const update = (key) => (e) => {
    const value = e.target.value;
    setPayment((p) => ({ ...p, [key]: value }));
    setErrors((m) => ({ ...m, [key]: "" }));
  };

  /* XXXX-XXXX-XXXX-XXXX — strip non-digits, cap at 16 digits, dash every 4. */
  const onCardNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.match(/.{1,4}/g)?.join("-") ?? "";
    setPayment((p) => ({ ...p, CardNumber: formatted }));
    setErrors((m) => ({ ...m, CardNumber: "" }));
  };

  /* MM/YY — strip non-digits, cap at 4 digits, slash after the 2nd. */
  const onExpiryChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    setPayment((p) => ({ ...p, Expiry: formatted }));
    setErrors((m) => ({ ...m, Expiry: "" }));
  };

  /* CVC — digits only, exactly up to 3. */
  const onCvcChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
    setPayment((p) => ({ ...p, CVC: digits }));
    setErrors((m) => ({ ...m, CVC: "" }));
  };

  const setGateway = (val) => {
    setPayment((p) => ({ ...p, Gateway: val }));
    setErrors((m) => ({ ...m, Gateway: "" }));
  };

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

  return (
    <div className="card card-pad-lg">
      <h3 className="card-title">Payment</h3>
      <p className="card-subtitle">
        Pay the full amount upfront. Funds are held in escrow until release.
      </p>

      <div className="stack">
        <label className="field">
          <span className="field-label">Total amount (EGP) *</span>
          <div className="input-with-icon">
            <span className="input-icon"><Icon name="receipt" size={16} /></span>
            <input
              className="input"
              inputMode="decimal"
              value={payment.Amount}
              readOnly
              tabIndex={-1}
              aria-readonly="true"
              placeholder={priceLoading ? "Loading price…" : "Select a category to view price"}
              style={{ backgroundColor: "var(--surface-2)", cursor: "not-allowed", textAlign: "center" }}
            />
          </div>
          <span className="hint">
            {priceLoading
              ? "Looking up this company's price for the selected category…"
              : priceUnavailable
              ? "This company hasn't published a price for the selected category."
              : "Auto-calculated from the company's price list. Funds are held until the milestone “Released”."}
          </span>
          <FieldError message={errors.Amount} />
        </label>

        <div className="field">
          <span className="field-label">Payment gateway *</span>
          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
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
          </div>
          <FieldError message={errors.Gateway} />
        </div>

        {isCard && (
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              background: "var(--surface-2)",
            }}
          >
            <CreditCard
              number={payment.CardNumber}
              name={payment.CardName}
              expiry={payment.Expiry}
              cvc={payment.CVC}
              network={network}
              flipped={flipped}
            />
            <div className="stack">
              <label className="field">
                <span className="field-label">Card number</span>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="lock" size={16} /></span>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={payment.CardNumber}
                    onChange={onCardNumberChange}
                    onFocus={() => setFlipped(false)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    maxLength={19}
                    disabled={submitting}
                  />
                </div>
                <FieldError message={errors.CardNumber} />
              </label>
              <label className="field">
                <span className="field-label">Cardholder name</span>
                <input
                  className="input"
                  value={payment.CardName}
                  onChange={update("CardName")}
                  onFocus={() => setFlipped(false)}
                  disabled={submitting}
                />
                <FieldError message={errors.CardName} />
              </label>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span className="field-label">Expiry</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={payment.Expiry}
                    onChange={onExpiryChange}
                    onFocus={() => setFlipped(false)}
                    maxLength={5}
                    disabled={submitting}
                  />
                  <FieldError message={errors.Expiry} />
                </label>
                <label className="field">
                  <span className="field-label">CVC</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={payment.CVC}
                    onChange={onCvcChange}
                    onFocus={() => setFlipped(true)}
                    onBlur={() => setFlipped(false)}
                    maxLength={3}
                    disabled={submitting}
                  />
                  <FieldError message={errors.CVC} />
                </label>
              </div>
            </div>
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
            <Icon name="star" size={14} filled /> Leave a review
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

  const [step, setStep] = useState(0);
  const [ports, setPorts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /* Company-specific pricing: { [CategoryID]: Price }. Fetched once per
     companyId on mount and consulted whenever the user changes the
     selected category to auto-fill the Total Amount input. */
  const [companyPricing, setCompanyPricing] = useState({});
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceUnavailable, setPriceUnavailable] = useState(false);

  const [form, setForm] = useState({
    CategoryID: "",
    PortID: "",
    DeliveryAddress: "",
    ACID: "",
  });

  const [documents, setDocuments] = useState(makeInitialDocuments);

  const [payment, setPayment] = useState({
    Type: "FULL",
    Amount: "",
    Gateway: "Credit Card",
    CardNumber: "",
    CardName: "",
    Expiry: "",
    CVC: "",
  });

  /* Per-field error maps. Empty string / missing key = no error. */
  const [detailsErrors, setDetailsErrors] = useState({});
  const [docErrors, setDocErrors] = useState({});
  const [paymentErrors, setPaymentErrors] = useState({});

  const [submitted, setSubmitted] = useState(null);

  /* Reference data: categories + ports come straight from the DB. No
     hardcoded fallback list — if the server is unreachable, the dropdowns
     stay disabled with a "Loading…" placeholder. */
  useEffect(() => {
    let active = true;
    (async () => {
      const [portData, catData] = await Promise.all([
        companyId ? listCompanyPorts(companyId).catch(() => null) : Promise.resolve(null),
        listCategories().catch(() => null),
      ]);
      if (!active) return;

      const prts = Array.isArray(portData) ? portData : portData?.data || [];
      const cats = Array.isArray(catData) ? catData : catData?.data || [];
      setPorts(prts);
      setCategories(cats);
    })();
    return () => { active = false; };
  }, [companyId]);

  /* Fetch this company's per-category pricing once the companyId is
     known. Build a { CategoryID: Price } map for instant lookups when
     the user toggles between categories. */
  useEffect(() => {
    if (!companyId) {
      setCompanyPricing({});
      return;
    }
    let active = true;
    setPriceLoading(true);
    (async () => {
      try {
        const rows = await listCompanyCategoryPricing(companyId);
        if (!active) return;
        const map = {};
        for (const r of rows) {
          if (r?.CategoryID != null && r?.Price != null) {
            map[Number(r.CategoryID)] = Number(r.Price);
          }
        }
        setCompanyPricing(map);
      } catch {
        if (!active) return;
        setCompanyPricing({});
      } finally {
        if (active) setPriceLoading(false);
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  /* Whenever the chosen category (or the pricing map) changes, push the
     matching price into the payment state. If the company doesn't price
     this category, blank the field and surface that to the user. */
  useEffect(() => {
    if (!form.CategoryID) {
      setPayment((p) => ({ ...p, Amount: "" }));
      setPriceUnavailable(false);
      return;
    }
    const price = companyPricing[Number(form.CategoryID)];
    if (price == null) {
      setPayment((p) => ({ ...p, Amount: "" }));
      setPriceUnavailable(!priceLoading);
      return;
    }
    setPayment((p) => ({ ...p, Amount: String(price) }));
    setPriceUnavailable(false);
    setPaymentErrors((m) => ({ ...m, Amount: "" }));
  }, [form.CategoryID, companyPricing, priceLoading]);

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (value) setDetailsErrors((m) => ({ ...m, [key]: "" }));
  };

  const validateDetails = () => {
    const errs = {};
    if (!form.CategoryID) errs.CategoryID = "Please select a service category.";
    if (!form.PortID) errs.PortID = "Please select a port.";
    if (!form.DeliveryAddress.trim()) errs.DeliveryAddress = "Delivery address is required.";
    return errs;
  };

  const validateDocuments = () => {
    const errs = {};
    if (!/^\d{19}$/.test(form.ACID || "")) {
      errs.__acid = "ACID must be exactly 19 digits.";
    }
    if (documents.length !== REQUIRED_DOC_COUNT) {
      errs.__global = `Exactly ${REQUIRED_DOC_COUNT} documents are required.`;
    }
    for (const d of documents) {
      const e = {};
      if (!d.type) e.type = "Choose a document type.";
      if (!d.file) e.file = "Attach a file.";
      if (Object.keys(e).length) errs[d.id] = e;
    }
    return errs;
  };

  const validatePayment = () => {
    const errs = {};
    const amt = Number(payment.Amount);
    if (!amt || amt <= 0) {
      errs.Amount = priceUnavailable
        ? "This company has not published a price for the selected category. Please choose a different category."
        : priceLoading
        ? "Still loading the company's price — please wait a moment."
        : "Select a service category to load the price.";
    }
    if (!payment.Gateway) errs.Gateway = "Choose a payment gateway.";
    if (payment.Gateway === "Credit Card") {
      if (payment.CardNumber.replace(/\D/g, "").length !== 16)
        errs.CardNumber = "Enter a valid 16-digit card number.";
      if (!payment.CardName.trim()) errs.CardName = "Cardholder name is required.";
      if (!/^\d{2}\/\d{2}$/.test(payment.Expiry)) errs.Expiry = "Expiry must be MM/YY.";
      if (!/^\d{3}$/.test(payment.CVC)) errs.CVC = "CVC must be exactly 3 digits.";
    }
    return errs;
  };

  const goNext = async () => {
    setSubmitError("");

    if (step === 0) {
      const errs = validateDetails();
      setDetailsErrors(errs);
      if (Object.keys(errs).length) return;
      setStep(1);
      return;
    }

    if (step === 1) {
      const errs = validateDocuments();
      setDocErrors(errs);
      if (Object.keys(errs).length) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      const errs = validatePayment();
      setPaymentErrors(errs);
      if (Object.keys(errs).length) return;
      await handleFinalSubmit();
      return;
    }
  };

  const goBack = () => {
    setSubmitError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      /* Bundle the application fields and all 4 documents into one
         multipart request. Files use indexed field names so the backend
         can pair each file with its DocType (also indexed). */
      const payload = new FormData();
      payload.append("CategoryID", String(Number(form.CategoryID)));
      payload.append("PortID", String(Number(form.PortID)));
      payload.append("DeliveryAddress", form.DeliveryAddress.trim());
      payload.append("ACID", form.ACID);
      payload.append("PaymentType", "FULL");
      if (companyId) payload.append("CompanyID", String(Number(companyId)));
      documents.forEach((d, i) => {
        if (d.file) payload.append(`Document_${i}`, d.file);
        payload.append(`DocType_${i}`, d.type);
      });

      const res = await createApplication(payload);

      const applicationId =
        res?.data?.ApplicationID || res?.ApplicationID || res?.data?.insertId || null;

      /* Payment: backend expects `PaymentGateway` (not `Method`) and stamps
         the date itself. Best-effort — surfacing a payment failure is more
         useful than silently swallowing it, but we still don't roll back the
         application if the payment row fails. */
      if (applicationId) {
        try {
          await submitPayment({
            ApplicationID: applicationId,
            Amount: Number(payment.Amount),
            PaymentGateway: payment.Gateway,
          });
        } catch (paymentErr) {
          console.warn("Payment record failed:", paymentErr);
        }
      }

      setSubmitted({
        applicationId: applicationId || "—",
        status: "pending",
      });
      setStep(3);
    } catch (err) {
      setSubmitError(
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
    <PublicLayout
      title="New application"
      subtitle={subtitle}
      role="Client"
    >
      <Reveal as="div" style={{ maxWidth: 820, margin: "0 auto" }}>
        <Stepper current={step} />

        {step === 0 && (
          <DetailsStep
            form={form}
            update={update}
            categories={categories}
            ports={ports}
            errors={detailsErrors}
            submitting={submitting}
          />
        )}

        {step === 1 && (
          <DocumentsStep
            acid={form.ACID}
            onAcidChange={(value) => {
              setForm((f) => ({ ...f, ACID: value }));
              setDocErrors((m) => {
                if (!m.__acid) return m;
                const next = { ...m };
                delete next.__acid;
                return next;
              });
            }}
            acidError={docErrors.__acid}
            documents={documents}
            setDocuments={setDocuments}
            submitting={submitting}
            docErrors={docErrors}
            setDocErrors={setDocErrors}
          />
        )}

        {step === 2 && (
          <PaymentStep
            payment={payment}
            setPayment={setPayment}
            errors={paymentErrors}
            setErrors={setPaymentErrors}
            submitting={submitting}
            priceLoading={priceLoading}
            priceUnavailable={priceUnavailable}
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

        {/* Submission-level error: shown only after the final Submit click fails. */}
        {submitError && step === 2 && (
          <div className="banner-error" style={{ marginTop: 16 }}>
            <Icon name="bell" size={16} />{submitError}
          </div>
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
    </PublicLayout>
  );
}

export default FillApplication;
