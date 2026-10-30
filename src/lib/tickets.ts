import "server-only";
import { getDb } from "./db";
import { isValidISODate, todayISO, weekStartOf } from "./dates";

export type TicketFilters = {
  from: string;
  to: string;
  rep: number | null;
  status: "all" | "scored" | "unscored";
  q: string;
};

export type TicketRow = {
  id: number;
  work_date: string;
  created_at: Date;
  display_name: string;
  order_id: string;
  requested_by: string;
  source: string;
  request_type: string;
  patient_contacted: boolean;
  voicemail: boolean;
  text_sent: boolean;
  outcome: string;
  notes: string | null;
  points: number;
};

export const TICKET_LIMIT = 1000;

// Read filters from the URL, defaulting to this week so far.
export function parseTicketFilters(params: Record<string, string | string[] | undefined>): TicketFilters {
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const today = todayISO();
  const from = isValidISODate(get("from")) ? get("from")! : weekStartOf(today);
  const to = isValidISODate(get("to")) ? get("to")! : today;
  const rep = Number(get("rep"));
  const status = get("status");
  return {
    from: from <= to ? from : to,
    to,
    rep: Number.isInteger(rep) && rep > 0 ? rep : null,
    status: status === "scored" || status === "unscored" ? status : "all",
    q: (get("q") ?? "").trim().slice(0, 40),
  };
}

export async function findTickets(f: TicketFilters, limit = TICKET_LIMIT) {
  const sql = await getDb();
  return sql<TicketRow[]>`
    select t.id, t.work_date, t.created_at, u.display_name, t.order_id, t.requested_by,
           t.source, t.request_type, t.patient_contacted, t.voicemail, t.text_sent,
           t.outcome, t.notes, t.points
      from ioms.tickets t
      join ioms.users u on u.id = t.user_id
     where t.work_date between ${f.from}::date and ${f.to}::date
       ${f.rep ? sql`and t.user_id = ${f.rep}` : sql``}
       ${f.status === "scored" ? sql`and t.points > 0` : sql``}
       ${f.status === "unscored" ? sql`and t.points = 0` : sql``}
       ${f.q ? sql`and t.order_id ilike ${"%" + f.q.replace(/[\\%_]/g, "\\$&") + "%"}` : sql``}
     order by t.created_at desc
     limit ${limit}`;
}

export function contactLabel(t: Pick<TicketRow, "patient_contacted" | "voicemail" | "text_sent">) {
  return [t.patient_contacted && "Spoke", t.voicemail && "VM", t.text_sent && "Text"]
    .filter(Boolean)
    .join(" + ");
}
