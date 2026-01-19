/**
 * Endorsement Management Component
 * Student Dashboard - Manage endorsement requests and received endorsements
 */

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  XCircle,
  Star,
  Loader,
  AlertCircle,
  User,
  Building2,
  Send,
  RefreshCw
} from 'lucide-react';
import { FaEnvelope, FaInfoCircle } from 'react-icons/fa';
import api from '../../../services/api';

export default function EndorsementManagement({ onEndorsementUpdate }) {
  const [endorsements, setEndorsements] = useState({
    received: [],
    pending: [],
    expired: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(true); // Show form by default
  const [requesting, setRequesting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [monthlyRequestCount, setMonthlyRequestCount] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(2);
  const [canRequestMore, setCanRequestMore] = useState(true);

  const [requestForm, setRequestForm] = useState({
    teacherName: '',
    teacherEmail: '',
    endorsementMessage: '',
  });

  const [formErrors, setFormErrors] = useState({});

  // Load endorsements on mount
  useEffect(() => {
    loadEndorsements();
  }, []);

  const loadEndorsements = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getStudentEndorsements();
      setEndorsements({
        received: data.received || [],
        pending: data.pending || [],
        expired: data.expired || [],
      });
      // Update monthly request limit info
      setMonthlyRequestCount(data.monthlyRequestCount || 0);
      setMonthlyLimit(data.monthlyLimit || 2);
      setCanRequestMore(data.canRequestMore !== false);
    } catch (err) {
      console.error('Error loading endorsements:', err);
      setError(err.response?.data?.error || 'Failed to load endorsements');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
    
    // Clear general error when user makes changes
    if (error) {
      setError('');
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!requestForm.teacherName || !requestForm.teacherName.trim()) {
      errors.teacherName = 'Teacher name is required';
    } else if (requestForm.teacherName.trim().length < 2) {
      errors.teacherName = 'Teacher name must be at least 2 characters';
    }

    if (!requestForm.teacherEmail || !requestForm.teacherEmail.trim()) {
      errors.teacherEmail = 'Teacher email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const normalizedEmail = requestForm.teacherEmail.trim().toLowerCase();
      if (!emailRegex.test(normalizedEmail)) {
        errors.teacherEmail = 'Please enter a valid email address';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle request submission
  const handleRequestEndorsement = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check monthly limit before submitting
    if (!canRequestMore) {
      setError(`Monthly limit reached. You can only send ${monthlyLimit} endorsement requests per month. Please try again next month.`);
      return;
    }

    setRequesting(true);
    setError('');
    setSuccess('');

    try {
      await api.requestEndorsement({
        teacherName: requestForm.teacherName.trim(),
        teacherEmail: requestForm.teacherEmail.trim().toLowerCase(),
        role: undefined,
        organization: undefined,
      });

      setSuccess('Endorsement request sent successfully! The teacher will receive an email with a secure link.');
      setShowRequestForm(false);
      setRequestForm({
        teacherName: '',
        teacherEmail: '',
        endorsementMessage: '',
      });

      // Reload endorsements
      await loadEndorsements();

      if (onEndorsementUpdate) {
        onEndorsementUpdate();
      }

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error requesting endorsement:', err);
      setError(err.response?.data?.error || err.message || 'Failed to send endorsement request');
    } finally {
      setRequesting(false);
    }
  };

  // Handle delete request
  const handleDeleteRequest = async (tokenId) => {
    if (!window.confirm('Are you sure you want to cancel this endorsement request?')) {
      return;
    }

    setDeleting(tokenId);
    setError('');

    try {
      await api.deleteEndorsementRequest(tokenId);
      setSuccess('Endorsement request cancelled successfully');
      
      // Reload endorsements
      await loadEndorsements();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting endorsement request:', err);
      setError(err.response?.data?.error || 'Failed to cancel endorsement request');
    } finally {
      setDeleting(null);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading endorsements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Endorsements
        </h3>
        {!showRequestForm && (endorsements.received.length > 0 || endorsements.pending.length > 0 || endorsements.expired.length > 0) && (
          <div className="flex items-center gap-3">
            <button
              onClick={loadEndorsements}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh endorsements"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          <button
            onClick={() => setShowRequestForm(true)}
            disabled={!canRequestMore}
              className={`px-6 py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium ${
                canRequestMore
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
              }`}
            title={!canRequestMore ? `Monthly limit reached (${monthlyRequestCount}/${monthlyLimit} requests)` : ''}
          >
            <Plus className="w-4 h-4" />
            Request Endorsement
          </button>
          </div>
        )}
      </div>

      {/* Request Form */}
      {showRequestForm && (
        <div className="mb-6 bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-semibold text-gray-800">Request New Endorsement</h4>
            <button
              onClick={() => {
                setShowRequestForm(false);
                setRequestForm({
                  teacherName: '',
                  teacherEmail: '',
                    endorsementMessage: '',
                });
                setFormErrors({});
                setError('');
              }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
            <form onSubmit={handleRequestEndorsement} className="space-y-6">
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2 flex items-center">
                  Teacher Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="teacherName"
                  value={requestForm.teacherName}
                  onChange={handleInputChange}
                    placeholder="Enter teacher's full name"
                    className={`w-full pl-12 pr-4 py-3 border ${formErrors.teacherName ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200`}
                  required
                />
                </div>
                {formErrors.teacherName && <p className="text-red-500 text-sm mt-1">{formErrors.teacherName}</p>}
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2 flex items-center">
                  Teacher Email Address
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="teacherEmail"
                  value={requestForm.teacherEmail}
                  onChange={handleInputChange}
                    placeholder="teacher@example.com"
                    className={`w-full pl-12 pr-4 py-3 border ${formErrors.teacherEmail ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200`}
                  required
                />
                </div>
                {formErrors.teacherEmail && <p className="text-red-500 text-sm mt-1">{formErrors.teacherEmail}</p>}
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Message (Optional)
                </label>
                <textarea
                  name="endorsementMessage"
                  value={requestForm.endorsementMessage}
                  onChange={handleInputChange}
                  placeholder="Add any additional message or context for the teacher..."
                  rows={4}
                  className={`w-full px-4 py-3 border min-h-[120px] max-h-[300px] resize-y ${formErrors.endorsementMessage ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200`}
                />
                {formErrors.endorsementMessage && <p className="text-red-500 text-sm mt-1">{formErrors.endorsementMessage}</p>}
              </div>
              
              <div className="bg-orange-50 rounded-xl p-4 mb-6 border border-orange-200">
                <div className="flex items-start">
                  <FaInfoCircle className="text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-orange-700 mb-2">
                      An email with a secure link will be sent to the teacher. The teacher will be able to fill in their details, write an endorsement message, and sign the document digitally.
                    </p>
                    <p className="text-sm text-orange-600 mb-2">
                      The endorsement will be automatically associated with your profile once the teacher completes the form.
                    </p>
                    <p className="text-xs text-orange-600 font-medium mt-2 pt-2 border-t border-orange-200">
                      Note: You can send only {monthlyLimit} endorsement requests per month.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestForm(false);
                    setRequestForm({
                      teacherName: '',
                      teacherEmail: '',
                      endorsementMessage: '',
                    });
                    setFormErrors({});
                  }}
                  disabled={requesting}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Cancel
                </button>
              <button
                type="submit"
                disabled={requesting || !canRequestMore}
                  className={`px-6 py-3 font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 ${
                    requesting || !canRequestMore
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800'
                  }`}
              >
                {requesting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-red-800 font-medium mb-1">Error</h4>
          <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-green-800 font-medium mb-1">Success</h4>
          <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Received Endorsements - Only show when form is closed */}
      {!showRequestForm && endorsements.received.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Received Endorsements ({endorsements.received.length})
          </h4>
          <div className="space-y-4">
            {endorsements.received.map((endorsement, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* Header Section */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                        {endorsement.endorserName?.charAt(0)?.toUpperCase() || 'T'}
                      </div>
                  <div>
                        <h5 className="font-semibold text-gray-800 text-lg">
                      {endorsement.endorserName}
                    </h5>
                      {endorsement.endorserRole && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {endorsement.endorserRole}
                          {endorsement.organization && ` at ${endorsement.organization}`}
                        </p>
                      )}
                      </div>
                    </div>
                    <div className="ml-12 space-y-1.5">
                      {endorsement.endorserEmail && (
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                        {endorsement.endorserEmail}
                      </p>
                      )}
                      {endorsement.strengthRating && (
                        <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < endorsement.strengthRating
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {endorsement.strengthRating}/5
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {endorsement.submittedAt && (
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                    {formatDate(endorsement.submittedAt)}
                  </span>
                  )}
                </div>

                {/* Endorsement Message */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {endorsement.message}
                    </p>
                  </div>
                </div>

                {/* Related Skills */}
                {endorsement.relatedSkills && endorsement.relatedSkills.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2">Related Skills:</p>
                    <div className="flex flex-wrap gap-2">
                    {endorsement.relatedSkills.map((skill, idx) => (
                      <span
                        key={idx}
                          className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm rounded-full font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {endorsements.pending.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Pending Requests ({endorsements.pending.length})
          </h4>
          <div className="space-y-3">
            {endorsements.pending.map((request) => (
              <div
                key={request.id}
                className="p-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-medium text-gray-800">{request.teacherName || request.teacherEmail}</h5>
                    <div className="text-sm text-gray-600 mt-1">
                      {request.teacherRole && (
                        <p>{request.teacherRole}{request.organization && ` at ${request.organization}`}</p>
                      )}
                      <p className="flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" />
                        {request.teacherEmail}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Expires: {formatDate(request.expiresAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRequest(request.id)}
                    disabled={deleting === request.id}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Cancel request"
                  >
                    {deleting === request.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired Requests */}
      {endorsements.expired.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-gray-400" />
            Expired Requests ({endorsements.expired.length})
          </h4>
          <div className="space-y-3">
            {endorsements.expired.map((request) => (
              <div
                key={request.id}
                className="p-4 border-2 border-gray-200 bg-gray-50 rounded-lg opacity-60"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-medium text-gray-600">{request.teacherName || request.teacherEmail}</h5>
                    <p className="text-xs text-gray-500 mt-1">
                      Expired: {formatDate(request.expiresAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteRequest(request.id)}
                    disabled={deleting === request.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete expired request"
                  >
                    {deleting === request.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State - Only show if form is closed and no requests/endorsements */}
      {endorsements.received.length === 0 && 
       endorsements.pending.length === 0 && 
       endorsements.expired.length === 0 && !showRequestForm && (
        <div className="text-center py-12">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-orange-200">
            <Mail className="w-10 h-10 text-orange-600" />
          </div>
          <h4 className="text-xl font-semibold text-gray-800 mb-2">No endorsements yet</h4>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Get started by requesting an endorsement from your teacher. They'll receive an email with a secure link to complete the endorsement.
          </p>
          <button
            onClick={() => setShowRequestForm(true)}
            disabled={!canRequestMore}
            className={`px-6 py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium mx-auto ${
              canRequestMore
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
            }`}
            title={!canRequestMore ? `Monthly limit reached (${monthlyRequestCount}/${monthlyLimit} requests)` : ''}
          >
            <Plus className="w-4 h-4" />
            Request Endorsement
          </button>
        </div>
      )}
    </div>
  );
}

