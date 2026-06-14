import express from 'express';
import {
  createConversationalInterview,
  listConversationalInterviews,
  deleteConversationalInterview,
  getStudentConversationalInterviews,
  getStudentConversationalSession,
  startConversationalSession,
  submitConversationalAnswer,
  completeConversationalInterview,
  logConversationalViolation,
  uploadConversationalScreenshot,
} from '../controllers/aiConversationalInterview.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/student/my-interviews', authenticate, authorize(['STUDENT']), getStudentConversationalInterviews);
router.get('/student/session/:id', authenticate, authorize(['STUDENT']), getStudentConversationalSession);

router.post('/enrollment/:enrollmentId/start', authenticate, authorize(['STUDENT']), startConversationalSession);
router.post('/enrollment/:enrollmentId/answer', authenticate, authorize(['STUDENT']), submitConversationalAnswer);
router.post('/enrollment/:enrollmentId/complete', authenticate, authorize(['STUDENT']), completeConversationalInterview);
router.post('/enrollment/:enrollmentId/violation', authenticate, authorize(['STUDENT']), logConversationalViolation);
router.post('/enrollment/:enrollmentId/screenshot', authenticate, authorize(['STUDENT']), uploadConversationalScreenshot);

router.post('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), createConversationalInterview);
router.get('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), listConversationalInterviews);
router.delete('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), deleteConversationalInterview);

export default router;
