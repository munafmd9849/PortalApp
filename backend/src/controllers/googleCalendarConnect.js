/**
 * Google Calendar Connect Controller
 * Dedicated controller for the "Connect Google Calendar" page
 * Follows specific requirements: GET /api/google/calendar/oauth-url
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { getOAuthClient, exchangeCodeForTokens } from '../utils/googleCalendar.js';
import { getAuthenticatedCalendarClient } from '../services/calendarServiceEnhanced.js';

/**
 * GET /api/google/calendar/oauth-url
 * Generates Google OAuth URL for calendar connection
 * Returns: { url: "<oauth_url>" }
 * 
 * Note: Uses calendar.events.readonly scope as per requirements
 */
export const getOAuthUrl = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Generate OAuth URL with readonly scope and user ID in state
    const { getOAuthClient } = await import('../utils/googleCalendar.js');
    const oauth2Client = getOAuthClient();

    const scopes = [
      'https://www.googleapis.com/auth/calendar.events.readonly', // Readonly scope as per requirements
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: req.user.id, // Pass user ID for security
      response_type: 'code', // As per requirements
    });

    res.json({
      url: authUrl,
    });
  } catch (error) {
    logger.error('Error generating OAuth URL:', error);
    res.status(500).json({
      error: 'Failed to generate OAuth URL',
      message: error.message,
    });
  }
};

/**
 * GET /auth/google/callback
 * Handles OAuth callback, exchanges code for tokens, stores in DB
 * Responds with HTML script to close popup and notify parent window
 */
export const handleOAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'GOOGLE_CALENDAR_ERROR', error: 'No authorization code received' }, '*');
              window.close();
            </script>
            <p>Authorization failed. This window will close automatically.</p>
          </body>
        </html>
      `);
    }

    // Get user ID from state
    const userId = state;

    if (!userId) {
      return res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'GOOGLE_CALENDAR_ERROR', error: 'Invalid state parameter' }, '*');
              window.close();
            </script>
            <p>Authorization failed. This window will close automatically.</p>
          </body>
        </html>
      `);
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        recruiter: true,
      },
    });

    if (!user) {
      return res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'GOOGLE_CALENDAR_ERROR', error: 'User not found' }, '*');
              window.close();
            </script>
            <p>Authorization failed. This window will close automatically.</p>
          </body>
        </html>
      `);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Save tokens based on user role
    if (user.role === 'STUDENT' && user.student) {
      await prisma.student.update({
        where: { id: user.student.id },
        data: {
          googleCalendarConnected: true,
          googleCalendarAccessToken: tokens.access_token,
          googleCalendarRefreshToken: tokens.refresh_token,
          googleCalendarExpiryDate: tokens.expiry_date,
          googleCalendarScope: tokens.scope,
        },
      });
      logger.info(`Google Calendar connected for student ${user.student.id}`);
    } else if (user.role === 'RECRUITER' && user.recruiter) {
      await prisma.recruiter.update({
        where: { id: user.recruiter.id },
        data: {
          googleCalendarConnected: true,
          googleCalendarAccessToken: tokens.access_token,
          googleCalendarRefreshToken: tokens.refresh_token,
          googleCalendarExpiryDate: tokens.expiry_date,
          googleCalendarScope: tokens.scope,
        },
      });
      logger.info(`Google Calendar connected for recruiter ${user.recruiter.id}`);
    } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      await prisma.googleCalendarToken.upsert({
        where: { userId: user.id },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          scope: tokens.scope,
        },
        create: {
          userId: user.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          scope: tokens.scope,
        },
      });
      logger.info(`Google Calendar connected for admin ${user.id}`);
    } else {
      return res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'GOOGLE_CALENDAR_ERROR', error: 'Role not supported' }, '*');
              window.close();
            </script>
            <p>Authorization failed. This window will close automatically.</p>
          </body>
        </html>
      `);
    }

    // Success - send HTML that closes popup and notifies parent
    res.send(`
      <html>
        <head>
          <title>Calendar Connected</title>
        </head>
        <body>
          <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif;">
            <div style="text-align: center;">
              <h2 style="color: #4CAF50;">✓ Google Calendar Connected!</h2>
              <p>This window will close automatically...</p>
            </div>
          </div>
          <script>
            // Notify parent window
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_CALENDAR_CONNECTED' }, '*');
            }
            // Close popup after short delay
            setTimeout(() => {
              window.close();
            }, 1500);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error('Error in Google OAuth callback:', error);
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ 
              type: 'GOOGLE_CALENDAR_ERROR', 
              error: '${error.message || 'Failed to connect calendar'}' 
            }, '*');
            window.close();
          </script>
          <p>Authorization failed. This window will close automatically.</p>
        </body>
      </html>
    `);
  }
};

/**
 * GET /api/google/calendar/status
 * Check if calendar is connected
 * Returns: { connected: true/false }
 */
export const getCalendarStatus = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const role = req.user.role;

    let connected = false;

    if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: { googleCalendarConnected: true },
      });
      connected = !!student?.googleCalendarConnected;
    } else if (role === 'RECRUITER') {
      const recruiter = await prisma.recruiter.findUnique({
        where: { userId },
        select: { googleCalendarConnected: true },
      });
      connected = !!recruiter?.googleCalendarConnected;
    } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      const token = await prisma.googleCalendarToken.findUnique({
        where: { userId },
      });
      connected = !!token;
    }

    res.json({ connected });
  } catch (error) {
    logger.error('Error checking calendar status:', error);
    res.status(500).json({
      error: 'Failed to check calendar status',
      message: error.message,
    });
  }
};

/**
 * GET /api/google/calendar/events
 * Fetch upcoming calendar events (max 10)
 * Returns: { events: [...] }
 */
export const getCalendarEvents = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    const role = req.user.role;

    // Get authenticated calendar client
    const { calendar } = await getAuthenticatedCalendarClient(userId, role);

    // Fetch upcoming events (next 10)
    const now = new Date();
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (response.data.items || []).map((event) => ({
      id: event.id,
      title: event.summary || '(No title)',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      location: event.location,
      description: event.description,
    }));

    res.json({ events });
  } catch (error) {
    logger.error('Error fetching calendar events:', error);
    res.status(500).json({
      error: 'Failed to fetch calendar events',
      message: error.message,
    });
  }
};





