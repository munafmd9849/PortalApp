import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getDirectory,
  exportDirectory,
  getStudentPanelData,
} from '../controllers/adminStudentDirectory.js';

const router = express.Router();

router.get('/', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getDirectory);
router.get('/export', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), exportDirectory);
router.get(
  '/:studentId/panel',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  getStudentPanelData,
);

export default router;
