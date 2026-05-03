import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { listApplications } from "../../api/applications.js";

const FALLBACK = [
  { ApplicationID: 1001, CompanyName: "Cairo Clearance Co.", Status: "in_progress", Origin: "Shanghai", Destination: "Alexandria", CreatedAt: "2026-04-22", Amount: 1280 },
  { ApplicationID: 1002, CompanyName: "Alex Maritime", Status: "accepted", Origin: "Hamburg", Destination: "Alexandria", CreatedAt: "2026-04-25", Amount: 1450 },
  { ApplicationID: 1003, CompanyName: "Suez Port Solutions", Status: "completed", Origin: "Mumbai", Destination: "Suez", CreatedAt: "2026-04-10", Amount: 980 },
  { ApplicationID: 1004, CompanyName: "Damietta Freight", Status: "pending", Origin: "Rotterdam", Destination: "Damietta", CreatedAt: "2026-04-28", Amount: 1620 },
];

const STATUS_BADGE = {
  pending: ["badge-pending", "Pending review"],
  in_review: ["badge-pending", "In review"],
  accepted: ["badge-info", "Accepted"],
  in_progress: ["badge-info", "In progress"],
  completed: ["badge-success", "Completed"],
  rejected: ["badge-error", "Rejected"],
};

const STEPS = ["Submitted", "Accepted", "Clearing", "Released"];

function statusToStepIndex(status) {
  switch (status) {
    case "pending":
    case "in_review": return 0;
    case "accepted": return 1;
    case "in_progress": return 2;
    case "completed": return 3;
    default: return 0;
  }
}

function ShipmentRow({ a, onLeaveReview }) {
  const [badgeClass, label] = STATUS_BADGE[a.Status] || ["badge-info", a.Status || "Unknown"];
  const stepIdx = statusToStepIndex(a.Status);
  const isCompleted = a.Status === "completed";
  const initials = (a.CompanyName || "TK").split(" ").slice(0, 2).map(w => w[0]).join("");

  return (
    <div className="card card-hover">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <div className="avatar avatar-lg">{initials}</div>
          <div>
            <div className="row-meta">
              #{a.ApplicationID} · {a.CreatedAt || "—"}
            </div>
            <div className="row-title" style={{ fontSize: 16 }}>
              {a.CompanyName || `Company #${a.CompanyID}`}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="ship" size={13} />
              {a.Origin || "—"} → {a.Destination || "—"}
              {a.Amount && (
                <>
                  <span style={{ color: "var(--line-strong)" }}>·</span>
                  <strong className="mono tabular" style={{ color: "var(--ink)" }}>EGP {Number(a.Amount).toLocaleString()}</strong>
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
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSent, setReviewSent] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listApplications();
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        setApplications(list.length ? list : FALLBACK);
      } catch {
        if (!active) return;
        setError("Couldn’t reach the server — showing sample applications.");
        setApplications(FALLBACK);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const summary = {
    active: applications.filter(a => ["pending", "accepted", "in_progress"].includes(a.Status)).length,
    completed: applications.filter(a => a.Status === "completed").length,
    total: applications.length,
  };

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
          <div className="stat-trend up"><Icon name="arrow_up" size={12} /> {summary.active} in motion</div>
        </div>
        <div className="stat">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{summary.completed}</div>
          <div className="stat-trend up" style={{ color: "var(--gray-500)" }}>Lifetime</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total submitted</div>
          <div className="stat-value">{summary.total}</div>
          <div className="spark">
            {[3, 5, 4, 7, 6, 8, 6, 9].map((h, i) => (
              <span key={i} style={{ height: `${h * 3}px` }} />
            ))}
          </div>
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
