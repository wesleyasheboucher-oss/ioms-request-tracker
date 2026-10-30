import { getCurrentUser } from "@/lib/auth";
import { formatTime } from "@/lib/dates";
import { contactLabel, findTickets, parseTicketFilters } from "@/lib/tickets";

// CSV of the tickets matching the same filters as the All tickets page.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "manager") return new Response("Not allowed", { status: 403 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = parseTicketFilters(params);
  const tickets = await findTickets(filters, 100_000);

  const header = [
    "Date", "Time", "Person", "Order ID", "Requested by", "Source", "Request type",
    "Contact", "Outcome", "Points", "Notes",
  ];
  const rows = tickets.map((t) => [
    t.work_date, formatTime(t.created_at), t.display_name, t.order_id, t.requested_by, t.source,
    t.request_type, contactLabel(t), t.outcome, String(t.points), t.notes ?? "",
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ioms-tickets-${filters.from}-to-${filters.to}.csv"`,
    },
  });
}

// Quote cells, and neutralize leading = + - @ so Excel doesn't run them as formulas.
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
