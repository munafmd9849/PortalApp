import React, { useState, useEffect } from 'react';
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

// Import query services (ES module syntax)
import * as queryServices from '../../../services/queries.js';

const StudentQuerySystem = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('question');
  const [activeView, setActiveView] = useState('new'); // 'new' or 'history'
  const [formData, setFormData] = useState({
    type: 'question',
    subject: '',
    message: '',
    cgpa: '',
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

  // Real queries data from Firebase
  const [pastQueries, setPastQueries] = useState([]);

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
    setFormData({
      ...formData,
      [name]: value
    });
    
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
    
    // Validate file using the service function or fallback validation
    let validation = { isValid: true, error: null };
    
    if (queryServices?.validateFile) {
      validation = queryServices.validateFile(file);
    } else {
      // Fallback validation
      if (!file) {
        validation = { isValid: false, error: 'No file selected' };
      } else if (file.size > 5 * 1024 * 1024) {
        validation = { isValid: false, error: 'File size must be less than 5MB' };
      } else if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        validation = { isValid: false, error: 'Only PDF, JPG, and PNG files are allowed' };
      }
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

    if (!formData.subject.trim()) {
      errors.subject = 'Subject is required';
    }

    if (activeTab === 'question') {
      if (!formData.message.trim()) {
        errors.message = 'Message is required';
      }
    }

    if (activeTab === 'cgpa') {
      if (!formData.cgpa || formData.cgpa < 0 || formData.cgpa > 10) {
        errors.cgpa = 'Please enter a valid CGPA between 0 and 10';
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
        const result = await queryServices.submitQuery(user.id, formData);
        
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
      message: '',
      cgpa: '',
      proof: null,
      startDate: '',
      endDate: '',
      timeSlot: '',
      reason: ''
    });
    setFormErrors({});
    setSubmitted(false);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full border border-gray-200">
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheckCircle className="text-green-600 text-3xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Query Submitted Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Your {queryTypes.find(t => t.id === formData.type).name.toLowerCase()} has been submitted to the placement cell. 
              You will receive a response within 24-48 hours.
            </p>
            <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-2">Reference ID: #{referenceId}</h3>
              <p className="text-sm text-blue-600">Keep this reference ID for future communication.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setActiveView('history');
                  setSubmitted(false);
                }}
                className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all duration-200 flex-1 flex items-center justify-center"
              >
                <FaHistory className="mr-2" />
                View History
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg flex-1"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Student Query Portal</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Contact the placement cell for assistance with questions, CGPA updates, or scheduling requests
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-sm p-1 shadow-sm border border-gray-200 inline-flex">
            <button
              onClick={() => setActiveView('new')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${activeView === 'new' ? 'bg-yellow-200 text-black shadow-md' : 'text-gray-600 hover:text-gray-800'}`}
            >
              New Query
            </button>
            <button
              onClick={() => setActiveView('history')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center ${activeView === 'history' ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-600 hover:text-gray-800'}`}
            >
              <FaHistory className="mr-2" />
              Query History
            </button>
          </div>
        </div>

        {activeView === 'history' ? (
          /* Query History View */
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Your Query History</h2>
              <p className="text-gray-600">Track the status of your previous queries</p>
            </div>
            
            <div className="p-6">
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
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    Submit your first query
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastQueries.map(query => (
                    <div key={query.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div 
                        className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleQueryExpand(query.id)}
                      >
                        <div className="flex items-center">
                          <div className="mr-4">
                            {query.type === 'question' && <FaQuestionCircle className="text-blue-500 text-xl" />}
                            {query.type === 'cgpa' && <FaChartLine className="text-green-500 text-xl" />}
                            {query.type === 'calendar' && <FaCalendarAlt className="text-purple-500 text-xl" />}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800">{query.subject}</h3>
                            <p className="text-sm text-gray-500">
                              Submitted on {new Date(query.date).toLocaleDateString()}
                              {query.responseDate && ` • Responds on ${new Date(query.responseDate).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium mr-3 ${getStatusColor(query.status)}`}>
                            {getStatusText(query.status)}
                          </span>
                          {expandedQuery === query.id ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
                        </div>
                      </div>
                      
                      {expandedQuery === query.id && (
                        <div className="p-4 bg-white border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
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
                              <p>{new Date(query.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          {query.type === 'question' && (
                            <div className="mb-4">
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
                          
                          {query.adminResponse && (
                            <div className="pt-4 border-t border-gray-200">
                              <h4 className="text-sm font-medium text-gray-500 mb-2">Admin Response</h4>
                              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <p className="text-blue-800">{query.adminResponse}</p>
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
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            {/* Query Type Selection */}
            <div className="border-b border-gray-200 bg-gray-50/50">
              <div className="flex overflow-x-auto justify-center px-6 scrollbar-hide">
                {queryTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setActiveTab(type.id);
                      setFormData({...formData, type: type.id});
                    }}
                    className={`px-5 py-4 flex flex-col items-center min-w-[140px] border-b-2 transition-all duration-200 ${
                      activeTab === type.id
                        ? `border-${type.color}-500 text-${type.color}-600 bg-white shadow-sm`
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className={`text-lg mb-2 ${activeTab === type.id ? `text-${type.color}-500` : 'text-gray-400'}`}>
                      {type.icon}
                    </span>
                    <span className="font-medium text-sm">{type.name}</span>
                    <span className="text-xs mt-1 text-gray-400">{type.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Query Form */}
            <form onSubmit={handleSubmit} className="p-6">
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
                        type="number"
                        name="cgpa"
                        value={formData.cgpa}
                        onChange={handleInputChange}
                        min="0"
                        max="10"
                        step="0.01"
                        placeholder="Enter your updated CGPA"
                        className={`w-full px-4 py-3 border ${formErrors.cgpa ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200`}
                        required
                      />
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
                  <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-200">
                    <div className="flex items-start">
                      <FaInfoCircle className="text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                      <p className="text-sm text-green-700">
                        Please ensure your document is clear and shows your name, university seal, and the updated CGPA clearly. 
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
                  
                  <div className="bg-purple-50 rounded-xl p-4 mb-6 border border-purple-200">
                    <div className="flex items-start">
                      <FaInfoCircle className="text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
                      <p className="text-sm text-purple-700">
                        Please note that calendar blocking requests require at least 24 hours advance notice and are subject to approval by the placement cell.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Error Display */}
              {formErrors.submit && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start">
                    <FaExclamationCircle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-red-800 font-medium mb-1">Submission Failed</h4>
                      <p className="text-red-700 text-sm">{formErrors.submit}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mt-10 pt-6 border-t border-gray-100">
                <div className="text-sm text-gray-500 flex items-center">
                  <FaInfoCircle className="mr-2 text-blue-400" />
                  Typically responds within 24-48 hours
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-3 bg-gradient-to-r font-medium rounded-md transition-all duration-200 shadow-md hover:shadow-lg flex items-center ${
                    submitting 
                      ? 'from-gray-400 to-gray-500 text-gray-700 cursor-not-allowed' 
                      : 'from-blue-600 to-blue-800 text-white hover:from-blue-700 hover:to-blue-900'
                  }`}
                >
                  {submitting ? (
                    <>
                      <FaClock className="mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="mr-2" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
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