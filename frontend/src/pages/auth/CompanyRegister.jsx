import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { registerCompany } from "../../api/companies.js";
import Icon from "../../components/Icon.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import styles from "./Auth.module.css";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");

const extractErrorMessage = (err) => {
  const data = err?.response?.data;
  if (data?.Message) return data.Message;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (err?.code === "ERR_NETWORK") {
    return "Cannot reach the server. Is the backend running on port 3000?";
  }
  return "Something went wrong. Please try again.";
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function CompanyRegister() {
  const [form, setForm] = useState({
    Name: "",
    ContactEmail: "",
    FoundingDate: "",
    Password: "",
    TaxNumber: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const updateDigits = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: onlyDigits(e.target.value) }));

  const validate = () => {
    if (form.Name.trim().length < 2) return "Company name is required.";
    if (!isValidEmail(form.ContactEmail.trim())) return "Please enter a valid contact email.";
    if (!form.FoundingDate) return "Founding date is required.";
    if (new Date(form.FoundingDate) > new Date()) return "Founding date cannot be in the future.";
    if (form.Password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Za-z]/.test(form.Password) || !/[0-9]/.test(form.Password))
      return "Password must contain at least one letter and one number.";
    if (!/^\d+$/.test(form.TaxNumber)) return "Tax number must be digits only.";
    if (Number(form.TaxNumber) <= 0) return "Tax number must be a positive integer.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const v = validate();
    if (v) return setError(v);

    const payload = {
      Name: form.Name.trim(),
      ContactEmail: form.ContactEmail.trim(),
      FoundingDate: form.FoundingDate,
      Password: form.Password,
      Comm: 10,
      RegistrationDate: todayISO(),
      TaxNumber: Number(form.TaxNumber),
      VerficationStatus: "Pending",
    };

    setSubmitting(true);
    try {
      const res = await registerCompany(payload);
      if (res?.Status && res.Status !== "OK") {
        setError(res?.Message || "Registration failed.");
        return;
      }
      setSuccess("Company submitted for verification. Sign in once approved.");
      setTimeout(() => navigate("/company/login", { replace: true }), 1500);
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

          <h1 className={styles.title}>List your company</h1>
          <p className={styles.subtitle}>
            Tell us about your business — we’ll review and verify before you go live.
          </p>

          {error && <div className="banner-error"><Icon name="bell" size={16} />{error}</div>}
          {success && <div className="banner-success"><Icon name="check" size={16} />{success}</div>}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span className="field-label">Company name</span>
              <div className="input-with-icon">
                <span className="input-icon"><Icon name="building" size={16} /></span>
                <input className="input" value={form.Name} onChange={update("Name")} required disabled={submitting} />
              </div>
            </label>

            <label className="field">
              <span className="field-label">Contact email</span>
              <div className="input-with-icon">
                <span className="input-icon"><Icon name="email" size={16} /></span>
                <input
                  type="email"
                  className="input"
                  autoComplete="email"
                  value={form.ContactEmail}
                  onChange={update("ContactEmail")}
                  required
                  disabled={submitting}
                />
              </div>
            </label>

            <label className="field">
              <span className="field-label">Founding date</span>
              <input
                type="date"
                className="input"
                value={form.FoundingDate}
                onChange={update("FoundingDate")}
                max={todayISO()}
                required
                disabled={submitting}
              />
            </label>

            <label className="field">
              <span className="field-label">Tax number</span>
              <input
                className="input"
                inputMode="numeric"
                pattern="\d+"
                value={form.TaxNumber}
                onChange={updateDigits("TaxNumber")}
                placeholder="Numeric tax registration number"
                required
                disabled={submitting}
              />
              <span className="hint">Digits only. Must be unique.</span>
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

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting ? (
                <ContainerSpinner inline size={20} label="Submitting…" />
              ) : (
                <>Submit for verification <Icon name="arrow_right" size={16} /></>
              )}
            </button>
          </form>

          <p className={styles.footerLinks}>
            Already listed? <Link to="/company/login" className={styles.footerLink}>Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default CompanyRegister;
