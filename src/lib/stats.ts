import "server-only";
import { getDb, type Sql } from "./db";
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
  confirmed: boolean;
};

type RepRow = { id: number; display_name: string; lane: string | null };

// Per-rep, per-day totals for Monday–Friday of the given week. A day counts as
// "worked" when the rep logged at least one request that day.
function dailyTotals(sql: Sql, weekStart: string, userId?: number) {
  const friday = addDays(weekStart, 4);
  return sql<DayRow[]>`
    select t.user_id, t.work_date,
           count(*)::int as logged,
           (count(*) filter (where t.points > 0))::int as completed,
           sum(t.points)::int as points,
           bool_or(cd.user_id is not null) as confirmed
      from ioms.tickets t
      left join ioms.confirmed_days cd
        on cd.user_id = t.user_id and cd.work_date = t.work_date
     where t.work_date between ${weekStart}::date and ${friday}::date
       ${userId !== undefined ? sql`and t.user_id = ${userId}` : sql``}
     group by t.user_id, t.work_date`;
}

function buildStanding(user: RepRow, days: DayRow[]): Standing {
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

export async function weeklyStandings(weekStart: string): Promise<Standing[]> {
  const sql = await getDb();
  const [reps, rows] = await Promise.all([
    sql<RepRow[]>`
      select id, display_name, lane from ioms.users
       where role = 'rep' and active
       order by display_name`,
    dailyTotals(sql, weekStart),
  ]);
  return reps
    .map((u) => buildStanding(u, rows.filter((r) => r.user_id === u.id)))
    .sort((a, b) => b.ptsPerDay - a.ptsPerDay || b.completed - a.completed);
}

export async function myWeek(user: RepRow) {
  const sql = await getDb();
  const today = todayISO();
  const rows = await dailyTotals(sql, weekStartOf(today), user.id);
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
export async function heldDaysAwaitingReview() {
  const sql = await getDb();
  return sql<
    { user_id: number; display_name: string; work_date: string; points: number; logged: number }[]
  >`
    select t.user_id, u.display_name, t.work_date,
           sum(t.points)::int as points, count(*)::int as logged
      from ioms.tickets t
      join ioms.users u on u.id = t.user_id
      left join ioms.confirmed_days cd
        on cd.user_id = t.user_id and cd.work_date = t.work_date
     where cd.user_id is null
     group by t.user_id, u.display_name, t.work_date
    having sum(t.points) >= ${HELD_DAY_POINTS}
     order by t.work_date desc`;
}
