import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import InteractiveMap from "../../components/InteractiveMap.jsx";
import { listCompanies } from "../../api/companies.js";
import { listReviewAverages } from "../../api/reviews.js";
import { getLandingStats } from "../../api/stats.js";
import { useAuth } from "../../api/authState.js";
import { useTranslation, useLanguage } from "../../i18n";

/* ----------------------------------------------------------------
   Operational figures on this page are read live from the platform
   via GET /stats/landing — the unauthenticated, name-stripped public
   stats feed. Nothing here is hardcoded marketing copy.
   ---------------------------------------------------------------- */

const PLACEHOLDER = "—";

const formatNum = (n, locale) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US")
    : PLACEHOLDER;

const formatDate = (d, locale) => {
  if (!d) return PLACEHOLDER;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  return date.toLocaleDateString(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatDuration = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
};

// Maps the DB Status to the hero panel's 4-step timeline (which step is active).
const STATUS_STEP = {
  Pending: 0,
  "In Progress": 2,
  Accepted: 2,
  Completed: 3,
  Rejected: 0,
};

// A live countdown that ticks every second and resets to its seed on hitting 0.
function Countdown({ seconds }) {
  const seed = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 134;
  const [remaining, setRemaining] = useState(seed);

  useEffect(() => {
    setRemaining(seed);
    const id = setInterval(() => {
      setRemaining((r) => (r <= 1 ? seed : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [seed]);

  return <>{formatDuration(remaining)}</>;
}

/* ================================================================
   Hero
   ================================================================ */
function Hero({ stats }) {
  const { t } = useTranslation("landing");
  const { lang } = useLanguage();
  const facts = [
    { value: formatNum(stats?.verifiedAgencies, lang), label: t("home.hero.facts.verifiedAgencies") },
    { value: formatNum(stats?.containersCleared, lang), label: t("home.hero.facts.containersCleared") },
    {
      value: stats?.onTimePct != null ? `${stats.onTimePct}%` : PLACEHOLDER,
      label: t("home.hero.facts.onTimePct"),
    },
    {
      value: <Countdown seconds={stats?.avgActivationSeconds} />,
      label: t("home.hero.facts.activation"),
    },
  ];
  return (
    <section className="hero hero-pad">
      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 56,
          alignItems: "center",
        }}
      >
        <div>
          <span className="eyebrow eyebrow-accent fade-up stagger-1" style={{ color: "var(--safety)" }}>
            {t("home.hero.eyebrow")}
          </span>
          <h1
            className="h1 fade-up stagger-2"
            style={{
              color: "oklch(98% 0.005 245)",
              fontSize: "clamp(40px, 5.2vw, 60px)",
              maxWidth: "16ch",
              marginBottom: 20,
            }}
          >
            {t("home.hero.title")}
          </h1>
          <p
            className="lead fade-up stagger-3"
            style={{
              color: "oklch(100% 0 0 / 0.74)",
              fontSize: 17,
              maxWidth: 520,
              marginBottom: 32,
            }}
          >
            {t("home.hero.lead")}
          </p>

          <div className="row fade-up stagger-4" style={{ gap: 12, marginBottom: 36 }}>
            <Link to="/register" className="btn btn-accent btn-lg">
              {t("home.hero.ctaSubmit")}
              <Icon name="arrow_right" size={14} className="icon-flip" />
            </Link>
            <Link to="/companies" className="btn btn-on-dark btn-lg">
              {t("home.hero.ctaBrowse")}
            </Link>
          </div>

          <div
            className="fade-up stagger-5"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              borderTop: "1px solid oklch(100% 0 0 / 0.10)",
              paddingTop: 20,
              gap: 0,
            }}
          >
            {facts.map((f, i) => (
              <div
                key={f.label}
                style={{
                  paddingInlineStart: i === 0 ? 0 : 16,
                  borderInlineStart:
                    i === 0
                      ? "none"
                      : "1px solid oklch(100% 0 0 / 0.08)",
                }}
              >
                <div
                  className="mono tabular"
                  style={{
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  {f.value}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "oklch(100% 0 0 / 0.55)",
                    marginTop: 6,
                  }}
                >
                  {f.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <LiveShipmentPanel featured={stats?.featured} />
      </div>
    </section>
  );
}

function LiveShipmentPanel({ featured }) {
  const { t } = useTranslation("landing");
  const { lang } = useLanguage();
  const tracking = featured?.TrackingNumber || PLACEHOLDER;
  const status = featured?.Status || null;
  const inMotion = status === "In Progress" || status === "Accepted";
  const activeStep = status != null ? STATUS_STEP[status] ?? 0 : 2;

  // Translate the status enum through the status namespace; keys mirror DB
  // values with the space stripped (e.g. "In Progress" → "InProgress").
  const statusKey = status ? status.replace(/\s+/g, "") : null;
  const localizedStatus = statusKey ? t(`status.${statusKey}`, { defaultValue: status }) : t("home.shipmentPanel.idle");

  // CategoryType is curated reference data (Phase 6 will localize it on the
  // server). Until then, fall back to the translated "Clearance" label.
  const categoryLabel = featured?.CategoryType || t("home.shipmentPanel.clearanceFallback");
  const route = featured
    ? `${categoryLabel} → ${featured.PortName || PLACEHOLDER}`
    : t("home.shipmentPanel.routeFallback");

  // PortType is an enum (Sea / Air / Land). Use it as-is for now; the AR
  // copy keeps the English mode word as a stand-in until the enum is
  // localized — same shape as the EN string just with translated wrappers.
  const meta = featured
    ? (featured.PortType
        ? t("home.shipmentPanel.metaFiled", {
            mode: t("home.shipmentPanel.modeFreight", { mode: featured.PortType.toUpperCase() }),
            date: formatDate(featured.SubmissionDate, lang).toUpperCase(),
          })
        : t("home.shipmentPanel.metaShipment", {
            date: formatDate(featured.SubmissionDate, lang).toUpperCase(),
          }))
    : t("home.shipmentPanel.metaIdle");

  const timelineSteps = [
    t("home.shipmentPanel.timeline.submit"),
    t("home.shipmentPanel.timeline.match"),
    t("home.shipmentPanel.timeline.customs"),
    t("home.shipmentPanel.timeline.release"),
  ];

  return (
    <div
      className="fade-up stagger-6"
      style={{
        background: "var(--surface)",
        border: "1px solid oklch(100% 0 0 / 0.10)",
        borderRadius: "var(--radius-lg)",
        padding: 24,
        boxShadow:
          "0 1px 0 oklch(100% 0 0 / 0.05), 0 24px 48px -12px oklch(0% 0 0 / 0.40)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
          }}
        >
          {t("home.shipmentPanel.shipmentLabel")} · <bdi>{tracking}</bdi>
        </span>
        {inMotion ? (
          <span className="badge badge-accent">
            <span className="dot dot-live" /> {t("home.shipmentPanel.inMotion")}
          </span>
        ) : (
          <span className="badge">{localizedStatus}</span>
        )}
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-0.01em",
        }}
      >
        {route}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink-faint)",
          marginTop: 4,
        }}
      >
        {meta}
      </div>

      <div className="timeline" style={{ marginTop: 24, marginBottom: 4 }}>
        {timelineSteps.map((step, i) => (
          <div
            key={step}
            className={`timeline-step${i < activeStep ? " done" : i === activeStep ? " active" : ""}`}
          >
            <span className="dot" />
            {step}
          </div>
        ))}
      </div>

      <hr className="hairline" style={{ margin: "20px 0" }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        <Stat label={t("home.shipmentPanel.stats.filed")} value={featured ? formatDate(featured.SubmissionDate, lang) : PLACEHOLDER} mono />
        <Stat label={t("home.shipmentPanel.stats.fee")} value={featured ? `${t("home.shipmentPanel.currency")} ${formatNum(featured.Fee, lang)}` : PLACEHOLDER} mono />
        <Stat label={t("home.shipmentPanel.stats.docs")} value={featured ? formatNum(featured.DocsSubmitted, lang) : PLACEHOLDER} mono />
      </div>
    </div>
  );
}

function Stat({ label, value, mono = false }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--ink-faint)",
        }}
      >
        {label}
      </div>
      <div
        className={mono ? "mono tabular" : ""}
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--ink)",
          marginTop: 4,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ================================================================
   Live operations strip
   ================================================================ */
function LiveOpsStrip({ stats }) {
  const { t } = useTranslation("landing");
  const ops = Array.isArray(stats?.recent) ? stats.recent : [];
  const inMotionLabel =
    typeof stats?.inMotion === "number"
      ? t("home.liveOps.inMotion", { count: stats.inMotion })
      : PLACEHOLDER;
  return (
    <section
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        className="container live-ops"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(200px, 240px) 1fr",
          gap: 32,
          padding: "18px 24px",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            paddingInlineEnd: 24,
            borderInlineEnd: "1px solid var(--line)",
          }}
        >
          <span className="dot dot-live" style={{ width: 8, height: 8 }} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink)",
              whiteSpace: "nowrap",
            }}
          >
            {t("home.liveOps.label")} · {inMotionLabel}
          </span>
        </div>

        <div
          className="live-ops-list"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: 32,
            rowGap: 8,
            minWidth: 0,
          }}
        >
          {ops.length === 0 ? (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-faint)" }}>
              {t("home.liveOps.empty")}
            </span>
          ) : (
            ops.map((op, i) => {
              const eventKey = op.event ? op.event.replace(/\s+/g, "") : null;
              const localizedEvent = eventKey
                ? t(`status.${eventKey}`, { defaultValue: op.event })
                : op.event;
              return (
                <div
                  key={`${op.id}-${i}`}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-soft)",
                    display: "grid",
                    gridTemplateColumns: "52px minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)",
                    columnGap: 14,
                    alignItems: "center",
                    minWidth: 0,
                  }}
                >
                  <span style={{ color: "var(--ink-faint)" }}><bdi>{op.time}</bdi></span>
                  <span
                    style={{
                      color: "var(--ink)",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <bdi>{op.id}</bdi>
                  </span>
                  <span
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      color:
                        op.event === "Completed"
                          ? "var(--signal-go)"
                          : op.event === "Pending"
                          ? "var(--ink-faint)"
                          : "var(--harbor-700)",
                    }}
                  >
                    {localizedEvent}
                  </span>
                  <span
                    style={{
                      color: "var(--ink-faint)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {op.port}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Principles
   ================================================================ */
function Principles() {
  const { t } = useTranslation("landing");
  const items = t("home.principles.items", { returnObjects: true });
  const list = Array.isArray(items) ? items : [];
  return (
    <section className="section">
      <div className="container">
        <div style={{ maxWidth: 680, marginBottom: 48 }}>
          <span className="eyebrow">{t("home.principles.eyebrow")}</span>
          <h2 className="h2">{t("home.principles.title")}</h2>
        </div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 0,
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          {list.map((p, i) => (
            <div
              key={p.title}
              style={{
                padding: 32,
                borderInlineEnd:
                  i < list.length - 1
                    ? "1px solid var(--line)"
                    : "none",
              }}
            >
              <div
                className="mono"
                style={{
                  color: "var(--safety-700)",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.10em",
                  marginBottom: 16,
                }}
              >
                / {String(i + 1).padStart(2, "0")}
              </div>
              <h3
                className="h3"
                style={{
                  fontSize: 19,
                  marginBottom: 10,
                  letterSpacing: "-0.01em",
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "var(--ink-soft)",
                  fontSize: 14.5,
                  lineHeight: 1.6,
                }}
              >
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Flow — Submit → Match → Release
   ================================================================ */
function Flow() {
  const { t } = useTranslation("landing");
  const items = t("home.flow.items", { returnObjects: true });
  const list = Array.isArray(items) ? items : [];
  return (
    <section
      className="section"
      style={{ background: "var(--steel-50)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}
    >
      <div className="container">
        <div style={{ maxWidth: 680, marginBottom: 48 }}>
          <span className="eyebrow">{t("home.flow.eyebrow")}</span>
          <h2 className="h2">{t("home.flow.title")}</h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
            position: "relative",
          }}
          className="flow-grid"
        >
          {list.map((step, i) => (
            <div
              key={step.title}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                padding: 28,
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 18,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.10em",
                    color: "var(--brand)",
                  }}
                >
                  {t("home.flow.stepLabel")} {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--safety-700)",
                    background: "var(--safety-100)",
                    border: "1px solid var(--safety-300)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {step.sla}
                </span>
              </div>
              <h3
                className="h3"
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: "-0.015em",
                  marginBottom: 10,
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "var(--ink-soft)",
                  fontSize: 14.5,
                  lineHeight: 1.6,
                }}
              >
                {step.body}
              </p>

              {i < list.length - 1 && (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "50%",
                    insetInlineEnd: -12,
                    transform: "translateY(-50%)",
                    width: 12,
                    height: 1,
                    background: "var(--line-strong)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Verified agencies
   ================================================================ */
function Verified() {
  const { t } = useTranslation("landing");
  const { lang } = useLanguage();
  const [agencies, setAgencies] = useState([]);
  const [verifiedCount, setVerifiedCount] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [companiesRes, averages] = await Promise.all([
          listCompanies({ status: "Verified" }),
          listReviewAverages().catch(() => []),
        ]);
        if (!active) return;
        const list = Array.isArray(companiesRes) ? companiesRes : companiesRes?.data || [];
        const ratingMap = {};
        for (const row of Array.isArray(averages) ? averages : []) {
          if (row?.CompanyID != null) {
            ratingMap[Number(row.CompanyID)] = {
              avg: Number(row.AverageRating),
              count: Number(row.ReviewCount),
            };
          }
        }
        setVerifiedCount(list.length);
        setAgencies(
          list.slice(0, 6).map((c) => ({
            id: c.CompanyID,
            name: c.Name,
            license: c.ComReg || "—",
            ports: (c.ports || []).map((p) => p.PortName).filter(Boolean),
            rating: ratingMap[Number(c.CompanyID)] || null,
            live: (c.ports?.length || 0) > 0,
          }))
        );
      } catch {
        if (!active) return;
        setVerifiedCount(0);
        setAgencies([]);
      }
    })();
    return () => { active = false; };
  }, []);

  const countLabel = verifiedCount ?? PLACEHOLDER;

  return (
    <section className="section">
      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
            flexWrap: "wrap",
            marginBottom: 32,
          }}
        >
          <div>
            <span className="eyebrow">{t("home.verified.eyebrow")}</span>
            <h2 className="h2">{t("home.verified.title", { count: countLabel })}</h2>
            <p
              style={{
                margin: 0,
                color: "var(--ink-soft)",
                fontSize: 16,
                lineHeight: 1.5,
                maxWidth: 60 + "ch",
              }}
            >
              {t("home.verified.lead")}
            </p>
          </div>
          <Link to="/companies" className="btn btn-secondary">
            {t("home.verified.browseAll", { count: countLabel })}
            <Icon name="arrow_right" size={14} className="icon-flip" />
          </Link>
        </div>

        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(220px, 2fr) minmax(120px, 1fr)",
              padding: "12px 20px",
              background: "var(--steel-50)",
              borderBottom: "1px solid var(--line)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
            }}
          >
            <span>{t("home.verified.tableAgency")}</span>
            <span>{t("home.verified.tableRating")}</span>
          </div>

          {agencies.length === 0 && (
            <div style={{ padding: "20px", fontSize: 14, color: "var(--ink-faint)" }}>
              {verifiedCount === null ? t("home.verified.loading") : t("home.verified.empty")}
            </div>
          )}
          {agencies.map((a, i) => (
            <Link
              to={`/companies/${a.id}`}
              key={a.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(220px, 2fr) minmax(120px, 1fr)",
                padding: "16px 20px",
                alignItems: "center",
                textDecoration: "none",
                color: "inherit",
                borderBottom:
                  i < agencies.length - 1
                    ? "1px solid var(--line)"
                    : "none",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    color: "var(--ink)",
                    fontSize: 15,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {a.name}
                </div>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {a.rating && a.rating.count > 0 ? (
                  <>
                    <span
                      className="mono tabular"
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ink)",
                      }}
                    >
                      {a.rating.avg.toLocaleString(lang === "ar" ? "ar-EG-u-nu-latn" : "en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 12, color: "var(--ink-faint)" }}
                    >
                      ({formatNum(a.rating.count, lang)})
                    </span>
                  </>
                ) : (
                  <span className="mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                    {t("home.verified.noReviews")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Operational reach
   ================================================================ */
function OperationalReach() {
  const { t } = useTranslation("landing");
  return (
    <section
      className="section"
      style={{
        background: "var(--steel-50)",
        borderTop: "1px solid var(--line)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        className="container reach-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.1fr",
          gap: 56,
          alignItems: "center",
        }}
      >
        <div>
          <span className="eyebrow">{t("home.reach.eyebrow")}</span>
          <h2 className="h2">{t("home.reach.title")}</h2>
          <p
            style={{
              margin: 0,
              color: "var(--ink-soft)",
              fontSize: 16,
              lineHeight: 1.6,
              maxWidth: "56ch",
            }}
          >
            {t("home.reach.body")}
          </p>
        </div>
        <InteractiveMap />
      </div>
    </section>
  );
}

/* ================================================================
   CTA
   ================================================================ */
function CTA({ stats }) {
  const { t } = useTranslation("landing");
  const auth = useAuth();
  const isCompany = auth?.role === "company";
  /* Visibility rules:
       - Company logged in: hide the entire button column.
       - Any other authed user: show only the agency CTA.
       - Logged out: show both. */
  const showImporter = !auth;
  const showAgency = !isCompany;
  const showButtons = showImporter || showAgency;

  return (
    <section style={{ padding: "72px 0 96px" }}>
      <div className="container">
        <div
          style={{
            background: "var(--harbor-950)",
            color: "#fff",
            border: "1px solid oklch(100% 0 0 / 0.08)",
            borderRadius: "var(--radius-lg)",
            padding: "56px 48px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 40,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 420px", minWidth: 0, textAlign: "center" }}>
            <span
              className="eyebrow"
              style={{
                color: "var(--safety)",
                marginBottom: 12,
                display: "block",
              }}
            >
              {t("home.cta.eyebrow")}
            </span>
            <h2
              className="h2"
              style={{
                color: "#fff",
                marginBottom: 12,
                fontSize: 32,
                letterSpacing: "-0.022em",
              }}
            >
              {t("home.cta.title")}
            </h2>
            <p
              style={{
                color: "oklch(100% 0 0 / 0.74)",
                fontSize: 16,
                margin: "0 auto",
                maxWidth: 540,
                lineHeight: 1.6,
              }}
            >
              {t("home.cta.leadBefore")}
              <span
                className="mono tabular"
                style={{ color: "#fff", fontWeight: 600 }}
              >
                <Countdown seconds={stats?.avgActivationSeconds} />
              </span>
              {t("home.cta.leadAfter")}
            </p>
          </div>
          {showButtons && (
            <div
              className="row"
              style={{
                justifyContent: "flex-end",
                gap: 12,
                flexShrink: 0,
                marginInlineEnd: showImporter && showAgency ? 0 : 80,
              }}
            >
              {showImporter && (
                <Link to="/register" className="btn btn-accent btn-lg">
                  {t("home.cta.importer")}
                  <Icon name="arrow_right" size={14} className="icon-flip" />
                </Link>
              )}
              {showAgency && (
                <Link to="/company/register" className="btn btn-on-dark btn-lg">
                  {t("home.cta.agency")}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Page
   ================================================================ */
function LandingPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getLandingStats();
        if (active) setStats(data);
      } catch {
        if (active) setStats(null);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <PublicLayout>
      <style>{landingMediaQueries}</style>
      <Hero stats={stats} />
      <Reveal as="div"><LiveOpsStrip stats={stats} /></Reveal>
      <Reveal as="div" delay={40}><Principles /></Reveal>
      <Reveal as="div" delay={40}><Flow /></Reveal>
      <Reveal as="div" delay={40}><Verified /></Reveal>
      <Reveal as="div" delay={40}><OperationalReach /></Reveal>
      <Reveal as="div" delay={40}><CTA stats={stats} /></Reveal>
    </PublicLayout>
  );
}

const landingMediaQueries = `
  @media (max-width: 960px) {
    .hero .container,
    .hero > .container {
      grid-template-columns: 1fr !important;
      gap: 40px !important;
    }
    .flow-grid {
      grid-template-columns: 1fr !important;
    }
    .live-ops {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .live-ops > div:first-child {
      border-inline-end: none !important;
      border-bottom: 1px solid var(--line);
      padding: 0 0 12px !important;
    }
    .live-ops-list {
      grid-template-columns: 1fr !important;
    }
    .reach-grid {
      grid-template-columns: 1fr !important;
      gap: 32px !important;
    }
  }
  @media (max-width: 700px) {
    .hero [style*="grid-template-columns: repeat(4, 1fr)"] {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 16px !important;
    }
    .hero [style*="grid-template-columns: repeat(4, 1fr)"] > div {
      padding: 8px 0 !important;
      border-inline-start: none !important;
    }
  }
`;

export default LandingPage;
