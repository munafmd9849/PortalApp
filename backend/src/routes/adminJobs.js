/**
 * Admin Jobs Routes
 * Admin-only endpoints for job management & reporting
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as applicationController from '../controllers/applications.js';
import * as jobController from '../controllers/jobs.js';

const router = express.Router({ mergeParams: true });

// GET /api/admin/jobs/:jobId/applications
// Also accessible by RECRUITER for their own jobs
router.get(
  '/jobs/:jobId/applications',
  authenticate,
  requireRole(['ADMIN', 'RECRUITER']),
  applicationController.getAdminJobApplications
);

// PATCH /api/admin/jobs/:jobId/note - Admin post-drive note (visible in Applicants section)
router.patch(
  '/jobs/:jobId/note',
  authenticate,
  requireRole(['ADMIN']),
  jobController.updateJobAdminNote
);

export default router;

