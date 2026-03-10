/**
 * Job Routes
 * Replaces Firebase Firestore job service calls
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as jobController from '../controllers/jobs.js';
import { validateJob } from '../middleware/validation.js';

const router = express.Router({ mergeParams: true });

// Public route - get targeted jobs (for authenticated students, or admins specifying studentId)
router.get('/targeted', authenticate, requireRole(['STUDENT', 'ADMIN', 'SUPER_ADMIN']), jobController.getTargetedJobs);

// Get all jobs (with filters)
router.get('/', authenticate, jobController.getJobs);

// Get single job
router.get('/:jobId', authenticate, jobController.getJob);

// Create job (recruiter or admin)
router.post('/', authenticate, requireRole(['RECRUITER', 'ADMIN']), validateJob, jobController.createJob);

// Update job (recruiter who owns it, or admin)
router.put('/:jobId', authenticate, requireRole(['RECRUITER', 'ADMIN']), jobController.updateJob);

// Update recruiter note for a job (post-drive note, visible in Company History)
router.patch('/:jobId/recruiter-note', authenticate, requireRole(['RECRUITER']), jobController.updateJobRecruiterNote);

// Post job (admin only - triggers distribution)
router.post('/:jobId/post', authenticate, requireRole(['ADMIN']), jobController.postJob);

// Approve job (admin)
router.post('/:jobId/approve', authenticate, requireRole(['ADMIN']), jobController.approveJob);

// Reject job (admin)
router.post('/:jobId/reject', authenticate, requireRole(['ADMIN']), jobController.rejectJob);

// Auto-archive expired jobs (admin)
router.post('/auto-archive-expired', authenticate, requireRole(['ADMIN']), jobController.autoArchiveExpiredJobs);

router.delete('/:jobId', authenticate, requireRole(['RECRUITER', 'ADMIN']), jobController.deleteJob);

export default router;
