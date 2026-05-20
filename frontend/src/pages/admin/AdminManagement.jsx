import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import DocViewer from "../../components/DocViewer.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import logo from "../../assets/logo.png";
import {
  listUsers,
  getPendingCompanies,
  getVerifiedCompanies,
  verifyCompany,
  rejectCompany,
  getPendingTickets,
  getResolvedTickets,
  resolveTicket,
} from "../../api/admin.js";
import { updateCompanyCommission } from "../../api/companies.js";
import {
  listPortsWithUsage,
  createPort,
  updatePort,
  deletePort,
} from "../../api/ports.js";
import {
  listCategoriesWithUsage,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../api/companyCategories.js";

const TABS = ["companies", "support", "users", "commissions", "ports", "categories"];
const SUBS = {
  companies:   ["pending", "verified"],
  support:     ["pending", "resolved"],
  users:       ["all"],
  commissions: ["all"],
  ports:       ["all"],
  categories:  ["all"],
};
const DEFAULT_SUB = { companies: "pending", support: "pending", users: "all", commissions: "all", ports: "all", categories: "all" };

const HASH_ALIASES = {
  "companies-section": "companies",
  "support-section":   "support",
  "users/commissions": "commissions",
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
              onClick={() => setViewerUrl(
                /^https?:\/\//i.test(company.ComReg) ? company.ComReg : `/${company.ComReg}`
              )}
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
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" }}>
      <div className="avatar">{initials2(company.Name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>{company.Name}</div>
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
          width: 32, height: 32, borderRadius: 8,
          display: "grid", placeItems: "center",
          background: "var(--gray-50)", color: "var(--accent-dark)",
          flexShrink: 0, marginTop: 2,
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
          width: 32, height: 32, borderRadius: 8,
          display: "grid", placeItems: "center",
          background: "var(--gray-50)", color: "var(--success)",
          flexShrink: 0, marginTop: 2,
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
        <div style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>{company.Name}</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          {company.ContactEmail || "—"}
          <span style={{ color: "var(--gray-300)", margin: "0 6px" }}>·</span>
          Current <strong style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }}>{Number(company.Comm ?? 0)}%</strong>
        </div>
      </div>
      <div
        style={{
          display: "inline-flex", alignItems: "center",
          border: `1px solid ${invalid ? "var(--signal-stop, #c33)" : "var(--line)"}`,
          borderRadius: 8, background: "var(--surface, #fff)", overflow: "hidden", height: 36,
        }}
      >
        <input
          type="number" min={0} max={100} step="0.1" inputMode="decimal"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setTouched(true); }}
          aria-label={`New commission for ${company.Name}`}
          style={{
            width: 76, border: 0, outline: "none", padding: "0 10px", height: "100%",
            fontFamily: "var(--font-mono)", fontSize: 14, textAlign: "right", background: "transparent",
          }}
        />
        <span
          aria-hidden
          style={{
            padding: "0 10px", height: "100%", display: "inline-flex", alignItems: "center",
            background: "var(--gray-50)", color: "var(--ink-faint)", fontSize: 13,
            fontFamily: "var(--font-mono)", borderLeft: "1px solid var(--line)",
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

/* ---------- Port management cards ---------- */
const PORT_TYPES = ["Air", "Sea"];

function AddPortForm({ onCreate, busy }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Sea");
  const [estDate, setEstDate] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !type || !estDate) {
      setError("Name, type, and establishment date are required.");
      return;
    }
    try {
      await onCreate({ PortName: name.trim(), PortType: type, EstDate: estDate });
      setName("");
      setType("Sea");
      setEstDate("");
    } catch (err) {
      setError(err?.response?.data?.Message || err?.response?.data?.message || "Couldn't add port.");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="card"
      style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.9fr auto", gap: 10, alignItems: "end", padding: 16, marginBottom: 16 }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="muted" style={{ fontSize: 12 }}>Port name</span>
        <input
          value={name} onChange={(e) => setName(e.target.value)} disabled={busy}
          placeholder="e.g. Port Said" aria-label="Port name"
          style={{ height: 36, borderRadius: 8, border: "1px solid var(--line)", padding: "0 10px", fontSize: 14 }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="muted" style={{ fontSize: 12 }}>Type</span>
        <select
          value={type} onChange={(e) => setType(e.target.value)} disabled={busy}
          aria-label="Port type"
          style={{ height: 36, borderRadius: 8, border: "1px solid var(--line)", padding: "0 10px", fontSize: 14, background: "var(--surface, #fff)" }}
        >
          {PORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="muted" style={{ fontSize: 12 }}>Established</span>
        <input
          type="date" value={estDate} onChange={(e) => setEstDate(e.target.value)} disabled={busy}
          aria-label="Establishment date"
          style={{ height: 36, borderRadius: 8, border: "1px solid var(--line)", padding: "0 10px", fontSize: 14 }}
        />
      </label>
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy} style={{ height: 36 }}>
        {busy ? <ContainerSpinner inline size={14} label="Adding…" /> : <><Icon name="check" size={14} /> Add port</>}
      </button>
      {error && (
        <div style={{ gridColumn: "1 / -1", color: "var(--signal-stop, #c33)", fontSize: 12 }}>
          {error}
        </div>
      )}
    </form>
  );
}

function PortRow({ port, busy, onSave, onDelete, isLast }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(port.PortName);
  const [type, setType] = useState(port.PortType);
  const active = Number(port.ActiveApplications || 0);
  const frozen = active > 0;

  useEffect(() => {
    setName(port.PortName);
    setType(port.PortType);
  }, [port.PortName, port.PortType, editing]);

  const dirty = editing && (name.trim() !== port.PortName || type !== port.PortType);

  return (
    <li style={{ borderBottom: isLast ? "none" : "1px solid var(--gray-100)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <input
              value={name} onChange={(e) => setName(e.target.value)} disabled={busy}
              aria-label="Port name"
              style={{ height: 32, borderRadius: 6, border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, minWidth: 180 }}
            />
            <select
              value={type} onChange={(e) => setType(e.target.value)} disabled={busy}
              aria-label="Port type"
              style={{ height: 32, borderRadius: 6, border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, background: "var(--surface, #fff)" }}
            >
              {PORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        ) : (
          <>
            <div style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>{port.PortName}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              <span style={{ fontFamily: "var(--font-mono)" }}>#{port.PortID}</span>
              <span style={{ color: "var(--gray-300)", margin: "0 6px" }}>·</span>
              {port.PortType}
              <span style={{ color: "var(--gray-300)", margin: "0 6px" }}>·</span>
              Est. {formatDate(port.EstDate)}
              {frozen && (
                <>
                  <span style={{ color: "var(--gray-300)", margin: "0 6px" }}>·</span>
                  <span style={{ color: "var(--accent-dark, #b25f00)", fontWeight: 600 }}>
                    {active} active application{active === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <div className="row" style={{ gap: 8 }}>
        {editing ? (
          <>
            <button
              className="btn btn-primary btn-sm" disabled={busy || !dirty || !name.trim()}
              onClick={() => onSave(port.PortID, { PortName: name.trim(), PortType: type }).then(() => setEditing(false))}
              style={{ minWidth: 72, justifyContent: "center" }}
            >
              {busy ? <ContainerSpinner inline size={14} label="Saving…" /> : <><Icon name="check" size={14} /> Save</>}
            </button>
            <button
              type="button" className="btn btn-secondary btn-sm" disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button" className="btn btn-secondary btn-sm" disabled={busy}
              onClick={() => setEditing(true)}
            >
              <Icon name="doc" size={14} /> Edit
            </button>
            {frozen ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled
                title={`Frozen: ${active} active application${active === 1 ? "" : "s"} still using this port.`}
                style={{ opacity: 0.7, cursor: "not-allowed", background: "var(--gray-50)" }}
              >
                <Icon name="lock" size={14} /> Frozen
              </button>
            ) : (
              <button
                type="button" className="btn btn-secondary btn-sm" disabled={busy}
                onClick={() => onDelete(port)}
                style={{ color: "var(--signal-stop, #c33)" }}
              >
                <Icon name="logout" size={14} /> Delete
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

/* ---------- Category management cards ---------- */
function AddCategoryForm({ onCreate, busy }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    try {
      await onCreate({ Type: name.trim() });
      setName("");
    } catch (err) {
      setError(err?.response?.data?.Message || err?.response?.data?.message || "Couldn't add category.");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="card"
      style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end", padding: 16, marginBottom: 16 }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="muted" style={{ fontSize: 12 }}>Category name</span>
        <input
          value={name} onChange={(e) => setName(e.target.value)} disabled={busy}
          placeholder="e.g. Electronics" aria-label="Category name"
          style={{ height: 36, borderRadius: 8, border: "1px solid var(--line)", padding: "0 10px", fontSize: 14 }}
        />
      </label>
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy} style={{ height: 36 }}>
        {busy ? <ContainerSpinner inline size={14} label="Adding…" /> : <><Icon name="check" size={14} /> Add category</>}
      </button>
      {error && (
        <div style={{ gridColumn: "1 / -1", color: "var(--signal-stop, #c33)", fontSize: 12 }}>
          {error}
        </div>
      )}
    </form>
  );
}

function CategoryRow({ category, busy, onSave, onDelete, isLast }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.Type);
  const active = Number(category.ActiveApplications || 0);
  const frozen = active > 0;

  useEffect(() => {
    setName(category.Type);
  }, [category.Type, editing]);

  const dirty = editing && name.trim() && name.trim() !== category.Type;

  return (
    <li style={{ borderBottom: isLast ? "none" : "1px solid var(--gray-100)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            value={name} onChange={(e) => setName(e.target.value)} disabled={busy}
            aria-label="Category name"
            style={{ height: 32, borderRadius: 6, border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, minWidth: 220 }}
          />
        ) : (
          <>
            <div style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>{category.Type}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              <span style={{ fontFamily: "var(--font-mono)" }}>#{category.CategoryID}</span>
              {frozen && (
                <>
                  <span style={{ color: "var(--gray-300)", margin: "0 6px" }}>·</span>
                  <span style={{ color: "var(--accent-dark, #b25f00)", fontWeight: 600 }}>
                    {active} active application{active === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <div className="row" style={{ gap: 8 }}>
        {editing ? (
          <>
            <button
              className="btn btn-primary btn-sm" disabled={busy || !dirty}
              onClick={() => onSave(category.CategoryID, { Type: name.trim() }).then(() => setEditing(false))}
              style={{ minWidth: 72, justifyContent: "center" }}
            >
              {busy ? <ContainerSpinner inline size={14} label="Saving…" /> : <><Icon name="check" size={14} /> Save</>}
            </button>
            <button
              type="button" className="btn btn-secondary btn-sm" disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button" className="btn btn-secondary btn-sm" disabled={busy}
              onClick={() => setEditing(true)}
            >
              <Icon name="doc" size={14} /> Edit
            </button>
            {frozen ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled
                title={`Frozen: ${active} active application${active === 1 ? "" : "s"} still using this category.`}
                style={{ opacity: 0.7, cursor: "not-allowed", background: "var(--gray-50)" }}
              >
                <Icon name="lock" size={14} /> Frozen
              </button>
            ) : (
              <button
                type="button" className="btn btn-secondary btn-sm" disabled={busy}
                onClick={() => onDelete(category)}
                style={{ color: "var(--signal-stop, #c33)" }}
              >
                <Icon name="logout" size={14} /> Delete
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function SectionHeader({ eyebrow, eyebrowAccent, eyebrowIcon, title, count, actions }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
      <div>
        <span className="eyebrow" style={eyebrowAccent ? { color: "var(--accent-dark)" } : undefined}>
          {eyebrowIcon && <Icon name={eyebrowIcon} size={12} />} {eyebrow}
        </span>
        <h2 className="h3" style={{ fontSize: 20 }}>{title}</h2>
      </div>
      <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {count != null && <span className="muted" style={{ fontSize: 13 }}>{count}</span>}
        {actions}
      </div>
    </div>
  );
}

function PillTabs({ tabs, active, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex", gap: 4, padding: 4,
        background: "var(--gray-50)", border: "1px solid var(--line)", borderRadius: 10,
        marginBottom: 18,
      }}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id} type="button" role="tab" aria-selected={isActive}
            onClick={() => onChange(t.id)}
            style={{
              border: "none", padding: "8px 16px", borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: isActive ? "#fff" : "transparent",
              color: isActive ? "var(--navy)" : "var(--ink-soft)",
              boxShadow: isActive ? "0 1px 2px rgba(15, 23, 42, 0.08)" : "none",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            {t.label}
            {t.count != null && (
              <span
                style={{
                  fontSize: 11, fontFamily: "var(--font-mono)",
                  background: isActive ? "var(--gray-100)" : "transparent",
                  color: isActive ? "var(--ink)" : "var(--ink-faint)",
                  padding: "1px 6px", borderRadius: 999,
                }}
              >{t.count}</span>
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
      <Icon name="search" size={14} style={{ position: "absolute", left: 12, top: 12, color: "var(--ink-faint)" }} />
      <input
        type="search" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} aria-label={placeholder}
        style={{
          width: "100%", height: 38, border: "1px solid var(--line)", borderRadius: 8,
          padding: "0 12px 0 34px", fontSize: 14, background: "var(--surface, #fff)", outline: "none",
        }}
      />
    </div>
  );
}

/* Printable table modal — opens an overlay with a paper-styled
   document. Browser print CSS hides everything except the paper, so the
   admin's native "Save as PDF" produces a clean export. */
function PrintableTable({ open, onClose, title, subtitle, columns, rows }) {
  if (!open) return null;

  const today = new Date().toISOString().slice(0, 10);

  const node = (
    <div
      role="dialog" aria-modal="true" aria-labelledby="print-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        zIndex: 1000, padding: "32px 16px", overflowY: "auto",
      }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-paper, .print-paper * { visibility: visible !important; }
          .print-paper {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; max-width: none !important;
            margin: 0 !important; padding: 24px !important;
            box-shadow: none !important; border: none !important; border-radius: 0 !important;
          }
          .print-no { display: none !important; }
        }
      `}</style>

      <div
        className="print-paper"
        style={{
          width: "min(960px, 100%)",
          background: "#fff",
          color: "#0f172a",
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          padding: 36,
          boxShadow: "0 24px 64px rgba(15, 23, 42, 0.35)",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {/* Top action bar — hidden during print */}
        <div
          className="print-no"
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #e2e8f0",
          }}
        >
          <span style={{ fontSize: 12, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Print preview
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button" onClick={onClose}
              style={{
                background: "transparent", border: "1px solid #e2e8f0", color: "#475569",
                padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              Close
            </button>
            <button
              type="button" onClick={() => window.print()}
              style={{
                background: "#0f172a", border: "1px solid #0f172a", color: "#fff",
                padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <Icon name="doc" size={14} /> Save as PDF
            </button>
          </div>
        </div>

        {/* Letterhead */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingBottom: 18, borderBottom: "2px solid #0f172a" }}>
          <img src={logo} alt="" style={{ width: 48, height: 48, objectFit: "contain" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>Takhlees</div>
            <div style={{ fontSize: 12, color: "#475569" }}>Marketplace administration · Report</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#475569" }}>
            <div>Generated</div>
            <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#0f172a" }}>{today}</div>
          </div>
        </div>

        <h1 id="print-title" style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 700 }}>{title}</h1>
        {subtitle && (
          <p style={{ margin: "0 0 24px", color: "#475569", fontSize: 14 }}>{subtitle}</p>
        )}
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#475569" }}>
          {rows.length} {rows.length === 1 ? "record" : "records"}
        </p>

        {rows.length === 0 ? (
          <div
            style={{
              padding: 32, textAlign: "center", color: "#64748b",
              border: "1px dashed #cbd5e1", borderRadius: 4,
            }}
          >
            No records to display.
          </div>
        ) : (
          <table
            style={{
              width: "100%", borderCollapse: "collapse", fontSize: 13,
              border: "1px solid #0f172a",
            }}
          >
            <thead>
              <tr style={{ background: "#0f172a", color: "#fff" }}>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    style={{
                      padding: "10px 12px", textAlign: c.align || "left",
                      fontFamily: "Inter, system-ui, sans-serif", fontSize: 11,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                      border: "1px solid #0f172a", fontWeight: 600,
                      width: c.width,
                      whiteSpace: c.nowrap ? "nowrap" : "normal",
                    }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  {columns.map((c) => {
                    const val = typeof c.value === "function" ? c.value(row) : row[c.key];
                    return (
                      <td
                        key={c.key}
                        style={{
                          padding: "10px 12px",
                          border: "1px solid #cbd5e1",
                          textAlign: c.align || "left",
                          verticalAlign: "top",
                          whiteSpace: c.nowrap ? "nowrap" : "normal",
                          wordBreak: c.nowrap || c.wrap === false ? "normal" : "break-word",
                          fontFamily: c.mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
                          color: "#0f172a",
                        }}
                      >
                        {val == null || val === "" ? "—" : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div
          style={{
            marginTop: 32, paddingTop: 16, borderTop: "1px solid #e2e8f0",
            display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b",
          }}
        >
          <span>Takhlees · Marketplace administration</span>
          <span>Confidential</span>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}

/* Column maps used by the PDF export per subsection. Defined once at
   module scope so the same column set is used wherever the data is
   rendered (UI + PDF). */
const PRINT_COLS = {
  pendingCompanies: [
    { key: "CompanyID", label: "ID", align: "right", mono: true, width: 56, nowrap: true },
    { key: "Name",      label: "Company name", nowrap: true },
    { key: "ContactEmail", label: "Email", nowrap: true },
    { key: "TaxNumber",    label: "Tax #", mono: true, nowrap: true },
    { key: "Governorate",  label: "Governorate", nowrap: true },
    { key: "Address",      label: "Address" },
    { key: "FoundingDate", label: "Founded",   value: (r) => formatDate(r.FoundingDate),    mono: true, nowrap: true },
    { key: "RegistrationDate", label: "Submitted", value: (r) => formatDate(r.RegistrationDate), mono: true, nowrap: true },
    { key: "ComReg",       label: "Reg. doc", value: (r) => r.ComReg ? "Provided" : "Missing", nowrap: true },
    { key: "About",        label: "About" },
  ],
  verifiedCompanies: [
    { key: "CompanyID", label: "ID", align: "right", mono: true, width: 56 },
    { key: "Name",      label: "Company name" },
    { key: "ContactEmail", label: "Email" },
    { key: "TaxNumber",    label: "Tax #", mono: true },
    { key: "Governorate",  label: "Governorate" },
    { key: "FoundingDate", label: "Founded", value: (r) => formatDate(r.FoundingDate), mono: true },
    { key: "RegistrationDate", label: "Joined",  value: (r) => formatDate(r.RegistrationDate), mono: true },
    { key: "Comm",         label: "Commission", align: "right", mono: true, value: (r) => `${Number(r.Comm ?? 0)}%` },
  ],
  pendingTickets: [
    { key: "TicketID", label: "Ticket #", align: "right", mono: true, width: 80 },
    { key: "Client",   label: "Client", value: (r) => fullName(r.ClientFirstName, r.ClientLastName) || `Client #${r.ClientID}` },
    { key: "ClientEmail", label: "Email" },
    { key: "Issue",    label: "Issue" },
  ],
  resolvedTickets: [
    { key: "TicketID", label: "Ticket #", align: "right", mono: true, width: 80 },
    { key: "Client",   label: "Client", value: (r) => fullName(r.ClientFirstName, r.ClientLastName) || `Client #${r.ClientID}` },
    { key: "Issue",    label: "Issue" },
    { key: "ResolvedBy", label: "Resolved by", value: (r) => fullName(r.AdminFirstName, r.AdminLastName) || "—" },
  ],
  users: [
    { key: "UserID",     label: "User #", align: "right", mono: true, width: 70 },
    { key: "Name",       label: "Name", value: (r) => fullName(r.FirstName, r.LastName) || "—" },
    { key: "Email",      label: "Email" },
    { key: "Type",       label: "Type", value: (r) => r.Type === "A" ? "Admin" : "Client" },
    { key: "PhoneNumber",label: "Phone" },
    { key: "NationalID", label: "National ID", mono: true },
    { key: "Address",    label: "Address" },
  ],
  commissions: [
    { key: "CompanyID", label: "ID", align: "right", mono: true, width: 56 },
    { key: "Name",      label: "Company name" },
    { key: "ContactEmail", label: "Email" },
    { key: "Comm",      label: "Commission", align: "right", mono: true, value: (r) => `${Number(r.Comm ?? 0)}%` },
  ],
  ports: [
    { key: "PortID",   label: "Port #", align: "right", mono: true, width: 70 },
    { key: "PortName", label: "Name" },
    { key: "PortType", label: "Type" },
    { key: "EstDate",  label: "Established", mono: true, value: (r) => formatDate(r.EstDate) },
    { key: "ActiveApplications", label: "Active apps", align: "right", mono: true, value: (r) => String(r.ActiveApplications || 0) },
  ],
  categories: [
    { key: "CategoryID", label: "Cat #", align: "right", mono: true, width: 70 },
    { key: "Type",       label: "Name" },
    { key: "ActiveApplications", label: "Active apps", align: "right", mono: true, value: (r) => String(r.ActiveApplications || 0) },
  ],
};

function ExportPdfButton({ onClick }) {
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={onClick}
      title="Export this section as a printable PDF"
    >
      <Icon name="doc" size={14} /> Export as PDF
    </button>
  );
}

function AdminManagement() {
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [verifiedCompanies, setVerifiedCompanies] = useState([]);
  const [pendingTickets, setPendingTickets] = useState([]);
  const [resolvedTickets, setResolvedTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [ports, setPorts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyBusyId, setCompanyBusyId] = useState(null);
  const [ticketBusyId, setTicketBusyId] = useState(null);
  const [commBusyId, setCommBusyId] = useState(null);
  const [portBusyId, setPortBusyId] = useState(null);
  const [portAdding, setPortAdding] = useState(false);
  const [categoryBusyId, setCategoryBusyId] = useState(null);
  const [categoryAdding, setCategoryAdding] = useState(false);
  const [commSavedAt, setCommSavedAt] = useState({});
  const [notice, setNotice] = useState("");
  const [verifiedExpanded, setVerifiedExpanded] = useState(false);
  const VERIFIED_COLLAPSED_COUNT = 5;
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectBusy, setRejectBusy] = useState(false);
  const [deletePortTarget, setDeletePortTarget] = useState(null);
  const [deletePortBusy, setDeletePortBusy] = useState(false);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null);
  const [deleteCategoryBusy, setDeleteCategoryBusy] = useState(false);
  const [tab, setTab] = useState("companies");
  const [sub, setSub] = useState(DEFAULT_SUB.companies);
  const [filter, setFilter] = useState("");
  const [printConfig, setPrintConfig] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return;
    const resolved = HASH_ALIASES[raw] ?? raw;
    const [t, s] = resolved.split("/");
    if (!TABS.includes(t)) return;
    setTab(t);
    if (s && SUBS[t].includes(s)) setSub(s);
    else setSub(DEFAULT_SUB[t]);
  }, [location.hash]);

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

  const refreshPorts = async () => {
    try {
      const data = await listPortsWithUsage();
      setPorts(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error("listPortsWithUsage failed:", err?.response?.status, err?.response?.data || err);
      setPorts([]);
    }
  };

  const refreshCategories = async () => {
    try {
      const data = await listCategoriesWithUsage();
      setCategories(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error("listCategoriesWithUsage failed:", err?.response?.status, err?.response?.data || err);
      setCategories([]);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await Promise.all([refreshCompanies(), refreshTickets(), refreshUsers(), refreshPorts(), refreshCategories()]);
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
    const target = rejectTarget;
    setRejectBusy(true);
    setCompanyBusyId(target.CompanyID);
    setRejectTarget(null);
    try {
      await rejectCompany(target.CompanyID);
      await refreshCompanies();
      showNotice(`${target.Name} rejected and removed.`);
    } catch (err) {
      console.error("rejectCompany failed:", err?.response?.status, err?.response?.data || err);
      const msg = err?.response?.data?.message
        || err?.response?.data?.error
        || err?.message
        || "Couldn't reject the company. Please try again.";
      showNotice(msg);
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

  const handleAddPort = async (body) => {
    setPortAdding(true);
    try {
      await createPort(body);
      await refreshPorts();
      showNotice(`Port "${body.PortName}" added.`);
    } finally {
      setPortAdding(false);
    }
  };

  const handleSavePort = async (portId, body) => {
    setPortBusyId(portId);
    try {
      await updatePort(portId, body);
      await refreshPorts();
      showNotice(`Port "${body.PortName}" updated.`);
    } catch (err) {
      const msg = err?.response?.data?.Message || err?.response?.data?.message || "Couldn't update the port.";
      showNotice(msg);
      throw err;
    } finally {
      setPortBusyId(null);
    }
  };

  const handleAddCategory = async (body) => {
    setCategoryAdding(true);
    try {
      await createCategory(body);
      await refreshCategories();
      showNotice(`Category "${body.Type}" added.`);
    } catch (err) {
      const msg = err?.response?.data?.Message || err?.response?.data?.message || "Couldn't add category.";
      showNotice(msg);
      throw err;
    } finally {
      setCategoryAdding(false);
    }
  };

  const handleSaveCategory = async (categoryId, body) => {
    setCategoryBusyId(categoryId);
    try {
      await updateCategory(categoryId, body);
      await refreshCategories();
      showNotice(`Category renamed to "${body.Type}".`);
    } catch (err) {
      const msg = err?.response?.data?.Message || err?.response?.data?.message || "Couldn't update the category.";
      showNotice(msg);
      throw err;
    } finally {
      setCategoryBusyId(null);
    }
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!deleteCategoryTarget) return;
    const target = deleteCategoryTarget;
    setDeleteCategoryBusy(true);
    setCategoryBusyId(target.CategoryID);
    setDeleteCategoryTarget(null);
    try {
      await deleteCategory(target.CategoryID);
      await refreshCategories();
      showNotice(`Category "${target.Type}" deleted.`);
    } catch (err) {
      const msg = err?.response?.data?.Message || err?.response?.data?.message || "Couldn't delete the category.";
      showNotice(msg);
    } finally {
      setDeleteCategoryBusy(false);
      setCategoryBusyId(null);
    }
  };

  const handleDeletePortConfirm = async () => {
    if (!deletePortTarget) return;
    const target = deletePortTarget;
    setDeletePortBusy(true);
    setPortBusyId(target.PortID);
    setDeletePortTarget(null);
    try {
      await deletePort(target.PortID);
      await refreshPorts();
      showNotice(`Port "${target.PortName}" deleted.`);
    } catch (err) {
      const msg = err?.response?.data?.Message || err?.response?.data?.message || "Couldn't delete the port.";
      showNotice(msg);
    } finally {
      setDeletePortBusy(false);
      setPortBusyId(null);
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
  const filteredPorts = useMemo(() => !q ? ports : ports.filter(p =>
    String(p.PortName||"").toLowerCase().includes(q) ||
    String(p.PortType||"").toLowerCase().includes(q) ||
    String(p.PortID).includes(q)
  ), [ports, q]);
  const filteredCategories = useMemo(() => !q ? categories : categories.filter(c =>
    String(c.Type||"").toLowerCase().includes(q) ||
    String(c.CategoryID).includes(q)
  ), [categories, q]);

  const primaryTabs = [
    { id: "companies",   label: "Companies",       icon: "building", count: pendingCompanies.length + verifiedCompanies.length },
    { id: "support",     label: "Support tickets", icon: "bell",     count: pendingTickets.length + resolvedTickets.length },
    { id: "users",       label: "Users",           icon: "user",     count: users.length },
    { id: "commissions", label: "Commissions",     icon: "receipt",  count: verifiedCompanies.length },
    { id: "ports",       label: "Ports",           icon: "anchor",   count: ports.length },
    { id: "categories",  label: "Categories",      icon: "package",  count: categories.length },
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
    users: [],
    commissions: [],
    ports: [],
    categories: [],
  };

  /* Print exports — each one feeds the rows + column map for the current
     sub-section into PrintableTable. Using filtered rows so the printout
     matches what the admin is currently looking at (search applied). */
  const openPrint = (key, title, rows) => {
    setPrintConfig({
      title,
      subtitle: `Filtered view as of ${new Date().toLocaleString()}`,
      columns: PRINT_COLS[key],
      rows,
    });
  };

  const renderCompaniesPending = () => (
    <>
      <SectionHeader
        eyebrow="Action needed" eyebrowAccent eyebrowIcon="bell"
        title="Pending companies"
        count={`${filteredPendingCompanies.length} of ${pendingCompanies.length} awaiting verification`}
        actions={<ExportPdfButton onClick={() => openPrint("pendingCompanies", "Pending companies", filteredPendingCompanies)} />}
      />
      <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by name, email, or governorate…" />
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={80} label="Loading verifications" />
        </div>
      ) : filteredPendingCompanies.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="check" size={28} color="var(--success)" />
          <h3 className="h3" style={{ marginTop: 12 }}>{pendingCompanies.length === 0 ? "The queue is clear" : "No matches"}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {pendingCompanies.length === 0 ? "No companies waiting for verification." : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="grid">
          {filteredPendingCompanies.map((c) => (
            <PendingCompanyCard
              key={c.CompanyID} company={c}
              busy={companyBusyId === c.CompanyID}
              onAccept={handleAccept} onReject={setRejectTarget}
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
          eyebrow="Roster" title="Verified companies"
          count={`${list.length} of ${verifiedCompanies.length} active on the marketplace`}
          actions={<ExportPdfButton onClick={() => openPrint("verifiedCompanies", "Verified companies", list)} />}
        />
        <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by name, email, or governorate…" />
        {loading ? null : list.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <Icon name="shield" size={28} color="var(--ink-faint)" />
            <h3 className="h3" style={{ marginTop: 12 }}>{verifiedCompanies.length === 0 ? "No verified companies yet" : "No matches"}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {verifiedCompanies.length === 0 ? "Approve a pending company to get the marketplace started." : "Try a different search term."}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {visible.map((c, i) => (
                <li
                  key={c.CompanyID}
                  style={{ borderBottom: i === visible.length - 1 && !canCollapse ? "none" : "1px solid var(--gray-100)" }}
                >
                  <VerifiedCompanyRow company={c} />
                </li>
              ))}
            </ul>
            {canCollapse && (
              <button
                type="button" onClick={() => setVerifiedExpanded((v) => !v)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "12px 20px", border: "none",
                  background: "var(--gray-50)", color: "var(--navy)", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "background 0.15s ease",
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
        eyebrow="Support" eyebrowAccent eyebrowIcon="bell"
        title="Unresolved support tickets"
        count={`${filteredPendingTickets.length} of ${pendingTickets.length} unresolved`}
        actions={<ExportPdfButton onClick={() => openPrint("pendingTickets", "Unresolved support tickets", filteredPendingTickets)} />}
      />
      <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by client, email, ticket #, or issue…" />
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={80} label="Loading tickets" />
        </div>
      ) : filteredPendingTickets.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="check" size={28} color="var(--success)" />
          <h3 className="h3" style={{ marginTop: 12 }}>{pendingTickets.length === 0 ? "No open tickets" : "No matches"}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {pendingTickets.length === 0 ? "All support tickets have been resolved." : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filteredPendingTickets.map((t, i) => (
              <PendingTicketRow
                key={t.TicketID} ticket={t}
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
        eyebrow="Archive" title="Resolved support tickets"
        count={`${filteredResolvedTickets.length} of ${resolvedTickets.length} closed`}
        actions={<ExportPdfButton onClick={() => openPrint("resolvedTickets", "Resolved support tickets", filteredResolvedTickets)} />}
      />
      <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by client, ticket #, or issue…" />
      {loading ? null : filteredResolvedTickets.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="package" size={28} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>{resolvedTickets.length === 0 ? "Nothing in the archive yet" : "No matches"}</h3>
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
        eyebrow="Directory" title="All users"
        count={`${filteredUsers.length} of ${users.length} registered`}
        actions={<ExportPdfButton onClick={() => openPrint("users", "All users", filteredUsers)} />}
      />
      <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by name, email, phone, or user #…" />
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={80} label="Loading users" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="user" size={28} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>{users.length === 0 ? "No users yet" : "No matches"}</h3>
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
                style={{ borderBottom: i === filteredUsers.length - 1 ? "none" : "1px solid var(--gray-100)" }}
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
        eyebrow="Revenue" eyebrowIcon="receipt"
        title="Per-company commissions"
        count={`${filteredCommissionCompanies.length} of ${verifiedCompanies.length} on the marketplace`}
        actions={<ExportPdfButton onClick={() => openPrint("commissions", "Per-company commissions", filteredCommissionCompanies)} />}
      />
      <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by name or email…" />
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={80} label="Loading companies" />
        </div>
      ) : filteredCommissionCompanies.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="shield" size={28} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>{verifiedCompanies.length === 0 ? "No verified companies yet" : "No matches"}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {verifiedCompanies.length === 0 ? "Verify a company to set its commission." : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filteredCommissionCompanies.map((c, i) => (
              <li
                key={c.CompanyID}
                style={{ borderBottom: i === filteredCommissionCompanies.length - 1 ? "none" : "1px solid var(--gray-100)" }}
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

  const renderPortsAll = () => (
    <>
      <SectionHeader
        eyebrow="Catalog" eyebrowIcon="anchor"
        title="Ports of operation"
        count={`${filteredPorts.length} of ${ports.length} configured`}
        actions={<ExportPdfButton onClick={() => openPrint("ports", "Ports of operation", filteredPorts)} />}
      />
      <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by name, type, or port #…" />

      <AddPortForm onCreate={handleAddPort} busy={portAdding} />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={80} label="Loading ports" />
        </div>
      ) : filteredPorts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="anchor" size={28} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>{ports.length === 0 ? "No ports yet" : "No matches"}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {ports.length === 0 ? "Add a port above to make it available to companies." : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filteredPorts.map((p, i) => (
              <PortRow
                key={p.PortID}
                port={p}
                busy={portBusyId === p.PortID}
                onSave={handleSavePort}
                onDelete={setDeletePortTarget}
                isLast={i === filteredPorts.length - 1}
              />
            ))}
          </ul>
        </div>
      )}
    </>
  );

  const renderCategoriesAll = () => (
    <>
      <SectionHeader
        eyebrow="Catalog" eyebrowIcon="package"
        title="Service categories"
        count={`${filteredCategories.length} of ${categories.length} configured`}
        actions={<ExportPdfButton onClick={() => openPrint("categories", "Service categories", filteredCategories)} />}
      />
      <SearchFilter value={filter} onChange={setFilter} placeholder="Filter by name or category #…" />

      <AddCategoryForm onCreate={handleAddCategory} busy={categoryAdding} />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={80} label="Loading categories" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="package" size={28} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>{categories.length === 0 ? "No categories yet" : "No matches"}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {categories.length === 0 ? "Add a category above to make it available to companies." : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filteredCategories.map((c, i) => (
              <CategoryRow
                key={c.CategoryID}
                category={c}
                busy={categoryBusyId === c.CategoryID}
                onSave={handleSaveCategory}
                onDelete={setDeleteCategoryTarget}
                isLast={i === filteredCategories.length - 1}
              />
            ))}
          </ul>
        </div>
      )}
    </>
  );

  const renderContent = () => {
    if (tab === "companies") return sub === "verified" ? renderCompaniesVerified() : renderCompaniesPending();
    if (tab === "support") return sub === "resolved" ? renderSupportResolved() : renderSupportPending();
    if (tab === "users") return renderUsersAll();
    if (tab === "commissions") return renderUsersCommissions();
    if (tab === "ports") return renderPortsAll();
    if (tab === "categories") return renderCategoriesAll();
    return null;
  };

  return (
    <PublicLayout role="Admin">
      <div className="container" style={{ padding: "32px 24px 80px" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 32,
          }}
        >
          <div className="row">
            <button
              type="button" className="btn btn-secondary btn-sm"
              onClick={() => navigate("/admin/dashboard")}
            >
              <Icon name="arrow_left" size={14} /> Back to dashboard
            </button>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <h1 className="h2" style={{ margin: 0 }}>Takhlees Management</h1>
            <p className="muted" style={{ margin: "6px 0 0" }}>Companies, support tickets, users, and commissions.</p>
          </div>
        </header>

      {notice && (
        <div className="banner-success">
          <Icon name="check" size={16} />
          {notice}
        </div>
      )}

      <Reveal as="section" style={{ marginBottom: 24 }}>
        {/* Primary tabs */}
        <div
          role="tablist" aria-label="Management sections"
          style={{
            display: "flex", gap: 4, padding: 4,
            background: "var(--gray-50)", border: "1px solid var(--line)",
            borderRadius: 12, marginBottom: 20, flexWrap: "wrap",
          }}
        >
          {primaryTabs.map((t) => {
            const isActive = t.id === tab;
            return (
              <button
                key={t.id} type="button" role="tab" aria-selected={isActive}
                onClick={() => onTabChange(t.id)}
                style={{
                  flex: "1 1 0", minWidth: 140,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  gap: 8, border: "none", padding: "12px 18px", borderRadius: 10,
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
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
                    fontSize: 11, fontFamily: "var(--font-mono)",
                    background: isActive ? "var(--gray-100)" : "transparent",
                    color: isActive ? "var(--ink)" : "var(--ink-faint)",
                    padding: "1px 7px", borderRadius: 999,
                  }}
                >{t.count}</span>
              </button>
            );
          })}
        </div>

        {subTabs[tab]?.length > 1 && (
          <PillTabs tabs={subTabs[tab]} active={sub} onChange={onSubChange} />
        )}

        <div role="tabpanel">{renderContent()}</div>
      </Reveal>

      <ConfirmModal
        open={!!rejectTarget}
        title="Reject this company?"
        message={rejectTarget
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

      <ConfirmModal
        open={!!deletePortTarget}
        title="Delete this port?"
        message={deletePortTarget
          ? `“${deletePortTarget.PortName}” will be removed from the catalog and unlinked from all companies. Historical applications keep their snapshot.`
          : ""
        }
        confirmLabel="Delete port"
        cancelLabel="Cancel"
        variant="danger"
        busy={deletePortBusy}
        onConfirm={handleDeletePortConfirm}
        onCancel={() => { if (!deletePortBusy) setDeletePortTarget(null); }}
      />

      <ConfirmModal
        open={!!deleteCategoryTarget}
        title="Delete this category?"
        message={deleteCategoryTarget
          ? `“${deleteCategoryTarget.Type}” will be removed from the catalog and unlinked from all companies' pricing. Historical applications keep their snapshot.`
          : ""
        }
        confirmLabel="Delete category"
        cancelLabel="Cancel"
        variant="danger"
        busy={deleteCategoryBusy}
        onConfirm={handleDeleteCategoryConfirm}
        onCancel={() => { if (!deleteCategoryBusy) setDeleteCategoryTarget(null); }}
      />

      <PrintableTable
        open={!!printConfig}
        onClose={() => setPrintConfig(null)}
        title={printConfig?.title || ""}
        subtitle={printConfig?.subtitle || ""}
        columns={printConfig?.columns || []}
        rows={printConfig?.rows || []}
      />
      </div>
    </PublicLayout>
  );
}

export default AdminManagement;
