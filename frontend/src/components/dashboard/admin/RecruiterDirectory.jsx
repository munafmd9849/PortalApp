import React, { useState, useRef, useEffect } from 'react';
import { ImMail } from 'react-icons/im';
import { MdEditNote, MdBlock } from 'react-icons/md';
import { FaEye, FaChevronDown, FaChevronUp, FaSearch, FaBriefcase, FaMapMarkerAlt, FaCalendarAlt, FaMoneyBillWave, FaBuilding, FaUsers, FaClock, FaExternalLinkAlt, FaSpinner, FaCheckCircle, FaChevronLeft, FaChevronRight, FaFilter, FaTimesCircle, FaFileAlt } from 'react-icons/fa';
import { TbHistoryToggle } from 'react-icons/tb';
import { subscribeRecruiterDirectory, blockUnblockRecruiter, getRecruiterJobs, getRecruiterHistory, sendEmailToRecruiter, getRecruiterSummary } from '../../../services/recruiters';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import CustomDropdown from '../../common/CustomDropdown';
import BlockModal from '../../common/BlockModal';
import JobInfoDisplay from '../../common/JobInfoDisplay';

export default function RecruiterDirectory() {
  const [expandedRecruiter, setExpandedRecruiter] = useState(null);
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
    if (filters.status && recruiter.status !== filters.status) {
      return false;
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

  // Calculate statistics - must be before conditional returns to follow Rules of Hooks
  const stats = React.useMemo(() => {
    const active = filteredRecruiters.filter(r => r.status === 'Active').length;
    const blocked = filteredRecruiters.filter(r => r.status === 'Blocked').length;
    const total = filteredRecruiters.length;
    const totalJobs = filteredRecruiters.reduce((sum, r) => sum + (r.totalJobPostings || 0), 0);
    return { total, active, blocked, totalJobs };
  }, [filteredRecruiters]);

  // Get status styling - matching job moderation style
  const getStatusChip = (status) => {
    const statusStyles = {
      active: { 
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50', 
        text: 'text-green-700', 
        border: 'border-green-200',
        label: 'Active'
      },
      blocked: { 
        bg: 'bg-gradient-to-r from-red-50 to-rose-50', 
        text: 'text-red-700', 
        border: 'border-red-200',
        label: 'Blocked'
      }
    };
    
    const normalizedStatus = status?.toLowerCase();
    const style = statusStyles[normalizedStatus] || statusStyles.active;
    
    return (
      <span className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${style.bg} ${style.text} border ${style.border} inline-flex items-center shadow-sm`}>
        {style.label}
      </span>
    );
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const toggleExpand = (id) => {
    setExpandedRecruiter((prev) => (prev === id ? null : id));
  };

  const getHeaderClass = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? 'sort-asc' : 'sort-desc';
    }
    return '';
  };

  const openMailModal = (email) => {
    setEmailData({ to: email, subject: '', body: '' });
    setIsModalOpen(true);
  };

  const closeMailModal = () => {
    setIsModalOpen(false);
    setEmailData({ to: '', subject: '', body: '' });
  };

  const handleSendMail = async () => {
    if (!user || user.role !== 'admin') {
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
      const targetRecruiter = recruiters.find(r => r.email === emailData.to);
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
    if (!user || user.role !== 'admin') {
      toast.showError('Only admin users can block/unblock recruiters');
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
  
  const getRecruiterSummary = async (recruiterId) => {
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
        jobsPerCenter: { 'Lucknow': 0, 'Pune': 0, 'Bangalore': 0, 'Noida': 0 , 'Indore': 0, 'Patna': 0},
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
            getRecruiterSummary(recruiter.id)
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
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
                      <span className={`font-medium ${
                        change.type === 'recruiter_blocked' ? 'text-red-600' : 'text-green-600'
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <FaSpinner className="animate-spin text-blue-600 mr-3" />
        <span className="text-gray-600">Loading recruiters...</span>
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
      {/* Header and Analytics */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Recruiter Directory</h2>
            <p className="text-gray-600 text-lg">Manage and monitor all recruiter accounts</p>
          </div>
        </div>

        {/* Analytics Cards - Matching Job Moderation Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <FaBuilding className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-blue-700">{stats.total}</div>
            </div>
            <div className="text-sm font-medium text-blue-600">Total Recruiters</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-5 rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <FaCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-green-700">{stats.active}</div>
            </div>
            <div className="text-sm font-medium text-green-600">Active</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-100 p-5 rounded-xl shadow-sm border border-red-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <MdBlock className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-red-700">{stats.blocked}</div>
            </div>
            <div className="text-sm font-medium text-red-600">Blocked</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl shadow-sm border border-purple-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <FaBriefcase className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-purple-700">{stats.totalJobs}</div>
            </div>
            <div className="text-sm font-medium text-purple-600">Total Jobs</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <FaFilter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filters & Search</h3>
        </div>
        
        {/* First Row: Search, Status, Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
              <FaSearch className="w-4 h-4 text-blue-600" />
              <span>Search Recruiters</span>
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
              <FaCheckCircle className="w-4 h-4 text-green-600" />
              <span>Status</span>
            </label>
            <CustomDropdown
              label=""
              icon={FaCheckCircle}
              iconColor="text-green-600"
              options={[
                { value: '', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Blocked', label: 'Blocked' }
              ]}
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              placeholder="All Status"
            />
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
              <FaMapMarkerAlt className="w-4 h-4 text-indigo-600" />
              <span>Location</span>
            </label>
            <div className="relative">
              <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Filter by location"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Second Row: Job Count Range, Reset Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Job Count Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
              <FaBriefcase className="w-4 h-4 text-purple-600" />
              <span>Job Count Range</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <FaBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  placeholder="Min"
                  min="0"
                  value={filters.minJobs}
                  onChange={(e) => setFilters(prev => ({ ...prev, minJobs: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="relative">
                <FaBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  placeholder="Max"
                  min="0"
                  value={filters.maxJobs}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxJobs: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setDebouncedSearch('');
                setFilters({ status: '', location: '', minJobs: '', maxJobs: '' });
              }}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow flex items-center justify-center gap-2"
            >
              <FaTimesCircle className="w-4 h-4" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Results Summary */}
      {!loading && (
        <div className="text-sm text-gray-600">
          {debouncedSearch || Object.values(filters).some(f => f) ? (
            <span>
              Showing {filteredRecruiters.length} of {recruiters.length} recruiters
              {debouncedSearch && <span className="font-medium"> matching "{debouncedSearch}"</span>}
            </span>
          ) : (
            <span>Showing all {recruiters.length} recruiters</span>
          )}
        </div>
      )}

      {/* Recruiters Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <FaSpinner className="animate-spin text-blue-600 mr-3" />
            <span className="text-gray-600">Loading recruiters...</span>
          </div>
        ) : filteredRecruiters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 max-w-md w-full border-2 border-blue-200 shadow-lg">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <FaBuilding className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Recruiters Found</h3>
                <div className="text-sm text-gray-600 leading-relaxed">
                  {debouncedSearch ? (
                    <div className="space-y-2">
                      <p className="font-medium">No recruiters match your search criteria.</p>
                      <p className="text-gray-500">Try adjusting your search terms or filters.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium">No recruiters have been registered yet.</p>
                      <p className="text-gray-500">Recruiters will appear here once they register.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Company Details
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Recruiter
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Last Job Posted
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
                  {paginatedRecruiters.map((recruiter) => (
                    <React.Fragment key={recruiter.id}>
                      <tr className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                        <td className="px-6 py-4 border-r border-gray-100">
                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-gray-900 leading-tight whitespace-nowrap overflow-hidden text-ellipsis" title={recruiter.companyName || 'N/A'}>
                              {recruiter.companyName || 'N/A'}
                            </div>
                            {recruiter.totalJobPostings !== undefined && (
                              <div className="flex items-center gap-1.5">
                                <FaBriefcase className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-600">{recruiter.totalJobPostings || 0} jobs</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-100">
                          <div className="flex items-center gap-2">
                            <FaUsers className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            <div className="text-xs font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis" title={recruiter.recruiterName || 'N/A'}>
                              {recruiter.recruiterName || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-100">
                          <div className="flex items-center gap-2">
                            <ImMail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div className="text-xs font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis" title={recruiter.email}>
                              {recruiter.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-100">
                          <div className="flex items-center gap-2">
                            <FaMapMarkerAlt className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            <div className="text-xs font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis" title={recruiter.location || 'N/A'}>
                              {recruiter.location || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-100">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{recruiter.lastJobPostedAt || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-100">
                          {getStatusChip(recruiter.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center gap-2">
                            {/* Send Mail Button */}
                            <button
                              onClick={() => {
                                if (user?.role === 'admin') {
                                  openMailModal(recruiter.email);
                                } else {
                                  toast.showError('Only admin users can send emails');
                                }
                              }}
                              disabled={user?.role !== 'admin'}
                              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Send Mail"
                            >
                              <ImMail className="w-4 h-4" />
                            </button>

                            {/* View Jobs Button */}
                            <button
                              onClick={() => {
                                console.log('Eye icon clicked, recruiter:', recruiter);
                                setJobDescriptionModal({ isOpen: true, recruiter });
                              }}
                              className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-all duration-200 border border-purple-200 hover:border-purple-300"
                              title="View Job Descriptions"
                            >
                              <FaEye className="w-4 h-4" />
                            </button>

                            {/* Block/Unblock Button */}
                            <button
                              onClick={() => {
                                if (user?.role === 'admin') {
                                  setBlockModal({ 
                                    isOpen: true, 
                                    recruiter, 
                                    isUnblocking: recruiter.status === 'Blocked' 
                                  });
                                } else {
                                  toast.showError('Only admin users can block/unblock recruiters');
                                }
                              }}
                              disabled={user?.role !== 'admin' || operationLoading[`block_${recruiter.id}`]}
                              className="p-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                              title={recruiter.status === 'Blocked' ? 'Unblock Recruiter' : 'Block Recruiter'}
                            >
                              {operationLoading[`block_${recruiter.id}`] ? (
                                <FaSpinner className="w-4 h-4 animate-spin" />
                              ) : (
                                <MdBlock className="w-4 h-4" />
                              )}
                            </button>

                            {/* View History Button */}
                            <button
                              onClick={() => toggleExpand(recruiter.id)}
                              className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg transition-all duration-200 border border-yellow-200 hover:border-yellow-300"
                              aria-label={expandedRecruiter === recruiter.id ? 'Hide History' : 'View History'}
                              title={expandedRecruiter === recruiter.id ? 'Hide History' : 'View History'}
                            >
                              <TbHistoryToggle 
                                className={`w-4 h-4 transition-transform duration-300 ${expandedRecruiter === recruiter.id ? 'rotate-180' : ''}`} 
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRecruiter === recruiter.id && (
                        <tr>
                          <td colSpan="7" className="p-4 bg-gradient-to-b from-gray-50 to-gray-100">
                            <div className="bg-white rounded-xl shadow-inner p-5 border border-gray-200">
                              <RecruiterHistory recruiter={recruiter} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {filteredRecruiters.length > pagination.itemsPerPage && (
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

      {/* Modals */}
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
  
  console.log('JobDescriptionModal props:', { isOpen, recruiter, jobs: jobs.length });
  if (!isOpen || !recruiter) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FaBriefcase className="w-5 h-5 text-purple-600" />
            Job Descriptions - {recruiter.companyName}
          </h2>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-600 rounded-lg transition-all duration-200 border border-gray-200 hover:border-gray-300 font-medium text-sm"
          >
            Close
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Loading job descriptions...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">{error}</div>
              <button 
                onClick={() => window.location.reload()} 
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Try again
              </button>
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map((job, index) => (
                <div key={job.id || index} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  {/* Job Header with Status */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {job.jobTitle || 'Job Position'}
                      </h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ml-4 ${
                      job.status === 'active' || job.status === 'posted' ? 'bg-green-100 text-green-800' : 
                      job.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status === 'posted' ? 'Active' : (job.status || 'Draft')}
                    </span>
                  </div>

                  {/* Use JobInfoDisplay for consistent job field display */}
                  <JobInfoDisplay 
                    job={job} 
                    variant="compact" 
                    showMetadata={false}
                    showTargeting={false}
                  />

                  {/* Additional job-specific fields not in JobInfoDisplay */}
                  {(job.workMode || job.openings || (job.duration && job.jobType === 'Internship')) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {job.workMode && (
                        <div className="flex items-center text-sm">
                          <FaBuilding className="text-blue-500 mr-2" />
                          <span className="font-medium">Work Mode: </span>
                          <span className="ml-1">{job.workMode}</span>
                        </div>
                      )}
                      {job.openings && (
                        <div className="flex items-center text-sm">
                          <FaUsers className="text-purple-500 mr-2" />
                          <span className="font-medium">Openings: </span>
                          <span className="ml-1">{job.openings}</span>
                        </div>
                      )}
                      {job.duration && job.jobType === 'Internship' && (
                        <div className="flex items-center text-sm">
                          <FaClock className="text-orange-500 mr-2" />
                          <span className="font-medium">Duration: </span>
                          <span className="ml-1">{job.duration}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Eligibility Criteria */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Eligibility Criteria:</h4>
                    <div className="bg-white p-3 rounded border text-sm text-gray-600">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {job.qualification && (
                          <div><span className="font-medium">Qualification:</span> {job.qualification}</div>
                        )}
                        {job.specialization && (
                          <div><span className="font-medium">Specialization:</span> {job.specialization}</div>
                        )}
                        {job.yop && (
                          <div><span className="font-medium">Year of Passing:</span> {job.yop}</div>
                        )}
                        {job.minCgpa && (
                          <div><span className="font-medium">Min CGPA:</span> {job.minCgpa}</div>
                        )}
                        {job.gapAllowed && (
                          <div><span className="font-medium">Gap Allowed:</span> {job.gapAllowed}</div>
                        )}
                        {job.backlogs && (
                          <div><span className="font-medium">Backlogs:</span> {job.backlogs}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Drive Details */}
                  {(job.driveDate || job.driveVenues) && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Drive Details:</h4>
                      <div className="bg-white p-3 rounded border text-sm text-gray-600">
                        {job.driveDate && (
                          <div className="mb-1">
                            <span className="font-medium">Date:</span> {
                              job.driveDate.toMillis ? 
                                new Date(job.driveDate.toMillis()).toLocaleDateString() :
                                new Date(job.driveDate).toLocaleDateString()
                            }
                          </div>
                        )}
                        {job.driveVenues && job.driveVenues.length > 0 && (
                          <div>
                            <span className="font-medium">Venues:</span> {job.driveVenues.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Interview Process */}
                  {job.interviewRounds && job.interviewRounds.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Interview Process:</h4>
                      <div className="bg-white p-3 rounded border">
                        {job.interviewRounds.map((round, roundIndex) => (
                          <div key={roundIndex} className="mb-2 last:mb-0">
                            <div className="flex items-center text-sm">
                              <span className="font-medium text-gray-800">{round.title}:</span>
                              <span className="ml-2 text-gray-600">{round.detail}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Company Links */}
                  <div className="flex items-center space-x-4 text-sm">
                    {job.website && (
                      <a 
                        href={job.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <FaExternalLinkAlt className="mr-1" />
                        Website
                      </a>
                    )}
                    {job.linkedin && (
                      <a 
                        href={job.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <FaExternalLinkAlt className="mr-1" />
                        LinkedIn
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // Navigate to job detail page in a new tab
                      const jobId = job.id || job.jobId;
                      if (jobId) {
                        window.open(`/admin/job/${jobId}`, '_blank');
                      }
                    }}
                    className="ml-4 p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-full transition-colors"
                    title="View Job Description"
                  >
                    <FaEye className="text-lg" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="mb-4">
                <FaBriefcase className="mx-auto h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Job Descriptions Available</h3>
              <p>This recruiter hasn't posted any job descriptions yet.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow"
          >
            Close
          </button>
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
                className={`px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  emailSending 
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