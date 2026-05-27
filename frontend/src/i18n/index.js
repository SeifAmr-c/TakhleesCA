import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";

import {
  SUPPORTED_LANGUAGES,
  detectInitialLanguage,
  persistLanguage,
} from "./languageDetector";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enLanding from "./locales/en/landing.json";
import enClient from "./locales/en/client.json";
import enCompany from "./locales/en/company.json";
import enAdmin from "./locales/en/admin.json";
import enErrors from "./locales/en/errors.json";
import enLegal from "./locales/en/legal.json";

import arCommon from "./locales/ar/common.json";
import arAuth from "./locales/ar/auth.json";
import arLanding from "./locales/ar/landing.json";
import arClient from "./locales/ar/client.json";
import arCompany from "./locales/ar/company.json";
import arAdmin from "./locales/ar/admin.json";
import arErrors from "./locales/ar/errors.json";
import arLegal from "./locales/ar/legal.json";

const RTL_LANGS = new Set(["ar"]);

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    landing: enLanding,
    client: enClient,
    company: enCompany,
    admin: enAdmin,
    errors: enErrors,
    legal: enLegal,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    landing: arLanding,
    client: arClient,
    company: arCompany,
    admin: arAdmin,
    errors: arErrors,
    legal: arLegal,
  },
};

const initial = detectInitialLanguage();

// During Phase 1 every t('foo.bar') falls back to its `defaultValue` (or the
// key itself), so untranslated pages keep rendering English literally —
// nothing breaks while AR bundles are still empty.
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initial,
      fallbackLng: "en",
      supportedLngs: SUPPORTED_LANGUAGES,
      ns: ["common", "auth", "landing", "client", "company", "admin", "errors", "legal"],
      defaultNS: "common",
      returnEmptyString: false,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
}

const applyDocumentDirection = (lang) => {
  if (typeof document === "undefined") return;
  const dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
  document.documentElement.setAttribute("lang", lang);
  document.documentElement.setAttribute("dir", dir);
};

// Cairo is lazy-loaded the first time the user actually requests AR.
// Webpack creates a separate chunk for the @fontsource CSS, so EN-only
// users never download the font files.
let arabicFontLoading = null;
const loadArabicFont = () => {
  if (arabicFontLoading) return arabicFontLoading;
  arabicFontLoading = Promise.all([
    import(/* webpackChunkName: "cairo-400" */ "@fontsource/cairo/400.css"),
    import(/* webpackChunkName: "cairo-600" */ "@fontsource/cairo/600.css"),
  ]).catch((err) => {
    // Don't crash the app if the chunk fails — fall back to the IBM Plex
    // stack declared in index.css. Reset so a later attempt can retry.
    // eslint-disable-next-line no-console
    console.warn("Failed to load Cairo font chunk:", err);
    arabicFontLoading = null;
  });
  return arabicFontLoading;
};

applyDocumentDirection(initial);
if (RTL_LANGS.has(initial)) loadArabicFont();

const LanguageContext = createContext({
  lang: initial,
  dir: RTL_LANGS.has(initial) ? "rtl" : "ltr",
  setLang: () => {},
  supported: SUPPORTED_LANGUAGES,
});

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(initial);

  const setLang = useCallback((next) => {
    if (!SUPPORTED_LANGUAGES.includes(next) || next === lang) return;
    persistLanguage(next);
    i18n.changeLanguage(next);
    applyDocumentDirection(next);
    if (RTL_LANGS.has(next)) loadArabicFont();
    setLangState(next);
  }, [lang]);

  useEffect(() => {
    // keep i18next + <html> in lock-step in case something external changed lng
    if (i18n.language !== lang) i18n.changeLanguage(lang);
    applyDocumentDirection(lang);
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    dir: RTL_LANGS.has(lang) ? "rtl" : "ltr",
    setLang,
    supported: SUPPORTED_LANGUAGES,
  }), [lang, setLang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

// Re-export `useTranslation` so callers only import from one place.
export { useTranslation };

export default i18n;
