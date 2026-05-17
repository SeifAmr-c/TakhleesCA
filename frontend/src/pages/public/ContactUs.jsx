import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { submitSupportTicket } from "../../api/payments.js";
import { listMyTickets, updateMyTicket, deleteMyTicket } from "../../api/tickets.js";
import { useAuth } from "../../api/authState.js";

const CONTACTS = [
  { icon: "email", label: "Email", value: "support@takhlees.com" },
  { icon: "phone", label: "Phone", value: "+20 100 000 0000" },
  { icon: "pin", label: "Office", value: "Smart Village, 6th Oct., Egypt" },
];

function ContactUs() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = auth?.kind === "user";
  const isClient = isLoggedIn && auth?.role === "client";
  const clientId = isClient ? auth?.user?.UserID : null;
  const fullName = isLoggedIn
    ? [auth.user?.FirstName, auth.user?.LastName].filter(Boolean).join(" ")
    : "";

  const [form, setForm] = useState({ Name: "", Email: "", Message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketEditingId, setTicketEditingId] = useState(null);
  const [ticketEditIssue, setTicketEditIssue] = useState("");
  const [ticketDeleteConfirmId, setTicketDeleteConfirmId] = useState(null);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [ticketNotice, setTicketNotice] = useState("");
  const [ticketError, setTicketError] = useState("");

  useEffect(() => {
    if (isLoggedIn) {
      setForm((f) => ({
        ...f,
        ...(fullName ? { Name: fullName } : {}),
        ...(auth.user?.Email ? { Email: auth.user.Email } : {}),
      }));
    }
  }, [isLoggedIn, fullName, auth]);

  useEffect(() => {
    if (!clientId) return;
    setTicketsLoading(true);
    listMyTickets()
      .then((res) => setTickets(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setTickets([]))
      .finally(() => setTicketsLoading(false));
  }, [clientId]);

  const showTicketNotice = (msg) => {
    setTicketNotice(msg);
    setTimeout(() => setTicketNotice(""), 3500);
  };

  const handleTicketEdit = (ticket) => {
    setTicketEditingId(ticket.TicketID);
    setTicketEditIssue(ticket.Issue);
    setTicketDeleteConfirmId(null);
    setTicketError("");
  };

  const handleTicketSave = async (ticketId) => {
    if (!ticketEditIssue.trim()) return;
    setTicketBusy(true);
    setTicketError("");
    try {
      await updateMyTicket(ticketId, { Issue: ticketEditIssue.trim() });
      setTickets((prev) => prev.map((t) => t.TicketID === ticketId ? { ...t, Issue: ticketEditIssue.trim() } : t));
      setTicketEditingId(null);
      showTicketNotice("Ticket updated.");
    } catch (err) {
      setTicketError(err?.response?.data?.message || "Couldn't update the ticket.");
    } finally {
      setTicketBusy(false);
    }
  };

  const handleTicketDelete = async (ticketId) => {
    setTicketBusy(true);
    setTicketError("");
    try {
      await deleteMyTicket(ticketId);
      setTickets((prev) => prev.filter((t) => t.TicketID !== ticketId));
      setTicketDeleteConfirmId(null);
      showTicketNotice("Ticket deleted.");
    } catch (err) {
      setTicketError(err?.response?.data?.message || "Couldn't delete the ticket.");
      setTicketDeleteConfirmId(null);
    } finally {
      setTicketBusy(false);
    }
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLoggedIn) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    if (!form.Message.trim()) {
      return setError("Please describe your issue before submitting.");
    }

    setSubmitting(true);
    try {
      await submitSupportTicket({
        Issue: form.Message.trim(),
        ClientID: auth.user?.UserID,
        Resolved: 0,
        AdminID: null,
      });
      setSuccess(true);
      setForm((f) => ({ ...f, Message: "" }));
      listMyTickets()
        .then((res) => setTickets(Array.isArray(res?.data) ? res.data : []))
        .catch(() => {});
      setTimeout(() => setSuccess(false), 3000);
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
      <Reveal as="section" className="section">
        <div
          className="container reach-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)",
            gap: 48,
          }}
        >
          <div>
            <span className="eyebrow">Contact</span>
            <h1 className="h1" style={{ fontSize: 44 }}>Talk to us.</h1>
            <p className="lead">
              Onboarding, pricing, or a shipment that needs attention &mdash; drop
              us a line and a real human will reply.
            </p>

            <div className="stack" style={{ marginTop: 32 }}>
              {CONTACTS.map((c) => (
                <div key={c.label} className="row" style={{ gap: 14 }}>
                  <div
                    className="card-icon"
                    style={{ marginBottom: 0, width: 40, height: 40 }}
                  >
                    <Icon name={c.icon} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.10em",
                        color: "var(--ink-faint)",
                      }}
                    >
                      {c.label}
                    </div>
                    <div
                      style={{
                        color: "var(--ink)",
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      {c.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginTop: 32, background: "var(--steel-50)" }}>
              <div className="row" style={{ gap: 12, marginBottom: 8 }}>
                <Icon name="bell" color="var(--ink)" />
                <strong style={{ color: "var(--ink)" }}>Operating hours</strong>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>
                Sun&ndash;Thu, 9am&ndash;6pm EET. Urgent shipment issues are
                answered around the clock.
              </p>
            </div>
          </div>

          <div className="card card-pad-lg">
            <h2 className="h3" style={{ fontSize: 20, marginBottom: 16 }}>Send a message</h2>
            {error && <div className="banner-error"><Icon name="bell" size={18} />{error}</div>}
            {success && (
              <div className="banner-success">
                <Icon name="check" size={18} />
                Your ticket has been submitted successfully!
              </div>
            )}
            <form onSubmit={handleSubmit} className="stack" noValidate>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span className="field-label">Your name</span>
                  <input
                    className="input"
                    value={form.Name}
                    onChange={update("Name")}
                    disabled={submitting}
                    readOnly={isLoggedIn}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Email</span>
                  <div className="input-with-icon">
                    <span className="input-icon"><Icon name="email" size={16} /></span>
                    <input
                      type="email"
                      className="input"
                      value={form.Email}
                      onChange={update("Email")}
                      disabled={submitting}
                      readOnly={isLoggedIn}
                      required
                    />
                  </div>
                </label>
              </div>
              <label className="field">
                <span className="field-label">Message</span>
                <textarea
                  className="textarea"
                  rows={6}
                  value={form.Message}
                  onChange={update("Message")}
                  disabled={submitting}
                  required
                  placeholder="Tell us more…"
                />
              </label>
              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={submitting || success}
              >
                {submitting ? (
                  <ContainerSpinner inline size={20} label="Sending…" />
                ) : (
                  <>Send message <Icon name="arrow_right" size={16} /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </Reveal>

      {isClient && (
        <Reveal as="section" className="section" style={{ paddingTop: 0 }}>
          <div className="container" style={{ maxWidth: 900 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <div>
                <span className="eyebrow">Help &amp; support</span>
                <h2 className="h3" style={{ fontSize: 20 }}>My support tickets</h2>
              </div>
            </div>

            {ticketNotice && (
              <div className="banner-success" style={{ marginBottom: 12 }}>
                <Icon name="check" size={14} />{ticketNotice}
              </div>
            )}
            {ticketError && (
              <div className="banner-error" style={{ marginBottom: 12 }}>
                <Icon name="bell" size={14} />{ticketError}
              </div>
            )}

            {ticketsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                <ContainerSpinner size={60} label="Loading tickets" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 40 }}>
                <Icon name="bell" size={24} color="var(--ink-faint)" />
                <h3 className="h3" style={{ marginTop: 12 }}>No support tickets yet</h3>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  Use the form above to submit a support request.
                </p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {tickets.map((t, i) => {
                    const isResolved = Number(t.Resolved) === 1;
                    const isEditing = ticketEditingId === t.TicketID;
                    const isConfirmingDelete = ticketDeleteConfirmId === t.TicketID;
                    return (
                      <li
                        key={t.TicketID}
                        style={{
                          padding: "16px 20px",
                          borderBottom: i === tickets.length - 1 ? "none" : "1px solid var(--gray-100)",
                        }}
                      >
                        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                                #{t.TicketID}
                              </span>
                              {isResolved ? (
                                <span className="badge badge-success"><span className="dot" />Resolved</span>
                              ) : (
                                <span className="badge badge-pending"><span className="dot" />Open</span>
                              )}
                            </div>
                            {isEditing ? (
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
                                <input
                                  className="input"
                                  style={{ flex: 1, minWidth: 180, fontSize: 14 }}
                                  value={ticketEditIssue}
                                  onChange={(e) => setTicketEditIssue(e.target.value)}
                                  disabled={ticketBusy}
                                  autoFocus
                                />
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleTicketSave(t.TicketID)}
                                  disabled={ticketBusy || !ticketEditIssue.trim()}
                                >
                                  {ticketBusy ? <ContainerSpinner inline size={14} label="Saving…" /> : <><Icon name="check" size={13} /> Save</>}
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setTicketEditingId(null)}
                                  disabled={ticketBusy}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <p style={{ margin: 0, fontSize: 14, color: "var(--gray-800)", lineHeight: 1.5 }}>
                                {t.Issue}
                              </p>
                            )}
                            {isResolved && t.AdminName && (
                              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                                Resolved by <strong style={{ color: "var(--navy)" }}>{t.AdminName}</strong>
                              </div>
                            )}
                          </div>

                          {!isResolved && !isEditing && (
                            <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                              {isConfirmingDelete ? (
                                <>
                                  <span style={{ fontSize: 12, color: "var(--ink-faint)", alignSelf: "center" }}>Delete?</span>
                                  <button className="btn btn-ghost btn-sm" onClick={() => setTicketDeleteConfirmId(null)} disabled={ticketBusy}>Cancel</button>
                                  <button
                                    className="btn btn-sm"
                                    style={{ background: "var(--signal-stop,#dc2626)", color: "#fff", border: "1px solid var(--signal-stop,#dc2626)" }}
                                    onClick={() => handleTicketDelete(t.TicketID)}
                                    disabled={ticketBusy}
                                  >
                                    {ticketBusy ? <ContainerSpinner inline size={14} label="Deleting…" /> : "Confirm"}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button className="btn btn-ghost btn-sm" onClick={() => handleTicketEdit(t)}>Edit</button>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ color: "var(--signal-stop,#dc2626)" }}
                                    onClick={() => { setTicketDeleteConfirmId(t.TicketID); setTicketEditingId(null); }}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </Reveal>
      )}
    </PublicLayout>
  );
}

export default ContactUs;
