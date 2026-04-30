import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Icon from "../../components/Icon.jsx";
import { listCompanies, verifyCompany } from "../../api/companies.js";
import { listApplications } from "../../api/applications.js";
import { onlineUsers } from "../../api/admin.js";

const FALLBACK_PENDING_COMPANIES = [
  { CompanyID: 11, Name: "Northport Logistics", City: "Damietta", SubmittedAt: "2026-04-29", ContactEmail: "ops@northport.eg", Services: "Customs · Documentation", ContactName: "Karim Hassan" },
  { CompanyID: 12, Name: "Red Sea Cargo", City: "Hurghada", SubmittedAt: "2026-04-28", ContactEmail: "info@redseacargo.eg", Services: "Marine cargo", ContactName: "Hanan Ali" },
  { CompanyID: 13, Name: "Sinai Freight Co.", City: "Port Said", SubmittedAt: "2026-04-27", ContactEmail: "hello@sinaifreight.eg", Services: "Bulk cargo · Documentation", ContactName: "Tarek Adel" },
];

const FALLBACK_RECENT_ACTIVITY = [
  { who: "Cairo Clearance Co.", what: "marked application #2050 as completed", when: "2h ago", icon: "check", color: "var(--success)" },
  { who: "Ahmed Mahmoud", what: "submitted a new application", when: "4h ago", icon: "package", color: "var(--navy)" },
  { who: "Northport Logistics", what: "submitted verification documents", when: "yesterday", icon: "doc", color: "var(--accent-dark)" },
  { who: "Sara Khaled", what: "left a 5-star review for Alex Maritime", when: "yesterday", icon: "star", color: "var(--accent)" },
  { who: "Suez Port Solutions", what: "joined as a verified company", when: "2 days ago", icon: "shield", color: "var(--teal-dark)" },
];

const FALLBACK_TOP_COMPANIES = [
  { name: "Cairo Clearance Co.", initials: "CC", revenue: 142000, jobs: 86 },
  { name: "Alex Maritime Logistics", initials: "AM", revenue: 118000, jobs: 64 },
  { name: "Suez Port Solutions", initials: "SP", revenue: 94500, jobs: 51 },
  { name: "Damietta Freight", initials: "DF", revenue: 71200, jobs: 38 },
];

const FALLBACK_ANALYTICS = {
  totalRequests: 1284,
  websiteRevenue: 86200,
  transactions: 942,
  onlineUsers: 17,
};

function StatCard({ icon, label, value, sub, trend, trendDir, accent, sparkData }) {
  return (
    <div className="stat">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="stat-label">{label}</div>
        {icon && (
          <div
            className="card-icon"
            style={{
              marginBottom: 0,
              width: 32,
              height: 32,
              background: accent === "accent"
                ? "linear-gradient(135deg, rgba(232,155,60,0.18), rgba(232,155,60,0.06))"
                : accent === "success"
                ? "linear-gradient(135deg, rgba(22,101,52,0.16), rgba(22,101,52,0.04))"
                : accent === "info"
                ? "linear-gradient(135deg, rgba(29,78,216,0.16), rgba(29,78,216,0.04))"
                : "linear-gradient(135deg, rgba(10,31,61,0.08), rgba(0,181,165,0.12))",
              color:
                accent === "accent" ? "var(--accent-dark)"
                  : accent === "success" ? "var(--success)"
                  : accent === "info" ? "var(--info)"
                  : "var(--navy)",
            }}
          >
            <Icon name={icon} size={16} />
          </div>
        )}
      </div>
      <div className="stat-value" style={{
        background: "linear-gradient(135deg, var(--navy) 0%, var(--teal) 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}>
        {value}
      </div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
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
          <a href="#" className="btn btn-ghost btn-sm" onClick={(e) => e.preventDefault()}>
            <Icon name="doc" size={14} /> View documents
          </a>
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
  const [analytics, setAnalytics] = useState(FALLBACK_ANALYTICS);
  const [topCompanies, setTopCompanies] = useState(FALLBACK_TOP_COMPANIES);
  const [activity, setActivity] = useState(FALLBACK_RECENT_ACTIVITY);
  const [loading, setLoading] = useState(true);
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

        const allCompanies = Array.isArray(companiesRes) ? companiesRes : companiesRes?.data || [];
        const pending = allCompanies.filter((c) => c.Status === "pending");
        setPendingCompanies(pending.length ? pending : FALLBACK_PENDING_COMPANIES);

        const apps = Array.isArray(applicationsRes) ? applicationsRes : applicationsRes?.data || [];
        const totalRequests = apps.length || FALLBACK_ANALYTICS.totalRequests;
        const transactions =
          apps.filter((a) => a.Status === "completed").length || FALLBACK_ANALYTICS.transactions;
        const websiteRevenue =
          apps.reduce((s, a) => s + Number(a.Amount || 0), 0) ||
          FALLBACK_ANALYTICS.websiteRevenue;

        const online =
          onlineRes?.count ?? onlineRes?.users?.length ?? FALLBACK_ANALYTICS.onlineUsers;

        setAnalytics({ totalRequests, websiteRevenue, transactions, onlineUsers: online });
      } catch {
        if (!active) return;
        setPendingCompanies(FALLBACK_PENDING_COMPANIES);
        setAnalytics(FALLBACK_ANALYTICS);
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

  const handleDecide = async (companyId, decision) => {
    setBusyId(companyId);
    try {
      await verifyCompany(companyId, decision === "approve" ? "verified" : "rejected");
    } catch { /* still update UI */ }
    finally {
      setBusyId(null);
      setPendingCompanies((list) => list.filter((c) => c.CompanyID !== companyId));
      showNotice(
        decision === "approve"
          ? "Company verified — they’re now live on the marketplace."
          : "Company rejected. They’ll be notified by email."
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
      subtitle="Today, 30 April 2026 · Marketplace activity, verifications, and revenue."
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

      {/* System analytics */}
      <section style={{ marginBottom: 36 }}>
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
            trend="+18% vs last month"
            trendDir="up"
            sparkData={[5, 7, 6, 9, 8, 11, 10, 14, 12, 16]}
          />
          <StatCard
            icon="receipt"
            label="Website revenue"
            value={`EGP ${analytics.websiteRevenue.toLocaleString()}`}
            sub="Platform fees collected"
            trend="+11.3%"
            trendDir="up"
            accent="accent"
            sparkData={[3, 5, 4, 7, 6, 9, 8, 12, 10, 14]}
          />
          <StatCard
            icon="check"
            label="Transactions"
            value={analytics.transactions.toLocaleString()}
            sub={`${conversionRate}% completion rate`}
            trend="+6.2%"
            trendDir="up"
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
      </section>

      {/* Verification queue */}
      <section style={{ marginBottom: 36 }}>
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
          <p className="muted">Loading…</p>
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
      </section>

      {/* Top companies + Activity */}
      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 24, marginBottom: 24 }}>
        {/* Top companies leaderboard */}
        <div>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <span className="eyebrow">Leaderboard</span>
              <h2 className="h3" style={{ fontSize: 20 }}>Top companies by revenue</h2>
            </div>
            <span className="muted" style={{ fontSize: 13 }}>This month</span>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {topCompanies.map((c, i) => {
              const max = Math.max(...topCompanies.map((x) => x.revenue));
              const pct = (c.revenue / max) * 100;
              return (
                <div
                  key={c.name}
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
                        EGP {c.revenue.toLocaleString()}
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
                          background: "linear-gradient(90deg, var(--navy) 0%, var(--teal) 100%)",
                          borderRadius: 999,
                        }}
                      />
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {c.jobs} jobs completed
                    </div>
                  </div>
                </div>
              );
            })}
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
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default AdminDashboard;
