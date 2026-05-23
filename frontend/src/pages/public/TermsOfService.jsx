import React from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Reveal from "../../components/Reveal.jsx";

const LAST_UPDATED = "May 23, 2026";

const SECTIONS = [
  {
    title: "What Takhlees is",
    body: (
      <>
        <p>
          Takhlees is a marketplace that connects importers and exporters
          (&ldquo;clients&rdquo;) with licensed customs clearance companies
          (&ldquo;companies&rdquo;) operating at Egyptian ports. We provide
          the dashboard, document exchange, and payment rails. We are not a
          customs broker and we do not perform clearance work ourselves.
        </p>
      </>
    ),
  },
  {
    title: "Your account",
    body: (
      <>
        <p>
          You must be at least 18 years old and legally able to enter
          contracts in Egypt to register. You are responsible for keeping your
          password confidential and for everything done under your account.
          Notify us immediately at support@takhlees.com if you suspect
          unauthorized access.
        </p>
        <p>
          Information you provide at registration must be accurate.
          Companies must hold a valid commercial registration and customs
          license; we verify these before activation.
        </p>
      </>
    ),
  },
  {
    title: "How a clearance engagement works",
    body: (
      <>
        <p>
          When you submit an application to a company, you propose a
          clearance engagement on the terms shown in the company&rsquo;s
          listing. The contract is between you and the company &mdash; Takhlees
          is not a party to it. The company may accept, request changes, or
          decline. Once both sides accept, the engagement is binding under
          the company&rsquo;s published rates and Egyptian customs law.
        </p>
        <p>
          The clearance company is solely responsible for executing the
          engagement, including the accuracy of declarations filed on your
          behalf and compliance with customs regulations.
        </p>
      </>
    ),
  },
  {
    title: "Fees and payments",
    body: (
      <>
        <p>
          Takhlees charges a fixed platform fee per application, disclosed at
          checkout, and collects a commission from the clearance company on
          the engagement value. You will see the total payable before you
          confirm.
        </p>
        <p>
          Payments are processed by a third-party payment processor. We do
          not store full card numbers or CVCs. Once a payment is confirmed it
          is non-refundable except where required by Egyptian law, or where
          the engagement is cancelled in writing by the company before any
          clearance work has begun.
        </p>
      </>
    ),
  },
  {
    title: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul style={{ paddingLeft: 20, margin: "8px 0 0", lineHeight: 1.7 }}>
          <li>use Takhlees for any unlawful import or export, including sanctioned, smuggled, or counterfeit goods;</li>
          <li>upload forged invoices, certificates of origin, or other documents;</li>
          <li>impersonate another person, company, or government entity;</li>
          <li>scrape, reverse-engineer, or otherwise circumvent the platform&rsquo;s technical controls;</li>
          <li>post reviews you were paid to write, or attempt to manipulate ratings;</li>
          <li>interfere with other users&rsquo; access or the security of the service.</li>
        </ul>
        <p style={{ marginTop: 16 }}>
          We may suspend or terminate accounts that violate these rules,
          without notice where the violation is ongoing or harmful.
        </p>
      </>
    ),
  },
  {
    title: "Content and documents you upload",
    body: (
      <>
        <p>
          You retain all rights to the documents and content you upload. You
          grant Takhlees a limited license to store, transmit, and display
          that content for the sole purpose of operating the platform and
          delivering it to the company you engaged.
        </p>
        <p>
          You are responsible for ensuring you have the right to share the
          documents you upload and that they are accurate.
        </p>
      </>
    ),
  },
  {
    title: "Reviews",
    body: (
      <>
        <p>
          You may leave one review per completed engagement. Reviews must
          reflect a genuine experience. We may remove reviews that are
          off-topic, defamatory, contain personal data of third parties, or
          appear to be paid or coordinated.
        </p>
      </>
    ),
  },
  {
    title: "Service availability",
    body: (
      <>
        <p>
          We work to keep Takhlees available around the clock, but we do not
          guarantee uninterrupted access. We may schedule maintenance, and
          outages may occur. We will use reasonable efforts to give advance
          notice of planned downtime.
        </p>
      </>
    ),
  },
  {
    title: "Disclaimers and liability",
    body: (
      <>
        <p>
          Takhlees is provided &ldquo;as is.&rdquo; To the maximum extent
          permitted by Egyptian law, we disclaim implied warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that listings are error-free or
          that any particular outcome will be achieved by a clearance
          company.
        </p>
        <p>
          To the maximum extent permitted by law, our aggregate liability
          arising from your use of Takhlees is limited to the fees you paid
          to Takhlees (excluding amounts paid to companies) in the 12 months
          preceding the event giving rise to the claim. Nothing in these
          Terms limits liability that cannot be limited under Egyptian law.
        </p>
      </>
    ),
  },
  {
    title: "Termination",
    body: (
      <>
        <p>
          You may close your account at any time from your profile settings.
          We may suspend or terminate accounts that violate these Terms or
          where required by law. Provisions intended to survive termination
          (payment obligations, liability limits, governing law) will
          continue to apply.
        </p>
      </>
    ),
  },
  {
    title: "Changes to these terms",
    body: (
      <>
        <p>
          We may update these Terms from time to time. When we make material
          changes we will update the date at the top of this page and notify
          you in-app or by email. If you do not agree with the revised Terms
          you must stop using the service.
        </p>
      </>
    ),
  },
  {
    title: "Governing law",
    body: (
      <>
        <p>
          These Terms are governed by the laws of the Arab Republic of Egypt.
          Disputes arising out of or relating to these Terms or the service
          will be brought before the competent courts of Cairo.
        </p>
      </>
    ),
  },
  {
    title: "Contact",
    body: (
      <>
        <p>
          Questions about these Terms:
          <br />
          <strong>legal@takhlees.com</strong>
          <br />
          Takhlees, Smart Village, 6th of October City, Egypt.
        </p>
      </>
    ),
  },
];

function TermsOfService() {
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
            Legal &middot; Terms
          </span>
          <h1
            className="h1 fade-up stagger-2"
            style={{
              color: "oklch(98% 0.005 245)",
              marginBottom: 16,
              fontSize: "clamp(36px, 4.6vw, 52px)",
            }}
          >
            Terms of Service
          </h1>
          <p
            className="lead fade-up stagger-3"
            style={{ color: "oklch(100% 0 0 / 0.74)", fontSize: 18 }}
          >
            The agreement between you and Takhlees when you use the platform
            &mdash; what we provide, what we expect, and what happens when
            things go wrong.
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
              By creating an account or otherwise using Takhlees you agree to
              these Terms. Please read them in full. If you are using the
              service on behalf of a company, you confirm you are authorized
              to bind that company to these Terms.
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

export default TermsOfService;
