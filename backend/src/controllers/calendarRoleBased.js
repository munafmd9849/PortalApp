/**
 * Role-Based Calendar Controllers
 * Handles calendar operations with role-based permissions
 */

import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsForRole,
  respondToEvent,
} from '../services/calendarServiceEnhanced.js';
import prisma from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Get events for current user based on role
 * GET /calendar/events
 */
export const getEvents = async (req, res) => {
  try {
    const { timeMin, timeMax, maxResults } = req.query;
    const userId = req.user.id;
    const role = req.user.role;

    const filters = {
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || null,
      maxResults: maxResults || 250,
    };

    const events = await getEventsForRole(userId, role, filters);

    res.json({
      success: true,
      events,
      count: events.length,
    });
  } catch (error) {
    logger.error('Error getting events:', error);
    
    if (error.message.includes('not connected')) {
      return res.status(400).json({
        error: 'Google Calendar not connected',
        message: 'Please connect your Google Calendar first',
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to fetch events',
    });
  }
};

/**
 * Create event
 * POST /calendar/events
 */
export const createEventController = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const {
      summary,
      description,
      start,
      end,
      location,
      attendees = [],
      meetLink = false,
      targetUserId = null,
      targetRole = null,
    } = req.body;

    // Validation
    if (!summary || !start || !end) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['summary', 'start', 'end'],
      });
    }

    // Role-based validation
    if (role === 'STUDENT') {
      return res.status(403).json({
        error: 'Students cannot create events',
        message: 'Students can only view and respond to events',
      });
    }

    // Admin can create for others
    if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && targetUserId && targetRole) {
      // Validate target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser || targetUser.role !== targetRole) {
        return res.status(400).json({
          error: 'Invalid target user',
        });
      }
    } else {
      // Clear target for non-admin creating own events
      targetUserId = null;
      targetRole = null;
    }

    const eventData = {
      summary,
      description,
      start,
      end,
      location,
      attendees: Array.isArray(attendees) ? attendees : [],
      meetLink,
    };

    const event = await createEvent(userId, role, eventData, targetUserId, targetRole);

    res.json({
      success: true,
      event,
      message: 'Event created successfully',
    });
  } catch (error) {
    logger.error('Error creating event:', error);
    
    if (error.message.includes('not connected')) {
      return res.status(400).json({
        error: 'Google Calendar not connected',
        message: error.message,
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to create event',
    });
  }
};

/**
 * Update event
 * PUT /calendar/events/:eventId
 */
export const updateEventController = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { eventId } = req.params;
    const {
      summary,
      description,
      start,
      end,
      location,
      attendees,
      targetUserId = null,
      targetRole = null,
    } = req.body;

    // Students cannot update events
    if (role === 'STUDENT') {
      return res.status(403).json({
        error: 'Students cannot edit events',
        message: 'Students can only view and respond to events',
      });
    }

    // Admin can update for others
    if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && targetUserId && targetRole) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser || targetUser.role !== targetRole) {
        return res.status(400).json({
          error: 'Invalid target user',
        });
      }
    } else {
      targetUserId = null;
      targetRole = null;
    }

    const updates = {
      summary,
      description,
      start,
      end,
      location,
      attendees: Array.isArray(attendees) ? attendees : undefined,
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
      });
    }

    const event = await updateEvent(userId, role, eventId, updates, targetUserId, targetRole);

    res.json({
      success: true,
      event,
      message: 'Event updated successfully',
    });
  } catch (error) {
    logger.error('Error updating event:', error);
    
    if (error.message.includes('not connected')) {
      return res.status(400).json({
        error: 'Google Calendar not connected',
      });
    }

    if (error.message.includes('can only edit') || error.message.includes('cannot edit')) {
      return res.status(403).json({
        error: error.message,
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to update event',
    });
  }
};

/**
 * Delete event
 * DELETE /calendar/events/:eventId
 */
export const deleteEventController = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { eventId } = req.params;
    const { targetUserId = null, targetRole = null } = req.body;

    // Students cannot delete events
    if (role === 'STUDENT') {
      return res.status(403).json({
        error: 'Students cannot delete events',
        message: 'Students can only view and respond to events',
      });
    }

    // Admin can delete for others
    if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && targetUserId && targetRole) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser || targetUser.role !== targetRole) {
        return res.status(400).json({
          error: 'Invalid target user',
        });
      }
    } else {
      targetUserId = null;
      targetRole = null;
    }

    await deleteEvent(userId, role, eventId, targetUserId, targetRole);

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting event:', error);
    
    if (error.message.includes('not connected')) {
      return res.status(400).json({
        error: 'Google Calendar not connected',
      });
    }

    if (error.message.includes('can only') || error.message.includes('cannot')) {
      return res.status(403).json({
        error: error.message,
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to delete event',
    });
  }
};

/**
 * Respond to event (accept/decline) - Student only
 * POST /calendar/events/:eventId/respond
 */
export const respondToEventController = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { eventId } = req.params;
    const { responseStatus } = req.body;

    if (!responseStatus) {
      return res.status(400).json({
        error: 'responseStatus is required',
        validValues: ['accepted', 'declined', 'tentative'],
      });
    }

    const result = await respondToEvent(userId, role, eventId, responseStatus);

    res.json({
      success: true,
      event: result,
      message: `Event ${responseStatus} successfully`,
    });
  } catch (error) {
    logger.error('Error responding to event:', error);
    
    if (error.message.includes('not connected')) {
      return res.status(400).json({
        error: 'Google Calendar not connected',
      });
    }

    if (error.message.includes('Only students')) {
      return res.status(403).json({
        error: error.message,
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to respond to event',
    });
  }
};

/**
 * Get event details
 * GET /calendar/events/:eventId
 */
export const getEventDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { eventId } = req.params;
    const { targetUserId = null, targetRole = null } = req.query;

    // Get events and find the specific one
    const filters = {
      timeMin: new Date(0).toISOString(), // All time
      maxResults: 1000,
    };

    // If admin viewing specific user's event
    if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && targetUserId && targetRole) {
      // Would need to implement admin viewing specific user's calendar
      // For now, get own events
    }

    const events = await getEventsForRole(userId, role, filters);
    const event = events.find(e => e.id === eventId);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
      });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    logger.error('Error getting event details:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch event details',
    });
  }
};











