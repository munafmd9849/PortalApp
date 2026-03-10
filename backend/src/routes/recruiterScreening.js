/**
 * Recruiter Screening Routes
 * Token-based routes (no login required)
 */

import express from 'express';
import * as recruiterScreeningController from '../controllers/recruiterScreening.js';

const router = express.Router();

// Get or create screening session
// POST /api/recruiter/screening/session
// GET /api/recruiter/screening/session?token=XYZ&jobId=ABC
router.post('/screening/session', recruiterScreeningController.getOrCreateScreeningSession);
router.get('/screening/session', recruiterScreeningController.getOrCreateScreeningSession);

// Update application screening status
// PATCH /api/recruiter/screening/application/:applicationId?token=XYZ
router.patch('/screening/application/:applicationId', recruiterScreeningController.verifyRecruiterToken, recruiterScreeningController.updateScreeningStatus);

// Finalize screening
// POST /api/recruiter/screening/finalize?token=XYZ
router.post('/screening/finalize', recruiterScreeningController.verifyRecruiterToken, recruiterScreeningController.finalizeScreening);

// Stream resume for viewing in browser (inline, not download)
// GET /api/recruiter/screening/resume/:applicationId?token=XYZ&jobId=ABC
router.get('/screening/resume/:applicationId', recruiterScreeningController.streamResume);

export default router;
