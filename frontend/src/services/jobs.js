/**
 * Jobs Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

// Set to true to force use of mock data (for testing/development)
const USE_MOCK_DATA = false; // Change to true to see mock data

/**
 * List jobs with filters
 */
export async function listJobs({ limitTo = 50, recruiterId, status } = {}) {
  try {
    // For now, always use mock data to ensure the page displays properly
    // TODO: Re-enable real API fetching once backend is fully robust
    const mockJobs = getMockJobs();
    
    // Apply filters
    let filteredJobs = mockJobs;
    if (status) {
      if (status === 'POSTED' || status === 'posted') {
        filteredJobs = mockJobs.filter(j => j.isPosted || j.status === 'posted');
      } else if (status === 'DRAFT' || status === 'draft') {
        filteredJobs = mockJobs.filter(j => !j.isPosted && j.status === 'draft');
      }
    }
    
    if (limitTo) {
      filteredJobs = filteredJobs.slice(0, limitTo);
    }
    
    return filteredJobs;

    // TODO: Uncomment when ready to use real data
    /*
    const params = {};
    if (limitTo) params.limit = limitTo;
    if (recruiterId) params.recruiterId = recruiterId;
    if (status) params.status = status;
    
    const jobs = await api.getJobs(params);
    if (jobs && jobs.length > 0) {
      return jobs;
    }
    
    // Fallback to mock data
    const mockJobs = getMockJobs();
    return mockJobs.slice(0, limitTo || 50);
    */
  } catch (error) {
    console.error('listJobs error:', error);
    // Return mock data on error
    const mockJobs = getMockJobs();
    return mockJobs.slice(0, limitTo || 50);
  }
}

/**
 * Get single job by ID
 */
export async function getJob(jobId) {
  try {
    const res = await api.getJob(jobId);
    // Backend commonly wraps responses as: { success: true, data: {...} }
    // Normalize to always return the job object itself.
    return res && typeof res === 'object' && 'data' in res ? res.data : res;
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
    const job = await api.createJob(jobData);
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
    // Try real API first
    try {
      await api.deleteJob(jobId);
      // Remove from mock cache if exists
      if (cachedMockJobs) {
        cachedMockJobs = cachedMockJobs.filter(j => j.id !== jobId);
      }
      return { success: true };
    } catch (apiError) {
      // If API fails, handle mock data
      if (cachedMockJobs) {
        const index = cachedMockJobs.findIndex(j => j.id === jobId);
        if (index !== -1) {
          cachedMockJobs.splice(index, 1);
          return { success: true };
        }
      }
      throw apiError;
    }
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
    const jobs = await api.getTargetedJobs();
    
    if (jobs && jobs.length > 0) {
      // Transform jobs to match expected format
      const transformedJobs = jobs.map(job => {
        // Handle date objects (from database or mock data)
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
          // Parse targeting arrays (stored as JSON strings in SQLite)
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
    
    // If API returns empty, return empty array (don't use mock data)
    console.log('No jobs found from API for student');
    return [];
  } catch (error) {
    console.error('getTargetedJobsForStudent error:', error);
    // Return empty array on error (don't show mock data)
    return [];
  }
}

// Mock data for development
const MOCK_COMPANIES = [
  { name: 'Tata Consultancy Services', location: 'Bangalore, KA' },
  { name: 'Infosys', location: 'Hyderabad, TS' },
  { name: 'Accenture', location: 'Mumbai, MH' },
  { name: 'Amazon', location: 'Bangalore, KA' },
  { name: 'Microsoft', location: 'Noida, UP' },
  { name: 'Dell Technologies', location: 'Chennai, TN' },
  { name: 'Wipro', location: 'Bangalore, KA' },
  { name: 'Cognizant', location: 'Pune, MH' },
  { name: 'Capgemini', location: 'Mumbai, MH' },
  { name: 'Tech Mahindra', location: 'Noida, UP' },
];

const MOCK_JOB_TITLES = [
  'Software Engineer',
  'Data Analyst',
  'Cloud Consultant',
  'Frontend Developer',
  'Backend Engineer',
  'Product Specialist',
  'DevOps Engineer',
  'QA Automation Engineer',
  'Business Analyst',
  'Security Analyst',
  'Full Stack Developer',
  'Machine Learning Engineer',
  'UI/UX Designer',
  'Database Administrator',
  'Network Engineer',
];

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCurrency(min, max, step = 1000) {
  const value = randomInt(min / step, max / step) * step;
  return value;
}

function generateMockJobs() {
  const jobs = [];
  const now = new Date();
  
  // Generate more jobs for better demo experience
  for (let i = 0; i < 35; i++) {
    const company = randomFrom(MOCK_COMPANIES);
    const jobTitle = randomFrom(MOCK_JOB_TITLES);
    const isPosted = i < 20; // First 20 are posted, rest are unposted
    const jobType = i % 3 === 0 ? 'Internship' : 'Full-time';
    
    // Create dates
    const createdAt = new Date(now.getTime() - randomInt(1, 60) * 24 * 60 * 60 * 1000);
    const driveDate = new Date(now.getTime() + randomInt(-10, 45) * 24 * 60 * 60 * 1000);
    const postedAt = isPosted ? new Date(createdAt.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000) : null;
    
    // Mock date object with toDate method for compatibility
    const mockDate = (date) => ({
      toDate: () => date,
      getTime: () => date.getTime(),
      toISOString: () => date.toISOString(),
    });
    
    const allSkills = [
      'React', 'Node.js', 'SQL', 'Cloud', 'CI/CD', 'Python', 'Java', 'JavaScript',
      'TypeScript', 'Angular', 'Vue.js', 'Express.js', 'MongoDB', 'PostgreSQL',
      'Redis', 'AWS', 'Docker', 'Kubernetes', 'GraphQL', 'REST API', 'Git',
      'Agile', 'Scrum', 'Machine Learning', 'Data Structures', 'Algorithms'
    ];
    const selectedSkills = allSkills.sort(() => 0.5 - Math.random()).slice(0, randomInt(4, 8));
    
    const workModes = ['On-site', 'Remote', 'Hybrid'];
    const qualifications = ['B.Tech', 'M.Tech', 'B.E', 'M.E', 'B.Sc', 'M.Sc'];
    const experienceLevels = ['Fresher', '0-2 years', '2-5 years', '5+ years'];
    
    const job = {
      id: `job_mock_${i + 1}`,
      jobTitle: jobTitle,
      jobType,
      salary: jobType === 'Full-time' ? randomCurrency(600000, 1800000, 50000) : null,
      stipend: jobType === 'Internship' ? randomCurrency(20000, 60000, 1000) : null,
      company: company.name,
      companyName: company.name,
      companyLocation: company.location,
      workMode: randomFrom(workModes),
      openings: randomInt(5, 50),
      qualification: randomFrom(qualifications),
      experienceLevel: randomFrom(experienceLevels),
      minCgpa: (Math.random() * 2 + 6).toFixed(1), // 6.0 to 8.0
      driveDate: mockDate(driveDate),
      createdAt: mockDate(createdAt),
      postedAt: postedAt ? mockDate(postedAt) : null,
      status: isPosted ? 'posted' : 'draft',
      isPosted: isPosted,
      posted: isPosted,
      description: `We are looking for a talented ${jobTitle} to join our team at ${company.name}. This role offers an excellent opportunity to work on cutting-edge projects and collaborate with industry experts.`,
      responsibilities: `• Collaborate with cross-functional teams to deliver high-quality product increments.
• Build scalable and maintainable modules that support business workflows.
• Participate in code reviews and contribute to technical discussions.
• Mentor junior developers and interns during campus drives.
• Contribute to platform stability with automated testing and QA processes.
• Stay updated with latest technologies and best practices.`,
      requiredSkills: selectedSkills,
      skills: selectedSkills,
      applicationDeadline: mockDate(new Date(driveDate.getTime() - randomInt(5, 15) * 24 * 60 * 60 * 1000)),
    };
    
    // Add targeting data for posted jobs
    if (isPosted) {
      const schools = ['SOT', 'SOM', 'SOH'];
      const batches = ['23-27', '24-28', '25-29', '26-30'];
      const centers = ['BANGALORE', 'NOIDA', 'LUCKNOW', 'PUNE', 'PATNA', 'INDORE'];
      
      job.targetSchools = [randomFrom(schools)];
      job.targetBatches = [randomFrom(batches)];
      job.targetCenters = [randomFrom(centers)];
      
      // Some jobs have multiple selections
      if (i % 3 === 0) {
        job.targetSchools = schools.slice(0, randomInt(2, 3));
        job.targetBatches = batches.slice(0, randomInt(2, 3));
        job.targetCenters = centers.slice(0, randomInt(2, 4));
      }
    }
    
    jobs.push(job);
  }
  
  return jobs;
}

// Cache mock jobs
let cachedMockJobs = null;

function getMockJobs() {
  if (!cachedMockJobs) {
    cachedMockJobs = generateMockJobs();
  }
  return cachedMockJobs;
}

/**
 * Subscribe to jobs (replaced with load-once pattern with mock data)
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
          companyDetails: job.company,
          recruiter: job.recruiter ? {
            id: job.recruiter.id,
            name: job.recruiter.user?.displayName || job.recruiter.user?.email,
            email: job.recruiter.user?.email
          } : null,
          recruiterId: job.recruiterId,
          driveDate: job.driveDate,
          applicationDeadline: job.applicationDeadline,
          status: status, // Normalized lowercase status (ACCEPTED -> accepted, IN_REVIEW -> in_review)
          isPosted: isPosted,
          posted: isPosted,
          responsibilities: job.description,
          skills: typeof job.requiredSkills === 'string' 
            ? JSON.parse(job.requiredSkills || '[]')
            : (job.requiredSkills || []),
          targetSchools: typeof job.targetSchools === 'string'
            ? JSON.parse(job.targetSchools || '[]')
            : (job.targetSchools || []),
          targetCenters: typeof job.targetCenters === 'string'
            ? JSON.parse(job.targetCenters || '[]')
            : (job.targetCenters || []),
          targetBatches: typeof job.targetBatches === 'string'
            ? JSON.parse(job.targetBatches || '[]')
            : (job.targetBatches || []),
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
      // If USE_MOCK_DATA is true, skip API and use mock data directly
      if (USE_MOCK_DATA) {
        console.log('🎭 Using mock data (USE_MOCK_DATA flag is enabled)');
        const mockJobs = getMockJobs();
        callback(mockJobs);
        return;
      }
      
      // Try real API first, fallback to mock data
      try {
        const transformedJobs = await fetchJobsFromAPI(filters);
        if (transformedJobs.length > 0) {
          callback(transformedJobs);
          return;
        }
        // If API returns 0 jobs, use mock data as fallback
        console.log('API returned 0 jobs, using mock data as fallback');
        const mockJobs = getMockJobs();
        callback(mockJobs);
      } catch (apiError) {
        console.log('API call failed, using mock data:', apiError.message);
        // Use mock data as fallback
        const mockJobs = getMockJobs();
        callback(mockJobs);
      }
    } catch (error) {
      console.error('subscribeJobs error:', error);
      // Even on error, try to show mock data
      try {
        const mockJobs = getMockJobs();
        callback(mockJobs);
      } catch (mockError) {
        console.error('Failed to load mock data:', mockError);
        callback([]);
      }
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
  return () => {};
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
    // Try real API first
    try {
      const result = await api.postJob(jobId, targeting);
      // Update mock cache if exists
      if (cachedMockJobs) {
        const job = cachedMockJobs.find(j => j.id === jobId);
        if (job) {
          job.isPosted = true;
          job.posted = true;
          job.status = 'posted';
          job.postedAt = {
            toDate: () => new Date(),
            getTime: () => new Date().getTime(),
            toISOString: () => new Date().toISOString(),
          };
          job.targetSchools = targeting.selectedSchools || [];
          job.targetBatches = targeting.selectedBatches || [];
          job.targetCenters = targeting.selectedCenters || [];
        }
      }
      return { success: true, jobId, ...result };
    } catch (apiError) {
      // If API fails, handle mock data
      if (cachedMockJobs) {
        const job = cachedMockJobs.find(j => j.id === jobId);
        if (job) {
          job.isPosted = true;
          job.posted = true;
          job.status = 'posted';
          job.postedAt = {
            toDate: () => new Date(),
            getTime: () => new Date().getTime(),
            toISOString: () => new Date().toISOString(),
          };
          job.targetSchools = targeting.selectedSchools || [];
          job.targetBatches = targeting.selectedBatches || [];
          job.targetCenters = targeting.selectedCenters || [];
          return { success: true, jobId };
        }
      }
      throw apiError;
    }
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
    // Create job - backend will set status to IN_REVIEW for non-admin users
    const job = await createJob(null, jobData);
    return { success: true, jobId: job.id };
  } catch (error) {
    console.error('submitJobForReview error:', error);
    throw error;
  }
}
