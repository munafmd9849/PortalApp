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
      console.log('📊 [AdminDashboard] Fetching dashboard data...');
      
      // Production behavior: compute from real API responses only.
      const [jobsRes, applicationsRes, studentsRes, recruitersRes, queriesRes] = await Promise.allSettled([
        api.getJobs({ limit: 1000 }),
        api.getAllApplications({ limit: 1000 }),
        api.getAllStudents({ limit: 1000 }),
        api.getRecruiterDirectory(),
        api.getAdminQueries(),
      ]);

      // Log any failed requests
      if (jobsRes.status === 'rejected') {
        console.error('❌ [AdminDashboard] Failed to fetch jobs:', jobsRes.reason);
      }
      if (applicationsRes.status === 'rejected') {
        console.error('❌ [AdminDashboard] Failed to fetch applications:', applicationsRes.reason);
      }
      if (studentsRes.status === 'rejected') {
        console.error('❌ [AdminDashboard] Failed to fetch students:', studentsRes.reason);
      }
      if (recruitersRes.status === 'rejected') {
        console.error('❌ [AdminDashboard] Failed to fetch recruiters:', recruitersRes.reason);
      }
      if (queriesRes.status === 'rejected') {
        console.error('❌ [AdminDashboard] Failed to fetch queries:', queriesRes.reason);
      }

      const jobsPayload = jobsRes.status === 'fulfilled' ? jobsRes.value : null;
      let jobs = Array.isArray(jobsPayload?.jobs) ? jobsPayload.jobs : (Array.isArray(jobsPayload) ? jobsPayload : []);

      const applicationsPayload = applicationsRes.status === 'fulfilled' ? applicationsRes.value : null;
      let applications = Array.isArray(applicationsPayload?.applications)
        ? applicationsPayload.applications
        : (Array.isArray(applicationsPayload) ? applicationsPayload : []);

      const studentsPayload = studentsRes.status === 'fulfilled' ? studentsRes.value : null;
      let students = Array.isArray(studentsPayload?.students)
        ? studentsPayload.students
        : (Array.isArray(studentsPayload) ? studentsPayload : []);

      const recruitersPayload = recruitersRes.status === 'fulfilled' ? recruitersRes.value : null;
      const recruiters = Array.isArray(recruitersPayload) ? recruitersPayload : (Array.isArray(recruitersPayload?.recruiters) ? recruitersPayload.recruiters : []);

      const queriesPayload = queriesRes.status === 'fulfilled' ? queriesRes.value : null;
      let queries = Array.isArray(queriesPayload)
        ? queriesPayload
        : (Array.isArray(queriesPayload?.queries) ? queriesPayload.queries : (Array.isArray(queriesPayload?.data) ? queriesPayload.data : []));

      // Apply filters if provided
      if (filters && (filters.center?.length > 0 || filters.school?.length > 0 || filters.quarter?.length > 0 || filters.batch?.length > 0)) {
        console.log('🔍 [AdminDashboard] Applying filters:', filters);
        
        // Filter students by campus (center), school, and batch
        const originalStudentCount = students.length;
        students = students.filter(s => {
          const studentCenter = String(s?.center || '').toUpperCase();
          const studentSchool = String(s?.school || '').toUpperCase();
          const studentBatch = String(s?.batch || '').toUpperCase();
          
          // Center (campus) filter
          const centerMatch = !filters.center?.length || filters.center.some(c => {
            const filterCenter = String(c).toUpperCase();
            return filterCenter === studentCenter || studentCenter.includes(filterCenter) || filterCenter.includes(studentCenter);
          });
          
          // School filter
          const schoolMatch = !filters.school?.length || filters.school.some(sch => {
            const filterSchool = String(sch).toUpperCase();
            return filterSchool === studentSchool || studentSchool.includes(filterSchool) || filterSchool.includes(studentSchool);
          });
          
          // Batch filter (maps from quarter back to batch format, or use direct batch filter)
          let batchMatch = true;
          if (filters.quarter?.length > 0) {
            // Map quarter back to batch format
            // Q1 (Pre-Placement) -> 25-29, Q2 (Placement Drive) -> 24-28, Q3 (Internship) -> 23-27
            const quarterToBatch = {
              'Q1 (PRE-PLACEMENT)': '25-29',
              'Q2 (PLACEMENT DRIVE)': '24-28',
              'Q3 (INTERNSHIP)': '23-27',
              'Q4 (FINAL PLACEMENTS)': '26-30'
            };
            const batchFromQuarter = filters.quarter.map(q => quarterToBatch[String(q).toUpperCase()] || q);
            batchMatch = batchFromQuarter.some(b => {
              const filterBatch = String(b).toUpperCase();
              return filterBatch === studentBatch || studentBatch.includes(filterBatch) || filterBatch.includes(studentBatch);
            });
          } else if (filters.batch?.length > 0) {
            batchMatch = filters.batch.some(b => {
              const filterBatch = String(b).toUpperCase();
              return filterBatch === studentBatch || studentBatch.includes(filterBatch) || filterBatch.includes(studentBatch);
            });
          }
          
          return centerMatch && schoolMatch && batchMatch;
        });
        
        console.log(`🔍 [AdminDashboard] Students filtered: ${originalStudentCount} -> ${students.length}`);

        // Filter applications to only include those from filtered students
        const originalApplicationCount = applications.length;
        if (students.length > 0) {
          const filteredStudentIds = new Set(students.map(s => s.id));
          applications = applications.filter(a => filteredStudentIds.has(a?.studentId));
        } else {
          // If no students match filter, no applications should match
          applications = [];
        }
        console.log(`🔍 [AdminDashboard] Applications filtered: ${originalApplicationCount} -> ${applications.length}`);

        // Filter queries to only include those from filtered students
        const originalQueryCount = queries.length;
        if (students.length > 0 && queries.length > 0) {
          const filteredStudentIds = new Set(students.map(s => s.id));
          const filteredUserIds = new Set(students.map(s => s.userId));
          
          queries = queries.filter(q => {
            const queryUserId = q?.userId || q?.studentId || q?.student?.userId || q?.student?.id;
            return filteredStudentIds.has(queryUserId) || filteredUserIds.has(queryUserId);
          });
        } else if (students.length === 0) {
          queries = [];
        }
        console.log(`🔍 [AdminDashboard] Queries filtered: ${originalQueryCount} -> ${queries.length}`);

        // Jobs are not filtered by student attributes (they're posted by recruiters)
        // But we keep them as-is for now
      }

      console.log('📊 [AdminDashboard] Data received (after filtering):', {
        jobs: jobs.length,
        applications: applications.length,
        students: students.length,
        recruiters: recruiters.length,
        queries: queries.length,
        filters: filters,
      });

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

      // Count active recruiters (ACTIVE or PENDING status - PENDING should be treated as active for recruiters)
      const activeRecruiters = recruiters.filter(r => {
        const status = String(r?.status || '').toUpperCase();
        return status === 'ACTIVE' || status === 'PENDING' || !status; // PENDING treated as active
      }).length;

      // Count active students (ACTIVE status only, not PENDING/REJECTED)
      const activeStudents = students.filter(s => {
        const status = String(s?.user?.status || s?.status || '').toUpperCase();
        return status === 'ACTIVE';
      }).length;

      // Calculate chart data (always return valid structures even if empty)
      const placementTrendData = this.calculatePlacementTrendForChart(applications);
      const recruiterActivityData = this.calculateRecruiterActivityForChart(recruiters, jobs, applications);
      const queryVolumeData = this.calculateQueryVolumeForChart(queries);
      const schoolPerformanceData = this.calculateSchoolPerformance(students, applications);

      console.log('📊 [AdminDashboard] Chart data calculated:', {
        placementTrend: placementTrendData ? `${placementTrendData.labels?.length || 0} months` : 'null',
        recruiterActivity: recruiterActivityData ? `${recruiterActivityData.labels?.length || 0} recruiters` : 'null',
        queryVolume: queryVolumeData.length,
        schoolPerformance: Object.keys(schoolPerformanceData).length + ' schools',
      });

      const data = {
        stats: {
          totalJobsPosted,
          activeRecruiters,
          activeStudents,
          pendingQueries,
          totalApplications,
          placedStudents: placedStudentIds.size,
        },
        chartData: {
          placementTrend: placementTrendData,
          recruiterActivity: recruiterActivityData,
          queryVolume: queryVolumeData,
          schoolPerformance: schoolPerformanceData,
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
   * Calculate placement trend data for Chart.js Line chart (last 6 months)
   */
  calculatePlacementTrendForChart(applications) {
    if (!applications || applications.length === 0) {
      // Return valid empty structure
      const last6Months = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        last6Months.push({ month: monthLabel, placements: 0 });
      }
      return {
        labels: last6Months.map(d => d.month),
        datasets: [
          {
            label: 'Placements',
            data: last6Months.map(d => d.placements),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      };
    }

    const last6Months = [];
    const today = new Date();
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Count placements in this month
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      const count = applications.filter(a => {
        try {
          const appDateStr = a.createdAt || a.appliedAt || a.appliedDate;
          if (!appDateStr) return false;
          const appDate = new Date(appDateStr);
          if (isNaN(appDate.getTime())) return false;
          
          const status = String(a?.status || a?.interviewStatus || '').toUpperCase();
          return appDate >= monthStart && appDate <= monthEnd && 
                 (status === 'SELECTED' || status === 'ACCEPTED' || status === 'OFFERED');
        } catch (e) {
          return false;
        }
      }).length;
      
      last6Months.push({ month: monthLabel, placements: count });
    }
    
    // Format for Chart.js Line chart
    return {
      labels: last6Months.map(d => d.month),
      datasets: [
        {
          label: 'Placements',
          data: last6Months.map(d => d.placements),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }

  /**
   * Calculate recruiter activity data for Chart.js Bar chart
   */
  calculateRecruiterActivityForChart(recruiters, jobs, applications) {
    if (!recruiters || recruiters.length === 0) {
      return null; // UI will show "No recruiter data"
    }

    const recruiterData = recruiters.map(recruiter => {
      const recruiterJobs = jobs.filter(j => j?.recruiterId === recruiter?.id);
      const recruiterJobIds = new Set(recruiterJobs.map(j => j.id));
      const recruiterApplications = applications.filter(a => recruiterJobIds.has(a?.jobId)).length;
      
      return {
        name: recruiter.user?.displayName || recruiter.user?.email || recruiter.companyName || 'Unknown',
        jobsPosted: recruiterJobs.length,
        applications: recruiterApplications
      };
    }).filter(r => r.jobsPosted > 0) // Only show recruiters who posted jobs
      .sort((a, b) => b.jobsPosted - a.jobsPosted)
      .slice(0, 10);
    
    // Format for Chart.js Bar chart
    if (recruiterData.length === 0) {
      return null; // UI will show "No recruiter data"
    }
    
    return {
      labels: recruiterData.map(r => {
        const name = r.name || 'Unknown';
        return name.length > 15 ? name.substring(0, 15) + '...' : name;
      }),
      datasets: [
        {
          label: 'Jobs Posted',
          data: recruiterData.map(r => r.jobsPosted),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
        },
      ],
    };
  }
  
  /**
   * Calculate query volume data for Pie chart
   */
  calculateQueryVolumeForChart(queries) {
    if (!queries || queries.length === 0) {
      return []; // UI will show "No query data"
    }
    
    // Group queries by type/category
    const queryTypes = {};
    queries.forEach(query => {
      const type = (query.type || query.category || query.subject || 'Other').toLowerCase();
      queryTypes[type] = (queryTypes[type] || 0) + 1;
    });
    
    // Format for react-minimal-pie-chart
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    let colorIndex = 0;
    
    const pieData = Object.entries(queryTypes)
      .filter(([type, count]) => count > 0) // Only include types with queries
      .map(([type, count]) => ({
        title: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize first letter
        value: count,
        color: colors[colorIndex++ % colors.length],
      }));
    
    return pieData; // Will be empty array if no queries, UI handles this
  }
  
  /**
   * Calculate school performance data
   */
  calculateSchoolPerformance(students, applications) {
    const schools = ['SOT', 'SOM', 'SOH'];
    const performance = {};
    
    schools.forEach(school => {
      const schoolStudents = (students || []).filter(s => {
        const studentSchool = s?.school || s?.user?.school || '';
        return String(studentSchool).toUpperCase() === school.toUpperCase();
      });
      
      const schoolApplications = (applications || []).filter(a => {
        const student = (students || []).find(s => s?.id === a?.studentId);
        if (!student) return false;
        const studentSchool = student?.school || student?.user?.school || '';
        return String(studentSchool).toUpperCase() === school.toUpperCase();
      });
      
      // Calculate metrics
      const totalStudents = schoolStudents.length;
      const applied = schoolApplications.length;
      const placed = schoolApplications.filter(a => {
        const status = String(a?.status || a?.interviewStatus || '').toUpperCase();
        return status === 'SELECTED' || status === 'ACCEPTED' || status === 'OFFERED';
      }).length;
      const interviewEligible = schoolApplications.filter(a => {
        const screeningStatus = String(a?.screeningStatus || '').toUpperCase();
        return screeningStatus === 'TEST_SELECTED';
      }).length;
      
      // Performance metrics (as percentages)
      const placementRate = totalStudents > 0 ? Math.round((placed / totalStudents) * 100) : 0;
      const applicationRate = totalStudents > 0 ? Math.round((applied / totalStudents) * 100) : 0;
      const conversionRate = applied > 0 ? Math.round((placed / applied) * 100) : 0;
      const interviewRate = applied > 0 ? Math.round((interviewEligible / applied) * 100) : 0;
      
      // Always return valid structure, even if all values are 0
      performance[school] = {
        performance: {
          labels: ['Placement Rate', 'Application Rate', 'Conversion Rate', 'Interview Rate'],
          values: [placementRate, applicationRate, conversionRate, interviewRate],
        },
        applications: {
          labels: ['Total Students', 'Applied', 'Interview Eligible', 'Placed'],
          values: [totalStudents, applied, interviewEligible, placed],
        },
      };
    });
    
    return performance;
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