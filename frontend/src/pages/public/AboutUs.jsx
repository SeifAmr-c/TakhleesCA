import React from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import { useTranslation } from "../../i18n";

function AboutUs() {
  const { t } = useTranslation("landing");

  const stats = [
    { value: "2026", label: t("about.stats.founded") },
    { value: "180+", label: t("about.stats.partners") },
    { value: "12K+", label: t("about.stats.shipments") },
    { value: t("about.stats.coverageValue"), label: t("about.stats.coverage") },
  ];

  const values = [
    { icon: "shield", title: t("about.values.trust.title"), body: t("about.values.trust.body") },
    { icon: "trending", title: t("about.values.efficiency.title"), body: t("about.values.efficiency.body") },
    { icon: "globe", title: t("about.values.transparency.title"), body: t("about.values.transparency.body") },
  ];

  return (
    <PublicLayout>
      <section className="hero hero-pad" style={{ paddingBottom: 64 }}>
        <div className="container container-narrow" style={{ textAlign: "center" }}>
          <span
            className="eyebrow eyebrow-accent fade-up stagger-1"
            style={{ color: "var(--safety)", justifyContent: "center", display: "inline-flex" }}
          >
            {t("about.eyebrow")}
          </span>
          <h1
            className="h1 fade-up stagger-2"
            style={{
              color: "oklch(98% 0.005 245)",
              marginBottom: 16,
              fontSize: "clamp(36px, 4.6vw, 52px)",
            }}
          >
            {t("about.heroTitle")}
          </h1>
          <p
            className="lead fade-up stagger-3"
            style={{ color: "oklch(100% 0 0 / 0.74)", fontSize: 18 }}
          >
            {t("about.heroLead")}
          </p>
        </div>
      </section>

      <Reveal as="section" style={{ padding: "0 0 64px", marginTop: -48 }}>
        <div className="container">
          <div className="card card-pad-lg">
            <div
              className="grid"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 0,
              }}
            >
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    textAlign: "center",
                    paddingInlineStart: i === 0 ? 0 : 16,
                    borderInlineStart: i === 0 ? "none" : "1px solid var(--line)",
                  }}
                >
                  <div
                    className="mono tabular"
                    style={{
                      fontSize: 26,
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
                      fontWeight: 500,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--ink-faint)",
                      marginTop: 6,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="section">
        <div className="container container-narrow">
          <span className="eyebrow">{t("about.mission.eyebrow")}</span>
          <h2 className="h2">{t("about.mission.title")}</h2>
          <p className="lead">{t("about.mission.p1")}</p>
          <p className="lead" style={{ marginTop: 16 }}>{t("about.mission.p2")}</p>
        </div>
      </Reveal>

      <Reveal
        as="section"
        className="section"
        style={{
          background: "var(--steel-50)",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 40px" }}>
            <span className="eyebrow">{t("about.values.eyebrow")}</span>
            <h2 className="h2">{t("about.values.title")}</h2>
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
          >
            {values.map((v) => (
              <div key={v.title} className="card card-hover">
                <div className="card-icon"><Icon name={v.icon} /></div>
                <h3 className="h3">{v.title}</h3>
                <p style={{ margin: 0, lineHeight: 1.6, color: "var(--ink-soft)" }}>
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </PublicLayout>
  );
}

export default AboutUs;
