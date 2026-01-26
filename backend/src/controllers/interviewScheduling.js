/**
 * Interview Scheduling Controller (Production System)
 * Handles interview session management with strict state machine
 */

import prisma from '../config/database.js';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../config/email.js';
import logger from '../config/logger.js';
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendUnauthorized, sendForbidden, sendServerError } from '../utils/response.js';

/**
 * Generate secure token for interviewer invite
 */
function generateInterviewerToken(sessionId, email) {
  const payload = {
    sessionId,
    email,
    type: 'interviewer',
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: '30d', // 30 days expiry
  });
}

/**
 * CRITICAL: Auto-correct session status based on drive date
 * If drive date has passed and session is not COMPLETED, set to INCOMPLETE
 * This function is the single source of truth for session validity
 * 
 * @param {Object} session - InterviewSession object with job relation
 * @param {Object} job - Job object with driveDate
 * @returns {Promise<Object>} - Updated session object
 */
/**
 * CRITICAL: Auto-correct session status based on drive date
 * If drive date has passed and session is not COMPLETED, set to INCOMPLETE
 * This function is the single source of truth for session validity
 * 
 * @param {Object} session - InterviewSession object (may or may not have job relation)
 * @param {Object} job - Job object with driveDate
 * @returns {Promise<Object>} - Updated session object with same structure as input
 */
async function autoCorrectSessionStatus(session, job) {
  if (!session || !job || !job.driveDate) {
    return session;
  }

  // COMPLETED sessions remain COMPLETED forever - never auto-correct
  if (session.status === 'COMPLETED') {
    return session;
  }

  // FROZEN sessions are never auto-corrected (Super Admin freeze)
  if (session.status === 'FROZEN') {
    return session;
  }

  const now = new Date();
  const driveDate = new Date(job.driveDate);
  driveDate.setHours(23, 59, 59, 999); // End of drive date

  // If drive date has passed and session is not COMPLETED, mark as INCOMPLETE
  if (now > driveDate) {
    if (session.status !== 'INCOMPLETE') {
      // Update session to INCOMPLETE
      const updatedSession = await prisma.interviewSession.update({
        where: { id: session.id },
        data: {
          status: 'INCOMPLETE',
          completedAt: session.completedAt || new Date(), // Set completedAt if not already set
        },
        include: {
          rounds: {
            orderBy: { roundNumber: 'asc' },
          },
          interviewerInvites: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Update student application statuses
      await updateApplicationsForIncompleteSession(session.jobId);

      // Preserve original structure (if job relation was included, keep it)
      return {
        ...updatedSession,
        job: session.job || job, // Preserve job relation if it existed
      };
    }
  }

  return session;
}

/**
 * Update student application statuses when session becomes INCOMPLETE
 * 
 * @param {string} jobId - Job ID
 */
async function updateApplicationsForIncompleteSession(jobId) {
  try {
    // Get all applications for this job that might be affected
    const applications = await prisma.application.findMany({
      where: {
        jobId,
        screeningStatus: 'TEST_SELECTED', // Only eligible candidates
        interviewStatus: {
          not: 'SELECTED', // Don't update already selected candidates
        },
      },
    });

    // Update each application
    for (const app of applications) {
      // If they were mid-round, mark as INCOMPLETE
      // If they never reached interview rounds, mark as INTERVIEW_NOT_COMPLETED
      const newStatus = app.interviewStatus && app.interviewStatus.startsWith('REJECTED_IN_ROUND_')
        ? 'INCOMPLETE'
        : app.interviewStatus && app.interviewStatus !== 'APPLIED' && app.interviewStatus !== 'TEST_SELECTED'
        ? 'INCOMPLETE'
        : 'INTERVIEW_NOT_COMPLETED';

      await prisma.application.update({
        where: { id: app.id },
        data: {
          interviewStatus: newStatus,
        },
      });
    }
  } catch (error) {
    console.error('Error updating applications for incomplete session:', error);
    // Don't throw - this is a side effect, shouldn't fail the main operation
  }
}

/**
 * Send interviewer invite email
 */
async function sendInterviewerInviteEmail(email, sessionLink, jobTitle, companyName) {
  try {
    const subject = `Interview Session Invitation - ${jobTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Interview Session Invitation</h2>
        <p>Hello,</p>
        <p>You have been invited to participate in an interview session for:</p>
        <div style="background: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 5px 0;"><strong>Position:</strong> ${jobTitle}</p>
          <p style="margin: 5px 0;"><strong>Company:</strong> ${companyName}</p>
        </div>
        <p>Click the link below to access the interview session:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${sessionLink}" 
             style="background: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Access Interview Session
          </a>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This link is valid for 30 days. Please do not share this link with others.
        </p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email from PWIOI Placement Portal.</p>
      </div>
    `;
    const text = `You have been invited to participate in an interview session for ${jobTitle} at ${companyName}. Access the session at: ${sessionLink}`;

    await sendEmail({ to: email, subject, html, text });
    logger.info(`Interviewer invite email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send interviewer invite email to ${email}:`, error);
    throw error;
  }
}

/**
 * Get or create interview session for a job
 * GET /api/admin/interview-scheduling/session/:jobId
 * POST /api/admin/interview-scheduling/session
 */
export const getOrCreateSession = async (req, res) => {
  try {
    const { jobId } = req.method === 'GET' ? req.params : req.body;
    const userId = req.userId || req.user?.id;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in request' });
    }

    // Get user role for permission check
    const userRole = req.user?.role || req.userRole;
    const isRecruiter = userRole === 'RECRUITER' || userRole === 'recruiter';

    // Check if job exists and get driveDate
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        jobTitle: true,
        companyId: true,
        recruiterId: true,
        driveDate: true, // CRITICAL: Get driveDate for validation
        company: {
          select: {
            name: true
          }
        },
        recruiter: {
          select: {
            userId: true
          }
        },
        description: true
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Permission check: Recruiters can only access their own jobs
    if (isRecruiter) {
      if (!job.recruiter || job.recruiter.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to access this job\'s interview session' });
      }
    }

    // CRITICAL: Interview session cannot start before driveDate
    // Validate driveDate exists
    if (!job.driveDate) {
      return res.status(400).json({ 
        error: 'Drive date not configured',
        message: 'Drive date is not set for this job. Please set the drive date before creating interview sessions.'
      });
    }

    // Allow session creation before drive date (session is created but not started)
    // But block starting rounds before drive date (handled in startRound)
    // So we don't block session creation here, just validate driveDate exists

    // Get or create session
    let session = await prisma.interviewSession.findUnique({
      where: { jobId },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
        },
        interviewerInvites: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session) {
      // Create new session
      try {
        session = await prisma.interviewSession.create({
          data: {
            jobId,
            companyId: job.companyId || null,
            status: 'NOT_STARTED',
            createdBy: userId,
          },
          include: {
            rounds: {
              orderBy: { roundNumber: 'asc' },
            },
            interviewerInvites: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      } catch (createError) {
        // If create fails (e.g., unique constraint), try to fetch existing session
        if (createError.code === 'P2002') {
          session = await prisma.interviewSession.findUnique({
            where: { jobId },
            include: {
              rounds: {
                orderBy: { roundNumber: 'asc' },
              },
              interviewerInvites: {
                orderBy: { createdAt: 'desc' },
              },
            },
          });
          if (!session) {
            throw createError; // Re-throw if still not found
          }
        } else {
          throw createError;
        }
      }
    }
    
    // CRITICAL: Auto-correct session status based on drive date
    // This ensures system self-corrects even if UI is wrong
    session = await autoCorrectSessionStatus(session, job);
    
    // Safety: Ensure rounds and interviewerInvites are always arrays
    if (!Array.isArray(session.rounds)) {
      session.rounds = [];
    }
    if (!Array.isArray(session.interviewerInvites)) {
      session.interviewerInvites = [];
    }

    // Get application count (only INTERVIEW_ELIGIBLE or TEST_SELECTED candidates are eligible for interviews)
    const eligibleApplicationCount = await prisma.application.count({
      where: { 
        jobId,
        screeningStatus: {
          in: ['INTERVIEW_ELIGIBLE', 'TEST_SELECTED'] // Accept both for backward compatibility
        }
      },
    });

    const totalApplicationCount = await prisma.application.count({
      where: { jobId },
    });

    // Auto-populate rounds from job description if no rounds exist (Issue #7)
    let suggestedRounds = [];
    if (session.rounds.length === 0 && job.description) {
      // Try to extract round information from job description
      // Look for patterns like "Round 1:", "Round 2:", "Technical Round", "HR Round", etc.
      const roundPatterns = [
        /round\s*(\d+)[:\.]\s*([^\n]+)/gi,
        /(technical|hr|aptitude|coding|group discussion|final)[\s-]*round/gi,
      ];
      
      const description = job.description.toLowerCase();
      const foundRounds = new Set();
      
      // Extract explicit round mentions
      let match;
      const explicitRounds = [];
      while ((match = roundPatterns[0].exec(job.description)) !== null) {
        const roundNum = parseInt(match[1]);
        const roundName = match[2].trim();
        if (roundNum && roundName && !foundRounds.has(roundNum)) {
          explicitRounds.push({ roundNumber: roundNum, name: roundName });
          foundRounds.add(roundNum);
        }
      }
      
      // If no explicit rounds found, try common patterns
      if (explicitRounds.length === 0) {
        const commonRounds = [
          { name: 'Aptitude Test', keywords: ['aptitude', 'test', 'screening'] },
          { name: 'Technical Round 1', keywords: ['technical', 'coding', 'programming'] },
          { name: 'Technical Round 2', keywords: ['technical', 'advanced'] },
          { name: 'HR Round', keywords: ['hr', 'human resources', 'final'] },
        ];
        
        commonRounds.forEach((round, idx) => {
          if (round.keywords.some(kw => description.includes(kw))) {
            suggestedRounds.push({
              roundNumber: idx + 1,
              name: round.name,
            });
          }
        });
      } else {
        suggestedRounds = explicitRounds.sort((a, b) => a.roundNumber - b.roundNumber);
      }
    }

    // Calculate if drive date has been reached (for frontend display)
    const now = new Date();
    const driveDateCheck = new Date(job.driveDate);
    driveDateCheck.setHours(23, 59, 59, 999);
    const isDriveDateReached = now >= driveDateCheck;

    res.json({
      session: {
        id: session.id,
        jobId: session.jobId,
        status: session.status,
        createdAt: session.createdAt,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        job: {
          id: job.id,
          jobTitle: job.jobTitle,
          company: job.company ? { name: job.company.name } : null,
          description: job.description, // Include for round extraction
          driveDate: job.driveDate, // Include for frontend validation
        },
        isDriveDateReached: isDriveDateReached, // Helper for frontend
        totalApplications: totalApplicationCount,
        eligibleApplications: eligibleApplicationCount, // Only TEST_SELECTED candidates
        rounds: (Array.isArray(session.rounds) ? session.rounds : []).map(r => ({
          id: r.id,
          roundNumber: r.roundNumber,
          name: r.name,
          status: r.status,
          startedAt: r.startedAt,
          endedAt: r.endedAt,
        })),
        interviewerInvites: (Array.isArray(session.interviewerInvites) ? session.interviewerInvites : []).map(inv => ({
          id: inv.id,
          email: inv.email,
          expiresAt: inv.expiresAt,
          used: inv.used,
          createdAt: inv.createdAt,
        })),
        suggestedRounds: suggestedRounds, // Issue #7
      },
    });
  } catch (error) {
    console.error('Error getting/creating session:', {
      message: error.message,
      stack: error.stack,
      jobId: req.params?.jobId || req.body?.jobId,
      userId: req.userId || req.user?.id,
      method: req.method,
    });
    res.status(500).json({ 
      error: 'Failed to get/create session', 
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Configure rounds for interview session
 * POST /api/admin/interview-scheduling/session/:sessionId/rounds
 */
export const configureRounds = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rounds } = req.body; // Array of { name, roundNumber }

    if (!rounds || !Array.isArray(rounds) || rounds.length === 0) {
      return sendValidationError(res, 'rounds', 'Rounds array is required and must contain at least one round');
    }

    // Get session
    let session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { rounds: true },
    });

    if (!session) {
      return sendNotFound(res, 'Interview session');
    }

    // Get job to check drive date and ownership
    const userId = req.userId || req.user?.id;
    const userRole = req.user?.role || req.userRole;
    const isRecruiter = userRole === 'RECRUITER' || userRole === 'recruiter';

    const job = await prisma.job.findUnique({
      where: { id: session.jobId },
      select: { 
        driveDate: true,
        recruiter: {
          select: { userId: true }
        }
      },
    });

    if (!job) {
      return sendNotFound(res, 'Job');
    }

    // Permission check: Recruiters can only access their own jobs
    if (isRecruiter) {
      if (!job.recruiter || job.recruiter.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to configure rounds for this job' });
      }
    }

    // CRITICAL: Auto-correct session status before validation
    session = await autoCorrectSessionStatus(session, job);

    // Validate session status - reject COMPLETED and INCOMPLETE sessions
    if (session.status === 'COMPLETED') {
      return sendError(res, 'Cannot configure rounds for completed session', 'This interview session has been completed. Rounds cannot be modified.', 409);
    }

    if (session.status === 'INCOMPLETE') {
      return sendError(res, 'Cannot configure rounds for incomplete session', 'This interview session is incomplete (drive date passed). Rounds cannot be modified.', 409);
    }

    if (session.status === 'FROZEN') {
      return sendError(res, 'Cannot configure rounds for frozen session', 'A Super Admin has frozen this interview session. Rounds cannot be modified.', 409);
    }

    if (session.status === 'ONGOING') {
      return sendError(res, 'Cannot modify rounds while session is ongoing', 'Rounds cannot be modified while the interview session is in progress.', 409);
    }

    // Validate round numbers are sequential
    const roundNumbers = rounds.map(r => r.roundNumber || r.roundNumber).sort((a, b) => a - b);
    for (let i = 0; i < roundNumbers.length; i++) {
      if (roundNumbers[i] !== i + 1) {
        return sendValidationError(res, 'roundNumbers', `Round numbers must be sequential starting from 1. Found: ${roundNumbers.join(', ')}`);
      }
    }

    // Check for duplicate names
    const names = rounds.map(r => r.name.trim());
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      return sendValidationError(res, 'roundNames', 'Round names must be unique');
    }

    // Delete existing rounds (if any)
    await prisma.interviewRound.deleteMany({
      where: { sessionId },
    });

    // Create new rounds
    const createdRounds = await Promise.all(
      rounds.map(round =>
        prisma.interviewRound.create({
          data: {
            sessionId,
            roundNumber: round.roundNumber,
            name: round.name.trim(),
            status: 'LOCKED',
          },
        })
      )
    );

    sendSuccess(res, {
      rounds: createdRounds.map(r => ({
        id: r.id,
        roundNumber: r.roundNumber,
        name: r.name,
        status: r.status,
      })),
    }, 'Rounds configured successfully');
  } catch (error) {
    console.error('Error configuring rounds:', error);
    sendServerError(res, 'Failed to configure rounds. Please try again.');
  }
};

/**
 * Invite interviewers to session
 * POST /api/admin/interview-scheduling/session/:sessionId/invite-interviewers
 */
export const inviteInterviewers = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { emails } = req.body; // Array of email addresses

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return sendValidationError(res, 'emails', 'At least one interviewer email is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return sendValidationError(res, 'emails', `Invalid email format: ${invalidEmails.join(', ')}`);
    }

    // Get session
    const userId = req.userId || req.user?.id;
    const userRole = req.user?.role || req.userRole;
    const isRecruiter = userRole === 'RECRUITER' || userRole === 'recruiter';

    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        job: {
          include: { 
            company: true,
            recruiter: {
              select: { userId: true }
            }
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    // Permission check: Recruiters can only access their own jobs
    if (isRecruiter) {
      if (!session.job.recruiter || session.job.recruiter.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to invite interviewers for this job' });
      }
    }

    // FRONTEND_URL is validated at startup, so it's guaranteed to exist
    const frontendUrl = process.env.FRONTEND_URL;
    const invites = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    for (const email of emails) {
      // Check if invite already exists
      const existing = await prisma.interviewerInvite.findUnique({
        where: {
          sessionId_email: {
            sessionId,
            email,
          },
        },
      });

      let token;
      let invite;

      if (existing) {
        // Regenerate token if expired or used
        if (existing.expiresAt < new Date() || existing.used) {
          token = generateInterviewerToken(sessionId, email);
          invite = await prisma.interviewerInvite.update({
            where: { id: existing.id },
            data: {
              token,
              expiresAt,
              used: false,
              usedAt: null,
            },
          });
        } else {
          token = existing.token;
          invite = existing;
        }
      } else {
        // Create new invite
        token = generateInterviewerToken(sessionId, email);
        invite = await prisma.interviewerInvite.create({
          data: {
            sessionId,
            email,
            token,
            expiresAt,
          },
        });
      }

      const sessionLink = `${frontendUrl}/interview/session/${sessionId}?token=${encodeURIComponent(token)}`;

      // Send email
      try {
        await sendInterviewerInviteEmail(
          email,
          sessionLink,
          session.job.jobTitle,
          session.job.company?.name || 'Company'
        );
      } catch (emailError) {
        logger.error(`Failed to send email to ${email}:`, emailError);
        // Continue even if email fails - invite is still created
      }

      invites.push({
        email: invite.email,
        inviteLink: sessionLink,
        expiresAt: invite.expiresAt,
      });
    }

    sendSuccess(res, { invites }, 'Interviewers invited successfully');
  } catch (error) {
    console.error('Error inviting interviewers:', error);
    sendServerError(res, 'Failed to send interviewer invitations. Please try again.');
  }
};

/**
 * Get interview session (token-protected for interviewers)
 * GET /api/interview/session/:sessionId
 */
export const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    // Get token from query or authorization header
    let token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    // Decode URL-encoded token if needed
    if (token && token.includes('%')) {
      try {
        token = decodeURIComponent(token);
      } catch (e) {
        // If decoding fails, use original token
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Validate token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      
      // Log for debugging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('Token decoded:', { 
          type: decoded.type, 
          sessionId: decoded.sessionId, 
          email: decoded.email,
          urlSessionId: sessionId 
        });
      }
      
      if (decoded.type !== 'interviewer') {
        return res.status(403).json({ 
          error: 'Invalid token type', 
          details: `Expected 'interviewer', got '${decoded.type}'` 
        });
      }
      if (decoded.sessionId !== sessionId) {
        return res.status(403).json({ 
          error: 'Token session mismatch', 
          details: `Token is for session ${decoded.sessionId}, but URL requests ${sessionId}` 
        });
      }
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ 
          error: 'Token has expired', 
          details: 'Please request a new invitation link from the administrator.' 
        });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          error: 'Invalid token format', 
          details: err.message 
        });
      }
      return res.status(403).json({ 
        error: 'Token validation failed', 
        details: err.message 
      });
    }

    // Get session first to check if it's completed
    const sessionCheck = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });

    if (sessionCheck?.status === 'COMPLETED') {
      return res.status(403).json({ 
        error: 'Session completed',
        details: 'This interview session has been completed. The access link is no longer valid.' 
      });
    }

    // Check if token is valid in database
    const invite = await prisma.interviewerInvite.findFirst({
      where: {
        token,
        sessionId,
        email: decoded.email,
      },
    });

    // Log for debugging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Database lookup:', {
        tokenFound: !!invite,
        sessionId,
        email: decoded.email,
        inviteId: invite?.id,
        inviteExpiresAt: invite?.expiresAt,
        inviteUsed: invite?.used
      });
    }

    if (!invite) {
      // Try to find invite without email match (for debugging)
      const inviteByToken = await prisma.interviewerInvite.findFirst({
        where: { token },
      });
      
      if (inviteByToken) {
        return res.status(403).json({ 
          error: 'Token email mismatch',
          details: `Token email (${decoded.email}) does not match invite email (${inviteByToken.email})` 
        });
      }
      
      return res.status(403).json({ 
        error: 'Token not found in database',
        details: 'This token may not have been properly saved. Please contact the administrator.' 
      });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(403).json({ 
        error: 'Token has expired',
        details: `Token expired on ${new Date(invite.expiresAt).toLocaleString()}` 
      });
    }

    if (invite.used) {
      return res.status(403).json({ 
        error: 'Token has already been used',
        details: `Token was used on ${invite.usedAt ? new Date(invite.usedAt).toLocaleString() : 'unknown date'}. The session may have been completed.` 
      });
    }

    // Get session
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        job: {
          include: { company: true },
        },
        rounds: {
          orderBy: { roundNumber: 'asc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ 
        error: 'Interview session not found',
        details: `No session found with ID: ${sessionId}` 
      });
    }

    res.json({
      id: session.id,
      jobId: session.jobId,
      status: session.status,
      job: {
        id: session.job.id,
        jobTitle: session.job.jobTitle,
        company: session.job.company ? { name: session.job.company.name } : null,
      },
      rounds: session.rounds.map(r => ({
        id: r.id,
        roundNumber: r.roundNumber,
        name: r.name,
        status: r.status,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
      })),
      createdAt: session.createdAt,
      startedAt: session.startedAt,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session', details: error.message });
  }
};

/**
 * Get active round
 * GET /api/interview/session/:sessionId/active-round
 */
export const getActiveRound = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Validate token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      if (decoded.type !== 'interviewer' || decoded.sessionId !== sessionId) {
        return res.status(403).json({ error: 'Invalid token' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Validate token in database
    const invite = await prisma.interviewerInvite.findFirst({
      where: {
        token,
        sessionId,
        email: decoded.email,
      },
    });

    if (!invite || invite.expiresAt < new Date() || invite.used) {
      return res.status(403).json({ error: 'Token expired or invalid' });
    }

    // Get active round
    const activeRound = await prisma.interviewRound.findFirst({
      where: {
        sessionId,
        status: 'ACTIVE',
      },
      orderBy: { roundNumber: 'desc' },
    });

    if (!activeRound) {
      return res.status(404).json({ error: 'No active round found' });
    }

    res.json({
      id: activeRound.id,
      roundNumber: activeRound.roundNumber,
      name: activeRound.name,
      status: activeRound.status,
      startedAt: activeRound.startedAt,
    });
  } catch (error) {
    console.error('Error fetching active round:', error);
    res.status(500).json({ error: 'Failed to fetch active round', details: error.message });
  }
};

/**
 * Get candidates for a round
 * GET /api/interview/round/:roundId/candidates
 */
export const getRoundCandidates = async (req, res) => {
  try {
    const { roundId } = req.params;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Validate token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      if (decoded.type !== 'interviewer') {
        return res.status(403).json({ error: 'Invalid token type' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Get round
    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: {
        session: {
          include: { job: true },
        },
      },
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Validate token for this session
    const invite = await prisma.interviewerInvite.findFirst({
      where: {
        token,
        sessionId: round.sessionId,
        email: decoded.email,
      },
    });

    if (!invite || invite.expiresAt < new Date() || invite.used) {
      return res.status(403).json({ error: 'Token expired or invalid' });
    }

    // Check round status
    if (round.status !== 'ACTIVE') {
      return res.status(409).json({ error: `Round is ${round.status}. Only ACTIVE rounds can be accessed.` });
    }

    // Get all applications for this job
    // CRITICAL: Only include candidates who passed screening (INTERVIEW_ELIGIBLE or TEST_SELECTED for backward compatibility)
    // INTERVIEW_ELIGIBLE is the final status after screening is finalized
    let applications = await prisma.application.findMany({
      where: { 
        jobId: round.session.jobId,
        screeningStatus: {
          in: ['INTERVIEW_ELIGIBLE', 'TEST_SELECTED'] // Accept both for backward compatibility
        }
      },
      include: {
        student: {
          include: { 
            user: true,
            resumeFiles: {
              where: { isDefault: true },
              select: {
                fileUrl: true,
                fileName: true,
                isDefault: true
              },
              take: 1
            }
          },
        },
      },
    });

    // If no eligible candidates found, return empty list with warning
    if (applications.length === 0) {
      console.warn(`No INTERVIEW_ELIGIBLE or TEST_SELECTED candidates found for job ${round.session.jobId}. Interview session can only include candidates who passed screening.`);
    } else {
      console.log(`✅ [getRoundCandidates] Found ${applications.length} eligible candidates for round ${round.name} (Round ${round.roundNumber})`);
    }

    // Backend-enforced filtering: For rounds after the first, only show SELECTED from previous round
    if (round.roundNumber > 1) {
      // Get previous round
      const previousRound = await prisma.interviewRound.findFirst({
        where: {
          sessionId: round.sessionId,
          roundNumber: round.roundNumber - 1,
        },
      });

      if (!previousRound) {
        return res.status(400).json({ error: 'Previous round not found' });
      }

      if (previousRound.status !== 'ENDED') {
        return res.status(409).json({
          error: `Previous round "${previousRound.name}" must be ended before accessing this round`,
        });
      }

      // Get SELECTED candidates from previous round
      const previousEvaluations = await prisma.roundEvaluation.findMany({
        where: {
          roundId: previousRound.id,
          status: 'SELECTED',
        },
        select: { applicationId: true },
      });

      const selectedApplicationIds = new Set(previousEvaluations.map(e => e.applicationId));
      applications = applications.filter(app => selectedApplicationIds.has(app.id));
    }

    // Get evaluations for current round
    const evaluations = await prisma.roundEvaluation.findMany({
      where: { roundId },
    });

    // Get previous round evaluations to show remarks (Issue #4)
    let previousRoundEvaluations = [];
    if (round.roundNumber > 1) {
      const previousRound = await prisma.interviewRound.findFirst({
        where: {
          sessionId: round.sessionId,
          roundNumber: round.roundNumber - 1,
        },
      });

      if (previousRound) {
        previousRoundEvaluations = await prisma.roundEvaluation.findMany({
          where: { roundId: previousRound.id },
        });
      }
    }

    const evaluationMap = new Map(evaluations.map(e => [e.applicationId, e]));
    const previousEvaluationMap = new Map(previousRoundEvaluations.map(e => [e.applicationId, e]));

    // Get student skills for candidates
    const studentIds = applications.map(app => app.student.id);
    const skills = await prisma.skill.findMany({
      where: { studentId: { in: studentIds } },
    });
    const skillsMap = new Map();
    skills.forEach(skill => {
      if (!skillsMap.has(skill.studentId)) {
        skillsMap.set(skill.studentId, []);
      }
      skillsMap.get(skill.studentId).push(skill.skillName);
    });

    // Format candidates
    const candidates = applications.map(app => {
      const evaluation = evaluationMap.get(app.id);
      const previousEvaluation = previousEvaluationMap.get(app.id);
      
      // Get resume URL from new StudentResumeFile (preferred) or fallback to old resumeUrl
      const defaultResume = app.student.resumeFiles?.[0];
      const resumeUrl = defaultResume?.fileUrl || app.student.resumeUrl;
      
      return {
        applicationId: app.id,
        student: {
          id: app.student.id,
          fullName: app.student.fullName,
          email: app.student.email,
          enrollmentId: app.student.enrollmentId,
          batch: app.student.batch,
          resumeUrl: resumeUrl, // Use new Cloudinary URL if available, fallback to old
          skills: skillsMap.get(app.student.id) || [],
        },
        evaluation: evaluation ? {
          status: evaluation.status,
          remarks: evaluation.remarks,
          createdAt: evaluation.createdAt,
        } : null,
        previousRoundRemarks: previousEvaluation?.remarks || null, // Issue #4
      };
    });

    res.json({
      round: {
        id: round.id,
        roundNumber: round.roundNumber,
        name: round.name,
        status: round.status,
        sessionId: round.sessionId,
      },
      candidates,
    });
  } catch (error) {
    console.error('Error fetching round candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates', details: error.message });
  }
};

/**
 * Evaluate a candidate
 * POST /api/interview/round/:roundId/evaluate
 */
export const evaluateCandidate = async (req, res) => {
  try {
    const { roundId } = req.params;
    const { applicationId, status, remarks } = req.body;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    if (!status || !['SELECTED', 'REJECTED', 'ON_HOLD'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (SELECTED, REJECTED, ON_HOLD)' });
    }

    // Validate token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      if (decoded.type !== 'interviewer') {
        return res.status(403).json({ error: 'Invalid token type' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Get round
    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: { session: true },
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Check round status
    if (round.status !== 'ACTIVE') {
      return res.status(409).json({ error: 'Round is not active. Cannot evaluate candidates.' });
    }

    if (round.session?.status === 'FROZEN') {
      return res.status(409).json({
        error: 'Interview session is frozen',
        message: 'A Super Admin has frozen this interview session. Evaluations are paused.',
      });
    }

    // Validate token
    const invite = await prisma.interviewerInvite.findFirst({
      where: {
        token,
        sessionId: round.sessionId,
        email: decoded.email,
      },
    });

    if (!invite || invite.expiresAt < new Date() || invite.used) {
      return res.status(403).json({ error: 'Token expired or invalid' });
    }

    // Validate application exists
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Validate remarks for REJECTED or ON_HOLD
    if ((status === 'REJECTED' || status === 'ON_HOLD') && (!remarks || remarks.trim().length === 0)) {
      return res.status(400).json({ error: 'Remarks are required for REJECTED or ON_HOLD status' });
    }

    // Upsert evaluation
    const evaluation = await prisma.roundEvaluation.upsert({
      where: {
        roundId_applicationId: {
          roundId,
          applicationId,
        },
      },
      update: {
        status,
        remarks: remarks ? remarks.trim() : null,
        interviewerEmail: decoded.email,
      },
      create: {
        roundId,
        applicationId,
        interviewerEmail: decoded.email,
        status,
        remarks: remarks ? remarks.trim() : null,
      },
    });

    sendSuccess(res, { evaluation }, 'Evaluation saved successfully');
  } catch (error) {
    console.error('Error evaluating candidate:', error);
    res.status(500).json({ error: 'Failed to save evaluation', details: error.message });
  }
};

/**
 * Start a round (Interviewer only)
 * POST /api/interview/round/:roundId/start
 */
export const startRound = async (req, res) => {
  try {
    const { roundId } = req.params;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Validate token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      if (decoded.type !== 'interviewer') {
        return res.status(403).json({ error: 'Invalid token type' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Get round
    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: {
        session: {
          include: { rounds: { orderBy: { roundNumber: 'asc' } } },
        },
      },
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Validate token
    const invite = await prisma.interviewerInvite.findFirst({
      where: {
        token,
        sessionId: round.sessionId,
        email: decoded.email,
      },
    });

    if (!invite || invite.expiresAt < new Date() || invite.used) {
      return res.status(403).json({ error: 'Token expired or invalid' });
    }

    // Check round status
    if (round.status !== 'LOCKED') {
      return res.status(409).json({ error: `Round is ${round.status}. Only LOCKED rounds can be started.` });
    }

    // Check if another round is active
    const activeRound = round.session.rounds.find(r => r.status === 'ACTIVE');
    if (activeRound) {
      return res.status(409).json({
        error: `Cannot start round. "${activeRound.name}" is currently active.`,
      });
    }

    // CRITICAL: Get session with job and auto-correct session status (needed for ALL rounds)
    const sessionWithJob = await prisma.interviewSession.findUnique({
      where: { id: round.sessionId },
      include: { job: true },
    });

    if (!sessionWithJob || !sessionWithJob.job) {
      return res.status(404).json({ error: 'Session or job not found' });
    }

    // CRITICAL: Auto-correct session status before validation (for ALL rounds)
    const correctedSession = await autoCorrectSessionStatus(sessionWithJob, sessionWithJob.job);

    // Reject if session is already COMPLETED or INCOMPLETE (applies to ALL rounds)
    if (correctedSession.status === 'COMPLETED') {
      return res.status(409).json({
        error: 'Session already completed',
        message: 'Cannot start rounds for a completed interview session.',
      });
    }

    if (correctedSession.status === 'FROZEN') {
      return res.status(409).json({
        error: 'Interview session is frozen',
        message: 'Cannot start rounds. A Super Admin has frozen this interview session.',
      });
    }

    if (correctedSession.status === 'INCOMPLETE') {
      return res.status(409).json({
        error: 'Interview drive date has passed',
        message: 'Cannot start rounds. The interview drive date has passed and the session is incomplete.',
      });
    }

    // For first round, check that interviewers are added (Issue #8)
    if (round.roundNumber === 1) {
      const interviewerCount = await prisma.interviewerInvite.count({
        where: { sessionId: round.sessionId },
      });
      
      if (interviewerCount === 0) {
        return res.status(409).json({
          error: 'Cannot start session. At least one interviewer must be invited before starting the first round.',
        });
      }

      // CRITICAL: Interview session cannot start before driveDate
      // No bypass, no admin override, no exceptions
      if (!sessionWithJob.job.driveDate) {
        return res.status(400).json({
          error: 'Drive date not configured',
          message: 'Drive date is not set for this job. Please set the drive date before starting interview sessions.'
        });
      }

      const now = new Date();
      const driveDate = new Date(sessionWithJob.job.driveDate);
      
      // Compare dates only (ignore time) - allow if today is drive date or later
      const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const driveDateOnly = new Date(driveDate.getFullYear(), driveDate.getMonth(), driveDate.getDate());
      
      // Reject if current date is before drive date (date-only comparison)
      if (nowDateOnly < driveDateOnly) {
        return res.status(400).json({
          error: 'Interview drive has not started yet',
          message: 'Interview session can start only on or after the drive date',
          driveDate: sessionWithJob.job.driveDate,
          currentDate: now,
        });
      }

      // Additional check: Ensure session status is NOT_STARTED before starting first round
      if (correctedSession.status !== 'NOT_STARTED') {
        return res.status(409).json({
          error: `Session status is ${correctedSession.status}`,
          message: 'Session must be in NOT_STARTED status to begin the first round.',
        });
      }
    }

    // For rounds after first, check previous round is ended
    if (round.roundNumber > 1) {
      const previousRound = round.session.rounds.find(r => r.roundNumber === round.roundNumber - 1);
      if (!previousRound || previousRound.status !== 'ENDED') {
        return res.status(409).json({
          error: 'Previous round must be ended before starting this round',
        });
      }
      
      // CRITICAL: For continuing rounds, also check drive date hasn't passed
      const jobCheck = await prisma.job.findUnique({
        where: { id: correctedSession.jobId },
        select: { driveDate: true },
      });
      
      if (jobCheck?.driveDate) {
        const now = new Date();
        const driveDate = new Date(jobCheck.driveDate);
        driveDate.setHours(23, 59, 59, 999);
        
        if (now > driveDate) {
          return res.status(409).json({
            error: 'Interview drive date has passed',
            message: 'Cannot continue rounds. The interview drive date has passed and the session is incomplete.',
          });
        }
      }
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Start round
      const startedRound = await tx.interviewRound.update({
        where: { id: roundId },
        data: {
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      });

      // Update session to ONGOING if NOT_STARTED
      // CRITICAL: Check drive date before allowing session to become ONGOING
      const sessionCheck = await tx.interviewSession.findUnique({
        where: { id: round.sessionId },
        include: { job: { select: { driveDate: true } } },
      });
      
      if (sessionCheck.status === 'NOT_STARTED') {
        // Double-check drive date hasn't passed
        if (sessionCheck.job.driveDate) {
          const now = new Date();
          const driveDate = new Date(sessionCheck.job.driveDate);
          driveDate.setHours(23, 59, 59, 999);
          
          if (now > driveDate) {
            // Drive date passed - mark as INCOMPLETE
            await tx.interviewSession.update({
              where: { id: round.sessionId },
              data: { status: 'INCOMPLETE', completedAt: new Date() },
            });
            throw new Error('Interview drive date has passed. Session cannot be started.');
          }
        }
        
        await tx.interviewSession.update({
          where: { id: round.sessionId },
          data: { status: 'ONGOING', startedAt: new Date() },
        });
      }

      return startedRound;
    });

    res.json({
      message: 'Round started successfully',
      round: {
        id: result.id,
        roundNumber: result.roundNumber,
        name: result.name,
        status: result.status,
      },
    });
  } catch (error) {
    console.error('Error starting round:', error);
    res.status(500).json({ error: 'Failed to start round', details: error.message });
  }
};

/**
 * End a round
 * POST /api/interview/round/:roundId/end
 */
export const endRound = async (req, res) => {
  try {
    const { roundId } = req.params;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Validate token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      if (decoded.type !== 'interviewer') {
        return res.status(403).json({ error: 'Invalid token type' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Get round
    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: {
        session: {
          include: {
            job: true,
            rounds: { orderBy: { roundNumber: 'asc' } },
          },
        },
      },
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // CRITICAL: Auto-correct session status before validation
    const correctedSession = await autoCorrectSessionStatus(round.session, round.session.job);

    // Reject if session is COMPLETED or INCOMPLETE (cannot continue)
    if (correctedSession.status === 'COMPLETED') {
      return res.status(409).json({
        error: 'Session already completed',
        message: 'Cannot end rounds for a completed interview session.',
      });
    }

    if (correctedSession.status === 'FROZEN') {
      return res.status(409).json({
        error: 'Interview session is frozen',
        message: 'Cannot end rounds. A Super Admin has frozen this interview session.',
      });
    }

    if (correctedSession.status === 'INCOMPLETE') {
      return res.status(409).json({
        error: 'Interview drive date has passed',
        message: 'Cannot continue rounds. The interview drive date has passed and the session is incomplete.',
      });
    }

    // Check round status
    if (round.status !== 'ACTIVE') {
      return res.status(409).json({ error: `Round is ${round.status}. Only ACTIVE rounds can be ended.` });
    }

    // Validate token
    const invite = await prisma.interviewerInvite.findFirst({
      where: {
        token,
        sessionId: round.sessionId,
        email: decoded.email,
      },
    });

    if (!invite || invite.expiresAt < new Date() || invite.used) {
      return res.status(403).json({ error: 'Token expired or invalid' });
    }

    // Get eligible applications for this round
    // CRITICAL: For Round 1, only include candidates who passed screening (INTERVIEW_ELIGIBLE or TEST_SELECTED)
    // For rounds after first, only include SELECTED candidates from previous round
    let candidateApplicationIds;
    
    if (round.roundNumber === 1) {
      // Round 1: Only include candidates who passed screening
      const eligibleApplications = await prisma.application.findMany({
        where: { 
          jobId: round.session.jobId,
          screeningStatus: {
            in: ['INTERVIEW_ELIGIBLE', 'TEST_SELECTED'] // Accept both for backward compatibility
          }
        },
        select: { id: true },
      });
      candidateApplicationIds = eligibleApplications.map(a => a.id);
    } else {
      // Rounds after first: Filter by previous round selections
      const previousRound = round.session.rounds.find(r => r.roundNumber === round.roundNumber - 1);
      if (previousRound) {
        const previousEvaluations = await prisma.roundEvaluation.findMany({
          where: {
            roundId: previousRound.id,
            status: 'SELECTED',
          },
          select: { applicationId: true },
        });
        candidateApplicationIds = previousEvaluations.map(e => e.applicationId);
      } else {
        // No previous round found, no candidates eligible
        candidateApplicationIds = [];
      }
    }

    // Check if all candidates are evaluated
    const evaluations = await prisma.roundEvaluation.findMany({
      where: {
        roundId,
        applicationId: { in: candidateApplicationIds },
      },
    });

    const evaluatedApplicationIds = new Set(evaluations.map(e => e.applicationId));
    const unevaluated = candidateApplicationIds.filter(id => !evaluatedApplicationIds.has(id));

    if (unevaluated.length > 0) {
      return res.status(409).json({
        error: `Cannot end round. ${unevaluated.length} candidate(s) not yet evaluated.`,
        unevaluatedCount: unevaluated.length,
      });
    }

    // CRITICAL: Check if any students are on hold - cannot end round with on-hold students
    const onHoldEvaluations = evaluations.filter(e => e.status === 'ON_HOLD');
    if (onHoldEvaluations.length > 0) {
      return res.status(409).json({
        error: 'Cannot end round with on-hold students',
        message: 'You cannot end the round when a student is on hold, either accept or reject',
        onHoldCount: onHoldEvaluations.length,
      });
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // End current round
      const endedRound = await tx.interviewRound.update({
        where: { id: roundId },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
        },
      });

      // Update application statuses based on evaluations
      const roundEvaluations = await tx.roundEvaluation.findMany({
        where: { roundId },
      });

      // Get all rounds to check if this is the last round
      const allRoundsCheck = await tx.interviewRound.findMany({
        where: { sessionId: round.sessionId },
        orderBy: { roundNumber: 'desc' },
      });

      const isLastRound = allRoundsCheck.length > 0 && round.roundNumber === allRoundsCheck[0].roundNumber;

      for (const evaluation of roundEvaluations) {
        let newStatus = null;
        if (evaluation.status === 'REJECTED') {
          newStatus = `REJECTED_IN_ROUND_${round.roundNumber}`;
        } else if (evaluation.status === 'SELECTED') {
          // If this is the last round, set status to SELECTED
          // Otherwise, don't set status yet (will be set when they're rejected or in final round)
          if (isLastRound) {
            newStatus = 'SELECTED';
          } else {
            // Will proceed to next round - just update lastRoundReached
            newStatus = null;
          }
        }

        if (newStatus) {
          await tx.application.update({
            where: { id: evaluation.applicationId },
            data: {
              interviewStatus: newStatus,
              lastRoundReached: round.roundNumber,
            },
          });
        } else if (evaluation.status === 'SELECTED') {
          // Update lastRoundReached for selected candidates proceeding to next round
          await tx.application.update({
            where: { id: evaluation.applicationId },
            data: {
              lastRoundReached: round.roundNumber,
            },
          });
        }
      }

      // Unlock next round if exists
      const nextRound = await tx.interviewRound.findFirst({
        where: {
          sessionId: round.sessionId,
          roundNumber: round.roundNumber + 1,
        },
      });

      if (nextRound && nextRound.status === 'LOCKED') {
        await tx.interviewRound.update({
          where: { id: nextRound.id },
          data: { status: 'LOCKED' }, // Keep locked - interviewer must start it
        });
      }

      // Check if this was the last round
      const allRounds = await tx.interviewRound.findMany({
        where: { sessionId: round.sessionId },
        orderBy: { roundNumber: 'desc' },
      });

      if (allRounds.length === 0) {
        throw new Error('No rounds found for session');
      }

      const maxRoundNumber = allRounds[0].roundNumber;

      if (round.roundNumber === maxRoundNumber) {
        // This was the last round - end session
        // Check drive date one more time before marking as COMPLETED
        const jobCheck = await tx.job.findUnique({
          where: { id: round.session.jobId },
          select: { driveDate: true },
        });
        
        const nowCheck = new Date();
        const driveDateCheck = jobCheck?.driveDate ? new Date(jobCheck.driveDate) : null;
        driveDateCheck?.setHours(23, 59, 59, 999);
        
        // Only mark as COMPLETED if drive date hasn't passed
        // If drive date passed, it should have been caught by auto-correction earlier
        const finalStatus = (driveDateCheck && nowCheck > driveDateCheck) ? 'INCOMPLETE' : 'COMPLETED';
        
        await tx.interviewSession.update({
          where: { id: round.sessionId },
          data: {
            status: finalStatus,
            completedAt: new Date(),
          },
        });
        
        // If marked as INCOMPLETE, update application statuses
        if (finalStatus === 'INCOMPLETE') {
          await updateApplicationsForIncompleteSession(round.session.jobId);
        }

        // Invalidate all interviewer invites (mark as used) - Issue #1
        await tx.interviewerInvite.updateMany({
          where: { sessionId: round.sessionId },
          data: { used: true, usedAt: new Date() },
        });

        // Update final statuses for selected candidates (only if not already updated)
        const finalEvaluations = await tx.roundEvaluation.findMany({
          where: {
            roundId,
            status: 'SELECTED',
          },
        });

        for (const evaluation of finalEvaluations) {
          // Check if already updated in the first loop
          const existingApp = await tx.application.findUnique({
            where: { id: evaluation.applicationId },
            select: { interviewStatus: true },
          });

          // Only update if not already set to SELECTED
          if (existingApp && existingApp.interviewStatus !== 'SELECTED') {
            await tx.application.update({
              where: { id: evaluation.applicationId },
              data: {
                interviewStatus: 'SELECTED',
                lastRoundReached: round.roundNumber,
              },
            });
          }
        }
      }

      return endedRound;
    });

    // Check if session was completed
    const updatedSession = await prisma.interviewSession.findUnique({
      where: { id: round.sessionId },
      select: { status: true },
    });

    const message = updatedSession?.status === 'COMPLETED' 
      ? 'Round ended successfully! Interview session completed.'
      : 'Round ended successfully';

    res.json({
      message,
      round: result,
      sessionCompleted: updatedSession?.status === 'COMPLETED',
    });
  } catch (error) {
    console.error('Error ending round:', error);
    res.status(500).json({ 
      error: 'Failed to end round', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * End interview session (Interviewer only)
 * POST /api/interview/session/:sessionId/end
 */
export const endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Validate token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      if (decoded.type !== 'interviewer') {
        return res.status(403).json({ error: 'Invalid token type' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Validate token in database
    const invite = await prisma.interviewerInvite.findFirst({
      where: {
        token,
        sessionId,
        email: decoded.email,
      },
    });

    if (!invite || invite.expiresAt < new Date()) {
      return res.status(403).json({ error: 'Token expired or invalid' });
    }

    // Get session
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    // Check session status
    if (session.status === 'COMPLETED') {
      return res.status(409).json({ error: 'Session is already completed' });
    }

    if (session.status === 'FROZEN') {
      return res.status(409).json({
        error: 'Interview session is frozen',
        message: 'A Super Admin has frozen this session. It cannot be ended until unfrozen.',
      });
    }

    // Check if any round is still active
    const activeRound = session.rounds.find(r => r.status === 'ACTIVE');
    if (activeRound) {
      return res.status(409).json({
        error: `Cannot end session. Round "${activeRound.name}" is still active.`,
      });
    }

    // End session
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    res.json({
      message: 'Interview session ended successfully',
    });
  } catch (error) {
    console.error('Error ending interview session:', error);
    res.status(500).json({ error: 'Failed to end interview session', details: error.message });
  }
};

/**
 * Freeze interview session (Super Admin only)
 * PATCH /api/admin/interview-scheduling/session/:sessionId/freeze
 */
export const freezeInterviewSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { job: { select: { jobTitle: true } } },
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    if (session.status === 'COMPLETED' || session.status === 'INCOMPLETE') {
      return res.status(409).json({
        error: 'Cannot freeze session',
        message: 'Only NOT_STARTED or ONGOING sessions can be frozen.',
      });
    }

    if (session.status === 'FROZEN') {
      return res.status(409).json({ error: 'Session is already frozen' });
    }

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { status: 'FROZEN' },
    });

    logger.info(`Super Admin froze interview session ${sessionId} (job: ${session.job?.jobTitle})`);

    res.json({
      message: 'Interview session frozen successfully',
      sessionId,
      status: 'FROZEN',
    });
  } catch (error) {
    console.error('Error freezing interview session:', error);
    res.status(500).json({ error: 'Failed to freeze interview session', details: error.message });
  }
};

/**
 * Unfreeze interview session (Super Admin only)
 * PATCH /api/admin/interview-scheduling/session/:sessionId/unfreeze
 */
export const unfreezeInterviewSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { job: { select: { jobTitle: true } } },
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    if (session.status !== 'FROZEN') {
      return res.status(409).json({
        error: 'Session is not frozen',
        message: 'Only frozen sessions can be unfrozen.',
      });
    }

    const newStatus = session.startedAt ? 'ONGOING' : 'NOT_STARTED';
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { status: newStatus },
    });

    logger.info(`Super Admin unfroze interview session ${sessionId} (job: ${session.job?.jobTitle})`);

    res.json({
      message: 'Interview session unfrozen successfully',
      sessionId,
      status: newStatus,
    });
  } catch (error) {
    console.error('Error unfreezing interview session:', error);
    res.status(500).json({ error: 'Failed to unfreeze interview session', details: error.message });
  }
};
