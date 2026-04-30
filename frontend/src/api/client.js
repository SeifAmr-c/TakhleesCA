import axios from "axios";

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
