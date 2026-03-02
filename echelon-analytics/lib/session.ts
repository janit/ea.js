// Echelon Analytics — Session Store
//
// In-memory session store with random tokens and TTL.
// Replaces the deterministic password-hash-as-token approach.

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 minutes idle timeout
const MAX_SESSIONS = 1_000;

interface Session {
  username: string;
  createdAt: number;
  lastActivityAt: number;
}

const sessions = new Map<string, Session>();

/** Create a new session, returns the session token. Invalidates prior sessions for the same user. */
export function createSession(username: string): { token: string } {
  // Invalidate all existing sessions for this user (prevent session fixation)
  for (const [tok, s] of sessions) {
    if (s.username === username) sessions.delete(tok);
  }

  // Evict oldest sessions if at capacity
  if (sessions.size >= MAX_SESSIONS) {
    pruneSessions();
    while (sessions.size >= MAX_SESSIONS) {
      const oldest = sessions.keys().next().value;
      if (oldest !== undefined) sessions.delete(oldest);
      else break;
    }
  }
  const now = Date.now();
  const token = crypto.randomUUID();
  sessions.set(token, { username, createdAt: now, lastActivityAt: now });
  return { token };
}

/** Validate a session token. Returns the session if valid, undefined if expired/idle/invalid. */
export function getSession(token: string): Session | undefined {
  const session = sessions.get(token);
  if (!session) return undefined;
  const now = Date.now();
  if (
    now - session.createdAt > SESSION_TTL_MS ||
    now - session.lastActivityAt > SESSION_IDLE_MS
  ) {
    sessions.delete(token);
    return undefined;
  }
  // Refresh activity timestamp
  session.lastActivityAt = now;
  return session;
}

/** Delete a session (logout). */
export function deleteSession(token: string): void {
  sessions.delete(token);
}

/** Prune expired and idle sessions (called periodically). */
export function pruneSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (
      now - session.createdAt > SESSION_TTL_MS ||
      now - session.lastActivityAt > SESSION_IDLE_MS
    ) {
      sessions.delete(token);
    }
  }
}
