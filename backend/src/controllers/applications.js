/**
 * Applications Controller
 * Replaces Firebase Firestore application service calls
 * Handles job applications and status updates
 */

import prisma from '../config/database.js';
import { createNotification } from './notifications.js';
import { getIO } from '../config/socket.js';
import { sendApplicationNotification, sendApplicationStatusUpdateNotification } from '../services/emailService.js';
import logger from '../config/logger.js';
import { sendSuccess } from '../utils/response.js';

/**
 * ==============================
 * Application Stage/Progress Mapping (single source of truth)
 * ==============================
 *
 * This mapping is used by:
 * - Admin job applicants tracking page
 * - Student past applications view
 *
 * Rules:
 * - Pre-interview: use Application.screeningStatus
 * - Interview progress/final: use Application.interviewStatus + Application.lastRoundReached
 * - Interview "started" signal: RoundEvaluation existence OR lastRoundReached > 0
 *   (Needed to distinguish "Qualified for Interview" vs "Interview Round 1")
 */
function normalizeScreeningStatus(value) {
  return (value || 'APPLIED').toUpperCase();
}

function normalizeInterviewStatus(value) {
  return value ? String(value).toUpperCase() : null;
}

function getRejectedIn({ screeningStatus, interviewStatus }) {
  if (screeningStatus === 'RESUME_REJECTED') return 'Screening';
  if (screeningStatus === 'TEST_REJECTED') return 'Test';

  if (interviewStatus && interviewStatus.startsWith('REJECTED_IN_ROUND_')) {
    const roundNumRaw = interviewStatus.replace('REJECTED_IN_ROUND_', '');
    const roundNum = parseInt(roundNumRaw, 10);
    if (!Number.isNaN(roundNum)) return `Round ${roundNum}`;
    return 'Interview';
  }

  return null;
}

function getFinalStatus({ status, screeningStatus, interviewStatus }) {
  // Prefer explicit final interview status
  if (interviewStatus === 'SELECTED') return 'SELECTED';
  if (interviewStatus && interviewStatus.startsWith('REJECTED_IN_ROUND_')) return 'REJECTED';

  // Pre-interview rejection states
  if (screeningStatus === 'RESUME_REJECTED' || screeningStatus === 'TEST_REJECTED') return 'REJECTED';

  // Fallback to legacy Application.status
  const normalized = status ? String(status).toUpperCase() : null;
  if (normalized === 'SELECTED') return 'SELECTED';
  if (normalized === 'REJECTED') return 'REJECTED';

  return 'ONGOING';
}

function computeApplicationTrackingFields({
  status,
  screeningStatus,
  interviewStatus,
  lastRoundReached,
  hasInterviewSession,
  hasInterviewStarted,
}) {
  const screening = normalizeScreeningStatus(screeningStatus);
  const interview = normalizeInterviewStatus(interviewStatus);
  const dbLastRoundReached = typeof lastRoundReached === 'number' ? lastRoundReached : parseInt(lastRoundReached || 0, 10) || 0;

  const finalStatus = getFinalStatus({ status, screeningStatus: screening, interviewStatus: interview });
  const rejectedIn = finalStatus === 'REJECTED' ? getRejectedIn({ screeningStatus: screening, interviewStatus: interview }) : null;

  // Derive "current stage" text strictly from DB fields
  let currentStage = 'Applied';

  if (finalStatus === 'SELECTED') {
    currentStage = 'Selected (Final)';
  } else if (finalStatus === 'REJECTED') {
    if (rejectedIn === 'Screening') currentStage = 'Rejected in Screening';
    else if (rejectedIn === 'Test') currentStage = 'Rejected in Test';
    else if (rejectedIn && rejectedIn.startsWith('Round ')) {
      const roundNum = rejectedIn.replace('Round ', '');
      currentStage = `Rejected in Interview Round ${roundNum}`;
    } else {
      currentStage = 'Rejected';
    }
  } else {
    // ONGOING
    if (screening === 'RESUME_SELECTED') {
      currentStage = 'Screening Qualified';
    } else if (screening === 'TEST_SELECTED') {
      // Candidate has cleared screening + test and is eligible for interview
      if (hasInterviewSession && hasInterviewStarted) {
        // lastRoundReached is "last completed round" => current round is +1
        const currentRound = Math.max(1, dbLastRoundReached + 1);
        currentStage = `Interview Round ${currentRound}`;
      } else {
        currentStage = 'Qualified for Interview';
      }
    } else if (screening === 'APPLIED') {
      currentStage = 'Applied';
    }
  }

  // Output "lastRoundReached" in the format expected by admin UI:
  // - If interview has started: show current interview round (1-based)
  // - If interview finished (selected/rejected in round): show round reached (db value)
  // - Otherwise: 0
  let lastRoundReachedOut = 0;
  if (finalStatus === 'SELECTED' || (finalStatus === 'REJECTED' && interview && interview.startsWith('REJECTED_IN_ROUND_'))) {
    lastRoundReachedOut = dbLastRoundReached || 0;
  } else if (hasInterviewSession && hasInterviewStarted && screening === 'TEST_SELECTED') {
    lastRoundReachedOut = Math.max(1, dbLastRoundReached + 1);
  }

  return {
    currentStage,
    finalStatus,
    rejectedIn,
    lastRoundReached: lastRoundReachedOut,
  };
}

/**
 * Get all applications (admin only)
 * Returns all applications in the system
 */
export async function getAllApplications(req, res) {
  try {
    const { status, jobId, studentId, page = 1, limit = 100 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (jobId) where.jobId = jobId;
    if (studentId) where.studentId = studentId;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        include: {
          job: {
            include: {
              company: true,
            },
          },
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              enrollmentId: true,
            },
          },
        },
        orderBy: { appliedDate: 'desc' },
      }),
      prisma.application.count({ where }),
    ]);

    // Format for frontend compatibility
    const formatted = applications.map(app => ({
      id: app.id,
      studentId: app.studentId,
      jobId: app.jobId,
      companyId: app.companyId,
      status: app.status,
      screeningStatus: app.screeningStatus || 'APPLIED',
      screeningRemarks: app.screeningRemarks || null,
      screeningCompletedAt: app.screeningCompletedAt || null,
      appliedDate: app.appliedDate,
      interviewDate: app.interviewDate,
      company: app.job?.company || { name: 'Unknown Company' },
      job: {
        jobTitle: app.job?.jobTitle || 'Unknown Position',
        ...app.job,
      },
      student: app.student || null,
    }));

    res.json({
      applications: formatted,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get all applications error:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
}

/**
 * Get screening summary for a job (admin only)
 * GET /api/applications/job/:jobId/screening-summary
 */
export async function getJobScreeningSummary(req, res) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Get all applications for this job
    const applications = await prisma.application.findMany({
      where: { jobId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            enrollmentId: true,
            batch: true,
            center: true,
            school: true,
            resumeUrl: true,
            resumeFileName: true
          }
        }
      },
      orderBy: { appliedDate: 'desc' }
    });

    // Calculate screening funnel
    const summary = {
      total: applications.length,
      applied: applications.filter(a => !a.screeningStatus || a.screeningStatus === 'APPLIED').length,
      resumeSelected: applications.filter(a => a.screeningStatus === 'RESUME_SELECTED').length,
      resumeRejected: applications.filter(a => a.screeningStatus === 'RESUME_REJECTED').length,
      testSelected: applications.filter(a => a.screeningStatus === 'TEST_SELECTED').length,
      testRejected: applications.filter(a => a.screeningStatus === 'TEST_REJECTED').length
    };

    // Group applications by screening status
    const byStatus = {
      APPLIED: applications.filter(a => !a.screeningStatus || a.screeningStatus === 'APPLIED'),
      RESUME_SELECTED: applications.filter(a => a.screeningStatus === 'RESUME_SELECTED'),
      RESUME_REJECTED: applications.filter(a => a.screeningStatus === 'RESUME_REJECTED'),
      TEST_SELECTED: applications.filter(a => a.screeningStatus === 'TEST_SELECTED'),
      TEST_REJECTED: applications.filter(a => a.screeningStatus === 'TEST_REJECTED')
    };

    res.json({
      summary,
      applications: applications.map(app => ({
        id: app.id,
        studentId: app.studentId,
        student: app.student,
        screeningStatus: app.screeningStatus || 'APPLIED',
        screeningRemarks: app.screeningRemarks || null,
        screeningCompletedAt: app.screeningCompletedAt || null,
        appliedDate: app.appliedDate
      })),
      byStatus
    });
  } catch (error) {
    console.error('Get job screening summary error:', error);
    res.status(500).json({ error: 'Failed to get screening summary', details: error.message });
  }
}

/**
 * Get student applications
 * Replaces: getStudentApplications(), subscribeStudentApplications()
 */
export async function getStudentApplications(req, res) {
  try {
    const userId = req.userId;
    console.log('📋 [getStudentApplications] Request received for userId:', userId);

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    console.log('📋 [getStudentApplications] Student found:', student ? { id: student.id } : 'NOT FOUND');

    // If student doesn't exist yet, return empty array (for new users)
    if (!student) {
      console.warn('⚠️ [getStudentApplications] Student not found, returning empty array');
      return res.json([]);
    }

    console.log('📋 [getStudentApplications] Querying applications for studentId:', student.id);
    const applications = await prisma.application.findMany({
      where: { studentId: student.id },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { appliedDate: 'desc' },
    });

    console.log('📋 [getStudentApplications] Found applications:', applications.length);
    if (applications.length > 0) {
      console.log('📋 [getStudentApplications] Application IDs:', applications.map(app => ({
        id: app.id,
        jobId: app.jobId,
        status: app.status,
        jobTitle: app.job?.jobTitle
      })));
    }

    // Get interview sessions for these jobs
    const jobIds = applications.map(app => app.jobId);
    const interviewSessions = await prisma.interviewSession.findMany({
      where: { jobId: { in: jobIds } },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
        },
      },
    });

    const sessionMap = new Map(interviewSessions.map(s => [s.jobId, s]));

    // Get all round evaluations for these applications to show detailed status
    const applicationIds = applications.map(app => app.id);
    const allEvaluations = await prisma.roundEvaluation.findMany({
      where: { applicationId: { in: applicationIds } },
      include: {
        round: {
          select: { roundNumber: true, name: true },
        },
      },
      orderBy: { round: { roundNumber: 'asc' } },
    });

    const evaluationsByApp = new Map();
    allEvaluations.forEach(evaluation => {
      if (!evaluationsByApp.has(evaluation.applicationId)) {
        evaluationsByApp.set(evaluation.applicationId, []);
      }
      evaluationsByApp.get(evaluation.applicationId).push(evaluation);
    });

    // Format for frontend compatibility
    const formatted = applications.map(app => {
      const session = sessionMap.get(app.jobId);
      const evaluations = evaluationsByApp.get(app.id) || [];

      const screeningStatus = app.screeningStatus || 'APPLIED';
      const hasInterviewSession = !!session;
      const hasInterviewStarted = (app.lastRoundReached || 0) > 0 || evaluations.length > 0;

      const tracking = computeApplicationTrackingFields({
        status: app.status,
        screeningStatus,
        interviewStatus: app.interviewStatus,
        lastRoundReached: app.lastRoundReached || 0,
        hasInterviewSession,
        hasInterviewStarted,
      });

      // Keep existing fields for UI compatibility, but align wording + add canonical fields
      const screeningStatusText = (() => {
        const s = normalizeScreeningStatus(screeningStatus);
        if (s === 'RESUME_REJECTED') return 'Rejected in Screening';
        if (s === 'TEST_REJECTED') return 'Rejected in Test';
        if (s === 'RESUME_SELECTED') return 'Screening Qualified';
        if (s === 'TEST_SELECTED') return 'Qualified for Interview';
        return 'Applied';
      })();

      const interviewStatusText = (() => {
        // Only meaningful after test qualification
        if (normalizeScreeningStatus(screeningStatus) !== 'TEST_SELECTED') return null;
        return tracking.currentStage;
      })();

      return {
        id: app.id,
        studentId: app.studentId,
        jobId: app.jobId,
        companyId: app.companyId,
        status: app.status,
        appliedDate: app.appliedDate,
        interviewDate: app.interviewDate,
        company: app.job?.company || { name: 'Unknown Company' },
        job: {
          jobTitle: app.job?.jobTitle || 'Unknown Position',
          ...app.job,
        },
        screeningStatus: screeningStatus, // Include raw screening status
        screeningStatusText: screeningStatusText, // Human-readable screening status
        currentStage: tracking.currentStage,
        finalStatus: tracking.finalStatus,
        rejectedIn: tracking.rejectedIn,
        interviewStatus: {
          hasSession: !!session,
          statusText: interviewStatusText,
          lastRoundStatus: null, // Deprecated: use currentStage/finalStatus/rejectedIn
          lastRoundReached: tracking.lastRoundReached,
        },
      };
    });

    console.log('📋 [getStudentApplications] Returning formatted applications:', formatted.length);
    if (formatted.length === 0) {
      console.warn('⚠️ [getStudentApplications] No applications found for studentId:', student.id);
      console.warn('⚠️ [getStudentApplications] This could mean:');
      console.warn('   1. Student has not applied to any jobs yet');
      console.warn('   2. Applications exist but studentId mismatch');
      console.warn('   3. Database query returned empty result');
    }
    res.json(formatted);
  } catch (error) {
    console.error('❌ [getStudentApplications] Error:', error);
    console.error('❌ [getStudentApplications] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to get applications' });
  }
}

/**
 * Get student interview history with rounds and evaluation details
 * GET /api/applications/student/interview-history
 */
export async function getStudentInterviewHistory(req, res) {
  try {
    const userId = req.userId;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.json([]);
    }

    // Get all applications
    const applications = await prisma.application.findMany({
      where: { studentId: student.id },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { appliedDate: 'desc' },
    });

    // Get all interview sessions for the jobs this student applied to (NEW SYSTEM)
    const jobIds = applications.map(app => app.jobId);
    const interviewSessions = await prisma.interviewSession.findMany({
      where: { jobId: { in: jobIds } },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
        },
      },
    });

    // Get all round evaluations for this student's applications (NEW SYSTEM)
    const applicationIds = applications.map(app => app.id);
    const roundEvaluations = await prisma.roundEvaluation.findMany({
      where: { applicationId: { in: applicationIds } },
      include: {
        round: {
          select: {
            id: true,
            roundNumber: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create a map of jobId -> interviewSession
    const sessionMap = new Map(interviewSessions.map(session => [session.jobId, session]));
    
    // Create a map of applicationId -> evaluations
    const evaluationMap = new Map();
    roundEvaluations.forEach(evaluation => {
      if (!evaluationMap.has(evaluation.applicationId)) {
        evaluationMap.set(evaluation.applicationId, []);
      }
      evaluationMap.get(evaluation.applicationId).push(evaluation);
    });

    // Format applications with interview history (NEW SYSTEM)
    const formatted = applications.map(app => {
      const session = sessionMap.get(app.jobId);
      const appEvaluations = evaluationMap.get(app.id) || [];
      
      // Determine screening status text (PRIORITY: Screening status shown before interview status)
      let screeningStatusText = null;
      const screeningStatus = app.screeningStatus || 'APPLIED';
      
      if (screeningStatus === 'RESUME_REJECTED') {
        screeningStatusText = 'Rejected in Resume Screening';
      } else if (screeningStatus === 'TEST_REJECTED') {
        screeningStatusText = 'Rejected in Screening Test';
      } else if (screeningStatus === 'TEST_SELECTED') {
        screeningStatusText = 'Qualified for Interview';
      } else if (screeningStatus === 'RESUME_SELECTED') {
        screeningStatusText = 'Resume Selected';
      } else {
        screeningStatusText = 'Applied (Screening Pending)';
      }
      
      // Get rounds from session
      const rounds = session?.rounds || [];

      // Determine which round the student reached
      let lastRoundReached = null;
      let lastEvaluationStatus = null;
      let highestRoundNumber = -1;
      const roundsReached = [];

      if (appEvaluations.length > 0 && rounds.length > 0) {
        // Find the highest round they were evaluated in
        appEvaluations.forEach(evaluation => {
          const round = evaluation.round;
          if (round && round.roundNumber > highestRoundNumber) {
            highestRoundNumber = round.roundNumber;
            lastRoundReached = round.name;
            lastEvaluationStatus = evaluation.status;
          }
          if (round && !roundsReached.includes(round.name)) {
            roundsReached.push(round.name);
          }
        });
      }

      // Also check application.lastRoundReached for fallback
      if (!lastRoundReached && app.lastRoundReached && app.lastRoundReached > 0) {
        const round = rounds.find(r => r.roundNumber === app.lastRoundReached);
        if (round) {
          lastRoundReached = round.name;
        }
      }

      // Determine final status
      let finalStatus = app.status;
      let isCracked = false;
      let isRejected = false;

      if (app.interviewStatus === 'SELECTED') {
        isCracked = true;
        finalStatus = 'SELECTED';
      } else if (app.interviewStatus && app.interviewStatus.startsWith('REJECTED_IN_ROUND_')) {
        isRejected = true;
        finalStatus = 'REJECTED';
      } else if (lastEvaluationStatus === 'SELECTED') {
        // Check if this was the final round
        if (session && rounds.length > 0) {
          const maxRound = Math.max(...rounds.map(r => r.roundNumber));
          if (highestRoundNumber === maxRound) {
            isCracked = true;
            finalStatus = 'SELECTED';
          }
        }
      } else if (lastEvaluationStatus === 'REJECTED') {
        isRejected = true;
        finalStatus = 'REJECTED';
      } else if (app.status === 'SELECTED' || app.status === 'OFFERED') {
        isCracked = true;
      } else if (app.status === 'REJECTED') {
        isRejected = true;
      }

      return {
        id: app.id,
        studentId: app.studentId,
        jobId: app.jobId,
        companyId: app.companyId,
        status: finalStatus,
        appliedDate: app.appliedDate,
        interviewDate: app.interviewDate,
        screeningStatus: screeningStatus, // Include raw screening status
        screeningStatusText: screeningStatusText, // Human-readable screening status
        company: app.job?.company || null,
        job: {
          jobTitle: app.job?.jobTitle || '',
          ...app.job,
        },
        // Interview history fields (NEW SYSTEM)
        interviewHistory: session ? {
          interviewId: session.id,
          hasInterview: true,
          rounds: rounds.map(r => ({
            name: r.name,
            roundNumber: r.roundNumber,
            status: r.status,
            criteria: null, // Not stored in new system
          })),
          lastRoundReached: lastRoundReached,
          roundsReached: roundsReached,
          evaluations: appEvaluations.map(e => ({
            roundName: e.round?.name || `Round ${e.round?.roundNumber}`,
            roundNumber: e.round?.roundNumber,
            marks: null, // Not stored in new system
            remarks: e.remarks,
            status: e.status,
            evaluatedAt: e.createdAt,
          })),
          isCracked,
          isRejected,
        } : {
          hasInterview: false,
        },
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get student interview history error:', error);
    res.status(500).json({ error: 'Failed to get interview history', details: error.message });
  }
}

/**
 * Admin: Get applications for a specific job with pipeline stage
 * GET /api/admin/jobs/:jobId/applications
 *
 * Query params:
 * - page, limit
 * - q (search: name/email/enrollmentId)
 * - stage (Applied | Screening Qualified | Qualified for Interview | Interview Round 1 | Interview Round 2 | Selected | Rejected)
 * - finalStatus (ONGOING | SELECTED | REJECTED)
 * - lastRoundReached (number, current round display for ongoing interviews)
 * - sortBy (appliedAt | name | stage)
 * - order (asc | desc)
 */
export async function getAdminJobApplications(req, res) {
  try {
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ error: 'Job ID is required' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limitRaw = parseInt(req.query.limit || '25', 10) || 25;
    const limit = Math.min(100, Math.max(1, limitRaw));

    const q = (req.query.q || '').trim();
    const stage = (req.query.stage || '').trim();
    const finalStatusFilter = (req.query.finalStatus || '').trim().toUpperCase();
    const lastRoundFilter = req.query.lastRoundReached !== undefined && req.query.lastRoundReached !== ''
      ? parseInt(String(req.query.lastRoundReached), 10)
      : null;
    const schoolFilter = (req.query.school || '').trim();
    const batchFilter = (req.query.batch || '').trim();

    const sortBy = (req.query.sortBy || 'appliedAt').trim();
    const order = ((req.query.order || 'desc').trim().toLowerCase() === 'asc') ? 'asc' : 'desc';

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { company: true },
    });

    if (!job) return res.status(404).json({ error: 'Job not found' });

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { jobId },
      select: { id: true },
    });
    const hasInterviewSession = !!interviewSession;

    // Build WHERE clause (server-side filters)
    const studentWhere = {};
    
    // Search filter
    if (q) {
      studentWhere.OR = [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { enrollmentId: { contains: q } },
      ];
    }
    
    // School filter
    if (schoolFilter) {
      studentWhere.school = schoolFilter;
    }
    
    // Batch filter
    if (batchFilter) {
      studentWhere.batch = batchFilter;
    }
    
    const where = {
      jobId,
      ...(Object.keys(studentWhere).length > 0 ? { student: studentWhere } : {}),
    };

    // Final status filter (server-side)
    if (finalStatusFilter === 'SELECTED') {
      where.OR = [{ interviewStatus: 'SELECTED' }, { status: 'SELECTED' }];
    } else if (finalStatusFilter === 'REJECTED') {
      where.OR = [
        { status: 'REJECTED' },
        { screeningStatus: { in: ['RESUME_REJECTED', 'TEST_REJECTED'] } },
        { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
      ];
    } else if (finalStatusFilter === 'ONGOING') {
      where.NOT = {
        OR: [
          { interviewStatus: 'SELECTED' },
          { status: 'SELECTED' },
          { status: 'REJECTED' },
          { screeningStatus: { in: ['RESUME_REJECTED', 'TEST_REJECTED'] } },
          { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
        ],
      };
    }

    // Stage filter (best-effort using DB fields + derived interviewStarted)
    // NOTE: InterviewStarted is candidate-specific and inferred from RoundEvaluations/lastRoundReached.
    if (stage) {
      const normalizedStage = stage.toLowerCase();

      if (normalizedStage === 'applied') {
        where.screeningStatus = 'APPLIED';
      } else if (normalizedStage === 'screening qualified') {
        where.screeningStatus = 'RESUME_SELECTED';
      } else if (normalizedStage === 'qualified for interview' || normalizedStage === 'test qualified') {
        where.screeningStatus = 'TEST_SELECTED';
        if (hasInterviewSession) {
          // Ensure interview not started yet
          where.AND = [
            ...(where.AND || []),
            {
              OR: [
                { lastRoundReached: 0 },
                { lastRoundReached: null },
              ],
            },
            { roundEvaluations: { none: {} } },
          ];
        }
      } else if (normalizedStage.startsWith('interview round')) {
        const roundNum = parseInt(normalizedStage.replace('interview round', '').trim(), 10);
        if (!Number.isNaN(roundNum)) {
          where.screeningStatus = 'TEST_SELECTED';
          if (hasInterviewSession) {
            // currentRound = lastRoundReached + 1 => lastRoundReached == (roundNum - 1) when ongoing
            where.AND = [
              ...(where.AND || []),
              { roundEvaluations: { some: {} } },
              { lastRoundReached: Math.max(0, roundNum - 1) },
              {
                NOT: {
                  OR: [
                    { interviewStatus: 'SELECTED' },
                    { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
                  ],
                },
              },
            ];
          }
        }
      } else if (normalizedStage === 'selected') {
        where.OR = [{ interviewStatus: 'SELECTED' }, { status: 'SELECTED' }];
      } else if (normalizedStage === 'rejected') {
        where.OR = [
          { status: 'REJECTED' },
          { screeningStatus: { in: ['RESUME_REJECTED', 'TEST_REJECTED'] } },
          { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
        ];
      }
    }

    // Base orderBy (Prisma can't sort by computed stage; we'll sort in-memory for that)
    let orderByClause = { appliedDate: order };
    if (sortBy === 'name') orderByClause = { student: { fullName: order } };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              enrollmentId: true,
              publicProfileId: true,
              school: true,
              batch: true,
              center: true,
            },
          },
          roundEvaluations: {
            select: { id: true },
            take: 1,
          },
        },
        orderBy: orderByClause,
      }),
      prisma.application.count({ where }),
    ]);

    // Compute per-application stage fields
    const frontendUrl = process.env.FRONTEND_URL || '';

    let mapped = applications.map(app => {
      const hasInterviewStarted = (app.lastRoundReached || 0) > 0 || (app.roundEvaluations && app.roundEvaluations.length > 0);
      const tracking = computeApplicationTrackingFields({
        status: app.status,
        screeningStatus: app.screeningStatus,
        interviewStatus: app.interviewStatus,
        lastRoundReached: app.lastRoundReached || 0,
        hasInterviewSession,
        hasInterviewStarted,
      });

      const publicProfileId = app.student?.publicProfileId || null;
      const profileLink = publicProfileId && frontendUrl ? `${frontendUrl}/profile/${publicProfileId}` : (publicProfileId ? `/profile/${publicProfileId}` : null);

      return {
        applicationId: app.id,
        student: {
          id: app.student?.id,
          name: app.student?.fullName || 'Unknown',
          email: app.student?.email || '',
          enrollmentId: app.student?.enrollmentId || null,
          school: app.student?.school || null,
          batch: app.student?.batch || null,
          center: app.student?.center || null,
          profileLink,
        },
        currentStage: tracking.currentStage,
        lastRoundReached: tracking.lastRoundReached,
        finalStatus: tracking.finalStatus,
        rejectedIn: tracking.rejectedIn,
        appliedAt: app.appliedDate,
      };
    });

    // Optional lastRound filter on derived output (post-processing)
    if (typeof lastRoundFilter === 'number' && !Number.isNaN(lastRoundFilter)) {
      mapped = mapped.filter(r => (r.lastRoundReached || 0) === lastRoundFilter);
    }

    // In-memory stage sort if requested
    if (sortBy === 'stage') {
      const orderFactor = order === 'asc' ? 1 : -1;
      const stageRank = (s) => {
        const v = String(s || '').toLowerCase();
        if (v === 'applied') return 1;
        if (v === 'screening qualified') return 2;
        if (v === 'qualified for interview') return 3;
        if (v.startsWith('interview round 1')) return 4;
        if (v.startsWith('interview round 2')) return 5;
        if (v.startsWith('interview round')) return 6;
        if (v.startsWith('selected')) return 7;
        if (v.startsWith('rejected')) return 8;
        return 99;
      };
      mapped.sort((a, b) => (stageRank(a.currentStage) - stageRank(b.currentStage)) * orderFactor);
    }

    // Job-level stats summary (for header counters)
    // Keep counts based on DB fields (fast) + relationship for interviewStarted.
    const [totalApplications, selectedCount, rejectedCount, shortlistedCount, interviewingCount] = await Promise.all([
      prisma.application.count({ where: { jobId } }),
      prisma.application.count({
        where: { jobId, OR: [{ interviewStatus: 'SELECTED' }, { status: 'SELECTED' }] },
      }),
      prisma.application.count({
        where: {
          jobId,
          OR: [
            { status: 'REJECTED' },
            { screeningStatus: { in: ['RESUME_REJECTED', 'TEST_REJECTED'] } },
            { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
          ],
        },
      }),
      prisma.application.count({
        where: {
          jobId,
          screeningStatus: 'RESUME_SELECTED',
          NOT: {
            OR: [
              { status: 'REJECTED' },
              { status: 'SELECTED' },
              { interviewStatus: 'SELECTED' },
              { screeningStatus: { in: ['RESUME_REJECTED', 'TEST_REJECTED'] } },
              { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
            ],
          },
        },
      }),
      hasInterviewSession
        ? prisma.application.count({
            where: {
              jobId,
              screeningStatus: 'TEST_SELECTED',
              roundEvaluations: { some: {} },
              NOT: {
                OR: [
                  { interviewStatus: 'SELECTED' },
                  { interviewStatus: { startsWith: 'REJECTED_IN_ROUND_' } },
                ],
              },
            },
          })
        : Promise.resolve(0),
    ]);

    res.json({
      success: true,
      job: {
        id: job.id,
        title: job.jobTitle,
        companyName: job.company?.name || job.companyName || 'Unknown Company',
      },
      stats: {
        totalApplications,
        shortlisted: shortlistedCount,
        interviewing: interviewingCount,
        selected: selectedCount,
        rejected: rejectedCount,
      },
      applications: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [getAdminJobApplications] Error:', error);
    res.status(500).json({ error: 'Failed to get job applications' });
  }
}

/**
 * Apply to job
 * Replaces: applyToJob()
 */
export async function applyToJob(req, res) {
  try {
    const { jobId } = req.params;
    const userId = req.userId;
    const { resumeId } = req.body; // Get resumeId from request body

    console.log('📝 [applyToJob] Application request:', {
      jobId,
      userId,
      resumeId,
    });

    // Get student
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Check if already applied
    const existing = await prisma.application.findUnique({
      where: {
        studentId_jobId: {
          studentId: student.id,
          jobId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already applied to this job' });
    }

    // Validate resumeId if provided
    if (resumeId) {
      const resume = await prisma.studentResumeFile.findUnique({
        where: { id: resumeId },
        select: { studentId: true },
      });

      if (!resume) {
        return res.status(404).json({ error: 'Resume not found' });
      }

      if (resume.studentId !== student.id) {
        return res.status(403).json({ error: 'Resume does not belong to this student' });
      }

      console.log('✅ [applyToJob] Resume validated:', {
        resumeId,
        studentId: resume.studentId,
      });
    }

    // Get job with full details for email
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        recruiter: {
          include: {
            user: {
              select: {
                email: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get student with full details including CGPA and backlogs
    const studentProfile = await prisma.student.findUnique({
      where: { id: student.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        cgpa: true,
        backlogs: true,
      },
    });

    // Validate CGPA requirement
    if (job.minCgpa) {
      const jobMinCgpa = job.minCgpa;
      const studentCgpa = studentProfile.cgpa ? parseFloat(String(studentProfile.cgpa)) : null;

      if (studentCgpa === null || isNaN(studentCgpa)) {
        return res.status(400).json({ 
          error: 'CGPA requirement check failed',
          message: 'Your CGPA is not set in your profile. Please update your profile with your current CGPA to apply for this job.',
          requirement: `This job requires a minimum CGPA of ${jobMinCgpa}`,
        });
      }

      // Parse job requirement - could be CGPA (0-10) or percentage (0-100)
      const requirementStr = String(jobMinCgpa).trim();
      let requiredCgpa = null;

      // Check if it's a percentage (ends with %)
      if (requirementStr.endsWith('%')) {
        const percentage = parseFloat(requirementStr.slice(0, -1));
        if (!isNaN(percentage)) {
          // Convert percentage to CGPA (assuming 10-point scale: 70% = 7.0)
          requiredCgpa = percentage / 10;
        }
      } else {
        // Try to parse as CGPA directly
        requiredCgpa = parseFloat(requirementStr);
      }

      if (!isNaN(requiredCgpa) && studentCgpa < requiredCgpa) {
        const requirementDisplay = requirementStr.endsWith('%') 
          ? `${requirementStr} (${requiredCgpa.toFixed(2)} CGPA)` 
          : `${requiredCgpa.toFixed(2)}`;
        
        return res.status(400).json({ 
          error: 'CGPA requirement not met',
          message: `Your current CGPA (${studentCgpa.toFixed(2)}) does not meet the minimum requirement for this job.`,
          requirement: `This job requires a minimum CGPA of ${requirementDisplay}`,
          yourCgpa: studentCgpa.toFixed(2),
          requiredCgpa: requirementDisplay,
        });
      }
    }

    // Validate backlogs requirement
    if (job.backlogs) {
      const jobBacklogsRequirement = job.backlogs.trim().toLowerCase();
      const studentBacklogs = studentProfile.backlogs ? String(studentProfile.backlogs).trim() : null;

      if (studentBacklogs === null || studentBacklogs === '') {
        return res.status(400).json({ 
          error: 'Backlogs requirement check failed',
          message: 'Your backlogs count is not set in your profile. Please update your profile with your current backlogs count to apply for this job.',
          requirement: `This job allows: ${jobBacklogsRequirement}`,
        });
      }

      // Parse job requirement - could be "0", "1-2", "No", "1", etc.
      const requirementStr = jobBacklogsRequirement;
      let isAllowed = false;

      // Handle different requirement formats
      if (requirementStr === 'no' || requirementStr === '0' || requirementStr === 'none') {
        // Job allows no backlogs
        const studentBacklogsNum = parseInt(studentBacklogs) || 0;
        isAllowed = studentBacklogsNum === 0;
      } else if (requirementStr.includes('-')) {
        // Range format: "1-2", "0-1", etc.
        const [minStr, maxStr] = requirementStr.split('-').map(s => s.trim());
        const minBacklogs = parseInt(minStr) || 0;
        const maxBacklogs = parseInt(maxStr) || 0;
        const studentBacklogsNum = parseInt(studentBacklogs) || 0;
        isAllowed = studentBacklogsNum >= minBacklogs && studentBacklogsNum <= maxBacklogs;
      } else {
        // Single number: "1", "2", etc.
        const maxAllowed = parseInt(requirementStr) || 0;
        const studentBacklogsNum = parseInt(studentBacklogs) || 0;
        isAllowed = studentBacklogsNum <= maxAllowed;
      }

      if (!isAllowed) {
        return res.status(400).json({ 
          error: 'Backlogs requirement not met',
          message: `Your current backlogs count (${studentBacklogs}) does not meet the requirement for this job.`,
          requirement: `This job allows: ${jobBacklogsRequirement}`,
          yourBacklogs: studentBacklogs,
          allowedBacklogs: jobBacklogsRequirement,
        });
      }
    }

    // Create application with resumeId (store in notes field for now, or extend schema later)
    // Note: To properly store resumeId, we'd need to add a resumeId field to Application model
    // For now, we'll store it in the notes field as JSON
    const applicationData = {
      studentId: student.id,
      jobId,
      companyId: job.companyId || null, // Ensure it's null if undefined
      status: 'APPLIED',
      screeningStatus: 'APPLIED', // Initialize screening status for recruiter screening flow
      appliedDate: new Date(),
      notes: resumeId ? JSON.stringify({ resumeId }) : null, // Store resumeId in notes for now
    };

    console.log('📝 [applyToJob] Creating application with data:', {
      studentId: applicationData.studentId,
      jobId: applicationData.jobId,
      companyId: applicationData.companyId,
      hasResumeId: !!resumeId,
    });

    const application = await prisma.application.create({
      data: applicationData,
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    console.log('✅ [applyToJob] Application created:', {
      applicationId: application.id,
      resumeId,
    });

    // Update student stats
    await prisma.student.update({
      where: { id: student.id },
      data: {
        statsApplied: { increment: 1 },
      },
    });

    // Mark job as viewed/applied in tracking
    try {
      await prisma.jobTracking.upsert({
        where: {
          studentId_jobId: {
            studentId: student.id,
            jobId,
          },
        },
        update: {
          applied: true,
          appliedAt: new Date(),
        },
        create: {
          studentId: student.id,
          jobId,
          applied: true,
          appliedAt: new Date(),
        },
      });
      console.log('✅ [applyToJob] Job tracking updated');
    } catch (trackingError) {
      // Don't fail application creation if tracking fails
      console.warn('⚠️ [applyToJob] Failed to update job tracking:', trackingError);
      logger.warn(`Failed to update job tracking for application ${application.id}:`, trackingError);
    }

    // Send email notifications (to recruiter and applicant)
    try {
      if (studentProfile && job.recruiter) {
        await sendApplicationNotification(studentProfile, job, job.recruiter);
        logger.info(`Application notification sent for application ${application.id}`);
      }
    } catch (emailError) {
      // Don't fail the request if email fails - log and continue
      logger.error(`Failed to send application notification for application ${application.id}:`, emailError);
    }

    // Notify all admins about the new application
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      if (admins.length > 0) {
        const studentName = studentProfile?.fullName || 'A student';
        const companyName = job.company?.name || 'Unknown Company';
        
        await Promise.all(
          admins.map((admin) =>
            createNotification({
              userId: admin.id,
              title: `New Application: ${studentName} applied for ${job.jobTitle}`,
              body: `${studentName} applied for ${job.jobTitle} at ${companyName}.`,
              data: {
                type: 'application',
                applicationId: application.id,
                jobId: job.id,
                jobTitle: job.jobTitle,
                companyName: companyName,
                studentId: student.id,
                studentName: studentName,
                appliedAt: application.appliedDate || new Date(),
              },
            })
          )
        );
        logger.info(`Application notifications sent to ${admins.length} admins for application ${application.id}`);
      }
    } catch (notificationError) {
      // Don't fail application creation if notification fails
      logger.error(`Failed to send application notifications for application ${application.id}:`, notificationError);
    }

    // Format response to match frontend expectations (same format as getStudentApplications)
    const formattedApplication = {
      id: application.id,
      studentId: application.studentId,
      jobId: application.jobId,
      companyId: application.companyId,
      status: application.status,
      screeningStatus: application.screeningStatus || 'APPLIED',
      appliedDate: application.appliedDate,
      interviewDate: application.interviewDate,
      company: application.job?.company || job.company || { name: job.companyName || 'Unknown Company' },
      job: {
        jobTitle: application.job?.jobTitle || job.jobTitle || 'Unknown Position',
        ...application.job,
        ...job, // Include all job fields
      },
      screeningStatusText: 'Applied (Screening Pending)',
      interviewStatus: {
        hasSession: false,
        statusText: null,
        lastRoundStatus: null,
        lastRoundReached: 0,
      },
    };

    // Emit real-time update via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`student:${userId}`).emit('application:created', formattedApplication);
    }

    // Return formatted application (matching getStudentApplications format)
    res.status(201).json(formattedApplication);
  } catch (error) {
    console.error('❌ [applyToJob] Error:', error);
    console.error('❌ [applyToJob] Error message:', error.message);
    console.error('❌ [applyToJob] Error stack:', error.stack);
    console.error('❌ [applyToJob] Error code:', error.code);
    console.error('❌ [applyToJob] Error meta:', error.meta);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to apply to job';
    let statusCode = 500;
    
    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      // Unique constraint violation (likely already applied)
      errorMessage = 'Already applied to this job';
      statusCode = 400;
    } else if (error.code === 'P2003') {
      // Foreign key constraint violation
      errorMessage = 'Invalid job or student reference';
      statusCode = 400;
    } else if (error.code === 'P2025') {
      // Record not found
      errorMessage = 'Job or student not found';
      statusCode = 404;
    } else if (error.message) {
      // Use the actual error message if available
      errorMessage = error.message;
    }
    
    logger.error(`[applyToJob] Failed to apply to job:`, {
      error: errorMessage,
      code: error.code,
      jobId: req.params?.jobId,
      userId: req.userId,
      stack: error.stack,
    });
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Update application status
 * Replaces: updateApplicationStatus()
 */
export async function updateApplicationStatus(req, res) {
  try {
    const { applicationId } = req.params;
    const { status, interviewDate } = req.body;

    // Get application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const oldStatus = application.status;

    // Update application
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
        interviewDate: interviewDate ? new Date(interviewDate) : undefined,
      },
      include: {
        job: true,
      },
    });

    // Update student stats
    if (oldStatus !== status) {
      const statsUpdates = {};

      // Decrement old status
      if (oldStatus === 'SHORTLISTED') statsUpdates.statsShortlisted = { decrement: 1 };
      else if (oldStatus === 'INTERVIEWED') statsUpdates.statsInterviewed = { decrement: 1 };
      else if (oldStatus === 'OFFERED') statsUpdates.statsOffers = { decrement: 1 };

      // Increment new status
      if (status === 'SHORTLISTED') statsUpdates.statsShortlisted = { increment: 1 };
      else if (status === 'INTERVIEWED') statsUpdates.statsInterviewed = { increment: 1 };
      else if (status === 'OFFERED') statsUpdates.statsOffers = { increment: 1 };

      if (Object.keys(statsUpdates).length > 0) {
        await prisma.student.update({
          where: { id: application.studentId },
          data: statsUpdates,
        });
      }
    }

    // Create in-app notification for student
    await createNotification({
      userId: application.student.user.id,
      title: 'Application Status Updated',
      body: `Your application for ${updated.job.jobTitle} has been updated to ${status}.`,
      data: {
        type: 'application_status_update',
        applicationId: updated.id,
        jobId: updated.jobId,
        status,
      },
    });

    // Send email notification to student (don't fail if email fails)
    try {
      if (application.student && updated.job) {
        await sendApplicationStatusUpdateNotification(application.student, updated.job, updated);
        logger.info(`Application status update email sent for application ${updated.id}`);
      }
    } catch (emailError) {
      // Don't fail the request if email fails - log and continue
      logger.error(`Failed to send application status update email for application ${updated.id}:`, emailError);
    }

    // Emit real-time update
    const io = getIO();
    if (io) {
      io.to(`student:${application.student.user.id}`).emit('application:updated', updated);
    }

    res.json(updated);
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
}
