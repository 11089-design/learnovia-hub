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

/** Learners can walk in from 10 minutes before the scheduled start. */
export const EARLY_JOIN_MS = 10 * 60 * 1000;
/** A reminder shows once the session is within an hour. */
export const REMINDER_WINDOW_MS = 60 * 60 * 1000;

/** Milliseconds until the room opens (0 when it's already open). */
export function msUntilOpen(s: SessionTimes, now: number = Date.now()): number {
  if (s.status === "live") return 0;
  if (!s.starts_at) return 0;
  return Math.max(0, new Date(s.starts_at).getTime() - EARLY_JOIN_MS - now);
}

/** The room is only enterable once it's live, or within 10 minutes of the start. */
export function canEnterRoom(s: SessionTimes, now: number = Date.now()): boolean {
  return !isSessionOver(s, now) && msUntilOpen(s, now) === 0;
}

/** True when the session starts within the next hour (and hasn't ended). */
export function isReminderDue(s: SessionTimes, now: number = Date.now()): boolean {
  if (isSessionOver(s, now) || !s.starts_at) return false;
  const diff = new Date(s.starts_at).getTime() - now;
  return diff > 0 && diff <= REMINDER_WINDOW_MS;
}

