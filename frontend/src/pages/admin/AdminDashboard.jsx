import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import DocViewer from "../../components/DocViewer.jsx";
import {
  onlineUsers,
  getAdminStats,
  getPendingCompanies,
  getVerifiedCompanies,
  verifyCompany,
  getPendingTickets,
  getResolvedTickets,
  resolveTicket,
  exportAdminReport,
} from "../../api/admin.js";

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

const fullName = (first, last) =>
  [first, last].filter(Boolean).join(" ").trim();

const formatDate = (input) => {
  if (!input) return "â€”";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "â€”";
  return d.toISOString().slice(0, 10);
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

function PendingCompanyCard({ company, onAccept, busy }) {
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
                <Icon name="email" size={12} /> {company.ContactEmail || "â€”"}
              </span>
              {company.Governorate && (
                <>
                  <span style={{ color: "var(--gray-300)" }}>Â·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name="pin" size={12} /> {company.Governorate}
                  </span>
                </>
              )}
              {company.TaxNumber && (
                <>
                  <span style={{ color: "var(--gray-300)" }}>Â·</span>
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
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => onAccept(company.CompanyID)}
          >
            {busy ? (
              <ContainerSpinner inline size={14} label="Verifyingâ€¦" />
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
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 20px",
        borderBottom: "1px solid var(--gray-100)",
      }}
    >
      <div className="avatar">{initials2(company.Name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>
          {company.Name}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span>{company.ContactEmail || "â€”"}</span>
          {company.Governorate && (<><span style={{ color: "var(--gray-300)" }}>Â·</span><span>{company.Governorate}</span></>)}
          {company.TaxNumber && (<><span style={{ color: "var(--gray-300)" }}>Â·</span><span>Tax #{company.TaxNumber}</span></>)}
        </div>
      </div>
      {/* Fixed-width slot so the badge sits in the same column on every row,
          regardless of company name length. */}
      <div style={{ flex: "0 0 120px", display: "flex", justifyContent: "center" }}>
        <span className="badge badge-success">
          <span className="dot" /> Verified
        </span>
      </div>
      <div style={{ textAlign: "right", fontSize: 12, color: "var(--ink-faint)", minWidth: 140 }}>
        Joined {formatDate(company.RegistrationDate)}
      </div>
    </li>
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
            Ticket #{ticket.TicketID} Â· <strong style={{ color: "var(--navy)" }}>{clientName}</strong>
            {ticket.ClientEmail ? ` Â· ${ticket.ClientEmail}` : ""}
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
          <ContainerSpinner inline size={14} label="Resolvingâ€¦" />
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
            Ticket #{ticket.TicketID} Â· <strong style={{ color: "var(--navy)" }}>{clientName}</strong>
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

const VERIFIED_PREVIEW_COUNT = 5;

function AdminDashboard() {
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [verifiedCompanies, setVerifiedCompanies] = useState([]);
  const [showAllVerified, setShowAllVerified] = useState(false);
  const [pendingTickets, setPendingTickets] = useState([]);
  const [resolvedTickets, setResolvedTickets] = useState([]);
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [companyBusyId, setCompanyBusyId] = useState(null);
  const [ticketBusyId, setTicketBusyId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const location = useLocation();

  const visibleVerified = showAllVerified
    ? verifiedCompanies
    : verifiedCompanies.slice(0, VERIFIED_PREVIEW_COUNT);
  const hasMoreVerified = verifiedCompanies.length > VERIFIED_PREVIEW_COUNT;


  useEffect(() => {
    if (loading) return;
    const hash = location.hash?.replace("#", "");
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  }, [location.hash, loading]);

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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [, , statsRes, onlineRes] = await Promise.all([
          refreshCompanies(),
          refreshTickets(),
          getAdminStats().catch((err) => {
            console.error("getAdminStats failed:", err?.response?.status, err?.response?.data || err);
            return null;
          }),
          onlineUsers().catch(() => null),
        ]);
        if (!active) return;

        console.log("Admin Stats Data:", statsRes);

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
      showNotice("Company verified â€” they're now live on the marketplace.");
    } catch {
      showNotice("Couldn't verify the company. Please try again.");
    } finally {
      setCompanyBusyId(null);
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
          <Icon name="doc" size={14} /> {exporting ? "Generatingâ€¦" : "Export as PDF"}
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
          />
          <StatCard
            icon="user"
            label="Online users"
            value={analytics.onlineUsers}
            sub="Live sessions right now"
          />
        </div>
      </Reveal>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ COMPANIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div id="companies-section">
        {/* Pending companies */}
        <Reveal as="section" style={{ marginBottom: 36 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--accent-dark)" }}>
                <Icon name="bell" size={12} /> Action needed
              </span>
              <h2 className="h3" style={{ fontSize: 20 }}>Pending companies</h2>
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {pendingCompanies.length} awaiting verification
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
                <PendingCompanyCard
                  key={c.CompanyID}
                  company={c}
                  busy={companyBusyId === c.CompanyID}
                  onAccept={handleAccept}
                />
              ))}
            </div>
          )}
        </Reveal>

        {/* Verified companies */}
        <Reveal as="section" style={{ marginBottom: 36 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <span className="eyebrow">Roster</span>
              <h2 className="h3" style={{ fontSize: 20 }}>Verified companies</h2>
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {verifiedCompanies.length} active on the marketplace
            </span>
          </div>

          {loading ? null : verifiedCompanies.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 48 }}>
              <Icon name="shield" size={28} color="var(--ink-faint)" />
              <h3 className="h3" style={{ marginTop: 12 }}>No verified companies yet</h3>
              <p className="muted" style={{ margin: 0 }}>
                Approve a pending company to get the marketplace started.
              </p>
            </div>
          ) : (
            <>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {visibleVerified.map((c, i) => (
                    <li
                      key={c.CompanyID}
                      style={{
                        borderBottom: i === visibleVerified.length - 1 ? "none" : undefined,
                      }}
                    >
                      <VerifiedCompanyRow company={c} />
                    </li>
                  ))}
                </ul>
              </div>
              {hasMoreVerified && (
                <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowAllVerified((v) => !v)}
                  >
                    {showAllVerified ? (
                      <>Show less <Icon name="arrow_right" size={13} style={{ transform: "rotate(-90deg)" }} /></>
                    ) : (
                      <>Show {verifiedCompanies.length - VERIFIED_PREVIEW_COUNT} more <Icon name="arrow_right" size={13} style={{ transform: "rotate(90deg)" }} /></>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </Reveal>
      </div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SUPPORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div id="support-section">
        {/* Pending tickets */}
        <Reveal as="section" style={{ marginBottom: 36 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--accent-dark)" }}>
                <Icon name="bell" size={12} /> Support
              </span>
              <h2 className="h3" style={{ fontSize: 20 }}>Pending support tickets</h2>
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {pendingTickets.length} unresolved
            </span>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
              <ContainerSpinner size={80} label="Loading tickets" />
            </div>
          ) : pendingTickets.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 48 }}>
              <Icon name="check" size={28} color="var(--success)" />
              <h3 className="h3" style={{ marginTop: 12 }}>No open tickets</h3>
              <p className="muted" style={{ margin: 0 }}>All support tickets have been resolved.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {pendingTickets.map((t, i) => (
                  <PendingTicketRow
                    key={t.TicketID}
                    ticket={t}
                    busy={ticketBusyId === t.TicketID}
                    onResolve={handleResolve}
                    isLast={i === pendingTickets.length - 1}
                  />
                ))}
              </ul>
            </div>
          )}
        </Reveal>

        {/* Resolved tickets */}
        <Reveal as="section" style={{ marginBottom: 24 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <span className="eyebrow">Archive</span>
              <h2 className="h3" style={{ fontSize: 20 }}>Resolved support tickets</h2>
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {resolvedTickets.length} closed
            </span>
          </div>

          {loading ? null : resolvedTickets.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 48 }}>
              <Icon name="package" size={28} color="var(--ink-faint)" />
              <h3 className="h3" style={{ marginTop: 12 }}>Nothing in the archive yet</h3>
              <p className="muted" style={{ margin: 0 }}>Resolved tickets will show up here.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {resolvedTickets.map((t, i) => (
                  <ResolvedTicketRow
                    key={t.TicketID}
                    ticket={t}
                    isLast={i === resolvedTickets.length - 1}
                  />
                ))}
              </ul>
            </div>
          )}
        </Reveal>
      </div>
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ MANAGEMENT CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Reveal as="section" style={{ marginBottom: 24 }}>
        <div
          className="card card-pad-lg"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}
        >
          <div>
            <span className="eyebrow" style={{ color: "var(--teal-dark)" }}>Data management</span>
            <h2 className="h3" style={{ fontSize: 20, marginTop: 4 }}>Clients, ports &amp; categories</h2>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Search the client directory, and add, edit or delete ports and service categories.
            </p>
          </div>
          <Link to="/admin/management" className="btn btn-primary btn-lg" style={{ whiteSpace: "nowrap" }}>
            Open management <Icon name="arrow_right" size={14} />
          </Link>
        </div>
      </Reveal>
    </PublicLayout>
  );
}

export default AdminDashboard;
