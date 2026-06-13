import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ImMail } from 'react-icons/im';
import {
  FaBriefcase,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaFilter,
  FaMapMarkerAlt,
  FaSpinner,
  FaTimes,
} from 'react-icons/fa';
import { TbHistoryToggle } from 'react-icons/tb';
import {
  Briefcase,
  Building2,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';
import { subscribeRecruiterDirectory, blockUnblockRecruiter, getRecruiterJobs, getRecruiterHistory, sendEmailToRecruiter, getRecruiterSummary } from '../../../services/recruiters';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import CustomDropdown from '../../common/CustomDropdown';
import BlockModal from '../../common/BlockModal';
import JobInfoDisplay from '../../common/JobInfoDisplay';
import RecruiterDirectoryTable from './RecruiterDirectoryTable';
import DirectoryLoadingPanel from './DirectoryLoading';

export default function RecruiterDirectory() {
  const location = useLocation();
  const base = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const [historyModal, setHistoryModal] = useState({ isOpen: false, recruiter: null });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', body: '' });
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobDescriptionModal, setJobDescriptionModal] = useState({ isOpen: false, recruiter: null });
  const [blockModal, setBlockModal] = useState({ isOpen: false, recruiter: null, isUnblocking: false });
  const [emailSending, setEmailSending] = useState(false);
  const [operationLoading, setOperationLoading] = useState({});

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  });

  // Hooks
  const { user } = useAuth();
  const toast = useToast();

  // Real-time subscription to recruiter directory
  useEffect(() => {
    console.log('📡 Setting up real-time recruiter directory subscription');
    setLoading(true);

    const unsubscribe = subscribeRecruiterDirectory(
      (recruitersData) => {
        console.log('📊 Received recruiter directory update:', recruitersData.length, 'recruiters');
        setRecruiters(recruitersData);
        setError(null);
        setLoading(false);
      },
      { limit: 100 } // Optional: limit for performance
    );

    return () => {
      console.log('📡 Cleaning up recruiter directory subscription');
      unsubscribe();
    };
  }, []);

  // Enhanced filtering with debounced search
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    location: '',
    minJobs: '',
    maxJobs: ''
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredRecruiters = recruiters.filter((recruiter) => {
    // Search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch = (
        recruiter.companyName?.toLowerCase().includes(searchLower) ||
        recruiter.recruiterName?.toLowerCase().includes(searchLower) ||
        recruiter.email?.toLowerCase().includes(searchLower) ||
        recruiter.location?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status) {
      const recruiterStatus = String(recruiter?.status || 'ACTIVE').toUpperCase();
      const filterStatus = String(filters.status).toUpperCase();
      // Map display names to database values
      if (filterStatus === 'ACTIVE') {
        if (recruiterStatus !== 'ACTIVE') return false;
      } else if (filterStatus === 'BLOCKED') {
        if (recruiterStatus !== 'BLOCKED') return false;
      } else if (filterStatus === 'INACTIVE') {
        // Inactive = PENDING or REJECTED (not ACTIVE and not BLOCKED)
        if (recruiterStatus === 'ACTIVE' || recruiterStatus === 'BLOCKED') return false;
      } else {
        if (recruiterStatus !== filterStatus) return false;
      }
    }

    // Location filter
    if (filters.location && !recruiter.location?.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }

    // Job count filters
    const jobCount = recruiter.totalJobPostings || 0;
    if (filters.minJobs && jobCount < parseInt(filters.minJobs)) {
      return false;
    }
    if (filters.maxJobs && jobCount > parseInt(filters.maxJobs)) {
      return false;
    }

    return true;
  });

  const sortedRecruiters = React.useMemo(() => {
    let sortableItems = [...filteredRecruiters];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredRecruiters, sortConfig]);

  // Paginated results
  const paginatedRecruiters = React.useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return sortedRecruiters.slice(startIndex, endIndex);
  }, [sortedRecruiters, pagination.currentPage, pagination.itemsPerPage]);

  // Update total items when filtered recruiters change
  React.useEffect(() => {
    setPagination(prev => ({
      ...prev,
      totalItems: filteredRecruiters.length,
      // Reset to first page when filters change
      currentPage: prev.totalItems !== filteredRecruiters.length ? 1 : prev.currentPage
    }));
  }, [filteredRecruiters.length]);

  const totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);

  // Calculate statistics from ALL recruiters (not filtered) - must be before conditional returns to follow Rules of Hooks
  const stats = React.useMemo(() => {
    // Normalize status for counting
    // PENDING is treated as Active since recruiters should be active once registered
    const normalizeStatus = (status) => {
      if (!status) return 'Active';
      const statusUpper = String(status).toUpperCase();
      if (statusUpper === 'ACTIVE') return 'Active';
      if (statusUpper === 'BLOCKED') return 'Blocked';
      // Treat PENDING and REJECTED as Active (they're not blocked, so they're active)
      if (statusUpper === 'PENDING') return 'Active';
      if (statusUpper === 'REJECTED') return 'Active';
      return 'Active';
    };

    const active = recruiters.filter(r => normalizeStatus(r.status) === 'Active').length;
    const blocked = recruiters.filter(r => normalizeStatus(r.status) === 'Blocked').length;
    const total = recruiters.length;
    const totalJobs = recruiters.reduce((sum, r) => sum + (r.totalJobPostings || 0), 0);
    return { total, active, blocked, totalJobs };
  }, [recruiters]);

  const canSendMail = ['admin', 'super_admin'].includes((user?.role || '').toLowerCase());
  const isSuperAdmin = (user?.role || '').toLowerCase() === 'super_admin';

  const tableRows = paginatedRecruiters.map((recruiter, idx) => ({
    ...recruiter,
    srNo: (pagination.currentPage - 1) * pagination.itemsPerPage + idx + 1,
  }));

  const openMailModal = (email) => {
    setEmailData({ to: email, subject: '', body: '' });
    setIsModalOpen(true);
  };

  const closeMailModal = () => {
    setIsModalOpen(false);
    setEmailData({ to: '', subject: '', body: '' });
  };

  const handleSendMail = async () => {
    const r = (user?.role || '').toLowerCase();
    if (!user || (r !== 'admin' && r !== 'super_admin')) {
      toast.showError('Only admin users can send emails to recruiters');
      return;
    }

    if (!emailData.subject.trim() || !emailData.body.trim()) {
      toast.showError('Please provide both subject and message content');
      return;
    }

    try {
      setEmailSending(true);

      // Find the recruiter by email to get their ID
      const targetRecruiter = recruiters.find(rec => rec.email === emailData.to);
      if (!targetRecruiter) {
        throw new Error('Recruiter not found');
      }

      const result = await sendEmailToRecruiter(
        targetRecruiter.id,
        emailData,
        user
      );

      if (result.success) {
        toast.showSuccess('Email sent successfully!');
        closeMailModal();
      } else {
        throw new Error('Failed to send email');
      }

    } catch (error) {
      console.error('Error sending email:', error);
      toast.showError(`Failed to send email: ${error.message}`);
    } finally {
      setEmailSending(false);
    }
  };

  const handleBlockUnblock = async (blockData) => {
    const role = (user?.role || '').toLowerCase();
    if (!user || role !== 'super_admin') {
      toast.showError('Only Super Admin users can block/unblock recruiters');
      return;
    }

    const { recruiter, isUnblocking } = blockData;
    const operationKey = `block_${recruiter.id}`;

    try {
      setOperationLoading(prev => ({ ...prev, [operationKey]: true }));

      const result = await blockUnblockRecruiter(
        recruiter.id,
        blockData,
        user
      );

      if (result.success) {
        const action = result.action;
        toast.showSuccess(
          `Recruiter ${action} successfully! Changes will reflect immediately.`
        );

        // Close modal
        setBlockModal({ isOpen: false, recruiter: null, isUnblocking: false });
      } else {
        throw new Error('Operation failed');
      }

    } catch (error) {
      console.error('Error blocking/unblocking recruiter:', error);
      toast.showError(
        `Failed to ${isUnblocking ? 'unblock' : 'block'} recruiter: ${error.message}`
      );
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationKey]: false }));
    }
  };

  const [recruiterSummaries, setRecruiterSummaries] = useState({});

  const fetchRecruiterSummary = async (recruiterId) => {
    if (recruiterSummaries[recruiterId]) {
      return recruiterSummaries[recruiterId];
    }

    try {
      const summary = await getRecruiterSummary(recruiterId);
      setRecruiterSummaries(prev => ({ ...prev, [recruiterId]: summary }));
      return summary;
    } catch (error) {
      console.error('Error fetching recruiter summary:', error);
      // Fallback to basic data
      const fallbackSummary = {
        jobsPerCenter: { 'Lucknow': 0, 'Pune': 0, 'Bangalore': 0, 'Noida': 0 },
        jobsPerSchool: { 'SOT': 0, 'SOH': 0, 'SOM': 0 },
        totalJobs: 0,
        activeJobs: 0,
        relationshipType: 'Partner Company',
        zone: 'North Zone',
        emailsSent: 0,
        statusChanges: 0
      };
      setRecruiterSummaries(prev => ({ ...prev, [recruiterId]: fallbackSummary }));
      return fallbackSummary;
    }
  };

  const RecruiterHistory = ({ recruiter }) => {
    const [history, setHistory] = useState(null);
    const [summary, setSummary] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
      const loadRecruiterData = async () => {
        try {
          setHistoryLoading(true);
          const [historyData, summaryData] = await Promise.all([
            getRecruiterHistory(recruiter.id),
            fetchRecruiterSummary(recruiter.id)
          ]);
          setHistory(historyData);
          setSummary(summaryData);
        } catch (error) {
          console.error('Error loading recruiter data:', error);
        } finally {
          setHistoryLoading(false);
        }
      };

      if (recruiter.id) {
        loadRecruiterData();
      }
    }, [recruiter.id]);

    if (historyLoading) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-inner flex items-center justify-center">
          <FaSpinner className="animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading recruiter history...</span>
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-lg shadow-inner">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Activity History</h3>

        {/* Summary Section */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-600 mb-2">Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <h5 className="font-medium text-sm text-gray-700 mb-2">Jobs per Center</h5>
              {summary && Object.entries(summary.jobsPerCenter).map(([center, count]) => (
                <div key={center} className="flex justify-between text-sm">
                  <span>{center}:</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <h5 className="font-medium text-sm text-gray-700 mb-2">Jobs per School</h5>
              {summary && Object.entries(summary.jobsPerSchool).map(([school, count]) => (
                <div key={school} className="flex justify-between text-sm">
                  <span>{school}:</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600 space-y-1">
            <div>Total Jobs: <span className="font-medium">{summary?.totalJobs || 0}</span></div>
            <div>Active Jobs: <span className="font-medium">{summary?.activeJobs || 0}</span></div>
            <div>Relationship Type: <span className="font-medium">{summary?.relationshipType || 'Partner Company'}</span></div>
            <div>Zone: <span className="font-medium">{summary?.zone || 'Not specified'}</span></div>
            <div>Emails Sent: <span className="font-medium">{summary?.emailsSent || 0}</span></div>
          </div>
        </div>

        {/* Job Posting History */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-600 mb-2">Job Posting History</h4>
          <div className="max-h-40 overflow-y-auto">
            {history?.jobPostings && history.jobPostings.length > 0 ? (
              <div className="space-y-2">
                {history.jobPostings.slice(0, 10).map((job, index) => (
                  <div key={job.id || index} className="text-sm bg-gray-50 p-2 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-gray-800">{job.jobTitle}</span>
                        <span className="text-gray-600 ml-2">at {job.company}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="text-gray-600 mt-1">
                      {job.date ? new Date(job.date.toMillis()).toLocaleDateString() : 'Unknown date'} • {job.location || 'Location not specified'}
                    </div>
                  </div>
                ))}
                {history.jobPostings.length > 10 && (
                  <div className="text-center text-sm text-gray-500">... and {history.jobPostings.length - 10} more</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No job posting history available</div>
            )}
          </div>
        </div>

        {/* Login History */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-600 mb-2">Recent Activity</h4>
          <div className="text-sm text-gray-600">
            {summary?.lastActivity ? (
              <div>Last seen: {new Date(summary.lastActivity.toMillis()).toLocaleString()}</div>
            ) : (
              <div className="italic">No recent activity recorded</div>
            )}
            {summary?.joinDate && (
              <div>Member since: {new Date(summary.joinDate.toMillis()).toLocaleDateString()}</div>
            )}
          </div>
        </div>

        {/* Past Emails Sent */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-600 mb-2">Email History</h4>
          <div className="max-h-32 overflow-y-auto">
            {history?.notifications && history.notifications.filter(n => n.type === 'email_sent').length > 0 ? (
              <div className="space-y-1">
                {history.notifications
                  .filter(n => n.type === 'email_sent')
                  .slice(0, 5)
                  .map((email, index) => (
                    <div key={email.id || index} className="text-sm bg-gray-50 p-2 rounded">
                      <div className="font-medium">{email.data?.subject || 'No Subject'}</div>
                      <div className="text-gray-600">
                        {email.date ? new Date(email.date.toMillis()).toLocaleString() : 'Unknown date'} •
                        from {email.data?.adminName || 'Admin'}
                      </div>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No emails sent to this recruiter</div>
            )}
          </div>
        </div>

        {/* Status Change History */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-600 mb-2">Status Change History</h4>
          <div className="max-h-32 overflow-y-auto">
            {history?.statusChanges && history.statusChanges.length > 0 ? (
              <div className="space-y-1">
                {history.statusChanges.map((change, index) => (
                  <div key={change.id || index} className="text-sm bg-gray-50 p-2 rounded">
                    <div className="flex justify-between items-start">
                      <span className={`font-medium ${change.type === 'recruiter_blocked' ? 'text-red-600' : 'text-green-600'
                        }`}>
                        {change.type === 'recruiter_blocked' ? 'Blocked' : 'Unblocked'}
                      </span>
                      <span className="text-gray-600 text-xs">
                        {change.date ? new Date(change.date.toMillis()).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                    <div className="text-gray-600 mt-1">
                      By: {change.data?.adminName || 'Admin'}
                      {change.data?.reason && <div>Reason: {change.data.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No status changes recorded</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && recruiters.length === 0) {
    return (
      <div className="space-y-6">
        <DirectoryLoadingPanel
          title="Loading recruiters..."
          subtitle="Please wait while we fetch the data"
        />
      </div>
    );
  }

  if (error && recruiters.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-sky-50 border border-sky-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{stats.total}</div>
          <div className="text-sm text-slate-600 mt-1">Total Recruiters</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-800 tabular-nums">{stats.active}</div>
          <div className="text-sm text-emerald-700 mt-1">Active</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-800 tabular-nums">{stats.blocked}</div>
          <div className="text-sm text-red-700 mt-1">Blocked</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{stats.totalJobs}</div>
          <div className="text-sm text-slate-600 mt-1">Jobs Posted</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <CustomDropdown
            label="Status"
            compact
            options={[
              { value: '', label: 'All status' },
              { value: 'Active', label: 'Active' },
              { value: 'Blocked', label: 'Blocked' },
            ]}
            value={filters.status}
            onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
            placeholder="All status"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Location
            </label>
            <input
              type="text"
              placeholder="Filter by location"
              value={filters.location}
              onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 bg-white text-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Min jobs
            </label>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={filters.minJobs}
              onChange={(e) => setFilters((prev) => ({ ...prev, minJobs: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 bg-white text-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Max jobs
            </label>
            <input
              type="number"
              placeholder="Any"
              min="0"
              value={filters.maxJobs}
              onChange={(e) => setFilters((prev) => ({ ...prev, maxJobs: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 bg-white text-gray-800"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setDebouncedSearch('');
              setFilters({ status: '', location: '', minJobs: '', maxJobs: '' });
            }}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-sm font-medium transition-colors"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div>
        {loading ? (
          <DirectoryLoadingPanel
            title="Loading recruiters..."
            subtitle="Please wait while we fetch the data"
          />
        ) : filteredRecruiters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl p-8 max-w-md w-full border border-indigo-100 shadow-lg">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                  <Building2 className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 font-outfit">No Recruiters Found</h3>
                <p className="text-sm text-slate-600">
                  {debouncedSearch || Object.values(filters).some((f) => f)
                    ? 'Try adjusting your search or filters.'
                    : 'Recruiters will appear here once they register.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <RecruiterDirectoryTable
              rows={tableRows}
              showingCount={tableRows.length}
              totalCount={filteredRecruiters.length}
              searchQuery={searchTerm}
              onSearchChange={setSearchTerm}
              canSendMail={canSendMail}
              isSuperAdmin={isSuperAdmin}
              operationLoading={operationLoading}
              onMail={(recruiter) => {
                if (canSendMail) {
                  openMailModal(recruiter.email);
                } else {
                  toast.showError('Only admin users can send emails');
                }
              }}
              onViewJobs={(recruiter) => setJobDescriptionModal({ isOpen: true, recruiter })}
              onBlock={(recruiter) => {
                if (isSuperAdmin) {
                  setBlockModal({
                    isOpen: true,
                    recruiter,
                    isUnblocking: String(recruiter.status || '').toUpperCase() === 'BLOCKED',
                  });
                } else {
                  toast.showError('Only Super Admin users can block/unblock recruiters');
                }
              }}
              onHistory={(recruiter) => setHistoryModal({ isOpen: true, recruiter })}
            />

            {totalPages > 1 && (
              <div className="mt-3 bg-white rounded-2xl border border-slate-100 px-4 py-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className="text-slate-500">Showing</span>
                    <span className="font-semibold text-indigo-700">
                      {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
                    </span>
                    <span className="text-slate-500">to</span>
                    <span className="font-semibold text-indigo-700">
                      {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                    </span>
                    <span className="text-slate-500">of</span>
                    <span className="font-semibold text-indigo-700">{pagination.totalItems}</span>
                    <span className="text-slate-500">results</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                      disabled={pagination.currentPage === 1}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all flex items-center gap-2"
                    >
                      <FaChevronLeft className="w-3.5 h-3.5" />
                      Previous
                    </button>
                    <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700">
                      <span className="text-indigo-700">{pagination.currentPage}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span>{totalPages}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                      disabled={pagination.currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all flex items-center gap-2"
                    >
                      Next
                      <FaChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {historyModal.isOpen && historyModal.recruiter && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                Activity History - {historyModal.recruiter.companyName || 'Unknown'}
              </h2>
              <button
                onClick={() => setHistoryModal({ isOpen: false, recruiter: null })}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <RecruiterHistory recruiter={historyModal.recruiter} />
            </div>
          </div>
        </div>
      )}

      <MailModal
        isModalOpen={isModalOpen}
        closeMailModal={closeMailModal}
        emailData={emailData}
        setEmailData={setEmailData}
        handleSendMail={handleSendMail}
      />

      <JobDescriptionModal
        isOpen={jobDescriptionModal.isOpen}
        recruiter={jobDescriptionModal.recruiter}
        onClose={() => setJobDescriptionModal({ isOpen: false, recruiter: null })}
      />

      <BlockModal
        isOpen={blockModal.isOpen}
        entity={blockModal.recruiter}
        entityType="recruiter"
        isUnblocking={blockModal.isUnblocking}
        onClose={() => setBlockModal({ isOpen: false, recruiter: null, isUnblocking: false })}
        onConfirm={(blockData) => handleBlockUnblock(blockData)}
      />
    </div>
  );
}

const JobDescriptionModal = ({ isOpen, recruiter, onClose }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadJobs = async () => {
      if (!recruiter?.email) return;

      try {
        setLoading(true);
        setError(null);
        const recruiterJobs = await getRecruiterJobs(recruiter.email);
        setJobs(recruiterJobs);
      } catch (err) {
        console.error('Error loading recruiter jobs:', err);
        setError('Failed to load job descriptions');
        // Fallback to jobs from recruiter object if available
        setJobs(recruiter.jobs || []);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && recruiter) {
      loadJobs();
    }
  }, [isOpen, recruiter]);

  if (!isOpen || !recruiter) return null;

  // Get employment type for display
  const getEmploymentType = (job) => {
    if (job.jobType) {
      return job.jobType === 'Internship' ? 'Internship' :
        job.jobType === 'Full-Time' ? 'Full-Time' :
          job.jobType;
    }
    // Fallback logic
    if (job.title?.toLowerCase().includes('intern')) return 'Internship';
    return 'Full-Time';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-orange-50 via-pink-50 to-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Job Descriptions - {recruiter.companyName || 'Unknown'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            title="Close"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="animate-spin text-purple-600 mr-3" />
              <span className="text-gray-600">Loading job descriptions...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">{error}</div>
              <button
                onClick={() => window.location.reload()}
                className="text-purple-600 hover:text-purple-800 underline"
              >
                Try again
              </button>
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="space-y-2">
              {jobs.map((job, index) => {
                const employmentType = getEmploymentType(job);
                const jobId = job.id || job.jobId;

                return (
                  <div
                    key={job.id || index}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FaBriefcase className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {job.jobTitle || job.title || 'Job Position'}
                        </div>
                        <div className="text-sm text-gray-600 mt-0.5">
                          {employmentType}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (jobId) {
                          window.open(`${base}/job/${jobId}`, '_blank');
                        }
                      }}
                      className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors flex-shrink-0"
                      title="View Job Description"
                    >
                      <FaEye className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FaBriefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Job Descriptions Available</h3>
              <p className="text-sm">This recruiter hasn't posted any job descriptions yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const MailModal = ({ isModalOpen, closeMailModal, emailData, setEmailData, handleSendMail }) => {
  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);
  const [cc, setCC] = useState('');
  const [bcc, setBCC] = useState('');
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);

  // Text formatting functions
  const formatText = (format) => {
    const textarea = document.querySelector('textarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = emailData.body.substring(start, end);
    let newText = emailData.body;

    switch (format) {
      case 'bold':
        newText =
          emailData.body.substring(0, start) +
          `<strong>${selectedText}</strong>` +
          emailData.body.substring(end);
        break;
      case 'italic':
        newText =
          emailData.body.substring(0, start) +
          `<em>${selectedText}</em>` +
          emailData.body.substring(end);
        break;
      case 'underline':
        newText =
          emailData.body.substring(0, start) +
          `<u>${selectedText}</u>` +
          emailData.body.substring(end);
        break;
      default:
        break;
    }

    setEmailData({ ...emailData, body: newText });

    // Wait for state update then set selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end + (format === 'bold' ? 17 : 9));
    }, 0);
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setAttachments([...attachments, ...files]);
    }
  };

  // Remove attachment
  const removeAttachment = (index) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  // Handle send with CC/BCC
  const handleSendWithRecipients = () => {
    const finalData = {
      ...emailData,
      cc: showCC ? cc : '',
      bcc: showBCC ? bcc : '',
      attachments: attachments,
    };

    // In a real app, you would do something with this data
    console.log('Sending email with:', finalData);
    handleSendMail();
  };

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <ImMail className="w-5 h-5 text-blue-600" />
            New Message
          </h2>
          <button
            onClick={closeMailModal}
            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-600 rounded-lg transition-all duration-200 border border-gray-200 hover:border-gray-300 font-medium text-sm"
          >
            Close
          </button>
        </div>

        {/* Email Composition Area */}
        <div className="flex-1 overflow-auto">
          {/* Recipient Field */}
          <div className="px-6 py-3 border-b border-gray-200 flex items-start">
            <div className="w-20 pt-2 text-sm text-gray-600">To</div>
            <div className="flex-1">
              <input
                type="text"
                value={emailData.to}
                readOnly
                className="w-full p-2 text-gray-600 bg-white border-b border-transparent focus:outline-none"
              />
              <div className="text-xs text-gray-500 mt-1">
                <button
                  onClick={() => setShowCC(!showCC)}
                  className="text-blue-500 hover:text-blue-700 mr-4"
                >
                  Cc
                </button>
                <button
                  onClick={() => setShowBCC(!showBCC)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  Bcc
                </button>
              </div>
            </div>
          </div>

          {/* CC Field - Conditionally Rendered */}
          {showCC && (
            <div className="px-6 py-3 border-b border-gray-200 flex items-center">
              <div className="w-20 text-sm text-gray-600">Cc</div>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCC(e.target.value)}
                placeholder="Enter CC recipients"
                className="flex-1 p-2 focus:outline-none"
              />
            </div>
          )}

          {/* BCC Field - Conditionally Rendered */}
          {showBCC && (
            <div className="px-6 py-3 border-b border-gray-200 flex items-center">
              <div className="w-20 text-sm text-gray-600">Bcc</div>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBCC(e.target.value)}
                placeholder="Enter BCC recipients"
                className="flex-1 p-2 focus:outline-none"
              />
            </div>
          )}

          {/* Subject Field */}
          <div className="px-6 py-3 border-b border-gray-200 flex items-center">
            <div className="w-20 text-sm text-gray-600">Subject</div>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              placeholder="Add a subject"
              className="flex-1 p-2 focus:outline-none"
            />
          </div>

          {/* Message Body */}
          <div className="px-6 py-4 h-96">
            <textarea
              value={emailData.body}
              onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
              className="w-full h-full p-2 resize-none focus:outline-none border border-gray-200 rounded"
              placeholder="Compose your email here..."
            ></textarea>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-6 py-2 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Attachments:</h3>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center bg-gray-100 rounded px-3 py-1 text-sm">
                    <span className="mr-2">{file.name}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Formatting Toolbar and Action Buttons */}
        <div className="border-t border-gray-200 px-6 py-4">
          {/* Formatting Toolbar */}
          <div className="flex items-center space-x-2 mb-4">
            <button
              onClick={() => formatText('bold')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600 font-bold"
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => formatText('italic')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600 italic"
              title="Italic"
            >
              I
            </button>
            <button
              onClick={() => formatText('underline')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600 underline"
              title="Underline"
            >
              U
            </button>

            <div className="border-l border-gray-300 h-6 mx-2"></div>

            <button
              onClick={() => fileInputRef.current.click()}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
              title="Attach files"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />

            <button className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Insert link">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>

            <button className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Insert emoji">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSendMail}
                disabled={emailSending}
                className={`px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${emailSending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                  } text-white`}
              >
                {emailSending ? (
                  <>
                    <FaSpinner className="animate-spin w-4 h-4" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <ImMail className="w-4 h-4" />
                    <span>Send</span>
                  </>
                )}
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600" title="Save draft">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              <button
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                title="Delete"
                onClick={closeMailModal}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={closeMailModal}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecruiterHistory = ({ recruiter }) => {
  if (!recruiter || !recruiter.activityHistory || recruiter.activityHistory.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <TbHistoryToggle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No History Available</h3>
        <p className="text-sm">There is no recorded activity for this recruiter yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recruiter.activityHistory.map((activity, index) => (
        <div key={index} className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-lg flex-shrink-0 border border-blue-100">
            <TbHistoryToggle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <h4 className="font-semibold text-gray-900 text-base truncate">{activity.type}</h4>
                <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1.5 truncate">
                  <FaMapMarkerAlt className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{activity.location || 'Not specified'}</span>
                </p>
              </div>
              <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                <span className={`inline-flex px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full ${activity.status?.toUpperCase() === 'ACTIVE' ? 'bg-green-100 text-green-700 border border-green-200' :
                    activity.status?.toUpperCase() === 'CLOSED' ? 'bg-red-100 text-red-700 border border-red-200' :
                      'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                  {activity.status || 'PAST'}
                </span>
                <p className="text-xs text-gray-500 font-medium">
                  {new Date(activity.date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};