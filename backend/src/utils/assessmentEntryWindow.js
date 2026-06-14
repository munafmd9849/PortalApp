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
 * When students may enter (pre-check + start session).
 * @returns {{
 *   status: 'ALLOWED'|'TOO_EARLY'|'TOO_LATE'|'UNSCHEDULED',
 *   start?: Date,
 *   end?: Date,
 *   entryOpensAt?: Date,
 *   entryClosesAt?: Date,
 *   joinWindow: { opensMinutesBeforeStart: number, closesMinutesAfterStart: number }
 * }}
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
    return {
      status: 'TOO_EARLY',
      start,
      end,
      entryOpensAt,
      entryClosesAt,
      joinWindow,
    };
  }

  if (nowMs > entryClosesAt.getTime()) {
    return {
      status: 'TOO_LATE',
      start,
      end,
      entryOpensAt,
      entryClosesAt,
      joinWindow,
    };
  }

  return {
    status: 'ALLOWED',
    start,
    end,
    entryOpensAt,
    entryClosesAt,
    joinWindow,
  };
}

export function mergeJoinWindowIntoConfig(existingConfig, joinWindowPatch) {
  const cfg = parseAssessmentConfig(existingConfig);
  const current = cfg.joinWindow || {};
  const opens = joinWindowPatch?.opensMinutesBeforeStart;
  const closes = joinWindowPatch?.closesMinutesAfterStart;
  return {
    ...cfg,
    joinWindow: {
      opensMinutesBeforeStart:
        opens !== undefined && opens !== ''
          ? Math.max(0, parseInt(opens, 10) || 0)
          : current.opensMinutesBeforeStart ?? DEFAULT_JOIN_OPENS_MIN_BEFORE,
      closesMinutesAfterStart:
        closes !== undefined && closes !== ''
          ? Math.max(0, parseInt(closes, 10) || 0)
          : current.closesMinutesAfterStart ?? DEFAULT_JOIN_CLOSES_MIN_AFTER,
    },
  };
}

export function parseAssessmentDateInput(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
