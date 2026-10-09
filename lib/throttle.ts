type Attempt = {
  count: number;
  blockedUntil: number;
};

const attempts = new Map<string, Attempt>();
const FAILURE_LIMIT = 8;
const BLOCK_MS = 5 * 60 * 1000;

export function loginBlocked(email: string, now = Date.now()): boolean {
  const entry = attempts.get(email);
  if (!entry) return false;
  if (entry.blockedUntil > now) return true;
  if (entry.blockedUntil !== 0 && entry.blockedUntil <= now) {
    attempts.delete(email);
  }
  return false;
}

export function loginFailed(email: string, now = Date.now()): void {
  const entry = attempts.get(email) ?? { count: 0, blockedUntil: 0 };
  if (entry.blockedUntil > now) return;
  entry.count += 1;
  if (entry.count >= FAILURE_LIMIT) {
    entry.count = 0;
    entry.blockedUntil = now + BLOCK_MS;
  }
  attempts.set(email, entry);
}

export function loginSucceeded(email: string): void {
  attempts.delete(email);
}
