import React, { useState } from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import { submitSupportTicket } from "../../api/payments.js";

const CONTACTS = [
  { icon: "email", label: "Email", value: "support@takhlees.com" },
  { icon: "phone", label: "Phone", value: "+20 100 000 0000" },
  { icon: "pin", label: "Office", value: "Smart Village, 6th Oct., Egypt" },
];

function ContactUs() {
  const [form, setForm] = useState({ Name: "", Email: "", Subject: "", Message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.Name.trim() || !form.Email.trim() || !form.Message.trim()) {
      return setError("Please fill in your name, email, and message.");
    }
    setSubmitting(true);
    try {
      await submitSupportTicket(form);
      setSuccess("Thanks — we’ll reply within one business day.");
      setForm({ Name: "", Email: "", Subject: "", Message: "" });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Could not send your message. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="section">
        <div className="container" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)", gap: 48 }}>
          <div>
            <span className="eyebrow">Contact</span>
            <h1 className="h1" style={{ fontSize: 44 }}>Talk to us.</h1>
            <p className="lead">
              Onboarding, pricing, or a shipment that needs attention — drop us
              a line and a real human will reply.
            </p>

            <div className="stack" style={{ marginTop: 32 }}>
              {CONTACTS.map((c) => (
                <div key={c.label} className="row" style={{ gap: 14 }}>
                  <div className="card-icon" style={{ marginBottom: 0, width: 40, height: 40 }}>
                    <Icon name={c.icon} />
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {c.label}
                    </div>
                    <div style={{ color: "var(--navy)", fontWeight: 600, marginTop: 2 }}>
                      {c.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginTop: 32, background: "var(--gray-50)" }}>
              <div className="row" style={{ gap: 12, marginBottom: 8 }}>
                <Icon name="bell" color="var(--navy)" />
                <strong style={{ color: "var(--navy)" }}>Operating hours</strong>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                Sun–Thu, 9am–6pm EET. Urgent shipment issues are answered around the clock.
              </p>
            </div>
          </div>

          <div className="card-glow card-pad-lg" style={{ padding: 32 }}>
            <h2 className="h3" style={{ fontSize: 20, marginBottom: 16 }}>Send a message</h2>
            {error && <div className="banner-error"><Icon name="bell" size={18} />{error}</div>}
            {success && <div className="banner-success"><Icon name="check" size={18} />{success}</div>}
            <form onSubmit={handleSubmit} className="stack" noValidate>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span className="field-label">Your name</span>
                  <input className="input" value={form.Name} onChange={update("Name")} disabled={submitting} required />
                </label>
                <label className="field">
                  <span className="field-label">Email</span>
                  <div className="input-with-icon">
                    <span className="input-icon"><Icon name="email" size={16} /></span>
                    <input type="email" className="input" value={form.Email} onChange={update("Email")} disabled={submitting} required />
                  </div>
                </label>
              </div>
              <label className="field">
                <span className="field-label">Subject</span>
                <input className="input" value={form.Subject} onChange={update("Subject")} disabled={submitting} placeholder="What can we help with?" />
              </label>
              <label className="field">
                <span className="field-label">Message</span>
                <textarea className="textarea" rows={6} value={form.Message} onChange={update("Message")} disabled={submitting} required placeholder="Tell us more…" />
              </label>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
                {submitting ? "Sending…" : <>Send message <Icon name="arrow_right" size={16} /></>}
              </button>
            </form>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export default ContactUs;
