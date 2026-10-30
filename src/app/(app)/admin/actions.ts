"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
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

  const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
  if (exists) return { error: `"${username}" is already taken.` };

  db.prepare(
    "INSERT INTO users (username, display_name, password_hash, role, lane) VALUES (?, ?, ?, ?, ?)",
  ).run(username, displayName, hashPassword(password), role, lane);
  revalidatePath("/", "layout");
  return { success: `Created ${displayName}. Share the temporary password with them.` };
}

export async function updateUser(formData: FormData) {
  const manager = await requireManager();
  const id = Number(formData.get("id"));
  const role = formData.get("role") === "manager" ? "manager" : "rep";
  const lane = String(formData.get("lane") ?? "").trim() || null;
  // Managers can't demote or deactivate themselves and lock everyone out.
  const active = id === manager.id ? 1 : formData.get("active") === "on" ? 1 : 0;
  db.prepare("UPDATE users SET role = ?, lane = ?, active = ? WHERE id = ?").run(
    id === manager.id ? "manager" : role,
    lane,
    active,
    id,
  );
  revalidatePath("/", "layout");
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireManager();
  const id = Number(formData.get("id"));
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "At least 8 characters." };
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), id);
  return { success: "Password reset." };
}

export async function confirmDay(formData: FormData) {
  const manager = await requireManager();
  db.prepare(
    "INSERT OR IGNORE INTO confirmed_days (user_id, work_date, confirmed_by) VALUES (?, ?, ?)",
  ).run(Number(formData.get("user_id")), String(formData.get("work_date")), manager.id);
  revalidatePath("/", "layout");
}
