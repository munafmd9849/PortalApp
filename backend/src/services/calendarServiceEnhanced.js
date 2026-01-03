/**
 * Enhanced Calendar Service
 * Full CRUD operations for Google Calendar events with role-based permissions
 */

import prisma from '../config/database.js';
import { getCalendarClient, createCalendarEvent } from '../utils/googleCalendar.js';
import logger from '../config/logger.js';

/**
 * Get authenticated calendar client for a user
 * Uses unified GoogleCalendarToken model for all users
 * @param {String} userId - User ID
 * @param {String} role - User role (STUDENT, RECRUITER, ADMIN)
 * @returns {Promise<Object>} - { calendar, updatedTokens, userProfile }
 */
export async function getAuthenticatedCalendarClient(userId, role) {
  // Check if user has connected calendar
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      googleCalendarConnected: true,
    },
  });

  if (!user || !user.googleCalendarConnected) {
    throw new Error('Google Calendar not connected');
  }

  // Get tokens from GoogleCalendarToken table (unified for all roles)
  const calendarToken = await prisma.googleCalendarToken.findUnique({
    where: { userId },
  });

  if (!calendarToken) {
    throw new Error('Google Calendar not connected');
  }

  // Validate token scope for write operations
  const hasFullScope = calendarToken.scope?.includes('https://www.googleapis.com/auth/calendar') && 
                       !calendarToken.scope?.includes('readonly');
  
  if (!hasFullScope && (role === 'RECRUITER' || role === 'ADMIN' || role === 'SUPER_ADMIN')) {
    logger.warn(`User ${userId} (${role}) has read-only calendar scope but attempting write operation`, {
      scope: calendarToken.scope,
    });
  }

  const tokens = {
    accessToken: calendarToken.accessToken,
    refreshToken: calendarToken.refreshToken,
    expiryDate: calendarToken.expiryDate,
  };

  const { calendar, updatedTokens } = await getCalendarClient(tokens);

  // Update tokens if refreshed
  if (updatedTokens) {
    await prisma.googleCalendarToken.update({
      where: { userId },
      data: {
        accessToken: updatedTokens.accessToken,
        refreshToken: updatedTokens.refreshToken || calendarToken.refreshToken, // Keep existing if not provided
        expiryDate: updatedTokens.expiryDate,
      },
    });
  }

  return { 
    calendar, 
    updatedTokens, 
    userProfile: { id: userId, email: user.email } 
  };
}

/**
 * Get calendar client for a specific user (used by admin)
 * Uses unified GoogleCalendarToken model
 * @param {String} targetUserId - Target user's ID
 * @param {String} targetRole - Target user's role
 * @returns {Promise<Object>} - Calendar client
 */
async function getCalendarClientForUser(targetUserId, targetRole) {
  // Check if target user has connected calendar
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      email: true,
      googleCalendarConnected: true,
    },
  });

  if (!targetUser || !targetUser.googleCalendarConnected) {
    throw new Error(`Target user's Google Calendar not connected`);
  }

  // Get tokens from GoogleCalendarToken table
  const calendarToken = await prisma.googleCalendarToken.findUnique({
    where: { userId: targetUserId },
  });

  if (!calendarToken) {
    throw new Error(`Target user's Google Calendar not connected`);
  }

  const tokens = {
    accessToken: calendarToken.accessToken,
    refreshToken: calendarToken.refreshToken,
    expiryDate: calendarToken.expiryDate,
  };

  const { calendar, updatedTokens } = await getCalendarClient(tokens);

  // Update tokens if refreshed
  if (updatedTokens) {
    await prisma.googleCalendarToken.update({
      where: { userId: targetUserId },
      data: {
        accessToken: updatedTokens.accessToken,
        refreshToken: updatedTokens.refreshToken || calendarToken.refreshToken,
        expiryDate: updatedTokens.expiryDate,
      },
    });
  }

  return { 
    calendar, 
    userProfile: { id: targetUserId, email: targetUser.email } 
  };
}

/**
 * Create calendar event
 * @param {String} userId - User ID creating the event
 * @param {String} role - User role
 * @param {Object} eventData - Event data
 * @param {String} targetUserId - Optional: target user ID (for admin creating for others)
 * @param {String} targetRole - Optional: target user role
 * @returns {Promise<Object>} - Created event
 */
/**
 * Validate scope for write operations
 * @param {String} userId - User ID
 * @param {String} operation - Operation name (create, update, delete)
 * @returns {Promise<Boolean>} - True if has full scope
 */
async function validateWriteScope(userId, operation) {
  const calendarToken = await prisma.googleCalendarToken.findUnique({
    where: { userId },
    select: { scope: true },
  });

  if (!calendarToken) {
    return false;
  }

  const hasFullScope = calendarToken.scope?.includes('https://www.googleapis.com/auth/calendar') && 
                       !calendarToken.scope?.includes('readonly');

  if (!hasFullScope) {
    logger.warn(`User ${userId} attempted ${operation} with read-only scope`, {
      scope: calendarToken.scope,
      operation,
    });
  }

  return hasFullScope;
}

export async function createEvent(userId, role, eventData, targetUserId = null, targetRole = null) {
  const {
    summary,
    description = '',
    start,
    end,
    location = '',
    attendees = [],
    meetLink = false,
  } = eventData;

  // Validate required fields
  if (!summary || !start || !end) {
    throw new Error('Event must have summary, start, and end times');
  }

  let calendar;

  // If admin creating for someone else
  if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && targetUserId && targetRole) {
    const result = await getCalendarClientForUser(targetUserId, targetRole);
    calendar = result.calendar;
  } else {
    // User creating for themselves
    const result = await getAuthenticatedCalendarClient(userId, role);
    calendar = result.calendar;
  }

  // Create event
  const event = await createCalendarEvent(
    calendar,
    { summary, description, start, end, location },
    attendees,
    meetLink
  );

  // Log event creation with attendee details for debugging
  logger.info(`Created calendar event for user ${userId} (role: ${role})`, {
    eventId: event.id,
    eventTitle: event.summary,
    attendeeCount: attendees.length,
    attendees: attendees,
    hasAttendees: attendees.length > 0,
    sendUpdates: attendees.length > 0 ? 'all' : 'none',
    eventLink: event.htmlLink,
  });

  // If there are attendees, log a warning if invitations might not be visible to students
  if (attendees.length > 0) {
    logger.info(`Event created with ${attendees.length} attendee(s). Invitations sent via Google Calendar.`, {
      eventId: event.id,
      attendees: attendees,
      note: 'Students should see this event in their calendar if they have Google Calendar connected and invitations are accepted/auto-added.',
    });
  }

  return {
    id: event.id,
    summary: event.summary,
    description: event.description,
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    location: event.location,
    htmlLink: event.htmlLink,
    hangoutLink: event.hangoutLink,
    attendees: event.attendees || [],
    created: event.created,
    updated: event.updated,
  };
}

/**
 * Update calendar event
 * @param {String} userId - User ID
 * @param {String} role - User role
 * @param {String} eventId - Event ID
 * @param {Object} updates - Event updates
 * @param {String} targetUserId - Optional: target user ID (for admin)
 * @param {String} targetRole - Optional: target user role
 * @returns {Promise<Object>} - Updated event
 */
export async function updateEvent(userId, role, eventId, updates, targetUserId = null, targetRole = null) {
  // Validate scope for write operations
  const hasFullScope = await validateWriteScope(userId, 'update');
  if (!hasFullScope) {
    throw new Error('Calendar has read-only permissions. Please disconnect and reconnect with full access.');
  }

  logger.info(`Updating calendar event`, {
    userId,
    role,
    eventId,
    targetUserId,
    targetRole,
  });
  // Validate user can edit this event
  await validateEventOwnership(userId, role, eventId, targetUserId, targetRole);

  let calendar;

  // If admin updating for someone else
  if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && targetUserId && targetRole) {
    const result = await getCalendarClientForUser(targetUserId, targetRole);
    calendar = result.calendar;
  } else {
    const result = await getAuthenticatedCalendarClient(userId, role);
    calendar = result.calendar;
  }

  // Build update object
  const eventUpdate = {};
  if (updates.summary) eventUpdate.summary = updates.summary;
  if (updates.description !== undefined) eventUpdate.description = updates.description;
  if (updates.location !== undefined) eventUpdate.location = updates.location;
  if (updates.start) {
    eventUpdate.start = {
      dateTime: new Date(updates.start).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };
  }
  if (updates.end) {
    eventUpdate.end = {
      dateTime: new Date(updates.end).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };
  }
  if (updates.attendees) {
    eventUpdate.attendees = updates.attendees.map(email => ({ email }));
  }

  // Update event
  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId,
    resource: eventUpdate,
    sendUpdates: updates.attendees ? 'all' : 'none',
  });

  logger.info(`Updated calendar event ${eventId} by user ${userId}`);

  return {
    id: response.data.id,
    summary: response.data.summary,
    description: response.data.description,
    start: response.data.start?.dateTime || response.data.start?.date,
    end: response.data.end?.dateTime || response.data.end?.date,
    location: response.data.location,
    htmlLink: response.data.htmlLink,
    hangoutLink: response.data.hangoutLink,
    attendees: response.data.attendees || [],
    updated: response.data.updated,
  };
}

/**
 * Delete calendar event
 * @param {String} userId - User ID
 * @param {String} role - User role
 * @param {String} eventId - Event ID
 * @param {String} targetUserId - Optional: target user ID (for admin)
 * @param {String} targetRole - Optional: target user role
 * @returns {Promise<void>}
 */
export async function deleteEvent(userId, role, eventId, targetUserId = null, targetRole = null) {
  // Validate scope for write operations
  const hasFullScope = await validateWriteScope(userId, 'delete');
  if (!hasFullScope) {
    throw new Error('Calendar has read-only permissions. Please disconnect and reconnect with full access.');
  }

  logger.info(`Deleting calendar event`, {
    userId,
    role,
    eventId,
    targetUserId,
    targetRole,
  });
  // Validate user can delete this event
  await validateEventOwnership(userId, role, eventId, targetUserId, targetRole);

  let calendar;

  // If admin deleting for someone else
  if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && targetUserId && targetRole) {
    const result = await getCalendarClientForUser(targetUserId, targetRole);
    calendar = result.calendar;
  } else {
    const result = await getAuthenticatedCalendarClient(userId, role);
    calendar = result.calendar;
  }

  // Delete event
  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
  });

  logger.info(`Deleted calendar event ${eventId} by user ${userId}`);
}

/**
 * Get events for a user based on their role
 * @param {String} userId - User ID
 * @param {String} role - User role
 * @param {Object} filters - { timeMin, timeMax, maxResults }
 * @returns {Promise<Array>} - Array of events
 */
export async function getEventsForRole(userId, role, filters = {}) {
  const {
    timeMin = new Date().toISOString(),
    timeMax = null,
    maxResults = 250,
    calendarId = 'primary',
  } = filters;

  // Get user's email for matching attendee status
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const userEmail = user?.email || '';

  // Admin can view their own calendar events
  // Future: Could extend to show aggregated events from all users
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    // Admin views their own calendar (connected via GoogleCalendarToken)
    const { calendar } = await getAuthenticatedCalendarClient(userId, role);

    // Build query
    const query = {
      calendarId,
      timeMin,
      maxResults: parseInt(maxResults),
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (timeMax) {
      query.timeMax = timeMax;
    }

    // Fetch events
    const response = await calendar.events.list(query);
    const events = response.data.items || [];

    // Format events - Admin sees events they created (as organizer)
    return events.map(event => {
      // Find admin's attendee status (they're usually the organizer)
      const adminAttendee = event.attendees?.find(a => a.email === userEmail);
      return {
        id: event.id,
        summary: event.summary || 'No Title',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location || '',
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
        creator: event.creator?.email || '',
        organizer: event.organizer?.email || '',
        attendees: event.attendees?.map(a => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus,
        })) || [],
        // Admin's own response status (usually 'accepted' as organizer)
        userResponseStatus: adminAttendee?.responseStatus || (event.organizer?.email === userEmail ? 'accepted' : null),
        userEmail: userEmail,
      };
    });
  }

  // Get calendar client
  const { calendar } = await getAuthenticatedCalendarClient(userId, role);

  // Build query
  const query = {
    calendarId,
    timeMin,
    maxResults: parseInt(maxResults),
    singleEvents: true,
    orderBy: 'startTime',
  };

  if (timeMax) {
    query.timeMax = timeMax;
  }

  // For students: show all events including pending invitations (needsAction)
  // Google Calendar automatically shows events where user is an attendee
  // This includes events with 'needsAction' status (pending invitations)
  if (role === 'STUDENT') {
    // Students see all events in their calendar including:
    // - Events they're invited to (needsAction, accepted, tentative, declined)
    // - Events they created themselves
    // No filtering needed - Google Calendar API returns all relevant events
  }

  // Fetch events - This will include:
  // - Events where user is organizer (they created)
  // - Events where user is attendee (they're invited, including pending invitations)
  const response = await calendar.events.list(query);
  const events = response.data.items || [];

  // Format events - Include user's response status
  return events.map(event => {
    // Find current user's attendee status
    const userAttendee = event.attendees?.find(a => a.email?.toLowerCase() === userEmail?.toLowerCase());
    return {
      id: event.id,
      summary: event.summary || 'No Title',
      description: event.description || '',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      location: event.location || '',
      htmlLink: event.htmlLink,
      hangoutLink: event.hangoutLink,
      creator: event.creator?.email || '',
      organizer: event.organizer?.email || '',
      attendees: event.attendees?.map(a => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: a.responseStatus, // 'accepted', 'declined', 'needsAction', 'tentative'
      })) || [],
      created: event.created,
      updated: event.updated,
      status: event.status, // 'confirmed', 'tentative', 'cancelled'
      visibility: event.visibility,
      iCalUID: event.iCalUID,
      // Current user's response status to this event
      userResponseStatus: userAttendee?.responseStatus || null,
      userEmail: userEmail,
    };
  });
}

/**
 * Validate event ownership/permissions
 * @param {String} userId - User ID
 * @param {String} role - User role
 * @param {String} eventId - Event ID
 * @param {String} targetUserId - Optional: target user ID
 * @param {String} targetRole - Optional: target user role
 * @returns {Promise<void>}
 */
async function validateEventOwnership(userId, role, eventId, targetUserId = null, targetRole = null) {
  // Admin can edit/delete any event
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return; // Admin has full access
  }

  // For non-admin, get their calendar and check if event exists
  const { calendar } = await getAuthenticatedCalendarClient(userId, role);

  try {
    const event = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    // Recruiter can only edit/delete their own events (where they are the organizer)
    if (role === 'RECRUITER') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { recruiter: true },
      });

      const userEmail = user?.email;
      const organizerEmail = event.data.organizer?.email;

      if (userEmail !== organizerEmail) {
        throw new Error('You can only edit/delete your own events');
      }
    }

    // Students cannot edit/delete events (they can only view and accept/decline)
    if (role === 'STUDENT') {
      throw new Error('Students cannot edit or delete events');
    }
  } catch (error) {
    if (error.message.includes('not connected')) {
      throw error;
    }
    if (error.message.includes('can only edit')) {
      throw error;
    }
    if (error.message.includes('cannot edit')) {
      throw error;
    }
    throw new Error('Event not found or access denied');
  }
}

/**
 * Respond to event (accept/decline) - for students
 * @param {String} userId - User ID
 * @param {String} eventId - Event ID
 * @param {String} responseStatus - 'accepted', 'declined', 'tentative'
 * @returns {Promise<Object>} - Updated event
 */
export async function respondToEvent(userId, role, eventId, responseStatus) {
  if (role !== 'STUDENT') {
    throw new Error('Only students can respond to events');
  }

  if (!['accepted', 'declined', 'tentative'].includes(responseStatus)) {
    throw new Error('Invalid response status');
  }

  const { calendar, userProfile } = await getAuthenticatedCalendarClient(userId, role);

  // Get user email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const userEmail = user?.email || userProfile?.email || '';

  // Get event to find attendee
  const event = await calendar.events.get({
    calendarId: 'primary',
    eventId,
  });

  // Find user's attendee entry
  const attendees = event.data.attendees || [];

  const attendeeIndex = attendees.findIndex(a => a.email === userEmail);
  if (attendeeIndex === -1) {
    throw new Error('You are not an attendee of this event');
  }

  // Update attendee response
  attendees[attendeeIndex].responseStatus = responseStatus;

  // Update event
  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId,
    resource: {
      attendees,
    },
    sendUpdates: 'all',
  });

  logger.info(`User ${userId} ${responseStatus} event ${eventId}`);

  return {
    id: response.data.id,
    attendees: response.data.attendees || [],
  };
}





