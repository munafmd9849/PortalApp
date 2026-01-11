/**
 * Interviewer Round Evaluation Page
 * Token-based access for evaluating candidates in a round
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';
import { Loader, AlertCircle, Save, CheckCircle, XCircle, Clock, ArrowLeft, User, FileText, ExternalLink } from 'lucide-react';

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
        setError(errorData.error || 'Failed to load candidates');
        setLoading(false);
        return;
      }

      const candidatesData = await candidatesResponse.json();
      setCandidates(candidatesData.candidates || []);
      setRound(candidatesData.round);

      // Build evaluations map
      const evalMap = {};
      candidatesData.candidates.forEach((candidate) => {
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
      const allEvaluated = candidatesData.candidates.every(
        (c) => c.evaluation && c.evaluation.status && ['SELECTED', 'REJECTED', 'ON_HOLD'].includes(c.evaluation.status)
      );
      setCanEndRound(allEvaluated && candidatesData.candidates.length > 0);

      setLoading(false);
    } catch (err) {
      console.error('Error loading round data:', err);
      setError('Failed to load round data. Please try again.');
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
      alert('Please select a status');
      return;
    }

    if ((evaluation.status === 'REJECTED' || evaluation.status === 'ON_HOLD') && !evaluation.remarks?.trim()) {
      alert('Remarks are required for REJECTED or ON_HOLD status');
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
        throw new Error(errorData.error || 'Failed to save evaluation');
      }

      // Reload to get updated data
      await loadRoundData();
    } catch (err) {
      console.error('Error saving evaluation:', err);
      alert(err.message || 'Failed to save evaluation');
    } finally {
      setSaving((prev) => ({ ...prev, [applicationId]: false }));
    }
  };

  const handleEndRound = async () => {
    if (!window.confirm('Are you sure you want to end this round? This action cannot be undone and will lock all evaluations.')) {
      return;
    }

    try {
      setEndingRound(true);

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
        let errorMessage = errorData.error || 'Failed to end round';
        if (errorData.details) {
          errorMessage += `: ${errorData.details}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const message = result.message || 'Round ended successfully!';
      
      alert(message);
      
      // Navigate back to session page
      if (round && round.sessionId) {
        const encodedToken = encodeURIComponent(token);
        navigate(`/interview/session/${round.sessionId}?token=${encodedToken}`);
      } else {
        navigate(-1);
      }
    } catch (err) {
      console.error('Error ending round:', err);
      alert(err.message || 'Failed to end round. Please try again.');
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Evaluate Candidates</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {round?.name} • {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} to evaluate
                </p>
              </div>
            </div>
            {canEndRound && (
              <button
                onClick={handleEndRound}
                disabled={endingRound}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {endingRound ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Ending...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    End Round
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Candidates List */}
        <div className="space-y-4">
          {candidates.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">No candidates available for this round.</p>
            </div>
          ) : (
            candidates.map((candidate) => {
              const evaluation = evaluations[candidate.applicationId] || { status: '', remarks: '' };
              const isEvaluated = candidate.evaluation && candidate.evaluation.status;
              const isSaving = saving[candidate.applicationId];

              return (
                <div
                  key={candidate.applicationId}
                  className="bg-white rounded-lg shadow-sm p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{candidate.student.fullName}</h3>
                        <p className="text-sm text-gray-600">{candidate.student.email}</p>
                        {candidate.student.enrollmentId && (
                          <p className="text-xs text-gray-500">ID: {candidate.student.enrollmentId}</p>
                        )}
                        {candidate.student.batch && (
                          <p className="text-xs text-gray-500">Batch: {candidate.student.batch}</p>
                        )}
                        {candidate.student.skills && candidate.student.skills.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Skills:</p>
                            <div className="flex flex-wrap gap-1">
                              {candidate.student.skills.map((skill, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {candidate.student.resumeUrl && (
                        <a
                          href={candidate.student.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Resume
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {isEvaluated && (
                        <div className="flex items-center gap-2">
                          {getStatusIcon(candidate.evaluation.status)}
                          <span className="text-sm font-medium text-gray-700">
                            {candidate.evaluation.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Previous Round Remarks (Issue #4) */}
                  {candidate.previousRoundRemarks && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-800 mb-1">Previous Round Remarks:</p>
                      <p className="text-sm text-blue-900">{candidate.previousRoundRemarks}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Status Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status *
                      </label>
                      <select
                        value={evaluation.status}
                        onChange={(e) => handleStatusChange(candidate.applicationId, e.target.value)}
                        disabled={isEvaluated}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select status</option>
                        <option value="SELECTED">Selected</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="ON_HOLD">On Hold</option>
                      </select>
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remarks
                        {(evaluation.status === 'REJECTED' || evaluation.status === 'ON_HOLD') && (
                          <span className="text-red-500"> *</span>
                        )}
                      </label>
                      <textarea
                        value={evaluation.remarks}
                        onChange={(e) => handleRemarksChange(candidate.applicationId, e.target.value)}
                        disabled={isEvaluated}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Enter remarks..."
                      />
                    </div>

                    {/* Save Button */}
                    {!isEvaluated && (
                      <button
                        onClick={() => handleSaveEvaluation(candidate.applicationId)}
                        disabled={isSaving || !evaluation.status}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Evaluation
                          </>
                        )}
                      </button>
                    )}

                    {isEvaluated && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Evaluation saved:</strong> {new Date(candidate.evaluation.createdAt).toLocaleString()}
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
  );
};

export default InterviewerRoundEvaluation;
