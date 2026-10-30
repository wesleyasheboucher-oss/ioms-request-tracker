import { requireManager } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { POINTS_PER_COMPLETED_REQUEST } from "@/lib/config";
import { undoImport } from "./actions";
import { ImportWizard } from "./import-wizard";

export default async function ImportPage() {
  await requireManager();
  const sql = await getDb();
  const [people, imports] = await Promise.all([
    sql<{ id: number; username: string; display_name: string }[]>`
      select id, username, display_name from ioms.users where active order by display_name`,
    sql<
      {
        id: number;
        filename: string;
        by: string;
        created_at: Date;
        rows: number;
        assigned: number;
        scored: number;
      }[]
    >`
      select i.id, i.filename, u.display_name as by, i.created_at,
             count(t.id)::int as rows,
             (count(t.id) filter (where t.user_id is not null))::int as assigned,
             (count(t.id) filter (where t.points > 0))::int as scored
        from ioms.imports i
        join ioms.users u on u.id = i.imported_by
        left join ioms.tickets t on t.import_id = i.id
       group by i.id, u.display_name
       order by i.created_at desc
       limit 50`,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-spooky text-4xl tracking-wide">Import iOMS requests</h1>
        <p className="max-w-2xl text-sm text-muted">
          Upload an iOMS export (Excel or CSV). Only a date is required; other columns are optional. Requests
          marked resolved score {POINTS_PER_COMPLETED_REQUEST} pts for the rep they belong to. Rows without a matching rep are kept as
          unassigned.
        </p>
      </div>

      <ImportWizard people={people.map((p) => ({ ...p }))} />

      <div className="card overflow-x-auto">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold">Past imports</h2>
        </div>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted uppercase">
            <tr>
              <th className="px-5 py-2.5 font-medium">File</th>
              <th className="px-3 py-2.5 font-medium">By</th>
              <th className="px-3 py-2.5 font-medium">When</th>
              <th className="px-3 py-2.5 text-right font-medium">Rows</th>
              <th className="px-3 py-2.5 text-right font-medium">Assigned</th>
              <th className="px-3 py-2.5 text-right font-medium">Scored</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {imports.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted">
                  Nothing imported yet.
                </td>
              </tr>
            )}
            {imports.map((i) => (
              <tr key={i.id}>
                <td className="px-5 py-3 font-medium">{i.filename}</td>
                <td className="px-3 py-3">{i.by}</td>
                <td className="px-3 py-3 whitespace-nowrap text-muted">
                  {i.created_at.toLocaleString("en-US", {
                    timeZone: process.env.APP_TIMEZONE ?? "America/New_York",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{i.rows}</td>
                <td className="px-3 py-3 text-right tabular-nums">{i.assigned}</td>
                <td className="px-3 py-3 text-right tabular-nums">{i.scored}</td>
                <td className="px-5 py-3 text-right">
                  <form action={undoImport}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="text-xs text-muted hover:text-bad" title="Delete this import and its rows">
                      Undo
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
