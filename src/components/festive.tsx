// Hand-drawn Christmas artwork and the animated backdrop behind every page.
// Decorations are aria-hidden and ignore the mouse.

import type { CSSProperties } from "react";

type SvgProps = { className?: string; style?: CSSProperties };

export function Star({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 64 60" className={className} style={style} aria-hidden>
      <polygon
        points="32,4 39.1,22.3 58.6,23.3 43.4,35.7 48.5,54.7 32,44 15.5,54.7 20.6,35.7 5.4,23.3 24.9,22.3"
        fill="var(--gold)"
        stroke="#fff3c4"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Tree({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 64 84" className={className} style={style} aria-hidden>
      <rect x="27" y="70" width="10" height="12" rx="1.5" fill="#7a4a24" />
      <polygon points="32,24 54,52 10,52" fill="#1f7a45" />
      <polygon points="32,36 60,72 4,72" fill="#16653a" />
      <polygon points="32,12 48,34 16,34" fill="#2a9152" />
      <path d="M17 44q15 8 30-3M11 63q21 9 42-4" stroke="var(--gold)" strokeWidth="1.6" fill="none" />
      <g className="anim-twinkle">
        <circle cx="24" cy="46" r="2.6" fill="var(--accent)" />
        <circle cx="42" cy="58" r="2.6" fill="var(--frost)" />
        <circle cx="20" cy="64" r="2.6" fill="var(--gold)" />
      </g>
      <g className="anim-twinkle" style={{ animationDelay: "-1.1s" }}>
        <circle cx="38" cy="44" r="2.6" fill="var(--gold)" />
        <circle cx="30" cy="62" r="2.6" fill="var(--accent)" />
        <circle cx="46" cy="66" r="2.6" fill="var(--accent)" />
        <circle cx="30" cy="28" r="2.2" fill="var(--frost)" />
      </g>
      <polygon
        points="32,1 34.4,7.3 41,7.5 35.8,11.6 37.6,18 32,14.3 26.4,18 28.2,11.6 23,7.5 29.6,7.3"
        fill="var(--gold)"
      />
    </svg>
  );
}

export function Gift({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden>
      <rect x="8" y="28" width="48" height="32" rx="3" fill="#c8202f" />
      <rect x="5" y="20" width="54" height="11" rx="2.5" fill="var(--accent)" />
      <rect x="28" y="20" width="8" height="40" fill="var(--gold)" />
      <rect x="8" y="31" width="48" height="3" fill="#0003" />
      <path d="M32 20c-4-10-16-12-16-5 0 4 8 5 16 5zM32 20c4-10 16-12 16-5 0 4-8 5-16 5z" fill="var(--gold)" />
      <circle cx="32" cy="19" r="3.5" fill="#e0a92f" />
    </svg>
  );
}

// A bauble with an optional string above it, for hanging decorations.
export function Ornament({ className, style, string = false }: SvgProps & { string?: boolean }) {
  return (
    <svg viewBox={string ? "0 0 40 92" : "0 40 40 52"} className={className} style={style} aria-hidden>
      {string && <line x1="20" y1="0" x2="20" y2="44" stroke="var(--muted)" strokeWidth="1" />}
      <rect x="15" y="42" width="10" height="7" rx="1.5" fill="var(--gold)" />
      <circle cx="20" cy="68" r="19" fill="var(--accent)" />
      <path d="M2.5 63q17.5 7 35 0M2.5 73q17.5 7 35 0" stroke="#fff6" strokeWidth="2.4" fill="none" />
      <ellipse cx="13" cy="60" rx="4" ry="6" fill="#fff" opacity=".35" transform="rotate(30 13 60)" />
    </svg>
  );
}

export function Snowman({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 56 92" className={className} style={style} aria-hidden>
      <circle cx="28" cy="70" r="20" fill="var(--snow)" />
      <circle cx="28" cy="38" r="14" fill="var(--snow)" />
      <rect x="15" y="4" width="26" height="14" rx="2" fill="#1a1d24" />
      <rect x="10" y="17" width="36" height="4" rx="2" fill="#1a1d24" />
      <rect x="15" y="13" width="26" height="3.5" fill="var(--accent)" />
      <circle cx="23" cy="35" r="1.8" fill="#1a1d24" />
      <circle cx="33" cy="35" r="1.8" fill="#1a1d24" />
      <path d="M28 39l9 2-9 2z" fill="#f08a24" />
      <path d="M17 50q11 5 22 0l-1 4q-10 4-20 0z" fill="var(--accent)" />
      <path d="M33 52l3 12 4-1-3-11z" fill="var(--accent)" />
      <circle cx="28" cy="64" r="1.8" fill="#1a1d24" />
      <circle cx="28" cy="72" r="1.8" fill="#1a1d24" />
    </svg>
  );
}

export function Snowflake({ className, style }: SvgProps) {
  return (
    <svg viewBox="-12 -12 24 24" className={className} style={style} aria-hidden>
      <g stroke="var(--snow)" strokeWidth="1.4" strokeLinecap="round">
        {[0, 60, 120].map((r) => (
          <g key={r} transform={`rotate(${r})`}>
            <line y1="-10" y2="10" />
            <path d="M-3 -7.5L0 -5L3 -7.5M-3 7.5L0 5L3 7.5" fill="none" />
          </g>
        ))}
      </g>
    </svg>
  );
}

const BULB_COLORS = ["var(--accent)", "var(--gold)", "#3ccf6e", "var(--frost)"];

// A strand of twinkling lights hung along the bottom edge of the header.
export function Lights({ className }: { className?: string }) {
  const bulbs = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className={`pointer-events-none flex justify-between overflow-hidden px-2 ${className ?? ""}`} aria-hidden>
      {bulbs.map((i) => (
        <span
          key={i}
          className={`anim-twinkle block h-3 w-2 rounded-b-full ${i % 3 ? "" : "hidden sm:block"}`}
          style={{
            background: BULB_COLORS[i % BULB_COLORS.length],
            boxShadow: `0 2px 8px ${BULB_COLORS[i % BULB_COLORS.length]}`,
            animationDelay: `${(i % 5) * -0.45}s`,
            translate: `0 ${i % 2 ? 3 : 0}px`,
          }}
        />
      ))}
    </div>
  );
}

// Fixed positions so server and client render the same flakes.
const FLAKES = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 2 + ((i * 7) % 4),
  duration: 11 + ((i * 13) % 14),
  delay: -((i * 17) % 25),
  opacity: 0.35 + ((i * 11) % 5) / 10,
}));

// Fixed layer behind the page: falling snow, a few drifting snowflakes and
// a snowy hill with trees at the bottom.
export function FestiveBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {FLAKES.map((f, i) => (
        <span
          key={i}
          className="anim-snow absolute -top-4 rounded-full bg-snow"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            opacity: f.opacity,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
          }}
        />
      ))}
      {[
        { left: "14%", duration: "26s", delay: "-4s" },
        { left: "58%", duration: "32s", delay: "-19s" },
        { left: "86%", duration: "28s", delay: "-11s" },
      ].map((f, i) => (
        <div
          key={i}
          className="anim-snow absolute -top-8"
          style={{ left: f.left, animationDuration: f.duration, animationDelay: f.delay }}
        >
          <Snowflake className="anim-spin size-5 opacity-60" />
        </div>
      ))}

      <svg
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-12 w-full sm:h-16"
      >
        <path d="M0 40Q200 0 420 34T820 26T1200 30V80H0z" fill="var(--snow)" opacity=".1" />
        <path d="M0 58Q260 30 560 56T1200 50V80H0z" fill="var(--snow)" opacity=".16" />
      </svg>
      <Tree className="absolute bottom-1 -left-1 w-16 opacity-90 sm:w-24" />
      <Tree className="absolute bottom-1 left-14 hidden w-12 opacity-70 sm:block" />
      <Tree className="absolute right-3 bottom-1 hidden w-14 opacity-80 sm:block" />
    </div>
  );
}
