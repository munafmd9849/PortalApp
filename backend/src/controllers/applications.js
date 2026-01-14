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

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    // If student doesn't exist yet, return empty array (for new users)
    if (!student) {
      return res.json([]);
    }

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
      let interviewStatusText = null;
      let lastRoundStatus = null;

      if (session && evaluations.length > 0) {
        // Get the last evaluation
        const lastEval = evaluations[evaluations.length - 1];
        const lastRound = session.rounds.find(r => r.id === lastEval.roundId);
        
        if (lastEval.status === 'SELECTED') {
          // Check if this was the final round
          const maxRound = Math.max(...session.rounds.map(r => r.roundNumber));
          if (lastRound && lastRound.roundNumber === maxRound) {
            interviewStatusText = 'Selected';
            lastRoundStatus = `Selected in ${lastRound.name}`;
          } else {
            interviewStatusText = `Selected in ${lastRound?.name || `Round ${lastRound?.roundNumber}`}`;
            lastRoundStatus = interviewStatusText;
          }
        } else if (lastEval.status === 'REJECTED') {
          interviewStatusText = `Rejected in ${lastRound?.name || `Round ${lastRound?.roundNumber}`}`;
          lastRoundStatus = interviewStatusText;
        } else if (lastEval.status === 'ON_HOLD') {
          interviewStatusText = `On Hold in ${lastRound?.name || `Round ${lastRound?.roundNumber}`}`;
          lastRoundStatus = interviewStatusText;
        }
      } else if (session) {
        if (session.status === 'COMPLETED') {
          if (app.interviewStatus === 'SELECTED') {
            interviewStatusText = 'Selected';
          } else if (app.interviewStatus && app.interviewStatus.startsWith('REJECTED_IN_ROUND_')) {
            const roundNum = app.interviewStatus.replace('REJECTED_IN_ROUND_', '');
            const round = session.rounds.find(r => r.roundNumber === parseInt(roundNum));
            interviewStatusText = round ? `Rejected in ${round.name}` : `Rejected in Round ${roundNum}`;
          } else {
            interviewStatusText = 'Interview Completed';
          }
        } else if (session.status === 'ONGOING') {
          const activeRound = session.rounds.find(r => r.status === 'ACTIVE');
          if (activeRound) {
            interviewStatusText = `Interview Ongoing - ${activeRound.name}`;
          } else {
            interviewStatusText = 'Interview Ongoing';
          }
        } else {
          interviewStatusText = 'Interview Not Started';
        }
      } else {
        // No interview session - but check if passed screening
        if (screeningStatus === 'TEST_SELECTED') {
          interviewStatusText = 'Qualified for Interview (Not Started)';
        } else if (app.status === 'SELECTED') {
          interviewStatusText = 'Selected';
        } else if (app.status === 'REJECTED') {
          interviewStatusText = 'Rejected';
        } else {
          // Keep screening status text
          interviewStatusText = screeningStatusText;
        }
      }

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
        interviewStatus: {
          hasSession: !!session,
          statusText: interviewStatusText,
          lastRoundStatus: lastRoundStatus, // Issue #2 - detailed round status
          lastRoundReached: app.lastRoundReached || 0,
        },
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get student applications error:', error);
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
    const { mock } = req.query; // Optional query parameter to return mock data

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      // Return mock data if requested
      if (mock === 'true') {
        const mockExample = {
          id: 'mock-interview-1',
          studentId: 'mock-student-1',
          jobId: 'mock-job-1',
          companyId: 'mock-company-1',
          status: 'REJECTED',
          appliedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          interviewDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          company: { 
            name: 'TechCorp Solutions',
            id: 'mock-company-1'
          },
          job: {
            jobTitle: 'Software Engineer - Full Stack',
            id: 'mock-job-1',
            location: 'Bangalore, India',
            experienceLevel: 'Mid Level',
            jobType: 'Full-Time',
          },
          interviewHistory: {
            interviewId: 'mock-interview-1',
            hasInterview: true,
            rounds: [
              { name: 'Technical Round 1', criteria: 'DSA and Problem Solving', status: 'completed' },
              { name: 'Technical Round 2', criteria: 'System Design and Architecture', status: 'completed' },
              { name: 'HR Round', criteria: 'Cultural fit and Communication', status: 'completed' }
            ],
            lastRoundReached: 'HR Round',
            roundsReached: ['Technical Round 1', 'Technical Round 2', 'HR Round'],
            evaluations: [
              {
                roundName: 'Technical Round 1',
                marks: 85,
                remarks: 'Strong problem-solving skills, good knowledge of data structures',
                status: 'SELECTED',
                evaluatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
              },
              {
                roundName: 'Technical Round 2',
                marks: 78,
                remarks: 'Good system design thinking, needs improvement in scalability concepts',
                status: 'SELECTED',
                evaluatedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
              },
              {
                roundName: 'HR Round',
                marks: null,
                remarks: 'Did not meet cultural fit requirements',
                status: 'REJECTED',
                evaluatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
              }
            ],
            isCracked: false,
            isRejected: true,
          },
        };
        return res.json([mockExample]);
      }
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
        company: app.job?.company || { name: 'Unknown Company' },
        job: {
          jobTitle: app.job?.jobTitle || 'Unknown Position',
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

    // If mock parameter is true or no interview history exists, return one mock example for demonstration
    if (mock === 'true' || (formatted.length === 0 || formatted.filter(app => app.interviewHistory?.hasInterview).length === 0)) {
      const mockExample = {
        id: 'mock-interview-1',
        studentId: student?.id || 'mock-student-1',
        jobId: 'mock-job-1',
        companyId: 'mock-company-1',
        status: 'REJECTED',
        appliedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        interviewDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        company: { 
          name: 'TechCorp Solutions',
          id: 'mock-company-1'
        },
        job: {
          jobTitle: 'Software Engineer - Full Stack',
          id: 'mock-job-1',
          location: 'Bangalore, India',
          experienceLevel: 'Mid Level',
          jobType: 'Full-Time',
        },
        interviewHistory: {
          interviewId: 'mock-interview-1',
          hasInterview: true,
          rounds: [
            { name: 'Technical Round 1', criteria: 'DSA and Problem Solving', status: 'completed' },
            { name: 'Technical Round 2', criteria: 'System Design and Architecture', status: 'completed' },
            { name: 'HR Round', criteria: 'Cultural fit and Communication', status: 'completed' }
          ],
          lastRoundReached: 'HR Round',
          roundsReached: ['Technical Round 1', 'Technical Round 2', 'HR Round'],
          evaluations: [
            {
              roundName: 'Technical Round 1',
              marks: 85,
              remarks: 'Strong problem-solving skills, good knowledge of data structures',
              status: 'SELECTED',
              evaluatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              roundName: 'Technical Round 2',
              marks: 78,
              remarks: 'Good system design thinking, needs improvement in scalability concepts',
              status: 'SELECTED',
              evaluatedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              roundName: 'HR Round',
              marks: null,
              remarks: 'Did not meet cultural fit requirements',
              status: 'REJECTED',
              evaluatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            }
          ],
          isCracked: false,
          isRejected: true,
        },
      };
      return res.json([mockExample]);
    }

    res.json(formatted);
  } catch (error) {
    console.error('Get student interview history error:', error);
    res.status(500).json({ error: 'Failed to get interview history', details: error.message });
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

    // Get student with full details for email
    const studentProfile = await prisma.student.findUnique({
      where: { id: student.id },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    // Create application with resumeId (store in notes field for now, or extend schema later)
    // Note: To properly store resumeId, we'd need to add a resumeId field to Application model
    // For now, we'll store it in the notes field as JSON
    const applicationData = {
      studentId: student.id,
      jobId,
      companyId: job.companyId,
      status: 'APPLIED',
      appliedDate: new Date(),
      notes: resumeId ? JSON.stringify({ resumeId }) : null, // Store resumeId in notes for now
    };

    const application = await prisma.application.create({
      data: applicationData,
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

    // Emit real-time update via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`student:${userId}`).emit('application:created', application);
    }

    res.status(201).json(application);
  } catch (error) {
    console.error('Apply to job error:', error);
    res.status(500).json({ error: 'Failed to apply to job' });
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
