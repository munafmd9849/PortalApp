/**
 * Custom Calendar Event Controllers
 * Handles CRUD operations for custom calendar events stored in database
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Get all calendar events
 * GET /api/calendar/custom/events
 */
export const getCustomEvents = async (req, res) => {
  try {
    const { timeMin, timeMax, eventType, status } = req.query;
    const userId = req.user.id;
    const role = req.user.role;

    // Build where clause
    const where = {
      status: status || 'ACTIVE',
    };

    // Time range filter
    if (timeMin || timeMax) {
      where.OR = [];
      if (timeMin) {
        where.OR.push({
          start: { gte: new Date(timeMin) },
        });
      }
      if (timeMax) {
        where.OR.push({
          end: { lte: new Date(timeMax) },
        });
      }
    } else {
      // Default: show events from start of current year
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      where.start = { gte: startOfYear };
    }

    // Event type filter
    if (eventType) {
      where.eventType = eventType;
    }

    // Role-based filtering
    if (role === 'STUDENT') {
      // Students see events where they are attendees
      // We'll filter this in the application layer since attendees is JSON
      where.status = 'ACTIVE';
    } else if (role === 'RECRUITER') {
      // Recruiters see their own events
      where.createdBy = userId;
    }
    // Admins see all events

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
        job: {
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        start: 'asc',
      },
    });

    // Transform events to match FullCalendar format
    const formattedEvents = events.map((event) => {
      let attendees = [];
      try {
        attendees = JSON.parse(event.attendees || '[]');
      } catch (e) {
        attendees = [];
      }

      // For students, check if they're in attendees
      if (role === 'STUDENT') {
        const studentEmail = req.user.email?.toLowerCase();
        const isAttendee = attendees.some(
          (a) => a.email?.toLowerCase() === studentEmail
        );
        if (!isAttendee && event.createdByRole !== 'ADMIN') {
          return null; // Skip events where student is not an attendee
        }
      }

      return {
        id: event.id,
        title: event.title,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        allDay: event.allDay,
        location: event.location,
        description: event.description,
        extendedProps: {
          meetLink: event.meetLink,
          eventType: event.eventType,
          category: event.category,
          attendees: attendees,
          createdBy: event.createdBy,
          createdByRole: event.createdByRole,
          jobId: event.jobId,
          job: event.job,
          creator: event.creator,
          // For students, include their response status
          responseStatus: role === 'STUDENT' 
            ? attendees.find(a => a.email?.toLowerCase() === req.user.email?.toLowerCase())?.responseStatus
            : null,
        },
        backgroundColor: getEventColor(event, role),
        borderColor: getEventColor(event, role),
      };
    }).filter(Boolean); // Remove null entries

    res.json({
      success: true,
      events: formattedEvents,
      count: formattedEvents.length,
    });
  } catch (error) {
    logger.error('Error getting custom calendar events:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch calendar events',
    });
  }
};

/**
 * Get single calendar event
 * GET /api/calendar/custom/events/:eventId
 */
export const getCustomEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
        job: {
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (role === 'STUDENT') {
      let attendees = [];
      try {
        attendees = JSON.parse(event.attendees || '[]');
      } catch (e) {
        attendees = [];
      }
      const studentEmail = req.user.email?.toLowerCase();
      const isAttendee = attendees.some(
        (a) => a.email?.toLowerCase() === studentEmail
      );
      if (!isAttendee && event.createdByRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (role === 'RECRUITER' && event.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let attendees = [];
    try {
      attendees = JSON.parse(event.attendees || '[]');
    } catch (e) {
      attendees = [];
    }

    res.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        allDay: event.allDay,
        location: event.location,
        description: event.description,
        meetLink: event.meetLink,
        eventType: event.eventType,
        category: event.category,
        attendees: attendees,
        createdBy: event.createdBy,
        createdByRole: event.createdByRole,
        jobId: event.jobId,
        job: event.job,
        creator: event.creator,
        status: event.status,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error getting custom calendar event:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch calendar event',
    });
  }
};

/**
 * Create calendar event
 * POST /api/calendar/custom/events
 */
export const createCustomEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Only admin and recruiter can create events
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'RECRUITER') {
      return res.status(403).json({
        error: 'Only admins and recruiters can create events',
      });
    }

    const {
      title,
      description,
      start,
      end,
      location,
      meetLink, // Can be 'auto' to generate Google Meet link, or a URL string
      allDay = false,
      eventType,
      category,
      studentIds = [], // Array of student IDs to invite
      jobId,
    } = req.body;
    
    // Handle meetLink: if 'auto', we'll generate it later (or leave null for now)
    // For now, if meetLink is 'auto', we'll store null (can be enhanced to generate Google Meet links)
    // If it's a string URL, store it; otherwise null
    const finalMeetLink = (meetLink === 'auto' || meetLink === true) ? null : (meetLink && typeof meetLink === 'string' ? meetLink : null);

    // Validation
    if (!title || !start || !end) {
      return res.status(400).json({
        error: 'Missing required fields: title, start, end',
      });
    }

    // Parse attendees from studentIds
    let attendees = [];
    if (studentIds.length > 0) {
      const students = await prisma.student.findMany({
        where: {
          id: { in: studentIds },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      });

      attendees = students.map((student) => ({
        studentId: student.id,
        email: student.email,
        name: student.fullName,
        responseStatus: 'needsAction', // Pending response
      }));
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        start: new Date(start),
        end: new Date(end),
        location,
        meetLink: finalMeetLink,
        allDay,
        eventType: eventType || 'OTHER',
        category,
        attendees: JSON.stringify(attendees),
        createdBy: userId,
        createdByRole: role,
        jobId: jobId || null,
        status: 'ACTIVE',
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
        job: {
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        allDay: event.allDay,
        location: event.location,
        description: event.description,
        meetLink: event.meetLink,
        eventType: event.eventType,
        attendees: JSON.parse(event.attendees || '[]'),
        createdFor: attendees.map((a) => a.name || a.email),
      },
      message: `Event created successfully${attendees.length > 0 ? ` for ${attendees.length} student(s)` : ''}`,
    });
  } catch (error) {
    logger.error('Error creating custom calendar event:', error);
    res.status(500).json({
      error: error.message || 'Failed to create calendar event',
    });
  }
};

/**
 * Update calendar event
 * PUT /api/calendar/custom/events/:eventId
 */
export const updateCustomEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (role === 'STUDENT') {
      return res.status(403).json({
        error: 'Students cannot edit events',
      });
    }
    if (role === 'RECRUITER' && event.createdBy !== userId) {
      return res.status(403).json({
        error: 'You can only edit your own events',
      });
    }

    const {
      title,
      description,
      start,
      end,
      location,
      meetLink,
      allDay,
      eventType,
      category,
      studentIds,
      status,
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (start !== undefined) updateData.start = new Date(start);
    if (end !== undefined) updateData.end = new Date(end);
    if (location !== undefined) updateData.location = location;
    if (meetLink !== undefined) updateData.meetLink = meetLink;
    if (allDay !== undefined) updateData.allDay = allDay;
    if (eventType !== undefined) updateData.eventType = eventType;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;

    // Update attendees if studentIds provided
    if (studentIds !== undefined) {
      let attendees = [];
      if (studentIds.length > 0) {
        const students = await prisma.student.findMany({
          where: {
            id: { in: studentIds },
          },
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        });

        attendees = students.map((student) => ({
          studentId: student.id,
          email: student.email,
          name: student.fullName,
          responseStatus: 'needsAction',
        }));
      }
      updateData.attendees = JSON.stringify(attendees);
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
          },
        },
        job: {
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        start: updatedEvent.start.toISOString(),
        end: updatedEvent.end.toISOString(),
        allDay: updatedEvent.allDay,
        location: updatedEvent.location,
        description: updatedEvent.description,
        meetLink: updatedEvent.meetLink,
        eventType: updatedEvent.eventType,
        attendees: JSON.parse(updatedEvent.attendees || '[]'),
      },
      message: 'Event updated successfully',
    });
  } catch (error) {
    logger.error('Error updating custom calendar event:', error);
    res.status(500).json({
      error: error.message || 'Failed to update calendar event',
    });
  }
};

/**
 * Delete calendar event
 * DELETE /api/calendar/custom/events/:eventId
 */
export const deleteCustomEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (role === 'STUDENT') {
      return res.status(403).json({
        error: 'Students cannot delete events',
      });
    }
    if (role === 'RECRUITER' && event.createdBy !== userId) {
      return res.status(403).json({
        error: 'You can only delete your own events',
      });
    }

    await prisma.calendarEvent.delete({
      where: { id: eventId },
    });

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting custom calendar event:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete calendar event',
    });
  }
};

/**
 * Respond to event (for students)
 * POST /api/calendar/custom/events/:eventId/respond
 */
export const respondToCustomEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'STUDENT') {
      return res.status(403).json({
        error: 'Only students can respond to events',
      });
    }

    const { responseStatus } = req.body;

    if (!responseStatus || !['accepted', 'declined', 'tentative'].includes(responseStatus)) {
      return res.status(400).json({
        error: 'Invalid responseStatus. Must be: accepted, declined, or tentative',
      });
    }

    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    let attendees = [];
    try {
      attendees = JSON.parse(event.attendees || '[]');
    } catch (e) {
      attendees = [];
    }

    const studentEmail = req.user.email?.toLowerCase();
    const attendeeIndex = attendees.findIndex(
      (a) => a.email?.toLowerCase() === studentEmail
    );

    if (attendeeIndex === -1) {
      return res.status(403).json({
        error: 'You are not an attendee of this event',
      });
    }

    // Update response status
    attendees[attendeeIndex].responseStatus = responseStatus;

    await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        attendees: JSON.stringify(attendees),
      },
    });

    res.json({
      success: true,
      message: `Event ${responseStatus} successfully`,
    });
  } catch (error) {
    logger.error('Error responding to custom calendar event:', error);
    res.status(500).json({
      error: error.message || 'Failed to respond to event',
    });
  }
};

/**
 * Helper function to get event color based on role and status
 */
function getEventColor(event, role) {
  if (role === 'student') {
    const attendees = JSON.parse(event.attendees || '[]');
    const studentEmail = event.extendedProps?.userEmail?.toLowerCase();
    const attendee = attendees.find(
      (a) => a.email?.toLowerCase() === studentEmail
    );
    const responseStatus = attendee?.responseStatus;
    
    if (responseStatus === 'accepted') return '#22c55e'; // Green
    if (responseStatus === 'declined') return '#ef4444'; // Red
    if (responseStatus === 'tentative') return '#f59e0b'; // Orange
    return '#3b82f6'; // Blue (needsAction)
  } else if (role === 'recruiter') {
    return '#8b5cf6'; // Purple
  } else if (role === 'admin') {
    return '#22c55e'; // Green
  }
  return '#6366f1'; // Default indigo
}








