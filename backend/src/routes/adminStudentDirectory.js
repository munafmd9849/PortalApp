import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getDirectory, exportDirectory } from '../controllers/adminStudentDirectory.js';

const router = express.Router();

router.get('/', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getDirectory);
router.get('/export', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), exportDirectory);

export default router;
