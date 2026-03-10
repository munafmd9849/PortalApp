import React, { useState, useEffect, useRef } from 'react';
import { 
  FaPaperPlane, 
  FaQuestionCircle, 
  FaChartLine, 
  FaCalendarAlt,
  FaTimes,
  FaCheckCircle,
  FaFileUpload,
  FaInfoCircle,
  FaExclamationCircle,
  FaHistory,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaCheck,
  FaTimesCircle
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import QueryErrorBoundary from '../../common/QueryErrorBoundary';
import { getTargetedJobsForStudent } from '../../../services/jobs';
import { FaBriefcase } from 'react-icons/fa';

// Import query services (ES module syntax)
import * as queryServices from '../../../services/queries.js';

const StudentQuerySystem = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('question');
  const [activeView, setActiveView] = useState('new'); // 'new' or 'history'
  const [formData, setFormData] = useState({
    type: 'question',
    subject: '',
    selectedJobId: '', // New field for job selection
    message: '',
    cgpa: '',
    backlogs: '',
    proof: null,
    startDate: '',
    endDate: '',
    timeSlot: '',
    reason: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedQuery, setExpandedQuery] = useState(null);
  const [referenceId, setReferenceId] = useState('');
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const jobSelectorRef = useRef(null);

  // Real queries data from Firebase
  const [pastQueries, setPastQueries] = useState([]);

  // Load jobs on component mount
  useEffect(() => {
    const loadJobs = async () => {
      if (!user?.id) return;
      
      setLoadingJobs(true);
      try {
        const jobsData = await getTargetedJobsForStudent(user.id);
        // Filter only posted jobs
        const postedJobs = jobsData.filter(job => job.isPosted || job.posted || job.status === 'POSTED' || job.status === 'posted');
        setJobs(postedJobs);
      } catch (error) {
        console.error('Failed to load jobs:', error);
        setJobs([]);
      } finally {
        setLoadingJobs(false);
      }
    };

    loadJobs();
  }, [user?.id]);

  // Handle click outside to close job selector
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (jobSelectorRef.current && !jobSelectorRef.current.contains(event.target)) {
        setShowJobSelector(false);
      }
    };

    if (showJobSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showJobSelector]);

  // Load queries on component mount and set up real-time subscription
  useEffect(() => {
    if (!user?.id || !queryServices?.subscribeToStudentQueries) {
      setLoadingQueries(false);
      return;
    }

    setLoadingQueries(true);
    
    try {
      // Set up real-time subscription to queries
      const unsubscribe = queryServices.subscribeToStudentQueries(user.id, (queries) => {
        setPastQueries(queries);
        setLoadingQueries(false);
      });

      // Cleanup subscription on unmount
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (error) {
      console.warn('Failed to set up query subscription:', error);
      setLoadingQueries(false);
    }
  }, [user?.id]);

  const queryTypes = [
    { id: 'question', name: 'Ask a Question', icon: <FaQuestionCircle />, description: 'Get clarification on placement process', color: 'blue' },
    { id: 'cgpa', name: 'Update CGPA', icon: <FaChartLine />, description: 'Submit updated marks with proof', color: 'green' },
    { id: 'backlog', name: 'Update Backlogs', icon: <FaChartLine />, description: 'Submit updated backlogs count', color: 'orange' },
    { id: 'calendar', name: 'Block Calendar', icon: <FaCalendarAlt />, description: 'Request specific time slots', color: 'purple' }
  ];

  const timeSlots = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '1:00 PM - 2:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for CGPA: enforce exactly 2 decimal places
    if (name === 'cgpa') {
      // Allow only numbers and one decimal point
      const sanitized = value.replace(/[^0-9.]/g, '');
      // Ensure only one decimal point
      const parts = sanitized.split('.');
      let finalValue = parts[0] || '';
      
      // If user has typed a decimal point, ensure we format to 2 decimal places
      if (parts.length > 1) {
        const decimals = parts.slice(1).join('').substring(0, 2);
        // Always show 2 decimal places if decimal point is present
        finalValue += '.' + decimals.padEnd(2, '0');
      }
      
      // Ensure value doesn't exceed 10.00
      if (finalValue) {
        const numValue = parseFloat(finalValue);
        if (!isNaN(numValue) && numValue > 10) {
          finalValue = '10.00';
        } else if (!isNaN(numValue) && numValue < 0) {
          finalValue = '0.00';
        }
      }
      
      setFormData({
        ...formData,
        [name]: finalValue
      });
    } else if (name === 'backlogs') {
      // Special handling for backlogs: allow only non-negative integers or "X+" format
      const sanitized = value.replace(/[^0-9+]/g, '');
      // Allow formats like "0", "1", "2", "3+", etc.
      let finalValue = sanitized;
      
      // Ensure only one '+' at the end
      if (finalValue.includes('+')) {
        const parts = finalValue.split('+');
        finalValue = parts[0] + (parts.length > 1 ? '+' : '');
      }
      
      setFormData({
        ...formData,
        [name]: finalValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
    
    // Clear submit error when user makes any change
    if (formErrors.submit) {
      setFormErrors({
        ...formErrors,
        submit: ''
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    // Validate file (fallback validation)
    let validation = { isValid: true, error: null };
    
    if (!file) {
      validation = { isValid: false, error: 'No file selected' };
    } else if (file.size > 5 * 1024 * 1024) {
      validation = { isValid: false, error: 'File size must be less than 5MB' };
    } else if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      validation = { isValid: false, error: 'Only PDF, JPG, and PNG files are allowed' };
    }
    
    if (!validation.isValid) {
      setFormErrors({
        ...formErrors,
        proof: validation.error
      });
      return;
    }
    
    setFormData({
      ...formData,
      proof: file
    });
    
    if (formErrors.proof) {
      setFormErrors({
        ...formErrors,
        proof: ''
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (activeTab === 'question') {
      // For question type, require job selection instead of subject
      if (!formData.selectedJobId) {
        errors.selectedJobId = 'Please select a job posting to ask a question about';
      }
      if (!formData.message.trim()) {
        errors.message = 'Your question is required';
      }
    } else {
      // For other types, keep subject requirement
      if (!formData.subject.trim()) {
        errors.subject = 'Subject is required';
      }
    }

    if (activeTab === 'cgpa') {
      const cgpaValue = formData.cgpa;
      if (!cgpaValue || cgpaValue.trim() === '') {
        errors.cgpa = 'CGPA is required';
      } else {
        // Validate CGPA format: 0.00 to 10.00 with EXACTLY 2 decimal places
        const cgpaStr = String(cgpaValue).trim();
        const cgpaRegex = /^(10\.00|[0-9]\.[0-9]{2})$/;
        
        // Check if it's a valid format with exactly 2 decimal places
        if (!cgpaRegex.test(cgpaStr)) {
          // Check if user entered value without 2 decimals (e.g., 9, 9.0, 9.5)
          if (/^\d+$/.test(cgpaStr)) {
            errors.cgpa = 'Enter CGPA with 2 decimals (e.g., 9.00)';
          } else if (/^\d+\.\d?$/.test(cgpaStr)) {
            errors.cgpa = 'Enter CGPA with 2 decimals (e.g., 9.00)';
          } else {
            errors.cgpa = 'CGPA must be between 0.00 and 10.00 with exactly 2 decimal places (e.g., 9.00, 8.75)';
          }
        } else {
          // Validate range without using parseFloat to avoid rounding errors
          const parts = cgpaStr.split('.');
          const integerPart = parseInt(parts[0], 10);
          const decimalPart = parseInt(parts[1], 10);
          
          if (isNaN(integerPart) || isNaN(decimalPart)) {
            errors.cgpa = 'Invalid CGPA format';
          } else if (integerPart > 10 || (integerPart === 10 && decimalPart > 0)) {
            errors.cgpa = 'CGPA must be between 0.00 and 10.00';
          } else if (integerPart < 0) {
            errors.cgpa = 'CGPA must be between 0.00 and 10.00';
          }
        }
      }
      if (!formData.proof) {
        errors.proof = 'Proof document is required';
      }
    }

    if (activeTab === 'backlog') {
      const backlogsValue = formData.backlogs;
      if (!backlogsValue || backlogsValue.trim() === '') {
        errors.backlogs = 'Backlogs count is required';
      } else {
        // Validate backlogs format: non-negative integer or "X+" format
        const backlogsStr = String(backlogsValue).trim();
        const backlogsRegex = /^(\d+|\d+\+)$/;
        
        if (!backlogsRegex.test(backlogsStr)) {
          errors.backlogs = 'Backlogs must be a non-negative integer (e.g., 0, 1, 2, 3+)';
        } else {
          // Extract numeric value (remove + if present)
          const numericValue = parseInt(backlogsStr.replace('+', ''), 10);
          if (isNaN(numericValue) || numericValue < 0) {
            errors.backlogs = 'Backlogs must be a non-negative integer';
          }
        }
      }
      if (!formData.proof) {
        errors.proof = 'Proof document is required';
      }
    }

    if (activeTab === 'calendar') {
      const today = new Date().toISOString().split('T')[0];
      if (!formData.startDate) {
        errors.startDate = 'Start date is required';
      } else if (formData.startDate < today) {
        errors.startDate = 'Start date cannot be in the past';
      }

      if (!formData.endDate) {
        errors.endDate = 'End date is required';
      } else if (formData.endDate < formData.startDate) {
        errors.endDate = 'End date cannot be before start date';
      } else if (formData.startDate > formData.endDate) {
        errors.startDate = 'Start date cannot be after the end date';
      }

      if (!formData.timeSlot) {
        errors.timeSlot = 'Time slot is required';
      }

      if (!formData.reason) {
        errors.reason = 'Reason is required';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check if user is authenticated
    if (!user?.id) {
      setFormErrors({
        ...formErrors,
        submit: 'Please log in to submit a query'
      });
      return;
    }

    setSubmitting(true);
    
    try {
      // Submit query to Firebase if service is available
      if (queryServices?.submitQuery) {
        const result = await queryServices.submitQuery(user.id, formData, jobs);
        
        // Set reference ID for success message
        setReferenceId(result.referenceId || (queryServices.generateReferenceId ? queryServices.generateReferenceId() : `STU${Math.floor(1000 + Math.random() * 9000)}`));
        
        console.log('Query submitted successfully:', result);
      } else {
        // Fallback: Generate reference ID without Firebase
        setReferenceId(`STU${Math.floor(1000 + Math.random() * 9000)}`);
        console.warn('Query services not available, using local mode');
      }
      
      // Always add to local state for immediate UI feedback
      const newQuery = {
        id: Date.now(),
        type: formData.type,
        subject: formData.subject,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        adminResponse: '',
        responseDate: '',
        ...formData
      };
      
      setPastQueries(prev => [newQuery, ...prev]);
      setSubmitted(true);
      
    } catch (error) {
      console.error('Error submitting query:', error);
      
      // Extract error message
      let errorMessage = 'Failed to submit query. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.error) {
        errorMessage = error.response.error;
      } else if (error.response?.errors && Array.isArray(error.response.errors)) {
        // Show validation errors
        const validationErrors = error.response.errors.map(e => `${e.param}: ${e.msg}`).join(', ');
        errorMessage = `Validation failed: ${validationErrors}`;
      }
      
      // Set error in form errors
      setFormErrors({
        ...formErrors,
        submit: errorMessage
      });
      
      // Don't show success - show error instead
      setSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'question',
      subject: '',
      selectedJobId: '',
      message: '',
      cgpa: '',
      backlogs: '',
      proof: null,
      startDate: '',
      endDate: '',
      timeSlot: '',
      reason: ''
    });
    setFormErrors({});
    setSubmitted(false);
    setShowJobSelector(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return <FaCheck className="text-green-500" />;
      case 'rejected':
        return <FaTimesCircle className="text-red-500" />;
      case 'under_review':
        return <FaClock className="text-blue-500" />;
      default:
        return <FaClock className="text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'resolved':
        return 'Resolved';
      case 'rejected':
        return 'Rejected';
      case 'under_review':
        return 'Under Review';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleQueryExpand = (id) => {
    if (expandedQuery === id) {
      setExpandedQuery(null);
    } else {
      setExpandedQuery(id);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-3 sm:p-4 min-w-0 overflow-x-hidden pb-24 sm:pb-4">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-5 sm:p-8 max-w-md w-full border border-gray-200 min-w-0">
          <div className="text-center">
            <div className="bg-green-100 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <FaCheckCircle className="text-green-600 text-2xl sm:text-3xl" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Query Submitted!</h2>
            <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
              Your {queryTypes.find(t => t.id === formData.type).name.toLowerCase()} has been submitted. You’ll get a response within 24–48 hours.
            </p>
            <div className="bg-blue-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-left border border-blue-200">
              <h3 className="font-medium text-blue-800 text-sm sm:text-base mb-1">Reference ID: #{referenceId}</h3>
              <p className="text-xs sm:text-sm text-blue-600">Keep this for future communication.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setActiveView('history');
                  setSubmitted(false);
                }}
                className="min-h-[44px] px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all duration-200 flex-1 flex items-center justify-center"
              >
                <FaHistory className="mr-2" />
                View History
              </button>
              <button
                onClick={resetForm}
                className="min-h-[44px] px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg flex-1"
              >
                Submit Another Query
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-3 py-5 md:p-4 md:py-8 min-w-0 overflow-x-hidden pb-24 sm:pb-8 md:pb-8">
      <div className="max-w-6xl mx-auto min-w-0">
        <div className="text-center mb-5 md:mb-10">
          <h1 className="text-lg sm:text-xl md:text-3xl font-bold text-gray-800 mb-2 md:mb-3 break-words">Student Query Portal</h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-xs sm:text-sm md:text-base px-1">
            Contact the placement cell for questions, CGPA/backlog updates, or scheduling
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex justify-center mb-4 md:mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 inline-flex w-full max-w-sm md:max-w-none md:w-auto">
            <button
              onClick={() => setActiveView('new')}
              className={`flex-1 md:flex-none min-h-[44px] px-3 py-2.5 md:px-6 md:py-3 rounded-md font-medium transition-all duration-200 text-sm md:text-base touch-manipulation ${activeView === 'new' ? 'bg-yellow-200 text-black shadow-md' : 'text-gray-600 hover:text-gray-800'}`}
            >
              New Query
            </button>
            <button
              onClick={() => setActiveView('history')}
              className={`flex-1 md:flex-none min-h-[44px] px-3 py-2.5 md:px-6 md:py-3 rounded-md font-medium transition-all duration-200 flex items-center justify-center text-sm md:text-base touch-manipulation ${activeView === 'history' ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-600 hover:text-gray-800'}`}
            >
              <FaHistory className="mr-1 md:mr-2 flex-shrink-0" />
              Query History
            </button>
          </div>
        </div>

        {activeView === 'history' ? (
          /* Query History View */
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden border border-gray-200 min-w-0">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-lg md:text-xl font-bold text-gray-800">Your Query History</h2>
              <p className="text-gray-600 text-sm md:text-base">Track the status of your previous queries</p>
            </div>
            
            <div className="p-4 md:p-6">
              {loadingQueries ? (
                <div className="text-center py-10">
                  <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaClock className="text-blue-600 text-2xl animate-spin" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Loading your queries...</h3>
                  <p className="text-gray-500">Please wait while we fetch your query history.</p>
                </div>
              ) : pastQueries.length === 0 ? (
                <div className="text-center py-10">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaHistory className="text-gray-400 text-2xl" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No queries yet</h3>
                  <p className="text-gray-500 mb-4">You haven't submitted any queries to the placement cell.</p>
                  <button
                    onClick={() => setActiveView('new')}
                    className="min-h-[44px] px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                  >
                    Submit your first query
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastQueries.map(query => (
                    <div key={query.id} className="border border-gray-200 rounded-xl overflow-hidden min-w-0">
                      <div 
                        className="p-4 sm:p-4 bg-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors min-h-[44px] touch-manipulation"
                        onClick={() => toggleQueryExpand(query.id)}
                      >
                        <div className="flex items-start min-w-0 flex-1">
                          <div className="mr-3 mt-0.5 flex-shrink-0">
                            {query.type === 'question' && <FaQuestionCircle className="text-blue-500 text-lg sm:text-xl" />}
                            {query.type === 'cgpa' && <FaChartLine className="text-green-500 text-lg sm:text-xl" />}
                            {query.type === 'backlog' && <FaChartLine className="text-orange-500 text-lg sm:text-xl" />}
                            {query.type === 'calendar' && <FaCalendarAlt className="text-purple-500 text-lg sm:text-xl" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-gray-800 text-sm sm:text-base break-words">{query.subject || 'Query'}</h3>
                            <p className="text-xs sm:text-sm text-gray-500 break-words mt-0.5">
                              Submitted on {new Date(query.date || query.createdAt).toLocaleDateString()}
                              {(query.responseDate || query.respondedAt) && <span className="block sm:inline"> • Responded on {new Date(query.responseDate || query.respondedAt).toLocaleDateString()}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center flex-shrink-0 gap-2">
                          <span className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(query.status)} whitespace-nowrap`}>
                            {getStatusText(query.status)}
                          </span>
                          {expandedQuery === query.id ? <FaChevronUp className="text-gray-400 w-4 h-4" /> : <FaChevronDown className="text-gray-400 w-4 h-4" />}
                        </div>
                      </div>
                      
                      {expandedQuery === query.id && (
                        <div className="p-4 sm:p-4 bg-white border-t border-gray-200 min-w-0">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-1">Query Type</h4>
                              <p className="capitalize">{query.type}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                              <div className="flex items-center">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(query.status)}`}>
                                  {getStatusText(query.status)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-1">Date Submitted</h4>
                              <p>{new Date(query.date || query.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          {query.type === 'question' && (
                            <div className="mb-4">
                              {query.jobId && (
                                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <h4 className="text-sm font-medium text-blue-800 mb-1">Job Posting</h4>
                                  <p className="text-sm text-blue-700">
                                    {query.subject.includes('about') ? query.subject.split('about')[1]?.trim() : query.subject}
                                  </p>
                                </div>
                              )}
                              <h4 className="text-sm font-medium text-gray-500 mb-1">Your Question</h4>
                              <p className="text-gray-800">{query.message}</p>
                            </div>
                          )}
                          
                          {query.type === 'cgpa' && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-500 mb-1">CGPA Submitted</h4>
                              <p className="text-gray-800">{query.cgpa}</p>
                            </div>
                          )}
                          
                          {query.type === 'backlog' && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-500 mb-1">Backlogs Submitted</h4>
                              <p className="text-gray-800">{query.backlogs || query.metadata?.backlogs || 'N/A'}</p>
                            </div>
                          )}
                          
                          {query.type === 'calendar' && (
                            <div className="mb-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-500 mb-1">From</h4>
                                  <p className="text-gray-800">{new Date(query.startDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-gray-500 mb-1">To</h4>
                                  <p className="text-gray-800">{new Date(query.endDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-gray-500 mb-1">Time Slot</h4>
                                  <p className="text-gray-800">{query.timeSlot}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {(query.adminResponse || query.response) && (
                            <div className="pt-4 border-t border-gray-200">
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Admin Response</h4>
                              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <p className="text-blue-800">{query.adminResponse || query.response}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* New Query Form View */
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden border border-gray-200 min-w-0">
            {/* Query Type Selection */}
            <div className="border-b border-gray-200 bg-gray-50/50 overflow-hidden">
              <div className="flex overflow-x-auto justify-start md:justify-center px-2 md:px-6 scrollbar-hide gap-0 pb-1 -mb-px overflow-y-hidden min-w-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                {queryTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setActiveTab(type.id);
                      setFormData({...formData, type: type.id});
                      setShowJobSelector(false);
                    }}
                    className={`px-3 py-3 md:px-5 md:py-4 flex flex-col items-center min-w-[88px] sm:min-w-[100px] md:min-w-[140px] border-b-2 transition-all duration-200 touch-manipulation flex-shrink-0 min-h-[44px] ${
                      activeTab === type.id
                        ? `border-${type.color}-500 text-${type.color}-600 bg-white shadow-sm`
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className={`text-base md:text-lg mb-1 md:mb-2 ${activeTab === type.id ? `text-${type.color}-500` : 'text-gray-400'}`}>
                      {type.icon}
                    </span>
                    <span className="font-medium text-xs md:text-sm">{type.name}</span>
                    <span className="text-[10px] md:text-xs mt-0.5 md:mt-1 text-gray-400 hidden sm:block">{type.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Query Form */}
            <form onSubmit={handleSubmit} className="p-4 md:p-6 min-w-0">
              {/* Job Selection for Question Type */}
              {activeTab === 'question' ? (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaBriefcase className="w-4 h-4 text-blue-600" />
                    Select Job Posting <span className="text-red-500">*</span>
                  </label>
                  {loadingJobs ? (
                    <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                      <FaClock className="animate-spin text-blue-500 mr-2" />
                      <span className="text-gray-600">Loading jobs...</span>
                    </div>
                  ) : jobs.length === 0 ? (
                    <div className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg bg-yellow-50">
                      <p className="text-yellow-800 text-sm">No job postings available at the moment. Please check back later.</p>
                    </div>
                  ) : (
                    <div className="relative min-w-0" ref={jobSelectorRef}>
                      <button
                        type="button"
                        onClick={() => setShowJobSelector(!showJobSelector)}
                        className={`w-full min-h-[44px] border-2 ${formErrors.selectedJobId ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 text-sm text-left flex items-center justify-between gap-2 transition-all duration-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer min-w-0 touch-manipulation`}
                      >
                        <span className="truncate flex-1 text-gray-900">
                          {formData.selectedJobId ? (() => {
                            const selectedJob = jobs.find(j => j.id === formData.selectedJobId);
                            return selectedJob ? `${selectedJob.jobTitle} - ${selectedJob.companyName || selectedJob.company}` : 'Select a job posting';
                          })() : 'Select a job posting to ask a question about'}
                        </span>
                        <FaChevronDown className={`w-3 h-3 text-gray-500 flex-shrink-0 transition-transform duration-200 ${showJobSelector ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showJobSelector && (
                        <div className="absolute z-20 w-full bg-white border-2 border-gray-300 rounded-lg shadow-lg mt-1 max-h-96 overflow-y-auto">
                          <div className="p-2 space-y-2">
                            {jobs.map((job) => {
                              const isSelected = formData.selectedJobId === job.id;
                              return (
                                <div
                                  key={job.id}
                                  onClick={() => {
                                    setFormData({ ...formData, selectedJobId: job.id });
                                    setShowJobSelector(false);
                                    if (formErrors.selectedJobId) {
                                      setFormErrors({ ...formErrors, selectedJobId: '' });
                                    }
                                  }}
                                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                    isSelected 
                                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className={`font-semibold text-sm mb-1 ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                                        {job.jobTitle}
                                      </h4>
                                      <p className={`text-xs mb-2 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                                        {job.companyName || job.company}
                                        {job.companyLocation && ` • ${job.companyLocation}`}
                                      </p>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {job.jobType && (
                                          <span className={`px-2 py-1 text-xs rounded ${isSelected ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                                            {job.jobType}
                                          </span>
                                        )}
                                        {job.workMode && (
                                          <span className={`px-2 py-1 text-xs rounded ${isSelected ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                                            {job.workMode}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <FaCheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {formErrors.selectedJobId && <p className="text-red-500 text-sm mt-1">{formErrors.selectedJobId}</p>}
                </div>
              ) : (
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Brief description of your query"
                    className={`w-full px-4 py-3 border ${formErrors.subject ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-100`}
                    required
                  />
                  {formErrors.subject && <p className="text-red-500 text-sm mt-1">{formErrors.subject}</p>}
                </div>
              )}

              {/* Question-specific fields */}
              {activeTab === 'question' && (
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">Your Question</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Please provide details about your question or concern..."
                    rows={4}
                    className={`w-full px-4 py-3 border min-h-[120px] max-h-[300px] resize-y ${formErrors.message ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    required
                  />
                  {formErrors.message && <p className="text-red-500 text-sm mt-1">{formErrors.message}</p>}
                </div>
              )}

              {/* CGPA Update fields */}
              {activeTab === 'cgpa' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="text-gray-700 font-medium mb-2 flex items-center">
                        Updated CGPA
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        name="cgpa"
                        value={formData.cgpa}
                        onChange={handleInputChange}
                        onBlur={(e) => {
                          // On blur, ensure exactly 2 decimal places if value exists
                          const value = e.target.value.trim();
                          if (value && !value.includes('.')) {
                            // If user entered integer (e.g., 9), format to 9.00
                            setFormData({
                              ...formData,
                              cgpa: value + '.00'
                            });
                          } else if (value && value.includes('.')) {
                            const parts = value.split('.');
                            if (parts[1] && parts[1].length < 2) {
                              // If user entered 9.0 or 9.5, pad to 2 decimals
                              setFormData({
                                ...formData,
                                cgpa: parts[0] + '.' + parts[1].padEnd(2, '0')
                              });
                            }
                          }
                        }}
                        placeholder="Enter CGPA (e.g., 9.00, 8.75)"
                        pattern="^(10\.00|[0-9]\.[0-9]{2})$"
                        maxLength="5"
                        className={`w-full px-4 py-3 border ${formErrors.cgpa ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200`}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Format: Must have exactly 2 decimals (e.g., 9.00, 8.75). Values like 9 or 9.0 are not accepted.</p>
                      {formErrors.cgpa && <p className="text-red-500 text-sm mt-1">{formErrors.cgpa}</p>}
                    </div>
                    <div>
                      <label className="text-gray-700 font-medium mb-2 flex items-center">
                        Proof Document
                        <span className="text-red-500 ml-1">*</span>
                        <FaExclamationCircle className="text-amber-500 ml-2 text-sm" title="Required for verification" />
                      </label>
                      <div className={`relative border ${formErrors.proof ? 'border-red-500' : 'border-gray-300'} rounded-xl p-4 text-center hover:border-green-400 transition-colors duration-200 group`}>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept=".pdf,.jpg,.jpeg,.png"
                          required
                        />
                        <FaFileUpload className="text-gray-400 text-2xl mx-auto mb-2 group-hover:text-green-500 transition-colors" />
                        <p className="text-sm text-gray-600">
                          {formData.proof ? formData.proof.name : 'Upload marksheet or transcript'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG (Max 5MB)</p>
                      </div>
                      {formErrors.proof && <p className="text-red-500 text-sm mt-1">{formErrors.proof}</p>}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-200 min-w-0">
                    <div className="flex items-start gap-3">
                      <FaInfoCircle className="text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-700 break-words min-w-0">
                        Please ensure your document is clear and shows your name, university seal, and the updated CGPA clearly. 
                        Documents must be officially issued by your institution.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Backlog Update fields */}
              {activeTab === 'backlog' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="text-gray-700 font-medium mb-2 flex items-center">
                        Updated Backlogs Count
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        name="backlogs"
                        value={formData.backlogs}
                        onChange={handleInputChange}
                        placeholder="Enter backlogs count (e.g., 0, 1, 2, 3+)"
                        pattern="^(\d+|\d+\+)$"
                        maxLength="10"
                        className={`w-full px-4 py-3 border ${formErrors.backlogs ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200`}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Format: Non-negative integer (e.g., 0, 1, 2, 3+). Use "+" for 3 or more.</p>
                      {formErrors.backlogs && <p className="text-red-500 text-sm mt-1">{formErrors.backlogs}</p>}
                    </div>
                    <div>
                      <label className="text-gray-700 font-medium mb-2 flex items-center">
                        Proof Document
                        <span className="text-red-500 ml-1">*</span>
                        <FaExclamationCircle className="text-amber-500 ml-2 text-sm" title="Required for verification" />
                      </label>
                      <div className={`relative border ${formErrors.proof ? 'border-red-500' : 'border-gray-300'} rounded-xl p-4 text-center hover:border-orange-400 transition-colors duration-200 group`}>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept=".pdf,.jpg,.jpeg,.png"
                          required
                        />
                        <FaFileUpload className="text-gray-400 text-2xl mx-auto mb-2 group-hover:text-orange-500 transition-colors" />
                        <p className="text-sm text-gray-600">
                          {formData.proof ? formData.proof.name : 'Upload marksheet or transcript'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG (Max 5MB)</p>
                      </div>
                      {formErrors.proof && <p className="text-red-500 text-sm mt-1">{formErrors.proof}</p>}
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 mb-6 border border-orange-200 min-w-0">
                    <div className="flex items-start gap-3">
                      <FaInfoCircle className="text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-orange-700 break-words min-w-0">
                        Please ensure your document is clear and shows your name, university seal, and the updated backlogs count clearly. 
                        Documents must be officially issued by your institution.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Calendar Blocking fields */}
              {activeTab === 'calendar' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">Start Date</label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-3 border ${formErrors.startDate ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
                        required
                      />
                      {formErrors.startDate && <p className="text-red-500 text-sm mt-1">{formErrors.startDate}</p>}
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">End Date</label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-3 border ${formErrors.endDate ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
                        required
                      />
                      {formErrors.endDate && <p className="text-red-500 text-sm mt-1">{formErrors.endDate}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">Preferred Time Slot</label>
                      <div className="relative">
                        <select
                          name="timeSlot"
                          value={formData.timeSlot}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border ${formErrors.timeSlot ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none transition-all duration-200`}
                          required
                        >
                          <option value="">Select a time slot</option>
                          {timeSlots.map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {formErrors.timeSlot && <p className="text-red-500 text-sm mt-1">{formErrors.timeSlot}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">Reason for Blocking</label>
                      <div className="relative">
                        <select
                          name="reason"
                          value={formData.reason}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border ${formErrors.reason ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none transition-all duration-200`}
                          required
                        >
                          <option value="">Select a reason</option>
                          <option value="interview">Company Interview</option>
                          <option value="exam">University Exam</option>
                          <option value="personal">Personal Reason</option>
                          <option value="other">Other</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {formErrors.reason && <p className="text-red-500 text-sm mt-1">{formErrors.reason}</p>}
                    </div>
                  </div>
                  
                  {formData.reason === 'other' && (
                    <div className="mb-6">
                      <label className="block text-gray-700 font-medium mb-2">Please specify</label>
                      <input
                        type="text"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="Please specify your reason"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                        required
                      />
                    </div>
                  )}
                  
                  <div className="bg-purple-50 rounded-xl p-4 mb-6 border border-purple-200 min-w-0">
                    <div className="flex items-start gap-3">
                      <FaInfoCircle className="text-purple-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-purple-700 break-words min-w-0">
                        Please note that calendar blocking requests require at least 24 hours advance notice and are subject to approval by the placement cell.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Error Display */}
              {formErrors.submit && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl min-w-0">
                  <div className="flex items-start gap-3">
                    <FaExclamationCircle className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-red-800 font-medium mb-1">Submission Failed</h4>
                      <p className="text-red-700 text-sm break-words">{formErrors.submit}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-4 mt-8 sm:mt-10 pt-6 border-t border-gray-100">
                <p className="text-xs sm:text-sm text-gray-500 flex items-center">
                  <FaInfoCircle className="mr-2 text-blue-400 flex-shrink-0" />
                  Typically responds within 24–48 hours
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center bg-gradient-to-r ${
                    submitting 
                      ? 'from-gray-400 to-gray-500 text-gray-700 cursor-not-allowed' 
                      : 'from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900'
                  }`}
                >
                  {submitting ? (
                    <>
                      <FaClock className="mr-2 animate-spin flex-shrink-0" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="mr-2 flex-shrink-0" />
                      Submit Query
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Additional Information */}
        {activeView === 'new' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8 min-w-0">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <FaQuestionCircle className="text-blue-600 text-xl" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">General Questions</h3>
              <p className="text-sm text-gray-600">Get clarification on placement procedures, company requirements, or application processes.</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <FaChartLine className="text-green-600 text-xl" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">CGPA Updates</h3>
              <p className="text-sm text-gray-600">Submit your updated marks with official documentation for verification.</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="bg-orange-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <FaChartLine className="text-orange-600 text-xl" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Backlog Updates</h3>
              <p className="text-sm text-gray-600">Submit your updated backlogs count with official documentation for verification.</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <FaCalendarAlt className="text-purple-600 text-xl" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Calendar Management</h3>
              <p className="text-sm text-gray-600">Block your calendar for interviews, exams, or personal commitments.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrap the component with error boundary to prevent cascade errors
const QueryWithErrorBoundary = () => (
  <QueryErrorBoundary>
    <StudentQuerySystem />
  </QueryErrorBoundary>
);

export default QueryWithErrorBoundary;