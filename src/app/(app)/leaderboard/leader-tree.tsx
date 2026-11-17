import type { Standing } from "@/lib/stats";
import { Gift, Star } from "@/components/festive";

// The week's standings drawn as a Christmas tree: whoever is in 1st sits on
// the star, and everyone else hangs below in rank order. Rows widen as the
// tree does (1 on the star, then 2, 3, 4…), each read left to right.

// Tree geometry, in viewBox units (300 × 390).
const W = 300;
const H = 390;
const CX = W / 2;
const APEX = 56; // top of the branches
const BASE = 350; // bottom of the branches
const BASE_HALF = 132; // half-width at the base
const STAR_Y = 34;
const BOTTOM_Y = BASE - 30; // lowest row of ornaments
const MAX_ROW_STEP = 90;

function halfWidthAt(y: number) {
  return Math.max(0, ((y - APEX) / (BASE - APEX)) * BASE_HALF);
}

const MIN_SPACING = 40;
const COLORS = ["var(--accent)", "var(--frost)", "var(--gold)", "#3ccf6e", "#c58bff"];
const RANK_RING = ["ring-gold", "ring-silver", "ring-bronze"];

type Placed = { s: Standing; rank: number; x: number; y: number };

function place(reps: Standing[]): Placed[] {
  const rows: Standing[][] = [];
  for (let i = 0; i < reps.length; i += rows.length) rows.push(reps.slice(i, i + rows.length + 1));
  const step = rows.length > 1 ? Math.min(MAX_ROW_STEP, (BOTTOM_Y - STAR_Y) / (rows.length - 1)) : 0;
  let rank = 0;
  return rows.flatMap((row, r) => {
    const y = STAR_Y + r * step;
    const spacing = Math.max(MIN_SPACING, Math.min(70, (halfWidthAt(y) * 2 - 24) / row.length));
    return row.map((s, i) => ({
      s,
      rank: rank++,
      y,
      x: Math.min(W - 18, Math.max(18, CX + (i - (row.length - 1) / 2) * spacing)),
    }));
  });
}

export function LeaderTree({ standings, meId }: { standings: Standing[]; meId: number }) {
  const onTree = standings.filter((s) => s.daysWorked > 0);
  const underTree = standings.filter((s) => s.daysWorked === 0);
  const placed = place(onTree);

  return (
    <div className="card overflow-hidden px-3 pt-4 pb-5 sm:px-6">
      <div className="relative mx-auto w-full max-w-xl" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <rect x={CX - 14} y={BASE - 4} width="28" height="30" rx="3" fill="#6b4122" />
          <TreeTier top={168} bottom={BASE} half={BASE_HALF} fill="#14603a" />
          <TreeTier top={104} bottom={250} half={98} fill="#18703f" />
          <TreeTier top={APEX} bottom={150} half={62} fill="#1d8048" />

          {[150, 248].map((y) => {
            const hw = halfWidthAt(y) + 6;
            return (
              <path
                key={y}
                d={`M${CX - hw} ${y - 8} Q${CX} ${y + 10} ${CX + hw} ${y - 8}`}
                stroke="var(--gold)"
                strokeWidth="2"
                strokeDasharray="1 4"
                strokeLinecap="round"
                fill="none"
                opacity=".7"
              />
            );
          })}

          {LIGHTS.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2"
              fill={COLORS[i % COLORS.length]}
              className="anim-twinkle"
              style={{ animationDelay: `${(i % 6) * -0.4}s` }}
              opacity=".8"
            />
          ))}
        </svg>

        <Star
          className="anim-glow absolute w-[19%] -translate-x-1/2 -translate-y-[55%]"
          style={{ left: "50%", top: `${(STAR_Y / H) * 100}%` }}
        />

        {placed.map(({ s, rank, x, y }) => (
          <div
            key={s.userId}
            className="absolute flex -translate-x-1/2 -translate-y-[22px] flex-col items-center"
            style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, zIndex: 100 - rank }}
            title={`${s.name}: ${s.ptsPerDay} pts/day · ${s.completed} completed`}
          >
            <span className="h-1.5 w-3 rounded-t-sm bg-gold" />
            <span
              className={`relative grid size-8 place-items-center rounded-full text-[11px] font-bold text-white shadow-[0_3px_10px_#0007] sm:size-11 sm:text-sm ${
                rank < 3 ? `ring-[3px] ${RANK_RING[rank]}` : ""
              } ${s.userId === meId ? "outline-2 outline-offset-2 outline-snow" : ""}`}
              style={{
                background: `radial-gradient(circle at 32% 28%, #fff8 0 12%, transparent 40%), ${COLORS[s.userId % COLORS.length]}`,
                textShadow: "0 1px 2px #0009",
              }}
            >
              {initials(s.name)}
              {rank < 3 && (
                <span className="absolute -top-1 -right-1.5 grid size-4 place-items-center rounded-full bg-bg text-[9px] text-gold">
                  {rank + 1}
                </span>
              )}
            </span>
            <span className="mt-0.5 rounded bg-bg/75 px-1 text-center text-[9px] leading-tight whitespace-nowrap sm:text-xs">
              {s.name.split(/\s+/)[0]}
              {s.userId === meId && <span className="text-accent"> (you)</span>}
              <b className="block tabular-nums">{s.ptsPerDay}</b>
            </span>
          </div>
        ))}
      </div>

      {onTree.length === 0 && (
        <p className="mt-2 text-center text-sm text-muted">No one is on the tree yet this week.</p>
      )}
      {underTree.length > 0 && (
        <div className="mt-3 flex flex-wrap items-end justify-center gap-x-4 gap-y-2 text-xs text-muted">
          <span>Under the tree (no days yet):</span>
          {underTree.map((s) => (
            <span key={s.userId} className="flex items-center gap-1">
              <Gift className="w-5" />
              {s.name.split(/\s+/)[0]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// One layer of branches with a scalloped bottom edge.
function TreeTier({ top, bottom, half, fill }: { top: number; bottom: number; half: number; fill: string }) {
  const scallops = 6;
  const step = (half * 2) / scallops;
  let d = `M${CX} ${top} L${CX + half} ${bottom}`;
  for (let i = 0; i < scallops; i++) {
    const x = CX + half - step * (i + 1);
    d += ` Q${x + step / 2} ${bottom + 9} ${x} ${bottom}`;
  }
  return <path d={`${d} Z`} fill={fill} />;
}

const LIGHTS: [number, number][] = [
  [140, 92], [166, 120], [128, 136], [178, 170], [116, 196], [150, 210], [196, 226], [104, 238],
  [170, 262], [86, 290], [132, 300], [212, 296], [60, 330], [242, 334], [182, 326], [110, 342],
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
