import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { registerCompany } from "../../api/companies.js";
import Icon from "../../components/Icon.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import styles from "./Auth.module.css";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");

const formatTaxNumber = (value) => {
  const digits = onlyDigits(value).slice(0, 9);
  const parts = [];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 9));
  return parts.join("-");
};

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
    Governorate: "",
    Address: "",
    About: "",
  });
  const [comRegFile, setComRegFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const MAX_PDF_BYTES = 5 * 1024 * 1024;

  const handleComRegChange = (e) => {
    const file = e.target.files?.[0] || null;
    setError("");
    if (!file) {
      setComRegFile(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Commercial registration must be a PDF.");
      e.target.value = "";
      setComRegFile(null);
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError("Commercial registration PDF must be 5MB or smaller.");
      e.target.value = "";
      setComRegFile(null);
      return;
    }
    setComRegFile(file);
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleTaxNumberChange = (e) =>
    setForm((f) => ({ ...f, TaxNumber: formatTaxNumber(e.target.value) }));

  const validate = () => {
    if (form.Name.trim().length < 2) return "Company name is required.";
    if (!isValidEmail(form.ContactEmail.trim())) return "Please enter a valid contact email.";
    if (!form.FoundingDate) return "Founding date is required.";
    if (new Date(form.FoundingDate) > new Date()) return "Founding date cannot be in the future.";
    if (form.Password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Za-z]/.test(form.Password) || !/[0-9]/.test(form.Password))
      return "Password must contain at least one letter and one number.";
    const taxDigits = form.TaxNumber.replace(/-/g, "");
    if (!/^\d{9}$/.test(taxDigits)) return "Tax number must be 9 digits.";
    if (Number(taxDigits) <= 0) return "Tax number must be a positive integer.";
    if (!form.Governorate.trim()) return "Governorate is required.";
    if (!form.Address.trim()) return "Address is required.";
    if (!comRegFile) return "Commercial registration PDF is required.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const v = validate();
    if (v) return setError(v);

    const payload = new FormData();
    payload.append("Name", form.Name.trim());
    payload.append("ContactEmail", form.ContactEmail.trim());
    payload.append("FoundingDate", form.FoundingDate);
    payload.append("Password", form.Password);
    payload.append("Comm", "10");
    payload.append("RegistrationDate", todayISO());
    payload.append("TaxNumber", String(Number(form.TaxNumber.replace(/-/g, ""))));
    payload.append("VerficationStatus", "Pending");
    payload.append("Governorate", form.Governorate.trim());
    payload.append("Address", form.Address.trim());
    payload.append("About", form.About.trim() || "Trusted clearance company on the Takhlees marketplace.");
    payload.append("ComRegFile", comRegFile);

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
                value={form.TaxNumber}
                onChange={handleTaxNumberChange}
                maxLength={11}
                placeholder="123-456-789"
                required
                disabled={submitting}
              />
              <span className="hint">9 digits, formatted as XXX-XXX-XXX. Must be unique.</span>
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
              <span className="field-label">Governorate</span>
              <select
                className="input"
                value={form.Governorate}
                onChange={update("Governorate")}
                required
                disabled={submitting}
              >
                <option value="" disabled>Select a Governorate</option>
                <option value="Al Daqahliyah">Al Daqahliyah</option>
                <option value="Red Sea">Red Sea</option>
                <option value="Al Buhayrah">Al Buhayrah</option>
                <option value="Al Fayyum">Al Fayyum</option>
                <option value="Al Gharbiyah">Al Gharbiyah</option>
                <option value="Alexandria">Alexandria</option>
                <option value="Ismailia">Ismailia</option>
                <option value="Giza">Giza</option>
                <option value="Al Minufiyah">Al Minufiyah</option>
                <option value="Al Minya">Al Minya</option>
                <option value="Cairo">Cairo</option>
                <option value="Al Qalyubiyah">Al Qalyubiyah</option>
                <option value="Luxor">Luxor</option>
                <option value="New Valley">New Valley</option>
                <option value="Suez">Suez</option>
                <option value="Ash Sharqiyah">Ash Sharqiyah</option>
                <option value="Aswan">Aswan</option>
                <option value="Asyut">Asyut</option>
                <option value="Bani Suwayf">Bani Suwayf</option>
                <option value="Port Said">Port Said</option>
                <option value="Damietta">Damietta</option>
                <option value="South Sinai">South Sinai</option>
                <option value="Kafr ash Shaykh">Kafr ash Shaykh</option>
                <option value="Matruh">Matruh</option>
                <option value="Qina">Qina</option>
                <option value="North Sinai">North Sinai</option>
                <option value="Suhaj">Suhaj</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">Address</span>
              <input
                className="input"
                value={form.Address}
                onChange={update("Address")}
                maxLength={255}
                placeholder="Street, building, city"
                required
                disabled={submitting}
              />
            </label>

            <div className="field">
              <span className="field-label">Commercial registration (PDF)</span>
              <label
                className={`${styles.dropzone} ${comRegFile ? styles.dropzoneFilled : ""}`}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  className={styles.dropzoneInput}
                  onChange={handleComRegChange}
                  disabled={submitting}
                />
                <span className={styles.dropzoneIcon} aria-hidden="true">
                  <Icon name={comRegFile ? "check" : "doc"} size={28} />
                </span>
                {comRegFile ? (
                  <>
                    <span className={styles.dropzoneFilename}>{comRegFile.name}</span>
                    <span className={styles.dropzoneSubtext}>Click to replace</span>
                  </>
                ) : (
                  <>
                    <span className={styles.dropzoneTitle}>Click to upload PDF</span>
                    <span className={styles.dropzoneSubtext}>PDF only · max 5MB</span>
                  </>
                )}
              </label>
            </div>

            <label className="field">
              <span className="field-label">About</span>
              <textarea
                className="input"
                rows={4}
                maxLength={255}
                value={form.About}
                onChange={update("About")}
                placeholder="A short description of your company"
                disabled={submitting}
              />
              <span className="hint">If accepted, this is what the user sees like a bio for the company. If left blank, we'll use a default description.</span>
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
