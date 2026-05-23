import React from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Reveal from "../../components/Reveal.jsx";

const LAST_UPDATED = "May 23, 2026";

const SECTIONS = [
  {
    title: "Information we collect",
    body: (
      <>
        <p>
          When you create an account we collect your name, email, phone number,
          national ID, and address so partner clearance companies can verify
          you and execute customs paperwork on your behalf. Companies that list
          on Takhlees additionally supply commercial registration, tax number,
          and authorized contact details.
        </p>
        <p>
          When you submit a clearance application we collect the cargo and
          shipment information you enter, plus any documents you upload
          (bills of lading, invoices, certificates of origin). Payment events
          are recorded as ledger rows &mdash; we do not store full card numbers
          or CVCs.
        </p>
        <p>
          We log basic technical data &mdash; IP address, browser, and request
          timestamps &mdash; for security, abuse prevention, and debugging.
        </p>
      </>
    ),
  },
  {
    title: "How we use it",
    body: (
      <>
        <p>
          We use your data to operate the platform: to route your application
          to the company you selected, to let you and the company exchange
          documents, to display shipment status, and to bill the fixed
          platform fee plus the company&rsquo;s commission.
        </p>
        <p>
          We use it to keep the service secure &mdash; rate-limiting, fraud
          checks, and investigating reported abuse. We use it to communicate
          with you about your applications, support tickets, and material
          changes to the service. We do not sell your personal information.
        </p>
      </>
    ),
  },
  {
    title: "Who we share it with",
    body: (
      <>
        <p>
          The clearance company you select sees the information needed to
          execute your application &mdash; your name, contact details, and the
          documents you uploaded. Companies are contractually bound to use
          that data only for the clearance work you engaged them for.
        </p>
        <p>
          We use a small set of infrastructure providers to operate the
          service: MongoDB Atlas for database hosting, Cloudinary for
          document and image storage, and a payment processor for card
          handling. These providers process data on our behalf under their
          own security commitments.
        </p>
        <p>
          We will disclose information to authorities when compelled by valid
          legal process under Egyptian law, and we will notify you unless the
          legal process forbids it.
        </p>
      </>
    ),
  },
  {
    title: "How long we keep it",
    body: (
      <>
        <p>
          Account data is retained while your account is active. Clearance
          applications, uploaded documents, and payment ledger entries are
          retained for seven years after completion to satisfy Egyptian
          customs and tax record-keeping requirements. Support tickets are
          retained for two years.
        </p>
        <p>
          You can request account deletion at any time; we will remove
          identifiers from records that are not subject to a legal retention
          obligation, and anonymize the rest.
        </p>
      </>
    ),
  },
  {
    title: "Your rights",
    body: (
      <>
        <p>
          You can view and edit your profile, change your password, and
          download copies of the documents you uploaded directly from your
          dashboard. To request deletion, correction of data you cannot edit
          yourself, or a portable export of your full account, write to
          privacy@takhlees.com.
        </p>
        <p>
          We aim to respond within 14 days. If you believe we have mishandled
          your data, you may also contact the Egyptian Personal Data
          Protection Center.
        </p>
      </>
    ),
  },
  {
    title: "Cookies and sessions",
    body: (
      <>
        <p>
          We use a single first-party session cookie to keep you signed in.
          It expires 30 minutes after your last activity and is marked
          HttpOnly and SameSite=Lax. We do not use advertising or
          cross-site tracking cookies.
        </p>
      </>
    ),
  },
  {
    title: "Security",
    body: (
      <>
        <p>
          Passwords are hashed with bcrypt. Connections to the platform are
          served over HTTPS. Uploaded documents are stored with access scoped
          to the application they belong to. No system is perfectly secure;
          if we discover a breach affecting your data, we will notify you
          without undue delay.
        </p>
      </>
    ),
  },
  {
    title: "Changes to this policy",
    body: (
      <>
        <p>
          When we make material changes we will update the date at the top of
          this page and, where appropriate, notify you in-app or by email
          before the changes take effect. Continued use of the service after
          a change constitutes acceptance of the revised policy.
        </p>
      </>
    ),
  },
  {
    title: "Contact",
    body: (
      <>
        <p>
          Questions about this policy or how we handle your data:
          <br />
          <strong>privacy@takhlees.com</strong>
          <br />
          Takhlees, Smart Village, 6th of October City, Egypt.
        </p>
      </>
    ),
  },
];

function PrivacyPolicy() {
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
            Legal &middot; Privacy
          </span>
          <h1
            className="h1 fade-up stagger-2"
            style={{
              color: "oklch(98% 0.005 245)",
              marginBottom: 16,
              fontSize: "clamp(36px, 4.6vw, 52px)",
            }}
          >
            Privacy Policy
          </h1>
          <p
            className="lead fade-up stagger-3"
            style={{ color: "oklch(100% 0 0 / 0.74)", fontSize: 18 }}
          >
            What we collect, why we collect it, and the controls you have over
            your data on Takhlees.
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
            Last updated &middot; {LAST_UPDATED}
          </p>
        </div>
      </section>

      <Reveal as="section" className="section" style={{ paddingTop: 32 }}>
        <div className="container container-narrow">
          <div className="card card-pad-lg">
            <p className="lead" style={{ marginTop: 0 }}>
              Takhlees connects Egyptian importers and exporters with verified
              clearance companies. To do that we have to handle some personal
              and commercial data. This page explains what, why, and for how
              long &mdash; in plain language, with no dark patterns.
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="section" style={{ paddingTop: 0 }}>
        <div className="container container-narrow">
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {SECTIONS.map((s, i) => (
              <li
                key={s.title}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr",
                  gap: 20,
                  padding: "28px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--line)",
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
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h2
                    className="h3"
                    style={{ marginTop: 0, marginBottom: 12 }}
                  >
                    {s.title}
                  </h2>
                  <div
                    style={{
                      color: "var(--ink-soft)",
                      lineHeight: 1.7,
                      fontSize: 15,
                    }}
                  >
                    {s.body}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </PublicLayout>
  );
}

export default PrivacyPolicy;
