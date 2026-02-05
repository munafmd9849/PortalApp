/**
 * Announcements Routes
 * Admin creates announcements; students get email (GenZ / Retro styled)
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { uploadAnnouncementImage } from '../middleware/upload.js';
import * as announcementsController from '../controllers/announcements.js';

const router = express.Router();

router.get('/', authenticate, requireRole(['ADMIN']), announcementsController.listAnnouncements);
router.post(
  '/',
  authenticate,
  requireRole(['ADMIN']),
  uploadAnnouncementImage,
  announcementsController.createAnnouncement
);

export default router;
