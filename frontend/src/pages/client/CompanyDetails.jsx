import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { getCompany } from "../../api/companies.js";
import { useAuth } from "../../api/authState.js";

const FALLBACK = {
  CompanyID: 0,
  Name: "Sample Clearance Co.",
  City: "Cairo",
  Rating: 4.7,
  Reviews: 142,
  Services: "Customs clearance · Documentation · Cargo handling",
  Description:
    "Full-service port clearance with 12 years of experience handling commercial and personal shipments through Cairo and Alexandria ports.",
  Reviews_list: [
    { id: 1, name: "Ahmed M.", rating: 5, text: "Fast and professional. Cleared in 3 days." },
    { id: 2, name: "Sara K.", rating: 4, text: "Good communication throughout." },
    { id: 3, name: "Omar Y.", rating: 5, text: "Best experience I've had with a clearance company." },
  ],
  Categories: ["Imports", "Exports", "Personal effects", "Re-export"],
  Stats: { jobs: "1.2k", onTime: "98%", responseHours: "2h" },
};

function CompanyDetails() {
  const { companyId } = useParams();
  const auth = useAuth();
  const isCompany = auth?.role === "company";
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getCompany(companyId);
        if (!active) return;
        const row = Array.isArray(data) ? data[0] : data?.data || data;
        setCompany(row || { ...FALLBACK, CompanyID: companyId });
      } catch {
        if (!active) return;
        setError("Couldn’t load company — showing sample data.");
        setCompany({ ...FALLBACK, CompanyID: companyId });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  if (loading) {
    return (
      <PublicLayout>
        <div
          className="container section"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <ContainerSpinner size={104} label="Loading company" />
        </div>
      </PublicLayout>
    );
  }

  const c = company || FALLBACK;
  const initials = (c.Name || "").split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <PublicLayout>
      {/* Banner */}
      <section
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          padding: "32px 0 24px",
        }}
      >
        <div className="container">
          <Link
            to="/companies"
            style={{
              fontSize: 13,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--ink-faint)",
            }}
          >
            ← Back to companies
          </Link>
          {error && <div className="banner-error" style={{ marginTop: 16 }}>{error}</div>}
        </div>
      </section>

      <section style={{ padding: "16px 0 64px" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: isCompany ? "minmax(0, 1fr)" : "minmax(0, 2fr) minmax(0, 1fr)", gap: 32 }}>
          <div>
            <Reveal as="div" className="card card-pad-lg">
              <div className="row" style={{ gap: 20, alignItems: "flex-start" }}>
                <div className="avatar avatar-lg" style={{ width: 64, height: 64, fontSize: 22 }}>{initials || "T"}</div>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ marginBottom: 8 }}>
                    <span className="badge badge-success"><Icon name="shield" size={12} /> Verified</span>
                    {c.Rating && (
                      <span className="badge badge-dark">
                        <Icon name="star" size={12} color="var(--accent)" />
                        <strong>{c.Rating}</strong>
                        <span className="muted">· {c.Reviews || 0} reviews</span>
                      </span>
                    )}
                  </div>
                  <h1 className="h2" style={{ marginBottom: 6 }}>{c.Name}</h1>
                  <p style={{ margin: 0, color: "var(--ink-soft)" }}>
                    <Icon name="pin" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                    {c.City} · {c.Services}
                  </p>
                </div>
              </div>

              {c.Stats && (
                <>
                  <hr className="divider" />
                  <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    {[
                      { label: "Jobs completed", value: c.Stats.jobs },
                      { label: "On-time rate", value: c.Stats.onTime },
                      { label: "Avg. response", value: c.Stats.responseHours },
                    ].map((s) => (
                      <div key={s.label}>
                        <div
                          className="mono tabular"
                          style={{
                            fontSize: 22,
                            fontWeight: 600,
                            color: "var(--ink)",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {s.value}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            letterSpacing: "0.10em",
                            textTransform: "uppercase",
                            color: "var(--ink-faint)",
                            marginTop: 4,
                          }}
                        >
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Reveal>

            <h2 className="h2" style={{ marginTop: 48, marginBottom: 14 }}>About</h2>
            <p className="lead" style={{ margin: 0 }}>
              {c.Description || "Trusted clearance company on the Takhlees marketplace."}
            </p>

            <h2 className="h2" style={{ marginTop: 40, marginBottom: 14 }}>Services</h2>
            <div className="row">
              {(c.Categories || ["Customs clearance", "Documentation"]).map((cat) => (
                <span key={cat} className="badge badge-neutral" style={{ padding: "8px 14px", fontSize: 13 }}>
                  <Icon name="package" size={13} /> {cat}
                </span>
              ))}
            </div>

            <h2 className="h2" style={{ marginTop: 40, marginBottom: 14 }}>Reviews</h2>
            {(c.Reviews_list || []).length === 0 ? (
              <p style={{ color: "var(--ink-soft)" }}>No reviews yet.</p>
            ) : (
              <Reveal as="div" className="grid">
                {(c.Reviews_list || []).map((r) => (
                  <div key={r.id} className="card card-hover">
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div className="row" style={{ gap: 10 }}>
                        <div className="avatar">{r.name.split(" ").map(w => w[0]).join("")}</div>
                        <div>
                          <strong style={{ color: "var(--ink)" }}>{r.name}</strong>
                          <div className="row" style={{ marginTop: 2 }}>
                            {[1,2,3,4,5].map((i) => (
                              <Icon key={i} name="star" size={12} color={i <= r.rating ? "var(--safety)" : "var(--line-strong)"} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p style={{ margin: "12px 0 0", color: "var(--ink-soft)" }}>{r.text}</p>
                  </div>
                ))}
              </Reveal>
            )}
          </div>

          {!isCompany && (
            <aside>
              <div className="card" style={{ position: "sticky", top: 88, padding: 24 }}>
                <h3 className="card-title">Ready to ship?</h3>
                <p className="card-subtitle">Submit an application and the company will pick it up.</p>
                <Link to={`/applications/new/${c.CompanyID}`} className="btn btn-primary btn-block btn-lg">
                  Apply for service <Icon name="arrow_right" size={16} />
                </Link>
                <hr className="divider" />
                <div className="stack" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 10, color: "var(--ink-soft)", fontSize: 13 }}>
                    <Icon name="check" size={16} color="var(--signal-go)" /> No charge until accepted
                  </div>
                  <div className="row" style={{ gap: 10, color: "var(--ink-soft)", fontSize: 13 }}>
                    <Icon name="check" size={16} color="var(--signal-go)" /> Real-time milestone updates
                  </div>
                  <div className="row" style={{ gap: 10, color: "var(--ink-soft)", fontSize: 13 }}>
                    <Icon name="check" size={16} color="var(--signal-go)" /> Secure payment held until release
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

export default CompanyDetails;
