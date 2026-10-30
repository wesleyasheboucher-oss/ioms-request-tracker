import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb, type Ticket } from "@/lib/db";
import { formatTime, todayISO } from "@/lib/dates";
import { myWeek } from "@/lib/stats";
import { POINTS_PER_COMPLETED_REQUEST } from "@/lib/config";
import { TierBadge, TierMeter } from "@/components/tier-meter";
import { TicketWizard } from "./ticket-wizard";

export default async function LogTicketPage() {
  const user = await requireUser();
  const sql = await getDb();
  const [{ week, today }, recent] = await Promise.all([
    myWeek(user),
    sql<Ticket[]>`
      select * from ioms.tickets
       where user_id = ${user.id} and work_date = ${todayISO()}::date
       order by created_at desc
       limit 6`,
  ]);

  const gap = week.nextTier ? week.nextTier.ptsPerDay - week.ptsPerDay : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="min-w-0">
        <h1 className="mb-1 font-spooky text-4xl tracking-wide">Log a ticket</h1>
        <p className="mb-5 text-sm text-muted">
          Finished a ticket in iOMS? Walk through it here. Takes about 15 seconds.
        </p>
        <TicketWizard />
      </section>

      <aside className="space-y-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-muted">Today</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat value={today.completed} label="Completed" />
            <Stat value={today.logged} label="Logged" />
            <Stat value={today.points} label="Points" accent />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted">This week</h2>
            <TierBadge name={week.tier?.name ?? null} />
          </div>
          <p className="mt-2 text-3xl font-bold">
            {week.ptsPerDay}
            <span className="ml-1 text-base font-medium text-muted">pts/day</span>
          </p>
          <p className="mb-3 text-xs text-muted">
            {week.points} pts over {week.daysWorked} {week.daysWorked === 1 ? "day" : "days"}
          </p>
          <TierMeter ptsPerDay={week.ptsPerDay} labels />
          <p className="text-sm">
            {week.nextTier ? (
              <>
                <span className="font-semibold">{Math.ceil(gap)} pts/day</span>{" "}
                <span className="text-muted">
                  (≈{Math.ceil(gap / POINTS_PER_COMPLETED_REQUEST)} more completed/day) to {week.nextTier.name}
                </span>
              </>
            ) : (
              <span className="font-semibold text-accent">Top tier reached 🎃</span>
            )}
          </p>
        </div>

        <div className="card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted">Logged today</h2>
            <Link href="/my-tickets" className="text-xs text-accent hover:underline">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet… itNothing yet. Your first ticket shows up here.apos;s quiet. Too quiet.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="block font-mono">{t.order_id}</span>
                    <span className="block truncate text-xs text-muted">
                      {formatTime(t.created_at)} · {t.request_type}
                    </span>
                  </span>
                  <span className={`text-sm font-semibold ${t.points ? "text-good" : "text-muted"}`}>
                    {t.points ? `+${t.points}` : "0"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2 py-3">
      <p className={`text-2xl font-bold ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
