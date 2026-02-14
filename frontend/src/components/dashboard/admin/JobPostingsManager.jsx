import React, { useEffect, useState, useMemo, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  subscribeJobsWithDetails, 
  subscribeJobAnalytics,
  approveJob, 
  rejectJob, 
  archiveJob,
  getCompaniesForDropdown,
  getRecruitersForDropdown,
  autoArchiveExpiredJobs
} from '../../../services/jobModeration';
import { deleteJob } from '../../../services/jobs';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import CustomDropdown from '../../common/CustomDropdown';
import JobDetailsModal from '../../common/JobDetailsModal.jsx';
import CreateJob from './CreateJob';
import { 
  FaSearch, 
  FaFilter, 
  FaArchive, 
  FaSpinner,
  FaBuilding,
  FaUser,
  FaCalendarAlt,
  FaDollarSign,
  FaMapMarkerAlt,
  FaChevronDown,
  FaChevronUp,
  FaChevronLeft,
  FaChevronRight,
  FaFileAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaEdit,
  FaTrash
} from 'react-icons/fa';

export default function JobPostingsManager() {
  const { user } = useAuth();
  const toast = useToast();
  
  // Normalize role to lowercase for comparison (backend returns uppercase 'ADMIN')
  const userRole = user?.role?.toLowerCase();
  
  // Core state
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({});
  const [lastSnapshot, setLastSnapshot] = useState(null);
  
  // Filter and search state - default to showing all jobs
  const [filters, setFilters] = useState({
    status: 'all', // Default to showing all jobs
    companyId: '',
    recruiterId: '',
    startDate: '',
    endDate: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Dropdown data
  const [companies, setCompanies] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  
  // Modal state
  const [jobDetailModal, setJobDetailModal] = useState({ isOpen: false, job: null });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, job: null, reason: '' });
  const [editModal, setEditModal] = useState({ isOpen: false, job: null });
  
  // Action loading states
  const [actionLoading, setActionLoading] = useState({});
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load companies and recruiters for dropdowns
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [companiesData, recruitersData] = await Promise.all([
          getCompaniesForDropdown(),
          getRecruitersForDropdown()
        ]);
        setCompanies(companiesData);
        setRecruiters(recruitersData);
      } catch (error) {
        console.error('Error loading dropdown data:', {
          error: error,
          message: error?.message,
          stack: error?.stack,
        });
        // Don't show toast for dropdown loading errors - they're not critical
      }
    };

    loadDropdownData();
  }, []);

  // Real-time jobs subscription with refresh capability
  const jobsSubscriptionRef = useRef(null);
  useEffect(() => {
    console.log('📡 Setting up real-time job subscription with filters:', filters);
    setLoading(true);
    
    const filterParams = {
      ...filters,
      limit: 1000 // Fetch all jobs, filter client-side
    };
    
    const subscription = subscribeJobsWithDetails((jobsData, snapshot) => {
      console.log('📊 Received jobs update:', jobsData.length);
      setJobs(jobsData);
      setLastSnapshot(snapshot);
      setLoading(false);
    }, filterParams);

    // Store subscription for manual refresh
    jobsSubscriptionRef.current = subscription;

    return () => {
      console.log('📡 Cleaning up job subscription');
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      } else if (typeof subscription === 'function') {
        subscription(); // Backward compatibility
      }
      jobsSubscriptionRef.current = null;
    };
  }, [filters]);

  // Real-time analytics subscription with refresh capability
  const analyticsSubscriptionRef = useRef(null);
  useEffect(() => {
    console.log('📈 Setting up analytics subscription');
    
    const subscription = subscribeJobAnalytics((analyticsData) => {
      console.log('📊 Received analytics update:', analyticsData);
      setAnalytics(analyticsData);
    });

    // Store subscription for manual refresh
    analyticsSubscriptionRef.current = subscription;

    return () => {
      console.log('📈 Cleaning up analytics subscription');
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      } else if (typeof subscription === 'function') {
        subscription(); // Backward compatibility
      }
      analyticsSubscriptionRef.current = null;
    };
  }, []);

  // Filter and search jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    
    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      const filterStatus = filters.status.toLowerCase();
      result = result.filter(job => {
        const jobStatus = (job.status || '').toLowerCase();
        
        // Status filters - use only: IN_REVIEW, APPROVED, REJECTED, POSTED
        if (filterStatus === 'in_review') {
          return jobStatus === 'in_review';
        }
        if (filterStatus === 'approved') {
          return jobStatus === 'approved';
        }
        if (filterStatus === 'rejected') {
          return jobStatus === 'rejected';
        }
        if (filterStatus === 'posted') {
          return jobStatus === 'posted';
        }
        
        // Default: exact match
        return jobStatus === filterStatus;
      });
    }
    
    // Apply company filter
    if (filters.companyId) {
      result = result.filter(job => 
        job.companyDetails?.id === filters.companyId
      );
    }
    
    // Apply recruiter filter
    if (filters.recruiterId) {
      result = result.filter(job => 
        job.recruiterId === filters.recruiterId || 
        job.recruiter?.id === filters.recruiterId
      );
    }
    
    // Apply date range filters
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      result = result.filter(job => {
        if (!job.driveDate) return false;
        const driveDate = job.driveDate?.toDate ? job.driveDate.toDate() : new Date(job.driveDate);
        return driveDate >= startDate;
      });
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      result = result.filter(job => {
        if (!job.driveDate) return false;
        const driveDate = job.driveDate?.toDate ? job.driveDate.toDate() : new Date(job.driveDate);
        return driveDate <= endDate;
      });
    }
    
    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(job => 
        job.jobTitle?.toLowerCase().includes(searchLower) ||
        job.company?.toLowerCase().includes(searchLower) ||
        job.companyName?.toLowerCase().includes(searchLower) ||
        job.companyDetails?.name?.toLowerCase().includes(searchLower) ||
        job.recruiter?.name?.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [jobs, filters, debouncedSearch]);

  // Paginated jobs
  const paginatedJobs = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return filteredJobs.slice(startIndex, endIndex);
  }, [filteredJobs, pagination.currentPage, pagination.itemsPerPage]);

  // Update pagination when filtered jobs change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      totalItems: filteredJobs.length,
      currentPage: prev.totalItems !== filteredJobs.length ? 1 : prev.currentPage
    }));
  }, [filteredJobs.length]);

  // Helper function to extract meaningful error message
  const getErrorMessage = (error, defaultMessage = 'An unexpected error occurred') => {
    // Log full error details for debugging
    console.error('Full error details:', {
      message: error?.message,
      status: error?.status,
      response: error?.response,
      stack: error?.stack,
      isNetworkError: error?.isNetworkError,
      endpoint: error?.endpoint,
      url: error?.url,
    });

    // Try to extract meaningful error message
    if (error?.response?.error) {
      return error.response.error;
    }
    if (error?.response?.message) {
      return error.response.message;
    }
    if (error?.message) {
      return error.message;
    }
    if (error?.status) {
      return `Server error (${error.status}). Please try again.`;
    }
    return defaultMessage;
  };

  // Reset all filters and search
  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      companyId: '',
      recruiterId: '',
      startDate: '',
      endDate: ''
    });
    setSearchTerm(''); // Also clear the search term
  };

  // Handle job moderation actions
  const handleApprove = async (job) => {
    if (!user || userRole !== 'admin') {
      console.error('Role check failed:', { user: user, role: user?.role, userRole });
      toast.error('Only admin users can approve jobs');
      return;
    }

    const actionKey = `approve_${job.id}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      
      const result = await approveJob(job.id, user);
      
      if (result.success) {
        // Check the status from API response
        const updatedStatus = result.job?.status || result.status;
        console.log(`📋 Approval result - Job ID: ${job.id}, New Status: ${updatedStatus}`);
        
        toast.success(`Job "${job.jobTitle}" approved and posted successfully! Status changed to POSTED. Students can now see this job.`);
        
        // Optimistic update: Remove job from current view immediately
        // Since status changed from IN_REVIEW to ACCEPTED, it should disappear from in_review filter
        setJobs(prev => {
          const updated = prev.filter(j => j.id !== job.id);
          console.log(`✅ Optimistic update: Removed job ${job.id} from view (status changed from IN_REVIEW to ACCEPTED). Jobs remaining: ${updated.length}`);
          return updated;
        });
        
        // Immediate refresh: Trigger jobs and analytics refresh after a short delay
        // Delay ensures database transaction is committed before refresh
        console.log('🔄 Triggering immediate refresh after job approval (1000ms delay to ensure DB commit)');
        setTimeout(() => {
          console.log('🔄 Executing refresh after delay...');
          if (jobsSubscriptionRef.current?.refresh) {
            jobsSubscriptionRef.current.refresh();
          }
          if (analyticsSubscriptionRef.current?.refresh) {
            analyticsSubscriptionRef.current.refresh();
          }
        }, 1000); // 1000ms delay to ensure DB transaction is committed
        
        // Notify ManageJobs component to refresh via custom event
        // This ensures ManageJobs page also updates immediately
        const refreshEvent = new CustomEvent('jobsRefresh', {
          detail: { 
            action: 'approve',
            jobId: job.id,
            jobTitle: job.jobTitle 
          }
        });
        window.dispatchEvent(refreshEvent);
        console.log('📢 Dispatched jobsRefresh event to notify ManageJobs');
      } else {
        throw new Error('Approval failed: Server returned unsuccessful response');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to approve job. Please try again.');
      console.error('Error approving job:', {
        jobId: job.id,
        jobTitle: job.jobTitle,
        error: error,
        errorMessage: errorMessage,
      });
      toast.error(`Failed to approve job "${job.jobTitle}": ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleReject = async (job, reason = '') => {
    if (!user || userRole !== 'admin') {
      console.error('Role check failed:', { user: user, role: user?.role, userRole });
      toast.error('Only admin users can reject jobs');
      return;
    }

    const actionKey = `reject_${job.id}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      
      const result = await rejectJob(job.id, reason, user);
      
      if (result.success) {
        toast.success(`Job "${job.jobTitle}" rejected successfully! The recruiter has been notified.`);
        
        // Optimistic update: Update job status to REJECTED and remove from current view
        setJobs(prev => {
          const updated = prev.map(j => 
            j.id === job.id 
              ? { ...j, status: 'rejected' } // Update status to rejected
              : j
          ).filter(j => j.id !== job.id || j.status !== 'in_review'); // Remove if it was in_review
          console.log(`✅ Optimistic update: Updated job ${job.id} status to REJECTED. Jobs remaining: ${updated.length}`);
          return updated;
        });
        
        // Immediate refresh: Trigger jobs and analytics refresh right away
        console.log('🔄 Triggering immediate refresh after job rejection');
        if (jobsSubscriptionRef.current?.refresh) {
          jobsSubscriptionRef.current.refresh();
        }
        if (analyticsSubscriptionRef.current?.refresh) {
          analyticsSubscriptionRef.current.refresh();
        }
        
        // Notify ManageJobs component to refresh via custom event
        const refreshEvent = new CustomEvent('jobsRefresh', {
          detail: { 
            action: 'reject',
            jobId: job.id,
            jobTitle: job.jobTitle 
          }
        });
        window.dispatchEvent(refreshEvent);
        console.log('📢 Dispatched jobsRefresh event to notify ManageJobs');
        
        setRejectModal({ isOpen: false, job: null, reason: '' });
      } else {
        throw new Error('Rejection failed: Server returned unsuccessful response');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to reject job. Please try again.');
      console.error('Error rejecting job:', {
        jobId: job.id,
        jobTitle: job.jobTitle,
        reason: reason,
        error: error,
        errorMessage: errorMessage,
      });
      toast.error(`Failed to reject job "${job.jobTitle}": ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleArchive = async (job) => {
    if (!user || userRole !== 'admin') {
      console.error('Role check failed:', { user: user, role: user?.role, userRole });
      toast.error('Only admin users can archive jobs');
      return;
    }

    if (!confirm(`Are you sure you want to archive "${job.jobTitle}"? This action cannot be undone.`)) {
      return;
    }

    const actionKey = `archive_${job.id}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      
      const result = await archiveJob(job.id, user);
      
      if (result.success) {
        toast.success(`Job "${job.jobTitle}" archived successfully!`);
      } else {
        throw new Error('Archive failed: Server returned unsuccessful response');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to archive job. Please try again.');
      console.error('Error archiving job:', {
        jobId: job.id,
        jobTitle: job.jobTitle,
        error: error,
        errorMessage: errorMessage,
      });
      toast.error(`Failed to archive job "${job.jobTitle}": ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handle discard (delete) job
  const handleDiscard = async (job) => {
    if (!user || userRole !== 'admin') {
      toast.error('Only admin users can discard jobs');
      return;
    }

    if (!confirm(`Are you sure you want to discard "${job.jobTitle}"? This action cannot be undone.`)) {
      return;
    }

    const actionKey = `discard_${job.id}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      
      await deleteJob(job.id);
      
      toast.success(`Job "${job.jobTitle}" discarded successfully!`);
      
      // Remove job from list immediately
      setJobs(prev => prev.filter(j => j.id !== job.id));
      
      // Refresh jobs and analytics
      setTimeout(() => {
        if (jobsSubscriptionRef.current?.refresh) {
          jobsSubscriptionRef.current.refresh();
        }
        if (analyticsSubscriptionRef.current?.refresh) {
          analyticsSubscriptionRef.current.refresh();
        }
      }, 500);
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to discard job. Please try again.');
      console.error('Error discarding job:', {
        jobId: job.id,
        jobTitle: job.jobTitle,
        error: error,
        errorMessage: errorMessage,
      });
      toast.error(`Failed to discard job "${job.jobTitle}": ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handle edit job
  const handleEdit = (job) => {
    setEditModal({ isOpen: true, job });
  };

  // Auto archive expired jobs
  const handleAutoArchive = async () => {
    if (!user || userRole !== 'admin') {
      console.error('Role check failed:', { user: user, role: user?.role, userRole });
      toast.error('Only admin users can perform this action');
      return;
    }

    try {
      const result = await autoArchiveExpiredJobs(user);
      
      if (result.successful > 0) {
        toast.success(`Auto-archived ${result.successful} expired job(s) successfully!`);
        
        // Refresh jobs and analytics after archiving
        setTimeout(() => {
          if (jobsSubscriptionRef.current?.refresh) {
            jobsSubscriptionRef.current.refresh();
          }
          if (analyticsSubscriptionRef.current?.refresh) {
            analyticsSubscriptionRef.current.refresh();
          }
        }, 500);
      } else {
        toast.success('No expired jobs to archive. All jobs are up to date.');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to auto-archive jobs. Please try again.');
      console.error('Error auto-archiving jobs:', {
        error: error,
        errorMessage: errorMessage,
      });
      toast.error(`Failed to auto-archive jobs: ${errorMessage}`);
    }
  };

  // Get status styling - more user-friendly
  const getStatusChip = (status) => {
    const statusStyles = {
      active: { 
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50', 
        text: 'text-green-700', 
        border: 'border-green-200',
        label: 'Active'
      },
      posted: { 
        bg: 'bg-gradient-to-r from-blue-50 to-cyan-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        label: 'Posted'
      },
      accepted: {
        bg: 'bg-gradient-to-r from-green-50 to-teal-50',
        text: 'text-green-700',
        border: 'border-green-200',
        label: 'Accepted'
      },
      approved: {
        bg: 'bg-gradient-to-r from-green-50 to-teal-50',
        text: 'text-green-700',
        border: 'border-green-200',
        label: 'Approved'
      },
      in_review: {
        bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        label: 'IN REVIEW'
      },
      draft: { 
        bg: 'bg-gradient-to-r from-yellow-50 to-orange-50', 
        text: 'text-yellow-700', 
        border: 'border-yellow-200',
        label: 'Draft'
      },
      rejected: { 
        bg: 'bg-gradient-to-r from-red-50 to-rose-50', 
        text: 'text-red-700', 
        border: 'border-red-200',
        label: 'Rejected'
      },
      archived: { 
        bg: 'bg-gradient-to-r from-gray-50 to-slate-50', 
        text: 'text-gray-700', 
        border: 'border-gray-200',
        label: 'Archived'
      }
    };
    
    const style = statusStyles[status?.toLowerCase()] || statusStyles.draft;
    
    return (
      <span className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${style.bg} ${style.text} border ${style.border} inline-flex items-center shadow-sm`}>
        {style.label}
      </span>
    );
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'To be announced';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-GB');
    } catch {
      return 'To be announced';
    }
  };

  const totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Custom Calendar Styles */}
      <style>{`
        .react-datepicker {
          font-family: inherit;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .react-datepicker__header {
          background: linear-gradient(to right, #2563eb, #4f46e5);
          border-bottom: none;
          border-radius: 0.5rem 0.5rem 0 0;
          padding-top: 0.75rem;
        }
        .react-datepicker__current-month {
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
        }
        .react-datepicker__day-name {
          color: white;
          font-weight: 500;
        }
        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background: linear-gradient(to right, #2563eb, #4f46e5);
          border-radius: 0.375rem;
        }
        .react-datepicker__day:hover {
          background-color: #dbeafe;
          border-radius: 0.375rem;
        }
        .react-datepicker__day--today {
          font-weight: 600;
          color: #2563eb;
        }
        .react-datepicker__navigation-icon::before {
          border-color: white;
        }
        .react-datepicker__triangle {
          display: none;
        }
        
        /* Custom Select Dropdown Styles */
        select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
          background-color: white !important;
        }
        select:focus {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%232563eb' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
          background-color: white !important;
        }
        select option {
          padding: 0.75rem 1rem;
          font-weight: 500;
          background-color: white !important;
          color: #111827 !important;
          border: none;
        }
        select option:hover,
        select option:focus {
          background-color: #f3f4f6 !important;
          color: #111827 !important;
        }
        select option:checked,
        select option[selected] {
          background: linear-gradient(to right, #2563eb, #4f46e5) !important;
          color: white !important;
        }
        /* Ensure dropdown menu background is solid */
        select::-ms-expand {
          display: none;
        }
        select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
      `}</style>
      {/* Header and Analytics */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Job Moderation</h2>
            <p className="text-gray-600 text-lg">Review, approve, and manage job postings from recruiters</p>
          </div>
          
          <button
            onClick={handleAutoArchive}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
          >
            <FaArchive className="w-4 h-4" />
            Auto Archive Expired
          </button>
        </div>

        {/* Analytics Cards - More User Friendly */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <FaFileAlt className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-blue-700">{analytics.total || 0}</div>
          </div>
            <div className="text-sm font-medium text-blue-600">Total Jobs</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-5 rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <FaCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-green-700">{analytics.active || 0}</div>
          </div>
            <div className="text-sm font-medium text-green-600">Active Jobs</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-5 rounded-xl shadow-sm border border-cyan-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <FaFileAlt className="w-5 h-5 text-cyan-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-cyan-700">{analytics.posted || 0}</div>
          </div>
            <div className="text-sm font-medium text-cyan-600">Posted</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-yellow-100 p-5 rounded-xl shadow-sm border border-amber-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <FaSpinner className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-amber-700">{analytics.pendingApproval || 0}</div>
            </div>
            <div className="text-sm font-medium text-amber-600">Pending Review</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-100 p-5 rounded-xl shadow-sm border border-red-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <FaTimesCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-red-700">{analytics.rejected || 0}</div>
            </div>
            <div className="text-sm font-medium text-red-600">Rejected</div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-slate-100 p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <FaArchive className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-gray-700">{analytics.archived || 0}</div>
            </div>
            <div className="text-sm font-medium text-gray-600">Archived</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <FaFilter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filters & Search</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Search Jobs</label>
          <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by job title, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            </div>
          </div>

          {/* Status Filter */}
          <CustomDropdown
            label="Status"
            icon={FaFileAlt}
            iconColor="text-blue-600"
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            placeholder="All Status"
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'draft', label: 'Draft' },
              { value: 'in_review', label: 'Under Review' },
              { value: 'accepted', label: 'Accepted' },
              { value: 'active', label: 'Active' },
              { value: 'posted', label: 'Posted' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'archived', label: 'Archived' }
            ]}
          />

          {/* Company Filter */}
          <CustomDropdown
            label="Company"
            icon={FaBuilding}
            iconColor="text-indigo-600"
            value={filters.companyId}
            onChange={(value) => setFilters(prev => ({ ...prev, companyId: value }))}
            placeholder="All Companies"
            options={[
              { value: '', label: 'All Companies' },
              ...companies.map(company => ({
                value: company.id,
                label: company.name
              }))
            ]}
          />

          {/* Recruiter Filter */}
          <CustomDropdown
            label="Recruiter"
            icon={FaUser}
            iconColor="text-purple-600"
            value={filters.recruiterId}
            onChange={(value) => setFilters(prev => ({ ...prev, recruiterId: value }))}
            placeholder="All Recruiters"
            options={[
              { value: '', label: 'All Recruiters' },
              ...recruiters.map(recruiter => ({
                value: recruiter.id,
                label: recruiter.name
              }))
            ]}
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FaCalendarAlt className="w-4 h-4 text-blue-600" />
              Start Date
            </label>
            <div className="relative">
              <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 pointer-events-none z-10" />
              <DatePicker
                selected={filters.startDate ? new Date(filters.startDate) : null}
                onChange={(date) => setFilters(prev => ({ ...prev, startDate: date ? date.toISOString().split('T')[0] : '' }))}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select start date"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer bg-white text-gray-900 font-medium hover:border-gray-400 shadow-sm hover:shadow-md"
                wrapperClassName="w-full"
            />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FaCalendarAlt className="w-4 h-4 text-orange-600" />
              End Date
            </label>
            <div className="relative">
              <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500 w-5 h-5 pointer-events-none z-10" />
              <DatePicker
                selected={filters.endDate ? new Date(filters.endDate) : null}
                onChange={(date) => setFilters(prev => ({ ...prev, endDate: date ? date.toISOString().split('T')[0] : '' }))}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select end date"
                minDate={filters.startDate ? new Date(filters.startDate) : null}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer bg-white text-gray-900 font-medium hover:border-gray-400 shadow-sm hover:shadow-md"
                wrapperClassName="w-full"
            />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Search Results Summary */}
      {!loading && (
        <div className="text-sm text-gray-600">
          {debouncedSearch || Object.values(filters).some(f => f && f !== 'all') ? (
            <span>
              Showing {filteredJobs.length} of {jobs.length} jobs
              {debouncedSearch && <span className="font-medium"> matching "{debouncedSearch}"</span>}
            </span>
          ) : (
            <span>Showing all {jobs.length} jobs</span>
          )}
        </div>
      )}

      {/* Jobs Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <FaSpinner className="animate-spin text-blue-600 mr-3" />
            <span className="text-gray-600">Loading jobs...</span>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 max-w-md w-full border-2 border-blue-200 shadow-lg">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <FaFileAlt className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Jobs Found</h3>
                <div className="text-sm text-gray-600 leading-relaxed">
                  {searchTerm ? (
                    <div className="space-y-2">
                      <p className="font-medium">No jobs match your search criteria.</p>
                      <p className="text-gray-500">Try adjusting your search terms or filters.</p>
                    </div>
                  ) : filters.status && filters.status !== 'all' ? (
                    <div className="space-y-2">
                      <p className="font-medium">
                        No jobs found with status <span className="text-blue-600 font-bold capitalize">"{filters.status.replace('_', ' ')}"</span>
                      </p>
                      <p className="text-gray-500">There might be jobs with different statuses. Try viewing all jobs.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium">No jobs have been created yet.</p>
                      <p className="text-gray-500">Jobs will appear here once recruiters start posting them.</p>
                    </div>
                  )}
                </div>
              </div>
              
              {filters.status && filters.status !== 'all' && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FaFileAlt className="w-4 h-4" />
                    Show All Jobs
                  </button>
                  <button
                    onClick={handleResetFilters}
                    className="px-6 py-3 bg-white border-2 border-blue-300 hover:border-blue-400 text-blue-700 rounded-lg transition-all duration-200 font-semibold shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <FaFilter className="w-4 h-4" />
                    Reset Filters
                  </button>
                </div>
              )}
              
              {searchTerm && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-6 py-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Job Details
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Company
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Recruiter
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Drive Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-gray-900 leading-tight whitespace-nowrap overflow-hidden text-ellipsis" title={job.jobTitle || 'N/A'}>
                            {job.jobTitle ? job.jobTitle.charAt(0).toUpperCase() + job.jobTitle.slice(1).toLowerCase() : 'N/A'}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {job.jobType && (
                              <span className="px-2.5 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-md text-xs font-semibold border border-blue-200">
                                {job.jobType}
                              </span>
                            )}
                            {(job.salary || job.stipend) && (
                              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs font-semibold border border-green-200">
                                <FaDollarSign className="w-3 h-3" />
                                ₹{job.jobType === 'Internship' ? job.stipend : job.salary}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FaBuilding className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div className="text-xs font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis" title={job.companyDetails?.name || job.company || job.companyName || 'N/A'}>
                          {job.companyDetails?.name || job.company || job.companyName || 'N/A'}
                        </div>
                          </div>
                          {job.companyLocation || job.companyDetails?.location ? (
                            <div className="pl-6">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium border border-gray-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-full" title={job.companyLocation || job.companyDetails?.location}>
                                <FaMapMarkerAlt className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                <span>{job.companyLocation || job.companyDetails?.location}</span>
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="space-y-1.5">
                          {job.recruiter?.name ? (
                            <div className="flex items-center gap-2">
                              <FaUser className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                              <div className="text-sm font-semibold text-gray-900">{job.recruiter.name}</div>
                            </div>
                          ) : null}
                          {job.recruiter?.email ? (
                            <div className="text-xs text-gray-600 pl-6 break-all">
                              {job.recruiter.email}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 pl-6">N/A</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{formatDate(job.driveDate)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        {getStatusChip(job.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center gap-2">
                          {/* View Details Button */}
                          <button
                            onClick={() => setJobDetailModal({ isOpen: true, job })}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300"
                            title="View Full Details"
                          >
                            <FaInfoCircle className="w-4 h-4" />
                          </button>

                          {/* Edit Button - Show for IN_REVIEW jobs (admin can edit all fields) */}
                          {(job.status === 'in_review' && userRole === 'admin') && (
                            <button
                              onClick={() => window.location.href = `/admin/job/${job.id}?edit=true`}
                              className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-all duration-200 border border-purple-200 hover:border-purple-300"
                              title="Edit Job (All fields editable in IN_REVIEW status)"
                            >
                              <FaFileAlt className="w-4 h-4" />
                            </button>
                          )}

                          {/* Approve Button - Show for IN_REVIEW status */}
                          {(job.status === 'in_review') && (
                            <button
                              onClick={() => handleApprove(job)}
                              disabled={actionLoading[`approve_${job.id}`]}
                              className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                              title="Approve this job posting"
                            >
                              {actionLoading[`approve_${job.id}`] ? (
                                <FaSpinner className="w-4 h-4 animate-spin" />
                              ) : (
                                <FaCheckCircle className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Reject Button - Show for draft and in_review status */}
                          {(job.status === 'in_review') && (
                            <button
                              onClick={() => setRejectModal({ isOpen: true, job, reason: '' })}
                              disabled={actionLoading[`reject_${job.id}`]}
                              className="p-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                              title="Reject this job posting"
                            >
                              <FaTimesCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Button - Show for in_review status */}
                          {job.status === 'in_review' && (
                            <button
                              onClick={() => handleEdit(job)}
                              disabled={actionLoading[`edit_${job.id}`]}
                              className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                              title="Edit this job posting"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Discard Button - Show for in_review status */}
                          {job.status === 'in_review' && (
                            <button
                              onClick={() => handleDiscard(job)}
                              disabled={actionLoading[`discard_${job.id}`]}
                              className="p-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                              title="Discard this job posting"
                            >
                              {actionLoading[`discard_${job.id}`] ? (
                                <FaSpinner className="w-4 h-4 animate-spin" />
                              ) : (
                                <FaTrash className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Archive Button */}
                          {(job.status === 'posted') && (
                            <button
                              onClick={() => handleArchive(job)}
                              disabled={actionLoading[`archive_${job.id}`]}
                              className="p-2 bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                              title="Archive this job posting"
                            >
                              {actionLoading[`archive_${job.id}`] ? (
                                <FaSpinner className="w-4 h-4 animate-spin" />
                              ) : (
                                <FaArchive className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredJobs.length > pagination.itemsPerPage && (
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-t-2 border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span className="text-gray-500">Showing</span>
                    <span className="font-semibold text-blue-700">{((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}</span>
                    <span className="text-gray-500">to</span>
                    <span className="font-semibold text-blue-700">{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}</span>
                    <span className="text-gray-500">of</span>
                    <span className="font-semibold text-blue-700">{pagination.totalItems}</span>
                    <span className="text-gray-500">results</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                      disabled={pagination.currentPage === 1}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 flex items-center gap-2 shadow-sm"
                    >
                      <FaChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 shadow-sm">
                      <span className="text-blue-700">{pagination.currentPage}</span>
                      <span className="text-gray-500 mx-1">/</span>
                      <span>{totalPages}</span>
                    </div>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                      disabled={pagination.currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 flex items-center gap-2 shadow-sm"
                    >
                      <span>Next</span>
                      <FaChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Job Details Modal */}
      <JobDetailsModal 
        isOpen={jobDetailModal.isOpen}
        job={jobDetailModal.job}
        onClose={() => setJobDetailModal({ isOpen: false, job: null })}
        onApprove={handleApprove}
        onReject={(job) => setRejectModal({ isOpen: true, job, reason: '' })}
        onArchive={handleArchive}
        actionLoading={actionLoading}
        userRole={user?.role}
      />

      {/* Reject Modal */}
      <RejectModal 
        isOpen={rejectModal.isOpen}
        job={rejectModal.job}
        reason={rejectModal.reason}
        onReasonChange={(reason) => setRejectModal(prev => ({ ...prev, reason }))}
        onConfirm={() => handleReject(rejectModal.job, rejectModal.reason)}
        onClose={() => setRejectModal({ isOpen: false, job: null, reason: '' })}
        loading={actionLoading[`reject_${rejectModal.job?.id}`]}
      />

      {/* Edit Job Modal */}
      {editModal.isOpen && editModal.job && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-800">Edit Job</h2>
              <button
                onClick={() => setEditModal({ isOpen: false, job: null })}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <FaTimesCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <CreateJob 
                job={editModal.job}
                onCreated={() => {
                  setEditModal({ isOpen: false, job: null });
                  // Refresh jobs list
                  if (jobsSubscriptionRef.current?.refresh) {
                    jobsSubscriptionRef.current.refresh();
                  }
                  toast.success('Job updated successfully!');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Reject Modal Component
const RejectModal = ({ 
  isOpen, 
  job, 
  reason, 
  onReasonChange, 
  onConfirm, 
  onClose, 
  loading 
}) => {
  if (!isOpen || !job) return null;

  const rejectionReasons = [
    'Incomplete job description',
    'Invalid requirements',
    'Inappropriate content',
    'Spam or fraudulent posting',
    'Violation of platform policies',
    'Other'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-rose-50">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FaTimesCircle className="w-5 h-5 text-red-600" />
            Reject Job Posting
          </h2>
          <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
            <FaFileAlt className="w-4 h-4" />
            <span className="font-medium">{job.jobTitle}</span>
          </p>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Rejection
            </label>
            <select
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select a reason</option>
              {rejectionReasons.map(reasonOption => (
                <option key={reasonOption} value={reasonOption}>{reasonOption}</option>
              ))}
            </select>
          </div>

          {reason === 'Other' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Reason
              </label>
              <textarea
                value={reason === 'Other' ? '' : reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Please provide a specific reason..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-800 text-sm">
              <strong>Warning:</strong> Rejecting this job will notify the recruiter and mark the job as rejected.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!reason || loading}
            className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
          >
            {loading ? (
              <>
              <FaSpinner className="w-4 h-4 animate-spin" />
                <span>Rejecting...</span>
              </>
            ) : (
              <>
                <FaTimesCircle className="w-4 h-4" />
                <span>Confirm Rejection</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};