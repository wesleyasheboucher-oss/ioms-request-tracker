"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { isValidISODate } from "@/lib/dates";
import type { FormState } from "../../actions";

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireManager();
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "manager" ? "manager" : "rep";
  const lane = String(formData.get("lane") ?? "").trim() || null;

  if (!/^[a-zA-Z0-9._-]{2,40}$/.test(username)) {
    return { error: "Username: 2–40 letters, numbers, dots, dashes or underscores." };
  }
  if (!displayName) return { error: "Enter a display name." };
  if (password.length < 8) return { error: "Temporary password must be at least 8 characters." };

  const sql = await getDb();
  const created = await sql`
    insert into ioms.users (username, display_name, password_hash, role, lane)
    values (${username}, ${displayName}, ${hashPassword(password)}, ${role}, ${lane})
    on conflict do nothing
    returning id`;
  if (!created.length) return { error: `"${username}" is already taken.` };

  revalidatePath("/", "layout");
  return { success: `Created ${displayName}. Share the temporary password with them.` };
}

export async function updateUser(formData: FormData) {
  const manager = await requireManager();
  const id = Number(formData.get("id"));
  const displayName = String(formData.get("display_name") ?? "").trim();
  const role = formData.get("role") === "manager" ? "manager" : "rep";
  const lane = String(formData.get("lane") ?? "").trim() || null;
  if (!displayName) return;
  // Managers can't demote or deactivate themselves and lock everyone out.
  const self = id === manager.id;
  const active = self || formData.get("active") === "on";
  const sql = await getDb();
  await sql`
    update ioms.users
       set display_name = ${displayName}, role = ${self ? "manager" : role},
           lane = ${lane}, active = ${active}
     where id = ${id}`;
  revalidatePath("/", "layout");
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireManager();
  const id = Number(formData.get("id"));
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "At least 8 characters." };
  const sql = await getDb();
  await sql`update ioms.users set password_hash = ${hashPassword(password)} where id = ${id}`;
  return { success: "Password reset." };
}

export async function confirmDay(formData: FormData) {
  const manager = await requireManager();
  const workDate = String(formData.get("work_date"));
  if (!isValidISODate(workDate)) return;
  const sql = await getDb();
  await sql`
    insert into ioms.confirmed_days (user_id, work_date, confirmed_by)
    values (${Number(formData.get("user_id"))}, ${workDate}::date, ${manager.id})
    on conflict do nothing`;
  revalidatePath("/", "layout");
}
