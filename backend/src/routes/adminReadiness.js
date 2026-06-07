import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getSummary, getStudents, getStudentDetail } from '../controllers/adminReadiness.js';

const router = express.Router();

router.get('/summary', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getSummary);
router.get('/students', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getStudents);
router.get('/students/:studentId', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getStudentDetail);

export default router;
