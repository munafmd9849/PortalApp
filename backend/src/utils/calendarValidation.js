/**
 * Calendar Validation Utilities
 * Reusable functions for validating Google Calendar connections
 */

import prisma from '../config/database.js';
import logger from '../config/logger.js';

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
      logger.warn('SECURITY: Calendar connection email mismatch detected', {
        userId,
        registeredEmail,
        connectedEmail,
        action: 'BLOCKED_API_ACCESS',
        timestamp: new Date().toISOString(),
      });

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


