/**
 * Google OAuth Routes
 * Separate file for OAuth endpoints to mount at /api/auth
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  initGoogleOAuth,
  getGoogleOAuthUrl,
  handleGoogleCallback,
  checkCalendarStatus,
  disconnectCalendar,
} from '../controllers/googleOAuth.js';

const router = express.Router();

/**
 * GET /api/auth/google/init
 * Initialize Google OAuth - Redirects to Google consent screen
 * Requires authentication
 */
router.get('/google/init', authenticate, initGoogleOAuth);

/**
 * GET /api/auth/google/url
 * Get Google OAuth URL without redirecting (for popup flow)
 * Requires authentication
 */
router.get('/google/url', authenticate, getGoogleOAuthUrl);

/**
 * GET /api/auth/google/callback
 * Handle OAuth callback from Google
 * Exchange code for tokens and store in student/recruiter schema
 * No authentication required (called by Google)
 */
router.get('/google/callback', handleGoogleCallback);

/**
 * GET /api/auth/google/status
 * Check calendar connection status
 * Requires authentication
 */
router.get('/google/status', authenticate, checkCalendarStatus);

/**
 * DELETE /api/auth/google/disconnect
 * Disconnect Google Calendar
 * Requires authentication
 */
router.delete('/google/disconnect', authenticate, disconnectCalendar);

export default router;











