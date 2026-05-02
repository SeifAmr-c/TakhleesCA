import React from "react";

const VIEWBOX = { x: 1120, y: 295, w: 75, h: 70 };

const PORTS = [
  { id: "alexandria", name: "Alexandria", x: 1147, y: 302 },
  { id: "damietta",   name: "Damietta",   x: 1160, y: 302 },
  { id: "sokhna",     name: "Sokhna",     x: 1163, y: 318 },
];

function toPct(x, y) {
  return {
    left: ((x - VIEWBOX.x) / VIEWBOX.w) * 100,
    top:  ((y - VIEWBOX.y) / VIEWBOX.h) * 100,
  };
}

function InteractiveMap() {
  return (
    <div className="interactive-map">
      <style>{mapStyles}</style>
      <div className="interactive-map-frame">
        <svg
          className="interactive-map-svg"
          viewBox="1120 295 75 70"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Map of Egypt with active port operations"
          role="img"
        >
          <path
            className="interactive-map-path"
            d="M1172.1 301.4l3.9 9.4 0.7 1.6-1.3 2.6-0.7 4.8-1.2 3.4-1.2 1.1-2-2.1-2.7-2.8-4.7-9.2-0.5 0.6 2.8 6.7 3.9 6.5 4.9 10 2.3 3.5 2 3.6 5.4 7.1-1 1.1 0.4 4.2 6.8 5.8 1.1 1.3-22.1 0-21.5 0-22.3 0-1-23.7-1.3-22.8-2-5.2 1.1-3.9-1-2.8 1.7-3.1 7.2-0.1 5.4 1.7 5.5 1.9 2.6 1 4-2 2.1-1.8 4.7-0.6 3.9 0.8 1.8 3.2 1.1-2.1 4.4 1.5 4.3 0.4 2.5-1.6z"
          />
        </svg>

        {PORTS.map((p) => {
          const { left, top } = toPct(p.x, p.y);
          return (
            <div
              key={p.id}
              className="interactive-map-marker"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <span className="interactive-map-pulse" aria-hidden="true" />
              <span className="interactive-map-pulse interactive-map-pulse--delayed" aria-hidden="true" />
              <span className="interactive-map-dot" />
              <div className="interactive-map-tooltip" role="tooltip">
                <div className="interactive-map-tooltip-name">{p.name}</div>
                <div className="interactive-map-tooltip-status">
                  <span className="interactive-map-tooltip-dot" />
                  Live Operations
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const mapStyles = `
  .interactive-map {
    width: 100%;
  }
  .interactive-map-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 75 / 70;
    background:
      linear-gradient(180deg, var(--harbor-950) 0%, var(--harbor-900) 100%);
    border: 1px solid oklch(100% 0 0 / 0.08);
    border-radius: var(--radius-lg);
    overflow: visible;
    background-image:
      linear-gradient(oklch(100% 0 0 / 0.025) 1px, transparent 1px),
      linear-gradient(90deg, oklch(100% 0 0 / 0.025) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  .interactive-map-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .interactive-map-path {
    fill: var(--steel-700);
    stroke: var(--harbor-400);
    stroke-width: 0.35;
    stroke-linejoin: round;
    fill-opacity: 0.92;
    filter: drop-shadow(0 1px 0 oklch(0% 0 0 / 0.30));
  }

  .interactive-map-marker {
    position: absolute;
    width: 0;
    height: 0;
    transform: translate(-50%, -50%);
  }
  .interactive-map-dot {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--safety);
    border: 1.5px solid #fff;
    box-shadow:
      0 0 0 1px oklch(0% 0 0 / 0.35),
      0 2px 8px -2px oklch(0% 0 0 / 0.50);
    transform: translate(-50%, -50%);
    z-index: 2;
  }
  .interactive-map-pulse {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--safety);
    transform: translate(-50%, -50%);
    opacity: 0.55;
    animation: interactive-map-radar 2.4s var(--ease-out-quart) infinite;
    pointer-events: none;
    z-index: 1;
  }
  .interactive-map-pulse--delayed {
    animation-delay: 1.2s;
  }
  @keyframes interactive-map-radar {
    0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.55; }
    80%  { transform: translate(-50%, -50%) scale(4.2); opacity: 0;    }
    100% { transform: translate(-50%, -50%) scale(4.2); opacity: 0;    }
  }

  .interactive-map-tooltip {
    position: absolute;
    left: 50%;
    bottom: calc(50% + 14px);
    transform: translate(-50%, -4px);
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    min-width: 140px;
    box-shadow: 0 8px 24px -8px oklch(0% 0 0 / 0.45);
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 280ms var(--ease-out-quart),
      transform 280ms var(--ease-out-quart);
    white-space: nowrap;
    z-index: 3;
  }
  .interactive-map-tooltip::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: -4px;
    width: 8px;
    height: 8px;
    background: var(--surface);
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    transform: translateX(-50%) rotate(45deg);
  }
  .interactive-map-tooltip-name {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.005em;
    color: var(--ink);
  }
  .interactive-map-tooltip-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--safety-700);
  }
  .interactive-map-tooltip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--safety);
    box-shadow: 0 0 0 0 var(--safety);
    animation: interactive-map-tooltip-pulse 1.8s var(--ease-out-quart) infinite;
  }
  @keyframes interactive-map-tooltip-pulse {
    0%   { box-shadow: 0 0 0 0   oklch(72% 0.18 65 / 0.55); }
    70%  { box-shadow: 0 0 0 6px oklch(72% 0.18 65 / 0);    }
    100% { box-shadow: 0 0 0 0   oklch(72% 0.18 65 / 0);    }
  }

  .interactive-map-marker:hover .interactive-map-tooltip,
  .interactive-map-marker:focus-within .interactive-map-tooltip {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  @media (prefers-reduced-motion: reduce) {
    .interactive-map-pulse,
    .interactive-map-tooltip-dot {
      animation: none;
    }
  }
`;

export default InteractiveMap;
