/** Overall mock interview score (0–100) from interviewer ratings (1–5 each). */

export function feedbackScorePercent(feedback) {
  if (!feedback) return null;
  const dims = [
    feedback.communication,
    feedback.confidence,
    feedback.technicalSkills,
    feedback.problemSolving,
    feedback.bodyLanguage,
    feedback.resumeKnowledge,
    feedback.overallPerformance,
  ].filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (dims.length === 0) return null;
  const avg = dims.reduce((a, b) => a + b, 0) / dims.length;
  return Math.round((avg / 5) * 100);
}

const RATING_KEYS = [
  { key: 'communication', label: 'Communication' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'technicalSkills', label: 'Technical Skills' },
  { key: 'problemSolving', label: 'Problem Solving' },
  { key: 'bodyLanguage', label: 'Body Language' },
  { key: 'resumeKnowledge', label: 'Resume Knowledge' },
  { key: 'overallPerformance', label: 'Overall Performance' },
];

export function formatFeedbackRatings(feedback) {
  if (!feedback) return [];
  return RATING_KEYS.map(({ key, label }) => ({
    key,
    label,
    value: feedback[key] ?? null,
    max: 5,
  })).filter((r) => r.value != null);
}

export function buildMockSlotResult(slot) {
  const fb = slot?.feedback;
  const scorePercent = feedbackScorePercent(fb);
  let durationSeconds = null;
  if (slot?.startTime && slot?.endTime) {
    durationSeconds = Math.floor(
      (new Date(slot.endTime) - new Date(slot.startTime)) / 1000,
    );
  }
  return {
    id: slot.id,
    driveId: slot.driveId,
    status: slot.status,
    startTime: slot.startTime,
    endTime: slot.endTime,
    durationSeconds,
    scorePercent,
    drive: slot.drive
      ? {
          id: slot.drive.id,
          title: slot.drive.title,
          category: slot.drive.category,
          description: slot.drive.description,
          instructions: slot.drive.instructions,
        }
      : null,
    student: slot.student
      ? {
          id: slot.student.id,
          fullName: slot.student.fullName,
          email: slot.student.email,
          enrollmentId: slot.student.enrollmentId,
          batch: slot.student.batch,
        }
      : null,
    feedback: fb
      ? {
          id: fb.id,
          result: fb.result,
          detailedRemarks: fb.detailedRemarks,
          ratings: formatFeedbackRatings(fb),
          submittedAt: fb.createdAt ?? null,
        }
      : null,
    hasFeedback: Boolean(fb),
  };
}
