/**
 * Calendar Controller
 * Handles all calendar-related operations with role-based permissions
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { getOAuthClient, exchangeCodeForTokens } from '../utils/googleCalendar.js';
import { getAuthenticatedCalendarClient, createEvent as createCalendarEventService } from '../services/calendarServiceEnhanced.js';

/**
 * GET /api/calendar/status
 * Check if user's Google Calendar is connected
 * Returns: { connected: boolean }
 */
export const getCalendarStatus = async (req, res) => {
  try {
    if (!req.user?.id) {
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
 * 
 * Includes:
 * - access_type=offline (to get refresh token)
 * - prompt=consent (to force consent screen)
 */
export const getOAuthUrl = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const oauth2Client = getOAuthClient();

    // Full calendar scope (not readonly) - required for creating events
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: req.user.id, // Pass user ID for security
      response_type: 'code',
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
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const role = req.user.role;

    // Check if calendar is connected first (quick check) and get email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        googleCalendarConnected: true,
        email: true,
      },
    });

    if (!user?.googleCalendarConnected) {
      return res.status(400).json({
        error: 'Google Calendar not connected',
        message: 'Please connect your Google Calendar first',
      });
    }

    const userEmail = user?.email || '';

    // Parse query parameters
    const timeMin = req.query.timeMin || new Date().toISOString();
    const timeMax = req.query.timeMax || null;
    const maxResults = parseInt(req.query.maxResults) || 250;

    // Get authenticated calendar client
    const { calendar } = await getAuthenticatedCalendarClient(userId, role);

    // Build query
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

    // Fetch events
    const response = await calendar.events.list(query);
    const events = response.data.items || [];

    // Format and normalize events
    const normalizedEvents = events.map((event) => {
      // Find user's attendee status
      const userAttendee = event.attendees?.find(
        (a) => a.email?.toLowerCase() === userEmail?.toLowerCase()
      );

      return {
        id: event.id,
        title: event.summary || '(No title)',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location || '',
        createdBy: event.creator?.email || event.organizer?.email || '',
        attendees: (event.attendees || []).map((a) => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus,
        })),
        userResponseStatus: userAttendee?.responseStatus || null,
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
      };
    });

    res.json({ events: normalizedEvents });
  } catch (error) {
    logger.error('Error fetching calendar events:', {
      error: error.message,
      stack: error.stack,
      userId,
      role,
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
    let validAttendees = [];
    if (attendeesEmails && Array.isArray(attendeesEmails)) {
      validAttendees = attendeesEmails
        .filter(email => email && typeof email === 'string' && email.trim().length > 0)
        .map(email => email.trim().toLowerCase());
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
 * DELETE /api/calendar/disconnect
 * Disconnect Google Calendar by deleting tokens
 * Returns: { message: "Google Calendar disconnected successfully" }
 */
export const disconnectCalendar = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;

    // Delete token from database
    await prisma.googleCalendarToken.deleteMany({
      where: { userId },
    });

    // Update user's googleCalendarConnected flag
    await prisma.user.update({
      where: { id: userId },
      data: { googleCalendarConnected: false },
    });

    logger.info(`Google Calendar disconnected for user ${userId}`);

    res.json({
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error) {
    logger.error('Error disconnecting calendar:', error);
    
    // If token doesn't exist, still mark as disconnected
    if (error.code === 'P2025') {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { googleCalendarConnected: false },
      });
      return res.json({
        message: 'Google Calendar disconnected successfully',
      });
    }

    res.status(500).json({
      error: 'Failed to disconnect calendar',
      message: error.message,
    });
  }
};
