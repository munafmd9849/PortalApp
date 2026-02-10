// components/NotificationModal.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
// import api from '../services/api'; // Unused import removed
import { listNotificationsForUser, markNotificationRead } from '../services/notifications';

const NotificationModal = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load notifications from backend API
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const notificationsData = await listNotificationsForUser(user.id, 20);
        if (isMounted) {
          setNotifications(notificationsData || []);
          setUnreadCount((notificationsData || []).filter(n => !n.isRead).length);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
        if (isMounted) {
          setNotifications([]);
          setUnreadCount(0);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadNotifications();

    // Refresh when modal opens
    if (isOpen) {
      loadNotifications();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id, isOpen]);

  const toggleModal = () => {
    setIsOpen(!isOpen);
  };

  const markAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'job': return '💼';
      case 'update': return '📋';
      case 'interview': return '📅';
      default: return '🔔';
    }
  };

  return null;
};

export default NotificationModal;
