import { TIERS } from "@/lib/config";
import { Ghost, Moon, Pumpkin } from "./spooky";

const SCALE_MAX = Math.max(...TIERS.map((t) => t.ptsPerDay)) * 1.1;

// Pts/day bar with a tick at each tier bar.
export function TierMeter({ ptsPerDay, labels = false }: { ptsPerDay: number; labels?: boolean }) {
  const pct = (v: number) => `${Math.min(100, (v / SCALE_MAX) * 100)}%`;
  const reached = TIERS.some((t) => ptsPerDay >= t.ptsPerDay);
  return (
    <div className={labels ? "pb-5" : undefined}>
      <div className="relative h-2.5 rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${reached ? "pumpkin-bar" : "bg-accent/45"}`}
          style={{ width: pct(ptsPerDay) }}
        />
        {TIERS.map((t) => (
          <div
            key={t.name}
            className="absolute -top-0.5 h-3.5 w-0.5 rounded bg-ink/30"
            style={{ left: pct(t.ptsPerDay) }}
            title={`${t.name}: ${t.ptsPerDay} pts/day`}
          >
            {labels && (
              <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap text-muted">
                {t.ptsPerDay}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const TIER_ICON: Record<string, typeof Ghost> = {
  [TIERS[0].name]: Pumpkin,
  [TIERS[1].name]: Moon,
  [TIERS[2].name]: Ghost,
};

export function TierBadge({ name }: { name: string | null }) {
  if (!name) return <span className="text-xs text-muted">—</span>;
  const Icon = TIER_ICON[name];
  const style =
    name === TIERS[0].name
      ? "bg-accent text-accent-ink"
      : name === TIERS[1].name
        ? "bg-accent-soft text-accent"
        : "bg-surface-2 text-ink";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {Icon && <Icon className="size-3.5" />}
      {name}
    </span>
  );
}
