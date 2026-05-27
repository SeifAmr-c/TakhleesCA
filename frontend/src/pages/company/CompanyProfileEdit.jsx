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
  deleteCompanyAccount,
  canDeleteCompany,
} from "../../api/companies.js";
import {
  listCategories,
  listCompanyCategoryPricing,
  createCompanyCategoryPrice,
  upsertCompanyCategoryPrice,
  deleteCompanyCategoryPrice,
} from "../../api/companyCategories.js";
import { listPorts, listCompanyPorts, addCompanyPort, removeCompanyPort } from "../../api/ports.js";
import { useAuth, setAuth, clearAuth } from "../../api/authState.js";
import { getCroppedImage } from "../../utils/cropImage.js";
import { useTranslation } from "../../i18n";
import { GOVERNORATES } from "../../data/governorates.js";

const MAX_LOGO_BYTES = 4 * 1024 * 1024;

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
  const { t } = useTranslation("company");
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
      setStatus({ kind: "error", text: t("profile.logo.errorType") });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setStatus({ kind: "error", text: t("profile.logo.errorSize") });
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
        setStatus({ kind: "success", text: t("profile.logo.updated") });
      } else {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setStatus({ kind: "error", text: res?.message || t("profile.logo.updateError") });
      }
    } catch (err) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setStatus({
        kind: "error",
        text: err?.response?.data?.message || t("profile.logo.updateError"),
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
      <h3 className="card-title">{t("profile.logo.title")}</h3>
      <p className="card-subtitle">
        {t("profile.logo.subtitle")}
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
            aria-label={displayLogo ? t("profile.logo.current") : t("profile.logo.none")}
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
                alt={t("profile.logo.current")}
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
              {displayLogo ? t("profile.logo.change") : t("profile.logo.upload")}
            </button>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            {t("profile.logo.cropHint")}
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
            <span style={{ color: "var(--ink-soft, #475569)", minWidth: 40 }}>{t("profile.logo.zoom")}</span>
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
              {t("profile.logo.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveLogo}
              disabled={cropping || submitting || !croppedAreaPixels}
            >
              {cropping || submitting ? t("profile.logo.saving") : t("profile.logo.save")}
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
  const { t } = useTranslation("company");
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
    if (!form.Governorate) errs.Governorate = t("profile.form.errors.governorate");
    if (!form.Address.trim()) errs.Address = t("profile.form.errors.address");
    if (!isValidEmail(form.ContactEmail)) errs.ContactEmail = t("profile.form.errors.email");
    if (form.About.length > 255) errs.About = t("profile.form.errors.about");
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
        setStatus({ kind: "success", text: t("profile.form.saved") });
      } else {
        setStatus({ kind: "error", text: res?.message || t("profile.form.saveError") });
      }
    } catch (err) {
      setStatus({
        kind: "error",
        text: err?.response?.data?.message || t("profile.form.saveError"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card card-pad-lg" noValidate>
      <h3 className="card-title">{t("profile.form.title")}</h3>
      <p className="card-subtitle">{t("profile.form.subtitle")}</p>

      <div className="stack">
        <label className="field">
          <span className="field-label">{t("profile.form.governorate")} *</span>
          <select
            className="select"
            value={form.Governorate}
            onChange={update("Governorate")}
            disabled={submitting}
          >
            <option value="" disabled>{t("profile.form.governorateSelect")}</option>
            {GOVERNORATES.map((g) => (
              <option key={g} value={g}>{t(`common:governorates.${g}`, { defaultValue: g })}</option>
            ))}
          </select>
          <FieldError message={errors.Governorate} />
        </label>

        <label className="field">
          <span className="field-label">{t("profile.form.address")} *</span>
          <div className="input-with-icon">
            <span className="input-icon"><Icon name="pin" size={16} /></span>
            <input
              className="input"
              value={form.Address}
              onChange={update("Address")}
              maxLength={255}
              placeholder={t("profile.form.addressPlaceholder")}
              disabled={submitting}
            />
          </div>
          <FieldError message={errors.Address} />
        </label>

        <label className="field">
          <span className="field-label">{t("profile.form.contactEmail")} *</span>
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
          <span className="field-label">{t("profile.form.about")}</span>
          <textarea
            className="input"
            rows={4}
            maxLength={255}
            value={form.About}
            onChange={update("About")}
            placeholder={t("profile.form.aboutPlaceholder")}
            disabled={submitting}
          />
          <span className="hint">{t("profile.form.aboutHint")}</span>
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
            <ContainerSpinner inline size={20} label={t("profile.form.saving")} />
          ) : (
            <>{t("profile.form.save")} <Icon name="check" size={16} /></>
          )}
        </button>
        <InlineStatus status={status} />
      </div>
    </form>
  );
}

/* One saved pricing row: shows the category, an editable price input, a
   Save button that only enables when the draft differs from the saved
   value, and a Remove button. */
function PricingRow({ row, busy, moneyShape, onSave, onRemove }) {
  const { t } = useTranslation("company");
  const initial = String(row.Price);
  const [draft, setDraft] = useState(initial);

  useEffect(() => { setDraft(String(row.Price)); }, [row.Price]);

  const dirty = draft !== initial && draft !== "";

  return (
    <li
      style={{
        display: "flex", alignItems: "center", gap: 12,
        border: "1px solid var(--line)", borderRadius: 10,
        padding: "10px 14px", background: "var(--surface, #fff)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--navy)" }}><bdi>{row.Type}</bdi></div>
        <div className="muted" style={{ fontSize: 12 }}>
          {t("profile.pricing.currentPrice", { currency: t("profile.currency"), price: Number(row.Price).toLocaleString() })}
        </div>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span className="muted" style={{ fontSize: 12 }}>{t("profile.currency")}</span>
        <input
          inputMode="decimal"
          dir="ltr"
          value={draft}
          onChange={(e) => { if (moneyShape(e.target.value)) setDraft(e.target.value); }}
          disabled={busy}
          aria-label={t("profile.pricing.priceAria", { type: row.Type })}
          style={{
            width: 110, height: 34, border: "1px solid var(--line)", borderRadius: 8,
            padding: "0 10px", fontSize: 14, fontFamily: "var(--font-mono)", textAlign: "right",
          }}
        />
        <button
          type="button" className="btn btn-primary btn-sm"
          disabled={busy || !dirty}
          onClick={() => onSave(draft)}
        >
          {busy ? <ContainerSpinner inline size={14} label={t("profile.pricing.saving")} /> : <><Icon name="check" size={14} /> {t("profile.pricing.save")}</>}
        </button>
      </div>
      <button
        type="button" className="btn btn-secondary btn-sm" disabled={busy}
        onClick={onRemove} style={{ color: "var(--signal-stop, #c33)" }}
      >
        <Icon name="logout" size={14} /> {t("profile.pricing.remove")}
      </button>
    </li>
  );
}

/* ---------- Pricing form ----------
   Mirrors the PortsForm pattern: the company explicitly opts categories in
   from the admin-managed catalog, sets a price per row, and can remove a
   row. Removal is blocked server-side if any active application is using
   the (company, category) pair (409 CATEGORY_IN_USE — surfaced inline). */
function PricingForm({ companyId }) {
  const { t } = useTranslation("company");
  const [allCategories, setAllCategories] = useState([]);
  const [savedRows, setSavedRows] = useState([]); // [{ CategoryID, Type, Price }]
  const [loading, setLoading] = useState(true);
  const [busyCatId, setBusyCatId] = useState(null);
  const [picker, setPicker] = useState({ open: false, categoryId: "", price: "", error: "" });
  const [pickerBusy, setPickerBusy] = useState(false);
  const [status, setStatus] = useAutoHideStatus();

  const reload = useCallback(async () => {
    const [cats, rows] = await Promise.all([
      listCategories().catch(() => []),
      listCompanyCategoryPricing(companyId).catch(() => []),
    ]);
    const catList = Array.isArray(cats) ? cats : cats?.data || [];
    const priceList = Array.isArray(rows) ? rows : rows?.data || [];
    setAllCategories(catList);
    setSavedRows(priceList.map((r) => ({
      CategoryID: Number(r.CategoryID),
      Type: r.Type,
      Price: Number(r.Price),
    })));
  }, [companyId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try { await reload(); } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [reload]);

  const savedIds = new Set(savedRows.map((r) => r.CategoryID));
  const availableToAdd = allCategories.filter((c) => !savedIds.has(Number(c.CategoryID)));

  /* Keep picker selection valid as the catalog/picker state changes. */
  useEffect(() => {
    if (!picker.open) return;
    if (availableToAdd.length === 0) {
      if (picker.categoryId !== "") setPicker((p) => ({ ...p, categoryId: "" }));
      return;
    }
    const stillValid = availableToAdd.some((c) => String(c.CategoryID) === picker.categoryId);
    if (!stillValid) setPicker((p) => ({ ...p, categoryId: String(availableToAdd[0].CategoryID) }));
  }, [picker.open, picker.categoryId, availableToAdd]);

  const moneyShape = (v) => v === "" || /^\d*\.?\d{0,2}$/.test(v);

  const handleAdd = async () => {
    const cid = Number(picker.categoryId);
    const price = Number(picker.price);
    if (!cid) {
      setPicker((p) => ({ ...p, error: t("profile.pricing.chooseError") }));
      return;
    }
    if (!price || price <= 0) {
      setPicker((p) => ({ ...p, error: t("profile.pricing.priceError") }));
      return;
    }
    setPickerBusy(true);
    setStatus({ kind: "", text: "" });
    try {
      await createCompanyCategoryPrice(companyId, cid, price);
      await reload();
      const added = allCategories.find((c) => Number(c.CategoryID) === cid);
      setPicker({ open: false, categoryId: "", price: "", error: "" });
      setStatus({ kind: "success", text: t("profile.pricing.added", { type: added?.Type || t("dashboard.serviceFallback") }) });
    } catch (err) {
      setPicker((p) => ({
        ...p,
        error: err?.response?.data?.Message || err?.response?.data?.message || t("profile.pricing.addError"),
      }));
    } finally {
      setPickerBusy(false);
    }
  };

  const handleSavePrice = async (row, draft) => {
    const numeric = Number(draft);
    if (!numeric || numeric <= 0) {
      setStatus({ kind: "error", text: t("profile.pricing.priceForError", { type: row.Type }) });
      return;
    }
    setBusyCatId(row.CategoryID);
    setStatus({ kind: "", text: "" });
    try {
      await upsertCompanyCategoryPrice(companyId, row.CategoryID, numeric);
      await reload();
      setStatus({ kind: "success", text: t("profile.pricing.updated", { type: row.Type }) });
    } catch (err) {
      setStatus({
        kind: "error",
        text: err?.response?.data?.Message || err?.response?.data?.message || t("profile.pricing.saveError"),
      });
    } finally {
      setBusyCatId(null);
    }
  };

  const handleRemove = async (row) => {
    setBusyCatId(row.CategoryID);
    setStatus({ kind: "", text: "" });
    try {
      await deleteCompanyCategoryPrice(companyId, row.CategoryID);
      await reload();
      setStatus({ kind: "success", text: t("profile.pricing.removed", { type: row.Type }) });
    } catch (err) {
      const code = err?.response?.data?.Code;
      const active = err?.response?.data?.ActiveApplications;
      const msg = code === "CATEGORY_IN_USE"
        ? t("profile.pricing.inUse", { type: row.Type, count: active })
        : (err?.response?.data?.Message || err?.response?.data?.message || t("profile.pricing.removeError"));
      setStatus({ kind: "error", text: msg });
    } finally {
      setBusyCatId(null);
    }
  };

  return (
    <div className="card card-pad-lg">
      <h3 className="card-title">{t("profile.pricing.title")}</h3>
      <p className="card-subtitle">
        {t("profile.pricing.subtitle")}
      </p>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <ContainerSpinner size={64} label={t("profile.pricing.loading")} />
        </div>
      ) : (
        <>
          {savedRows.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "var(--ink-soft)", fontSize: 14 }}>
              {t("profile.pricing.empty")}
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {savedRows.map((row) => (
                <PricingRow
                  key={row.CategoryID}
                  row={row}
                  busy={busyCatId === row.CategoryID}
                  moneyShape={moneyShape}
                  onSave={(draft) => handleSavePrice(row, draft)}
                  onRemove={() => handleRemove(row)}
                />
              ))}
            </ul>
          )}

          {picker.open ? (
            <div
              style={{
                marginTop: 16, padding: 14, borderRadius: 10,
                border: "1px solid var(--line)", background: "var(--gray-50)",
                display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) auto auto",
                gap: 10, alignItems: "center",
              }}
            >
              <select
                value={picker.categoryId}
                onChange={(e) => setPicker((p) => ({ ...p, categoryId: e.target.value, error: "" }))}
                disabled={pickerBusy || availableToAdd.length === 0}
                aria-label={t("profile.pricing.chooseAria")}
                style={{
                  height: 38, border: "1px solid var(--line)", borderRadius: 8,
                  padding: "0 10px", fontSize: 14, background: "var(--surface, #fff)",
                }}
              >
                {availableToAdd.length === 0 ? (
                  <option value="">{t("profile.pricing.noneAvailable")}</option>
                ) : (
                  availableToAdd.map((c) => (
                    <option key={c.CategoryID} value={String(c.CategoryID)}>{c.Type}</option>
                  ))
                )}
              </select>
              <input
                type="text" inputMode="decimal" dir="ltr" placeholder={t("profile.pricing.pricePlaceholder")}
                value={picker.price}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setPicker((p) => ({ ...p, price: v, error: "" }));
                }}
                disabled={pickerBusy || availableToAdd.length === 0}
                aria-label={t("profile.pricing.newPriceAria")}
                style={{ height: 38, border: "1px solid var(--line)", borderRadius: 8, padding: "0 10px", fontSize: 14 }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAdd}
                disabled={pickerBusy || availableToAdd.length === 0}
              >
                {pickerBusy ? <ContainerSpinner inline size={14} label={t("profile.pricing.adding")} /> : <><Icon name="check" size={14} /> {t("profile.pricing.confirm")}</>}
              </button>
              <button
                type="button" className="btn btn-secondary btn-sm" disabled={pickerBusy}
                onClick={() => { setPicker({ open: false, categoryId: "", price: "", error: "" }); setStatus({ kind: "", text: "" }); }}
              >
                {t("profile.pricing.cancel")}
              </button>
              {picker.error && (
                <div style={{ gridColumn: "1 / -1", color: "var(--signal-stop, #c33)", fontSize: 12 }}>
                  {picker.error}
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={availableToAdd.length === 0}
                title={availableToAdd.length === 0 ? t("profile.pricing.allPriced") : undefined}
                onClick={() => setPicker((p) => ({ ...p, open: true, error: "" }))}
              >
                <Icon name="check" size={14} /> {t("profile.pricing.add")}
              </button>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            <InlineStatus status={status} />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Ports form ----------
   Each port write hits the backend immediately so the company's port list
   stays consistent with the admin-managed catalog: add picks from ports the
   admin has published and isn't already saved, delete is blocked server-side
   if the company has an active application using that port (the backend
   returns 409 PORT_IN_USE — we surface that as an inline error). */
function PortsForm({ companyId }) {
  const { t } = useTranslation("company");
  const [allPorts, setAllPorts] = useState([]);
  const [savedPorts, setSavedPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyPortId, setBusyPortId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSelection, setPickerSelection] = useState("");
  const [status, setStatus] = useAutoHideStatus();

  const reload = useCallback(async () => {
    const [ports, companyPorts] = await Promise.all([
      listPorts().catch(() => []),
      listCompanyPorts(companyId).catch(() => []),
    ]);
    const portList = Array.isArray(ports) ? ports : ports?.data || [];
    const cpList = Array.isArray(companyPorts) ? companyPorts : companyPorts?.data || [];
    setAllPorts(portList);
    setSavedPorts(cpList.map((cp) => ({
      PortID: Number(cp.PortID),
      PortName: cp.PortName,
      PortType: cp.PortType,
    })));
  }, [companyId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try { await reload(); } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [reload]);

  const savedIds = new Set(savedPorts.map((p) => p.PortID));
  const availableToAdd = allPorts.filter((p) => !savedIds.has(Number(p.PortID)));

  /* Keep the picker selection in range when available ports change. */
  useEffect(() => {
    if (!pickerOpen) return;
    if (availableToAdd.length === 0) {
      setPickerSelection("");
      return;
    }
    const stillValid = availableToAdd.some((p) => String(p.PortID) === pickerSelection);
    if (!stillValid) setPickerSelection(String(availableToAdd[0].PortID));
  }, [pickerOpen, availableToAdd, pickerSelection]);

  const handleAdd = async () => {
    const portId = Number(pickerSelection);
    if (!portId) return;
    setAdding(true);
    setStatus({ kind: "", text: "" });
    try {
      await addCompanyPort({ CompanyID: companyId, PortID: portId });
      await reload();
      const added = allPorts.find((p) => Number(p.PortID) === portId);
      setPickerOpen(false);
      setStatus({ kind: "success", text: t("profile.ports.added", { name: added?.PortName || "" }) });
    } catch (err) {
      setStatus({
        kind: "error",
        text: err?.response?.data?.Message || err?.response?.data?.message || t("profile.ports.addError"),
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (port) => {
    setBusyPortId(port.PortID);
    setStatus({ kind: "", text: "" });
    try {
      await removeCompanyPort(companyId, port.PortID);
      await reload();
      setStatus({ kind: "success", text: t("profile.ports.removed", { name: port.PortName }) });
    } catch (err) {
      const code = err?.response?.data?.Code;
      const active = err?.response?.data?.ActiveApplications;
      const msg = code === "PORT_IN_USE"
        ? t("profile.ports.inUse", { name: port.PortName, count: active })
        : (err?.response?.data?.Message || err?.response?.data?.message || t("profile.ports.removeError"));
      setStatus({ kind: "error", text: msg });
    } finally {
      setBusyPortId(null);
    }
  };

  return (
    <div className="card card-pad-lg">
      <h3 className="card-title">{t("profile.ports.title")}</h3>
      <p className="card-subtitle">
        {t("profile.ports.subtitle")}
      </p>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <ContainerSpinner size={64} label={t("profile.ports.loading")} />
        </div>
      ) : (
        <>
          {savedPorts.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "var(--ink-soft)", fontSize: 14 }}>
              {t("profile.ports.empty")}
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {savedPorts.map((p) => (
                <li
                  key={p.PortID}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    border: "1px solid var(--line)", borderRadius: 10,
                    padding: "10px 14px", background: "var(--surface, #fff)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--navy)" }}><bdi>{p.PortName}</bdi></div>
                    <div className="muted" style={{ fontSize: 12 }}><bdi>{p.PortType}</bdi></div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busyPortId === p.PortID}
                    onClick={() => handleRemove(p)}
                    style={{ color: "var(--signal-stop, #c33)" }}
                  >
                    {busyPortId === p.PortID
                      ? <ContainerSpinner inline size={14} label={t("profile.ports.removing")} />
                      : <><Icon name="logout" size={14} /> {t("profile.ports.remove")}</>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {pickerOpen ? (
            <div
              style={{
                marginTop: 16, padding: 14, borderRadius: 10,
                border: "1px solid var(--line)", background: "var(--gray-50)",
                display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
              }}
            >
              <select
                value={pickerSelection}
                onChange={(e) => setPickerSelection(e.target.value)}
                disabled={adding || availableToAdd.length === 0}
                aria-label={t("profile.ports.chooseAria")}
                style={{
                  flex: 1, minWidth: 200, height: 38,
                  border: "1px solid var(--line)", borderRadius: 8,
                  padding: "0 10px", fontSize: 14, background: "var(--surface, #fff)",
                }}
              >
                {availableToAdd.length === 0 ? (
                  <option value="">{t("profile.ports.noneAvailable")}</option>
                ) : (
                  availableToAdd.map((p) => (
                    <option key={p.PortID} value={String(p.PortID)}>
                      {p.PortName}{p.PortType ? ` (${p.PortType})` : ""}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAdd}
                disabled={adding || !pickerSelection || availableToAdd.length === 0}
              >
                {adding ? <ContainerSpinner inline size={14} label={t("profile.ports.adding")} /> : <><Icon name="check" size={14} /> {t("profile.ports.confirm")}</>}
              </button>
              <button
                type="button" className="btn btn-secondary btn-sm" disabled={adding}
                onClick={() => { setPickerOpen(false); setStatus({ kind: "", text: "" }); }}
              >
                {t("profile.ports.cancel")}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={availableToAdd.length === 0}
                title={availableToAdd.length === 0 ? t("profile.ports.allAdded") : undefined}
                onClick={() => setPickerOpen(true)}
              >
                <Icon name="check" size={14} /> {t("profile.ports.add")}
              </button>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            <InlineStatus status={status} />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Danger zone (account deletion) ----------
   The Delete button is gated by /company/can-delete so the company
   can't click through into the server's 400 path. While the flag is
   still loading (`null`) we keep the button disabled to be safe. */
function DangerZoneCard() {
  const { t } = useTranslation("company");
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
          {t("profile.danger.note")}
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
          {deleting ? t("profile.danger.deleting") : t("profile.danger.button")}
        </button>
        {hasActiveApplications === true && (
          <span style={{ fontSize: 12, color: "var(--ink-soft, #64748b)", textAlign: "center" }}>
            {t("profile.danger.blocked")}
          </span>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={deleteSuccess ? t("profile.danger.successTitle") : t("profile.danger.modalTitle")}
        message={t("profile.danger.message")}
        confirmLabel={t("profile.danger.confirm")}
        cancelLabel={t("profile.danger.cancel")}
        variant="danger"
        busy={deleting}
        isSuccess={deleteSuccess}
        successMessage={t("profile.danger.successMessage")}
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleting && !deleteSuccess) setConfirmOpen(false); }}
      />
    </div>
  );
}

/* ---------- Page ---------- */
function CompanyProfileEdit() {
  const { t } = useTranslation("company");
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
        else setLoadError(t("profile.loadErrorNotFound"));
      } catch {
        if (!active) return;
        setLoadError(t("profile.loadError"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [companyId, t]);

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
      <PublicLayout title={t("profile.signedOut.title")} subtitle={t("profile.signedOut.subtitle")} role="Company">
        <div className="banner-error">
          <Icon name="bell" size={16} />
          {t("profile.signedOut.message")}{" "}
          <Link to="/company/login" style={{ color: "inherit", textDecoration: "underline" }}>
            {t("profile.signedOut.signIn")}
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
              {t("profile.back")}
            </button>
          </div>
          <h1 className="h2" style={{ margin: 0 }}>{t("profile.title")}</h1>
          <div style={{ flex: 1 }} />
        </header>
        <p className="muted" style={{ textAlign: "center", margin: "6px 0 32px" }}>
          {t("profile.subtitle")}
        </p>

        {loadError && (
          <div className="banner-error">
            <Icon name="bell" size={16} />
            {loadError}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
            <ContainerSpinner size={88} label={t("profile.loading")} />
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
