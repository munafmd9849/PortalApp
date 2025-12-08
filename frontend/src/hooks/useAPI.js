/**
 * Custom React Hook for API Calls
 * Example usage patterns for migrated API
 * Replaces Firebase service calls in components
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';
import { subscribeToUpdates } from '../services/socket.js';

/**
 * Hook for fetching student profile
 * Replaces: const profile = await getStudentProfile(userId)
 */
export function useStudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentProfile();
      setProfile(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}

/**
 * Hook for fetching targeted jobs (student)
 * Replaces: subscribePostedJobs() or loadJobsData()
 */
export function useTargetedJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getTargetedJobs();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToUpdates({
      onJobPosted: (job) => {
        setJobs(prev => [job, ...prev]);
      },
      onJobUpdated: (job) => {
        setJobs(prev => prev.map(j => j.id === job.id ? job : j));
      },
    });

    return unsubscribe;
  }, [fetchJobs]);

  return { jobs, loading, error, refetch: fetchJobs };
}

/**
 * Hook for student applications with real-time updates
 * Replaces: subscribeStudentApplications()
 */
export function useStudentApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentApplications();
      setApplications(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToUpdates({
      onApplicationCreated: (application) => {
        setApplications(prev => [application, ...prev]);
      },
      onApplicationUpdated: (application) => {
        setApplications(prev => prev.map(a => 
          a.id === application.id ? application : a
        ));
      },
    });

    return unsubscribe;
  }, [fetchApplications]);

  return { applications, loading, error, refetch: fetchApplications };
}

/**
 * Hook for applying to job
 */
export function useApplyToJob() {
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  const applyToJob = useCallback(async (jobId) => {
    try {
      setApplying(true);
      setError(null);
      const application = await api.applyToJob(jobId);
      return application;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setApplying(false);
    }
  }, []);

  return { applyToJob, applying, error };
}

/**
 * Hook for notifications with real-time updates
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications({ limit: 50 });
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const unsubscribe = subscribeToUpdates({
      onNotificationNew: (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      },
    });

    return unsubscribe;
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.markNotificationRead(notificationId);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  return { notifications, loading, unreadCount, markAsRead, refetch: fetchNotifications };
}
