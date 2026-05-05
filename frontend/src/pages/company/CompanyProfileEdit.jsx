import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import {
  getCompany,
  updateCompanyProfile,
  updateCompanyPricing,
} from "../../api/companies.js";
import { listCategories } from "../../api/applications.js";
import { listCompanyCategoryPricing } from "../../api/companyCategories.js";
import { useAuth, setAuth } from "../../api/authState.js";

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

/* ---------- Profile form ---------- */
function ProfileForm({ initial, onSaved, onNotice, submitting, setSubmitting }) {
  const [form, setForm] = useState(() => ({
    Governorate: initial?.Governorate || "",
    Address: initial?.Address || "",
    ContactEmail: initial?.ContactEmail || "",
    About: initial?.About || "",
  }));
  const [errors, setErrors] = useState({});

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
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

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
        onNotice("Profile saved.");
      } else {
        onNotice(res?.message || "Couldn't save the profile.");
      }
    } catch (err) {
      onNotice(err?.response?.data?.message || "Couldn't save the profile.");
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

      <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
          {submitting ? (
            <ContainerSpinner inline size={20} label="Saving…" />
          ) : (
            <>Save profile <Icon name="check" size={16} /></>
          )}
        </button>
      </div>
    </form>
  );
}

/* ---------- Pricing form ---------- */
function PricingForm({ companyId, onNotice }) {
  const [categories, setCategories] = useState([]);
  const [drafts, setDrafts] = useState({});         // { [CategoryID]: stringFromInput }
  const [savedPrices, setSavedPrices] = useState({}); // { [CategoryID]: numericPrice }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

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
      onNotice("Enter at least one price before saving.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateCompanyPricing(prices);
      if (res?.ok) {
        const next = { ...savedPrices };
        for (const r of prices) next[r.CategoryID] = r.Price;
        setSavedPrices(next);
        onNotice(res.message || "Pricing saved.");
      } else {
        onNotice(res?.message || "Couldn't save pricing.");
      }
    } catch (err) {
      onNotice(err?.response?.data?.message || "Couldn't save pricing.");
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

      <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
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
      </div>
    </form>
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
  const [notice, setNotice] = useState("");

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

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3500);
  };

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
      <DashboardLayout title="Edit profile" subtitle="Update your company info and pricing." role="Company">
        <div className="banner-error">
          <Icon name="bell" size={16} />
          You need to be signed in as a company.{" "}
          <Link to="/company/login" style={{ color: "inherit", textDecoration: "underline" }}>
            Sign in
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Edit profile"
      subtitle="Update your basic info and per-category pricing."
      role="Company"
      actions={
        <button className="btn btn-secondary btn-sm" onClick={() => navigate("/company/dashboard")}>
          <span aria-hidden="true">←</span> Back to dashboard
        </button>
      }
    >
      {notice && (
        <div className="banner-success">
          <Icon name="check" size={16} />
          {notice}
        </div>
      )}
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
          <ProfileForm
            initial={company}
            onSaved={handleProfileSaved}
            onNotice={showNotice}
            submitting={profileSubmitting}
            setSubmitting={setProfileSubmitting}
          />
          <PricingForm companyId={companyId} onNotice={showNotice} />
        </Reveal>
      )}
    </DashboardLayout>
  );
}

export default CompanyProfileEdit;
