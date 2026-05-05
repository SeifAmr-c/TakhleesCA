import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { listCompanies } from "../../api/companies.js";

function CompanyCard({ c }) {
  const initials = (c.Name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const about = c.About && c.About.trim() ? c.About.trim() : "";
  const aboutSnippet = about.length > 120 ? `${about.slice(0, 117)}…` : about;

  return (
    <Link
      to={`/companies/${c.CompanyID}`}
      className="card card-hover"
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 12 }}>
          {c.Logo ? (
            <img
              src={c.Logo}
              alt={`${c.Name} logo`}
              className="avatar avatar-lg"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="avatar avatar-lg">{initials || "T"}</div>
          )}
          <div>
            <div className="row" style={{ gap: 6, marginBottom: 4 }}>
              <span className="badge badge-success">
                <Icon name="shield" size={11} /> Verified
              </span>
            </div>
            <div className="row-title" style={{ fontSize: 16 }}>{c.Name}</div>
            <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>
              {c.Governorate || c.Address || "—"}
            </div>
          </div>
        </div>
      </div>

      <hr className="divider" />

      <div style={{ fontSize: 13, color: "var(--ink-soft)", minHeight: 38 }}>
        {aboutSnippet || "This company hasn't added a bio yet."}
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
        const data = await listCompanies({ status: "Verified" });
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        setCompanies(list);
      } catch {
        if (!active) return;
        setError("Couldn't reach the server. Please try again shortly.");
        setCompanies([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filters = useMemo(() => {
    const govs = Array.from(
      new Set(companies.map((c) => c.Governorate).filter(Boolean))
    ).sort();
    return ["All", ...govs];
  }, [companies]);

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      const govOk = filter === "All" || c.Governorate === filter;
      const text = `${c.Name || ""} ${c.Governorate || ""} ${c.Address || ""} ${c.About || ""}`.toLowerCase();
      const queryOk = !query || text.includes(query.toLowerCase());
      return govOk && queryOk;
    });
  }, [companies, filter, query]);

  return (
    <PublicLayout>
      <section
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          padding: "48px 0 24px",
        }}
      >
        <div className="container">
          <span className="eyebrow">Marketplace</span>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <h1 className="h2" style={{ marginBottom: 4 }}>
                Verified clearance companies
              </h1>
              <p style={{ margin: 0, color: "var(--ink-soft)" }}>
                {filtered.length} {filtered.length === 1 ? "company" : "companies"} matching your filters
              </p>
            </div>
            <div className="input-with-icon" style={{ width: 320, maxWidth: "100%" }}>
              <span className="input-icon"><Icon name="search" size={16} /></span>
              <input
                className="input"
                placeholder="Search by name, governorate, bio…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {filters.length > 1 && (
            <div className="row" style={{ marginTop: 24, flexWrap: "wrap" }}>
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ padding: "32px 0 80px" }}>
        <div className="container">
          {error && <div className="banner-error"><Icon name="bell" size={16} />{error}</div>}

          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "56px 0",
              }}
            >
              <ContainerSpinner size={88} label="Loading companies" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 48 }}>
              <p style={{ margin: 0, color: "var(--ink-soft)" }}>
                {companies.length === 0
                  ? "No verified companies are listed yet."
                  : "No matches for your filters."}
              </p>
            </div>
          ) : (
            <Reveal as="div">
              <div
                className="grid"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
              >
                {filtered.map((c) => <CompanyCard key={c.CompanyID} c={c} />)}
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

export default BrowseCompanies;
