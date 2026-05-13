import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { listApplications } from "../../api/applications.js";
import { submitReview, checkApplicationReviewed } from "../../api/reviews.js";
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
    CompanyLogoUrl: raw.CompanyLogoUrl || null,
    Status: status,
    Origin: raw.PortName ? `${raw.PortName}${raw.PortType ? ` (${raw.PortType})` : ""}` : "Origin port",
    Destination: raw.DeliveryAddress || "Delivery address",
    CreatedAt: formatDate(raw.SubmissionDate),
    Amount: raw.Amount != null ? Number(raw.Amount) : null,
    TrackingNumber: raw.TrackingNumber || null,
    CategoryName: raw.CategoryName || null,
    CategoryID: raw.CategoryID || null,
    CompletionToken: raw.CompletionToken || null,
  };
}

function ShipmentRow({ a, onLeaveReview, onRevealQr, isReviewed }) {
  const [badgeClass, label] = STATUS_BADGE[a.Status] || ["badge-info", a.Status || "Unknown"];
  const stepIdx = statusToStepIndex(a.Status);
  const isCompleted = a.Status === "completed";
  const initials = (a.CompanyName || "TK").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const canRevealQr = a.Status === "in_progress" && !!a.CompletionToken && !!a.TrackingNumber;

  return (
    <div className="card card-hover">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          {a.CompanyLogoUrl ? (
            <img
              src={a.CompanyLogoUrl}
              alt={`${a.CompanyName} logo`}
              className="avatar avatar-lg"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="avatar avatar-lg">{initials}</div>
          )}
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

      {canRevealQr && (
        <>
          <hr className="divider" />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: "20px 16px",
              borderRadius: 12,
              background:
                "linear-gradient(180deg, oklch(98% 0.012 200) 0%, oklch(95% 0.02 200) 100%)",
              border: "1px solid var(--line)",
            }}
          >
            <span className="eyebrow" style={{ color: "var(--teal-dark)" }}>
              Completion handshake
            </span>
            <p
              style={{
                margin: 0,
                maxWidth: 320,
                textAlign: "center",
                fontSize: 13,
                color: "var(--ink-soft)",
              }}
            >
              Your QR code is hidden for security. Reveal it only when a clearance
              officer is ready to scan.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onRevealQr?.(a)}
              style={{ marginTop: 4 }}
            >
              <Icon name="lock" size={14} />
              Reveal QR Code
            </button>
          </div>
        </>
      )}

      {isCompleted && (
        <>
          <hr className="divider" />
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className={`btn btn-sm ${isReviewed ? "btn-secondary" : "btn-accent"}`}
              onClick={() => !isReviewed && onLeaveReview?.(a)}
              disabled={isReviewed}
              title={isReviewed ? "You've already reviewed this shipment" : undefined}
            >
              <Icon name="star" size={14} />
              {isReviewed ? "Reviewed" : "Leave a review"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Tracking() {
  const auth = useAuth();
  const location = useLocation();
  /* User and Client share the same primary key (single-table inheritance),
     so the ClientID we filter by is just the signed-in user's UserID. */
  const clientId = auth?.kind === "user" && auth?.role === "client"
    ? auth?.user?.UserID
    : null;

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [qrTarget, setQrTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewedIds, setReviewedIds] = useState(new Set());

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
        const shaped = list.map(shapeApplication);
        setApplications(shaped);

        const completedApps = shaped.filter(a => a.Status === "completed");
        const reviewedFlags = await Promise.all(
          completedApps.map(a => checkApplicationReviewed(a.ApplicationID).catch(() => false))
        );
        if (!active) return;
        const reviewedSet = new Set(
          completedApps.filter((_, i) => reviewedFlags[i]).map(a => Number(a.ApplicationID))
        );
        setReviewedIds(reviewedSet);
        setError("");

        const params = new URLSearchParams(location.search);
        const reviewId = params.get("review");
        if (reviewId) {
          const target = shaped.find(
            (a) => String(a.ApplicationID) === String(reviewId) && a.Status === "completed"
          );
          if (target) {
            setReviewTarget(target);
            setReviewRating(5);
            setReviewText("");
            setReviewSent(false);
            setReviewError("");
          }
        }
      } catch {
        if (!active) return;
        setError("Couldn't load your shipments. Please try again.");
        setApplications([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [clientId, location.search]);

  const openReviewModal = (row) => {
    setReviewTarget(row);
    setReviewRating(5);
    setReviewText("");
    setReviewSent(false);
    setReviewError("");
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim() || !reviewTarget) return;
    setReviewSubmitting(true);
    setReviewError("");
    try {
      await submitReview({
        Review: reviewText.trim(),
        Rating: reviewRating,
        ApplicationID: reviewTarget.ApplicationID,
        CategoryID: reviewTarget.CategoryID,
      });
      setReviewedIds((prev) => new Set([...prev, Number(reviewTarget.ApplicationID)]));
      setReviewSent(true);
    } catch (err) {
      setReviewError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Couldn't submit your review. Please try again."
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const summary = useMemo(() => ({
    active: applications.filter(a => a.Status === "pending" || a.Status === "in_progress").length,
    completed: applications.filter(a => a.Status === "completed").length,
    total: applications.length,
  }), [applications]);

  if (!clientId) {
    return (
      <PublicLayout
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
      </PublicLayout>
    );
  }

  return (
    <PublicLayout
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
                onLeaveReview={openReviewModal}
                onRevealQr={setQrTarget}
                isReviewed={reviewedIds.has(Number(a.ApplicationID))}
              />
            ))}
          </div>
        </Reveal>
      )}

      {qrTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Completion QR code"
          onClick={() => setQrTarget(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "grid",
            placeItems: "center",
            padding: 24,
            zIndex: 110,
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#fff",
              borderRadius: 20,
              padding: 28,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
            }}
          >
            <span className="eyebrow" style={{ color: "var(--teal-dark)" }}>
              Completion handshake
            </span>
            <div style={{ textAlign: "center" }}>
              <div className="card-title" style={{ fontSize: 18 }}>
                #{qrTarget.TrackingNumber}
              </div>
              <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 2 }}>
                {qrTarget.CompanyName}
              </div>
            </div>
            <div
              style={{
                padding: 16,
                background: "#fff",
                borderRadius: 14,
                border: "1px solid var(--line)",
                lineHeight: 0,
              }}
            >
              <QRCodeSVG
                value={`${qrTarget.TrackingNumber}:${qrTarget.CompletionToken}`}
                size={280}
                level="M"
                includeMargin={false}
              />
            </div>
            <p
              style={{
                margin: 0,
                maxWidth: 320,
                textAlign: "center",
                fontSize: 13,
                color: "var(--ink-soft)",
              }}
            >
              Hold your screen up to the clearance officer's scanner.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setQrTarget(null)}
              style={{ marginTop: 6 }}
            >
              Close
            </button>
          </div>
        </div>
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
                        disabled={reviewSubmitting}
                      >
                        <Icon
                          name="star"
                          size={20}
                          color={i <= reviewRating ? "var(--accent)" : "var(--line-strong)"}
                        />
                      </button>
                    ))}
                    <span style={{ fontSize: 13, color: "var(--ink-soft)", marginLeft: 6, alignSelf: "center" }}>
                      {reviewRating} / 5
                    </span>
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
                    disabled={reviewSubmitting}
                  />
                </label>

                {reviewError && (
                  <div className="banner-error">
                    <Icon name="bell" size={14} />{reviewError}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setReviewTarget(null)}
                    disabled={reviewSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmitReview}
                    disabled={!reviewText.trim() || reviewSubmitting}
                  >
                    {reviewSubmitting ? (
                      <ContainerSpinner inline size={16} label="Submitting…" />
                    ) : (
                      <><Icon name="check" size={14} /> Submit review</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PublicLayout>
  );
}

export default Tracking;
