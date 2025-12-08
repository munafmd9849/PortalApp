import React, { useState, useRef, useEffect } from 'react';
import { ImMail } from 'react-icons/im';
import { MdEditNote, MdBlock } from 'react-icons/md';
import { FaEye, FaChevronDown, FaChevronUp, FaSearch, FaBriefcase, FaMapMarkerAlt, FaCalendarAlt, FaMoneyBillWave, FaBuilding, FaUsers, FaClock, FaExternalLinkAlt, FaSpinner, FaCheckCircle } from 'react-icons/fa';
import { TbHistoryToggle } from 'react-icons/tb';
import { subscribeRecruiterDirectory, blockUnblockRecruiter, getRecruiterJobs, getRecruiterHistory, sendEmailToRecruiter, getRecruiterSummary } from '../../../services/recruiters';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import CustomDropdown from '../../common/CustomDropdown';

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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Recruiter Directory</h1>
          <span className="text-sm text-gray-500">
            {filteredRecruiters.length} {filteredRecruiters.length === 1 ? 'recruiter' : 'recruiters'} found
          </span>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by recruiter name, company name, email, or location"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <CustomDropdown
              label="Status"
              icon={FaCheckCircle}
              iconColor="text-green-600"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Blocked', label: 'Blocked' }
              ]}
                value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              placeholder="All Statuses"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                placeholder="Filter by location"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Jobs</label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={filters.minJobs}
                onChange={(e) => setFilters(prev => ({ ...prev, minJobs: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Jobs</label>
              <input
                type="number"
                placeholder="100"
                min="0"
                value={filters.maxJobs}
                onChange={(e) => setFilters(prev => ({ ...prev, maxJobs: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          
          {/* Clear Filters Button */}
          {(debouncedSearch || filters.status || filters.location || filters.minJobs || filters.maxJobs) && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedSearch('');
                  setFilters({ status: '', location: '', minJobs: '', maxJobs: '' });
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Search Results Summary */}
        {!loading && !error && (
          <div className="mb-4 text-sm text-gray-600">
            {debouncedSearch || filters.status || filters.location || filters.minJobs || filters.maxJobs ? (
              <span>
                Showing {filteredRecruiters.length} of {recruiters.length} recruiters
                {debouncedSearch && <span className="font-medium"> matching "{debouncedSearch}"</span>}
              </span>
            ) : (
              <span>Showing all {recruiters.length} recruiters</span>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <FaSpinner className="animate-spin text-blue-600 mr-3" />
            <span className="text-gray-600">Loading recruiters...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">{error}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Recruiter Table (horizontally scrollable with controls) */}
        {!loading && !error && (
          <div className="relative rounded-lg shadow">
            <div id="recruiters-table-scroll" className="overflow-x-auto rounded-lg">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th 
                      className="p-3 text-left text-gray-800 font-medium cursor-pointer"
                      onClick={() => requestSort('companyName')}
                    >
                      <div className={`flex items-center ${getHeaderClass('companyName')}`}>
                        Company Name
                        {sortConfig.key === 'companyName' && (
                          sortConfig.direction === 'ascending' ? 
                          <FaChevronUp className="ml-1 text-xs" /> : 
                          <FaChevronDown className="ml-1 text-xs" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-3 text-left text-gray-700 font-medium cursor-pointer"
                      onClick={() => requestSort('recruiterName')}
                    >
                      <div className={`flex items-center ${getHeaderClass('recruiterName')}`}>
                        Recruiter Name
                        {sortConfig.key === 'recruiterName' && (
                          sortConfig.direction === 'ascending' ? 
                          <FaChevronUp className="ml-1 text-xs" /> : 
                          <FaChevronDown className="ml-1 text-xs" />
                        )}
                      </div>
                    </th>
                    <th className="p-3 text-left text-gray-700 font-medium">Email</th>
                    <th 
                      className="p-3 text-left text-gray-700 font-medium cursor-pointer"
                      onClick={() => requestSort('location')}
                    >
                      <div className={`flex items-center ${getHeaderClass('location')}`}>
                        Location
                        {sortConfig.key === 'location' && (
                          sortConfig.direction === 'ascending' ? 
                          <FaChevronUp className="ml-1 text-xs" /> : 
                          <FaChevronDown className="ml-1 text-xs" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-3 text-left text-gray-700 font-medium cursor-pointer"
                      onClick={() => requestSort('lastJobPostedAt')}
                    >
                      <div className={`flex items-center ${getHeaderClass('lastJobPostedAt')}`}>
                        Last Job Posted
                        {sortConfig.key === 'lastJobPostedAt' && (
                          sortConfig.direction === 'ascending' ? 
                          <FaChevronUp className="ml-1 text-xs" /> : 
                          <FaChevronDown className="ml-1 text-xs" />
                        )}
                      </div>
                    </th>
                    <th className="p-3 text-left text-gray-700 font-medium">Status</th>
                    <th className="p-3 text-center text-gray-700 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedRecruiters.map((recruiter) => (
                    <React.Fragment key={recruiter.id}>
                      <tr className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="p-3 text-gray-800 text-sm font-bold">{recruiter.companyName}</td>
                        <td className="p-3 text-gray-800 text-sm">{recruiter.recruiterName}</td>
                        <td className="p-3 text-gray-800 text-sm">{recruiter.email}</td>
                        <td className="p-3 text-gray-800 text-sm">{recruiter.location}</td>
                        <td className="p-3 text-gray-800 text-sm">{recruiter.lastJobPostedAt}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            recruiter.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : recruiter.status === 'Blocked' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {recruiter.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center space-x-4">
                            <div className="relative group">
                              <ImMail 
                                className={`text-lg transition-colors ${
                                  user?.role === 'admin' 
                                    ? 'text-blue-500 cursor-pointer hover:text-blue-700' 
                                    : 'text-gray-400 cursor-not-allowed'
                                }`}
                                onClick={() => {
                                  if (user?.role === 'admin') {
                                    openMailModal(recruiter.email);
                                  } else {
                                    toast.showError('Only admin users can send emails');
                                  }
                                }}
                              />
                              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                {user?.role === 'admin' ? 'Send Mail' : 'Admin only'}
                              </span>
                            </div>
                            <div className="relative group">
                              <FaEye 
                                className="text-purple-500 cursor-pointer text-lg hover:text-purple-700 transition-colors" 
                                onClick={() => {
                                  console.log('Eye icon clicked, recruiter:', recruiter);
                                  setJobDescriptionModal({ isOpen: true, recruiter });
                                }}
                              />
                              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                View Job Descriptions
                              </span>
                            </div>
                            <div className="relative group">
                              {operationLoading[`block_${recruiter.id}`] ? (
                                <FaSpinner className="animate-spin text-gray-500 text-xl" />
                              ) : (
                                <MdBlock 
                                  className={`text-xl transition-colors ${
                                    user?.role === 'admin' 
                                      ? 'text-red-500 cursor-pointer hover:text-red-700' 
                                      : 'text-gray-400 cursor-not-allowed'
                                  }`}
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
                                />
                              )}
                              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                {user?.role === 'admin' 
                                  ? (recruiter.status === 'Active' ? 'Block' : 'Unblock')
                                  : 'Admin only'
                                }
                              </span>
                            </div>
                            <div className="relative group flex justify-center">
                              <button
                                onClick={() => toggleExpand(recruiter.id)}
                                className="flex items-center justify-center p-2"
                                aria-label={expandedRecruiter === recruiter.id ? 'Hide History' : 'View History'}
                              >
                                <TbHistoryToggle 
                                  className={`text-yellow-600 text-xl transition-transform duration-300 ${expandedRecruiter === recruiter.id ? 'rotate-180' : ''}`} 
                                />
                              </button>
                              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg z-10 whitespace-nowrap">
                                {expandedRecruiter === recruiter.id ? 'Hide History' : 'View History'}
                                <svg className="absolute text-gray-900 h-2 left-1/2 -translate-x-1/2 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                                  <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                                </svg>
                              </span>
                            </div>
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
          </div>
        )}
        
        {/* Pagination */}
        {!loading && !error && filteredRecruiters.length > pagination.itemsPerPage && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                disabled={pagination.currentPage === 1}
                className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                  pagination.currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border border-gray-300`}
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                disabled={pagination.currentPage === totalPages}
                className={`relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                  pagination.currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border border-gray-300`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.totalItems}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                    disabled={pagination.currentPage === 1}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-sm font-medium ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0 ${
                      pagination.currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-400 hover:bg-gray-50 focus:z-20'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <FaChevronUp className="h-5 w-5 rotate-90" aria-hidden="true" />
                  </button>
                  
                  {/* Page numbers */}
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    const isCurrentPage = pageNumber === pagination.currentPage;
                    
                    // Show first page, last page, current page, and pages around current page
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= pagination.currentPage - 1 && pageNumber <= pagination.currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setPagination(prev => ({ ...prev, currentPage: pageNumber }))}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0 ${
                            isCurrentPage
                              ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                              : 'bg-white text-gray-900 hover:bg-gray-50 focus:z-20'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    }
                    
                    // Show ellipsis
                    if (pageNumber === pagination.currentPage - 2 || pageNumber === pagination.currentPage + 2) {
                      return (
                        <span
                          key={pageNumber}
                          className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
                        >
                          ...
                        </span>
                      );
                    }
                    
                    return null;
                  })}
                  
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                    disabled={pagination.currentPage === totalPages}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-sm font-medium ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0 ${
                      pagination.currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-400 hover:bg-gray-50 focus:z-20'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <FaChevronUp className="h-5 w-5 -rotate-90" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* No Results State */}
        {!loading && !error && filteredRecruiters.length === 0 && recruiters.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            No recruiters found matching your search criteria.
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && recruiters.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recruiters found</h3>
            <p className="text-gray-500">No job postings have been created yet. Recruiters will appear here once they post jobs.</p>
          </div>
        )}
      </div>

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
        recruiter={blockModal.recruiter}
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Job Descriptions - {recruiter.companyName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                <div 
                  key={job.id || index} 
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-800">
                      {job.jobTitle || job.title || 'Job Position'}
                    </h3>
                    {job.jobType && (
                      <p className="text-sm text-gray-600 mt-1">
                        <FaBriefcase className="inline mr-1" />
                        {job.jobType}
                      </p>
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
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const BlockModal = ({ isOpen, recruiter, isUnblocking, onClose, onConfirm }) => {
  const [blockType, setBlockType] = useState('temporary');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const reasons = [
    'Violation of terms and conditions',
    'Inappropriate job postings',
    'Spam or fraudulent activity',
    'Non-compliance with platform policies',
    'Reported by students',
    'Administrative review',
    'Other'
  ];

  const handleConfirm = () => {
    if (!isUnblocking) {
      // Validation for blocking
      if (blockType === 'temporary' && (!endDate || !endTime)) {
        alert('Please select end date and time for temporary block.');
        return;
      }
      if (!reason) {
        alert('Please select a reason for blocking.');
        return;
      }
    }

    onConfirm({
      recruiter,
      isUnblocking,
      blockType: isUnblocking ? null : blockType,
      endDate: isUnblocking ? null : endDate,
      endTime: isUnblocking ? null : endTime,
      reason: isUnblocking ? null : reason,
      notes: isUnblocking ? null : notes
    });
  };

  if (!isOpen || !recruiter) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {isUnblocking ? 'Unblock Recruiter' : 'Block Recruiter'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {recruiter.companyName} - {recruiter.recruiterName}
          </p>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4">
          {!isUnblocking ? (
            <>
              {/* Block Type */}
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Block Type</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="blockType"
                      value="permanent"
                      checked={blockType === 'permanent'}
                      onChange={(e) => setBlockType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Permanent Block</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="blockType"
                      value="temporary"
                      checked={blockType === 'temporary'}
                      onChange={(e) => setBlockType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-blue-600">Temporary Block</span>
                  </label>
                </div>
              </div>

              {/* End Date and Time (only for temporary blocks) */}
              {blockType === 'temporary' && (
                <div className="mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">End Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reason for Blocking */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Reason for Blocking</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a reason</option>
                  {reasons.map((r, index) => (
                    <option key={index} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Administrative Notes */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Administrative Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide specific details for the audit log"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="3"
                />
              </div>

              {/* Warning */}
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">
                  <strong>Warning:</strong> Blocking this recruiter will revoke their application privileges until unblocked.
                </p>
              </div>
            </>
          ) : (
            <div className="mb-4">
              <p className="text-gray-700">
                Are you sure you want to unblock <strong>{recruiter.recruiterName}</strong> from <strong>{recruiter.companyName}</strong>?
              </p>
              <p className="text-sm text-gray-600 mt-2">
                This will restore their access to post jobs and manage applications.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-md transition-colors ${
              isUnblocking 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isUnblocking ? 'Confirm Unblock' : 'Confirm Block'}
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={closeMailModal}
              className="p-2 rounded-full hover:bg-gray-100 mr-2"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h2 className="text-lg font-medium text-gray-800">New Message</h2>
          </div>
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
                className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-colors ${
                  emailSending 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {emailSending ? (
                  <>
                    <FaSpinner className="animate-spin w-4 h-4" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
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