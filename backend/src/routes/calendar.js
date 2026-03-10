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
  updateCalendarEvent,
  deleteCalendarEvent,
  respondToCalendarEvent,
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
 * PUT /api/calendar/events/:eventId
 * Update a calendar event
 * Role-based permissions:
 * - STUDENT: Cannot update (returns 403)
 * - RECRUITER: Can only update own events
 * - ADMIN: Can update any event
 */
router.put('/events/:eventId', authenticate, updateCalendarEvent);

/**
 * DELETE /api/calendar/events/:eventId
 * Delete a calendar event
 * Role-based permissions:
 * - STUDENT: Cannot delete (returns 403)
 * - RECRUITER: Can only delete own events
 * - ADMIN: Can delete any event
 */
router.delete('/events/:eventId', authenticate, deleteCalendarEvent);

/**
 * POST /api/calendar/events/:eventId/respond
 * Respond to a calendar event (accept/decline/tentative)
 * Role-based permissions:
 * - STUDENT: Can respond to events
 * - RECRUITER: Cannot respond (returns 403)
 * - ADMIN: Cannot respond (returns 403)
 */
router.post('/events/:eventId/respond', authenticate, respondToCalendarEvent);

/**
 * DELETE /api/calendar/disconnect
 * Disconnect Google Calendar (delete tokens)
 */
router.delete('/disconnect', authenticate, disconnectCalendar);

export default router;
