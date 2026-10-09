import { randomUUID } from "node:crypto";
import type { AppDatabase } from "@/lib/db";
import { PortalError } from "@/lib/errors";
import { hashPassword, isValidEmail, normalizeEmail, passwordProblem, verifyPassword } from "@/lib/passwords";
import { hashSessionToken, newSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/tokens";
import type { UserRecord } from "@/lib/types";

const DUMMY_PASSWORD_HASH = hashPassword("dummy-password-for-timing");

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
};

export function createUser(db: AppDatabase, emailInput: string, password: string): UserRecord {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    throw new PortalError("Enter a valid email address.");
  }
  const passwordMessage = passwordProblem(password);
  if (passwordMessage) throw new PortalError(passwordMessage);

  const now = new Date().toISOString();
  const id = randomUUID();
  try {
    db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(
      id,
      email,
      hashPassword(password),
      now,
    );
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      throw new PortalError("An account with this email already exists. Sign in instead.");
    }
    throw error;
  }
  return { id, email };
}

export function authenticate(db: AppDatabase, emailInput: string, password: string): UserRecord | null {
  const email = normalizeEmail(emailInput);
  const row = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email) as
    | UserRow
    | undefined;
  const hash = row?.password_hash ?? DUMMY_PASSWORD_HASH;
  const matches = verifyPassword(password, hash);
  if (!row || !matches) return null;
  return { id: row.id, email: row.email };
}

export function createSession(db: AppDatabase, userId: string, now = new Date()): string {
  const token = newSessionToken();
  const expires = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  db.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), userId, hashSessionToken(token), expires.toISOString(), now.toISOString());
  return token;
}

export function findUserBySessionToken(db: AppDatabase, token: string, now = new Date()): UserRecord | null {
  const nowIso = now.toISOString();
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso);
  const row = db
    .prepare(
      `SELECT users.id AS id, users.email AS email
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .get(hashSessionToken(token), nowIso) as UserRecord | undefined;
  return row ?? null;
}

export function deleteSessionToken(db: AppDatabase, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(token));
}
