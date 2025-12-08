/**
 * Job Moderation Service
 * Fetches real jobs from backend API and provides real-time updates
 */
import api from './api.js';

// Set to true to force use of mock data (for testing/development)
const USE_MOCK_DATA = false; // Change to true to see mock data

const COMPANY_DIRECTORY = [
  { id: 'cmp_tcs', name: 'Tata Consultancy Services', location: 'Bangalore, KA' },
  { id: 'cmp_inf', name: 'Infosys', location: 'Hyderabad, TS' },
  { id: 'cmp_acc', name: 'Accenture', location: 'Mumbai, MH' },
  { id: 'cmp_azo', name: 'Amazon', location: 'Bangalore, KA' },
  { id: 'cmp_mic', name: 'Microsoft', location: 'Noida, UP' },
  { id: 'cmp_dell', name: 'Dell Technologies', location: 'Chennai, TN' },
];

const RECRUITERS = [
  { id: 'rec_ak', name: 'Akash Mehta', email: 'akash.mehta@tcs.com' },
  { id: 'rec_pb', name: 'Priyanka Bhat', email: 'priyanka.bhat@infosys.com' },
  { id: 'rec_rs', name: 'Rohan Sen', email: 'rohan.sen@accenture.com' },
  { id: 'rec_sk', name: 'Sahana Kumar', email: 'sahana.kumar@amazon.com' },
  { id: 'rec_vr', name: 'Vishal Reddy', email: 'vishal.reddy@microsoft.com' },
  { id: 'rec_an', name: 'Anusha Nair', email: 'anusha.nair@dell.com' },
];

const TARGET_SCHOOLS = ['SOT', 'SOM', 'SOH'];
const TARGET_CENTERS = ['BANGALORE', 'NOIDA', 'LUCKNOW', 'PUNE', 'INDORE'];
const TARGET_BATCHES = ['23-27', '24-28', '25-29'];
const STATUS_SEQUENCE = ['in_review', 'in_review', 'draft', 'in_review', 'posted', 'in_review', 'active', 'rejected', 'in_review', 'archived', 'in_review'];

const mockJobs = generateMockJobs();
const jobSubscribers = new Set();
const analyticsSubscribers = new Set();

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
  const titles = [
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
  ];

  return Array.from({ length: 35 }).map((_, idx) => {
    const company = randomFrom(COMPANY_DIRECTORY);
    const recruiter = randomFrom(RECRUITERS);
    const status = STATUS_SEQUENCE[idx % STATUS_SEQUENCE.length];
    const jobType = idx % 4 === 0 ? 'Internship' : 'Full-time';
    const driveDate = new Date();
    driveDate.setDate(driveDate.getDate() + randomInt(-20, 40));
    const deadline = new Date(driveDate);
    deadline.setDate(deadline.getDate() - randomInt(5, 15));

    return {
      id: `job_${idx + 1}`,
      jobTitle: `${randomFrom(titles)} - ${company.name.split(' ')[0]}`,
      jobType,
      salary: jobType === 'Full-time' ? randomCurrency(600000, 1800000, 50000) : null,
      stipend: jobType === 'Internship' ? randomCurrency(20000, 60000, 1000) : null,
      company: company.name,
      companyName: company.name,
      companyLocation: company.location,
      companyDetails: company,
      recruiter,
      recruiterId: recruiter.id,
      driveDate: driveDate.toISOString(),
      applicationDeadline: deadline.toISOString(),
      status,
      jobTypeDisplay: jobType,
      isActive: status === 'active' || status === 'posted',
      responsibilities:
        '• Collaborate with cross-functional teams to deliver product increments.\n' +
        '• Build scalable modules that support placement workflows.\n' +
        '• Mentor student interns during campus drives.\n' +
        '• Contribute to platform stability with automated QA.',
      skills: ['React', 'Node.js', 'SQL', 'Cloud', 'CI/CD'].slice(0, randomInt(3, 5)),
      targetSchools: shuffle(TARGET_SCHOOLS).slice(0, randomInt(1, TARGET_SCHOOLS.length)),
      targetCenters: shuffle(TARGET_CENTERS).slice(0, randomInt(2, TARGET_CENTERS.length)),
      targetBatches: shuffle(TARGET_BATCHES).slice(0, randomInt(1, TARGET_BATCHES.length)),
      createdAt: new Date(Date.now() - randomInt(5, 30) * 24 * 60 * 60 * 1000).toISOString(),
      postedAt: status === 'posted' ? new Date().toISOString() : null,
      rejectionReason: status === 'rejected' ? 'Role duplicated. Please update requirements.' : null,
    };
  });
}

function shuffle(list) {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function applyFilters(jobs, filters = {}) {
  return jobs.filter((job) => {
    // Status filter - handle both lowercase and uppercase
    if (filters.status && filters.status !== 'all') {
      const jobStatus = (job.status || '').toLowerCase();
      const filterStatus = filters.status.toLowerCase();
      
      // Debug: Log status filtering for troubleshooting
      if (job.jobTitle && job.jobTitle.toLowerCase().includes('full stack')) {
        console.log(`🔍 Filtering job "${job.jobTitle}": jobStatus="${jobStatus}", filterStatus="${filterStatus}"`);
      }
      
      // Map common status variations
      // When filter is 'in_review', only show jobs with status 'in_review'
      // Exclude 'accepted', 'approved', 'posted', 'active', 'rejected', 'archived', 'draft'
      if (filterStatus === 'in_review') {
        if (jobStatus !== 'in_review') {
          if (job.jobTitle && job.jobTitle.toLowerCase().includes('full stack')) {
            console.log(`❌ Excluding job "${job.jobTitle}" from in_review filter (status: ${jobStatus})`);
          }
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

function broadcastJobs() {
  jobSubscribers.forEach((listener) => listener());
  analyticsSubscribers.forEach((listener) => listener());
}

function buildAnalytics(jobs) {
  if (!Array.isArray(jobs)) {
    console.warn('⚠️ buildAnalytics received non-array:', jobs);
    return {
      total: 0,
      active: 0,
      posted: 0,
      pendingApproval: 0,
      rejected: 0,
      archived: 0,
    };
  }
  
  const analytics = jobs.reduce(
    (acc, job) => {
      acc.total += 1;
      const key = (job.status || '').toLowerCase();
      if (key === 'active') acc.active += 1;
      if (key === 'posted') acc.posted += 1;
      // Only count draft and in_review as pending approval (accepted jobs are no longer pending)
      if (key === 'draft' || key === 'in_review') acc.pendingApproval += 1;
      if (key === 'rejected') acc.rejected += 1;
      if (key === 'archived') acc.archived += 1;
      // Note: 'accepted' and 'approved' statuses are not counted in any category
      // They represent jobs that have been approved but not yet posted
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
  
  console.log(`📊 Built analytics from ${jobs.length} jobs:`, analytics);
  return analytics;
}

export function subscribeJobsWithDetails(onChange, filters = {}) {
  // For now, always use mock data to ensure the page displays properly
  // TODO: When backend is fully ready, switch to real API calls
  const fetchJobs = () => {
    // If USE_MOCK_DATA is true, skip API and use mock data directly
    if (USE_MOCK_DATA) {
      console.log('🎭 Using mock data (USE_MOCK_DATA flag is enabled)');
      const filtered = applyFilters(mockJobs, filters);
      const snapshotMeta = {
        total: mockJobs.length,
        filtered: filtered.length,
        lastUpdated: new Date().toISOString(),
      };
      onChange(filtered, snapshotMeta);
      return;
    }
    
    try {
      // Try to fetch real jobs from API first
      const fetchRealJobs = async () => {
        try {
          // Don't filter by status in API - fetch all jobs and filter client-side
          // This ensures we get all jobs including IN_REVIEW ones
          const params = {
            limit: filters.limit || 1000, // Fetch all jobs to ensure we don't miss any
          };
          
          // Only add non-status filters to API params
          if (filters.recruiterId) params.recruiterId = filters.recruiterId;
          
          console.log(`🔍 Calling API with params:`, params);
          const response = await api.getJobs(params);
          console.log(`📥 Raw API Response:`, response);
          
          // Handle different response formats
          let jobs = [];
          if (Array.isArray(response)) {
            jobs = response;
          } else if (response?.jobs && Array.isArray(response.jobs)) {
            jobs = response.jobs;
          } else if (response?.data && Array.isArray(response.data)) {
            jobs = response.data;
          }
          
          // Transform real jobs (even if empty array - this is valid state)
          console.log(`📊 Fetched ${jobs.length} real jobs from API (unfiltered)`);
          console.log(`📊 API Response Details:`, { 
            hasResponse: !!response, 
            responseType: typeof response,
            isArray: Array.isArray(response),
            hasJobs: !!response?.jobs, 
            jobsLength: jobs.length,
            responseKeys: response ? Object.keys(response) : [],
            firstJob: jobs[0] || null,
            pagination: response?.pagination || null
          });
          
          // If API returns 0 jobs, log a warning but don't use mock data
          // (0 jobs is a valid state - there might genuinely be no jobs)
          if (jobs.length === 0) {
            console.warn('⚠️ API returned 0 jobs. This could mean:');
            console.warn('  1. There are no jobs in the database');
            console.warn('  2. All jobs are filtered out by backend filters');
            console.warn('  3. There is an issue with the API query');
            console.warn('  Check backend logs and database to verify.');
          }
          const transformedJobs = jobs.map(job => {
            // Normalize status: convert to lowercase and handle variations
            const rawStatus = job.status || 'DRAFT';
            let normalizedStatus = rawStatus.toLowerCase();
            
            // Handle status variations
            if (normalizedStatus === 'accepted' || normalizedStatus === 'approved') {
              normalizedStatus = 'accepted'; // Standardize to 'accepted'
            }
            
            // Debug: Log status transformation for specific jobs
            if (job.jobTitle && job.jobTitle.toLowerCase().includes('full stack')) {
              console.log(`🔄 Status transformation for "${job.jobTitle}": ${rawStatus} → ${normalizedStatus}`);
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
              companyDetails: job.company ? {
                id: job.company.id,
                name: job.company.name,
                location: job.company.location
              } : null,
              recruiter: job.recruiter ? {
                id: job.recruiter.id,
                name: job.recruiter.user?.displayName || job.recruiter.user?.email,
                email: job.recruiter.user?.email
              } : null,
              recruiterId: job.recruiterId,
              driveDate: job.driveDate,
              applicationDeadline: job.applicationDeadline,
              status: normalizedStatus,
              isActive: job.isPosted || job.status === 'POSTED',
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
            
          // Debug: Log status distribution before filtering
          const statusCounts = transformedJobs.reduce((acc, j) => {
            const status = j.status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {});
          console.log(`📋 Status distribution before filtering:`, statusCounts);
          
          // Debug: Log IN_REVIEW and ACCEPTED jobs before filtering
          const inReviewBeforeFilter = transformedJobs.filter(j => j.status === 'in_review');
          const acceptedBeforeFilter = transformedJobs.filter(j => j.status === 'accepted' || j.status === 'approved');
          console.log(`📋 Found ${inReviewBeforeFilter.length} IN_REVIEW jobs and ${acceptedBeforeFilter.length} ACCEPTED jobs before filtering`);
          
          // Apply client-side filters (including status filter)
          // Use only real jobs - no mock data merging
          const filtered = applyFilters(transformedJobs, filters);
          
          // Debug: Log filtered results
          const inReviewAfterFilter = filtered.filter(j => j.status === 'in_review');
          const acceptedAfterFilter = filtered.filter(j => j.status === 'accepted' || j.status === 'approved');
          console.log(`📋 After filtering: ${filtered.length} total jobs, ${inReviewAfterFilter.length} IN_REVIEW, ${acceptedAfterFilter.length} ACCEPTED`);
            
            const snapshotMeta = {
            total: transformedJobs.length,
              filtered: filtered.length,
              lastUpdated: new Date().toISOString(),
            };
            
            onChange(filtered, snapshotMeta);
            return;
        } catch (error) {
          // Log full error details for debugging
          console.error('❌ API fetch failed, using mock data as fallback:', {
            error: error,
            message: error?.message,
            status: error?.status,
            response: error?.response,
            isNetworkError: error?.isNetworkError,
            endpoint: error?.endpoint,
            url: error?.url,
            stack: error?.stack,
          });
          // Only use mock data when API call itself fails (network error, server error, etc.)
          // Not when API returns 0 jobs (that's a valid state)
        const filtered = applyFilters(mockJobs, filters);
        const snapshotMeta = {
          total: mockJobs.length,
          filtered: filtered.length,
          lastUpdated: new Date().toISOString(),
        };
        onChange(filtered, snapshotMeta);
        }
      };
      
      fetchRealJobs();
    } catch (error) {
      console.error('Error in fetchJobs:', error);
      // Fallback to mock data
      const filtered = applyFilters(mockJobs, filters);
      const snapshotMeta = {
        total: mockJobs.length,
        lastUpdated: new Date().toISOString(),
      };
      onChange(filtered, snapshotMeta);
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
    // If USE_MOCK_DATA is true, use mock data directly
    if (USE_MOCK_DATA) {
      console.log('🎭 Using mock data for analytics (USE_MOCK_DATA flag is enabled)');
      onChange(buildAnalytics(mockJobs));
      return;
    }
    
    try {
      // Try to fetch real jobs for analytics
      console.log('📊 Fetching jobs for analytics...');
      const response = await api.getJobs({ limit: 1000 });
      console.log('📊 Analytics API Response:', response);
      
      // Handle different response formats
      let realJobs = [];
      if (Array.isArray(response)) {
        realJobs = response;
      } else if (response?.jobs && Array.isArray(response.jobs)) {
        realJobs = response.jobs;
      } else if (response?.data && Array.isArray(response.data)) {
        realJobs = response.data;
      }
      
      console.log(`📊 Parsed ${realJobs.length} jobs from API response for analytics`);
      
      // Use only real jobs for analytics - no mock data merging
      // If API returns 0 jobs, that's a valid state (empty analytics)
      const analytics = buildAnalytics(realJobs);
      console.log(`📊 Analytics result:`, analytics);
      onChange(analytics);
    } catch (error) {
      console.error('❌ Failed to fetch jobs for analytics:', {
        error: error,
        message: error?.message,
        status: error?.status,
        response: error?.response,
      });
      // Only use mock data when API call fails (network error, server error, etc.)
      // Not when API returns 0 jobs (that's a valid state)
      onChange(buildAnalytics(mockJobs));
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

export async function approveJob(jobId, user) {
  try {
    // Call real API to approve job
    const response = await api.approveJob(jobId);
    console.log('✅ Job approved via API:', jobId);
    console.log('📋 Approval response:', {
      jobId: response?.job?.id,
      status: response?.job?.status,
      success: response?.success
    });
    
    // Verify the status was updated correctly
    if (response?.job?.status) {
      const status = response.job.status.toLowerCase();
      if (status !== 'accepted' && status !== 'approved') {
        console.warn(`⚠️ Warning: Job status is ${response.job.status}, expected ACCEPTED or APPROVED`);
      } else {
        console.log(`✅ Job status correctly set to: ${response.job.status}`);
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
    // Don't fallback to mock data - let the UI show the real error
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
    // Don't fallback to mock data - let the UI show the real error
    throw error;
  }
}

export async function archiveJob(jobId) {
  const job = mockJobs.find((item) => item.id === jobId);
  if (job) {
    job.status = 'archived';
    job.isActive = false;
    broadcastJobs();
  }
  return { success: Boolean(job), jobId };
}

export async function getJobWithDetails(jobId) {
  return mockJobs.find((job) => job.id === jobId) || null;
}

export async function getCompaniesForDropdown() {
  return COMPANY_DIRECTORY.map((company) => ({
    id: company.id,
    name: company.name,
  }));
}

export async function getRecruitersForDropdown() {
  return RECRUITERS.map((recruiter) => ({
    id: recruiter.id,
    name: recruiter.name,
  }));
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
    
    // Fallback to mock data only if USE_MOCK_DATA is enabled
    if (USE_MOCK_DATA) {
      console.warn('⚠️ Using mock data for auto-archive (USE_MOCK_DATA flag is enabled)');
      const now = new Date();
      let archived = 0;

      mockJobs.forEach((job) => {
        if (
          (job.status === 'active' || job.status === 'posted') &&
          job.applicationDeadline &&
          new Date(job.applicationDeadline) < now
        ) {
          job.status = 'archived';
          job.isActive = false;
          archived += 1;
        }
      });

      if (archived > 0) {
        broadcastJobs();
      }

      return { success: true, successful: archived, archived };
    }
    
    // Re-throw the error if not using mock data
    throw error;
  }
}
