/**
 * Job Opportunities — single source of truth
 * Candidate records = Applications (+ derived pipeline status/sub-status)
 * Linked to Job → Company, Recruiter (CR Manager), segment from job/student
 */

import prisma from '../config/database.js';

export const PIPELINE_STATUS = {
  ACTIVE: 'ACTIVE',
  HOLD: 'HOLD',
  IN_PROCESS: 'IN_PROCESS',
  YET_TO_START: 'YET_TO_START',
  CLOSED: 'CLOSED',
  NOT_APPLIED: 'NOT_APPLIED',
  NOT_DELIVERABLE: 'NOT_DELIVERABLE',
};

export const PIPELINE_SUB_STATUS = {
  CLOSED_WITH_SELECTION: 'CLOSED_WITH_SELECTION',
  CLOSED_WITH_REJECTION: 'CLOSED_WITH_REJECTION',
  NO_SHOW: 'NO_SHOW',
  SCREEN_REJECT: 'SCREEN_REJECT',
  SHORTLISTED: 'SHORTLISTED',
  REJECTED: 'REJECTED',
  PENDING: 'PENDING',
};

const PLACED = ['SELECTED', 'ACCEPTED', 'OFFERED'];
const SHORTLIST = ['SHORTLISTED', 'INTERVIEWED', ...PLACED];

function upper(s) {
  return String(s || '').trim().toUpperCase();
}

/**
 * Derive normalized pipeline fields from legacy status columns (used when DB fields are null).
 */
export function derivePipelineFromApplication(app) {
  if (app.pipelineStatus) {
    return {
      pipelineStatus: upper(app.pipelineStatus),
      pipelineSubStatus: app.pipelineSubStatus ? upper(app.pipelineSubStatus) : null,
    };
  }

  const status = upper(app.status);
  const screening = upper(app.screeningStatus);
  const interview = upper(app.interviewStatus);

  if (PLACED.includes(status) || PLACED.includes(interview)) {
    return { pipelineStatus: PIPELINE_STATUS.CLOSED, pipelineSubStatus: PIPELINE_SUB_STATUS.CLOSED_WITH_SELECTION };
  }
  if (status === 'REJECTED' || interview === 'REJECTED') {
    return { pipelineStatus: PIPELINE_STATUS.CLOSED, pipelineSubStatus: PIPELINE_SUB_STATUS.CLOSED_WITH_REJECTION };
  }
  if (status === 'NO_SHOW' || interview === 'NO_SHOW') {
    return { pipelineStatus: PIPELINE_STATUS.CLOSED, pipelineSubStatus: PIPELINE_SUB_STATUS.NO_SHOW };
  }
  if (screening === 'REJECTED' || screening === 'SCREEN_REJECT' || screening === 'SCREENING_REJECTED' || screening === 'TEST_REJECTED') {
    return { pipelineStatus: PIPELINE_STATUS.CLOSED, pipelineSubStatus: PIPELINE_SUB_STATUS.SCREEN_REJECT };
  }
  if (SHORTLIST.includes(status) || screening === 'TEST_SELECTED' || screening === 'INTERVIEW_ELIGIBLE') {
    return { pipelineStatus: PIPELINE_STATUS.IN_PROCESS, pipelineSubStatus: PIPELINE_SUB_STATUS.SHORTLISTED };
  }
  if (upper(app.status) === 'WITHDRAWN') {
    return { pipelineStatus: PIPELINE_STATUS.CLOSED, pipelineSubStatus: PIPELINE_SUB_STATUS.CLOSED_WITH_REJECTION };
  }
  if (status === 'APPLIED' || !status) {
    return { pipelineStatus: PIPELINE_STATUS.ACTIVE, pipelineSubStatus: PIPELINE_SUB_STATUS.PENDING };
  }
  return { pipelineStatus: PIPELINE_STATUS.IN_PROCESS, pipelineSubStatus: null };
}

export function deriveSegment(job, student) {
  if (job?.specialization?.trim()) return job.specialization.trim();
  if (job?.qualification?.trim()) return job.qualification.trim();
  if (student?.school?.trim()) return student.school.trim();
  const skills = job?.requiredSkills;
  if (skills) {
    try {
      const arr = JSON.parse(skills);
      if (Array.isArray(arr) && arr[0]) return String(typeof arr[0] === 'string' ? arr[0] : arr[0].name || 'General');
    } catch { /* ignore */ }
  }
  return 'General';
}

export function deriveJobDriveStatus(job) {
  const st = upper(job.status);
  if (job.archivedAt || st === 'ARCHIVED') return PIPELINE_STATUS.CLOSED;
  if (st === 'REJECTED') return PIPELINE_STATUS.NOT_DELIVERABLE;
  if (st === 'DRAFT' || (!job.isPosted && st !== 'POSTED')) return PIPELINE_STATUS.YET_TO_START;
  if (st === 'IN_REVIEW') return PIPELINE_STATUS.HOLD;
  if (job.isPosted && job.isActive) return PIPELINE_STATUS.ACTIVE;
  if (job.isPosted) return PIPELINE_STATUS.IN_PROCESS;
  return PIPELINE_STATUS.HOLD;
}

export function buildFilters(query = {}) {
  const { center, school, batch, segment, quarter, month, crManager, search } = query;
  const studentWhere = {};
  if (school) studentWhere.school = { in: school.split(',').map((s) => s.trim()).filter(Boolean) };
  if (center) studentWhere.center = { in: center.split(',').map((c) => c.trim()).filter(Boolean) };
  if (batch) studentWhere.batch = { in: batch.split(',').map((b) => b.trim()).filter(Boolean) };

  const jobWhere = {};
  if (crManager) jobWhere.recruiterId = crManager;

  const appWhere = {};
  if (Object.keys(studentWhere).length) appWhere.student = studentWhere;
  if (Object.keys(jobWhere).length) appWhere.job = jobWhere;
  if (segment) {
    appWhere.OR = [
      { segment: { contains: segment } },
      { job: { specialization: { contains: segment } } },
    ];
  }

  let dateFilter = {};
  if (month) {
    const m = parseInt(month, 10);
    const y = query.year ? parseInt(query.year, 10) : new Date().getFullYear();
    if (m >= 1 && m <= 12) {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      dateFilter = { appliedDate: { gte: start, lte: end } };
    }
  } else if (quarter) {
    const y = query.year ? parseInt(query.year, 10) : new Date().getFullYear();
    const qMap = { Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11] };
    const qKey = upper(quarter).replace(/[^Q0-9]/g, '').slice(0, 2);
    const range = qMap[qKey] || qMap.Q1;
    dateFilter = {
      appliedDate: {
        gte: new Date(y, range[0], 1),
        lte: new Date(y, range[1] + 1, 0, 23, 59, 59),
      },
    };
  }

  if (Object.keys(dateFilter).length) Object.assign(appWhere, dateFilter);

  return { studentWhere, jobWhere, appWhere, search };
}

async function countStudents(studentWhere, extra = {}) {
  return prisma.student.count({ where: { ...studentWhere, ...extra } });
}

async function countJobs(jobWhere, extra = {}) {
  return prisma.job.count({ where: { ...jobWhere, ...extra } });
}

/**
 * Overview stats — all from filtered queries on students, jobs, applications.
 */
export async function getJobOpportunitiesOverview(query = {}) {
  const { studentWhere, jobWhere, appWhere } = buildFilters(query);

  const postedJobFilter = {
    ...jobWhere,
    OR: [{ isPosted: true }, { status: 'POSTED' }],
  };

  const [
    totalCsPool,
    activeCsPool,
    inactiveCsPool,
    companiesOnboarded,
    jdsAnnounced,
    openPositions,
    applicationsShared,
    transitions,
    jobsActive,
    jobsHold,
    jobsInProcess,
    jobsYetToStart,
    jobsClosed,
    studentsNotApplied,
    jobsNotDeliverable,
  ] = await Promise.all([
    countStudents(studentWhere),
    countStudents(studentWhere, { user: { status: 'ACTIVE' } }),
    countStudents(studentWhere, { user: { status: { not: 'ACTIVE' } } }),
    prisma.company.count({ where: { jobs: { some: jobWhere } } }).catch(() =>
      prisma.recruiter.count({ where: { jobs: { some: jobWhere } } }),
    ),
    countJobs(jobWhere, { OR: [{ isPosted: true }, { status: 'POSTED' }] }),
    countJobs(jobWhere, { isActive: true, isPosted: true }),
    prisma.application.count({ where: appWhere }),
    prisma.application.count({
      where: {
        ...appWhere,
        status: { in: ['SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'SELECTED'] },
      },
    }),
    countJobs(jobWhere, { isPosted: true, isActive: true }),
    countJobs(jobWhere, { status: 'IN_REVIEW' }),
    countJobs(jobWhere, { isPosted: true, applications: { some: {} } }),
    countJobs(jobWhere, { status: 'DRAFT' }),
    countJobs(jobWhere, { OR: [{ status: 'ARCHIVED' }, { archivedAt: { not: null } }] }),
    countStudents(studentWhere, { statsApplied: 0, user: { status: 'ACTIVE' } }),
    countJobs(jobWhere, { status: 'REJECTED' }),
  ]);

  const applications = await prisma.application.findMany({
    where: appWhere,
    select: {
      status: true,
      screeningStatus: true,
      interviewStatus: true,
      pipelineStatus: true,
      pipelineSubStatus: true,
    },
    take: 50000,
  });

  let closedDrives = 0;
  const closedSubs = {
    CLOSED_WITH_SELECTION: 0,
    CLOSED_WITH_REJECTION: 0,
    NO_SHOW: 0,
    SCREEN_REJECT: 0,
  };
  let appShortlisted = 0;
  let appRejected = 0;
  let appPending = 0;

  applications.forEach((app) => {
    const { pipelineStatus, pipelineSubStatus } = derivePipelineFromApplication(app);
    if (pipelineStatus === PIPELINE_STATUS.CLOSED) {
      closedDrives += 1;
      if (pipelineSubStatus && closedSubs[pipelineSubStatus] !== undefined) {
        closedSubs[pipelineSubStatus] += 1;
      }
    }
    const st = upper(app.status);
    if (SHORTLIST.includes(st)) appShortlisted += 1;
    else if (st === 'REJECTED') appRejected += 1;
    else if (st === 'APPLIED') appPending += 1;
  });

  return {
    row1: {
      totalCsPool,
      activeCsPool,
      inactiveCsPool,
      companiesOnboarded,
      jdsAnnounced,
      openPositions,
      applicationsShared,
      transitions,
    },
    row2: {
      active: jobsActive,
      hold: jobsHold,
      inProcess: jobsInProcess,
      yetToStart: jobsYetToStart,
      closedDrives: closedDrives || jobsClosed,
      learnerNotApplied: studentsNotApplied,
      notDeliverable: jobsNotDeliverable,
    },
    _meta: {
      closedSubs,
      appStages: { shortlisted: appShortlisted, rejected: appRejected, pending: appPending },
      transitionsSubs: {
        active: jobsActive,
        hold: jobsHold,
        inProcess: jobsInProcess,
        yetToStart: jobsYetToStart,
      },
    },
  };
}

/**
 * Lazy breakdown for hover cards (cached on client).
 */
export async function getCardBreakdown(cardKey, query = {}) {
  const overview = await getJobOpportunitiesOverview(query);
  const meta = overview._meta || {};

  switch (cardKey) {
    case 'closed_drives':
      return {
        total: overview.row2.closedDrives,
        items: [
          { label: 'Closed with Selection', count: meta.closedSubs?.CLOSED_WITH_SELECTION ?? 0, color: 'green' },
          { label: 'Closed with Rejection', count: meta.closedSubs?.CLOSED_WITH_REJECTION ?? 0, color: 'red' },
          { label: 'Closed with No Show', count: meta.closedSubs?.NO_SHOW ?? 0, color: 'amber' },
          { label: 'Screen Reject', count: meta.closedSubs?.SCREEN_REJECT ?? 0, color: 'gray' },
        ],
      };
    case 'applications_shared':
      return {
        total: overview.row1.applicationsShared,
        items: [
          { label: 'Shortlisted', count: meta.appStages?.shortlisted ?? 0, color: 'green' },
          { label: 'Rejected', count: meta.appStages?.rejected ?? 0, color: 'red' },
          { label: 'Pending', count: meta.appStages?.pending ?? 0, color: 'amber' },
        ],
      };
    case 'transitions':
      return {
        total: overview.row1.transitions,
        items: [
          { label: 'Active', count: meta.transitionsSubs?.active ?? 0, color: 'green' },
          { label: 'Hold', count: meta.transitionsSubs?.hold ?? 0, color: 'amber' },
          { label: 'In Process', count: meta.transitionsSubs?.inProcess ?? 0, color: 'blue' },
          { label: 'Yet to Start', count: meta.transitionsSubs?.yetToStart ?? 0, color: 'gray' },
        ],
      };
    case 'total_cs_pool':
      return {
        total: overview.row1.totalCsPool,
        items: [
          { label: 'Active CS Pool', count: overview.row1.activeCsPool, color: 'green' },
          { label: 'Inactive CS Pool', count: overview.row1.inactiveCsPool, color: 'red' },
        ],
      };
    default:
      return { total: 0, items: [] };
  }
}

export async function getCrManagerOverview(query = {}) {
  const { jobWhere, appWhere, search } = buildFilters(query);

  const PLACED = ['SELECTED', 'ACCEPTED', 'OFFERED'];
  const SHORTLIST = ['SHORTLISTED', 'INTERVIEWED', ...PLACED];
  const INTERVIEW_SCHEDULED = ['SCHEDULED', 'INTERVIEWED', 'SHORTLISTED', 'INTERVIEW_ELIGIBLE', ...PLACED];

  const jobs = await prisma.job.findMany({
    where: jobWhere,
    select: {
      id: true,
      recruiterId: true,
      createdBy: true,
      companyId: true,
      companyName: true,
      status: true,
      isPosted: true,
      isActive: true,
      archivedAt: true,
      interviewSession: { select: { id: true, status: true } },
      applications: {
        where: appWhere,
        select: {
          id: true,
          status: true,
          interviewStatus: true,
          screeningStatus: true,
          pipelineStatus: true,
          pipelineSubStatus: true,
          interviewDate: true,
        },
      },
    },
  });

  const managerMap = new Map();

  const ensureManager = (key, seed = {}) => {
    if (!managerMap.has(key)) {
      managerMap.set(key, {
        key,
        userId: seed.userId || null,
        recruiterId: seed.recruiterId || null,
        name: seed.name || 'Unknown',
        adminStatus: seed.adminStatus || null,
        jdsPunched: 0,
        companies: new Set(),
        jobs: new Set(),
        applicationsShared: 0,
        studentsPlaced: 0,
        interviewsScheduled: 0,
        scheduledKeys: new Set(),
        transitions: 0,
        inProcess: 0,
        hold: 0,
        yetToStart: 0,
        closedDrives: 0,
        learnerNotApplied: 0,
      });
    }
    return managerMap.get(key);
  };

  jobs.forEach((job) => {
    const managerKey = job.createdBy || (job.recruiterId ? `rec:${job.recruiterId}` : 'unassigned');
    const row = ensureManager(managerKey, {
      userId: job.createdBy || null,
      recruiterId: job.recruiterId || null,
    });

    row.jdsPunched += 1;
    row.jobs.add(job.id);
    if (job.companyId) row.companies.add(job.companyId);
    else if (job.companyName) row.companies.add(job.companyName);

    const jobDrive = deriveJobDriveStatus(job);
    if (jobDrive === PIPELINE_STATUS.HOLD) row.hold += 1;
    if (jobDrive === PIPELINE_STATUS.YET_TO_START) row.yetToStart += 1;

    if (job.interviewSession?.id && job.applications.length === 0) {
      row.scheduledKeys.add(`job:${job.id}`);
    }

    job.applications.forEach((app) => {
      const st = upper(app.status);
      const interviewSt = upper(app.interviewStatus);
      const { pipelineStatus } = derivePipelineFromApplication(app);

      row.applicationsShared += 1;

      if (PLACED.includes(st) || PLACED.includes(interviewSt)) {
        row.studentsPlaced += 1;
      }
      if (SHORTLIST.includes(st)) {
        row.transitions += 1;
      }
      if (
        app.interviewDate
        || INTERVIEW_SCHEDULED.includes(interviewSt)
        || INTERVIEW_SCHEDULED.includes(st)
      ) {
        row.scheduledKeys.add(`app:${app.id}`);
      }
      if (job.interviewSession?.id) {
        row.scheduledKeys.add(`session:${job.id}`);
      }
      if (pipelineStatus === PIPELINE_STATUS.IN_PROCESS) {
        row.inProcess += 1;
      }
      if (pipelineStatus === PIPELINE_STATUS.CLOSED) {
        row.closedDrives += 1;
      }
      if (pipelineStatus === PIPELINE_STATUS.ACTIVE && st === 'APPLIED') {
        row.learnerNotApplied += 0;
      }
    });
  });

  const userIds = [...managerMap.values()].map((m) => m.userId).filter(Boolean);
  const recruiterIds = [...managerMap.values()].map((m) => m.recruiterId).filter(Boolean);

  const [admins, recruiters] = await Promise.all([
    userIds.length
      ? prisma.admin.findMany({
          where: { userId: { in: userIds } },
          select: {
            userId: true,
            name: true,
            user: { select: { displayName: true, email: true, status: true } },
          },
        })
      : [],
    recruiterIds.length
      ? prisma.recruiter.findMany({
          where: { id: { in: recruiterIds } },
          select: {
            id: true,
            companyName: true,
            user: { select: { displayName: true, email: true, status: true } },
          },
        })
      : [],
  ]);

  const adminByUserId = Object.fromEntries(admins.map((a) => [a.userId, a]));
  const recruiterById = Object.fromEntries(recruiters.map((r) => [r.id, r]));

  const statusLabel = (status) => {
    const s = upper(status);
    if (s === 'ACTIVE') return 'Active';
    if (s === 'PENDING') return 'Pending';
    if (s === 'BLOCKED') return 'Blocked';
    if (s === 'REJECTED') return 'Rejected';
    if (s === 'INACTIVE') return 'Inactive';
    return status || 'Unknown';
  };

  const statusColor = (status) => {
    const s = upper(status);
    if (s === 'ACTIVE') return 'green';
    if (s === 'PENDING') return 'amber';
    if (s === 'BLOCKED' || s === 'REJECTED') return 'red';
    return 'gray';
  };

  let managers = [...managerMap.values()].map((m) => {
    let name = 'Unknown';
    let adminStatus = null;

    if (m.userId && adminByUserId[m.userId]) {
      const a = adminByUserId[m.userId];
      name = a.user?.displayName?.trim() || a.name?.trim() || a.user?.email || 'Unknown';
      adminStatus = a.user?.status || null;
    } else if (m.recruiterId && recruiterById[m.recruiterId]) {
      const r = recruiterById[m.recruiterId];
      name = r.user?.displayName || r.companyName || r.user?.email || 'Unknown';
      adminStatus = r.user?.status || null;
    }

    const breakdown = [
      { label: 'Admin Status', value: statusLabel(adminStatus), color: statusColor(adminStatus) },
      { label: 'Companies Onboarded', count: m.companies.size, color: 'green' },
      { label: 'Applications Shared', count: m.applicationsShared, color: 'blue' },
      { label: 'Students Placed', count: m.studentsPlaced, color: 'green' },
      { label: 'Interviews Scheduled', count: m.scheduledKeys.size, color: 'blue' },
      { label: 'Transitions', count: m.transitions, color: 'green' },
      { label: 'In Process', count: m.inProcess, color: 'blue' },
      { label: 'Closed Drives', count: m.closedDrives, color: 'gray' },
      { label: 'Hold', count: m.hold, color: 'amber' },
      { label: 'Yet to Start', count: m.yetToStart, color: 'amber' },
    ];

    return {
      id: m.userId || m.recruiterId || m.key,
      name,
      adminStatus,
      adminStatusLabel: statusLabel(adminStatus),
      count: m.jdsPunched,
      breakdown,
    };
  });

  if (search) {
    const q = search.toLowerCase();
    managers = managers.filter((m) => m.name.toLowerCase().includes(q));
  }

  const existingUserIds = new Set(managers.map((m) => m.id));
  const allAdminUsers = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: {
      id: true,
      status: true,
      displayName: true,
      email: true,
      admin: { select: { name: true } },
    },
    orderBy: { displayName: 'asc' },
  });

  allAdminUsers.forEach((u) => {
    if (existingUserIds.has(u.id)) return;
    const name = u.displayName?.trim() || u.admin?.name?.trim() || u.email || 'Unknown';
    managers.push({
      id: u.id,
      name,
      adminStatus: u.status,
      adminStatusLabel: statusLabel(u.status),
      count: 0,
      breakdown: [
        { label: 'Admin Status', value: statusLabel(u.status), color: statusColor(u.status) },
        { label: 'Companies Onboarded', count: 0, color: 'green' },
        { label: 'Applications Shared', count: 0, color: 'blue' },
        { label: 'Students Placed', count: 0, color: 'green' },
        { label: 'Interviews Scheduled', count: 0, color: 'blue' },
        { label: 'Transitions', count: 0, color: 'green' },
        { label: 'In Process', count: 0, color: 'blue' },
        { label: 'Closed Drives', count: 0, color: 'gray' },
        { label: 'Hold', count: 0, color: 'amber' },
        { label: 'Yet to Start', count: 0, color: 'amber' },
      ],
    });
  });

  managers.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const totalJds = managers.reduce((s, m) => s + m.count, 0);

  return {
    jdsPunched: totalJds,
    managers,
  };
}

/**
 * MoM table: CR Manager × Segment with pipeline counts.
 */
export async function getMomTable(query = {}) {
  const { appWhere, search } = buildFilters(query);

  const applications = await prisma.application.findMany({
    where: appWhere,
    select: {
      status: true,
      screeningStatus: true,
      interviewStatus: true,
      pipelineStatus: true,
      pipelineSubStatus: true,
      segment: true,
      appliedDate: true,
      job: {
        select: {
          id: true,
          recruiterId: true,
          companyId: true,
          companyName: true,
          specialization: true,
          qualification: true,
          status: true,
          isPosted: true,
          isActive: true,
          recruiter: {
            select: {
              id: true,
              companyName: true,
              user: { select: { displayName: true, email: true } },
            },
          },
        },
      },
      student: { select: { school: true, center: true } },
    },
    take: 10000,
  });

  const rowsMap = new Map();

  applications.forEach((app) => {
    const job = app.job;
    if (!job?.recruiterId) return;

    const managerName =
      job.recruiter?.user?.displayName
      || job.recruiter?.companyName
      || job.companyName
      || 'Unknown';
    if (search && !managerName.toLowerCase().includes(search.toLowerCase())) return;

    const segment = app.segment || deriveSegment(job, app.student);
    const key = `${job.recruiterId}::${segment}`;
    const { pipelineStatus, pipelineSubStatus } = derivePipelineFromApplication(app);
    const jobDrive = deriveJobDriveStatus(job);

    if (!rowsMap.has(key)) {
      rowsMap.set(key, {
        crManagerId: job.recruiterId,
        crManager: managerName,
        segment,
        goal: 0,
        closedDrives: 0,
        companies: new Set(),
        jobs: new Set(),
        transitions: 0,
        yetToStart: 0,
        hold: 0,
        inProcess: 0,
        notApplied: 0,
        notDeliverable: 0,
      });
    }

    const row = rowsMap.get(key);
    row.jobs.add(job.id);
    if (job.companyId) row.companies.add(job.companyId);
    else if (job.companyName) row.companies.add(job.companyName);

    if (pipelineStatus === PIPELINE_STATUS.CLOSED) row.closedDrives += 1;
    if (SHORTLIST.includes(upper(app.status))) row.transitions += 1;
    if (pipelineStatus === PIPELINE_STATUS.IN_PROCESS) row.inProcess += 1;
    if (jobDrive === PIPELINE_STATUS.HOLD) row.hold += 1;
    if (jobDrive === PIPELINE_STATUS.YET_TO_START) row.yetToStart += 1;
    if (jobDrive === PIPELINE_STATUS.NOT_DELIVERABLE) row.notDeliverable += 1;
    if (pipelineStatus === PIPELINE_STATUS.ACTIVE && upper(app.status) === 'APPLIED') row.notApplied += 0;
    row.goal = Math.max(row.goal, row.closedDrives + 5);
  });

  const rows = [...rowsMap.values()].map((r) => ({
    crManagerId: r.crManagerId,
    crManager: r.crManager,
    segment: r.segment,
    goal: r.goal,
    closedDrives: r.closedDrives,
    achievedGoalPct: r.goal > 0 ? Math.round((r.closedDrives / r.goal) * 100) : 0,
    companies: r.companies.size,
    jobs: r.jobs.size,
    transitions: r.transitions,
    yetToStart: r.yetToStart,
    hold: r.hold,
    inProcess: r.inProcess,
    notApplied: r.notApplied,
    notDeliverable: r.notDeliverable,
  }));

  rows.sort((a, b) => a.crManager.localeCompare(b.crManager) || a.segment.localeCompare(b.segment));
  return { rows };
}

export async function getFilterOptions() {
  const [segments, recruiters] = await Promise.all([
    prisma.job.findMany({
      where: { specialization: { not: null } },
      select: { specialization: true },
      distinct: ['specialization'],
      take: 50,
    }),
    prisma.recruiter.findMany({
      where: { jobs: { some: {} } },
      select: {
        id: true,
        companyName: true,
        user: { select: { displayName: true, email: true } },
      },
      take: 100,
    }),
  ]);

  const segmentList = [...new Set(
    segments.map((s) => s.specialization).filter(Boolean),
  )].sort();

  return {
    segments: segmentList.length ? segmentList : ['General', 'Data Analytics', 'Digital Marketing', 'Product Management'],
    quarters: [
      { id: 'Q1', name: 'Q1 (Jan–Mar)' },
      { id: 'Q2', name: 'Q2 (Apr–Jun)' },
      { id: 'Q3', name: 'Q3 (Jul–Sep)' },
      { id: 'Q4', name: 'Q4 (Oct–Dec)' },
    ],
    months: Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      name: new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' }),
    })),
    crManagers: recruiters.map((r) => ({
      id: r.id,
      name: r.user?.displayName || r.companyName || r.user?.email || r.id,
    })),
  };
}

/**
 * Persist derived pipeline on an application (call from application status updates).
 */
export async function syncApplicationPipeline(applicationId) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: true, student: { select: { school: true } } },
  });
  if (!app) return null;

  const { pipelineStatus, pipelineSubStatus } = derivePipelineFromApplication(app);
  const segment = deriveSegment(app.job, app.student);

  return prisma.application.update({
    where: { id: applicationId },
    data: { pipelineStatus, pipelineSubStatus, segment },
  });
}
