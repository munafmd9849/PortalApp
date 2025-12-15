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

    // Format for frontend compatibility
    const formatted = applications.map(app => ({
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
    }));

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

    // Get all interviews for the jobs this student applied to
    const jobIds = applications.map(app => app.jobId);
    const interviews = await prisma.interview.findMany({
      where: { jobId: { in: jobIds } },
    });

    // Get all interview evaluations for this student
    const evaluations = await prisma.interviewEvaluation.findMany({
      where: { studentId: student.id },
      orderBy: { evaluatedAt: 'desc' },
    });

    // Create a map of interviewId -> interview
    const interviewMap = new Map(interviews.map(int => [int.jobId, int]));
    
    // Create a map of interviewId -> evaluations for this student
    const evaluationMap = new Map();
    evaluations.forEach(evaluation => {
      if (!evaluationMap.has(evaluation.interviewId)) {
        evaluationMap.set(evaluation.interviewId, []);
      }
      evaluationMap.get(evaluation.interviewId).push(evaluation);
    });

    // Format applications with interview history
    const formatted = applications.map(app => {
      const interview = interviewMap.get(app.jobId);
      const appEvaluations = interview ? (evaluationMap.get(interview.id) || []) : [];
      
      // Parse rounds from interview
      let rounds = [];
      if (interview?.rounds) {
        try {
          rounds = typeof interview.rounds === 'string' 
            ? JSON.parse(interview.rounds) 
            : interview.rounds;
        } catch (e) {
          console.error('Error parsing rounds:', e);
          rounds = [];
        }
      }

      // Determine which round the student reached
      let lastRoundReached = null;
      let lastEvaluationStatus = null;
      let highestRoundIndex = -1;

      if (appEvaluations.length > 0 && rounds.length > 0) {
        // Find the highest round they were evaluated in
        appEvaluations.forEach(evaluation => {
          const roundIndex = rounds.findIndex(r => r.name === evaluation.roundName);
          if (roundIndex > highestRoundIndex) {
            highestRoundIndex = roundIndex;
            lastRoundReached = evaluation.roundName;
            lastEvaluationStatus = evaluation.status;
          }
        });
      }

      // Determine final status
      // If status is SELECTED/OFFERED -> cracked (green)
      // If status is REJECTED -> rejected (yellow)
      // Otherwise use application status
      let finalStatus = app.status;
      let isCracked = false;
      let isRejected = false;

      if (lastEvaluationStatus === 'SELECTED') {
        isCracked = true;
        finalStatus = 'SELECTED';
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
        company: app.job?.company || { name: 'Unknown Company' },
        job: {
          jobTitle: app.job?.jobTitle || 'Unknown Position',
          ...app.job,
        },
        // Interview history fields
        interviewHistory: interview ? {
          interviewId: interview.id,
          hasInterview: true,
          rounds: rounds,
          lastRoundReached: lastRoundReached,
          roundsReached: appEvaluations.map(e => e.roundName),
          evaluations: appEvaluations.map(e => ({
            roundName: e.roundName,
            marks: e.marks,
            remarks: e.remarks,
            status: e.status,
            evaluatedAt: e.evaluatedAt,
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

    // Create application
    const application = await prisma.application.create({
      data: {
        studentId: student.id,
        jobId,
        companyId: job.companyId,
        status: 'APPLIED',
        appliedDate: new Date(),
      },
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
