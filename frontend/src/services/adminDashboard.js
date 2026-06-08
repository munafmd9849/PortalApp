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
      stats: null,
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
      console.log('📊 [AdminDashboard] Fetching aggregated dashboard data from Backend...');

      // Convert filters to query string
      const queryParams = new URLSearchParams();
      if (filters && typeof filters === 'object') {
        Object.entries(filters).forEach(([key, value]) => {
          if (value && (Array.isArray(value) ? value.length > 0 : String(value).trim() !== '')) {
            queryParams.append(key, Array.isArray(value) ? value.join(',') : value);
          }
        });
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/admin/dashboard?${queryString}` : '/admin/dashboard';

      // Make a single API call to the backend which performs all aggregation via SQL
      const response = await api.get(endpoint);
      const data = response?.data ?? response;

      this.cachedData = data;
      return data;
    } catch (error) {
      console.error('AdminDashboardService.fetchData error:', error);
      // Return last cached data on error
      return this.cachedData;
    }
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
      return () => { }; // Return no-op unsubscribe
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