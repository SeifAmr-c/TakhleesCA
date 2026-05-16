import { useEffect, useState } from "react";

const KEY = "takhlees_auth";
const EVT = "takhlees:auth-change";

// Mirrors the express-session cookie maxAge in backend/src/app.controller.js.
// Browser cookie does not roll, so the effective lifetime is 30 minutes from login.
const SESSION_TTL_MS = 30 * 60 * 1000;

let expiryTimer = null;

const loginPathFor = (kind) =>
  kind === "company" ? "/company/login" : "/login";

const onPublicAuthRoute = () => {
  const p = window.location.pathname;
  return (
    p === "/login" ||
    p === "/register" ||
    p === "/company/login" ||
    p === "/company/register"
  );
};

const triggerExpiry = () => {
  const auth = readAuth();
  const kind = auth?.kind;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  if (!auth || onPublicAuthRoute()) return;
  window.location.replace(`${loginPathFor(kind)}?expired=1`);
};

const scheduleExpiry = (expiresAt) => {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  if (!expiresAt) return;
  const ms = expiresAt - Date.now();
  if (ms <= 0) {
    triggerExpiry();
    return;
  }
  expiryTimer = setTimeout(triggerExpiry, ms);
};

const readAuth = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getAuth = () => readAuth();

export const setAuth = (auth) => {
  const withExpiry =
    auth && typeof auth === "object" && auth.expiresAt
      ? auth
      : { ...auth, expiresAt: Date.now() + SESSION_TTL_MS };
  localStorage.setItem(KEY, JSON.stringify(withExpiry));
  scheduleExpiry(withExpiry.expiresAt);
  window.dispatchEvent(new Event(EVT));
};

export const clearAuth = () => {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
};

if (typeof window !== "undefined") {
  const initial = readAuth();
  if (initial?.expiresAt) scheduleExpiry(initial.expiresAt);

  // Keep tabs in sync: if another tab logs in / out, reschedule the timer here.
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    const auth = readAuth();
    if (auth?.expiresAt) scheduleExpiry(auth.expiresAt);
    else if (expiryTimer) {
      clearTimeout(expiryTimer);
      expiryTimer = null;
    }
  });
}

export const useAuth = () => {
  const [auth, setAuthState] = useState(() => readAuth());
  useEffect(() => {
    const sync = () => setAuthState(readAuth());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return auth;
};
