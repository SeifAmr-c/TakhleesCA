import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { register } from "../../api/auth.js";
import Icon from "../../components/Icon.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import styles from "./Auth.module.css";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const PHONE_LEN = 11;
const NID_LEN = 14;

const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");

const extractErrorMessage = (err) => {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (err?.code === "ERR_NETWORK") {
    return "Cannot reach the server. Is the backend running on port 3000?";
  }
  return "Something went wrong. Please try again.";
};

function UserRegister() {
  const [form, setForm] = useState({
    FirstName: "", LastName: "", Email: "", Password: "",
    PhoneNumber: "", NationalID: "", Address: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const updateDigits = (key, max) => (e) =>
    setForm((f) => ({ ...f, [key]: onlyDigits(e.target.value).slice(0, max) }));

  const validate = () => {
    if (form.FirstName.trim().length < 2) return "First name must be at least 2 characters.";
    if (form.LastName.trim().length < 2) return "Last name must be at least 2 characters.";
    if (!isValidEmail(form.Email.trim())) return "Please enter a valid email.";
    if (form.Password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Za-z]/.test(form.Password) || !/[0-9]/.test(form.Password))
      return "Password must contain at least one letter and one number.";
    if (form.PhoneNumber.length !== PHONE_LEN || !/^\d+$/.test(form.PhoneNumber))
      return `Phone number must be exactly ${PHONE_LEN} digits.`;
    if (form.NationalID.length !== NID_LEN || !/^\d+$/.test(form.NationalID))
      return `National ID must be exactly ${NID_LEN} digits.`;
    if (!form.Address.trim()) return "Address is required.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const v = validate();
    if (v) return setError(v);

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
        setError(res?.message || "Registration failed.");
        return;
      }

      setSuccess("Account created. Redirecting to sign in…");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
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

        <div className={`${styles.formInner} ${styles.formInnerWide}`}>
          <div className={styles.tabs}>
            <NavLink to="/register" end className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}>
              <Icon name="user" size={14} /> Personal
            </NavLink>
            <NavLink to="/company/register" className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}>
              <Icon name="building" size={14} /> Company
            </NavLink>
          </div>

          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>Get started in minutes — no credit card required.</p>

          {error && <div className="banner-error"><Icon name="bell" size={16} />{error}</div>}
          {success && <div className="banner-success"><Icon name="check" size={16} />{success}</div>}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.row}>
              <label className="field">
                <span className="field-label">First name</span>
                <input className="input" autoComplete="given-name" value={form.FirstName} onChange={update("FirstName")} required disabled={submitting} />
              </label>
              <label className="field">
                <span className="field-label">Last name</span>
                <input className="input" autoComplete="family-name" value={form.LastName} onChange={update("LastName")} required disabled={submitting} />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Email</span>
              <div className="input-with-icon">
                <span className="input-icon"><Icon name="email" size={16} /></span>
                <input type="email" className="input" autoComplete="email" value={form.Email} onChange={update("Email")} required disabled={submitting} />
              </div>
            </label>

            <label className="field">
              <span className="field-label">Password</span>
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
                    disabled={submitting}
                    placeholder="At least 8 characters with a number"
                  />
                </div>
                <button type="button" className={styles.togglePassword} onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <span className="hint">Minimum 8 characters with at least one letter and one number.</span>
            </label>

            <div className={styles.row}>
              <label className="field">
                <span className="field-label">Phone</span>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="phone" size={16} /></span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="\d{11}"
                    maxLength={PHONE_LEN}
                    className="input"
                    value={form.PhoneNumber}
                    onChange={updateDigits("PhoneNumber", PHONE_LEN)}
                    placeholder="11-digit phone number"
                    required
                    disabled={submitting}
                  />
                </div>
                <span className="hint">Exactly {PHONE_LEN} digits, numbers only.</span>
              </label>
              <label className="field">
                <span className="field-label">National ID</span>
                <input
                  className="input"
                  inputMode="numeric"
                  pattern="\d{14}"
                  maxLength={NID_LEN}
                  value={form.NationalID}
                  onChange={updateDigits("NationalID", NID_LEN)}
                  placeholder="14-digit national ID"
                  required
                  disabled={submitting}
                />
                <span className="hint">Exactly {NID_LEN} digits, numbers only.</span>
              </label>
            </div>
            <label className="field">
              <span className="field-label">Address</span>
              <div className="input-with-icon">
                <span className="input-icon"><Icon name="pin" size={16} /></span>
                <input className="input" value={form.Address} onChange={update("Address")} required disabled={submitting} />
              </div>
            </label>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? (
                <ContainerSpinner inline size={20} label="Creating account…" />
              ) : (
                <>Create account <Icon name="arrow_right" size={16} /></>
              )}
            </button>
          </form>

          <p className={styles.footerLinks}>
            Already have an account? <Link to="/login" className={styles.footerLink}>Sign in</Link>
          </p>
        </div>

        <div className={styles.bottom}>
          <span>&copy; {new Date().getFullYear()} Takhlees</span>
          <span style={{ color: "var(--ink-faint)" }}>By continuing, you agree to our terms.</span>
        </div>
      </section>
    </div>
  );
}

export default UserRegister;
