/**
 * Notifications Controller
 * Replaces Firebase Firestore notification service calls
 */

import prisma from '../config/database.js';
import { getIO } from '../config/socket.js';
import { sendGenericNotification } from '../services/emailService.js';
import logger from '../config/logger.js';

/**
 * Create notification
 * Replaces: createNotification()
 * Optionally sends email notification for admin/system notifications
 */
export async function createNotification({ userId, title, body, data = {}, sendEmail = false }) {
  // Convert data object to JSON string for storage
  const dataString = typeof data === 'string' ? data : JSON.stringify(data || {});
  
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      data: dataString,
      isRead: false,
    },
  });

  // Get user email if email notification is requested
  if (sendEmail) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email) {
        await sendGenericNotification(user.email, title, body);
        logger.info(`Email notification sent to ${user.email} for notification ${notification.id}`);
      }
    } catch (emailError) {
      // Don't fail notification creation if email fails - log and continue
      logger.error(`Failed to send email notification for notification ${notification.id}:`, emailError);
    }
  }

  // Emit real-time update via Socket.IO
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notification);
  }

  return notification;
}

/**
 * Get user notifications
 */
export async function getUserNotifications(req, res) {
  try {
    const userId = req.userId;
    const { isRead, limit = 1000 } = req.query; // Increased default limit to show all past notifications

    console.log(`[Notifications Controller] Fetching notifications for user ${userId}, limit: ${limit}, isRead: ${isRead}`);

    const where = { userId };
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    // Parse limit and set a maximum cap to prevent performance issues
    const parsedLimit = Math.min(parseInt(limit) || 1000, 1000);

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parsedLimit,
    });

    console.log(`[Notifications Controller] Found ${notifications.length} notifications for user ${userId}`);
    
    // Log notification types for debugging
    if (notifications.length > 0) {
      const types = notifications.map(n => {
        try {
          const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
          return data?.type || 'unknown';
        } catch {
          return 'parse_error';
        }
      });
      console.log(`[Notifications Controller] Notification types:`, types);
    }

    res.json(notifications);
  } catch (error) {
    console.error('[Notifications Controller] Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(req, res) {
  try {
    const { notificationId } = req.params;

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json(notification);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsRead(req, res) {
  try {
    const userId = req.userId;

    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      updated: result.count,
      message: `Marked ${result.count} notifications as read`,
    });
  } catch (error) {
    logger.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(req, res) {
  try {
    const { notificationId } = req.params;
    const userId = req.userId;

    // Verify the notification belongs to the user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this notification' });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
}
