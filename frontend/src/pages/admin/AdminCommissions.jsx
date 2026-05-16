import React, { useEffect, useState } from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { getVerifiedCompanies, updateCompanyCommission } from "../../api/admin.js";

const initials2 = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

function CommissionRow({ company, onSaved, isLast }) {
  const initial = company.Comm === null || company.Comm === undefined ? "" : String(Number(company.Comm));
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const dirty = value !== initial;

  const handleSave = async () => {
    setError("");
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 99.99) {
      setError("Commission must be a number between 0 and 99.99.");
      return;
    }
    setSaving(true);
    try {
      const res = await updateCompanyCommission(company.CompanyID, n);
      const newComm = res?.data?.company?.Comm ?? n;
      onSaved(company.CompanyID, newComm);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't update commission.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 20px",
        borderBottom: isLast ? "none" : "1px solid var(--gray-100)",
      }}
    >
      <div className="avatar">{initials2(company.Name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>
          {company.Name}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          {company.ContactEmail || "—"}
          {company.TaxNumber ? ` · Tax #${company.TaxNumber}` : ""}
        </div>
        {error && (
          <div style={{ color: "var(--danger, #b91c1c)", fontSize: 12, marginTop: 6 }}>
            {error}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <input
            type="number"
            min="0"
            max="99.99"
            step="0.01"
            value={value}
            disabled={saving}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && dirty && !saving) handleSave();
            }}
            style={{
              width: 90,
              padding: "6px 22px 6px 10px",
              border: "1px solid var(--line)",
              borderRadius: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              textAlign: "right",
            }}
            aria-label={`Commission for ${company.Name}`}
          />
          <span
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 12,
              color: "var(--ink-faint)",
              pointerEvents: "none",
            }}
          >
            %
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!dirty || saving}
          onClick={handleSave}
          style={{ minWidth: 76 }}
        >
          {saving ? (
            <ContainerSpinner inline size={14} label="Saving…" />
          ) : savedFlash ? (
            <><Icon name="check" size={14} /> Saved</>
          ) : (
            "Save"
          )}
        </button>
      </div>
    </li>
  );
}

function AdminCommissions() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getVerifiedCompanies();
        if (!active) return;
        setCompanies(Array.isArray(res?.data) ? res.data : []);
      } catch {
        if (!active) return;
        setLoadError("Couldn't load verified companies. Please refresh.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleSaved = (CompanyID, newComm) => {
    setCompanies((prev) =>
      prev.map((c) => (c.CompanyID === CompanyID ? { ...c, Comm: newComm } : c))
    );
  };

  const needle = filter.trim().toLowerCase();
  const visible = needle
    ? companies.filter((c) =>
        [c.Name, c.ContactEmail, c.TaxNumber]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle))
      )
    : companies;

  return (
    <PublicLayout
      title="Commissions"
      subtitle="Set the platform commission percentage charged per company."
      role="Admin"
    >
      {loadError && (
        <div className="banner-error">
          <Icon name="bell" size={16} />
          {loadError}
        </div>
      )}

      <Reveal as="section">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <div>
            <span className="eyebrow">Commission rates</span>
            <h2 className="h3" style={{ fontSize: 20 }}>Verified companies</h2>
          </div>
          <input
            type="search"
            placeholder="Filter by name, email, tax number…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              minWidth: 260,
              fontSize: 13,
            }}
          />
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <ContainerSpinner size={80} label="Loading companies" />
          </div>
        ) : visible.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <Icon name="package" size={28} color="var(--ink-faint)" />
            <h3 className="h3" style={{ marginTop: 12 }}>
              {needle ? "No matches" : "No verified companies yet"}
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              {needle
                ? "Try clearing the filter."
                : "Verify a company on the dashboard before setting its commission."}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {visible.map((c, i) => (
                <CommissionRow
                  key={c.CompanyID}
                  company={c}
                  onSaved={handleSaved}
                  isLast={i === visible.length - 1}
                />
              ))}
            </ul>
          </div>
        )}
      </Reveal>
    </PublicLayout>
  );
}

export default AdminCommissions;
