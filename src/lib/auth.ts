import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db, type User } from "./db";
import { readSession } from "./session";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const uid = await readSession();
  if (uid === null) return null;
  const user = db
    .prepare(
      "SELECT id, username, display_name, role, lane, active FROM users WHERE id = ? AND active = 1",
    )
    .get(uid) as User | undefined;
  return user ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireManager() {
  const user = await requireUser();
  if (user.role !== "manager") redirect("/");
  return user;
}
