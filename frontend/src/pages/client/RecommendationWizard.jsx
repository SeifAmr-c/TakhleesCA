import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { recommendCompanies } from "../../api/companies.js";
import { friendlyError } from "../../api/client.js";
import { useAuth } from "../../api/authState.js";

/* Alphabetical list of Egypt governorates — hard-coded so the wizard
   doesn't need a round-trip to populate the first dropdown. */
const GOVERNORATES = [
  "Alexandria", "Aswan", "Asyut", "Beheira", "Beni Suef", "Cairo",
  "Dakahlia", "Damietta", "Faiyum", "Gharbia", "Giza", "Ismailia",
  "Kafr El Sheikh", "Luxor", "Matrouh", "Minya", "Monufia", "New Valley",
  "North Sinai", "Port Said", "Qalyubia", "Qena", "Red Sea", "Sharqia",
  "Sohag", "South Sinai", "Suez",
];

/* Mirrors the Category.Type ENUM on the backend. */
const CATEGORIES = ["Electronics", "Cars", "Clothes", "Other"];

/* Pre-baked price brackets. value = the index — what we keep in form
   state — and min/max are sent to the API. */
const PRICE_RANGES = [
  { label: "Under 5,000 EGP",     min: 0,     max: 5000 },
  { label: "5,000 – 10,000 EGP",  min: 5000,  max: 10000 },
  { label: "10,000 – 12,000 EGP", min: 10000, max: 12000 },
  { label: "12,000 – 20,000 EGP", min: 12000, max: 20000 },
  { label: "20,000 – 50,000 EGP", min: 20000, max: 50000 },
  { label: "Above 50,000 EGP",    min: 50000, max: 1000000 },
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
      <span style={{ fontSize: 12, color: "var(--ink-soft)", marginLeft: 4 }} className="tabular">
        {Number(avg).toFixed(1)}
      </span>
    </div>
  );
}

function ResultCard({ row }) {
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
                <Icon name="shield" size={11} /> Verified
              </span>
            </div>
            <div className="row-title" style={{ fontSize: 16 }}>{row.Name}</div>
            <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>
              {row.Governorate || "—"} · {row.CategoryType || "—"}
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
          EGP {price.toLocaleString()}
        </span>
      </div>

      <hr className="divider" />

      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="eyebrow" style={{ color: "var(--ink-faint)" }}>Rating</span>
          {hasReviews ? (
            <StarRating avg={rating} />
          ) : (
            <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>—</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "right" }}>
          <span className="eyebrow" style={{ color: "var(--ink-faint)" }}>Fulfilled</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }} className="tabular">
            {fulfilled}
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
          No reviews yet
        </div>
      )}

      <div style={{ flex: 1 }} />

      <Link
        to={`/applications/new/${row.CompanyID}`}
        className="btn btn-primary"
        style={{ marginTop: 16, justifyContent: "center" }}
      >
        <Icon name="package" size={14} />
        Apply Now
      </Link>
    </div>
  );
}

function RecommendationWizard() {
  const auth = useAuth();
  const navigate = useNavigate();

  const isSignedInClient =
    auth?.kind === "user" && auth?.role === "client" && !!auth?.user?.UserID;

  const [governorate, setGovernorate] = useState("");
  const [category, setCategory] = useState("");
  const [rangeIdx, setRangeIdx] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null); // null = State 1, array = State 2

  const canSubmit = useMemo(
    () => !!governorate && !!category && rangeIdx !== "" && !submitting,
    [governorate, category, rangeIdx, submitting]
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const range = PRICE_RANGES[Number(rangeIdx)];
    if (!range) return;
    setSubmitting(true);
    setError("");
    try {
      const data = await recommendCompanies({
        governorate,
        category,
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
      setError(friendlyError(err, "Couldn't fetch recommendations. Please try again."));
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
        title="Find a Company"
        subtitle="Tell us what you're clearing and we'll match you with the best-fitting companies."
        role="Client"
      >
        <div className="card card-pad-lg" style={{ textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
          <Icon name="lock" size={32} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>Sign in to use the matchmaker</h3>
          <p style={{ color: "var(--ink-soft)" }}>
            The recommendation wizard is available to signed-in clients.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>Sign in</Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout
      title="Find a Company"
      subtitle="Tell us what you're clearing and we'll match you with the best-fitting companies."
      role="Client"
      actions={
        <Link to="/tracking" className="btn btn-secondary">
          <Icon name="package" size={16} /> Your shipments
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
              Smart Matchmaker
            </span>
            <h3 className="card-title">A few quick questions</h3>
            <p className="card-subtitle">
              We'll rank companies serving your governorate by fulfilled
              applications, then average rating.
            </p>

            <div className="stack" style={{ marginTop: 8 }}>
              <label className="field">
                <span className="field-label">Governorate *</span>
                <select
                  className="select"
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select a governorate…</option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Category *</span>
                <select
                  className="select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select a category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Approximate fees *</span>
                <select
                  className="select"
                  value={rangeIdx}
                  onChange={(e) => setRangeIdx(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select a price range…</option>
                  {PRICE_RANGES.map((r, i) => (
                    <option key={r.label} value={i}>{r.label}</option>
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
                  <ContainerSpinner inline size={16} label="Matching…" />
                ) : (
                  <>
                    <Icon name="ship" size={16} />
                    Find My Match
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
                {results.length} {results.length === 1 ? "match" : "matches"}
              </span>
              <h3 className="h3" style={{ marginTop: 4 }}>Your recommended companies</h3>
              <p style={{ color: "var(--ink-soft)", margin: "4px 0 0" }}>
                Ranked by fulfilled applications, then average rating.
              </p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onStartOver}>
              <Icon name="refresh" size={14} /> Start over
            </button>
          </div>

          {results.length === 0 ? (
            <div className="card card-pad-lg" style={{ textAlign: "center" }}>
              <Icon name="package" size={32} color="var(--ink-faint)" />
              <h3 className="h3" style={{ marginTop: 12 }}>No matches found</h3>
              <p style={{ color: "var(--ink-soft)" }}>
                Try a wider price range or a different governorate.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={onStartOver}
              >
                Adjust filters
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
