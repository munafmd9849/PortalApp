export const DEFAULT_JOIN_OPENS_MIN_BEFORE = 10;
export const DEFAULT_JOIN_CLOSES_MIN_AFTER = 10;

export function parseAssessmentConfig(raw) {
  if (!raw) return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

export function getJoinWindowSettings(assessment) {
  const cfg = parseAssessmentConfig(assessment?.config);
  const jw = cfg.joinWindow || {};
  const opens = Number(jw.opensMinutesBeforeStart);
  const closes = Number(jw.closesMinutesAfterStart);
  return {
    opensMinutesBeforeStart:
      Number.isFinite(opens) && opens >= 0 ? opens : DEFAULT_JOIN_OPENS_MIN_BEFORE,
    closesMinutesAfterStart:
      Number.isFinite(closes) && closes >= 0 ? closes : DEFAULT_JOIN_CLOSES_MIN_AFTER,
  };
}

/**
 * @returns {{ status: 'ALLOWED'|'TOO_EARLY'|'TOO_LATE'|'UNSCHEDULED', start?: Date, end?: Date, entryOpensAt?: Date, entryClosesAt?: Date, joinWindow: object }}
 */
export function getAssessmentEntryStatus(assessment, now = new Date()) {
  const joinWindow = getJoinWindowSettings(assessment);

  if (!assessment?.startTime) {
    return { status: 'UNSCHEDULED', joinWindow };
  }

  const start = new Date(assessment.startTime);
  if (Number.isNaN(start.getTime())) {
    return { status: 'UNSCHEDULED', joinWindow };
  }

  const end = assessment.endTime ? new Date(assessment.endTime) : null;
  const entryOpensAt = new Date(
    start.getTime() - joinWindow.opensMinutesBeforeStart * 60 * 1000
  );
  let entryClosesAt = new Date(
    start.getTime() + joinWindow.closesMinutesAfterStart * 60 * 1000
  );

  if (end && !Number.isNaN(end.getTime()) && end.getTime() < entryClosesAt.getTime()) {
    entryClosesAt = end;
  }

  const nowMs = now.getTime();
  if (nowMs < entryOpensAt.getTime()) {
    return { status: 'TOO_EARLY', start, end, entryOpensAt, entryClosesAt, joinWindow };
  }
  if (nowMs > entryClosesAt.getTime()) {
    return { status: 'TOO_LATE', start, end, entryOpensAt, entryClosesAt, joinWindow };
  }
  return { status: 'ALLOWED', start, end, entryOpensAt, entryClosesAt, joinWindow };
}

export function formatAssessmentWindow(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '';
  }
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function joinWindowSummary(assessment) {
  const entry = getAssessmentEntryStatus(assessment);
  if (entry.status === 'UNSCHEDULED') {
    return 'No scheduled start — students can join anytime.';
  }
  const { joinWindow } = entry;
  return `Join opens ${joinWindow.opensMinutesBeforeStart} min before start (${formatAssessmentWindow(entry.entryOpensAt)}). Last join by ${formatAssessmentWindow(entry.entryClosesAt)} (${joinWindow.closesMinutesAfterStart} min after start).`;
}
