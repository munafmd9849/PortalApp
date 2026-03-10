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

// Export all applications to CSV (admin only)
router.post('/export', requireRole(['ADMIN']), applicationController.exportApplications);

// Check CSV export status (admin only)
router.get('/export/:jobId', requireRole(['ADMIN']), applicationController.getExportStatus);

// Get screening summary for a job (admin only)
router.get('/job/:jobId/screening-summary', requireRole(['ADMIN']), applicationController.getJobScreeningSummary);

// Get student's applications (student only, admins via query)
router.get('/student', requireRole(['STUDENT', 'ADMIN', 'SUPER_ADMIN']), applicationController.getStudentApplications);

// Get student's interview history with rounds (student only)
router.get('/student/interview-history', requireRole(['STUDENT']), applicationController.getStudentInterviewHistory);

// Apply to job
router.post('/jobs/:jobId', requireRole(['STUDENT']), applicationController.applyToJob);

// Update application status (admin/recruiter)
router.patch('/:applicationId/status', requireRole(['ADMIN', 'RECRUITER']), applicationController.updateApplicationStatus);

// Get short-lived URL to view resume inline (for new tab; no Bearer in tab)
router.get('/:applicationId/resume-view-url', requireRole(['ADMIN', 'RECRUITER']), applicationController.getResumeViewUrl);

export default router;
