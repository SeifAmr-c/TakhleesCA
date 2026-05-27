import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { recommendCompanies } from "../../api/companies.js";
import { listCategories } from "../../api/companyCategories.js";
import { friendlyError } from "../../api/client.js";
import { useAuth } from "../../api/authState.js";
import { useTranslation, useLanguage } from "../../i18n";
import { GOVERNORATES } from "../../data/governorates.js";

/* Pre-baked price brackets. value = the index — what we keep in form
   state — and min/max are sent to the API. `key` resolves the display
   label via recommend.priceRanges.<key>. */
const PRICE_RANGES = [
  { key: "under5k",  min: 0,     max: 5000 },
  { key: "5to10k",   min: 5000,  max: 10000 },
  { key: "10to12k",  min: 10000, max: 12000 },
  { key: "12to20k",  min: 12000, max: 20000 },
  { key: "20to50k",  min: 20000, max: 50000 },
  { key: "above50k", min: 50000, max: 1000000 },
];

function StarRating({ avg }) {
  const filled = Math.round(Number(avg) || 0);
  return (
    <div className="row" style={{ gap: 3, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="star"
          size={13}
          color={i <= filled ? "var(--safety)" : "var(--line-strong)"}
          filled={i <= filled}
        />
      ))}
      <span style={{ fontSize: 12, color: "var(--ink-soft)", marginInlineStart: 4 }} className="tabular">
        <bdi>{Number(avg).toFixed(1)}</bdi>
      </span>
    </div>
  );
}

function ResultCard({ row }) {
  const { t } = useTranslation("client");
  const initials = (row.Name || "T")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase();
  const price = Number(row.CategoryPrice || 0);
  const fulfilled = Number(row.FulfilledCount) || 0;
  const rating = row.AverageRating;
  const hasReviews = rating !== null && rating !== undefined && Number(rating) > 0;
  const noReviews = !hasReviews && fulfilled === 0;

  return (
    <div className="card card-hover" style={{ display: "flex", flexDirection: "column" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          {row.LogoUrl ? (
            <img
              src={row.LogoUrl}
              alt={`${row.Name} logo`}
              className="avatar avatar-lg"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="avatar avatar-lg">{initials}</div>
          )}
          <div>
            <div className="row" style={{ gap: 6, marginBottom: 4 }}>
              <span className="badge badge-success">
                <Icon name="shield" size={11} /> {t("recommend.card.verified")}
              </span>
            </div>
            <div className="row-title" style={{ fontSize: 16 }}>{row.Name}</div>
            <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>
              {row.Governorate ? t(`common:governorates.${row.Governorate}`, { defaultValue: row.Governorate }) : "—"}
              {" · "}
              {row.CategoryType || "—"}
            </div>
          </div>
        </div>
        <span
          className="badge"
          style={{
            background: "var(--surface)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {t("recommend.currency")} <bdi>{price.toLocaleString()}</bdi>
        </span>
      </div>

      <hr className="divider" />

      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="eyebrow" style={{ color: "var(--ink-faint)" }}>{t("recommend.card.rating")}</span>
          {hasReviews ? (
            <StarRating avg={rating} />
          ) : (
            <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>—</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "end" }}>
          <span className="eyebrow" style={{ color: "var(--ink-faint)" }}>{t("recommend.card.fulfilled")}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }} className="tabular">
            <bdi>{fulfilled}</bdi>
          </span>
        </div>
      </div>

      {noReviews && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "var(--ink-faint)",
            fontStyle: "italic",
          }}
        >
          {t("recommend.card.noReviews")}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <Link
        to={`/applications/new/${row.CompanyID}`}
        className="btn btn-primary"
        style={{ marginTop: 16, justifyContent: "center" }}
      >
        <Icon name="package" size={14} />
        {t("recommend.card.apply")}
      </Link>
    </div>
  );
}

function RecommendationWizard() {
  const { t } = useTranslation("client");
  const { lang } = useLanguage();
  const auth = useAuth();
  const navigate = useNavigate();

  const isSignedInClient =
    auth?.kind === "user" && auth?.role === "client" && !!auth?.user?.UserID;

  const [governorate, setGovernorate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [rangeIdx, setRangeIdx] = useState("");

  /* Live catalog from /category (admin-managed). Type arrives already
     localized for the active language; re-fetch when the language flips so
     labels stay in sync. We key the picker by CategoryID (stable across
     languages) and submit the resolved Type, which the backend matches
     against either Type.en or Type.ar. */
  const [categories, setCategories] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null); // null = State 1, array = State 2

  useEffect(() => {
    let alive = true;
    listCategories()
      .then((rows) => { if (alive) setCategories(rows); })
      .catch(() => { if (alive) setCategories([]); });
    return () => { alive = false; };
  }, [lang]);

  const canSubmit = useMemo(
    () => !!governorate && !!categoryId && rangeIdx !== "" && !submitting,
    [governorate, categoryId, rangeIdx, submitting]
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const range = PRICE_RANGES[Number(rangeIdx)];
    if (!range) return;
    const selectedCat = categories.find((c) => String(c.CategoryID) === String(categoryId));
    if (!selectedCat) return;
    setSubmitting(true);
    setError("");
    try {
      const data = await recommendCompanies({
        governorate,
        category: selectedCat.Type,
        minPrice: range.min,
        maxPrice: range.max,
      });
      setResults(data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        navigate("/login", { replace: false });
        return;
      }
      setError(friendlyError(err, t("recommend.form.error")));
    } finally {
      setSubmitting(false);
    }
  };

  const onStartOver = () => {
    setResults(null);
    setError("");
  };

  if (!isSignedInClient) {
    return (
      <PublicLayout
        title={t("recommend.title")}
        subtitle={t("recommend.subtitle")}
        role="Client"
      >
        <div className="card card-pad-lg" style={{ textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
          <Icon name="lock" size={32} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>{t("recommend.signedOut.title")}</h3>
          <p style={{ color: "var(--ink-soft)" }}>
            {t("recommend.signedOut.desc")}
          </p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>{t("recommend.signedOut.signIn")}</Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout
      title={t("recommend.title")}
      subtitle={t("recommend.subtitle")}
      role="Client"
      actions={
        <Link to="/tracking" className="btn btn-secondary">
          <Icon name="package" size={16} /> {t("recommend.yourShipments")}
        </Link>
      }
    >
      {results === null ? (
        /* ---------- State 1: form ---------- */
        <Reveal as="div">
          <form
            onSubmit={onSubmit}
            className="card card-pad-lg"
            style={{ maxWidth: 560, margin: "0 auto" }}
          >
            <span className="eyebrow" style={{ color: "var(--teal-dark)" }}>
              {t("recommend.form.eyebrow")}
            </span>
            <h3 className="card-title">{t("recommend.form.title")}</h3>
            <p className="card-subtitle">
              {t("recommend.form.subtitle")}
            </p>

            <div className="stack" style={{ marginTop: 8 }}>
              <label className="field">
                <span className="field-label">{t("recommend.form.governorate")} *</span>
                <select
                  className="select"
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">{t("recommend.form.governorateSelect")}</option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>{t(`common:governorates.${g}`, { defaultValue: g })}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">{t("recommend.form.category")} *</span>
                <select
                  className="select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">{t("recommend.form.categorySelect")}</option>
                  {categories.map((c) => (
                    <option key={c.CategoryID} value={String(c.CategoryID)}>{c.Type}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">{t("recommend.form.fees")} *</span>
                <select
                  className="select"
                  value={rangeIdx}
                  onChange={(e) => setRangeIdx(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">{t("recommend.form.feesSelect")}</option>
                  {PRICE_RANGES.map((r, i) => (
                    <option key={r.key} value={i}>{t(`recommend.priceRanges.${r.key}`)}</option>
                  ))}
                </select>
              </label>

              {error && (
                <div className="banner-error">
                  <Icon name="bell" size={14} /> {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSubmit}
                style={{ justifyContent: "center", marginTop: 4 }}
              >
                {submitting ? (
                  <ContainerSpinner inline size={16} label={t("recommend.form.matching")} />
                ) : (
                  <>
                    <Icon name="ship" size={16} />
                    {t("recommend.form.submit")}
                  </>
                )}
              </button>
            </div>
          </form>
        </Reveal>
      ) : (
        /* ---------- State 2: results ---------- */
        <Reveal as="div">
          <div
            className="row"
            style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}
          >
            <div>
              <span className="eyebrow" style={{ color: "var(--teal-dark)" }}>
                {t("recommend.results.matchCount", { count: results.length })}
              </span>
              <h3 className="h3" style={{ marginTop: 4 }}>{t("recommend.results.title")}</h3>
              <p style={{ color: "var(--ink-soft)", margin: "4px 0 0" }}>
                {t("recommend.results.subtitle")}
              </p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onStartOver}>
              <Icon name="refresh" size={14} /> {t("recommend.results.startOver")}
            </button>
          </div>

          {results.length === 0 ? (
            <div className="card card-pad-lg" style={{ textAlign: "center" }}>
              <Icon name="package" size={32} color="var(--ink-faint)" />
              <h3 className="h3" style={{ marginTop: 12 }}>{t("recommend.results.emptyTitle")}</h3>
              <p style={{ color: "var(--ink-soft)" }}>
                {t("recommend.results.emptyDesc")}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={onStartOver}
              >
                {t("recommend.results.adjust")}
              </button>
            </div>
          ) : (
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
            >
              {results.map((r) => (
                <ResultCard key={r.CompanyID} row={r} />
              ))}
            </div>
          )}
        </Reveal>
      )}
    </PublicLayout>
  );
}

export default RecommendationWizard;
