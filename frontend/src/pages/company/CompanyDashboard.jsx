import React, { useEffect, useMemo, useState } from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import {
  listApplications,
  updateApplicationStatus,
  rejectApplication,
} from "../../api/applications.js";
import { getCompanyDashboardStats, exportCompanyReport } from "../../api/companies.js";
import { listApplicationDocuments } from "../../api/documents.js";
import { useAuth } from "../../api/authState.js";
import { useTranslation } from "../../i18n";

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

/* status sentinel → badge class (display label resolved via dashboard.status) */
const STATUS_BADGE_CLASS = {
  pending: "badge-pending",
  in_progress: "badge-info",
  completed: "badge-success",
};

/* timeline step order → translation key under dashboard.steps */
const STEP_KEYS = ["submitted", "accepted", "clearing", "released"];

/* filter ids drive the list filter + counts; labels come from dashboard.filters */
const FILTER_IDS = ["all", "pending", "in_progress", "completed"];

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
const shapeApplication = (a, t) => ({
  ApplicationID: a.ApplicationID,
  Status: normalizeStatus(a.Status),
  ClientID: a.ClientID,
  ClientName: (a.ClientName || "").trim() || t("dashboard.clientFallback", { id: a.ClientID }),
  ClientInitials: initialsOf(a.ClientName),
  CategoryName: a.CategoryName || t("dashboard.serviceFallback"),
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
  const { t } = useTranslation("company");
  const [open, setOpen] = React.useState(false);
  const [docs, setDocs] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

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
        <Icon name="doc" size={14} /> {open ? t("dashboard.docs.hide") : t("dashboard.docs.view")}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {loading ? (
            <ContainerSpinner inline size={14} label={t("dashboard.docs.loading")} />
          ) : !docs || docs.length === 0 ? (
            <span className="muted" style={{ fontSize: 13 }}>{t("dashboard.docs.none")}</span>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
              {docs.map((d) => (
                <li
                  key={d.DocumentID}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "8px 0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <Icon name="doc" size={13} color="var(--ink-faint)" />
                    <a
                      href={d.Path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: "2px 6px",
                        fontSize: 13,
                        color: "var(--brand)",
                        cursor: "pointer",
                        textDecoration: "underline",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title={t("dashboard.docs.openTitle", { type: d.DocType })}
                    >
                      <bdi>{d.DocType}</bdi>
                      <Icon name="arrow_right" size={11} />
                    </a>
                  </div>
                  <span
                    className="muted"
                    style={{
                      fontSize: 12,
                      color: isCompleted ? "var(--success)" : undefined,
                      fontWeight: isCompleted ? 600 : undefined,
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: isCompleted ? "var(--success)" : "var(--ink-faint)",
                        display: "inline-block",
                      }}
                    />
                    {isCompleted
                      ? t("dashboard.docs.completed")
                      : t(`dashboard.docStatus.${String(d.VerficationStatus || "").toLowerCase()}`, { defaultValue: d.VerficationStatus })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function ApplicationRow({ a, onDecision, onStatusChange, busy }) {
  const { t } = useTranslation("company");
  const badgeClass = STATUS_BADGE_CLASS[a.Status] || "badge-info";
  const label = t(`dashboard.status.${a.Status}`, { defaultValue: a.Status });
  const stepIdx = statusToStepIndex(a.Status);
  const isPending = a.Status === "pending";

  return (
    <div className="card card-hover">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <div className="avatar avatar-lg">{a.ClientInitials}</div>
          <div>
            <div className="row-meta">
              <bdi>#{a.ApplicationID}</bdi> · {a.CategoryName} · <bdi>{a.CreatedAt || "—"}</bdi>
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
        <div style={{ textAlign: "end", minWidth: 140 }}>
          <span className={`badge ${badgeClass}`}>
            <span className="dot" />
            {label}
          </span>
          <div
            className="mono tabular"
            style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginTop: 6 }}
          >
            {t("dashboard.currency")} <bdi>{a.Amount.toLocaleString()}</bdi>
          </div>
        </div>
      </div>

      <hr className="divider" />

      <div className="timeline">
        {STEP_KEYS.map((key, i) => (
          <div
            key={key}
            className={`timeline-step ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}
          >
            <span className="dot" />
            {t(`dashboard.steps.${key}`)}
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
              {t("dashboard.row.reject")}
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => onDecision(a.ApplicationID, "accepted")}
            >
              <Icon name="check" size={14} /> {t("dashboard.row.accept")}
            </button>
          </div>
        ) : (() => {
          const isCompleted = a.Status === "completed";
          return (
            <select
              className="select"
              style={{
                width: 160,
                height: 36,
                fontSize: 13,
                opacity: isCompleted ? 0.6 : 1,
                background: isCompleted ? "var(--steel-100)" : undefined,
                cursor: isCompleted ? "not-allowed" : undefined,
              }}
              value={a.Status}
              onChange={(e) => onStatusChange(a.ApplicationID, e.target.value)}
              disabled={busy || isCompleted}
              title={isCompleted ? t("dashboard.row.completedLocked") : undefined}
            >
              <option value="in_progress">{t("dashboard.status.in_progress")}</option>
              <option value="completed">{t("dashboard.status.completed")}</option>
            </select>
          );
        })()}
      </div>
    </div>
  );
}

/* ---------- Main page ---------- */
function CompanyDashboard() {
  const { t } = useTranslation("company");
  const auth = useAuth();
  const companyId = auth?.kind === "company" ? auth?.company?.CompanyID : null;

  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [exporting, setExporting] = useState(false);
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
      setApplications(list.map((x) => shapeApplication(x, t)));
      setStats(statsRes?.data ?? null);
      setErrorBanner("");
    } catch (err) {
      console.error("FRONTEND: reloadApplications threw", err);
      setErrorBanner(t("dashboard.loadError"));
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
    for (const id of FILTER_IDS.slice(1)) {
      c[id] = applications.filter((a) => a.Status === id).length;
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
      listingFees: Number(stats?.ListingFees ?? 0),
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
        showNotice(t("dashboard.notices.accepted", { id: applicationId }));
      } else {
        // Reject = delete: removes the application, its embedded
        // documents/payments, and the documents' Cloudinary files.
        await rejectApplication(applicationId);
        setApplications((list) => list.filter((a) => a.ApplicationID !== applicationId));
        showNotice(t("dashboard.notices.rejected", { id: applicationId }));
      }
    } catch {
      showNotice(t("dashboard.notices.updateFailed", { id: applicationId }));
    } finally {
      setBusyId(null);
    }
  };

  const handleExportReport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await exportCompanyReport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Company_Performance_Report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotice(t("dashboard.notices.reportDownloaded"));
    } catch (err) {
      console.error("Export failed:", err);
      showNotice(t("dashboard.notices.reportFailed"));
    } finally {
      setExporting(false);
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
        showNotice(t("dashboard.notices.completed", { id: applicationId }));
        // Completing an app releases its payment, so the revenue /
        // commission / net-earnings KPIs change. Re-fetch the canonical
        // stats so the dashboard updates without a manual refresh.
        const statsRes = await getCompanyDashboardStats().catch(() => null);
        if (statsRes?.data) setStats(statsRes.data);
      }
    } catch {
      showNotice(t("dashboard.notices.updateFailed", { id: applicationId }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PublicLayout
      title={t("dashboard.title")}
      subtitle={t("dashboard.subtitle")}
      role="Company"
      actions={
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportReport}
            disabled={exporting || !companyId}
            title={t("dashboard.exportTitle")}
          >
            <Icon name="doc" size={14} /> {exporting ? t("dashboard.generating") : t("dashboard.exportPdf")}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={reloadApplications}>
            <Icon name="bell" size={14} /> {t("dashboard.refresh")}
          </button>
        </div>
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
          {t("dashboard.notCompany")}
        </div>
      )}

      {/* Overview */}
      <Reveal as="section" style={{ marginBottom: 36 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--teal-dark)" }}>{t("dashboard.overview.eyebrow")}</span>
            <h2 className="h3" style={{ fontSize: 20 }}>{t("dashboard.overview.title")}</h2>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>{t("dashboard.overview.allTime")}</span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <StatCard
            icon="trending"
            label={t("dashboard.overview.completedRevenue")}
            value={<>{t("dashboard.currency")} <bdi>{totals.revenue.toLocaleString()}</bdi></>}
            sub={t("dashboard.overview.completedJobs", { count: totals.completed })}
          />
          <StatCard
            icon="receipt"
            label={t("dashboard.overview.netEarnings")}
            value={<>{t("dashboard.currency")} <bdi>{totals.netEarnings.toLocaleString()}</bdi></>}
            sub={t("dashboard.overview.netEarningsSub", {
              currency: t("dashboard.currency"),
              listing: totals.listingFees.toLocaleString(),
              commission: totals.commissionAmount.toLocaleString(),
              rate: totals.commissionRate,
            })}
            accent="success"
          />
          <StatCard
            icon="package"
            label={t("dashboard.overview.pendingValue")}
            value={<>{t("dashboard.currency")} <bdi>{totals.pendingValue.toLocaleString()}</bdi></>}
            sub={t("dashboard.overview.requestsWaiting", { count: pending.length })}
            accent="accent"
          />
          <StatCard
            icon="check"
            label={t("dashboard.overview.activeJobs")}
            value={<bdi>{totals.activeJobs}</bdi>}
            sub={t("dashboard.overview.activeJobsSub", { inProgress: totals.inProgress, completed: totals.completed })}
          />
        </div>
      </Reveal>

      {/* All received applications — monitor */}
      <Reveal as="section" style={{ marginBottom: 24 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <span className="eyebrow">{t("dashboard.monitor.eyebrow")}</span>
            <h2 className="h3" style={{ fontSize: 20 }}>{t("dashboard.monitor.title")}</h2>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            {t("dashboard.monitor.shown", { shown: filteredApplications.length, total: applications.length })}
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
            {FILTER_IDS.map((id) => {
              const active = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`}
                  style={{ gap: 6 }}
                >
                  {t(`dashboard.filters.${id}`)}
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
                    <bdi>{counts[id] ?? 0}</bdi>
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
              placeholder={t("dashboard.monitor.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <ContainerSpinner size={72} label={t("dashboard.monitor.loading")} />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <Icon name="package" size={28} color="var(--ink-faint)" />
            <h3 className="h3" style={{ marginTop: 12 }}>{t("dashboard.monitor.emptyTitle")}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {applications.length === 0
                ? t("dashboard.monitor.emptyNone")
                : t("dashboard.monitor.emptyFiltered")}
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
