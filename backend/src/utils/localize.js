/* Flattens bilingual { en, ar } subdocs (see Database/mongo/_shared.js)
   down to a single string for the request's language, so API responses
   keep the same plain-string shape clients already consume. Everything
   that isn't a LocalizedString passes through untouched. */

export const SUPPORTED_LANGS = ['en', 'ar'];
export const DEFAULT_LANG = 'en';

/* A LocalizedString is a plain object whose own keys are a subset of the
   supported languages and that carries at least an `en` string. The
   subset check keeps us from mistaking an ordinary response object that
   merely happens to have an `en` field for a translation pair. */
const isLocalized = (v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const keys = Object.keys(v);
    if (keys.length === 0) return false;
    if (!keys.every((k) => SUPPORTED_LANGS.includes(k))) return false;
    return typeof v.en === 'string' || typeof v.ar === 'string';
};

/* Only recurse into plain objects. Dates, ObjectIds, Buffers, etc. have
   a non-Object prototype and must be returned as-is — rebuilding them
   key-by-key would corrupt them. */
const isPlainObject = (v) => {
    if (v === null || typeof v !== 'object') return false;
    const proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
};

export const localize = (value, lang = DEFAULT_LANG) => {
    const target = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;

    const walk = (v) => {
        if (Array.isArray(v)) return v.map(walk);
        if (isLocalized(v)) {
            const picked = v[target];
            return picked == null || picked === '' ? (v.en ?? v.ar ?? '') : picked;
        }
        if (isPlainObject(v)) {
            const out = {};
            for (const k of Object.keys(v)) out[k] = walk(v[k]);
            return out;
        }
        return v;
    };

    return walk(value);
};

/* Normalize admin-supplied input into a stored { en, ar } pair. Accepts
   either the bilingual object (new admin UI) or a bare string (legacy
   callers / mobile) — in which case ar mirrors en. Returns null when no
   usable value is present so callers can reject the request. */
export const parseLocalizedInput = (raw) => {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const en = typeof raw.en === 'string' ? raw.en.trim() : '';
        const ar = typeof raw.ar === 'string' ? raw.ar.trim() : '';
        if (!en && !ar) return null;
        return { en: en || ar, ar: ar || en };
    }
    if (typeof raw === 'string') {
        const s = raw.trim();
        return s ? { en: s, ar: s } : null;
    }
    return null;
};

/* Patches res.json so every JSON response is flattened to req.lang
   automatically — no per-handler call needed. Admin endpoints that must
   expose both languages (so the catalog can be edited) opt out by
   setting res.locals.skipLocalize = true before responding. */
export const localizeResponses = (req, res, next) => {
    const original = res.json.bind(res);
    res.json = (body) => {
        if (res.locals && res.locals.skipLocalize) return original(body);
        return original(localize(body, req.lang));
    };
    next();
};
