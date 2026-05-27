import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const COOKIE_KEY = 'takhlees.sessionCookie';
const SESSION_KEY = 'takhlees.session';

/* Every mobile request advertises itself with this header. The backend's
   session middleware uses it to keep mobile sessions alive for a year
   while leaving web sessions on the original 30-minute rolling window.
   Spread into every fetch headers object below — don't drop it. */
const MOBILE_PLATFORM_HEADERS = { 'X-Client-Platform': 'mobile' };

/* The backend runs on a free tier that spins down when idle, so the
   first request after a gap can stall while the server cold starts. Cap
   every request so a genuinely stuck socket eventually surfaces a
   retryable error instead of an indefinite spinner. The window is
   generous on purpose — a real cold start can take well over a minute,
   and we'd rather wait than abort a request that's about to succeed. */
const REQUEST_TIMEOUT_MS = 120000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      const e = new Error(
        'The server took too long to respond. It may be waking up — please try again.'
      );
      e.status = 0;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* Reduce any messy cookie string down to a single canonical
   `connect.sid=<value>` pair. Handles:
    - duplication from RN merging native-jar + manual headers
      (e.g. `connect.sid=A,connect.sid=A` or `... ; connect.sid=B`)
    - trailing attributes accidentally left on (`; Path=/; HttpOnly`)
    - stray whitespace / surrounding quotes
   Returns null if no valid connect.sid value can be found. */
function sanitizeConnectSid(raw) {
  if (!raw) return null;
  const str = String(raw).trim();

  /* Split on either commas or semicolons — both are used to join
     cookies depending on the runtime — and look for the first segment
     whose name is connect.sid. */
  const segments = str.split(/[,;]/);
  for (const seg of segments) {
    const part = seg.trim();
    if (!part) continue;
    const m = part.match(/^connect\.sid=([^;,\s]+)/);
    if (m) {
      return `connect.sid=${m[1]}`;
    }
  }
  return null;
}

export async function getStoredCookie() {
  return SecureStore.getItemAsync(COOKIE_KEY);
}

export async function clearStoredCookie() {
  return SecureStore.deleteItemAsync(COOKIE_KEY);
}

/* The role + identity blob lives next to the cookie so the bootstrap
   path can pick the correct navigator without a network round-trip. */
export async function getStoredSession() {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function setStoredSession(session) {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  if (session) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  }
}

export async function clearStoredSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

/* React Native's fetch does not maintain a cookie jar across requests,
   so we extract `connect.sid` from the login response's Set-Cookie header
   and replay it manually as a `Cookie` header on later requests.

   `res.headers.get('set-cookie')` is unreliable on RN:
    - It can return null even when a Set-Cookie was sent.
    - When multiple cookies are present they are joined by ", " which
      collides with the comma inside `Expires=Wed, 21 Oct 2026 ...`.
   So we read every available representation and split carefully. */
function collectSetCookieValues(res) {
  const out = [];

  /* RN core implementation keeps the raw header map here. When two
     Set-Cookie headers are sent, this entry is an array. */
  const raw = res?.headers?.map?.['set-cookie'];
  if (raw) {
    if (Array.isArray(raw)) out.push(...raw);
    else out.push(String(raw));
  }

  /* Standards-compliant iteration — works on hermes and on web. */
  if (out.length === 0 && typeof res?.headers?.forEach === 'function') {
    try {
      res.headers.forEach((value, key) => {
        if (String(key).toLowerCase() === 'set-cookie' && value) {
          out.push(String(value));
        }
      });
    } catch {
      /* ignore */
    }
  }

  /* Final fallback. Some platforms only expose Set-Cookie via .get(). */
  if (out.length === 0) {
    const got = res?.headers?.get?.('set-cookie');
    if (got) out.push(String(got));
  }

  return out;
}

function extractConnectSid(setCookieValues) {
  for (const value of setCookieValues) {
    /* Split on commas that are followed by a cookie-name=value pair.
       This avoids splitting at the comma inside `Expires=<date>`. */
    const parts = value.split(/,(?=\s*[A-Za-z0-9!#$%&'*+\-.^_`|~]+=)/);
    for (const part of parts) {
      const match = part.match(/(?:^|;\s*)connect\.sid=([^;]+)/);
      if (match) {
        /* Sanitize one more time before returning so we never store a
           value with trailing attrs or whitespace. */
        return sanitizeConnectSid(`connect.sid=${match[1].trim()}`);
      }
    }
  }
  return null;
}

async function persistCookieFromResponse(res) {
  const setCookieValues = collectSetCookieValues(res);
  const cookie = extractConnectSid(setCookieValues);

  if (!cookie) {
    console.warn(
      '[api] login succeeded but no connect.sid was found in Set-Cookie',
      setCookieValues
    );
    throw new Error(
      'Logged in, but the session cookie could not be read. Please try again.'
    );
  }

  /* Belt-and-braces: nuke any prior value first so a stale entry can
     never be concatenated with the new one by the platform. */
  await SecureStore.deleteItemAsync(COOKIE_KEY);
  await SecureStore.setItemAsync(COOKIE_KEY, cookie);
}

export async function loginCompany(email, password) {
  const res = await fetchWithTimeout(`${API_URL}/company/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...MOBILE_PLATFORM_HEADERS,
    },
    body: JSON.stringify({ ContactEmail: email, Password: password }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) {
    const message = body?.message || `Login failed (${res.status}).`;
    throw new Error(message);
  }

  await persistCookieFromResponse(res);

  const company = body.data?.company ?? null;
  const session = {
    role: 'company',
    company,
    companyId: company?.CompanyID ?? null,
  };
  await setStoredSession(session);
  return session;
}

export async function loginUser(email, password) {
  const res = await fetchWithTimeout(`${API_URL}/user/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...MOBILE_PLATFORM_HEADERS,
    },
    body: JSON.stringify({ Email: email, Password: password }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) {
    const message = body?.message || `Login failed (${res.status}).`;
    throw new Error(message);
  }

  await persistCookieFromResponse(res);

  const user = body.data?.user ?? null;
  /* The backend returns role = 'admin' for User.Type === 'A', otherwise
     'client'. The mobile app only services the 'client' experience —
     admins should manage the platform via the web dashboard. */
  if (user?.Type === 'A') {
    await clearStoredCookie();
    throw new Error('Admin accounts must sign in on the web dashboard.');
  }
  const session = {
    role: 'client',
    user,
    userId: user?.UserID ?? null,
  };
  await setStoredSession(session);
  return session;
}

/* Generic GET-with-session helper used by the listing screens. */
async function authedGet(path) {
  const cleanCookie = sanitizeConnectSid(await getStoredCookie());
  if (!cleanCookie) {
    const err = new Error('Session expired. Please sign in again.');
    err.status = 401;
    throw err;
  }
  const res = await fetchWithTimeout(`${API_URL}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Cookie: cleanCookie,
      ...MOBILE_PLATFORM_HEADERS,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (body && (body.message || body.error)) || `Request failed (${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return body;
}

/* Both endpoints live under /application on this MongoDB-only branch
   (the dual-write /mobile/application/* twin is gone). Company list
   matches the web frontend's pattern exactly: GET /application?CompanyID=<id>.
   Client list uses /application/client-list because the screen needs
   `QrPayload`, which only that endpoint includes (includeToken: true). */
export async function listCompanyApplications(companyId) {
  if (!companyId) {
    throw new Error('Missing companyId.');
  }
  return authedGet(`/application?CompanyID=${encodeURIComponent(companyId)}`);
}

export async function listClientApplications(clientId) {
  if (!clientId) {
    throw new Error('Missing clientId.');
  }
  return authedGet('/application/client-list');
}

export async function completeViaQr(qrPayload) {
  const storedCookie = await getStoredCookie();
  const cleanCookie = sanitizeConnectSid(storedCookie);

  if (!cleanCookie) {
    const err = new Error('Session expired. Please sign in again.');
    err.status = 401;
    throw err;
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Cookie: cleanCookie,
    ...MOBILE_PLATFORM_HEADERS,
  };

  /* NOTE: deliberately NOT using `credentials: 'include'` here.
     On RN, that flag tells the native networking stack to attach
     cookies from its own jar — combined with our manual `Cookie`
     header it produces `connect.sid=X,connect.sid=X`, which
     cookie-parser then rejects, breaking the session lookup. */
  const res = await fetchWithTimeout(`${API_URL}/application/complete-via-qr`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ qrPayload }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) {
    const message = body?.message || `Request failed (${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return body;
}

export async function logoutCompany() {
  const cleanCookie = sanitizeConnectSid(await getStoredCookie());
  try {
    await fetchWithTimeout(`${API_URL}/company/logout`, {
      method: 'POST',
      headers: {
        ...(cleanCookie ? { Cookie: cleanCookie } : {}),
        ...MOBILE_PLATFORM_HEADERS,
      },
    });
  } catch {
    /* best-effort */
  }
  await clearStoredCookie();
  await clearStoredSession();
}

export async function logoutUser() {
  const cleanCookie = sanitizeConnectSid(await getStoredCookie());
  try {
    await fetchWithTimeout(`${API_URL}/user/logout`, {
      method: 'POST',
      headers: {
        ...(cleanCookie ? { Cookie: cleanCookie } : {}),
        ...MOBILE_PLATFORM_HEADERS,
      },
    });
  } catch {
    /* best-effort */
  }
  await clearStoredCookie();
  await clearStoredSession();
}

/* Apple's App Review Guideline 5.1.1(v) requires apps that let users
   create an account to also let them delete it from inside the app.
   The web has the same two endpoints under the same routes; the
   handlers run inside a transaction, anonymize historical Application
   rows (so completed shipments stay on the books), drop the user's
   support tickets, and destroy the server session. We mirror that by
   wiping the stored cookie + role blob on this side. */
async function authedSend(path, method) {
  const cleanCookie = sanitizeConnectSid(await getStoredCookie());
  if (!cleanCookie) {
    const err = new Error('Session expired. Please sign in again.');
    err.status = 401;
    throw err;
  }
  const res = await fetchWithTimeout(`${API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Cookie: cleanCookie,
      ...MOBILE_PLATFORM_HEADERS,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) {
    const message = body?.message || `Request failed (${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return body;
}

export async function canDeleteUser() {
  return authedSend('/user/can-delete', 'GET');
}

export async function canDeleteCompanyAccount() {
  return authedSend('/company/can-delete', 'GET');
}

export async function deleteUserAccount() {
  try {
    const body = await authedSend('/user/profile', 'DELETE');
    return body;
  } finally {
    /* The server destroys the session and clears the cookie on its
       end; mirror that locally so the next launch can't replay a
       half-dead session and the UI returns to the sign-in screen. */
    await clearStoredCookie();
    await clearStoredSession();
  }
}

export async function deleteCompanyAccount() {
  try {
    const body = await authedSend('/company/profile', 'DELETE');
    return body;
  } finally {
    await clearStoredCookie();
    await clearStoredSession();
  }
}
