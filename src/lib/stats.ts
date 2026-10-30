import "server-only";
import { getDb, type Sql } from "./db";
import { addDays, todayISO, weekStartOf } from "./dates";
import {
  GAME_START,
  HELD_DAY_POINTS,
  HOLIDAYS,
  MIN_DAYS_HOLIDAY_WEEK,
  MIN_DAYS_NEW_SCORING_WEEK,
  MIN_DAYS_TO_QUALIFY,
  NEW_SCORING_START,
} from "./config";
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

// Which days of a week count, and what it takes to win, per the tracker's
// SETTINGS: history weeks pay nothing, holiday weeks need fewer days, and the
// week new scoring started only counts from that day.
export function weekRules(weekStart: string) {
  const friday = addDays(weekStart, 4);
  const startsMidWeek = NEW_SCORING_START > weekStart && NEW_SCORING_START <= friday;
  const holiday = HOLIDAYS.some((h) => h >= weekStart && h <= friday);
  return {
    from: startsMidWeek ? NEW_SCORING_START : weekStart,
    to: friday,
    startsMidWeek,
    holiday,
    minDays: startsMidWeek
      ? MIN_DAYS_NEW_SCORING_WEEK
      : holiday
        ? MIN_DAYS_HOLIDAY_WEEK
        : MIN_DAYS_TO_QUALIFY,
    paysPrizes: weekStart >= GAME_START,
  };
}

export type WeekRules = ReturnType<typeof weekRules>;

type DayRow = {
  user_id: number;
  work_date: string;
  logged: number;
  completed: number;
  points: number;
  weight: number;
  held: boolean;
};

type RepRow = { id: number; display_name: string; lane: string | null };

// Per-person, per-day totals combining tickets with the historical days
// carried over from the spreadsheet. A day with tickets counts as a full day
// worked unless history says otherwise (half-day PTO, training). Imported
// requests that don't score are records only: they never add a day worked,
// so importing old data can't change past scores.
function dailyTotals(sql: Sql, from: string, to: string, userId?: number) {
  const byUser = () => (userId !== undefined ? sql`and user_id = ${userId}` : sql``);
  return sql<DayRow[]>`
    with t as (
      select user_id, work_date,
             count(*)::int as logged,
             (count(*) filter (where points > 0))::int as completed,
             sum(points)::float8 as points
        from ioms.tickets
       where user_id is not null and work_date between ${from}::date and ${to}::date
             and (origin = 'app' or points > 0)
             ${byUser()}
       group by user_id, work_date
    ), h as (
      select user_id, work_date, completed, points::float8 as points,
             day_weight::float8 as weight, held
        from ioms.history_days
       where work_date between ${from}::date and ${to}::date
             ${byUser()}
    )
    select coalesce(t.user_id, h.user_id) as user_id,
           coalesce(t.work_date, h.work_date) as work_date,
           coalesce(t.logged, 0) + coalesce(h.completed, 0) as logged,
           coalesce(t.completed, 0) + coalesce(h.completed, 0) as completed,
           coalesce(t.points, 0) + coalesce(h.points, 0) as points,
           coalesce(h.weight, 1) as weight,
           cd.user_id is null
             and (coalesce(h.held, false) or coalesce(t.points, 0) + coalesce(h.points, 0) >= ${HELD_DAY_POINTS}
                  and t.user_id is not null) as held
      from t
      full join h on h.user_id = t.user_id and h.work_date = t.work_date
      left join ioms.confirmed_days cd
        on cd.user_id = coalesce(t.user_id, h.user_id)
       and cd.work_date = coalesce(t.work_date, h.work_date)`;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function buildStanding(user: RepRow, days: DayRow[], rules: WeekRules): Standing {
  const points = round1(days.reduce((s, d) => s + d.points, 0));
  const daysWorked = days.reduce((s, d) => s + d.weight, 0);
  const ptsPerDay = daysWorked ? round1(points / daysWorked) : 0;
  const heldDays = days.filter((d) => d.held).map((d) => d.work_date);
  const qualified = daysWorked >= rules.minDays;
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
    prize: rules.paysPrizes && qualified && tier && heldDays.length === 0 ? tier.prize : 0,
    nextTier: nextTierFor(ptsPerDay),
  };
}

// Reps always appear. Managers appear only in weeks they have work logged,
// so admins who don't work tickets don't sit at the bottom with zeros.
export async function weeklyStandings(weekStart: string): Promise<Standing[]> {
  const sql = await getDb();
  const rules = weekRules(weekStart);
  const [people, rows] = await Promise.all([
    sql<RepRow[]>`
      select u.id, u.display_name, u.lane from ioms.users u
       where u.active
         and (u.role = 'rep'
              or exists (select 1 from ioms.tickets t
                          where t.user_id = u.id
                            and t.work_date between ${rules.from}::date and ${rules.to}::date)
              or exists (select 1 from ioms.history_days h
                          where h.user_id = u.id
                            and h.work_date between ${rules.from}::date and ${rules.to}::date))
       order by u.display_name`,
    dailyTotals(sql, rules.from, rules.to),
  ]);
  return people
    .map((u) => buildStanding(u, rows.filter((r) => r.user_id === u.id), rules))
    .sort(
      (a, b) =>
        Number(b.daysWorked > 0) - Number(a.daysWorked > 0) ||
        b.ptsPerDay - a.ptsPerDay ||
        b.completed - a.completed,
    );
}

export async function myWeek(user: RepRow) {
  const sql = await getDb();
  const today = todayISO();
  const rules = weekRules(weekStartOf(today));
  const rows = await dailyTotals(sql, rules.from, rules.to, user.id);
  const todayRow = rows.find((r) => r.work_date === today);
  return {
    week: buildStanding(user, rows, rules),
    today: {
      logged: todayRow?.logged ?? 0,
      completed: todayRow?.completed ?? 0,
      points: round1(todayRow?.points ?? 0),
    },
  };
}

// Days that still need a manager to confirm: big ticket days, plus history
// days that were on hold in the spreadsheet.
export async function heldDaysAwaitingReview() {
  const sql = await getDb();
  return sql<
    { user_id: number; display_name: string; work_date: string; points: number; logged: number }[]
  >`
    with d as (
      select user_id, work_date, sum(points)::float8 as points, count(*)::int as logged
        from ioms.tickets
       where user_id is not null
       group by user_id, work_date
      having sum(points) >= ${HELD_DAY_POINTS}
      union all
      select user_id, work_date, points::float8, completed
        from ioms.history_days
       where held
    )
    select d.user_id, u.display_name, d.work_date, d.points, d.logged
      from d
      join ioms.users u on u.id = d.user_id
      left join ioms.confirmed_days cd on cd.user_id = d.user_id and cd.work_date = d.work_date
     where cd.user_id is null
     order by d.work_date desc`;
}
