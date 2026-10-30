import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "tracker_session";
const SESSION_DAYS = 14;

// Read lazily so a missing secret fails the request, not the build.
function secret() {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not set. Add a long random string (see README).");
  }
  return "dev-only-session-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function createSession(userId: number) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString("base64url");
  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

export async function readSession(): Promise<number | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof uid === "number" && exp > Date.now() ? uid : null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
