import React from "react";
import "./ContainerSpinner.css";

const CORRUGATIONS = Array.from({ length: 11 }, (_, i) => 20 + i * 7.5);

function ContainerSpinner({
  size = 88,
  label = "Loading",
  inline = false,
  onDark = false,
  showLabel = true,
}) {
  const classNames = ["cs"];
  if (inline) classNames.push("cs--inline");
  if (onDark) classNames.push("cs--on-dark");

  const sizeStyle =
    typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className={classNames.join(" ")}
      role="status"
      aria-live="polite"
      style={{ "--cs-size": sizeStyle }}
    >
      <svg
        className="cs__svg"
        viewBox="0 0 120 64"
        aria-hidden="true"
        focusable="false"
      >
        {/* top rail — drops in last */}
        <rect className="cs__top" x="6" y="8" width="108" height="6" rx="1" />

        {/* corrugated body — drops in third */}
        <g className="cs__body">
          <rect x="14" y="14" width="92" height="36" rx="0.5" />
          {CORRUGATIONS.map((x) => (
            <line key={x} x1={x} y1={18} x2={x} y2={46} />
          ))}
        </g>

        {/* end caps — slide in second */}
        <rect
          className="cs__cap cs__cap--l"
          x="6"
          y="14"
          width="8"
          height="36"
          rx="1"
        />
        <g className="cs__cap cs__cap--r">
          <rect x="106" y="14" width="8" height="36" rx="1" />
          {/* door split line */}
          <line x1="110" y1="18" x2="110" y2="46" />
        </g>

        {/* bottom rail — drops in first */}
        <rect
          className="cs__bottom"
          x="6"
          y="50"
          width="108"
          height="6"
          rx="1"
        />

        {/* safety amber pulse on the door handle — fires when assembled */}
        <circle className="cs__spark" cx="110" cy="32" r="2.4" />
      </svg>

      {showLabel && <span className="cs__label">{label}</span>}
      <span className="sr-only" style={visuallyHidden}>
        {label}
      </span>
    </div>
  );
}

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

export default ContainerSpinner;
