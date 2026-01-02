/**
 * Interview Routes
 * Handles interview session management endpoints
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  startInterviewSession,
  getInterviewSession,
  updateInterviewRound,
  startAssessment,
  getRoundCandidates,
  evaluateCandidate,
  getInterviewActivities,
  endInterviewSession,
} from '../controllers/interviews.js';

const router = express.Router();

// All routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Start or resume interview session
router.post('/:jobId/start', startInterviewSession);

// Get interview session details
router.get('/:interviewId', getInterviewSession);

// Update interview round (create or update)
router.patch('/:interviewId/round', updateInterviewRound);

// Start assessment for a round
router.post('/:interviewId/round/:roundName/start', startAssessment);

// Get candidates for a round
router.get('/:interviewId/round/:roundName/candidates', getRoundCandidates);

// Evaluate a candidate
router.patch('/:interviewId/candidate/:studentId/evaluate', evaluateCandidate);

// Get interview activities (live feed)
router.get('/:interviewId/activities', getInterviewActivities);

// End interview session
router.post('/:interviewId/end', endInterviewSession);

export default router;




