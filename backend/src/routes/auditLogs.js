/**
 * Audit Log Routes
 * Restricted to SUPER_ADMIN.
 */

import express from 'express';
import { getAuditLogs } from '../controllers/auditLogs.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

// All audit log routes require authentication and SUPER_ADMIN role
router.use(authenticate);
router.use(requireRole(['SUPER_ADMIN']));

/**
 * GET /api/admin/audit-logs
 * Fetch audit logs with filters
 */
router.get('/', getAuditLogs);

export default router;
