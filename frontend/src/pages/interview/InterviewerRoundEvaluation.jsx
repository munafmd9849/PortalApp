/**
 * Interviewer Round Evaluation Page
 * Token-based access for evaluating candidates in a round
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { API_BASE_URL } from '../../config/api';
import { Loader, AlertCircle, Save, CheckCircle, XCircle, Clock, ArrowLeft, User, FileText, ExternalLink, Users, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { showSuccess, showError, showWarning, showLoading, replaceLoadingToast, dismissToast } from '../../utils/toast';
import ThankYouPopup from '../../components/common/ThankYouPopup';

const InterviewerRoundEvaluation = () => {
  const { roundId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [round, setRound] = useState(null);
  const [evaluations, setEvaluations] = useState({});
  const [canEndRound, setCanEndRound] = useState(false);
  const [endingRound, setEndingRound] = useState(false);
  const [showThankYouPopup, setShowThankYouPopup] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState(null);
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null); // applicationId when open

  useEffect(() => {
    if (!token) {
      setError('No access token provided.');
      setLoading(false);
      return;
    }

    loadRoundData();
  }, [roundId, token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openStatusDropdown != null && !e.target.closest('.status-dropdown-container')) {
        setOpenStatusDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openStatusDropdown]);

  const loadRoundData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch candidates using API client
      const candidatesData = await api.getRoundCandidates(roundId, token);
      const list = Array.isArray(candidatesData.candidates) ? candidatesData.candidates : [];
      setCandidates(list);
      setRound(candidatesData.round || null);

      // Build evaluations map and ensure profile URLs (use public profile so interviewer sees profile without login)
      const evalMap = {};
      list.forEach((candidate) => {
        if (candidate.student && candidate.student.publicProfileId && !candidate.student.profileUrl) {
          candidate.student.profileUrl = `/profile/${candidate.student.publicProfileId}`;
        }
        
        if (candidate.evaluation) {
          evalMap[candidate.applicationId] = {
            status: candidate.evaluation.status,
            remarks: candidate.evaluation.remarks || '',
          };
        } else {
          evalMap[candidate.applicationId] = {
            status: '',
            remarks: '',
          };
        }
      });
      setEvaluations(evalMap);

      // Round can end when:
      // - there are no candidates (allow admin to end empty rounds), OR
      // - all candidates have been evaluated as SELECTED or REJECTED (no PENDING/ON_HOLD)
      const allDecided = list.length > 0 && list.every(
        (c) => c.evaluation && c.evaluation.status && ['SELECTED', 'REJECTED'].includes(c.evaluation.status)
      );
      const allowEndWhenNoCandidates = list.length === 0;
      setCanEndRound(allDecided || allowEndWhenNoCandidates);

      setLoading(false);
    } catch (err) {
      console.error('Error loading round data:', err);
      // Handle 404 or no candidates gracefully
      if (err.status === 404 || err.message?.includes('No candidates')) {
        setCandidates([]);
        setRound(null);
        setEvaluations({});
        setCanEndRound(false);
        setLoading(false);
        return;
      }
      setError(err.message || 'Failed to load round data. Please try again.');
      setCandidates([]);
      setRound(null);
      setEvaluations({});
      setCanEndRound(false);
      setLoading(false);
    }
  };

  const handleStatusChange = (applicationId, status) => {
    setEvaluations((prev) => ({
      ...prev,
      [applicationId]: {
        ...prev[applicationId],
        status,
      },
    }));
  };

  const handleRemarksChange = (applicationId, remarks) => {
    setEvaluations((prev) => ({
      ...prev,
      [applicationId]: {
        ...prev[applicationId],
        remarks,
      },
    }));
  };

  const handleSaveEvaluation = async (applicationId) => {
    const evaluation = evaluations[applicationId];
    if (!evaluation.status || !['SELECTED', 'REJECTED', 'ON_HOLD'].includes(evaluation.status)) {
      showWarning('Please select a status before saving');
      return;
    }

    if ((evaluation.status === 'REJECTED' || evaluation.status === 'ON_HOLD') && !evaluation.remarks?.trim()) {
      showWarning('Remarks are required for REJECTED or ON_HOLD status');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, [applicationId]: true }));

      // Use API client to save evaluation
      await api.evaluateRoundCandidate(roundId, token, {
        applicationId,
        status: evaluation.status,
        remarks: evaluation.remarks || null,
      });

      // Show success message
      const statusMessages = {
        'SELECTED': 'Candidate marked as selected',
        'REJECTED': 'Candidate marked as rejected',
        'ON_HOLD': 'Candidate marked as on hold'
      };
      showSuccess(statusMessages[evaluation.status] || 'Evaluation saved successfully');

      // Reload to get updated data
      await loadRoundData();
    } catch (err) {
      console.error('Error saving evaluation:', err);
      showError(err.message || 'Failed to save evaluation. Please try again.');
    } finally {
      setSaving((prev) => ({ ...prev, [applicationId]: false }));
    }
  };

  const handleEndRound = async () => {
    if (!window.confirm('Are you sure you want to end this round? This action cannot be undone and will lock all evaluations.')) {
      return;
    }

    let loadingToastId = null;
    try {
      setEndingRound(true);
      loadingToastId = showLoading('Ending round...');

      const result = await api.endRound(roundId, token);
      const sessionCompleted = result.sessionCompleted === true;

      if (sessionCompleted) {
        dismissToast(loadingToastId);
        setPendingNavigate(round?.sessionId ? { sessionId: round.sessionId, token } : null);
        setShowThankYouPopup(true);
      } else {
        const message = result.message || 'Round ended successfully! Only selected candidates will proceed to the next round.';
        replaceLoadingToast(loadingToastId, 'success', message);
        if (round?.sessionId) {
          navigate(`/interview/session/${round.sessionId}?token=${encodeURIComponent(token)}`);
        } else {
          navigate(-1);
        }
      }
    } catch (err) {
      console.error('Error ending round:', err);
      if (loadingToastId) dismissToast(loadingToastId);
      showError(err.message || 'Failed to end round. Please ensure all candidates are evaluated and try again.');
    } finally {
      setEndingRound(false);
    }
  };

  const handleThankYouClose = () => {
    setShowThankYouPopup(false);
    if (pendingNavigate?.sessionId && pendingNavigate?.token) {
      navigate(`/interview/session/${pendingNavigate.sessionId}?token=${encodeURIComponent(pendingNavigate.token)}`);
    } else {
      navigate(-1);
    }
    setPendingNavigate(null);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SELECTED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'ON_HOLD':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  // Capsule-style status options (spreadsheet-like dropdown)
  const STATUS_OPTIONS = [
    { value: 'SELECTED', label: 'Select', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    { value: 'REJECTED', label: 'Reject', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    { value: 'ON_HOLD', label: 'On hold', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  ];

  const getStatusOption = (status) =>
    STATUS_OPTIONS.find((o) => o.value === status) || { value: '', label: 'Status', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Evaluate Candidates</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-semibold text-gray-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                    {round?.name || 'Round'}
                  </span>
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} to evaluate
                  </span>
                </div>
              </div>
            </div>
            {canEndRound && (
              <button
                onClick={handleEndRound}
                disabled={endingRound}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
              >
                {endingRound ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Ending...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    End Round
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="max-w-full mx-auto">
          {/* Banner: on-hold candidates must be changed to Selected or Rejected before ending round */}
          {candidates.some((c) => c.evaluation?.status === 'ON_HOLD') && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-800">
                You have candidate(s) marked <strong>On hold</strong>. Change each to <strong>Selected</strong> or <strong>Rejected</strong> and click <strong>Update</strong> so you can end the round.
              </p>
            </div>
          )}
          {/* Candidates Table */}
          {candidates.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No candidates available</h3>
              <p className="text-gray-600 mb-6">There are no candidates assigned to this round yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <tr>
                      <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider">Details</th>
                      <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider">Status</th>
                      <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider">Remarks</th>
                      <th className="px-4 py-4 text-center text-sm font-bold uppercase tracking-wider">Resume</th>
                      <th className="px-4 py-4 text-center text-sm font-bold uppercase tracking-wider">Profile</th>
                      <th className="px-4 py-4 text-center text-sm font-bold uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {candidates.map((candidate) => {
                      const evaluation = evaluations[candidate.applicationId] || { status: '', remarks: '' };
                      // Recruiter can change status (Select / Reject / On hold) and remarks until they click "End Round"
                      const isLocked = false;
                      const isSaving = saving[candidate.applicationId];

                      return (
                        <tr key={candidate.applicationId} className="hover:bg-gray-50 transition-colors">
                          {/* Details Column */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-900 truncate">{candidate.student.fullName}</div>
                                <div className="text-xs text-gray-600 truncate">{candidate.student.email}</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {candidate.student.enrollmentId && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                      {candidate.student.enrollmentId}
                                    </span>
                                  )}
                                  {candidate.student.batch && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                      {candidate.student.batch}
                                    </span>
                                  )}
                                </div>
                                {candidate.student.skills && candidate.student.skills.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {candidate.student.skills.slice(0, 3).map((skill, idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                        {skill}
                                      </span>
                                    ))}
                                    {candidate.student.skills.length > 3 && (
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                        +{candidate.student.skills.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {(candidate.previousRoundStatus || candidate.previousRoundRemarks) && (
                                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                                    <span className="font-semibold">Prev Round:</span>
                                    {candidate.previousRoundStatus && (
                                      <span className="ml-1 font-medium">{candidate.previousRoundStatus}</span>
                                    )}
                                    {candidate.previousRoundRemarks && (
                                      <span className={candidate.previousRoundStatus ? ' ml-1' : ''}> – {candidate.previousRoundRemarks}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Status column: capsule dropdown (spreadsheet-style) */}
                          <td className="px-4 py-4 align-top">
                            <div className="relative inline-block status-dropdown-container">
                              <button
                                type="button"
                                onClick={() => !isLocked && !isSaving && setOpenStatusDropdown((prev) => (prev === candidate.applicationId ? null : candidate.applicationId))}
                                disabled={isLocked || isSaving}
                                className={`inline-flex items-center gap-1.5 min-w-[120px] rounded-full px-3 py-1.5 text-sm font-medium border transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${evaluation.status ? `${getStatusOption(evaluation.status).bg} ${getStatusOption(evaluation.status).text} ${getStatusOption(evaluation.status).border} border` : 'bg-gray-100 text-gray-600 border-gray-200'}`}
                              >
                                <span>{evaluation.status ? getStatusOption(evaluation.status).label : 'Status'}</span>
                                {!isLocked && !isSaving && (
                                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openStatusDropdown === candidate.applicationId ? 'rotate-180' : ''}`} />
                                )}
                              </button>
                              {openStatusDropdown === candidate.applicationId && (
                                <div className="absolute left-0 top-full mt-1 z-20 py-1 rounded-xl bg-white border border-gray-200 shadow-lg min-w-[140px]">
                                  {STATUS_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        handleStatusChange(candidate.applicationId, opt.value);
                                        setOpenStatusDropdown(null);
                                      }}
                                      className={`w-full text-left rounded-full px-3 py-2 text-sm font-medium ${opt.bg} ${opt.text} border ${opt.border} mx-1 mb-0.5 last:mb-0 hover:opacity-90 transition-opacity`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Remarks Column - always editable so on-hold can be updated to accept/reject with remarks */}
                          <td className="px-4 py-4">
                            <textarea
                              value={evaluation.remarks}
                              onChange={(e) => handleRemarksChange(candidate.applicationId, e.target.value)}
                              disabled={isLocked || isSaving}
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                              placeholder="Enter remarks..."
                            />
                            {(evaluation.status === 'REJECTED' || evaluation.status === 'ON_HOLD') && !evaluation.remarks?.trim() && (
                              <p className="text-xs text-red-600 mt-1">Remarks required</p>
                            )}
                            {candidate.evaluation?.status && (
                              <div className="mt-2 flex items-center gap-1 text-xs">
                                {getStatusIcon(candidate.evaluation.status)}
                                <span className="font-medium text-gray-700">{candidate.evaluation.status}</span>
                                {candidate.evaluation.status === 'ON_HOLD' && (
                                  <span className="text-amber-600">— change to Selected/Rejected and Save to end round</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Resume Link Column */}
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            {candidate.student.resumeUrl ? (
                              <button
                                onClick={async () => {
                                  try {
                                    const result = await api.getApplicationResumeViewUrl(candidate.applicationId);
                                    const path = result?.url || result?.data?.url;
                                    if (path) {
                                      const base = API_BASE_URL.replace(/\/api\/?$/, '');
                                      const viewUrl = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
                                      const w = window.open(viewUrl, '_blank');
                                      if (w) w.focus();
                                      return;
                                    }
                                  } catch (_) { /* fallback */ }
                                  const pdfWindow = window.open(candidate.student.resumeUrl, '_blank');
                                  if (pdfWindow) pdfWindow.focus();
                                }}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1 transition-colors"
                                title="View Resume"
                              >
                                <FileText className="w-4 h-4" />
                                <span className="hidden sm:inline">Resume</span>
                              </button>
                            ) : (
                              <span className="text-gray-400 text-sm">N/A</span>
                            )}
                          </td>

                          {/* Profile Link Column - uses public profile URL so interviewer sees student profile without login */}
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            {(candidate.student.profileUrl || candidate.student.publicProfileId) && (
                              <button
                                onClick={() => {
                                  const profileUrl = candidate.student.profileUrl || `/profile/${candidate.student.publicProfileId}`;
                                  window.open(profileUrl, '_blank');
                                }}
                                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center gap-1 transition-colors"
                                title="View Profile"
                              >
                                <LinkIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Profile</span>
                              </button>
                            )}
                          </td>

                          {/* Action Column - always allow Save/Update until round is ended */}
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleSaveEvaluation(candidate.applicationId)}
                              disabled={isSaving || !evaluation.status}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                              {isSaving ? (
                                <>
                                  <Loader className="w-4 h-4 animate-spin" />
                                  <span className="hidden sm:inline">Saving...</span>
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4" />
                                  <span className="hidden sm:inline">{candidate.evaluation?.status ? 'Update' : 'Save'}</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <ThankYouPopup
        isOpen={showThankYouPopup}
        onClose={handleThankYouClose}
      />
    </div>
  );
};

export default InterviewerRoundEvaluation;
