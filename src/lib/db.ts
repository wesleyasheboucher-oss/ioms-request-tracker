import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./password";

export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

export type Role = "rep" | "manager";

export type User = {
  id: number;
  username: string;
  display_name: string;
  role: Role;
  lane: string | null;
  active: number;
};

export type Ticket = {
  id: number;
  user_id: number;
  order_id: string;
  requested_by: string;
  source: string;
  request_type: string;
  patient_contacted: number;
  voicemail: number;
  text_sent: number;
  outcome: string;
  notes: string | null;
  points: number;
  work_date: string;
  created_at: string;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'rep' CHECK (role IN ('rep', 'manager')),
  lane TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  order_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  source TEXT NOT NULL,
  request_type TEXT NOT NULL,
  patient_contacted INTEGER NOT NULL DEFAULT 0,
  voicemail INTEGER NOT NULL DEFAULT 0,
  text_sent INTEGER NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL,
  notes TEXT,
  points INTEGER NOT NULL,
  work_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS tickets_user_date ON tickets (user_id, work_date);
CREATE INDEX IF NOT EXISTS tickets_order ON tickets (order_id);

-- Days at or above the held threshold that a manager has confirmed.
CREATE TABLE IF NOT EXISTS confirmed_days (
  user_id INTEGER NOT NULL REFERENCES users(id),
  work_date TEXT NOT NULL,
  confirmed_by INTEGER NOT NULL REFERENCES users(id),
  confirmed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, work_date)
);
`;

function open() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, "tracker.db"));
  db.exec("PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  bootstrapAdmin(db);
  return db;
}

// On first run there are no users, so create a manager account to log in with.
function bootstrapAdmin(db: DatabaseSync) {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (n > 0) return;
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "changeme";
  // OR IGNORE: several processes (e.g. build workers) may race to do this.
  const { changes } = db
    .prepare(
      "INSERT OR IGNORE INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, 'manager')",
    )
    .run(username, "Manager", hashPassword(password));
  if (changes) console.log(
    `[tracker] Created first manager account "${username}". Log in and change the password.`,
  );
}

const globalForDb = globalThis as unknown as { trackerDb?: DatabaseSync };

export const db = globalForDb.trackerDb ?? open();
if (process.env.NODE_ENV !== "production") globalForDb.trackerDb = db;
