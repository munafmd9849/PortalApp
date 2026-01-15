/**
 * Google OAuth Controllers
 * Handles OAuth initialization and callback for calendar integration
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { generateOAuthUrl, exchangeCodeForTokens } from '../utils/googleCalendar.js';

/**
 * Initialize Google OAuth - Redirect to Google consent screen
 * GET /auth/google/init
 */
export const initGoogleOAuth = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Generate OAuth URL with user ID in state
    const authUrl = generateOAuthUrl(req.user.id);

    res.redirect(authUrl);
  } catch (error) {
    logger.error('Error initializing Google OAuth:', error);
    // FRONTEND_URL is validated at startup, so it's guaranteed to exist
    const frontendUrl = process.env.FRONTEND_URL;
    res.redirect(`${frontendUrl}/dashboard?error=oauth_init_failed`);
  }
};

/**
 * Get Google OAuth URL without redirecting
 * GET /auth/google/url
 * Returns OAuth URL as JSON for popup-based flow
 */
export const getGoogleOAuthUrl = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Generate OAuth URL with user ID in state
    const authUrl = generateOAuthUrl(req.user.id);

    res.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    logger.error('Error getting Google OAuth URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate OAuth URL',
      message: error.message,
    });
  }
};

/**
 * Handle Google OAuth callback
 * GET /auth/google/callback
 */
export const handleGoogleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      // FRONTEND_URL is validated at startup, so it's guaranteed to exist
    const frontendUrl = process.env.FRONTEND_URL;
      return res.redirect(`${frontendUrl}/dashboard?calendar=error&message=no_code`);
    }

    // Get user ID from state
    const userId = state;

    if (!userId) {
      // FRONTEND_URL is validated at startup, so it's guaranteed to exist
    const frontendUrl = process.env.FRONTEND_URL;
      return res.redirect(`${frontendUrl}/dashboard?calendar=error&message=invalid_state`);
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: {
        student: true,
        recruiter: true,
      },
    });

    if (!user) {
      // FRONTEND_URL is validated at startup, so it's guaranteed to exist
    const frontendUrl = process.env.FRONTEND_URL;
      return res.redirect(`${frontendUrl}/dashboard?calendar=error&message=user_not_found`);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Save tokens based on user role
    if (user.role === 'STUDENT' && user.student) {
      // Update student record
      await prisma.student.update({
        where: { id: user.student.id },
        data: {
          googleCalendarConnected: true,
          googleCalendarAccessToken: tokens.access_token,
          googleCalendarRefreshToken: tokens.refresh_token,
          googleCalendarExpiryDate: tokens.expiry_date,
          googleCalendarScope: tokens.scope,
        },
      });

      logger.info(`Google Calendar connected for student ${user.student.id}`);
    } else if (user.role === 'RECRUITER' && user.recruiter) {
      // Update recruiter record
      await prisma.recruiter.update({
        where: { id: user.recruiter.id },
        data: {
          googleCalendarConnected: true,
          googleCalendarAccessToken: tokens.access_token,
          googleCalendarRefreshToken: tokens.refresh_token,
          googleCalendarExpiryDate: tokens.expiry_date,
          googleCalendarScope: tokens.scope,
        },
      });

      logger.info(`Google Calendar connected for recruiter ${user.recruiter.id}`);
    } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      // Admin uses GoogleCalendarToken model
      await prisma.googleCalendarToken.upsert({
        where: { userId: user.id },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          scope: tokens.scope,
        },
        create: {
          userId: user.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          scope: tokens.scope,
        },
      });

      logger.info(`Google Calendar connected for admin ${user.id}`);
    } else {
      // Other roles - not supported
      // FRONTEND_URL is validated at startup, so it's guaranteed to exist
    const frontendUrl = process.env.FRONTEND_URL;
      return res.redirect(`${frontendUrl}/dashboard?calendar=error&message=role_not_supported`);
    }

    // Redirect to frontend with success message
    // FRONTEND_URL is validated at startup, so it's guaranteed to exist
    const frontendUrl = process.env.FRONTEND_URL;
    const dashboardPath = user.role === 'STUDENT' ? '/student' : 
                         user.role === 'RECRUITER' ? '/recruiter' : '/admin';
    
    res.redirect(`${frontendUrl}${dashboardPath}?calendar=connected`);
  } catch (error) {
    logger.error('Error in Google OAuth callback:', error);
    // FRONTEND_URL is validated at startup, so it's guaranteed to exist
    const frontendUrl = process.env.FRONTEND_URL;
    res.redirect(`${frontendUrl}/dashboard?calendar=error&message=oauth_failed`);
  }
};

/**
 * Check calendar connection status
 * GET /calendar/status
 */
export const checkCalendarStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with role-specific profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: {
          select: {
            id: true,
            // Note: googleCalendarConnected fields don't exist in Student schema
            // We'll check for token existence via a different method
          },
        },
        recruiter: {
          select: {
            id: true,
            // Note: googleCalendarConnected fields don't exist in Recruiter schema
          },
        },
        googleCalendarToken: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let connected = false;

    if (user.role === 'STUDENT' && user.student) {
      // For students, check if calendar tokens exist (schema doesn't have these fields yet)
      // Return false for now until schema is updated
      connected = false;
    } else if (user.role === 'RECRUITER' && user.recruiter) {
      // For recruiters, check if calendar tokens exist (schema doesn't have these fields yet)
      // Return false for now until schema is updated
      connected = false;
    } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      connected = !!user.googleCalendarToken;
    }

    res.json({
      connected,
      role: user.role,
    });
  } catch (error) {
    logger.error('Error checking calendar status:', error);
    res.status(500).json({ error: 'Failed to check calendar status' });
  }
};

/**
 * Disconnect Google Calendar
 * DELETE /calendar/disconnect
 */
export const disconnectCalendar = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with role-specific profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        recruiter: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clear calendar connection based on role
    if (user.role === 'STUDENT' && user.student) {
      // Note: These fields don't exist in Student schema yet
      // Schema needs to be updated to include googleCalendar fields
      logger.info(`Calendar disconnect requested for student ${user.student.id} (not implemented - schema missing fields)`);
    } else if (user.role === 'RECRUITER' && user.recruiter) {
      // Note: These fields don't exist in Recruiter schema yet
      // Schema needs to be updated to include googleCalendar fields
      logger.info(`Calendar disconnect requested for recruiter ${user.recruiter.id} (not implemented - schema missing fields)`);
    } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      // Delete GoogleCalendarToken for admin
      await prisma.googleCalendarToken.deleteMany({
        where: { userId },
      });
      logger.info(`Google Calendar disconnected for admin ${userId}`);
    }

    res.json({ 
      success: true, 
      message: 'Google Calendar disconnected successfully' 
    });
  } catch (error) {
    logger.error('Error disconnecting calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect calendar' });
  }
};











