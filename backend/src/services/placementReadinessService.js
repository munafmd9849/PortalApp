/**
 * Placement Readiness & Probability Service
 * All metrics derived from real user activity and relational data — never manual entry.
 */

import prisma from '../config/database.js';

const PLACED_STATUSES = ['SELECTED', 'ACCEPTED', 'OFFERED'];
const SHORTLIST_STATUSES = ['SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'SELECTED', 'ACCEPTED'];
const OA_CLEARED_SCREENING = ['TEST_SELECTED', 'INTERVIEW_ELIGIBLE'];

/** Weights for placement readiness (sum = 100) */
export const READINESS_WEIGHTS = {
  profileCompletion: 20,
  resumeQuality: 20,
  interviewAttendance: 15,
  applicationActivity: 15,
  endorsements: 15,
  skillMatch: 15,
};

/** Weights for placement probability (sum = 100) */
export const PROBABILITY_WEIGHTS = {
  cgpa: 25,
  oaClearRate: 20,
  shortlistRatio: 20,
  recruiterEngagement: 15,
  historicalPatterns: 20,
};

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function parseJsonArray(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeSkill(name) {
  return String(name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// Prisma "mode: insensitive" is not supported on SQLite.
const isSqliteDb = () => (process.env.DATABASE_URL || '').toLowerCase().startsWith('file:');
const eqCI = (value) => (isSqliteDb() ? { equals: value } : { equals: value, mode: 'insensitive' });
const containsCI = (value) => (isSqliteDb() ? { contains: value } : { contains: value, mode: 'insensitive' });
const inCI = (values) => (isSqliteDb() ? { in: values } : { in: values, mode: 'insensitive' });

/**
 * Build Prisma where clause from admin query params (aligned with students controller).
 */
export function buildStudentFilterWhere(query = {}) {
  const { school, center, batch, status, search, minCgpa, maxCgpa, degree, branch } = query;
  const where = {};

  if (school) where.school = { in: school.split(',').map((s) => s.trim()).filter(Boolean) };
  if (center) where.center = { in: center.split(',').map((c) => c.trim()).filter(Boolean) };
  if (batch) where.batch = { in: batch.split(',').map((b) => b.trim()).filter(Boolean) };

  if (status) {
    const statusFilter = status.trim().toUpperCase();
    if (statusFilter === 'ACTIVE') where.user = { status: 'ACTIVE' };
    else if (statusFilter === 'BLOCKED') where.user = { status: 'BLOCKED' };
    else if (statusFilter === 'INACTIVE') where.user = { status: { in: ['INACTIVE', 'PENDING', 'REJECTED'] } };
    else where.user = { status: statusFilter };
  }

  if (degree || branch) {
    const educationConditions = {};
    if (degree) educationConditions.degree = containsCI(degree.trim());
    if (branch) educationConditions.description = containsCI(branch.trim());
    if (Object.keys(educationConditions).length) where.education = { some: educationConditions };
  }

  if (search) {
    const searchTerm = search.trim();
    where.OR = [
      { fullName: containsCI(searchTerm) },
      { email: containsCI(searchTerm) },
      { enrollmentId: containsCI(searchTerm) },
    ];
  }

  if (minCgpa || maxCgpa) {
    where.cgpa = {};
    if (minCgpa) where.cgpa.gte = parseFloat(minCgpa);
    if (maxCgpa) where.cgpa.lte = parseFloat(maxCgpa);
  }

  return where;
}

/**
 * Resume quality proxy from stored data (no AI call per request).
 */
export function computeResumeQualityScore(student, resumeRecord) {
  let score = 0;
  const hasUploaded = Boolean(student.resumeUrl) || (student.resumeFiles?.length > 0);
  const hasBuilder = Boolean(resumeRecord?.originalText?.trim() || resumeRecord?.enhancedText?.trim());
  if (hasUploaded) score += 45;
  if (hasBuilder) score += 25;
  if (student.resumeFiles?.length > 1) score += 10;
  if (student.linkedin) score += 10;
  if (student.githubUrl) score += 10;
  return clamp(score);
}

/**
 * Profile completion from profileCompleted flag + field coverage.
 */
export function computeProfileCompletionScore(student) {
  if (student.profileCompleted) return 100;

  const checks = [
    Boolean(student.fullName?.trim()),
    Boolean(student.email?.trim()),
    Boolean(student.phone?.trim()),
    Boolean(student.bio?.trim() || student.summary?.trim() || student.headline?.trim()),
    Boolean(student.cgpa != null),
    Boolean(student.resumeUrl || student.resumeFiles?.length),
    Boolean(student.linkedin || student.githubUrl),
    (student.skills?.length || 0) >= 3,
    (student.projects?.length || 0) >= 1,
    (student.education?.length || 0) >= 1,
  ];
  const filled = checks.filter(Boolean).length;
  return clamp(Math.round((filled / checks.length) * 100));
}

export function computeInterviewAttendanceScore(applications, interviewEvaluations) {
  const interviewedApps = applications.filter((a) => {
    const s = (a.status || '').toUpperCase();
    const is = (a.interviewStatus || '').toUpperCase();
    return SHORTLIST_STATUSES.includes(s) || s === 'INTERVIEWED' || ['INTERVIEWED', 'SELECTED', 'OFFERED'].includes(is);
  });
  const scheduledCount = Math.max(interviewedApps.length, interviewEvaluations.length, 1);
  const attended = interviewEvaluations.filter((e) => {
    const st = (e.status || '').toUpperCase();
    return !['ABSENT', 'NO_SHOW', 'CANCELLED'].includes(st);
  }).length;
  const roundCompleted = applications.filter((a) => (a.lastRoundReached || 0) > 0).length;
  const base = interviewedApps.length > 0
    ? (attended / scheduledCount) * 70 + (roundCompleted / interviewedApps.length) * 30
    : roundCompleted > 0 ? 40 : 0;
  return clamp(base);
}

export function computeApplicationActivityScore(student, applications, jobTracking) {
  const applied = applications.length || student.statsApplied || 0;
  const recentApps = applications.filter((a) => {
    const d = new Date(a.appliedDate || a.createdAt);
    const monthsAgo = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsAgo <= 3;
  }).length;
  const views = jobTracking.filter((t) => t.viewed).length;
  const appliedTracking = jobTracking.filter((t) => t.applied).length;

  let score = 0;
  score += Math.min(applied * 8, 40);
  score += Math.min(recentApps * 10, 30);
  score += Math.min(views * 2, 15);
  score += Math.min(appliedTracking * 5, 15);
  return clamp(score);
}

export function computeEndorsementScore(endorsements) {
  if (!endorsements?.length) return 0;
  const verified = endorsements.filter((e) => e.verified).length;
  const ratings = endorsements
    .map((e) => e.overallRating)
    .filter((r) => r != null && r > 0);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const countScore = Math.min(endorsements.length * 12, 50);
  const verifiedScore = Math.min((verified / endorsements.length) * 25, 25);
  const ratingScore = avgRating > 0 ? (avgRating / 5) * 25 : 0;
  return clamp(countScore + verifiedScore + ratingScore);
}

export function computeSkillMatchScore(studentSkills, activeJobSkills) {
  if (!studentSkills?.length || !activeJobSkills?.length) return studentSkills?.length ? 25 : 0;
  const studentSet = new Set(studentSkills.map((s) => normalizeSkill(s.skillName)));
  const jobSet = activeJobSkills.map(normalizeSkill).filter(Boolean);
  if (!jobSet.length) return 50;
  const matched = jobSet.filter((js) => [...studentSet].some((ss) => ss.includes(js) || js.includes(ss)));
  const overlap = matched.length / jobSet.length;
  const avgRating = studentSkills.reduce((sum, s) => sum + (s.rating || 1), 0) / studentSkills.length;
  const ratingBonus = (avgRating / 5) * 20;
  return clamp(overlap * 80 + ratingBonus);
}

export function computePlacementReadiness(student, context) {
  const { applications, interviewEvaluations, endorsements, resumeRecord, jobTracking, activeJobSkills } = context;

  const components = {
    profileCompletion: computeProfileCompletionScore(student),
    resumeQuality: computeResumeQualityScore(student, resumeRecord),
    interviewAttendance: computeInterviewAttendanceScore(applications, interviewEvaluations),
    applicationActivity: computeApplicationActivityScore(student, applications, jobTracking),
    endorsements: computeEndorsementScore(endorsements),
    skillMatch: computeSkillMatchScore(student.skills, activeJobSkills),
  };

  let total = 0;
  Object.entries(READINESS_WEIGHTS).forEach(([key, weight]) => {
    total += (components[key] / 100) * weight;
  });

  return {
    score: round1(total),
    components,
    tier: total >= 75 ? 'ready' : total >= 50 ? 'developing' : 'at_risk',
  };
}

export function computePlacementProbability(student, context) {
  const { applications, cohortStats } = context;
  const applied = applications.length || student.statsApplied || 0;
  const cgpaVal = student.cgpa != null ? parseFloat(student.cgpa) : 0;

  const cgpaScore = cgpaVal > 0 ? clamp((cgpaVal / 10) * 100) : 0;

  const oaEligible = applications.filter((a) =>
    OA_CLEARED_SCREENING.includes((a.screeningStatus || '').toUpperCase()),
  ).length;
  const oaClearRate = applied > 0 ? (oaEligible / applied) * 100 : 0;

  const shortlisted = applications.filter((a) =>
    SHORTLIST_STATUSES.includes((a.status || '').toUpperCase()),
  ).length;
  const shortlistRatio = applied > 0 ? (shortlisted / applied) * 100 : 0;

  const engaged = applications.filter((a) => {
    const s = (a.status || '').toUpperCase();
    return SHORTLIST_STATUSES.includes(s) || (a.lastRoundReached || 0) > 0;
  }).length;
  const recruiterEngagement = applied > 0 ? (engaged / applied) * 100 : 0;

  const placed = applications.filter((a) =>
    PLACED_STATUSES.includes((a.status || '').toUpperCase()) ||
    PLACED_STATUSES.includes((a.interviewStatus || '').toUpperCase()),
  ).length;
  const studentPlacementRate = applied > 0 ? (placed / applied) * 100 : 0;
  const cohortRate = cohortStats?.placementRate ?? 0;
  const historicalPatterns = clamp(cohortRate * 0.4 + studentPlacementRate * 0.6);

  const components = {
    cgpa: round1(cgpaScore),
    oaClearRate: round1(oaClearRate),
    shortlistRatio: round1(shortlistRatio),
    recruiterEngagement: round1(recruiterEngagement),
    historicalPatterns: round1(historicalPatterns),
  };

  let total = 0;
  Object.entries(PROBABILITY_WEIGHTS).forEach(([key, weight]) => {
    total += (components[key] / 100) * weight;
  });

  return {
    score: round1(total),
    components,
    tier: total >= 70 ? 'high' : total >= 45 ? 'medium' : 'low',
  };
}

/**
 * Fetch aggregated skills from active posted jobs.
 */
export async function fetchActiveJobSkills() {
  const postedStatus = eqCI('POSTED');
  const jobs = await prisma.job.findMany({
    where: {
      OR: [{ isPosted: true }, { status: postedStatus }],
      isActive: true,
    },
    select: { requiredSkills: true },
    take: 200,
  });
  const skills = new Set();
  jobs.forEach((job) => {
    parseJsonArray(job.requiredSkills).forEach((s) => {
      const name = typeof s === 'string' ? s : s?.name || s?.skill;
      if (name) skills.add(normalizeSkill(name));
    });
  });
  return [...skills];
}

/**
 * Cohort placement rate for school + batch (historical pattern).
 */
export async function fetchCohortStats(school, batch) {
  if (!school && !batch) {
    return { placementRate: 0, applicationRate: 0 };
  }
  const where = {};
  if (school) {
    where.school = eqCI(school);
  }
  if (batch) {
    where.batch = eqCI(batch);
  }

  const placedStatusFilter = inCI(PLACED_STATUSES);

  const [totalStudents, placedGroups] = await Promise.all([
    prisma.student.count({ where }),
    prisma.application.groupBy({
      by: ['studentId'],
      where: {
        student: where,
        OR: [
          { status: placedStatusFilter },
          { interviewStatus: placedStatusFilter },
        ],
      },
    }),
  ]);

  const placementRate = totalStudents > 0
    ? Math.round((placedGroups.length / totalStudents) * 100)
    : 0;

  return { placementRate, totalStudents, placedCount: placedGroups.length };
}

const studentIncludeForScoring = {
  user: { select: { status: true, emailVerified: true, createdAt: true } },
  skills: true,
  education: { orderBy: { endYear: 'desc' }, take: 1 },
  resumeFiles: { take: 5 },
  applications: {
    select: {
      id: true,
      status: true,
      screeningStatus: true,
      interviewStatus: true,
      lastRoundReached: true,
      appliedDate: true,
      createdAt: true,
    },
  },
  endorsements: {
    select: { overallRating: true, verified: true },
  },
  interviewEvaluations: {
    select: { status: true, marks: true },
  },
  jobTracking: {
    select: { viewed: true, applied: true },
  },
};

/**
 * Score a single student record (already loaded with relations).
 */
export function scoreStudentRecord(student, activeJobSkills, cohortStatsByKey, resumeByUserId) {
  const cohortKey = `${(student.school || '').toLowerCase()}|${(student.batch || '').toLowerCase()}`;
  const cohortStats = cohortStatsByKey[cohortKey] || { placementRate: 0 };
  const resumeRecord = resumeByUserId[student.userId] || null;

  const readiness = computePlacementReadiness(student, {
    applications: student.applications || [],
    interviewEvaluations: student.interviewEvaluations || [],
    endorsements: student.endorsements || [],
    resumeRecord,
    jobTracking: student.jobTracking || [],
    activeJobSkills,
  });

  const probability = computePlacementProbability(student, {
    applications: student.applications || [],
    cohortStats,
  });

  return { readiness, probability };
}

/**
 * Load resume builder text for a batch of user IDs.
 */
export async function loadResumesForUsers(userIds) {
  if (!userIds.length) return {};
  const resumes = await prisma.resume.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, originalText: true, enhancedText: true },
  });
  const map = {};
  resumes.forEach((r) => { map[r.userId] = r; });
  return map;
}

/**
 * Preload cohort stats for unique school|batch pairs in a student list.
 */
export async function loadCohortStatsMap(students) {
  const keys = new Set();
  students.forEach((s) => {
    if (s.school || s.batch) keys.add(`${(s.school || '').toLowerCase()}|${(s.batch || '').toLowerCase()}`);
  });
  const map = {};
  await Promise.all(
    [...keys].map(async (key) => {
      const [school, batch] = key.split('|');
      map[key] = await fetchCohortStats(school || null, batch || null);
    }),
  );
  return map;
}

/**
 * Paginated students with readiness & probability scores.
 */
export async function getStudentsWithScores(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
  const sortBy = query.sortBy || 'readiness';
  const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';
  const minReadiness = query.minReadiness != null ? parseFloat(query.minReadiness) : null;
  const minProbability = query.minProbability != null ? parseFloat(query.minProbability) : null;
  const tier = query.tier;

  const where = buildStudentFilterWhere(query);

  const SCORE_BATCH_CAP = 2000;

  const [activeJobSkills, totalCount, students] = await Promise.all([
    fetchActiveJobSkills(),
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: studentIncludeForScoring,
      orderBy: { createdAt: 'desc' },
      take: SCORE_BATCH_CAP,
    }),
  ]);

  const userIds = students.map((s) => s.userId).filter(Boolean);
  const [resumeByUserId, cohortStatsByKey] = await Promise.all([
    loadResumesForUsers(userIds),
    loadCohortStatsMap(students),
  ]);

  let scored = students.map((student) => {
    const { readiness, probability } = scoreStudentRecord(
      student,
      activeJobSkills,
      cohortStatsByKey,
      resumeByUserId,
    );
    const topEducation = student.education?.[0];
    return {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      enrollmentId: student.enrollmentId,
      center: student.center,
      school: student.school,
      batch: student.batch,
      cgpa: student.cgpa,
      statsApplied: student.statsApplied,
      statsShortlisted: student.statsShortlisted,
      statsInterviewed: student.statsInterviewed,
      statsOffers: student.statsOffers,
      profileCompleted: student.profileCompleted,
      status: student.user?.status || 'ACTIVE',
      topEducationDegree: topEducation?.degree || null,
      topEducationBranch: topEducation?.description || null,
      placementReadiness: readiness,
      placementProbability: probability,
    };
  });

  if (minReadiness != null) {
    scored = scored.filter((s) => s.placementReadiness.score >= minReadiness);
  }
  if (minProbability != null) {
    scored = scored.filter((s) => s.placementProbability.score >= minProbability);
  }
  if (tier) {
    scored = scored.filter((s) => s.placementReadiness.tier === tier);
  }

  const sortKey = sortBy === 'probability' ? 'placementProbability' : 'placementReadiness';
  scored.sort((a, b) => {
    const diff = b[sortKey].score - a[sortKey].score;
    return sortDir === 'asc' ? -diff : diff;
  });

  const filteredTotal = scored.length;
  const start = (page - 1) * limit;
  const pageItems = scored.slice(start, start + limit);

  return {
    students: pageItems,
    pagination: {
      page,
      limit,
      total: tier || minReadiness != null || minProbability != null ? filteredTotal : totalCount,
      totalPages: Math.ceil((tier || minReadiness != null || minProbability != null ? filteredTotal : totalCount) / limit) || 1,
    },
  };
}

/**
 * Dashboard summary — all counts from live DB activity.
 */
export async function getPlacementSummary(query = {}) {
  const studentWhere = buildStudentFilterWhere(query);
  const hasFilter = Object.keys(studentWhere).length > 0;

  const placementFilter = {
    OR: [
      { status: inCI(PLACED_STATUSES) },
      { interviewStatus: inCI(PLACED_STATUSES) },
    ],
  };

  const [
    totalStudents,
    activeStudents,
    profileCompleted,
    withResume,
    totalApplications,
    shortlistedApps,
    oaClearedApps,
    placedStudents,
    jobsPosted,
    openJobs,
    endorsementCount,
    interviewEvalCount,
    jobStatusGroups,
    applicationStatusGroups,
    screeningGroups,
  ] = await Promise.all([
    prisma.student.count({ where: studentWhere }),
    prisma.student.count({
      where: { ...studentWhere, user: { status: 'ACTIVE' } },
    }),
    prisma.student.count({ where: { ...studentWhere, profileCompleted: true } }),
    prisma.student.count({
      where: {
        ...studentWhere,
        OR: [{ resumeUrl: { not: null } }, { resumeFiles: { some: {} } }],
      },
    }),
    prisma.application.count({ where: { student: studentWhere } }),
    prisma.application.count({
      where: {
        student: studentWhere,
        status: inCI(SHORTLIST_STATUSES),
      },
    }),
    prisma.application.count({
      where: {
        student: studentWhere,
        screeningStatus: inCI(OA_CLEARED_SCREENING),
      },
    }),
    prisma.application.groupBy({
      by: ['studentId'],
      where: { student: studentWhere, ...placementFilter },
    }).then((g) => g.length),
    prisma.job.count({
      where: { OR: [{ isPosted: true }, { status: eqCI('POSTED') }] },
    }),
    prisma.job.count({
      where: {
        isActive: true,
        OR: [{ isPosted: true }, { status: eqCI('POSTED') }],
      },
    }),
    prisma.endorsement.count({
      where: hasFilter ? { student: studentWhere } : {},
    }),
    prisma.interviewEvaluation.count({
      where: hasFilter ? { student: studentWhere } : {},
    }),
    prisma.job.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.application.groupBy({
      by: ['status'],
      where: { student: studentWhere },
      _count: { id: true },
    }),
    prisma.application.groupBy({
      by: ['screeningStatus'],
      where: { student: studentWhere },
      _count: { id: true },
    }),
  ]);

  const readinessDistribution = { ready: 0, developing: 0, at_risk: 0 };
  const sampleStudents = await prisma.student.findMany({
    where: studentWhere,
    include: studentIncludeForScoring,
    take: 500,
  });
  const userIds = sampleStudents.map((s) => s.userId).filter(Boolean);
  const [activeJobSkills, resumeByUserId, cohortStatsByKey] = await Promise.all([
    fetchActiveJobSkills(),
    loadResumesForUsers(userIds),
    loadCohortStatsMap(sampleStudents),
  ]);

  sampleStudents.forEach((student) => {
    const { readiness } = scoreStudentRecord(student, activeJobSkills, cohortStatsByKey, resumeByUserId);
    readinessDistribution[readiness.tier] += 1;
  });

  const avgReadiness = sampleStudents.length
    ? round1(
        sampleStudents.reduce((sum, s) => {
          const { readiness } = scoreStudentRecord(s, activeJobSkills, cohortStatsByKey, resumeByUserId);
          return sum + readiness.score;
        }, 0) / sampleStudents.length,
      )
    : 0;

  const mapGroups = (groups, labelKey = 'status') =>
    groups.map((g) => ({
      label: g[labelKey] || 'Unknown',
      count: g._count.id,
    }));

  const byJobStatus = Object.fromEntries(
    jobStatusGroups.map((g) => [(g.status || '').toUpperCase(), g._count.id]),
  );

  const [
    inactiveStudents,
    studentsNotApplied,
    companiesOnboarded,
    transitionsCount,
    jobsInProcess,
    schoolStudentGroups,
    recruiterJobGroups,
  ] = await Promise.all([
    prisma.student.count({
      where: {
        ...studentWhere,
        user: { status: { not: 'ACTIVE' } },
      },
    }),
    prisma.student.count({
      where: {
        ...studentWhere,
        statsApplied: 0,
        user: { status: 'ACTIVE' },
      },
    }),
    prisma.recruiter.count({
      where: { jobs: { some: {} } },
    }),
    prisma.application.count({
      where: {
        student: studentWhere,
        status: inCI(['SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'SELECTED']),
      },
    }),
    prisma.job.count({
      where: {
        isPosted: true,
        applications: { some: {} },
        NOT: { status: inCI(['ARCHIVED', 'REJECTED']) },
      },
    }),
    prisma.student.groupBy({
      by: ['school'],
      where: studentWhere,
      _count: { id: true },
    }),
    prisma.job.groupBy({
      by: ['recruiterId'],
      where: { recruiterId: { not: null } },
      _count: { id: true },
    }),
  ]);

  const jobPipeline = buildJobPipelineCounts(byJobStatus, {
    active: openJobs,
    hold: (byJobStatus.IN_REVIEW || 0) + (byJobStatus.in_review || 0),
    inProcess: jobsInProcess,
    yetToStart: (byJobStatus.DRAFT || 0) + (byJobStatus.draft || 0),
    closed: (byJobStatus.ARCHIVED || 0) + (byJobStatus.archived || 0),
    notApplied: studentsNotApplied,
    notDeliverable: (byJobStatus.REJECTED || 0) + (byJobStatus.rejected || 0),
  });

  const closedDrives = buildClosedDrivesBreakdown(applicationStatusGroups, screeningGroups);
  const schoolOverview = await buildSchoolOverview(studentWhere, schoolStudentGroups);
  const recruiterOverview = await buildRecruiterOverview(recruiterJobGroups);

  return {
    overview: {
      totalStudents,
      activeStudents,
      inactiveStudents,
      profileCompleted,
      withResume,
      totalApplications,
      shortlistedApps,
      oaClearedApps,
      placedStudents,
      jobsPosted,
      openJobs,
      endorsementCount,
      interviewEvalCount,
      avgReadiness,
      readinessDistribution,
      sampleSize: sampleStudents.length,
      companiesOnboarded,
      transitionsCount,
      studentsNotApplied,
    },
    jobPipeline,
    breakdowns: {
      jobStatus: mapGroups(jobStatusGroups, 'status'),
      applicationStatus: mapGroups(applicationStatusGroups, 'status'),
      screeningStatus: mapGroups(screeningGroups, 'screeningStatus'),
    },
    closedDrivesBreakdown: closedDrives,
    schoolOverview,
    recruiterOverview,
  };
}

function buildJobPipelineCounts(byStatus, overrides = {}) {
  return {
    active: overrides.active ?? 0,
    hold: overrides.hold ?? 0,
    inProcess: overrides.inProcess ?? 0,
    yetToStart: overrides.yetToStart ?? 0,
    closed: overrides.closed ?? 0,
    notApplied: overrides.notApplied ?? 0,
    notDeliverable: overrides.notDeliverable ?? 0,
    rawByStatus: byStatus,
  };
}

async function buildSchoolOverview(studentWhere, schoolGroups) {
  const schools = ['SOT', 'SOM', 'SOH'];
  const placementFilter = {
    OR: [
      { status: inCI(PLACED_STATUSES) },
      { interviewStatus: inCI(PLACED_STATUSES) },
    ],
  };

  const results = await Promise.all(
    schools.map(async (schoolCode) => {
      const localWhere = { ...studentWhere, school: eqCI(schoolCode) };
      const [students, applications, placed, ready] = await Promise.all([
        prisma.student.count({ where: localWhere }),
        prisma.application.count({ where: { student: localWhere } }),
        prisma.application.groupBy({
          by: ['studentId'],
          where: { student: localWhere, ...placementFilter },
        }).then((g) => g.length),
        prisma.student.count({
          where: { ...localWhere, profileCompleted: true, statsApplied: { gt: 0 } },
        }),
      ]);
      return {
        school: schoolCode,
        students,
        applications,
        placed,
        ready,
        jobs: await prisma.job.count({
          where: {
            OR: [{ isPosted: true }, { status: eqCI('POSTED') }],
            targetSchools: containsCI(schoolCode),
          },
        }),
      };
    }),
  );
  return results;
}

async function buildRecruiterOverview(recruiterJobGroups) {
  const top = recruiterJobGroups
    .filter((g) => g.recruiterId)
    .sort((a, b) => b._count.id - a._count.id)
    .slice(0, 12);

  if (!top.length) return { totalJobs: 0, managers: [] };

  const recruiters = await prisma.recruiter.findMany({
    where: { id: { in: top.map((t) => t.recruiterId) } },
    select: {
      id: true,
      companyName: true,
      user: { select: { displayName: true, email: true } },
    },
  });

  const byId = Object.fromEntries(recruiters.map((r) => [r.id, r]));
  const managers = top.map((t) => ({
    id: t.recruiterId,
    name: byId[t.recruiterId]?.user?.displayName
      || byId[t.recruiterId]?.companyName
      || byId[t.recruiterId]?.user?.email
      || 'Unknown',
    jobsPosted: t._count.id,
  }));

  return {
    totalJobs: top.reduce((s, t) => s + t._count.id, 0),
    managers,
  };
}

function buildClosedDrivesBreakdown(appGroups, screeningGroups) {
  const byStatus = Object.fromEntries(appGroups.map((g) => [g.status, g._count.id]));
  const byScreening = Object.fromEntries(screeningGroups.map((g) => [g.screeningStatus, g._count.id]));

  return {
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    items: [
      { label: 'Selected / Offered', count: (byStatus.SELECTED || 0) + (byStatus.OFFERED || 0) + (byStatus.ACCEPTED || 0), color: 'green' },
      { label: 'Shortlisted', count: byStatus.SHORTLISTED || 0, color: 'blue' },
      { label: 'Rejected', count: byStatus.REJECTED || 0, color: 'red' },
      { label: 'Screen Reject', count: byScreening.REJECTED || byScreening.SCREEN_REJECT || 0, color: 'gray' },
      { label: 'Interview No Show', count: byStatus.NO_SHOW || 0, color: 'amber' },
    ],
  };
}

/**
 * Single student score breakdown.
 */
export async function getStudentScoreDetail(studentId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      ...studentIncludeForScoring,
      projects: { take: 5 },
      experiences: { take: 5 },
    },
  });
  if (!student) return null;

  const [activeJobSkills, resumeByUserId, cohortStats] = await Promise.all([
    fetchActiveJobSkills(),
    loadResumesForUsers([student.userId]),
    fetchCohortStats(student.school, student.batch),
  ]);

  const cohortKey = `${(student.school || '').toLowerCase()}|${(student.batch || '').toLowerCase()}`;
  const { readiness, probability } = scoreStudentRecord(
    student,
    activeJobSkills,
    { [cohortKey]: cohortStats },
    resumeByUserId,
  );

  return {
    student: {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      center: student.center,
      school: student.school,
      batch: student.batch,
      cgpa: student.cgpa,
      statsApplied: student.statsApplied,
      statsShortlisted: student.statsShortlisted,
      statsOffers: student.statsOffers,
    },
    placementReadiness: readiness,
    placementProbability: probability,
    cohortStats,
    weights: { readiness: READINESS_WEIGHTS, probability: PROBABILITY_WEIGHTS },
  };
}
