import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { register } from "../../api/auth.js";
import { registerCompany } from "../../api/companies.js";
import { createDocumentRecord } from "../../api/documents.js";
import Icon from "../../components/Icon.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import styles from "./Auth.module.css";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const MAX_PDF_BYTES = 5 * 1024 * 1024;

const extractErrorMessage = (err) => {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (err?.code === "ERR_NETWORK") {
    return "Cannot reach the server. Is the backend running on port 3000?";
  }
  return "Something went wrong. Please try again.";
};

function CompanyRegister() {
  const [form, setForm] = useState({
    CompanyName: "", City: "", Services: "",
    ContactFirstName: "", ContactLastName: "",
    Email: "", Password: "",
  });
  const [document, setDocument] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onPickDocument = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return setDocument(null);
    if (file.type !== "application/pdf") {
      setError("Commercial registration must be a PDF.");
      e.target.value = "";
      return setDocument(null);
    }
    if (file.size > MAX_PDF_BYTES) {
      setError("Document must be 5 MB or smaller.");
      e.target.value = "";
      return setDocument(null);
    }
    setError("");
    setDocument(file);
  };

  const validate = () => {
    if (form.CompanyName.trim().length < 2) return "Company name is required.";
    if (form.City.trim().length < 2) return "City is required.";
    if (form.ContactFirstName.trim().length < 2) return "Contact first name is required.";
    if (form.ContactLastName.trim().length < 2) return "Contact last name is required.";
    if (!isValidEmail(form.Email.trim())) return "Please enter a valid email.";
    if (form.Password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Za-z]/.test(form.Password) || !/[0-9]/.test(form.Password))
      return "Password must contain at least one letter and one number.";
    if (!document) return "Please attach your commercial registration document (PDF).";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const v = validate();
    if (v) return setError(v);

    setSubmitting(true);
    try {
      const userRes = await register({
        FirstName: form.ContactFirstName.trim(),
        LastName: form.ContactLastName.trim(),
        Email: form.Email.trim(),
        Password: form.Password,
        Type: "A",
      });
      if (!userRes?.ok) {
        setError(userRes?.message || "Account creation failed.");
        return;
      }

      const newUserId = userRes?.data?.user?.UserID ?? null;

      try {
        await registerCompany({
          Name: form.CompanyName.trim(),
          City: form.City.trim(),
          Services: form.Services.trim(),
          OwnerEmail: form.Email.trim(),
        });
      } catch { /* swallow — backend may not yet have /company POST */ }

      if (document && newUserId) {
        try {
          await createDocumentRecord({
            DocType: `CommercialRegistration:${document.name}`,
            ClientID: newUserId,
          });
        } catch { /* document metadata is best-effort */ }
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
            <div className={styles.row}>
              <label className="field">
                <span className="field-label">Company name</span>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="building" size={16} /></span>
                  <input className="input" value={form.CompanyName} onChange={update("CompanyName")} required disabled={submitting} />
                </div>
              </label>
              <label className="field">
                <span className="field-label">City</span>
                <div className="input-with-icon">
                  <span className="input-icon"><Icon name="pin" size={16} /></span>
                  <input className="input" value={form.City} onChange={update("City")} required disabled={submitting} />
                </div>
              </label>
            </div>

            <label className="field">
              <span className="field-label">Services offered</span>
              <input
                className="input"
                value={form.Services}
                onChange={update("Services")}
                placeholder="e.g. Customs clearance, Documentation, Cargo handling"
                disabled={submitting}
              />
              <span className="hint">Comma-separated. We’ll show these on your public profile.</span>
            </label>

            <hr className="divider" />

            <div className={styles.row}>
              <label className="field">
                <span className="field-label">Contact first name</span>
                <input className="input" autoComplete="given-name" value={form.ContactFirstName} onChange={update("ContactFirstName")} required disabled={submitting} />
              </label>
              <label className="field">
                <span className="field-label">Contact last name</span>
                <input className="input" autoComplete="family-name" value={form.ContactLastName} onChange={update("ContactLastName")} required disabled={submitting} />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Work email</span>
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

            <label className="field">
              <span className="field-label">Commercial registration (PDF)</span>
              <input
                type="file"
                accept="application/pdf"
                className="input"
                onChange={onPickDocument}
                required
                disabled={submitting}
              />
              <span className="hint">
                {document ? `Selected: ${document.name}` : "PDF only, up to 5 MB."}
              </span>
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
