/**
 * Student directory side panel — authoritative admin profile view (DB-backed).
 */

import prisma from '../config/database.js';
import { feedbackScorePercent } from '../utils/mockInterviewFeedback.js';
import {
  fetchActiveJobSkills,
  fetchCohortStats,
  loadResumesForUsers,
  scoreStudentRecord,
} from './placementReadinessService.js';

const COMPLETED_MOCK_STATUSES = ['COMPLETED'];
const PLACED_STATUSES = ['SELECTED', 'ACCEPTED', 'OFFERED'];
const SCREENING_QUALIFIED = ['RESUME_SELECTED', 'SCREENING_SELECTED', 'TEST_SELECTED', 'INTERVIEW_ELIGIBLE'];

/** Statuses written by assessment submit / review flows (schema comment may differ). */
const PANEL_ASSESSMENT_STATUSES = [
  'COMPLETED',
  'PENDING_REVIEW',
  'SUBMITTED',
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

function computeFunnelFromApplications(applications) {
  let shortlisted = 0;
  let interviewed = 0;
  let offers = 0;

  (applications || []).forEach((app) => {
    const status = (app.status || '').toUpperCase();
    const screening = (app.screeningStatus || '').toUpperCase();
    const interviewStatus = (app.interviewStatus || '').toUpperCase();

    if (
      PLACED_STATUSES.includes(status)
      || PLACED_STATUSES.includes(interviewStatus)
    ) {
      offers += 1;
    }

    if (
      (app.lastRoundReached || 0) > 0
      || interviewStatus.startsWith('REJECTED_IN_ROUND_')
      || interviewStatus === 'SELECTED'
      || status === 'INTERVIEWED'
    ) {
      interviewed += 1;
    }

    if (
      SCREENING_QUALIFIED.includes(screening)
      || ['SHORTLISTED', 'INTERVIEWED', ...PLACED_STATUSES].includes(status)
    ) {
      shortlisted += 1;
    }
  });

  return {
    applied: applications?.length || 0,
    shortlisted,
    interviewed,
    offers,
  };
}

function resolveFunnelStats(student, applications) {
  const derived = computeFunnelFromApplications(applications);
  return {
    applied: Math.max(student.statsApplied ?? 0, derived.applied),
    shortlisted: Math.max(student.statsShortlisted ?? 0, derived.shortlisted),
    interviewed: Math.max(student.statsInterviewed ?? 0, derived.interviewed),
    offers: Math.max(student.statsOffers ?? 0, derived.offers),
  };
}

function formatApplicationForPanel(app) {
  const companyName = app.job?.company?.name || app.job?.companyName || null;
  return {
    id: app.id,
    status: app.status,
    screeningStatus: app.screeningStatus,
    interviewStatus: app.interviewStatus,
    appliedDate: app.appliedDate,
    createdAt: app.createdAt || app.appliedDate,
    lastRoundReached: app.lastRoundReached,
    jobTitle: app.job?.jobTitle || null,
    companyName,
    location: app.job?.location || null,
    job: app.job
      ? {
          id: app.job.id,
          jobTitle: app.job.jobTitle,
          title: app.job.jobTitle,
          location: app.job.location || null,
          company: companyName ? { name: companyName } : app.job.company,
        }
      : null,
  };
}

function hasMetricsInputs(student, applications, assessments, mockInterviews) {
  if (student.profileCompleted) return true;
  if ((applications?.length || 0) > 0) return true;
  if ((student.skills?.length || 0) > 0) return true;
  if (student.cgpa != null && (student.resumeUrl || student.resumeFiles?.length)) return true;
  if ((assessments?.length || 0) > 0) return true;
  if ((mockInterviews?.completedCount || 0) > 0) return true;
  return false;
}

const panelStudentInclude = {
  user: {
    select: {
      profilePhoto: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      status: true,
    },
  },
  skills: { orderBy: { skillName: 'asc' } },
  education: { orderBy: { endYear: 'desc' } },
  projects: { orderBy: { createdAt: 'desc' } },
  achievements: { orderBy: { createdAt: 'desc' } },
  certifications: { orderBy: { issuedDate: 'desc' } },
  experiences: { orderBy: { start: 'desc' } },
  resumeFiles: { take: 5 },
  applications: {
    include: {
      job: { include: { company: true } },
    },
    orderBy: { appliedDate: 'desc' },
  },
  endorsements: { select: { overallRating: true, verified: true } },
  interviewEvaluations: { select: { status: true, marks: true, roundName: true, evaluatedAt: true } },
  jobTracking: { select: { viewed: true, applied: true, createdAt: true } },
};

/**
 * Full admin student profile panel — single source of truth from persisted records.
 */
export async function getAdminStudentProfilePanel(studentId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: panelStudentInclude,
  });
  if (!student) return null;

  const [mockSlots, assessmentSessions, activeJobSkills, resumeByUserId, cohortStats] = await Promise.all([
    prisma.mockInterviewSlot.findMany({
      where: { studentId, status: { in: COMPLETED_MOCK_STATUSES } },
      orderBy: { startTime: 'desc' },
      include: {
        feedback: true,
        drive: { select: { id: true, title: true, category: true, date: true } },
      },
    }),
    prisma.assessmentSession.findMany({
      where: { studentId, status: { in: PANEL_ASSESSMENT_STATUSES } },
      orderBy: { startTime: 'desc' },
      take: 50,
      include: {
        assessment: { select: { id: true, title: true, type: true, difficulty: true } },
      },
    }),
    fetchActiveJobSkills(),
    loadResumesForUsers([student.userId]),
    fetchCohortStats(student.school, student.batch),
  ]);

  const mockInterviews = buildMockInterviewsFromSlots(mockSlots);
  const assessments = assessmentSessions.map(formatAssessmentSession);
  const applications = (student.applications || []).map(formatApplicationForPanel);
  const funnelStats = resolveFunnelStats(student, student.applications || []);
  const topEducation = student.education?.[0] || null;

  const metricsAvailable = hasMetricsInputs(student, student.applications, assessments, mockInterviews);
  let placementReadiness = null;
  let placementProbability = null;

  if (metricsAvailable) {
    const cohortKey = `${(student.school || '').toLowerCase()}|${(student.batch || '').toLowerCase()}`;
    const scored = scoreStudentRecord(
      student,
      activeJobSkills,
      { [cohortKey]: cohortStats },
      resumeByUserId,
    );
    placementReadiness = scored.readiness;
    placementProbability = scored.probability;
  }

  const userStatus = (student.user?.status || 'ACTIVE').toUpperCase();

  return {
    profile: {
      id: student.id,
      userId: student.userId,
      fullName: student.fullName,
      email: student.email,
      phone: student.phone,
      enrollmentId: student.enrollmentId,
      school: student.school,
      center: student.center,
      batch: student.batch,
      cgpa: student.cgpa,
      bio: student.bio,
      headline: student.headline,
      summary: student.summary,
      linkedin: student.linkedin,
      githubUrl: student.githubUrl,
      city: student.city,
      stateRegion: student.stateRegion,
      profileCompleted: student.profileCompleted,
      profilePhoto: student.user?.profilePhoto || null,
      emailVerified: Boolean(student.user?.emailVerified || student.user?.lastLoginAt),
      createdAt: student.user?.createdAt || student.createdAt,
      status: userStatus === 'BLOCKED' ? 'Blocked' : userStatus === 'ACTIVE' ? 'Active' : 'Inactive',
      statsApplied: student.statsApplied,
      statsShortlisted: student.statsShortlisted,
      statsInterviewed: student.statsInterviewed,
      statsOffers: student.statsOffers,
      publicProfileId: student.publicProfileId,
    },
    program: topEducation?.degree || null,
    branch: topEducation?.description || null,
    currentLocation: [student.city, student.stateRegion].filter(Boolean).join(', ') || student.center || null,
    education: student.education || [],
    skills: student.skills || [],
    projects: student.projects || [],
    achievements: student.achievements || [],
    certifications: student.certifications || [],
    experiences: student.experiences || [],
    applications,
    funnelStats,
    placementReadiness,
    placementProbability,
    metricsAvailable,
    mockInterviews,
    assessments,
  };
}

export async function getStudentPanelExtras(studentId) {
  const panel = await getAdminStudentProfilePanel(studentId);
  if (!panel) return null;
  return {
    ...panel,
  };
}
