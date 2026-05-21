import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { submitPayment } from "../../api/payments.js";

/* ----- Card helpers (module scope: pure, no React) ----- */

// Network detection from the leading digits (IIN ranges).
function detectNetwork(value) {
  const n = value.replace(/\D/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^3[47]/.test(n)) return "amex";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return "mastercard";
  return "unknown";
}

const cardLength = (network) => (network === "amex" ? 15 : 16);
const cvcLength = (network) => (network === "amex" ? 4 : 3);

// Input formatting: spaces grouped per network (Amex 4-6-5, others 4-4-4-4).
function formatCardNumber(value, network) {
  const digits = value.replace(/\D/g, "").slice(0, cardLength(network));
  if (network === "amex") {
    return digits
      .replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "))
      .trim();
  }
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

// Build the groups shown on the visual card, padding the unfilled slots with •.
function displayGroups(value, network) {
  const digits = value.replace(/\D/g, "");
  const pattern = network === "amex" ? [4, 6, 5] : [4, 4, 4, 4];
  const groups = [];
  let idx = 0;
  for (const len of pattern) {
    let g = "";
    for (let i = 0; i < len; i++, idx++) g += digits[idx] != null ? digits[idx] : "•";
    groups.push(g);
  }
  return groups;
}

// Auto-format MM/YY and clamp the month to 01–12 as the user types.
function formatExpiry(value) {
  let digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 1 && Number(digits) > 1) digits = "0" + digits; // "5" -> "05/"
  if (digits.length >= 2) {
    let mm = digits.slice(0, 2);
    if (Number(mm) === 0) mm = "01";
    else if (Number(mm) > 12) mm = "12";
    digits = mm + digits.slice(2);
  }
  return digits.length <= 2 ? digits : digits.slice(0, 2) + "/" + digits.slice(2);
}

// Strict validation: returns an error string for a complete MM/YY in the past,
// "" when valid or still incomplete.
function expiryError(value) {
  if (!/^\d{2}\/\d{2}$/.test(value)) return "";
  const [mmStr, yyStr] = value.split("/");
  const month = Number(mmStr);
  if (month < 1 || month > 12) return "Invalid month.";
  const year = 2000 + Number(yyStr);
  // A card is valid through the last moment of its expiry month.
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  if (endOfMonth < new Date()) return "This card has expired.";
  return "";
}

const CARD_THEME = {
  visa: "linear-gradient(135deg, #0f1b6b 0%, #1a3aa8 55%, #2f6bd8 100%)",
  mastercard: "linear-gradient(135deg, #20120f 0%, #4a2521 55%, #6b3a2f 100%)",
  amex: "linear-gradient(135deg, #1a6fb0 0%, #2e8bc9 55%, #4fb0e0 100%)",
  unknown: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
};

function CardLogo({ network, faint }) {
  const op = faint ? 0.55 : 1;
  if (network === "visa") {
    return (
      <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 800, fontSize: 26, letterSpacing: "0.02em", color: "#fff", opacity: op }}>
        VISA
      </span>
    );
  }
  if (network === "amex") {
    return (
      <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "0.06em", color: "#fff", background: "rgba(255,255,255,0.16)", padding: "4px 8px", borderRadius: 4, opacity: op }}>
        AMEX
      </span>
    );
  }
  if (network === "mastercard") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", opacity: op }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#eb001b" }} />
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#f79e1b", marginLeft: -14, mixBlendMode: "screen" }} />
      </span>
    );
  }
  return <Icon name="lock" size={20} color="rgba(255,255,255,0.7)" />;
}

/* ----- Visual 3D card ----- */

function CreditCard({ number, name, expiry, cvc, network, flipped }) {
  const groups = displayGroups(number, network);
  const faceBase = {
    position: "absolute",
    inset: 0,
    borderRadius: 16,
    padding: 22,
    color: "#fff",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.35)",
    background: CARD_THEME[network] || CARD_THEME.unknown,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  return (
    <div style={{ perspective: 1400, width: "min(360px, 100%)", margin: "0 auto 22px" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1.586 / 1",
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div style={faceBase}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {/* EMV chip */}
            <div style={{ width: 42, height: 32, borderRadius: 6, background: "linear-gradient(135deg, #e6c878, #b8923c)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)" }} />
            <div style={{ minHeight: 30, display: "flex", alignItems: "center" }}>
              <CardLogo network={network} />
            </div>
          </div>

          <div
            style={{
              marginTop: "auto",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "clamp(16px, 5.2vw, 21px)",
              letterSpacing: "0.08em",
              display: "flex",
              gap: 14,
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            }}
          >
            {groups.map((g, i) => (
              <span key={i}>{g}</span>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16, gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 8, letterSpacing: "0.12em", opacity: 0.7, textTransform: "uppercase" }}>Card Holder</div>
              <div style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {name.trim() || "FULL NAME"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 8, letterSpacing: "0.12em", opacity: 0.7, textTransform: "uppercase" }}>Expires</div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {expiry || "MM/YY"}
              </div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div style={{ ...faceBase, transform: "rotateY(180deg)", padding: "22px 0" }}>
          <div style={{ height: 40, background: "#0b1220", marginTop: 8 }} />
          <div style={{ padding: "16px 22px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 34, background: "repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 6px, #e2e8f0 6px, #e2e8f0 12px)", borderRadius: 4 }} />
              <div
                style={{
                  width: 64,
                  height: 34,
                  background: "#fff",
                  color: "#0f172a",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 8,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                }}
              >
                {cvc || "•••"}
              </div>
            </div>
            <div style={{ fontSize: 9, opacity: 0.7, marginTop: 8, letterSpacing: "0.06em" }}>SECURITY CODE</div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <CardLogo network={network} faint />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState({ Number: "", Name: "", Expiry: "", CVC: "" });
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const network = useMemo(() => detectNetwork(card.Number), [card.Number]);
  const expiryErr = useMemo(() => expiryError(card.Expiry), [card.Expiry]);

  const onNumber = (e) => setCard((c) => ({ ...c, Number: formatCardNumber(e.target.value, detectNetwork(e.target.value)) }));
  const onName = (e) => setCard((c) => ({ ...c, Name: e.target.value }));
  const onExpiry = (e) => setCard((c) => ({ ...c, Expiry: formatExpiry(e.target.value) }));
  const onCVC = (e) => setCard((c) => ({ ...c, CVC: e.target.value.replace(/\D/g, "").slice(0, cvcLength(network)) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const digits = card.Number.replace(/\D/g, "");
    if (digits.length < cardLength(network)) return setError("Enter a complete card number.");
    if (!card.Name.trim()) return setError("Cardholder name is required.");
    if (!/^\d{2}\/\d{2}$/.test(card.Expiry)) return setError("Expiry must be MM/YY.");
    if (expiryErr) return setError(expiryErr);
    if (card.CVC.length < cvcLength(network)) return setError(`CVC must be ${cvcLength(network)} digits.`);

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
    <PublicLayout
      title="Complete your payment"
      subtitle={`Application #${applicationId} — funds are held until the company confirms completion.`}
      role="Client"
    >
      <Reveal as="div" style={{ maxWidth: 880, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 24 }}>
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

          <form className="card card-pad-lg" onSubmit={handleSubmit} noValidate>
            <CreditCard
              number={card.Number}
              name={card.Name}
              expiry={card.Expiry}
              cvc={card.CVC}
              network={network}
              flipped={flipped}
            />

            <h3 className="card-title">Card details</h3>
            <p className="card-subtitle">We use bank-grade encryption — your details never touch our servers.</p>

            <div className="stack">
              <label className="field">
                <span className="field-label">Card number</span>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="lock" size={16} /></span>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={card.Number}
                    onChange={onNumber}
                    onFocus={() => setFlipped(false)}
                    placeholder="1234 5678 9012 3456"
                    required
                    disabled={submitting}
                  />
                </div>
              </label>
              <label className="field">
                <span className="field-label">Cardholder name</span>
                <input className="input" value={card.Name} onChange={onName} onFocus={() => setFlipped(false)} required disabled={submitting} />
              </label>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span className="field-label">Expiry</span>
                  <input
                    className="input"
                    placeholder="MM/YY"
                    inputMode="numeric"
                    value={card.Expiry}
                    onChange={onExpiry}
                    onFocus={() => setFlipped(false)}
                    aria-invalid={!!expiryErr}
                    style={expiryErr ? { borderColor: "var(--signal-stop-border)" } : undefined}
                    required
                    disabled={submitting}
                  />
                  {expiryErr && (
                    <span style={{ fontSize: 12, color: "var(--signal-stop)", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <Icon name="bell" size={12} /> {expiryErr}
                    </span>
                  )}
                </label>
                <label className="field">
                  <span className="field-label">CVC</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={card.CVC}
                    onChange={onCVC}
                    onFocus={() => setFlipped(true)}
                    onBlur={() => setFlipped(false)}
                    required
                    disabled={submitting}
                  />
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting || !!expiryErr}>
                {submitting ? (
                  <ContainerSpinner inline size={20} label="Processing…" />
                ) : (
                  <>Pay EGP 1,280 <Icon name="arrow_right" size={16} /></>
                )}
              </button>
              <div
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  justifyContent: "center",
                  color: "var(--ink-faint)",
                }}
              >
                <Icon name="shield" size={13} /> Secured by 256-bit TLS · PCI-DSS compliant
              </div>
            </div>
          </form>
        </div>

        <aside>
          <div className="card" style={{ position: "sticky", top: 88, padding: 24 }}>
            <h3 className="card-title">Order summary</h3>
            <p className="card-subtitle">Application #{applicationId}</p>

            <div className="stack" style={{ gap: 10, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-faint)" }}>Service fee</span>
                <span className="mono tabular" style={{ color: "var(--ink)" }}>EGP 1,200.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-faint)" }}>Platform fee</span>
                <span className="mono tabular" style={{ color: "var(--ink)" }}>EGP 80.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-faint)" }}>VAT</span>
                <span style={{ color: "var(--ink)" }}>Included</span>
              </div>
            </div>

            <hr className="divider" />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 600,
                fontSize: 18,
                color: "var(--ink)",
                letterSpacing: "-0.01em",
              }}
            >
              <span>Total due</span>
              <span className="mono tabular">EGP 1,280.00</span>
            </div>

            <hr className="divider" />

            <div
              style={{
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--ink-faint)",
              }}
            >
              <Icon name="check" size={14} color="var(--signal-go)" />
              Held until milestone "Released"
            </div>
          </div>
        </aside>
      </Reveal>
    </PublicLayout>
  );
}

export default PaymentPage;
