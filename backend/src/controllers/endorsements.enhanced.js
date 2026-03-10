/**
 * ENHANCED ENDORSEMENT TOKEN VALIDATION
 * Complete step-by-step implementation with detailed logging
 * 
 * This is a reference implementation showing all validation steps.
 * Replace the existing getEndorsementByToken function with this enhanced version.
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Step 1: Verify Token Receipt
 * - Extract token from URL parameter
 * - Log token exactly as received
 * - Trim whitespace
 * - Log token length and URL-encoded characters
 */
function extractAndLogToken(req) {
  // Extract token from URL params (Express automatically decodes once)
  let rawToken = req.params.token;
  
  // Log token exactly as received (first 20 chars for security, full length)
  logger.info('[STEP 1] Token receipt verification', {
    step: '1.1',
    action: 'Token extracted from URL params',
    tokenPrefix: rawToken ? rawToken.substring(0, 20) + '...' : 'null',
    tokenLength: rawToken ? rawToken.length : 0,
    tokenType: typeof rawToken,
    hasWhitespace: rawToken ? /\s/.test(rawToken) : false,
    urlEncodedChars: rawToken ? (rawToken.match(/%[0-9A-F]{2}/gi) || []).length : 0,
  });

  // Validate token exists
  if (!rawToken) {
    logger.warn('[STEP 1] Token validation failed: No token in URL params');
    return { error: 'Token is required', status: 400 };
  }

  // Trim whitespace (handle leading/trailing spaces)
  const trimmedToken = rawToken.trim();
  
  logger.info('[STEP 1] Token after trimming', {
    step: '1.2',
    action: 'Whitespace trimmed',
    originalLength: rawToken.length,
    trimmedLength: trimmedToken.length,
    wasTrimmed: rawToken.length !== trimmedToken.length,
    trimmedTokenPrefix: trimmedToken.substring(0, 20) + '...',
  });

  // Check for URL-encoded characters
  const hasEncodedChars = /%[0-9A-F]{2}/i.test(trimmedToken);
  logger.info('[STEP 1] URL encoding check', {
    step: '1.3',
    action: 'Check for URL-encoded characters',
    hasEncodedChars,
    needsDecoding: hasEncodedChars,
  });

  return { token: trimmedToken, hasEncodedChars };
}

/**
 * Step 2: Compare Against Database
 * - Fetch token with case-sensitive query
 * - Try URL-decoded version if not found
 * - Log whether token was found
 */
async function findTokenInDatabase(token, hasEncodedChars) {
  logger.info('[STEP 2] Database lookup started', {
    step: '2.1',
    action: 'Attempting exact match (case-sensitive)',
    tokenPrefix: token.substring(0, 20) + '...',
  });

  // Step 2.1: Try exact match (case-sensitive, as stored in DB)
  let tokenRecord = await prisma.endorsementToken.findUnique({
    where: { token: token }, // Prisma uses exact match by default
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
    logger.info('[STEP 2] Token found in database (exact match)', {
      step: '2.1',
      action: 'Token found',
      tokenId: tokenRecord.id,
      studentId: tokenRecord.studentId,
      studentName: tokenRecord.student?.fullName,
      used: tokenRecord.used,
      expiresAt: tokenRecord.expiresAt,
      createdAt: tokenRecord.createdAt,
    });
    return { tokenRecord, lookupMethod: 'exact' };
  }

  logger.debug('[STEP 2] Token not found with exact match', {
    step: '2.1',
    action: 'Exact match failed',
    willTryDecoding: hasEncodedChars,
  });

  // Step 2.2: Try URL-decoded version
  if (hasEncodedChars || token.includes('%')) {
    try {
      const decodedToken = decodeURIComponent(token);
      
      logger.info('[STEP 2] Attempting URL-decoded lookup', {
        step: '2.2',
        action: 'Trying decodeURIComponent',
        originalTokenPrefix: token.substring(0, 20) + '...',
        decodedTokenPrefix: decodedToken.substring(0, 20) + '...',
        tokensMatch: token === decodedToken,
      });

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
        logger.info('[STEP 2] Token found in database (URL-decoded)', {
          step: '2.2',
          action: 'Token found after decoding',
          tokenId: tokenRecord.id,
          studentId: tokenRecord.studentId,
        });
        return { tokenRecord, lookupMethod: 'decoded' };
      }

      logger.debug('[STEP 2] Token not found after URL decoding', {
        step: '2.2',
        action: 'Decoded lookup failed',
      });
    } catch (decodeError) {
      logger.warn('[STEP 2] URL decode failed', {
        step: '2.2',
        action: 'decodeURIComponent error',
        error: decodeError.message,
        tokenPrefix: token.substring(0, 20) + '...',
      });
    }
  }

  // Step 2.3: Token not found
  logger.warn('[STEP 2] Token not found in database', {
    step: '2.3',
    action: 'All lookup methods failed',
    tokenPrefix: token.substring(0, 20) + '...',
    tokenLength: token.length,
    attemptedMethods: ['exact', 'url-decoded'],
  });

  return { tokenRecord: null, lookupMethod: null };
}

/**
 * Step 3: Validate Token Status
 * - Check if token is used
 * - Validate expiration date exists
 * - Compare current time vs expiresAt (UTC handling)
 */
function validateTokenStatus(tokenRecord, token) {
  logger.info('[STEP 3] Token status validation started', {
    step: '3.1',
    action: 'Begin validation checks',
    tokenId: tokenRecord.id,
  });

  // Step 3.1: Check if token is already used
  if (tokenRecord.used === true) {
    logger.warn('[STEP 3] Token already used', {
      step: '3.1',
      action: 'Token usage check',
      tokenId: tokenRecord.id,
      used: true,
      usedAt: tokenRecord.usedAt,
      usedAtISO: tokenRecord.usedAt ? new Date(tokenRecord.usedAt).toISOString() : null,
    });
    return {
      error: 'This endorsement link has already been used',
      used: true,
      usedAt: tokenRecord.usedAt ? new Date(tokenRecord.usedAt).toISOString() : null,
      status: 400,
    };
  }

  logger.info('[STEP 3] Token not used', {
    step: '3.1',
    action: 'Token usage check passed',
    used: false,
  });

  // Step 3.2: Validate expiresAt field exists
  if (!tokenRecord.expiresAt) {
    logger.error('[STEP 3] Token missing expiration date', {
      step: '3.2',
      action: 'Expiration date validation',
      tokenId: tokenRecord.id,
      expiresAt: null,
      error: 'Missing expiresAt field in database',
    });
    return {
      error: 'Invalid token configuration',
      message: 'The endorsement link has an invalid expiration date.',
      status: 500,
    };
  }

  logger.info('[STEP 3] Expiration date exists', {
    step: '3.2',
    action: 'Expiration date field check',
    expiresAt: tokenRecord.expiresAt,
    expiresAtType: typeof tokenRecord.expiresAt,
  });

  // Step 3.3: Validate expiration date format
  const expiresAt = new Date(tokenRecord.expiresAt);
  const now = new Date();

  if (isNaN(expiresAt.getTime())) {
    logger.error('[STEP 3] Invalid expiration date format', {
      step: '3.3',
      action: 'Date format validation',
      tokenId: tokenRecord.id,
      expiresAtRaw: tokenRecord.expiresAt,
      expiresAtType: typeof tokenRecord.expiresAt,
      error: 'Invalid date format',
    });
    return {
      error: 'Invalid token configuration',
      message: 'The endorsement link has an invalid expiration date format.',
      status: 500,
    };
  }

  logger.info('[STEP 3] Date format validation passed', {
    step: '3.3',
    action: 'Date parsing successful',
    expiresAtISO: expiresAt.toISOString(),
    expiresAtUTC: expiresAt.toUTCString(),
    currentTimeISO: now.toISOString(),
    currentTimeUTC: now.toUTCString(),
  });

  // Step 3.4: Compare current time vs expiration (UTC handling)
  const timeDiff = expiresAt.getTime() - now.getTime();
  const hoursUntilExpiry = Math.round(timeDiff / (1000 * 60 * 60));
  const isExpired = timeDiff < 0;

  logger.info('[STEP 3] Expiration time comparison', {
    step: '3.4',
    action: 'Compare expiration vs current time',
    expiresAtISO: expiresAt.toISOString(),
    currentTimeISO: now.toISOString(),
    timeDifferenceMs: timeDiff,
    timeDifferenceHours: hoursUntilExpiry,
    isExpired,
    expiredByHours: isExpired ? Math.abs(hoursUntilExpiry) : null,
  });

  if (isExpired) {
    logger.warn('[STEP 3] Token expired', {
      step: '3.4',
      action: 'Token expiration check failed',
      tokenId: tokenRecord.id,
      expiresAt: expiresAt.toISOString(),
      currentTime: now.toISOString(),
      expiredByHours: Math.abs(hoursUntilExpiry),
    });
    return {
      error: 'This endorsement link has expired',
      expiresAt: expiresAt.toISOString(),
      expired: true,
      status: 400,
    };
  }

  logger.info('[STEP 3] Token validation passed', {
    step: '3.4',
    action: 'All validation checks passed',
    tokenId: tokenRecord.id,
    hoursUntilExpiry,
  });

  return { valid: true };
}

/**
 * MAIN FUNCTION: Enhanced getEndorsementByToken
 * Complete step-by-step implementation
 */
export async function getEndorsementByToken(req, res) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('=== ENDORSEMENT TOKEN VALIDATION START ===', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
    });

    // STEP 1: Verify Token Receipt
    const tokenExtraction = extractAndLogToken(req);
    if (tokenExtraction.error) {
      logger.warn('=== ENDORSEMENT TOKEN VALIDATION FAILED ===', {
        requestId,
        step: '1',
        reason: tokenExtraction.error,
      });
      return res.status(tokenExtraction.status).json({
        error: tokenExtraction.error,
        tokenReceived: null,
      });
    }

    const { token, hasEncodedChars } = tokenExtraction;

    // STEP 2: Compare Against Database
    const dbLookup = await findTokenInDatabase(token, hasEncodedChars);
    if (!dbLookup.tokenRecord) {
      logger.warn('=== ENDORSEMENT TOKEN VALIDATION FAILED ===', {
        requestId,
        step: '2',
        reason: 'Token not found in database',
      });
      return res.status(404).json({
        error: 'Invalid endorsement link',
        tokenReceived: token.substring(0, 20) + '...', // Log first 20 chars for debugging
        message: 'The endorsement link you are trying to access is invalid or does not exist.',
      });
    }

    const { tokenRecord, lookupMethod } = dbLookup;

    // STEP 3: Validate Token Status
    const statusValidation = validateTokenStatus(tokenRecord, token);
    if (statusValidation.error) {
      logger.warn('=== ENDORSEMENT TOKEN VALIDATION FAILED ===', {
        requestId,
        step: '3',
        reason: statusValidation.error,
        tokenId: tokenRecord.id,
      });

      const response = {
        error: statusValidation.error,
        ...(statusValidation.used && { used: true, usedAt: statusValidation.usedAt }),
        ...(statusValidation.expired && { expired: true, expiresAt: statusValidation.expiresAt }),
      };

      return res.status(statusValidation.status).json(response);
    }

    // STEP 4: Success - Return Student Info
    logger.info('=== ENDORSEMENT TOKEN VALIDATION SUCCESS ===', {
      requestId,
      tokenId: tokenRecord.id,
      studentId: tokenRecord.studentId,
      studentName: tokenRecord.student?.fullName,
      lookupMethod,
      allStepsPassed: true,
    });

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
    logger.error('=== ENDORSEMENT TOKEN VALIDATION ERROR ===', {
      requestId,
      error: error.message,
      stack: error.stack,
      token: req.params.token ? req.params.token.substring(0, 20) + '...' : 'null',
      step: 'exception',
    });

    res.status(500).json({
      error: 'Failed to fetch endorsement request',
      message: 'An error occurred while processing your request. Please try again later.',
    });
  }
}

/**
 * UTILITY: Clean token from URL (handle edge cases)
 * - Remove query parameters
 * - Remove extra slashes
 * - Handle fragment identifiers
 */
export function cleanTokenFromUrl(urlToken) {
  // Remove query parameters (?param=value)
  let cleaned = urlToken.split('?')[0];
  
  // Remove fragment identifiers (#fragment)
  cleaned = cleaned.split('#')[0];
  
  // Remove extra slashes
  cleaned = cleaned.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

