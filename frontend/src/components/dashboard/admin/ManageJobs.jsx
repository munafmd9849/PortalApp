import React, { useEffect, useState, useRef } from 'react';
import { deleteJob, subscribeJobs, postJob, updateJob } from '../../../services/jobs';
import { Loader, Trash2, Share2, Building2, Calendar, GraduationCap, View, Users, Briefcase, ChevronDown, CheckCircle, Clock, PlayCircle, CheckSquare, XCircle, AlertTriangle, MapPin, Edit } from 'lucide-react';
import { useToast } from '../../ui/Toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

export default function ManageJobs() {
  const { user, role } = useAuth();
  const location = useLocation();
  const base = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';

  // MANDATORY: Role-based access control - Block STUDENT users immediately
  useEffect(() => {
    const userRole = role?.toUpperCase() || user?.role?.toUpperCase() || '';
    const isStudent = userRole === 'STUDENT';
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const isRecruiter = userRole === 'RECRUITER';

    if (isStudent) {
      console.error('🚫 STUDENT user attempted to access ManageJobs component:', {
        userRole,
        userId: user?.id,
        email: user?.email,
        timestamp: new Date().toISOString(),
      });
      // Redirect to student dashboard
      window.location.href = '/student';
    }
  }, [user, role]);

  // Don't render if user is STUDENT
  const userRole = role?.toUpperCase() || user?.role?.toUpperCase() || '';
  const isStudent = userRole === 'STUDENT';
  if (isStudent) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-red-200">
        <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600">You do not have permission to access this resource. Only ADMIN and RECRUITER users can manage jobs.</p>
      </div>
    );
  }
  const toast = useToast();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postingJobs, setPostingJobs] = useState(new Set());

  // Edit dates modal state (for POSTED jobs)
  const [editingDatesJobId, setEditingDatesJobId] = useState(null);
  const [editDatesForm, setEditDatesForm] = useState({
    applicationDeadline: null,
    driveDate: null
  });
  const [savingDates, setSavingDates] = useState(false);

  const [showSchools, setShowSchools] = useState({});
  const [showBatches, setShowBatches] = useState({});
  const [showCenters, setShowCenters] = useState({});
  const [selectedSchools, setSelectedSchools] = useState({});
  const [selectedBatches, setSelectedBatches] = useState({});
  const [selectedCenters, setSelectedCenters] = useState({});
  const [activeFilter, setActiveFilter] = useState('in_review'); // Default to in_review to show jobs pending approval
  const [jobsPage, setJobsPage] = useState(1);
  const JOBS_PER_PAGE = 10;

  // Reset to page 1 when filter changes
  useEffect(() => {
    setJobsPage(1);
  }, [activeFilter]);

  // Filter options state
  const [schoolOptions, setSchoolOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);
  const [centerOptions, setCenterOptions] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const schoolDropdownRefs = useRef({});
  const batchDropdownRefs = useRef({});
  const centerDropdownRefs = useRef({});

  // Load predefined filter options (no database fetching to avoid duplicates)
  useEffect(() => {
    const loadFilterOptions = () => {
      try {
        setLoadingFilters(true);

        // Use only predefined options (no database fetching)
        const schoolOptionsArray = [
          { id: 'ALL', display: 'All', storage: 'ALL' },
          { id: 'SOT', display: 'SOT', storage: 'SOT' },
          { id: 'SOM', display: 'SOM', storage: 'SOM' },
          { id: 'SOH', display: 'SOH', storage: 'SOH' }
        ];

        const batchOptionsArray = [
          { id: 'ALL', display: 'All', storage: 'ALL' },
          { id: '23-27', display: '23-27', storage: '23-27' },
          { id: '24-28', display: '24-28', storage: '24-28' },
          { id: '25-29', display: '25-29', storage: '25-29' },
          { id: '26-30', display: '26-30', storage: '26-30' }
        ];

        const centerOptionsArray = [
          { id: 'ALL', display: 'All Centers', storage: 'ALL' },
          { id: 'BANGALORE', display: 'Bangalore', storage: 'BANGALORE' },
          { id: 'NOIDA', display: 'Noida', storage: 'NOIDA' },
          { id: 'LUCKNOW', display: 'Lucknow', storage: 'LUCKNOW' },
          { id: 'PUNE', display: 'Pune', storage: 'PUNE' },
          { id: 'PATNA', display: 'Patna', storage: 'PATNA' },
          { id: 'INDORE', display: 'Indore', storage: 'INDORE' }
        ];

        setSchoolOptions(schoolOptionsArray);
        setBatchOptions(batchOptionsArray);
        setCenterOptions(centerOptionsArray);

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ ManageJobs filter options loaded (predefined only)');
        }

      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilterOptions();
  }, []);

  // Helper functions for display name conversion
  const getSchoolDisplay = (storageCode) => {
    const option = schoolOptions.find(s => s.storage === storageCode);
    return option ? option.display : storageCode;
  };

  const getBatchDisplay = (storageCode) => {
    const option = batchOptions.find(b => b.storage === storageCode);
    return option ? option.display : storageCode;
  };

  const getCenterDisplay = (storageCode) => {
    const option = centerOptions.find(c => c.storage === storageCode);
    return option ? option.display : storageCode;
  };

  // Real-time jobs subscription with refresh capability
  const jobsSubscriptionRef = useRef(null);

  useEffect(() => {
    setLoading(true);

    const subscription = subscribeJobs((jobsList) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Real-time update - Jobs received:', jobsList.length);
      }
      setJobs(jobsList);

      // Load existing selections from database for posted jobs
      const schoolSelections = {};
      const batchSelections = {};
      const centerSelections = {};

      jobsList.forEach(job => {
        if (isJobPosted(job) && job.targetSchools) {
          schoolSelections[job.id] = job.targetSchools;
        }
        if (isJobPosted(job) && job.targetBatches) {
          batchSelections[job.id] = job.targetBatches;
        }
        if (isJobPosted(job) && job.targetCenters) {
          centerSelections[job.id] = job.targetCenters;
        }
      });

      // Update selections state with database data
      if (Object.keys(schoolSelections).length > 0) {
        setSelectedSchools(prev => ({ ...prev, ...schoolSelections }));
      }
      if (Object.keys(batchSelections).length > 0) {
        setSelectedBatches(prev => ({ ...prev, ...batchSelections }));
      }
      if (Object.keys(centerSelections).length > 0) {
        setSelectedCenters(prev => ({ ...prev, ...centerSelections }));
      }

      setLoading(false);
    });

    // Store subscription for manual refresh
    jobsSubscriptionRef.current = subscription;

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      } else if (typeof subscription === 'function') {
        subscription(); // Backward compatibility
      }
      jobsSubscriptionRef.current = null;
    };
  }, []);

  // Listen for custom events to trigger refresh (from JobPostingsManager)
  useEffect(() => {
    const handleJobsRefresh = (event) => {
      const { action, jobId, jobTitle } = event.detail || {};
      console.log(`📢 ManageJobs received jobsRefresh event: ${action} for job ${jobId} (${jobTitle})`);

      // Trigger immediate refresh
      if (jobsSubscriptionRef.current?.refresh) {
        console.log('🔄 Triggering ManageJobs refresh from event');
        jobsSubscriptionRef.current.refresh();
      }
    };

    window.addEventListener('jobsRefresh', handleJobsRefresh);

    return () => {
      window.removeEventListener('jobsRefresh', handleJobsRefresh);
    };
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(showSchools).forEach(jobId => {
        if (showSchools[jobId] && schoolDropdownRefs.current[jobId] &&
          !schoolDropdownRefs.current[jobId].contains(event.target)) {
          setShowSchools(prev => ({ ...prev, [jobId]: false }));
        }
      });

      Object.keys(showBatches).forEach(jobId => {
        if (showBatches[jobId] && batchDropdownRefs.current[jobId] &&
          !batchDropdownRefs.current[jobId].contains(event.target)) {
          setShowBatches(prev => ({ ...prev, [jobId]: false }));
        }
      });

      Object.keys(showCenters).forEach(jobId => {
        if (showCenters[jobId] && centerDropdownRefs.current[jobId] &&
          !centerDropdownRefs.current[jobId].contains(event.target)) {
          setShowCenters(prev => ({ ...prev, [jobId]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSchools, showBatches, showCenters]);

  // Check if job should appear in Manage Jobs
  // Show both IN_REVIEW and POSTED jobs (exclude REJECTED and DRAFT)
  const shouldShowInManageJobs = (job) => {
    const status = (job.status || '').toLowerCase();

    // Exclude REJECTED and DRAFT jobs
    if (status === 'rejected' || status === 'draft') {
      return false;
    }

    // Include IN_REVIEW and POSTED jobs
    return status === 'in_review' || status === 'posted';
  };

  // Check if job is posted (visible to students)
  const isJobPosted = (job) => {
    const status = (job.status || '').toLowerCase();
    // Return true only for POSTED jobs
    // APPROVED jobs are not posted yet (they're not visible to students)
    return status === 'posted' && (job.isPosted === true || job.posted === true);
  };

  // Get intelligent job status based on interview date and admin status
  const getJobStatus = (job) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for admin-set status first
    if (job.adminStatus) {
      switch (job.adminStatus.toLowerCase()) {
        case 'cancelled':
        case 'canceled':
          return {
            text: 'Cancelled',
            color: 'bg-red-100 text-red-800',
            icon: <XCircle className="w-3 h-3" />
          };
        case 'blocked':
          return {
            text: 'Blocked',
            color: 'bg-red-100 text-red-800',
            icon: <XCircle className="w-3 h-3" />
          };
        case 'postponed':
          return {
            text: 'Postponed',
            color: 'bg-yellow-100 text-yellow-800',
            icon: <AlertTriangle className="w-3 h-3" />
          };
        case 'rescheduled':
          return {
            text: 'Rescheduled',
            color: 'bg-blue-100 text-blue-800',
            icon: <Clock className="w-3 h-3" />
          };
        case 'completed':
        case 'finished':
          return {
            text: 'Completed',
            color: 'bg-green-100 text-green-800',
            icon: <CheckSquare className="w-3 h-3" />
          };
        case 'in_progress':
        case 'ongoing':
          return {
            text: 'In Progress',
            color: 'bg-purple-100 text-purple-800',
            icon: <PlayCircle className="w-3 h-3" />
          };
        case 'results_declared':
          return {
            text: 'Results Out',
            color: 'bg-indigo-100 text-indigo-800',
            icon: <CheckSquare className="w-3 h-3" />
          };
      }
    }

    // If no interview date, return posted status
    if (!job.driveDate) {
      return {
        text: 'Posted',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-3 h-3" />
      };
    }

    // Get interview date
    let interviewDate;
    if (job.driveDate.toDate) {
      interviewDate = job.driveDate.toDate();
    } else {
      interviewDate = new Date(job.driveDate);
    }
    interviewDate.setHours(0, 0, 0, 0);

    const timeDiff = interviewDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Status based on interview date
    if (daysDiff > 7) {
      return {
        text: 'Upcoming',
        color: 'bg-blue-100 text-blue-800',
        icon: <Clock className="w-3 h-3" />
      };
    } else if (daysDiff > 3) {
      return {
        text: 'This Week',
        color: 'bg-orange-100 text-orange-800',
        icon: <Calendar className="w-3 h-3" />
      };
    } else if (daysDiff > 0) {
      return {
        text: `${daysDiff} Day${daysDiff > 1 ? 's' : ''} Left`,
        color: 'bg-red-100 text-red-800',
        icon: <AlertTriangle className="w-3 h-3" />
      };
    } else if (daysDiff === 0) {
      return {
        text: 'Today',
        color: 'bg-purple-100 text-purple-800',
        icon: <PlayCircle className="w-3 h-3" />
      };
    } else if (daysDiff >= -3) {
      // Interview happened 1-3 days ago
      return {
        text: 'Recently Held',
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="w-3 h-3" />
      };
    } else if (daysDiff >= -7) {
      // Interview happened 4-7 days ago
      return {
        text: 'Awaiting Results',
        color: 'bg-indigo-100 text-indigo-800',
        icon: <Clock className="w-3 h-3" />
      };
    } else {
      // Interview happened more than 7 days ago
      return {
        text: 'Interview Done',
        color: 'bg-gray-100 text-gray-800',
        icon: <CheckSquare className="w-3 h-3" />
      };
    }
  };

  // Database-driven sorting and categorization
  const getSortedJobs = () => {
    // Debug: Log all jobs and their statuses
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 All jobs in ManageJobs:', jobs.map(j => ({
        id: j.id,
        title: j.jobTitle,
        status: j.status,
        statusLower: (j.status || '').toLowerCase(),
        isPosted: j.isPosted,
        posted: j.posted
      })));
    }

    // First, filter out jobs that shouldn't appear in Manage Jobs at all
    // Only show ACCEPTED, POSTED, and ACTIVE jobs (exclude IN_REVIEW, DRAFT, REJECTED)
    const manageJobsOnly = jobs.filter(job => shouldShowInManageJobs(job));

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Jobs that should appear in Manage Jobs:', manageJobsOnly.map(j => ({
        id: j.id,
        title: j.jobTitle,
        status: j.status,
        statusLower: (j.status || '').toLowerCase()
      })));
    }

    // Filter based on active filter (in_review vs posted)
    let filteredJobs;
    if (activeFilter === 'in_review') {
      // Show IN_REVIEW jobs (pending admin approval)
      filteredJobs = manageJobsOnly.filter(job => {
        const status = (job.status || '').toLowerCase();
        return status === 'in_review';
      });
    } else {
      // Show POSTED jobs (approved and visible to students)
      filteredJobs = manageJobsOnly.filter(job => isJobPosted(job));
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🗂️ Manage Jobs Filter:', {
        totalJobs: jobs.length,
        manageJobsOnly: manageJobsOnly.length,
        activeFilter: activeFilter,
        filteredCount: filteredJobs.length,
        statusBreakdown: manageJobsOnly.reduce((acc, j) => {
          const status = (j.status || '').toLowerCase();
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}),
        filteredJobs: filteredJobs.map(j => ({ id: j.id, title: j.jobTitle, status: j.status }))
      });
    }

    // Sort based on filter
    if (activeFilter === 'in_review') {
      // Sort IN_REVIEW jobs by creation/submission time (newest first)
      return filteredJobs.sort((a, b) => {
        const getTimestamp = (job) => {
          if (job.submittedAt?.toDate) return job.submittedAt.toDate();
          if (job.createdAt?.toDate) return job.createdAt.toDate();
          if (job.timestamp?.toDate) return job.timestamp.toDate();
          return new Date(job.submittedAt || job.createdAt || job.timestamp || 0);
        };
        return getTimestamp(b) - getTimestamp(a);
      });
    } else {
      // Sort POSTED jobs by posted time (latest posted first)
      return filteredJobs.sort((a, b) => {
        const getPostedTimestamp = (job) => {
          if (job.postedAt?.toDate) return job.postedAt.toDate();
          return new Date(job.postedAt || 0);
        };
        const postedTimeA = getPostedTimestamp(a);
        const postedTimeB = getPostedTimestamp(b);

        if (postedTimeA && postedTimeB) {
          return postedTimeB - postedTimeA; // Latest posted first
        }
        // Fallback to creation time
        const getTimestamp = (job) => {
          if (job.createdAt?.toDate) return job.createdAt.toDate();
          if (job.timestamp?.toDate) return job.timestamp.toDate();
          return new Date(job.createdAt || job.timestamp || 0);
        };
        return getTimestamp(b) - getTimestamp(a);
      });
    }
  };

  // Check if job can be posted
  const canPostJob = (job) => {
    const isAlreadyPosted = isJobPosted(job);
    const hasSchoolSelection = selectedSchools[job.id]?.length > 0;
    const hasBatchSelection = selectedBatches[job.id]?.length > 0;
    const hasCenterSelection = selectedCenters[job.id]?.length > 0;

    return !isAlreadyPosted && hasSchoolSelection && hasBatchSelection && hasCenterSelection;
  };

  // Get posted job display text
  const getPostedJobDisplay = (jobId) => {
    const schools = selectedSchools[jobId] || [];
    const batches = selectedBatches[jobId] || [];
    const centers = selectedCenters[jobId] || [];

    // Convert storage codes to display names
    const schoolText = schools.length === 1 ? getSchoolDisplay(schools[0]) :
      schools.length > 1 ? `${schools.length} Schools` : '';
    const batchText = batches.length === 1 ? getBatchDisplay(batches[0]) :
      batches.length > 1 ? `${batches.length} Batches` : '';
    const centerText = centers.length === 1 ? getCenterDisplay(centers[0]) :
      centers.length > 1 ? `${centers.length} Centers` : '';

    return `Posted: ${schoolText}, ${batchText}, ${centerText}`;
  };

  // Database-integrated post job handler
  const handlePostJob = async (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job || postingJobs.has(jobId) || !canPostJob(job)) return;

    try {
      setPostingJobs(prev => new Set([...prev, jobId]));

      const postData = {
        selectedSchools: selectedSchools[jobId] || [],
        selectedBatches: selectedBatches[jobId] || [],
        selectedCenters: selectedCenters[jobId] || [],
        postedBy: 'admin',
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 Posting job to database:', jobId, postData);
      }
      const result = await postJob(jobId, postData);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Job posted successfully:', jobId);
      }

      // Show success message
      toast.success(
        `Job "${job.jobTitle}" posted successfully!`,
        `The job has been posted and students matching the criteria will receive email notifications.`
      );

      // Refresh jobs list to show updated status
      if (jobsSubscriptionRef.current?.refresh) {
        jobsSubscriptionRef.current.refresh();
      }

    } catch (err) {
      console.error('❌ Failed to post job:', err);

      let errorMessage = 'Failed to post job';
      if (err?.response?.error) {
        errorMessage = err.response.error;
      } else if (err?.response?.message) {
        errorMessage = err.response.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.code) {
        switch (err.code) {
          case 'permission-denied':
            errorMessage = 'You do not have permission to post this job';
            break;
          case 'not-found':
            errorMessage = 'Job not found';
            break;
          case 'unavailable':
            errorMessage = 'Service temporarily unavailable. Please try again';
            break;
          default:
            errorMessage = err.message || 'Failed to post job';
        }
      }

      toast.error(
        'Failed to Post Job',
        errorMessage
      );

    } finally {
      setPostingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  // Share job handler
  const handleShare = (job) => {
    const jobUrl = `${window.location.origin}/jobs/${job.id}`;
    const shareText = `Check out this job opportunity: ${job.jobTitle} at ${job.company?.name || job.companyName || job.company || 'Company'}`;

    if (navigator.share) {
      navigator.share({
        title: job.jobTitle,
        text: shareText,
        url: jobUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${shareText}\n${jobUrl}`)
        .then(() => alert('Job link copied to clipboard!'))
        .catch(() => {
          const textArea = document.createElement('textarea');
          textArea.value = `${shareText}\n${jobUrl}`;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert('Job link copied to clipboard!');
        });
    }
  };

  // Delete job handler using your existing service
  const handleDelete = async (jobId) => {
    if (!jobId) return;
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) return;

    try {
      await deleteJob(jobId);
      if (process.env.NODE_ENV === 'development') {
        console.log('🗑️ Job deleted successfully:', jobId);
      }
    } catch (e) {
      console.error('❌ Failed to delete job:', e);
      alert('Failed to delete job: ' + (e?.message || 'Unknown error'));
    }
  };

  // Smart dropdown logic with auto "All" selection
  const toggleSchool = (jobId, school) => {
    setSelectedSchools(prev => {
      const jobSchools = new Set(prev[jobId] || []);
      const allIndividualSchools = schoolOptions.filter(s => s.id !== 'ALL').map(s => s.storage);

      if (school === 'ALL') {
        if (jobSchools.has('ALL')) {
          jobSchools.delete('ALL');
        } else {
          jobSchools.clear();
          jobSchools.add('ALL');
        }
      } else {
        if (jobSchools.has('ALL')) {
          jobSchools.delete('ALL');
          jobSchools.add(school);
        } else {
          if (jobSchools.has(school)) {
            jobSchools.delete(school);
          } else {
            jobSchools.add(school);
          }
        }

        // Auto-convert to "ALL" if all individual schools selected
        const selectedIndividualSchools = Array.from(jobSchools).filter(s => s !== 'ALL');
        if (selectedIndividualSchools.length === allIndividualSchools.length) {
          jobSchools.clear();
          jobSchools.add('ALL');
        }
      }

      return { ...prev, [jobId]: Array.from(jobSchools) };
    });
  };

  const toggleBatch = (jobId, batch) => {
    setSelectedBatches(prev => {
      const jobBatches = new Set(prev[jobId] || []);
      const allIndividualBatches = batchOptions.filter(b => b.id !== 'ALL').map(b => b.storage);

      if (batch === 'ALL') {
        if (jobBatches.has('ALL')) {
          jobBatches.delete('ALL');
        } else {
          jobBatches.clear();
          jobBatches.add('ALL');
        }
      } else {
        if (jobBatches.has('ALL')) {
          jobBatches.delete('ALL');
          jobBatches.add(batch);
        } else {
          if (jobBatches.has(batch)) {
            jobBatches.delete(batch);
          } else {
            jobBatches.add(batch);
          }
        }

        // Auto-convert to "ALL" if all individual batches selected
        const selectedIndividualBatches = Array.from(jobBatches).filter(b => b !== 'ALL');
        if (selectedIndividualBatches.length === allIndividualBatches.length) {
          jobBatches.clear();
          jobBatches.add('ALL');
        }
      }

      return { ...prev, [jobId]: Array.from(jobBatches) };
    });
  };

  const toggleSchoolDropdown = (jobId) => {
    setShowSchools(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const toggleBatchDropdown = (jobId) => {
    setShowBatches(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const toggleCenterDropdown = (jobId) => {
    setShowCenters(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const toggleCenter = (jobId, center) => {
    setSelectedCenters(prev => {
      const jobCenters = new Set(prev[jobId] || []);
      const allIndividualCenters = centerOptions.filter(c => c.id !== 'ALL').map(c => c.storage);

      if (center === 'ALL') {
        if (jobCenters.has('ALL')) {
          jobCenters.delete('ALL');
        } else {
          jobCenters.clear();
          jobCenters.add('ALL');
        }
      } else {
        if (jobCenters.has('ALL')) {
          jobCenters.delete('ALL');
          jobCenters.add(center);
        } else {
          if (jobCenters.has(center)) {
            jobCenters.delete(center);
          } else {
            jobCenters.add(center);
          }
        }

        // Auto-convert to "ALL" if all individual centers selected
        const selectedIndividualCenters = Array.from(jobCenters).filter(c => c !== 'ALL');
        if (selectedIndividualCenters.length === allIndividualCenters.length) {
          jobCenters.clear();
          jobCenters.add('ALL');
        }
      }

      return { ...prev, [jobId]: Array.from(jobCenters) };
    });
  };

  // Get statistics - calculate from all jobs
  const allManageJobs = jobs.filter(job => shouldShowInManageJobs(job));
  const inReviewCount = allManageJobs.filter(job => {
    const status = (job.status || '').toLowerCase();
    return status === 'in_review';
  }).length;
  const postedCount = allManageJobs.filter(job => isJobPosted(job)).length;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 overflow-x-hidden">
      {/* Header with Statistics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Manage & Post Jobs</h2>
          <p className="text-sm text-slate-600 mt-1">
            Select target schools and batches, then post jobs to students
          </p>
        </div>
      </div>

      {/* Filter Buttons - Show both IN_REVIEW and POSTED sections */}
      <div className="flex justify-center mb-4 sm:mb-6">
        <div className="bg-white rounded-lg p-1 shadow-sm border border-slate-200 inline-flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setActiveFilter('in_review')}
            className={`px-4 sm:px-6 py-2 rounded-md font-medium transition-all duration-200 touch-manipulation ${activeFilter === 'in_review'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-800'
              }`}
          >
            In Review ({inReviewCount})
          </button>
          <button
            onClick={() => setActiveFilter('posted')}
            className={`px-4 sm:px-6 py-2 rounded-md font-medium transition-all duration-200 touch-manipulation ${activeFilter === 'posted'
              ? 'bg-green-500 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-800'
              }`}
          >
            Posted ({postedCount})
          </button>
        </div>
      </div>

      {/* Jobs list */}
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold">
            {activeFilter === 'in_review' ? 'Jobs In Review' : 'Posted Jobs'} ({getSortedJobs().length})
          </h3>
          {loading && (
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader className="w-4 h-4 animate-spin" /> Loading jobs...
            </div>
          )}
        </div>

        <div className="divide-y py-4">
          {getSortedJobs().length === 0 && !loading && (
            <div className="p-6 text-center">
              <div className="text-slate-500 text-sm">
                No posted jobs available yet.
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {activeFilter === 'in_review'
                  ? 'Jobs pending admin approval will appear here. Click "Approve" to post them to students.'
                  : 'Posted jobs will appear here once they are approved and posted.'}
              </div>
            </div>
          )}

          {(() => {
            const allJobs = getSortedJobs();
            const totalJobs = allJobs.length;
            const totalPages = Math.max(1, Math.ceil(totalJobs / JOBS_PER_PAGE));
            const currentPage = Math.min(Math.max(1, jobsPage), totalPages);
            const start = (currentPage - 1) * JOBS_PER_PAGE;
            const paginatedJobs = allJobs.slice(start, start + JOBS_PER_PAGE);

            return (
              <>
                {paginatedJobs.map((job, index) => {
                  const jobStatus = isJobPosted(job) ? getJobStatus(job) : null;

                  return (
                    <div key={job.id} className={`relative border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 mb-4 mx-2 sm:mx-4 ${isJobPosted(job) ? 'bg-green-50' : 'bg-blue-50'
                      }`}>
                      <div className="p-3 sm:p-4">
                        {/* First Row: Company, Interview Date, School, Batch, Center - stack on mobile */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                          {/* Company - STATUS BADGE BACK HERE */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-2 -mt-2">
                              <Building2 className="w-4 h-4 text-slate-500" />
                              <span className="text-sm font-medium text-slate-600">Company</span>
                              {/* STATUS BADGE NEXT TO COMPANY SECTION */}
                              {jobStatus && (
                                <span className={`px-2 py-1 text-xs rounded-md border border-gray-600 flex items-center gap-2 ${jobStatus.color}`}>
                                  {jobStatus.icon}
                                  {jobStatus.text}
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-slate-900 text-lg sm:text-xl truncate md:ml-[5%]">
                              {job.company?.name || job.companyName || job.company || 'N/A'}
                            </div>
                          </div>

                          {/* Interview Date - full width on mobile */}
                          <div className="w-full md:w-28 shrink-0">
                            <div className="flex items-center justify-center gap-2 mb-2 -mt-2">
                              <span className="text-sm font-medium text-slate-600">Interview</span>
                            </div>
                            <div className="text-slate-900 text-sm text-center">
                              {job.driveDate ? (
                                job.driveDate.toDate ?
                                  job.driveDate.toDate().toLocaleDateString('en-GB') :
                                  new Date(job.driveDate).toLocaleDateString('en-GB')
                              ) : 'TBD'}
                            </div>
                          </div>

                          {/* Dropdowns group: School, Batch, Center - stack on mobile */}
                          <div className="flex flex-col sm:flex-row items-stretch gap-2 md:gap-1 md:shrink-0">
                            {/* School - full width on mobile */}
                            <div className="w-full sm:w-40 shrink-0 min-w-0 sm:min-w-[10rem]">
                              <div className="flex justify-center -translate-x-2 items-center gap-2 mb-1">
                                <GraduationCap className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-medium text-slate-600">School</span>
                              </div>
                              <div className="relative w-full" ref={el => schoolDropdownRefs.current[job.id] = el}>
                                {isJobPosted(job) ? (
                                  <div className={`w-full min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-left ${selectedSchools[job.id]?.length ? 'bg-green-100' : 'bg-slate-50'} text-slate-700`}>
                                    <span className="truncate block">
                                      {selectedSchools[job.id]?.length ? selectedSchools[job.id].map(code => getSchoolDisplay(code)).join(', ') : '—'}
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className={`w-full min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-left flex items-center justify-between gap-1 ${selectedSchools[job.id]?.length ? 'bg-green-100' : 'bg-blue-100'
                                        }`}
                                      onClick={() => toggleSchoolDropdown(job.id)}
                                    >
                                      <span className="truncate min-w-0">
                                        {selectedSchools[job.id]?.length ? selectedSchools[job.id].map(code => getSchoolDisplay(code)).join(', ') : 'Select Schools'}
                                      </span>
                                      <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                    </button>
                                    {showSchools[job.id] && (
                                      <div className="absolute z-10 overflow-hidden w-full bg-white border-2 border-slate-300 rounded-md shadow-lg">
                                        {schoolOptions.map((school) => (
                                          <label key={school.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-200 last:border-b-0">
                                            <input
                                              type="checkbox"
                                              checked={selectedSchools[job.id]?.includes(school.storage) || false}
                                              onChange={() => toggleSchool(job.id, school.storage)}
                                            />
                                            <span>{school.display}</span>
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Batch - full width on mobile */}
                            <div className="w-full sm:w-40 shrink-0 min-w-0 sm:min-w-[10rem]">
                              <div className="flex justify-center -translate-x-2 items-center gap-2 mb-1">
                                <Users className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-medium text-slate-600">Batch</span>
                              </div>
                              <div className="relative w-full" ref={el => batchDropdownRefs.current[job.id] = el}>
                                {isJobPosted(job) ? (
                                  <div className={`w-full min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-left ${selectedBatches[job.id]?.length ? 'bg-green-100' : 'bg-slate-50'} text-slate-700`}>
                                    <span className="truncate block">
                                      {selectedBatches[job.id]?.length ? selectedBatches[job.id].map(code => getBatchDisplay(code)).join(', ') : '—'}
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className={`w-full min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-left flex items-center justify-between gap-1 ${selectedBatches[job.id]?.length ? 'bg-green-100' : 'bg-blue-100'
                                        }`}
                                      onClick={() => toggleBatchDropdown(job.id)}
                                    >
                                      <span className="truncate min-w-0">
                                        {selectedBatches[job.id]?.length ? selectedBatches[job.id].map(code => getBatchDisplay(code)).join(', ') : 'Select Batches'}
                                      </span>
                                      <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                    </button>
                                    {showBatches[job.id] && (
                                      <div className="absolute z-10 overflow-hidden w-full bg-white border-2 border-slate-300 rounded-md shadow-lg">
                                        {batchOptions.map((batch) => (
                                          <label key={batch.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-200 last:border-b-0">
                                            <input
                                              type="checkbox"
                                              checked={selectedBatches[job.id]?.includes(batch.storage) || false}
                                              onChange={() => toggleBatch(job.id, batch.storage)}
                                            />
                                            <span>{batch.display}</span>
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Center - full width on mobile */}
                            <div className="w-full sm:w-40 shrink-0 min-w-0 sm:min-w-[10rem]">
                              <div className="flex justify-center -translate-x-2 items-center gap-2 mb-1">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-medium text-slate-600">Center</span>
                              </div>
                              <div className="relative w-full" ref={el => centerDropdownRefs.current[job.id] = el}>
                                {isJobPosted(job) ? (
                                  <div className={`w-full min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-left ${selectedCenters[job.id]?.length ? 'bg-green-100' : 'bg-slate-50'} text-slate-700`}>
                                    <span className="truncate block">
                                      {selectedCenters[job.id]?.length ? selectedCenters[job.id].map(code => getCenterDisplay(code)).join(', ') : '—'}
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className={`w-full min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-left flex items-center justify-between gap-1 ${selectedCenters[job.id]?.length ? 'bg-green-100' : 'bg-blue-100'
                                        }`}
                                      onClick={() => toggleCenterDropdown(job.id)}
                                    >
                                      <span className="truncate min-w-0">
                                        {selectedCenters[job.id]?.length ? selectedCenters[job.id].map(code => getCenterDisplay(code)).join(', ') : 'Select Centers'}
                                      </span>
                                      <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                    </button>
                                    {showCenters[job.id] && (
                                      <div className="absolute z-10 overflow-hidden w-full bg-white border-2 border-slate-300 rounded-md shadow-lg">
                                        {centerOptions.map((center) => (
                                          <label key={center.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-200 last:border-b-0">
                                            <input
                                              type="checkbox"
                                              checked={selectedCenters[job.id]?.includes(center.storage) || false}
                                              onChange={() => toggleCenter(job.id, center.storage)}
                                            />
                                            <span>{center.display}</span>
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Second Row: Role and Actions - stack on mobile */}
                        <div className="mt-2 pt-2 border-t border-slate-300">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <Briefcase className="w-4 h-4 text-slate-500 flex-shrink-0" />
                              <span className="text-sm font-medium text-slate-600">Role:</span>
                              <span className="font-semibold text-slate-900 truncate">{job.jobTitle || 'N/A'}</span>
                            </div>

                            {/* Post, Share and Delete Actions */}
                            <div className="flex flex-wrap items-center gap-2 md:ml-4">
                              {/* Post Action */}
                              <button
                                onClick={() => handlePostJob(job.id)}
                                disabled={!canPostJob(job) || postingJobs.has(job.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 justify-center w-full sm:w-auto sm:min-w-[120px] touch-manipulation ${isJobPosted(job)
                                  ? 'bg-green-500 text-white cursor-not-allowed'
                                  : postingJobs.has(job.id)
                                    ? 'bg-blue-100 text-blue-500 cursor-not-allowed'
                                    : canPostJob(job)
                                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                      : 'bg-blue-200 text-blue-400 cursor-not-allowed'
                                  }`}
                              >
                                {isJobPosted(job) ? (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-xs">{getPostedJobDisplay(job.id)}</span>
                                  </>
                                ) : postingJobs.has(job.id) ? (
                                  <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    <span>Posting...</span>
                                  </>
                                ) : canPostJob(job) ? (
                                  'Post Job'
                                ) : (
                                  'Post Job'
                                )}
                              </button>

                              {/* Edit Button - Show for IN_REVIEW jobs (admin can edit all fields) */}
                              {!isJobPosted(job) && (job.status === 'IN_REVIEW' || job.status === 'in_review') && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Navigate to job detail page - AdminJobDetail handles editing
                                    navigate(`${base}/job/${job.id}`);
                                  }}
                                  className="p-2.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors shadow-sm"
                                  title="View/Edit Job (Click Edit button on job detail page)"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}

                              {/* Edit Dates Button - Show for POSTED jobs only */}
                              {isJobPosted(job) && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const deadlineDate = job.applicationDeadline
                                      ? (typeof job.applicationDeadline === 'object' && job.applicationDeadline.toMillis
                                        ? new Date(job.applicationDeadline.toMillis())
                                        : new Date(job.applicationDeadline))
                                      : null;
                                    const driveDateValue = job.driveDate
                                      ? (typeof job.driveDate === 'object' && job.driveDate.toMillis
                                        ? new Date(job.driveDate.toMillis())
                                        : new Date(job.driveDate))
                                      : null;

                                    setEditDatesForm({
                                      applicationDeadline: deadlineDate,
                                      driveDate: driveDateValue
                                    });
                                    setEditingDatesJobId(job.id);
                                  }}
                                  className="p-2.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors shadow-sm"
                                  title="Edit Dates (Only dates can be edited for POSTED jobs)"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}

                              {/* View JD Button */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(`/job/${job.id}`);
                                }}
                                className="p-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors shadow-sm"
                                title="View JD"
                              >
                                <View className="w-4 h-4" />
                              </button>

                              {/* Share Action */}
                              <button
                                onClick={() => handleShare(job)}
                                className="p-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors shadow-sm"
                                title="Share job"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>

                              {/* Delete Action */}
                              <button
                                onClick={() => handleDelete(job.id)}
                                className="p-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                                title="Delete job"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {(() => {
                  const allJobs = getSortedJobs();
                  const totalJobs = allJobs.length;
                  const totalPages = Math.max(1, Math.ceil(totalJobs / JOBS_PER_PAGE));
                  const currentPage = Math.min(Math.max(1, jobsPage), totalPages);
                  const start = (currentPage - 1) * JOBS_PER_PAGE;

                  return totalJobs > JOBS_PER_PAGE ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200 px-4">
                      <p className="text-sm text-gray-600">
                        Showing {start + 1}–{Math.min(start + JOBS_PER_PAGE, totalJobs)} of {totalJobs} jobs
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-2 text-sm text-gray-700">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setJobsPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : null;
                })()}
              </>
            );
          })()}
        </div>
      </div>

      {/* Edit Dates Modal - For POSTED jobs only */}
      {editingDatesJobId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-green-600" />
                  Edit Dates (POSTED Job)
                </h2>
                <button
                  onClick={() => {
                    setEditingDatesJobId(null);
                    setEditDatesForm({ applicationDeadline: null, driveDate: null });
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                For POSTED jobs, only application deadline and drive date can be edited. All other fields are locked.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Application Deadline */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Application Deadline *
                </label>
                <input
                  type="datetime-local"
                  value={editDatesForm.applicationDeadline ? new Date(editDatesForm.applicationDeadline.getTime() - editDatesForm.applicationDeadline.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditDatesForm(prev => ({ ...prev, applicationDeadline: e.target.value ? new Date(e.target.value) : null }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Drive Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Drive Date *
                </label>
                <input
                  type="datetime-local"
                  value={editDatesForm.driveDate ? new Date(editDatesForm.driveDate.getTime() - editDatesForm.driveDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditDatesForm(prev => ({ ...prev, driveDate: e.target.value ? new Date(e.target.value) : null }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Validation message */}
              {editDatesForm.applicationDeadline && editDatesForm.driveDate &&
                editDatesForm.driveDate <= editDatesForm.applicationDeadline && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">
                      <strong>Error:</strong> Drive date must be after the application deadline.
                    </p>
                  </div>
                )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEditingDatesJobId(null);
                  setEditDatesForm({ applicationDeadline: null, driveDate: null });
                }}
                disabled={savingDates}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Validate
                  if (!editDatesForm.applicationDeadline || !editDatesForm.driveDate) {
                    toast.error('Both dates are required');
                    return;
                  }

                  if (editDatesForm.driveDate <= editDatesForm.applicationDeadline) {
                    toast.error('Drive date must be after the application deadline');
                    return;
                  }

                  try {
                    setSavingDates(true);
                    await updateJob(editingDatesJobId, {
                      applicationDeadline: editDatesForm.applicationDeadline.toISOString(),
                      driveDate: editDatesForm.driveDate.toISOString()
                    });

                    // Refresh jobs list
                    if (jobsSubscriptionRef.current?.refresh) {
                      jobsSubscriptionRef.current.refresh();
                    }

                    // Dispatch event to notify other components (e.g., InterviewScheduling)
                    const refreshEvent = new CustomEvent('jobsRefresh', {
                      detail: {
                        action: 'update',
                        jobId: editingDatesJobId,
                        jobTitle: jobs.find(j => j.id === editingDatesJobId)?.jobTitle || 'Job'
                      }
                    });
                    window.dispatchEvent(refreshEvent);
                    console.log('📢 Dispatched jobsRefresh event after date update');

                    toast.success('Dates updated successfully');
                    setEditingDatesJobId(null);
                    setEditDatesForm({ applicationDeadline: null, driveDate: null });
                  } catch (error) {
                    console.error('Failed to update dates:', error);
                    const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to update dates';
                    toast.error(errorMessage);
                  } finally {
                    setSavingDates(false);
                  }
                }}
                disabled={savingDates || !editDatesForm.applicationDeadline || !editDatesForm.driveDate ||
                  (editDatesForm.driveDate <= editDatesForm.applicationDeadline)}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingDates ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Save Dates</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
