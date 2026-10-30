import "server-only";
import postgres from "postgres";
import { hashPassword } from "./password";

export type Role = "rep" | "manager";

export type User = {
  id: number;
  username: string;
  display_name: string;
  role: Role;
  lane: string | null;
  active: boolean;
};

// Tickets logged through the app have every field. Imported iOMS requests
// (origin "import") may be missing any of them, including the rep.
export type Ticket = {
  id: number;
  user_id: number | null;
  origin: "app" | "import";
  order_id: string | null;
  requested_by: string | null;
  source: string | null;
  request_type: string | null;
  patient_contacted: boolean;
  voicemail: boolean;
  text_sent: boolean;
  contact_not_required: boolean;
  outcome: string | null;
  import_status: string | null;
  notes: string | null;
  points: number;
  work_date: string;
  created_at: Date;
};

// Everything lives in its own "ioms" schema so it can't collide with other
// tables in the Supabase project. Row level security is on with no policies,
// so Supabase's public Data API can't read these tables; the app connects
// directly as the database owner, which bypasses RLS.
const SCHEMA = `
create schema if not exists ioms;

create table if not exists ioms.users (
  id integer generated always as identity primary key,
  username text not null,
  display_name text not null,
  password_hash text not null,
  role text not null default 'rep' check (role in ('rep', 'manager')),
  lane text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists users_username_key on ioms.users (lower(username));

create table if not exists ioms.tickets (
  id integer generated always as identity primary key,
  user_id integer not null references ioms.users (id),
  order_id text not null,
  requested_by text not null,
  source text not null,
  request_type text not null,
  patient_contacted boolean not null default false,
  voicemail boolean not null default false,
  text_sent boolean not null default false,
  outcome text not null,
  notes text,
  points integer not null,
  work_date date not null,
  created_at timestamptz not null default now()
);
create index if not exists tickets_user_date on ioms.tickets (user_id, work_date);
create index if not exists tickets_work_date on ioms.tickets (work_date);
create index if not exists tickets_order on ioms.tickets (order_id);

-- Days at or above the held threshold that a manager has confirmed.
create table if not exists ioms.confirmed_days (
  user_id integer not null references ioms.users (id),
  work_date date not null,
  confirmed_by integer not null references ioms.users (id),
  confirmed_at timestamptz not null default now(),
  primary key (user_id, work_date)
);

-- Imported iOMS requests live in tickets too, with whatever fields the
-- export had. import_key de-duplicates re-uploads of the same rows.
create table if not exists ioms.imports (
  id integer generated always as identity primary key,
  filename text not null,
  imported_by integer not null references ioms.users (id),
  rows_imported integer not null default 0,
  created_at timestamptz not null default now()
);
alter table ioms.tickets alter column user_id drop not null;
alter table ioms.tickets alter column order_id drop not null;
alter table ioms.tickets alter column requested_by drop not null;
alter table ioms.tickets alter column source drop not null;
alter table ioms.tickets alter column request_type drop not null;
alter table ioms.tickets alter column outcome drop not null;
alter table ioms.tickets add column if not exists origin text not null default 'app';
alter table ioms.tickets add column if not exists import_id integer references ioms.imports (id) on delete cascade;
alter table ioms.tickets add column if not exists import_key text;
alter table ioms.tickets add column if not exists import_status text;
alter table ioms.tickets add column if not exists contact_not_required boolean not null default false;
create unique index if not exists tickets_import_key on ioms.tickets (import_key) where import_key is not null;

-- Daily totals carried over from the Scream Team spreadsheet, scored under
-- the rules in force on each date. day_weight: 1 = worked, 0.5 = half-day
-- PTO, 0 = training / PTO / no work.
create table if not exists ioms.history_days (
  user_id integer not null references ioms.users (id),
  work_date date not null,
  completed integer not null default 0,
  points numeric(8, 1) not null default 0,
  day_weight numeric(2, 1) not null default 1,
  held boolean not null default false,
  breakdown jsonb not null default '{}',
  notes text,
  primary key (user_id, work_date)
);

alter table ioms.users enable row level security;
alter table ioms.tickets enable row level security;
alter table ioms.confirmed_days enable row level security;
alter table ioms.imports enable row level security;
alter table ioms.history_days enable row level security;
`;

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add your Supabase connection string (see README).");
  }
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return postgres(url, {
    ssl: local ? false : "require",
    // Supabase's transaction pooler (port 6543) doesn't support prepared statements.
    prepare: false,
    max: 3,
    idle_timeout: 20,
    // Keep DATE columns as "YYYY-MM-DD" strings instead of JS Dates.
    types: {
      date: {
        to: 1082,
        from: [1082],
        serialize: (x: string) => x,
        parse: (x: string) => x,
      },
    },
  });
}

export type Sql = ReturnType<typeof connect>;

// On first use, create the tables and, if there are no users yet, a manager
// account to log in with.
async function setup(sql: Sql) {
  await sql.unsafe(SCHEMA);
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "changeme";
  const displayName = username.charAt(0).toUpperCase() + username.slice(1);
  const created = await sql`
    insert into ioms.users (username, display_name, password_hash, role)
    select ${username}, ${displayName}, ${hashPassword(password)}, 'manager'
    where not exists (select 1 from ioms.users)
    on conflict do nothing
    returning id`;
  if (created.length) {
    console.log(
      `[tracker] Created first manager account "${username}". Log in and change the password.`,
    );
  }
}

const globalForDb = globalThis as unknown as { trackerSql?: Sql; trackerReady?: Promise<void> };

export async function getDb() {
  const sql = (globalForDb.trackerSql ??= connect());
  globalForDb.trackerReady ??= setup(sql).catch((e) => {
    globalForDb.trackerReady = undefined;
    throw e;
  });
  await globalForDb.trackerReady;
  return sql;
}
