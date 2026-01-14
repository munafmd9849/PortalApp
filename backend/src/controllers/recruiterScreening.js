/**
 * Recruiter Screening Controller
 * Handles token-based recruiter screening (no login required)
 * Pre-interview screening stages: RESUME_SHORTLIST, QA_TEST/SCREENING_TEST
 */

import prisma from '../config/database.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Generate secure token for recruiter screening session
 */
function generateScreeningToken(jobId, recruiterEmail) {
  return jwt.sign(
    { jobId, recruiterEmail, type: 'recruiter_screening' },
    JWT_SECRET,
    { expiresIn: '14d' } // 14 days expiration
  );
}

/**
 * Verify recruiter screening token
 */
function verifyScreeningToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'recruiter_screening') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Get or create recruiter screening session
 * POST /api/recruiter/screening/session
 * Body: { jobId }
 * Auth: Token-based (from email link)
 */
export async function getOrCreateScreeningSession(req, res) {
  try {
    const { jobId } = req.body;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    // If token provided, verify it
    if (token) {
      const decoded = verifyScreeningToken(token);
      if (!decoded || decoded.jobId !== jobId) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Get job with recruiter email
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        recruiterEmail: true,
        recruiterName: true,
        applicationDeadline: true,
        company: {
          select: { name: true }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!job.recruiterEmail) {
      return res.status(400).json({ error: 'Recruiter email not configured for this job' });
    }

    // Check if application deadline has passed
    const now = new Date();
    const deadline = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
    if (deadline && now < deadline) {
      return res.status(403).json({ 
        error: 'Screening is not available yet',
        message: `Application deadline is ${deadline.toLocaleDateString()}. Screening will be available after the deadline.`
      });
    }

    // Get or create screening session
    let session = await prisma.recruiterScreeningSession.findUnique({
      where: { jobId }
    });

    if (!session) {
      // Create new session with token
      const newToken = generateScreeningToken(jobId, job.recruiterEmail);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14); // 14 days from now

      session = await prisma.recruiterScreeningSession.create({
        data: {
          jobId,
          token: newToken,
          expiresAt
        }
      });
    } else {
      // Check if token expired
      if (new Date(session.expiresAt) < now) {
        // Generate new token
        const newToken = generateScreeningToken(jobId, job.recruiterEmail);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);

        session = await prisma.recruiterScreeningSession.update({
          where: { id: session.id },
          data: {
            token: newToken,
            expiresAt
          }
        });
      }
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

    res.json({
      session: {
        id: session.id,
        jobId: session.jobId,
        token: session.token,
        expiresAt: session.expiresAt
      },
      job: {
        id: job.id,
        jobTitle: job.jobTitle,
        companyName: job.companyName || job.company?.name || 'Unknown Company',
        recruiterEmail: job.recruiterEmail,
        recruiterName: job.recruiterName,
        applicationDeadline: job.applicationDeadline
      },
      applications: applications.map(app => ({
        id: app.id,
        studentId: app.studentId,
        student: app.student,
        screeningStatus: app.screeningStatus || 'APPLIED',
        screeningRemarks: app.screeningRemarks || null,
        screeningCompletedAt: app.screeningCompletedAt || null,
        appliedDate: app.appliedDate
      })),
      summary: {
        total: applications.length,
        applied: applications.filter(a => !a.screeningStatus || a.screeningStatus === 'APPLIED').length,
        resumeSelected: applications.filter(a => a.screeningStatus === 'RESUME_SELECTED').length,
        resumeRejected: applications.filter(a => a.screeningStatus === 'RESUME_REJECTED').length,
        testSelected: applications.filter(a => a.screeningStatus === 'TEST_SELECTED').length,
        testRejected: applications.filter(a => a.screeningStatus === 'TEST_REJECTED').length
      }
    });
  } catch (error) {
    console.error('Get screening session error:', error);
    res.status(500).json({ error: 'Failed to get screening session', details: error.message });
  }
}

/**
 * Update application screening status
 * PATCH /api/recruiter/screening/application/:applicationId
 * Body: { screeningStatus, screeningRemarks? }
 * Auth: Token-based
 */
export async function updateScreeningStatus(req, res) {
  try {
    const { applicationId } = req.params;
    const { screeningStatus, screeningRemarks } = req.body;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token is required' });
    }

    const decoded = verifyScreeningToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Validate screening status
    const validStatuses = ['APPLIED', 'RESUME_REJECTED', 'RESUME_SELECTED', 'TEST_REJECTED', 'TEST_SELECTED'];
    if (!validStatuses.includes(screeningStatus)) {
      return res.status(400).json({ error: 'Invalid screening status' });
    }

    // Get application to verify it belongs to the job
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          select: {
            id: true,
            recruiterEmail: true
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Verify token matches job
    if (application.job.id !== decoded.jobId) {
      return res.status(403).json({ error: 'Token does not match this application' });
    }

    // Validate status transitions
    const currentStatus = application.screeningStatus || 'APPLIED';
    
    // Can only move to TEST status if RESUME_SELECTED
    if ((screeningStatus === 'TEST_REJECTED' || screeningStatus === 'TEST_SELECTED') && currentStatus !== 'RESUME_SELECTED') {
      return res.status(400).json({ 
        error: 'Invalid status transition',
        message: 'Cannot move to test stage without first selecting the resume'
      });
    }

    // Update application
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        screeningStatus,
        screeningRemarks: screeningRemarks?.trim() || null,
        screeningCompletedAt: screeningStatus === 'TEST_SELECTED' || screeningStatus === 'TEST_REJECTED' || screeningStatus === 'RESUME_REJECTED' 
          ? new Date() 
          : application.screeningCompletedAt
      }
    });

    res.json({
      success: true,
      application: {
        id: updated.id,
        screeningStatus: updated.screeningStatus,
        screeningRemarks: updated.screeningRemarks,
        screeningCompletedAt: updated.screeningCompletedAt
      }
    });
  } catch (error) {
    console.error('Update screening status error:', error);
    res.status(500).json({ error: 'Failed to update screening status', details: error.message });
  }
}

/**
 * Finalize screening (mark all as completed)
 * POST /api/recruiter/screening/finalize
 * Body: { jobId }
 * Auth: Token-based
 */
export async function finalizeScreening(req, res) {
  try {
    const { jobId } = req.body;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token is required' });
    }

    const decoded = verifyScreeningToken(token);
    if (!decoded || decoded.jobId !== jobId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get all applications for this job
    const applications = await prisma.application.findMany({
      where: { jobId }
    });

    // Check if all applications have been decided
    const undecided = applications.filter(app => {
      const status = app.screeningStatus || 'APPLIED';
      return status === 'APPLIED' || status === 'RESUME_SELECTED';
    });

    if (undecided.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot finalize screening',
        message: `${undecided.length} application(s) still need to be decided. Please complete all screening decisions before finalizing.`
      });
    }

    // Mark all remaining RESUME_SELECTED as completed (if any test stage was skipped)
    await prisma.application.updateMany({
      where: {
        jobId,
        screeningStatus: 'RESUME_SELECTED'
      },
      data: {
        screeningCompletedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Screening finalized successfully',
      summary: {
        total: applications.length,
        testSelected: applications.filter(a => a.screeningStatus === 'TEST_SELECTED').length,
        rejected: applications.filter(a => 
          a.screeningStatus === 'RESUME_REJECTED' || a.screeningStatus === 'TEST_REJECTED'
        ).length
      }
    });
  } catch (error) {
    console.error('Finalize screening error:', error);
    res.status(500).json({ error: 'Failed to finalize screening', details: error.message });
  }
}

/**
 * Middleware to verify recruiter screening token
 */
export function verifyRecruiterToken(req, res, next) {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token is required' });
  }

  const decoded = verifyScreeningToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Attach decoded token to request
  req.screeningToken = decoded;
  next();
}
