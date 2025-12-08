/**
 * Application Routes
 * Replaces Firebase Firestore application service calls
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from "../middleware/roles.js";
import * as applicationController from '../controllers/applications.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get all applications (admin only) - must be before /:applicationId routes
router.get('/', requireRole(['ADMIN']), applicationController.getAllApplications);

// Get student's applications (student only)
router.get('/student', requireRole(['STUDENT']), applicationController.getStudentApplications);

// Apply to job
router.post('/jobs/:jobId', requireRole(['STUDENT']), applicationController.applyToJob);

// Update application status (admin/recruiter)
router.patch('/:applicationId/status', requireRole(['ADMIN', 'RECRUITER']), applicationController.updateApplicationStatus);

export default router;
