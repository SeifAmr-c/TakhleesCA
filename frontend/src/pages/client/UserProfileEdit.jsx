import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Icon from "../../components/Icon.jsx";
import ContainerSpinner from "../../components/ContainerSpinner.jsx";
import { useAuth, setAuth } from "../../api/authState.js";
import { updateUserProfile } from "../../api/auth.js";

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

  useEffect(() => {
    setForm({
      FirstName: user?.FirstName || "",
      LastName: user?.LastName || "",
      Email: user?.Email || "",
    });
  }, [user?.UserID, user?.FirstName, user?.LastName, user?.Email]);

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
          >
            <span aria-hidden="true">←</span> Back
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
        </form>
      </div>
    </PublicLayout>
  );
}

export default UserProfileEdit;
