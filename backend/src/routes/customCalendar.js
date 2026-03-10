/**
 * Custom Calendar Routes
 * Routes for custom calendar events stored in database
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getCustomEvents,
  getCustomEvent,
  createCustomEvent,
  updateCustomEvent,
  deleteCustomEvent,
  respondToCustomEvent,
} from '../controllers/customCalendar.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/calendar/custom/events
 * Get all calendar events (with optional filters)
 */
router.get('/events', getCustomEvents);

/**
 * GET /api/calendar/custom/events/:eventId
 * Get single calendar event
 */
router.get('/events/:eventId', getCustomEvent);

/**
 * POST /api/calendar/custom/events
 * Create new calendar event
 */
router.post('/events', createCustomEvent);

/**
 * PUT /api/calendar/custom/events/:eventId
 * Update calendar event
 */
router.put('/events/:eventId', updateCustomEvent);

/**
 * DELETE /api/calendar/custom/events/:eventId
 * Delete calendar event
 */
router.delete('/events/:eventId', deleteCustomEvent);

/**
 * POST /api/calendar/custom/events/:eventId/respond
 * Respond to event (accept/decline/tentative) - Student only
 */
router.post('/events/:eventId/respond', respondToCustomEvent);

export default router;








