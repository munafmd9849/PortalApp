/**
 * Remaining exam time from session.startTime + assessment duration (server clock).
 */
export function getSessionRemainingSeconds(session, durationMinutes, now = new Date()) {
  const duration = Number(durationMinutes);
  const totalSeconds = (Number.isFinite(duration) && duration > 0 ? duration : 60) * 60;
  if (!session?.startTime) return totalSeconds;

  const started = new Date(session.startTime);
  if (Number.isNaN(started.getTime())) return totalSeconds;

  const elapsed = Math.floor((now.getTime() - started.getTime()) / 1000);
  return Math.max(0, totalSeconds - elapsed);
}

export function isSessionTimeExpired(session, durationMinutes, now = new Date()) {
  return getSessionRemainingSeconds(session, durationMinutes, now) <= 0;
}

export function enrichSessionWithTimer(session, durationMinutes, now = new Date()) {
  const duration = Number(durationMinutes) || 60;
  const remainingSeconds = getSessionRemainingSeconds(session, duration, now);
  return {
    ...session,
    durationMinutes: duration,
    remainingSeconds,
    timeExpired: remainingSeconds <= 0,
  };
}

/** Practice coding tests may reset the clock after a timed-out in-progress attempt. */
export function allowsPracticeTimerReset(assessment) {
  return assessment?.type === 'CODING_TEST';
}
