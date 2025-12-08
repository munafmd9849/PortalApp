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
        activeStudents: 0,
        pendingQueries: 0,
        totalApplications: 0,
        placedStudents: 0
      },
      chartData: {
        placementTrend: [],
        recruiterActivity: [],
        applicationStatus: []
      }
    };
  }

  /**
   * Generate mock dashboard data
   */
  generateMockData(filters = {}) {
    // Apply filter-based scaling
    const filterScale = this.getFilterScale(filters);
    
    // Generate realistic stats with filter-based variance
    const baseStats = {
      totalJobsPosted: 215,
      activeRecruiters: 64,
      activeStudents: 1620,
      pendingQueries: 37,
      totalApplications: 8421,
      placedStudents: 1184
    };

    const stats = {
      totalJobsPosted: Math.round(baseStats.totalJobsPosted * filterScale),
      activeRecruiters: Math.round(baseStats.activeRecruiters * filterScale),
      activeStudents: Math.round(baseStats.activeStudents * filterScale),
      pendingQueries: Math.round(baseStats.pendingQueries * filterScale),
      totalApplications: Math.round(baseStats.totalApplications * filterScale),
      placedStudents: Math.round(baseStats.placedStudents * filterScale)
    };

    // Generate placement trend (last 6 months) with filter scaling
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const basePlacements = [142, 168, 195, 203, 189, 287];
    const baseApplications = [892, 1056, 1234, 1345, 1289, 1605];
    
    const placementTrend = {
      labels: months,
      datasets: [
        {
          label: 'Placements',
          data: basePlacements.map(v => Math.round(v * filterScale)),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Applications',
          data: baseApplications.map(v => Math.round(v * filterScale)),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };

    // Generate query volume pie chart data with filter scaling
    const baseQueryVolume = [
      { title: 'CGPA Requests', value: 12, color: '#3b82f6' },
      { title: 'Question Requests', value: 15, color: '#8b5cf6' },
      { title: 'Calendar Requests', value: 8, color: '#10b981' },
      { title: 'Other', value: 2, color: '#f59e0b' }
    ];
    
    const queryVolume = baseQueryVolume.map(q => ({
      ...q,
      value: Math.max(1, Math.round(q.value * filterScale))
    }));

    // Generate recruiter activity bar chart with filter scaling
    const baseRecruiterData = [28, 24, 19, 15, 12, 10];
    const recruiterActivity = {
      labels: ['TCS', 'Infosys', 'Accenture', 'Amazon', 'Microsoft', 'Wipro'],
      datasets: [
        {
          label: 'Jobs Posted',
          data: baseRecruiterData.map(v => Math.max(1, Math.round(v * filterScale))),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }
      ]
    };

    // Generate school performance data (for radar chart)
    const schoolPerformance = {
      SOT: {
        performance: {
          labels: ['Placement Rate', 'Avg CGPA', 'Interview Success', 'Application Quality', 'Response Time'],
          values: [85, 78, 82, 88, 75]
        },
        applications: {
          labels: ['Placement Rate', 'Avg CGPA', 'Interview Success', 'Application Quality', 'Response Time'],
          values: [3200, 850, 520, 95, 80]
        }
      },
      SOM: {
        performance: {
          labels: ['Placement Rate', 'Avg CGPA', 'Interview Success', 'Application Quality', 'Response Time'],
          values: [78, 75, 79, 85, 72]
        },
        applications: {
          labels: ['Placement Rate', 'Avg CGPA', 'Interview Success', 'Application Quality', 'Response Time'],
          values: [2850, 720, 450, 88, 75]
        }
      },
      SOH: {
        performance: {
          labels: ['Placement Rate', 'Avg CGPA', 'Interview Success', 'Application Quality', 'Response Time'],
          values: [72, 73, 76, 82, 70]
        },
        applications: {
          labels: ['Placement Rate', 'Avg CGPA', 'Interview Success', 'Application Quality', 'Response Time'],
          values: [2371, 680, 380, 82, 70]
        }
      }
    };

    return {
      stats,
      chartData: {
        placementTrend,
        queryVolume,
        recruiterActivity,
        schoolPerformance
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
      // Build query params from filters
      const params = new URLSearchParams();
      if (filters.campus && filters.campus.length > 0) {
        params.append('campus', filters.campus.join(','));
      }
      if (filters.school && filters.school.length > 0) {
        params.append('school', filters.school.join(','));
      }
      if (filters.batch && filters.batch.length > 0) {
        params.append('batch', filters.batch.join(','));
      }

      const queryString = params.toString();
      const endpoint = queryString 
        ? `/admin/dashboard?${queryString}`
        : '/admin/dashboard';

      // Try to fetch real data first
      let jobs = [];
      let students = [];
      let recruiters = [];
      let applications = [];
      let hasRealData = false;

      try {
        const jobsResponse = await api.getJobs({ limit: 1000 });
        jobs = jobsResponse.jobs || jobsResponse || [];
        if (jobs.length > 0) hasRealData = true;
      } catch (error) {
        console.warn('Failed to fetch jobs, using mock data:', error);
      }

      // Fetch applications (admin endpoint)
      try {
        const applicationsResponse = await api.getAllApplications();
        applications = Array.isArray(applicationsResponse.applications) 
          ? applicationsResponse.applications 
          : (applicationsResponse?.applications || []);
        if (applications.length > 0) hasRealData = true;
      } catch (error) {
        console.warn('Failed to fetch applications, using mock data:', error);
      }

      // Use mock data for now since real data calculations are incomplete
      // TODO: When all endpoints are ready, use real data when available
      // For now, always use mock data to ensure charts display properly
      const mockData = this.generateMockData(filters);
      this.cachedData = mockData;
      return mockData;
      
      // Future implementation: Use real data when all endpoints are ready
      /*
      if (hasRealData && (jobs.length > 0 || applications.length > 0)) {
        // Calculate stats from available data
        const stats = {
          totalJobsPosted: jobs.length || 0,
          activeRecruiters: 0, // TODO: Fetch recruiters data
          activeStudents: 0, // TODO: Fetch students data
          pendingQueries: 0, // TODO: Add queries endpoint
          totalApplications: applications.length || 0,
          placedStudents: applications.filter(a => a.status === 'ACCEPTED' || a.status === 'OFFERED').length || 0
        };

        // Calculate chart data
        const chartData = {
          placementTrend: this.calculatePlacementTrend(applications),
          recruiterActivity: this.calculateRecruiterActivity([], jobs),
          applicationStatus: this.calculateApplicationStatus(applications),
          queryVolume: [], // TODO: Add query volume calculation
          schoolPerformance: {} // TODO: Add school performance calculation
        };

        const data = { stats, chartData };
        this.cachedData = data;
        return data;
      } else {
        // Use mock data
        const mockData = this.generateMockData(filters);
        this.cachedData = mockData;
        return mockData;
      }
      */
    } catch (error) {
      console.error('AdminDashboardService.fetchData error:', error);
      // Return mock data on error
      const mockData = this.generateMockData(filters);
      this.cachedData = mockData;
      return mockData;
    }
  }

  /**
   * Get scale factor based on filters
   */
  getFilterScale(filters = {}) {
    let scale = 1.0;
    
    // If filters are applied, scale down data proportionally
    if (filters.center && filters.center.length > 0) {
      scale *= Math.min(1.0, filters.center.length / 6); // 6 total centers
    }
    if (filters.school && filters.school.length > 0) {
      scale *= Math.min(1.0, filters.school.length / 3); // 3 total schools
    }
    if (filters.quarter && filters.quarter.length > 0) {
      scale *= Math.min(1.0, filters.quarter.length / 4); // 4 quarters
    }
    
    // Ensure minimum scale
    return Math.max(0.3, scale);
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