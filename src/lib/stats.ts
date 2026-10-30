import "server-only";
import { db } from "./db";
import { addDays, todayISO, weekStartOf } from "./dates";
import { HELD_DAY_POINTS, MIN_DAYS_TO_QUALIFY } from "./config";
import { nextTierFor, tierFor } from "./scoring";

export type Standing = {
  userId: number;
  name: string;
  lane: string | null;
  daysWorked: number;
  logged: number;
  completed: number;
  points: number;
  ptsPerDay: number;
  qualified: boolean;
  heldDays: string[];
  tier: ReturnType<typeof tierFor>;
  prize: number;
  nextTier: ReturnType<typeof nextTierFor>;
};

type DayRow = {
  user_id: number;
  work_date: string;
  logged: number;
  completed: number;
  points: number;
  confirmed: number;
};

// Per-rep, per-day totals for Monday–Friday of the given week. A day counts as
// "worked" when the rep logged at least one request that day.
function dailyTotals(weekStart: string, userId?: number) {
  const friday = addDays(weekStart, 4);
  return db
    .prepare(
      `SELECT t.user_id, t.work_date,
              COUNT(*) AS logged,
              SUM(t.points > 0) AS completed,
              SUM(t.points) AS points,
              (cd.user_id IS NOT NULL) AS confirmed
         FROM tickets t
         LEFT JOIN confirmed_days cd
           ON cd.user_id = t.user_id AND cd.work_date = t.work_date
        WHERE t.work_date BETWEEN ? AND ?
          ${userId !== undefined ? "AND t.user_id = ?" : ""}
        GROUP BY t.user_id, t.work_date`,
    )
    .all(...[weekStart, friday, ...(userId !== undefined ? [userId] : [])]) as DayRow[];
}

function buildStanding(
  user: { id: number; display_name: string; lane: string | null },
  days: DayRow[],
): Standing {
  const points = days.reduce((s, d) => s + d.points, 0);
  const daysWorked = days.length;
  const ptsPerDay = daysWorked ? Math.round((points / daysWorked) * 10) / 10 : 0;
  const heldDays = days
    .filter((d) => d.points >= HELD_DAY_POINTS && !d.confirmed)
    .map((d) => d.work_date);
  const qualified = daysWorked >= MIN_DAYS_TO_QUALIFY;
  const tier = tierFor(ptsPerDay);
  return {
    userId: user.id,
    name: user.display_name,
    lane: user.lane,
    daysWorked,
    logged: days.reduce((s, d) => s + d.logged, 0),
    completed: days.reduce((s, d) => s + d.completed, 0),
    points,
    ptsPerDay,
    qualified,
    heldDays,
    tier,
    prize: qualified && tier && heldDays.length === 0 ? tier.prize : 0,
    nextTier: nextTierFor(ptsPerDay),
  };
}

export function weeklyStandings(weekStart: string): Standing[] {
  const reps = db
    .prepare(
      "SELECT id, display_name, lane FROM users WHERE role = 'rep' AND active = 1 ORDER BY display_name",
    )
    .all() as { id: number; display_name: string; lane: string | null }[];
  const rows = dailyTotals(weekStart);
  return reps
    .map((u) => buildStanding(u, rows.filter((r) => r.user_id === u.id)))
    .sort((a, b) => b.ptsPerDay - a.ptsPerDay || b.completed - a.completed);
}

export function myWeek(user: { id: number; display_name: string; lane: string | null }) {
  const today = todayISO();
  const rows = dailyTotals(weekStartOf(today), user.id);
  const todayRow = rows.find((r) => r.work_date === today);
  return {
    week: buildStanding(user, rows),
    today: {
      logged: todayRow?.logged ?? 0,
      completed: todayRow?.completed ?? 0,
      points: todayRow?.points ?? 0,
    },
  };
}

// Days at or above the held threshold that still need a manager to confirm.
export function heldDaysAwaitingReview() {
  return db
    .prepare(
      `SELECT t.user_id, u.display_name, t.work_date, SUM(t.points) AS points, COUNT(*) AS logged
         FROM tickets t
         JOIN users u ON u.id = t.user_id
         LEFT JOIN confirmed_days cd ON cd.user_id = t.user_id AND cd.work_date = t.work_date
        WHERE cd.user_id IS NULL
        GROUP BY t.user_id, t.work_date
       HAVING SUM(t.points) >= ?
        ORDER BY t.work_date DESC`,
    )
    .all(HELD_DAY_POINTS) as {
    user_id: number;
    display_name: string;
    work_date: string;
    points: number;
    logged: number;
  }[];
}
