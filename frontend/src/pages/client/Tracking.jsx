import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import { listApplications, cancelApplication } from "../../api/applications.js";
import { submitReview, checkApplicationReviewed } from "../../api/reviews.js";
import { friendlyError } from "../../api/client.js";
import { useAuth } from "../../api/authState.js";
import { useTranslation, useLanguage } from "../../i18n";

/* status sentinel → [badge class, translation key under tracking.status] */
const STATUS_BADGE = {
  pending: ["badge-pending", "pending"],
  in_progress: ["badge-info", "inProgress"],
  completed: ["badge-success", "completed"],
};

/* timeline step order → translation key under tracking.steps */
const STEP_KEYS = ["submitted", "accepted", "clearing", "released"];

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
function shapeApplication(raw, t) {
  const status = normalizeStatus(raw.Status);
  return {
    ApplicationID: raw.ApplicationID,
    CompanyID: raw.CompanyID,
    CompanyName: raw.CompanyName || (raw.CompanyID ? t("tracking.fallback.company", { id: raw.CompanyID }) : t("tracking.fallback.unknown")),
    CompanyLogoUrl: raw.CompanyLogoUrl || null,
    Status: status,
    Origin: raw.PortName ? `${raw.PortName}${raw.PortType ? ` (${raw.PortType})` : ""}` : t("tracking.fallback.originPort"),
    Destination: raw.DeliveryAddress || t("tracking.fallback.deliveryAddress"),
    CreatedAt: formatDate(raw.SubmissionDate),
    Amount: raw.Amount != null ? Number(raw.Amount) : null,
    TrackingNumber: raw.TrackingNumber || null,
    CategoryName: raw.CategoryName || null,
    CategoryID: raw.CategoryID || null,
    CompletionToken: raw.CompletionToken || null,
  };
}

function ShipmentRow({ a, onLeaveReview, onRevealQr, onCancel, cancelling, isReviewed }) {
  const { t } = useTranslation("client");
  const { dir } = useLanguage();
  const [badgeClass, statusKey] = STATUS_BADGE[a.Status] || ["badge-info", null];
  const label = statusKey ? t(`tracking.status.${statusKey}`) : (a.Status || t("tracking.status.unknown"));
  const stepIdx = statusToStepIndex(a.Status);
  const isCompleted = a.Status === "completed";
  const isPending = a.Status === "pending";
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
              <bdi>#{a.ApplicationID}</bdi> · <bdi>{a.CreatedAt}</bdi>
              {a.TrackingNumber && <> · <span className="mono"><bdi>{a.TrackingNumber}</bdi></span></>}
            </div>
            <div className="row-title" style={{ fontSize: 16 }}>
              {a.CompanyName}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Icon name="ship" size={13} />
              {a.Origin} {dir === "rtl" ? "←" : "→"} {a.Destination}
              {a.CategoryName && (
                <>
                  <span style={{ color: "var(--line-strong)" }}>·</span>
                  {a.CategoryName}
                </>
              )}
              {a.Amount != null && a.Amount > 0 && (
                <>
                  <span style={{ color: "var(--line-strong)" }}>·</span>
                  <strong className="mono tabular" style={{ color: "var(--ink)" }}>{t("tracking.currency")} <bdi>{a.Amount.toLocaleString()}</bdi></strong>
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
        {STEP_KEYS.map((key, i) => (
          <div
            key={key}
            className={`timeline-step ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}
          >
            <span className="dot" />
            {t(`tracking.steps.${key}`)}
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
              {t("tracking.qr.eyebrow")}
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
              {t("tracking.qr.hiddenNote")}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onRevealQr?.(a)}
              style={{ marginTop: 4 }}
            >
              <Icon name="lock" size={14} />
              {t("tracking.qr.reveal")}
            </button>
          </div>
        </>
      )}

      {isPending && (
        <>
          <hr className="divider" />
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => onCancel?.(a)}
              disabled={cancelling}
              style={{
                background: "var(--signal-stop, #dc2626)",
                color: "#fff",
                border: "1px solid var(--signal-stop, #dc2626)",
                fontWeight: 600,
                opacity: cancelling ? 0.7 : 1,
                cursor: cancelling ? "not-allowed" : "pointer",
              }}
            >
              {cancelling ? t("tracking.cancel.cancelling") : t("tracking.cancel.button")}
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
              title={isReviewed ? t("tracking.review.reviewedTitle") : undefined}
            >
              <Icon name="star" size={14} filled />
              {isReviewed ? t("tracking.review.reviewed") : t("tracking.review.leave")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Tracking() {
  const { t } = useTranslation("client");
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
  /* Bump after a cancel to re-run the list fetch. Kept as a counter so
     successive cancellations always change the dep value. */
  const [refreshTick, setRefreshTick] = useState(0);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState("");
  /* Target row pending a cancellation confirmation. While non-null
     the ConfirmModal is open; on confirm we kick off the API call. */
  const [cancelTarget, setCancelTarget] = useState(null);
  /* Briefly hold the modal open in its success state so the user
     sees the affirmation before it dismisses and the list refreshes. */
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const [qrTarget, setQrTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewedIds, setReviewedIds] = useState(new Set());

  /* Silent 3s polling so the dashboard reflects the company's QR scan
     (Status → Completed) without a manual reload. Runs in parallel to
     the main loader below; intentionally does NOT touch loading state
     or refetch reviewed flags — only the list shape changes between
     polls, and we only update state if the list actually moved so
     React doesn't re-render the row tree on every tick. */
  useEffect(() => {
    if (!clientId) return undefined;
    let active = true;
    const tick = async () => {
      try {
        const data = await listApplications({ ClientID: clientId });
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        const shaped = list.map((r) => shapeApplication(r, t));
        setApplications((prev) => {
          if (prev.length !== shaped.length) return shaped;
          for (let i = 0; i < shaped.length; i += 1) {
            const a = prev[i];
            const b = shaped[i];
            if (
              a.ApplicationID !== b.ApplicationID ||
              a.Status !== b.Status ||
              a.CompletionToken !== b.CompletionToken ||
              a.TrackingNumber !== b.TrackingNumber
            ) {
              return shaped;
            }
          }
          return prev;
        });
      } catch {
        /* Swallow poll errors — the visible UI is driven by the main
           loader's error banner; a transient blip mid-poll shouldn't
           replace the rendered list with an error state. */
      }
    };
    const id = setInterval(tick, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [clientId, t]);

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
        const shaped = list.map((r) => shapeApplication(r, t));
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
        setError(t("tracking.loadError"));
        setApplications([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [clientId, location.search, refreshTick, t]);

  /* The row's Cancel button only opens the confirm modal; the API call
     fires from confirmCancelApplication once the user confirms. */
  const handleCancelApplication = (row) => {
    setCancelError("");
    setCancelTarget(row);
  };

  const confirmCancelApplication = async () => {
    if (!cancelTarget) return;
    const row = cancelTarget;
    setCancellingId(row.ApplicationID);
    try {
      const res = await cancelApplication(row.ApplicationID);
      if (res?.ok) {
        /* Hold the modal open in its success state for 2s before
           closing it and refreshing the list. */
        setCancelSuccess(true);
        setCancellingId(null);
        setTimeout(() => {
          setCancelSuccess(false);
          setCancelTarget(null);
          setRefreshTick((n) => n + 1);
        }, 2000);
      } else {
        setCancelError(res?.message || t("tracking.cancel.error"));
        setCancellingId(null);
        setCancelTarget(null);
      }
    } catch (err) {
      setCancelError(friendlyError(err, t("tracking.cancel.error")));
      setCancellingId(null);
      setCancelTarget(null);
    }
  };

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
      setReviewError(friendlyError(err, t("tracking.review.error")));
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
        title={t("tracking.title")}
        subtitle={t("tracking.subtitle")}
        role="Client"
      >
        <div className="card card-pad-lg" style={{ textAlign: "center" }}>
          <Icon name="lock" size={32} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>{t("tracking.signedOut.title")}</h3>
          <p style={{ color: "var(--ink-soft)" }}>
            {t("tracking.signedOut.desc")}
          </p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>{t("tracking.signedOut.signIn")}</Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout
      title={t("tracking.title")}
      subtitle={t("tracking.subtitle")}
      role="Client"
      actions={
        <Link to="/companies" className="btn btn-primary">
          <Icon name="package" size={16} /> {t("tracking.newApplication")}
        </Link>
      }
    >
      {/* Summary */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: 24 }}>
        <div className="stat">
          <div className="stat-label">{t("tracking.summary.active")}</div>
          <div className="stat-value"><bdi>{summary.active}</bdi></div>
          <div className="stat-trend up" style={{ color: "var(--gray-500)" }}>
            {t("tracking.summary.activeHint")}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">{t("tracking.summary.completed")}</div>
          <div className="stat-value"><bdi>{summary.completed}</bdi></div>
          <div className="stat-trend up" style={{ color: "var(--gray-500)" }}>{t("tracking.summary.completedHint")}</div>
        </div>
        <div className="stat">
          <div className="stat-label">{t("tracking.summary.total")}</div>
          <div className="stat-value"><bdi>{summary.total}</bdi></div>
        </div>
      </div>

      {error && <div className="banner-error"><Icon name="bell" size={16} />{error}</div>}
      {cancelError && (
        <div className="banner-error" style={{ marginTop: error ? 8 : 0 }}>
          <Icon name="bell" size={16} />{cancelError}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <ContainerSpinner size={88} label={t("tracking.loading")} />
        </div>
      ) : applications.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 56 }}>
          <Icon name="package" size={32} color="var(--ink-faint)" />
          <h3 className="h3" style={{ marginTop: 12 }}>{t("tracking.empty.title")}</h3>
          <p style={{ color: "var(--ink-soft)" }}>{t("tracking.empty.desc")}</p>
          <Link to="/companies" className="btn btn-primary" style={{ marginTop: 16 }}>{t("tracking.empty.browse")}</Link>
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
                onCancel={handleCancelApplication}
                cancelling={cancellingId === a.ApplicationID}
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
              {t("tracking.qr.eyebrow")}
            </span>
            <div style={{ textAlign: "center" }}>
              <div className="card-title" style={{ fontSize: 18 }}>
                <bdi>#{qrTarget.TrackingNumber}</bdi>
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
              {t("tracking.qr.scanNote")}
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setQrTarget(null)}
              style={{ marginTop: 6 }}
            >
              {t("tracking.qr.close")}
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
                  {t("tracking.review.appNumber", { id: reviewTarget.ApplicationID })}
                </span>
                <h3 className="card-title">{t("tracking.review.modalTitle")}</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setReviewTarget(null)}
              >
                {t("tracking.review.close")}
              </button>
            </div>

            {reviewSent ? (
              <div className="banner-success" style={{ marginTop: 8 }}>
                <Icon name="check" size={16} />
                {t("tracking.review.success", { company: reviewTarget.CompanyName })}
              </div>
            ) : (
              <div className="stack" style={{ marginTop: 8 }}>
                <div className="field">
                  <span className="field-label">{t("tracking.review.rating")}</span>
                  <div className="row" style={{ gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewRating(i)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: 4, height: 32, width: 32 }}
                        aria-label={t("tracking.review.starAria", { count: i })}
                        disabled={reviewSubmitting}
                      >
                        <Icon
                          name="star"
                          size={20}
                          color={i <= reviewRating ? "var(--accent)" : "var(--line-strong)"}
                          filled={i <= reviewRating}
                        />
                      </button>
                    ))}
                    <span style={{ fontSize: 13, color: "var(--ink-soft)", marginInlineStart: 6, alignSelf: "center" }}>
                      <bdi>{t("tracking.review.ratingValue", { rating: reviewRating })}</bdi>
                    </span>
                  </div>
                </div>

                <label className="field">
                  <span className="field-label">{t("tracking.review.textLabel")}</span>
                  <textarea
                    className="textarea"
                    rows={4}
                    placeholder={t("tracking.review.textPlaceholder")}
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
                    {t("tracking.review.cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmitReview}
                    disabled={!reviewText.trim() || reviewSubmitting}
                  >
                    {reviewSubmitting ? (
                      <ContainerSpinner inline size={16} label={t("tracking.review.submitting")} />
                    ) : (
                      <><Icon name="check" size={14} /> {t("tracking.review.submit")}</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(cancelTarget)}
        title={cancelSuccess ? t("tracking.cancel.successTitle") : t("tracking.cancel.modalTitle")}
        message={t("tracking.cancel.message")}
        confirmLabel={t("tracking.cancel.confirm")}
        cancelLabel={t("tracking.cancel.keep")}
        variant="danger"
        busy={cancellingId != null}
        isSuccess={cancelSuccess}
        successMessage={t("tracking.cancel.successMessage")}
        onConfirm={confirmCancelApplication}
        onCancel={() => {
          if (cancellingId == null && !cancelSuccess) setCancelTarget(null);
        }}
      />
    </PublicLayout>
  );
}

export default Tracking;
