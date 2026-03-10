/**
 * Google Calendar Connect Routes
 * Dedicated routes for the "Connect Google Calendar" page
 * Endpoints:
 * - GET /api/google/calendar/oauth-url
 * - GET /auth/google/callback (popup callback)
 * - GET /api/google/calendar/status
 * - GET /api/google/calendar/events
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getOAuthUrl,
  handleOAuthCallback,
  getCalendarStatus,
  getCalendarEvents,
} from '../controllers/googleCalendarConnect.js';

const router = express.Router();

/**
 * GET /api/google/calendar/oauth-url
 * Get OAuth URL for popup flow
 * Requires authentication
 */
router.get('/oauth-url', authenticate, getOAuthUrl);

/**
 * GET /api/google/calendar/status
 * Check calendar connection status
 * Requires authentication
 */
router.get('/status', authenticate, getCalendarStatus);

/**
 * GET /api/google/calendar/events
 * Fetch upcoming calendar events (max 10)
 * Requires authentication
 */
router.get('/events', authenticate, getCalendarEvents);

export default router;

// Note: /auth/google/callback is handled separately in server.js
// because it doesn't require authentication and needs to be at root level











