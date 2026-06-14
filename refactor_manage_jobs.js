const fs = require('fs');
const file = 'frontend/src/components/dashboard/admin/ManageJobs.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add api import if missing
if (!content.includes(`import api from `)) {
  content = content.replace(
    /import \{ deleteJob,/,
    `import api from '../../../services/api';\nimport { deleteJob,`
  );
}

// 2. Add pagination states
content = content.replace(
  /const \[jobsPage, setJobsPage\] = useState\(1\);\n\s*const JOBS_PER_PAGE = 10;/,
  `const [jobsPage, setJobsPage] = useState(1);\n  const [totalPages, setTotalPages] = useState(1);\n  const [totalJobs, setTotalJobs] = useState(0);\n  const JOBS_PER_PAGE = 50;`
);

// 3. Replace real-time subscription with loadJobs
const loadJobsLogic = `
  const loadJobs = async () => {
    try {
      setLoading(true);
      const params = {
        limit: JOBS_PER_PAGE,
        page: jobsPage
      };
      
      if (activeFilter === 'in_review') {
        params.status = 'IN_REVIEW';
      } else {
        // posted
        params.status = 'POSTED';
        params.isPosted = true;
      }
      
      const response = await api.getJobs(params);
      const jobsList = response.jobs || [];
      const pagination = response.pagination || { total: 0, totalPages: 1 };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Jobs loaded:', jobsList.length, 'Total:', pagination.total);
      }
      
      setJobs(jobsList);
      setTotalJobs(pagination.total);
      setTotalPages(pagination.totalPages || 1);

      // Load existing selections from database for posted jobs
      const schoolSelections = {};
      const batchSelections = {};
      const centerSelections = {};

      jobsList.forEach(job => {
        if (job.status === 'POSTED' || job.isPosted === true) {
          if (job.targetSchools) schoolSelections[job.id] = job.targetSchools;
          if (job.targetBatches) batchSelections[job.id] = job.targetBatches;
          if (job.targetCenters) centerSelections[job.id] = job.targetCenters;
        }
      });

      if (Object.keys(schoolSelections).length > 0) setSelectedSchools(prev => ({ ...prev, ...schoolSelections }));
      if (Object.keys(batchSelections).length > 0) setSelectedBatches(prev => ({ ...prev, ...batchSelections }));
      if (Object.keys(centerSelections).length > 0) setSelectedCenters(prev => ({ ...prev, ...centerSelections }));
      
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [jobsPage, activeFilter]);
`;

// Replace jobsSubscriptionRef and its useEffect
content = content.replace(
  /\/\/ Real-time jobs subscription[\s\S]*?\/\/ Listen for custom events to trigger refresh/g,
  `${loadJobsLogic}\n\n  // Listen for custom events to trigger refresh`
);

// Fix event listener to use loadJobs instead of jobsSubscriptionRef
content = content.replace(
  /if \(jobsSubscriptionRef\.current\?\.refresh\) \{[\s\S]*?\}/,
  `console.log('🔄 Triggering ManageJobs refresh from event');\n      loadJobs();`
);

// Fix handlePostJob refresh
content = content.replace(
  /if \(jobsSubscriptionRef\.current\?\.refresh\) \{\n\s*jobsSubscriptionRef\.current\.refresh\(\);\n\s*\}/g,
  `loadJobs();`
);

// 4. Update getSortedJobs to just return jobs directly, since the DB already filters and sorts
// The frontend used to do: const getSortedJobs = () => { ... }
// We can just replace calls to getSortedJobs() with jobs.
content = content.replace(
  /const getSortedJobs = \(\) => \{[\s\S]*?\};\n\n  \/\/ Check if job can be posted/,
  `// Check if job can be posted`
);

// In the render:
content = content.replace(
  /const paginatedJobs = getSortedJobs\(\)\.slice\(\(jobsPage - 1\) \* JOBS_PER_PAGE, jobsPage \* JOBS_PER_PAGE\);/g,
  `const paginatedJobs = jobs; // Server handles pagination mapped to 'jobs'`
);
content = content.replace(
  /getSortedJobs\(\)\.length/g,
  `totalJobs`
);

// 5. Cleanup the stats count logic since all jobs are not in memory
content = content.replace(
  /const allManageJobs = jobs\.filter\(job => shouldShowInManageJobs\(job\)\);\n\s*const inReviewCount = [^;]+;\n\s*const postedCount = [^;]+;/g,
  `const inReviewCount = activeFilter === 'in_review' ? totalJobs : '?';\n  const postedCount = activeFilter === 'posted' ? totalJobs : '?';`
);

// Add missing deleteJob success trigger to loadJobs()
content = content.replace(
  /console\.log\('🗑️ Job deleted successfully:', jobId\);/,
  `console.log('🗑️ Job deleted successfully:', jobId);\n      loadJobs();`
);

fs.writeFileSync(file, content);
console.log('ManageJobs refactoring complete.');
