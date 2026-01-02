/**
 * Endorsement Routes
 * Magic Link Based Endorsement System
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import rateLimit from 'express-rate-limit';
import {
  requestEndorsement,
  getEndorsementByToken,
  submitEndorsement,
  getStudentEndorsements,
  deleteEndorsementRequest,
} from '../controllers/endorsements.js';

const router = express.Router({ mergeParams: true });

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors for better frontend handling
    const errorMessages = errors.array().map(err => err.msg);
    return res.status(400).json({ 
      error: errorMessages[0] || 'Validation failed',
      errors: errors.array() // Keep full errors for debugging
    });
  }
  return next();
};

// Rate limiting for public endpoints (prevent abuse)
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// AUTHENTICATED ROUTES (Student only) - Must come before :token route
// ============================================================================

/**
 * GET /api/endorsements/student
 * Get student's endorsements (received, pending, expired)
 * Auth: Student only
 * NOTE: This must be defined BEFORE /:token to prevent route conflicts
 */
router.get(
  '/student',
  authenticate,
  requireRole(['STUDENT']),
  getStudentEndorsements
);

// ============================================================================
// PUBLIC ROUTES (No authentication required for teachers)
// ============================================================================

/**
 * GET /api/endorsements/:token
 * Get endorsement request details by token (public)
 * Used by teachers to view the endorsement form
 * NOTE: This must come AFTER specific routes like /student
 */
router.get('/:token', publicLimiter, getEndorsementByToken);

/**
 * POST /api/endorsements/submit/:token
 * Submit endorsement (public, no auth required)
 * Teachers submit their endorsement through this endpoint
 */
router.post(
  '/submit/:token',
  publicLimiter,
  [
    body('endorsementMessage')
      .trim()
      .notEmpty()
      .withMessage('Endorsement message is required')
      .isLength({ min: 10, max: 2000 })
      .withMessage('Endorsement message must be between 10 and 2000 characters'),
    body('endorserName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Endorser name must be between 2 and 100 characters'),
    body('endorserRole')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Endorser role must be between 2 and 50 characters'),
    body('organization')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Organization must be between 2 and 100 characters'),
    body('relationship')
      .trim()
      .notEmpty()
      .withMessage('Relationship is required')
      .isIn(['Professor', 'Manager', 'Mentor', 'Guide', 'Supervisor', 'Colleague'])
      .withMessage('Relationship must be one of: Professor, Manager, Mentor, Guide, Supervisor, Colleague'),
    body('context')
      .optional({ values: 'falsy' }) // Treat empty strings, null, undefined as optional
      .trim()
      .custom((value) => {
        // If value exists after trim, validate length
        if (value && value.length > 0) {
          if (value.length < 2 || value.length > 200) {
            throw new Error('Context must be between 2 and 200 characters if provided');
          }
        }
        return true;
      }),
    body('consent')
      .custom((value) => {
        // Accept boolean true, string "true", or number 1
        const isValid = value === true || value === 'true' || value === 1 || value === '1';
        if (!isValid) {
          throw new Error('Consent is required. You must agree to submit this endorsement.');
        }
        return true;
      }),
    body('relatedSkills')
      .optional()
      .isArray()
      .withMessage('Related skills must be an array'),
    body('strengthRating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Strength rating must be between 1 and 5'),
  ],
  handleValidation,
  submitEndorsement
);

// ============================================================================
// AUTHENTICATED ROUTES (Student only)
// ============================================================================

/**
 * POST /api/endorsements/request
 * Request new endorsement (generate magic link)
 * Auth: Student only
 */
router.post(
  '/request',
  authenticate,
  requireRole(['STUDENT']),
  [
    body('teacherName')
      .trim()
      .notEmpty()
      .withMessage('Teacher name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Teacher name must be between 2 and 100 characters'),
    body('teacherEmail')
      .trim()
      .notEmpty()
      .withMessage('Teacher email is required')
      .isEmail()
      .withMessage('Invalid email format'),
    body('role')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Role must not exceed 50 characters'),
    body('organization')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Organization must not exceed 100 characters'),
  ],
  handleValidation,
  requestEndorsement
);

/**
 * DELETE /api/endorsements/request/:tokenId
 * Delete/cancel endorsement request (before it's used)
 * Auth: Student only
 */
router.delete(
  '/request/:tokenId',
  authenticate,
  requireRole(['STUDENT']),
  deleteEndorsementRequest
);

export default router;

