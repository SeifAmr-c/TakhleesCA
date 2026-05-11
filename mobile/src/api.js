import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const COOKIE_KEY = 'takhlees.sessionCookie';

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

export async function loginCompany(email, password) {
  const res = await fetch(`${API_URL}/company/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ContactEmail: email, Password: password }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) {
    const message = body?.message || `Login failed (${res.status}).`;
    throw new Error(message);
  }

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

  return body.data?.company ?? null;
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
  };

  /* NOTE: deliberately NOT using `credentials: 'include'` here.
     On RN, that flag tells the native networking stack to attach
     cookies from its own jar — combined with our manual `Cookie`
     header it produces `connect.sid=X,connect.sid=X`, which
     cookie-parser then rejects, breaking the session lookup. */
  const res = await fetch(`${API_URL}/application/complete-via-qr`, {
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
    await fetch(`${API_URL}/company/logout`, {
      method: 'POST',
      headers: { ...(cleanCookie ? { Cookie: cleanCookie } : {}) },
    });
  } catch {
    /* best-effort */
  }
  await clearStoredCookie();
}
