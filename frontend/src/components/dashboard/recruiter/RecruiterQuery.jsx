/**
 * Recruiter Query Component
 * Generic query system for recruiters to contact placement cell
 */

import React, { useState, useEffect } from 'react';
import { 
  FaPaperPlane, 
  FaQuestionCircle, 
  FaTimes,
  FaCheckCircle,
  FaHistory,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaCheck,
  FaTimesCircle
} from 'react-icons/fa';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import { useToast } from '../../ui/Toast';

const RecruiterQuery = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [activeView, setActiveView] = useState('new'); // 'new' or 'history'
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedQuery, setExpandedQuery] = useState(null);
  const [referenceId, setReferenceId] = useState('');
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [pastQueries, setPastQueries] = useState([]);

  // Load queries on mount
  useEffect(() => {
    if (!user?.id) return;
    loadQueries();
  }, [user?.id]);

  const loadQueries = async () => {
    try {
      setLoadingQueries(true);
      const response = await api.get('/queries');
      const list = Array.isArray(response?.data) ? response.data : response?.queries || [];
      setPastQueries(list);
    } catch (error) {
      console.error('Error loading queries:', error);
      setPastQueries([]);
    } finally {
      setLoadingQueries(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.subject.trim()) {
      errors.subject = 'Subject is required';
    } else if (formData.subject.trim().length < 5) {
      errors.subject = 'Subject must be at least 5 characters';
    }

    if (!formData.message.trim()) {
      errors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!user?.id) {
      setFormErrors({ submit: 'Please log in to submit a query' });
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await api.post('/queries', {
        type: 'question',
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });
      
      const refId = response.referenceId || response.data?.referenceId || `RQ-${Date.now().toString(36).toUpperCase()}`;
      setReferenceId(refId);
      setSubmitted(true);
      resetForm();
      await loadQueries(); // Refresh queries
      toast?.success('Query submitted successfully!');
    } catch (error) {
      console.error('Error submitting query:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to submit query';
      setFormErrors({ submit: errorMessage });
      toast?.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      message: '',
    });
    setFormErrors({});
    setSubmitted(false);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'closed':
        return <FaCheck className="text-green-500" />;
      case 'rejected':
        return <FaTimesCircle className="text-red-500" />;
      case 'under_review':
      case 'open':
        return <FaClock className="text-blue-500" />;
      default:
        return <FaClock className="text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'closed':
        return 'Resolved';
      case 'rejected':
        return 'Rejected';
      case 'under_review':
      case 'open':
        return 'Under Review';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
      case 'open':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleQueryExpand = (id) => {
    setExpandedQuery(expandedQuery === id ? null : id);
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
              Your query has been submitted to the placement cell. 
              You will receive a response within 24-48 hours.
            </p>
            {referenceId && (
              <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left border border-blue-200">
                <h3 className="font-medium text-blue-800 mb-2">Reference ID: #{referenceId}</h3>
                <p className="text-sm text-blue-600">Keep this reference ID for future communication.</p>
              </div>
            )}
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
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Recruiter Query Portal</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Contact the placement cell for assistance with any questions or concerns
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-sm p-1 shadow-sm border border-gray-200 inline-flex">
            <button
              onClick={() => setActiveView('new')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${activeView === 'new' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 hover:text-gray-800'}`}
            >
              New Query
            </button>
            <button
              onClick={() => setActiveView('history')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center ${activeView === 'history' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 hover:text-gray-800'}`}
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
                            <FaQuestionCircle className="text-blue-500 text-xl" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800">{query.subject}</h3>
                            <p className="text-sm text-gray-500">
                              Submitted on {new Date(query.createdAt || query.date).toLocaleDateString()}
                              {(query.respondedAt || query.responseDate) && ` • Responded on ${new Date(query.respondedAt || query.responseDate).toLocaleDateString()}`}
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
                              <h4 className="text-sm font-medium text-gray-500 mb-1">Subject</h4>
                              <p className="text-gray-800">{query.subject}</p>
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
                              <p>{new Date(query.createdAt || query.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-500 mb-1">Your Message</h4>
                            <p className="text-gray-800 whitespace-pre-wrap">{query.message}</p>
                          </div>
                          
                          {(query.response || query.adminResponse) && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <h4 className="text-sm font-medium text-blue-800 mb-2">Admin Response</h4>
                              <p className="text-blue-700 whitespace-pre-wrap">{query.response || query.adminResponse}</p>
                              {(query.respondedAt || query.responseDate) && (
                                <p className="text-xs text-blue-600 mt-2">
                                  Responded on {new Date(query.respondedAt || query.responseDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {query.referenceId && (
                            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Reference ID:</span> {query.referenceId}
                              </p>
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
          /* New Query Form */
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Submit a Query</h2>
              <p className="text-gray-600">Fill out the form below to contact the placement cell</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {formErrors.submit && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{formErrors.submit}</p>
                </div>
              )}

              <div className="mb-6">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.subject ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter query subject"
                />
                {formErrors.subject && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.subject}</p>
                )}
              </div>

              <div className="mb-6">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.message ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Describe your query in detail..."
                />
                {formErrors.message && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <FaClock className="animate-spin" />
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
      </div>
    </div>
  );
};

export default RecruiterQuery;
