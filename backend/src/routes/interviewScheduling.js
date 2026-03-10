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
  freezeInterviewSession,
  unfreezeInterviewSession,
} from '../controllers/interviewScheduling.js';

const router = express.Router();

// Admin + Super Admin + Recruiter routes (require authentication and ADMIN, SUPER_ADMIN, or RECRUITER role)
const adminOrSuperAdminOrRecruiter = ['ADMIN', 'SUPER_ADMIN', 'RECRUITER'];
router.get('/session/:jobId', authenticate, requireRole(adminOrSuperAdminOrRecruiter), getOrCreateSession);
router.post('/session', authenticate, requireRole(adminOrSuperAdminOrRecruiter), getOrCreateSession);
router.post('/session/:sessionId/rounds', authenticate, requireRole(adminOrSuperAdminOrRecruiter), configureRounds);
router.post('/session/:sessionId/invite-interviewers', authenticate, requireRole(adminOrSuperAdminOrRecruiter), inviteInterviewers);

// Super Admin only: freeze/unfreeze interview session
router.patch('/session/:sessionId/freeze', authenticate, requireRole('SUPER_ADMIN'), freezeInterviewSession);
router.patch('/session/:sessionId/unfreeze', authenticate, requireRole('SUPER_ADMIN'), unfreezeInterviewSession);

// Direct route for frontend compatibility (GET /api/interview-sessions/:jobId)
router.get('/:jobId', authenticate, requireRole(adminOrSuperAdminOrRecruiter), getOrCreateSession);

export default router;
