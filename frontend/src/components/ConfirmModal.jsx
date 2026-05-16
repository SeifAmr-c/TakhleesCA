import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";

/* Generic confirmation dialog with a darkened backdrop. Used in place
   of the native window.confirm() so the warning/affirmation flow can
   match the rest of the app's visual language and stay accessible
   (focus trap on the confirm button, Escape to dismiss).

   Rendered through a portal on document.body so the dialog can't be
   shrunk, clipped, or stretched by an ancestor flex/grid container.

   Success mode (`isSuccess`): hides the action buttons, swaps the
   warning glyph for a green check, and shows `successMessage`. Lets
   callers reuse the same modal for the "done — redirecting…" beat
   without unmounting and re-mounting a second component. */
function ConfirmModal({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger", // "danger" | "primary"
  onConfirm,
  onCancel,
  busy = false,
  isSuccess = false,
  successMessage = "",
}) {
  const confirmRef = useRef(null);

  /* Focus the confirm button when the modal opens so keyboard users
     don't have to tab into it. Skipped in success mode — there's no
     button to focus. Escape closes the modal unless busy or in the
     success state (where dismissal is owned by the parent timer). */
  useEffect(() => {
    if (!open) return undefined;
    if (!isSuccess) confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !busy && !isSuccess) onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    /* Prevent the page scrolling behind the modal. */
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, busy, isSuccess, onCancel]);

  if (!open) return null;

  const isDanger = variant === "danger";
  const accent = isDanger
    ? "var(--signal-stop, #dc2626)"
    : "var(--brand, #2563eb)";
  const successAccent = "var(--signal-go, #16a34a)";

  const iconAccent = isSuccess ? successAccent : accent;
  const iconBg = isSuccess
    ? "rgba(22, 163, 74, 0.12)"
    : isDanger
    ? "rgba(220, 38, 38, 0.12)"
    : "rgba(37, 99, 235, 0.12)";

  const displayMessage = isSuccess ? successMessage : message;

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && !isSuccess) onCancel?.();
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
        boxSizing: "border-box",
        animation: "confirmModalFade 150ms ease-out",
      }}
    >
      <style>{`
        @keyframes confirmModalFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes confirmModalPop {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes confirmModalCheckPop {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          height: "auto",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          background: "var(--surface, #ffffff)",
          backgroundColor: "#ffffff",
          color: "var(--ink, #0f172a)",
          borderRadius: 14,
          padding: isSuccess ? "32px 24px 28px" : "24px 24px 20px",
          margin: 0,
          boxSizing: "border-box",
          boxShadow:
            "0 24px 64px rgba(15, 23, 42, 0.35), 0 6px 16px rgba(15, 23, 42, 0.15)",
          animation: "confirmModalPop 180ms cubic-bezier(0.16, 1, 0.3, 1)",
          textAlign: isSuccess ? "center" : "left",
        }}
      >
        {isSuccess ? (
          /* Success layout — centered column with the check glyph on top. */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: iconBg,
                color: iconAccent,
                animation:
                  "confirmModalCheckPop 320ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <Icon name="check" size={28} strokeWidth={2.4} />
            </span>
            <div>
              <h3
                id="confirm-modal-title"
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--ink, #0f172a)",
                  lineHeight: 1.3,
                }}
              >
                {title}
              </h3>
              <p
                id="confirm-modal-message"
                style={{
                  margin: "8px 0 0",
                  color: "var(--ink-soft, #475569)",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {displayMessage}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <span
                aria-hidden="true"
                style={{
                  flex: "0 0 auto",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: iconBg,
                  color: iconAccent,
                }}
              >
                <Icon name="bell" size={20} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  id="confirm-modal-title"
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--ink, #0f172a)",
                    lineHeight: 1.3,
                  }}
                >
                  {title}
                </h3>
                <p
                  id="confirm-modal-message"
                  style={{
                    margin: "6px 0 0",
                    color: "var(--ink-soft, #475569)",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {displayMessage}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                marginTop: 22,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onCancel}
                disabled={busy}
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                disabled={busy}
                style={{
                  background: busy ? "var(--gray-200, #e5e7eb)" : accent,
                  color: busy ? "var(--ink-faint, #94a3b8)" : "#fff",
                  border: `1px solid ${busy ? "var(--line, #e5e7eb)" : accent}`,
                  padding: "9px 18px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: busy ? "not-allowed" : "pointer",
                  transition: "transform 120ms ease, box-shadow 120ms ease",
                  boxShadow: busy
                    ? "none"
                    : isDanger
                    ? "0 1px 2px rgba(220, 38, 38, 0.4)"
                    : "0 1px 2px rgba(37, 99, 235, 0.4)",
                }}
              >
                {busy ? "Working…" : confirmLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}

export default ConfirmModal;
