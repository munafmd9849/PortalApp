/**
 * Custom Hook for Job Details with Caching
 * Provides React Query-like functionality with 5-minute cache
 * Can be easily replaced with React Query/SWR later
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getJob } from '../services/jobs';

// Global cache store (shared across all instances)
const jobCache = new Map();

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp) {
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_DURATION;
}

/**
 * Get job from cache if valid
 */
function getCachedJob(jobId) {
  const cached = jobCache.get(jobId);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }
  // Remove expired cache
  if (cached) {
    jobCache.delete(jobId);
  }
  return null;
}

/**
 * Set job in cache
 */
function setCachedJob(jobId, data) {
  jobCache.set(jobId, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clear cache for a specific job
 */
export function clearJobCache(jobId) {
  if (jobId) {
    jobCache.delete(jobId);
  } else {
    jobCache.clear();
  }
}

/**
 * useJobDetails Hook
 * Fetches job details with caching and fallback support
 * 
 * @param {string|null} jobId - Job ID to fetch
 * @param {object|null} fallbackJob - Fallback job data if API fails
 * @param {boolean} enabled - Whether to fetch (default: true if jobId exists)
 * @returns {object} { job, loading, error, refetch }
 */
export function useJobDetails(jobId, fallbackJob = null, enabled = true) {
  const [job, setJob] = useState(fallbackJob);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchJob = useCallback(async () => {
    if (!jobId || !enabled) {
      setJob(fallbackJob);
      setLoading(false);
      return;
    }

    // Check cache first
    const cachedJob = getCachedJob(jobId);
    if (cachedJob) {
      setJob(cachedJob);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const jobData = await getJob(jobId);
      
      if (jobData) {
        // Cache the result
        setCachedJob(jobId, jobData);
        setJob(jobData);
        setError(null);
      } else {
        // API returned null, use fallback
        setJob(fallbackJob);
      }
    } catch (err) {
      // If error, use fallback data
      console.error('Failed to fetch job details:', err);
      setError(err);
      setJob(fallbackJob); // Fallback to prop data
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [jobId, fallbackJob, enabled]);

  useEffect(() => {
    fetchJob();

    // Cleanup: abort request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchJob]);

  return {
    job,
    loading,
    error,
    refetch: fetchJob,
  };
}

