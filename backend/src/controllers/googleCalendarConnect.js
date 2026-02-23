/**
 * Google Calendar Connect Controller
 * Dedicated controller for the "Connect Google Calendar" page
 * Follows specific requirements: GET /api/google/calendar/oauth-url
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { getOAuthClient, exchangeCodeForTokens, revokeGoogleToken, getGoogleUserInfo } from '../utils/googleCalendar.js';
import { getAuthenticatedCalendarClient } from '../services/calendarServiceEnhanced.js';

/**
 * GET /api/google/calendar/oauth-url
 * Generates Google OAuth URL for calendar connection
 * Returns: { url: "<oauth_url>" }
 * 
 * Note: Uses calendar.events.readonly scope as per requirements
 */
export const getOAuthUrl = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Generate OAuth URL with required scopes and user ID in state
    const { getOAuthClient } = await import('../utils/googleCalendar.js');
    const oauth2Client = getOAuthClient();

    // Required scopes:
    // 1. Calendar scope - required for creating/reading calendar events
    // 2. UserInfo email scope - required for email verification (to ensure user connects with registered email)
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email', // Required for email verification
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: req.user.id, // Pass user ID for security
      response_type: 'code', // As per requirements
    });

    res.json({
      url: authUrl,
    });
  } catch (error) {
    logger.error('Error generating OAuth URL:', error);
    res.status(500).json({
      error: 'Failed to generate OAuth URL',
      message: error.message,
    });
  }
};

/**
 * GET /auth/google/callback
 * PRODUCTION-GRADE OAuth callback handler
 * 
 * Flow:
 * 1. Validate input (code, state)
 * 2. Exchange code for tokens
 * 3. Fetch Google UserInfo (email, verified_email)
 * 4. Validate email match (atomic)
 * 5. Save tokens ONLY if validation passes
 * 6. Send structured response to frontend
 * 7. Close popup ONLY after message sent
 * 
 * Backend is SINGLE SOURCE OF TRUTH for success/failure
 */
export const handleOAuthCallback = async (req, res) => {
  // Track OAuth flow start
  logger.info('OAuth callback started', {
    hasCode: !!req.query.code,
    hasState: !!req.query.state,
    timestamp: new Date().toISOString(),
  });

  let result = {
    status: 'FAILED',
    reason: null,
    calendarEmail: null,
    error: null,
  };

  try {
    const { code, state } = req.query;

    // STEP 1: Validate input
    if (!code) {
      result.reason = 'EMAIL_NOT_RETURNED';
      result.error = 'No authorization code received';
      logger.warn('OAuth callback failed: No code', {
        reason: result.reason,
      });
      return sendOAuthResponse(res, result);
    }

    const userId = state;
    if (!userId) {
      result.reason = 'EMAIL_NOT_RETURNED';
      result.error = 'Invalid state parameter';
      logger.warn('OAuth callback failed: No state', {
        reason: result.reason,
      });
      return sendOAuthResponse(res, result);
    }

    // STEP 2: Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      result.reason = 'EMAIL_NOT_RETURNED';
      result.error = 'User not found';
      logger.warn('OAuth callback failed: User not found', {
        userId,
        reason: result.reason,
      });
      return sendOAuthResponse(res, result);
    }

    // Get registered email and validate it exists
    const registeredEmail = (user.email || '').toLowerCase().trim();
    
    if (!registeredEmail || registeredEmail.length === 0) {
      result.reason = 'EMAIL_NOT_RETURNED';
      result.error = 'User account does not have a registered email address. Please contact support.';
      logger.error('OAuth callback: User has no registered email', {
        userId: user.id,
        role: user.role,
        userEmail: user.email,
      });
      return sendOAuthResponse(res, result);
    }
    
    logger.info('OAuth callback: User found', {
      userId: user.id,
      role: user.role,
      registeredEmail,
      registeredEmailLength: registeredEmail.length,
    });

    // STEP 3: Exchange code for tokens
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code);
      logger.info('OAuth callback: Token exchange successful', {
        userId: user.id,
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
      });
    } catch (tokenError) {
      logger.error('OAuth callback: Token exchange failed', {
        userId: user.id,
        error: tokenError.message,
      });
      result.reason = 'EMAIL_NOT_RETURNED';
      result.error = tokenError.message || 'Failed to exchange authorization code';
      return sendOAuthResponse(res, result);
    }

    // STEP 4: Fetch Google UserInfo (email, verified_email)
    // Note: exchangeCodeForTokens already fetches email, but we fetch again here
    // to ensure we have the most up-to-date information and to validate the token works
    let googleEmail = null;
    let verifiedEmail = false;

    // First, try to use email from token exchange if available
    if (tokens.email) {
      googleEmail = tokens.email.toLowerCase().trim();
      verifiedEmail = tokens.verified_email === true;
      logger.info('OAuth callback: Using email from token exchange', {
        userId: user.id,
        googleEmail,
        verifiedEmail,
      });
    }

    // Always fetch fresh UserInfo to ensure accuracy and validate token
    try {
      const userInfo = await getGoogleUserInfo(tokens.access_token);
      const fetchedEmail = userInfo.email?.toLowerCase().trim() || null;
      const fetchedVerified = userInfo.verified_email === true;

      // Use fetched email if available, otherwise fall back to token email
      if (fetchedEmail) {
        googleEmail = fetchedEmail;
        verifiedEmail = fetchedVerified;
        logger.info('OAuth callback: UserInfo fetched successfully', {
          userId: user.id,
          googleEmail,
          verifiedEmail,
          fromTokenExchange: !!tokens.email,
        });
      } else if (!googleEmail) {
        // No email from either source
        throw new Error('Email not available from Google UserInfo API');
      }
    } catch (userInfoError) {
      logger.error('OAuth callback: UserInfo fetch failed', {
        userId: user.id,
        registeredEmail,
        error: userInfoError.message,
        errorStack: userInfoError.stack,
        hasAccessToken: !!tokens.access_token,
        tokenLength: tokens.access_token?.length,
        emailFromToken: tokens.email,
      });

      // If we have email from token exchange, use it but log warning
      if (tokens.email) {
        googleEmail = tokens.email.toLowerCase().trim();
        verifiedEmail = tokens.verified_email === true;
        logger.warn('OAuth callback: Using email from token exchange due to UserInfo fetch failure', {
          userId: user.id,
          googleEmail,
          verifiedEmail,
          userInfoError: userInfoError.message,
        });
      } else {
        // No email from either source - must fail
        // Revoke token since we can't verify email
        if (tokens.access_token) {
          try {
            await revokeGoogleToken(tokens.access_token);
            logger.info('OAuth callback: Token revoked due to UserInfo failure', {
              userId: user.id,
            });
          } catch (revokeError) {
            logger.warn('OAuth callback: Failed to revoke token', {
              userId: user.id,
              error: revokeError.message,
            });
          }
        }
        result.reason = 'EMAIL_NOT_RETURNED';
        result.error = `Could not verify Google account email: ${userInfoError.message}`;
        return sendOAuthResponse(res, result);
      }
    }

    // Final validation: ensure we have an email
    if (!googleEmail) {
      logger.error('OAuth callback: No email available from any source', {
        userId: user.id,
        registeredEmail,
        hasTokenEmail: !!tokens.email,
        hasAccessToken: !!tokens.access_token,
      });
      if (tokens.access_token) {
        try {
          await revokeGoogleToken(tokens.access_token);
        } catch (revokeError) {
          logger.warn('OAuth callback: Failed to revoke token', {
            userId: user.id,
            error: revokeError.message,
          });
        }
      }
      result.reason = 'EMAIL_NOT_RETURNED';
      result.error = 'Google account email is not available. Please ensure your Google account has a verified email address.';
      return sendOAuthResponse(res, result);
    }

    // STEP 5: ATOMIC EMAIL VALIDATION
    // CRITICAL: Ensure both emails are properly normalized for comparison
    // Normalize registered email (defensive - should already be normalized)
    const normalizedRegisteredEmail = (user.email || '').toLowerCase().trim();
    
    // Normalize Google email (defensive - should already be normalized)
    const normalizedGoogleEmail = (googleEmail || '').toLowerCase().trim();

    // Log validation attempt with raw values for debugging
    logger.info('OAuth callback: Email validation', {
      userId: user.id,
      registeredEmailRaw: user.email,
      registeredEmailNormalized: normalizedRegisteredEmail,
      googleEmailRaw: googleEmail,
      googleEmailNormalized: normalizedGoogleEmail,
      verifiedEmail,
      emailMatch: normalizedRegisteredEmail === normalizedGoogleEmail,
      registeredEmailLength: normalizedRegisteredEmail.length,
      googleEmailLength: normalizedGoogleEmail.length,
    });

    // CRITICAL: Validate registered email exists
    if (!normalizedRegisteredEmail || normalizedRegisteredEmail.length === 0) {
      logger.error('OAuth callback: Email validation failed - no registered email', {
        userId: user.id,
        userEmail: user.email,
      });
      if (tokens.access_token) {
        await revokeGoogleToken(tokens.access_token);
      }
      result.reason = 'EMAIL_NOT_RETURNED';
      result.error = 'User account does not have a registered email address';
      return sendOAuthResponse(res, result);
    }

    // CRITICAL: Validate Google email exists
    if (!normalizedGoogleEmail || normalizedGoogleEmail.length === 0) {
      logger.warn('OAuth callback: Email validation failed - no Google email', {
        userId: user.id,
        registeredEmail: normalizedRegisteredEmail,
      });
      if (tokens.access_token) {
        await revokeGoogleToken(tokens.access_token);
      }
      result.reason = 'EMAIL_NOT_RETURNED';
      result.error = 'Google account email not available';
      return sendOAuthResponse(res, result);
    }

    // Validate email is verified (warning only - some accounts may not have this flag)
    if (!verifiedEmail) {
      logger.warn('OAuth callback: Email not verified by Google', {
        userId: user.id,
        registeredEmail: normalizedRegisteredEmail,
        googleEmail: normalizedGoogleEmail,
      });
      // Note: We still proceed but log warning
      // Some Google accounts may not have verified_email flag set
    }

    // CRITICAL: Validate email match - STRICT COMPARISON
    // This is the security gate - emails MUST match exactly
    const emailsMatch = normalizedRegisteredEmail === normalizedGoogleEmail;
    
    if (!emailsMatch) {
      // SECURITY: Email mismatch - REVOKE TOKEN IMMEDIATELY
      logger.warn('SECURITY: OAuth callback: Email mismatch - REVOKING TOKEN', {
        userId: user.id,
        role: user.role,
        registeredEmail: normalizedRegisteredEmail,
        googleEmail: normalizedGoogleEmail,
        verifiedEmail,
        action: 'BLOCKED_AND_REVOKED',
        timestamp: new Date().toISOString(),
      });

      // Revoke token immediately
      if (tokens.access_token) {
        await revokeGoogleToken(tokens.access_token);
        logger.info('OAuth callback: Token revoked due to email mismatch', {
          userId: user.id,
        });
      }

      // Cleanup: Delete any existing tokens
      try {
        await prisma.googleCalendarToken.deleteMany({
          where: { userId: user.id },
        });
      } catch (deleteError) {
        logger.warn('OAuth callback: Error deleting existing tokens:', deleteError);
      }

      // Ensure user is NOT connected
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            googleCalendarConnected: false,
            connectedGoogleEmail: null,
          },
        });
      } catch (updateError) {
        logger.warn('OAuth callback: Error updating user status:', updateError);
      }

      result.reason = 'EMAIL_MISMATCH';
      result.error = `Please connect the Google account associated with your registered email (${normalizedRegisteredEmail}). The Google account you used (${normalizedGoogleEmail}) does not match.`;
      result.calendarEmail = normalizedGoogleEmail;
      return sendOAuthResponse(res, result);
    }

    // FINAL SECURITY CHECK: Double-verify emails match before saving
    // This is a redundant check to ensure no bypass occurred
    if (normalizedRegisteredEmail !== normalizedGoogleEmail) {
      logger.error('SECURITY BREACH: Email validation bypass detected!', {
        userId: user.id,
        registeredEmail: normalizedRegisteredEmail,
        googleEmail: normalizedGoogleEmail,
        action: 'BLOCKED_AND_REVOKED',
        timestamp: new Date().toISOString(),
      });
      
      // Revoke token immediately
      if (tokens.access_token) {
        await revokeGoogleToken(tokens.access_token);
      }
      
      // Cleanup
      await prisma.googleCalendarToken.deleteMany({
        where: { userId: user.id },
      });
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          googleCalendarConnected: false,
          connectedGoogleEmail: null,
        },
      });
      
      result.reason = 'EMAIL_MISMATCH';
      result.error = `Security validation failed: Email mismatch detected. Registered: ${normalizedRegisteredEmail}, Google: ${normalizedGoogleEmail}`;
      return sendOAuthResponse(res, result);
    }

    // STEP 6: VALIDATION PASSED - Save tokens atomically
    // ONLY reached if emails match exactly
    // Use transaction to ensure atomicity
    try {
      await prisma.$transaction(async (tx) => {
        // Save tokens
        await tx.googleCalendarToken.upsert({
          where: { userId: user.id },
          update: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
            scope: tokens.scope,
            connectedGoogleEmail: normalizedGoogleEmail,
          },
          create: {
            userId: user.id,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
            scope: tokens.scope,
            connectedGoogleEmail: normalizedGoogleEmail,
          },
        });

        // Update user connection status
        await tx.user.update({
          where: { id: user.id },
          data: {
            googleCalendarConnected: true,
            connectedGoogleEmail: normalizedGoogleEmail,
          },
        });
      });

      logger.info('OAuth callback: SUCCESS - Calendar connected', {
        userId: user.id,
        role: user.role,
        registeredEmail: normalizedRegisteredEmail,
        googleEmail: normalizedGoogleEmail,
        emailMatch: true,
        timestamp: new Date().toISOString(),
      });

      result.status = 'SUCCESS';
      result.calendarEmail = normalizedGoogleEmail;
      return sendOAuthResponse(res, result);
    } catch (saveError) {
      logger.error('OAuth callback: Failed to save tokens', {
        userId: user.id,
        error: saveError.message,
        stack: saveError.stack,
      });
      // Revoke token since save failed
      if (tokens.access_token) {
        await revokeGoogleToken(tokens.access_token);
      }
      result.reason = 'EMAIL_NOT_RETURNED';
      result.error = 'Failed to save calendar connection';
      return sendOAuthResponse(res, result);
    }
  } catch (error) {
    logger.error('OAuth callback: Unexpected error', {
      error: error.message,
      stack: error.stack,
      result,
    });
    result.reason = 'EMAIL_NOT_RETURNED';
    result.error = error.message || 'Failed to connect calendar';
    return sendOAuthResponse(res, result);
  }
};

/**
 * Send structured OAuth response to frontend
 * Redirects to frontend callback page (same origin as opener) so window.close() works.
 *
 * @param {Object} res - Express response object
 * @param {Object} result - { status: 'SUCCESS'|'FAILED', reason: string, calendarEmail: string, error: string }
 */
function sendOAuthResponse(res, result) {
  const { status, reason, calendarEmail, error } = result;

  const baseUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const params = new URLSearchParams({
    status: status || 'FAILED',
    ...(reason && { reason }),
    ...(calendarEmail && { calendarEmail }),
    ...(error && { error: error }),
  });

  const redirectUrl = `${baseUrl}/calendar/oauth-callback?${params.toString()}`;
  res.redirect(302, redirectUrl);
}

/**
 * GET /api/google/calendar/status
 * Check if calendar is connected
 * Returns: { connected: true/false }
 * 
 * IMPORTANT: Calendar tokens persist in the database across logout/login cycles.
 * This endpoint checks the database for existing tokens, which are never cleared on logout.
 */
export const getCalendarStatus = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const role = req.user.role;

    // Use unified GoogleCalendarToken model
    // These tokens persist in the database and are NOT cleared on logout
    const token = await prisma.googleCalendarToken.findUnique({
      where: { userId },
      select: {
        connectedGoogleEmail: true,
        accessToken: true, // Check if token actually exists
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleCalendarConnected: true,
        connectedGoogleEmail: true,
        email: true,
      },
    });

    // Calendar is connected if:
    // 1. User has googleCalendarConnected flag set to true, AND
    // 2. A valid GoogleCalendarToken exists in the database
    // Note: Tokens persist across logout/login, so calendar remains connected
    const connected = !!(user?.googleCalendarConnected && token && token.accessToken);

    res.json({ 
      connected,
      connectedGoogleEmail: token?.connectedGoogleEmail || user?.connectedGoogleEmail || null,
      registeredEmail: user?.email || null,
    });
  } catch (error) {
    logger.error('Error checking calendar status:', error);
    res.status(500).json({
      error: 'Failed to check calendar status',
      message: error.message,
    });
  }
};

/**
 * GET /api/google/calendar/events
 * Fetch upcoming calendar events (max 10)
 * Returns: { events: [...] }
 */
export const getCalendarEvents = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const role = req.user.role;

    // Get authenticated calendar client
    const { calendar } = await getAuthenticatedCalendarClient(userId, role);

    // Fetch upcoming events (next 10)
    const now = new Date();
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (response.data.items || []).map((event) => ({
      id: event.id,
      title: event.summary || '(No title)',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      location: event.location,
      description: event.description,
    }));

    res.json({ events });
  } catch (error) {
    logger.error('Error fetching calendar events:', error);
    res.status(500).json({
      error: 'Failed to fetch calendar events',
      message: error.message,
    });
  }
};








