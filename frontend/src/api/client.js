import axios from "axios";
import { clearAuth, getAuth } from "./authState";

// In dev, CRA's `proxy` field in package.json forwards relative URLs
// (like `/user/login`) to the Node backend on :3000, so the browser
// sees same-origin requests and the session cookie flows freely.
//
// In production, set REACT_APP_API_URL to the absolute backend origin
// (e.g. `https://api.takhlees.com`). The backend must then send proper
// CORS headers (Access-Control-Allow-Origin + Allow-Credentials) and
// the session cookie config must use `sameSite: 'none'` + `secure: true`.
const baseURL = process.env.REACT_APP_API_URL || "";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Stamp every request with the active UI language so the backend's
// language middleware (mounted in Phase 6) can localize reference data.
// Reads `app:lang` directly from localStorage to avoid a circular import
// with the i18n provider; the provider is the only writer of that key.
api.interceptors.request.use((config) => {
  try {
    const lang = window.localStorage.getItem("app:lang") || "en";
    config.headers = config.headers || {};
    config.headers["Accept-Language"] = lang;
  } catch (_) {
    // localStorage unavailable (SSR / privacy mode) — fall back to EN implicitly
  }
  return config;
});

// Turns any API/network error into a safe message for the UI. We never
// surface raw server text or infrastructure details to users:
//   - no response  -> the request never reached the server (offline, etc.)
//   - 4xx          -> deliberate, user-safe copy the API chose to send
//   - 5xx / other  -> unexpected; collapse to the generic fallback
export const friendlyError = (err, fallback = "Something went wrong. Please try again.") => {
  const res = err?.response;
  if (!res) {
    return "Can't reach the server. Please check your internet connection and try again.";
  }
  if (res.status >= 400 && res.status < 500) {
    return res.data?.message || res.data?.Message || res.data?.error || fallback;
  }
  return fallback;
};

// Pull the backend's stable error code (if any) off a thrown axios error
// or a non-throwing response body. Callers map it to the `errors` i18n
// namespace via t(`errors:${code}`), falling back to friendlyError(err).
export const errorCode = (errOrData) => {
  const data = errOrData?.response?.data ?? errOrData;
  return data?.code || null;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const auth = getAuth();
      const kind = auth?.kind;
      clearAuth();
      if (auth) {
        const loginPath = kind === "company" ? "/company/login" : "/login";
        if (window.location.pathname !== loginPath) {
          window.location.replace(`${loginPath}?expired=1`);
        }
      }
    }
    return Promise.reject(error);
  }
);
