import React, { useEffect, useMemo, useState } from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import {
  listUsers,
  searchAdminTickets,
  resolveTicket,
  getPendingCompanies,
  getVerifiedCompanies,
} from "../../api/admin.js";
import { listApplications } from "../../api/applications.js";
import { listAllCompanyCategoryPricing } from "../../api/companyCategories.js";
import { listPorts, createPort, updatePort, deletePort } from "../../api/ports.js";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../../api/categories.js";

const TABS = [
  { id: "clients",      label: "Clients" },
  { id: "companies",    label: "Companies" },
  { id: "applications", label: "Applications" },
  { id: "services",     label: "Service prices" },
  { id: "ports",        label: "Ports" },
  { id: "categories",   label: "Categories" },
  { id: "tickets",      label: "Support tickets" },
];

const CLIENT_FIELDS = [
  { value: "all",         label: "All fields" },
  { value: "UserID",      label: "User ID" },
  { value: "FirstName",   label: "First name" },
  { value: "LastName",    label: "Last name" },
  { value: "Email",       label: "Email" },
  { value: "PhoneNumber", label: "Phone number" },
  { value: "NationalID",  label: "National ID" },
  { value: "Address",     label: "Address" },
];

// EstDate is intentionally excluded — it has its own separate date input
const PORT_FIELDS = [
  { value: "all",      label: "All fields" },
  { value: "PortID",   label: "Port ID" },
  { value: "PortName", label: "Port name" },
  { value: "PortType", label: "Port type" },
];

const CAT_FIELDS = [
  { value: "all",        label: "All fields" },
  { value: "CategoryID", label: "Category ID" },
  { value: "Type",       label: "Service type" },
];

/* Every column in the company table except ComReg (the registration
   document URL) and LogoUrl (the profile pic) — both are media/binary
   fields, not free-text searchable. */
const COMPANY_FIELDS = [
  { value: "all",              label: "All fields" },
  { value: "CompanyID",        label: "Company ID" },
  { value: "Name",             label: "Name" },
  { value: "ContactEmail",     label: "Contact email" },
  { value: "TaxNumber",        label: "Tax number" },
  { value: "Governorate",      label: "Governorate" },
  { value: "Address",          label: "Address" },
  { value: "About",            label: "About" },
  { value: "Comm",             label: "Commission %" },
  { value: "FoundingDate",     label: "Founding date" },
  { value: "RegistrationDate", label: "Registration date" },
  { value: "VerficationStatus", label: "Verification status" },
];

const COMPANY_SEARCH_KEYS = COMPANY_FIELDS
  .filter((f) => f.value !== "all")
  .map((f) => f.value);

/* Application search uses the enriched columns returned by
   GET /application (ClientName, CategoryName, PortName, CompanyName,
   Amount) on top of the bare application columns. */
const APPLICATION_FIELDS = [
  { value: "all",             label: "All fields" },
  { value: "ApplicationID",   label: "Application ID" },
  { value: "TrackingNumber",  label: "Tracking number" },
  { value: "ACID",            label: "ACID" },
  { value: "Status",          label: "Status" },
  { value: "PaymentType",     label: "Payment type" },
  { value: "DeliveryAddress", label: "Delivery address" },
  { value: "ClientID",        label: "Client ID" },
  { value: "ClientName",      label: "Client name" },
  { value: "CompanyID",       label: "Company ID" },
  { value: "CompanyName",     label: "Company name" },
  { value: "CategoryID",      label: "Category ID" },
  { value: "CategoryName",    label: "Service category" },
  { value: "PortID",          label: "Port ID" },
  { value: "PortName",        label: "Port name" },
  { value: "PortType",        label: "Port type" },
  { value: "Amount",          label: "Amount" },
  { value: "SubmissionDate",  label: "Submission date" },
  { value: "CompletionDate",  label: "Completion date" },
];

const APPLICATION_SEARCH_KEYS = APPLICATION_FIELDS
  .filter((f) => f.value !== "all")
  .map((f) => f.value);

const SERVICE_FIELDS = [
  { value: "all",          label: "All fields" },
  { value: "CompanyID",    label: "Company ID" },
  { value: "CompanyName",  label: "Company name" },
  { value: "CategoryID",   label: "Category ID" },
  { value: "CategoryName", label: "Service category" },
  { value: "Price",        label: "Price" },
];

const SERVICE_SEARCH_KEYS = SERVICE_FIELDS
  .filter((f) => f.value !== "all")
  .map((f) => f.value);

const APPLICATION_STATUS_BADGES = {
  "Pending":     "badge-pending",
  "Accepted":    "badge-info",
  "In Progress": "badge-info",
  "Completed":   "badge-success",
  "Rejected":    "badge-danger",
};

const dateToInput = (v) => {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const fullName = (first, last) => [first, last].filter(Boolean).join(" ").trim();

const initials2 = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

// ── Shared sub-components ─────────────────────────────────────────

function FilterBar({ fields, field, onField, query, onQuery, placeholder, extra }) {
  return (
    <div className="card" style={{ padding: 14, marginBottom: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
      <select
        className="select"
        style={{ height: 38, fontSize: 13, flex: "0 0 auto", minWidth: 150 }}
        value={field}
        onChange={(e) => onField(e.target.value)}
      >
        {fields.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
      <div className="input-with-icon" style={{ flex: 1, minWidth: 200 }}>
        <span className="input-icon"><Icon name="search" size={16} /></span>
        <input className="input" placeholder={placeholder} value={query} onChange={(e) => onQuery(e.target.value)} />
      </div>
      {extra}
    </div>
  );
}

function DeleteConfirmButtons({ onCancel, onConfirm, busy }) {
  return (
    <>
      <span style={{ fontSize: 12, color: "var(--ink-faint)", alignSelf: "center" }}>Delete?</span>
      <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>Cancel</button>
      <button
        className="btn btn-sm"
        style={{ background: "var(--signal-stop,#dc2626)", color: "#fff", border: "1px solid var(--signal-stop,#dc2626)" }}
        onClick={onConfirm}
        disabled={busy}
      >
        {busy ? <ContainerSpinner inline size={14} label="Deleting…" /> : "Confirm"}
      </button>
    </>
  );
}

// ── Clients tab ───────────────────────────────────────────────────

function ClientsTab() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [field, setField] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    listUsers()
      .then((data) => {
        const all = Array.isArray(data) ? data : [];
        setClients(all.filter((u) => u.Type === "C"));
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    const keys = field === "all"
      ? ["UserID", "FirstName", "LastName", "Email", "PhoneNumber", "NationalID", "Address"]
      : [field];
    return clients.filter((c) => keys.some((k) => String(c[k] ?? "").toLowerCase().includes(q)));
  }, [clients, field, query]);

  return (
    <section>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <span className="eyebrow">Directory</span>
          <h2 className="h3" style={{ fontSize: 20 }}>Client search</h2>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          {query.trim() ? `${filtered.length} of ${clients.length}` : `${clients.length} total`}
        </span>
      </div>

      <FilterBar
        fields={CLIENT_FIELDS}
        field={field} onField={setField}
        query={query} onQuery={setQuery}
        placeholder="Type to search clients…"
      />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={60} label="Loading clients" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <Icon name="user" size={24} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>
            {clients.length === 0 ? "No clients registered yet" : "No clients match"}
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            {clients.length === 0 ? "Client accounts will appear here once users sign up." : "Try a different field or search term."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filtered.map((c, i) => {
              const name = fullName(c.FirstName, c.LastName);
              return (
                <li
                  key={c.UserID}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 20px",
                    borderBottom: i === filtered.length - 1 ? "none" : "1px solid var(--gray-100)",
                  }}
                >
                  <div className="avatar">{initials2(name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>{name || "—"}</span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", padding: "1px 6px", borderRadius: "var(--radius-xs)", background: "var(--steel-100)", border: "1px solid var(--line)" }}>
                        #{c.UserID}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {c.Email && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="email" size={11} />{c.Email}</span>}
                      {c.PhoneNumber && <><span style={{ color: "var(--gray-300)" }}>·</span><span>{c.PhoneNumber}</span></>}
                      {c.NationalID && <><span style={{ color: "var(--gray-300)" }}>·</span><span>ID {c.NationalID}</span></>}
                      {c.Address && <><span style={{ color: "var(--gray-300)" }}>·</span><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="pin" size={11} />{c.Address}</span></>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Companies tab ─────────────────────────────────────────────────

function CompaniesTab() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [field, setField] = useState("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    setLoading(true);
    /* Combine pending + verified into a single roster. Rejected
       companies aren't surfaced by either endpoint today, so the
       result is "everything an admin would want to find". */
    Promise.all([
      getVerifiedCompanies().catch(() => null),
      getPendingCompanies().catch(() => null),
    ])
      .then(([verifiedRes, pendingRes]) => {
        const verified = Array.isArray(verifiedRes?.data) ? verifiedRes.data : [];
        const pending  = Array.isArray(pendingRes?.data)  ? pendingRes.data  : [];
        setCompanies([...verified, ...pending]);
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = companies;
    if (status !== "all") {
      result = result.filter((c) => String(c.VerficationStatus) === status);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      const keys = field === "all" ? COMPANY_SEARCH_KEYS : [field];
      result = result.filter((c) =>
        keys.some((k) => String(c[k] ?? "").toLowerCase().includes(q))
      );
    }
    return result;
  }, [companies, field, query, status]);

  const filtering = query.trim() || status !== "all";

  return (
    <section>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <span className="eyebrow">Marketplace</span>
          <h2 className="h3" style={{ fontSize: 20 }}>Company search</h2>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          {filtering ? `${filtered.length} of ${companies.length}` : `${companies.length} total`}
        </span>
      </div>

      <FilterBar
        fields={COMPANY_FIELDS}
        field={field} onField={setField}
        query={query} onQuery={setQuery}
        placeholder="Search companies…"
        extra={
          <select
            className="select"
            style={{ height: 38, fontSize: 13, flex: "0 0 auto", minWidth: 150 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Any status</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
          </select>
        }
      />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={60} label="Loading companies" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <Icon name="shield" size={24} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>
            {companies.length === 0 ? "No companies registered yet" : "No companies match"}
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            {companies.length === 0
              ? "Companies will appear here once they sign up."
              : "Try a different field, search term, or status."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filtered.map((c, i) => {
              const isVerified = String(c.VerficationStatus) === "Verified";
              return (
                <li
                  key={c.CompanyID}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "14px 20px",
                    borderBottom: i === filtered.length - 1 ? "none" : "1px solid var(--gray-100)",
                  }}
                >
                  <div className="avatar">{initials2(c.Name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>
                        {c.Name || "—"}
                      </span>
                      <span className="mono" style={{
                        fontSize: 11, color: "var(--ink-faint)",
                        padding: "1px 6px", borderRadius: "var(--radius-xs)",
                        background: "var(--steel-100)", border: "1px solid var(--line)",
                      }}>
                        #{c.CompanyID}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {c.ContactEmail && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Icon name="email" size={11} />{c.ContactEmail}
                        </span>
                      )}
                      {c.TaxNumber && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>Tax #{c.TaxNumber}</span></>)}
                      {c.Governorate && (
                        <>
                          <span style={{ color: "var(--gray-300)" }}>·</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Icon name="pin" size={11} />{c.Governorate}
                          </span>
                        </>
                      )}
                      {c.Address && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>{c.Address}</span></>)}
                      {c.Comm != null && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>{Number(c.Comm)}% comm.</span></>)}
                      {c.FoundingDate && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>Founded {dateToInput(c.FoundingDate)}</span></>)}
                      {c.RegistrationDate && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>Joined {dateToInput(c.RegistrationDate)}</span></>)}
                    </div>
                    {c.About && (
                      <p className="muted" style={{ fontSize: 12, margin: "6px 0 0", lineHeight: 1.5, maxWidth: 640 }}>
                        {c.About}
                      </p>
                    )}
                  </div>
                  {/* Fixed-width slot, vertically centered against the row,
                      so the badge column is identical for every company
                      regardless of name length or whether About is shown. */}
                  <div style={{
                    flex: "0 0 110px",
                    alignSelf: "center",
                    display: "flex",
                    justifyContent: "center",
                  }}>
                    <span className={`badge ${isVerified ? "badge-success" : "badge-pending"}`}>
                      <span className="dot" />{isVerified ? "Verified" : "Pending"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Applications tab ──────────────────────────────────────────────

function ApplicationsTab() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [field, setField] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    /* GET /application with no filters returns every application
       enriched with ClientName, CompanyName, CategoryName, PortName,
       PortType, and the summed payment Amount — exactly the fields the
       admin would want to search by. */
    listApplications()
      .then((d) => setApps(Array.isArray(d) ? d : []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apps;
    const keys = field === "all" ? APPLICATION_SEARCH_KEYS : [field];
    return apps.filter((a) =>
      keys.some((k) => String(a[k] ?? "").toLowerCase().includes(q))
    );
  }, [apps, field, query]);

  return (
    <section>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <span className="eyebrow">Operations</span>
          <h2 className="h3" style={{ fontSize: 20 }}>Application search</h2>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          {query.trim() ? `${filtered.length} of ${apps.length}` : `${apps.length} total`}
        </span>
      </div>

      <FilterBar
        fields={APPLICATION_FIELDS}
        field={field} onField={setField}
        query={query} onQuery={setQuery}
        placeholder="Search applications…"
      />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={60} label="Loading applications" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <Icon name="package" size={24} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>
            {apps.length === 0 ? "No applications yet" : "No applications match"}
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            {apps.length === 0
              ? "Applications will appear here as clients submit them."
              : "Try a different field or search term."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filtered.map((a, i) => {
              const status = String(a.Status || "Pending");
              const badgeClass = APPLICATION_STATUS_BADGES[status] || "badge-info";
              const amount = Number(a.Amount);
              return (
                <li
                  key={a.ApplicationID}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "14px 20px",
                    borderBottom: i === filtered.length - 1 ? "none" : "1px solid var(--gray-100)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: "var(--navy)", fontWeight: 600, fontSize: 14 }}>
                        {a.TrackingNumber || "—"}
                      </span>
                      <span className="mono" style={{
                        fontSize: 11, color: "var(--ink-faint)",
                        padding: "1px 6px", borderRadius: "var(--radius-xs)",
                        background: "var(--steel-100)", border: "1px solid var(--line)",
                      }}>
                        #{a.ApplicationID}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {a.ClientName && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Icon name="user" size={11} />{a.ClientName}
                        </span>
                      )}
                      {a.CompanyName && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>{a.CompanyName}</span></>)}
                      {a.CategoryName && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>{a.CategoryName}</span></>)}
                      {a.PortName && (
                        <>
                          <span style={{ color: "var(--gray-300)" }}>·</span>
                          <span>{a.PortName}{a.PortType ? ` (${a.PortType})` : ""}</span>
                        </>
                      )}
                      {a.ACID && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>ACID {a.ACID}</span></>)}
                      {a.PaymentType && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>{a.PaymentType}</span></>)}
                      {amount > 0 && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>EGP {amount.toLocaleString()}</span></>)}
                      {a.SubmissionDate && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>Filed {dateToInput(a.SubmissionDate)}</span></>)}
                      {a.CompletionDate && (<><span style={{ color: "var(--gray-300)" }}>·</span><span>Completed {dateToInput(a.CompletionDate)}</span></>)}
                    </div>
                    {a.DeliveryAddress && (
                      <p className="muted" style={{ fontSize: 12, margin: "6px 0 0", lineHeight: 1.5, maxWidth: 640, display: "inline-flex", gap: 6, alignItems: "flex-start" }}>
                        <Icon name="pin" size={11} /> {a.DeliveryAddress}
                      </p>
                    )}
                  </div>
                  <div style={{
                    flex: "0 0 130px",
                    alignSelf: "center",
                    display: "flex",
                    justifyContent: "center",
                  }}>
                    <span className={`badge ${badgeClass}`}>
                      <span className="dot" />{status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Service prices tab (CompanyCategory) ──────────────────────────

function ServicesTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [field, setField] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    /* The /companycategory listing returns bare rows (CompanyID,
       CategoryID, Price). Build CompanyName / CategoryName lookup maps
       from the companies and categories endpoints, then enrich each
       row client-side. */
    Promise.all([
      listAllCompanyCategoryPricing().catch(() => []),
      getVerifiedCompanies().catch(() => null),
      getPendingCompanies().catch(() => null),
      listCategories().catch(() => []),
    ])
      .then(([pricing, verifiedRes, pendingRes, cats]) => {
        const verified  = Array.isArray(verifiedRes?.data) ? verifiedRes.data : [];
        const pending   = Array.isArray(pendingRes?.data)  ? pendingRes.data  : [];
        const companies = [...verified, ...pending];
        const companyById  = Object.fromEntries(companies.map((c) => [String(c.CompanyID), c]));
        const categoryById = Object.fromEntries(
          (Array.isArray(cats) ? cats : []).map((c) => [String(c.CategoryID), c])
        );
        const enriched = (Array.isArray(pricing) ? pricing : []).map((r) => ({
          CompanyID:    r.CompanyID,
          CategoryID:   r.CategoryID,
          Price:        r.Price,
          CompanyName:  companyById[String(r.CompanyID)]?.Name || "",
          CategoryName: categoryById[String(r.CategoryID)]?.Type || r.Type || "",
        }));
        setRows(enriched);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const keys = field === "all" ? SERVICE_SEARCH_KEYS : [field];
    return rows.filter((r) =>
      keys.some((k) => String(r[k] ?? "").toLowerCase().includes(q))
    );
  }, [rows, field, query]);

  return (
    <section>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <span className="eyebrow">Pricing</span>
          <h2 className="h3" style={{ fontSize: 20 }}>Service price search</h2>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          {query.trim() ? `${filtered.length} of ${rows.length}` : `${rows.length} total`}
        </span>
      </div>

      <FilterBar
        fields={SERVICE_FIELDS}
        field={field} onField={setField}
        query={query} onQuery={setQuery}
        placeholder="Search by company, category or price…"
      />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={60} label="Loading service prices" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <Icon name="receipt" size={24} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>
            {rows.length === 0 ? "No service prices yet" : "No prices match"}
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            {rows.length === 0
              ? "Once companies list their service categories, prices show up here."
              : "Try a different field or search term."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1.2fr 160px",
            gap: 12,
            padding: "10px 20px",
            borderBottom: "1px solid var(--gray-100)",
            fontSize: 11, fontWeight: 600, color: "var(--ink-faint)",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            <span>Company</span>
            <span>Service category</span>
            <span style={{ textAlign: "right" }}>Price (EGP)</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filtered.map((r, i) => (
              <li
                key={`${r.CompanyID}-${r.CategoryID}`}
                style={{ borderBottom: i === filtered.length - 1 ? "none" : "1px solid var(--gray-100)" }}
              >
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1.2fr 160px",
                  gap: 12,
                  alignItems: "center",
                  padding: "14px 20px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div className="avatar">{initials2(r.CompanyName)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: "var(--navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.CompanyName || "—"}
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>#{r.CompanyID}</div>
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: "var(--navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.CategoryName || "—"}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>#{r.CategoryID}</div>
                  </div>
                  <div className="mono tabular" style={{ textAlign: "right", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                    EGP {Number(r.Price).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Ports tab ─────────────────────────────────────────────────────

function PortsTab() {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [field, setField] = useState("all");
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [newPort, setNewPort] = useState({ PortName: "", PortType: "Air", EstDate: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ PortName: "", PortType: "Air", EstDate: "" });
  const [busyId, setBusyId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [notice, setNotice] = useState("");

  const showNotice = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 3500); };

  const load = () => {
    setLoading(true);
    return listPorts()
      .then((d) => setPorts(Array.isArray(d) ? d : []))
      .catch(() => setPorts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let result = ports;
    const q = query.trim().toLowerCase();
    if (q) {
      const keys = field === "all" ? ["PortID", "PortName", "PortType"] : [field];
      result = result.filter((p) => keys.some((k) => String(p[k] ?? "").toLowerCase().includes(q)));
    }
    if (dateFilter) {
      result = result.filter((p) => dateToInput(p.EstDate) === dateFilter);
    }
    return result;
  }, [ports, field, query, dateFilter]);

  const handleAdd = async () => {
    if (!newPort.PortName.trim() || !newPort.EstDate) return;
    setBusyId("new");
    try {
      await createPort(newPort);
      setAdding(false);
      setNewPort({ PortName: "", PortType: "Air", EstDate: "" });
      await load();
      showNotice("Port added.");
    } catch (err) {
      showNotice(err?.response?.data?.Message || "Couldn't add port.");
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (p) => {
    setDeleteConfirmId(null);
    setEditingId(p.PortID);
    setEditForm({ PortName: p.PortName, PortType: p.PortType, EstDate: dateToInput(p.EstDate) });
  };

  const handleUpdate = async () => {
    if (!editForm.PortName.trim() || !editForm.EstDate) return;
    setBusyId(editingId);
    try {
      await updatePort(editingId, editForm);
      setEditingId(null);
      await load();
      showNotice("Port updated.");
    } catch (err) {
      showNotice(err?.response?.data?.Message || "Couldn't update port.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    setBusyId(id);
    try {
      await deletePort(id);
      setDeleteConfirmId(null);
      await load();
      showNotice("Port deleted.");
    } catch (err) {
      showNotice(err?.response?.data?.Message || "Couldn't delete port — it may still be in use.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <span className="eyebrow">Infrastructure</span>
          <h2 className="h3" style={{ fontSize: 20 }}>Ports</h2>
        </div>
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 13 }}>
            {(query.trim() || dateFilter) ? `${filtered.length} of ${ports.length}` : `${ports.length} total`}
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => { setAdding((v) => !v); setEditingId(null); setDeleteConfirmId(null); }}>
            <Icon name="check" size={13} /> {adding ? "Cancel" : "Add port"}
          </button>
        </div>
      </div>

      {notice && <div className="banner-success" style={{ marginBottom: 12 }}><Icon name="check" size={14} />{notice}</div>}

      <FilterBar
        fields={PORT_FIELDS}
        field={field} onField={setField}
        query={query} onQuery={setQuery}
        placeholder="Search by ID, name or type…"
        extra={
          <label className="field" style={{ margin: 0, display: "flex", flexDirection: "column", gap: 2, flex: "0 0 auto" }}>
            <span className="field-label" style={{ fontSize: 11 }}>Est. date</span>
            <input
              className="input"
              type="date"
              style={{ height: 38, minWidth: 160 }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </label>
        }
      />

      {adding && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 12, background: "var(--steel-50,#f8f9fb)" }}>
          <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label className="field" style={{ flex: "2 1 180px", margin: 0 }}>
              <span className="field-label">Port name</span>
              <input className="input" value={newPort.PortName} onChange={(e) => setNewPort((p) => ({ ...p, PortName: e.target.value }))} placeholder="e.g. Alexandria" />
            </label>
            <label className="field" style={{ flex: "1 1 120px", margin: 0 }}>
              <span className="field-label">Type</span>
              <select className="select" style={{ height: 40 }} value={newPort.PortType} onChange={(e) => setNewPort((p) => ({ ...p, PortType: e.target.value }))}>
                <option value="Air">Air</option>
                <option value="Sea">Sea</option>
              </select>
            </label>
            <label className="field" style={{ flex: "1 1 150px", margin: 0 }}>
              <span className="field-label">Est. date</span>
              <input className="input" type="date" value={newPort.EstDate} onChange={(e) => setNewPort((p) => ({ ...p, EstDate: e.target.value }))} />
            </label>
            <button
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0, height: 40 }}
              disabled={!newPort.PortName.trim() || !newPort.EstDate || busyId === "new"}
              onClick={handleAdd}
            >
              {busyId === "new" ? <ContainerSpinner inline size={14} label="Saving…" /> : <><Icon name="check" size={14} /> Save</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={60} label="Loading ports" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <Icon name="ship" size={24} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>{ports.length === 0 ? "No ports yet" : "No ports match"}</h3>
          <p className="muted" style={{ margin: 0 }}>{ports.length === 0 ? "Add the first port above." : "Try a different search or clear the date filter."}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 120px 180px", gap: 12, padding: "10px 20px", borderBottom: "1px solid var(--gray-100)", fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span>ID</span><span>Name</span><span>Type</span><span>Est. date</span><span style={{ textAlign: "right" }}>Actions</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filtered.map((p, i) => {
              const isEditing = editingId === p.PortID;
              const isConfirm = deleteConfirmId === p.PortID;
              const isBusy = busyId === p.PortID;
              return (
                <li key={p.PortID} style={{ borderBottom: i === filtered.length - 1 ? "none" : "1px solid var(--gray-100)" }}>
                  {isEditing ? (
                    <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end", padding: "12px 20px", background: "var(--steel-50,#f8f9fb)" }}>
                      <input className="input" style={{ flex: "2 1 160px" }} value={editForm.PortName} onChange={(e) => setEditForm((v) => ({ ...v, PortName: e.target.value }))} placeholder="Port name" />
                      <select className="select" style={{ flex: "1 1 110px", height: 40 }} value={editForm.PortType} onChange={(e) => setEditForm((v) => ({ ...v, PortType: e.target.value }))}>
                        <option value="Air">Air</option>
                        <option value="Sea">Sea</option>
                      </select>
                      <input className="input" type="date" style={{ flex: "1 1 140px" }} value={editForm.EstDate} onChange={(e) => setEditForm((v) => ({ ...v, EstDate: e.target.value }))} />
                      <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)} disabled={isBusy}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={handleUpdate} disabled={!editForm.PortName.trim() || !editForm.EstDate || isBusy}>
                          {isBusy ? <ContainerSpinner inline size={14} label="Saving…" /> : <><Icon name="check" size={14} /> Save</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 120px 180px", gap: 12, alignItems: "center", padding: "14px 20px" }}>
                      <span className="mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>#{p.PortID}</span>
                      <span style={{ fontWeight: 500, fontSize: 14, color: "var(--navy)" }}>{p.PortName}</span>
                      <span>
                        <span className={`badge ${p.PortType === "Air" ? "badge-info" : "badge-success"}`}>
                          <span className="dot" />{p.PortType}
                        </span>
                      </span>
                      <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{dateToInput(p.EstDate) || "—"}</span>
                      <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                        {isConfirm ? (
                          <DeleteConfirmButtons onCancel={() => setDeleteConfirmId(null)} onConfirm={() => handleDelete(p.PortID)} busy={isBusy} />
                        ) : (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)} disabled={isBusy}><Icon name="doc" size={13} /> Edit</button>
                            <button className="btn btn-ghost btn-sm" style={{ color: "var(--signal-stop,#dc2626)" }} onClick={() => { setEditingId(null); setDeleteConfirmId(p.PortID); }} disabled={isBusy}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Categories tab ────────────────────────────────────────────────

function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [field, setField] = useState("all");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState({ Type: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ Type: "" });
  const [busyId, setBusyId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [notice, setNotice] = useState("");

  const showNotice = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 3500); };

  const load = () => {
    setLoading(true);
    return listCategories()
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    const keys = field === "all" ? ["CategoryID", "Type"] : [field];
    return categories.filter((c) => keys.some((k) => String(c[k] ?? "").toLowerCase().includes(q)));
  }, [categories, field, query]);

  const handleAdd = async () => {
    if (!newCat.Type.trim()) return;
    setBusyId("new");
    try {
      await createCategory(newCat);
      setAdding(false);
      setNewCat({ Type: "" });
      await load();
      showNotice("Category added.");
    } catch (err) {
      showNotice(err?.response?.data?.Message || "Couldn't add category.");
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (c) => {
    setDeleteConfirmId(null);
    setEditingId(c.CategoryID);
    setEditForm({ Type: c.Type });
  };

  const handleUpdate = async () => {
    if (!editForm.Type.trim()) return;
    setBusyId(editingId);
    try {
      await updateCategory(editingId, editForm);
      setEditingId(null);
      await load();
      showNotice("Category updated.");
    } catch (err) {
      showNotice(err?.response?.data?.Message || "Couldn't update category.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    setBusyId(id);
    try {
      await deleteCategory(id);
      setDeleteConfirmId(null);
      await load();
      showNotice("Category deleted.");
    } catch (err) {
      showNotice(err?.response?.data?.Message || "Couldn't delete category — it may still be in use.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <span className="eyebrow">Services</span>
          <h2 className="h3" style={{ fontSize: 20 }}>Categories</h2>
        </div>
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 13 }}>
            {query.trim() ? `${filtered.length} of ${categories.length}` : `${categories.length} total`}
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => { setAdding((v) => !v); setEditingId(null); setDeleteConfirmId(null); }}>
            <Icon name="check" size={13} /> {adding ? "Cancel" : "Add category"}
          </button>
        </div>
      </div>

      {notice && <div className="banner-success" style={{ marginBottom: 12 }}><Icon name="check" size={14} />{notice}</div>}

      <FilterBar
        fields={CAT_FIELDS}
        field={field} onField={setField}
        query={query} onQuery={setQuery}
        placeholder="Search categories…"
      />

      {adding && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 12, background: "var(--steel-50,#f8f9fb)" }}>
          <div className="row" style={{ gap: 10, alignItems: "flex-end" }}>
            <label className="field" style={{ flex: 1, margin: 0 }}>
              <span className="field-label">Service type</span>
              <input className="input" value={newCat.Type} onChange={(e) => setNewCat({ Type: e.target.value })} placeholder="e.g. Customs Clearance" />
            </label>
            <button
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0, height: 40 }}
              disabled={!newCat.Type.trim() || busyId === "new"}
              onClick={handleAdd}
            >
              {busyId === "new" ? <ContainerSpinner inline size={14} label="Saving…" /> : <><Icon name="check" size={14} /> Save</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={60} label="Loading categories" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <Icon name="package" size={24} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>{categories.length === 0 ? "No categories yet" : "No categories match"}</h3>
          <p className="muted" style={{ margin: 0 }}>{categories.length === 0 ? "Add the first service category above." : "Try a different search."}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 200px", gap: 12, padding: "10px 20px", borderBottom: "1px solid var(--gray-100)", fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span>ID</span><span>Service type</span><span style={{ textAlign: "right" }}>Actions</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {filtered.map((c, i) => {
              const isEditing = editingId === c.CategoryID;
              const isConfirm = deleteConfirmId === c.CategoryID;
              const isBusy = busyId === c.CategoryID;
              return (
                <li key={c.CategoryID} style={{ borderBottom: i === filtered.length - 1 ? "none" : "1px solid var(--gray-100)" }}>
                  {isEditing ? (
                    <div className="row" style={{ gap: 10, alignItems: "center", padding: "12px 20px", background: "var(--steel-50,#f8f9fb)" }}>
                      <span className="mono" style={{ fontSize: 12, color: "var(--ink-faint)", flexShrink: 0 }}>#{c.CategoryID}</span>
                      <input className="input" style={{ flex: 1 }} value={editForm.Type} onChange={(e) => setEditForm({ Type: e.target.value })} placeholder="Service type" />
                      <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)} disabled={isBusy}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={handleUpdate} disabled={!editForm.Type.trim() || isBusy}>
                          {isBusy ? <ContainerSpinner inline size={14} label="Saving…" /> : <><Icon name="check" size={14} /> Save</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 200px", gap: 12, alignItems: "center", padding: "14px 20px" }}>
                      <span className="mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>#{c.CategoryID}</span>
                      <span style={{ fontWeight: 500, fontSize: 14, color: "var(--navy)" }}>{c.Type}</span>
                      <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                        {isConfirm ? (
                          <DeleteConfirmButtons onCancel={() => setDeleteConfirmId(null)} onConfirm={() => handleDelete(c.CategoryID)} busy={isBusy} />
                        ) : (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)} disabled={isBusy}><Icon name="doc" size={13} /> Edit</button>
                            <button className="btn btn-ghost btn-sm" style={{ color: "var(--signal-stop,#dc2626)" }} onClick={() => { setEditingId(null); setDeleteConfirmId(c.CategoryID); }} disabled={isBusy}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────

// ── Tickets tab ───────────────────────────────────────────────────

function TicketsTab() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState("");

  const [q, setQ] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [clientId, setClientId] = useState("");
  const [adminId, setAdminId] = useState("");
  const [resolved, setResolved] = useState("");

  const showNotice = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 3500); };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      if (q.trim())      params.q        = q.trim();
      if (ticketId)      params.ticketId = ticketId;
      if (clientId)      params.clientId = clientId;
      if (adminId)       params.adminId  = adminId;
      if (resolved !== "") params.resolved = resolved;
      const res = await searchAdminTickets(params);
      setTickets(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (ticketId) => {
    setBusyId(ticketId);
    try {
      await resolveTicket(ticketId);
      setTickets((prev) =>
        prev.map((t) => t.TicketID === ticketId ? { ...t, Resolved: 1 } : t)
      );
      showNotice("Ticket marked as resolved.");
    } catch {
      showNotice("Couldn't resolve the ticket.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <div style={{ marginBottom: 14 }}>
        <span className="eyebrow">Support</span>
        <h2 className="h3" style={{ fontSize: 20 }}>Ticket search</h2>
      </div>

      {/* Filter controls */}
      <div className="card" style={{ padding: 16, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <div className="input-with-icon" style={{ flex: "2 1 200px" }}>
          <span className="input-icon"><Icon name="search" size={16} /></span>
          <input
            className="input"
            placeholder="Search issue text…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div style={{ display: "flex", gap: 8, flex: "1 1 300px", flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 90 }}
            placeholder="Ticket ID"
            inputMode="numeric"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value.replace(/\D/g, ""))}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 90 }}
            placeholder="Client ID"
            inputMode="numeric"
            value={clientId}
            onChange={(e) => setClientId(e.target.value.replace(/\D/g, ""))}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 90 }}
            placeholder="Admin ID"
            inputMode="numeric"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <select
          className="select"
          style={{ height: 38, fontSize: 13, flex: "0 0 auto", minWidth: 140 }}
          value={resolved}
          onChange={(e) => setResolved(e.target.value)}
        >
          <option value="">Any status</option>
          <option value="0">Open (unresolved)</option>
          <option value="1">Resolved</option>
        </select>
        <button className="btn btn-primary btn-sm" style={{ height: 38, flexShrink: 0 }} onClick={handleSearch} disabled={loading}>
          {loading ? <ContainerSpinner inline size={14} label="Searching…" /> : "Search"}
        </button>
      </div>

      {notice && (
        <div className="banner-success" style={{ marginBottom: 12 }}>
          <Icon name="check" size={14} />{notice}
        </div>
      )}

      {!searched ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <Icon name="search" size={24} color="var(--ink-faint)" />
          <p className="muted" style={{ margin: "12px 0 0" }}>Enter filters above and click Search.</p>
        </div>
      ) : loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <ContainerSpinner size={60} label="Loading tickets" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <Icon name="bell" size={24} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>No tickets found</h3>
          <p className="muted" style={{ margin: 0 }}>Try adjusting the filters.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="muted" style={{ fontSize: 12, padding: "8px 16px", borderBottom: "1px solid var(--gray-100)" }}>
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} found
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {tickets.map((t, i) => {
              const isResolved = Number(t.Resolved) === 1;
              const clientName = fullName(t.ClientFirstName, t.ClientLastName) || `Client #${t.ClientID}`;
              const adminName  = fullName(t.AdminFirstName, t.AdminLastName);
              return (
                <li
                  key={t.TicketID}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "16px 20px",
                    borderBottom: i === tickets.length - 1 ? "none" : "1px solid var(--gray-100)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>#{t.TicketID}</span>
                      <strong style={{ fontSize: 13, color: "var(--navy)" }}>{clientName}</strong>
                      {t.ClientEmail && <span className="muted" style={{ fontSize: 12 }}>{t.ClientEmail}</span>}
                      {isResolved
                        ? <span className="badge badge-success"><span className="dot" />Resolved</span>
                        : <span className="badge badge-pending"><span className="dot" />Open</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--gray-800)", lineHeight: 1.5 }}>{t.Issue}</p>
                    {isResolved && adminName && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        Resolved by <strong style={{ color: "var(--navy)" }}>{adminName}</strong>
                      </div>
                    )}
                  </div>
                  {!isResolved && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flexShrink: 0 }}
                      disabled={busyId === t.TicketID}
                      onClick={() => handleResolve(t.TicketID)}
                    >
                      {busyId === t.TicketID
                        ? <ContainerSpinner inline size={14} label="Resolving…" />
                        : <><Icon name="check" size={13} /> Resolve</>}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function AdminManagement() {
  const [activeTab, setActiveTab] = useState("clients");

  return (
    <PublicLayout
      title="Data management"
      subtitle="Search clients, companies, applications and service prices, and manage ports and categories."
      role="Admin"
    >
      {/* Tab bar */}
      <div className="card" style={{ padding: "8px 12px", marginBottom: 28, display: "flex", gap: 6 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${activeTab === t.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "clients"      && <ClientsTab />}
      {activeTab === "companies"    && <CompaniesTab />}
      {activeTab === "applications" && <ApplicationsTab />}
      {activeTab === "services"     && <ServicesTab />}
      {activeTab === "ports"        && <PortsTab />}
      {activeTab === "categories"   && <CategoriesTab />}
      {activeTab === "tickets"      && <TicketsTab />}
    </PublicLayout>
  );
}

export default AdminManagement;
