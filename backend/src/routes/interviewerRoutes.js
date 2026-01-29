/**
 * Interviewer Routes (Token-Based)
 * Public routes for interviewers (no login required)
 */

import express from 'express';
import {
  getSession,
  getActiveRound,
  getRoundCandidates,
  evaluateCandidate,
  startRound,
  endRound,
  endSession,
  exportSessionSpreadsheet,
} from '../controllers/interviewScheduling.js';

const router = express.Router();

// Interviewer routes (token-protected, no auth middleware)
router.get('/session/:sessionId', getSession);
router.get('/session/:sessionId/export', exportSessionSpreadsheet);
router.get('/session/:sessionId/active-round', getActiveRound);
router.get('/round/:roundId/candidates', getRoundCandidates);
router.post('/round/:roundId/evaluate', evaluateCandidate);
router.post('/round/:roundId/start', startRound);
router.post('/round/:roundId/end', endRound);
router.post('/session/:sessionId/end', endSession);

export default router;
