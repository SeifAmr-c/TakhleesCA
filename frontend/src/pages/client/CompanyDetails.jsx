import React, { useEffect, useMemo, useState } from "react";
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
import { useTranslation } from "../../i18n";

function CompanyDetails() {
  const { t } = useTranslation("client");
  const { companyId } = useParams();
  const auth = useAuth();
  const isCompany = auth?.role === "company";

  const FALLBACK = useMemo(() => ({
    CompanyID: 0,
    Name: t("companyDetails.fallback.name"),
    Governorate: t("companyDetails.fallback.governorate"),
    Address: "—",
    About: t("companyDetails.fallback.about"),
    Reviews: [],
    AverageRating: null,
    ReviewCount: 0,
    Stats: { jobs: "1.2k", onTime: "98%", responseHours: "2h" },
  }), [t]);
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
        setError(t("companyDetails.loadError"));
        setCompany({ ...FALLBACK, CompanyID: companyId });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [companyId, t, FALLBACK]);

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
          <ContainerSpinner size={104} label={t("companyDetails.loading")} />
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
            {t("companyDetails.backToCompanies")}
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
                    alt={t("companyDetails.logoAlt", { name: c.Name })}
                    className="avatar avatar-lg"
                    style={{ width: 64, height: 64, objectFit: "cover" }}
                  />
                ) : (
                  <div className="avatar avatar-lg" style={{ width: 64, height: 64, fontSize: 22 }}>{initials || "T"}</div>
                )}
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ marginBottom: 8 }}>
                    <span className="badge badge-success"><Icon name="shield" size={12} /> {t("companyDetails.verified")}</span>
                    {avgRating != null && (
                      <span className="badge badge-dark">
                        <Icon name="star" size={12} color="var(--accent)" filled />
                        <strong><bdi>{avgRating}</bdi></strong>
                        <span className="muted">· {t("companyDetails.reviewCount", { count: reviews.length })}</span>
                      </span>
                    )}
                  </div>
                  <h1 className="h2" style={{ marginBottom: 6 }}>{c.Name}</h1>
                  <p style={{ margin: 0, color: "var(--ink-soft)" }}>
                    <Icon name="pin" size={13} style={{ verticalAlign: "-2px", marginInlineEnd: 4 }} />
                    {[c.Governorate, c.Address].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>

              {c.Stats && (
                <>
                  <hr className="divider" />
                  <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    {[
                      { label: t("companyDetails.stats.jobsCompleted"), value: c.Stats.jobs },
                      { label: t("companyDetails.stats.onTimeRate"), value: c.Stats.onTime },
                      { label: t("companyDetails.stats.avgResponse"), value: c.Stats.responseHours },
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
                          <bdi>{s.value}</bdi>
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

            <h2 className="h2" style={{ marginTop: 48, marginBottom: 14 }}>{t("companyDetails.about")}</h2>
            <p className="lead" style={{ margin: 0 }}>
              {c.About || t("companyDetails.aboutFallback")}
            </p>

            {companyPorts.length > 0 && (
              <>
                <h2 className="h2" style={{ marginTop: 40, marginBottom: 14 }}>{t("companyDetails.portsTitle")}</h2>
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

            <h2 className="h2" style={{ marginTop: 40, marginBottom: 14 }}>{t("companyDetails.pricingTitle")}</h2>
            {pricing.length === 0 ? (
              <p style={{ color: "var(--ink-soft)", margin: 0 }}>
                {t("companyDetails.pricingUnavailable")}
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
                      {t("companyDetails.currency")} <bdi>{Number(p.Price).toLocaleString()}</bdi>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h2 className="h2" style={{ marginTop: 40, marginBottom: 14 }}>{t("companyDetails.reviewsTitle")}</h2>
            {reviews.length === 0 ? (
              <p style={{ color: "var(--ink-soft)" }}>{t("companyDetails.noReviews")}</p>
            ) : (
              <Reveal as="div" className="grid">
                {reviews.map((r) => {
                  const fullName = [r.FirstName, r.LastName].filter(Boolean).join(" ").trim() || t("companyDetails.anonymous");
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
                                <Icon key={i} name="star" size={12} color={i <= r.Rating ? "var(--safety)" : "var(--line-strong)"} filled={i <= r.Rating} />
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
                <h3 className="card-title">{t("companyDetails.cta.title")}</h3>
                <p className="card-subtitle">{t("companyDetails.cta.subtitle")}</p>
                <Link to={`/applications/new/${c.CompanyID}`} className="btn btn-primary btn-block btn-lg">
                  <Icon name="arrow_right" size={16} />
                  {t("companyDetails.cta.apply")}
                </Link>
                <hr className="divider" />
                <div className="stack" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 10, color: "var(--ink-soft)", fontSize: 13 }}>
                    <Icon name="check" size={16} color="var(--signal-go)" /> {t("companyDetails.cta.benefit1")}
                  </div>
                  <div className="row" style={{ gap: 10, color: "var(--ink-soft)", fontSize: 13 }}>
                    <Icon name="check" size={16} color="var(--signal-go)" /> {t("companyDetails.cta.benefit2")}
                  </div>
                  <div className="row" style={{ gap: 10, color: "var(--ink-soft)", fontSize: 13 }}>
                    <Icon name="check" size={16} color="var(--signal-go)" /> {t("companyDetails.cta.benefit3")}
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
