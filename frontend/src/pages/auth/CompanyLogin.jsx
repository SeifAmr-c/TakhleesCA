import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { loginCompany } from "../../api/companies.js";
import { setAuth } from "../../api/authState.js";
import { friendlyError, errorCode } from "../../api/client.js";
import Icon from "../../components/Icon.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { useTranslation } from "../../i18n";
import styles from "./Auth.module.css";

function CompanyLogin() {
  const { t } = useTranslation(["auth", "errors"]);
  const translateError = (err) => {
    const code = errorCode(err);
    const fallback = friendlyError(err);
    return code ? t(code, { ns: "errors", defaultValue: fallback }) : fallback;
  };
  const [contactEmail, setContactEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expired = useMemo(() => searchParams.get("expired") === "1", [searchParams]);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!contactEmail.trim() || !password) return setError(t("companyLogin.missingFields"));
    setSubmitting(true);
    try {
      const res = await loginCompany({ contactEmail: contactEmail.trim(), password });
      if (res?.ok) {
        setAuth({
          kind: "company",
          role: "company",
          company: res?.data?.company || null,
        });
        navigate("/company/dashboard", { replace: true });
        return;
      }
      setError(res?.code ? t(res.code, { ns: "errors", defaultValue: res?.message }) : (res?.message || t("companyLogin.failed")));
    } catch (err) {
      setError(translateError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.shell}>
      <section className={styles.formSide}>
        <Link to="/" className={styles.brandRow} aria-label={t("brandAria")}>
          <span className={styles.brandText}>Takhlees</span>
        </Link>

        <div className={styles.formInner}>
          <div className={styles.tabs} role="tablist">
            <NavLink to="/login" className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}>
              <Icon name="user" size={14} /> {t("tabs.personal")}
            </NavLink>
            <NavLink to="/company/login" className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}>
              <Icon name="building" size={14} /> {t("tabs.company")}
            </NavLink>
          </div>

          <h1 className={styles.title}>{t("companyLogin.title")}</h1>
          <p className={styles.subtitle}>{t("companyLogin.subtitle")}</p>

          {expired && !error && (
            <div className="banner-error" role="alert">
              <Icon name="bell" size={16} />{t("expired")}
            </div>
          )}
          {error && <div className="banner-error" role="alert"><Icon name="bell" size={16} />{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span className="field-label">{t("companyLogin.emailLabel")}</span>
              <div className="input-with-icon">
                <span className="input-icon"><Icon name="email" size={16} /></span>
                <input
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  className="input"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={t("companyLogin.emailPlaceholder")}
                  required
                  disabled={submitting}
                />
              </div>
            </label>

            <label className="field">
              <span className="field-row">
                <span className="field-label">{t("companyLogin.passwordLabel")}</span>
                <Link to="/forgot-password" className={styles.forgot}>{t("companyLogin.forgot")}</Link>
              </span>
              <div className={styles.passwordWrap}>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="lock" size={16} /></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("companyLogin.passwordPlaceholder")}
                    required
                    disabled={submitting}
                  />
                </div>
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? t("hide") : t("show")}
                </button>
              </div>
            </label>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? (
                <ContainerSpinner inline size={20} label={t("companyLogin.submitting")} />
              ) : (
                <>{t("companyLogin.submit")} <Icon name="arrow_right" size={16} className="icon-flip" /></>
              )}
            </button>
          </form>

          <p className={styles.footerLinks}>
            {t("companyLogin.footerPrompt")} <Link to="/company/register" className={styles.footerLink}>{t("companyLogin.footerLink")}</Link>
          </p>
        </div>

        <div className={styles.bottom}>
          <span>{t("copyright", { year: new Date().getFullYear() })}</span>
          <Link to="/contact" style={{ color: "var(--ink-faint)", textDecoration: "none" }}>{t("needHelp")}</Link>
        </div>
      </section>
    </div>
  );
}

export default CompanyLogin;
