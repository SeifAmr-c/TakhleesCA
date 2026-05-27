import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { register } from "../../api/auth.js";
import { friendlyError, errorCode } from "../../api/client.js";
import Icon from "../../components/Icon.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { useTranslation } from "../../i18n";
import styles from "./Auth.module.css";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const PHONE_LEN = 11;
const NID_LEN = 14;

const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");

// Routes a backend error code to the input it concerns. Codes the form
// can't attribute to a field (network, unknown) fall through to the
// generic banner above the submit button.
const FIELD_BY_CODE = {
  FIRST_NAME_REQUIRED: "FirstName",
  LAST_NAME_REQUIRED: "LastName",
  EMAIL_INVALID: "Email",
  EMAIL_IN_USE: "Email",
  PASSWORD_TOO_SHORT: "Password",
  PASSWORD_WEAK: "Password",
  PHONE_REQUIRED: "PhoneNumber",
  PHONE_INVALID: "PhoneNumber",
  PHONE_IN_USE: "PhoneNumber",
  NATIONAL_ID_REQUIRED: "NationalID",
  NATIONAL_ID_INVALID: "NationalID",
  NATIONAL_ID_IN_USE: "NationalID",
  ADDRESS_REQUIRED: "Address",
};

/* Tiny inline error rendered directly under an input. Keeping the
   component local to the file avoids dragging in another import for
   this single use site. */
const FieldError = ({ message }) =>
  message ? (
    <span
      role="alert"
      style={{ color: "var(--signal-stop)", fontSize: 12, marginTop: 4, display: "block" }}
    >
      {message}
    </span>
  ) : null;

function UserRegister() {
  const { t } = useTranslation(["auth", "errors"]);
  const [form, setForm] = useState({
    FirstName: "", LastName: "", Email: "", Password: "",
    PhoneNumber: "", NationalID: "", Address: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  /* Per-field errors map keyed by form field name. Generic errors
     (network, server, unknown) live in `genericError` and render
     directly above the submit button. */
  const [errors, setErrors] = useState({});
  const [genericError, setGenericError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /* Success flag drives the button into its "Account created" success
     state — text swaps, spinner shows, button stays disabled until the
     redirect timer fires. */
  const [succeeded, setSucceeded] = useState(false);
  const navigate = useNavigate();

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((m) => ({ ...m, [key]: "" }));
    setGenericError("");
  };

  const updateDigits = (key, max) => (e) => {
    setForm((f) => ({ ...f, [key]: onlyDigits(e.target.value).slice(0, max) }));
    setErrors((m) => ({ ...m, [key]: "" }));
    setGenericError("");
  };

  /* Returns a per-field error map. An empty object means the form is
     clean and we can hit the API. */
  const validate = () => {
    const errs = {};
    if (form.FirstName.trim().length < 2) errs.FirstName = t("userRegister.validation.firstName");
    if (form.LastName.trim().length < 2) errs.LastName = t("userRegister.validation.lastName");
    if (!isValidEmail(form.Email.trim())) errs.Email = t("userRegister.validation.email");
    if (form.Password.length < 8) {
      errs.Password = t("userRegister.validation.passwordShort");
    } else if (!/[A-Za-z]/.test(form.Password) || !/[0-9]/.test(form.Password)) {
      errs.Password = t("userRegister.validation.passwordWeak");
    }
    if (form.PhoneNumber.length !== PHONE_LEN || !/^\d+$/.test(form.PhoneNumber))
      errs.PhoneNumber = t("userRegister.validation.phone", { digits: PHONE_LEN });
    if (form.NationalID.length !== NID_LEN || !/^\d+$/.test(form.NationalID))
      errs.NationalID = t("userRegister.validation.nationalId", { digits: NID_LEN });
    if (!form.Address.trim()) errs.Address = t("userRegister.validation.address");
    return errs;
  };

  /* Routes a server error to its input by code (errors namespace),
     translating the message. Codes the form can't attribute to a field
     fall through to the generic banner above the submit button. */
  const routeServerError = (err) => {
    const code = errorCode(err);
    const fallback = friendlyError(err);
    const text = code ? t(code, { ns: "errors", defaultValue: fallback }) : fallback;
    const field = code && FIELD_BY_CODE[code];
    if (field) {
      setErrors((m) => ({ ...m, [field]: text }));
    } else {
      setGenericError(text || t("userRegister.validation.failed"));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGenericError("");
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      FirstName: form.FirstName.trim(),
      LastName: form.LastName.trim(),
      Email: form.Email.trim(),
      Password: form.Password,
      Type: "C",
      PhoneNumber: form.PhoneNumber,
      NationalID: form.NationalID,
      Address: form.Address.trim(),
    };

    setSubmitting(true);
    try {
      const res = await register(payload);
      if (!res?.ok) {
        routeServerError({ response: { status: 400, data: res } });
        setSubmitting(false);
        return;
      }

      /* Success — flip the button into its locked success state, keep
         it disabled, and redirect after a short pause so the success
         affordance is visible to the user. */
      setSucceeded(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      routeServerError(err);
      setSubmitting(false);
    }
  };

  /* Button is disabled while submitting OR after success (until the
     redirect fires) so a stray click can't double-submit. */
  const buttonDisabled = submitting || succeeded;

  return (
    <div className={styles.shell}>
      <section className={styles.formSide}>
        <Link to="/" className={styles.brandRow} aria-label={t("brandAria")}>
          <span className={styles.brandText}>Takhlees</span>
        </Link>

        <div className={`${styles.formInner} ${styles.formInnerWide}`}>
          <div className={styles.tabs}>
            <NavLink to="/register" end className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}>
              <Icon name="user" size={14} /> {t("tabs.personal")}
            </NavLink>
            <NavLink to="/company/register" className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}>
              <Icon name="building" size={14} /> {t("tabs.company")}
            </NavLink>
          </div>

          <h1 className={styles.title}>{t("userRegister.title")}</h1>
          <p className={styles.subtitle}>{t("userRegister.subtitle")}</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.row}>
              <label className="field">
                <span className="field-label">{t("userRegister.firstName")}</span>
                <input className="input" autoComplete="given-name" value={form.FirstName} onChange={update("FirstName")} required disabled={submitting || succeeded} />
                <FieldError message={errors.FirstName} />
              </label>
              <label className="field">
                <span className="field-label">{t("userRegister.lastName")}</span>
                <input className="input" autoComplete="family-name" value={form.LastName} onChange={update("LastName")} required disabled={submitting || succeeded} />
                <FieldError message={errors.LastName} />
              </label>
            </div>

            <label className="field">
              <span className="field-label">{t("userRegister.email")}</span>
              <div className="input-with-icon">
                <span className="input-icon"><Icon name="email" size={16} /></span>
                <input type="email" className="input" autoComplete="email" value={form.Email} onChange={update("Email")} required disabled={submitting || succeeded} />
              </div>
              <FieldError message={errors.Email} />
            </label>

            <label className="field">
              <span className="field-label">{t("userRegister.password")}</span>
              <div className={styles.passwordWrap}>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="lock" size={16} /></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input"
                    autoComplete="new-password"
                    value={form.Password}
                    onChange={update("Password")}
                    required
                    disabled={submitting || succeeded}
                    placeholder={t("userRegister.passwordPlaceholder")}
                  />
                </div>
                <button type="button" className={styles.togglePassword} onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                  {showPassword ? t("hide") : t("show")}
                </button>
              </div>
              <span className="hint">{t("userRegister.passwordHint")}</span>
              <FieldError message={errors.Password} />
            </label>

            <div className={styles.row}>
              <label className="field">
                <span className="field-label">{t("userRegister.phone")}</span>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="phone" size={16} /></span>
                  <input
                    inputMode="numeric"
                    pattern="\d{11}"
                    maxLength={PHONE_LEN}
                    className="input"
                    value={form.PhoneNumber}
                    onChange={updateDigits("PhoneNumber", PHONE_LEN)}
                    placeholder={t("userRegister.phonePlaceholder")}
                    required
                    disabled={submitting || succeeded}
                  />
                </div>
                <span className="hint">{t("userRegister.phoneHint", { digits: PHONE_LEN })}</span>
                <FieldError message={errors.PhoneNumber} />
              </label>
              <label className="field">
                <span className="field-label">{t("userRegister.nationalId")}</span>
                <input
                  className="input"
                  inputMode="numeric"
                  pattern="\d{14}"
                  maxLength={NID_LEN}
                  value={form.NationalID}
                  onChange={updateDigits("NationalID", NID_LEN)}
                  placeholder={t("userRegister.nationalIdPlaceholder")}
                  required
                  disabled={submitting || succeeded}
                />
                <span className="hint">{t("userRegister.nationalIdHint", { digits: NID_LEN })}</span>
                <FieldError message={errors.NationalID} />
              </label>
            </div>
            <label className="field">
              <span className="field-label">{t("userRegister.address")}</span>
              <div className="input-with-icon">
                <span className="input-icon"><Icon name="pin" size={16} /></span>
                <input className="input" value={form.Address} onChange={update("Address")} required disabled={submitting || succeeded} />
              </div>
              <FieldError message={errors.Address} />
            </label>

            {genericError && (
              <div
                role="alert"
                style={{
                  color: "var(--signal-stop)",
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {genericError}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={buttonDisabled}>
              {succeeded ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {t("userRegister.success")}
                  <ContainerSpinner inline size={18} label={t("userRegister.redirecting")} />
                </span>
              ) : submitting ? (
                <ContainerSpinner inline size={20} label={t("userRegister.submitting")} />
              ) : (
                <>{t("userRegister.submit")} <Icon name="arrow_right" size={16} className="icon-flip" /></>
              )}
            </button>
          </form>

          <p className={styles.footerLinks}>
            {t("userRegister.footerPrompt")} <Link to="/login" className={styles.footerLink}>{t("userRegister.footerLink")}</Link>
          </p>
        </div>

        <div className={styles.bottom}>
          <span>{t("copyright", { year: new Date().getFullYear() })}</span>
          <span style={{ color: "var(--ink-faint)" }}>{t("userRegister.terms")}</span>
        </div>
      </section>
    </div>
  );
}

export default UserRegister;
