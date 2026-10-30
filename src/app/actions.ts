"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { OUTCOMES, REQUEST_TYPES, REQUESTED_BY, SOURCES } from "@/lib/config";
import { pointsFor } from "@/lib/scoring";
import { addDays, todayISO } from "@/lib/dates";

export type FormState = { error?: string; success?: string } | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const row = db
    .prepare("SELECT id, password_hash FROM users WHERE username = ? AND active = 1")
    .get(username) as { id: number; password_hash: string } | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    return { error: "Wrong username or password." };
  }
  await createSession(row.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export type TicketInput = {
  orderId: string;
  requestedBy: string;
  source: string;
  requestType: string;
  patientContacted: boolean;
  voicemail: boolean;
  text: boolean;
  outcome: string;
  notes: string;
};

export type LogResult =
  | { ok: true; points: number }
  | { ok: false; error: string };

const ORDER_ID_PATTERN = /^[A-Za-z0-9#\-_.]{1,40}$/;

export async function logTicket(input: TicketInput): Promise<LogResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const orderId = input.orderId.trim();
  if (!ORDER_ID_PATTERN.test(orderId)) {
    return { ok: false, error: "Enter a valid order ID (letters, numbers, - or #)." };
  }
  const checks: [string, readonly string[], string][] = [
    [input.requestedBy, REQUESTED_BY, "who requested it"],
    [input.source, SOURCES, "the source of work"],
    [input.requestType, REQUEST_TYPES, "the request type"],
    [input.outcome, OUTCOMES, "the outcome"],
  ];
  for (const [value, allowed, label] of checks) {
    if (!allowed.includes(value)) return { ok: false, error: `Pick ${label}.` };
  }

  const contact = {
    patientContacted: !!input.patientContacted,
    voicemail: !!input.voicemail,
    text: !!input.text,
  };
  const points = pointsFor(contact, input.outcome);
  const notes = input.notes.trim().slice(0, 500) || null;

  db.prepare(
    `INSERT INTO tickets (user_id, order_id, requested_by, source, request_type,
       patient_contacted, voicemail, text_sent, outcome, notes, points, work_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    user.id,
    orderId,
    input.requestedBy,
    input.source,
    input.requestType,
    contact.patientContacted ? 1 : 0,
    contact.voicemail ? 1 : 0,
    contact.text ? 1 : 0,
    input.outcome,
    notes,
    points,
    todayISO(),
  );

  revalidatePath("/", "layout");
  return { ok: true, points };
}

export type PriorLog = {
  work_date: string;
  display_name: string;
  request_type: string;
  outcome: string;
  points: number;
};

// Recent logs for the same order, so reps notice re-posted work (which
// doesn't score again) before logging it.
export async function lookupOrder(orderId: string): Promise<PriorLog[]> {
  const user = await getCurrentUser();
  if (!user || !orderId.trim()) return [];
  const rows = db
    .prepare(
      `SELECT t.work_date, u.display_name, t.request_type, t.outcome, t.points
         FROM tickets t JOIN users u ON u.id = t.user_id
        WHERE t.order_id = ? AND t.work_date >= ?
        ORDER BY t.created_at DESC
        LIMIT 5`,
    )
    .all(orderId.trim(), addDays(todayISO(), -30)) as PriorLog[];
  // node:sqlite rows have a null prototype, which can't be sent to the client.
  return rows.map((r) => ({ ...r }));
}

// Reps can remove their own entries from today (to fix mistakes); managers can
// remove any entry.
export async function deleteTicket(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (user.role === "manager") {
    db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
  } else {
    db.prepare("DELETE FROM tickets WHERE id = ? AND user_id = ? AND work_date = ?").run(
      id,
      user.id,
      todayISO(),
    );
  }
  revalidatePath("/", "layout");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as {
    password_hash: string;
  };
  if (!verifyPassword(current, row.password_hash)) {
    return { error: "Current password is wrong." };
  }
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords don't match." };
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), user.id);
  return { success: "Password updated." };
}
