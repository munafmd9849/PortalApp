/**
 * Calendar Controller
 * Handles all calendar-related operations with role-based permissions
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { getOAuthClient, exchangeCodeForTokens } from '../utils/googleCalendar.js';
import { getAuthenticatedCalendarClient, createEvent as createCalendarEventService } from '../services/calendarServiceEnhanced.js';
import { validateCalendarConnection } from '../utils/calendarValidation.js';

/**
 * GET /api/calendar/status
 * Check if user's Google Calendar is connected
 * Returns: { connected: boolean }
 */
export const getCalendarStatus = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;

    // Check both the flag and token existence (consistent with events endpoint)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarConnected: true },
    });

    const token = await prisma.googleCalendarToken.findUnique({
      where: { userId },
      select: { 
        accessToken: true,
        refreshToken: true,
        scope: true,
      },
    });

    // Sync: If flag is true but no token, set flag to false
    if (user?.googleCalendarConnected && !token?.accessToken) {
      await prisma.user.update({
        where: { id: userId },
        data: { googleCalendarConnected: false },
      });
      return res.json({ connected: false });
    }

    // Sync: If token exists but flag is false, set flag to true
    if (token?.accessToken && !user?.googleCalendarConnected) {
      await prisma.user.update({
        where: { id: userId },
        data: { googleCalendarConnected: true },
      });
    }

    // Connected only if both flag is true AND token exists with accessToken
    const connected = !!(user?.googleCalendarConnected && token?.accessToken);
    
    // Check if token has full calendar scope (not readonly)
    const hasFullScope = token?.scope?.includes('https://www.googleapis.com/auth/calendar') && 
                         !token?.scope?.includes('readonly');

    res.json({ 
      connected,
      hasFullScope: connected ? hasFullScope : undefined, // Only include if connected
    });
  } catch (error) {
    logger.error('Error checking calendar status:', error);
    res.status(500).json({
      error: 'Failed to check calendar status',
      message: error.message,
    });
  }
};

/**
 * GET /api/calendar/oauth-url
 * Generate Google OAuth URL for calendar connection
 * Returns: { url: "<oauth_url>" }
 * 
 * Scopes:
 * - https://www.googleapis.com/auth/calendar (full access)
 * - https://www.googleapis.com/auth/userinfo.email (required for email verification)
 * 
 * Includes:
 * - access_type=offline (to get refresh token)
 * - prompt=consent (to force consent screen)
 */
export const getOAuthUrl = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const oauth2Client = getOAuthClient();

    // Required scopes:
    // 1. Calendar scope - required for creating/reading calendar events
    // 2. UserInfo email scope - required for email verification (to ensure user connects with registered email)
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email', // Required for email verification
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: req.user.id, // Pass user ID for security
      response_type: 'code',
    });

    logger.info('OAuth URL generated', {
      userId: req.user.id,
      role: req.user.role,
      scope: scopes.join(', '),
    });

    res.json({ url: authUrl });
  } catch (error) {
    logger.error('Error generating OAuth URL:', error);
    res.status(500).json({
      error: 'Failed to generate OAuth URL',
      message: error.message,
    });
  }
};

/**
 * GET /api/calendar/events
 * Fetch calendar events for the authenticated user
 * Query params:
 * - timeMin: ISO string (default: now)
 * - timeMax: ISO string (optional)
 * - maxResults: number (default: 250)
 * 
 * Returns: { events: [...] }
 */
export const getCalendarEvents = async (req, res) => {
  // Define userId and role outside try block so they're available in catch block
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  
  const userId = req.user.id;
  const role = req.user.role || 'STUDENT';
  
  try {

    // HARD BLOCK: Verify calendar is connected with registered email
    const validation = await validateCalendarConnection(userId);
    if (!validation.valid) {
      return res.status(403).json({
        error: 'Google Calendar not connected',
        message: validation.error || 'Google Calendar not connected with registered email.',
      });
    }

    const user = validation.user;

    const userEmail = user?.email || '';

    // Parse query parameters
    const timeMin = req.query.timeMin || new Date().toISOString();
    const timeMax = req.query.timeMax || null;
    const maxResults = parseInt(req.query.maxResults) || 250;

    // Get authenticated calendar client
    const { calendar } = await getAuthenticatedCalendarClient(userId, role);

    // Build query for primary calendar
    const query = {
      calendarId: 'primary',
      timeMin,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (timeMax) {
      query.timeMax = timeMax;
    }

    // Fetch events from primary calendar
    const response = await calendar.events.list(query);
    let events = response.data.items || [];

    // IMPORTANT: Also fetch events where user is an attendee but not the organizer
    // This ensures students see events created by admin/recruiters that invite them
    // We do this by checking if there are events where userEmail is in attendees but not organizer
    // Note: Google Calendar automatically adds invitations to user's calendar, but we'll also
    // explicitly filter to ensure we catch all events where user is an attendee
    
    // Filter events to include:
    // 1. Events in user's primary calendar (already fetched)
    // 2. Events where user is an attendee (these should already be in primary calendar if invitation was accepted)
    // But to be safe, we'll also check for events where user is attendee but might not have accepted yet
    
    // Format and normalize events
    const normalizedEvents = events.map((event) => {
      // Find user's attendee status
      const userAttendee = event.attendees?.find(
        (a) => a.email?.toLowerCase() === userEmail?.toLowerCase()
      );
      
      // Check if user is organizer
      const isOrganizer = event.organizer?.email?.toLowerCase() === userEmail?.toLowerCase();

      return {
        id: event.id,
        title: event.summary || '(No title)',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location || '',
        createdBy: event.creator?.email || event.organizer?.email || '',
        organizer: event.organizer?.email || '',
        isOrganizer,
        attendees: (event.attendees || []).map((a) => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus,
        })),
        userResponseStatus: userAttendee?.responseStatus || (isOrganizer ? 'accepted' : null),
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
      };
    });

    // Log for debugging
    logger.info(`Fetched ${normalizedEvents.length} calendar events for user ${userId} (${userEmail})`, {
      userId,
      userEmail,
      eventCount: normalizedEvents.length,
      eventsWithAttendees: normalizedEvents.filter(e => e.attendees.length > 0).length,
    });

    res.json({ events: normalizedEvents });
  } catch (error) {
    logger.error('Error fetching calendar events:', {
      error: error.message,
      stack: error.stack,
      userId: userId || req.user?.id || 'unknown',
      role: role || req.user?.role || 'unknown',
    });
    
    // Handle "not connected" error gracefully
    if (error.message?.includes('not connected')) {
      return res.status(400).json({
        error: 'Google Calendar not connected',
        message: 'Please connect your Google Calendar first',
      });
    }

    // Handle Google API errors
    if (error.response?.data) {
      logger.error('Google Calendar API error:', error.response.data);
      return res.status(500).json({
        error: 'Google Calendar API error',
        message: error.response.data.error?.message || error.message,
      });
    }

    // Handle token refresh errors
    if (error.message?.includes('token') || error.message?.includes('refresh')) {
      return res.status(401).json({
        error: 'Calendar authentication failed',
        message: 'Please reconnect your Google Calendar',
      });
    }

    res.status(500).json({
      error: 'Failed to fetch calendar events',
      message: error.message || 'Unknown error occurred',
    });
  }
};

/**
 * POST /api/calendar/events
 * Create a new calendar event
 * 
 * Role-based permissions:
 * - STUDENT: Cannot create (403 Forbidden)
 * - RECRUITER: Can create events (can invite students)
 * - ADMIN: Can create events (can invite anyone)
 * 
 * Request body:
 * {
 *   title: string (required)
 *   description: string (optional)
 *   start: ISO string (required)
 *   end: ISO string (required)
 *   attendeesEmails: string[] (optional)
 *   visibility: string (optional) - not used, kept for compatibility
 * }
 * 
 * Returns: { event: {...} }
 */
export const createCalendarEvent = async (req, res) => {
  // Define variables outside try block for error handling
  const userId = req.user?.id;
  const role = req.user?.role;
  let title, start, end, attendeesEmails;

  try {
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Role-based permission check
    if (role === 'STUDENT') {
      return res.status(403).json({
        error: 'Students cannot create events',
        message: 'Students have read-only access to calendar events',
      });
    }

    // HARD BLOCK: Verify calendar is connected with registered email
    const validation = await validateCalendarConnection(userId);
    if (!validation.valid) {
      return res.status(403).json({
        error: 'Google Calendar not connected',
        message: validation.error || 'Google Calendar not connected with registered email.',
      });
    }

    // Validate required fields
    ({ title, start, end, attendeesEmails } = req.body);
    const { description, visibility } = req.body;

    if (!title || !start || !end) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'title, start, and end are required',
      });
    }

    // Validate dates
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'start and end must be valid ISO date strings',
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'end date must be after start date',
      });
    }

    // Validate and filter attendees
    // CRITICAL: For students, use their connected Google email instead of registered email
    let validAttendees = [];
    if (attendeesEmails && Array.isArray(attendeesEmails)) {
      const emailList = attendeesEmails
        .filter(email => email && typeof email === 'string' && email.trim().length > 0)
        .map(email => email.trim().toLowerCase());

      // Resolve student emails to their connected Google emails
      for (const email of emailList) {
        // Check if this email belongs to a student with a connected calendar
        const student = await prisma.student.findUnique({
          where: { email },
          select: {
            userId: true,
            email: true,
          },
        });

        if (student) {
          // Student found - check for connected Google Calendar
          const token = await prisma.googleCalendarToken.findUnique({
            where: { userId: student.userId },
            select: { connectedGoogleEmail: true },
          });

          if (token?.connectedGoogleEmail) {
            // Use connected Google email instead of registered email
            validAttendees.push(token.connectedGoogleEmail.toLowerCase());
            logger.info('Resolved student email to connected Google email', {
              registeredEmail: email,
              connectedGoogleEmail: token.connectedGoogleEmail,
              studentId: student.userId,
            });
          } else {
            // Student doesn't have connected calendar - warn but still add registered email
            logger.warn('Student email provided but no connected Google Calendar', {
              registeredEmail: email,
              studentId: student.userId,
              action: 'Using registered email (may not receive calendar invite)',
            });
            validAttendees.push(email);
          }
        } else {
          // Not a student or email not found - use as-is (could be external email)
          validAttendees.push(email);
        }
      }
    }

    // Prepare event data (service expects attendees and meetLink inside eventData)
    const eventData = {
      summary: title,
      description: description || '',
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      location: req.body.location || '',
      attendees: validAttendees,
      meetLink: req.body.meetLink || false,
    };

    // Create event using service
    const createdEvent = await createCalendarEventService(
      userId,
      role,
      eventData,
      null, // targetUserId (not used for self-creation)
      null  // targetRole (not used for self-creation)
    );

    logger.info(`Created calendar event ${createdEvent.id} by user ${userId} (role: ${role})`);

    res.status(201).json({
      event: {
        id: createdEvent.id,
        title: createdEvent.summary,
        description: createdEvent.description,
        start: createdEvent.start,
        end: createdEvent.end,
        location: createdEvent.location,
        attendees: createdEvent.attendees,
        htmlLink: createdEvent.htmlLink,
        hangoutLink: createdEvent.hangoutLink,
      },
    });
  } catch (error) {
    logger.error('Error creating calendar event:', {
      error: error.message,
      stack: error.stack,
      userId: userId || 'unknown',
      role: role || 'unknown',
      eventData: {
        title: title || 'unknown',
        start: start || 'unknown',
        end: end || 'unknown',
        hasAttendees: !!(attendeesEmails && attendeesEmails.length > 0),
      },
    });

    // Handle "not connected" error
    if (error.message?.includes('not connected')) {
      return res.status(400).json({
        error: 'Google Calendar not connected',
        message: 'Please connect your Google Calendar first',
      });
    }

    // Handle Google API errors
    if (error.response?.data) {
      logger.error('Google Calendar API error:', error.response.data);
      
      // Check for insufficient scopes error
      const apiError = error.response.data.error;
      if (apiError?.code === 403 && apiError?.message?.includes('insufficient authentication scopes')) {
        return res.status(403).json({
          error: 'Insufficient calendar permissions',
          message: 'Your calendar connection has read-only permissions. Please disconnect and reconnect your Google Calendar to grant full access for creating events.',
          requiresReconnect: true,
        });
      }
      
      return res.status(500).json({
        error: 'Google Calendar API error',
        message: apiError?.message || error.message,
      });
    }

    // Handle token refresh errors
    if (error.message?.includes('token') || error.message?.includes('refresh')) {
      return res.status(401).json({
        error: 'Calendar authentication failed',
        message: 'Please reconnect your Google Calendar',
      });
    }

    res.status(500).json({
      error: 'Failed to create calendar event',
      message: error.message || 'Unknown error occurred',
    });
  }
};

/**
 * PUT /api/calendar/events/:eventId
 * Update a calendar event
 * 
 * Role-based permissions:
 * - STUDENT: Cannot update (403 Forbidden)
 * - RECRUITER: Can only update own events
 * - ADMIN: Can update any event
 * 
 * Request body:
 * {
 *   title: string (optional)
 *   description: string (optional)
 *   start: ISO string (optional)
 *   end: ISO string (optional)
 *   location: string (optional)
 *   attendeesEmails: string[] (optional)
 * }
 * 
 * Returns: { event: {...} }
 */
export const updateCalendarEvent = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const eventId = req.params.eventId;

  try {
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Role-based permission check
    if (role === 'STUDENT') {
      return res.status(403).json({
        error: 'Students cannot update events',
        message: 'Students have read-only access to calendar events',
      });
    }

    // HARD BLOCK: Verify calendar is connected with registered email
    const validation = await validateCalendarConnection(userId);
    if (!validation.valid) {
      return res.status(403).json({
        error: 'Google Calendar not connected',
        message: validation.error || 'Google Calendar not connected with registered email.',
      });
    }

    const { title, description, start, end, location, attendeesEmails } = req.body;

    // Validate dates if provided
    if (start) {
      const startDate = new Date(start);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: 'start must be a valid ISO date string',
        });
      }
    }

    if (end) {
      const endDate = new Date(end);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: 'end must be a valid ISO date string',
        });
      }
    }

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (endDate <= startDate) {
        return res.status(400).json({
          error: 'Invalid date range',
          message: 'end date must be after start date',
        });
      }
    }

    // Validate and filter attendees
    // CRITICAL: For students, use their connected Google email instead of registered email
    let validAttendees = [];
    if (attendeesEmails && Array.isArray(attendeesEmails)) {
      const emailList = attendeesEmails
        .filter(email => email && typeof email === 'string' && email.trim().length > 0)
        .map(email => email.trim().toLowerCase());

      // Resolve student emails to their connected Google emails
      for (const email of emailList) {
        // Check if this email belongs to a student with a connected calendar
        const student = await prisma.student.findUnique({
          where: { email },
          select: {
            userId: true,
            email: true,
          },
        });

        if (student) {
          // Student found - check for connected Google Calendar
          const token = await prisma.googleCalendarToken.findUnique({
            where: { userId: student.userId },
            select: { connectedGoogleEmail: true },
          });

          if (token?.connectedGoogleEmail) {
            // Use connected Google email instead of registered email
            validAttendees.push(token.connectedGoogleEmail.toLowerCase());
            logger.info('Resolved student email to connected Google email (update)', {
              registeredEmail: email,
              connectedGoogleEmail: token.connectedGoogleEmail,
              studentId: student.userId,
            });
          } else {
            // Student doesn't have connected calendar - warn but still add registered email
            logger.warn('Student email provided but no connected Google Calendar (update)', {
              registeredEmail: email,
              studentId: student.userId,
              action: 'Using registered email (may not receive calendar invite)',
            });
            validAttendees.push(email);
          }
        } else {
          // Not a student or email not found - use as-is (could be external email)
          validAttendees.push(email);
        }
      }
    }

    // Prepare update object
    const updates = {};
    if (title) updates.summary = title;
    if (description !== undefined) updates.description = description || '';
    if (start) updates.start = new Date(start).toISOString();
    if (end) updates.end = new Date(end).toISOString();
    if (location !== undefined) updates.location = location || '';
    if (validAttendees.length > 0) updates.attendees = validAttendees;

    // Update event using service
    const { updateEvent } = await import('../services/calendarServiceEnhanced.js');
    const updatedEvent = await updateEvent(
      userId,
      role,
      eventId,
      updates,
      null, // targetUserId (not used for self-update)
      null  // targetRole (not used for self-update)
    );

    logger.info(`Updated calendar event ${eventId} by user ${userId} (role: ${role})`);

    res.json({
      event: {
        id: updatedEvent.id,
        title: updatedEvent.summary,
        description: updatedEvent.description,
        start: updatedEvent.start,
        end: updatedEvent.end,
        location: updatedEvent.location,
        attendees: updatedEvent.attendees,
        htmlLink: updatedEvent.htmlLink,
        hangoutLink: updatedEvent.hangoutLink,
      },
    });
  } catch (error) {
    logger.error('Error updating calendar event:', {
      error: error.message,
      stack: error.stack,
      userId: userId || 'unknown',
      role: role || 'unknown',
      eventId,
    });

    // Handle "not connected" error
    if (error.message?.includes('not connected')) {
      return res.status(400).json({
        error: 'Google Calendar not connected',
        message: 'Please connect your Google Calendar first',
      });
    }

    // Handle ownership/permission errors
    if (error.message?.includes('can only edit') || error.message?.includes('cannot edit')) {
      return res.status(403).json({
        error: 'Permission denied',
        message: error.message,
      });
    }

    // Handle event not found
    if (error.message?.includes('not found') || error.message?.includes('access denied')) {
      return res.status(404).json({
        error: 'Event not found',
        message: 'The event does not exist or you do not have permission to access it',
      });
    }

    // Handle Google API errors
    if (error.response?.data) {
      logger.error('Google Calendar API error:', error.response.data);
      return res.status(500).json({
        error: 'Google Calendar API error',
        message: error.response.data.error?.message || error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to update calendar event',
      message: error.message || 'Unknown error occurred',
    });
  }
};

/**
 * DELETE /api/calendar/events/:eventId
 * Delete a calendar event
 * 
 * Role-based permissions:
 * - STUDENT: Cannot delete (403 Forbidden)
 * - RECRUITER: Can only delete own events
 * - ADMIN: Can delete any event
 * 
 * Returns: { message: "Event deleted successfully" }
 */
export const deleteCalendarEvent = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const eventId = req.params.eventId;

  try {
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Role-based permission check
    if (role === 'STUDENT') {
      return res.status(403).json({
        error: 'Students cannot delete events',
        message: 'Students have read-only access to calendar events',
      });
    }

    // HARD BLOCK: Verify calendar is connected with registered email
    const validation = await validateCalendarConnection(userId);
    if (!validation.valid) {
      return res.status(403).json({
        error: 'Google Calendar not connected',
        message: validation.error || 'Google Calendar not connected with registered email.',
      });
    }

    // Delete event using service
    const { deleteEvent } = await import('../services/calendarServiceEnhanced.js');
    await deleteEvent(
      userId,
      role,
      eventId,
      null, // targetUserId (not used for self-delete)
      null  // targetRole (not used for self-delete)
    );

    logger.info(`Deleted calendar event ${eventId} by user ${userId} (role: ${role})`);

    res.json({
      message: 'Event deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting calendar event:', {
      error: error.message,
      stack: error.stack,
      userId: userId || 'unknown',
      role: role || 'unknown',
      eventId,
    });

    // Handle "not connected" error
    if (error.message?.includes('not connected')) {
      return res.status(400).json({
        error: 'Google Calendar not connected',
        message: 'Please connect your Google Calendar first',
      });
    }

    // Handle ownership/permission errors
    if (error.message?.includes('can only') || error.message?.includes('cannot')) {
      return res.status(403).json({
        error: 'Permission denied',
        message: error.message,
      });
    }

    // Handle event not found
    if (error.message?.includes('not found') || error.message?.includes('access denied')) {
      return res.status(404).json({
        error: 'Event not found',
        message: 'The event does not exist or you do not have permission to access it',
      });
    }

    // Handle Google API errors
    if (error.response?.data) {
      logger.error('Google Calendar API error:', error.response.data);
      return res.status(500).json({
        error: 'Google Calendar API error',
        message: error.response.data.error?.message || error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to delete calendar event',
      message: error.message || 'Unknown error occurred',
    });
  }
};

/**
 * POST /api/calendar/events/:eventId/respond
 * Respond to a calendar event (accept/decline/tentative)
 * 
 * Role-based permissions:
 * - STUDENT: Can respond to events
 * - RECRUITER: Cannot respond (403 Forbidden)
 * - ADMIN: Cannot respond (403 Forbidden)
 * 
 * Request body:
 * {
 *   responseStatus: 'accepted' | 'declined' | 'tentative'
 * }
 * 
 * Returns: { event: {...} }
 */
export const respondToCalendarEvent = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const eventId = req.params.eventId;

  try {
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Role-based permission check
    if (role !== 'STUDENT') {
      return res.status(403).json({
        error: 'Only students can respond to events',
        message: 'Recruiters and admins cannot respond to events',
      });
    }

    // HARD BLOCK: Verify calendar is connected with registered email
    const validation = await validateCalendarConnection(userId);
    if (!validation.valid) {
      return res.status(403).json({
        error: 'Google Calendar not connected',
        message: validation.error || 'Google Calendar not connected with registered email.',
      });
    }

    const { responseStatus } = req.body;

    if (!responseStatus) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'responseStatus is required',
      });
    }

    if (!['accepted', 'declined', 'tentative'].includes(responseStatus)) {
      return res.status(400).json({
        error: 'Invalid response status',
        message: 'responseStatus must be one of: accepted, declined, tentative',
      });
    }

    // Respond to event using service
    const { respondToEvent } = await import('../services/calendarServiceEnhanced.js');
    const updatedEvent = await respondToEvent(userId, role, eventId, responseStatus);

    logger.info(`User ${userId} ${responseStatus} event ${eventId}`);

    res.json({
      event: {
        id: updatedEvent.id,
        attendees: updatedEvent.attendees,
      },
      message: `Event ${responseStatus} successfully`,
    });
  } catch (error) {
    logger.error('Error responding to calendar event:', {
      error: error.message,
      stack: error.stack,
      userId: userId || 'unknown',
      role: role || 'unknown',
      eventId,
    });

    // Handle "not connected" error
    if (error.message?.includes('not connected')) {
      return res.status(400).json({
        error: 'Google Calendar not connected',
        message: 'Please connect your Google Calendar first',
      });
    }

    // Handle "not an attendee" error
    if (error.message?.includes('not an attendee')) {
      return res.status(403).json({
        error: 'Not an attendee',
        message: 'You are not an attendee of this event',
      });
    }

    // Handle Google API errors
    if (error.response?.data) {
      logger.error('Google Calendar API error:', error.response.data);
      return res.status(500).json({
        error: 'Google Calendar API error',
        message: error.response.data.error?.message || error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to respond to calendar event',
      message: error.message || 'Unknown error occurred',
    });
  }
};

/**
 * DELETE /api/calendar/disconnect
 * Disconnect Google Calendar by deleting tokens
 * Returns: { message: "Google Calendar disconnected successfully" }
 */
export const disconnectCalendar = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;

    // Delete token from database (use deleteMany to handle case where token doesn't exist)
    try {
      await prisma.googleCalendarToken.deleteMany({
        where: { userId },
      });
    } catch (tokenError) {
      // Token deletion failed - log but continue
      logger.warn('Error deleting calendar token (may not exist):', {
        userId,
        error: tokenError.message,
      });
    }

    // Update user's googleCalendarConnected flag and remove connected email
    // Handle case where connectedGoogleEmail field might not exist yet (migration not run)
    try {
      const updateData = {
        googleCalendarConnected: false,
      };
      
      // Only try to update connectedGoogleEmail if the field exists
      // Check if we can safely update it by trying a test query first
      try {
        // Try to include connectedGoogleEmail in update
        updateData.connectedGoogleEmail = null;
        await prisma.user.update({
          where: { id: userId },
          data: updateData,
        });
      } catch (fieldError) {
        // If field doesn't exist, update without it
        if (fieldError.message?.includes('Unknown arg') || fieldError.message?.includes('Unknown field')) {
          logger.warn('connectedGoogleEmail field not found in database - skipping field update', {
            userId,
            note: 'Run database migration to add connectedGoogleEmail field',
          });
          // Update without connectedGoogleEmail field
          await prisma.user.update({
            where: { id: userId },
            data: { googleCalendarConnected: false },
          });
        } else {
          // Re-throw if it's a different error
          throw fieldError;
        }
      }
    } catch (updateError) {
      // If update fails with P2025 (record not found), that's OK - user might not exist
      if (updateError.code === 'P2025') {
        logger.warn('User not found during disconnect (may have been deleted):', {
          userId,
        });
        // Still return success since tokens are deleted
        return res.json({
          message: 'Google Calendar disconnected successfully',
        });
      }
      // Re-throw other errors
      throw updateError;
    }

    logger.info(`Google Calendar disconnected for user ${userId}`, {
      userId,
      action: 'DISCONNECT',
    });

    res.json({
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error) {
    logger.error('Error disconnecting calendar:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id || 'unknown',
      code: error.code,
    });
    
    // If token doesn't exist, still mark as disconnected
    if (error.code === 'P2025') {
      try {
        await prisma.user.update({
          where: { id: req.user.id },
          data: { googleCalendarConnected: false },
        });
        return res.json({
          message: 'Google Calendar disconnected successfully',
        });
      } catch (updateError) {
        // If update also fails, return error
        logger.error('Failed to update user after token deletion error:', updateError);
      }
    }

    res.status(500).json({
      error: 'Failed to disconnect calendar',
      message: error.message || 'An unexpected error occurred',
    });
  }
};
