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

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { company: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

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
      session = await prisma.interviewSession.create({
        data: {
          jobId,
          companyId: job.companyId || null,
          status: 'NOT_STARTED',
          createdBy: userId,
        },
        include: {
          rounds: true,
          interviewerInvites: true,
        },
      });
    }

    // Get application count (only TEST_SELECTED candidates are eligible for interviews)
    const eligibleApplicationCount = await prisma.application.count({
      where: { 
        jobId,
        screeningStatus: 'TEST_SELECTED'
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
        },
        totalApplications: totalApplicationCount,
        eligibleApplications: eligibleApplicationCount, // Only TEST_SELECTED candidates
        rounds: session.rounds.map(r => ({
          id: r.id,
          roundNumber: r.roundNumber,
          name: r.name,
          status: r.status,
          startedAt: r.startedAt,
          endedAt: r.endedAt,
        })),
        interviewerInvites: session.interviewerInvites.map(inv => ({
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
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { rounds: true },
    });

    if (!session) {
      return sendNotFound(res, 'Interview session');
    }

    // Validate session status
    if (session.status === 'COMPLETED') {
      return sendError(res, 'Cannot configure rounds for completed session', 'This interview session has been completed. Rounds cannot be modified.', 409);
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
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        job: {
          include: { company: true },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
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
    // CRITICAL: Only include candidates who passed screening (TEST_SELECTED)
    let applications = await prisma.application.findMany({
      where: { 
        jobId: round.session.jobId,
        screeningStatus: 'TEST_SELECTED' // Only candidates who passed screening
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

    // If no TEST_SELECTED candidates found, return empty list with warning
    if (applications.length === 0) {
      console.warn(`No TEST_SELECTED candidates found for job ${round.session.jobId}. Interview session can only include candidates who passed screening.`);
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
    }

    // For rounds after first, check previous round is ended
    if (round.roundNumber > 1) {
      const previousRound = round.session.rounds.find(r => r.roundNumber === round.roundNumber - 1);
      if (!previousRound || previousRound.status !== 'ENDED') {
        return res.status(409).json({
          error: 'Previous round must be ended before starting this round',
        });
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
      if (round.session.status === 'NOT_STARTED') {
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

    // Get all applications for this job
    let candidateApplicationIds = await prisma.application.findMany({
      where: { jobId: round.session.jobId },
      select: { id: true },
    });
    candidateApplicationIds = candidateApplicationIds.map(a => a.id);

    // For rounds after first, filter by previous round selections
    if (round.roundNumber > 1) {
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
        await tx.interviewSession.update({
          where: { id: round.sessionId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

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
