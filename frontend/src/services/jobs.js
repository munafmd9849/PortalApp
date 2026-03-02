/**
 * Jobs Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

/**
 * List jobs with filters
 */
export async function listJobs({ limitTo = 50, recruiterId, status } = {}) {
  try {
    const params = {};
    if (limitTo) params.limit = limitTo;
    if (recruiterId) params.recruiterId = recruiterId;
    if (status) params.status = status;

    const response = await api.getJobs(params);
    const jobs = Array.isArray(response?.jobs) ? response.jobs : (Array.isArray(response) ? response : []);
    return limitTo ? jobs.slice(0, limitTo) : jobs;
  } catch (error) {
    console.error('listJobs error:', error);
    // No fallback data: let UI show empty/error state
    return [];
  }
}

/**
 * Get single job by ID
 */
export async function getJob(jobId) {
  try {
    const res = await api.getJob(jobId);
    // Backend commonly wraps responses as: { success: true, data: {...} }
    const raw = res && typeof res === 'object' && 'data' in res ? res.data : res;
    if (!raw || typeof raw !== 'object') return raw;
    // Ensure workMode is always preserved (backend uses workMode; handle work_mode)
    return {
      ...raw,
      workMode: raw.workMode ?? raw.work_mode ?? null,
    };
  } catch (error) {
    console.error('getJob error:', error);
    throw error;
  }
}

/**
 * Get job details (alias for getJob)
 */
export async function getJobDetails(jobId) {
  return getJob(jobId);
}

/**
 * Create new job
 */
export async function createJob(recruiterId, jobData) {
  try {
    const response = await api.createJob(jobData);
    // Backend returns { success: true, message: "...", data: job }
    // Extract the job from data field
    const job = response?.data || response;
    return job;
  } catch (error) {
    console.error('createJob error:', error);
    throw error;
  }
}

/**
 * Update existing job
 */
export async function updateJob(jobId, jobData) {
  try {
    const job = await api.updateJob(jobId, jobData);
    return job;
  } catch (error) {
    console.error('updateJob error:', error);
    throw error;
  }
}

/**
 * Delete job
 */
export async function deleteJob(jobId) {
  try {
    await api.deleteJob(jobId);
    return { success: true };
  } catch (error) {
    console.error('deleteJob error:', error);
    throw error;
  }
}

/**
 * Get targeted jobs for student
 * Replaces real-time subscription with one-time API call
 */
export async function getTargetedJobsForStudent(studentId) {
  try {
    // Call real API to get targeted jobs
    const jobs = await api.getTargetedJobs(studentId);

    if (jobs && jobs.length > 0) {
      // Transform jobs to match expected format
      const transformedJobs = jobs.map(job => {
        // Handle date values (from database)
        const parseDate = (dateValue) => {
          if (!dateValue) return null;
          if (typeof dateValue === 'string') return new Date(dateValue);
          if (dateValue.toDate) return dateValue.toDate(); // Firebase Timestamp
          if (dateValue instanceof Date) return dateValue;
          return new Date(dateValue);
        };

        return {
          id: job.id,
          jobTitle: job.jobTitle || job.title,
          jobType: job.jobType || job.type,
          salary: job.salary || job.ctc || job.salaryRange,
          stipend: job.stipend,
          company: job.companyName || job.company?.name || job.company,
          companyName: job.companyName || job.company?.name || job.company,
          companyLocation: job.companyLocation || job.location || job.company?.location,
          companyDetails: job.company,
          website: job.website || job.company?.website,
          recruiter: job.recruiter ? {
            id: job.recruiter.id,
            name: job.recruiter.user?.displayName || job.recruiter.user?.email,
            email: job.recruiter.user?.email
          } : null,
          recruiterId: job.recruiterId,
          driveDate: parseDate(job.driveDate),
          applicationDeadline: parseDate(job.applicationDeadline),
          reportingTime: job.reportingTime || null,
          createdAt: parseDate(job.createdAt),
          postedAt: parseDate(job.postedAt),
          status: job.status?.toLowerCase() || 'draft',
          isPosted: job.isPosted === true || job.status === 'POSTED' || job.status === 'posted',
          posted: job.isPosted === true || job.status === 'POSTED' || job.status === 'posted',
          description: job.description,
          requirements: job.requirements,
          requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills :
            (typeof job.requiredSkills === 'string' ? JSON.parse(job.requiredSkills || '[]') : []),
          location: job.location || job.companyLocation,
          workMode: job.workMode,
          openings: job.openings,
          qualification: job.qualification,
          minCgpa: job.minCgpa || job.cgpaRequirement,
          // Parse targeting arrays (stored as JSON strings)
          targetSchools: Array.isArray(job.targetSchools) ? job.targetSchools :
            (typeof job.targetSchools === 'string' ? JSON.parse(job.targetSchools || '[]') : []),
          targetCenters: Array.isArray(job.targetCenters) ? job.targetCenters :
            (typeof job.targetCenters === 'string' ? JSON.parse(job.targetCenters || '[]') : []),
          targetBatches: Array.isArray(job.targetBatches) ? job.targetBatches :
            (typeof job.targetBatches === 'string' ? JSON.parse(job.targetBatches || '[]') : []),
        };
      });

      return transformedJobs;
    }

    // If API returns empty, return empty array
    console.log('No jobs found from API for student');
    return [];
  } catch (error) {
    console.error('getTargetedJobsForStudent error:', error);
    // Return empty array on error
    return [];
  }
}

/**
 * Subscribe to jobs (polling-based)
 * For real-time updates, use Socket.IO instead
 * This function now returns an empty unsubscribe for backward compatibility
 */
// Shared fetch function for jobs
const fetchJobsFromAPI = async (filters = {}) => {
  try {
    const params = {
      limit: filters.limit || 1000, // Fetch all jobs to ensure IN_REVIEW jobs are included
    };
    if (filters.recruiterId) params.recruiterId = filters.recruiterId;
    // Don't filter by status - we want all jobs including IN_REVIEW

    const response = await api.getJobs(params);
    const jobs = response.jobs || response || [];

    if (jobs && jobs.length > 0) {
      // Transform jobs to match expected format
      const transformedJobs = jobs.map(job => {
        // Normalize status: convert to lowercase and handle variations
        const rawStatus = job.status || 'DRAFT';
        let normalizedStatus = rawStatus.toLowerCase();

        // Handle status variations
        if (normalizedStatus === 'accepted' || normalizedStatus === 'approved') {
          normalizedStatus = 'accepted'; // Standardize to 'accepted'
        }

        const status = normalizedStatus;
        // ACCEPTED jobs are not posted yet (they're in review section)
        const isPosted = (job.isPosted === true) || (status === 'posted' || status === 'active');

        // Debug: Log status transformation for ACCEPTED jobs
        if (rawStatus === 'ACCEPTED' || rawStatus === 'APPROVED' || normalizedStatus === 'accepted') {
          console.log(`🔄 Status transformation in jobs.js: "${job.jobTitle}" - ${rawStatus} → ${normalizedStatus} (isPosted: ${isPosted})`);
        }

        return {
          id: job.id,
          jobTitle: job.jobTitle,
          jobType: job.jobType,
          salary: job.salary,
          stipend: job.stipend,
          company: job.companyName || job.company?.name,
          companyName: job.companyName || job.company?.name,
          companyLocation: job.companyLocation || job.company?.location,
          location: job.location || job.companyLocation || job.company?.location,
          workMode: job.workMode,
          gapAllowed: job.gapAllowed,
          gapYears: job.gapYears,
          companyDetails: job.company,
          recruiter: job.recruiter ? {
            id: job.recruiter.id,
            name: job.recruiter.user?.displayName || job.recruiter.user?.email,
            email: job.recruiter.user?.email
          } : null,
          recruiterId: job.recruiterId,
          driveDate: job.driveDate,
          applicationDeadline: job.applicationDeadline,
          reportingTime: job.reportingTime || null,
          status: status, // Normalized lowercase status (ACCEPTED -> accepted, IN_REVIEW -> in_review)
          isPosted: isPosted,
          posted: isPosted,
          responsibilities: job.description,
          skills: (() => {
            try {
              if (typeof job.requiredSkills === 'string') {
                // Try to parse as JSON first
                if (job.requiredSkills.trim().startsWith('[')) {
                  return JSON.parse(job.requiredSkills || '[]');
                }
                // If not JSON, treat as comma-separated string and convert to array
                return job.requiredSkills.split(',').map(s => s.trim()).filter(s => s);
              }
              return Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
            } catch (e) {
              // If JSON parse fails, try comma-separated string
              if (typeof job.requiredSkills === 'string') {
                return job.requiredSkills.split(',').map(s => s.trim()).filter(s => s);
              }
              return [];
            }
          })(),
          targetSchools: (() => {
            try {
              if (typeof job.targetSchools === 'string') {
                return JSON.parse(job.targetSchools || '[]');
              }
              return Array.isArray(job.targetSchools) ? job.targetSchools : [];
            } catch (e) {
              console.warn('Failed to parse targetSchools:', job.targetSchools);
              return [];
            }
          })(),
          targetCenters: (() => {
            try {
              if (typeof job.targetCenters === 'string') {
                return JSON.parse(job.targetCenters || '[]');
              }
              return Array.isArray(job.targetCenters) ? job.targetCenters : [];
            } catch (e) {
              console.warn('Failed to parse targetCenters:', job.targetCenters);
              return [];
            }
          })(),
          targetBatches: (() => {
            try {
              if (typeof job.targetBatches === 'string') {
                return JSON.parse(job.targetBatches || '[]');
              }
              return Array.isArray(job.targetBatches) ? job.targetBatches : [];
            } catch (e) {
              console.warn('Failed to parse targetBatches:', job.targetBatches);
              return [];
            }
          })(),
          createdAt: job.createdAt,
          postedAt: job.postedAt,
          submittedAt: job.submittedAt,
          rejectionReason: job.rejectionReason
        };
      });

      // Debug: Log IN_REVIEW jobs
      const inReviewJobs = transformedJobs.filter(j => j.status === 'in_review');
      console.log(`📊 subscribeJobs: Fetched ${transformedJobs.length} real jobs from API`);
      if (inReviewJobs.length > 0) {
        console.log(`📋 IN_REVIEW jobs found: ${inReviewJobs.length}`, inReviewJobs.map(j => ({
          id: j.id,
          title: j.jobTitle,
          status: j.status,
          isPosted: j.isPosted,
          originalStatus: jobs.find(orig => orig.id === j.id)?.status
        })));
      }

      return transformedJobs;
    }
    return [];
  } catch (apiError) {
    console.log('API call failed:', apiError.message);
    throw apiError;
  }
};

export function subscribeJobs(callback, filters = {}) {
  // Load jobs once instead of real-time subscription
  (async () => {
    try {
      const transformedJobs = await fetchJobsFromAPI(filters);
      callback(transformedJobs);
    } catch (error) {
      console.error('subscribeJobs error:', error);
      callback([]);
    }
  })();

  // Shared fetch function that can be called manually
  const fetchAndNotify = async () => {
    try {
      const transformedJobs = await fetchJobsFromAPI(filters);
      if (transformedJobs.length > 0) {
        // Debug: Log IN_REVIEW jobs in polling
        const inReviewJobs = transformedJobs.filter(j => j.status === 'in_review');
        if (inReviewJobs.length > 0) {
          console.log(`🔄 Polling update: Found ${inReviewJobs.length} IN_REVIEW jobs`);
        }
        callback(transformedJobs);
      }
    } catch (error) {
      console.error('subscribeJobs polling error:', error);
    }
  };

  // Set up polling for updates every 5 seconds (faster updates)
  const intervalId = setInterval(fetchAndNotify, 5000);

  // Return unsubscribe function and refresh function
  return {
    unsubscribe: () => {
      clearInterval(intervalId);
    },
    refresh: () => {
      console.log('🔄 Manual refresh triggered for subscribeJobs');
      fetchAndNotify();
    }
  };
}

/**
 * Subscribe to posted jobs (replaced with load-once pattern)
 */
export function subscribePostedJobs(callback, filters = {}) {
  // Load posted jobs once
  (async () => {
    try {
      const jobs = await listJobs({ ...filters, status: 'POSTED' });
      callback(jobs);
    } catch (error) {
      console.error('subscribePostedJobs error:', error);
      callback([]);
    }
  })();

  // Return empty unsubscribe function for backward compatibility
  return () => { };
}

/**
 * Save job as draft
 * TODO: Replace with API call - save to local storage or backend
 */
export async function saveJobDraft(jobData) {
  // TODO: Replace with API call or localStorage for draft saving
  console.warn('saveJobDraft: Placeholder - needs API implementation');
  // For now, save to localStorage
  try {
    const drafts = JSON.parse(localStorage.getItem('jobDrafts') || '[]');
    drafts.push({ ...jobData, draftId: Date.now().toString(), createdAt: new Date().toISOString() });
    localStorage.setItem('jobDrafts', JSON.stringify(drafts));
    return { success: true, draftId: drafts[drafts.length - 1].draftId };
  } catch (error) {
    console.error('saveJobDraft error:', error);
    throw error;
  }
}

/**
 * Add another position draft (save current and prepare new form)
 * TODO: Replace with API call
 */
export async function addAnotherPositionDraft(jobData) {
  // TODO: Replace with API call
  console.warn('addAnotherPositionDraft: Placeholder - needs API implementation');
  // Save current position and return autofill data for next form
  try {
    await saveJobDraft(jobData);
    // Return autofill data (company info to prefill in next form)
    return {
      autofill: {
        company: jobData.company || '',
        website: jobData.website || '',
        linkedin: jobData.linkedin || '',
        companyLocation: jobData.companyLocation || '',
        spocs: jobData.spocs || [],
        serviceAgreement: jobData.serviceAgreement || '',
        baseRoundDetails: jobData.baseRoundDetails || ['', '', ''],
        extraRounds: jobData.extraRounds || [],
      },
    };
  } catch (error) {
    console.error('addAnotherPositionDraft error:', error);
    throw error;
  }
}

/**
 * Post job (admin only - directly posts without review)
 * Posts an existing job (jobId required)
 */
export async function postJob(jobId, targeting = {}) {
  try {
    const result = await api.postJob(jobId, targeting);
    return { success: true, jobId, ...result };
  } catch (error) {
    console.error('postJob error:', error);
    throw error;
  }
}

/**
 * Submit job for review (recruiter/admin - creates job in IN_REVIEW status)
 * Creates a new job that will be reviewed by admin
 */
export async function submitJobForReview(jobData) {
  try {
    console.log('📤 [submitJobForReview] Starting job submission...');
    console.log('📦 [submitJobForReview] Job data keys:', Object.keys(jobData || {}));

    // Create job - backend will set status to IN_REVIEW for ALL jobs (admin and recruiter)
    // Jobs must be approved by admin before they can be posted to students
    const job = await createJob(null, jobData);

    console.log('✅ [submitJobForReview] Job created successfully:', {
      id: job?.id,
      jobTitle: job?.jobTitle,
      status: job?.status,
      fullResponse: job,
    });

    if (!job || !job.id) {
      console.error('❌ [submitJobForReview] Job created but missing ID:', {
        job,
        jobType: typeof job,
        jobKeys: job ? Object.keys(job) : null,
        hasData: job?.data ? 'yes' : 'no',
        dataId: job?.data?.id,
      });
      throw new Error('Job was created but no ID was returned. Please check the server response.');
    }

    return { success: true, jobId: job.id, job: job };
  } catch (error) {
    console.error('❌ [submitJobForReview] Error occurred:', error);
    console.error('❌ [submitJobForReview] Error details:', {
      message: error?.message,
      response: error?.response,
      status: error?.status,
    });
    throw error;
  }
}
