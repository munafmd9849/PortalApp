/**
 * Interviewer Dashboard
 * Token-based access (no login required)
 * Shows job details, session status, and active round
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Loader, Building2, Briefcase, AlertCircle, CheckCircle, Clock, Lock, PlayCircle, ArrowRight, Download } from 'lucide-react';
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
  const [downloading, setDownloading] = useState(false);
  const [endingSession, setEndingSession] = useState(false);

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

      // Fetch session details using API client
      const sessionData = await api.getInterviewSessionByToken(sessionId, token);
      setSession(sessionData);

      // Fetch active round if session is ongoing
      if (sessionData.status === 'ONGOING') {
        try {
          const roundData = await api.getActiveRound(sessionId, token);
          setActiveRound(roundData);
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
      await api.startRound(roundId, token);
      alert('Round started successfully!');
      loadSession(); // Reload to show updated status
    } catch (error) {
      console.error('Error starting round:', error);
      const msg = error?.response?.data?.error || error?.message || 'Failed to start round';
      // Show backend-provided reason (e.g., "No candidates assigned for this round")
      alert(msg);
    }
  };

  const handleDownloadSpreadsheet = async () => {
    if (!sessionId || !token || downloading) return;
    setDownloading(true);
    try {
      await api.exportInterviewSessionSpreadsheet(sessionId, token);
    } catch (e) {
      console.error('Export failed:', e);
      alert(e?.message || 'Failed to download spreadsheet. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const allRoundsEnded = session?.rounds?.length > 0 && session.rounds.every((r) => r.status === 'ENDED');
  const showEndInterview =
    (session?.status === 'ONGOING' || session?.status === 'INCOMPLETE') && allRoundsEnded;

  const handleEndInterview = async () => {
    if (!sessionId || !token || endingSession || !showEndInterview) return;
    if (!window.confirm('End this interview session? You can still download the spreadsheet afterward.')) return;
    setEndingSession(true);
    try {
      await api.endInterviewSessionByToken(sessionId, token);
      await loadSession();
    } catch (e) {
      console.error('End session failed:', e);
      alert(e?.message || 'Failed to end interview session. Please try again.');
    } finally {
      setEndingSession(false);
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
        <span className="px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
          <Clock className="w-4 h-4" />
          Not Started
        </span>
      ),
      ONGOING: (
        <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
          <PlayCircle className="w-4 h-4" />
          Ongoing
        </span>
      ),
      COMPLETED: (
        <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle className="w-4 h-4" />
          Completed
        </span>
      ),
      INCOMPLETE: (
        <span className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
          <Clock className="w-4 h-4" />
          Incomplete
        </span>
      ),
    };
    return badges[status] || badges.NOT_STARTED;
  };

  const getRoundStatusBadge = (round) => {
    if (round.status === 'LOCKED') {
      return (
        <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm border border-gray-300">
          <Lock className="w-3.5 h-3.5" />
          Locked
        </span>
      );
    }
    if (round.status === 'ACTIVE') {
      return (
        <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm border border-blue-300">
          <PlayCircle className="w-3.5 h-3.5" />
          Active
        </span>
      );
    }
    if (round.status === 'ENDED') {
      return (
        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm border border-green-300">
          <CheckCircle className="w-3.5 h-3.5" />
          Ended
        </span>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Interview Session</h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-200">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-gray-800">{session.job.jobTitle}</span>
              </div>
              {getStatusBadge(session.status)}
              {showEndInterview && (
                <button
                  onClick={handleEndInterview}
                  disabled={endingSession}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold shadow-md hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {endingSession ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  End Interview
                </button>
              )}
              {(session.status === 'COMPLETED' || session.status === 'INCOMPLETE') && (
                <button
                  onClick={handleDownloadSpreadsheet}
                  disabled={downloading}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold shadow-md hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {downloading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  Download spreadsheet
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Rounds Section */}
        <div className="bg-white rounded-xl border-2 border-[#8ec5ff] shadow-lg">
          <div className="p-5 sm:p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-[#211868] to-[#b5369d] text-transparent bg-clip-text">
                Interview Rounds
              </h2>
              {/* Active Round Banner - Compact at top */}
              {activeRound && (
                <div className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg shadow-sm border border-purple-400">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="w-4 h-4 animate-pulse" />
                    <span className="text-sm font-semibold">Active: {activeRound.name}</span>
                  </div>
                </div>
              )}
            </div>

            {session.rounds.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No rounds configured yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {session.rounds.map((round) => (
                  <div
                    key={round.id}
                    className={`group relative bg-white rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                      round.status === 'ACTIVE'
                        ? 'border-blue-400 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50'
                        : round.status === 'ENDED'
                        ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50'
                        : 'border-gray-300 hover:border-blue-400 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 relative">
                      {/* Left Side - Round Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0 max-w-[40%]">
                        {/* Round Number */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                          {round.roundNumber}
                        </div>
                        
                        {/* Round Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-2">
                            <h3 className="text-base font-semibold text-gray-900 truncate">{round.name}</h3>
                          </div>
                          {round.startedAt && (
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              Started: <span className="font-medium">{new Date(round.startedAt).toLocaleString()}</span>
                            </p>
                          )}
                          {round.endedAt && (
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              Ended: <span className="font-medium">{new Date(round.endedAt).toLocaleString()}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Center - Status Badge */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center z-10">
                        {getRoundStatusBadge(round)}
                      </div>

                      {/* Right Side - Action Button */}
                      <div className="flex-shrink-0 max-w-[40%]">
                        {round.status === 'LOCKED' && (
                          <>
                            <button
                              onClick={() => handleStartRound(round.id)}
                              className="px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-sm hover:shadow-md text-sm"
                            >
                              <PlayCircle className="w-4 h-4" />
                              Start Round
                            </button>
                            {round.roundNumber === 1 && session?.eligibleApplications === 0 && (
                              <p className="mt-2 text-xs text-gray-500">
                                This round has 0 candidates. You can start and end it to complete the session.
                              </p>
                            )}
                          </>
                        )}
                        {round.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleRoundClick(round)}
                            className="px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-sm hover:shadow-md text-sm"
                          >
                            <PlayCircle className="w-4 h-4" />
                            Evaluate Candidates
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                        {round.status === 'ENDED' && (
                          <span className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium flex items-center gap-2 text-sm shadow-sm">
                            <CheckCircle className="w-4 h-4" />
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewerDashboard;
