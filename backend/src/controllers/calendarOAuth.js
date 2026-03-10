/**
 * Calendar OAuth Callback Controller
 * Handles Google OAuth callback for calendar connection
 * 
 * Route: GET /auth/google/calendar/callback
 * 
 * Flow:
 * 1. Google redirects here with authorization code
 * 2. Exchange code for tokens
 * 3. Store tokens in GoogleCalendarToken table
 * 4. Set googleCalendarConnected = true on User
 * 5. Respond with HTML that closes popup and notifies parent
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { exchangeCodeForTokens } from '../utils/googleCalendar.js';

/**
 * GET /auth/google/calendar/callback
 * Handles OAuth callback, exchanges code for tokens, stores in DB
 * Responds with HTML script to close popup and notify parent window
 */
export const handleOAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.send(`
        <html>
          <head>
            <title>Calendar Connection Failed</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="error">❌ Authorization Failed</h2>
              <p>No authorization code received from Google.</p>
              <p>This window will close automatically.</p>
            </div>
            <script>
              window.opener.postMessage({ 
                type: 'GOOGLE_CALENDAR_ERROR', 
                error: 'No authorization code received' 
              }, '*');
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    }

    // Get user ID from state
    const userId = state;

    if (!userId) {
      return res.send(`
        <html>
          <head>
            <title>Calendar Connection Failed</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="error">❌ Authorization Failed</h2>
              <p>Invalid state parameter.</p>
              <p>This window will close automatically.</p>
            </div>
            <script>
              window.opener.postMessage({ 
                type: 'GOOGLE_CALENDAR_ERROR', 
                error: 'Invalid state parameter' 
              }, '*');
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.send(`
        <html>
          <head>
            <title>Calendar Connection Failed</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="error">❌ Authorization Failed</h2>
              <p>User not found.</p>
              <p>This window will close automatically.</p>
            </div>
            <script>
              window.opener.postMessage({ 
                type: 'GOOGLE_CALENDAR_ERROR', 
                error: 'User not found' 
              }, '*');
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Log scope for debugging
    logger.info(`OAuth tokens received for user ${userId}, scope: ${tokens.scope}`);

    // Verify we got full calendar scope (not readonly)
    const hasFullScope = tokens.scope?.includes('https://www.googleapis.com/auth/calendar') && 
                        !tokens.scope?.includes('readonly');
    
    if (!hasFullScope) {
      logger.warn(`User ${userId} connected with limited scope: ${tokens.scope}`);
    }

    // Store tokens in GoogleCalendarToken table (upsert)
    await prisma.googleCalendarToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined, // Keep existing if not provided
        expiryDate: tokens.expiry_date,
        scope: tokens.scope,
        updatedAt: new Date(),
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        scope: tokens.scope,
      },
    });

    // Update user's googleCalendarConnected flag
    await prisma.user.update({
      where: { id: userId },
      data: { googleCalendarConnected: true },
    });

    logger.info(`Google Calendar connected for user ${userId} with scope: ${tokens.scope}`);

    // Success - send HTML that closes popup and notifies parent
    res.send(`
      <html>
        <head>
          <title>Calendar Connected</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              text-align: center;
              padding: 3rem;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            }
            .success {
              color: #4caf50;
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            h2 {
              color: #333;
              margin: 0.5rem 0;
            }
            p {
              color: #666;
              margin: 0.5rem 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h2>Google Calendar Connected!</h2>
            <p>Your calendar is now connected.</p>
            <p>This window will close automatically...</p>
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
        <head>
          <title>Calendar Connection Failed</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="error">❌ Connection Failed</h2>
            <p>${error.message || 'Failed to connect calendar'}</p>
            <p>This window will close automatically.</p>
          </div>
          <script>
            window.opener.postMessage({ 
              type: 'GOOGLE_CALENDAR_ERROR', 
              error: '${error.message || 'Failed to connect calendar'}'
            }, '*');
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  }
};
