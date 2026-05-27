import React from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Reveal from "../../components/Reveal.jsx";
import { useTranslation } from "../../i18n";

// Renders one numbered legal section. The JSON shape can carry plain
// paragraphs, an optional bullet list flanked by lead/trail paragraphs,
// and a final email + address block for contact sections.
function Section({ index, section }) {
  const { title, paragraphs = [], bullets, paragraphsAfter = [], email, address } = section;
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "56px 1fr",
        gap: 20,
        padding: "28px 0",
        borderTop: index === 0 ? "none" : "1px solid var(--line)",
      }}
    >
      <div
        className="mono tabular"
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.10em",
          color: "var(--ink-faint)",
          paddingTop: 4,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      <div>
        <h2 className="h3" style={{ marginTop: 0, marginBottom: 12 }}>{title}</h2>
        <div style={{ color: "var(--ink-soft)", lineHeight: 1.7, fontSize: 15 }}>
          {paragraphs.map((p, i) => <p key={`p-${i}`}>{p}</p>)}
          {bullets && (
            <ul style={{ paddingInlineStart: 20, margin: "8px 0 0", lineHeight: 1.7 }}>
              {bullets.map((b, i) => <li key={`b-${i}`}>{b}</li>)}
            </ul>
          )}
          {paragraphsAfter.map((p, i) => (
            <p key={`a-${i}`} style={{ marginTop: 16 }}>{p}</p>
          ))}
          {(email || address) && (
            <p>
              {email && (
                <>
                  <br />
                  <strong><bdi>{email}</bdi></strong>
                </>
              )}
              {address && (
                <>
                  <br />
                  {address}
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function PrivacyPolicy() {
  const { t } = useTranslation("legal");
  const sections = t("privacy.sections", { returnObjects: true });

  return (
    <PublicLayout>
      <section className="hero hero-pad" style={{ paddingBottom: 56 }}>
        <div className="container container-narrow" style={{ textAlign: "center" }}>
          <span
            className="eyebrow eyebrow-accent fade-up stagger-1"
            style={{
              color: "var(--safety)",
              justifyContent: "center",
              display: "inline-flex",
            }}
          >
            {t("privacy.eyebrow")}
          </span>
          <h1
            className="h1 fade-up stagger-2"
            style={{
              color: "oklch(98% 0.005 245)",
              marginBottom: 16,
              fontSize: "clamp(36px, 4.6vw, 52px)",
            }}
          >
            {t("privacy.title")}
          </h1>
          <p
            className="lead fade-up stagger-3"
            style={{ color: "oklch(100% 0 0 / 0.74)", fontSize: 18 }}
          >
            {t("privacy.lead")}
          </p>
          <p
            className="fade-up stagger-3"
            style={{
              marginTop: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "oklch(100% 0 0 / 0.55)",
            }}
          >
            {t("privacy.lastUpdated")}
          </p>
        </div>
      </section>

      <Reveal as="section" className="section" style={{ paddingTop: 32 }}>
        <div className="container container-narrow">
          <div className="card card-pad-lg">
            <p className="lead" style={{ marginTop: 0 }}>{t("privacy.intro")}</p>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="section" style={{ paddingTop: 0 }}>
        <div className="container container-narrow">
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {Array.isArray(sections) && sections.map((s, i) => (
              <Section key={s.title} index={i} section={s} />
            ))}
          </ol>
        </div>
      </Reveal>
    </PublicLayout>
  );
}

export default PrivacyPolicy;
