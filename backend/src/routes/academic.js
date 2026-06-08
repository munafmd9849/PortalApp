import express from 'express';
import { 
  getSchools, createSchool, updateSchool, deleteSchool,
  getCenters, createCenter, updateCenter, deleteCenter,
  getBatches, createBatch, updateBatch, deleteBatch 
} from '../controllers/academic.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Academic Structure Routes
 * Public GET routes for registration/filters
 * Protected POST/PATCH/DELETE routes for Super Admin management
 */

// Public routes (Used by Students for registration and Admins for filters)
router.get('/schools', getSchools);
router.get('/centers', getCenters);
router.get('/batches', getBatches);

// Protected routes (Super Admin management)
router.use(authenticate);

// We allow standard ADMINs to GET if they hit the protected routes, 
// but only SUPER_ADMIN can modify
router.post('/schools', authorize('SUPER_ADMIN'), createSchool);
router.patch('/schools/:id', authorize('SUPER_ADMIN'), updateSchool);
router.delete('/schools/:id', authorize('SUPER_ADMIN'), deleteSchool);

router.post('/centers', authorize('SUPER_ADMIN'), createCenter);
router.patch('/centers/:id', authorize('SUPER_ADMIN'), updateCenter);
router.delete('/centers/:id', authorize('SUPER_ADMIN'), deleteCenter);

router.post('/batches', authorize('SUPER_ADMIN'), createBatch);
router.patch('/batches/:id', authorize('SUPER_ADMIN'), updateBatch);
router.delete('/batches/:id', authorize('SUPER_ADMIN'), deleteBatch);

export default router;
