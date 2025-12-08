import express from 'express';
import { body, validationResult } from 'express-validator';

import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  createStudentQuery,
  getStudentQueries,
  getAllQueries,
  respondToStudentQuery,
} from '../controllers/queries.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

router.post(
  '/',
  requireRole(['STUDENT']),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').custom((value, { req }) => {
    const type = (req.body.type || 'question').toLowerCase();
    if (type !== 'question') {
      return true;
    }
    if (!value || !value.trim()) {
      throw new Error('Message is required for questions');
    }
    if (value.trim().length < 10) {
      throw new Error('Message must be at least 10 characters');
    }
    return true;
  }),
  body('type')
    .optional()
    .isIn(['question', 'cgpa', 'calendar'])
    .withMessage('Invalid query type'),
  handleValidation,
  createStudentQuery
);

router.get('/', requireRole(['STUDENT']), getStudentQueries);

router.get('/admin', requireRole(['ADMIN', 'SUPER_ADMIN']), getAllQueries);

router.patch(
  '/:queryId/respond',
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  body('response')
    .trim()
    .notEmpty()
    .withMessage('Response text is required'),
  body('status')
    .optional()
    .isIn(['OPEN', 'RESOLVED', 'CLOSED'])
    .withMessage('Invalid status'),
  handleValidation,
  respondToStudentQuery
);

export default router;

