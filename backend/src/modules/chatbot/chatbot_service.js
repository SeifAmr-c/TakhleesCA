/* Takhlees client assistant — Gemini tool-calling over SSE.

   The handler runs a short tool-resolution loop against Gemini, then
   streams the final answer to the browser word-by-word over Server-Sent
   Events. Tools let the model read live data instead of hallucinating:

     recommend_companies          → company_service.queryRecommendations
     get_application_requirements → the fixed document checklist below

   Event protocol (read by frontend/src/api/chatbot.js):
     event: token   data: { "text": "<chunk>" }            // incremental reply text
     event: done    data: { "recommendations": [ ...rows ] } // final, structured payload
     event: error   data: { "message": "<safe>" }           // stream-level failure

   The frontend reads this with a fetch reader (not EventSource) so the
   session cookie and Accept-Language header flow on the cross-site
   Vercel→Render request. */

import { GoogleGenAI, Type } from "@google/genai";
import Category from "../../Database/mongo/category.mongo.js";
import { queryRecommendations } from "../company/company_service.js";
import { localize } from "../../utils/localize.js";

const MODEL = "gemini-2.5-flash";
const MAX_TOOL_ROUNDS = 5;
const MAX_HISTORY = 10;
const MAX_RESULTS = 6;

/* Canonical governorate values — must stay byte-identical to
   frontend/src/data/governorates.js, since Company.Governorate is matched
   on these exact strings. Injected into the prompt so the model emits a
   value the recommend query will actually hit. */
const GOVERNORATES = [
  "Al Daqahliyah", "Red Sea", "Al Buhayrah", "Al Fayyum", "Al Gharbiyah",
  "Alexandria", "Ismailia", "Giza", "Al Minufiyah", "Al Minya", "Cairo",
  "Al Qalyubiyah", "Luxor", "New Valley", "Suez", "Ash Sharqiyah", "Aswan",
  "Asyut", "Bani Suwayf", "Port Said", "Damietta", "South Sinai",
  "Kafr ash Shaykh", "Matruh", "Qina", "North Sinai", "Suhaj",
];

/* The four documents every application requires — mirrors the DocType enum
   in Database/mongo/application.mongo.js (the source of truth). Bilingual
   so the assistant can present them in the client's language. */
const DOC_REQUIREMENTS = [
  {
    type: "National ID / Passport",
    name: { en: "National ID or Passport", ar: "بطاقة الرقم القومي أو جواز السفر" },
    desc: {
      en: "A clear copy of the importer's national ID (or passport for non-citizens) to verify identity.",
      ar: "صورة واضحة من بطاقة الرقم القومي للمستورد (أو جواز السفر لغير المصريين) للتحقق من الهوية.",
    },
  },
  {
    type: "Proof Of Payment",
    name: { en: "Proof of Payment", ar: "إثبات الدفع" },
    desc: {
      en: "A receipt or bank-transfer confirmation showing the goods or shipment were paid for.",
      ar: "إيصال أو تأكيد تحويل بنكي يثبت سداد قيمة البضاعة أو الشحنة.",
    },
  },
  {
    type: "Delegation",
    name: { en: "Delegation (Power of Attorney)", ar: "التفويض (توكيل)" },
    desc: {
      en: "A signed authorization letting the clearance company act on your behalf with customs.",
      ar: "تفويض موقّع يسمح لشركة التخليص بالتصرف نيابةً عنك أمام الجمارك.",
    },
  },
  {
    type: "Shipping Document",
    name: { en: "Shipping Document", ar: "مستند الشحن" },
    desc: {
      en: "The bill of lading or air waybill describing the shipment and its origin.",
      ar: "بوليصة الشحن البحري أو الجوي التي تصف الشحنة ومصدرها.",
    },
  },
];

const FUNCTION_DECLARATIONS = [
  {
    name: "recommend_companies",
    description:
      "Find verified customs-clearance companies matching the client's governorate, service category, and price range. Returns ranked companies (best first). Call this whenever the client wants a recommendation or to find/compare clearance companies.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        governorate: {
          type: Type.STRING,
          description: "Egyptian governorate. MUST be exactly one of the canonical values listed in the system instructions.",
        },
        category: {
          type: Type.STRING,
          description: "Service category name. Match the client's intent to one of the catalog category names (English or Arabic) listed in the system instructions, and pass that name verbatim.",
        },
        minPrice: {
          type: Type.NUMBER,
          description: "Minimum acceptable fee in EGP. Use 0 when the client states no minimum.",
        },
        maxPrice: {
          type: Type.NUMBER,
          description: "Maximum acceptable fee in EGP. Use 1000000 when the client states no maximum.",
        },
      },
      required: ["governorate", "category", "minPrice", "maxPrice"],
    },
  },
  {
    name: "get_application_requirements",
    description:
      "Return the exact list of documents a client must upload to submit a customs-clearance application on Takhlees. Call this whenever the client asks what documents/papers are needed to apply or start a shipment.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
];

const buildSystemInstruction = (lang, categoryNames) => {
  const language = lang === "ar" ? "Arabic" : "English";
  const govList = GOVERNORATES.join(", ");
  const catList = categoryNames.length ? categoryNames.map((c) => `- ${c}`).join("\n") : "- (no categories configured)";
  return [
    "You are the Takhlees assistant, a premium concierge for an Egyptian customs-clearance marketplace. You serve CLIENTS only.",
    "",
    "What you can do:",
    "1. Recommend verified clearance companies — call the recommend_companies tool.",
    "2. Explain the documents required to start an application — call the get_application_requirements tool.",
    "3. Answer general questions about customs clearance and how Takhlees works.",
    "",
    "Rules:",
    `- Reply in ${language} (the client's interface language). If the client clearly writes in the other language, mirror them.`,
    "- Only ever name companies, prices, or ratings returned by the recommend_companies tool. NEVER invent a company, price, or rating.",
    "- Before recommending, if the governorate, category, or budget is missing and you cannot reasonably infer it, ask one short clarifying question. Otherwise call the tool.",
    "- If recommend_companies returns zero companies, do NOT call it again. Tell the client no verified companies matched and suggest widening the budget or trying a nearby governorate.",
    "- The UI renders the recommended companies as interactive cards the client can tap to view or apply, so do NOT repeat the full list in prose. Give a brief, warm summary (1-3 sentences) and invite them to tap a card.",
    "- For document questions, call get_application_requirements and present the list clearly.",
    "- Politely decline anything unrelated to customs clearance, shipping, or the Takhlees platform.",
    "- Be concise, warm, and professional.",
    "",
    "Valid governorates (use the EXACT value):",
    govList,
    "",
    "Service categories — map the client's intent to ONE of these. Pass a single name in one language (English OR Arabic), never the combined 'English / Arabic' line:",
    catList,
  ].join("\n");
};

/* The model may echo back a combined "English / Arabic" category label (or
   a near-match). Resolve it to a name that exactly equals a stored
   Type.en or Type.ar, which is what queryRecommendations matches on —
   otherwise a valid request would silently return zero results. */
const resolveCategory = (input, categories) => {
  const raw = String(input || "").trim();
  const parts = raw.includes("/") ? raw.split("/").map((s) => s.trim()) : [raw];
  for (const part of parts) {
    const lc = part.toLowerCase();
    for (const c of categories) {
      if ((c.Type?.en || "").toLowerCase() === lc) return c.Type.en;
      if ((c.Type?.ar || "") === part) return c.Type.ar;
    }
  }
  return raw;
};

/* ----------------------------- tools ----------------------------- */

const runRecommendTool = async (args, lang, categories) => {
  const governorate = typeof args?.governorate === "string" ? args.governorate.trim() : "";
  const category = resolveCategory(args?.category, categories);
  let minPrice = Number(args?.minPrice);
  let maxPrice = Number(args?.maxPrice);
  if (!Number.isFinite(minPrice) || minPrice < 0) minPrice = 0;
  if (!Number.isFinite(maxPrice) || maxPrice < 0) maxPrice = 1000000;
  if (minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];

  if (!governorate || !category) {
    return { modelResponse: { error: "governorate and category are both required." }, recommendations: [] };
  }

  const raw = await queryRecommendations({ governorate, category, minPrice, maxPrice });
  /* Flatten CategoryType { en, ar } → string for the active language, for
     both the model summary and the UI cards. */
  const rows = localize(raw, lang).slice(0, MAX_RESULTS);

  const recommendations = rows.map((r) => ({
    CompanyID: r.CompanyID,
    Name: r.Name,
    Governorate: r.Governorate,
    LogoUrl: r.LogoUrl,
    CategoryType: r.CategoryType,
    CategoryPrice: r.CategoryPrice,
    AverageRating: r.AverageRating,
    FulfilledCount: r.FulfilledCount,
  }));

  /* Compact projection for the model — enough to summarize, no PII. */
  const modelResponse = {
    count: recommendations.length,
    companies: recommendations.map((r) => ({
      companyId: r.CompanyID,
      name: r.Name,
      governorate: r.Governorate,
      category: r.CategoryType,
      priceEGP: r.CategoryPrice,
      averageRating: r.AverageRating,
      completedApplications: r.FulfilledCount,
    })),
  };

  return { modelResponse, recommendations };
};

const runRequirementsTool = (lang) => {
  const docs = DOC_REQUIREMENTS.map((d) => ({
    name: d.name[lang] || d.name.en,
    description: d.desc[lang] || d.desc.en,
  }));
  return {
    modelResponse: { count: docs.length, documents: docs },
    recommendations: null,
  };
};

const dispatchTool = async (name, args, lang, categories) => {
  if (name === "recommend_companies") return runRecommendTool(args, lang, categories);
  if (name === "get_application_requirements") return runRequirementsTool(lang);
  return { modelResponse: { error: `Unknown tool: ${name}` }, recommendations: null };
};

/* --------------------------- SSE helpers --------------------------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tokenize = (text) => text.split(/(\s+)/).filter((t) => t.length > 0);
const sseEvent = (res, event, data) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

/* Map the frontend chat history to Gemini `contents`. The frontend sends
   [{ role: 'user' | 'assistant', content }]; Gemini wants role 'model' for
   the assistant and a parts array. Keep only the last MAX_HISTORY turns. */
const toContents = (messages) => {
  const list = Array.isArray(messages) ? messages.slice(-MAX_HISTORY) : [];
  return list
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
};

const FALLBACK_REPLY = {
  en: "Sorry, I couldn't process that just now. Please try again.",
  ar: "عذرًا، لم أتمكن من معالجة طلبك الآن. من فضلك حاول مرة أخرى.",
};

export const streamMessage = async (req, res, next) => {
  try {
    const lang = req.lang === "ar" ? "ar" : "en";
    const apiKey = process.env.GEMINI_API_KEY;

    /* Bail before opening the stream so we can return a clean JSON error. */
    if (!apiKey) {
      return res.status(503).json({ ok: false, message: "The assistant is not configured yet. Please try again later." });
    }

    const contents = toContents(req.body?.messages);
    if (!contents.length || contents[contents.length - 1].role !== "user") {
      return res.status(400).json({ ok: false, message: "A user message is required." });
    }

    const categories = await Category.find().lean();
    const categoryNames = categories
      .map((c) => {
        const en = c.Type?.en;
        const ar = c.Type?.ar;
        if (en && ar && en !== ar) return `${en} / ${ar}`;
        return en || ar || "";
      })
      .filter(Boolean);

    /* In production the Gemini call must originate from a US region (the
       free tier is blocked in the EU, where Render/Frankfurt runs). When
       GEMINI_BASE_URL is set we route the SDK through the US Vercel proxy
       (api/gemini), authenticated with the shared GEMINI_PROXY_SECRET.
       Unset locally → the SDK calls Google directly. */
    const baseUrl = process.env.GEMINI_BASE_URL;
    const proxySecret = process.env.GEMINI_PROXY_SECRET;
    const httpOptions = baseUrl
      ? { baseUrl, headers: proxySecret ? { "x-proxy-secret": proxySecret } : {} }
      : undefined;
    const ai = new GoogleGenAI(httpOptions ? { apiKey, httpOptions } : { apiKey });
    const systemInstruction = buildSystemInstruction(lang, categoryNames);

    /* Gemini intermittently returns 503 (model overloaded). Retry a couple
       of times with backoff before giving up so a blip doesn't surface as a
       hard error to the client. */
    const generate = async (cfgContents) => {
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await ai.models.generateContent({
            model: MODEL,
            contents: cfgContents,
            config: {
              systemInstruction,
              tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
              temperature: 0.4,
            },
          });
        } catch (e) {
          lastErr = e;
          if (e?.status === 503 && attempt < 2) {
            await sleep(800 * (attempt + 1));
            continue;
          }
          throw e;
        }
      }
      throw lastErr;
    };

    /* Resolve any tool calls first (not streamed — usually one round). */
    let recommendations = [];
    let finalText = "";
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const result = await generate(contents);

      const calls = result.functionCalls || [];
      if (calls.length) {
        contents.push({ role: "model", parts: calls.map((c) => ({ functionCall: c })) });
        const responseParts = [];
        for (const call of calls) {
          const out = await dispatchTool(call.name, call.args, lang, categories);
          if (Array.isArray(out.recommendations) && out.recommendations.length) {
            recommendations = out.recommendations;
          }
          responseParts.push({ functionResponse: { name: call.name, response: out.modelResponse } });
        }
        contents.push({ role: "user", parts: responseParts });
        continue;
      }

      finalText = (result.text || "").trim();
      break;
    }

    if (!finalText) finalText = FALLBACK_REPLY[lang];

    /* Open the SSE stream and emit the answer word-by-word. */
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      /* Render/nginx buffer proxied responses by default, which would hold
         the whole stream until the end and defeat streaming. */
      "X-Accel-Buffering": "no",
    });
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    let closed = false;
    req.on("close", () => { closed = true; });

    for (const token of tokenize(finalText)) {
      if (closed) return;
      sseEvent(res, "token", { text: token });
      await sleep(18);
    }

    if (!closed) {
      sseEvent(res, "done", { recommendations });
      res.end();
    }
  } catch (err) {
    if (res.headersSent) {
      try { sseEvent(res, "error", { message: "Something went wrong. Please try again." }); } catch (_) {}
      return res.end();
    }
    return next(err);
  }
};
