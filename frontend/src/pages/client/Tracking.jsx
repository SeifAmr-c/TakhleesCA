import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import Reveal from "../../components/Reveal.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import { listApplications, cancelApplication, listCategories, editApplication } from "../../api/applications.js";
import { listCompanyPorts } from "../../api/ports.js";
import { listApplicationDocuments } from "../../api/documents.js";
import {
  submitReview,
  checkApplicationReviewed,
  getApplicationReview,
  updateClientReview,
  deleteClientReview,
} from "../../api/reviews.js";
import { useAuth } from "../../api/authState.js";

const STATUS_BADGE = {
  pending: ["badge-pending", "Pending review"],
  in_progress: ["badge-info", "In progress"],
  completed: ["badge-success", "Completed"],
};

const STEPS = ["Submitted", "Accepted", "Clearing", "Released"];

const DOCUMENT_TYPES = [
  "National ID / Passport",
  "Proof Of Payment",
  "Delegation",
  "Shipping Document",
];

const MAX_DOC_BYTES = 5 * 1024 * 1024;

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
    PortID: raw.PortID || null,
    ACID: raw.ACID || "",
    DeliveryAddress: raw.DeliveryAddress || "",
  };
}

function ShipmentRow({ a, onLeaveReview, onRevealQr, onCancel, onEdit, cancelling, isReviewed }) {
  const [badgeClass, label] = STATUS_BADGE[a.Status] || ["badge-info", a.Status || "Unknown"];
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

      {isPending && (
        <>
          <hr className="divider" />
          <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => onEdit?.(a)}
              disabled={cancelling}
            >
              Edit application
            </button>
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
              {cancelling ? "Cancelling…" : "Cancel application"}
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
              onClick={() => onLeaveReview?.(a)}
            >
              <Icon name="star" size={14} filled />
              {isReviewed ? "Edit review" : "Leave a review"}
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
  /* Bump after a cancel to re-run the list fetch. Kept as a counter so
     successive cancellations always change the dep value. */
  const [refreshTick, setRefreshTick] = useState(0);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState("");
  /* Target row pending a cancellation confirmation. While non-null,
     the ConfirmModal is open; on confirm we kick off the API call. */
  const [cancelTarget, setCancelTarget] = useState(null);
  /* Briefly hold the modal open in its success state so the user
     sees the affirmation before it dismisses and the list refreshes. */
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const [qrTarget, setQrTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewMode, setReviewMode] = useState("create"); // 'create' | 'edit'
  const [editReviewId, setEditReviewId] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewedIds, setReviewedIds] = useState(new Set());

  const [editTarget, setEditTarget] = useState(null);
  const [editStep, setEditStep] = useState(0);
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editDetailsErrors, setEditDetailsErrors] = useState({});
  const [editDocErrors, setEditDocErrors] = useState({});
  const [editForm, setEditForm] = useState({ CategoryID: "", PortID: "", DeliveryAddress: "", ACID: "" });
  const [editDocSlots, setEditDocSlots] = useState([]);
  const [editCategories, setEditCategories] = useState([]);
  const [editPorts, setEditPorts] = useState([]);

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
  }, [clientId, location.search, refreshTick]);

  /* Cancel button on a row only opens the confirm modal; the actual
     API call fires from confirmCancelApplication when the user confirms. */
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
        setCancelError(res?.message || "Couldn't cancel this application.");
        setCancellingId(null);
        setCancelTarget(null);
      }
    } catch (err) {
      setCancelError(
        err?.response?.data?.message || "Couldn't cancel this application."
      );
      setCancellingId(null);
      setCancelTarget(null);
    }
  };

  const openReviewModal = (row) => {
    const isEdit = reviewedIds.has(Number(row.ApplicationID));
    setReviewTarget(row);
    setReviewMode(isEdit ? "edit" : "create");
    setEditReviewId(null);
    setReviewRating(5);
    setReviewText("");
    setReviewSent(false);
    setReviewError("");

    if (isEdit) {
      setReviewLoading(true);
      getApplicationReview(row.ApplicationID)
        .then((existing) => {
          if (existing) {
            setEditReviewId(existing.ReviewID);
            setReviewRating(existing.Rating ?? 5);
            setReviewText(existing.Review ?? "");
          }
        })
        .catch(() => {})
        .finally(() => setReviewLoading(false));
    }
  };

  const openEditModal = (row) => {
    setEditTarget(row);
    setEditStep(0);
    setEditError("");
    setEditDetailsErrors({});
    setEditDocErrors({});
    setEditForm({
      CategoryID: String(row.CategoryID || ""),
      PortID: String(row.PortID || ""),
      DeliveryAddress: row.DeliveryAddress || "",
      ACID: row.ACID || "",
    });
    setEditDocSlots([]);
    setEditLoading(true);
    Promise.all([
      listCategories().catch(() => []),
      listCompanyPorts(row.CompanyID).catch(() => []),
      listApplicationDocuments(row.ApplicationID).catch(() => []),
    ]).then(([cats, ports, docs]) => {
      setEditCategories(Array.isArray(cats) ? cats : cats?.data || []);
      setEditPorts(Array.isArray(ports) ? ports : ports?.data || []);
      const sorted = [...(Array.isArray(docs) ? docs : [])].sort((a, b) => a.DocumentID - b.DocumentID);
      const slots = sorted.slice(0, 4).map((d) => ({
        docId: d.DocumentID,
        type: d.DocType,
        currentPath: d.Path,
        newFile: null,
      }));
      while (slots.length < 4) slots.push({ docId: null, type: "", currentPath: null, newFile: null });
      setEditDocSlots(slots);
    }).finally(() => setEditLoading(false));
  };

  const updateEditDocSlot = (idx, key, value) => {
    setEditDocSlots((prev) => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s));
  };

  const handleEditContinue = () => {
    const errs = {};
    if (!editForm.CategoryID) errs.CategoryID = "Please select a service category.";
    if (!editForm.PortID) errs.PortID = "Please select a port.";
    if (!editForm.DeliveryAddress.trim()) errs.DeliveryAddress = "Delivery address is required.";
    if (!/^\d{19}$/.test(editForm.ACID)) errs.ACID = "ACID must be exactly 19 digits.";
    setEditDetailsErrors(errs);
    if (Object.keys(errs).length) return;
    setEditStep(1);
  };

  const handleEditSubmit = async () => {
    const docErrs = {};
    editDocSlots.forEach((slot, i) => {
      if (!slot.type) docErrs[i] = "Choose a document type.";
      else if (!slot.currentPath && !slot.newFile) docErrs[i] = "Attach a file.";
      else if (slot.newFile && slot.newFile.size > MAX_DOC_BYTES) docErrs[i] = "File must be 5 MB or smaller.";
    });
    setEditDocErrors(docErrs);
    if (Object.keys(docErrs).length) return;

    setEditSubmitting(true);
    setEditError("");
    try {
      const payload = new FormData();
      payload.append("CategoryID", editForm.CategoryID);
      payload.append("PortID", editForm.PortID);
      payload.append("DeliveryAddress", editForm.DeliveryAddress.trim());
      payload.append("ACID", editForm.ACID);
      editDocSlots.forEach((slot, idx) => {
        if (slot.docId) payload.append(`ExistingDocID_${idx}`, String(slot.docId));
        payload.append(`DocType_${idx}`, slot.type);
        if (slot.newFile) payload.append(`NewDoc_${idx}`, slot.newFile);
      });
      await editApplication(editTarget.ApplicationID, payload);
      setEditTarget(null);
      setRefreshTick((n) => n + 1);
    } catch (err) {
      setEditError(err?.response?.data?.message || "Couldn't update the application. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
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

  const handleUpdateReview = async () => {
    if (!reviewText.trim() || !editReviewId) return;
    setReviewSubmitting(true);
    setReviewError("");
    try {
      await updateClientReview(editReviewId, { Review: reviewText.trim(), Rating: reviewRating });
      setReviewTarget(null);
    } catch (err) {
      setReviewError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Couldn't update your review. Please try again."
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!editReviewId) return;
    setReviewSubmitting(true);
    setReviewError("");
    try {
      await deleteClientReview(editReviewId);
      setReviewedIds((prev) => {
        const next = new Set(prev);
        next.delete(Number(reviewTarget.ApplicationID));
        return next;
      });
      setReviewTarget(null);
    } catch (err) {
      setReviewError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Couldn't delete your review. Please try again."
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
      {cancelError && (
        <div className="banner-error" style={{ marginTop: error ? 8 : 0 }}>
          <Icon name="bell" size={16} />{cancelError}
        </div>
      )}

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
                onCancel={handleCancelApplication}
                onEdit={openEditModal}
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
                <h3 className="card-title">
                  {reviewMode === "edit" ? "Edit your review" : "Leave a review"}
                </h3>
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
            ) : reviewLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                <ContainerSpinner size={40} label="Loading your review…" />
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
                          filled={i <= reviewRating}
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

                {reviewMode === "edit" ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 16 }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={handleDeleteReview}
                      disabled={reviewSubmitting}
                      style={{
                        background: "var(--signal-stop, #dc2626)",
                        color: "#fff",
                        border: "1px solid var(--signal-stop, #dc2626)",
                        fontWeight: 600,
                      }}
                    >
                      {reviewSubmitting ? <ContainerSpinner inline size={14} label="Deleting…" /> : "Delete review"}
                    </button>
                    <div style={{ display: "flex", gap: 10 }}>
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
                        onClick={handleUpdateReview}
                        disabled={!reviewText.trim() || reviewSubmitting}
                      >
                        {reviewSubmitting ? (
                          <ContainerSpinner inline size={16} label="Saving…" />
                        ) : (
                          <><Icon name="check" size={14} /> Save changes</>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
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
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {editTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => { if (!editSubmitting) setEditTarget(null); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "oklch(15% 0.045 245 / 0.5)",
            display: "grid",
            placeItems: "center",
            padding: 24,
            zIndex: 120,
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
        >
          <div
            className="card card-pad-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }}
          >
            {/* Header */}
            <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <div>
                <span className="eyebrow" style={{ color: "var(--teal-dark)" }}>
                  Application #{editTarget.ApplicationID}
                </span>
                <h3 className="card-title">Edit application</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditTarget(null)}
                disabled={editSubmitting}
              >
                Close
              </button>
            </div>

            {/* Step tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid var(--line)", paddingBottom: 14 }}>
              <button
                type="button"
                className={`btn btn-sm ${editStep === 0 ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setEditStep(0)}
                disabled={editSubmitting}
              >
                Details
              </button>
              <button
                type="button"
                className={`btn btn-sm ${editStep === 1 ? "btn-primary" : "btn-ghost"}`}
                onClick={() => { if (editStep === 0) { handleEditContinue(); } else { setEditStep(1); } }}
                disabled={editSubmitting}
              >
                Documents
              </button>
            </div>

            {editLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                <ContainerSpinner size={48} label="Loading application data…" />
              </div>
            ) : editStep === 0 ? (
              <div className="stack">
                <label className="field">
                  <span className="field-label">Service category *</span>
                  <select
                    className="select"
                    value={editForm.CategoryID}
                    onChange={(e) => { setEditForm((f) => ({ ...f, CategoryID: e.target.value })); setEditDetailsErrors((m) => ({ ...m, CategoryID: "" })); }}
                    disabled={editSubmitting}
                  >
                    <option value="">{editCategories.length ? "Select a category…" : "Loading categories…"}</option>
                    {editCategories.map((c) => (
                      <option key={c.CategoryID} value={c.CategoryID}>{c.Type}</option>
                    ))}
                  </select>
                  {editDetailsErrors.CategoryID && <span style={{ color: "var(--signal-stop)", fontSize: 12, marginTop: 4, display: "block" }}>{editDetailsErrors.CategoryID}</span>}
                </label>

                <label className="field">
                  <span className="field-label">Port *</span>
                  <select
                    className="select"
                    value={editForm.PortID}
                    onChange={(e) => { setEditForm((f) => ({ ...f, PortID: e.target.value })); setEditDetailsErrors((m) => ({ ...m, PortID: "" })); }}
                    disabled={editSubmitting}
                  >
                    <option value="">{editPorts.length ? "Select a port…" : "No ports available"}</option>
                    {editPorts.map((p) => (
                      <option key={p.PortID} value={p.PortID}>{p.PortName}{p.PortType ? ` (${p.PortType})` : ""}</option>
                    ))}
                  </select>
                  {editDetailsErrors.PortID && <span style={{ color: "var(--signal-stop)", fontSize: 12, marginTop: 4, display: "block" }}>{editDetailsErrors.PortID}</span>}
                </label>

                <label className="field">
                  <span className="field-label">Delivery address *</span>
                  <div className="input-with-icon">
                    <span className="input-icon"><Icon name="pin" size={16} /></span>
                    <input
                      className="input"
                      value={editForm.DeliveryAddress}
                      onChange={(e) => { setEditForm((f) => ({ ...f, DeliveryAddress: e.target.value })); setEditDetailsErrors((m) => ({ ...m, DeliveryAddress: "" })); }}
                      disabled={editSubmitting}
                      placeholder="Street, district, city"
                    />
                  </div>
                  {editDetailsErrors.DeliveryAddress && <span style={{ color: "var(--signal-stop)", fontSize: 12, marginTop: 4, display: "block" }}>{editDetailsErrors.DeliveryAddress}</span>}
                </label>

                <label className="field">
                  <span className="field-label">ACID number *</span>
                  <div className="input-with-icon">
                    <span className="input-icon"><Icon name="lock" size={16} /></span>
                    <input
                      className="input"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={19}
                      value={editForm.ACID}
                      onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 19); setEditForm((f) => ({ ...f, ACID: d })); setEditDetailsErrors((m) => ({ ...m, ACID: "" })); }}
                      disabled={editSubmitting}
                      placeholder="19-digit ACID number"
                    />
                  </div>
                  <span className="hint">Must be exactly 19 digits.</span>
                  {editDetailsErrors.ACID && <span style={{ color: "var(--signal-stop)", fontSize: 12, marginTop: 4, display: "block" }}>{editDetailsErrors.ACID}</span>}
                </label>
              </div>
            ) : (
              <div className="stack">
                {editDocSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 16, background: "var(--surface)" }}
                  >
                    <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                      <span className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
                        Document #{idx + 1}
                      </span>
                      {slot.currentPath && !slot.newFile && (
                        <a
                          href={slot.currentPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12 }}
                        >
                          View current
                        </a>
                      )}
                    </div>

                    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: 12 }}>
                      <label className="field">
                        <span className="field-label">Document type *</span>
                        <select
                          className="select"
                          value={slot.type}
                          onChange={(e) => { updateEditDocSlot(idx, "type", e.target.value); setEditDocErrors((m) => ({ ...m, [idx]: "" })); }}
                          disabled={editSubmitting}
                        >
                          <option value="">Select type…</option>
                          {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>

                      <div className="field">
                        <span className="field-label">
                          File {slot.currentPath ? "(optional — replaces current)" : "*"}
                        </span>
                        {slot.newFile ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid var(--brand)", borderRadius: "var(--radius-md)", background: "var(--harbor-100)", fontSize: 13 }}>
                            <Icon name="check" size={14} />
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slot.newFile.name}</span>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "2px 6px", fontSize: 12, flexShrink: 0 }}
                              onClick={() => updateEditDocSlot(idx, "newFile", null)}
                              disabled={editSubmitting}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: "1px dashed var(--line-strong)", borderRadius: "var(--radius-md)", cursor: editSubmitting ? "not-allowed" : "pointer", background: "var(--surface-2)", fontSize: 13, color: "var(--ink-soft)" }}>
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              style={{ display: "none" }}
                              disabled={editSubmitting}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                if (!f) return;
                                if (f.size > MAX_DOC_BYTES) { setEditDocErrors((m) => ({ ...m, [idx]: "File must be 5 MB or smaller." })); return; }
                                setEditDocErrors((m) => ({ ...m, [idx]: "" }));
                                updateEditDocSlot(idx, "newFile", f);
                              }}
                            />
                            <Icon name="doc" size={14} />
                            {slot.currentPath ? "Replace file…" : "Click to upload…"}
                          </label>
                        )}
                        {editDocErrors[idx] && <span style={{ color: "var(--signal-stop)", fontSize: 12, marginTop: 4, display: "block" }}>{editDocErrors[idx]}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editError && (
              <div className="banner-error" style={{ marginTop: 16 }}>
                <Icon name="bell" size={14} />{editError}
              </div>
            )}

            {/* Navigation buttons */}
            {!editLoading && (
              <div className="row" style={{ justifyContent: "space-between", marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => editStep === 0 ? setEditTarget(null) : setEditStep(0)}
                  disabled={editSubmitting}
                >
                  {editStep === 0 ? "Cancel" : "Back"}
                </button>
                {editStep === 0 ? (
                  <button type="button" className="btn btn-primary" onClick={handleEditContinue} disabled={editSubmitting}>
                    Continue <Icon name="arrow_right" size={14} />
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={handleEditSubmit} disabled={editSubmitting}>
                    {editSubmitting ? (
                      <ContainerSpinner inline size={16} label="Saving…" />
                    ) : (
                      <><Icon name="check" size={14} /> Save changes</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(cancelTarget)}
        title={cancelSuccess ? "Application cancelled" : "Cancel Application"}
        message="Are you sure you want to cancel this application? This action cannot be undone."
        confirmLabel="Cancel Application"
        cancelLabel="Keep Application"
        variant="danger"
        busy={cancellingId != null}
        isSuccess={cancelSuccess}
        successMessage="Application cancelled successfully."
        onConfirm={confirmCancelApplication}
        onCancel={() => {
          if (cancellingId == null && !cancelSuccess) setCancelTarget(null);
        }}
      />
    </PublicLayout>
  );
}

export default Tracking;
