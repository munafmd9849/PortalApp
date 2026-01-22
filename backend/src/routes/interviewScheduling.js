/**
 * Interview Scheduling Routes
 * Production-grade interview session management
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getOrCreateSession,
  configureRounds,
  inviteInterviewers,
  getSession,
  getActiveRound,
  getRoundCandidates,
  evaluateCandidate,
  startRound,
  endRound,
  endSession,
} from '../controllers/interviewScheduling.js';

const router = express.Router();

// Admin routes (require authentication and ADMIN role)
router.get('/session/:jobId', authenticate, requireRole('ADMIN'), getOrCreateSession);
router.post('/session', authenticate, requireRole('ADMIN'), getOrCreateSession);
router.post('/session/:sessionId/rounds', authenticate, requireRole('ADMIN'), configureRounds);
router.post('/session/:sessionId/invite-interviewers', authenticate, requireRole('ADMIN'), inviteInterviewers);

// Direct route for frontend compatibility (GET /api/interview-sessions/:jobId)
router.get('/:jobId', authenticate, requireRole('ADMIN'), getOrCreateSession);

export default router;
