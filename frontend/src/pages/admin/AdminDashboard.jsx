import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import DocViewer from "../../components/DocViewer.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import {
  onlineUsers,
  listUsers,
  getAdminStats,
  getPendingCompanies,
  getVerifiedCompanies,
  verifyCompany,
  rejectCompany,
  getPendingTickets,
  getResolvedTickets,
  resolveTicket,
  exportAdminReport,
} from "../../api/admin.js";
import { updateCompanyCommission } from "../../api/companies.js";

const EMPTY_ANALYTICS = {
  totalRequests: 0,
  websiteRevenue: 0,
  transactions: 0,
  onlineUsers: 0,
};

/* Primary management tabs and the legal sub-tab for each. Keeping this as
   a data table (rather than nested switches in JSX) makes the hash
   parser, sub-tab guard, and pill rendering all share one source of
   truth. */
const TABS = ["companies", "support", "users"];
const SUBS = {
  companies: ["pending", "verified"],
  support:   ["pending", "resolved"],
  users:     ["all", "commissions"],
};
const DEFAULT_SUB = { companies: "pending", support: "pending", users: "all" };

/* Legacy hash → new tab id. Old links (`#companies-section`,
   `#support-section`) keep working after the restructure. */
const HASH_ALIASES = {
  "companies-section": "companies",
  "support-section": "support",
  "commissions": "users/commissions",
};

const initials2 = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const fullName = (first, last) =>
  [first, last].filter(Boolean).join(" ").trim();

const formatDate = (input) => {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
};

const parsePct = (raw) => {
  if (raw === "" || raw === null || raw === undefined) return NaN;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
};

function StatCard({ icon, label, value, sub, accent }) {
  const iconClass =
    accent === "accent" ? "card-icon card-icon-accent" : "card-icon";
  return (
    <div className="stat">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="stat-label">{label}</div>
        {icon && (
          <div className={iconClass} style={{ marginBottom: 0, width: 32, height: 32 }}>
            <Icon name={icon} size={16} />
          </div>
        )}
      </div>
      <div
        className="stat-value mono tabular"
        style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, marginTop: 4, color: "var(--ink-faint)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function PendingCompanyCard({ company, onAccept, onReject, busy }) {
  const [viewerUrl, setViewerUrl] = React.useState(null);

  return (
    <div className="card card-hover">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <div className="avatar avatar-lg">{initials2(company.Name)}</div>
          <div>
            <div className="row" style={{ marginBottom: 4 }}>
              <span className="badge badge-pending">
                <span className="dot" /> Pending review
              </span>
            </div>
            <div className="row-title" style={{ fontSize: 16 }}>{company.Name}</div>
            <div
              className="muted"
              style={{ fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="email" size={12} /> {company.ContactEmail || "—"}
              </span>
              {company.Governorate && (
                <>
                  <span style={{ color: "var(--gray-300)" }}>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name="pin" size={12} /> {company.Governorate}
                  </span>
                </>
              )}
              {company.TaxNumber && (
                <>
                  <span style={{ color: "var(--gray-300)" }}>·</span>
                  <span>Tax #{company.TaxNumber}</span>
                </>
              )}
            </div>
            {company.About && (
              <p
                className="muted"
                style={{ fontSize: 13, margin: "8px 0 0", lineHeight: 1.5, maxWidth: 480 }}
              >
                {company.About}
              </p>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="row-meta">Submitted</div>
          <div style={{ fontSize: 13, color: "var(--gray-700)", fontWeight: 500 }}>
            {formatDate(company.RegistrationDate)}
          </div>
        </div>
      </div>

      <hr className="divider" />

      {viewerUrl && (
        <DocViewer url={viewerUrl} title="Commercial Registration" onClose={() => setViewerUrl(null)} />
      )}

      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="row" style={{ gap: 6 }}>
          {company.ComReg ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setViewerUrl(`/${company.ComReg}`)}
            >
              <Icon name="doc" size={14} /> View registration doc
            </button>
          ) : (
            <span className="btn btn-ghost btn-sm" style={{ opacity: 0.4, cursor: "default" }}>
              <Icon name="doc" size={14} /> No document uploaded
            </span>
          )}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() => onReject(company)}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "1px solid #dc2626",
              boxShadow: busy ? "none" : "0 1px 2px rgba(220, 38, 38, 0.35)",
            }}
          >
            <Icon name="logout" size={14} /> Reject
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => onAccept(company.CompanyID)}
          >
            {busy ? (
              <ContainerSpinner inline size={14} label="Working…" />
            ) : (
              <><Icon name="check" size={14} /> Accept</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function VerifiedCompanyRow({ company }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 20px",
      }}
    >
      <div className="avatar">{initials2(company.Name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>
          {company.Name}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span>{company.ContactEmail || "—"}</span>
          {company.Governorate && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>{company.Governorate}</span></>)}
          {company.TaxNumber && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>Tax #{company.TaxNumber}</span></>)}
        </div>
      </div>
      <div style={{ width: 110, display: "flex", justifyContent: "flex-start", flexShrink: 0 }}>
        <span className="badge badge-success">
          <span className="dot" /> Verified
        </span>
      </div>
      <div style={{ width: 140, textAlign: "right", fontSize: 12, color: "var(--ink-faint)", flexShrink: 0 }}>
        Joined {formatDate(company.RegistrationDate)}
      </div>
    </div>
  );
}

function PendingTicketRow({ ticket, onResolve, busy, isLast }) {
  const clientName = fullName(ticket.ClientFirstName, ticket.ClientLastName) || `Client #${ticket.ClientID}`;
  return (
    <li
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: "18px 20px",
        borderBottom: isLast ? "none" : "1px solid var(--gray-100)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: "grid",
          placeItems: "center",
          background: "var(--gray-50)",
          color: "var(--accent-dark)",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <Icon name="bell" size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ink-faint)" }}>
            Ticket #{ticket.TicketID} · <strong style={{ color: "var(--navy)" }}>{clientName}</strong>
            {ticket.ClientEmail ? ` · ${ticket.ClientEmail}` : ""}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: "var(--gray-800)", lineHeight: 1.5 }}>
          {ticket.Issue}
        </p>
      </div>
      <button
        className="btn btn-primary btn-sm"
        style={{ flexShrink: 0 }}
        disabled={busy}
        onClick={() => onResolve(ticket.TicketID)}
      >
        {busy ? (
          <ContainerSpinner inline size={14} label="Resolving…" />
        ) : (
          <><Icon name="check" size={14} /> Resolve</>
        )}
      </button>
    </li>
  );
}

function ResolvedTicketRow({ ticket, isLast }) {
  const clientName = fullName(ticket.ClientFirstName, ticket.ClientLastName) || `Client #${ticket.ClientID}`;
  const adminName = fullName(ticket.AdminFirstName, ticket.AdminLastName);
  return (
    <li
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: "18px 20px",
        borderBottom: isLast ? "none" : "1px solid var(--gray-100)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: "grid",
          placeItems: "center",
          background: "var(--gray-50)",
          color: "var(--success)",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <Icon name="check" size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ink-faint)" }}>
            Ticket #{ticket.TicketID} · <strong style={{ color: "var(--navy)" }}>{clientName}</strong>
          </span>
          <span className="badge badge-success" style={{ flexShrink: 0 }}>
            <span className="dot" /> Resolved
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: "var(--gray-800)", lineHeight: 1.5 }}>
          {ticket.Issue}
        </p>
        {adminName && (
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Resolved by <strong style={{ color: "var(--navy)" }}>{adminName}</strong>
          </div>
        )}
      </div>
    </li>
  );
}

function UserRow({ user }) {
  const name = fullName(user.FirstName, user.LastName) || `User #${user.UserID}`;
  const isAdmin = user.Type === "A";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" }}>
      <div className="avatar">{initials2(name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>{name}</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span>{user.Email || "—"}</span>
          {user.PhoneNumber && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>{user.PhoneNumber}</span></>)}
        </div>
      </div>
      <div style={{ width: 110, display: "flex", justifyContent: "flex-start", flexShrink: 0 }}>
        <span className={isAdmin ? "badge badge-success" : "badge"} style={{ background: isAdmin ? undefined : "var(--gray-50)", color: isAdmin ? undefined : "var(--ink-soft)" }}>
          <span className="dot" /> {isAdmin ? "Admin" : "Client"}
        </span>
      </div>
      <div style={{ width: 140, textAlign: "right", fontSize: 12, color: "var(--ink-faint)", flexShrink: 0 }}>
        ID #{user.UserID}
      </div>
    </div>
  );
}

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
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>
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
          onChange={(e) => { setDraft(e.target.value); setTouched(true); }}
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
        >%</span>
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
    </div>
  );
}

/* Reusable section header (eyebrow + title + count) styled like the
   original "Pending companies" header — used by every sub-section so
   they all read as one consistent layout. */
function SectionHeader({ eyebrow, eyebrowAccent, eyebrowIcon, title, count }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
      <div>
        <span className="eyebrow" style={eyebrowAccent ? { color: "var(--accent-dark)" } : undefined}>
          {eyebrowIcon && <Icon name={eyebrowIcon} size={12} />} {eyebrow}
        </span>
        <h2 className="h3" style={{ fontSize: 20 }}>{title}</h2>
      </div>
      {count != null && <span className="muted" style={{ fontSize: 13 }}>{count}</span>}
    </div>
  );
}

/* Pill toggle used for sub-tabs (Pending / Verified, etc.). Keeps the
   markup compact and centralizes the visual treatment so the three
   sub-tab strips stay visually identical. */
function PillTabs({ tabs, active, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 4,
        background: "var(--gray-50)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        marginBottom: 18,
      }}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            style={{
              border: "none",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: isActive ? "#fff" : "transparent",
              color: isActive ? "var(--navy)" : "var(--ink-soft)",
              boxShadow: isActive ? "0 1px 2px rgba(15, 23, 42, 0.08)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {t.label}
            {t.count != null && (
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  background: isActive ? "var(--gray-100)" : "transparent",
                  color: isActive ? "var(--ink)" : "var(--ink-faint)",
                  padding: "1px 6px",
                  borderRadius: 999,
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SearchFilter({ value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 16, maxWidth: 360, position: "relative" }}>
      <Icon
        name="search"
        size={14}
        style={{ position: "absolute", left: 12, top: 12, color: "var(--ink-faint)" }}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          width: "100%",
          height: 38,
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "0 12px 0 34px",
          fontSize: 14,
          background: "var(--surface, #fff)",
          outline: "none",
        }}
      />
    </div>
  );
}

function AdminDashboard() {
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [verifiedCompanies, setVerifiedCompanies] = useState([]);
  const [pendingTickets, setPendingTickets] = useState([]);
  const [resolvedTickets, setResolvedTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [companyBusyId, setCompanyBusyId] = useState(null);
  const [ticketBusyId, setTicketBusyId] = useState(null);
  const [commBusyId, setCommBusyId] = useState(null);
  const [commSavedAt, setCommSavedAt] = useState({});
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [verifiedExpanded, setVerifiedExpanded] = useState(false);
  const VERIFIED_COLLAPSED_COUNT = 5;
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectBusy, setRejectBusy] = useState(false);
  const [tab, setTab] = useState("companies");
  const [sub, setSub] = useState(DEFAULT_SUB.companies);
  const [filter, setFilter] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  /* Sync tab/sub from the URL hash so the top nav can deep-link
     (#users/commissions, #support, etc.) and legacy hashes still resolve. */
  useEffect(() => {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return;
    const resolved = HASH_ALIASES[raw] ?? raw;
    const [t, s] = resolved.split("/");
    if (!TABS.includes(t)) return;
    setTab(t);
    if (s && SUBS[t].includes(s)) setSub(s);
    else setSub(DEFAULT_SUB[t]);
    const target = document.getElementById("management");
    if (target && !loading) target.scrollIntoView({ behavior: "smooth" });
  }, [location.hash, loading]);

  /* Tab change resets sub to the default for that tab — keeps the user
     from landing on a stale sub when bouncing between tabs. */
  const onTabChange = (next) => {
    setTab(next);
    setSub(DEFAULT_SUB[next]);
    setFilter("");
    navigate(`#${next}`, { replace: false });
  };

  const onSubChange = (next) => {
    setSub(next);
    setFilter("");
    navigate(`#${tab}/${next}`, { replace: false });
  };

  const refreshCompanies = async () => {
    const [pendingRes, verifiedRes] = await Promise.all([
      getPendingCompanies().catch((err) => {
        console.error("getPendingCompanies failed:", err?.response?.status, err?.response?.data || err);
        return null;
      }),
      getVerifiedCompanies().catch((err) => {
        console.error("getVerifiedCompanies failed:", err?.response?.status, err?.response?.data || err);
        return null;
      }),
    ]);
    setPendingCompanies(Array.isArray(pendingRes?.data) ? pendingRes.data : []);
    setVerifiedCompanies(Array.isArray(verifiedRes?.data) ? verifiedRes.data : []);
  };

  const refreshTickets = async () => {
    const [pendingRes, resolvedRes] = await Promise.all([
      getPendingTickets().catch(() => null),
      getResolvedTickets().catch(() => null),
    ]);
    setPendingTickets(Array.isArray(pendingRes?.data) ? pendingRes.data : []);
    setResolvedTickets(Array.isArray(resolvedRes?.data) ? resolvedRes.data : []);
  };

  const refreshUsers = async () => {
    try {
      const data = await listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("listUsers failed:", err?.response?.status, err?.response?.data || err);
      setUsers([]);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [, , , statsRes, onlineRes] = await Promise.all([
          refreshCompanies(),
          refreshTickets(),
          refreshUsers(),
          getAdminStats().catch((err) => {
            console.error("getAdminStats failed:", err?.response?.status, err?.response?.data || err);
            return null;
          }),
          onlineUsers().catch(() => null),
        ]);
        if (!active) return;

        const stats = statsRes?.data || {};
        const online = onlineRes?.count ?? onlineRes?.users?.length ?? 0;
        setAnalytics({
          totalRequests: Number(stats.TotalRequests) || 0,
          websiteRevenue: Number(stats.TotalWebsiteRevenue) || 0,
          transactions: Number(stats.TotalTransactions) || 0,
          onlineUsers: online,
        });
      } catch {
        if (!active) return;
        setLoadError("Couldn't load dashboard data. Please refresh.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3500);
  };

  const handleAccept = async (companyId) => {
    setCompanyBusyId(companyId);
    try {
      await verifyCompany(companyId, { status: "Verified" });
      await refreshCompanies();
      showNotice("Company verified — they're now live on the marketplace.");
    } catch {
      showNotice("Couldn't verify the company. Please try again.");
    } finally {
      setCompanyBusyId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setRejectBusy(true);
    setCompanyBusyId(rejectTarget.CompanyID);
    try {
      await rejectCompany(rejectTarget.CompanyID);
      await refreshCompanies();
      showNotice(`${rejectTarget.Name} rejected and removed.`);
      setRejectTarget(null);
    } catch {
      showNotice("Couldn't reject the company. Please try again.");
    } finally {
      setRejectBusy(false);
      setCompanyBusyId(null);
    }
  };

  const handleSaveCommission = async (companyId, comm) => {
    setCommBusyId(companyId);
    try {
      const res = await updateCompanyCommission(companyId, comm);
      const newComm = Number(res?.data?.Comm ?? comm);
      setVerifiedCompanies((rows) =>
        rows.map((c) => (c.CompanyID === companyId ? { ...c, Comm: newComm } : c))
      );
      setCommSavedAt((s) => ({ ...s, [companyId]: Date.now() }));
      showNotice(`Commission updated to ${newComm}%.`);
    } catch (err) {
      const msg = err?.response?.data?.message || "Couldn't update the commission. Please try again.";
      showNotice(msg);
    } finally {
      setCommBusyId(null);
    }
  };

  const handleExportReport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await exportAdminReport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Takhlees_Executive_Report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotice("Executive report downloaded.");
    } catch (err) {
      console.error("Export failed:", err);
      showNotice("Couldn't generate the report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleResolve = async (ticketId) => {
    setTicketBusyId(ticketId);
    try {
      await resolveTicket(ticketId);
      await refreshTickets();
      showNotice("Ticket marked as resolved.");
    } catch {
      showNotice("Couldn't resolve the ticket. Please try again.");
    } finally {
      setTicketBusyId(null);
    }
  };

  const conversionRate = useMemo(() => {
    const ratio = analytics.totalRequests
      ? (analytics.transactions / analytics.totalRequests) * 100
      : 0;
    return ratio.toFixed(1);
  }, [analytics]);

  /* Filtered lists derived from the search query. Each sub-section
     searches the columns that are visible on its row, so the placeholder
     text matches what's actually being matched. */
  const q = filter.trim().toLowerCase();
  const filteredPendingCompanies = useMemo(() => !q ? pendingCompanies : pendingCompanies.filter(c =>
    String(c.Name||"").toLowerCase().includes(q) ||
    String(c.ContactEmail||"").toLowerCase().includes(q) ||
    String(c.Governorate||"").toLowerCase().includes(q)
  ), [pendingCompanies, q]);
  const filteredVerifiedCompanies = useMemo(() => !q ? verifiedCompanies : verifiedCompanies.filter(c =>
    String(c.Name||"").toLowerCase().includes(q) ||
    String(c.ContactEmail||"").toLowerCase().includes(q) ||
    String(c.Governorate||"").toLowerCase().includes(q)
  ), [verifiedCompanies, q]);
  const filteredPendingTickets = useMemo(() => !q ? pendingTickets : pendingTickets.filter(t =>
    String(t.Issue||"").toLowerCase().includes(q) ||
    fullName(t.ClientFirstName, t.ClientLastName).toLowerCase().includes(q) ||
    String(t.ClientEmail||"").toLowerCase().includes(q) ||
    String(t.TicketID).includes(q)
  ), [pendingTickets, q]);
  const filteredResolvedTickets = useMemo(() => !q ? resolvedTickets : resolvedTickets.filter(t =>
    String(t.Issue||"").toLowerCase().includes(q) ||
    fullName(t.ClientFirstName, t.ClientLastName).toLowerCase().includes(q) ||
    String(t.TicketID).includes(q)
  ), [resolvedTickets, q]);
  const filteredUsers = useMemo(() => !q ? users : users.filter(u =>
    fullName(u.FirstName, u.LastName).toLowerCase().includes(q) ||
    String(u.Email||"").toLowerCase().includes(q) ||
    String(u.PhoneNumber||"").toLowerCase().includes(q) ||
    String(u.UserID).includes(q)
  ), [users, q]);
  const filteredCommissionCompanies = useMemo(() => !q ? verifiedCompanies : verifiedCompanies.filter(c =>
    String(c.Name||"").toLowerCase().includes(q) ||
    String(c.ContactEmail||"").toLowerCase().includes(q)
  ), [verifiedCompanies, q]);

  const primaryTabs = [
    { id: "companies", label: "Companies", icon: "building", count: pendingCompanies.length + verifiedCompanies.length },
    { id: "support",   label: "Support tickets", icon: "bell", count: pendingTickets.length + resolvedTickets.length },
    { id: "users",     label: "Users", icon: "user", count: users.length },
  ];

  const subTabs = {
    companies: [
      { id: "pending",  label: "Pending",  count: pendingCompanies.length },
      { id: "verified", label: "Verified", count: verifiedCompanies.length },
    ],
    support: [
      { id: "pending",  label: "Unresolved", count: pendingTickets.length },
      { id: "resolved", label: "Resolved",   count: resolvedTickets.length },
    ],
    users: [
      { id: "all",         label: "All users",   count: users.length },
      { id: "commissions", label: "Commissions", count: verifiedCompanies.length },
    ],
  };

  const renderCompaniesPending = () => (
    <>
      <SectionHeader
        eyebrow="Action needed"
        eyebrowAccent
        eyebrowIcon="bell"
        title="Pending companies"
        count={`${filteredPendingCompanies.length} of ${pendingCompanies.length} awaiting verification`}
      />
      <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by name, email, or governorate…" />
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={80} label="Loading verifications" />
        </div>
      ) : filteredPendingCompanies.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="check" size={28} color="var(--success)" />
          <h3 className="h3" style={{ marginTop: 12 }}>
            {pendingCompanies.length === 0 ? "The queue is clear" : "No matches"}
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            {pendingCompanies.length === 0
              ? "No companies waiting for verification."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="grid">
          {filteredPendingCompanies.map((c) => (
            <PendingCompanyCard
              key={c.CompanyID}
              company={c}
              busy={companyBusyId === c.CompanyID}
              onAccept={handleAccept}
              onReject={setRejectTarget}
            />
          ))}
        </div>
      )}
    </>
  );

  const renderCompaniesVerified = () => {
    const list = filteredVerifiedCompanies;
    const canCollapse = list.length > VERIFIED_COLLAPSED_COUNT;
    const visible = canCollapse && !verifiedExpanded ? list.slice(0, VERIFIED_COLLAPSED_COUNT) : list;
    const hiddenCount = list.length - VERIFIED_COLLAPSED_COUNT;
    return (
      <>
        <SectionHeader
          eyebrow="Roster"
          title="Verified companies"
          count={`${list.length} of ${verifiedCompanies.length} active on the marketplace`}
        />
        <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by name, email, or governorate…" />
        {loading ? null : list.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <Icon name="shield" size={28} color="var(--ink-faint)" />
            <h3 className="h3" style={{ marginTop: 12 }}>
              {verifiedCompanies.length === 0 ? "No verified companies yet" : "No matches"}
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              {verifiedCompanies.length === 0
                ? "Approve a pending company to get the marketplace started."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {visible.map((c, i) => (
                <li
                  key={c.CompanyID}
                  style={{
                    borderBottom: i === visible.length - 1 && !canCollapse ? "none" : "1px solid var(--gray-100)",
                  }}
                >
                  <VerifiedCompanyRow company={c} />
                </li>
              ))}
            </ul>
            {canCollapse && (
              <button
                type="button"
                onClick={() => setVerifiedExpanded((v) => !v)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 20px",
                  border: "none",
                  background: "var(--gray-50)",
                  color: "var(--navy)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gray-100)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--gray-50)")}
              >
                {verifiedExpanded
                  ? <>Show less <Icon name="arrow_up" size={14} /></>
                  : <>Show {hiddenCount} more {hiddenCount === 1 ? "company" : "companies"} <Icon name="arrow_down" size={14} /></>}
              </button>
            )}
          </div>
        )}
      </>
    );
  };

  const renderSupportPending = () => (
    <>
      <SectionHeader
        eyebrow="Support"
        eyebrowAccent
        eyebrowIcon="bell"
        title="Unresolved support tickets"
        count={`${filteredPendingTickets.length} of ${pendingTickets.length} unresolved`}
      />
      <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by client, email, ticket #, or issue…" />
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={80} label="Loading tickets" />
        </div>
      ) : filteredPendingTickets.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="check" size={28} color="var(--success)" />
          <h3 className="h3" style={{ marginTop: 12 }}>
            {pendingTickets.length === 0 ? "No open tickets" : "No matches"}
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            {pendingTickets.length === 0 ? "All support tickets have been resolved." : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filteredPendingTickets.map((t, i) => (
              <PendingTicketRow
                key={t.TicketID}
                ticket={t}
                busy={ticketBusyId === t.TicketID}
                onResolve={handleResolve}
                isLast={i === filteredPendingTickets.length - 1}
              />
            ))}
          </ul>
        </div>
      )}
    </>
  );

  const renderSupportResolved = () => (
    <>
      <SectionHeader
        eyebrow="Archive"
        title="Resolved support tickets"
        count={`${filteredResolvedTickets.length} of ${resolvedTickets.length} closed`}
      />
      <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by client, ticket #, or issue…" />
      {loading ? null : filteredResolvedTickets.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="package" size={28} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>
            {resolvedTickets.length === 0 ? "Nothing in the archive yet" : "No matches"}
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            {resolvedTickets.length === 0 ? "Resolved tickets will show up here." : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filteredResolvedTickets.map((t, i) => (
              <ResolvedTicketRow key={t.TicketID} ticket={t} isLast={i === filteredResolvedTickets.length - 1} />
            ))}
          </ul>
        </div>
      )}
    </>
  );

  const renderUsersAll = () => (
    <>
      <SectionHeader
        eyebrow="Directory"
        title="All users"
        count={`${filteredUsers.length} of ${users.length} registered`}
      />
      <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by name, email, phone, or user #…" />
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={80} label="Loading users" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="user" size={28} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>
            {users.length === 0 ? "No users yet" : "No matches"}
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            {users.length === 0 ? "New sign-ups will appear here." : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filteredUsers.map((u, i) => (
              <li
                key={u.UserID}
                style={{
                  borderBottom: i === filteredUsers.length - 1 ? "none" : "1px solid var(--gray-100)",
                }}
              >
                <UserRow user={u} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  const renderUsersCommissions = () => (
    <>
      <SectionHeader
        eyebrow="Revenue"
        eyebrowIcon="receipt"
        title="Per-company commissions"
        count={`${filteredCommissionCompanies.length} of ${verifiedCompanies.length} on the marketplace`}
      />
      <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by name or email…" />
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={80} label="Loading companies" />
        </div>
      ) : filteredCommissionCompanies.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="shield" size={28} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>
            {verifiedCompanies.length === 0 ? "No verified companies yet" : "No matches"}
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            {verifiedCompanies.length === 0
              ? "Verify a company to set its commission."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filteredCommissionCompanies.map((c, i) => (
              <li
                key={c.CompanyID}
                style={{
                  borderBottom: i === filteredCommissionCompanies.length - 1 ? "none" : "1px solid var(--gray-100)",
                }}
              >
                <CommissionRow
                  company={c}
                  busy={commBusyId === c.CompanyID}
                  savedAt={commSavedAt[c.CompanyID]}
                  onSave={handleSaveCommission}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  const renderContent = () => {
    if (tab === "companies") return sub === "verified" ? renderCompaniesVerified() : renderCompaniesPending();
    if (tab === "support") return sub === "resolved" ? renderSupportResolved() : renderSupportPending();
    if (tab === "users") return sub === "commissions" ? renderUsersCommissions() : renderUsersAll();
    return null;
  };

  return (
    <PublicLayout
      title="Admin dashboard"
      subtitle="Marketplace activity, verifications, and support."
      role="Admin"
      actions={
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleExportReport}
          disabled={exporting}
          title="Download a platform-wide executive PDF report"
        >
          <Icon name="doc" size={14} /> {exporting ? "Generating…" : "Export as PDF"}
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

      {/* System analytics */}
      <Reveal as="section" style={{ marginBottom: 36 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <span className="eyebrow">System analytics</span>
            <h2 className="h3" style={{ fontSize: 20 }}>Marketplace at a glance</h2>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>Live data</span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <StatCard icon="package" label="Total requests" value={analytics.totalRequests.toLocaleString()} sub="All-time applications submitted" />
          <StatCard icon="receipt" label="Website revenue" value={`EGP ${analytics.websiteRevenue.toLocaleString()}`} sub="Platform fees collected" accent="accent" />
          <StatCard icon="check" label="Transactions" value={analytics.transactions.toLocaleString()} sub={`${conversionRate}% completion rate`} />
          <StatCard icon="user" label="Online users" value={analytics.onlineUsers} sub="Live sessions right now" />
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              navigate("#companies");
              const target = document.getElementById("management");
              if (target) target.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Manage marketplace <Icon name="arrow_down" size={14} />
          </button>
        </div>
      </Reveal>

      {/* ───────────── MANAGEMENT (one consolidated section) ───────────── */}
      <Reveal as="section" id="management" style={{ marginBottom: 24, scrollMarginTop: 80 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Marketplace</span>
            <h2 className="h3" style={{ fontSize: 20 }}>Management</h2>
          </div>
        </div>

        {/* Primary tabs — Companies / Support / Users */}
        <div
          role="tablist"
          aria-label="Management sections"
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            background: "var(--gray-50)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {primaryTabs.map((t) => {
            const isActive = t.id === tab;
            return (
              <button
                key={t.id}
                id={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(t.id)}
                style={{
                  flex: "1 1 0",
                  minWidth: 140,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  border: "none",
                  padding: "12px 18px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: isActive ? "#fff" : "transparent",
                  color: isActive ? "var(--navy)" : "var(--ink-soft)",
                  boxShadow: isActive ? "0 1px 3px rgba(15, 23, 42, 0.10)" : "none",
                  transition: "background 120ms ease, color 120ms ease",
                }}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    background: isActive ? "var(--gray-100)" : "transparent",
                    color: isActive ? "var(--ink)" : "var(--ink-faint)",
                    padding: "1px 7px",
                    borderRadius: 999,
                  }}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-tabs for the active primary tab */}
        <PillTabs tabs={subTabs[tab]} active={sub} onChange={onSubChange} />

        {/* Active panel */}
        <div role="tabpanel">{renderContent()}</div>
      </Reveal>

      <ConfirmModal
        open={!!rejectTarget}
        title="Reject this company?"
        message={
          rejectTarget
            ? `“${rejectTarget.Name}” will be permanently removed from the database. This can't be undone.`
            : ""
        }
        confirmLabel="Reject & delete"
        cancelLabel="Cancel"
        variant="danger"
        busy={rejectBusy}
        onConfirm={handleRejectConfirm}
        onCancel={() => { if (!rejectBusy) setRejectTarget(null); }}
      />
    </PublicLayout>
  );
}

export default AdminDashboard;
