import { SUPPORTED_LANGS, DEFAULT_LANG } from '../utils/localize.js';

/* Resolve the request language so reference-data responses can be
   localized. Precedence: explicit ?lang query (handy for testing) →
   Accept-Language header (the web client stamps `en`/`ar` via axios; the
   mobile app omits it and so defaults to en) → DEFAULT_LANG.

   Only the primary subtag is considered and it must be one we support;
   anything else falls back to en. */
export const resolveLanguage = (req, _res, next) => {
    const fromQuery = typeof req.query.lang === 'string' ? req.query.lang.toLowerCase() : '';
    const header = typeof req.headers['accept-language'] === 'string' ? req.headers['accept-language'] : '';
    const fromHeader = header.split(',')[0].trim().split('-')[0].toLowerCase();

    const candidate = SUPPORTED_LANGS.includes(fromQuery)
        ? fromQuery
        : (SUPPORTED_LANGS.includes(fromHeader) ? fromHeader : DEFAULT_LANG);

    req.lang = candidate;
    next();
};

export default resolveLanguage;
