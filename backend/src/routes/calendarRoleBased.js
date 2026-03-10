/**
 * Role-Based Calendar Routes
 * Separate routes for admin, recruiter, and student calendars
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getEvents,
  createEventController,
  updateEventController,
  deleteEventController,
  respondToEventController,
  getEventDetails,
} from '../controllers/calendarRoleBased.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /calendar/events
 * Get events for current user based on role
 * Accessible by: All roles
 */
router.get('/events', getEvents);

/**
 * GET /calendar/events/:eventId
 * Get specific event details
 * Accessible by: All roles
 */
router.get('/events/:eventId', getEventDetails);

/**
 * POST /calendar/events
 * Create new event
 * Accessible by: Admin, Recruiter (not Student)
 */
router.post('/events', requireRole(['ADMIN', 'SUPER_ADMIN', 'RECRUITER']), createEventController);

/**
 * PUT /calendar/events/:eventId
 * Update event
 * Accessible by: Admin (any event), Recruiter (own events only)
 */
router.put('/events/:eventId', requireRole(['ADMIN', 'SUPER_ADMIN', 'RECRUITER']), updateEventController);

/**
 * DELETE /calendar/events/:eventId
 * Delete event
 * Accessible by: Admin (any event), Recruiter (own events only)
 */
router.delete('/events/:eventId', requireRole(['ADMIN', 'SUPER_ADMIN', 'RECRUITER']), deleteEventController);

/**
 * POST /calendar/events/:eventId/respond
 * Accept/decline event - Student only
 * Accessible by: Student only
 */
router.post('/events/:eventId/respond', requireRole(['STUDENT']), respondToEventController);

export default router;











