import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { submitPayment } from "../../api/payments.js";
import { friendlyError } from "../../api/client.js";
import { useTranslation } from "../../i18n";

function PaymentPage() {
  const { t } = useTranslation("client");
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
    if (card.Number.replace(/\s/g, "").length < 12) return setError(t("paymentPage.errors.cardNumber"));
    if (!card.Name.trim()) return setError(t("paymentPage.errors.cardName"));
    if (!/^\d{2}\/\d{2}$/.test(card.Expiry)) return setError(t("paymentPage.errors.expiry"));
    if (!/^\d{3,4}$/.test(card.CVC)) return setError(t("paymentPage.errors.cvc"));

    setSubmitting(true);
    try {
      await submitPayment({ ApplicationID: applicationId, Amount: 1280, Method: "card" });
      setSuccess(t("paymentPage.success"));
      setTimeout(() => navigate("/tracking", { replace: true }), 1200);
    } catch (err) {
      setError(friendlyError(err, t("paymentPage.errors.failed")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout
      title={t("paymentPage.title")}
      subtitle={t("paymentPage.subtitle", { id: applicationId })}
      role="Client"
    >
      <Reveal as="div" style={{ maxWidth: 880, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 24 }}>
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="timeline">
              <div className="timeline-step done"><span className="dot" />{t("paymentPage.steps.details")}</div>
              <div className="timeline-step done"><span className="dot" />{t("paymentPage.steps.documents")}</div>
              <div className="timeline-step active"><span className="dot" />{t("paymentPage.steps.payment")}</div>
              <div className="timeline-step"><span className="dot" />{t("paymentPage.steps.tracking")}</div>
            </div>
          </div>

          {error && <div className="banner-error"><Icon name="bell" size={16} />{error}</div>}
          {success && <div className="banner-success"><Icon name="check" size={16} />{success}</div>}

          <form className="card card-pad-lg" onSubmit={handleSubmit} noValidate>
            <h3 className="card-title">{t("paymentPage.card.title")}</h3>
            <p className="card-subtitle">{t("paymentPage.card.subtitle")}</p>

            <div className="stack">
              <label className="field" dir="ltr">
                <span className="field-label">{t("paymentPage.card.number")}</span>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="lock" size={16} /></span>
                  <input className="input" inputMode="numeric" value={card.Number} onChange={update("Number")} placeholder="1234 5678 9012 3456" required disabled={submitting} />
                </div>
              </label>
              <label className="field" dir="ltr">
                <span className="field-label">{t("paymentPage.card.name")}</span>
                <input className="input" value={card.Name} onChange={update("Name")} required disabled={submitting} />
              </label>
              <div className="grid" dir="ltr" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span className="field-label">{t("paymentPage.card.expiry")}</span>
                  <input className="input" placeholder="MM/YY" value={card.Expiry} onChange={update("Expiry")} required disabled={submitting} />
                </label>
                <label className="field">
                  <span className="field-label">{t("paymentPage.card.cvc")}</span>
                  <input className="input" inputMode="numeric" value={card.CVC} onChange={update("CVC")} required disabled={submitting} />
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
                {submitting ? (
                  <ContainerSpinner inline size={20} label={t("paymentPage.processing")} />
                ) : (
                  <>
                    <Icon name="arrow_right" size={16} />
                    {t("paymentPage.pay")} {t("paymentPage.currency")} <bdi>1,280</bdi>
                  </>
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
                <Icon name="shield" size={13} /> {t("paymentPage.secured")}
              </div>
            </div>
          </form>
        </div>

        <aside>
          <div className="card" style={{ position: "sticky", top: 88, padding: 24 }}>
            <h3 className="card-title">{t("paymentPage.summary.title")}</h3>
            <p className="card-subtitle">{t("paymentPage.summary.application")} <bdi>#{applicationId}</bdi></p>

            <div className="stack" style={{ gap: 10, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-faint)" }}>{t("paymentPage.summary.serviceFee")}</span>
                <span className="mono tabular" style={{ color: "var(--ink)" }}>{t("paymentPage.currency")} <bdi>1,200.00</bdi></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-faint)" }}>{t("paymentPage.summary.platformFee")}</span>
                <span className="mono tabular" style={{ color: "var(--ink)" }}>{t("paymentPage.currency")} <bdi>80.00</bdi></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-faint)" }}>{t("paymentPage.summary.vat")}</span>
                <span style={{ color: "var(--ink)" }}>{t("paymentPage.summary.vatIncluded")}</span>
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
              <span>{t("paymentPage.summary.totalDue")}</span>
              <span className="mono tabular">{t("paymentPage.currency")} <bdi>1,280.00</bdi></span>
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
              {t("paymentPage.summary.heldUntil")}
            </div>
          </div>
        </aside>
      </Reveal>
    </PublicLayout>
  );
}

export default PaymentPage;
