import React from "react";
import Icon from "./Icon.jsx";

/* ----- Card helpers (pure) ----- */

// Network detection from the leading digits (IIN ranges).
export function detectNetwork(value) {
  const n = String(value || "").replace(/\D/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^3[47]/.test(n)) return "amex";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return "mastercard";
  return "unknown";
}

export const cardLength = (network) => (network === "amex" ? 15 : 16);
export const cvcLength = (network) => (network === "amex" ? 4 : 3);

// Input formatting: spaces grouped per network (Amex 4-6-5, others 4-4-4-4).
export function formatCardNumber(value, network) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, cardLength(network));
  if (network === "amex") {
    return digits
      .replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "))
      .trim();
  }
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

// Build the groups shown on the visual card, padding the unfilled slots with •.
export function displayGroups(value, network) {
  const digits = String(value || "").replace(/\D/g, "");
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
export function formatExpiry(value) {
  let digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  if (digits.length === 1 && Number(digits) > 1) digits = "0" + digits;
  if (digits.length >= 2) {
    let mm = digits.slice(0, 2);
    if (Number(mm) === 0) mm = "01";
    else if (Number(mm) > 12) mm = "12";
    digits = mm + digits.slice(2);
  }
  return digits.length <= 2 ? digits : digits.slice(0, 2) + "/" + digits.slice(2);
}

// Strict validation: returns an error string for a complete MM/YY that is the
// current month or earlier; "" when valid (a future month) or still incomplete.
export function expiryError(value) {
  if (!/^\d{2}\/\d{2}$/.test(value || "")) return "";
  const [mmStr, yyStr] = value.split("/");
  const month = Number(mmStr);
  if (month < 1 || month > 12) return "Invalid month.";
  const year = 2000 + Number(yyStr);
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const expiryMonthStart = new Date(year, month - 1, 1);
  if (expiryMonthStart < currentMonthStart) return "This card has expired.";
  if (expiryMonthStart.getTime() === currentMonthStart.getTime())
    return "Expiry must be a later month than the current one.";
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

export default function CreditCard({ number, name, expiry, cvc, network, flipped }) {
  const net = network || detectNetwork(number);
  const groups = displayGroups(number, net);
  const faceBase = {
    position: "absolute",
    inset: 0,
    borderRadius: 16,
    padding: 22,
    color: "#fff",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.35)",
    background: CARD_THEME[net] || CARD_THEME.unknown,
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
            <div style={{ width: 42, height: 32, borderRadius: 6, background: "linear-gradient(135deg, #e6c878, #b8923c)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)" }} />
            <div style={{ minHeight: 30, display: "flex", alignItems: "center" }}>
              <CardLogo network={net} />
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
                {(name || "").trim() || "FULL NAME"}
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
              <CardLogo network={net} faint />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
