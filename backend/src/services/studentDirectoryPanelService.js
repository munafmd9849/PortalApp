/**
 * Student directory side panel — mock interviews & assessments (read-time).
 */

import prisma from '../config/database.js';
import { feedbackScorePercent } from '../utils/mockInterviewFeedback.js';

const COMPLETED_MOCK_STATUSES = ['COMPLETED'];

/** Statuses written by assessment submit / review flows (schema comment may differ). */
const PANEL_ASSESSMENT_STATUSES = [
  'COMPLETED',
  'PENDING_REVIEW',
  'SUBMITTED',
  'AUTO_SUBMITTED',
  'TERMINATED',
  'IN_PROGRESS',
];

function formatInterview(slot) {
  const fb = slot.feedback;
  const score = feedbackScorePercent(fb);
  return {
    id: slot.id,
    driveTitle: slot.drive?.title || 'Mock Interview',
    driveCategory: slot.drive?.category || null,
    date: slot.startTime,
    endTime: slot.endTime,
    status: slot.status,
    score: score != null ? `${score}%` : null,
    scorePercent: score,
    result: fb?.result || null,
    remarks: fb?.detailedRemarks || null,
    ratings: fb
      ? {
          communication: fb.communication,
          confidence: fb.confidence,
          technicalSkills: fb.technicalSkills,
          problemSolving: fb.problemSolving,
          bodyLanguage: fb.bodyLanguage,
          resumeKnowledge: fb.resumeKnowledge,
          overallPerformance: fb.overallPerformance,
        }
      : null,
  };
}

/** Completed mock interviews with interviewer feedback (newest first). */
export function buildMockInterviewsFromSlots(slots) {
  const completed = (slots || [])
    .filter((s) => COMPLETED_MOCK_STATUSES.includes(s.status) && s.feedback)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .map(formatInterview);

  const latest = completed[0];
  let summaryLabel = '--';
  if (completed.length === 1 && latest?.score) {
    summaryLabel = latest.score;
  } else if (completed.length === 1) {
    summaryLabel = '1 done';
  } else if (completed.length > 1) {
    summaryLabel = latest?.score
      ? `${completed.length} · ${latest.score}`
      : `${completed.length} done`;
  }

  return {
    interviews: completed,
    completedCount: completed.length,
    summaryLabel,
  };
}

export function appendMockEventsFromSlots(events, slots) {
  (slots || []).forEach((slot) => {
    if (!COMPLETED_MOCK_STATUSES.includes(slot.status) || !slot.feedback) return;
    const score = feedbackScorePercent(slot.feedback);
    events.push({
      type: 'MOCK_INTERVIEW',
      subtype: slot.drive?.category || null,
      at: slot.endTime || slot.startTime,
      meta: {
        marks: score,
        status: slot.feedback.result,
        remarks: slot.feedback.detailedRemarks,
        driveTitle: slot.drive?.title,
        slotId: slot.id,
        synthetic: true,
        source: 'mock_interview_slot',
      },
    });
  });
  return events;
}

function formatAssessmentSession(session) {
  const a = session.assessment;
  return {
    id: session.id,
    assessmentId: session.assessmentId,
    title: a?.title || 'Assessment',
    type: a?.type || null,
    difficulty: a?.difficulty || null,
    status: session.status,
    score: session.score != null ? Math.round(session.score) : null,
    startTime: session.startTime,
    endTime: session.endTime,
    violationsCount: session.violationsCount,
    riskLevel: session.riskLevel,
  };
}

export async function getStudentPanelExtras(studentId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });
  if (!student) return null;

  const [mockSlots, assessmentSessions] = await Promise.all([
    prisma.mockInterviewSlot.findMany({
      where: {
        studentId,
        status: { in: COMPLETED_MOCK_STATUSES },
      },
      orderBy: { startTime: 'desc' },
      include: {
        feedback: true,
        drive: { select: { id: true, title: true, category: true, date: true } },
      },
    }),
    prisma.assessmentSession.findMany({
      where: {
        studentId,
        status: { in: PANEL_ASSESSMENT_STATUSES },
      },
      orderBy: { startTime: 'desc' },
      take: 50,
      include: {
        assessment: {
          select: { id: true, title: true, type: true, difficulty: true },
        },
      },
    }),
  ]);

  const mockInterviews = buildMockInterviewsFromSlots(mockSlots);

  return {
    mockInterviews,
    assessments: assessmentSessions.map(formatAssessmentSession),
  };
}
