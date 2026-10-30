"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { isValidISODate } from "@/lib/dates";
import { POINTS_PER_COMPLETED_REQUEST } from "@/lib/config";
import { buildRepMatcher, type ImportPerson, type ImportRow } from "@/lib/import-helpers";

const MAX_CHUNK = 500;

function clean(v: string | null | undefined, max = 500) {
  const s = (v ?? "").toString().trim();
  return s ? s.slice(0, max) : null;
}

export async function startImport(filename: string) {
  const manager = await requireManager();
  const sql = await getDb();
  const [row] = await sql<{ id: number }[]>`
    insert into ioms.imports (filename, imported_by)
    values (${filename.slice(0, 200) || "upload"}, ${manager.id})
    returning id`;
  return row.id;
}

export type ChunkResult = { inserted: number; duplicates: number; scored: number; unassigned: number };

// Saves one chunk of rows. Re-uploading the same rows is safe: each row has
// a key (its external ID, or a hash of the whole row) and repeats are skipped.
export async function importChunk(importId: number, rows: ImportRow[]): Promise<ChunkResult> {
  await requireManager();
  if (!Array.isArray(rows) || rows.length > MAX_CHUNK) throw new Error("Bad chunk");
  const sql = await getDb();
  const people = await sql<ImportPerson[]>`select id, username, display_name from ioms.users`;
  const matchRep = buildRepMatcher(people.map((p) => ({ ...p })));

  const records = rows
    .filter((r) => isValidISODate(r.date))
    .map((r) => {
      const person = matchRep(r.rep);
      const raw = JSON.stringify(r.raw ?? {});
      return {
        user_id: person?.id ?? null,
        origin: "import",
        import_id: importId,
        import_key: clean(r.externalId)
          ? `ext:${clean(r.externalId)}`
          : `row:${createHash("sha1").update(raw).digest("hex")}`,
        import_status: clean(r.status, 120),
        order_id: clean(r.orderId, 60),
        requested_by: clean(r.requestedBy, 120),
        source: clean(r.source, 120),
        request_type: clean(r.requestType, 120),
        notes: clean(r.notes, 1000),
        // Only resolved requests with a known rep score.
        points: r.resolved && person ? POINTS_PER_COMPLETED_REQUEST : 0,
        work_date: r.date,
      };
    });
  if (!records.length) return { inserted: 0, duplicates: rows.length, scored: 0, unassigned: 0 };

  const inserted = await sql<{ id: number; user_id: number | null; points: number }[]>`
    insert into ioms.tickets ${sql(records)}
    on conflict (import_key) where import_key is not null do nothing
    returning id, user_id, points`;

  // Don't double-score: if the rep already logged this order in the app that
  // day, the imported copy is kept for the record but scores 0.
  const unscored = await sql<{ id: number }[]>`
    update ioms.tickets t set points = 0
     where t.id = any(${inserted.map((r) => r.id)}::int[])
       and t.points > 0
       and exists (select 1 from ioms.tickets a
                    where a.origin = 'app' and a.user_id = t.user_id
                      and a.order_id = t.order_id and a.work_date = t.work_date)
    returning t.id`;

  await sql`
    update ioms.imports set rows_imported = rows_imported + ${inserted.length} where id = ${importId}`;
  revalidatePath("/", "layout");
  return {
    inserted: inserted.length,
    duplicates: rows.length - inserted.length,
    scored: inserted.filter((r) => r.points > 0).length - unscored.length,
    unassigned: inserted.filter((r) => r.user_id === null).length,
  };
}

// Removes an import and every ticket it created.
export async function undoImport(formData: FormData) {
  await requireManager();
  const sql = await getDb();
  await sql`delete from ioms.imports where id = ${Number(formData.get("id"))}`;
  revalidatePath("/", "layout");
}
