const STORAGE_KEY = "app:lang";
const SUPPORTED = ["en", "ar"];
const FALLBACK = "en";

export const detectInitialLanguage = () => {
  if (typeof window === "undefined") return FALLBACK;

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("lang");
  if (fromQuery && SUPPORTED.includes(fromQuery)) {
    try { window.localStorage.setItem(STORAGE_KEY, fromQuery); } catch (_) {}
    return fromQuery;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch (_) {}

  const nav = (window.navigator?.language || "").slice(0, 2).toLowerCase();
  if (SUPPORTED.includes(nav)) return nav;

  return FALLBACK;
};

export const persistLanguage = (lang) => {
  if (!SUPPORTED.includes(lang)) return;
  try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
};

export const SUPPORTED_LANGUAGES = SUPPORTED;
export const LANGUAGE_STORAGE_KEY = STORAGE_KEY;
