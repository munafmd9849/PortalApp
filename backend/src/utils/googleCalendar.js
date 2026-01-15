/**
 * Google Calendar Utility Functions
 * OAuth client management and credential handling
 */

import { google } from 'googleapis';
import logger from '../config/logger.js';

/**
 * Create and configure Google OAuth2 client
 */
export function getOAuthClient() {
  // Use environment variable if set, otherwise default to new callback path
  // Support both old and new paths for compatibility
  // GOOGLE_REDIRECT_URI should be set in environment variables
  // It's the backend callback URL (not frontend URL)
  if (!process.env.GOOGLE_REDIRECT_URI) {
    throw new Error('GOOGLE_REDIRECT_URI environment variable is required. Set it to your backend callback URL (e.g., https://api.yourdomain.com/auth/google/callback)');
  }
  const defaultRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    defaultRedirectUri
  );

  return oauth2Client;
}

/**
 * Set credentials on OAuth client from stored tokens
 * @param {Object} oauth2Client - Google OAuth2 client
 * @param {Object} tokens - { accessToken, refreshToken, expiryDate }
 */
export function setCredentials(oauth2Client, tokens) {
  const { accessToken, refreshToken, expiryDate } = tokens;

  // Convert expiryDate to timestamp if it's not already
  let expiryTimestamp = null;
  if (expiryDate) {
    if (expiryDate instanceof Date) {
      expiryTimestamp = expiryDate.getTime();
    } else if (typeof expiryDate === 'string') {
      expiryTimestamp = new Date(expiryDate).getTime();
    } else if (typeof expiryDate === 'number') {
      expiryTimestamp = expiryDate;
    }
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiryTimestamp,
  });
}

/**
 * Refresh access token using refresh token
 * @param {Object} oauth2Client - Google OAuth2 client
 * @returns {Promise<Object>} - New credentials { access_token, refresh_token, expiry_date }
 */
export async function refreshAccessToken(oauth2Client) {
  try {
    logger.info('Attempting to refresh Google Calendar access token');
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    logger.info('Google Calendar access token refreshed successfully', {
      hasNewAccessToken: !!credentials.access_token,
      hasNewRefreshToken: !!credentials.refresh_token,
      expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
    });
    
    return {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      token_type: credentials.token_type || 'Bearer',
      scope: credentials.scope,
    };
  } catch (error) {
    logger.error('Error refreshing Google access token:', {
      error: error.message,
      code: error.code,
      response: error.response?.data,
    });
    
    // Provide more specific error messages
    if (error.message?.includes('invalid_grant')) {
      throw new Error('Refresh token is invalid or expired. Please reconnect your Google Calendar.');
    }
    
    throw new Error(`Failed to refresh access token: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get authenticated calendar client for a user
 * Automatically refreshes token if expired
 * @param {Object} tokens - { accessToken, refreshToken, expiryDate }
 * @returns {Promise<Object>} - Authenticated calendar client
 */
export async function getCalendarClient(tokens) {
  const oauth2Client = getOAuthClient();
  
  // Validate tokens
  if (!tokens.accessToken) {
    throw new Error('Access token is missing');
  }
  
  if (!tokens.refreshToken) {
    logger.warn('Refresh token is missing - token refresh may fail');
  }
  
  setCredentials(oauth2Client, tokens);

  // Check if token is expired or will expire soon (within 5 minutes)
  const expiryTime = tokens.expiryDate 
    ? (tokens.expiryDate instanceof Date 
        ? tokens.expiryDate.getTime() 
        : new Date(tokens.expiryDate).getTime())
    : 0;
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiryTime < now + fiveMinutes) {
    // Token expired or expiring soon, refresh it
    if (!tokens.refreshToken) {
      throw new Error('Refresh token is missing. Please reconnect your Google Calendar.');
    }
    
    try {
      const newCredentials = await refreshAccessToken(oauth2Client);
      
      // Update credentials on client
      oauth2Client.setCredentials(newCredentials);
      
      // Return updated tokens for saving to DB
      return {
        calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
        updatedTokens: {
          accessToken: newCredentials.access_token,
          refreshToken: newCredentials.refresh_token || tokens.refreshToken,
          expiryDate: newCredentials.expiry_date,
        },
      };
    } catch (error) {
      logger.error('Failed to refresh token:', {
        error: error.message,
        hasRefreshToken: !!tokens.refreshToken,
      });
      throw error; // Re-throw with the specific error message
    }
  }

  return {
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    updatedTokens: null, // No update needed
  };
}

/**
 * Create a calendar event
 * @param {Object} calendar - Authenticated Google Calendar client
 * @param {Object} eventData - Event data
 * @param {Array} attendees - Array of email addresses to invite
 * @param {Boolean} createMeetLink - Whether to create Google Meet link
 * @returns {Promise<Object>} - Created event
 */
export async function createCalendarEvent(calendar, eventData, attendees = [], createMeetLink = false) {
  const {
    summary,
    description = '',
    start,
    end,
    location = '',
  } = eventData;

  // Validate required fields
  if (!summary || !start || !end) {
    throw new Error('Event must have summary, start, and end times');
  }

  // Build event resource
  const event = {
    summary,
    description,
    start: {
      dateTime: new Date(start).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    end: {
      dateTime: new Date(end).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    location,
    attendees: attendees.map(email => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 15 }, // 15 minutes before
      ],
    },
  };

  // Add Google Meet link if requested
  if (createMeetLink) {
    event.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
    event.conferenceDataVersion = 1;
  }

  // Send notification to attendees
  const sendUpdates = attendees.length > 0 ? 'all' : 'none';

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      sendUpdates,
      conferenceDataVersion: createMeetLink ? 1 : 0,
    });

    return response.data;
  } catch (error) {
    logger.error('Error creating calendar event:', {
      error: error.message,
      code: error.code,
      response: error.response?.data,
      eventSummary: summary,
    });
    
    // Preserve the original error structure for proper handling
    // The controller needs access to error.response.data.error to check for scope issues
    // Re-throw the original error to preserve response structure
    throw error;
  }
}

/**
 * Generate OAuth URL for Google Calendar
 * @param {String} userId - User ID to include in state
 * @returns {String} - OAuth authorization URL
 */
export function generateOAuthUrl(userId) {
  const oauth2Client = getOAuthClient();

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
    state: userId, // Pass user ID for security
  });

  return authUrl;
}

/**
 * Get Google account email from OAuth token
 * @param {String} accessToken - Google OAuth access token
 * @returns {Promise<String>} - Google account email
 */
export async function getGoogleAccountEmail(accessToken) {
  try {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    return userInfo.data.email?.toLowerCase().trim() || null;
  } catch (error) {
    logger.error('Error fetching Google account email:', error);
    throw new Error('Failed to fetch Google account email');
  }
}

/**
 * Revoke Google OAuth token
 * @param {String} accessToken - Google OAuth access token to revoke
 * @returns {Promise<void>}
 */
export async function revokeGoogleToken(accessToken) {
  try {
    const revokeUrl = `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(revokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok && response.status !== 400) {
      // 400 is OK - token might already be revoked
      logger.warn('Token revocation returned non-OK status:', {
        status: response.status,
        statusText: response.statusText,
      });
    } else {
      logger.info('Google OAuth token revoked successfully');
    }
  } catch (error) {
    logger.error('Error revoking Google token:', error);
    // Don't throw - revocation failure shouldn't block the flow
  }
}

/**
 * Get Google account email and verification status from UserInfo API
 * @param {String} accessToken - Google OAuth access token
 * @returns {Promise<Object>} - { email: string, verified_email: boolean }
 */
/**
 * Fetch Google account email and verification status using UserInfo API
 * Uses direct HTTP call as fallback if library call fails
 * 
 * @param {String} accessToken - Google OAuth access token
 * @returns {Promise<Object>} - { email: string, verified_email: boolean }
 */
export async function getGoogleUserInfo(accessToken) {
  if (!accessToken) {
    throw new Error('Access token is required');
  }

  // Try using Google library first
  try {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const email = userInfo.data.email?.toLowerCase().trim() || null;
    const verifiedEmail = userInfo.data.verified_email === true;

    logger.info('Google UserInfo fetched via library', {
      hasEmail: !!email,
      verifiedEmail,
    });

    if (!email) {
      throw new Error('Email not returned in UserInfo response');
    }

    return {
      email,
      verified_email: verifiedEmail,
    };
  } catch (libraryError) {
    logger.warn('Google UserInfo library call failed, trying direct HTTP API', {
      error: libraryError.message,
      errorCode: libraryError.code,
    });

    // Fallback: Use direct HTTP API call
    try {
      const https = await import('https');

      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'www.googleapis.com',
          path: '/oauth2/v2/userinfo',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              if (res.statusCode !== 200) {
                logger.error('Google UserInfo API error', {
                  statusCode: res.statusCode,
                  statusMessage: res.statusMessage,
                  response: data,
                });
                reject(new Error(`Google UserInfo API returned ${res.statusCode}: ${res.statusMessage}`));
                return;
              }

              const userInfo = JSON.parse(data);
              const email = userInfo.email?.toLowerCase().trim() || null;
              const verifiedEmail = userInfo.verified_email === true;

              logger.info('Google UserInfo fetched via direct HTTP API', {
                hasEmail: !!email,
                verifiedEmail,
                statusCode: res.statusCode,
              });

              if (!email) {
                reject(new Error('Email not returned in UserInfo response'));
                return;
              }

              resolve({
                email,
                verified_email: verifiedEmail,
              });
            } catch (parseError) {
              logger.error('Error parsing UserInfo response', {
                error: parseError.message,
                response: data,
              });
              reject(new Error('Failed to parse Google UserInfo response'));
            }
          });
        });

        req.on('error', (error) => {
          logger.error('Google UserInfo HTTP request failed', {
            error: error.message,
            code: error.code,
          });
          reject(new Error(`Failed to fetch Google UserInfo: ${error.message}`));
        });

        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('Google UserInfo request timeout'));
        });

        req.end();
      });
    } catch (httpError) {
      logger.error('Both library and HTTP API calls failed for UserInfo', {
        libraryError: libraryError.message,
        httpError: httpError.message,
      });
      throw new Error(`Failed to fetch Google account information: ${httpError.message}`);
    }
  }
}

/**
 * Exchange authorization code for tokens
 * @param {String} code - Authorization code from Google
 * @returns {Promise<Object>} - Tokens { access_token, refresh_token, expiry_date, scope, email, verified_email }
 */
export async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuthClient();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }
    
    // CRITICAL: Fetch Google account email and verification status using UserInfo API
    let googleEmail = null;
    let verifiedEmail = false;
    
    try {
      const userInfo = await getGoogleUserInfo(tokens.access_token);
      googleEmail = userInfo.email;
      verifiedEmail = userInfo.verified_email;
      
      if (!googleEmail) {
        throw new Error('Google account email not available');
      }
      
      if (!verifiedEmail) {
        logger.warn('Google account email is not verified', {
          email: googleEmail,
        });
        // Still proceed but log warning
      }
    } catch (emailError) {
      logger.error('Failed to fetch Google account email during token exchange:', emailError);
      // Revoke token since we can't verify email
      await revokeGoogleToken(tokens.access_token);
      throw new Error('Could not verify Google account email. Please try again.');
    }
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope,
      email: googleEmail,
      verified_email: verifiedEmail,
    };
  } catch (error) {
    logger.error('Error exchanging code for tokens:', error);
    throw error; // Re-throw to preserve error message
  }
}





