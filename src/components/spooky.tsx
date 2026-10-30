// Hand-drawn Halloween artwork and the animated backdrop behind every page.
// Decorations are aria-hidden and ignore the mouse.

import type { CSSProperties } from "react";

type SvgProps = { className?: string; style?: CSSProperties };

export function Ghost({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 64 72" className={className} style={style} aria-hidden>
      <path
        d="M32 4C17 4 6 15 6 31v35l6.5-5 6.5 5 6.5-5 6.5 5 6.5-5 6.5 5 6.5-5 6.5 5V31C58 15 47 4 32 4z"
        fill="var(--ghost)"
      />
      <ellipse cx="24" cy="29" rx="3.6" ry="5" fill="#1a1424" />
      <ellipse cx="40" cy="29" rx="3.6" ry="5" fill="#1a1424" />
      <ellipse cx="32" cy="42" rx="4" ry="5.5" fill="#1a1424" />
      <ellipse cx="17" cy="37" rx="3" ry="1.8" fill="#ff9fc4" opacity=".55" />
      <ellipse cx="47" cy="37" rx="3" ry="1.8" fill="#ff9fc4" opacity=".55" />
    </svg>
  );
}

export function Pumpkin({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 64 60" className={className} style={style} aria-hidden>
      <path d="M30 15c0-6 3-10 8-11l1.5 3.5c-3.5 1-5 4-5 8z" fill="#5b8a2c" />
      <ellipse cx="20" cy="36" rx="15" ry="19" fill="#d9590c" />
      <ellipse cx="44" cy="36" rx="15" ry="19" fill="#d9590c" />
      <ellipse cx="32" cy="36" rx="15" ry="21" fill="#ff7a1a" />
      <g className="anim-flicker" fill="#ffd54d">
        <polygon points="18,32 24,22 29,33" />
        <polygon points="35,33 40,22 46,32" />
        <polygon points="17,40 21,44 25,41 29,46 33,41 37,46 41,41 45,44 47,40 44,50 20,50" />
      </g>
    </svg>
  );
}

export function Skeleton({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 40 110" className={className} style={style} aria-hidden>
      <line x1="20" y1="0" x2="20" y2="8" stroke="var(--muted)" strokeWidth="1" />
      <g stroke="var(--bone)" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <line x1="20" y1="30" x2="20" y2="62" />
        <path d="M12 36q8 3 16 0M11 42q9 3 18 0M12 48q8 3 16 0" />
        <path d="M14 33l-7 14-2 12M26 33l7 14 2 12" />
        <path d="M13 62q7 6 14 0" />
        <path d="M15 64l-3 20 1 16M25 64l3 20-1 16" />
      </g>
      <circle cx="20" cy="17" r="10" fill="var(--bone)" />
      <rect x="15" y="24" width="10" height="6" rx="2" fill="var(--bone)" />
      <circle cx="16" cy="16" r="2.8" fill="#1a1424" />
      <circle cx="24" cy="16" r="2.8" fill="#1a1424" />
      <path d="M19 20.5l1-2 1 2z" fill="#1a1424" />
      <path d="M17 26.5v2.5M20 26.5v2.5M23 26.5v2.5" stroke="#1a1424" strokeWidth="1" />
    </svg>
  );
}

export function Bat({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 60 26" className={className} style={style} aria-hidden>
      <path
        d="M30 9c-1.5-3-3.5-3-5 0-4-4-10-6-16-4 4 1 6.5 4 6.5 7.5-3.5-2-8.5-2-12 .5 5.5 1 8.5 4.5 9.5 8.5 3.5-3 8.5-4 12.5-2 1.5 2.5 3 3.5 4.5 3.5s3-1 4.5-3.5c4-2 9-1 12.5 2 1-4 4-7.5 9.5-8.5-3.5-2.5-8.5-2.5-12-.5 0-3.5 2.5-6.5 6.5-7.5-6-2-12 0-16 4-1.5-3-3.5-3-5 0z"
        fill="#0b0810"
        stroke="var(--border)"
        strokeWidth=".8"
      />
      <circle cx="28" cy="12" r=".9" fill="#ffd54d" />
      <circle cx="32" cy="12" r=".9" fill="#ffd54d" />
    </svg>
  );
}

export function Moon({ className, style }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <circle cx="50" cy="50" r="40" fill="#f6e7b5" />
      <circle cx="36" cy="38" r="7" fill="#e6d29a" />
      <circle cx="60" cy="60" r="10" fill="#e6d29a" />
      <circle cx="62" cy="32" r="4" fill="#e6d29a" />
    </svg>
  );
}

// Fixed layer behind the page: moon, drifting ghosts, bats, corner pumpkins.
export function SpookyBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <Moon className="anim-moon absolute top-20 right-[6%] size-20 opacity-50 sm:size-28" />

      {[
        { top: "18%", size: "size-16", duration: "46s", delay: "-8s", opacity: 0.16 },
        { top: "52%", size: "size-24", duration: "68s", delay: "-40s", opacity: 0.11 },
        { top: "78%", size: "size-12", duration: "38s", delay: "-25s", opacity: 0.18 },
      ].map((g, i) => (
        <div
          key={i}
          className="anim-drift absolute left-0"
          style={{ top: g.top, animationDuration: g.duration, animationDelay: g.delay, opacity: g.opacity }}
        >
          <Ghost className={`anim-bob ${g.size}`} style={{ animationDelay: `${i * -1.3}s` }} />
        </div>
      ))}

      {[
        { top: "12%", duration: "22s", delay: "-3s" },
        { top: "30%", duration: "31s", delay: "-17s" },
      ].map((b, i) => (
        <div
          key={i}
          className="anim-bat-fly absolute left-0"
          style={{ top: b.top, animationDuration: b.duration, animationDelay: b.delay }}
        >
          <Bat className="anim-flap w-10" />
        </div>
      ))}

      <Pumpkin className="absolute -bottom-2 -left-2 w-20 opacity-90 sm:w-28" />
      <Pumpkin className="absolute right-3 -bottom-2 hidden w-16 opacity-80 sm:block" />
    </div>
  );
}
