import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { getCompany } from "../../api/companies.js";
import { listCompanyPorts } from "../../api/ports.js";
import { listCompanyReviews } from "../../api/reviews.js";
import { listCompanyCategoryPricing } from "../../api/companyCategories.js";
import { useAuth } from "../../api/authState.js";

const FALLBACK = {
  CompanyID: 0,
  Name: "Sample Clearance Co.",
  Governorate: "Cairo",
  Address: "—",
  About:
    "Full-service port clearance with 12 years of experience handling commercial and personal shipments through Cairo and Alexandria ports.",
  Reviews: [],
  AverageRating: null,
  ReviewCount: 0,
  Stats: { jobs: "1.2k", onTime: "98%", responseHours: "2h" },
};

function CompanyDetails() {
  const { companyId } = useParams();
  const auth = useAuth();
  const isCompany = auth?.role === "company";
  const [company, setCompany] = useState(null);
  const [companyPorts, setCompanyPorts] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [data, portsData, reviewsData, pricingData] = await Promise.all([
          getCompany(companyId),
          listCompanyPorts(companyId).catch(() => []),
          listCompanyReviews(companyId).catch(() => []),
          listCompanyCategoryPricing(companyId).catch(() => []),
        ]);
        if (!active) return;
        const row = Array.isArray(data) ? data[0] : data?.data || data;
        setCompany(row || { ...FALLBACK, CompanyID: companyId });
        setCompanyPorts(Array.isArray(portsData) ? portsData : portsData?.data || []);
        setReviews(Array.isArray(reviewsData) ? reviewsData : reviewsData?.data || []);
        setPricing(Array.isArray(pricingData) ? pricingData : pricingData?.data || []);
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

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + Number(r.Rating), 0) / reviews.length) * 10) / 10
    : null;

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
              gap: 8,
              fontWeight: 500,
              color: "var(--ink-soft)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-soft)"; }}
          >
            <Icon name="arrow_left" size={16} />
            Back to companies
          </Link>
          {error && <div className="banner-error" style={{ marginTop: 16 }}>{error}</div>}
        </div>
      </section>

      <section style={{ padding: "16px 0 64px" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: isCompany ? "minmax(0, 1fr)" : "minmax(0, 2fr) minmax(0, 1fr)", gap: 32 }}>
          <div>
            <Reveal as="div" className="card card-pad-lg">
              <div className="row" style={{ gap: 20, alignItems: "flex-start" }}>
                {c.LogoUrl ? (
                  <img
                    src={c.LogoUrl}
                    alt={`${c.Name} logo`}
                    className="avatar avatar-lg"
                    style={{ width: 64, height: 64, objectFit: "cover" }}
                  />
                ) : (
                  <div className="avatar avatar-lg" style={{ width: 64, height: 64, fontSize: 22 }}>{initials || "T"}</div>
                )}
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ marginBottom: 8 }}>
                    <span className="badge badge-success"><Icon name="shield" size={12} /> Verified</span>
                    {avgRating != null && (
                      <span className="badge badge-dark">
                        <Icon name="star" size={12} color="var(--accent)" />
                        <strong>{avgRating}</strong>
                        <span className="muted">· {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
                      </span>
                    )}
                  </div>
                  <h1 className="h2" style={{ marginBottom: 6 }}>{c.Name}</h1>
                  <p style={{ margin: 0, color: "var(--ink-soft)" }}>
                    <Icon name="pin" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                    {[c.Governorate, c.Address].filter(Boolean).join(" · ")}
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
              {c.About || "Trusted clearance company on the Takhlees marketplace."}
            </p>

            {companyPorts.length > 0 && (
              <>
                <h2 className="h2" style={{ marginTop: 40, marginBottom: 14 }}>Ports of operation</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {companyPorts.map((p) => (
                    <span
                      key={p.PortID}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 14px",
                        borderRadius: 999,
                        border: "1.5px solid var(--brand)",
                        background: "var(--harbor-100)",
                        color: "var(--brand)",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      <Icon name="pin" size={12} />
                      {p.PortName}
                      {p.PortType && (
                        <span style={{ fontSize: 11, opacity: 0.65, fontWeight: 400 }}>
                          ({p.PortType})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </>
            )}

            <h2 className="h2" style={{ marginTop: 40, marginBottom: 14 }}>Service pricing</h2>
            {pricing.length === 0 ? (
              <p style={{ color: "var(--ink-soft)", margin: 0 }}>
                Pricing information not currently available.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                {pricing.map((p) => (
                  <div
                    key={p.CategoryID}
                    className="card"
                    style={{
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "var(--ink-faint)",
                      }}
                    >
                      {p.Type}
                    </div>
                    <div
                      className="mono tabular"
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: "var(--ink)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      EGP {Number(p.Price).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h2 className="h2" style={{ marginTop: 40, marginBottom: 14 }}>Reviews</h2>
            {reviews.length === 0 ? (
              <p style={{ color: "var(--ink-soft)" }}>No reviews yet.</p>
            ) : (
              <Reveal as="div" className="grid">
                {reviews.map((r) => {
                  const fullName = [r.FirstName, r.LastName].filter(Boolean).join(" ").trim() || "Anonymous";
                  const initials = fullName.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
                  return (
                    <div key={r.ReviewID} className="card card-hover">
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <div className="row" style={{ gap: 10 }}>
                          <div className="avatar">{initials}</div>
                          <div>
                            <strong style={{ color: "var(--ink)" }}>{fullName}</strong>
                            <div className="row" style={{ marginTop: 2 }}>
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Icon key={i} name="star" size={12} color={i <= r.Rating ? "var(--safety)" : "var(--line-strong)"} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p style={{ margin: "12px 0 0", color: "var(--ink-soft)" }}>{r.Review}</p>
                    </div>
                  );
                })}
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
