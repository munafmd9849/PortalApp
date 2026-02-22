/**
 * Google Login Authentication Controller
 * Handles OAuth flow for user login/registration via Google
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { generateAuthOAuthUrl, exchangeCodeForAuthTokens } from '../utils/googleAuth.js';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

/**
 * Initialize Google OAuth for login - Get OAuth URL
 * GET /auth/google-login/url
 * Returns OAuth URL for frontend to redirect to
 */
export const getGoogleLoginUrl = async (req, res) => {
  try {
    // Get role from query parameter (optional, defaults to STUDENT)
    const role = (req.query.role || 'STUDENT').toUpperCase();

    // Validate role
    if (!['STUDENT', 'RECRUITER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be STUDENT, RECRUITER, or ADMIN' });
    }

    // Create state with role information
    const state = JSON.stringify({ role, timestamp: Date.now() });

    // Generate OAuth URL
    const authUrl = generateAuthOAuthUrl(state);

    // Log exact redirect URI so you can add it to Google Cloud Console if you get redirect_uri_mismatch
    const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;
    logger.info(`[Google Login] Use this EXACT URL in Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized redirect URIs: ${redirectUri}`);

    res.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    logger.error('Error generating Google login URL:', error);
    res.status(500).json({
      error: 'Failed to generate Google login URL',
      message: error.message,
    });
  }
};

/**
 * Handle Google OAuth callback for login
 * GET /auth/google-login/callback
 * Exchange code for tokens, create/login user, return JWT tokens
 */
/** Redirect to frontend callback with error so popup can postMessage to opener */
function redirectLoginError(frontendUrl, errorCode, message) {
  const params = new URLSearchParams({ error: errorCode });
  if (message) params.set('message', message);
  return `${frontendUrl}/auth/google-callback?${params.toString()}`;
}

export const handleGoogleLoginCallback = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL;
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(redirectLoginError(frontendUrl, 'google_login_no_code', 'No authorization code from Google. Please try again.'));
    }

    // Parse state to get role
    let role = 'STUDENT';
    try {
      if (state) {
        const stateData = JSON.parse(state);
        role = stateData.role || 'STUDENT';
      }
    } catch (e) {
      logger.warn('Failed to parse state, using default role:', e);
    }

    // Validate role
    if (!['STUDENT', 'RECRUITER', 'ADMIN'].includes(role)) {
      role = 'STUDENT';
    }

    // Exchange code for tokens and user info
    const googleUserInfo = await exchangeCodeForAuthTokens(code);

    if (!googleUserInfo.email) {
      return res.redirect(redirectLoginError(frontendUrl, 'google_login_no_email', 'Could not get email from Google. Please try again.'));
    }

    const email = googleUserInfo.email.toLowerCase().trim();

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        student: true,
        recruiter: true,
      },
    });

    if (user) {
      // User exists - log them in
      // Check if role matches (or allow if they're trying to login with same role)
      if (user.role !== role) {
        // If role doesn't match, we can either:
        // 1. Allow login but keep their existing role
        // 2. Reject login
        // For now, we'll allow login but keep existing role
        logger.info(`User ${email} logged in with Google but role mismatch. Existing: ${user.role}, Requested: ${role}`);
      }

      // Update user's Google info if needed (User model has displayName, not name)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: googleUserInfo.verified_email ?? user.emailVerified,
          ...(googleUserInfo.name && !user.displayName && { displayName: googleUserInfo.name }),
        },
      });

      // Generate JWT tokens (pass user object so role and status are included)
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user.id);

      // Redirect to frontend with tokens
      return res.redirect(`${frontendUrl}/auth/google-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } else {
      // New user - create account
      // Validate email domain based on role
      const emailLower = email.toLowerCase();

      if (role === 'STUDENT' && !emailLower.endsWith('@pwioi.com')) {
        return res.redirect(redirectLoginError(frontendUrl, 'google_login_invalid_domain', 'Student sign-up requires a @pwioi.com email address.'));
      }

      if (role === 'ADMIN' && !emailLower.endsWith('@pwioi.live')) {
        return res.redirect(redirectLoginError(frontendUrl, 'google_login_invalid_domain', 'Admin sign-up requires a @pwioi.live email address.'));
      }

      // Generate a random password (user won't need it since they use Google)
      const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      // Create user (User model uses passwordHash and displayName, not password/name)
      const userData = {
        email,
        passwordHash,
        role,
        displayName: googleUserInfo.name || null,
        emailVerified: googleUserInfo.verified_email || false,
        status: role === 'ADMIN' ? 'PENDING' : 'ACTIVE', // Admin needs approval
      };

      // Create user with role-specific profile
      if (role === 'STUDENT') {
        user = await prisma.user.create({
          data: {
            ...userData,
            student: {
              create: {},
            },
          },
          include: {
            student: true,
          },
        });
      } else if (role === 'RECRUITER') {
        user = await prisma.user.create({
          data: {
            ...userData,
            recruiter: {
              create: {},
            },
          },
          include: {
            recruiter: true,
          },
        });
      } else if (role === 'ADMIN') {
        user = await prisma.user.create({
          data: userData,
        });
      }

      logger.info(`New user created via Google login: ${email} (${role})`);

      // Generate JWT tokens (pass user object so role and status are included)
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user.id);

      // Redirect to frontend with tokens
      return res.redirect(`${frontendUrl}/auth/google-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    }
  } catch (error) {
    logger.error('Error in Google login callback:', error);
    return res.redirect(redirectLoginError(frontendUrl, 'google_login_failed', error.message || 'Google sign-in failed. Please try again.'));
  }
};
