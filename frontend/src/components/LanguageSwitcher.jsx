import React from "react";
import { useLanguage } from "../i18n";

const baseBtn = {
  appearance: "none",
  border: "0",
  background: "transparent",
  font: "inherit",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.02em",
  lineHeight: 1,
  padding: "6px 10px",
  borderRadius: 4,
  cursor: "pointer",
  color: "var(--ink-soft)",
  transition: "background 120ms var(--ease), color 120ms var(--ease)",
};

const activeBtn = {
  background: "var(--surface)",
  color: "var(--ink)",
  boxShadow:
    "0 1px 0 oklch(20% 0.055 245 / 0.04), 0 1px 2px oklch(20% 0.055 245 / 0.06)",
};

const wrapper = {
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  padding: 2,
  background: "var(--steel-100)",
  border: "1px solid var(--line)",
  borderRadius: 6,
  // keep the segmented control LTR even when the page is RTL so the
  // EN/AR order stays stable — switchers conventionally read left→right.
  direction: "ltr",
};

const LANG_LABEL = {
  en: { label: "EN", aria: "Switch to English" },
  ar: { label: "ع", aria: "التبديل إلى العربية" },
};

const LanguageSwitcher = ({ className, style }) => {
  const { lang, setLang, supported } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language"
      className={className}
      style={{ ...wrapper, ...style }}
    >
      {supported.map((code) => {
        const meta = LANG_LABEL[code] || { label: code.toUpperCase(), aria: code };
        const isActive = code === lang;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={isActive}
            aria-label={meta.aria}
            title={meta.aria}
            // Arabic glyphs render a touch larger; nudge the AR button so
            // the two cells stay visually balanced.
            style={{
              ...baseBtn,
              ...(isActive ? activeBtn : null),
              fontSize: code === "ar" ? 14 : 12,
            }}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
