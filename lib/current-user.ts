import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deleteSessionToken, findUserBySessionToken } from "@/lib/accounts";
import { database } from "@/lib/database";
import { safeNextPath } from "@/lib/safe-next";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/tokens";
import type { UserRecord } from "@/lib/types";

function cookieSecure(): boolean {
  if (process.env.PROTALONE_SECURE_COOKIES === "0") return false;
  if (process.env.PROTALONE_SECURE_COOKIES === "1") return true;
  return process.env.NODE_ENV === "production";
}

export async function getCurrentUser(): Promise<UserRecord | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findUserBySessionToken(database(), token);
}

export async function requireUser(): Promise<UserRecord> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/portal");
  return user;
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) deleteSessionToken(database(), token);
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 0,
  });
}

export async function redirectIfSignedIn(nextPath: string | null | undefined): Promise<void> {
  const user = await getCurrentUser();
  if (user) redirect(safeNextPath(nextPath));
}
