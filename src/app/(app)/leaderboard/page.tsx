import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { addDays, formatDay, isValidISODate, todayISO, weekStartOf } from "@/lib/dates";
import { weekRules, weeklyStandings, type Standing } from "@/lib/stats";
import {
  MIN_DAYS_TO_QUALIFY,
  NEW_SCORING_START,
  POINTS_PER_COMPLETED_REQUEST,
  TIERS,
} from "@/lib/config";
import { TierBadge, TierMeter } from "@/components/tier-meter";
import { Ornament } from "@/components/festive";
import { AutoRefresh } from "./auto-refresh";
import { LeaderTree } from "./leader-tree";

export default async function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  const user = await requireUser();
  const { week: weekParam } = await searchParams;
  const thisWeek = weekStartOf(todayISO());
  const week =
    typeof weekParam === "string" && isValidISODate(weekParam) ? weekStartOf(weekParam) : thisWeek;
  const isCurrent = week === thisWeek;

  const standings = await weeklyStandings(week);
  const rules = weekRules(week);
  const totals = {
    completed: standings.reduce((s, r) => s + r.completed, 0),
    points: Math.round(standings.reduce((s, r) => s + r.points, 0) * 10) / 10,
    onTier: standings.filter((r) => r.tier).length,
    prizes: standings.reduce((s, r) => s + r.prize, 0),
  };

  return (
    <div className="space-y-6">
      {isCurrent && <AutoRefresh seconds={60} />}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="relative pr-14">
          <Ornament string className="anim-swing absolute -top-6 right-1 h-24" />
          <p className="text-xs font-semibold tracking-widest text-accent uppercase">The Scream Team</p>
          <h1 className="font-festive text-5xl tracking-wide">Leaderboard</h1>
          <p className="text-sm text-muted">
            Week of {formatDay(week)} – {formatDay(addDays(week, 4), { year: "numeric" })}
            {isCurrent && " · updates every minute"}
          </p>
          <WeekNote rules={rules} />
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/leaderboard?week=${addDays(week, -7)}`} className="btn-ghost px-3">
            ← Prev
          </Link>
          {!isCurrent && (
            <Link href="/leaderboard" className="btn-ghost">
              This week
            </Link>
          )}
          {week < thisWeek && (
            <Link href={`/leaderboard?week=${addDays(week, 7)}`} className="btn-ghost px-3">
              Next →
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Requests completed" value={totals.completed.toLocaleString()} />
        <Tile label="Team points" value={totals.points.toLocaleString()} />
        <Tile label="Reps on a tier" value={`${totals.onTier} / ${standings.length}`} />
        <Tile label="Prizes earned" value={`$${totals.prizes}`} accent />
      </div>

      <LeaderTree standings={standings} meId={user.id} />

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted uppercase">
            <tr>
              <th className="w-12 px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Rep</th>
              <th className="px-4 py-3 text-right font-medium">Days</th>
              <th className="px-4 py-3 text-right font-medium">Completed</th>
              <th className="px-4 py-3 text-right font-medium">Points</th>
              <th className="px-4 py-3 text-right font-medium">Pts/day</th>
              <th className="w-56 px-4 py-3 font-medium">Progress</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Prize</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {standings.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-muted">
                  No reps yet. A manager can add them on the Admin page.
                </td>
              </tr>
            )}
            {standings.map((s, i) => (
              <tr key={s.userId} className={s.userId === user.id ? "bg-accent-soft/60" : undefined}>
                <td className="px-4 py-3 font-semibold text-muted">{s.daysWorked ? i + 1 : "–"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.name} />
                    <div>
                      <p className="font-medium">
                        {s.name}
                        {s.userId === user.id && <span className="ml-1.5 text-xs text-accent">you</span>}
                      </p>
                      {s.lane && <p className="text-xs text-muted">{s.lane}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{s.daysWorked}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.completed}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.points.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-base font-bold tabular-nums">{s.ptsPerDay}</td>
                <td className="px-4 py-3">
                  <TierMeter ptsPerDay={s.ptsPerDay} />
                  {s.nextTier && s.daysWorked > 0 && (
                    <p className="mt-1 text-xs text-muted">
                      +{Math.ceil(s.nextTier.ptsPerDay - s.ptsPerDay)}/day to {s.nextTier.name}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <TierBadge name={s.tier?.name ?? null} />
                </td>
                <td className="px-4 py-3">
                  <Status s={s} minDays={rules.minDays} />
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {s.prize ? `$${s.prize}` : <span className="text-muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card grid gap-4 p-5 text-sm md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="mb-2 font-semibold">How scoring works</h2>
          <p className="text-muted">
            A request scores <b className="text-ink">{POINTS_PER_COMPLETED_REQUEST} pts</b> when you reached the
            patient (or left both a voicemail and a text, or no contact was required) and it ended as{" "}
            <i>Resolved – patient confirmed</i> or <i>Resolved – warm transfer to collector</i>. Score is points ÷
            days worked. You need {MIN_DAYS_TO_QUALIFY}+ days to qualify. Days of 300+ pts are held until a
            manager confirms them. Days before {formatDay(NEW_SCORING_START)} keep the points they earned under the
            old rules.
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-3">
          {TIERS.map((t) => (
            <li key={t.name} className="rounded-xl bg-surface-2 p-3">
              <TierBadge name={t.name} />
              <p className="mt-2 text-lg font-bold">{t.ptsPerDay} pts/day</p>
              <p className="text-xs text-muted">
                ≈{Math.ceil(t.ptsPerDay / POINTS_PER_COMPLETED_REQUEST)} completed/day · ${t.prize}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

function Status({ s, minDays }: { s: Standing; minDays: number }) {
  if (s.daysWorked === 0) return <span className="text-xs text-muted">No days logged</span>;
  if (s.heldDays.length > 0) {
    return (
      <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
        Held for review
      </span>
    );
  }
  if (!s.qualified) {
    const need = minDays - s.daysWorked;
    return (
      <span className="text-xs text-muted">
        {need} more {need === 1 ? "day" : "days"} to qualify
      </span>
    );
  }
  return (
    <span className="rounded-full bg-good-soft px-2 py-0.5 text-xs font-medium text-good">Qualified</span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
    >
      {initials}
    </span>
  );
}

function WeekNote({ rules }: { rules: ReturnType<typeof weekRules> }) {
  const notes = [
    !rules.paysPrizes && "History week: scores show, no prizes.",
    rules.startsMidWeek &&
      `New scoring started ${formatDay(rules.from, { weekday: "short" })}. Only ${formatDay(rules.from)} on counts this week; ${rules.minDays} days to qualify.`,
    rules.holiday && !rules.startsMidWeek && `Holiday week: ${rules.minDays} days to qualify.`,
  ].filter(Boolean);
  if (!notes.length) return null;
  return (
    <p className="mt-2 inline-block rounded-lg bg-warn-soft px-2.5 py-1 text-xs text-warn">{notes.join(" ")}</p>
  );
}
