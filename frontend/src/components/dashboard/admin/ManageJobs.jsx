import React, { useEffect, useState, useRef } from 'react';
import { deleteJob, subscribeJobs, postJob } from '../../../services/jobs';
import { Loader, Trash2, Share2, Building2, Calendar, GraduationCap, View, Users, Briefcase, ChevronDown, CheckCircle, Clock, PlayCircle, CheckSquare, XCircle, AlertTriangle, MapPin } from 'lucide-react';
import JobDescriptionModal from '../student/JobDescriptionModal';
import { useToast } from '../../ui/Toast';

export default function ManageJobs() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postingJobs, setPostingJobs] = useState(new Set());
  const [showSchools, setShowSchools] = useState({});
  const [showBatches, setShowBatches] = useState({});
  const [showCenters, setShowCenters] = useState({});
  const [selectedSchools, setSelectedSchools] = useState({});
  const [selectedBatches, setSelectedBatches] = useState({});
  const [selectedCenters, setSelectedCenters] = useState({});
  const [activeFilter, setActiveFilter] = useState('unposted');

  // Integrated modal state for View JD button
  const [viewingJob, setViewingJob] = useState(null);

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
  // Only ACCEPTED, POSTED, and ACTIVE jobs should appear here
  // IN_REVIEW, DRAFT, REJECTED jobs should NOT appear (they're in Job Moderation)
  const shouldShowInManageJobs = (job) => {
    const status = (job.status || '').toLowerCase();
    
    // Debug: Log status for troubleshooting
    if (process.env.NODE_ENV === 'development' && job.jobTitle) {
      console.log(`🔍 shouldShowInManageJobs: "${job.jobTitle}" - status: "${status}" (raw: "${job.status}")`);
    }
    
    // Exclude jobs that are still pending admin review
    if (status === 'in_review' || status === 'draft' || status === 'rejected') {
      return false;
    }
    // Include accepted, posted, and active jobs
    const shouldShow = status === 'accepted' || status === 'approved' || 
                       status === 'posted' || status === 'active';
    
    if (process.env.NODE_ENV === 'development' && job.jobTitle) {
      console.log(`  → Result: ${shouldShow ? 'SHOW' : 'HIDE'}`);
    }
    
    return shouldShow;
  };

  // Check if job is posted (compatible with your database structure)
  const isJobPosted = (job) => {
    const status = (job.status || '').toLowerCase();
    // Return true only for posted/active jobs
    // ACCEPTED jobs are not posted yet (they're in review section)
    return (status === 'posted' || status === 'active') && 
           (job.isPosted === true || job.posted === true);
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
    
    // Then filter based on active filter (posted vs unposted)
    let filteredJobs;
    if (activeFilter === 'unposted') {
      // Unposted section: ACCEPTED jobs (not yet posted to students)
      filteredJobs = manageJobsOnly.filter(job => !isJobPosted(job));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 Unposted filter - isJobPosted check:', manageJobsOnly.map(j => ({
          id: j.id,
          title: j.jobTitle,
          status: j.status,
          isJobPosted: isJobPosted(j),
          isPosted: j.isPosted,
          posted: j.posted
        })));
      }
    } else {
      // Posted section: POSTED and ACTIVE jobs
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
      // Debug: Log ACCEPTED jobs in unposted filter
      if (activeFilter === 'unposted') {
        const acceptedJobs = filteredJobs.filter(j => j.status === 'accepted' || j.status === 'approved');
        console.log(`📋 ACCEPTED jobs in unposted filter: ${acceptedJobs.length}`, acceptedJobs.map(j => ({ id: j.id, title: j.jobTitle, status: j.status })));
      }
    }

    if (activeFilter === 'unposted') {
      // Sort unposted by creation time (newest first)
      return filteredJobs.sort((a, b) => {
        const getTimestamp = (job) => {
          if (job.createdAt?.toDate) return job.createdAt.toDate();
          if (job.timestamp?.toDate) return job.timestamp.toDate();
          return new Date(job.createdAt || job.timestamp || 0);
        };
        return getTimestamp(b) - getTimestamp(a);
      });
    } else {
      // Sort posted by posted time (latest posted first)
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

  // Get statistics
  // Count only jobs that should appear in Manage Jobs (exclude IN_REVIEW, DRAFT, REJECTED)
  const manageJobsOnly = jobs.filter(job => shouldShowInManageJobs(job));
  const unpostedCount = manageJobsOnly.filter(job => !isJobPosted(job)).length;
  const postedCount = manageJobsOnly.filter(job => isJobPosted(job)).length;

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manage & Post Jobs</h2>
          <p className="text-sm text-slate-600 mt-1">
            Select target schools and batches, then post jobs to students
          </p>
        </div>
      </div>

      {/* Filter Buttons - Centered above jobs container */}
      <div className="flex justify-center mb-6">
        <div className="bg-white rounded-lg p-1 shadow-sm border border-slate-200 inline-flex gap-2">
          <button
            onClick={() => setActiveFilter('unposted')}
            className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${activeFilter === 'unposted'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-800'
              }`}
          >
            In Review ({unpostedCount})
          </button>
          <button
            onClick={() => setActiveFilter('posted')}
            className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${activeFilter === 'posted'
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
            {activeFilter === 'unposted' ? 'Unposted Jobs' : 'Posted Jobs'} ({getSortedJobs().length})
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
                No {activeFilter} jobs available yet.
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {activeFilter === 'unposted'
                  ? 'New jobs will appear here once they are created.'
                  : 'Posted jobs will appear here once you post them.'
                }
              </div>
            </div>
          )}

          {getSortedJobs().map((job, index) => {
            const jobStatus = isJobPosted(job) ? getJobStatus(job) : null;

            return (
              <div key={job.id} className={`relative border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 mb-4 mx-4 ${isJobPosted(job) ? 'bg-green-50' : 'bg-blue-50'
                }`}>
                <div className="p-4">
                  {/* First Row: Company, Interview Date, School, Batch, Center, Actions */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Company - STATUS BADGE BACK HERE */}
                    <div className="flex-4 min-w-0">
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
                      <div className="font-semibold text-slate-900 text-xl truncate ml-[5%]">
                        {job.company?.name || job.companyName || job.company || 'N/A'}
                      </div>
                    </div>

                    {/* Interview Date */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-center gap-2 mb-2 -mt-2">
                        <span className="text-sm font-medium text-slate-600">Interview</span>
                      </div>
                      <div className="text-slate-900 text-sm">
                        {job.driveDate ? (
                          job.driveDate.toDate ?
                            job.driveDate.toDate().toLocaleDateString('en-GB') :
                            new Date(job.driveDate).toLocaleDateString('en-GB')
                        ) : 'TBD'}
                      </div>
                    </div>

                    {/* School */}
                    <div className="flex-2 min-w-0">
                      <div className="flex justify-center -translate-x-2 items-center gap-2 mb-1">
                        <GraduationCap className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">School</span>
                      </div>
                      <div className="relative" ref={el => schoolDropdownRefs.current[job.id] = el}>
                        <button
                          type="button"
                          className={`w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-left flex items-center justify-between ${selectedSchools[job.id]?.length ? 'bg-green-100' : 'bg-blue-100'
                            }`}
                          onClick={() => toggleSchoolDropdown(job.id)}
                          disabled={isJobPosted(job)}
                        >
                          <span className="truncate">
                            {selectedSchools[job.id]?.length ? selectedSchools[job.id].map(code => getSchoolDisplay(code)).join(', ') : 'Select Schools'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        </button>
                        {showSchools[job.id] && !isJobPosted(job) && (
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
                      </div>
                    </div>
                    {/* Batch */}
                    <div className="flex-2 min-w-0">
                      <div className="flex justify-center -translate-x-2 items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">Batch</span>
                      </div>
                      <div className="relative" ref={el => batchDropdownRefs.current[job.id] = el}>
                        <button
                          type="button"
                          className={`w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-left flex items-center justify-between ${selectedBatches[job.id]?.length ? 'bg-green-100' : 'bg-blue-100'
                            }`}
                          onClick={() => toggleBatchDropdown(job.id)}
                          disabled={isJobPosted(job)}
                        >
                          <span className="truncate">
                            {selectedBatches[job.id]?.length ? selectedBatches[job.id].map(code => getBatchDisplay(code)).join(', ') : 'Select Batches'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        </button>
                        {showBatches[job.id] && !isJobPosted(job) && (
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
                      </div>
                    </div>

                    {/* Center */}
                    <div className="flex-3 min-w-0">
                      <div className="flex justify-center -translate-x-2 items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">Center</span>
                      </div>
                      <div className="relative" ref={el => centerDropdownRefs.current[job.id] = el}>
                        <button
                          type="button"
                          className={`w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-left flex items-center justify-between ${selectedCenters[job.id]?.length ? 'bg-green-100' : 'bg-blue-100'
                            }`}
                          onClick={() => toggleCenterDropdown(job.id)}
                          disabled={isJobPosted(job)}
                        >
                          <span className="truncate">
                            {selectedCenters[job.id]?.length ? selectedCenters[job.id].map(code => getCenterDisplay(code)).join(', ') : 'Select Centers'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        </button>
                        {showCenters[job.id] && !isJobPosted(job) && (
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
                      </div>
                    </div>
                  </div>

                  {/* Second Row: Role and Actions - STATUS BADGE REMOVED FROM HERE */}
                  <div className="mt-2 pt-2 border-t border-slate-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Briefcase className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">Role:</span>
                        <span className="font-semibold text-slate-900 truncate">{job.jobTitle || 'N/A'}</span>
                      </div>

                      {/* Post, Share and Delete Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {/* Post Action */}
                        <button
                          onClick={() => handlePostJob(job.id)}
                          disabled={!canPostJob(job) || postingJobs.has(job.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 justify-center min-w-[120px] ${isJobPosted(job)
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

                        {/* View JD Button with integrated modal toggle */}
                        <button
                          onClick={() => setViewingJob(viewingJob?.id === job.id ? null : job)}
                          className="p-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors shadow-sm"
                          title="View JD"
                        >
                          <View className="w-4 h-4" />
                        </button>

                        {/* Modal directly integrated - only renders when this specific job is being viewed */}
                        {viewingJob?.id === job.id && (
                          <JobDescriptionModal
                            job={viewingJob}
                            isOpen={true}
                            onClose={() => setViewingJob(null)}
                          />
                        )}

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
        </div>
      </div>
    </div>
  );
}
