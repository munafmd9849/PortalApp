import express from 'express';
import {
  createAiMockInterview,
  updateAiMockInterview,
  deleteAiMockInterview,
  listAiMockInterviews,
  getAiMockInterview,
  getAiInterviewReviewDashboard,
  getEnrollmentReviewDetail,
  saveEnrollmentReview,
  getStudentAiInterviews,
  getStudentAiInterviewSession,
  startAiInterviewSession,
  updateAiInterviewProgress,
  submitAiInterviewAnswer,
  completeAiInterview,
  logAiInterviewViolation,
  uploadAiInterviewScreenshot,
  regenerateAiInsights,
  getStudentAiInterviewResults,
} from '../controllers/aiMockInterview.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Student (before /:id)
router.get('/student/my-interviews', authenticate, authorize(['STUDENT']), getStudentAiInterviews);
router.get('/student/session/:id', authenticate, authorize(['STUDENT']), getStudentAiInterviewSession);
router.get('/student/results/:enrollmentId', authenticate, authorize(['STUDENT']), getStudentAiInterviewResults);

// Enrollment actions
router.get('/enrollment/:enrollmentId/detail', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'STUDENT']), getEnrollmentReviewDetail);
router.post('/enrollment/:enrollmentId/review', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), saveEnrollmentReview);
router.post('/enrollment/:enrollmentId/regenerate-ai', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), regenerateAiInsights);
router.post('/enrollment/:enrollmentId/start', authenticate, authorize(['STUDENT']), startAiInterviewSession);
router.patch('/enrollment/:enrollmentId/progress', authenticate, authorize(['STUDENT']), updateAiInterviewProgress);
router.post('/enrollment/:enrollmentId/answer', authenticate, authorize(['STUDENT']), submitAiInterviewAnswer);
router.post('/enrollment/:enrollmentId/complete', authenticate, authorize(['STUDENT']), completeAiInterview);
router.post('/enrollment/:enrollmentId/violation', authenticate, authorize(['STUDENT']), logAiInterviewViolation);
router.post('/enrollment/:enrollmentId/screenshot', authenticate, authorize(['STUDENT']), uploadAiInterviewScreenshot);

// Admin CRUD
router.post('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), createAiMockInterview);
router.get('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), listAiMockInterviews);
router.get('/:id/review', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getAiInterviewReviewDashboard);
router.get('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'STUDENT']), getAiMockInterview);
router.put('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), updateAiMockInterview);
router.delete('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), deleteAiMockInterview);

export default router;
