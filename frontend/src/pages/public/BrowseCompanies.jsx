import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import { listCompanies } from "../../api/companies.js";

const FALLBACK = [
  { CompanyID: 1, Name: "Cairo Clearance Co.", City: "Cairo", Rating: 4.8, Reviews: 142, Services: "Customs · Documentation", Specialty: "Imports" },
  { CompanyID: 2, Name: "Alex Maritime Logistics", City: "Alexandria", Rating: 4.6, Reviews: 98, Services: "Cargo · Customs", Specialty: "Bulk cargo" },
  { CompanyID: 3, Name: "Suez Port Solutions", City: "Suez", Rating: 4.4, Reviews: 76, Services: "Inspection · Documentation", Specialty: "Re-export" },
  { CompanyID: 4, Name: "Damietta Freight", City: "Damietta", Rating: 4.7, Reviews: 64, Services: "Cargo · Documentation", Specialty: "Exports" },
  { CompanyID: 5, Name: "Nile Customs Co.", City: "Cairo", Rating: 4.5, Reviews: 53, Services: "Customs · Inspection", Specialty: "Pharma" },
  { CompanyID: 6, Name: "Red Sea Cargo", City: "Hurghada", Rating: 4.3, Reviews: 41, Services: "Marine cargo", Specialty: "Personal effects" },
];

const FILTERS = ["All", "Cairo", "Alexandria", "Suez", "Damietta"];

function CompanyCard({ c }) {
  const initials = (c.Name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Link
      to={`/companies/${c.CompanyID}`}
      className="card card-hover"
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 12 }}>
          <div className="avatar avatar-lg">{initials || "T"}</div>
          <div>
            <div className="row" style={{ gap: 6, marginBottom: 4 }}>
              <span className="badge badge-success"><Icon name="shield" size={11} /> Verified</span>
            </div>
            <div className="row-title" style={{ fontSize: 16 }}>{c.Name}</div>
            <div className="muted" style={{ fontSize: 13 }}>{c.City || "—"}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="row" style={{ justifyContent: "flex-end", gap: 4, color: "var(--accent-dark)" }}>
            <Icon name="star" size={14} color="var(--accent)" />
            <strong style={{ color: "var(--navy)" }}>{c.Rating || "—"}</strong>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {c.Reviews ? `${c.Reviews} reviews` : "New"}
          </div>
        </div>
      </div>

      <hr className="divider" />

      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="muted" style={{ fontSize: 13 }}>{c.Services || "Logistics services"}</div>
        {c.Specialty && <span className="badge badge-neutral">{c.Specialty}</span>}
      </div>
    </Link>
  );
}

function BrowseCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listCompanies();
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        setCompanies(list.length ? list : FALLBACK);
      } catch {
        if (!active) return;
        setError("Couldn’t reach the server — showing sample listings.");
        setCompanies(FALLBACK);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      const cityOk = filter === "All" || c.City === filter;
      const text = `${c.Name} ${c.City} ${c.Services} ${c.Specialty || ""}`.toLowerCase();
      const queryOk = !query || text.includes(query.toLowerCase());
      return cityOk && queryOk;
    });
  }, [companies, filter, query]);

  return (
    <PublicLayout>
      <section style={{ background: "var(--paper)", padding: "48px 0 24px" }}>
        <div className="container">
          <span className="eyebrow">Marketplace</span>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 className="h2" style={{ marginBottom: 4 }}>Verified clearance companies</h1>
              <p className="muted" style={{ margin: 0 }}>
                {filtered.length} {filtered.length === 1 ? "company" : "companies"} matching your filters
              </p>
            </div>
            <div className="input-with-icon" style={{ width: 320, maxWidth: "100%" }}>
              <span className="input-icon"><Icon name="search" size={16} /></span>
              <input
                className="input"
                placeholder="Search by name, city, service…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="row" style={{ marginTop: 24 }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ padding: "32px 0 80px" }}>
        <div className="container">
          {error && <div className="banner-error"><Icon name="bell" size={16} />{error}</div>}

          {loading ? (
            <p className="muted">Loading companies…</p>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 48 }}>
              <p className="muted">No matches for your filters.</p>
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
              {filtered.map((c) => <CompanyCard key={c.CompanyID} c={c} />)}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

export default BrowseCompanies;
