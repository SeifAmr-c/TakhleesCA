import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { loginCompany } from "../../api/companies.js";
import { setAuth } from "../../api/authState.js";
import Icon from "../../components/Icon.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import styles from "./Auth.module.css";

const extractErrorMessage = (err) => {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (err?.code === "ERR_NETWORK") {
    return "Cannot reach the server. Is the backend running on port 3000?";
  }
  return "Something went wrong. Please try again.";
};

function CompanyLogin() {
  const [contactEmail, setContactEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!contactEmail.trim() || !password) return setError("Please enter both email and password.");
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
      setError(res?.message || "Login failed.");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.shell}>
      <section className={styles.formSide}>
        <Link to="/" className={styles.brandRow} aria-label="Takhlees, home">
          <span className={styles.brandText}>Takhlees</span>
        </Link>

        <div className={styles.formInner}>
          <div className={styles.tabs} role="tablist">
            <NavLink to="/login" className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}>
              <Icon name="user" size={14} /> Personal
            </NavLink>
            <NavLink to="/company/login" className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}>
              <Icon name="building" size={14} /> Company
            </NavLink>
          </div>

          <h1 className={styles.title}>Company sign in</h1>
          <p className={styles.subtitle}>Manage your dashboard, requests, and revenue.</p>

          {error && <div className="banner-error" role="alert"><Icon name="bell" size={16} />{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span className="field-label">Work email</span>
              <div className="input-with-icon">
                <span className="input-icon"><Icon name="email" size={16} /></span>
                <input
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  className="input"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  disabled={submitting}
                />
              </div>
            </label>

            <label className="field">
              <span className="field-row">
                <span className="field-label">Password</span>
                <Link to="/forgot-password" className={styles.forgot}>Forgot password?</Link>
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
                    placeholder="Enter your password"
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
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? (
                <ContainerSpinner inline size={20} label="Signing in…" />
              ) : (
                <>Sign in <Icon name="arrow_right" size={16} /></>
              )}
            </button>
          </form>

          <p className={styles.footerLinks}>
            List your company on Takhlees? <Link to="/company/register" className={styles.footerLink}>Get started</Link>
          </p>
        </div>

        <div className={styles.bottom}>
          <span>&copy; {new Date().getFullYear()} Takhlees</span>
          <Link to="/contact" style={{ color: "var(--ink-faint)", textDecoration: "none" }}>Need help?</Link>
        </div>
      </section>
    </div>
  );
}

export default CompanyLogin;
