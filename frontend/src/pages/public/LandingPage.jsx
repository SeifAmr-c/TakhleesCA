import React from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";

const FEATURES = [
  {
    icon: "shield",
    title: "Verified companies",
    body: "Every clearance partner is vetted, KYB-checked, and reviewed by clients before going live.",
  },
  {
    icon: "ship",
    title: "End-to-end tracking",
    body: "From application submitted to cargo released — see every milestone in real time.",
  },
  {
    icon: "receipt",
    title: "One transparent fee",
    body: "Clear quotes up front. Pay once, on completion. No surprise charges, no hidden brokers.",
  },
  {
    icon: "doc",
    title: "Document vault",
    body: "Upload once, share securely. Bills of lading, invoices, certificates — all in one place.",
  },
];

const STATS = [
  { value: "12K+", label: "Shipments cleared" },
  { value: "180+", label: "Verified companies" },
  { value: "98%", label: "On-time milestone" },
  { value: "EGP 240M", label: "Processed value" },
];

const TESTIMONIALS = [
  {
    quote:
      "We cut our average clearance time in half. Takhlees gave us a single dashboard for what used to be twelve phone calls a day.",
    name: "Karim Hassan",
    role: "Ops Lead, Nile Imports",
    initials: "KH",
  },
  {
    quote:
      "The verification step is the difference. Our clients trust us more because Takhlees vouched for us first.",
    name: "Hanan Ali",
    role: "Founder, Alex Maritime Logistics",
    initials: "HA",
  },
  {
    quote:
      "Finally, no spreadsheets. Status updates land in the dashboard before my team even asks.",
    name: "Mostafa Younes",
    role: "Procurement, Redwave Trading",
    initials: "MY",
  },
];

function LandingPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="hero hero-pad">
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 48, alignItems: "center" }}>
          <div>
            <span className="badge badge-glass" style={{ marginBottom: 18 }}>
              <Icon name="sparkle" size={14} /> B2B2C marketplace · Egypt
            </span>
            <h1 className="h1 gradient-text" style={{ fontSize: 64 }}>
              Port clearance, finally without the friction.
            </h1>
            <p className="lead" style={{ color: "rgba(255,255,255,0.85)", fontSize: 19, maxWidth: 540 }}>
              Takhlees connects importers and exporters with verified clearance
              specialists. Submit your shipment, track every step, pay once —
              all in one trusted platform.
            </p>
            <div className="row" style={{ marginTop: 28 }}>
              <Link to="/register" className="btn btn-accent btn-lg">
                Get started <Icon name="arrow_right" size={16} />
              </Link>
              <Link to="/companies" className="btn btn-on-dark btn-lg">
                <Icon name="building" size={16} /> Browse companies
              </Link>
            </div>

            <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex" }}>
                {["KH", "HA", "MY", "SD"].map((i, idx) => (
                  <div
                    key={i}
                    className="avatar"
                    style={{
                      marginLeft: idx === 0 ? 0 : -10,
                      border: "2px solid #06152e",
                      width: 36, height: 36,
                    }}
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 13 }}>
                <strong style={{ color: "#fff" }}>180+ companies</strong> already on the platform
              </div>
            </div>
          </div>

          {/* Hero visual: mock dashboard card */}
          <div style={{ position: "relative" }}>
            <div
              className="card-glow float-anim"
              style={{ background: "rgba(255,255,255,0.96)", padding: 22 }}
            >
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
                <span className="badge badge-dark"><Icon name="ship" size={12} /> Shipment #2031</span>
                <span className="badge badge-success"><span className="dot" /> In progress</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 6 }}>
                Shanghai → Alexandria
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)" }}>
                Cairo Clearance Co.
              </div>
              <div className="timeline" style={{ marginTop: 22 }}>
                <div className="timeline-step done"><span className="dot" />Submitted</div>
                <div className="timeline-step done"><span className="dot" />Accepted</div>
                <div className="timeline-step active"><span className="dot" />Clearing</div>
                <div className="timeline-step"><span className="dot" />Released</div>
              </div>
              <hr className="divider" style={{ margin: "18px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span className="muted">ETA</span>
                <strong style={{ color: "var(--navy)" }}>Apr 30, 2026</strong>
              </div>
            </div>
            <div
              className="card"
              style={{
                position: "absolute",
                left: -20,
                bottom: -28,
                background: "#fff",
                padding: 14,
                width: 200,
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <div className="row" style={{ gap: 10 }}>
                <div className="card-icon card-icon-accent" style={{ marginBottom: 0, width: 36, height: 36 }}>
                  <Icon name="receipt" size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--gray-500)" }}>Saved this quarter</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)" }}>EGP 84,200</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo wall */}
      <section style={{ padding: "40px 0 0", background: "var(--paper)" }}>
        <div className="container">
          <p className="muted" style={{ textAlign: "center", fontSize: 13, marginBottom: 20 }}>
            Trusted by clearance teams across Egyptian ports
          </p>
          <div className="logo-wall">
            {["NILE IMP", "ALEX MAR", "SUEZ PORT", "REDWAVE", "CAIRO CLR", "NORTHPORT"].map(
              (l) => (
                <div key={l} className="logo-mark">{l}</div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 48px" }}>
            <span className="eyebrow">Why Takhlees</span>
            <h2 className="h2">A trust layer for cross-border trade</h2>
            <p className="lead">
              Built from the ground up around the realities of Egyptian port
              clearance — verified partners, real-time visibility, and one
              transparent fee.
            </p>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="card card-hover">
                <div className="card-icon">
                  <Icon name={f.icon} />
                </div>
                <h3 className="h3">{f.title}</h3>
                <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: "0 0 80px" }}>
        <div className="container">
          <div className="card-glow card-pad-lg" style={{ padding: 40 }}>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              {STATS.map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{
                    fontSize: 38,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--navy)",
                    background: "linear-gradient(135deg, var(--navy) 0%, var(--teal) 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}>
                    {s.value}
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "var(--gray-50)" }} className="section">
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px" }}>
            <span className="eyebrow">How it works</span>
            <h2 className="h2">Three steps. Zero phone calls.</h2>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {[
              { n: "01", title: "Pick a verified company", body: "Browse vetted clearance providers, compare reviews, services, and pricing." },
              { n: "02", title: "File your application", body: "Upload documents, choose a category, and submit. The company takes it from there." },
              { n: "03", title: "Track and pay", body: "Real-time status updates and one secure payment when the work is done." },
            ].map((step) => (
              <div key={step.n} className="card card-hover" style={{ position: "relative", paddingTop: 32 }}>
                <div style={{
                  position: "absolute",
                  top: -18,
                  left: 24,
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, var(--navy), var(--navy-soft))",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: 13,
                  boxShadow: "var(--shadow)",
                }}>
                  {step.n}
                </div>
                <h3 className="h3">{step.title}</h3>
                <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px" }}>
            <span className="eyebrow">From the field</span>
            <h2 className="h2">Operations teams move faster on Takhlees</h2>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card card-hover">
                <div className="row" style={{ marginBottom: 14 }}>
                  {[1,2,3,4,5].map((i) => (
                    <Icon key={i} name="star" size={16} color="var(--accent)" />
                  ))}
                </div>
                <p style={{ margin: 0, color: "var(--gray-800)", fontSize: 15, lineHeight: 1.6 }}>
                  “{t.quote}”
                </p>
                <hr className="divider" />
                <div className="row" style={{ gap: 12 }}>
                  <div className="avatar">{t.initials}</div>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: 14 }}>{t.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "20px 0 80px" }}>
        <div className="container">
          <div
            style={{
              borderRadius: "var(--radius-xl)",
              padding: "56px 48px",
              background:
                "radial-gradient(60% 100% at 100% 0%, rgba(232,155,60,0.25), transparent 60%), linear-gradient(135deg, #06152e 0%, #0a1f3d 60%, #15355c 100%)",
              color: "#fff",
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: 32,
              alignItems: "center",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div>
              <h2 className="h2" style={{ color: "#fff", marginBottom: 8 }}>
                Ready to clear faster?
              </h2>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 17, margin: 0, maxWidth: 520, lineHeight: 1.6 }}>
                Create your account in under two minutes — or list your
                clearance company and start receiving verified requests today.
              </p>
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <Link to="/register" className="btn btn-accent btn-lg">
                Start as a client <Icon name="arrow_right" size={16} />
              </Link>
              <Link to="/company/register" className="btn btn-on-dark btn-lg">
                List a company
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export default LandingPage;
