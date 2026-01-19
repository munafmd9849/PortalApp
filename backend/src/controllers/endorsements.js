/**
 * Endorsement Controller
 * Magic Link Based Endorsement System
 * Teachers/panelists do NOT need accounts - they use secure one-time links
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';
import crypto from 'crypto';
import { sendEndorsementMagicLinkEmail } from '../services/emailService.js';

/**
 * Generate cryptographically secure token
 * @returns {string} Secure random token
 */
function generateSecureToken() {
  // Generate 32 bytes of random data and convert to base64url
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Request endorsement - Generate magic link
 * POST /api/endorsements/request
 * Auth: Student only
 */
export async function requestEndorsement(req, res) {
  try {
    const userId = req.userId;
    const { teacherName, teacherEmail, role, organization } = req.body;

    // Validation
    if (!teacherName || !teacherName.trim()) {
      return res.status(400).json({ error: 'Teacher name is required' });
    }

    if (!teacherEmail || !teacherEmail.trim()) {
      return res.status(400).json({ error: 'Teacher email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(teacherEmail.trim())) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        enrollmentId: true,
        school: true,
        center: true,
        batch: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check for existing pending token for this email (prevent spam)
    const existingToken = await prisma.endorsementToken.findFirst({
      where: {
        studentId: student.id,
        email: teacherEmail.trim().toLowerCase(),
        used: false,
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
    });

    if (existingToken) {
      return res.status(400).json({ 
        error: 'An active endorsement request already exists for this email. Please wait for it to expire or be used.',
        expiresAt: existingToken.expiresAt,
      });
    }

    // Check monthly request limit (2 requests per month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyRequestCount = await prisma.endorsementToken.count({
      where: {
        studentId: student.id,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const MONTHLY_LIMIT = 2;
    if (monthlyRequestCount >= MONTHLY_LIMIT) {
      return res.status(400).json({ 
        error: `Monthly limit reached. You can only send ${MONTHLY_LIMIT} endorsement requests per month. Please try again next month.`,
        limit: MONTHLY_LIMIT,
        currentCount: monthlyRequestCount,
        resetDate: endOfMonth,
      });
    }

    // Generate secure token
    const token = generateSecureToken();
    
    // Set expiration to 48 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Create token record
    const tokenRecord = await prisma.endorsementToken.create({
      data: {
        studentId: student.id,
        email: teacherEmail.trim().toLowerCase(),
        token: token,
        expiresAt: expiresAt,
        teacherName: teacherName.trim(),
        teacherRole: role?.trim() || null,
        organization: organization?.trim() || null,
      },
    });

    // Generate magic link
    // FRONTEND_URL is validated at startup, so it's guaranteed to exist
    const frontendUrl = process.env.FRONTEND_URL;
    const magicLink = `${frontendUrl}/endorse/${token}`;

    // Send email with magic link
    try {
      await sendEndorsementMagicLinkEmail({
        teacherEmail: teacherEmail.trim(),
        teacherName: teacherName.trim(),
        studentName: student.fullName,
        studentEnrollmentId: student.enrollmentId,
        magicLink: magicLink,
        expiresAt: expiresAt,
      });
    } catch (emailError) {
      logger.error('Failed to send endorsement email:', emailError);
      // Don't fail the request if email fails - token is still created
      // Student can resend email later if needed
    }

    res.json({
      message: 'Endorsement request sent successfully',
      tokenId: tokenRecord.id,
      expiresAt: expiresAt,
      // Don't return the actual token for security
    });
  } catch (error) {
    logger.error('Request endorsement error:', error);
    logger.error('Request endorsement error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    });
    res.status(500).json({ 
      error: 'Failed to create endorsement request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Get endorsement request by token (public endpoint)
 * GET /api/endorsements/:token
 * No auth required
 */
/**
 * Get endorsement request by token (public endpoint)
 * GET /api/endorsements/:token
 * Validates token, checks expiration and usage status
 */
export async function getEndorsementByToken(req, res) {
  try {
    // Extract and normalize token from URL params
    let originalToken = req.params.token;

    // Log received token (first 10 chars for security)
    logger.info('Endorsement token lookup requested', {
      tokenPrefix: originalToken ? originalToken.substring(0, 10) + '...' : 'null',
      tokenLength: originalToken ? originalToken.length : 0,
    });

    // Validate token exists
    if (!originalToken || !originalToken.trim()) {
      logger.warn('Endorsement token lookup failed: No token provided');
      return res.status(400).json({ error: 'Token is required' });
    }

    // Trim whitespace
    originalToken = originalToken.trim();

    // Validate token format - base64url tokens from 32 bytes should be 43 characters
    // Reject tokens that are clearly invalid (too short or too long)
    const MIN_TOKEN_LENGTH = 20; // Minimum reasonable token length
    const MAX_TOKEN_LENGTH = 100; // Maximum reasonable token length
    const EXPECTED_TOKEN_LENGTH = 43; // Expected length for base64url(32 bytes)

    if (originalToken.length < MIN_TOKEN_LENGTH) {
      logger.warn('Endorsement token validation failed: Token too short', {
        tokenPrefix: originalToken.substring(0, 10) + '...',
        tokenLength: originalToken.length,
        expectedLength: EXPECTED_TOKEN_LENGTH,
        minLength: MIN_TOKEN_LENGTH,
      });
      return res.status(400).json({
        error: 'Invalid endorsement link',
        message: 'The endorsement link format is invalid. Please check the link and try again.',
        tokenReceived: originalToken.substring(0, 20) + '...',
      });
    }

    if (originalToken.length > MAX_TOKEN_LENGTH) {
      logger.warn('Endorsement token validation failed: Token too long', {
        tokenPrefix: originalToken.substring(0, 10) + '...',
        tokenLength: originalToken.length,
        maxLength: MAX_TOKEN_LENGTH,
      });
      return res.status(400).json({
        error: 'Invalid endorsement link',
        message: 'The endorsement link format is invalid. Please check the link and try again.',
      });
    }

    // Log token format validation
    logger.info('Token format validation passed', {
      tokenLength: originalToken.length,
      expectedLength: EXPECTED_TOKEN_LENGTH,
      lengthMatch: originalToken.length === EXPECTED_TOKEN_LENGTH,
    });

    // Try to find token - first try as-is (exact match, case-sensitive)
    let tokenRecord = await prisma.endorsementToken.findUnique({
      where: { token: originalToken },
      include: {
        student: {
          select: {
            fullName: true,
            enrollmentId: true,
            email: true,
            center: true,
            school: true,
            batch: true,
          },
        },
      },
    });

    // Log first lookup attempt
    if (tokenRecord) {
      logger.info('Token found (as-is)', {
        tokenId: tokenRecord.id,
        studentId: tokenRecord.studentId,
        used: tokenRecord.used,
        expiresAt: tokenRecord.expiresAt,
      });
    } else {
      logger.debug('Token not found as-is, trying URL decoded version');
    }

    // If not found, try URL decoded version (handles encoded tokens from email links)
    if (!tokenRecord) {
      try {
        const decodedToken = decodeURIComponent(originalToken);
        if (decodedToken !== originalToken) {
          logger.debug('Attempting lookup with URL decoded token');
          tokenRecord = await prisma.endorsementToken.findUnique({
            where: { token: decodedToken },
            include: {
              student: {
                select: {
                  fullName: true,
                  enrollmentId: true,
                  email: true,
                  center: true,
                  school: true,
                  batch: true,
                },
              },
            },
          });

          if (tokenRecord) {
            logger.info('Token found (URL decoded)', {
              tokenId: tokenRecord.id,
              studentId: tokenRecord.studentId,
            });
          }
        }
      } catch (decodeError) {
        // Decode failed - token might already be decoded or contain invalid characters
        logger.debug('Token URL decode failed (token might already be decoded)', {
          error: decodeError.message,
        });
      }
    }

    // Token not found in database
    if (!tokenRecord) {
      logger.warn('Endorsement token not found in database', {
        tokenPrefix: originalToken.substring(0, 20) + '...',
        tokenLength: originalToken.length,
        expectedLength: 43,
        attemptedMethods: ['exact-match', 'url-decoded'],
      });
      return res.status(404).json({ 
        error: 'Invalid endorsement link',
        message: 'The endorsement link you are trying to access is invalid or does not exist. Please check the link and try again.',
        tokenReceived: originalToken.length <= 50 ? originalToken.substring(0, 20) + '...' : 'hidden',
        hint: originalToken.length < 20 ? 'Token appears to be too short. Please verify you have the complete link.' : undefined,
      });
    }

    // Log token details
    logger.info('Token record retrieved', {
      tokenId: tokenRecord.id,
      used: tokenRecord.used,
      expiresAt: tokenRecord.expiresAt,
      currentTime: new Date().toISOString(),
      isExpired: new Date() > new Date(tokenRecord.expiresAt),
    });

    // Check if token is already used
    if (tokenRecord.used) {
      logger.warn('Endorsement token already used', {
        tokenId: tokenRecord.id,
        tokenPrefix: originalToken.substring(0, 4) + '...',
        usedAt: tokenRecord.usedAt,
      });
      return res.status(400).json({ 
        success: false,
        error: 'This endorsement link has already been used',
        message: 'This endorsement link has already been completed. Each link can only be used once.',
        used: true,
        usedAt: tokenRecord.usedAt,
      });
    }

    // Validate expiresAt field exists and is a valid Date
    if (!tokenRecord.expiresAt) {
      logger.error('Token missing expiration date', {
        tokenId: tokenRecord.id,
      });
      return res.status(500).json({ 
        error: 'Invalid token configuration',
        message: 'The endorsement link has an invalid expiration date.',
      });
    }

    const expiresAt = new Date(tokenRecord.expiresAt);
    const now = new Date();

    // Check if token is expired
    if (isNaN(expiresAt.getTime())) {
      logger.error('Token has invalid expiration date format', {
        tokenId: tokenRecord.id,
        expiresAt: tokenRecord.expiresAt,
      });
      return res.status(500).json({ 
        error: 'Invalid token configuration',
        message: 'The endorsement link has an invalid expiration date format.',
      });
    }

    if (now > expiresAt) {
      logger.warn('Endorsement token expired', {
        tokenId: tokenRecord.id,
        tokenPrefix: originalToken.substring(0, 4) + '...',
        expiresAt: expiresAt.toISOString(),
        currentTime: now.toISOString(),
        expiredBy: Math.round((now - expiresAt) / (1000 * 60 * 60)) + ' hours',
      });
      return res.status(400).json({ 
        success: false,
        error: 'This endorsement link has expired',
        message: `This endorsement link expired on ${expiresAt.toLocaleDateString()}. Please request a new endorsement link.`,
        expired: true,
        expiresAt: expiresAt.toISOString(),
      });
    }

    // Log successful token validation
    logger.info('Endorsement token validated successfully', {
      tokenId: tokenRecord.id,
      studentId: tokenRecord.studentId,
      studentName: tokenRecord.student.fullName,
      timeUntilExpiry: Math.round((expiresAt - now) / (1000 * 60 * 60)) + ' hours',
      });

    // Return student info (safe to expose)
    res.json({
      studentName: tokenRecord.student.fullName,
      studentEnrollmentId: tokenRecord.student.enrollmentId,
      studentSchool: tokenRecord.student.school,
      studentCenter: tokenRecord.student.center,
      studentBatch: tokenRecord.student.batch,
      teacherEmail: tokenRecord.email,
      teacherName: tokenRecord.teacherName,
      teacherRole: tokenRecord.teacherRole,
      organization: tokenRecord.organization,
      expiresAt: tokenRecord.expiresAt,
    });
  } catch (error) {
    logger.error('getEndorsementByToken error:', {
      error: error.message,
      stack: error.stack,
      token: req.params.token ? req.params.token.substring(0, 10) + '...' : 'null',
    });
    res.status(500).json({ 
      error: 'Failed to fetch endorsement request',
      message: 'An error occurred while processing your request. Please try again later.',
    });
  }
}

/**
 * Submit endorsement (public endpoint - no auth required)
 * POST /api/endorsements/submit
 */
export async function submitEndorsement(req, res) {
  logger.info('=== ENDORSEMENT SUBMISSION START ===');
  try {
    const originalToken = req.params.token;

    // STEP 1: Verify token receipt
    logger.info('[STEP 1] Token receipt verification');
    if (!originalToken || !originalToken.trim()) {
      logger.warn('No token provided in request parameters.');
      return res.status(400).json({ 
        error: 'Token is required',
        message: 'No endorsement token was found in the link.',
      });
    }

    const trimmedToken = originalToken.trim();
    
    // Validate token format - base64url tokens from 32 bytes should be 43 characters
    const MIN_TOKEN_LENGTH = 20;
    const MAX_TOKEN_LENGTH = 100;
    const EXPECTED_TOKEN_LENGTH = 43;

    if (trimmedToken.length < MIN_TOKEN_LENGTH) {
      logger.warn('Endorsement token validation failed: Token too short', {
        tokenPrefix: trimmedToken.substring(0, 10) + '...',
        tokenLength: trimmedToken.length,
        expectedLength: EXPECTED_TOKEN_LENGTH,
        minLength: MIN_TOKEN_LENGTH,
      });
      return res.status(400).json({
        error: 'Invalid endorsement link',
        message: 'The endorsement link format is invalid. Please check the link and try again.',
      });
    }

    if (trimmedToken.length > MAX_TOKEN_LENGTH) {
      logger.warn('Endorsement token validation failed: Token too long', {
        tokenPrefix: trimmedToken.substring(0, 10) + '...',
        tokenLength: trimmedToken.length,
        maxLength: MAX_TOKEN_LENGTH,
      });
      return res.status(400).json({
        error: 'Invalid endorsement link',
        message: 'The endorsement link format is invalid. Please check the link and try again.',
      });
    }

    logger.info('Token format validation passed', {
      tokenLength: trimmedToken.length,
      expectedLength: EXPECTED_TOKEN_LENGTH,
    });

    // STEP 2: Lookup token in database
    logger.info('[STEP 2] Looking up token in database');
    let tokenRecord = null;
    let lookupMethod = 'original';

    // Try with the original token first (case-sensitive)
    tokenRecord = await prisma.endorsementToken.findUnique({
      where: { token: trimmedToken },
    });

    // If not found, try decoding token from URL and query again
    if (!tokenRecord) {
      logger.debug('Token not found with original value, attempting URL decoding.');
      try {
        const decodedToken = decodeURIComponent(trimmedToken);
        if (decodedToken !== trimmedToken) {
          lookupMethod = 'decoded';
          tokenRecord = await prisma.endorsementToken.findUnique({
            where: { token: decodedToken },
          });
          logger.debug('Lookup with decoded token completed.', { found: !!tokenRecord });
        } else {
          logger.debug('Original token was not URL-encoded, no need to try decoded lookup.');
        }
      } catch (decodeError) {
        logger.warn('Failed to decode URL component', {
          error: decodeError.message,
          tokenPrefix: trimmedToken.substring(0, 20) + '...',
        });
      }
    }

    if (!tokenRecord) {
      logger.warn('Endorsement token not found in database', {
        tokenPrefix: trimmedToken.substring(0, 4) + '...',
        tokenLength: trimmedToken.length,
        lookupMethod: lookupMethod,
      });
      return res.status(404).json({ 
        success: false,
        error: 'Invalid endorsement link',
        message: 'The endorsement link you are trying to access is invalid or does not exist. Please check the link and try again.',
      });
    }

    logger.info('Token found in database', {
      tokenId: tokenRecord.id,
      studentId: tokenRecord.studentId,
      lookupMethod: lookupMethod,
      usedStatus: tokenRecord.used,
      expiresAt: tokenRecord.expiresAt,
    });

    // STEP 3: Validate token status (used, expired)
    logger.info('[STEP 3] Validating token status (used, expired)');

    // Check if token is already used
    if (tokenRecord.used) {
      logger.warn('Endorsement token already used', {
        tokenId: tokenRecord.id,
        tokenPrefix: trimmedToken.substring(0, 4) + '...',
        usedAt: tokenRecord.usedAt,
      });
      return res.status(400).json({
        success: false,
        error: 'This endorsement link has already been used',
        used: true,
        usedAt: tokenRecord.usedAt,
        message: 'This endorsement link has already been completed. Each link can only be used once.',
      });
    }

    // Check if token expiresAt exists and is a valid Date
    if (!tokenRecord.expiresAt) {
      logger.error('Token record is missing the expiresAt field', {
        tokenId: tokenRecord.id,
      });
      return res.status(500).json({
        error: 'Invalid token configuration',
        message: 'The endorsement link has an invalid expiration date configuration.',
      });
    }

    const expiresAt = new Date(tokenRecord.expiresAt);
    const now = new Date();

    if (isNaN(expiresAt.getTime())) {
      logger.error('Token record has an invalid expiresAt date format', {
        tokenId: tokenRecord.id,
        expiresAtValue: tokenRecord.expiresAt,
      });
      return res.status(500).json({
        error: 'Invalid token configuration',
        message: 'The endorsement link has an unparseable expiration date format.',
      });
    }

    // Compare current server time vs expiresAt
    if (now > expiresAt) {
      logger.warn('Endorsement token has expired', {
        tokenId: tokenRecord.id,
        tokenPrefix: trimmedToken.substring(0, 4) + '...',
        expiresAt: expiresAt.toISOString(),
        currentTime: now.toISOString(),
        timeDifferenceMs: now.getTime() - expiresAt.getTime(),
      });
      return res.status(400).json({
        success: false,
        error: 'This endorsement link has expired',
        expired: true,
        expiresAt: expiresAt.toISOString(),
        message: `This endorsement link expired on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}. Please request a new endorsement link.`,
      });
    }

    logger.info('Token status validation passed', {
      tokenId: tokenRecord.id,
      timeUntilExpiryMs: expiresAt.getTime() - now.getTime(),
    });

    // STEP 4: Get full token record with student info (needed for validation)
    logger.info('[STEP 4] Fetching full token record with student info');
    const fullTokenRecord = await prisma.endorsementToken.findUnique({
      where: { id: tokenRecord.id },
      include: {
        student: true,
      },
    });

    if (!fullTokenRecord || !fullTokenRecord.student) {
      logger.error('Token record or student not found after validation', {
        tokenId: tokenRecord.id,
        hasToken: !!fullTokenRecord,
        hasStudent: !!(fullTokenRecord && fullTokenRecord.student),
      });
      return res.status(500).json({
        error: 'Failed to fetch endorsement data',
        message: 'An error occurred while processing your endorsement. Please try again later.',
      });
    }

    // STEP 5: Validate request body
    logger.info('[STEP 5] Validating request body');
    
    const {
      endorsementMessage,
      relatedSkills,
      skillRatings,
      strengthRating,
      endorserName,
      endorserRole,
      organization,
      relationship,
      context,
      consent
    } = req.body;

    // CRITICAL: Validate consent (must be true)
    // Handle both boolean true and string "true" (from form submissions)
    const consentValue = consent === true || consent === 'true' || consent === 1 || consent === '1';
    if (!consentValue) {
      logger.warn('Endorsement submitted without consent', { 
        tokenId: tokenRecord.id,
        tokenPrefix: trimmedToken.substring(0, 4) + '...',
        consent,
        consentType: typeof consent,
      });
      return res.status(400).json({ 
        success: false,
        error: 'Consent is required',
        message: 'You must consent to submit this endorsement. Please check the consent checkbox.'
      });
    }
    
    // Normalize consent to boolean for database
    const normalizedConsent = consent === true || consent === 'true' || consent === 1 || consent === '1';

    // Validate required fields
    if (!endorsementMessage || !endorsementMessage.trim()) {
      logger.warn('Endorsement message is missing or empty', {
        tokenId: tokenRecord.id,
        tokenPrefix: trimmedToken.substring(0, 4) + '...',
      });
      return res.status(400).json({ 
        success: false,
        error: 'Endorsement message is required' 
      });
    }

    const trimmedMessage = endorsementMessage.trim();
    if (trimmedMessage.length < 10) {
      logger.warn('Endorsement message too short', { 
        length: trimmedMessage.length,
        tokenId: tokenRecord.id,
        tokenPrefix: trimmedToken.substring(0, 4) + '...',
      });
      return res.status(400).json({ 
        success: false,
        error: 'Endorsement message must be at least 10 characters' 
      });
    }

    if (trimmedMessage.length > 2000) {
      logger.warn('Endorsement message too long', { 
        length: trimmedMessage.length,
        tokenId: tokenRecord.id,
        tokenPrefix: trimmedToken.substring(0, 4) + '...',
      });
      return res.status(400).json({ 
        success: false,
        error: 'Endorsement message must not exceed 2000 characters' 
      });
    }

    // Validate endorserName (required)
    const finalEndorserName = endorserName?.trim() || fullTokenRecord.teacherName?.trim();
    if (!finalEndorserName || finalEndorserName.length < 2) {
      logger.warn('Endorser name validation failed', {
        tokenId: tokenRecord.id,
        tokenPrefix: trimmedToken.substring(0, 4) + '...',
        provided: endorserName,
        fromToken: fullTokenRecord.teacherName,
      });
      return res.status(400).json({ 
        success: false,
        error: 'Endorser name is required and must be at least 2 characters' 
      });
    }

    // Validate endorserRole (required)
    const finalEndorserRole = endorserRole?.trim() || fullTokenRecord.teacherRole?.trim() || 'Professor';
    if (!finalEndorserRole || finalEndorserRole.length < 2) {
      logger.warn('Endorser role validation failed', {
        tokenId: tokenRecord.id,
        tokenPrefix: trimmedToken.substring(0, 4) + '...',
      });
      return res.status(400).json({ 
        success: false,
        error: 'Endorser role is required' 
      });
    }

    // Validate organization (required)
    const finalOrganization = organization?.trim() || fullTokenRecord.organization?.trim();
    if (!finalOrganization || finalOrganization.length < 2) {
      logger.warn('Organization validation failed', {
        tokenId: tokenRecord.id,
        tokenPrefix: trimmedToken.substring(0, 4) + '...',
      });
      return res.status(400).json({ 
        success: false,
        error: 'Organization is required and must be at least 2 characters' 
      });
    }

    // Validate relationship (required)
    const validRelationships = ['Professor', 'Manager', 'Mentor', 'Guide', 'Supervisor', 'Colleague'];
    const finalRelationship = relationship?.trim();
    if (!finalRelationship || !validRelationships.includes(finalRelationship)) {
      logger.warn('Relationship validation failed', {
        tokenId: tokenRecord.id,
        tokenPrefix: trimmedToken.substring(0, 4) + '...',
        provided: relationship,
      });
      return res.status(400).json({ 
        success: false,
        error: 'Relationship is required',
        message: `Relationship must be one of: ${validRelationships.join(', ')}`
      });
    }

    // Validate context (optional but if provided, must be valid)
    const finalContext = context?.trim() || null;
    if (finalContext) {
      if (finalContext.length < 2) {
        logger.warn('Context validation failed - too short', {
          tokenId: tokenRecord.id,
          tokenPrefix: trimmedToken.substring(0, 4) + '...',
          length: finalContext.length,
        });
        return res.status(400).json({ 
          success: false,
          error: 'Context must be at least 2 characters if provided' 
        });
      }
      if (finalContext.length > 200) {
        logger.warn('Context validation failed - too long', {
          tokenId: tokenRecord.id,
          tokenPrefix: trimmedToken.substring(0, 4) + '...',
          length: finalContext.length,
        });
        return res.status(400).json({ 
          success: false,
          error: 'Context must not exceed 200 characters' 
        });
      }
    }

    // Validate and normalize relatedSkills
    let normalizedSkills = [];
    if (relatedSkills !== undefined && relatedSkills !== null) {
      if (Array.isArray(relatedSkills)) {
        normalizedSkills = relatedSkills.filter(s => s && typeof s === 'string' && s.trim()).map(s => s.trim());
      } else {
        logger.warn('relatedSkills is not an array', { type: typeof relatedSkills, value: relatedSkills });
        return res.status(400).json({ 
          success: false,
          error: 'Related skills must be an array' 
        });
      }
    }

    // Validate and normalize skillRatings (optional object mapping skill -> rating)
    let normalizedSkillRatings = null;
    if (skillRatings !== undefined && skillRatings !== null) {
      if (typeof skillRatings === 'object' && !Array.isArray(skillRatings)) {
        // Validate each rating is 1-5
        const invalidRatings = Object.entries(skillRatings).filter(([skill, rating]) => {
          const numRating = typeof rating === 'string' ? parseInt(rating, 10) : parseInt(rating, 10);
          return isNaN(numRating) || numRating < 1 || numRating > 5;
        });
        
        if (invalidRatings.length > 0) {
          logger.warn('Invalid skill ratings found', { invalidRatings });
          return res.status(400).json({ 
            success: false,
            error: 'All skill ratings must be between 1 and 5' 
      });
    }

        // Normalize ratings to integers
        normalizedSkillRatings = {};
        Object.entries(skillRatings).forEach(([skill, rating]) => {
          normalizedSkillRatings[skill] = typeof rating === 'string' ? parseInt(rating, 10) : parseInt(rating, 10);
        });
      } else {
        logger.warn('skillRatings is not an object', { type: typeof skillRatings, value: skillRatings });
        return res.status(400).json({ 
          success: false,
          error: 'Skill ratings must be an object' 
        });
      }
    }

    // Validate and normalize overallRating (renamed from strengthRating)
    let normalizedRating = null;
    if (strengthRating !== undefined && strengthRating !== null) {
      const rating = typeof strengthRating === 'string' ? parseInt(strengthRating, 10) : parseInt(strengthRating, 10);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        logger.warn('Invalid strength rating', { value: strengthRating, parsed: rating });
        return res.status(400).json({ 
          success: false,
          error: 'Strength rating must be between 1 and 5' 
        });
      }
      normalizedRating = rating;
    }

    // STEP 6: Get client IP and mark token as used
    logger.info('[STEP 6] Marking token as used and creating endorsement record');
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Mark token as used BEFORE creating endorsement (prevent double submission)
    await prisma.endorsementToken.update({
      where: { id: fullTokenRecord.id },
      data: {
        used: true,
        usedAt: new Date(),
        ipAddress: ipAddress,
      },
    });

    // STEP 7: Create endorsement in database (new proper model)
    logger.info('[STEP 7] Creating endorsement record in database', {
      tokenId: fullTokenRecord.id,
      tokenPrefix: trimmedToken.substring(0, 4) + '...',
      studentId: fullTokenRecord.studentId,
      endorserName: finalEndorserName,
      skillsCount: normalizedSkills.length,
      hasSkillRatings: !!normalizedSkillRatings,
      overallRating: normalizedRating,
    });
    
    // Create endorsement record in Endorsement table
    const endorsementRecord = await prisma.endorsement.create({
      data: {
        studentId: fullTokenRecord.studentId,
        tokenId: fullTokenRecord.id,
        endorserName: finalEndorserName,
        endorserEmail: fullTokenRecord.email, // From token (read-only)
        endorserRole: finalEndorserRole,
        organization: finalOrganization,
        relationship: finalRelationship,
        context: finalContext,
        message: trimmedMessage,
        skills: JSON.stringify(normalizedSkills),
        skillRatings: normalizedSkillRatings ? JSON.stringify(normalizedSkillRatings) : null,
        overallRating: normalizedRating,
        consent: normalizedConsent, // Validated and normalized above
        verified: true, // Verified via secure token
        submittedAt: new Date(),
      },
    });

    logger.info('Endorsement record created successfully', {
      endorsementId: endorsementRecord.id,
      tokenId: fullTokenRecord.id,
      tokenPrefix: trimmedToken.substring(0, 4) + '...',
    });

    // STEP 8: Also update student.endorsementsData for backward compatibility
    logger.info('[STEP 8] Updating student endorsementsData for backward compatibility');
    let endorsements = [];
    try {
      if (fullTokenRecord.student.endorsementsData) {
        endorsements = JSON.parse(fullTokenRecord.student.endorsementsData);
      }
    } catch (parseError) {
      logger.warn('Failed to parse existing endorsements:', parseError);
      endorsements = [];
    }

    // Create backward-compatible endorsement object
    const newEndorsement = {
      id: endorsementRecord.id,
      endorserName: finalEndorserName,
      endorserEmail: fullTokenRecord.email,
      endorserRole: finalEndorserRole,
      organization: finalOrganization,
      relationship: finalRelationship,
      context: finalContext,
      message: trimmedMessage,
      relatedSkills: normalizedSkills,
      strengthRating: normalizedRating,
      overallRating: normalizedRating,
      consent: true,
      verified: true,
      submittedAt: endorsementRecord.submittedAt.toISOString(),
    };

    // Add to endorsements array
    endorsements.push(newEndorsement);

    // Update student profile with new endorsement (backward compatibility)
    await prisma.student.update({
      where: { id: fullTokenRecord.studentId },
      data: {
        endorsementsData: JSON.stringify(endorsements),
      },
    });

    // Log successful submission
    logger.info('=== ENDORSEMENT SUBMISSION SUCCESS ===', {
      endorsementId: endorsementRecord.id,
      tokenId: fullTokenRecord.id,
      tokenPrefix: trimmedToken.substring(0, 4) + '...',
      studentId: fullTokenRecord.studentId,
      studentName: fullTokenRecord.student.fullName,
      teacherEmail: fullTokenRecord.email,
      teacherName: finalEndorserName,
      ipAddress: ipAddress,
      messageLength: trimmedMessage.length,
      skillsCount: normalizedSkills.length,
      skillRatingsCount: normalizedSkillRatings ? Object.keys(normalizedSkillRatings).length : 0,
      overallRating: normalizedRating,
      relationship: finalRelationship,
      organization: finalOrganization,
    });

    res.status(200).json({
      success: true,
      message: 'Endorsement submitted successfully. Thank you!',
      endorsementId: endorsementRecord.id,
    });
  } catch (error) {
    logger.error('=== ENDORSEMENT SUBMISSION FAILED (SERVER ERROR) ===', {
      error: error.message,
      stack: error.stack,
      tokenReceived: req.params.token ? req.params.token.substring(0, 4) + '...' : 'null',
    });
    res.status(500).json({ 
      success: false,
      error: 'Failed to submit endorsement',
      message: 'An unexpected server error occurred. Please try again later.',
    });
  }
}

/**
 * Get student endorsements
 * GET /api/endorsements/student
 * Auth: Student only
 */
export async function getStudentEndorsements(req, res) {
  try {
    const userId = req.userId;

    logger.info('Fetching student endorsements', { userId });

    const student = await prisma.student.findUnique({
      where: { userId },
      select: {
        id: true,
        endorsementsData: true, // Fixed: was 'endorsements' but should be 'endorsementsData'
      },
    });

    if (!student) {
      logger.warn('Student not found when fetching endorsements', { userId });
      return res.status(404).json({ error: 'Student not found' });
    }

    // Fetch from Endorsement table (new proper model) - PRIMARY SOURCE
    const endorsementRecords = await prisma.endorsement.findMany({
      where: {
        studentId: student.id,
        consent: true, // Only show consented endorsements
      },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        endorserName: true,
        endorserEmail: true,
        endorserRole: true,
        organization: true,
        relationship: true,
        context: true,
        message: true,
        skills: true,
        skillRatings: true,
        overallRating: true,
        consent: true,
        verified: true,
        submittedAt: true,
        createdAt: true,
      },
    });

    logger.info('Fetched endorsements from Endorsement table', {
      studentId: student.id,
      count: endorsementRecords.length,
    });

    // Parse endorsements from JSON string (backward compatibility) - SECONDARY SOURCE
    let jsonEndorsements = [];
    try {
      if (student.endorsementsData) {
        const allEndorsements = JSON.parse(student.endorsementsData);
        // Filter only endorsements with consent = true
        jsonEndorsements = Array.isArray(allEndorsements) 
          ? allEndorsements.filter(e => e.consent === true)
          : [];
        logger.info('Parsed endorsements from student profile JSON', {
          studentId: student.id,
          totalCount: Array.isArray(allEndorsements) ? allEndorsements.length : 0,
          consentedCount: jsonEndorsements.length,
        });
      }
    } catch (parseError) {
      logger.warn('Failed to parse endorsements from JSON:', {
        error: parseError.message,
        studentId: student.id,
      });
    }

    // Merge and deduplicate endorsements (Endorsement table takes priority)
    const endorsementMap = new Map();
    
    // Add from Endorsement table (new model) - PRIMARY
    endorsementRecords.forEach(e => {
      let relatedSkills = [];
      try {
        if (e.skills) {
          const parsed = typeof e.skills === 'string' ? JSON.parse(e.skills) : e.skills;
          relatedSkills = Array.isArray(parsed) ? parsed : [];
        }
      } catch (err) {
        logger.warn('Failed to parse skills for endorsement', { endorsementId: e.id, error: err.message });
      }
      
      let skillRatings = {};
      try {
        if (e.skillRatings) {
          skillRatings = typeof e.skillRatings === 'string' ? JSON.parse(e.skillRatings) : e.skillRatings;
        }
      } catch (err) {
        logger.warn('Failed to parse skillRatings for endorsement', { endorsementId: e.id, error: err.message });
      }
      
      endorsementMap.set(e.id, {
        id: e.id,
        endorserName: e.endorserName,
        endorserEmail: e.endorserEmail,
        endorserRole: e.endorserRole,
        organization: e.organization,
        relationship: e.relationship,
        context: e.context,
        message: e.message,
        relatedSkills,
        skillRatings,
        overallRating: e.overallRating,
        strengthRating: e.overallRating, // Backward compatibility
        consent: e.consent,
        verified: e.verified,
        submittedAt: e.submittedAt.toISOString(),
        createdAt: e.createdAt.toISOString(),
      });
    });
    
    // Add from JSON (backward compatibility) - only if not already in map
    jsonEndorsements.forEach(e => {
      if (e.id && !endorsementMap.has(e.id)) {
        endorsementMap.set(e.id, {
          ...e,
          relatedSkills: Array.isArray(e.relatedSkills) ? e.relatedSkills : [],
          skillRatings: e.skillRatings || {},
        });
      }
    });
    
    const finalEndorsements = Array.from(endorsementMap.values());

    // Get pending token requests
    const pendingTokens = await prisma.endorsementToken.findMany({
      where: {
        studentId: student.id,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        teacherName: true,
        teacherRole: true,
        organization: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Categorize tokens
    const now = new Date();
    const pending = pendingTokens.filter(t => new Date(t.expiresAt) > now);
    const expired = pendingTokens.filter(t => new Date(t.expiresAt) <= now);

    // Calculate monthly request count for limit checking
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthlyRequestCount = await prisma.endorsementToken.count({
      where: {
        studentId: student.id,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const MONTHLY_LIMIT = 2;

    res.json({
      received: finalEndorsements, // Verified endorsements (consent = true only)
      pending: pending.map(t => ({
        id: t.id,
        teacherEmail: t.email,
        teacherName: t.teacherName,
        teacherRole: t.teacherRole,
        organization: t.organization,
        expiresAt: t.expiresAt,
        requestedAt: t.createdAt,
      })),
      expired: expired.map(t => ({
        id: t.id,
        teacherEmail: t.email,
        teacherName: t.teacherName,
        expiresAt: t.expiresAt,
        requestedAt: t.createdAt,
      })),
      monthlyRequestCount: monthlyRequestCount,
      monthlyLimit: MONTHLY_LIMIT,
      canRequestMore: monthlyRequestCount < MONTHLY_LIMIT,
    });
  } catch (error) {
    logger.error('Get student endorsements error:', error);
    res.status(500).json({ error: 'Failed to get endorsements' });
  }
}

/**
 * Delete endorsement request (cancel before it's used)
 * DELETE /api/endorsements/request/:tokenId
 * Auth: Student only
 */
export async function deleteEndorsementRequest(req, res) {
  try {
    const userId = req.userId;
    const { tokenId } = req.params;

    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find token and verify it belongs to this student
    const tokenRecord = await prisma.endorsementToken.findFirst({
      where: {
        id: tokenId,
        studentId: student.id,
      },
    });

    if (!tokenRecord) {
      return res.status(404).json({ error: 'Endorsement request not found' });
    }

    // Can only delete if not used
    if (tokenRecord.used) {
      return res.status(400).json({ error: 'Cannot delete a used endorsement request' });
    }

    // Delete token
    await prisma.endorsementToken.delete({
      where: { id: tokenId },
    });

    res.json({ message: 'Endorsement request deleted successfully' });
  } catch (error) {
    logger.error('Delete endorsement request error:', error);
    res.status(500).json({ error: 'Failed to delete endorsement request' });
  }
}
