import express from 'express';
import { 
  createMockInterviewDrive, 
  getMockInterviewDrives, 
  assignStudentToSlot, 
  getStudentMockInterviews,
  submitMockFeedback,
  updateSlotStatus,
  getMockInterviewSlot,
  getMockInterviewSlotResults,
  getMockInterviewDriveResults,
  updateMockInterviewSlot,
  updateMockInterviewDrive,
  deleteMockInterviewDrive
} from '../controllers/mockInterview.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Results (assessment-style read APIs)
router.get(
  '/results/slot/:slotId',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN', 'STUDENT']),
  getMockInterviewSlotResults,
);
router.get(
  '/results/drive/:driveId',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  getMockInterviewDriveResults,
);

// Common Routes
router.get('/slot/:slotId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'STUDENT']), getMockInterviewSlot);
router.put('/slot/:slotId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), updateMockInterviewSlot);

// Admin Routes
router.post('/create', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), createMockInterviewDrive);
router.get('/all', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), getMockInterviewDrives);
router.post('/assign', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), assignStudentToSlot);
router.post('/update-status', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), updateSlotStatus);
router.post('/feedback', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), submitMockFeedback);
router.put('/drives/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), updateMockInterviewDrive);
router.delete('/drives/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), deleteMockInterviewDrive);

// Student Routes
router.get('/my-sessions', authenticate, authorize(['STUDENT']), getStudentMockInterviews);

export default router;
