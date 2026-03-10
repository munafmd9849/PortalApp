import express from 'express';
import { getDashboardStats } from '../controllers/adminDashboard.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

// Route: GET /api/admin/dashboard
// Description: Get aggregated dashboard statistics
// Access: Admins and Super Admins
router.get('/', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getDashboardStats);

export default router;
