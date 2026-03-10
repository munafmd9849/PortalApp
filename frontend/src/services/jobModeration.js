/**
 * Job Moderation Service
 * Production behavior: API/DB data only.
 */
import api from './api.js';

const jobSubscribers = new Set();
const analyticsSubscribers = new Set();

function safeParseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJobsResponse(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.jobs)) return response.jobs;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function applyFilters(jobs, filters = {}) {
  return jobs.filter((job) => {
    // Status filter - handle both lowercase and uppercase
    if (filters.status && filters.status !== 'all') {
      const jobStatus = (job.status || '').toLowerCase();
      const filterStatus = filters.status.toLowerCase();
      
      // Map common status variations
      // When filter is 'in_review', only show jobs with status 'in_review'
      // Exclude 'accepted', 'approved', 'posted', 'active', 'rejected', 'archived', 'draft'
      if (filterStatus === 'in_review') {
        if (jobStatus !== 'in_review') {
          return false;
        }
      }
      // When filter is 'accepted', show jobs with status 'accepted' or 'approved'
      if (filterStatus === 'accepted') {
        if (jobStatus !== 'accepted' && jobStatus !== 'approved') {
          return false;
        }
      }
      if (filterStatus === 'draft' && jobStatus !== 'draft') return false;
      if (filterStatus === 'posted' && jobStatus !== 'posted' && jobStatus !== 'active') return false;
      if (filterStatus === 'rejected' && jobStatus !== 'rejected') return false;
      if (filterStatus === 'archived' && jobStatus !== 'archived') return false;
      if (filterStatus !== 'in_review' && filterStatus !== 'draft' && 
          filterStatus !== 'accepted' && filterStatus !== 'posted' && 
          filterStatus !== 'rejected' && filterStatus !== 'archived' && 
          jobStatus !== filterStatus) return false;
    }
    
    if (filters.companyId && job.companyDetails?.id !== filters.companyId) return false;
    if (filters.recruiterId && job.recruiterId !== filters.recruiterId && 
        job.recruiter?.id !== filters.recruiterId) return false;

    if (filters.startDate) {
      const drive = job.driveDate ? new Date(job.driveDate) : null;
      if (!drive || drive < new Date(filters.startDate)) return false;
    }
    if (filters.endDate) {
      const drive = job.driveDate ? new Date(job.driveDate) : null;
      if (!drive || drive > new Date(filters.endDate)) return false;
    }
    return true;
  });
}

function buildAnalytics(jobs) {
  const list = Array.isArray(jobs) ? jobs : [];
  return list.reduce(
    (acc, job) => {
      acc.total += 1;
      const key = (job.status || '').toLowerCase();
      if (key === 'active') acc.active += 1;
      if (key === 'posted') acc.posted += 1;
      // Only count draft and in_review as pending approval (accepted jobs are no longer pending)
      if (key === 'draft' || key === 'in_review') acc.pendingApproval += 1;
      if (key === 'rejected') acc.rejected += 1;
      if (key === 'archived') acc.archived += 1;
      return acc;
    },
    {
      total: 0,
      active: 0,
      posted: 0,
      pendingApproval: 0,
      rejected: 0,
      archived: 0,
    }
  );
}

export function subscribeJobsWithDetails(onChange, filters = {}) {
  const fetchJobs = async () => {
    try {
      const params = { limit: filters.limit || 1000 };
      if (filters.recruiterId) params.recruiterId = filters.recruiterId;

      const response = await api.getJobs(params);
      const jobs = parseJobsResponse(response);

      const transformedJobs = jobs.map((job) => {
        const rawStatus = job.status || 'DRAFT';
        let status = String(rawStatus).toLowerCase();
        if (status === 'approved') status = 'accepted';

        return {
          id: job.id,
          jobTitle: job.jobTitle,
          jobType: job.jobType,
          salary: job.salary,
          stipend: job.stipend,
          company: job.companyName || job.company?.name,
          companyName: job.companyName || job.company?.name,
          companyLocation: job.companyLocation || job.company?.location,
          companyDetails: job.company
            ? { id: job.company.id, name: job.company.name, location: job.company.location }
            : null,
          recruiter: job.recruiter
            ? {
                id: job.recruiter.id,
                name: job.recruiter.user?.displayName || job.recruiter.user?.email,
                email: job.recruiter.user?.email,
              }
            : null,
          recruiterId: job.recruiterId,
          driveDate: job.driveDate,
          applicationDeadline: job.applicationDeadline,
          status,
          isActive: Boolean(job.isPosted) || String(job.status || '').toUpperCase() === 'POSTED',
          responsibilities: job.description,
          skills: safeParseJsonArray(job.requiredSkills),
          targetSchools: safeParseJsonArray(job.targetSchools),
          targetCenters: safeParseJsonArray(job.targetCenters),
          targetBatches: safeParseJsonArray(job.targetBatches),
          createdAt: job.createdAt,
          postedAt: job.postedAt,
          submittedAt: job.submittedAt,
          rejectionReason: job.rejectionReason,
        };
      });

      const filtered = applyFilters(transformedJobs, filters);
      onChange(filtered, { total: transformedJobs.length, filtered: filtered.length, lastUpdated: new Date().toISOString() });
    } catch (error) {
      console.error('subscribeJobsWithDetails fetch failed:', error);
      onChange([], { total: 0, filtered: 0, lastUpdated: new Date().toISOString() });
    }
  };

  // Initial fetch
  fetchJobs();

  // Set up polling for real-time updates (every 10 seconds)
  const intervalId = setInterval(fetchJobs, 10000);

  // Return unsubscribe function and refresh function
  return {
    unsubscribe: () => {
    clearInterval(intervalId);
    },
    refresh: () => {
      console.log('🔄 Manual refresh triggered for jobs');
      fetchJobs();
    }
  };
}

export function subscribeJobAnalytics(onChange) {
  const handler = async () => {
    try {
      const response = await api.getJobs({ limit: 1000 });
      const jobs = parseJobsResponse(response);
      onChange(buildAnalytics(jobs));
    } catch (error) {
      console.error('subscribeJobAnalytics fetch failed:', error);
      onChange(buildAnalytics([]));
    }
  };
  
  analyticsSubscribers.add(handler);
  handler();

  // Set up polling for analytics updates
  const intervalId = setInterval(handler, 15000); // Every 15 seconds

  // Return unsubscribe function and refresh function
  return {
    unsubscribe: () => {
    analyticsSubscribers.delete(handler);
    clearInterval(intervalId);
    },
    refresh: () => {
      console.log('🔄 Manual refresh triggered for analytics');
      handler();
    }
  };
}

export async function approveJob(jobId, user, targeting = {}) {
  try {
    // Call real API to approve job (now moves directly IN_REVIEW → POSTED)
    // Targeting can be passed for initial posting
    const response = await api.approveJob(jobId, targeting);
    console.log('✅ Job approved and posted via API:', jobId);
    console.log('📋 Approval response:', {
      jobId: response?.job?.id,
      status: response?.job?.status,
      success: response?.success
    });
    
    // Verify the status was updated correctly (should be POSTED)
    if (response?.job?.status) {
      const status = response.job.status.toLowerCase();
      if (status !== 'posted') {
        console.warn(`⚠️ Warning: Job status is ${response.job.status}, expected POSTED`);
      } else {
        console.log(`✅ Job status correctly set to: POSTED`);
      }
    }
    
    return { success: true, jobId, ...response };
  } catch (error) {
    // Log full error details for debugging
    console.error('Error approving job:', {
      jobId: jobId,
      error: error,
      message: error?.message,
      status: error?.status,
      response: error?.response,
      isNetworkError: error?.isNetworkError,
      stack: error?.stack,
    });
    
    // Re-throw the error so the UI can handle it properly
    throw error;
  }
}

export async function rejectJob(jobId, reason = 'Insufficient details') {
  try {
    // Call real API to reject job
    const response = await api.rejectJob(jobId, { rejectionReason: reason });
    console.log('✅ Job rejected via API:', jobId);
    return { success: true, jobId, ...response };
  } catch (error) {
    // Log full error details for debugging
    console.error('Error rejecting job:', {
      jobId: jobId,
      reason: reason,
      error: error,
      message: error?.message,
      status: error?.status,
      response: error?.response,
      isNetworkError: error?.isNetworkError,
      stack: error?.stack,
    });
    
    // Re-throw the error so the UI can handle it properly
    throw error;
  }
}

export async function archiveJob(jobId) {
  const updated = await api.updateJob(jobId, { status: 'ARCHIVED' });
  return { success: true, jobId, job: updated?.job || updated };
}

export async function getJobWithDetails(jobId) {
  return await api.getJob(jobId);
}

export async function getCompaniesForDropdown() {
  try {
    const response = await api.getJobs({ limit: 1000 });
    const jobs = parseJobsResponse(response);
    const map = new Map();
    jobs.forEach((job) => {
      const id = job.company?.id || job.companyId || job.company?.name || job.companyName;
      const name = job.company?.name || job.companyName;
      if (id && name && !map.has(id)) map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  } catch {
    return [];
  }
}

export async function getRecruitersForDropdown() {
  try {
    const response = await api.getJobs({ limit: 1000 });
    const jobs = parseJobsResponse(response);
    const map = new Map();
    jobs.forEach((job) => {
      const id = job.recruiter?.id || job.recruiterId;
      const name = job.recruiter?.user?.displayName || job.recruiter?.user?.email;
      if (id && name && !map.has(id)) map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  } catch {
    return [];
  }
}

export async function autoArchiveExpiredJobs(user) {
  try {
    // Call the real API endpoint
    const result = await api.autoArchiveExpiredJobs();
    
    // If API call succeeds, return the result
    if (result.success) {
      return {
        success: true,
        successful: result.successful || result.archived || 0,
        archived: result.archived || result.successful || 0,
      };
    }
    
    throw new Error('Auto-archive failed: Server returned unsuccessful response');
  } catch (error) {
    console.error('Auto-archive expired jobs error:', error);
    
    throw error;
  }
}
