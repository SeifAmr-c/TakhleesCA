import axios from "axios";
import { clearAuth } from "./authState";

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

/* Global auto-logout: any 401 from the backend means the session
   expired (or was never present). Clear the cached auth blob and bounce
   to /login so the next render shows the sign-in screen without the
   user having to click anything. Skip the redirect if the user is
   already on an auth page or the login POST itself returned 401 — the
   login form needs to surface that error inline. */
const AUTH_PATHS = ["/login", "/register", "/company/login", "/company/register"];
const LOGIN_ENDPOINTS = ["/user/login", "/company/login"];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const requestUrl = error?.config?.url || "";
      const isLoginCall = LOGIN_ENDPOINTS.some((p) => requestUrl.includes(p));
      if (!isLoginCall) {
        clearAuth();
        const onAuthPage = AUTH_PATHS.includes(window.location.pathname);
        if (!onAuthPage) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
