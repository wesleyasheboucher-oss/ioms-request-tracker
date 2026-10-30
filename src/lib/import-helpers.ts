// Shared by the import page (for the preview) and the import action (for the
// real thing), so what managers see is what gets saved.

export type ImportPerson = { id: number; username: string; display_name: string };

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// Match a rep as written in an export: username, email, full name, "Last,
// First", or a first name that only one person has.
export function buildRepMatcher(people: ImportPerson[]) {
  const exact = new Map<string, ImportPerson>();
  const firstNames = new Map<string, ImportPerson[]>();
  for (const p of people) {
    exact.set(norm(p.username), p);
    exact.set(norm(p.display_name), p);
    exact.set(norm(p.username.replace(/[._]/g, " ")), p);
    const first = norm(p.display_name).split(" ")[0];
    firstNames.set(first, [...(firstNames.get(first) ?? []), p]);
  }
  return (raw: string | null | undefined): ImportPerson | null => {
    if (!raw) return null;
    let key = norm(String(raw));
    if (!key) return null;
    if (key.includes("@")) key = key.split("@")[0];
    if (key.includes(",")) key = key.split(",").reverse().map((s) => s.trim()).join(" ");
    const hit = exact.get(key) ?? exact.get(key.replace(/[._]/g, " "));
    if (hit) return hit;
    const byFirst = firstNames.get(key.split(/[ ._]/)[0]);
    return byFirst?.length === 1 ? byFirst[0] : null;
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Accepts Excel dates, ISO dates, and M/D/YY(YY) with / . or - separators.
export function parseDateValue(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  if (typeof v !== "string") return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})\b/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return valid(year, +m[1], +m[2]);
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parseDateValue(parsed);
}

function valid(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d && y >= 2000 && y <= 2100
    ? `${y}-${pad(m)}-${pad(d)}`
    : null;
}

export type ImportRow = {
  date: string;
  orderId: string | null;
  rep: string | null;
  requestedBy: string | null;
  source: string | null;
  requestType: string | null;
  status: string | null;
  notes: string | null;
  externalId: string | null;
  resolved: boolean;
  raw: Record<string, string>;
};
