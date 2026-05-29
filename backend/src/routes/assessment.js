import express from 'express';
import { 
  createAssessment, 
  getAssessments, 
  getAssessmentDetails, 
  getStudentAssessments, 
  startSession, 
  logViolation, 
  uploadMedia, 
  uploadScreenshot,
  completeAssessment,
  getSessionResults,
  getAssessmentResults,
  getLiveAssessmentSessions,
  getProctoringSessionDetails,
  getSignedScreenshotUrl,
  evaluateAssessmentCandidate,
  getAssessmentCandidates,
  updateAssessment,
  deleteAssessment,
  getStudentSessionResults
} from '../controllers/assessment.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// --- Admin Routes ---
router.get('/:id/live-sessions', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getLiveAssessmentSessions);
router.get('/session/proctoring/:sessionId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getProctoringSessionDetails);
router.get('/session/screenshot/:screenshotId/url', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getSignedScreenshotUrl);
router.post('/create', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), createAssessment);
router.get('/all', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getAssessments);
router.get('/details/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'STUDENT']), getAssessmentDetails);
router.get('/results/:sessionId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getSessionResults);
router.get('/dashboard/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getAssessmentResults);
router.get('/:assessmentId/candidates', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'RECRUITER']), getAssessmentCandidates);
router.post('/evaluate/:assessmentId/:studentId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), evaluateAssessmentCandidate);
router.put('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), updateAssessment);
router.delete('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), deleteAssessment);

// --- Student Routes ---
router.get('/my-assignments', authenticate, authorize(['STUDENT']), getStudentAssessments);
router.post('/session/start/:assessmentId', authenticate, authorize(['STUDENT']), startSession);
router.post('/session/violation/:sessionId', authenticate, authorize(['STUDENT']), logViolation);
router.post('/session/media/:sessionId', authenticate, authorize(['STUDENT']), uploadMedia);
router.post('/session/screenshot/:sessionId', authenticate, authorize(['STUDENT']), uploadScreenshot);
router.post('/session/complete/:sessionId', authenticate, authorize(['STUDENT']), completeAssessment);
router.get('/session/results/:sessionId', authenticate, authorize(['STUDENT']), getStudentSessionResults);

export default router;
