/**
 * Interviewer Dashboard
 * Token-based access (no login required)
 * Shows job details, session status, and active round
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';
import { Loader, Building2, Briefcase, AlertCircle, CheckCircle, Clock, Lock, PlayCircle, ArrowRight } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// Helper to decode JWT token
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding token:', e);
    return null;
  }
};

const InterviewerDashboard = () => {
  const { sessionId: sessionIdParam, token: tokenParam } = useParams(); // Support both formats
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get token from query params (new format) or path params (legacy)
  const tokenFromQuery = searchParams.get('token');
  const tokenFromPath = tokenParam;
  const token = tokenFromQuery || tokenFromPath;
  
  // Get sessionId from path params (new format) or decode from token (legacy)
  let sessionId = sessionIdParam;
  if (!sessionId && token) {
    const decoded = decodeJWT(token);
    sessionId = decoded?.sessionId;
  }

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [activeRound, setActiveRound] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('No access token provided. Please use the invitation link.');
      setLoading(false);
      return;
    }
    
    if (!sessionId) {
      setError('Invalid token. Could not extract session ID.');
      setLoading(false);
      return;
    }

    // If using legacy format with token in path, redirect to new format
    if (tokenFromPath && !tokenFromQuery) {
      navigate(`/interview/session/${sessionId}?token=${encodeURIComponent(token)}`, { replace: true });
      return;
    }

    loadSession();
  }, [sessionId, token]);

  const loadSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch session details
      // URL encode the token to handle special characters
      const encodedToken = encodeURIComponent(token);
      const sessionResponse = await fetch(
        `${API_BASE_URL}/interview/session/${sessionId}?token=${encodedToken}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        let errorMessage = errorData.error || 'Failed to load session';
        if (errorData.details) {
          errorMessage += ` (${errorData.details})`;
        }
        if (sessionResponse.status === 403) {
          errorMessage = errorData.error || 'Token expired or invalid. Please contact the administrator for a new invitation link.';
          if (errorData.details) {
            errorMessage += `\n\nDetails: ${errorData.details}`;
          }
        } else if (sessionResponse.status === 404) {
          errorMessage = errorData.error || 'Interview session not found.';
          if (errorData.details) {
            errorMessage += `\n\nDetails: ${errorData.details}`;
          }
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      const sessionData = await sessionResponse.json();
      setSession(sessionData);

      // Fetch active round if session is ongoing
      if (sessionData.status === 'ONGOING') {
        try {
          const roundResponse = await fetch(
            `${API_BASE_URL}/interview/session/${sessionId}/active-round?token=${token}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (roundResponse.ok) {
            const roundData = await roundResponse.json();
            setActiveRound(roundData);
          }
        } catch (err) {
          console.error('Error fetching active round:', err);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading session:', err);
      setError('Failed to load interview session. Please try again.');
      setLoading(false);
    }
  };

  const handleRoundClick = (round) => {
    if (round.status === 'ACTIVE') {
      navigate(`/interview/round/${round.id}?token=${token}`);
    }
  };

  const handleStartRound = async (roundId) => {
    if (!window.confirm('Are you sure you want to start this round?')) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/interview/round/${roundId}/start?token=${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to start round');
        return;
      }

      alert('Round started successfully!');
      loadSession(); // Reload to show updated status
    } catch (error) {
      console.error('Error starting round:', error);
      alert('Failed to start round');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white transition-opacity duration-500 ease-in-out">
        <div className="flex flex-col items-center justify-center">
          <div className="w-64 h-64 flex items-center justify-center mb-4">
            <DotLottieReact
              src="https://lottie.host/6f32e72e-0e51-4de6-be26-7a66a512856b/KR5Pp47lfD.json"
              loop
              autoplay
              className="w-full h-full"
            />
          </div>
          <p className="text-gray-600 text-lg font-medium animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
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

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Session not found</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const badges = {
      NOT_STARTED: (
        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Not Started
        </span>
      ),
      ONGOING: (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2">
          <PlayCircle className="w-4 h-4" />
          Ongoing
        </span>
      ),
      COMPLETED: (
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Completed
        </span>
      ),
    };
    return badges[status] || badges.NOT_STARTED;
  };

  const getRoundStatusBadge = (round) => {
    if (round.status === 'LOCKED') {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Locked
        </span>
      );
    }
    if (round.status === 'ACTIVE') {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium flex items-center gap-1">
          <PlayCircle className="w-3 h-3" />
          Active
        </span>
      );
    }
    if (round.status === 'ENDED') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Ended
        </span>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Interview Session</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span className="font-medium">{session.job.jobTitle}</span>
                </div>
                {session.job.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>{session.job.company.name}</span>
                  </div>
                )}
              </div>
            </div>
            {getStatusBadge(session.status)}
          </div>
        </div>

        {/* Rounds Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Interview Rounds</h2>

          {session.rounds.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No rounds configured yet.</p>
          ) : (
            <div className="space-y-3">
              {session.rounds.map((round) => (
                <div
                  key={round.id}
                  className={`border rounded-lg p-4 transition-all ${
                    round.status === 'ACTIVE'
                      ? 'border-blue-500 bg-blue-50'
                      : round.status === 'ENDED'
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-semibold">
                        {round.roundNumber}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{round.name}</h3>
                        {round.startedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Started: {new Date(round.startedAt).toLocaleString()}
                          </p>
                        )}
                        {round.endedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Ended: {new Date(round.endedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getRoundStatusBadge(round)}
                      {round.status === 'LOCKED' && (
                        <button
                          onClick={() => handleStartRound(round.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                        >
                          <PlayCircle className="w-4 h-4" />
                          Start Round
                        </button>
                      )}
                      {round.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRoundClick(round)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
                        >
                          Evaluate Candidates
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                      {round.status === 'ENDED' && (
                        <span className="text-sm text-gray-500">Completed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeRound && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Active Round:</strong> {activeRound.name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewerDashboard;
