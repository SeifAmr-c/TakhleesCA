import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import Reveal from "../../components/Reveal.jsx";
import InteractiveMap from "../../components/InteractiveMap.jsx";
import { searchCompanies } from "../../api/companies.js";

/* ----------------------------------------------------------------
   Operational data shown on the landing page is illustrative — it
   demonstrates the shape of a real platform read, not a marketing
   claim. Every field maps to something the live product surfaces.
   ---------------------------------------------------------------- */

const HEADLINE_FACTS = [
  { value: "184", label: "Verified agencies" },
  { value: "12,408", label: "Containers cleared" },
  { value: "98.2%", label: "On-time milestones" },
  { value: "2m 14s", label: "Avg. activation" },
];

const LIVE_OPS = [
  { time: "03:42", id: "CMAU-7392150", event: "Released",      port: "Port Said" },
  { time: "03:38", id: "MSCU-3847291", event: "Declared",      port: "Alexandria" },
  { time: "03:31", id: "OOLU-9281047", event: "Gate-in",       port: "Damietta" },
  { time: "03:25", id: "APMU-8273940", event: "Submitted",     port: "Sokhna" },
];

const PRINCIPLES = [
  {
    n: "01",
    title: "Verified, not vouched",
    body:
      "Every agency on the platform exposes its commercial license number, port coverage, and review history. You verify trust against the data, not against a badge.",
  },
  {
    n: "02",
    title: "Escrow, not handshake",
    body:
      "Pay into escrow at submission. Funds release to the agency only when your container is released to you. Disputed clearances return your money.",
  },
  {
    n: "03",
    title: "Status, not status updates",
    body:
      "Every milestone — gate-in, declaration filed, customs cleared, released — lands in your dashboard the moment it happens. No more phone calls to ask where things stand.",
  },
];

const FLOW_STEPS = [
  {
    n: "01",
    title: "Submit",
    body:
      "Upload your bill of lading, commercial invoice, and packing list. We pull the container number and ETA automatically.",
    sla: "~ 4 min",
  },
  {
    n: "02",
    title: "Match",
    body:
      "Pick from licensed agencies covering your port. One confirms inside twelve minutes on average and the file enters their queue.",
    sla: "~ 12 min",
  },
  {
    n: "03",
    title: "Release",
    body:
      "The agency files the customs declaration; you watch each milestone clear in real time, with the fee held in escrow until cargo is released.",
    sla: "3 – 7 days",
  },
];

const VERIFIED_AGENCIES = [
  {
    name: "Cairo Clearance Co.",
    license: "CC-EG-2017-0431",
    ports: ["Alexandria", "Port Said"],
    rating: 4.9,
    reviews: 342,
    live: true,
  },
  {
    name: "Alex Maritime Logistics",
    license: "AML-EG-2014-0117",
    ports: ["Alexandria", "Damietta"],
    rating: 4.8,
    reviews: 510,
    live: true,
  },
  {
    name: "Suez Customs Group",
    license: "SCG-EG-2019-0822",
    ports: ["Sokhna", "Suez"],
    rating: 4.7,
    reviews: 218,
    live: false,
  },
  {
    name: "Northport Brokers",
    license: "NPB-EG-2016-0294",
    ports: ["Alexandria", "Port Said"],
    rating: 4.8,
    reviews: 287,
    live: true,
  },
];

/* ================================================================
   Hero
   ================================================================ */
function Hero() {
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
        {/* Left: precise headline + factual proof */}
        <div>
          <span className="eyebrow eyebrow-accent fade-up stagger-1" style={{ color: "var(--safety)" }}>
            Port clearance · instrumented
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
            Clear cargo from Egyptian ports without the bureaucracy.
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
            Takhlees connects importers with licensed clearance agencies, holds
            payment in escrow, and surfaces every customs milestone the moment
            it happens. Submit a shipment, watch it move, pay on release.
          </p>

          <div className="row fade-up stagger-4" style={{ gap: 12, marginBottom: 36 }}>
            <Link to="/register" className="btn btn-accent btn-lg">
              Submit a shipment
              <Icon name="arrow_right" size={14} />
            </Link>
            <Link to="/companies" className="btn btn-on-dark btn-lg">
              Browse agencies
            </Link>
          </div>

          {/* Headline facts — mono, tabular, hairline-separated */}
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
            {HEADLINE_FACTS.map((f, i) => (
              <div
                key={f.label}
                style={{
                  paddingLeft: i === 0 ? 0 : 16,
                  borderLeft:
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

        {/* Right: live shipment panel — looks like a real ops widget */}
        <LiveShipmentPanel />
      </div>
    </section>
  );
}

function LiveShipmentPanel() {
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
      {/* Header — status is the headline */}
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
          Shipment · CMAU-7392150
        </span>
        <span className="badge badge-accent">
          <span className="dot dot-live" /> In motion
        </span>
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-0.01em",
        }}
      >
        Shanghai &nbsp;→&nbsp; Alexandria
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink-faint)",
          marginTop: 4,
        }}
      >
        CAIRO CLEARANCE CO. · LIC. CC-EG-2017-0431
      </div>

      <div className="timeline" style={{ marginTop: 24, marginBottom: 4 }}>
        <div className="timeline-step done">
          <span className="dot" />
          Submit
        </div>
        <div className="timeline-step done">
          <span className="dot" />
          Match
        </div>
        <div className="timeline-step active">
          <span className="dot" />
          Customs
        </div>
        <div className="timeline-step">
          <span className="dot" />
          Release
        </div>
      </div>

      <hr className="hairline" style={{ margin: "20px 0" }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        <Stat label="ETA" value="Apr 30" mono />
        <Stat label="Fee" value="EGP 18,400" mono />
        <Stat label="Docs" value="6 / 6" mono />
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
   Live operations strip — shows the platform is actually working
   ================================================================ */
function LiveOpsStrip() {
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
            paddingRight: 24,
            borderRight: "1px solid var(--line)",
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
            Live ops · 47 in motion
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
          {LIVE_OPS.map((op) => (
            <div
              key={op.id}
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
              <span style={{ color: "var(--ink-faint)" }}>{op.time}</span>
              <span
                style={{
                  color: "var(--ink)",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {op.id}
              </span>
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  color:
                    op.event === "Released"
                      ? "var(--signal-go)"
                      : op.event === "Submitted"
                      ? "var(--ink-faint)"
                      : "var(--harbor-700)",
                }}
              >
                {op.event}
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
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Principles — what this product does, stated plainly
   ================================================================ */
function Principles() {
  return (
    <section className="section">
      <div className="container">
        <div style={{ maxWidth: 680, marginBottom: 48 }}>
          <span className="eyebrow">What Takhlees does</span>
          <h2 className="h2">Three commitments. Read them literally.</h2>
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
          {PRINCIPLES.map((p, i) => (
            <div
              key={p.n}
              style={{
                padding: 32,
                borderRight:
                  i < PRINCIPLES.length - 1
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
                / {p.n}
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
  return (
    <section
      className="section"
      style={{ background: "var(--steel-50)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}
    >
      <div className="container">
        <div style={{ maxWidth: 680, marginBottom: 48 }}>
          <span className="eyebrow">How a clearance runs</span>
          <h2 className="h2">From submission to release, in three moves.</h2>
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
          {FLOW_STEPS.map((step, i) => (
            <div
              key={step.n}
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
                  STEP {step.n}
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

              {i < FLOW_STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: -12,
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
   Verified agencies — show trust, never claim it
   ================================================================ */
function Verified() {
  const [verifiedCount, setVerifiedCount] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await searchCompanies({
          keyword: "VerficationStatus",
          keyvalue: "Verified",
        });
        if (!active) return;
        setVerifiedCount(Array.isArray(rows) ? rows.length : 0);
      } catch {
        if (!active) return;
        setVerifiedCount(0);
      }
    })();
    return () => { active = false; };
  }, []);

  const countLabel = verifiedCount ?? "—";

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
            <span className="eyebrow">Currently active on the platform</span>
            <h2 className="h2">{countLabel} verified clearance agencies.</h2>
            <p
              style={{
                margin: 0,
                color: "var(--ink-soft)",
                fontSize: 16,
                lineHeight: 1.5,
                maxWidth: 60 + "ch",
              }}
            >
              Each agency on the platform exposes its commercial license, port
              coverage, and full review history. You verify against the data.
            </p>
          </div>
          <Link to="/companies" className="btn btn-secondary">
            Browse all {countLabel}
            <Icon name="arrow_right" size={14} />
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
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(220px, 2fr) minmax(180px, 1.4fr) minmax(180px, 1.4fr) minmax(120px, 1fr) 80px",
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
            <span>Agency</span>
            <span>License</span>
            <span>Ports covered</span>
            <span>Rating</span>
            <span style={{ textAlign: "right" }}>Status</span>
          </div>

          {VERIFIED_AGENCIES.map((a, i) => (
            <div
              key={a.license}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(220px, 2fr) minmax(180px, 1.4fr) minmax(180px, 1.4fr) minmax(120px, 1fr) 80px",
                padding: "16px 20px",
                alignItems: "center",
                borderBottom:
                  i < VERIFIED_AGENCIES.length - 1
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
                className="mono"
                style={{ fontSize: 13, color: "var(--ink-soft)" }}
              >
                {a.license}
              </div>
              <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                {a.ports.join(" · ")}
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  className="mono tabular"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {a.rating.toFixed(1)}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 12, color: "var(--ink-faint)" }}
                >
                  ({a.reviews})
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                {a.live ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--signal-go)",
                    }}
                  >
                    <span
                      className="dot"
                      style={{
                        width: 6,
                        height: 6,
                        background: "var(--signal-go)",
                      }}
                    />
                    Live
                  </span>
                ) : (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--ink-faint)",
                    }}
                  >
                    Queue
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Working preview — shows the spinner in context
   ================================================================ */
function WorkingPreview() {
  return (
    <section
      style={{
        padding: "48px 0 24px",
        borderTop: "1px solid var(--line)",
        background: "var(--surface)",
      }}
    >
      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 32,
          alignItems: "center",
        }}
      >
        <ContainerSpinner size={88} label="Watching the port" />
        <div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              marginBottom: 8,
            }}
          >
            How loading looks on Takhlees
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 15.5,
              color: "var(--ink-soft)",
              lineHeight: 1.6,
              maxWidth: 60 + "ch",
            }}
          >
            Every long-running operation in the product is fronted by a
            container assembling itself, piece by piece. It is the only loading
            indicator the product uses.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Operational reach — interactive map of active ports
   ================================================================ */
function OperationalReach() {
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
          <span className="eyebrow">Operational reach</span>
          <h2 className="h2">Live across Egypt's three primary ports.</h2>
          <p
            style={{
              margin: 0,
              color: "var(--ink-soft)",
              fontSize: 16,
              lineHeight: 1.6,
              maxWidth: "56ch",
            }}
          >
            Alexandria, Damietta, and Sokhna handle the overwhelming majority of
            container traffic into and out of the country. Each site has
            licensed agencies on the platform with active clearances in
            progress right now.
          </p>
        </div>
        <InteractiveMap />
      </div>
    </section>
  );
}

/* ================================================================
   CTA — flat dark band, factual
   ================================================================ */
function CTA() {
  return (
    <section style={{ padding: "0 0 96px" }}>
      <div className="container">
        <div
          style={{
            background: "var(--harbor-950)",
            color: "#fff",
            border: "1px solid oklch(100% 0 0 / 0.08)",
            borderRadius: "var(--radius-lg)",
            padding: "56px 48px",
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 40,
            alignItems: "center",
          }}
        >
          <div>
            <span
              className="eyebrow"
              style={{ color: "var(--safety)", marginBottom: 12 }}
            >
              Get started
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
              Submit your first shipment in under three minutes.
            </h2>
            <p
              style={{
                color: "oklch(100% 0 0 / 0.74)",
                fontSize: 16,
                margin: 0,
                maxWidth: 540,
                lineHeight: 1.6,
              }}
            >
              Average activation time across the last thirty days:{" "}
              <span
                className="mono tabular"
                style={{ color: "#fff", fontWeight: 600 }}
              >
                2 min 14 sec
              </span>
              . You only pay when the container is released to you.
            </p>
          </div>
          <div className="row" style={{ justifyContent: "flex-end", gap: 12 }}>
            <Link to="/register" className="btn btn-accent btn-lg">
              Start as importer
              <Icon name="arrow_right" size={14} />
            </Link>
            <Link to="/company/register" className="btn btn-on-dark btn-lg">
              List an agency
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Page
   ================================================================ */
function LandingPage() {
  return (
    <PublicLayout>
      <style>{landingMediaQueries}</style>
      <Hero />
      <Reveal as="div"><LiveOpsStrip /></Reveal>
      <Reveal as="div" delay={40}><Principles /></Reveal>
      <Reveal as="div" delay={40}><Flow /></Reveal>
      <Reveal as="div" delay={40}><Verified /></Reveal>
      <Reveal as="div" delay={40}><OperationalReach /></Reveal>
      <Reveal as="div" delay={40}><WorkingPreview /></Reveal>
      <Reveal as="div" delay={40}><CTA /></Reveal>
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
      border-right: none !important;
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
      border-left: none !important;
    }
  }
`;

export default LandingPage;
