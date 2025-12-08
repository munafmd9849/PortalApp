/**
 * Admin Requests Routes
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  createAdminRequest,
  getPendingAdminRequests,
  getAllAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
} from '../controllers/adminRequests.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Validation middleware
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Create admin request (any authenticated user)
router.post(
  '/',
  body('reason').optional().isString().trim(),
  handleValidation,
  createAdminRequest
);

// Get pending admin requests (admin only)
router.get('/pending', requireRole(['ADMIN', 'SUPER_ADMIN']), getPendingAdminRequests);

// Get all admin requests (admin only)
router.get('/', requireRole(['ADMIN', 'SUPER_ADMIN']), getAllAdminRequests);

// Approve admin request (admin only)
router.patch(
  '/:requestId/approve',
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  approveAdminRequest
);

// Reject admin request (admin only)
router.patch(
  '/:requestId/reject',
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  body('reason').optional().isString().trim(),
  handleValidation,
  rejectAdminRequest
);

export default router;

