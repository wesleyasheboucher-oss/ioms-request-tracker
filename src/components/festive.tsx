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

export function Elf({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 40 70" className={className} style={style} aria-hidden>
      <path d="M13 20Q20 -2 34 4l-3 4Q24 8 27 20z" fill="#1f9a4f" />
      <circle cx="33" cy="6" r="3" fill="var(--gold)" />
      <path d="M8 20q12-5 24 0l-1 3H9z" fill="var(--snow)" />
      <path d="M8 26l-5-4 6 8zM32 26l5-4-6 8z" fill="#f2c4a0" />
      <circle cx="20" cy="28" r="9" fill="#f6d0b0" />
      <circle cx="16.5" cy="27" r="1.3" fill="#1a1d24" />
      <circle cx="23.5" cy="27" r="1.3" fill="#1a1d24" />
      <circle cx="14" cy="31" r="1.8" fill="#ff8f8f" opacity=".6" />
      <circle cx="26" cy="31" r="1.8" fill="#ff8f8f" opacity=".6" />
      <path d="M17 31.5q3 2.5 6 0" stroke="#1a1d24" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M11 38h18l3 16H8z" fill="#1f9a4f" />
      <path d="M11 38l9 6 9-6" fill="var(--accent)" />
      <rect x="9" y="48" width="22" height="3" fill="#3a2414" />
      <rect x="18" y="48" width="4" height="3" fill="var(--gold)" />
      <path d="M11 54h6v8h-6zM23 54h6v8h-6z" fill="var(--snow)" />
      <path d="M11 56h6M11 60h6M23 56h6M23 60h6" stroke="var(--accent)" strokeWidth="1.6" />
      <path d="M10 62h8q0 4-5 4-5 0-6-3zM22 62h8q3 1 4-2 1 5-6 5h-6z" fill="#1f7a45" />
    </svg>
  );
}

// Head and shoulders, for peeking around the edge of the screen.
export function Santa({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 80 96" className={className} style={style} aria-hidden>
      <path d="M8 96q2-20 32-20t32 20z" fill="var(--accent)" />
      <path d="M18 34Q30 2 62 8q10 4 8 18L58 22q-6-6-10 0z" fill="var(--accent)" />
      <circle cx="68" cy="28" r="6" fill="var(--snow)" />
      <circle cx="40" cy="44" r="17" fill="#f6d0b0" />
      <path d="M20 46q-2 30 20 34 22-4 20-34-4 14-20 14t-20-14z" fill="var(--snow)" />
      <path d="M28 55q6-6 12-1 6-5 12 1-6 4-12 0-6 4-12 0z" fill="#e8ecef" />
      <circle cx="40" cy="51" r="3.4" fill="#ff9a8a" />
      <circle cx="33" cy="43" r="1.9" fill="#1a1d24" />
      <circle cx="47" cy="43" r="1.9" fill="#1a1d24" />
      <path d="M29 38q4-3 8 0M43 38q4-3 8 0" stroke="var(--snow)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="49" r="3" fill="#ff8f8f" opacity=".55" />
      <circle cx="52" cy="49" r="3" fill="#ff8f8f" opacity=".55" />
      <rect x="16" y="28" width="48" height="10" rx="5" fill="var(--snow)" />
    </svg>
  );
}

// A grumpy green holiday grump, for peeking around the edge of the screen.
export function Grump({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 80 96" className={className} style={style} aria-hidden>
      <path d="M10 96q2-20 30-20t30 20z" fill="#5f8f2a" />
      <path d="M18 36q-4-14 6-20M62 36q4-14-6-20" stroke="#7fb03a" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="40" cy="50" rx="21" ry="24" fill="#8cc63f" />
      <path d="M22 34q6-10 18-8 12-2 18 8-8-4-18-3-10-1-18 3z" fill="#6c9e2c" />
      <path d="M26 41l11 3M54 41l-11 3" stroke="#3d5a17" strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="32" cy="47" rx="4.2" ry="3" fill="#f2e35a" />
      <ellipse cx="48" cy="47" rx="4.2" ry="3" fill="#f2e35a" />
      <circle cx="33" cy="47" r="1.6" fill="#b3261e" />
      <circle cx="49" cy="47" r="1.6" fill="#b3261e" />
      <ellipse cx="40" cy="54" rx="2.6" ry="2" fill="#5e8a26" />
      <path d="M27 60q9 9 26-4" stroke="#3d5a17" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M50 56l3-1 0 3" stroke="#3d5a17" strokeWidth="2" fill="none" strokeLinecap="round" />
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

// Fixed layer behind the page: falling snow, a few drifting snowflakes, and
// a snowy hill with trees and elves at the bottom.
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
      <Elf className="anim-hop absolute bottom-2 left-24 hidden w-6 sm:block sm:left-28" />
      <Elf className="anim-hop absolute right-20 bottom-2 hidden w-6 -scale-x-100 sm:block" style={{ animationDelay: "-0.9s" }} />
      <div className="anim-elf-walk absolute bottom-3 left-0">
        <Elf className="anim-step w-5 sm:w-6" />
      </div>
    </div>
  );
}
