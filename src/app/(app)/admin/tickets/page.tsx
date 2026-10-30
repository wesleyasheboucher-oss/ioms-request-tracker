import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDay, formatTime } from "@/lib/dates";
import { contactLabel, findTickets, parseTicketFilters, TICKET_LIMIT } from "@/lib/tickets";
import { deleteTicket } from "../../../actions";

export default async function AllTicketsPage({ searchParams }: PageProps<"/admin/tickets">) {
  await requireManager();
  const filters = parseTicketFilters(await searchParams);
  const sql = await getDb();
  const [tickets, people] = await Promise.all([
    findTickets(filters),
    sql<{ id: number; display_name: string; active: boolean }[]>`
      select id, display_name, active from ioms.users order by active desc, display_name`,
  ]);

  const completed = tickets.filter((t) => t.points > 0).length;
  const points = tickets.reduce((s, t) => s + t.points, 0);
  const exportQuery = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    status: filters.status,
    origin: filters.origin,
    ...(filters.rep ? { rep: String(filters.rep) } : {}),
    ...(filters.q ? { q: filters.q } : {}),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-spooky text-4xl tracking-wide">All tickets</h1>
          <p className="text-sm text-muted">Every ticket logged by the team.</p>
        </div>
        <a href={`/admin/tickets/export?${exportQuery}`} className="btn-ghost">
          Download CSV
        </a>
      </div>

      <form className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto] lg:items-end">
        <div>
          <label className="label" htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={filters.from} className="input py-2" />
        </div>
        <div>
          <label className="label" htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={filters.to} className="input py-2" />
        </div>
        <div>
          <label className="label" htmlFor="rep">Person</label>
          <select id="rep" name="rep" defaultValue={filters.rep ?? ""} className="input py-2">
            <option value="">Everyone</option>
            <option value="unassigned">Unassigned (imported)</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
                {!p.active && " (inactive)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Points</label>
          <select id="status" name="status" defaultValue={filters.status} className="input py-2">
            <option value="all">All tickets</option>
            <option value="scored">Scored (completed)</option>
            <option value="unscored">Not scored</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="origin">Type</label>
          <select id="origin" name="origin" defaultValue={filters.origin} className="input py-2">
            <option value="all">Logged + imported</option>
            <option value="app">Logged here</option>
            <option value="import">Imported iOMS requests</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="q">Order ID</label>
          <input id="q" name="q" defaultValue={filters.q} placeholder="Search" className="input py-2 font-mono" />
        </div>
        <div className="flex gap-2">
          <button className="btn-primary">Filter</button>
          <Link href="/admin/tickets" className="btn-ghost">Reset</Link>
        </div>
      </form>

      <div className="grid grid-cols-3 gap-3">
        <Tile label="Tickets" value={tickets.length} />
        <Tile label="Completed (scored)" value={completed} />
        <Tile label="Points" value={points} accent />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Person</th>
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
                <td colSpan={10} className="px-4 py-10 text-center text-muted">
                  No tickets match these filters.
                </td>
              </tr>
            )}
            {tickets.map((t) => (
              <tr key={t.id} className="align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDay(t.work_date, { weekday: "short" })}
                  {t.origin === "import" ? (
                    <span className="mt-0.5 block w-fit rounded bg-haunt/20 px-1.5 text-[10px] font-semibold text-haunt">
                      Imported
                    </span>
                  ) : (
                    <span className="block text-xs text-muted">{formatTime(t.created_at)}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">
                  {t.display_name ?? <span className="text-muted">Unassigned</span>}
                </td>
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
                  <form action={deleteTicket}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="text-xs text-muted hover:text-bad" title="Remove this entry">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tickets.length === TICKET_LIMIT && (
        <p className="text-xs text-muted">
          Showing the newest {TICKET_LIMIT}. Narrow the dates, or download the CSV for everything.
        </p>
      )}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ? "text-accent" : ""}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
