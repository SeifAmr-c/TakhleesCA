// Vercel serverless proxy for the Google Gemini API.
//
// Why this exists: the Gemini API free tier is NOT available from the EU, and
// our Render backend runs in Frankfurt — so direct calls fail with
// "User location is not supported for the API use." Vercel functions run in a
// US region (pinned to iad1 in vercel.json), so routing the Gemini call through
// here makes the upstream request originate from the US, where the free tier is
// allowed.
//
// Routing: a bare `api/` directory on a non-Next.js project does NOT support
// true catch-all (`[...path]`) files — they only match a single path segment.
// The Gemini SDK calls a 3-segment path
// (/v1beta/models/<model>:generateContent), so instead of a catch-all file we
// use a vercel.json rewrite that captures the whole sub-path into the
// ?upstreamPath= query param and forwards it here:
//   /api/gemini/:path*  ->  /api/gemini-proxy?upstreamPath=:path*
//
// The Render backend points the @google/genai SDK at /api/gemini via
// GEMINI_BASE_URL (see backend/src/modules/chatbot/chatbot_service.js). The SDK
// sends the API key as the x-goog-api-key header; we forward it upstream.
//
// Protected by a shared secret (GEMINI_PROXY_SECRET) so it can't be abused as an
// open Gemini proxy.

const UPSTREAM = "https://generativelanguage.googleapis.com";

module.exports = async function handler(req, res) {
  const secret = process.env.GEMINI_PROXY_SECRET;
  if (!secret || req.headers["x-proxy-secret"] !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // The real Gemini sub-path is delivered by the vercel.json rewrite as the
  // upstreamPath query param. Vercel may hand it back as a string or an array
  // of segments depending on substitution — normalize both to "a/b/c".
  const raw = req.query.upstreamPath;
  const upstreamPath = (Array.isArray(raw) ? raw.join("/") : raw || "")
    .replace(/^\/+/, "");

  // Lightweight health probe to confirm the function deployed AND which region
  // it runs in (must be a US region or Gemini's free tier still geo-blocks us).
  if (upstreamPath === "_health") {
    res.status(200).json({ ok: true, region: process.env.VERCEL_REGION || "unknown" });
    return;
  }

  if (!upstreamPath) {
    res.status(404).json({ error: "Missing upstream path" });
    return;
  }

  // Preserve any other query params the SDK appended (e.g. alt=sse), minus the
  // routing params. `upstreamPath` is ours; `path` is auto-injected by Vercel
  // from the rewrite's :path* capture — neither must leak to Google.
  const extra = [];
  for (const [k, v] of Object.entries(req.query)) {
    if (k === "upstreamPath" || k === "path") continue;
    for (const val of Array.isArray(v) ? v : [v]) {
      extra.push(`${encodeURIComponent(k)}=${encodeURIComponent(val)}`);
    }
  }
  const qs = extra.length ? `?${extra.join("&")}` : "";
  const target = `${UPSTREAM}/${upstreamPath}${qs}`;

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
