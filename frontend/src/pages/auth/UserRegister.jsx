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
    if (form.FirstName.trim().length < 2) errs.FirstName = "First name must be at least 2 characters.";
    if (form.LastName.trim().length < 2) errs.LastName = "Last name must be at least 2 characters.";
    if (!isValidEmail(form.Email.trim())) errs.Email = "Please enter a valid email.";
    if (form.Password.length < 8) {
      errs.Password = "Password must be at least 8 characters long.";
    } else if (!/[A-Za-z]/.test(form.Password) || !/[0-9]/.test(form.Password)) {
      errs.Password = "Password must contain at least one letter and one number.";
    }
    if (form.PhoneNumber.length !== PHONE_LEN || !/^\d+$/.test(form.PhoneNumber))
      errs.PhoneNumber = `Phone number must be exactly ${PHONE_LEN} digits.`;
    if (form.NationalID.length !== NID_LEN || !/^\d+$/.test(form.NationalID))
      errs.NationalID = `National ID must be exactly ${NID_LEN} digits.`;
    if (!form.Address.trim()) errs.Address = "Address is required.";
    return errs;
  };

  /* Best-effort mapping from a server error message to a specific
     input. Falls through to a generic error if no field fits. */
  const assignServerError = (message) => {
    const text = String(message || "");
    const lower = text.toLowerCase();
    if (lower.includes("email")) {
      setErrors((m) => ({ ...m, Email: text }));
      return;
    }
    if (lower.includes("phone")) {
      setErrors((m) => ({ ...m, PhoneNumber: text }));
      return;
    }
    if (lower.includes("national")) {
      setErrors((m) => ({ ...m, NationalID: text }));
      return;
    }
    if (lower.includes("password")) {
      setErrors((m) => ({ ...m, Password: text }));
      return;
    }
    setGenericError(text || "Registration failed.");
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
        assignServerError(res?.message);
        setSubmitting(false);
        return;
      }

      /* Success — flip the button into its locked success state, keep
         it disabled, and redirect after a short pause so the success
         affordance is visible to the user. */
      setSucceeded(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      assignServerError(extractErrorMessage(err));
      setSubmitting(false);
    }
  };

  /* Button is disabled while submitting OR after success (until the
     redirect fires) so a stray click can't double-submit. */
  const buttonDisabled = submitting || succeeded;

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

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.row}>
              <label className="field">
                <span className="field-label">First name</span>
                <input className="input" autoComplete="given-name" value={form.FirstName} onChange={update("FirstName")} required disabled={submitting || succeeded} />
                <FieldError message={errors.FirstName} />
              </label>
              <label className="field">
                <span className="field-label">Last name</span>
                <input className="input" autoComplete="family-name" value={form.LastName} onChange={update("LastName")} required disabled={submitting || succeeded} />
                <FieldError message={errors.LastName} />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Email</span>
              <div className="input-with-icon">
                <span className="input-icon"><Icon name="email" size={16} /></span>
                <input type="email" className="input" autoComplete="email" value={form.Email} onChange={update("Email")} required disabled={submitting || succeeded} />
              </div>
              <FieldError message={errors.Email} />
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
                    disabled={submitting || succeeded}
                    placeholder="At least 8 characters with a number"
                  />
                </div>
                <button type="button" className={styles.togglePassword} onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <span className="hint">Minimum 8 characters with at least one letter and one number.</span>
              <FieldError message={errors.Password} />
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
                    disabled={submitting || succeeded}
                  />
                </div>
                <span className="hint">Exactly {PHONE_LEN} digits, numbers only.</span>
                <FieldError message={errors.PhoneNumber} />
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
                  disabled={submitting || succeeded}
                />
                <span className="hint">Exactly {NID_LEN} digits, numbers only.</span>
                <FieldError message={errors.NationalID} />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Address</span>
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
                  Account created successfully
                  <ContainerSpinner inline size={18} label="Redirecting…" />
                </span>
              ) : submitting ? (
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
