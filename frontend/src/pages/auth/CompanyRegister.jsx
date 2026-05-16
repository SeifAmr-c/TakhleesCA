import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import { registerCompany } from "../../api/companies.js";
import { getCroppedImage } from "../../utils/cropImage.js";
import Icon from "../../components/Icon.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import styles from "./Auth.module.css";

const MAX_LOGO_BYTES = 4 * 1024 * 1024;

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

/* Tiny inline error rendered directly under an input. */
const FieldError = ({ message }) =>
  message ? (
    <span
      role="alert"
      style={{ color: "var(--signal-stop)", fontSize: 12, marginTop: 4, display: "block" }}
    >
      {message}
    </span>
  ) : null;

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
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  /* Cropper modal state. `cropperSrc` holds the original image the user
     picked (object URL); the modal stays open while it's truthy. */
  const [cropperSrc, setCropperSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  /* Default zoom of 0.5 keeps the photo small inside the circle by
     default — users zoom IN rather than starting at "fill". */
  const [zoom, setZoom] = useState(0.5);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropping, setCropping] = useState(false);
  const avatarInputRef = useRef(null);

  const [showPassword, setShowPassword] = useState(false);
  /* Per-field errors keyed by form field name (and "ComReg" / "Logo"
     for the file inputs). Generic errors land in `genericError` and
     render directly above the submit button. */
  const [errors, setErrors] = useState({});
  const [genericError, setGenericError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /* Drives the button into its locked "Submitted for verification"
     success state — text swaps, spinner shows, button stays disabled
     until the redirect timer fires. */
  const [succeeded, setSucceeded] = useState(false);
  const navigate = useNavigate();

  /* Free any object URLs we created when the component unmounts or the
     preview / cropper source changes — otherwise they leak. */
  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);
  useEffect(() => () => {
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
  }, [cropperSrc]);

  const MAX_PDF_BYTES = 5 * 1024 * 1024;

  const handleComRegChange = (e) => {
    const file = e.target.files?.[0] || null;
    setErrors((m) => ({ ...m, ComReg: "" }));
    setGenericError("");
    if (!file) {
      setComRegFile(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setErrors((m) => ({ ...m, ComReg: "Commercial registration must be a PDF." }));
      e.target.value = "";
      setComRegFile(null);
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setErrors((m) => ({ ...m, ComReg: "Commercial registration PDF must be 5MB or smaller." }));
      e.target.value = "";
      setComRegFile(null);
      return;
    }
    setComRegFile(file);
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0] || null;
    e.target.value = "";
    if (!file) return;
    setErrors((m) => ({ ...m, Logo: "" }));
    setGenericError("");
    if (!/^image\//.test(file.type)) {
      setErrors((m) => ({ ...m, Logo: "Logo must be an image file." }));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setErrors((m) => ({ ...m, Logo: "Logo image must be 4MB or smaller." }));
      return;
    }
    setCropperSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(0.5);
    setCroppedAreaPixels(null);
  };

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const cancelCrop = () => {
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
    setCropperSrc("");
    setCroppedAreaPixels(null);
  };

  const confirmCrop = async () => {
    if (!cropperSrc || !croppedAreaPixels) return;
    setCropping(true);
    try {
      const { blob, previewUrl } = await getCroppedImage(cropperSrc, croppedAreaPixels);
      const cropped = new File([blob], "logo.png", { type: blob.type || "image/png" });
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoFile(cropped);
      setLogoPreview(previewUrl);
      URL.revokeObjectURL(cropperSrc);
      setCropperSrc("");
    } catch {
      setGenericError("Could not crop that image. Try another one.");
    } finally {
      setCropping(false);
    }
  };

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((m) => ({ ...m, [key]: "" }));
    setGenericError("");
  };

  const handleTaxNumberChange = (e) => {
    setForm((f) => ({ ...f, TaxNumber: formatTaxNumber(e.target.value) }));
    setErrors((m) => ({ ...m, TaxNumber: "" }));
    setGenericError("");
  };

  /* Returns a per-field error map. An empty object means we can hit
     the API. Keys match form fields, plus "ComReg" for the PDF input. */
  const validate = () => {
    const errs = {};
    if (form.Name.trim().length < 2) errs.Name = "Company name is required.";
    if (!isValidEmail(form.ContactEmail.trim())) errs.ContactEmail = "Please enter a valid contact email.";
    if (!form.FoundingDate) errs.FoundingDate = "Founding date is required.";
    else if (new Date(form.FoundingDate) > new Date())
      errs.FoundingDate = "Founding date cannot be in the future.";
    if (form.Password.length < 8) {
      errs.Password = "Password must be at least 8 characters long.";
    } else if (!/[A-Za-z]/.test(form.Password) || !/[0-9]/.test(form.Password)) {
      errs.Password = "Password must contain at least one letter and one number.";
    }
    const taxDigits = form.TaxNumber.replace(/-/g, "");
    if (!/^\d{9}$/.test(taxDigits)) errs.TaxNumber = "Tax number must be 9 digits.";
    else if (Number(taxDigits) <= 0) errs.TaxNumber = "Tax number must be a positive integer.";
    if (!form.Governorate.trim()) errs.Governorate = "Governorate is required.";
    if (!form.Address.trim()) errs.Address = "Address is required.";
    if (!comRegFile) errs.ComReg = "Commercial registration PDF is required.";
    return errs;
  };

  /* Best-effort mapping from a server message to a field. Falls
     through to a generic error if no input matches. */
  const assignServerError = (message) => {
    const text = String(message || "");
    const lower = text.toLowerCase();
    if (lower.includes("tax")) {
      setErrors((m) => ({ ...m, TaxNumber: text }));
      return;
    }
    if (lower.includes("email")) {
      setErrors((m) => ({ ...m, ContactEmail: text }));
      return;
    }
    if (lower.includes("name") && !lower.includes("user")) {
      setErrors((m) => ({ ...m, Name: text }));
      return;
    }
    if (lower.includes("password")) {
      setErrors((m) => ({ ...m, Password: text }));
      return;
    }
    if (lower.includes("governorate")) {
      setErrors((m) => ({ ...m, Governorate: text }));
      return;
    }
    if (lower.includes("address")) {
      setErrors((m) => ({ ...m, Address: text }));
      return;
    }
    if (lower.includes("registration") || lower.includes("pdf") || lower.includes("comreg")) {
      setErrors((m) => ({ ...m, ComReg: text }));
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
    payload.append("ComReg", comRegFile);
    if (logoFile) {
      payload.append("logo", logoFile);
    }

    setSubmitting(true);
    try {
      const res = await registerCompany(payload);
      if (res?.Status && res.Status !== "OK") {
        assignServerError(res?.Message);
        setSubmitting(false);
        return;
      }
      /* Success — lock the button into its success state and redirect
         after a short pause so the affordance is visible. */
      setSucceeded(true);
      setTimeout(() => navigate("/company/login", { replace: true }), 2000);
    } catch (err) {
      assignServerError(extractErrorMessage(err));
      setSubmitting(false);
    }
  };

  /* Disabled while submitting OR after success (until redirect) so a
     stray click can't double-submit. */
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

          <h1 className={styles.title}>List your company</h1>
          <p className={styles.subtitle}>
            Tell us about your business — we’ll review and verify before you go live.
          </p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div
              className="field"
              style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={buttonDisabled}
                aria-label={logoFile ? "Change company logo" : "Upload company logo"}
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: "50%",
                  border: "2px dashed var(--line-strong, #cbd5e1)",
                  /* Always render against a clean white backdrop so
                     transparent PNGs don't pick up whatever sits behind
                     the button. */
                  backgroundColor: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  position: "relative",
                  padding: 0,
                  overflow: "hidden",
                }}
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Company logo preview"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      backgroundColor: "#ffffff",
                    }}
                  />
                ) : (
                  <span style={{ display: "grid", placeItems: "center", gap: 4, color: "var(--ink-faint, #64748b)" }}>
                    <Icon name="building" size={28} />
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      Logo
                    </span>
                  </span>
                )}
                {logoPreview && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(15, 23, 42, 0.35)",
                      color: "white",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      opacity: 0,
                      transition: "opacity 200ms ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                  >
                    Change
                  </span>
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoSelect}
                disabled={buttonDisabled}
                style={{ display: "none" }}
              />
              <span className="hint" style={{ textAlign: "center" }}>
                {logoFile ? "Click to replace · cropped to a circle" : "Add a company logo (optional). It'll be cropped to a circle."}
              </span>
              <FieldError message={errors.Logo} />
              {logoFile && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    if (logoPreview) URL.revokeObjectURL(logoPreview);
                    setLogoPreview("");
                    setLogoFile(null);
                  }}
                  disabled={buttonDisabled}
                >
                  Remove logo
                </button>
              )}
            </div>

            <label className="field">
              <span className="field-label">Company name</span>
              <div className="input-with-icon">
                <span className="input-icon"><Icon name="building" size={16} /></span>
                <input className="input" value={form.Name} onChange={update("Name")} required disabled={buttonDisabled} />
              </div>
              <FieldError message={errors.Name} />
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
                  disabled={buttonDisabled}
                />
              </div>
              <FieldError message={errors.ContactEmail} />
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
                disabled={buttonDisabled}
              />
              <FieldError message={errors.FoundingDate} />
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
                disabled={buttonDisabled}
              />
              <span className="hint">9 digits, formatted as XXX-XXX-XXX. Must be unique.</span>
              <FieldError message={errors.TaxNumber} />
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
                    disabled={buttonDisabled}
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

            <label className="field">
              <span className="field-label">Governorate</span>
              <select
                className="input"
                value={form.Governorate}
                onChange={update("Governorate")}
                required
                disabled={buttonDisabled}
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
              <FieldError message={errors.Governorate} />
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
                disabled={buttonDisabled}
              />
              <FieldError message={errors.Address} />
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
                  disabled={buttonDisabled}
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
              <FieldError message={errors.ComReg} />
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
                disabled={buttonDisabled}
              />
              <span className="hint">If accepted, this is what the user sees like a bio for the company. If left blank, we'll use a default description.</span>
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

      {cropperSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Crop your logo"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !cropping) cancelCrop();
          }}
        >
          <div
            style={{
              width: "min(340px, 100%)",
              background: "var(--surface, white)",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>Crop your logo</h3>
              <p style={{ margin: "4px 0 0", color: "var(--ink-soft, #475569)", fontSize: 13 }}>
                Drag to position, scroll or use the slider to zoom.
              </p>
            </div>

            {/* Section A — double-wrapper to fully isolate the canvas
                from the modal's flex column. The OUTER div is a plain
                block-level element, so it doesn't inherit any flex
                stretching from its parent. The INNER div locks the
                <Cropper /> to an exact 250x250 square (mx-auto centered),
                immune to any flex parent rules. */}
            <div style={{ display: "block" }}>
              <div
                style={{
                  position: "relative",
                  width: "250px",
                  height: "250px",
                  margin: "0 auto",
                  overflow: "hidden",
                  borderRadius: "8px",
                  /* Clean white surface so transparent PNGs don't render
                     over a dark backdrop and look black. */
                  backgroundColor: "#ffffff",
                }}
              >
                <Cropper
                  image={cropperSrc}
                  crop={crop}
                  zoom={zoom}
                  minZoom={0.5}
                  maxZoom={3}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  objectFit="contain"
                  style={{
                    containerStyle: { backgroundColor: "#ffffff" },
                    mediaStyle: { backgroundColor: "#ffffff" },
                  }}
                />
              </div>
            </div>

            {/* Section B — controls, fully outside Section A. Centered
                column with its own spacing rhythm. */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                marginTop: 16,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, width: "100%" }}>
                <span style={{ color: "var(--ink-soft, #475569)", minWidth: 40 }}>Zoom</span>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={cancelCrop}
                  disabled={cropping}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmCrop}
                  disabled={cropping || !croppedAreaPixels}
                >
                  {cropping ? "Saving…" : "Save logo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyRegister;
