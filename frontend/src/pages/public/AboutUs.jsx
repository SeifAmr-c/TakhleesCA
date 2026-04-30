import React from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";

const VALUES = [
  { icon: "shield", title: "Trust", body: "Every company on the platform is verified before going live." },
  { icon: "trending", title: "Efficiency", body: "Fewer phone calls. Less chasing. One dashboard for everything." },
  { icon: "globe", title: "Transparency", body: "Clear pricing, real-time status, and reviews from real clients." },
];

const STATS = [
  { value: "2024", label: "Founded" },
  { value: "180+", label: "Partner companies" },
  { value: "12K+", label: "Shipments cleared" },
  { value: "Egypt-wide", label: "Coverage" },
];

function AboutUs() {
  return (
    <PublicLayout>
      <section className="hero hero-pad" style={{ paddingBottom: 64 }}>
        <div className="container container-narrow" style={{ textAlign: "center" }}>
          <span className="badge badge-glass" style={{ marginBottom: 18 }}>
            <Icon name="anchor" size={14} /> About Takhlees
          </span>
          <h1 className="h1 gradient-text" style={{ marginBottom: 16 }}>
            Built so cross-border trade can finally move at internet speed.
          </h1>
          <p className="lead" style={{ color: "rgba(255,255,255,0.82)", fontSize: 19 }}>
            We’re a team of operators, engineers, and logistics veterans
            building the trust layer between importers, exporters, and the
            clearance specialists who move their cargo through Egyptian ports.
          </p>
        </div>
      </section>

      <section style={{ padding: "0 0 64px", marginTop: -48 }}>
        <div className="container">
          <div className="card-glow card-pad-lg" style={{ padding: 32 }}>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              {STATS.map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "var(--navy)", letterSpacing: "-0.02em" }}>
                    {s.value}
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container container-narrow">
          <span className="eyebrow">Our mission</span>
          <h2 className="h2">Clarity at every step of port clearance.</h2>
          <p className="lead">
            Port clearance has historically been opaque — phone calls, lost
            paperwork, unclear pricing. We’re building the digital
            infrastructure that brings it into the open: vetted partners,
            transparent fees, and a single dashboard from “submitted” to
            “released.”
          </p>
          <p className="lead" style={{ marginTop: 16 }}>
            We started Takhlees because we lived this problem ourselves.
            Importers shouldn’t lose deals waiting on faxes. Clearance
            specialists shouldn’t spend half their week chasing payments. And
            no one should wonder where their cargo is.
          </p>
        </div>
      </section>

      <section style={{ background: "var(--gray-50)" }} className="section">
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 40px" }}>
            <span className="eyebrow">What we value</span>
            <h2 className="h2">Three principles, every day</h2>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {VALUES.map((v) => (
              <div key={v.title} className="card card-hover">
                <div className="card-icon"><Icon name={v.icon} /></div>
                <h3 className="h3">{v.title}</h3>
                <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export default AboutUs;
