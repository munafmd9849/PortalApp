import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../../services/api';
import { deleteJob, subscribeJobs, postJob, updateJob } from '../../../services/jobs';
import { Loader, Trash2, Share2, Building2, Calendar, GraduationCap, View, Users, Briefcase, ChevronDown, CheckCircle, Clock, PlayCircle, CheckSquare, XCircle, AlertTriangle, MapPin, Edit } from 'lucide-react';
import { useToast } from '../../ui/Toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import CandidateAnalysisModal from './CandidateAnalysisModal';
import StudentSelectorModal from './StudentSelectorModal';

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

  const [selectedSchools, setSelectedSchools] = useState({});
  const [selectedBatches, setSelectedBatches] = useState({});
  const [selectedCenters, setSelectedCenters] = useState({});
  const [showSchools, setShowSchools] = useState({});
  const [showBatches, setShowBatches] = useState({});
  const [showCenters, setShowCenters] = useState({});
  const [visibilityModes, setVisibilityModes] = useState({});
  const [targetStudents, setTargetedStudents] = useState({});
  const [analysisModal, setAnalysisModal] = useState({ isOpen: false, jobId: null, jobTitle: '' });
  const [selectorModal, setSelectorModal] = useState({ isOpen: false, jobId: null, jobTitle: '', isReadOnly: false });
  const [activeFilter, setActiveFilter] = useState('in_review'); // Default to in_review to show jobs pending approval
  const [jobsPage, setJobsPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [inReviewCount, setInReviewCount] = useState(0);
  const [postedCount, setPostedCount] = useState(0);
  const JOBS_PER_PAGE = 25;

  // Reset to page 1 when filter changes
  useEffect(() => {
    setJobsPage(1);
  }, [activeFilter]);

  // Filter options state
  const [schoolOptions, setSchoolOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);
  const [centerOptions, setCenterOptions] = useState([]);
  const [adminOptions, setAdminOptions] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState('ALL');
  const [loadingFilters, setLoadingFilters] = useState(true);

  const schoolDropdownRefs = useRef({});
  const batchDropdownRefs = useRef({});
  const centerDropdownRefs = useRef({});

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setLoadingFilters(true);

        const { fetchAcademicOptions, buildManageJobsFilterOptions } = await import(
          '../../../utils/academicOptions'
        );
        const raw = await fetchAcademicOptions();
        const { schoolOptions: schoolOptionsArray, batchOptions: batchOptionsArray, centerOptions: centerOptionsArray } =
          buildManageJobsFilterOptions(raw);

        setSchoolOptions(schoolOptionsArray);
        setBatchOptions(batchOptionsArray);
        setCenterOptions(centerOptionsArray);

        // Fetch Admins for Super Admin filter
        const isSuperAdmin = role?.toUpperCase() === 'SUPER_ADMIN' || user?.role?.toUpperCase() === 'SUPER_ADMIN';
        if (isSuperAdmin) {
          try {
            const statsRes = await api.getSuperAdminStats();
            if (statsRes && statsRes.admins) {
              const adminsList = statsRes.admins.map(a => ({
                id: a.id,
                display: a.displayName || a.email,
                storage: a.id
              }));
              setAdminOptions([{ id: 'ALL', display: 'All Admins', storage: 'ALL' }, ...adminsList]);
            }
          } catch (err) {
            console.warn('ManageJobs: Failed to load admins for filter', err);
          }
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ ManageJobs filter options loaded from academic structure API');
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



  // Fetch total counts for both tabs (pre-computed, shown immediately)
  const loadCounts = async () => {
    try {
      const [inReviewRes, postedRes] = await Promise.all([
        api.getJobs({ limit: 1, page: 1, status: 'IN_REVIEW' }),
        api.getJobs({ limit: 1, page: 1, status: 'POSTED', isPosted: true }),
      ]);
      setInReviewCount((inReviewRes?.pagination?.total) ?? 0);
      setPostedCount((postedRes?.pagination?.total) ?? 0);
    } catch (err) {
      console.warn('ManageJobs: Failed to load tab counts', err);
    }
  };

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

      // Refresh tab counts after jobs load (e.g. after post/delete)
      loadCounts();

      // Load existing selections from database for posted jobs
      const schoolSelections = {};
      const batchSelections = {};
      const centerSelections = {};

      const targetedSelections = {};

      const toArray = (v) => {
        if (Array.isArray(v)) return v.map(x => (typeof x === 'string' ? x.trim() : String(x))).filter(Boolean);
        if (typeof v === 'string' && v.trim()) {
          const s = v.trim();
          if (s.startsWith('[')) {
            try {
              const parsed = JSON.parse(s);
              return Array.isArray(parsed) ? parsed.map(x => String(x).trim()).filter(Boolean) : [];
            } catch (_) { /* fallback */ }
          }
          return s.split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        }
        return [];
      };
      jobsList.forEach(job => {
        if (job.status === 'POSTED' || job.isPosted === true) {
          if (job.targetSchools) schoolSelections[job.id] = toArray(job.targetSchools);
          if (job.targetBatches) batchSelections[job.id] = toArray(job.targetBatches);
          if (job.targetCenters) centerSelections[job.id] = toArray(job.targetCenters);
          // Check both field names (jobTargets is the database relation, targetStudents might be a legacy field)
          if (job.jobTargets) targetedSelections[job.id] = job.jobTargets;
          else if (job.targetStudents) targetedSelections[job.id] = job.targetStudents;
        }
      });

      if (Object.keys(schoolSelections).length > 0) setSelectedSchools(prev => ({ ...prev, ...schoolSelections }));
      if (Object.keys(batchSelections).length > 0) setSelectedBatches(prev => ({ ...prev, ...batchSelections }));
      if (Object.keys(centerSelections).length > 0) setSelectedCenters(prev => ({ ...prev, ...centerSelections }));
      if (Object.keys(targetedSelections).length > 0) setTargetedStudents(prev => ({ ...prev, ...targetedSelections }));

    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  useEffect(() => {
    loadJobs();
  }, [jobsPage, activeFilter, selectedAdmin]);


  // Handle body scroll locking when modals are open
  useEffect(() => {
    const isAnyModalOpen = !!editingDatesJobId || selectorModal.isOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [editingDatesJobId, selectorModal.isOpen]);


  // Listen for custom events to trigger refresh (from JobPostingsManager)
  useEffect(() => {
    const handleJobsRefresh = (event) => {
      const { action, jobId, jobTitle } = event.detail || {};
      console.log(`📢 ManageJobs received jobsRefresh event: ${action} for job ${jobId} (${jobTitle})`);

      // Trigger immediate refresh
      console.log('🔄 Triggering ManageJobs refresh from event');
      loadJobs();
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

    // Strict tab filtering
    if (activeFilter === 'in_review') {
      return status === 'in_review';
    } else if (activeFilter === 'posted') {
      return status === 'posted';
    }

    return false;
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
  // Check if job can be posted
  const canPostJob = (job) => {
    const isAlreadyPosted = isJobPosted(job);
    const mode = visibilityModes[job.id] || 'OPEN';

    if (mode === 'INVITE_ONLY') {
      // In Invite Only, we only need at least one targeted student hand-picked
      const hasTargetedStudents = Array.isArray(targetStudents[job.id]) && targetStudents[job.id].length > 0;
      return !isAlreadyPosted && hasTargetedStudents;
    }

    // Otherwise, use standard eligibility filters
    const hasSchoolSelection = Array.isArray(selectedSchools[job.id]) && selectedSchools[job.id].length > 0;
    const hasBatchSelection = Array.isArray(selectedBatches[job.id]) && selectedBatches[job.id].length > 0;
    const hasCenterSelection = Array.isArray(selectedCenters[job.id]) && selectedCenters[job.id].length > 0;

    return !isAlreadyPosted && hasSchoolSelection && hasBatchSelection && hasCenterSelection;
  };

  // Get posted job display text
  const getPostedJobDisplay = (jobId) => {
    const schools = Array.isArray(selectedSchools[jobId]) ? selectedSchools[jobId] : [];
    const batches = Array.isArray(selectedBatches[jobId]) ? selectedBatches[jobId] : [];
    const centers = Array.isArray(selectedCenters[jobId]) ? selectedCenters[jobId] : [];

    // Convert storage codes to display names
    const schoolText = schools.length === 1 ? getSchoolDisplay(schools[0]) :
      schools.length > 1 ? `${schools.length} Schools` : '';
    const batchText = batches.length === 1 ? getBatchDisplay(batches[0]) :
      batches.length > 1 ? `${batches.length} Batches` : '';
    const centerText = centers.length === 1 ? getCenterDisplay(centers[0]) :
      centers.length > 1 ? `${centers.length} Centers` : '';

    return [schoolText, batchText, centerText].filter(Boolean).join(' • ');
  };

  // Database-integrated post job handler
  const handlePostJob = async (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job || postingJobs.has(jobId) || !canPostJob(job)) return;

    try {
      setPostingJobs(prev => new Set([...prev, jobId]));

      const postData = {
        selectedSchools: Array.isArray(selectedSchools[jobId]) ? selectedSchools[jobId] : [],
        selectedBatches: Array.isArray(selectedBatches[jobId]) ? selectedBatches[jobId] : [],
        selectedCenters: Array.isArray(selectedCenters[jobId]) ? selectedCenters[jobId] : [],
        visibilityMode: visibilityModes[jobId] || 'OPEN',
        targetStudents: targetStudents[jobId] || [],
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
      loadJobs();
      
      // Auto-switch to Posted tab so user sees the job moved
      setActiveFilter('posted');

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
        loadJobs();
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


  const toggleSchoolDropdown = (jobId) => {
    setShowSchools(prev => ({ ...prev, [jobId]: !prev[jobId] }));
    setShowBatches(prev => ({ ...prev, [jobId]: false }));
    setShowCenters(prev => ({ ...prev, [jobId]: false }));
  };

  const toggleBatchDropdown = (jobId) => {
    setShowBatches(prev => ({ ...prev, [jobId]: !prev[jobId] }));
    setShowSchools(prev => ({ ...prev, [jobId]: false }));
    setShowCenters(prev => ({ ...prev, [jobId]: false }));
  };

  const toggleCenterDropdown = (jobId) => {
    setShowCenters(prev => ({ ...prev, [jobId]: !prev[jobId] }));
    setShowSchools(prev => ({ ...prev, [jobId]: false }));
    setShowBatches(prev => ({ ...prev, [jobId]: false }));
  };


  const allManageJobs = jobs.filter(job => shouldShowInManageJobs(job));

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 overflow-x-hidden">
      {/* Header with Statistics */}


      {/* Filter Buttons - Show both IN_REVIEW and POSTED sections */}
      <div className="flex justify-center mb-4 sm:mb-6">
        <div className="bg-white rounded-lg p-1 shadow-sm border border-slate-200 inline-flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setActiveFilter('in_review')}
            className={`px-4 sm:px-6 py-2 rounded-md font-medium transition-all duration-200 touch-manipulation ${activeFilter === 'in_review'
              ? 'bg-indigo-500 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-800'
              }`}
          >
            In Review ({inReviewCount})
          </button>
          <button
            onClick={() => setActiveFilter('posted')}
            className={`px-4 sm:px-6 py-2 rounded-md font-medium transition-all duration-200 touch-manipulation ${activeFilter === 'posted'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-800'
              }`}
          >
            Posted ({postedCount})
          </button>
        </div>
      </div>

      {/* Super Admin: Filter by Creator */}
      {(role === 'SUPER_ADMIN' || user?.role === 'SUPER_ADMIN') && adminOptions.length > 0 && (
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3 bg-indigo-50/50 px-4 py-2 rounded-xl border border-indigo-100">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Filter by Admin:</span>
            <select
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-sm"
            >
              {adminOptions.map(admin => (
                <option key={admin.id} value={admin.storage}>
                  {admin.display}
                </option>
              ))}
            </select>
            {selectedAdmin !== 'ALL' && (
              <button 
                onClick={() => setSelectedAdmin('ALL')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Jobs list */}
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold">
            {activeFilter === 'in_review' ? 'Jobs In Review' : 'Posted Jobs'} ({totalJobs})
          </h3>
          {loading && (
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader className="w-4 h-4 animate-spin" /> Loading jobs...
            </div>
          )}
        </div>

        <div className="divide-y py-4">
          {allManageJobs.map((job, index) => {
            const isPosted = isJobPosted(job);
            const jobStatus = isPosted ? getJobStatus(job) : {
              text: 'In Review',
              color: 'bg-amber-100 text-amber-700 border-amber-200',
              icon: <Clock className="w-3 h-3" />
            };

            // Get initials for company logo
            const companyName = job.company?.name || job.companyName || job.company || 'NA';
            const initials = companyName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const logoColorClass = index % 2 === 0 ? 'bg-indigo-500' : 'bg-purple-500';

            const isAnyDropdownOpen = showSchools[job.id] || showBatches[job.id] || showCenters[job.id];

            return (
              <div 
                key={job.id} 
                style={{ zIndex: isAnyDropdownOpen ? 50 : 1 }}
                className={`group relative bg-white border-l-[5px] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 mb-6 mx-2 sm:mx-4 ${
                  isPosted ? 'border-l-emerald-500' : 'border-l-indigo-500'
                } border border-slate-200`}
              >
                {/* CARD HEADER (TOP BAR) */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 ${
                  isPosted ? 'p-4 sm:p-5' : 'p-3 sm:p-4'
                }`}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm ${logoColorClass} font-outfit`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <h4 className="font-bold text-slate-900 text-base sm:text-lg truncate leading-tight">
                        {job.jobTitle || 'Untitled Position'}
                      </h4>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="text-xs sm:text-sm font-medium truncate">{companyName}</span>
                      </div>
                      {/* Super Admin Visibility: Show who posted/created the job */}
                      {/* {(role === 'SUPER_ADMIN' || user?.role === 'SUPER_ADMIN') && job.creator && (
                        <div className="flex items-center gap-1.5 text-indigo-500 mt-1">
                          <User className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">
                            Posted by: {job.creator.displayName || job.creator.email}
                          </span>
                        </div>
                      )} */}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                        {isPosted ? 'Application Deadline' : 'Interview Date'}
                      </p>
                      <p className="text-[13px] font-bold text-slate-700">
                        {isPosted 
                          ? (job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD')
                          : (job.driveDate ? new Date(job.driveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD')
                        }
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight rounded-md border flex items-center gap-1.5 shadow-sm whitespace-nowrap ${
                      isPosted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : jobStatus.color
                    }`}>
                      {jobStatus.icon}
                      {isPosted ? 'Live' : jobStatus.text}
                    </span>
                  </div>
                </div>

                {/* CARD MIDDLE / STATIC INFO */}
                {activeFilter === 'in_review' ? (
                  /* IN REVIEW: Interactive Targeting Bars */
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-50/50 border-b border-slate-100">
                    {/* Targeting Dropdowns */}
                    <div className="md:col-span-8 flex flex-wrap gap-4">
                      {/* School Dropdown */}
                      <div className="flex-1 min-w-[140px]" ref={el => schoolDropdownRefs.current[job.id] = el}>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Target Schools</label>
                        <div className="relative">
                          <button
                            disabled={visibilityModes[job.id] === 'INVITE_ONLY'}
                            onClick={() => toggleSchoolDropdown(job.id)}
                            className={`w-full h-10 px-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-sm transition-all text-sm font-semibold ${
                              visibilityModes[job.id] === 'INVITE_ONLY' ? 'opacity-50 grayscale cursor-not-allowed bg-slate-50' : 'hover:border-indigo-300'
                            }`}
                          >
                            <span className="truncate text-slate-700">
                              {visibilityModes[job.id] === 'INVITE_ONLY' ? 'Managed via List' :
                               (Array.isArray(selectedSchools[job.id]) && selectedSchools[job.id].length) ? selectedSchools[job.id].map(code => getSchoolDisplay(code)).join(', ') : 'Select Schools'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>
                          {showSchools[job.id] && (
                            <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto p-1">
                              {schoolOptions.map((school) => (
                                <label key={school.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 rounded-md cursor-pointer transition-colors">
                                  <input type="checkbox" checked={Array.isArray(selectedSchools[job.id]) && selectedSchools[job.id].includes(school.storage)} onChange={() => toggleSchool(job.id, school.storage)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                  <span className="font-medium text-slate-700">{school.display}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Batch Dropdown */}
                      <div className="flex-1 min-w-[140px]" ref={el => batchDropdownRefs.current[job.id] = el}>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Eligible Batches</label>
                        <div className="relative">
                          <button
                            disabled={visibilityModes[job.id] === 'INVITE_ONLY'}
                            onClick={() => toggleBatchDropdown(job.id)}
                            className={`w-full h-10 px-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-sm transition-all text-sm font-semibold ${
                              visibilityModes[job.id] === 'INVITE_ONLY' ? 'opacity-50 grayscale cursor-not-allowed bg-slate-50' : 'hover:border-indigo-300'
                            }`}
                          >
                            <span className="truncate text-slate-700">
                              {visibilityModes[job.id] === 'INVITE_ONLY' ? 'Managed via List' :
                               (Array.isArray(selectedBatches[job.id]) && selectedBatches[job.id].length) ? selectedBatches[job.id].map(code => getBatchDisplay(code)).join(', ') : 'Select Batches'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>
                          {showBatches[job.id] && (
                            <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto p-1">
                              {batchOptions.map((batch) => (
                                <label key={batch.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 rounded-md cursor-pointer transition-colors">
                                  <input type="checkbox" checked={Array.isArray(selectedBatches[job.id]) && selectedBatches[job.id].includes(batch.storage)} onChange={() => toggleBatch(job.id, batch.storage)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                  <span className="font-medium text-slate-700">{batch.display}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Center Dropdown */}
                      <div className="flex-1 min-w-[140px]" ref={el => centerDropdownRefs.current[job.id] = el}>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Eligible Centres</label>
                        <div className="relative">
                          <button
                            disabled={visibilityModes[job.id] === 'INVITE_ONLY'}
                            onClick={() => toggleCenterDropdown(job.id)}
                            className={`w-full h-10 px-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-sm transition-all text-sm font-semibold ${
                              visibilityModes[job.id] === 'INVITE_ONLY' ? 'opacity-50 grayscale cursor-not-allowed bg-slate-50' : 'hover:border-indigo-300'
                            }`}
                          >
                            <span className="truncate text-slate-700">
                              {visibilityModes[job.id] === 'INVITE_ONLY' ? 'Managed via List' :
                               (Array.isArray(selectedCenters[job.id]) && selectedCenters[job.id].length) ? selectedCenters[job.id].map(code => getCenterDisplay(code)).join(', ') : 'Select Centres'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>
                          {showCenters[job.id] && (
                            <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto p-1">
                              {centerOptions.map((center) => (
                                <label key={center.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 rounded-md cursor-pointer transition-colors">
                                  <input type="checkbox" checked={Array.isArray(selectedCenters[job.id]) && selectedCenters[job.id].includes(center.storage)} onChange={() => toggleCenter(job.id, center.storage)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                  <span className="font-medium text-slate-700">{center.display}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      </div>

                    {/* Visibility Mode Toggle */}
                    <div className="md:col-span-4 flex flex-col gap-4 sm:flex-row md:flex-col lg:flex-row">
                      <div className="flex-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Visibility Mode</label>
                        <div className="flex bg-slate-200/50 p-1 rounded-xl gap-1">
                          {['OPEN', 'PRIORITY', 'INVITE_ONLY'].map(mode => (
                            <button
                              key={mode}
                              onClick={() => setVisibilityModes(prev => ({ ...prev, [job.id]: mode }))}
                              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                                (visibilityModes[job.id] || 'OPEN') === mode
                                  ? 'bg-white text-indigo-600 shadow-sm'
                                  : 'text-slate-500 hover:bg-white/40'
                              }`}
                            >
                              {mode === 'INVITE_ONLY' ? 'Invite' : mode.charAt(0) + mode.slice(1).toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Candidates Modal Trigger */}
                      {(visibilityModes[job.id] === 'PRIORITY' || visibilityModes[job.id] === 'INVITE_ONLY') && (
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-500 block mb-1.5">Targeting</label>
                          <button
                            type="button"
                            onClick={() => {
                              if (visibilityModes[job.id] === 'INVITE_ONLY') {
                                setSelectorModal({ isOpen: true, jobId: job.id, jobTitle: job.jobTitle, isReadOnly: false });
                              } else {
                                setAnalysisModal({ isOpen: true, jobId: job.id, jobTitle: job.jobTitle });
                              }
                            }}
                            className="w-full h-10 px-3 bg-blue-50 text-blue-800 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors text-xs font-medium flex items-center justify-center gap-2"
                          >
                            <Users className="w-3.5 h-3.5" />
                            {targetStudents[job.id]?.length > 0
                              ? `${targetStudents[job.id].length} selected`
                              : visibilityModes[job.id] === 'INVITE_ONLY'
                                ? 'Invite candidates'
                                : 'Rank candidates'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* POSTED: Compact Info Row (Little Big) */
                  <div className="p-4 sm:p-5 bg-slate-50/30 border-b border-slate-100">
                    <div className="flex flex-wrap gap-x-12 gap-y-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Schools</span>
                        <span className="text-sm font-bold text-slate-700">
                          {(Array.isArray(selectedSchools[job.id]) && selectedSchools[job.id].length) ? selectedSchools[job.id].map(code => getSchoolDisplay(code)).join(', ') : 'All Schools'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Batches</span>
                        <span className="text-sm font-bold text-slate-700">
                          {(Array.isArray(selectedBatches[job.id]) && selectedBatches[job.id].length) ? selectedBatches[job.id].map(code => getBatchDisplay(code)).join(', ') : 'All Batches'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Centres</span>
                        <span className="text-sm font-bold text-slate-700">
                          {(Array.isArray(selectedCenters[job.id]) && selectedCenters[job.id].length) ? selectedCenters[job.id].map(code => getCenterDisplay(code)).join(', ') : 'All Centres'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Strategy</span>
                        <div 
                          onClick={() => {
                            const mode = visibilityModes[job.id] || job.visibilityMode;
                            if (mode === 'PRIORITY' || mode === 'INVITE_ONLY') {
                              setSelectorModal({ 
                                isOpen: true, 
                                jobId: job.id, 
                                jobTitle: job.jobTitle, 
                                isReadOnly: true 
                              });
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border self-start mt-0.5 transition-all ${
                            (visibilityModes[job.id] || job.visibilityMode) === 'PRIORITY' || (visibilityModes[job.id] || job.visibilityMode) === 'INVITE_ONLY' ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
                          } ${
                            (visibilityModes[job.id] || job.visibilityMode) === 'PRIORITY' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                            (visibilityModes[job.id] || job.visibilityMode) === 'INVITE_ONLY' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {(visibilityModes[job.id] || job.visibilityMode || 'OPEN').replace('_', ' ')}
                        </div>
                      </div>
                      {targetStudents[job.id]?.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Targeted</span>
                          <span className="text-sm font-bold text-indigo-600">{targetStudents[job.id].length} Students</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* CARD FOOTER (ACTIONS) */}
                <div className="flex items-center justify-between p-3 sm:p-4 bg-white">
                  {activeFilter === 'in_review' ? (
                    <button
                      onClick={() => handlePostJob(job.id)}
                      disabled={!canPostJob(job) || postingJobs.has(job.id)}
                      className={`h-11 px-6 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 shadow-sm active:scale-95 ${
                        postingJobs.has(job.id) ? 'bg-blue-100 text-blue-500' :
                        !canPostJob(job) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                        'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 shadow-lg'
                      }`}
                    >
                      {postingJobs.has(job.id) ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      {postingJobs.has(job.id) ? 'Posting...' : 'Approve & Post Job'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-bold text-xs">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Published to Students
                    </div>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {/* Secondary Actions (Icons) */}
                    <button onClick={() => handleShare(job)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-white transition-all shadow-sm" title="Share Job">
                      <Share2 className="w-4 h-4" />
                    </button>
                    
                    <button 
                      onClick={() => navigate(`/job/${job.id}`)} 
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-white transition-all shadow-sm" 
                      title="View Details"
                    >
                      <View className="w-4 h-4" />
                    </button>

                    {!isPosted ? (
                      <button 
                        onClick={() => navigate(`${base}/job/${job.id}`)} 
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-200 hover:bg-white transition-all shadow-sm" 
                        title="Edit Job"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          const deadlineDate = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
                          const driveDateValue = job.driveDate ? new Date(job.driveDate) : null;
                          setEditDatesForm({ applicationDeadline: deadlineDate, driveDate: driveDateValue });
                          setEditingDatesJobId(job.id);
                        }} 
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-white transition-all shadow-sm" 
                        title="Edit Dates"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    <button 
                      onClick={() => handleDelete(job.id)} 
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-white transition-all shadow-sm" 
                      title="Delete Job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

                {/* Pagination */}
                {(() => {
                  const currentPage = Math.min(Math.max(1, jobsPage), totalPages);
                  const start = (currentPage - 1) * JOBS_PER_PAGE;

                  return totalJobs > 0 ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200 px-4">
                      <p className="text-sm text-gray-600">
                        Showing {start + 1}–{Math.min(start + jobs.length, totalJobs)} of {totalJobs} jobs
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
        </div>
      </div>

      {/* Edit Dates Modal - For POSTED jobs only */}
      {editingDatesJobId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[2px]">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight leading-none">Adjust Timelines</h2>
                  <p className="text-blue-100 text-xs font-medium mt-1.5 opacity-90">Updating: <span className="text-white font-semibold">{jobs.find(j => j.id === editingDatesJobId)?.jobTitle}</span></p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingDatesJobId(null);
                  setEditDatesForm({ applicationDeadline: null, driveDate: null });
                }}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Application Deadline */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Application Deadline
                </label>
                <div className="relative group">
                  <input
                    type="datetime-local"
                    value={editDatesForm.applicationDeadline ? new Date(editDatesForm.applicationDeadline.getTime() - editDatesForm.applicationDeadline.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditDatesForm(prev => ({ ...prev, applicationDeadline: e.target.value ? new Date(e.target.value) : null }))}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all group-hover:bg-white"
                  />
                </div>
              </div>

              {/* Drive Date */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Interview/Drive Date
                </label>
                <div className="relative group">
                  <input
                    type="datetime-local"
                    value={editDatesForm.driveDate ? new Date(editDatesForm.driveDate.getTime() - editDatesForm.driveDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditDatesForm(prev => ({ ...prev, driveDate: e.target.value ? new Date(e.target.value) : null }))}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all group-hover:bg-white"
                  />
                </div>
              </div>

              {/* Info Message */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50">
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  <span className="font-bold">Note:</span> Only timelines can be modified for posted jobs. Other details are locked to ensure consistency for applicants.
                </p>
              </div>

              {/* Validation message */}
              {editDatesForm.applicationDeadline && editDatesForm.driveDate &&
                editDatesForm.driveDate <= editDatesForm.applicationDeadline && (
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100 animate-pulse">
                    <p className="text-red-700 text-[11px] font-bold uppercase tracking-tight text-center">
                      Error: Drive date must be after deadline
                    </p>
                  </div>
                )}
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => {
                  setEditingDatesJobId(null);
                  setEditDatesForm({ applicationDeadline: null, driveDate: null });
                }}
                disabled={savingDates}
                className="flex-1 py-3.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest"
              >
                Discard
              </button>
              <button
                onClick={async () => {
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

                    // Dispatch event to notify other components
                    const refreshEvent = new CustomEvent('jobsRefresh', {
                      detail: {
                        action: 'update',
                        jobId: editingDatesJobId,
                        jobTitle: jobs.find(j => j.id === editingDatesJobId)?.jobTitle || 'Job'
                      }
                    });
                    window.dispatchEvent(refreshEvent);

                    loadJobs();
                    toast.success('Timelines updated successfully');
                    setEditingDatesJobId(null);
                    setEditDatesForm({ applicationDeadline: null, driveDate: null });
                  } catch (error) {
                    toast.error(error?.response?.data?.message || 'Update failed');
                  } finally {
                    setSavingDates(false);
                  }
                }}
                disabled={savingDates || !editDatesForm.applicationDeadline || !editDatesForm.driveDate ||
                  (editDatesForm.driveDate <= editDatesForm.applicationDeadline)}
                className="flex-[1.5] py-3.5 bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-50"
              >
                {savingDates ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {savingDates ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Candidate Analysis Modal */}
      <CandidateAnalysisModal
        isOpen={analysisModal.isOpen}
        jobId={analysisModal.jobId}
        jobTitle={analysisModal.jobTitle}
        onClose={() => setAnalysisModal({ ...analysisModal, isOpen: false })}
        onApplySelection={(selectedList) => {
          setTargetedStudents(prev => ({ ...prev, [analysisModal.jobId]: selectedList }));
          toast.success(`Analysis Applied`, `Recommended ${selectedList.length} candidates for this job.`);
        }}
      />
      {/* Candidate Selector Modal (Invite Only) */}
      <StudentSelectorModal
        isOpen={selectorModal.isOpen}
        onClose={() => setSelectorModal({ isOpen: false, jobId: null, jobTitle: '', isReadOnly: false })}
        jobTitle={selectorModal.jobTitle}
        isReadOnly={selectorModal.isReadOnly}
        initialSelected={targetStudents[selectorModal.jobId] || []}
        onSelect={(selectedIds) => {
          const formattedSelection = selectedIds.map(id => ({
            studentId: id,
            score: 0,
            sourceMode: 'MANUAL'
          }));
          setTargetedStudents(prev => ({ ...prev, [selectorModal.jobId]: formattedSelection }));
          toast.success('Selection Updated', `Invited ${selectedIds.length} candidates for this job.`);
        }}
      />
    </div>
  );
}
