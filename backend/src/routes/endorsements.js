import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getEndorsementByToken,
  submitEndorsement,
  getStudentEndorsements,
} from '../controllers/endorsements.js';

const router = express.Router({ mergeParams: true });

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

// Public routes - no authentication required for teachers to submit endorsements

/**
 * GET /api/endorsements/:token
 * Get endorsement details by token (public)
 */
router.get('/:token', getEndorsementByToken);

/**
 * POST /api/endorsements/:token/submit
 * Submit endorsement response (public, no auth required)
 */
router.post(
  '/:token/submit',
  [
    body('teacherName')
      .trim()
      .notEmpty()
      .withMessage('Teacher name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Teacher name must be between 2 and 100 characters'),
    body('teacherMessage')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Message must not exceed 2000 characters'),
    body('signatureData')
      .notEmpty()
      .withMessage('Signature is required')
      .custom((value) => {
        // Check if it's a valid base64 image data URL
        if (typeof value !== 'string') {
          throw new Error('Signature must be a valid image data');
        }
        if (!value.startsWith('data:image/')) {
          throw new Error('Signature must be a valid image data URL');
        }
        return true;
      }),
  ],
  handleValidation,
  submitEndorsement
);

// Authenticated route for students to get their endorsements
router.get(
  '/student',
  authenticate,
  requireRole(['STUDENT']),
  getStudentEndorsements
);

export default router;

