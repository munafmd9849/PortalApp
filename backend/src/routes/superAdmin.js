/**
 * Super Admin Routes
 * Create/disable admins, stats by center/department/admin
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  listAdmins,
  createAdmin,
  disableAdmin,
  enableAdmin,
  updateAdmin,
  getSuperAdminStats,
  getStatsSummary,
  getAdminPerformance,
} from '../controllers/superAdmin.js';
import {
  getOverview,
  getFunnel,
  getBatchPerformance,
  getSchoolPerformance,
  getCenterPerformance,
  getUnplacedStudents,
  getCompanyPerformance,
  getAdminPerformanceAnalytics
} from '../controllers/analytics.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireRole(['SUPER_ADMIN']));

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.get('/admins', listAdmins);
router.post(
  '/admins',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('displayName').optional().trim(),
  handleValidation,
  createAdmin
);
router.patch('/admins/:userId/disable', disableAdmin);
router.patch('/admins/:userId/enable', enableAdmin);
router.patch('/admins/:userId', updateAdmin);
router.get('/admins/:userId/performance', getAdminPerformance);
router.get('/stats', getSuperAdminStats);
router.get('/stats/summary', getStatsSummary);

// Analytics (Control Tower)
router.get('/analytics/overview', getOverview);
router.get('/analytics/funnel', getFunnel);
router.get('/analytics/batch-performance', getBatchPerformance);
router.get('/analytics/school-performance', getSchoolPerformance);
router.get('/analytics/center-performance', getCenterPerformance);
router.get('/analytics/unplaced-students', getUnplacedStudents);
router.get('/analytics/company-performance', getCompanyPerformance);
router.get('/analytics/admin-performance', getAdminPerformanceAnalytics);

export default router;
