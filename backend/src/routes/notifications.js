/**
 * Notification Routes
 * Replaces Firebase Firestore notification service calls
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as notificationController from '../controllers/notifications.js';
import { body, validationResult } from 'express-validator';
import { createNotification } from '../controllers/notifications.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', notificationController.getUserNotifications);

// Mark all notifications as read (must come before :notificationId routes)
router.patch('/mark-all-read', notificationController.markAllNotificationsRead);

// Mark notification as read
router.patch('/:notificationId/read', notificationController.markNotificationRead);

// Delete notification
router.delete('/:notificationId', notificationController.deleteNotification);

// Create notification (admin/recruiter only)
router.post('/', [
  requireRole(['ADMIN', 'RECRUITER']),
  body('userId').notEmpty(),
  body('title').notEmpty(),
  body('body').notEmpty(),
  body('sendEmail').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, title, body: bodyText, data, sendEmail = false } = req.body;

    const notification = await createNotification({
      userId,
      title,
      body: bodyText,
      data,
      sendEmail,
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

export default router;
