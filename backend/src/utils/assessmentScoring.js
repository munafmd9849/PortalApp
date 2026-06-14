/**
 * Assessment session scores: store/display as 0–100 percent.
 * Legacy rows may have raw points earned (e.g. 1 of 1) — normalize on read.
 */

export function totalQuestionPoints(questions = []) {
  return questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
}

export function pointsToPercent(pointsEarned, questions = []) {
  const max = totalQuestionPoints(questions);
  if (max <= 0) return 0;
  const earned = Number(pointsEarned) || 0;
  return Math.round((earned / max) * 100);
}

/**
 * @param {number|null} stored - DB score (legacy points or percent)
 */
export function normalizeStoredScore(stored, questions = []) {
  const raw = Number(stored) || 0;
  const max = totalQuestionPoints(questions);
  if (max <= 0) return 0;
  // Legacy: value is points earned (never above max unless corrupt)
  if (raw <= max) {
    return pointsToPercent(raw, questions);
  }
  return Math.min(100, Math.round(raw));
}

export function withNormalizedScore(session) {
  if (!session) return session;
  const questions = session.assessment?.questions || [];
  const pointsEarned =
    typeof session.score === 'number' && session.score <= totalQuestionPoints(questions)
      ? session.score
      : null;
  const maxPoints = totalQuestionPoints(questions);
  const percent = normalizeStoredScore(session.score, questions);
  return {
    ...session,
    score: percent,
    scorePercent: percent,
    pointsEarned: pointsEarned ?? Math.round((percent / 100) * maxPoints),
    maxPoints,
  };
}
