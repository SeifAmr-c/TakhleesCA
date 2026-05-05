import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { listApplications } from "../../api/applications.js";
import { useAuth } from "../../api/authState.js";

const STATUS_BADGE = {
  pending: ["badge-pending", "Pending review"],
  in_progress: ["badge-info", "In progress"],
  completed: ["badge-success", "Completed"],
};

const STEPS = ["Submitted", "Accepted", "Clearing", "Released"];

/* DB ENUM ('Pending' | 'In Progress' | 'Completed')  →  internal sentinels
   used by the rest of the UI ('pending' | 'in_progress' | 'completed').
   Anything unexpected falls back to 'pending'. */
function normalizeStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "pending") return "pending";
  if (s === "in progress" || s === "in_progress" || s === "accepted") return "in_progress";
  if (s === "completed") return "completed";
  return "pending";
}

function statusToStepIndex(status) {
  switch (status) {
    case "pending": return 0;
    case "in_progress": return 2;
    case "completed": return 3;
    default: return 0;
  }
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* Map a raw row from /application into the shape the row component expects.
   Origin/destination are derived from the joined Port + DeliveryAddress
   (backend join provides PortName, PortType, CategoryName, CompanyName, Amount). */
function shapeApplication(raw) {
  const status = normalizeStatus(raw.Status);
  return {
    ApplicationID: raw.ApplicationID,
    CompanyID: raw.CompanyID,
    CompanyName: raw.CompanyName || (raw.CompanyID ? `Company #${raw.CompanyID}` : "—"),
    Status: status,
    Origin: raw.PortName ? `${raw.PortName}${raw.PortType ? ` (${raw.PortType})` : ""}` : "Origin port",
    Destination: raw.DeliveryAddress || "Delivery address",
    CreatedAt: formatDate(raw.SubmissionDate),
    Amount: raw.Amount != null ? Number(raw.Amount) : null,
    TrackingNumber: raw.TrackingNumber || null,
    CategoryName: raw.CategoryName || null,
  };
}

function ShipmentRow({ a, onLeaveReview }) {
  const [badgeClass, label] = STATUS_BADGE[a.Status] || ["badge-info", a.Status || "Unknown"];
  const stepIdx = statusToStepIndex(a.Status);
  const isCompleted = a.Status === "completed";
  const initials = (a.CompanyName || "TK").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <div className="card card-hover">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <div className="avatar avatar-lg">{initials}</div>
          <div>
            <div className="row-meta">
              #{a.ApplicationID} · {a.CreatedAt}
              {a.TrackingNumber && <> · <span className="mono">{a.TrackingNumber}</span></>}
            </div>
            <div className="row-title" style={{ fontSize: 16 }}>
              {a.CompanyName}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Icon name="ship" size={13} />
              {a.Origin} → {a.Destination}
              {a.CategoryName && (
                <>
                  <span style={{ color: "var(--line-strong)" }}>·</span>
                  {a.CategoryName}
                </>
              )}
              {a.Amount != null && a.Amount > 0 && (
                <>
                  <span style={{ color: "var(--line-strong)" }}>·</span>
                  <strong className="mono tabular" style={{ color: "var(--ink)" }}>EGP {a.Amount.toLocaleString()}</strong>
                </>
              )}
            </div>
          </div>
        </div>
        <span className={`badge ${badgeClass}`}>
          <span className="dot" />
          {label}
        </span>
      </div>

      <hr className="divider" />

      <div className="timeline">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`timeline-step ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}
          >
            <span className="dot" />
            {s}
          </div>
        ))}
      </div>

      {isCompleted && (
        <>
          <hr className="divider" />
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-accent btn-sm"
              onClick={() => onLeaveReview?.(a)}
            >
              <Icon name="star" size={14} /> Leave a review
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Tracking() {
  const auth = useAuth();
  /* User and Client share the same primary key (single-table inheritance),
     so the ClientID we filter by is just the signed-in user's UserID. */
  const clientId = auth?.kind === "user" && auth?.role === "client"
    ? auth?.user?.UserID
    : null;

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSent, setReviewSent] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await listApplications({ ClientID: clientId });
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        setApplications(list.map(shapeApplication));
        setError("");
      } catch {
        if (!active) return;
        setError("Couldn't load your shipments. Please try again.");
        setApplications([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [clientId]);

  const summary = useMemo(() => ({
    active: applications.filter(a => a.Status === "pending" || a.Status === "in_progress").length,
    completed: applications.filter(a => a.Status === "completed").length,
    total: applications.length,
  }), [applications]);

  if (!clientId) {
    return (
      <DashboardLayout
        title="Your shipments"
        subtitle="Real-time status across all your applications."
        role="Client"
      >
        <div className="card card-pad-lg" style={{ textAlign: "center" }}>
          <Icon name="lock" size={32} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>Sign in to see your shipments</h3>
          <p style={{ color: "var(--ink-soft)" }}>
            Only signed-in clients can view their applications.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>Sign in</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Your shipments"
      subtitle="Real-time status across all your applications."
      role="Client"
      actions={
        <Link to="/companies" className="btn btn-primary">
          <Icon name="package" size={16} /> New application
        </Link>
      }
    >
      {/* Summary */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: 24 }}>
        <div className="stat">
          <div className="stat-label">Active</div>
          <div className="stat-value">{summary.active}</div>
          <div className="stat-trend up" style={{ color: "var(--gray-500)" }}>
            Pending or in progress
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{summary.completed}</div>
          <div className="stat-trend up" style={{ color: "var(--gray-500)" }}>Lifetime</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total submitted</div>
          <div className="stat-value">{summary.total}</div>
        </div>
      </div>

      {error && <div className="banner-error"><Icon name="bell" size={16} />{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <ContainerSpinner size={88} label="Loading shipments" />
        </div>
      ) : applications.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 56 }}>
          <Icon name="package" size={32} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>No shipments yet</h3>
          <p style={{ color: "var(--ink-soft)" }}>Browse companies and file your first application.</p>
          <Link to="/companies" className="btn btn-primary" style={{ marginTop: 16 }}>Browse companies</Link>
        </div>
      ) : (
        <Reveal as="div">
          <div className="grid">
            {applications.map((a) => (
              <ShipmentRow
                key={a.ApplicationID}
                a={a}
                onLeaveReview={(row) => {
                  setReviewTarget(row);
                  setReviewRating(5);
                  setReviewText("");
                  setReviewSent(false);
                }}
              />
            ))}
          </div>
        </Reveal>
      )}

      {reviewTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setReviewTarget(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "oklch(15% 0.045 245 / 0.45)",
            display: "grid",
            placeItems: "center",
            padding: 24,
            zIndex: 100,
          }}
        >
          <div
            className="card card-pad-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 480 }}
          >
            <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <span className="eyebrow" style={{ color: "var(--teal-dark)" }}>
                  Application #{reviewTarget.ApplicationID}
                </span>
                <h3 className="card-title">Leave a review</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setReviewTarget(null)}
              >
                Close
              </button>
            </div>

            {reviewSent ? (
              <div className="banner-success" style={{ marginTop: 8 }}>
                <Icon name="check" size={16} />
                Thanks — your review for {reviewTarget.CompanyName} has been recorded.
              </div>
            ) : (
              <div className="stack" style={{ marginTop: 8 }}>
                <div className="field">
                  <span className="field-label">Rating</span>
                  <div className="row" style={{ gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewRating(i)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: 4, height: 32, width: 32 }}
                        aria-label={`${i} star${i > 1 ? "s" : ""}`}
                      >
                        <Icon
                          name="star"
                          size={20}
                          color={i <= reviewRating ? "var(--accent)" : "var(--line-strong)"}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <label className="field">
                  <span className="field-label">Tell others how it went</span>
                  <textarea
                    className="textarea"
                    rows={4}
                    placeholder="What did the company do well? Anything they could improve?"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                </label>

                <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setReviewTarget(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setReviewSent(true)}
                    disabled={!reviewText.trim()}
                  >
                    <Icon name="check" size={14} /> Submit review
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default Tracking;
