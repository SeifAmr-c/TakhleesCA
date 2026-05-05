import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { listCompanies, verifyCompany } from "../../api/companies.js";
import { listApplications } from "../../api/applications.js";
import { onlineUsers } from "../../api/admin.js";

const EMPTY_ANALYTICS = {
  totalRequests: 0,
  websiteRevenue: 0,
  transactions: 0,
  onlineUsers: 0,
};

const initials2 = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const relativeTime = (input) => {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  const diff = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toISOString().slice(0, 10);
};

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

function VerificationCard({ company, onDecide, busy }) {
  const initials = (company.Name || "TK")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="card card-hover">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <div className="avatar avatar-lg">{initials}</div>
          <div>
            <div className="row" style={{ marginBottom: 4 }}>
              <span className="badge badge-pending">
                <span className="dot" /> Pending review
              </span>
            </div>
            <div className="row-title" style={{ fontSize: 16 }}>{company.Name}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="pin" size={13} /> {company.City || "—"}
              </span>
              <span style={{ color: "var(--gray-300)" }}>·</span>
              <span>{company.Services || "Logistics services"}</span>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="user" size={12} /> {company.ContactName || "—"}
              </span>
              <span style={{ color: "var(--gray-300)" }}>·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="email" size={12} /> {company.ContactEmail || "—"}
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="row-meta">Submitted</div>
          <div style={{ fontSize: 13, color: "var(--gray-700)", fontWeight: 500 }}>
            {company.SubmittedAt || "—"}
          </div>
        </div>
      </div>

      <hr className="divider" />

      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm">
            <Icon name="doc" size={14} /> View documents
          </button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => onDecide(company.CompanyID, "reject")}
          >
            Reject
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => onDecide(company.CompanyID, "approve")}
          >
            <Icon name="check" size={14} /> Approve
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [verifiedCompanies, setVerifiedCompanies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [companiesRes, applicationsRes, onlineRes] = await Promise.all([
          listCompanies().catch(() => null),
          listApplications().catch(() => null),
          onlineUsers().catch(() => null),
        ]);
        if (!active) return;

        const allCompanies = Array.isArray(companiesRes)
          ? companiesRes
          : companiesRes?.data || [];
        const apps = Array.isArray(applicationsRes)
          ? applicationsRes
          : applicationsRes?.data || [];

        // Real DB column is `VerficationStatus` (note typo) and the ENUM is
        // 'Pending' | 'Verified' | 'Rejected' (capitalized). Build pending
        // queue rows shaped for <VerificationCard />.
        const pending = allCompanies
          .filter((c) => c.VerficationStatus === "Pending")
          .map((c) => ({
            CompanyID: c.CompanyID,
            Name: c.Name,
            ContactEmail: c.ContactEmail,
            City: c.Governorate || c.Address || "",
            SubmittedAt: c.RegistrationDate
              ? String(c.RegistrationDate).slice(0, 10)
              : "",
            Services: c.About || "",
            ContactName: "",
          }));
        setPendingCompanies(pending);
        setVerifiedCompanies(allCompanies.filter((c) => c.VerficationStatus === "Verified"));
        setApplications(apps);

        const totalRequests = apps.length;
        const transactions = apps.filter((a) => a.Status === "Completed").length;
        // Application table has no Amount column; revenue is sourced from
        // payments, which the dashboard doesn't load yet. Show 0 instead
        // of fabricating a number.
        const websiteRevenue = 0;
        const online =
          onlineRes?.count ?? onlineRes?.users?.length ?? 0;

        setAnalytics({ totalRequests, websiteRevenue, transactions, onlineUsers: online });

        if (companiesRes === null) {
          setLoadError("Couldn't reach the server. Some sections may be incomplete.");
        }
      } catch {
        if (!active) return;
        setLoadError("Couldn't load dashboard data. Please refresh.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Build the leaderboard from real applications. Rank companies by completed
  // jobs (descending), then by total applications. Fall back to listing all
  // verified companies when no application data is available so the section
  // is never blank with dummy fillers.
  const topCompanies = useMemo(() => {
    if (!verifiedCompanies.length && !applications.length) return [];

    const counts = new Map();
    for (const a of applications) {
      const id = a.CompanyID;
      if (id == null) continue;
      const cur = counts.get(id) || { jobs: 0, total: 0 };
      cur.total += 1;
      if (a.Status === "Completed") cur.jobs += 1;
      counts.set(id, cur);
    }

    const rows = verifiedCompanies.map((c) => {
      const cnt = counts.get(c.CompanyID) || { jobs: 0, total: 0 };
      return {
        id: c.CompanyID,
        name: c.Name,
        initials: initials2(c.Name),
        jobs: cnt.jobs,
        total: cnt.total,
      };
    });

    rows.sort((a, b) => b.jobs - a.jobs || b.total - a.total);
    return rows.slice(0, 5);
  }, [verifiedCompanies, applications]);

  // Recent events: blend the most recent applications and the most recent
  // company registrations, sorted by timestamp descending.
  const activity = useMemo(() => {
    const events = [];
    const companyName = (id) => {
      const v = verifiedCompanies.find((c) => c.CompanyID === id);
      if (v) return v.Name;
      const p = pendingCompanies.find((c) => c.CompanyID === id);
      return p?.Name || `Company #${id}`;
    };

    for (const a of applications.slice(0, 8)) {
      const date = a.SubmissionDate || a.CompletionDate;
      if (!date) continue;
      const status = a.Status === "Completed" ? "completed" : a.Status === "In Progress" ? "is in progress on" : "submitted";
      events.push({
        ts: new Date(date).getTime(),
        who: companyName(a.CompanyID),
        what: `${status} application #${a.ApplicationID}`,
        when: relativeTime(date),
        icon: a.Status === "Completed" ? "check" : "package",
        color: a.Status === "Completed" ? "var(--success)" : "var(--navy)",
      });
    }

    for (const c of [...verifiedCompanies, ...pendingCompanies].slice(0, 8)) {
      if (!c.RegistrationDate && !c.SubmittedAt) continue;
      const date = c.RegistrationDate || c.SubmittedAt;
      events.push({
        ts: new Date(date).getTime(),
        who: c.Name,
        what:
          c.VerficationStatus === "Verified"
            ? "joined as a verified company"
            : "submitted verification documents",
        when: relativeTime(date),
        icon: c.VerficationStatus === "Verified" ? "shield" : "doc",
        color: c.VerficationStatus === "Verified" ? "var(--teal-dark)" : "var(--accent-dark)",
      });
    }

    events.sort((a, b) => b.ts - a.ts);
    return events.slice(0, 6);
  }, [applications, verifiedCompanies, pendingCompanies]);

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3500);
  };

  const handleDecide = async (companyId, decision) => {
    setBusyId(companyId);
    let ok = false;
    try {
      await verifyCompany(companyId, decision === "approve" ? "Verified" : "Rejected");
      ok = true;
    } catch { /* server failure — surface a different notice */ }
    finally {
      setBusyId(null);
      if (ok) {
        setPendingCompanies((list) => list.filter((c) => c.CompanyID !== companyId));
      }
      showNotice(
        ok
          ? decision === "approve"
            ? "Company verified — they’re now live on the marketplace."
            : "Company rejected. They’ll be notified by email."
          : "Couldn't update the company. Please try again."
      );
    }
  };

  const conversionRate = useMemo(() => {
    const ratio = analytics.totalRequests
      ? (analytics.transactions / analytics.totalRequests) * 100
      : 0;
    return ratio.toFixed(1);
  }, [analytics]);

  return (
    <DashboardLayout
      title="Admin dashboard"
      subtitle="Marketplace activity, verifications, and revenue."
      role="Admin"
      actions={
        <button className="btn btn-secondary btn-sm">
          <Icon name="chart" size={14} /> Export report
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
          <StatCard
            icon="package"
            label="Total requests"
            value={analytics.totalRequests.toLocaleString()}
            sub="All-time applications submitted"
          />
          <StatCard
            icon="receipt"
            label="Website revenue"
            value={`EGP ${analytics.websiteRevenue.toLocaleString()}`}
            sub="Platform fees collected"
            accent="accent"
          />
          <StatCard
            icon="check"
            label="Transactions"
            value={analytics.transactions.toLocaleString()}
            sub={`${conversionRate}% completion rate`}
            accent="success"
          />
          <StatCard
            icon="user"
            label="Online users"
            value={analytics.onlineUsers}
            sub="Live sessions right now"
            accent="info"
          />
        </div>
      </Reveal>

      {/* Verification queue */}
      <Reveal as="section" style={{ marginBottom: 36 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--accent-dark)" }}>
              <Icon name="bell" size={12} /> Action needed
            </span>
            <h2 className="h3" style={{ fontSize: 20 }}>Company verification queue</h2>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            {pendingCompanies.length} {pendingCompanies.length === 1 ? "company" : "companies"} awaiting review
          </span>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <ContainerSpinner size={80} label="Loading verifications" />
          </div>
        ) : pendingCompanies.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <Icon name="check" size={28} color="var(--success)" />
            <h3 className="h3" style={{ marginTop: 12 }}>The queue is clear</h3>
            <p className="muted" style={{ margin: 0 }}>No companies waiting for verification.</p>
          </div>
        ) : (
          <div className="grid">
            {pendingCompanies.map((c) => (
              <VerificationCard
                key={c.CompanyID}
                company={c}
                busy={busyId === c.CompanyID}
                onDecide={handleDecide}
              />
            ))}
          </div>
        )}
      </Reveal>

      {/* Top companies + Activity */}
      <Reveal as="section" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 24, marginBottom: 24 }}>
        {/* Top companies leaderboard */}
        <div>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <span className="eyebrow">Leaderboard</span>
              <h2 className="h3" style={{ fontSize: 20 }}>Top companies by completed jobs</h2>
            </div>
            <span className="muted" style={{ fontSize: 13 }}>All-time</span>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {topCompanies.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--ink-soft)", fontSize: 14 }}>
                No verified companies yet — approve a registration to populate the leaderboard.
              </div>
            ) : (
              topCompanies.map((c, i) => {
                const max = Math.max(1, ...topCompanies.map((x) => x.total));
                const pct = (c.total / max) * 100;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 20px",
                      borderBottom: i < topCompanies.length - 1 ? "1px solid var(--gray-100)" : "none",
                    }}
                  >
                    <div style={{
                      width: 24,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--gray-400)",
                      textAlign: "center",
                    }}>
                      {i + 1}
                    </div>
                    <div className="avatar">{c.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>
                          {c.name}
                        </span>
                        <span style={{ color: "var(--navy)", fontWeight: 700, fontSize: 14 }}>
                          {c.jobs} / {c.total}
                        </span>
                      </div>
                      <div
                        style={{
                          position: "relative",
                          height: 6,
                          background: "var(--gray-100)",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: `${pct}%`,
                            background: "var(--brand)",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {c.jobs} completed · {c.total} total applications
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <span className="eyebrow">Activity</span>
              <h2 className="h3" style={{ fontSize: 20 }}>Recent events</h2>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            {activity.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--ink-soft)", fontSize: 14 }}>
                No recent activity yet.
              </div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {activity.map((row, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "14px 20px",
                      borderBottom:
                        i < activity.length - 1 ? "1px solid var(--gray-100)" : "none",
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
                        color: row.color,
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={row.icon} size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: "var(--gray-800)", lineHeight: 1.4 }}>
                        <strong style={{ color: "var(--navy)" }}>{row.who}</strong>{" "}
                        <span className="muted">{row.what}</span>
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{row.when}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Reveal>
    </DashboardLayout>
  );
}

export default AdminDashboard;
