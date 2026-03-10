/**
 * Session Token Middleware
 * Validates session tokens for token-based interview access
 */

import prisma from '../config/database.js';
import { isValidTokenFormat } from '../utils/sessionToken.js';

/**
 * Middleware to validate session token
 * Attaches interview session to req.sessionInterview
 */
export const validateSessionToken = async (req, res, next) => {
  try {
    const token = req.params.token || req.query.token || req.body.token;

    if (!token) {
      return res.status(401).json({ error: 'Session token is required' });
    }

    // Validate token format
    if (!isValidTokenFormat(token)) {
      return res.status(401).json({ error: 'Invalid session token format' });
    }

    // Find interview by token
    const interview = await prisma.interview.findUnique({
      where: { sessionToken: token },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!interview) {
      return res.status(404).json({ error: 'Session not found or token invalid' });
    }

    // Check if session is still active
    if (interview.status === 'COMPLETED' || interview.status === 'CANCELLED') {
      return res.status(403).json({ 
        error: 'Session has ended',
        status: interview.status 
      });
    }

    // Attach interview to request
    req.sessionInterview = interview;
    req.sessionToken = token;
    next();
  } catch (error) {
    console.error('Session token validation error:', error);
    res.status(500).json({ error: 'Failed to validate session token' });
  }
};

