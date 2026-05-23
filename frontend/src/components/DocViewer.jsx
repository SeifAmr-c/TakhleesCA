import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import Icon from "./Icon.jsx";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

const btnStyle = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
  borderRadius: "var(--radius-sm)",
  padding: "4px 12px",
  cursor: "pointer",
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

function DocViewer({ url, title, onClose }) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "f" || e.key === "F") setFullscreen((v) => !v);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!url) return null;

  const isImage = IMAGE_EXT.test(url);

  const panelStyle = fullscreen
    ? { flex: 1, minHeight: 0, width: "100%", borderRadius: 0, overflow: "hidden", background: "#fff" }
    : {
        width: "min(900px, 92vw)",
        height: "88vh",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
      };

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(10% 0.03 245 / 0.88)",
        display: "flex",
        flexDirection: "column",
        alignItems: fullscreen ? "stretch" : "center",
        justifyContent: fullscreen ? "flex-start" : "center",
        zIndex: 9999,
        padding: fullscreen ? 0 : 16,
      }}
    >
      {/* Toolbar — title on its own line, controls centered underneath
          so the action buttons aren't pinned to the right edge. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          width: fullscreen ? "100%" : "min(900px, 92vw)",
          padding: fullscreen ? "8px 16px" : "0 0 10px",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="doc" size={15} color="#fff" />
          {title || "Document"}
        </span>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          <button type="button" style={btnStyle} onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? "⤡ Exit fullscreen" : "⤢ Fullscreen"}
          </button>
          <button type="button" style={btnStyle} onClick={onClose}>
            ✕ Close
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {isImage ? (
          <img
            src={url}
            alt={title || "Document"}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        ) : (
          <iframe
            src={url}
            title={title || "Document"}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

export default DocViewer;
