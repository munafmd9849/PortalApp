/**
 * Admin Dashboard Service
 * Handles admin dashboard data fetching and real-time subscriptions
 * Replaces Firebase Firestore operations with API calls
 */

import api from './api.js';

/**
 * Admin Dashboard Service Class
 */
export class AdminDashboardService {
  constructor() {
    this.subscribers = [];
    this.pollingIntervals = new Map(); // Track polling intervals per subscription
    this.cachedData = {
      stats: {
        totalJobsPosted: 0,
        activeRecruiters: 0,
        totalStudents: 0,
        activeStudents: 0,
        blockedStudents: 0,
        pendingStudents: 0,
        rejectedStudents: 0,
        pendingQueries: 0,
        totalApplications: 0,
        placedStudents: 0
      },
      chartData: {
        placementTrend: null,
        recruiterActivity: null,
        queryVolume: [],
        schoolPerformance: {
          SOT: { performance: { labels: [], values: [] }, applications: { labels: [], values: [] } },
          SOM: { performance: { labels: [], values: [] }, applications: { labels: [], values: [] } },
          SOH: { performance: { labels: [], values: [] }, applications: { labels: [], values: [] } },
        }
      }
    };
  }

  /**
   * Fetch dashboard data from API
   * @param {Object} filters - Filter options (campus, school, batch, etc.)
   * @returns {Promise<Object>} Dashboard data with stats and chartData
   */
  async fetchData(filters = {}) {
    try {
      // Production behavior: compute from real API responses only.
      const [jobsRes, applicationsRes, studentsRes, recruitersRes, queriesRes] = await Promise.allSettled([
        api.getJobs({ limit: 1000 }),
        api.getAllApplications({ limit: 1000 }),
        api.getAllStudents({ limit: 1000 }),
        api.getRecruiterDirectory(),
        api.getAdminQueries(),
      ]);

      const jobsPayload = jobsRes.status === 'fulfilled' ? jobsRes.value : null;
      const jobs = Array.isArray(jobsPayload?.jobs) ? jobsPayload.jobs : (Array.isArray(jobsPayload) ? jobsPayload : []);

      const applicationsPayload = applicationsRes.status === 'fulfilled' ? applicationsRes.value : null;
      const applications = Array.isArray(applicationsPayload?.applications)
        ? applicationsPayload.applications
        : (Array.isArray(applicationsPayload) ? applicationsPayload : []);

      const studentsPayload = studentsRes.status === 'fulfilled' ? studentsRes.value : null;
      const students = Array.isArray(studentsPayload?.students)
        ? studentsPayload.students
        : (Array.isArray(studentsPayload) ? studentsPayload : []);

      const recruitersPayload = recruitersRes.status === 'fulfilled' ? recruitersRes.value : null;
      const recruiters = Array.isArray(recruitersPayload) ? recruitersPayload : (Array.isArray(recruitersPayload?.recruiters) ? recruitersPayload.recruiters : []);

      const queriesPayload = queriesRes.status === 'fulfilled' ? queriesRes.value : null;
      const queries = Array.isArray(queriesPayload)
        ? queriesPayload
        : (Array.isArray(queriesPayload?.queries) ? queriesPayload.queries : (Array.isArray(queriesPayload?.data) ? queriesPayload.data : []));

      const totalJobsPosted = jobs.filter(j => j?.isPosted === true || String(j?.status || '').toUpperCase() === 'POSTED').length;
      const totalApplications = applications.length;

      const placedStudentIds = new Set(
        applications
          .filter(a => {
            const s = String(a?.status || a?.finalStatus || a?.interviewStatus || '').toUpperCase();
            return s === 'SELECTED' || s === 'OFFERED' || s === 'ACCEPTED';
          })
          .map(a => a?.studentId)
          .filter(Boolean)
      );

      const pendingQueries = queries.filter(q => {
        const s = String(q?.status || '').toLowerCase();
        return s === 'pending' || s === 'open' || s === 'unresolved';
      }).length;

      // Calculate student statistics based on user status
      const totalStudents = students.length;
      const activeStudents = students.filter(s => {
        const status = String(s?.user?.status || s?.status || 'ACTIVE').toUpperCase();
        return status === 'ACTIVE';
      }).length;
      const blockedStudents = students.filter(s => {
        const status = String(s?.user?.status || s?.status || 'ACTIVE').toUpperCase();
        return status === 'BLOCKED';
      }).length;
      const pendingStudents = students.filter(s => {
        const status = String(s?.user?.status || s?.status || 'ACTIVE').toUpperCase();
        return status === 'PENDING';
      }).length;
      const rejectedStudents = students.filter(s => {
        const status = String(s?.user?.status || s?.status || 'ACTIVE').toUpperCase();
        return status === 'REJECTED';
      }).length;

      const data = {
        stats: {
          totalJobsPosted,
          activeRecruiters: recruiters.length,
          totalStudents,
          activeStudents,
          blockedStudents,
          pendingStudents,
          rejectedStudents,
          pendingQueries,
          totalApplications,
          placedStudents: placedStudentIds.size,
        },
        chartData: {
          placementTrend: null,
          recruiterActivity: null,
          queryVolume: [],
          schoolPerformance: this.cachedData.chartData.schoolPerformance,
        },
      };

      this.cachedData = data;
      return data;
    } catch (error) {
      console.error('AdminDashboardService.fetchData error:', error);
      // Return last cached (defaults to empty stats)
      return this.cachedData;
    }
  }

  /**
   * Calculate placement trend data
   */
  calculatePlacementTrend(applications) {
    const last30Days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = applications.filter(a => {
        const appDate = new Date(a.createdAt || a.appliedAt);
        return appDate.toISOString().split('T')[0] === dateStr && 
               (a.status === 'ACCEPTED' || a.status === 'OFFERED');
      }).length;
      
      last30Days.push({ date: dateStr, count });
    }
    
    return last30Days;
  }

  /**
   * Calculate recruiter activity data
   */
  calculateRecruiterActivity(recruiters, jobs) {
    return recruiters.map(recruiter => {
      const recruiterJobs = jobs.filter(j => j.recruiterId === recruiter.id);
      return {
        name: recruiter.user?.displayName || recruiter.user?.email || 'Unknown',
        jobsPosted: recruiterJobs.length,
        applications: 0 // TODO: Count applications for this recruiter's jobs
      };
    }).sort((a, b) => b.jobsPosted - a.jobsPosted).slice(0, 10);
  }

  /**
   * Calculate application status distribution
   */
  calculateApplicationStatus(applications) {
    const statusCounts = {
      PENDING: 0,
      REVIEWED: 0,
      SHORTLISTED: 0,
      INTERVIEWED: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      OFFERED: 0
    };

    applications.forEach(app => {
      const status = app.status || 'PENDING';
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      } else {
        statusCounts.PENDING++;
      }
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
  }

  /**
   * Subscribe to dashboard data updates
   * @param {Function} callback - Callback function that receives data
   * @param {Object} filters - Filter options for the data
   * @returns {Function} Unsubscribe function
   */
  subscribeToDashboardData(callback, filters = {}) {
    if (typeof callback !== 'function') {
      console.error('AdminDashboardService.subscribeToDashboardData: callback must be a function');
      return () => {}; // Return no-op unsubscribe
    }

    // Store subscription info
    const subscriptionId = Date.now() + Math.random();
    this.subscribers.push({ id: subscriptionId, callback, filters });

    // Initial fetch
    this.fetchData(filters).then(data => {
      callback(data);
    });

    // Set up polling (every 30 seconds)
    // TODO: Replace with Socket.IO subscription for real-time updates
    const intervalId = setInterval(async () => {
      const data = await this.fetchData(filters);
      callback(data);
    }, 30000); // Poll every 30 seconds

    this.pollingIntervals.set(subscriptionId, intervalId);

    // Return unsubscribe function
    return () => {
      // Remove from subscribers
      this.subscribers = this.subscribers.filter(sub => sub.id !== subscriptionId);
      
      // Clear polling interval
      if (this.pollingIntervals.has(subscriptionId)) {
        clearInterval(this.pollingIntervals.get(subscriptionId));
        this.pollingIntervals.delete(subscriptionId);
      }
    };
  }

  /**
   * Legacy subscribe method (for backwards compatibility)
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    return this.subscribeToDashboardData(callback, {});
  }

  /**
   * Cleanup all subscriptions and intervals
   */
  cleanup() {
    // Clear all polling intervals
    this.pollingIntervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();

    // Clear all subscribers
    this.subscribers = [];
  }
}

// Export singleton instance
export const adminDashboardService = new AdminDashboardService();