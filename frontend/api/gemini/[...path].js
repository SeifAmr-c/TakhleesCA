// Vercel serverless proxy for the Google Gemini API.
//
// Why this exists: the Gemini API free tier is NOT available from the EU,
// and our Render backend runs in Frankfurt — so direct calls fail with
// "User location is not supported for the API use." Vercel serverless
// functions run in a US region (pinned to iad1 in vercel.json), so routing
// the Gemini call through here makes the upstream request originate from
// the US, where the free tier is allowed.
//
// The Render backend points the @google/genai SDK at this function via
// GEMINI_BASE_URL (see backend/src/modules/chatbot/chatbot_service.js). The
// SDK appends "/v1beta/models/<model>:generateContent" to that base, sends
// the API key as the x-goog-api-key header, and we forward both upstream.
//
// Protected by a shared secret (GEMINI_PROXY_SECRET) so it can't be abused
// as an open Gemini proxy.

const UPSTREAM = "https://generativelanguage.googleapis.com";

module.exports = async function handler(req, res) {
  const secret = process.env.GEMINI_PROXY_SECRET;
  if (!secret || req.headers["x-proxy-secret"] !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Everything after "/api/gemini" is the real Gemini path + query string,
  // e.g. "/v1beta/models/gemini-2.5-flash:generateContent".
  const suffix = req.url.replace(/^\/api\/gemini/, "");
  const target = `${UPSTREAM}${suffix}`;

  // Forward only what Google needs — drop host/secret/Vercel headers.
  const headers = {};
  if (req.headers["content-type"]) headers["content-type"] = req.headers["content-type"];
  if (req.headers["x-goog-api-key"]) headers["x-goog-api-key"] = req.headers["x-goog-api-key"];

  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    // Vercel already parsed the JSON body; re-serialize it for the upstream.
    body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    if (!headers["content-type"]) headers["content-type"] = "application/json";
  }

  try {
    const upstream = await fetch(target, { method: req.method, headers, body });
    const text = await upstream.text();
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);
    res.status(upstream.status).send(text);
  } catch (err) {
    res.status(502).json({ error: "Proxy upstream error", detail: String((err && err.message) || err) });
  }
};
