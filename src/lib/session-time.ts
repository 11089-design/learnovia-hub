/**
 * Shared rules for deciding whether a session is still relevant.
 *
 * A session is "over" when its end time has passed, or — when no end time was
 * set — 3 hours after its start. This keeps stale sessions out of Explore and
 * the dashboard even if nobody flipped the status to `ended`.
 */
const NO_END_GRACE_MS = 3 * 60 * 60 * 1000;

export type SessionTimes = {
  status?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export function isSessionOver(s: SessionTimes, now: number = Date.now()): boolean {
  if (s.status === "ended" || s.status === "cancelled") return true;
  if (s.status === "live") return false;
  if (s.ends_at) return new Date(s.ends_at).getTime() < now;
  if (s.starts_at) return new Date(s.starts_at).getTime() + NO_END_GRACE_MS < now;
  return false;
}

/** True while the session is joinable (live, or starting/ongoing right now). */
export function isSessionJoinable(s: SessionTimes, now: number = Date.now()): boolean {
  return !isSessionOver(s, now);
}
