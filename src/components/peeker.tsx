"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Grump, Santa } from "./festive";

// Every so often Santa (or, less often, the grump) peeks in from an edge of
// the screen for a few seconds. Rare on purpose: about once every 10 minutes
// on average. Add ?peek=santa or ?peek=grump to the URL to see one right away.

const CHECK_EVERY_MS = 30_000;
const CHANCE_PER_CHECK = 0.05;
const PEEK_MS = 4_500;

const PLACES: { style: CSSProperties; from: string; to: string }[] = [
  { style: { left: "16%", bottom: 0 }, from: "translateY(110%)", to: "translateY(22%)" },
  { style: { right: "8%", bottom: 0 }, from: "translateY(110%)", to: "translateY(22%)" },
  { style: { left: 0, top: "55%" }, from: "translateX(-110%) rotate(25deg)", to: "translateX(-38%) rotate(25deg)" },
  { style: { right: 0, top: "45%" }, from: "translateX(110%) rotate(-25deg)", to: "translateX(38%) rotate(-25deg)" },
];

type Peek = { who: "santa" | "grump"; place: number; id: number };

export function Peeker() {
  const [peek, setPeek] = useState<Peek | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const show = (who: Peek["who"]) =>
      setPeek({ who, place: Math.floor(Math.random() * PLACES.length), id: Date.now() });

    const forced = new URLSearchParams(window.location.search).get("peek");
    const first = forced === "santa" || forced === "grump" ? setTimeout(() => show(forced), 1_000) : undefined;
    const timer = setInterval(() => {
      if (document.hidden || Math.random() >= CHANCE_PER_CHECK) return;
      show(Math.random() < 0.65 ? "santa" : "grump");
    }, CHECK_EVERY_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!peek || !ref.current) return;
    const { from, to } = PLACES[peek.place];
    // Slide in, hold, duck back out.
    const anim = ref.current.animate(
      [
        { transform: from },
        { transform: to, offset: 0.22 },
        { transform: to, offset: 0.72 },
        { transform: from },
      ],
      { duration: PEEK_MS, easing: "ease-in-out", fill: "both" },
    );
    anim.onfinish = () => setPeek(null);
    return () => anim.cancel();
  }, [peek]);

  if (!peek) return null;
  const place = PLACES[peek.place];
  const Who = peek.who === "santa" ? Santa : Grump;
  return (
    <div className="pointer-events-none fixed z-30" style={place.style} aria-hidden>
      <div key={peek.id} ref={ref} style={{ transform: place.from }}>
        <Who className="w-20 drop-shadow-[0_4px_12px_#0008] sm:w-24" />
      </div>
    </div>
  );
}
