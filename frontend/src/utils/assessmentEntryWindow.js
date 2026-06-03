/** Minutes before startTime when pre-check / entry opens */
export const ENTRY_EARLY_GRACE_MIN = 10;
/** Fallback late grace after start when no endTime is set */
export const ENTRY_LATE_GRACE_MIN = 5;

/**
 * @returns {{ status: 'ALLOWED'|'TOO_EARLY'|'TOO_LATE', start?: Date, end?: Date, entryDeadline?: Date }}
 */
export function getAssessmentEntryStatus(assessment, now = new Date()) {
  if (!assessment?.startTime) {
    return { status: 'ALLOWED' };
  }

  const start = new Date(assessment.startTime);
  if (Number.isNaN(start.getTime())) {
    return { status: 'ALLOWED' };
  }

  const end = assessment.endTime ? new Date(assessment.endTime) : null;
  const minsFromStart = (now.getTime() - start.getTime()) / 60000;

  if (minsFromStart < -ENTRY_EARLY_GRACE_MIN) {
    return { status: 'TOO_EARLY', start, end };
  }

  let entryDeadline;
  if (end && !Number.isNaN(end.getTime()) && end > start) {
    entryDeadline = end;
  } else {
    entryDeadline = new Date(start.getTime() + ENTRY_LATE_GRACE_MIN * 60 * 1000);
  }

  if (now.getTime() > entryDeadline.getTime()) {
    return { status: 'TOO_LATE', start, end, entryDeadline };
  }

  return { status: 'ALLOWED', start, end, entryDeadline };
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

/** datetime-local input ↔ Date */
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
