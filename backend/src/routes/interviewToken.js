/**
 * Token-Based Interview Routes
 * Public routes for interviewers to access sessions via token (no login required)
 */

import express from 'express';
import { validateSessionToken } from '../middleware/sessionToken.js';
import {
  getSessionByToken,
  startRoundByToken,
  endRoundByToken,
  getCandidatesByToken,
  evaluateCandidateByToken,
  getActivitiesByToken,
} from '../controllers/interviewToken.js';

const router = express.Router();

// All routes require valid session token (no authentication/role check)
router.use('/session/:token', validateSessionToken);

// Get session info
router.get('/session/:token', getSessionByToken);

// Start a round
router.post('/session/:token/round/:roundName/start', startRoundByToken);

// End a round
router.post('/session/:token/round/:roundName/end', endRoundByToken);

// Get candidates for a round
router.get('/session/:token/round/:roundName/candidates', getCandidatesByToken);

// Evaluate a candidate
router.patch('/session/:token/candidate/:studentId', evaluateCandidateByToken);

// Get activity feed
router.get('/session/:token/activities', getActivitiesByToken);

export default router;

