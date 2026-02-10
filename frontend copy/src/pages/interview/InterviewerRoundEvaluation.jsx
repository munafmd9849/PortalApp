/**
 * Interviewer Round Evaluation Page
 * Token-based access for evaluating candidates in a round
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';
import { Loader, AlertCircle, Save, CheckCircle, XCircle, Clock, ArrowLeft, User, FileText, ExternalLink, Users, Link as LinkIcon } from 'lucide-react';
import { showSuccess, showError, showWarning, showLoading, replaceLoadingToast, dismissToast } from '../../utils/toast';

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

  useEffect(() => {
    if (!token) {
      setError('No access token provided.');
      setLoading(false);
      return;
    }

    loadRoundData();
  }, [roundId, token]);

  const loadRoundData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch candidates
      const candidatesResponse = await fetch(
        `${API_BASE_URL}/interview/round/${roundId}/candidates?token=${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!candidatesResponse.ok) {
        const errorData = await candidatesResponse.json();
        if (candidatesResponse.status === 404 || errorData.error?.includes('No candidates')) {
          setCandidates([]);
          setRound(null);
          setEvaluations({});
          setCanEndRound(false);
          setLoading(false);
          return;
        }
        setError(errorData.error || 'Failed to load candidates');
        setCandidates([]);
        setRound(null);
        setEvaluations({});
        setCanEndRound(false);
        setLoading(false);
        return;
      }

      const candidatesData = await candidatesResponse.json();
      const list = Array.isArray(candidatesData.candidates) ? candidatesData.candidates : [];
      setCandidates(list);
      setRound(candidatesData.round || null);

      // Build evaluations map and ensure profile URLs
      const evalMap = {};
      list.forEach((candidate) => {
        // Add profile URL if student ID is available
        if (candidate.student && candidate.student.id && !candidate.student.profileUrl) {
          candidate.student.profileUrl = `/student/profile/${candidate.student.id}`;
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

      // Check if all candidates are evaluated
      const allEvaluated = list.every(
        (c) => c.evaluation && c.evaluation.status && ['SELECTED', 'REJECTED', 'ON_HOLD'].includes(c.evaluation.status)
      );
      setCanEndRound(allEvaluated && list.length > 0);

      setLoading(false);
    } catch (err) {
      console.error('Error loading round data:', err);
      setError('Failed to load round data. Please try again.');
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

      const response = await fetch(
        `${API_BASE_URL}/interview/round/${roundId}/evaluate?token=${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            applicationId,
            status: evaluation.status,
            remarks: evaluation.remarks || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to save evaluation');
      }

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

      // URL encode the token
      const encodedToken = encodeURIComponent(token);
      const response = await fetch(
        `${API_BASE_URL}/interview/round/${roundId}/end?token=${encodedToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        let errorMessage = errorData.error || errorData.message || 'Failed to end round';
        if (errorData.details) {
          errorMessage += `: ${errorData.details}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const message = result.message || 'Round ended successfully! Only selected candidates will proceed to the next round.';
      
      replaceLoadingToast(loadingToastId, 'success', message);
      
      // Navigate back to session page
      if (round && round.sessionId) {
        const encodedToken = encodeURIComponent(token);
        navigate(`/interview/session/${round.sessionId}?token=${encodedToken}`);
      } else {
        navigate(-1);
      }
    } catch (err) {
      console.error('Error ending round:', err);
      if (loadingToastId) {
        dismissToast(loadingToastId);
      }
      showError(err.message || 'Failed to end round. Please ensure all candidates are evaluated and try again.');
    } finally {
      setEndingRound(false);
    }
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
        <div className="max-w-6xl mx-auto">

          {/* Candidates List */}
          <div className="space-y-4">
            {candidates.length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No candidates available</h3>
                <p className="text-gray-600 mb-6">There are no candidates assigned to this round yet.</p>
              </div>
            ) : (
            candidates.map((candidate) => {
              const evaluation = evaluations[candidate.applicationId] || { status: '', remarks: '' };
              const isEvaluated = candidate.evaluation && candidate.evaluation.status;
              const isSaving = saving[candidate.applicationId];

              return (
                <div
                  key={candidate.applicationId}
                  className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6 hover:shadow-xl transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                        <User className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{candidate.student.fullName}</h3>
                        <p className="text-sm text-gray-600 mb-2">{candidate.student.email}</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {candidate.student.enrollmentId && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                              ID: {candidate.student.enrollmentId}
                            </span>
                          )}
                          {candidate.student.batch && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                              Batch: {candidate.student.batch}
                            </span>
                          )}
                        </div>
                        {candidate.student.skills && candidate.student.skills.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Skills:</p>
                            <div className="flex flex-wrap gap-2">
                              {candidate.student.skills.map((skill, idx) => (
                                <span key={idx} className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-lg text-xs font-medium border border-blue-200">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Resume and Profile Links */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {candidate.student.resumeUrl && (
                            <button
                              onClick={() => {
                                // Open PDF in new window/tab for inline viewing
                                const pdfWindow = window.open(candidate.student.resumeUrl, '_blank');
                                if (pdfWindow) {
                                  pdfWindow.focus();
                                }
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 text-sm font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                            >
                              <FileText className="w-4 h-4" />
                              View Resume
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                          {(candidate.student.profileUrl || candidate.student.id) && (
                            <button
                              onClick={() => {
                                // Construct profile URL from student ID or use provided profileUrl
                                const profileUrl = candidate.student.profileUrl || `/student/profile/${candidate.student.id}`;
                                window.open(profileUrl, '_blank');
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 text-sm font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                            >
                              <LinkIcon className="w-4 h-4" />
                              View Profile
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isEvaluated && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                          {getStatusIcon(candidate.evaluation.status)}
                          <span className="text-sm font-medium text-gray-700">
                            {candidate.evaluation.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Previous Round Remarks */}
                  {candidate.previousRoundRemarks && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-sm">
                      <p className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">Previous Round Remarks:</p>
                      <p className="text-sm text-blue-900 leading-relaxed">{candidate.previousRoundRemarks}</p>
                    </div>
                  )}

                  <div className="space-y-5">
                    {/* Status Selection */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={evaluation.status}
                        onChange={(e) => handleStatusChange(candidate.applicationId, e.target.value)}
                        disabled={isEvaluated}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-all"
                      >
                        <option value="">Select status</option>
                        <option value="SELECTED">Selected</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="ON_HOLD">On Hold</option>
                      </select>
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Remarks
                        {(evaluation.status === 'REJECTED' || evaluation.status === 'ON_HOLD') && (
                          <span className="text-red-500"> *</span>
                        )}
                      </label>
                      <textarea
                        value={evaluation.remarks}
                        onChange={(e) => handleRemarksChange(candidate.applicationId, e.target.value)}
                        disabled={isEvaluated}
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all resize-none"
                        placeholder="Enter remarks about the candidate's performance..."
                      />
                    </div>

                    {/* Save Button */}
                    {!isEvaluated && (
                      <button
                        onClick={() => handleSaveEvaluation(candidate.applicationId)}
                        disabled={isSaving || !evaluation.status}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        {isSaving ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            Save Evaluation
                          </>
                        )}
                      </button>
                    )}

                    {isEvaluated && (
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <p className="text-sm font-bold text-green-800">Evaluation Saved</p>
                        </div>
                        <p className="text-xs text-green-700">
                          {new Date(candidate.evaluation.createdAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewerRoundEvaluation;
