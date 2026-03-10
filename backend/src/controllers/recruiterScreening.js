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
    if (!token || token.length < 50) {
      console.warn(`⚠️ Token too short (${token?.length || 0} chars), likely truncated`);
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'recruiter_screening') {
      console.warn(`⚠️ Token type mismatch: ${decoded.type}`);
      return null;
    }
    return decoded;
  } catch (error) {
    console.error(`❌ Token verification error:`, error.message);
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
    // Support both:
    // - GET /api/recruiter/screening/session?token=...&jobId=...
    // - POST /api/recruiter/screening/session { jobId } with Authorization: Bearer <token>
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    let jobId = req.body?.jobId || req.query?.jobId;

    // If token is provided, verify it. If jobId isn't provided, derive it from token.
    let decoded = null;
    if (token) {
      decoded = verifyScreeningToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      if (!jobId) {
        jobId = decoded.jobId;
      } else if (decoded.jobId !== jobId) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Get job with recruiter email and pre-interview requirements
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        recruiterEmail: true,
        recruiterName: true,
        applicationDeadline: true,
        requiresScreening: true,
        requiresTest: true,
        company: {
          select: { name: true }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ 
        success: false,
        error: 'Job not found',
        message: 'The job you are trying to access does not exist.'
      });
    }

    if (!job.recruiterEmail) {
      return res.status(400).json({ 
        success: false,
        error: 'Recruiter email not configured',
        message: 'Recruiter email is not configured for this job. Please contact the administrator.'
      });
    }

    // Check if application deadline has passed
    const now = new Date();
    const deadline = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
    if (deadline && now < deadline) {
      return res.status(403).json({ 
        success: false,
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
            resumeUrl: true, // Legacy field (fallback)
            resumeFileName: true,
            resumeFiles: {
              where: { isDefault: true },
              select: {
                fileUrl: true,
                fileName: true,
                isDefault: true
              },
              take: 1
            }
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
        applicationDeadline: job.applicationDeadline,
        requiresScreening: job.requiresScreening || false,
        requiresTest: job.requiresTest || false
      },
      applications: applications.map(app => {
        // Get resume URL from new StudentResumeFile (preferred) or fallback to old resumeUrl
        const defaultResume = app.student.resumeFiles?.[0];
        const resumeUrl = defaultResume?.fileUrl || app.student.resumeUrl;
        const resumeFileName = defaultResume?.fileName || app.student.resumeFileName;
        
        return {
          id: app.id,
          studentId: app.studentId,
          student: {
            ...app.student,
            resumeUrl: resumeUrl, // Use new Cloudinary URL if available, fallback to old
            resumeFileName: resumeFileName
          },
          screeningStatus: app.screeningStatus || 'APPLIED',
          screeningRemarks: app.screeningRemarks || null,
          screeningCompletedAt: app.screeningCompletedAt || null,
          appliedDate: app.appliedDate
        };
      }),
      summary: {
        total: applications.length,
        applied: applications.filter(a => !a.screeningStatus || a.screeningStatus === 'APPLIED').length,
        screeningSelected: applications.filter(a => a.screeningStatus === 'SCREENING_SELECTED').length,
        screeningRejected: applications.filter(a => a.screeningStatus === 'SCREENING_REJECTED').length,
        testSelected: applications.filter(a => a.screeningStatus === 'TEST_SELECTED').length,
        testRejected: applications.filter(a => a.screeningStatus === 'TEST_REJECTED').length,
        interviewEligible: applications.filter(a => a.screeningStatus === 'INTERVIEW_ELIGIBLE').length,
        // Legacy fields for backward compatibility
        resumeSelected: applications.filter(a => a.screeningStatus === 'SCREENING_SELECTED').length,
        resumeRejected: applications.filter(a => a.screeningStatus === 'SCREENING_REJECTED').length
      }
    });
  } catch (error) {
    console.error('Get screening session error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get screening session',
      message: 'An error occurred while loading the screening session. Please try again.'
    });
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
      return res.status(401).json({ 
        success: false,
        error: 'Token is required',
        message: 'Access token is required. Please use the link from your email.'
      });
    }

    const decoded = verifyScreeningToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token',
        message: 'Your access token is invalid or has expired. Please use the link from your email.'
      });
    }

    // Validate screening status (updated status names)
    const validStatuses = ['APPLIED', 'SCREENING_SELECTED', 'SCREENING_REJECTED', 'TEST_SELECTED', 'TEST_REJECTED', 'INTERVIEW_ELIGIBLE'];
    if (!validStatuses.includes(screeningStatus)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid screening status',
        message: `Invalid screening status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Get application to verify it belongs to the job and check requirements
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          select: {
            id: true,
            recruiterEmail: true,
            requiresScreening: true,
            requiresTest: true
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ 
        success: false,
        error: 'Application not found',
        message: 'The application you are trying to update does not exist.'
      });
    }

    // Verify token matches job
    if (application.job.id !== decoded.jobId) {
      return res.status(403).json({ 
        success: false,
        error: 'Token does not match this application',
        message: 'You do not have permission to update this application.'
      });
    }

    // Validate status transitions and job requirements
    const currentStatus = application.screeningStatus || 'APPLIED';
    const job = application.job;
    
    // Validate that screening actions are only allowed if requiresScreening is true
    if ((screeningStatus === 'SCREENING_SELECTED' || screeningStatus === 'SCREENING_REJECTED') && !job.requiresScreening) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid action',
        message: 'Resume screening is not required for this job.'
      });
    }
    
    // Validate that test actions are only allowed if requiresTest is true
    if ((screeningStatus === 'TEST_SELECTED' || screeningStatus === 'TEST_REJECTED') && !job.requiresTest) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid action',
        message: 'QA/Test is not required for this job.'
      });
    }
    
    // If test is required, can only move to TEST status if SCREENING_SELECTED (if screening is also required)
    // OR if screening is not required, can move directly to TEST from APPLIED
    if (job.requiresTest && (screeningStatus === 'TEST_REJECTED' || screeningStatus === 'TEST_SELECTED')) {
      if (job.requiresScreening && currentStatus !== 'SCREENING_SELECTED') {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid status transition',
          message: 'Cannot move to test stage without first selecting the resume. Please select the resume first.'
        });
      }
      if (!job.requiresScreening && currentStatus !== 'APPLIED') {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid status transition',
          message: 'Invalid status transition for this application.'
        });
      }
    }

    // Determine final status after update
    // Automatically convert to INTERVIEW_ELIGIBLE when candidate passes final stage:
    // - If TEST_SELECTED: Candidate passed both screening + test → INTERVIEW_ELIGIBLE
    // - If SCREENING_SELECTED and job only requires screening (no test): Candidate passed screening → INTERVIEW_ELIGIBLE
    let finalStatus = screeningStatus;
    
    if (screeningStatus === 'TEST_SELECTED') {
      // Job requires test: candidate passed test → eligible for interview
      finalStatus = 'INTERVIEW_ELIGIBLE';
    } else if (screeningStatus === 'SCREENING_SELECTED' && job.requiresScreening && !job.requiresTest) {
      // Job only requires screening (no test): candidate passed screening → eligible for interview
      finalStatus = 'INTERVIEW_ELIGIBLE';
    }
    
    // Update application
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        screeningStatus: finalStatus,
        screeningRemarks: screeningRemarks?.trim() || null,
        screeningCompletedAt: (finalStatus === 'INTERVIEW_ELIGIBLE' || finalStatus === 'TEST_REJECTED' || finalStatus === 'SCREENING_REJECTED') 
          ? new Date() 
          : application.screeningCompletedAt
      }
    });

    res.json({
      success: true,
      message: 'Screening decision saved successfully',
      application: {
        id: updated.id,
        screeningStatus: updated.screeningStatus,
        screeningRemarks: updated.screeningRemarks,
        screeningCompletedAt: updated.screeningCompletedAt
      }
    });
  } catch (error) {
    console.error('Update screening status error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update screening status',
      message: 'An error occurred while saving the screening decision. Please try again.'
    });
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
      return res.status(401).json({ 
        success: false,
        error: 'Token is required',
        message: 'Access token is required. Please use the link from your email.'
      });
    }

    const decoded = verifyScreeningToken(token);
    if (!decoded || decoded.jobId !== jobId) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token',
        message: 'Your access token is invalid or has expired. Please use the link from your email.'
      });
    }

    // Get all applications for this job
    const applications = await prisma.application.findMany({
      where: { jobId }
    });

    // Get job requirements
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        requiresScreening: true,
        requiresTest: true
      }
    });

    if (!job) {
      return res.status(404).json({ 
        success: false,
        error: 'Job not found',
        message: 'The job does not exist.'
      });
    }

    // Check if all applications have been decided based on requirements
    const undecided = applications.filter(app => {
      const status = app.screeningStatus || 'APPLIED';
      
      // If both required: must reach INTERVIEW_ELIGIBLE or be rejected
      if (job.requiresScreening && job.requiresTest) {
        return status === 'APPLIED' || status === 'SCREENING_SELECTED' || status === 'TEST_SELECTED';
      }
      // If only screening required: must reach SCREENING_SELECTED or be rejected
      if (job.requiresScreening && !job.requiresTest) {
        return status === 'APPLIED';
      }
      // If only test required: must reach INTERVIEW_ELIGIBLE or be rejected
      if (!job.requiresScreening && job.requiresTest) {
        return status === 'APPLIED' || status === 'TEST_SELECTED';
      }
      // If neither required: all are eligible (shouldn't reach here if email logic is correct)
      return false;
    });

    if (undecided.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot finalize screening',
        message: `${undecided.length} application(s) still need to be decided. Please complete all screening decisions before finalizing.`
      });
    }

    // Mark all remaining SCREENING_SELECTED as completed (if test stage was skipped but screening completed)
    // Also handle case where only screening was required
    if (job.requiresScreening && !job.requiresTest) {
      await prisma.application.updateMany({
        where: {
          jobId,
          screeningStatus: 'SCREENING_SELECTED'
        },
        data: {
          screeningStatus: 'INTERVIEW_ELIGIBLE', // If only screening required, selected = eligible
          screeningCompletedAt: new Date()
        }
      });
    } else if (job.requiresScreening && job.requiresTest) {
      // Mark any remaining SCREENING_SELECTED as completed (shouldn't happen if logic is correct)
      await prisma.application.updateMany({
        where: {
          jobId,
          screeningStatus: 'SCREENING_SELECTED'
        },
        data: {
          screeningCompletedAt: new Date()
        }
      });
    }

    res.json({
      success: true,
      message: 'Screening finalized successfully. All decisions are now locked.',
      summary: {
        total: applications.length,
        interviewEligible: applications.filter(a => a.screeningStatus === 'INTERVIEW_ELIGIBLE').length,
        rejected: applications.filter(a => 
          a.screeningStatus === 'SCREENING_REJECTED' || a.screeningStatus === 'TEST_REJECTED'
        ).length
      }
    });
  } catch (error) {
    console.error('Finalize screening error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to finalize screening',
      message: 'An error occurred while finalizing screening. Please try again.'
    });
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

/**
 * Stream resume for viewing in browser (inline, not download)
 * GET /api/recruiter/screening/resume/:applicationId?token=...&jobId=...
 * Fetches the resume from storage and streams with Content-Disposition: inline so the PDF opens in the tab.
 */
export async function streamResume(req, res) {
  try {
    const { applicationId } = req.params;
    const token = req.query.token;
    const jobId = req.query.jobId;

    if (!token || !jobId) {
      return res.status(401).json({ error: 'Token and jobId are required' });
    }

    const decoded = verifyScreeningToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (decoded.jobId !== jobId) {
      return res.status(403).json({ error: 'Token does not match job' });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { select: { id: true } },
        student: {
          select: {
            resumeUrl: true,
            resumeFileName: true,
            resumeFiles: {
              where: { isDefault: true },
              select: { fileUrl: true, fileName: true },
              take: 1
            }
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (application.jobId !== decoded.jobId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const defaultResume = application.student?.resumeFiles?.[0];
    const resumeUrl = defaultResume?.fileUrl || application.student?.resumeUrl;
    const fileName = defaultResume?.fileName || application.student?.resumeFileName || 'resume.pdf';

    if (!resumeUrl || resumeUrl.trim() === '') {
      return res.status(404).json({ error: 'Resume not found for this application' });
    }

    const fetchResponse = await fetch(resumeUrl, { method: 'GET' });
    if (!fetchResponse.ok) {
      return res.status(502).json({ error: 'Failed to load resume from storage' });
    }

    const buffer = await fetchResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(buffer);

    // Force inline display (not download): set headers and send raw bytes with res.end
    const safeName = (fileName || 'resume.pdf').replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'") || 'resume.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.status(200);
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Stream resume error:', error);
    res.status(500).json({ error: 'Failed to stream resume' });
  }
}
