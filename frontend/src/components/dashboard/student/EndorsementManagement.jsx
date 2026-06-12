/**
 * Endorsement Management — request endorsements and view received/pending items
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Loader,
  AlertCircle,
  Send,
  RefreshCw,
  Mail,
  Search,
} from 'lucide-react';
import api from '../../../services/api';
import { EndorsementCard, EndorsementCardStyles } from './Endorsements';

function normalizeEndorsement(endorsement) {
  let relatedSkills = [];
  if (Array.isArray(endorsement.relatedSkills)) {
    relatedSkills = endorsement.relatedSkills.filter((skill) => skill && skill.trim());
  } else if (endorsement.relatedSkills && typeof endorsement.relatedSkills === 'string') {
    relatedSkills = endorsement.relatedSkills.split(',').map((s) => s.trim()).filter(Boolean);
  }

  let skillRatings = {};
  if (endorsement.skillRatings) {
    try {
      skillRatings =
        typeof endorsement.skillRatings === 'string'
          ? JSON.parse(endorsement.skillRatings)
          : endorsement.skillRatings;
    } catch {
      skillRatings = {};
    }
  }

  return { ...endorsement, relatedSkills, skillRatings };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nameFromEmail(email) {
  const local = email.split('@')[0] || 'Teacher';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'Teacher';
}

function resolveTeacherChoice(searchValue, teachers, selectedTeacher) {
  if (selectedTeacher) return selectedTeacher;

  const query = searchValue.trim().toLowerCase();
  if (!query) return null;

  const listMatch = teachers.find(
    (t) =>
      t.id === query ||
      t.email?.toLowerCase() === query ||
      t.name?.toLowerCase() === query
  );
  if (listMatch) return listMatch;

  if (EMAIL_REGEX.test(query)) {
    return {
      id: query,
      name: nameFromEmail(query),
      email: query,
      role: undefined,
      organization: undefined,
    };
  }

  return null;
}

export default function EndorsementManagement({ onEndorsementUpdate }) {
  const [endorsements, setEndorsements] = useState({
    received: [],
    pending: [],
    expired: [],
  });
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [monthlyRequestCount, setMonthlyRequestCount] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(2);
  const [canRequestMore, setCanRequestMore] = useState(true);

  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showTeacherList, setShowTeacherList] = useState(false);
  const teacherPickerRef = useRef(null);
  const [endorsementMessage, setEndorsementMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const loadTeachers = useCallback(async () => {
    try {
      setLoadingTeachers(true);
      const data = await api.getEndorsementTeachers();
      setTeachers(Array.isArray(data?.teachers) ? data.teachers : []);
    } catch (err) {
      console.error('Error loading teachers:', err);
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  const loadEndorsements = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getStudentEndorsements();
      setEndorsements({
        received: (data.received || []).map(normalizeEndorsement),
        pending: data.pending || [],
        expired: data.expired || [],
      });
      setMonthlyRequestCount(data.monthlyRequestCount || 0);
      setMonthlyLimit(data.monthlyLimit || 2);
      setCanRequestMore(data.canRequestMore !== false);
    } catch (err) {
      console.error('Error loading endorsements:', err);
      setError(err.response?.data?.error || 'Failed to load endorsements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEndorsements();
  }, [loadEndorsements]);

  useEffect(() => {
    if (showRequestForm) {
      loadTeachers();
    }
  }, [showRequestForm, loadTeachers]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (teacherPickerRef.current && !teacherPickerRef.current.contains(event.target)) {
        setShowTeacherList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTeachers = useMemo(() => {
    const query = teacherSearch.trim().toLowerCase();
    if (!query) return teachers;
    return teachers.filter(
      (t) =>
        t.name?.toLowerCase().includes(query) ||
        t.email?.toLowerCase().includes(query) ||
        t.role?.toLowerCase().includes(query)
    );
  }, [teachers, teacherSearch]);

  const trimmedSearch = teacherSearch.trim();
  const isValidCustomEmail =
    EMAIL_REGEX.test(trimmedSearch) &&
    !teachers.some((t) => t.email?.toLowerCase() === trimmedSearch.toLowerCase());

  const activeTeacher =
    selectedTeacher || resolveTeacherChoice(teacherSearch, teachers, null);

  const resetForm = () => {
    setSelectedTeacher(null);
    setTeacherSearch('');
    setShowTeacherList(false);
    setEndorsementMessage('');
    setFormErrors({});
    setError('');
  };

  const openRequestForm = () => {
    resetForm();
    setShowRequestForm(true);
  };

  const validateForm = () => {
    const errors = {};
    const teacher = resolveTeacherChoice(teacherSearch, teachers, selectedTeacher);
    if (!teacher) {
      errors.teacher = 'Select a teacher from the list or enter a valid email address';
    } else if (!teacher.email || !EMAIL_REGEX.test(teacher.email)) {
      errors.teacher = 'Please enter a valid teacher email address';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRequestEndorsement = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!canRequestMore) {
      setError(
        `Monthly limit reached. You can send ${monthlyLimit} endorsement requests per month.`
      );
      return;
    }

    const teacher = resolveTeacherChoice(teacherSearch, teachers, selectedTeacher);
    if (!teacher) {
      setFormErrors({ teacher: 'Select a teacher or enter a valid email address' });
      return;
    }

    setRequesting(true);
    setError('');
    setSuccess('');

    try {
      await api.requestEndorsement({
        teacherName: teacher.name,
        teacherEmail: teacher.email.trim().toLowerCase(),
        role: teacher.role || undefined,
        organization: teacher.organization || undefined,
      });

      setSuccess('Request sent. The teacher will receive an email with a secure link.');
      setShowRequestForm(false);
      resetForm();
      await loadEndorsements();
      onEndorsementUpdate?.();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error requesting endorsement:', err);
      setError(err.response?.data?.error || err.message || 'Failed to send endorsement request');
    } finally {
      setRequesting(false);
    }
  };

  const handleDeleteRequest = async (tokenId) => {
    if (!window.confirm('Cancel this endorsement request?')) return;

    setDeleting(tokenId);
    setError('');

    try {
      await api.deleteEndorsementRequest(tokenId);
      setSuccess('Request cancelled');
      await loadEndorsements();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting endorsement request:', err);
      setError(err.response?.data?.error || 'Failed to cancel request');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasAnyData =
    endorsements.received.length > 0 ||
    endorsements.pending.length > 0 ||
    endorsements.expired.length > 0;

  if (loading) {
    return (
      <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-4 px-4 sm:px-6 shadow-lg min-w-0">
        <legend className="text-lg font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] text-transparent bg-clip-text">
          Endorsements
        </legend>
        <div className="flex items-center justify-center py-8">
          <Loader className="w-5 h-5 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-gray-600">Loading endorsements...</span>
        </div>
      </fieldset>
    );
  }

  return (
    <>
      <EndorsementCardStyles />
      <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] pt-1 pb-4 px-3 md:px-6 shadow-lg min-w-0 overflow-hidden">
        <legend className="text-base md:text-lg font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] text-transparent bg-clip-text">
          Endorsements
        </legend>

        <div className="py-3 md:py-4 space-y-4">
          {!showRequestForm && hasAnyData && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={loadEndorsements}
                disabled={loading}
                className="px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded-md border border-gray-200 hover:bg-gray-100 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={openRequestForm}
                disabled={!canRequestMore}
                className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 font-medium ${
                  canRequestMore
                    ? 'bg-gray-900 text-white hover:bg-black'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                title={
                  !canRequestMore
                    ? `Monthly limit reached (${monthlyRequestCount}/${monthlyLimit})`
                    : ''
                }
              >
                <Plus className="w-3.5 h-3.5" />
                Request endorsement
              </button>
            </div>
          )}

          {showRequestForm && (
            <div className="rounded-lg border border-stone-200 bg-stone-50/60 p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm md:text-base font-semibold text-slate-900">
                  Request endorsement
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestForm(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRequestEndorsement} className="space-y-4">
                <div ref={teacherPickerRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Teacher <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-stone-500 mb-2">
                    Search by name or type the teacher&apos;s email address.
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={teacherSearch}
                      onChange={(e) => {
                        setTeacherSearch(e.target.value);
                        setSelectedTeacher(null);
                        setShowTeacherList(true);
                        if (formErrors.teacher) {
                          setFormErrors((prev) => ({ ...prev, teacher: '' }));
                        }
                      }}
                      onFocus={() => setShowTeacherList(true)}
                      placeholder={
                        loadingTeachers
                          ? 'Loading teachers...'
                          : 'Search by name or enter email'
                      }
                      disabled={loadingTeachers}
                      className={`w-full pl-10 pr-4 py-3 text-sm border rounded-lg bg-white transition-colors ${
                        formErrors.teacher
                          ? 'border-red-400 focus:ring-red-200'
                          : 'border-gray-200 focus:ring-blue-100 focus:border-blue-400'
                      } focus:outline-none focus:ring-2`}
                      autoComplete="off"
                    />
                  </div>

                  {showTeacherList && !loadingTeachers && (
                    <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                      <div className="max-h-52 overflow-y-auto py-1">
                        {filteredTeachers.length > 0 ? (
                          filteredTeachers.map((teacher) => (
                            <button
                              key={teacher.id}
                              type="button"
                              onClick={() => {
                                setSelectedTeacher(teacher);
                                setTeacherSearch(teacher.email);
                                setShowTeacherList(false);
                                setFormErrors((prev) => ({ ...prev, teacher: '' }));
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                                selectedTeacher?.id === teacher.id ? 'bg-blue-50' : ''
                              }`}
                            >
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {teacher.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {teacher.email}
                                {teacher.role ? ` · ${teacher.role}` : ''}
                              </p>
                            </button>
                          ))
                        ) : (
                          <p className="px-4 py-3 text-sm text-gray-500">
                            No teachers match your search.
                          </p>
                        )}

                        {isValidCustomEmail && (
                          <button
                            type="button"
                            onClick={() => {
                              const custom = {
                                id: trimmedSearch.toLowerCase(),
                                name: nameFromEmail(trimmedSearch),
                                email: trimmedSearch.toLowerCase(),
                              };
                              setSelectedTeacher(custom);
                              setTeacherSearch(trimmedSearch.toLowerCase());
                              setShowTeacherList(false);
                              setFormErrors((prev) => ({ ...prev, teacher: '' }));
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-t border-gray-100 bg-stone-50/80"
                          >
                            <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-gray-500" />
                              Use email: {trimmedSearch.toLowerCase()}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 pl-5">
                              Send request to this address
                            </p>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {formErrors.teacher && (
                    <p className="text-red-600 text-xs mt-1.5">{formErrors.teacher}</p>
                  )}
                  {activeTeacher && !formErrors.teacher && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      Request will be sent to{' '}
                      <span className="font-medium text-gray-700">{activeTeacher.email}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Message <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={endorsementMessage}
                    onChange={(e) => setEndorsementMessage(e.target.value)}
                    placeholder="Add a short note for the teacher, if needed."
                    rows={3}
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-y min-h-[80px]"
                  />
                </div>

                <div className="rounded-md border border-stone-200 bg-white p-3 text-xs text-stone-600 leading-relaxed">
                  The teacher receives an email with a secure link to submit the endorsement.
                  Completed endorsements appear on your profile automatically.
                  <span className="block mt-1 text-stone-500">
                    Limit: {monthlyLimit} requests per month ({monthlyRequestCount} used).
                  </span>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestForm(false);
                      resetForm();
                    }}
                    disabled={requesting}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={requesting || !canRequestMore || loadingTeachers}
                    className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-black disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {requesting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          {!showRequestForm && endorsements.received.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-700" />
                Received ({endorsements.received.length})
              </h4>
              <div className="space-y-2 md:space-y-3">
                {endorsements.received.map((endorsement, index) => (
                  <EndorsementCard
                    key={endorsement.id || index}
                    endorsement={endorsement}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          {!showRequestForm && endorsements.pending.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700" />
                Pending ({endorsements.pending.length})
              </h4>
              <div className="space-y-2">
                {endorsements.pending.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-amber-200/80 bg-amber-50/40 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {request.teacherName || request.teacherEmail}
                      </p>
                      <p className="text-xs text-stone-600 truncate">{request.teacherEmail}</p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Expires {formatDate(request.expiresAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(request.id)}
                      disabled={deleting === request.id}
                      className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                      title="Cancel request"
                    >
                      {deleting === request.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showRequestForm && endorsements.expired.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-stone-400" />
                Expired ({endorsements.expired.length})
              </h4>
              <div className="space-y-2">
                {endorsements.expired.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 opacity-75"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-700 truncate">
                        {request.teacherName || request.teacherEmail}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Expired {formatDate(request.expiresAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(request.id)}
                      disabled={deleting === request.id}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                      title="Remove"
                    >
                      {deleting === request.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showRequestForm && !hasAnyData && (
            <div className="text-center py-8 px-2">
              <p className="text-sm font-medium text-slate-800 mb-1">No endorsements yet</p>
              <p className="text-xs text-stone-500 mb-4 max-w-sm mx-auto">
                Request an endorsement from a teacher at your institution.
              </p>
              <button
                type="button"
                onClick={openRequestForm}
                disabled={!canRequestMore}
                className={`px-4 py-2 text-sm rounded-md inline-flex items-center gap-1.5 font-medium ${
                  canRequestMore
                    ? 'bg-gray-900 text-white hover:bg-black'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Request endorsement
              </button>
            </div>
          )}
        </div>
      </fieldset>
    </>
  );
}
