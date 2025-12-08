/**
 * Recruiters Routes
 * Admin endpoints for managing recruiters
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as recruiterController from '../controllers/recruiters.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get recruiter directory (admin only)
router.get('/directory', requireRole(['ADMIN', 'SUPER_ADMIN']), recruiterController.getRecruiterDirectory);

// Block/unblock recruiter (admin only)
router.patch('/:recruiterId/block', requireRole(['ADMIN', 'SUPER_ADMIN']), recruiterController.blockUnblockRecruiter);

export default router;

