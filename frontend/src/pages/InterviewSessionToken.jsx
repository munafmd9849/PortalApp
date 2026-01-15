/**
 * Token-Based Interview Session Page (Interviewer View)
 * Accessible via /interview/:token (no login required)
 * Complete interviewer interface with candidate details, resume viewing, and evaluation
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaPlay, FaStop, FaCheck, FaClock, FaUser, FaFilter, FaSearch, 
  FaFilePdf, FaDownload, FaGraduationCap, FaCode, FaTrophy, FaBriefcase,
  FaEnvelope, FaPhone, FaMapMarkerAlt, FaLinkedin, FaGithub, FaTimes,
  FaEdit, FaSave, FaTimesCircle, FaLock
} from 'react-icons/fa';
import api from '../services/api';

// Helper function to decode JWT token (without verification)
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

const InterviewSessionToken = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  // Decode token to get sessionId
  const decodedToken = React.useMemo(() => {
    if (!token) return null;
    return decodeJWT(token);
  }, [token]);
  
  const sessionId = decodedToken?.sessionId;
  
  const [session, setSession] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Candidate profile view
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  
  // Evaluation
  const [evaluatingCandidate, setEvaluatingCandidate] = useState(null);
  const [evaluationForm, setEvaluationForm] = useState({
    marks: '',
    remarks: '',
    status: 'PENDING',
  });
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    batch: '',
    skills: '',
  });

  const pollingIntervalRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const animationContainerRef = useRef(null);

  // Load the dotlottie script for animations
  useEffect(() => {
    const existingScript = document.querySelector('script[src*="dotlottie-wc"]');
    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.7.1/dist/dotlottie-wc.js';
    script.type = 'module';
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.warn('Failed to load Lottie animation script, using fallback');
      setScriptLoaded(false);
    };
    document.head.appendChild(script);
  }, []);

  // Create the dotlottie element after script loads (for loading state)
  useEffect(() => {
    if (scriptLoaded && animationContainerRef.current && loading && !animationContainerRef.current.querySelector('dotlottie-wc')) {
      setTimeout(() => {
        if (animationContainerRef.current && !animationContainerRef.current.querySelector('dotlottie-wc')) {
          try {
            const dotlottie = document.createElement('dotlottie-wc');
            dotlottie.setAttribute('src', 'https://lottie.host/329a31de-1775-4015-9d59-bae15a35069e/Nwhtg98V5B.lottie');
            dotlottie.setAttribute('speed', '2');
            dotlottie.setAttribute('mode', 'forward');
            dotlottie.setAttribute('loop', '');
            dotlottie.setAttribute('autoplay', '');
            dotlottie.style.width = '300px';
            dotlottie.style.height = '300px';
            animationContainerRef.current.appendChild(dotlottie);
          } catch (error) {
            console.warn('Failed to create Lottie animation:', error);
          }
        }
      }, 100);
    }
  }, [scriptLoaded, loading]);

  /**
   * Fetch session data
   */
  const fetchSession = async () => {
    if (!sessionId || !token) {
      setError('Invalid token');
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.get(`/interview/session/${sessionId}?token=${encodeURIComponent(token)}`);
      setSession(response.data);
      setCandidates(response.data.candidates || []);
      setActivities(response.data.activities || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching session:', err);
      setError(err.response?.data?.error || 'Failed to load session');
      if (err.response?.status === 404 || err.response?.status === 401 || err.response?.status === 403) {
        setTimeout(() => navigate('/'), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch candidates for current round
   */
  const fetchCandidates = async () => {
    if (!session?.currentRound) return;
    
    try {
      const response = await api.get(`/interview/session/${token}/round/${session.currentRound}/candidates`);
      setCandidates(response.data.candidates || []);
    } catch (err) {
      console.error('Error fetching candidates:', err);
    }
  };

  /**
   * Fetch activities
   */
  const fetchActivities = async () => {
    try {
      const response = await api.get(`/interview/session/${token}/activities`);
      setActivities(response.data.activities || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  /**
   * Start a round
   */
  const handleStartRound = async (roundName) => {
    let loadingToastId = null;
    try {
      loadingToastId = showLoading(`Starting ${roundName}...`);
      await api.post(`/interview/session/${token}/round/${roundName}/start`, {}, { silent: true });
      replaceLoadingToast(loadingToastId, 'success', `${roundName} started successfully`);
      await fetchSession();
    } catch (err) {
      if (loadingToastId) {
        dismissToast(loadingToastId);
      }
      showError(err.response?.data?.error || err.response?.data?.message || 'Failed to start round. Please try again.');
    }
  };

  /**
   * End a round
   */
  const handleEndRound = async (roundName) => {
    if (!confirm(`Are you sure you want to end ${roundName}? Only SELECTED candidates will proceed to the next round.`)) {
      return;
    }

    let loadingToastId = null;
    try {
      loadingToastId = showLoading(`Ending ${roundName}...`);
      const response = await api.post(`/interview/session/${token}/round/${roundName}/end`, {}, { silent: true });
      const message = response.data?.message || `${roundName} ended successfully. Only selected candidates will proceed.`;
      replaceLoadingToast(loadingToastId, 'success', message);
      await fetchSession();
    } catch (err) {
      if (loadingToastId) {
        dismissToast(loadingToastId);
      }
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to end round. Please ensure all candidates are evaluated.';
      showError(errorMsg);
    }
  };

  /**
   * View candidate profile
   */
  const handleViewProfile = (candidate) => {
    setSelectedCandidate(candidate);
    setShowProfilePanel(true);
  };

  /**
   * Open evaluation modal
   */
  const openEvaluationModal = (candidate) => {
    setEvaluatingCandidate(candidate);
    setEvaluationForm({
      marks: candidate.evaluation?.marks || '',
      remarks: candidate.evaluation?.remarks || '',
      status: candidate.evaluation?.status || 'PENDING',
    });
  };

  /**
   * Save evaluation
   */
  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    
    if (!evaluatingCandidate) return;

    // Validate remarks for REJECTED/ON_HOLD
    if ((evaluationForm.status === 'REJECTED' || evaluationForm.status === 'ON_HOLD') && !evaluationForm.remarks.trim()) {
      alert('Remarks are required for REJECTED or ON_HOLD status');
      return;
    }

    try {
      await api.patch(`/interview/session/${token}/candidate/${evaluatingCandidate.studentId}`, {
        marks: evaluationForm.marks ? parseFloat(evaluationForm.marks) : null,
        remarks: evaluationForm.remarks,
        status: evaluationForm.status,
        evaluator: 'Interviewer',
      });
      
      setEvaluatingCandidate(null);
      setEvaluationForm({ marks: '', remarks: '', status: 'PENDING' });
      await fetchSession();
      await fetchCandidates();
      alert('Evaluation saved successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save evaluation');
    }
  };

  /**
   * Apply filters
   */
  const filteredCandidates = candidates.filter(candidate => {
    if (filters.status && candidate.evaluation?.status !== filters.status) return false;
    if (filters.batch && candidate.batch !== filters.batch) return false;
    if (filters.skills) {
      const skillsLower = filters.skills.toLowerCase();
      if (!candidate.skills?.some(skill => skill.toLowerCase().includes(skillsLower))) return false;
    }
    return true;
  });

  /**
   * Initialize and set up polling
   */
  useEffect(() => {
    fetchSession();

    // Poll for updates every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      if (session) {
        fetchSession();
        fetchActivities();
      }
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [token]);

  // Update candidates when round changes
  useEffect(() => {
    if (session?.currentRound) {
      fetchCandidates();
    }
  }, [session?.currentRound]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div ref={animationContainerRef} className="flex justify-center mb-6">
            {/* dotlottie-wc will be inserted here via useEffect if script loads */}
            {!scriptLoaded && (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Interview Session</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-red-600 text-center">
            <h2 className="text-2xl font-bold mb-4">Error</h2>
            <p className="mb-4">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to home page...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const rounds = session.rounds || [];
  const candidate = selectedCandidate?.student || selectedCandidate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{session.job?.jobTitle || 'Interview Session'}</h1>
              <p className="text-gray-600">{session.job?.company?.name || 'Company'} • Status: <span className="font-semibold">{session.status}</span></p>
            </div>
            <div className="text-sm text-gray-500">
              Session Token: {token.substring(0, 8)}...
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{session.totalCandidates}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{session.doneCandidates}</div>
            <div className="text-sm text-gray-600">Done</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{session.selectedCandidates}</div>
            <div className="text-sm text-gray-600">Selected</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{session.onHoldCandidates}</div>
            <div className="text-sm text-gray-600">On Hold</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{session.pendingCandidates}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Rounds Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Interview Rounds</h2>
              <div className="space-y-3">
                {rounds.map((round, index) => {
                  const canStart = index === 0 || rounds[index - 1].status === 'completed';
                  const isCurrent = round.name === session.currentRound;
                  const isLocked = round.status === 'pending' && !canStart;
                  
                  return (
                    <div 
                      key={round.name} 
                      className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-300 ${
                        isCurrent ? 'ring-2 ring-indigo-500 shadow-md' : ''
                      } ${
                        isLocked ? 'opacity-75 bg-gray-50' : 'bg-white hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isLocked && (
                          <div className="flex-shrink-0">
                            <FaLock className="text-gray-400 animate-pulse" />
                          </div>
                        )}
                        <div>
                          <h3 className={`font-semibold ${isLocked ? 'text-gray-500' : 'text-gray-800'}`}>
                            {round.name}
                          </h3>
                          <p className={`text-sm ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                            {round.criteria || 'No criteria specified'}
                          </p>
                          <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold transition-colors duration-200 ${
                            round.status === 'completed' ? 'bg-green-100 text-green-800' :
                            round.status === 'ongoing' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {round.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {round.status === 'pending' && canStart && (
                          <button
                            onClick={() => handleStartRound(round.name)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                          >
                            <FaPlay className="animate-pulse" /> Start Round
                          </button>
                        )}
                        {round.status === 'ongoing' && (
                          <button
                            onClick={() => handleEndRound(round.name)}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                          >
                            <FaStop /> End Round
                          </button>
                        )}
                        {round.status === 'completed' && (
                          <span className="px-4 py-2 bg-green-100 text-green-800 rounded flex items-center gap-2 transition-all duration-200">
                            <FaCheck className="animate-bounce" /> Completed
                          </span>
                        )}
                        {round.status === 'pending' && !canStart && (
                          <span className="px-4 py-2 bg-gray-200 text-gray-600 rounded flex items-center gap-2 transition-all duration-200">
                            <FaLock className="animate-pulse" /> Locked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Candidates Table */}
            {session.currentRound && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Candidates - {session.currentRound}</h2>
                
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">All Status</option>
                      <option value="SELECTED">Selected</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="PENDING">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                    <input
                      type="text"
                      value={filters.batch}
                      onChange={(e) => setFilters({ ...filters, batch: e.target.value })}
                      placeholder="e.g., 2024-28"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                    <input
                      type="text"
                      value={filters.skills}
                      onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
                      placeholder="e.g., JavaScript"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Name</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Enrollment ID</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Batch</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Marks</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((candidate) => (
                        <tr key={candidate.studentId} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <div className="font-medium">{candidate.name}</div>
                            <div className="text-sm text-gray-500">{candidate.email}</div>
                          </td>
                          <td className="px-4 py-2">{candidate.enrollmentId}</td>
                          <td className="px-4 py-2">{candidate.batch}</td>
                          <td className="px-4 py-2">{candidate.evaluation?.marks || '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              candidate.evaluation?.status === 'SELECTED' ? 'bg-green-100 text-green-800' :
                              candidate.evaluation?.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                              candidate.evaluation?.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {candidate.evaluation?.status || 'PENDING'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewProfile(candidate)}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                              >
                                <FaUser /> View
                              </button>
                              <button
                                onClick={() => openEvaluationModal(candidate)}
                                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 flex items-center gap-1"
                              >
                                <FaEdit /> Evaluate
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredCandidates.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No candidates found</div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Feed */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Activity Feed</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <FaClock className="text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Candidate Profile Panel */}
          {showProfilePanel && candidate && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Candidate Profile</h2>
                  <button
                    onClick={() => setShowProfilePanel(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FaTimes />
                  </button>
                </div>

                {/* Profile Photo & Basic Info */}
                <div className="text-center mb-6 pb-6 border-b">
                  {candidate.profilePhoto ? (
                    <img src={candidate.profilePhoto} alt={candidate.fullName} className="w-24 h-24 rounded-full mx-auto mb-4" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                      <FaUser className="text-4xl text-indigo-600" />
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-gray-900">{candidate.fullName}</h3>
                  {candidate.headline && <p className="text-gray-600 mt-1">{candidate.headline}</p>}
                  {candidate.bio && <p className="text-sm text-gray-500 mt-2">{candidate.bio}</p>}
                </div>

                {/* Contact Info */}
                <div className="mb-6 pb-6 border-b space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FaEnvelope className="text-gray-400" />
                    <span>{candidate.email}</span>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaPhone className="text-gray-400" />
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">ID:</span>
                    <span>{candidate.enrollmentId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FaGraduationCap className="text-gray-400" />
                    <span>Batch: {candidate.batch}</span>
                  </div>
                  {candidate.school && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaMapMarkerAlt className="text-gray-400" />
                      <span>{candidate.school} • {candidate.center}</span>
                    </div>
                  )}
                  {candidate.cgpa && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">CGPA:</span>
                      <span className="font-semibold">{parseFloat(candidate.cgpa).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex gap-3 mt-3">
                    {candidate.linkedin && (
                      <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        <FaLinkedin className="text-xl" />
                      </a>
                    )}
                    {candidate.githubUrl && (
                      <a href={candidate.githubUrl} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-gray-900">
                        <FaGithub className="text-xl" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Resume */}
                {candidate.resumeUrl && (
                  <div className="mb-6 pb-6 border-b">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <FaFilePdf className="text-red-600" />
                      Resume
                    </h4>
                    <button
                      onClick={() => {
                        // Open PDF in new window/tab for inline viewing
                        const pdfWindow = window.open(candidate.resumeUrl, '_blank');
                        if (pdfWindow) {
                          pdfWindow.focus();
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      <FaFilePdf /> View Resume
                    </button>
                    {candidate.resumeFileName && (
                      <p className="text-xs text-gray-500 mt-1">{candidate.resumeFileName}</p>
                    )}
                  </div>
                )}

                {/* Skills */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="mb-6 pb-6 border-b">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaCode /> Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                          {skill.name || skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {candidate.education && candidate.education.length > 0 && (
                  <div className="mb-6 pb-6 border-b">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaGraduationCap /> Education
                    </h4>
                    <div className="space-y-3">
                      {candidate.education.map((edu, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded">
                          <div className="font-medium">{edu.degree}</div>
                          <div className="text-sm text-gray-600">{edu.institution}</div>
                          {edu.cgpa && <div className="text-sm text-gray-600">CGPA: {parseFloat(edu.cgpa).toFixed(2)}</div>}
                          {edu.endYear && <div className="text-sm text-gray-600">Year: {edu.endYear}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {candidate.projects && candidate.projects.length > 0 && (
                  <div className="mb-6 pb-6 border-b">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaCode /> Projects
                    </h4>
                    <div className="space-y-3">
                      {candidate.projects.map((project, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded">
                          <div className="font-medium">{project.title}</div>
                          {project.description && <div className="text-sm text-gray-600 mt-1">{project.description}</div>}
                          {project.technologies && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {project.technologies.map((tech, techIdx) => (
                                <span key={techIdx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Achievements */}
                {candidate.achievements && candidate.achievements.length > 0 && (
                  <div className="mb-6 pb-6 border-b">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaTrophy /> Achievements
                    </h4>
                    <div className="space-y-2">
                      {candidate.achievements.map((achievement, idx) => (
                        <div key={idx} className="p-2 bg-yellow-50 rounded text-sm">
                          {achievement.title || achievement}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {candidate.experiences && candidate.experiences.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaBriefcase /> Experience
                    </h4>
                    <div className="space-y-3">
                      {candidate.experiences.map((exp, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded">
                          <div className="font-medium">{exp.title}</div>
                          <div className="text-sm text-gray-600">{exp.company}</div>
                          {exp.description && <div className="text-sm text-gray-600 mt-1">{exp.description}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evaluation Modal */}
      {evaluatingCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                Evaluate {evaluatingCandidate.name}
              </h2>
              <button
                onClick={() => setEvaluatingCandidate(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSaveEvaluation}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Marks (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={evaluationForm.marks}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, marks: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={evaluationForm.remarks}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, remarks: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="4"
                  required={evaluationForm.status === 'REJECTED' || evaluationForm.status === 'ON_HOLD'}
                  placeholder="Enter evaluation remarks..."
                />
                {(evaluationForm.status === 'REJECTED' || evaluationForm.status === 'ON_HOLD') && !evaluationForm.remarks.trim() && (
                  <p className="text-xs text-red-600 mt-1">Remarks are required for this status</p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={evaluationForm.status}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, status: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="PENDING">Pending</option>
                  <option value="SELECTED">Selected</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ON_HOLD">On Hold</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEvaluatingCandidate(null)}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <FaTimesCircle /> Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <FaSave /> Save Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSessionToken;
