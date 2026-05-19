import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import logo from "../../assets/logo.png";
import {
  onlineUsers,
  getAdminStats,
  exportAdminReport,
} from "../../api/admin.js";

const EMPTY_ANALYTICS = {
  totalRequests: 0,
  websiteRevenue: 0,
  transactions: 0,
  onlineUsers: 0,
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

function AdminDashboard() {
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [statsRes, onlineRes] = await Promise.all([
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

  const conversionRate = useMemo(() => {
    const ratio = analytics.totalRequests
      ? (analytics.transactions / analytics.totalRequests) * 100
      : 0;
    return ratio.toFixed(1);
  }, [analytics]);

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
          <span className="muted" style={{ fontSize: 13 }}>{loading ? "Loading…" : "Live data"}</span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <StatCard icon="package" label="Total requests" value={analytics.totalRequests.toLocaleString()} sub="All-time applications submitted" />
          <StatCard icon="receipt" label="Website revenue" value={`EGP ${analytics.websiteRevenue.toLocaleString()}`} sub="Platform fees collected" accent="accent" />
          <StatCard icon="check" label="Transactions" value={analytics.transactions.toLocaleString()} sub={`${conversionRate}% completion rate`} />
          <StatCard icon="user" label="Online users" value={analytics.onlineUsers} sub="Live sessions right now" />
        </div>

        <button
          type="button"
          onClick={() => navigate("/admin/management")}
          className="card card-hover"
          style={{
            marginTop: 20,
            width: "100%",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 20,
            padding: "22px 28px",
            cursor: "pointer",
            border: "1px solid var(--line)",
            background: "var(--surface, #fff)",
            textAlign: "left",
            font: "inherit",
            color: "inherit",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 56, height: 56, borderRadius: 14,
              background: "var(--gray-50)",
              display: "grid", placeItems: "center",
              flexShrink: 0, overflow: "hidden",
            }}
          >
            <img src={logo} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
          </span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)", letterSpacing: "-0.01em" }}>
              Takhlees Management
            </span>
            <span className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Companies, support tickets, users, and commissions — all in one place.
            </span>
          </span>
          <span
            aria-hidden
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "var(--gray-50)",
              display: "grid", placeItems: "center",
              color: "var(--navy)", flexShrink: 0,
            }}
          >
            <Icon name="arrow_right" size={18} />
          </span>
        </button>
      </Reveal>
    </PublicLayout>
  );
}

export default AdminDashboard;
