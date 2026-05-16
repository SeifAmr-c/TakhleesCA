import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { login } from "../../api/auth.js";
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

function UserLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const expired = useMemo(() => searchParams.get("expired") === "1", [searchParams]);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Please enter both email and password.");
    setSubmitting(true);
    try {
      const res = await login({ email: email.trim(), password });
      if (res?.ok) {
        const role = res?.data?.user?.Type;
        setAuth({
          kind: "user",
          role: role === "A" ? "admin" : "client",
          user: res?.data?.user || null,
        });
        const from = location.state?.from?.pathname;
        if (from) {
          navigate(from, { replace: true });
        } else {
          navigate(role === "A" ? "/admin/dashboard" : "/", { replace: true });
        }
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

          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to track shipments and manage applications.</p>

          {expired && !error && (
            <div className="banner-error" role="alert">
              <Icon name="bell" size={16} />Your session has expired. Please sign in again.
            </div>
          )}
          {error && <div className="banner-error" role="alert"><Icon name="bell" size={16} />{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span className="field-label">Email</span>
              <div className="input-with-icon">
                <span className="input-icon"><Icon name="email" size={16} /></span>
                <input
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
            New to Takhlees? <Link to="/register" className={styles.footerLink}>Create an account</Link>
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

export default UserLogin;
