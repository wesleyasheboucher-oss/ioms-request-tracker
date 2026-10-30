"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { POINTS_PER_COMPLETED_REQUEST, RESOLVED_STATUS_PATTERN } from "@/lib/config";
import {
  buildRepMatcher,
  parseDateValue,
  type ImportPerson,
  type ImportRow,
} from "@/lib/import-helpers";
import { importChunk, startImport, type ChunkResult } from "./actions";

type Cell = string | number | boolean | Date | null;
type Sheet = { filename: string; headers: string[]; rows: Record<string, Cell>[] };

type FieldKey = Exclude<keyof ImportRow, "resolved" | "raw">;

// Our fields, and header names that usually mean them.
const FIELDS: { key: FieldKey; label: string; required?: boolean; guess: RegExp }[] = [
  { key: "date", label: "Date", required: true, guess: /date|created|opened|closed|completed on|time/i },
  { key: "orderId", label: "Order ID", guess: /order|bt ?#|patient id|^ord/i },
  { key: "rep", label: "Rep (who worked it)", guess: /rep|assigned|agent|owner|worked by|completed by|user|employee/i },
  { key: "status", label: "Status / outcome", guess: /status|outcome|result|resolution|state/i },
  { key: "requestType", label: "Request type", guess: /type|category|reason|subject|question/i },
  { key: "requestedBy", label: "Requested by", guess: /requested|requester|department|dept|from/i },
  { key: "source", label: "Source", guess: /source|channel/i },
  { key: "notes", label: "Notes", guess: /note|comment|description|response|details/i },
  { key: "externalId", label: "iOMS request ID", guess: /request id|ticket id|case id|^id$|reference|ref ?#|number/i },
];

const CHUNK = 250;

function text(v: Cell): string {
  if (v instanceof Date) return v.toLocaleDateString("en-US");
  return v === null || v === undefined ? "" : String(v).trim();
}

function guessMapping(headers: string[]) {
  const used = new Set<string>();
  const map: Partial<Record<FieldKey, string>> = {};
  for (const f of FIELDS) {
    const h = headers.find((h) => !used.has(h) && f.guess.test(h));
    if (h) {
      map[f.key] = h;
      used.add(h);
    }
  }
  return map;
}

export function ImportWizard({ people }: { people: ImportPerson[] }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({});
  const [resolvedValues, setResolvedValues] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ChunkResult | null>(null);
  const matchRep = useMemo(() => buildRepMatcher(people), [people]);

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, Cell>>(ws, { defval: null, raw: true });
      if (!rows.length) throw new Error("That file has no rows under a header row.");
      const headers = Object.keys(rows[0]);
      const map = guessMapping(headers);
      setSheet({ filename: file.name, headers, rows });
      setMapping(map);
      setResolvedValues(
        new Set(
          rows
            .map((r) => (map.status ? text(r[map.status]) : ""))
            .filter((s) => s && RESOLVED_STATUS_PATTERN.test(s)),
        ),
      );
    } catch (e) {
      setSheet(null);
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  }

  // Rows as they'll be saved, given the current column choices.
  const mapped = useMemo(() => {
    if (!sheet) return [];
    const col = (r: Record<string, Cell>, k: FieldKey) => (mapping[k] ? r[mapping[k]!] : null);
    return sheet.rows.map((r) => {
      const status = text(col(r, "status")) || null;
      const row: ImportRow & { valid: boolean } = {
        date: parseDateValue(col(r, "date")) ?? "",
        orderId: text(col(r, "orderId")) || null,
        rep: text(col(r, "rep")) || null,
        requestedBy: text(col(r, "requestedBy")) || null,
        source: text(col(r, "source")) || null,
        requestType: text(col(r, "requestType")) || null,
        status,
        notes: text(col(r, "notes")) || null,
        externalId: text(col(r, "externalId")) || null,
        resolved: !!status && resolvedValues.has(status),
        raw: Object.fromEntries(sheet.headers.map((h) => [h, text(r[h])])),
        valid: false,
      };
      row.valid = !!row.date;
      return row;
    });
  }, [sheet, mapping, resolvedValues]);

  const summary = useMemo(() => {
    const valid = mapped.filter((r) => r.valid);
    const unmatched = new Map<string, number>();
    let assigned = 0;
    for (const r of valid) {
      if (matchRep(r.rep)) assigned++;
      else if (r.rep) unmatched.set(r.rep, (unmatched.get(r.rep) ?? 0) + 1);
    }
    const statuses = new Map<string, number>();
    for (const r of valid) if (r.status) statuses.set(r.status, (statuses.get(r.status) ?? 0) + 1);
    return {
      valid: valid.length,
      badDates: mapped.length - valid.length,
      assigned,
      unmatched: [...unmatched.entries()].sort((a, b) => b[1] - a[1]),
      statuses: [...statuses.entries()].sort((a, b) => b[1] - a[1]),
      scoring: valid.filter((r) => r.resolved && matchRep(r.rep)).length,
    };
  }, [mapped, matchRep]);

  async function runImport() {
    if (!sheet) return;
    const rows: ImportRow[] = mapped.filter((r) => r.valid).map((r) => ({ ...r, valid: undefined }));
    setError(null);
    setProgress({ done: 0, total: rows.length });
    try {
      const id = await startImport(sheet.filename);
      const total: ChunkResult = { inserted: 0, duplicates: 0, scored: 0, unassigned: 0 };
      for (let i = 0; i < rows.length; i += CHUNK) {
        const r = await importChunk(id, rows.slice(i, i + CHUNK));
        total.inserted += r.inserted;
        total.duplicates += r.duplicates;
        total.scored += r.scored;
        total.unassigned += r.unassigned;
        setProgress({ done: Math.min(i + CHUNK, rows.length), total: rows.length });
      }
      setResult(total);
      setSheet(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed partway. Undo it below and try again.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="card space-y-5 p-5">
      <div>
        <label className="label" htmlFor="file">1. Choose a file</label>
        <input
          id="file"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-accent-ink"
        />
        <p className="mt-1 text-xs text-muted">The first sheet is read; its first row should be the column names.</p>
      </div>

      {result && (
        <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">
          Imported {result.inserted.toLocaleString()} requests ({result.scored} scored, {result.unassigned}{" "}
          unassigned).
          {result.duplicates > 0 && ` Skipped ${result.duplicates} already imported.`}
        </p>
      )}
      {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}

      {sheet && (
        <>
          <div>
            <p className="label">2. Match the columns in {sheet.filename}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs text-muted" htmlFor={`map-${f.key}`}>
                    {f.label}
                    {f.required && <span className="text-accent"> *</span>}
                  </label>
                  <select
                    id={`map-${f.key}`}
                    value={mapping[f.key] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))}
                    className="input py-2"
                  >
                    <option value="">— not in this file —</option>
                    {sheet.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {mapping.status && summary.statuses.length > 0 && (
            <div>
              <p className="label">3. Which statuses mean the request was resolved?</p>
              <p className="mb-2 text-xs text-muted">Ticked statuses score {POINTS_PER_COMPLETED_REQUEST} pts for the rep who worked them.</p>
              <div className="flex flex-wrap gap-2">
                {summary.statuses.map(([value, count]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                      resolvedValues.has(value) ? "border-good bg-good-soft" : "border-line"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={resolvedValues.has(value)}
                      onChange={(e) =>
                        setResolvedValues((s) => {
                          const next = new Set(s);
                          if (e.target.checked) next.add(value);
                          else next.delete(value);
                          return next;
                        })
                      }
                      className="accent-[var(--good)]"
                    />
                    {value} <span className="text-muted">({count})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Rows to import" value={summary.valid} />
            <Stat label="Matched to a rep" value={summary.assigned} />
            <Stat label="Will score" value={summary.scoring} good />
            <Stat label="Skipped (no valid date)" value={summary.badDates} warn={summary.badDates > 0} />
          </div>

          {summary.unmatched.length > 0 && (
            <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
              No login matches: {summary.unmatched.slice(0, 8).map(([n, c]) => `${n} (${c})`).join(", ")}
              {summary.unmatched.length > 8 && ` and ${summary.unmatched.length - 8} more`}. Those rows import as
              unassigned and don&apos;t score.
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-surface-2 text-left text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Order ID</th>
                  <th className="px-3 py-2 font-medium">Rep</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Request</th>
                  <th className="px-3 py-2 text-right font-medium">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {mapped.slice(0, 8).map((r, i) => {
                  const person = matchRep(r.rep);
                  return (
                    <tr key={i} className={r.valid ? undefined : "text-bad"}>
                      <td className="px-3 py-2">{r.date || "invalid date"}</td>
                      <td className="px-3 py-2 font-mono">{r.orderId ?? "—"}</td>
                      <td className="px-3 py-2">
                        {person ? person.display_name : <span className="text-muted">{r.rep ?? "—"} (unassigned)</span>}
                      </td>
                      <td className="px-3 py-2">{r.status ?? "—"}</td>
                      <td className="px-3 py-2">{r.requestType ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{r.valid && r.resolved && person ? POINTS_PER_COMPLETED_REQUEST : 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="btn-primary"
              onClick={runImport}
              disabled={!mapping.date || summary.valid === 0 || !!progress}
            >
              {progress
                ? `Importing… ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()}`
                : `Import ${summary.valid.toLocaleString()} requests`}
            </button>
            <button className="btn-ghost" onClick={() => setSheet(null)} disabled={!!progress}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, good, warn }: { label: string; value: number; good?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${good ? "text-good" : warn ? "text-warn" : ""}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
