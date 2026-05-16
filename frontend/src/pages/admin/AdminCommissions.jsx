import React, { useEffect, useMemo, useState } from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { getVerifiedCompanies } from "../../api/admin.js";
import { updateCompanyCommission } from "../../api/companies.js";

const initials2 = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const parsePct = (raw) => {
  if (raw === "" || raw === null || raw === undefined) return NaN;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
};

function CommissionRow({ company, busy, savedAt, onSave }) {
  const initial = String(company.Comm ?? 0);
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setDraft(String(company.Comm ?? 0));
    setTouched(false);
  }, [company.Comm]);

  const pct = parsePct(draft);
  const invalid = touched && (Number.isNaN(pct) || pct < 0 || pct > 100);
  const dirty = String(draft) !== initial;
  const disabled = busy || !dirty || invalid || Number.isNaN(pct);
  const justSaved = savedAt && Date.now() - savedAt < 2200;

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 20px",
        borderBottom: "1px solid var(--gray-100)",
      }}
    >
      <div className="avatar">{initials2(company.Name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>
          {company.Name}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          {company.ContactEmail || "—"}
          <span style={{ color: "var(--gray-300)", margin: "0 6px" }}>·</span>
          Current{" "}
          <strong style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
            {Number(company.Comm ?? 0)}%
          </strong>
        </div>
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          border: `1px solid ${invalid ? "var(--signal-stop, #c33)" : "var(--line)"}`,
          borderRadius: 8,
          background: "var(--surface, #fff)",
          overflow: "hidden",
          height: 36,
        }}
      >
        <input
          type="number"
          min={0}
          max={100}
          step="0.1"
          inputMode="decimal"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setTouched(true);
          }}
          aria-label={`New commission for ${company.Name}`}
          style={{
            width: 76,
            border: 0,
            outline: "none",
            padding: "0 10px",
            height: "100%",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            textAlign: "right",
            background: "transparent",
          }}
        />
        <span
          aria-hidden
          style={{
            padding: "0 10px",
            height: "100%",
            display: "inline-flex",
            alignItems: "center",
            background: "var(--gray-50)",
            color: "var(--ink-faint)",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            borderLeft: "1px solid var(--line)",
          }}
        >
          %
        </span>
      </div>

      <button
        className="btn btn-primary btn-sm"
        disabled={disabled}
        onClick={() => onSave(company.CompanyID, pct)}
        style={{ minWidth: 88, justifyContent: "center" }}
      >
        {busy ? (
          <ContainerSpinner inline size={14} label="Saving…" />
        ) : justSaved ? (
          <><Icon name="check" size={14} /> Saved</>
        ) : (
          <>Save</>
        )}
      </button>
    </li>
  );
}

function AdminCommissions() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [savedAt, setSavedAt] = useState({});
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getVerifiedCompanies();
        if (!active) return;
        setCompanies(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        if (!active) return;
        console.error("getVerifiedCompanies failed:", err);
        setLoadError("Couldn't load verified companies. Please refresh.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 2500);
  };

  const handleSave = async (companyId, comm) => {
    setBusyId(companyId);
    try {
      const res = await updateCompanyCommission(companyId, comm);
      const newComm = Number(res?.data?.Comm ?? comm);
      setCompanies((rows) =>
        rows.map((c) => (c.CompanyID === companyId ? { ...c, Comm: newComm } : c))
      );
      setSavedAt((s) => ({ ...s, [companyId]: Date.now() }));
      showNotice(`Commission updated to ${newComm}%.`);
    } catch (err) {
      console.error("updateCompanyCommission failed:", err);
      const msg =
        err?.response?.data?.message ||
        "Couldn't update the commission. Please try again.";
      showNotice(msg);
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        String(c.Name || "").toLowerCase().includes(q) ||
        String(c.ContactEmail || "").toLowerCase().includes(q)
    );
  }, [companies, filter]);

  return (
    <PublicLayout
      title="Commission management"
      subtitle="Adjust the platform commission percentage charged to each verified company."
      role="Admin"
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

      <Reveal as="section" style={{ marginBottom: 24 }}>
        <div
          className="row"
          style={{
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 14,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="eyebrow">Verified companies</span>
            <h2 className="h3" style={{ fontSize: 20 }}>
              Per-company commission
            </h2>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            {companies.length} on the marketplace
          </span>
        </div>

        <div style={{ marginBottom: 16, maxWidth: 360 }}>
          <input
            type="search"
            placeholder="Filter by name or email…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter companies"
            style={{
              width: "100%",
              height: 38,
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "0 12px",
              fontSize: 14,
              background: "var(--surface, #fff)",
              outline: "none",
            }}
          />
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <ContainerSpinner size={80} label="Loading companies" />
          </div>
        ) : visible.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <Icon name="shield" size={28} color="var(--ink-faint)" />
            <h3 className="h3" style={{ marginTop: 12 }}>
              {companies.length === 0 ? "No verified companies yet" : "No matches"}
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              {companies.length === 0
                ? "Verify a company from the dashboard to set its commission."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {visible.map((c, i) => (
                <div
                  key={c.CompanyID}
                  style={{
                    borderBottom: i === visible.length - 1 ? "none" : undefined,
                  }}
                >
                  <CommissionRow
                    company={c}
                    busy={busyId === c.CompanyID}
                    savedAt={savedAt[c.CompanyID]}
                    onSave={handleSave}
                  />
                </div>
              ))}
            </ul>
          </div>
        )}
      </Reveal>
    </PublicLayout>
  );
}

export default AdminCommissions;
