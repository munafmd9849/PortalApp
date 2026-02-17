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
      <div className="bg-[var(--pl-surface-strong)] rounded-lg border-2 border-[var(--pl-border)] p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-[var(--pl-primary)]" />
          <span className="ml-2 text-[var(--pl-text-secondary)]">Loading endorsements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--pl-surface-strong)] rounded-2xl shadow-lg border border-[var(--pl-border)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-[var(--pl-text)] flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Endorsements
        </h3>
        {!showRequestForm && (
          <div className="flex items-center gap-3">
            <button
              onClick={loadEndorsements}
              disabled={loading}
              className="px-4 py-2 bg-[var(--pl-surface)] text-[var(--pl-text)] rounded-xl hover:bg-[var(--pl-surface)]/80 transition-all duration-200 flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh endorsements"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          <button
            onClick={() => setShowRequestForm(true)}
              className="px-6 py-3 bg-[var(--pl-primary)] text-white rounded-xl hover:bg-[var(--pl-link-hover)] transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
          >
            <Plus className="w-4 h-4" />
            Request Endorsement
          </button>
          </div>
        )}
      </div>

      {/* Request Form */}
      {showRequestForm && (
        <div className="mb-6 bg-[var(--pl-surface-strong)] rounded-2xl shadow-lg overflow-hidden border border-[var(--pl-border)]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-semibold text-[var(--pl-text)]">Request New Endorsement</h4>
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
                className="text-[var(--pl-text-muted)] hover:text-[var(--pl-text)] transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
            <form onSubmit={handleRequestEndorsement} className="space-y-6">
              <div className="mb-6">
                <label className="block text-[var(--pl-text)] font-medium mb-2 flex items-center">
                  Teacher Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--pl-text-muted)] w-5 h-5" />
                <input
                  type="text"
                  name="teacherName"
                  value={requestForm.teacherName}
                  onChange={handleInputChange}
                    placeholder="Enter teacher's full name"
                    className={`w-full pl-12 pr-4 py-3 border ${formErrors.teacherName ? 'border-red-500' : 'border-[var(--pl-border)]'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)] focus:border-transparent transition-all duration-200`}
                  required
                />
                </div>
                {formErrors.teacherName && <p className="text-red-500 text-sm mt-1">{formErrors.teacherName}</p>}
              </div>

              <div className="mb-6">
                <label className="block text-[var(--pl-text)] font-medium mb-2 flex items-center">
                  Teacher Email Address
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--pl-text-muted)]" />
                <input
                  type="email"
                  name="teacherEmail"
                  value={requestForm.teacherEmail}
                  onChange={handleInputChange}
                    placeholder="teacher@example.com"
                    className={`w-full pl-12 pr-4 py-3 border ${formErrors.teacherEmail ? 'border-red-500' : 'border-[var(--pl-border)]'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)] focus:border-transparent transition-all duration-200`}
                  required
                />
                </div>
                {formErrors.teacherEmail && <p className="text-red-500 text-sm mt-1">{formErrors.teacherEmail}</p>}
              </div>

              <div className="mb-6">
                <label className="block text-[var(--pl-text)] font-medium mb-2">
                  Message (Optional)
                </label>
                <textarea
                  name="endorsementMessage"
                  value={requestForm.endorsementMessage}
                  onChange={handleInputChange}
                  placeholder="Add any additional message or context for the teacher..."
                  rows={4}
                    className={`w-full px-4 py-3 border min-h-[120px] max-h-[300px] resize-y ${formErrors.endorsementMessage ? 'border-red-500' : 'border-[var(--pl-border)]'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)] focus:border-transparent transition-all duration-200`}
                />
                {formErrors.endorsementMessage && <p className="text-red-500 text-sm mt-1">{formErrors.endorsementMessage}</p>}
              </div>
              
              <div className="bg-[var(--pl-warning)]/10 rounded-xl p-4 mb-6 border border-[var(--pl-warning)]/30">
                <div className="flex items-start">
                  <FaInfoCircle className="text-[var(--pl-warning)] mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-[var(--pl-warning)] mb-2">
                      An email with a secure link will be sent to the teacher. The teacher will be able to fill in their details, write an endorsement message, and sign the document digitally.
                    </p>
                    <p className="text-sm text-[var(--pl-warning)]">
                      The endorsement will be automatically associated with your profile once the teacher completes the form.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--pl-border)]">
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
                  className="px-6 py-3 bg-[var(--pl-surface)] text-[var(--pl-text)] rounded-xl hover:bg-[var(--pl-surface)]/80 disabled:bg-[var(--pl-disabled)] disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Cancel
                </button>
              <button
                type="submit"
                disabled={requesting}
                  className={`px-6 py-3 font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 ${
                    requesting 
                      ? 'bg-[var(--pl-disabled)] text-[var(--pl-text)] cursor-not-allowed' 
                      : 'bg-[var(--pl-primary)] text-white hover:bg-[var(--pl-link-hover)]'
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
        <div className="mb-6 p-4 bg-[var(--pl-danger)]/10 border border-[var(--pl-danger)]/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--pl-danger)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-[var(--pl-danger)] font-medium mb-1">Error</h4>
          <p className="text-sm text-[var(--pl-danger)]">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-[var(--pl-success)]/10 border border-[var(--pl-success)]/30 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-[var(--pl-success)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-[var(--pl-success)] font-medium mb-1">Success</h4>
          <p className="text-sm text-[var(--pl-success)]">{success}</p>
          </div>
        </div>
      )}

      {/* Received Endorsements - Only show when form is closed */}
      {!showRequestForm && endorsements.received.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-[var(--pl-text)] mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[var(--pl-success)]" />
            Received Endorsements ({endorsements.received.length})
          </h4>
          <div className="space-y-4">
            {endorsements.received.map((endorsement, index) => (
              <div
                key={index}
                className="bg-[var(--pl-surface-strong)] rounded-xl border border-[var(--pl-border)] p-6 shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* Header Section */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--pl-primary)] to-[var(--pl-primary)]/80 flex items-center justify-center text-white font-semibold text-lg">
                        {endorsement.endorserName?.charAt(0)?.toUpperCase() || 'T'}
                      </div>
                  <div>
                        <h5 className="font-semibold text-[var(--pl-text)] text-lg">
                      {endorsement.endorserName}
                    </h5>
                      {endorsement.endorserRole && (
                          <p className="text-sm text-[var(--pl-text-secondary)] flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {endorsement.endorserRole}
                          {endorsement.organization && ` at ${endorsement.organization}`}
                        </p>
                      )}
                      </div>
                    </div>
                    <div className="ml-12 space-y-1.5">
                      {endorsement.endorserEmail && (
                        <p className="text-sm text-[var(--pl-text-secondary)] flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[var(--pl-text-muted)]" />
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
                                    ? 'text-[var(--pl-warning)] fill-current'
                                    : 'text-[var(--pl-text-muted)]'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-[var(--pl-text)]">
                            {endorsement.strengthRating}/5
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {endorsement.submittedAt && (
                    <span className="text-xs text-[var(--pl-text-muted)] whitespace-nowrap ml-4">
                    {formatDate(endorsement.submittedAt)}
                  </span>
                  )}
                </div>

                {/* Endorsement Message */}
                <div className="mt-4 pt-4 border-t border-[var(--pl-border)]">
                  <div className="bg-[var(--pl-surface)] rounded-lg p-4 border border-[var(--pl-border)]">
                    <p className="text-[var(--pl-text)] leading-relaxed whitespace-pre-wrap">
                      {endorsement.message}
                    </p>
                  </div>
                </div>

                {/* Related Skills */}
                {endorsement.relatedSkills && endorsement.relatedSkills.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--pl-border)]">
                    <p className="text-sm font-medium text-[var(--pl-text)] mb-2">Related Skills:</p>
                    <div className="flex flex-wrap gap-2">
                    {endorsement.relatedSkills.map((skill, idx) => (
                      <span
                        key={idx}
                          className="px-3 py-1.5 bg-[var(--pl-primary)]/20 text-[var(--pl-primary)] text-sm rounded-full font-medium"
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
          <h4 className="text-md font-semibold text-[var(--pl-text)] mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--pl-warning)]" />
            Pending Requests ({endorsements.pending.length})
          </h4>
          <div className="space-y-3">
            {endorsements.pending.map((request) => (
              <div
                key={request.id}
                className="p-4 border-2 border-[var(--pl-warning)]/30 bg-[var(--pl-warning)]/10 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-medium text-[var(--pl-text)]">{request.teacherName || request.teacherEmail}</h5>
                    <div className="text-sm text-[var(--pl-text-secondary)] mt-1">
                      {request.teacherRole && (
                        <p>{request.teacherRole}{request.organization && ` at ${request.organization}`}</p>
                      )}
                      <p className="flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" />
                        {request.teacherEmail}
                      </p>
                      <p className="text-xs text-[var(--pl-text-muted)] mt-1">
                        Expires: {formatDate(request.expiresAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRequest(request.id)}
                    disabled={deleting === request.id}
                    className="p-2 text-[var(--pl-text-secondary)] hover:text-[var(--pl-danger)] hover:bg-[var(--pl-danger)]/10 rounded-lg transition-colors disabled:opacity-50"
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
          <h4 className="text-md font-semibold text-[var(--pl-text)] mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-[var(--pl-text-muted)]" />
            Expired Requests ({endorsements.expired.length})
          </h4>
          <div className="space-y-3">
            {endorsements.expired.map((request) => (
              <div
                key={request.id}
                className="p-4 border-2 border-[var(--pl-border)] bg-[var(--pl-surface)] rounded-lg opacity-60"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-medium text-[var(--pl-text-secondary)]">{request.teacherName || request.teacherEmail}</h5>
                    <p className="text-xs text-[var(--pl-text-muted)] mt-1">
                      Expired: {formatDate(request.expiresAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteRequest(request.id)}
                    disabled={deleting === request.id}
                    className="p-2 text-[var(--pl-text-muted)] hover:text-[var(--pl-danger)] hover:bg-[var(--pl-danger)]/10 rounded-lg transition-colors disabled:opacity-50"
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
          <div className="bg-[var(--pl-primary)]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-[var(--pl-primary)]/30">
            <Mail className="w-10 h-10 text-[var(--pl-primary)]" />
          </div>
          <h4 className="text-xl font-semibold text-[var(--pl-text)] mb-2">No endorsements yet</h4>
          <p className="text-[var(--pl-text-secondary)] mb-6 max-w-md mx-auto">
            Get started by requesting an endorsement from your teacher. They'll receive an email with a secure link to complete the endorsement.
          </p>
          <button
            onClick={() => setShowRequestForm(true)}
            className="px-6 py-3 bg-[var(--pl-primary)] text-white rounded-xl hover:bg-[var(--pl-link-hover)] transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 font-medium mx-auto"
          >
            <Plus className="w-4 h-4" />
            Request Endorsement
          </button>
        </div>
      )}
    </div>
  );
}

