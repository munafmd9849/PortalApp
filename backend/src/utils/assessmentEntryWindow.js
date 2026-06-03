export const ENTRY_EARLY_GRACE_MIN = 10;
export const ENTRY_LATE_GRACE_MIN = 5;

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
    return { status: 'TOO_EARLY' };
  }

  let entryDeadline;
  if (end && !Number.isNaN(end.getTime()) && end > start) {
    entryDeadline = end;
  } else {
    entryDeadline = new Date(start.getTime() + ENTRY_LATE_GRACE_MIN * 60 * 1000);
  }

  if (now.getTime() > entryDeadline.getTime()) {
    return { status: 'TOO_LATE' };
  }

  return { status: 'ALLOWED' };
}

export function parseAssessmentDateInput(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
