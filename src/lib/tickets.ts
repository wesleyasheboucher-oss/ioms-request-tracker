import "server-only";
import { getDb } from "./db";
import { isValidISODate, todayISO, weekStartOf } from "./dates";

export type TicketFilters = {
  from: string;
  to: string;
  // A user id, "unassigned" for imported rows with no rep, or null for everyone.
  rep: number | "unassigned" | null;
  status: "all" | "scored" | "unscored";
  origin: "all" | "app" | "import";
  q: string;
};

export type TicketRow = {
  id: number;
  work_date: string;
  created_at: Date;
  display_name: string | null;
  origin: "app" | "import";
  import_status: string | null;
  order_id: string | null;
  requested_by: string | null;
  source: string | null;
  request_type: string | null;
  patient_contacted: boolean;
  voicemail: boolean;
  text_sent: boolean;
  outcome: string | null;
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
  const origin = get("origin");
  return {
    from: from <= to ? from : to,
    to,
    rep: get("rep") === "unassigned" ? "unassigned" : Number.isInteger(rep) && rep > 0 ? rep : null,
    status: status === "scored" || status === "unscored" ? status : "all",
    origin: origin === "app" || origin === "import" ? origin : "all",
    q: (get("q") ?? "").trim().slice(0, 40),
  };
}

export async function findTickets(f: TicketFilters, limit = TICKET_LIMIT) {
  const sql = await getDb();
  return sql<TicketRow[]>`
    select t.id, t.work_date, t.created_at, u.display_name, t.origin, t.import_status,
           t.order_id, t.requested_by,
           t.source, t.request_type, t.patient_contacted, t.voicemail, t.text_sent,
           t.outcome, t.notes, t.points
      from ioms.tickets t
      left join ioms.users u on u.id = t.user_id
     where t.work_date between ${f.from}::date and ${f.to}::date
       ${f.rep === "unassigned" ? sql`and t.user_id is null` : f.rep ? sql`and t.user_id = ${f.rep}` : sql``}
       ${f.origin !== "all" ? sql`and t.origin = ${f.origin}` : sql``}
       ${f.status === "scored" ? sql`and t.points > 0` : sql``}
       ${f.status === "unscored" ? sql`and t.points = 0` : sql``}
       ${f.q ? sql`and t.order_id ilike ${"%" + f.q.replace(/[\\%_]/g, "\\$&") + "%"}` : sql``}
     order by t.work_date desc, t.created_at desc
     limit ${limit}`;
}

export function contactLabel(t: Pick<TicketRow, "patient_contacted" | "voicemail" | "text_sent">) {
  return [t.patient_contacted && "Spoke", t.voicemail && "VM", t.text_sent && "Text"]
    .filter(Boolean)
    .join(" + ");
}
