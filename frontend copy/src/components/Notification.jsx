// components/NotificationModal.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { listNotificationsForUser, markNotificationRead } from '../services/notifications';
import { Bell, Briefcase, CalendarDays, ClipboardList } from "lucide-react";

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
      case 'job':
        return <Briefcase size={18} className="text-[var(--pl-primary)]" />;
      case 'update':
        return <ClipboardList size={18} className="text-[var(--pl-primary)]" />;
      case 'interview':
        return <CalendarDays size={18} className="text-[var(--pl-primary)]" />;
      default:
        return <Bell size={18} className="text-[var(--pl-primary)]" />;
    }
  };

  return (
    <>
      {/* Floating Notification Bell (Bottom Right) */}
      <div className="fixed z-[65] bottom-24 right-4 lg:bottom-[3%] lg:right-[2%]">
        <button
          type="button"
          className='relative size-[3.2rem] bg-[var(--pl-primary)] hover:bg-[var(--pl-link-hover)] text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center'
          onClick={toggleModal}
        >
          {/* Bell Icon */}
          <Bell className="w-6 h-6" />

          {/* Notification Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[var(--pl-danger)] text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Small Popup (Bottom Right) */}
      {isOpen && (
        <div
          className="fixed z-[65] left-4 right-4 bottom-[8.5rem] lg:left-auto lg:right-[2%] lg:bottom-[8%] w-auto lg:w-96 max-h-[60vh] lg:max-h-96 overflow-y-auto bg-[color-mix(in_oklab,var(--pl-surface)_92%,transparent)] backdrop-blur rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.14)] border border-[var(--pl-border)]"
        >
          <div className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-[var(--pl-text)] leading-tight">Notifications</h3>
                <p className="text-sm text-[var(--pl-text-secondary)]">
                  {unreadCount ? `${unreadCount} unread` : "All caught up"}
                </p>
              </div>
              <button
                onClick={toggleModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] text-[var(--pl-text)] hover:bg-black/5"
                aria-label="Close notifications"
                type="button"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] p-6 text-center text-[var(--pl-text-secondary)]">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] p-6 text-center">
                <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] text-[var(--pl-primary)]">
                  <Bell size={20} />
                </div>
                <div className="text-sm font-semibold text-[var(--pl-text)]">No notifications</div>
                <div className="mt-1 text-sm text-[var(--pl-text-secondary)]">
                  When something important happens, it will show up here.
                </div>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-2xl cursor-pointer mb-3 border transition-colors ${
                    notification.isRead
                      ? 'bg-[color-mix(in_oklab,var(--pl-bg)_70%,white)] border-[var(--pl-border)]'
                      : 'bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] border-[color-mix(in_oklab,var(--pl-primary)_22%,white)]'
                  }`}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-surface-strong)]">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${notification.isRead ? 'text-[var(--pl-text)]' : 'text-[var(--pl-primary)]'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-[var(--pl-text-secondary)] mt-1 leading-relaxed">
                        {notification.message || notification.body}
                      </p>
                      <p className="text-xs text-[var(--pl-text-muted)] mt-2">
                        {notification.timestamp || (notification.createdAt ? new Date(notification.createdAt).toLocaleString() : '')}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-[var(--pl-primary)] rounded-full mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationModal;
