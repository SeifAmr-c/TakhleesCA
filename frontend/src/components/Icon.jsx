import React from "react";

const PATHS = {
  anchor:
    "M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 6v14m-7-7a7 7 0 0 0 14 0M9 11h6",
  ship:
    "M3 18l1.5-4.5a2 2 0 0 1 1.9-1.4h11.2a2 2 0 0 1 1.9 1.4L21 18M3 18l9-3 9 3M5 18l-1 3M19 18l1 3M9 12V6h6v6",
  package:
    "M21 8 12 3 3 8m18 0v8l-9 5-9-5V8m18 0-9 5m0 0L3 8m9 5v8",
  shield:
    "M12 2 4 6v6c0 5 3.5 9.3 8 10 4.5-.7 8-5 8-10V6l-8-4Z",
  check:
    "M5 13l4 4L19 7",
  search:
    "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm6 13 4 4",
  arrow_right: "M5 12h14m-6-6 6 6-6 6",
  arrow_left: "M19 12H5m6-6-6 6 6 6",
  arrow_up: "M12 19V5m-6 6 6-6 6 6",
  arrow_down: "M12 5v14m-6-6 6 6 6-6",
  bell:
    "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Zm4 13a2 2 0 0 0 4 0",
  chart:
    "M3 3v18h18M7 14l3-3 4 4 6-6",
  trending:
    "M3 17l6-6 4 4 8-8m0 0v6m0-6h-6",
  user:
    "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
  building:
    "M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01M2 21h20",
  receipt:
    "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3ZM9 8h6M9 12h6M9 16h4",
  globe:
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0 0c2.8 0 5-4.5 5-10s-2.2-10-5-10S7 6.5 7 12s2.2 10 5 10ZM2 12h20",
  star:
    "M12 3l2.6 5.4 5.9.9-4.3 4.2 1 5.9L12 16.7 6.7 19.4l1-5.9L3.5 9.3l5.9-.9L12 3Z",
  email:
    "M3 6h18v12H3V6Zm0 0 9 7 9-7",
  phone:
    "M5 4h4l2 5-3 2a13 13 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 6a2 2 0 0 1 2-2Z",
  pin:
    "M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z",
  sparkle:
    "M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8M5.6 18.4l2.8-2.8m7.2-7.2 2.8-2.8",
  doc:
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8M8 17h8",
  lock:
    "M6 11V8a6 6 0 1 1 12 0v3M5 11h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z",
  logout:
    "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9",
  menu:
    "M4 6h16M4 12h16M4 18h16",
  eye:
    "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eye_off:
    "M3 3l18 18M10 10a3 3 0 0 0 4 4M9.9 4.2A10 10 0 0 1 22 12c-.6 1.1-1.5 2.3-2.7 3.4M6.1 6.1C3.7 7.8 2 10 2 12c0 0 4 7 10 7 1.6 0 3.1-.4 4.5-1",
  chat:
    "M21 15a4 4 0 0 1-4 4H8l-5 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
  send:
    "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z",
  close:
    "M6 6l12 12M18 6 6 18",
};

function Icon({ name, size = 20, strokeWidth = 1.8, color, fill, filled, style, className }) {
  const d = PATHS[name];
  if (!d) return null;
  const stroke = color || "currentColor";
  /* `filled` (boolean) is a convenience that solid-fills the path with
     the same colour as the stroke — used for star ratings and other
     glyphs where we want a solid silhouette. `fill` (string) is the
     escape hatch for explicit colours. */
  const resolvedFill = fill || (filled ? stroke : "none");
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={resolvedFill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export default Icon;
