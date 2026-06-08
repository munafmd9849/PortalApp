/**
 * Student Directory metrics — computed at read time from activity_logs,
 * application_history (Application), interview_tracking, and profile_data.
 * CS Status, Activity Score, and Placement Status are never persisted on Student.
 */

import prisma from '../config/database.js';
import {
  appendMockEventsFromSlots,
  buildMockInterviewsFromSlots,
} from './studentDirectoryPanelService.js';
import {
  buildStudentFilterWhere,
  scoreStudentRecord,
  fetchActiveJobSkills,
  loadResumesForUsers,
  loadCohortStatsMap,
  computeProfileCompletionScore,
  computeInterviewAttendanceScore,
  computeResumeQualityScore,
} from './placementReadinessService.js';

const MS_DAY = 24 * 60 * 60 * 1000;

export const DIRECTORY_CONFIG = {
  INACTIVITY_DAYS_BLOCK: parseInt(process.env.DIRECTORY_INACTIVITY_DAYS || '45', 10),
  NO_SHOW_BLOCK_THRESHOLD: parseInt(process.env.DIRECTORY_NO_SHOW_THRESHOLD || '3', 10),
  APPLICATION_WINDOW_DAYS: 30,
};

export const ACTIVITY_WEIGHTS = {
  loginFrequency: 20,
  applications30d: 25,
  resumeUpdates: 10,
  interviewAttendance: 20,
  profileCompletion: 15,
  platformEngagement: 10,
};

const PLACED_STATUSES = ['SELECTED', 'ACCEPTED', 'OFFERED'];
const CLOSED_STATUSES = ['REJECTED', 'WITHDRAWN', 'CLOSED', 'NOT_SELECTED'];
const NO_SHOW_MARKERS = ['NO_SHOW', 'ABSENT'];

const studentIncludeForDirectory = {
  user: {
    select: {
      status: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
      blockInfo: true,
    },
  },
  skills: true,
  education: { orderBy: { endYear: 'desc' }, take: 1 },
  resumeFiles: { take: 5 },
  applications: {
    select: {
      id: true,
      status: true,
      screeningStatus: true,
      interviewStatus: true,
      pipelineStatus: true,
      pipelineSubStatus: true,
      appliedDate: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  endorsements: { select: { overallRating: true, verified: true } },
  interviewEvaluations: { select: { status: true, marks: true, roundName: true, evaluatedAt: true } },
  jobTracking: { select: { viewed: true, applied: true, createdAt: true } },
  activityLogs: {
    orderBy: { occurredAt: 'desc' },
    take: 200,
  },
  mockInterviewSlots: {
    where: { status: 'COMPLETED' },
    orderBy: { startTime: 'desc' },
    include: {
      feedback: true,
      drive: { select: { title: true, category: true } },
    },
  },
};

/** SQLite-safe filter (no mode: insensitive). */
export function buildDirectoryWhere(query = {}) {
  const where = buildStudentFilterWhere(query);
  const stripMode = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(stripMode);
    const next = { ...obj };
    if ('mode' in next) delete next.mode;
    Object.keys(next).forEach((k) => {
      if (typeof next[k] === 'object') next[k] = stripMode(next[k]);
    });
    return next;
  };
  return stripMode(where);
}

function daysAgo(date) {
  if (!date) return Infinity;
  return (Date.now() - new Date(date).getTime()) / MS_DAY;
}

function clamp(n, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function parseMeta(raw) {
  if (!raw) return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

/**
 * Merge persisted activity_logs with synthetic events from core tables.
 */
export function buildActivityTimeline(student, user) {
  const events = [];

  (student.activityLogs || []).forEach((log) => {
    events.push({
      type: log.eventType,
      subtype: log.eventSubtype,
      at: log.occurredAt,
      meta: parseMeta(log.metadata),
    });
  });

  if (user?.lastLoginAt) {
    events.push({ type: 'LOGIN', subtype: null, at: user.lastLoginAt, meta: { synthetic: true } });
  }
  if (student.resumeUploadedAt) {
    events.push({
      type: 'RESUME_UPDATE',
      subtype: null,
      at: student.resumeUploadedAt,
      meta: { synthetic: true },
    });
  }

  (student.applications || []).forEach((app) => {
    events.push({
      type: 'APPLICATION',
      subtype: app.status,
      at: app.appliedDate || app.createdAt,
      meta: { jobId: app.id, synthetic: true },
    });
  });

  (student.jobTracking || []).forEach((jt) => {
    if (jt.viewed) {
      events.push({
        type: 'PLATFORM_ENGAGEMENT',
        subtype: 'JOB_VIEW',
        at: jt.createdAt,
        meta: { synthetic: true },
      });
    }
  });

  appendMockEventsFromSlots(events, student.mockInterviewSlots);

  return events.sort((a, b) => new Date(b.at) - new Date(a.at));
}

function scoreLoginFrequency(user) {
  const d = daysAgo(user?.lastLoginAt);
  if (d <= 7) return 100;
  if (d <= 14) return 85;
  if (d <= 30) return 60;
  if (d <= 60) return 35;
  return 0;
}

function scoreApplications30d(applications) {
  const cutoff = Date.now() - DIRECTORY_CONFIG.APPLICATION_WINDOW_DAYS * MS_DAY;
  const count = (applications || []).filter((a) => {
    const t = new Date(a.appliedDate || a.createdAt).getTime();
    return t >= cutoff;
  }).length;
  return clamp(count * 25);
}

function scoreResumeUpdates(student) {
  if (!student.resumeUploadedAt && !(student.resumeFiles?.length)) return 0;
  const d = daysAgo(student.resumeUploadedAt || student.updatedAt);
  if (d <= 30) return 100;
  if (d <= 90) return 70;
  if (d <= 180) return 40;
  return 15;
}

function scorePlatformEngagement(jobTracking) {
  const viewed = (jobTracking || []).filter((j) => j.viewed).length;
  const applied = (jobTracking || []).filter((j) => j.applied).length;
  return clamp(viewed * 8 + applied * 12);
}

export function computeActivityScore(student, user, resumeRecord) {
  const components = {
    loginFrequency: scoreLoginFrequency(user),
    applications30d: scoreApplications30d(student.applications),
    resumeUpdates: scoreResumeUpdates(student),
    interviewAttendance: computeInterviewAttendanceScore(
      student.applications,
      student.interviewEvaluations,
    ),
    profileCompletion: computeProfileCompletionScore(student),
    platformEngagement: scorePlatformEngagement(student.jobTracking),
  };

  let total = 0;
  Object.entries(ACTIVITY_WEIGHTS).forEach(([key, weight]) => {
    total += (components[key] || 0) * (weight / 100);
  });

  const score = round1(total);
  let tier = 'HIGH_RISK';
  if (score >= 70) tier = 'ACTIVE';
  else if (score >= 50) tier = 'MODERATE';
  else if (score >= 30) tier = 'INACTIVE';

  return { score, tier, components };
}

function countNoShows(applications) {
  return (applications || []).filter((a) => {
    const st = (a.status || '').toUpperCase();
    const iv = (a.interviewStatus || '').toUpperCase();
    const sub = (a.pipelineSubStatus || '').toUpperCase();
    return NO_SHOW_MARKERS.some((m) => st.includes(m) || iv.includes(m) || sub.includes(m));
  }).length;
}

function countClosedApplications(applications) {
  return (applications || []).filter((a) => {
    const st = (a.status || '').toUpperCase();
    const pipe = (a.pipelineStatus || '').toUpperCase();
    return CLOSED_STATUSES.includes(st) || pipe === 'CLOSED';
  }).length;
}

export function computePlacementStatus(student, applications) {
  const apps = applications || [];
  if (student.statsOffers > 0 || apps.some((a) => PLACED_STATUSES.includes((a.status || '').toUpperCase()))) {
    return { label: 'Placed', code: 'PLACED', variant: 'green' };
  }
  const active = apps.filter((a) => {
    const st = (a.status || '').toUpperCase();
    return !CLOSED_STATUSES.includes(st) && st !== 'WITHDRAWN';
  });
  if (active.length > 0) {
    return { label: 'In Process', code: 'IN_PROCESS', variant: 'blue' };
  }
  return { label: 'Unplaced', code: 'UNPLACED', variant: 'pink' };
}

export function computeCsStatus(student, user, activity, placementStatus, noShows) {
  const userStatus = (user?.status || '').toUpperCase();

  if (userStatus === 'BLOCKED') {
    return { label: 'Blocked', code: 'BLOCKED', variant: 'red' };
  }

  const inactiveDays = daysAgo(user?.lastLoginAt);
  if (
    noShows >= DIRECTORY_CONFIG.NO_SHOW_BLOCK_THRESHOLD
    || inactiveDays >= DIRECTORY_CONFIG.INACTIVITY_DAYS_BLOCK
  ) {
    return { label: 'High Risk', code: 'HIGH_RISK', variant: 'red' };
  }

  if (student.profileCompleted && (user?.emailVerified || user?.lastLoginAt)) {
    if (activity.tier === 'ACTIVE') {
      return { label: 'Active', code: 'ACTIVE', variant: 'green' };
    }
    if (activity.tier === 'MODERATE') {
      return { label: 'Onboarded', code: 'ONBOARDED', variant: 'yellow' };
    }
  }

  const tierMap = {
    ACTIVE: { label: 'Active', code: 'ACTIVE', variant: 'green' },
    MODERATE: { label: 'Onboarded', code: 'ONBOARDED', variant: 'yellow' },
    INACTIVE: { label: 'Inactive', code: 'INACTIVE', variant: 'pink' },
    HIGH_RISK: { label: 'High Risk', code: 'HIGH_RISK', variant: 'red' },
  };

  return tierMap[activity.tier] || tierMap.HIGH_RISK;
}

export function computeActivation(student, user) {
  const activated = Boolean(
    student.profileCompleted && (user?.emailVerified || user?.lastLoginAt),
  );
  const userActive = (user?.status || '').toUpperCase() === 'ACTIVE';
  return {
    label: activated && userActive ? 'Active' : 'Inactive',
    code: activated && userActive ? 'ACTIVE' : 'INACTIVE',
    variant: activated && userActive ? 'green' : 'pink',
  };
}

export function computeRiskFlags(student, user, activity, applications, resumeRecord) {
  const flags = [];
  const noShows = countNoShows(applications);
  const apps30 = scoreApplications30d(applications);

  if (daysAgo(user?.lastLoginAt) > 30) {
    flags.push({ code: 'INACTIVITY', label: 'Inactivity', variant: 'orange' });
  }
  if (apps30 < 25) {
    flags.push({ code: 'LOW_APPLICATIONS', label: 'Low applications', variant: 'orange' });
  }
  const rejections = (applications || []).filter((a) =>
    ['REJECTED', 'NOT_SELECTED'].includes((a.status || '').toUpperCase()),
  ).length;
  if (rejections >= 3) {
    flags.push({ code: 'REPEATED_REJECTIONS', label: 'Repeated rejections', variant: 'red' });
  }
  const resumeScore = computeResumeQualityScore(student, resumeRecord);
  if (resumeScore < 40) {
    flags.push({ code: 'LOW_RESUME', label: 'Low resume quality', variant: 'red' });
  }
  if (noShows >= 2) {
    flags.push({ code: 'NO_SHOWS', label: 'Interview no-shows', variant: 'red' });
  }
  if (activity.tier === 'HIGH_RISK') {
    flags.push({ code: 'HIGH_RISK', label: 'High risk activity', variant: 'red' });
  }

  const blockInfo = user?.blockInfo;
  if (blockInfo && String(blockInfo).toLowerCase().includes('fraud')) {
    flags.push({ code: 'FRAUD', label: 'Document flag', variant: 'red' });
  }

  return flags;
}

export function mapStudentToDirectoryRow(
  student,
  activeJobSkills,
  cohortStatsByKey,
  resumeByUserId,
  srOffset = 0,
) {
  const user = student.user || {};
  const resumeRecord = resumeByUserId[student.userId] || null;
  const { readiness, probability } = scoreStudentRecord(
    student,
    activeJobSkills,
    cohortStatsByKey,
    resumeByUserId,
  );

  const activity = computeActivityScore(student, user, resumeRecord);
  const applications = student.applications || [];
  const noShows = countNoShows(applications);
  const placementStatus = computePlacementStatus(student, applications);
  const csStatus = computeCsStatus(student, user, activity, placementStatus, noShows);
  const activation = computeActivation(student, user);
  const riskFlags = computeRiskFlags(student, user, activity, applications, resumeRecord);
  const events = buildActivityTimeline(student, user);
  const mockInterviews = buildMockInterviewsFromSlots(student.mockInterviewSlots);

  const jobsApplied = applications.length || student.statsApplied || 0;
  const eligibleJobs = Math.max(student.jobTracking?.length || 0, jobsApplied);
  const jobsAssigned = student.jobTracking?.length || 0;
  const appliedClosed = countClosedApplications(applications);
  const unapplied = Math.max(0, eligibleJobs - jobsApplied);

  const topEducation = student.education?.[0];
  const program = topEducation?.degree || student.school || '—';
  const userStatus = (user.status || 'ACTIVE').toUpperCase();

  return {
    id: student.id,
    userId: student.userId,
    srNo: srOffset,
    fullName: student.fullName,
    email: student.email,
    phone: student.phone,
    enrollmentId: student.enrollmentId,
    program,
    cohort: student.batch || '—',
    currentLocation: [student.city, student.stateRegion].filter(Boolean).join(', ') || student.center || '—',
    contactNumber: student.phone,
    csStatus,
    activation,
    activityScore: activity.score,
    activityTier: activity.tier,
    activityComponents: activity.components,
    placementStatus,
    placementReadiness: readiness,
    placementProbability: probability,
    riskFlags,
    mockInterviews: mockInterviews.summaryLabel,
    mockInterviewsCount: mockInterviews.completedCount,
    jobsAssigned,
    eligibleJobs,
    jobsApplied,
    appliedClosed,
    noShows,
    unapplied,
    center: student.center,
    school: student.school,
    cgpa: student.cgpa,
    status: userStatus === 'BLOCKED' ? 'Blocked' : userStatus === 'ACTIVE' ? 'Active' : 'Inactive',
    blockInfo: user.blockInfo,
    profileCompleted: student.profileCompleted,
    emailVerified: Boolean(user?.emailVerified || user?.lastLoginAt),
  };
}

/**
 * Paginated directory rows with all computed fields.
 */
export async function getStudentDirectory(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 50));
  const where = buildDirectoryWhere(query);

  const [activeJobSkills, total, students] = await Promise.all([
    fetchActiveJobSkills(),
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: studentIncludeForDirectory,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const userIds = students.map((s) => s.userId).filter(Boolean);
  const [resumeByUserId, cohortStatsByKey] = await Promise.all([
    loadResumesForUsers(userIds),
    loadCohortStatsMap(students),
  ]);

  const srBase = (page - 1) * limit;
  const rows = students.map((s, i) =>
    mapStudentToDirectoryRow(s, activeJobSkills, cohortStatsByKey, resumeByUserId, srBase + i + 1),
  );

  let filtered = rows;
  if (query.csStatus) {
    const code = String(query.csStatus).toUpperCase();
    filtered = filtered.filter((r) => r.csStatus.code === code);
  }
  if (query.activityTier) {
    filtered = filtered.filter((r) => r.activityTier === String(query.activityTier).toUpperCase());
  }
  if (query.tier) {
    const t = String(query.tier).toLowerCase();
    filtered = filtered.filter((r) => r.placementReadiness?.tier === t);
  }

  return {
    students: filtered,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getStudentDirectoryExport(query = {}) {
  const exportQuery = { ...query, page: 1, limit: Math.min(2000, parseInt(query.limit, 10) || 1000) };
  return getStudentDirectory(exportQuery);
}

/**
 * Record activity event (event-driven; does not store computed scores).
 */
export async function recordStudentActivity(studentId, eventType, eventSubtype = null, metadata = null) {
  return prisma.studentActivityLog.create({
    data: {
      studentId,
      eventType,
      eventSubtype,
      metadata: metadata ? JSON.stringify(metadata) : null,
      occurredAt: new Date(),
    },
  });
}
