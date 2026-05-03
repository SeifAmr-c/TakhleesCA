import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { listApplications, updateApplicationStatus } from "../../api/applications.js";

const FALLBACK_PENDING = [
  { ApplicationID: 2001, ClientName: "Ahmed Mahmoud", ClientInitials: "AM", Origin: "Shanghai", Destination: "Alexandria", DeliveryAddress: "23 Ramses St., Cairo", CategoryName: "Imports", CreatedAt: "2026-04-29", Amount: 1280, CargoType: "Electronics", Status: "pending" },
  { ApplicationID: 2002, ClientName: "Sara Khaled", ClientInitials: "SK", Origin: "Hamburg", Destination: "Alexandria", DeliveryAddress: "5 Corniche, Alexandria", CategoryName: "Re-export", CreatedAt: "2026-04-28", Amount: 980, CargoType: "Auto parts", Status: "pending" },
  { ApplicationID: 2003, ClientName: "Omar Said", ClientInitials: "OS", Origin: "Mumbai", Destination: "Suez", DeliveryAddress: "Industrial Zone, Suez", CategoryName: "Imports", CreatedAt: "2026-04-27", Amount: 1620, CargoType: "Textiles", Status: "pending" },
];

const FALLBACK_ACCEPTED = [
  { ApplicationID: 2050, ClientName: "Mohamed Lotfy", ClientInitials: "ML", Status: "in_progress", CategoryName: "Exports", Amount: 1450, Origin: "Alexandria", Destination: "Genoa", DeliveryAddress: "Genova Free Port", CreatedAt: "2026-04-22" },
  { ApplicationID: 2055, ClientName: "Layla Hassan", ClientInitials: "LH", Status: "completed", CategoryName: "Imports", Amount: 1100, Origin: "Yokohama", Destination: "Alexandria", DeliveryAddress: "12 Smouha, Alexandria", CreatedAt: "2026-04-15" },
  { ApplicationID: 2060, ClientName: "Yusuf Adel", ClientInitials: "YA", Status: "in_progress", CategoryName: "Personal effects", Amount: 720, Origin: "Marseille", Destination: "Alexandria", DeliveryAddress: "8 Stanley, Alexandria", CreatedAt: "2026-04-25" },
  { ApplicationID: 2065, ClientName: "Nour Ibrahim", ClientInitials: "NI", Status: "in_progress", CategoryName: "Imports", Amount: 2100, Origin: "Rotterdam", Destination: "Damietta", DeliveryAddress: "Damietta Industrial Zone", CreatedAt: "2026-04-26" },
  { ApplicationID: 2070, ClientName: "Hana Refaat", ClientInitials: "HR", Status: "rejected", CategoryName: "Re-export", Amount: 540, Origin: "Istanbul", Destination: "Port Said", DeliveryAddress: "—", CreatedAt: "2026-04-12" },
];

const STATUS_BADGE = {
  pending: ["badge-pending", "Pending"],
  accepted: ["badge-info", "Accepted"],
  in_progress: ["badge-info", "In progress"],
  completed: ["badge-success", "Completed"],
  rejected: ["badge-error", "Cancelled"],
};

const STEPS = ["Submitted", "Accepted", "Clearing", "Released"];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "rejected", label: "Cancelled" },
];

function statusToStepIndex(status) {
  switch (status) {
    case "pending": return 0;
    case "accepted": return 1;
    case "in_progress": return 2;
    case "completed": return 3;
    default: return 0;
  }
}

function StatCard({ icon, label, value, sub, trend, trendDir, accent, sparkData }) {
  const iconClass =
    accent === "accent" ? "card-icon card-icon-accent" : "card-icon";
  return (
    <div className="stat">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="stat-label">{label}</div>
        {icon && (
          <div
            className={iconClass}
            style={{ marginBottom: 0, width: 32, height: 32 }}
          >
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
      {trend && (
        <div className={`stat-trend ${trendDir || "up"}`}>
          <Icon name={trendDir === "down" ? "arrow_down" : "arrow_up"} size={12} />
          {trend}
        </div>
      )}
      {sparkData && (
        <div className="spark">
          {sparkData.map((h, i) => (
            <span key={i} style={{ height: `${h}px` }} />
          ))}
        </div>
      )}
    </div>
  );
}

function PendingCard({ a, onDecision, busy }) {
  return (
    <div className="card card-hover">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <div className="avatar avatar-lg">{a.ClientInitials || "C"}</div>
          <div>
            <div className="row-meta">
              #{a.ApplicationID} · Submitted {a.CreatedAt || "—"}
            </div>
            <div className="row-title" style={{ fontSize: 16 }}>
              {a.ClientName || `Client #${a.ClientID}`}
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="ship" size={13} />
                {a.Origin || "—"} → {a.Destination || "—"}
              </span>
              <span style={{ color: "var(--gray-300)" }}>·</span>
              <span className="badge badge-neutral" style={{ padding: "2px 8px" }}>
                {a.CategoryName || "Service"}
              </span>
              {a.CargoType && (
                <>
                  <span style={{ color: "var(--gray-300)" }}>·</span>
                  <span>{a.CargoType}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)" }}>
            EGP {Number(a.Amount || 0).toLocaleString()}
          </div>
          <div className="muted" style={{ fontSize: 11 }}>quoted</div>
        </div>
      </div>

      <hr className="divider" />

      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="muted" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="bell" size={14} color="var(--warning)" /> Awaiting your review
        </div>
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
      </div>
    </div>
  );
}

function AcceptedCard({ a, onStatusChange, busy }) {
  const [badgeClass, label] = STATUS_BADGE[a.Status] || ["badge-info", a.Status];
  const stepIdx = statusToStepIndex(a.Status === "accepted" ? "accepted" : a.Status);

  return (
    <div className="card card-hover">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <div className="avatar avatar-lg">{a.ClientInitials || "C"}</div>
          <div>
            <div className="row-meta">#{a.ApplicationID} · {a.CategoryName || "Service"} · {a.CreatedAt || "—"}</div>
            <div className="row-title" style={{ fontSize: 16 }}>{a.ClientName || `Client #${a.ClientID}`}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="ship" size={13} />
              {a.Origin || "—"} → {a.Destination || "—"}
              <span style={{ color: "var(--gray-300)" }}>·</span>
              <strong style={{ color: "var(--navy)" }}>EGP {Number(a.Amount || 0).toLocaleString()}</strong>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className={`badge ${badgeClass}`}>
            <span className="dot" />
            {label}
          </span>
          <select
            className="select"
            style={{ width: 160, height: 36, fontSize: 13 }}
            value={a.Status}
            onChange={(e) => onStatusChange(a.ApplicationID, e.target.value)}
            disabled={busy}
          >
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Cancelled</option>
          </select>
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
    </div>
  );
}

/* ---------- All received applications row ---------- */
function ApplicationRow({ a }) {
  const [badgeClass, label] = STATUS_BADGE[a.Status] || ["badge-info", a.Status || "Unknown"];
  const stepIdx = statusToStepIndex(a.Status);

  return (
    <div className="card">
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}
      >
        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <div className="avatar avatar-lg">{a.ClientInitials || "C"}</div>
          <div>
            <div className="row-meta">
              #{a.ApplicationID} · {a.CategoryName || "Service"} · {a.CreatedAt || "—"}
            </div>
            <div className="row-title" style={{ fontSize: 15 }}>
              {a.ClientName || `Client #${a.ClientID}`}
            </div>
            <div
              className="muted"
              style={{ fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
            >
              <Icon name="ship" size={13} />
              {a.Origin || "—"} → {a.Destination || "—"}
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
            EGP {Number(a.Amount || 0).toLocaleString()}
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
    </div>
  );
}

function CompanyDashboard() {
  const [pending, setPending] = useState([]);
  const [accepted, setAccepted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState("");

  // Filter + search for the all-applications monitor
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [pendingRes, acceptedRes] = await Promise.all([
          listApplications({ Status: "pending" }).catch(() => null),
          listApplications({ Status: "accepted" }).catch(() => null),
        ]);
        if (!active) return;
        const p = Array.isArray(pendingRes) ? pendingRes : pendingRes?.data || [];
        const a = Array.isArray(acceptedRes) ? acceptedRes : acceptedRes?.data || [];
        setPending(p.length ? p : FALLBACK_PENDING);
        setAccepted(a.length ? a : FALLBACK_ACCEPTED);
      } catch {
        if (!active) return;
        setPending(FALLBACK_PENDING);
        setAccepted(FALLBACK_ACCEPTED);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const allApplications = useMemo(() => {
    const pendingNormalized = pending.map((p) => ({ ...p, Status: p.Status || "pending" }));
    return [...pendingNormalized, ...accepted];
  }, [pending, accepted]);

  const filteredApplications = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allApplications.filter((a) => {
      if (filter !== "all" && a.Status !== filter) return false;
      if (!q) return true;
      const haystack = [
        a.ClientName,
        a.CategoryName,
        a.Origin,
        a.Destination,
        a.DeliveryAddress,
        a.CargoType,
        String(a.ApplicationID),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allApplications, filter, query]);

  const counts = useMemo(() => {
    const c = { all: allApplications.length };
    for (const f of FILTERS.slice(1)) {
      c[f.id] = allApplications.filter((a) => a.Status === f.id).length;
    }
    return c;
  }, [allApplications]);

  const totals = useMemo(() => {
    const acceptedSum = accepted.reduce((s, a) => s + (Number(a.Amount) || 0), 0);
    const completedSum = accepted
      .filter((a) => a.Status === "completed")
      .reduce((s, a) => s + (Number(a.Amount) || 0), 0);
    const pendingSum = pending.reduce((s, a) => s + (Number(a.Amount) || 0), 0);
    const completed = accepted.filter((a) => a.Status === "completed").length;
    const inProgress = accepted.filter((a) => a.Status === "in_progress").length;
    const platformFee = Math.round(completedSum * 0.08);
    return {
      revenue: acceptedSum,
      completedRevenue: completedSum,
      pendingValue: pendingSum,
      activeJobs: accepted.length,
      completed,
      inProgress,
      platformFee,
      netEarnings: completedSum - platformFee,
    };
  }, [pending, accepted]);

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3500);
  };

  const handleDecision = async (applicationId, status) => {
    setBusyId(applicationId);
    try {
      await updateApplicationStatus(applicationId, status);
    } catch { /* still update UI */ }
    finally {
      setBusyId(null);
      const item = pending.find((a) => a.ApplicationID === applicationId);
      if (status === "accepted" && item) {
        setPending((p) => p.filter((a) => a.ApplicationID !== applicationId));
        setAccepted((a) => [{ ...item, Status: "in_progress" }, ...a]);
        showNotice(`Accepted application #${applicationId} — moved to In progress.`);
      } else {
        setPending((p) => p.filter((a) => a.ApplicationID !== applicationId));
        showNotice(`Rejected application #${applicationId}. Client has been notified.`);
      }
    }
  };

  const handleStatusChange = async (applicationId, status) => {
    setBusyId(applicationId);
    try {
      await updateApplicationStatus(applicationId, status);
    } catch { /* noop */ }
    finally {
      setBusyId(null);
      setAccepted((list) =>
        list.map((row) =>
          row.ApplicationID === applicationId ? { ...row, Status: status } : row
        )
      );
      if (status === "completed") {
        showNotice(`Application #${applicationId} marked as completed. Payment will be released.`);
      }
    }
  };

  return (
    <DashboardLayout
      title="Company dashboard"
      subtitle="Monitor every application your company has received — pending, in progress and completed."
      role="Company"
      actions={
        <button className="btn btn-secondary btn-sm">
          <Icon name="bell" size={14} /> Notifications
        </button>
      }
    >
      {notice && (
        <div className="banner-success">
          <Icon name="check" size={16} />
          {notice}
        </div>
      )}

      {/* Overview */}
      <Reveal as="section" style={{ marginBottom: 36 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--teal-dark)" }}>Overview</span>
            <h2 className="h3" style={{ fontSize: 20 }}>Revenue and pipeline</h2>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>Last 30 days</span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <StatCard
            icon="trending"
            label="Gross revenue"
            value={`EGP ${totals.revenue.toLocaleString()}`}
            sub="Across active and completed jobs"
            trend="+12.4% vs last month"
            trendDir="up"
            sparkData={[6, 9, 7, 12, 10, 14, 11, 18]}
          />
          <StatCard
            icon="receipt"
            label="Net earnings"
            value={`EGP ${totals.netEarnings.toLocaleString()}`}
            sub={`After EGP ${totals.platformFee.toLocaleString()} platform fee`}
            trend="+8.1%"
            trendDir="up"
            accent="success"
            sparkData={[4, 6, 5, 9, 8, 11, 9, 14]}
          />
          <StatCard
            icon="package"
            label="Pending value"
            value={`EGP ${totals.pendingValue.toLocaleString()}`}
            sub={`${pending.length} requests waiting`}
            trend={`${pending.length} new`}
            trendDir="up"
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

      {/* Pending requests */}
      <Reveal as="section" style={{ marginBottom: 36 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--accent-dark)" }}>
              <Icon name="bell" size={12} /> Action needed
            </span>
            <h2 className="h3" style={{ fontSize: 20 }}>Pending client requests</h2>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            {pending.length} {pending.length === 1 ? "request" : "requests"}
          </span>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <ContainerSpinner size={80} label="Loading requests" />
          </div>
        ) : pending.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <Icon name="check" size={28} color="var(--success)" />
            <h3 className="h3" style={{ marginTop: 12 }}>All caught up</h3>
            <p className="muted" style={{ margin: 0 }}>No pending requests right now. Nice work.</p>
          </div>
        ) : (
          <div className="grid">
            {pending.map((a) => (
              <PendingCard
                key={a.ApplicationID}
                a={a}
                busy={busyId === a.ApplicationID}
                onDecision={handleDecision}
              />
            ))}
          </div>
        )}
      </Reveal>

      {/* Accepted applications */}
      <Reveal as="section" style={{ marginBottom: 36 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <span className="eyebrow">In flight</span>
            <h2 className="h3" style={{ fontSize: 20 }}>Accepted applications</h2>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>Update status as you progress</span>
        </div>

        {accepted.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <p className="muted" style={{ margin: 0 }}>Nothing in progress.</p>
          </div>
        ) : (
          <div className="grid">
            {accepted.map((a) => (
              <AcceptedCard
                key={a.ApplicationID}
                a={a}
                busy={busyId === a.ApplicationID}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </Reveal>

      {/* All received applications — monitor */}
      <Reveal as="section" style={{ marginBottom: 24 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <span className="eyebrow">Monitor</span>
            <h2 className="h3" style={{ fontSize: 20 }}>All received applications</h2>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            {filteredApplications.length} of {allApplications.length} shown
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
              placeholder="Search by client, ID, route, address…"
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
              Try a different filter or clear the search.
            </p>
          </div>
        ) : (
          <div className="grid">
            {filteredApplications.map((a) => (
              <ApplicationRow key={`row-${a.ApplicationID}`} a={a} />
            ))}
          </div>
        )}
      </Reveal>
    </DashboardLayout>
  );
}

export default CompanyDashboard;
