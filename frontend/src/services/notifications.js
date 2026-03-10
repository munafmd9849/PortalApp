/**
 * Notifications Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

/**
 * Transform backend notification to frontend format
 */
function transformNotification(notification) {
  // Parse data field (stored as JSON string in database)
  let parsedData = {};
  try {
    parsedData = typeof notification.data === 'string' 
      ? JSON.parse(notification.data) 
      : (notification.data || {});
  } catch (e) {
    console.warn('[Notifications Service] Failed to parse notification data:', e, 'Raw data:', notification.data);
    parsedData = {};
  }
  
  // Debug log for notification transformation
  if (process.env.NODE_ENV === 'development') {
    console.log('[Notifications Service] Transforming notification:', {
      id: notification.id,
      title: notification.title,
      rawType: notification.type,
      parsedDataType: parsedData.type,
      finalType: parsedData.type || notification.type || 'general'
    });
  }

  // Format date and time from createdAt
  const createdAt = notification.createdAt 
    ? new Date(notification.createdAt) 
    : new Date();
  const date = createdAt.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  const time = createdAt.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Extract query-specific data
  const queryData = parsedData.queryId ? {
    queryId: parsedData.queryId,
    referenceId: parsedData.referenceId,
    queryType: parsedData.queryType,
    studentId: parsedData.studentId,
    studentName: parsedData.studentName,
    enrollmentId: parsedData.enrollmentId,
    center: parsedData.center,
    school: parsedData.school,
    batch: parsedData.batch,
    message: parsedData.message,
  } : {};

  return {
    ...notification,
    message: notification.body || notification.message || '',
    from: parsedData.studentName || parsedData.from || notification.from || 'System',
    date,
    time,
    type: parsedData.type || notification.type || 'general',
    priority: parsedData.priority || notification.priority || 'medium',
    meta: {
      ...parsedData,
      ...queryData,
    },
    enrollmentId: parsedData.enrollmentId || notification.enrollmentId || null,
  };
}

/**
 * List notifications for user
 * For admins, fetch all notifications (no limit)
 * For other users, use default limit of 50
 */
export async function listNotificationsForUser(userId, limitTo = null) {
  try {
    // For admins, fetch all notifications (use a high limit like 1000)
    // For other users, use default limit of 50
    const limit = limitTo || 1000; // Increased limit to show all past notifications
    console.log('[Notifications Service] Fetching notifications, limit:', limit);
    const notifications = await api.getNotifications({ limit });
    console.log('[Notifications Service] Raw notifications from API:', notifications?.length || 0);
    
    if (!notifications || !Array.isArray(notifications)) {
      console.warn('[Notifications Service] Invalid notifications response:', notifications);
      return [];
    }
    
    // Transform each notification to match frontend expectations
    const transformed = notifications.map(transformNotification);
    console.log('[Notifications Service] Transformed notifications:', transformed.length);
    console.log('[Notifications Service] Notification types:', transformed.map(n => n.type));
    
    return transformed;
  } catch (error) {
    console.error('[Notifications Service] Error fetching notifications:', error);
    throw error;
  }
}

/**
 * Create notification (admin/recruiter only)
 */
export async function createNotification({ userId, title, body, data = {}, sendEmail = false }) {
  try {
    // Backend endpoint: POST /api/notifications
    const token = localStorage.getItem('accessToken');
    
    return await api.post('/notifications', { userId, title, body, data, sendEmail });
  } catch (error) {
    console.error('createNotification error:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId) {
  try {
    await api.markNotificationRead(notificationId);
    return { success: true };
  } catch (error) {
    console.error('markNotificationRead error:', error);
    throw error;
  }
}

/**
 * Mark notification as read (alias for compatibility)
 */
export const markNotificationAsRead = markNotificationRead;

/**
 * Subscribe to notifications with Socket.IO real-time updates
 * Falls back to polling if Socket.IO is not available
 */
export function subscribeToNotifications(callback, options = {}) {
  let pollInterval = null;
  let socketUnsubscribe = null;
  const { limit = 1000 } = options; // Increased limit to show all past notifications

  // Initial load
  (async () => {
    try {
      const notifications = await listNotificationsForUser(null, limit);
      callback(notifications);
    } catch (error) {
      console.error('subscribeToNotifications error:', error);
      callback([]);
    }
  })();

  // Try to use Socket.IO for real-time updates
  try {
    import('./socket.js').then((socketService) => {
      // Initialize socket if not already connected
      socketService.initSocket();
      
      // Subscribe to notification updates
      socketUnsubscribe = socketService.subscribeToUpdates({
        onNotificationNew: async () => {
          // Reload notifications when new one arrives
          try {
            const notifications = await listNotificationsForUser(null, limit);
            callback(notifications);
          } catch (error) {
            console.error('Error reloading notifications:', error);
          }
        },
      });
    }).catch(() => {
      // Socket service not available, use polling
      console.warn('Socket.IO service not available, using polling');
      pollInterval = setInterval(async () => {
        try {
          const notifications = await listNotificationsForUser(null, limit);
          callback(notifications);
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 30000); // Poll every 30 seconds
    });
  } catch (error) {
    console.warn('Socket.IO setup failed, using polling:', error);
    // Fallback to polling
    pollInterval = setInterval(async () => {
      try {
        const notifications = await listNotificationsForUser(null, limit);
        callback(notifications);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 30000);
  }

  // Return unsubscribe function
  return () => {
    if (socketUnsubscribe) {
      socketUnsubscribe();
      socketUnsubscribe = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId) {
  try {
    const token = localStorage.getItem('accessToken');
    
    return await api.delete(`/notifications/${notificationId}`);
  } catch (error) {
    console.error('deleteNotification error:', error);
    throw error;
  }
}
