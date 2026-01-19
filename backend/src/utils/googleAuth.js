/**
 * Google OAuth Utility Functions for Authentication
 * Separate from calendar OAuth - used for user login/registration
 */

import { google } from 'googleapis';
import logger from '../config/logger.js';

/**
 * Create and configure Google OAuth2 client for authentication
 * Uses a different redirect URI than calendar OAuth
 */
export function getAuthOAuthClient() {
  // Use a separate redirect URI for authentication
  // This should be different from the calendar OAuth redirect URI
  const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;
  
  if (!redirectUri) {
    throw new Error('GOOGLE_AUTH_REDIRECT_URI or GOOGLE_REDIRECT_URI environment variable is required');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  return oauth2Client;
}

/**
 * Generate OAuth URL for Google authentication (login/registration)
 * @param {String} state - State parameter (can include role and other info as JSON string)
 * @returns {String} - OAuth authorization URL
 */
export function generateAuthOAuthUrl(state = '') {
  const oauth2Client = getAuthOAuthClient();

  // Only request profile and email scopes for authentication
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
    state: state, // Pass state for role selection and security
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens (for authentication)
 * @param {String} code - Authorization code from Google
 * @returns {Promise<Object>} - Tokens and user info { access_token, refresh_token, email, name, picture }
 */
export async function exchangeCodeForAuthTokens(code) {
  const oauth2Client = getAuthOAuthClient();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }
    
    // Fetch user info from Google
    oauth2Client.setCredentials({ access_token: tokens.access_token });
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      email: userInfo.data.email?.toLowerCase().trim() || null,
      name: userInfo.data.name || null,
      picture: userInfo.data.picture || null,
      verified_email: userInfo.data.verified_email || false,
    };
  } catch (error) {
    logger.error('Error exchanging code for auth tokens:', error);
    throw error;
  }
}

/**
 * Get Google user info from access token
 * @param {String} accessToken - Google OAuth access token
 * @returns {Promise<Object>} - User info { email, name, picture, verified_email }
 */
export async function getGoogleUserInfo(accessToken) {
  try {
    const oauth2Client = getAuthOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    return {
      email: userInfo.data.email?.toLowerCase().trim() || null,
      name: userInfo.data.name || null,
      picture: userInfo.data.picture || null,
      verified_email: userInfo.data.verified_email || false,
    };
  } catch (error) {
    logger.error('Error fetching Google user info:', error);
    throw new Error('Failed to fetch Google user info');
  }
}
