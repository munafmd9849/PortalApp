/**
 * Placement AI Routes
 * Provides AI-powered placement guidance using Google Gemini
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { generatePlacementGuidance } from '../services/geminiService.js';
import logger from '../config/logger.js';

const router = express.Router();

// In-memory rate limiting (simple implementation)
const userRequestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_HOUR = 20; // Max 20 requests per user per hour

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimits() {
  const now = Date.now();
  for (const [userId, data] of userRequestCounts.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
      userRequestCounts.delete(userId);
    }
  }
}

/**
 * Check rate limit for user
 */
function checkRateLimit(userId) {
  cleanupRateLimits();
  
  const now = Date.now();
  const userData = userRequestCounts.get(userId);
  
  if (!userData) {
    userRequestCounts.set(userId, {
      count: 1,
      windowStart: now,
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR - 1 };
  }
  
  // Reset window if expired
  if (now - userData.windowStart > RATE_LIMIT_WINDOW) {
    userRequestCounts.set(userId, {
      count: 1,
      windowStart: now,
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR - 1 };
  }
  
  // Check if limit exceeded
  if (userData.count >= MAX_REQUESTS_PER_HOUR) {
    return { 
      allowed: false, 
      remaining: 0,
      resetAt: new Date(userData.windowStart + RATE_LIMIT_WINDOW),
    };
  }
  
  // Increment count
  userData.count += 1;
  return { 
    allowed: true, 
    remaining: MAX_REQUESTS_PER_HOUR - userData.count,
  };
}

/**
 * POST /api/placement/ai
 * Generate AI-powered placement guidance
 * 
 * Request Body:
 * {
 *   "query": string (required, 2-500 chars),
 *   "context": string (optional, default: "placement_resources")
 * }
 * 
 * Response:
 * {
 *   "summary": string,
 *   "keyTopics": string[],
 *   "recommendedResources": string[],
 *   "practiceSuggestions": string[],
 *   "nextSteps": string[]
 * }
 */
router.post(
  '/ai',
  authenticate,
  [
    body('query')
      .trim()
      .isLength({ min: 2, max: 500 })
      .withMessage('Query must be between 2 and 500 characters'),
    body('context')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Context must be less than 50 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const { query, context = 'placement_resources' } = req.body;

    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded', {
        userId,
        query: query.substring(0, 50),
        resetAt: rateLimit.resetAt,
      });
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `You have exceeded the maximum number of requests. Please try again after ${rateLimit.resetAt.toLocaleTimeString()}.`,
        resetAt: rateLimit.resetAt,
      });
    }

    // Log request
    logger.info('Placement AI request', {
      userId,
      queryLength: query.length,
      context,
      remainingRequests: rateLimit.remaining,
    });

    try {
      // Generate guidance
      const guidance = await generatePlacementGuidance(query, context);

      // Log success
      logger.info('Placement AI response generated', {
        userId,
        queryLength: query.length,
        hasSummary: !!guidance.summary,
        topicsCount: guidance.keyTopics?.length || 0,
      });

      // Return response with rate limit info
      res.json({
        ...guidance,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW),
        },
      });
    } catch (error) {
      logger.error('Placement AI error', {
        userId,
        query: query.substring(0, 50),
        error: error.message,
        errorStack: error.stack,
      });

      // Return user-friendly error message
      // The error message from generatePlacementGuidance is already user-friendly
      // Never expose internal errors to users
      const errorMessage = error.message || 'An error occurred while generating guidance. Please try again later.';
      
      // Determine appropriate status code
      let statusCode = 500;
      if (error.message.includes('not available') || error.message.includes('not configured') || error.message.includes('configuration')) {
        statusCode = 503;
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        statusCode = 504;
      }

      res.status(statusCode).json({
        error: 'Failed to generate guidance',
        message: errorMessage,
      });
    }
  }
);

export default router;

