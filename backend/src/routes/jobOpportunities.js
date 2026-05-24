import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getOverview,
  getBreakdown,
  getCrManagers,
  getMom,
  getFilters,
} from '../controllers/jobOpportunities.js';

const router = express.Router();

router.get('/overview', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getOverview);
router.get('/breakdown/:cardKey', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getBreakdown);
router.get('/cr-managers', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getCrManagers);
router.get('/mom-table', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getMom);
router.get('/filter-options', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getFilters);

export default router;
