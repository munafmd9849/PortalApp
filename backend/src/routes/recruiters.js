/**
 * Recruiters Routes
 * Admin endpoints for managing recruiters; recruiter MOU upload/list
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { uploadMouDocument as uploadMouMiddleware } from '../middleware/upload.js';
import * as recruiterController from '../controllers/recruiters.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get recruiter directory (admin only)
router.get('/directory', requireRole(['ADMIN', 'SUPER_ADMIN']), recruiterController.getRecruiterDirectory);

// MOU documents (recruiter only) - must be before /:email
router.get('/mou', requireRole(['RECRUITER', 'ADMIN']), recruiterController.listMouDocuments);
router.post('/mou', requireRole(['RECRUITER', 'ADMIN']), uploadMouMiddleware, recruiterController.uploadMouDocument);

// Get recruiter jobs by email (admin only)
router.get('/:email/jobs', requireRole(['ADMIN', 'SUPER_ADMIN']), recruiterController.getRecruiterJobs);

// Block/unblock recruiter (Super Admin only)
router.patch('/:recruiterId/block', requireRole(['SUPER_ADMIN']), recruiterController.blockUnblockRecruiter);

export default router;

