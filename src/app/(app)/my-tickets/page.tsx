import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb, type Ticket } from "@/lib/db";
import { addDays, formatDay, formatTime, isValidISODate, todayISO } from "@/lib/dates";
import { contactLabel } from "@/lib/tickets";
import { deleteTicket } from "../../actions";

export default async function MyTicketsPage({ searchParams }: PageProps<"/my-tickets">) {
  const user = await requireUser();
  const { date: dateParam } = await searchParams;
  const today = todayISO();
  const date = typeof dateParam === "string" && isValidISODate(dateParam) ? dateParam : today;

  const sql = await getDb();
  const tickets = await sql<Ticket[]>`
    select * from ioms.tickets
     where user_id = ${user.id} and work_date = ${date}::date
     order by created_at desc`;
  const points = tickets.reduce((s, t) => s + t.points, 0);
  const completed = tickets.filter((t) => t.points > 0).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-spooky text-4xl tracking-wide">My tickets</h1>
          <p className="text-sm text-muted">
            {tickets.length} logged · {completed} completed · {points} pts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/my-tickets?date=${addDays(date, -1)}`} className="btn-ghost px-3">
            ←
          </Link>
          <span className="min-w-36 text-center text-sm font-medium">
            {date === today ? "Today" : formatDay(date, { weekday: "short", year: "numeric" })}
          </span>
          {date < today ? (
            <Link href={`/my-tickets?date=${addDays(date, 1)}`} className="btn-ghost px-3">
              →
            </Link>
          ) : (
            <span className="btn-ghost px-3 opacity-40">→</span>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Order ID</th>
              <th className="px-4 py-3 font-medium">Requested by</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Request</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Outcome</th>
              <th className="px-4 py-3 text-right font-medium">Pts</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tickets.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  No tickets logged {date === today ? "yet today" : "on this day"}.
                </td>
              </tr>
            )}
            {tickets.map((t) => (
              <tr key={t.id} className="align-top">
                <td className="px-4 py-3 whitespace-nowrap text-muted">{t.origin === "import" ? "Imported" : formatTime(t.created_at)}</td>
                <td className="px-4 py-3 font-mono whitespace-nowrap">{t.order_id ?? "—"}</td>
                <td className="px-4 py-3">{t.requested_by ?? "—"}</td>
                <td className="px-4 py-3">{t.source ?? "—"}</td>
                <td className="px-4 py-3">
                  {t.request_type ?? "—"}
                  {t.notes && <p className="mt-0.5 max-w-xs text-xs text-muted">{t.notes}</p>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {contactLabel(t) || <span className="text-muted">None</span>}
                </td>
                <td className="px-4 py-3">{t.outcome ?? t.import_status ?? "—"}</td>
                <td className={`px-4 py-3 text-right font-semibold ${t.points ? "text-good" : "text-muted"}`}>
                  {t.points}
                </td>
                <td className="px-4 py-3 text-right">
                  {((t.work_date === today && t.origin === "app") || user.role === "manager") && (
                    <form action={deleteTicket}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-xs text-muted hover:text-bad" title="Remove this entry">
                        Remove
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Logged something by mistake? You can remove your own entries on the same day. Ask a manager for older ones.
      </p>
    </div>
  );
}
