import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { submitSupportTicket } from "../../api/payments.js";
import { friendlyError } from "../../api/client.js";
import { useAuth } from "../../api/authState.js";
import { useTranslation } from "../../i18n";

function ContactUs() {
  const { t } = useTranslation("landing");
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = auth?.kind === "user";
  const fullName = isLoggedIn
    ? [auth.user?.FirstName, auth.user?.LastName].filter(Boolean).join(" ")
    : "";

  const [form, setForm] = useState({ Name: "", Email: "", Message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Phone and email are inherently LTR. Wrap them in <bdi> so they render
  // correctly even when the surrounding paragraph is RTL.
  const contacts = [
    { icon: "email", label: t("contact.channels.email"), value: "support@takhlees.com", bidi: true },
    { icon: "phone", label: t("contact.channels.phone"), value: "+20 100 000 0000", bidi: true },
    { icon: "pin", label: t("contact.channels.office"), value: t("contact.channels.officeValue") },
  ];

  useEffect(() => {
    if (isLoggedIn) {
      setForm((f) => ({
        ...f,
        ...(fullName ? { Name: fullName } : {}),
        ...(auth.user?.Email ? { Email: auth.user.Email } : {}),
      }));
    }
  }, [isLoggedIn, fullName, auth]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLoggedIn) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    if (!form.Message.trim()) {
      return setError(t("contact.form.errors.emptyMessage"));
    }

    setSubmitting(true);
    try {
      await submitSupportTicket({
        Issue: form.Message.trim(),
        ClientID: auth.user?.UserID,
        Resolved: 0,
        AdminID: null,
      });
      setSuccess(true);
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(friendlyError(err, t("contact.form.errors.submitFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <Reveal as="section" className="section">
        <div
          className="container reach-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)",
            gap: 48,
          }}
        >
          <div>
            <span className="eyebrow">{t("contact.eyebrow")}</span>
            <h1 className="h1" style={{ fontSize: 44 }}>{t("contact.title")}</h1>
            <p className="lead">{t("contact.lead")}</p>

            <div className="stack" style={{ marginTop: 32 }}>
              {contacts.map((c) => (
                <div key={c.label} className="row" style={{ gap: 14 }}>
                  <div
                    className="card-icon"
                    style={{ marginBottom: 0, width: 40, height: 40 }}
                  >
                    <Icon name={c.icon} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.10em",
                        color: "var(--ink-faint)",
                      }}
                    >
                      {c.label}
                    </div>
                    <div
                      style={{
                        color: "var(--ink)",
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      {c.bidi ? <bdi>{c.value}</bdi> : c.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginTop: 32, background: "var(--steel-50)" }}>
              <div className="row" style={{ gap: 12, marginBottom: 8 }}>
                <Icon name="bell" color="var(--ink)" />
                <strong style={{ color: "var(--ink)" }}>{t("contact.hours.title")}</strong>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>
                {t("contact.hours.body")}
              </p>
            </div>
          </div>

          <div className="card card-pad-lg">
            <h2 className="h3" style={{ fontSize: 20, marginBottom: 16 }}>{t("contact.form.heading")}</h2>
            {error && <div className="banner-error"><Icon name="bell" size={18} />{error}</div>}
            {success && (
              <div className="banner-success">
                <Icon name="check" size={18} />
                {t("contact.form.successBanner")}
              </div>
            )}
            <form onSubmit={handleSubmit} className="stack" noValidate>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span className="field-label">{t("contact.form.name")}</span>
                  <input
                    className="input"
                    value={form.Name}
                    onChange={update("Name")}
                    disabled={submitting}
                    readOnly={isLoggedIn}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t("contact.form.email")}</span>
                  <div className="input-with-icon">
                    <span className="input-icon"><Icon name="email" size={16} /></span>
                    <input
                      type="email"
                      className="input"
                      dir="ltr"
                      value={form.Email}
                      onChange={update("Email")}
                      disabled={submitting}
                      readOnly={isLoggedIn}
                      required
                    />
                  </div>
                </label>
              </div>
              <label className="field">
                <span className="field-label">{t("contact.form.message")}</span>
                <textarea
                  className="textarea"
                  rows={6}
                  value={form.Message}
                  onChange={update("Message")}
                  disabled={submitting}
                  required
                  placeholder={t("contact.form.messagePlaceholder")}
                />
              </label>
              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={submitting || success}
              >
                {submitting ? (
                  <ContainerSpinner inline size={20} label={t("contact.form.sending")} />
                ) : (
                  <>{t("contact.form.submit")} <Icon name="arrow_right" size={16} className="icon-flip" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </Reveal>
    </PublicLayout>
  );
}

export default ContactUs;
