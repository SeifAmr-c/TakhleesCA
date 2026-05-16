import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import {
  getCompany,
  updateCompanyProfile,
  updateCompanyPricing,
  deleteCompanyAccount,
  canDeleteCompany,
} from "../../api/companies.js";
import { listCategories } from "../../api/applications.js";
import { listCompanyCategoryPricing } from "../../api/companyCategories.js";
import { listPorts, listCompanyPorts, addCompanyPort, removeCompanyPort } from "../../api/ports.js";
import { useAuth, setAuth, clearAuth } from "../../api/authState.js";
import { getCroppedImage } from "../../utils/cropImage.js";

const MAX_LOGO_BYTES = 4 * 1024 * 1024;

/* Mirror the governorate list used during company registration (CompanyRegister.jsx). */
const GOVERNORATES = [
  "Al Daqahliyah", "Red Sea", "Al Buhayrah", "Al Fayyum", "Al Gharbiyah",
  "Alexandria", "Ismailia", "Giza", "Al Minufiyah", "Al Minya", "Cairo",
  "Al Qalyubiyah", "Luxor", "New Valley", "Suez", "Ash Sharqiyah", "Aswan",
  "Asyut", "Bani Suwayf", "Port Said", "Damietta", "South Sinai",
  "Kafr ash Shaykh", "Matruh", "Qina", "North Sinai", "Suhaj",
];

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const FieldError = ({ message }) =>
  message ? (
    <span
      role="alert"
      style={{ color: "var(--signal-stop)", fontSize: 12, marginTop: 4, display: "block" }}
    >
      {message}
    </span>
  ) : null;

/* Tiny status pill rendered as a block directly under the Save button.
   Green for success, red for error — the page no longer floats banners at
   the top. Successful messages auto-hide after 1500ms (see useAutoHideStatus). */
const InlineStatus = ({ status }) => {
  if (!status?.text) return null;
  const isOk = status.kind === "success";
  return (
    <span
      role={isOk ? "status" : "alert"}
      style={{
        color: isOk ? "var(--signal-go, #16a34a)" : "var(--signal-stop, #dc2626)",
        fontSize: 13,
        fontWeight: 500,
        textAlign: "center",
      }}
    >
      {status.text}
    </span>
  );
};

/* Returns [status, setStatusAutoHide]. setStatusAutoHide behaves like
   setStatus but, when the new status is a success, schedules a 1500ms
   timer that clears the message back to empty. The pending timer is
   cleared on every call and on unmount, so dismounting mid-fade or
   submitting again before the timer fires can't leak. */
function useAutoHideStatus() {
  const [status, setStatus] = useState({ kind: "", text: "" });
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const setStatusAutoHide = useCallback((next) => {
    clearTimer();
    setStatus(next);
    if (next?.kind === "success" && next?.text) {
      timerRef.current = setTimeout(() => {
        setStatus({ kind: "", text: "" });
        timerRef.current = null;
      }, 1500);
    }
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return [status, setStatusAutoHide];
}

/* ---------- Logo card (dedicated inline section) ----------
   Sits at the top of the Edit Profile page as its own card. Owns the
   logo cropper end-to-end so it can submit independently of the text
   form below: switches between a "default" view (current avatar +
   Change Logo button) and an inline "edit" view (the <Cropper /> in
   strict DOM flow with its own zoom slider and Save/Cancel buttons).
   On save, sends a FormData with ONLY the `logo` field; the backend's
   updateCompanyProfile is read-then-write so untouched columns are
   preserved. The freshly-uploaded URL comes back via res.data.company
   and is bubbled up to the page via onSaved so the navbar avatar and
   the page-level company state refresh immediately. */
function LogoCard({ initial, onSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useAutoHideStatus();

  /* Cropper-edit-mode state. `cropperSrc` is the object URL for the
     just-picked file; while it's truthy the section renders the
     inline cropper. `croppedAreaPixels` comes from react-easy-crop's
     onCropComplete and feeds the canvas crop call. Default zoom of
     0.5 leaves room to zoom IN. */
  const [cropperSrc, setCropperSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.5);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropping, setCropping] = useState(false);

  /* Local preview for the freshly-cropped circle until the parent's
     `initial.LogoUrl` updates with the persisted Cloudinary URL. */
  const [localPreview, setLocalPreview] = useState("");

  const fileInputRef = useRef(null);

  /* Free object URLs on unmount or when they change. */
  useEffect(() => () => {
    if (cropperSrc) URL.revokeObjectURL(cropperSrc);
  }, [cropperSrc]);
  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0] || null;
    e.target.value = "";
    if (!file) return;
    setStatus({ kind: "", text: "" });
    if (!/^image\//.test(file.type)) {
      setStatus({ kind: "error", text: "Logo must be an image file." });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setStatus({ kind: "error", text: "Logo image must be 4MB or smaller." });
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
    setStatus({ kind: "", text: "" });
  };

  const saveLogo = async () => {
    if (!cropperSrc || !croppedAreaPixels) return;
    setCropping(true);
    setStatus({ kind: "", text: "" });
    let previewUrl = "";
    try {
      const cropped = await getCroppedImage(cropperSrc, croppedAreaPixels);
      previewUrl = cropped.previewUrl;
      const file = new File([cropped.blob], "logo.png", {
        type: cropped.blob.type || "image/png",
      });

      const payload = new FormData();
      payload.append("logo", file);

      setSubmitting(true);
      const res = await updateCompanyProfile(payload);
      if (res?.ok && res?.data?.company) {
        onSaved(res.data.company);
        if (localPreview) URL.revokeObjectURL(localPreview);
        setLocalPreview(previewUrl);
        URL.revokeObjectURL(cropperSrc);
        setCropperSrc("");
        setCroppedAreaPixels(null);
        setStatus({ kind: "success", text: "Logo updated." });
      } else {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setStatus({ kind: "error", text: res?.message || "Couldn't update the logo." });
      }
    } catch (err) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setStatus({
        kind: "error",
        text: err?.response?.data?.message || "Couldn't update the logo.",
      });
    } finally {
      setCropping(false);
      setSubmitting(false);
    }
  };

  /* Show the local preview (just-saved circle) until `initial.LogoUrl`
     catches up with the persisted URL; if there's no fresh upload,
     fall back to whatever the server reports. */
  const displayLogo = localPreview || initial?.LogoUrl || "";
  const isCropping = Boolean(cropperSrc);

  return (
    <div className="card card-pad-lg">
      <h3 className="card-title">Company logo</h3>
      <p className="card-subtitle">
        Shown on your public profile and in the navigation bar. PNG or JPG, up to 4MB.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {!isCropping ? (
        /* Default state — current avatar + "Change Logo" trigger. */
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <div
            aria-label={displayLogo ? "Current company logo" : "No logo uploaded yet"}
            style={{
              width: 128,
              height: 128,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid var(--line-strong, #cbd5e1)",
              /* Always render against a clean white surface so
                 transparent PNG logos don't pick up the card colour. */
              backgroundColor: "#ffffff",
              display: "grid",
              placeItems: "center",
              margin: "0 auto",
              position: "relative",
            }}
          >
            {displayLogo ? (
              <img
                src={displayLogo}
                alt="Current company logo"
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
              <Icon name="building" size={36} />
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
            >
              {displayLogo ? "Change logo" : "Upload logo"}
            </button>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            You'll be able to crop and zoom before saving.
          </p>
          <div style={{ marginTop: 8 }}>
            <InlineStatus status={status} />
          </div>
        </div>
      ) : (
        /* Edit state — inline cropper. The wrapper is a strict block
           div in normal page flow (NOT inside a flex column), so its
           hardcoded 250x250 box can't be overridden by any parent. */
        <div>
          <div
            style={{
              position: "relative",
              width: "250px",
              height: "250px",
              margin: "20px auto",
              /* White surface so transparent PNGs preview cleanly
                 instead of rendering over a dark backdrop. */
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid var(--line, #e5e7eb)",
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

          <div
            style={{
              width: "min(320px, 100%)",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
            }}
          >
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
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginTop: 16,
            }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={cancelCrop}
              disabled={cropping || submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveLogo}
              disabled={cropping || submitting || !croppedAreaPixels}
            >
              {cropping || submitting ? "Saving…" : "Save logo"}
            </button>
          </div>

          <div style={{ marginTop: 12, textAlign: "center" }}>
            <InlineStatus status={status} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Profile form (text only) ---------- */
function ProfileForm({ initial, onSaved, submitting, setSubmitting }) {
  const [form, setForm] = useState(() => ({
    Governorate: initial?.Governorate || "",
    Address: initial?.Address || "",
    ContactEmail: initial?.ContactEmail || "",
    About: initial?.About || "",
  }));
  const [errors, setErrors] = useState({});
  /* General save status (success/error) rendered as a block below the
     submit button. Successes auto-hide after 1500ms. */
  const [status, setStatus] = useAutoHideStatus();

  useEffect(() => {
    setForm({
      Governorate: initial?.Governorate || "",
      Address: initial?.Address || "",
      ContactEmail: initial?.ContactEmail || "",
      About: initial?.About || "",
    });
  }, [initial]);

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((m) => ({ ...m, [key]: "" }));
    setStatus({ kind: "", text: "" });
  };

  const validate = () => {
    const errs = {};
    if (!form.Governorate) errs.Governorate = "Pick a governorate.";
    if (!form.Address.trim()) errs.Address = "Address is required.";
    if (!isValidEmail(form.ContactEmail)) errs.ContactEmail = "Enter a valid email.";
    if (form.About.length > 255) errs.About = "About must be 255 characters or fewer.";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ kind: "", text: "" });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    /* Logo is owned by LogoCard now — submit only the text fields here.
       JSON is fine since the backend accepts either JSON or FormData. */
    setSubmitting(true);
    try {
      const res = await updateCompanyProfile({
        Governorate: form.Governorate,
        Address: form.Address.trim(),
        ContactEmail: form.ContactEmail.trim(),
        About: form.About.trim(),
      });
      if (res?.ok && res?.data?.company) {
        onSaved(res.data.company);
        setStatus({ kind: "success", text: "Profile saved." });
      } else {
        setStatus({ kind: "error", text: res?.message || "Couldn't save the profile." });
      }
    } catch (err) {
      setStatus({
        kind: "error",
        text: err?.response?.data?.message || "Couldn't save the profile.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card card-pad-lg" noValidate>
      <h3 className="card-title">Basic info</h3>
      <p className="card-subtitle">Visible to clients on your public profile.</p>

      <div className="stack">
        <label className="field">
          <span className="field-label">Governorate *</span>
          <select
            className="select"
            value={form.Governorate}
            onChange={update("Governorate")}
            disabled={submitting}
          >
            <option value="" disabled>Select a Governorate</option>
            {GOVERNORATES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <FieldError message={errors.Governorate} />
        </label>

        <label className="field">
          <span className="field-label">Address *</span>
          <div className="input-with-icon">
            <span className="input-icon"><Icon name="pin" size={16} /></span>
            <input
              className="input"
              value={form.Address}
              onChange={update("Address")}
              maxLength={255}
              placeholder="Street, building, city"
              disabled={submitting}
            />
          </div>
          <FieldError message={errors.Address} />
        </label>

        <label className="field">
          <span className="field-label">Contact email *</span>
          <div className="input-with-icon">
            <span className="input-icon"><Icon name="email" size={16} /></span>
            <input
              type="email"
              className="input"
              value={form.ContactEmail}
              onChange={update("ContactEmail")}
              autoComplete="email"
              disabled={submitting}
            />
          </div>
          <FieldError message={errors.ContactEmail} />
        </label>

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
          <span className="hint">Max 255 characters. Shown on your public profile.</span>
          <FieldError message={errors.About} />
        </label>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          marginTop: 20,
        }}
      >
        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
          {submitting ? (
            <ContainerSpinner inline size={20} label="Saving…" />
          ) : (
            <>Save profile <Icon name="check" size={16} /></>
          )}
        </button>
        <InlineStatus status={status} />
      </div>
    </form>
  );
}

/* ---------- Pricing form ---------- */
function PricingForm({ companyId }) {
  const [categories, setCategories] = useState([]);
  const [drafts, setDrafts] = useState({});         // { [CategoryID]: stringFromInput }
  const [savedPrices, setSavedPrices] = useState({}); // { [CategoryID]: numericPrice }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useAutoHideStatus();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cats, rows] = await Promise.all([
          listCategories().catch(() => []),
          listCompanyCategoryPricing(companyId).catch(() => []),
        ]);
        if (!active) return;
        const catList = Array.isArray(cats) ? cats : cats?.data || [];
        const priceList = Array.isArray(rows) ? rows : rows?.data || [];
        const priceMap = {};
        for (const r of priceList) {
          if (r?.CategoryID != null && r?.Price != null) {
            priceMap[Number(r.CategoryID)] = Number(r.Price);
          }
        }
        const draftMap = {};
        for (const c of catList) {
          const id = Number(c.CategoryID);
          draftMap[id] = priceMap[id] != null ? String(priceMap[id]) : "";
        }
        setCategories(catList);
        setSavedPrices(priceMap);
        setDrafts(draftMap);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  const onChange = (categoryId) => (e) => {
    const value = e.target.value;
    /* Numbers-only money-shape input: digits and an optional decimal up
       to 2 places. Reject anything else by ignoring the keystroke. */
    if (value !== "" && !/^\d*\.?\d{0,2}$/.test(value)) return;
    setDrafts((d) => ({ ...d, [categoryId]: value }));
    setErrors((m) => ({ ...m, [categoryId]: "" }));
    setStatus({ kind: "", text: "" });
  };

  const dirty = categories.some((c) => {
    const id = Number(c.CategoryID);
    const draft = drafts[id] ?? "";
    const saved = savedPrices[id];
    if (saved == null) return draft !== "";
    return Number(draft) !== Number(saved);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ kind: "", text: "" });

    /* Build the prices payload only from rows the company actually entered
       a positive number for. Surface inline errors for invalid entries. */
    const errs = {};
    const prices = [];
    for (const c of categories) {
      const id = Number(c.CategoryID);
      const raw = (drafts[id] ?? "").trim();
      if (raw === "") continue;
      const numeric = Number(raw);
      if (isNaN(numeric) || numeric <= 0) {
        errs[id] = "Enter a price greater than 0.";
        continue;
      }
      prices.push({ CategoryID: id, Price: numeric });
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (prices.length === 0) {
      setStatus({ kind: "error", text: "Enter at least one price before saving." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateCompanyPricing(prices);
      if (res?.ok) {
        const next = { ...savedPrices };
        for (const r of prices) next[r.CategoryID] = r.Price;
        setSavedPrices(next);
        setStatus({ kind: "success", text: res.message || "Pricing saved." });
      } else {
        setStatus({ kind: "error", text: res?.message || "Couldn't save pricing." });
      }
    } catch (err) {
      setStatus({
        kind: "error",
        text: err?.response?.data?.message || "Couldn't save pricing.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card card-pad-lg" noValidate>
      <h3 className="card-title">Service pricing</h3>
      <p className="card-subtitle">
        Set your price per category. Clients see this amount on the
        application's Payment step.
      </p>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <ContainerSpinner size={64} label="Loading pricing" />
        </div>
      ) : categories.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--ink-soft)" }}>
          No categories defined yet.
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {categories.map((c, i) => {
            const id = Number(c.CategoryID);
            const draft = drafts[id] ?? "";
            const saved = savedPrices[id];
            return (
              <li
                key={id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(180px, 260px)",
                  alignItems: "start",
                  gap: 16,
                  padding: "16px 0",
                  borderBottom: i < categories.length - 1 ? "1px solid var(--gray-100)" : "none",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: 14 }}>
                    {c.Type}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {saved != null
                      ? `Current price: EGP ${Number(saved).toLocaleString()}`
                      : "Price not set yet."}
                  </div>
                </div>
                <div>
                  <div className="input-with-icon">
                    <span className="input-icon"><Icon name="receipt" size={14} /></span>
                    <input
                      className="input"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={draft}
                      onChange={onChange(id)}
                      disabled={submitting}
                    />
                  </div>
                  <FieldError message={errors[id]} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          marginTop: 20,
        }}
      >
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={!dirty || submitting || loading}
        >
          {submitting ? (
            <ContainerSpinner inline size={20} label="Saving…" />
          ) : (
            <>Save pricing <Icon name="check" size={16} /></>
          )}
        </button>
        <InlineStatus status={status} />
      </div>
    </form>
  );
}

/* ---------- Ports form ---------- */
function PortsForm({ companyId }) {
  const [allPorts, setAllPorts] = useState([]);
  const [savedPortIds, setSavedPortIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useAutoHideStatus();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ports, companyPorts] = await Promise.all([
          listPorts().catch(() => []),
          listCompanyPorts(companyId).catch(() => []),
        ]);
        if (!active) return;
        const portList = Array.isArray(ports) ? ports : ports?.data || [];
        const cpList = Array.isArray(companyPorts) ? companyPorts : companyPorts?.data || [];
        const saved = new Set(cpList.map((cp) => Number(cp.PortID)));
        setAllPorts(portList);
        setSavedPortIds(saved);
        setSelectedIds(new Set(saved));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  const toggle = (portId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(portId) ? next.delete(portId) : next.add(portId);
      return next;
    });
    setStatus({ kind: "", text: "" });
  };

  const dirty = allPorts.some((p) => {
    const id = Number(p.PortID);
    return selectedIds.has(id) !== savedPortIds.has(id);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ kind: "", text: "" });
    setSubmitting(true);
    try {
      const toAdd = [...selectedIds].filter((id) => !savedPortIds.has(id));
      const toRemove = [...savedPortIds].filter((id) => !selectedIds.has(id));
      await Promise.all([
        ...toAdd.map((portId) => addCompanyPort({ CompanyID: companyId, PortID: portId })),
        ...toRemove.map((portId) => removeCompanyPort(companyId, portId)),
      ]);
      setSavedPortIds(new Set(selectedIds));
      setStatus({ kind: "success", text: "Ports saved." });
    } catch (err) {
      setStatus({
        kind: "error",
        text: err?.response?.data?.Message || "Couldn't save ports.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card card-pad-lg" noValidate>
      <h3 className="card-title">Ports of operation</h3>
      <p className="card-subtitle">Select all ports where you provide clearance services.</p>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <ContainerSpinner size={64} label="Loading ports" />
        </div>
      ) : allPorts.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--ink-soft)" }}>
          No ports available.
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "12px 0" }}>
          {allPorts.map((p) => {
            const id = Number(p.PortID);
            const selected = selectedIds.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                disabled={submitting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: `1.5px solid ${selected ? "var(--brand)" : "var(--line-strong)"}`,
                  background: selected ? "var(--harbor-100)" : "var(--surface)",
                  color: selected ? "var(--brand)" : "var(--ink-soft)",
                  fontWeight: selected ? 600 : 400,
                  fontSize: 14,
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "border-color 150ms ease, background 150ms ease, color 150ms ease",
                }}
              >
                {selected && <Icon name="check" size={13} />}
                {p.PortName}
                {p.PortType && (
                  <span style={{ fontSize: 11, opacity: 0.65 }}>({p.PortType})</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          marginTop: 20,
        }}
      >
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={!dirty || submitting || loading}
        >
          {submitting ? (
            <ContainerSpinner inline size={20} label="Saving…" />
          ) : (
            <>Save ports <Icon name="check" size={16} /></>
          )}
        </button>
        <InlineStatus status={status} />
      </div>
    </form>
  );
}

/* ---------- Danger zone (account deletion) ----------
   The Delete button is gated by /company/can-delete so the company
   can't click through into the server's 400 path. While the flag is
   still loading (`null`) we keep the button disabled to be safe. */
function DangerZoneCard() {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [hasActiveApplications, setHasActiveApplications] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await canDeleteCompany();
        if (!active) return;
        setHasActiveApplications(Boolean(res?.hasActiveApplications));
      } catch {
        if (!active) return;
        setHasActiveApplications(true);
      }
    })();
    return () => { active = false; };
  }, []);

  /* On success, flip the modal into its success state, then defer
     logout + redirect by 2s so the affirmation has time to register. */
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteCompanyAccount();
      if (res?.ok) {
        setDeleteSuccess(true);
        setDeleting(false);
        setTimeout(() => {
          clearAuth();
          navigate("/company/login", { replace: true });
        }, 2000);
      } else {
        setDeleting(false);
        setConfirmOpen(false);
      }
    } catch {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  const blocked = hasActiveApplications !== false;
  const isDisabled = blocked || deleting;

  return (
    <div
      className="card card-pad-lg"
      style={{ borderColor: "var(--signal-stop, #dc2626)" }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <p className="card-subtitle" style={{ margin: 0, textAlign: "center" }}>
          Deleting your company is permanent. You won't be able to do this while
          you have any active applications.
        </p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={isDisabled}
          style={{
            background: isDisabled ? "var(--gray-200, #e5e7eb)" : "var(--signal-stop, #dc2626)",
            color: isDisabled ? "var(--ink-faint, #94a3b8)" : "#fff",
            border: `1px solid ${isDisabled ? "var(--line, #e5e7eb)" : "var(--signal-stop, #dc2626)"}`,
            padding: "10px 20px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: isDisabled ? "not-allowed" : "pointer",
            opacity: isDisabled ? 0.65 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {deleting ? "Deleting…" : "Delete account"}
        </button>
        {hasActiveApplications === true && (
          <span style={{ fontSize: 12, color: "var(--ink-soft, #64748b)", textAlign: "center" }}>
            Account deletion is disabled because you have active applications.
          </span>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={deleteSuccess ? "Account deleted" : "Delete your account?"}
        message="Are you sure you want to delete your account? This action cannot be undone."
        confirmLabel="Delete Account"
        cancelLabel="Cancel"
        variant="danger"
        busy={deleting}
        isSuccess={deleteSuccess}
        successMessage="Your account has been deleted. Redirecting to the login page..."
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleting && !deleteSuccess) setConfirmOpen(false); }}
      />
    </div>
  );
}

/* ---------- Page ---------- */
function CompanyProfileEdit() {
  const auth = useAuth();
  const navigate = useNavigate();
  const companyId = auth?.kind === "company" ? auth?.company?.CompanyID : null;

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const data = await getCompany(companyId);
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.data || [];
        if (rows.length) setCompany(rows[0]);
        else setLoadError("Couldn't find your company record.");
      } catch {
        if (!active) return;
        setLoadError("Couldn't load your profile. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  /* Keep the cached auth.company in sync with what the server now stores
     so the rest of the app sees the new email/governorate/etc. */
  const handleProfileSaved = (updated) => {
    setCompany(updated);
    if (auth?.kind === "company") {
      setAuth({ ...auth, company: { ...(auth.company || {}), ...updated } });
    }
  };

  if (!companyId) {
    return (
      <PublicLayout title="Edit profile" subtitle="Update your company info and pricing." role="Company">
        <div className="banner-error">
          <Icon name="bell" size={16} />
          You need to be signed in as a company.{" "}
          <Link to="/company/login" style={{ color: "inherit", textDecoration: "underline" }}>
            Sign in
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout role="Company">
      <div className="container" style={{ padding: "32px 24px 80px" }}>
        <header style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate("/company/dashboard")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Icon name="arrow_left" size={14} />
              Back to dashboard
            </button>
          </div>
          <h1 className="h2" style={{ margin: 0 }}>Edit Profile</h1>
          <div style={{ flex: 1 }} />
        </header>
        <p className="muted" style={{ textAlign: "center", margin: "6px 0 32px" }}>
          Update your basic info and per-category pricing.
        </p>

        {loadError && (
          <div className="banner-error">
            <Icon name="bell" size={16} />
            {loadError}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
            <ContainerSpinner size={88} label="Loading profile" />
          </div>
        ) : (
          <Reveal as="div" style={{ display: "grid", gap: 24, maxWidth: 820, margin: "0 auto" }}>
            <LogoCard initial={company} onSaved={handleProfileSaved} />
            <ProfileForm
              initial={company}
              onSaved={handleProfileSaved}
              submitting={profileSubmitting}
              setSubmitting={setProfileSubmitting}
            />
            <PricingForm companyId={companyId} />
            <PortsForm companyId={companyId} />
            <DangerZoneCard />
          </Reveal>
        )}
      </div>
    </PublicLayout>
  );
}

export default CompanyProfileEdit;
