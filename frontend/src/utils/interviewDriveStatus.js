/**
 * Interview drive display status (Interview Scheduling)
 *
 * Priority:
 * 1. Drive Finished — session COMPLETED or all rounds ENDED (exclusive; no other badges)
 * 2. In Progress — session ONGOING or any round ACTIVE / partially completed
 * 3. Otherwise — Upcoming Drive and/or Finalized, plus Drive Today on the scheduled date
 */

const BADGE_STYLES = {
  upcoming: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  finalized: 'bg-blue-50 text-blue-600 border-blue-200',
  today: 'bg-orange-50 text-orange-600 border-orange-200',
  in_progress: 'bg-violet-50 text-violet-600 border-violet-200',
  finished: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function getDriveDateBucket(driveDate) {
  if (!driveDate) return 'UNKNOWN';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(driveDate);
  if (Number.isNaN(d.getTime())) return 'UNKNOWN';
  d.setHours(0, 0, 0, 0);
  if (d.getTime() < today.getTime()) return 'PAST';
  if (d.getTime() === today.getTime()) return 'TODAY';
  return 'FUTURE';
}

export function isDriveFinished(session) {
  if (!session) return false;
  const rounds = Array.isArray(session.rounds) ? session.rounds : [];
  if (session.status === 'COMPLETED') return true;
  return rounds.length > 0 && rounds.every((round) => round.status === 'ENDED');
}

export function isInterviewConfigurationComplete(session) {
  const rounds = Array.isArray(session?.rounds) ? session.rounds : [];
  return rounds.length > 0;
}

export function isInterviewInProgress(session) {
  if (!session || isDriveFinished(session)) return false;
  const rounds = Array.isArray(session.rounds) ? session.rounds : [];
  const hasActiveRound = rounds.some((round) => round.status === 'ACTIVE');
  const hasPartialProgress = rounds.some((round) => round.status === 'ENDED') && !isDriveFinished(session);
  return session.status === 'ONGOING' || hasActiveRound || hasPartialProgress;
}

/**
 * @param {{ driveDate?: string|Date|null }} job
 * @param {{ status?: string, rounds?: Array<{ status?: string }> }|null|undefined} session
 * @returns {{ key: string, label: string, className: string }[]}
 */
export function getInterviewDriveStatusBadges(job, session) {
  if (isDriveFinished(session)) {
    return [{ key: 'finished', label: 'Drive Finished', className: BADGE_STYLES.finished }];
  }

  if (isInterviewInProgress(session)) {
    return [{ key: 'in_progress', label: 'In Progress', className: BADGE_STYLES.in_progress }];
  }

  const badges = [];
  const dateBucket = getDriveDateBucket(job?.driveDate);
  const configured = isInterviewConfigurationComplete(session);

  if (dateBucket === 'TODAY') {
    badges.push({ key: 'today', label: 'Drive Today', className: BADGE_STYLES.today });
  }

  if (configured) {
    badges.push({ key: 'finalized', label: 'Finalized', className: BADGE_STYLES.finalized });
  } else {
    badges.push({ key: 'upcoming', label: 'Upcoming Drive', className: BADGE_STYLES.upcoming });
  }

  return badges;
}
