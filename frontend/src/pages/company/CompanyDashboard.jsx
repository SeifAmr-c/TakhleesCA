import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import {
  listApplications,
  updateApplicationStatus,
} from "../../api/applications.js";
import { getCompanyDashboardStats } from "../../api/companies.js";
import { listApplicationDocuments } from "../../api/documents.js";
import DocViewer from "../../components/DocViewer.jsx";
import { useAuth } from "../../api/authState.js";

/* DB ENUM 'Pending' | 'In Progress' | 'Completed'  →  internal lower-case
   sentinels the dashboard uses everywhere ('pending', 'in_progress',
   'completed'). Anything unexpected is treated as 'pending'. */
const normalizeStatus = (raw) => {
  switch (String(raw || "").toLowerCase()) {
    case "pending":
      return "pending";
    case "in progress":
    case "in_progress":
    case "accepted":
      return "in_progress";
    case "completed":
      return "completed";
    default:
      return "pending";
  }
};

const STATUS_BADGE = {
  pending: ["badge-pending", "Pending"],
  in_progress: ["badge-info", "In progress"],
  completed: ["badge-success", "Completed"],
};

const STEPS = ["Submitted", "Accepted", "Clearing", "Released"];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
];

function statusToStepIndex(status) {
  switch (status) {
    case "pending": return 0;
    case "in_progress": return 2;
    case "completed": return 3;
    default: return 0;
  }
}

const initialsOf = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const formatDate = (input) => {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

/* Map a raw application row from the backend into the shape the cards render. */
const shapeApplication = (a) => ({
  ApplicationID: a.ApplicationID,
  Status: normalizeStatus(a.Status),
  ClientID: a.ClientID,
  ClientName: (a.ClientName || "").trim() || `Client #${a.ClientID}`,
  ClientInitials: initialsOf(a.ClientName),
  CategoryName: a.CategoryName || "Service",
  PortName: a.PortName || "",
  PortType: a.PortType || "",
  DeliveryAddress: a.DeliveryAddress || "",
  Amount: Number(a.Amount || 0),
  CreatedAt: formatDate(a.SubmissionDate),
  TrackingNumber: a.TrackingNumber || "",
});

function StatCard({ icon, label, value, sub, accent }) {
  const iconClass = accent === "accent" ? "card-icon card-icon-accent" : "card-icon";
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

function DocumentsDrawer({ applicationId, applicationStatus }) {
  const [open, setOpen] = React.useState(false);
  const [docs, setDocs] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [viewerUrl, setViewerUrl] = React.useState(null);
  const [viewerTitle, setViewerTitle] = React.useState("");

  const isCompleted = applicationStatus === "completed";

  const toggle = async () => {
    if (!open && docs === null) {
      setLoading(true);
      try {
        const result = await listApplicationDocuments(applicationId);
        setDocs(Array.isArray(result) ? result : []);
      } catch {
        setDocs([]);
      } finally {
        setLoading(false);
      }
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={toggle}>
        <Icon name="doc" size={14} /> {open ? "Hide documents" : "View documents"}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {loading ? (
            <ContainerSpinner inline size={14} label="Loading…" />
          ) : !docs || docs.length === 0 ? (
            <span className="muted" style={{ fontSize: 13 }}>No documents attached.</span>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {docs.map((d) => (
                <li key={d.DocumentID} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="doc" size={13} color="var(--ink-faint)" />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "2px 6px", fontSize: 13, color: "var(--brand)" }}
                    onClick={() => { setViewerUrl(`/${d.Path}`); setViewerTitle(d.DocType); }}
                  >
                    {d.DocType}
                  </button>
                  <span
                    className="muted"
                    style={{
                      fontSize: 12,
                      color: isCompleted ? "var(--success)" : undefined,
                      fontWeight: isCompleted ? 600 : undefined,
                    }}
                  >
                    · {isCompleted ? "Completed" : d.VerficationStatus}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {viewerUrl && (
        <DocViewer url={viewerUrl} title={viewerTitle} onClose={() => setViewerUrl(null)} />
      )}
    </>
  );
}

function ApplicationRow({ a, onDecision, onStatusChange, busy }) {
  const [badgeClass, label] = STATUS_BADGE[a.Status] || ["badge-info", a.Status];
  const stepIdx = statusToStepIndex(a.Status);
  const isPending = a.Status === "pending";

  return (
    <div className="card card-hover">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <div className="avatar avatar-lg">{a.ClientInitials}</div>
          <div>
            <div className="row-meta">
              #{a.ApplicationID} · {a.CategoryName} · {a.CreatedAt || "—"}
            </div>
            <div className="row-title" style={{ fontSize: 15 }}>
              {a.ClientName}
            </div>
            <div
              className="muted"
              style={{ fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
            >
              {a.PortName && (
                <>
                  <Icon name="ship" size={13} />
                  {a.PortName}{a.PortType ? ` (${a.PortType})` : ""}
                </>
              )}
              {a.DeliveryAddress && (
                <>
                  <span style={{ color: "var(--gray-300)" }}>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name="pin" size={12} />
                    {a.DeliveryAddress}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 140 }}>
          <span className={`badge ${badgeClass}`}>
            <span className="dot" />
            {label}
          </span>
          <div
            className="mono tabular"
            style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginTop: 6 }}
          >
            EGP {a.Amount.toLocaleString()}
          </div>
        </div>
      </div>

      <hr className="divider" />

      <div className="timeline">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`timeline-step ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}
          >
            <span className="dot" />
            {s}
          </div>
        ))}
      </div>

      <hr className="divider" />

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <DocumentsDrawer applicationId={a.ApplicationID} applicationStatus={a.Status} />
        {isPending ? (
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={() => onDecision(a.ApplicationID, "rejected")}
            >
              Reject
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => onDecision(a.ApplicationID, "accepted")}
            >
              <Icon name="check" size={14} /> Accept
            </button>
          </div>
        ) : (
          <select
            className="select"
            style={{ width: 160, height: 36, fontSize: 13 }}
            value={a.Status}
            onChange={(e) => onStatusChange(a.ApplicationID, e.target.value)}
            disabled={busy}
          >
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        )}
      </div>
    </div>
  );
}

/* ---------- Main page ---------- */
function CompanyDashboard() {
  const auth = useAuth();
  const companyId = auth?.kind === "company" ? auth?.company?.CompanyID : null;

  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Filter + search for the all-applications monitor
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const reloadApplications = async () => {
    console.log("FRONTEND: reloadApplications fired. auth =", auth, "companyId =", companyId);
    if (!companyId) {
      console.warn("FRONTEND: Bailing out — no companyId on session. Stats call will NOT fire.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log("FRONTEND: Attempting to fetch stats...");
      const [appsRes, statsRes] = await Promise.all([
        listApplications({ CompanyID: companyId }),
        getCompanyDashboardStats().catch((err) => {
          console.error("FRONTEND: getCompanyDashboardStats failed:", err?.response?.status, err?.response?.data || err?.message);
          return null;
        }),
      ]);
      console.log("FRONTEND: Stats response", statsRes);
      const list = Array.isArray(appsRes) ? appsRes : appsRes?.data || [];
      setApplications(list.map(shapeApplication));
      setStats(statsRes?.data ?? null);
      setErrorBanner("");
    } catch (err) {
      console.error("FRONTEND: reloadApplications threw", err);
      setErrorBanner("Couldn't load your applications. Please refresh.");
      setApplications([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const pending = useMemo(
    () => applications.filter((a) => a.Status === "pending"),
    [applications]
  );
  const accepted = useMemo(
    () => applications.filter((a) => a.Status === "in_progress" || a.Status === "completed"),
    [applications]
  );

  const filteredApplications = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) => {
      if (filter !== "all" && a.Status !== filter) return false;
      if (!q) return true;
      const haystack = [
        a.ClientName,
        a.CategoryName,
        a.PortName,
        a.DeliveryAddress,
        String(a.ApplicationID),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [applications, filter, query]);

  const counts = useMemo(() => {
    const c = { all: applications.length };
    for (const f of FILTERS.slice(1)) {
      c[f.id] = applications.filter((a) => a.Status === f.id).length;
    }
    return c;
  }, [applications]);

  /* Money KPIs (revenue, platform fee, commission, net earnings) come straight
     from GET /company/dashboard-stats so the dashboard never disagrees with
     the backend's canonical math. Pipeline counts (pending/in progress/
     completed jobs, pending value) are still derived from the application
     list since the stats endpoint doesn't expose them. */
  const totals = useMemo(() => {
    const pendingSum = pending.reduce((s, a) => s + a.Amount, 0);
    const completed = accepted.filter((a) => a.Status === "completed").length;
    const inProgress = accepted.filter((a) => a.Status === "in_progress").length;
    return {
      revenue: Number(stats?.CompletedRevenue ?? 0),
      pendingValue: pendingSum,
      activeJobs: accepted.length,
      completed,
      inProgress,
      platformFee: Number(stats?.PlatformFee ?? 0),
      commissionAmount: Number(stats?.CommissionAmount ?? 0),
      commissionRate: Number(stats?.Comm ?? 0),
      netEarnings: Number(stats?.NetEarnings ?? 0),
    };
  }, [pending, accepted, stats]);

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3500);
  };

  const handleDecision = async (applicationId, decision) => {
    setBusyId(applicationId);
    try {
      if (decision === "accepted") {
        await updateApplicationStatus(applicationId, "accepted");
        setApplications((list) =>
          list.map((a) =>
            a.ApplicationID === applicationId ? { ...a, Status: "in_progress" } : a
          )
        );
        showNotice(`Accepted application #${applicationId} — moved to In progress.`);
      } else {
        // 'Rejected' isn't a DB enum value yet; remove from view only and
        // surface a toast so the company knows persistence is pending.
        setApplications((list) => list.filter((a) => a.ApplicationID !== applicationId));
        showNotice(`Hidden application #${applicationId}. Persistent rejection isn't supported yet.`);
      }
    } catch {
      showNotice(`Couldn't update application #${applicationId}.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusChange = async (applicationId, status) => {
    setBusyId(applicationId);
    try {
      await updateApplicationStatus(applicationId, status);
      setApplications((list) =>
        list.map((a) =>
          a.ApplicationID === applicationId ? { ...a, Status: status } : a
        )
      );
      if (status === "completed") {
        showNotice(`Application #${applicationId} marked as completed. Payment will be released.`);
      }
    } catch {
      showNotice(`Couldn't update application #${applicationId}.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PublicLayout
      title="Company dashboard"
      subtitle="Monitor every application your company has received — pending, in progress and completed."
      role="Company"
      actions={
        <button className="btn btn-secondary btn-sm" onClick={reloadApplications}>
          <Icon name="bell" size={14} /> Refresh
        </button>
      }
    >
      {notice && (
        <div className="banner-success">
          <Icon name="check" size={16} />
          {notice}
        </div>
      )}
      {errorBanner && (
        <div className="banner-error">
          <Icon name="bell" size={16} />
          {errorBanner}
        </div>
      )}
      {!companyId && (
        <div className="banner-error">
          <Icon name="bell" size={16} />
          You're not signed in as a company. Sign in to see real applications and pricing.
        </div>
      )}

      {/* Overview */}
      <Reveal as="section" style={{ marginBottom: 36 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--teal-dark)" }}>Overview</span>
            <h2 className="h3" style={{ fontSize: 20 }}>Revenue and pipeline</h2>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>All-time</span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <StatCard
            icon="trending"
            label="Completed revenue"
            value={`EGP ${totals.revenue.toLocaleString()}`}
            sub={`${totals.completed} completed jobs`}
          />
          <StatCard
            icon="receipt"
            label="Net earnings"
            value={`EGP ${totals.netEarnings.toLocaleString()}`}
            sub={`After EGP ${totals.platformFee.toLocaleString()} platform fee + EGP ${totals.commissionAmount.toLocaleString()} commission (${totals.commissionRate}%)`}
            accent="success"
          />
          <StatCard
            icon="package"
            label="Pending value"
            value={`EGP ${totals.pendingValue.toLocaleString()}`}
            sub={`${pending.length} request${pending.length === 1 ? "" : "s"} waiting`}
            accent="accent"
          />
          <StatCard
            icon="check"
            label="Active jobs"
            value={totals.activeJobs}
            sub={`${totals.inProgress} in progress · ${totals.completed} completed`}
          />
        </div>
      </Reveal>

      {/* Profile & pricing CTA */}
      <Reveal as="section" style={{ marginBottom: 36 }}>
        <div
          className="card card-pad-lg"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="eyebrow" style={{ color: "var(--accent-dark)" }}>Profile & pricing</span>
            <h2 className="h3" style={{ fontSize: 20, marginTop: 4 }}>Edit profile and category prices</h2>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Update your governorate, address, contact email, about-us copy, and the price clients pay per category.
            </p>
          </div>
          <Link to="/company/profile" className="btn btn-primary btn-lg" style={{ whiteSpace: "nowrap" }}>
            Open editor <Icon name="arrow_right" size={14} />
          </Link>
        </div>
      </Reveal>

      {/* All received applications — monitor */}
      <Reveal as="section" style={{ marginBottom: 24 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <span className="eyebrow">Monitor</span>
            <h2 className="h3" style={{ fontSize: 20 }}>All received applications</h2>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            {filteredApplications.length} of {applications.length} shown
          </span>
        </div>

        {/* Filter + search bar */}
        <div
          className="card"
          style={{
            padding: 14,
            marginBottom: 16,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div className="row" style={{ gap: 6, flex: 1, minWidth: 0 }}>
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`}
                  style={{ gap: 6 }}
                >
                  {f.label}
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      opacity: 0.85,
                      padding: "1px 6px",
                      borderRadius: "var(--radius-xs)",
                      background: active
                        ? "oklch(100% 0 0 / 0.15)"
                        : "var(--steel-100)",
                      color: active ? "#fff" : "var(--ink-faint)",
                      border: active
                        ? "1px solid oklch(100% 0 0 / 0.20)"
                        : "1px solid var(--line)",
                    }}
                  >
                    {counts[f.id] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="input-with-icon"
            style={{ minWidth: 260, flex: "0 1 320px" }}
          >
            <span className="input-icon"><Icon name="search" size={16} /></span>
            <input
              className="input"
              placeholder="Search by client, ID, port, address…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <ContainerSpinner size={72} label="Loading applications" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <Icon name="package" size={28} color="var(--ink-faint)" />
            <h3 className="h3" style={{ marginTop: 12 }}>No applications match</h3>
            <p className="muted" style={{ margin: 0 }}>
              {applications.length === 0
                ? "You haven't received any applications yet."
                : "Try a different filter or clear the search."}
            </p>
          </div>
        ) : (
          <div className="grid">
            {filteredApplications.map((a) => (
              <ApplicationRow
                key={`row-${a.ApplicationID}`}
                a={a}
                busy={busyId === a.ApplicationID}
                onDecision={handleDecision}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </Reveal>
    </PublicLayout>
  );
}

export default CompanyDashboard;
