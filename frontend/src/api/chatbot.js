/* Streaming client for the assistant chatbot.

   We use fetch + a ReadableStream reader rather than EventSource because
   EventSource can't send credentials/headers the way we need: the session
   cookie must flow cross-site (Vercel→Render) and we stamp Accept-Language
   so the backend replies in the active UI language. baseURL mirrors
   api/client.js — relative in dev (CRA proxy), absolute in prod. */

const API_BASE = process.env.REACT_APP_API_URL || "";

/* Parse one SSE record ("event: x\ndata: {...}") into { event, data }. */
const parseRecord = (raw) => {
  let event = "message";
  let data = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  let parsed = {};
  if (data) {
    try { parsed = JSON.parse(data); } catch { parsed = {}; }
  }
  return { event, data: parsed };
};

/* Stream a chat turn. `messages` is the running history
   [{ role: 'user'|'assistant', content }]. Callbacks fire as events
   arrive. Pass an AbortSignal to cancel an in-flight stream. */
export async function streamChatMessage(messages, { lang, signal, onToken, onDone, onError } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/chatbot/message`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": lang || "en",
      },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") return;
    onError?.("Can't reach the server. Please check your connection and try again.");
    return;
  }

  if (!res.ok || !res.body) {
    let message = "Something went wrong. Please try again.";
    let status = res.status;
    try {
      const body = await res.json();
      message = body?.message || message;
    } catch (_) { /* non-JSON error body */ }
    onError?.(message, status);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (!raw.trim()) continue;
        const { event, data } = parseRecord(raw);
        if (event === "token") onToken?.(data.text || "");
        else if (event === "done") onDone?.(data || {});
        else if (event === "error") onError?.(data.message || "Something went wrong.");
      }
    }
  } catch (err) {
    if (err?.name === "AbortError") return;
    onError?.("The connection was interrupted. Please try again.");
  }
}
