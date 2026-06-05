/**
 * Client-side fallback; prefer server `remainingSeconds` when resuming a session.
 */
export function getRemainingSecondsFromSession(session, durationMinutes, now = Date.now()) {
  const duration = Number(durationMinutes);
  const totalSeconds = (Number.isFinite(duration) && duration > 0 ? duration : 60) * 60;
  if (!session?.startTime) return totalSeconds;

  const started = new Date(session.startTime).getTime();
  if (Number.isNaN(started)) return totalSeconds;

  const elapsed = Math.floor((now - started) / 1000);
  return Math.max(0, totalSeconds - elapsed);
}

export function resolveSessionRemainingSeconds(session, durationMinutes) {
  if (session && Number.isFinite(session.remainingSeconds)) {
    return Math.max(0, session.remainingSeconds);
  }
  return getRemainingSecondsFromSession(session, durationMinutes);
}
