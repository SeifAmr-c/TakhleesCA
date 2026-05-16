import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import { useAuth, setAuth, clearAuth } from "../../api/authState.js";
import { updateUserProfile, deleteUserAccount, canDeleteUser } from "../../api/auth.js";

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const FieldError = ({ message }) =>
  message ? (
    <span
      role="alert"
      style={{ color: "var(--signal-stop)", fontSize: 12, marginTop: 4, display: "block" }}
    >
      {message}
    </span>
  ) : null;

function UserProfileEdit() {
  const auth = useAuth();
  const navigate = useNavigate();
  const user = auth?.user;

  const [form, setForm] = useState({
    FirstName: user?.FirstName || "",
    LastName: user?.LastName || "",
    Email: user?.Email || "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  /* hasActiveApplications gates the Delete button. null = still loading
     the flag (button shows disabled with no helper text yet), true =
     blocked, false = safe to delete. */
  const [hasActiveApplications, setHasActiveApplications] = useState(null);
  const successTimerRef = useRef(null);

  useEffect(() => {
    setForm({
      FirstName: user?.FirstName || "",
      LastName: user?.LastName || "",
      Email: user?.Email || "",
    });
  }, [user?.UserID, user?.FirstName, user?.LastName, user?.Email]);

  /* Pull the can-delete flag once on mount so the button reflects the
     real eligibility before the user ever clicks. On failure we leave
     the button disabled — safer than silently letting the click through. */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await canDeleteUser();
        if (!active) return;
        setHasActiveApplications(Boolean(res?.hasActiveApplications));
      } catch {
        if (!active) return;
        setHasActiveApplications(true);
      }
    })();
    return () => { active = false; };
  }, []);

  /* Auto-hide the success message after 1500ms. */
  useEffect(() => {
    if (!success) return undefined;
    successTimerRef.current = setTimeout(() => setSuccess(""), 1500);
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
  }, [success]);

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((m) => ({ ...m, [key]: "" }));
    setServerError("");
    setSuccess("");
  };

  const validate = () => {
    const errs = {};
    if (!form.FirstName.trim() || form.FirstName.trim().length < 2) {
      errs.FirstName = "First name must be at least 2 characters.";
    }
    if (!form.LastName.trim() || form.LastName.trim().length < 2) {
      errs.LastName = "Last name must be at least 2 characters.";
    }
    if (!isValidEmail(form.Email)) {
      errs.Email = "Enter a valid email.";
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setServerError("");
    setSuccess("");
    try {
      const res = await updateUserProfile({
        FirstName: form.FirstName.trim(),
        LastName: form.LastName.trim(),
        Email: form.Email.trim(),
      });
      if (res?.ok && res?.data?.user) {
        setAuth({ ...auth, user: { ...(auth?.user || {}), ...res.data.user } });
        setSuccess("Profile updated successfully.");
      } else {
        setServerError(res?.message || "Couldn't update your profile.");
      }
    } catch (err) {
      setServerError(
        err?.response?.data?.message || "Couldn't update your profile."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* Account self-deletion. The button is gated upstream by
     hasActiveApplications so this handler never has to surface the
     server's 400 path. The custom modal owns the confirmation step;
     on API success we flip the modal into its success state for 2s
     so the user can read the affirmation before being kicked out. */
  const confirmDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await deleteUserAccount();
      if (res?.ok) {
        setDeleteSuccess(true);
        setDeleting(false);
        setTimeout(() => {
          clearAuth();
          navigate("/login", { replace: true });
        }, 2000);
      } else {
        setDeleting(false);
        setConfirmOpen(false);
      }
    } catch {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <PublicLayout>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
          padding: "48px 16px",
          flex: 1,
        }}
      >
        <div style={{ width: "100%", maxWidth: 480, marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(-1)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Icon name="arrow_left" size={14} />
            Back
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="card"
          noValidate
          style={{
            width: "100%",
            maxWidth: 480,
            padding: "32px 32px 28px",
            borderRadius: 12,
            border: "1px solid var(--line)",
            boxShadow: "0 12px 32px -16px rgba(0,0,0,0.18), 0 2px 6px -2px rgba(0,0,0,0.06)",
            background: "var(--surface, #fff)",
          }}
        >
          <h3 className="card-title" style={{ marginTop: 0 }}>Edit profile</h3>
          <p className="card-subtitle">
            Your name and email are visible to companies you work with.
          </p>

        <div className="stack">
          <label className="field">
            <span className="field-label">First name *</span>
            <div className="input-with-icon">
              <span className="input-icon"><Icon name="user" size={16} /></span>
              <input
                className="input"
                value={form.FirstName}
                onChange={update("FirstName")}
                autoComplete="given-name"
                disabled={submitting}
              />
            </div>
            <FieldError message={errors.FirstName} />
          </label>

          <label className="field">
            <span className="field-label">Last name *</span>
            <div className="input-with-icon">
              <span className="input-icon"><Icon name="user" size={16} /></span>
              <input
                className="input"
                value={form.LastName}
                onChange={update("LastName")}
                autoComplete="family-name"
                disabled={submitting}
              />
            </div>
            <FieldError message={errors.LastName} />
          </label>

          <label className="field">
            <span className="field-label">Email *</span>
            <div className="input-with-icon">
              <span className="input-icon"><Icon name="email" size={16} /></span>
              <input
                type="email"
                className="input"
                value={form.Email}
                onChange={update("Email")}
                autoComplete="email"
                disabled={submitting}
              />
            </div>
            <FieldError message={errors.Email} />
          </label>
        </div>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={submitting}
          >
            {submitting ? (
              <ContainerSpinner inline size={20} label="Saving…" />
            ) : (
              <>Save changes <Icon name="check" size={16} /></>
            )}
          </button>
        </div>

          {success && (
            <div className="banner-success" style={{ marginTop: 16 }}>
              <Icon name="check" size={16} />
              {success}
            </div>
          )}
          {serverError && (
            <div className="banner-error" style={{ marginTop: 16 }}>
              <Icon name="bell" size={16} />
              {serverError}
            </div>
          )}

          {(() => {
            /* Treat `null` (flag still loading) and `true` as blocked. The
               helper text is only shown when we know for sure the user
               has active applications. */
            const blocked = hasActiveApplications !== false;
            const isDisabled = blocked || deleting || submitting;
            return (
              <div
                style={{
                  marginTop: 32,
                  paddingTop: 20,
                  borderTop: "1px solid var(--line)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", textAlign: "center" }}>
                  Deleting your account is permanent and removes your profile data.
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={isDisabled}
                  style={{
                    background: isDisabled ? "var(--gray-200, #e5e7eb)" : "var(--signal-stop, #dc2626)",
                    color: isDisabled ? "var(--ink-faint, #94a3b8)" : "#fff",
                    border: `1px solid ${isDisabled ? "var(--line, #e5e7eb)" : "var(--signal-stop, #dc2626)"}`,
                    padding: "10px 20px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.65 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {deleting ? "Deleting…" : "Delete account"}
                </button>
                {hasActiveApplications === true && (
                  <span style={{ fontSize: 12, color: "var(--ink-soft, #64748b)", textAlign: "center" }}>
                    Account deletion is disabled because you have active applications.
                  </span>
                )}
              </div>
            );
          })()}
        </form>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={deleteSuccess ? "Account deleted" : "Delete your account?"}
        message="Are you sure you want to delete your account? This action cannot be undone."
        confirmLabel="Delete Account"
        cancelLabel="Cancel"
        variant="danger"
        busy={deleting}
        isSuccess={deleteSuccess}
        successMessage="Your account has been deleted. Redirecting to the login page..."
        onConfirm={confirmDeleteAccount}
        onCancel={() => { if (!deleting && !deleteSuccess) setConfirmOpen(false); }}
      />
    </PublicLayout>
  );
}

export default UserProfileEdit;
