/**
 * Calendar Validation Utilities
 * Reusable functions for validating Google Calendar connections
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';

// Cache to prevent duplicate error logging for the same user
// Format: { userId: timestamp }
const errorLogCache = new Map();
const ERROR_LOG_COOLDOWN = 60000; // 60 seconds - only log once per minute per user

/**
 * Log error with deduplication to prevent spam
 */
function logEmailMismatchWarning(userId, registeredEmail, connectedEmail) {
  const now = Date.now();
  const lastLogTime = errorLogCache.get(userId);
  
  // Only log if it's been more than COOLDOWN ms since last log for this user
  if (!lastLogTime || (now - lastLogTime) > ERROR_LOG_COOLDOWN) {
    logger.warn('SECURITY: Calendar connection email mismatch detected', {
      userId,
      registeredEmail,
      connectedEmail,
      action: 'BLOCKED_API_ACCESS',
      timestamp: new Date().toISOString(),
    });
    
    // Update cache with current timestamp
    errorLogCache.set(userId, now);
    
    // Clean up old entries (older than 5 minutes) to prevent memory leak
    if (errorLogCache.size > 1000) {
      const fiveMinutesAgo = now - 300000;
      for (const [cachedUserId, cachedTime] of errorLogCache.entries()) {
        if (cachedTime < fiveMinutesAgo) {
          errorLogCache.delete(cachedUserId);
        }
      }
    }
  }
}

/**
 * Verify that user's calendar is connected with registered email
 * Used by all calendar API endpoints for security enforcement
 * 
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - { valid: boolean, user: object, token: object, error: string }
 */
export async function validateCalendarConnection(userId) {
  try {
    // Get user with calendar connection status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        googleCalendarConnected: true,
        connectedGoogleEmail: true,
      },
    });

    if (!user) {
      return {
        valid: false,
        error: 'User not found',
      };
    }

    // Check if calendar is connected
    if (!user.googleCalendarConnected) {
      return {
        valid: false,
        user,
        error: 'Google Calendar not connected with registered email.',
      };
    }

    // Get calendar token
    const token = await prisma.googleCalendarToken.findUnique({
      where: { userId },
      select: {
        connectedGoogleEmail: true,
      },
    });

    if (!token) {
      return {
        valid: false,
        user,
        error: 'Google Calendar not connected with registered email.',
      };
    }

    // CRITICAL: Verify email match
    const registeredEmail = user.email?.toLowerCase().trim();
    const connectedEmail = token.connectedGoogleEmail?.toLowerCase().trim();

    if (registeredEmail !== connectedEmail) {
      // Use deduplicated logging to prevent spam
      logEmailMismatchWarning(userId, registeredEmail, connectedEmail);

      return {
        valid: false,
        user,
        token,
        error: 'Google Calendar not connected with registered email.',
      };
    }

    return {
      valid: true,
      user,
      token,
    };
  } catch (error) {
    logger.error('Error validating calendar connection:', {
      userId,
      error: error.message,
      stack: error.stack,
    });

    return {
      valid: false,
      error: 'Failed to validate calendar connection',
    };
  }
}


