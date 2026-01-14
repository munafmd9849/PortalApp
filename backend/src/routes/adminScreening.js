/**
 * Admin Screening Routes
 * Admin-only routes for managing screening
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { manualTriggerScreeningEmails } from '../services/screeningEmailService.js';

const router = express.Router();

// Manually trigger screening emails (admin only)
// POST /api/admin/screening/send-emails
router.post('/screening/send-emails', authenticate, requireRole(['ADMIN']), manualTriggerScreeningEmails);

export default router;
