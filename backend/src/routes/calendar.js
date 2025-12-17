/**
 * Calendar Routes
 * Unified calendar API endpoints
 * 
 * Routes:
 * - GET /api/calendar/status - Check connection status
 * - GET /api/calendar/oauth-url - Get OAuth URL
 * - GET /api/calendar/events - Fetch events
 * - POST /api/calendar/events - Create event (role-based)
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getCalendarStatus,
  getOAuthUrl,
  getCalendarEvents,
  createCalendarEvent,
  disconnectCalendar,
} from '../controllers/calendar.js';

const router = express.Router();

/**
 * GET /api/calendar/status
 * Check if user's Google Calendar is connected
 */
router.get('/status', authenticate, getCalendarStatus);

/**
 * GET /api/calendar/oauth-url
 * Get Google OAuth URL for calendar connection
 */
router.get('/oauth-url', authenticate, getOAuthUrl);

/**
 * GET /api/calendar/events
 * Fetch calendar events for the authenticated user
 * Query params: timeMin, timeMax, maxResults
 */
router.get('/events', authenticate, getCalendarEvents);

/**
 * POST /api/calendar/events
 * Create a new calendar event
 * Role-based permissions:
 * - STUDENT: Cannot create (returns 403)
 * - RECRUITER: Can create events (can invite students)
 * - ADMIN: Can create events (can invite anyone)
 */
router.post('/events', authenticate, createCalendarEvent);

/**
 * DELETE /api/calendar/disconnect
 * Disconnect Google Calendar (delete tokens)
 */
router.delete('/disconnect', authenticate, disconnectCalendar);

export default router;
