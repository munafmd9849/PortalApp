import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { Loader, ArrowLeft, Building2, Briefcase, Calendar, SquarePen, Save, X, Plus, PlayCircle, Users, CheckCircle, Clock, AlertCircle, Lock } from 'lucide-react';
import ThankYouPopup from '../components/common/ThankYouPopup';

const InterviewSessionPage = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const { user, role } = useAuth();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interviewData, setInterviewData] = useState(null);
  const [editingRound, setEditingRound] = useState(null);
  const [roundName, setRoundName] = useState('');
  const [criteriaText, setCriteriaText] = useState('');
  const [showCreateRound, setShowCreateRound] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');
  const [newRoundCriteria, setNewRoundCriteria] = useState('');
  const [showThankYouPopup, setShowThankYouPopup] = useState(false);
  const containerRef = useRef(null);

  // Load the dotlottie script
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
    document.head.appendChild(script);
  }, []);

  // Check authentication (admin or super_admin)
  useEffect(() => {
    const r = (role || '').toLowerCase();
    if (!user || (r !== 'admin' && r !== 'super_admin')) {
      navigate(base || '/admin', { replace: true });
    }
  }, [user, role, navigate, base]);

  // Load interview session data
  useEffect(() => {
    const loadInterviewData = async () => {
      if (!interviewId) return;
      
      // Record start time for minimum loading duration
      const startTime = Date.now();
      const minimumLoadingTime = 10000; // 10 seconds in milliseconds
      
      try {
        setLoading(true);
        setError('');
        
        const data = await api.getInterviewSession(interviewId);
        
        // Parse rounds from JSON string if needed
        let rounds = [];
        if (data.rounds) {
          try {
            rounds = typeof data.rounds === 'string' ? JSON.parse(data.rounds) : data.rounds;
          } catch (e) {
            console.error('Error parsing rounds:', e);
            rounds = [];
          }
        }

        // Format the data for the component
        const formattedData = {
          id: data.id,
          company: data.job?.company?.name || data.job?.companyName || '',
          job: data.job?.jobTitle || '',
          round: data.currentRound || rounds[0]?.name || '',
          status: data.status?.toLowerCase() || '',
          stats: {
            total: data.totalCandidates || 0,
            done: data.doneCandidates || 0,
            pending: data.pendingCandidates || 0,
            selected: data.selectedCandidates || 0,
            onHold: data.onHoldCandidates || 0
          },
          rounds: rounds.map((round, index) => ({
            id: index + 1,
            name: round.name || '',
            criteria: round.criteria || '',
            status: round.status || ''
          }))
        };
        
        setInterviewData(formattedData);
      } catch (error) {
        console.error('Error loading interview session:', error);
        setInterviewData(null);
        setError(error?.message || 'Failed to load interview session.');
      } finally {
        // Ensure minimum loading time of 10 seconds
        const elapsedTime = Date.now() - startTime;
        const remainingTime = minimumLoadingTime - elapsedTime;
        
        if (remainingTime > 0) {
          setTimeout(() => {
            setLoading(false);
          }, remainingTime);
        } else {
          setLoading(false);
        }
      }
    };

    if (interviewId) {
      loadInterviewData();
    }
  }, [interviewId]);

  // Create the dotlottie element after script loads
  useEffect(() => {
    if (scriptLoaded && containerRef.current && !containerRef.current.querySelector('dotlottie-wc')) {
      setTimeout(() => {
        if (containerRef.current && !containerRef.current.querySelector('dotlottie-wc')) {
          const dotlottie = document.createElement('dotlottie-wc');
          dotlottie.setAttribute('src', 'https://lottie.host/329a31de-1775-4015-9d59-bae15a35069e/Nwhtg98V5B.lottie');
          dotlottie.setAttribute('speed', '2');
          dotlottie.setAttribute('mode', 'forward');
          dotlottie.setAttribute('loop', '');
          dotlottie.setAttribute('autoplay', '');
          dotlottie.style.width = '300px';
          dotlottie.style.height = '300px';
          containerRef.current.appendChild(dotlottie);
        }
      }, 100);
    }
  }, [scriptLoaded]);

  const handleEditRound = (round) => {
    setEditingRound(round.id);
    setRoundName(round.name);
    setCriteriaText(round.criteria);
  };

  const handleSaveRound = async (roundId) => {
    try {
      const round = interviewData.rounds.find(r => r.id === roundId);
      if (!round) return;

      await api.updateInterviewRound(interviewId, {
        action: 'update',
        roundName: roundName,
        newRoundName: roundName,
        criteria: criteriaText
      });
      
      // Reload interview data from server to ensure we have the latest state
      const data = await api.getInterviewSession(interviewId);

      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json();
        
        // Parse rounds from JSON string if needed
        let rounds = [];
        if (refreshedData.rounds) {
          try {
            rounds = typeof refreshedData.rounds === 'string' ? JSON.parse(refreshedData.rounds) : refreshedData.rounds;
          } catch (e) {
            console.error('Error parsing rounds:', e);
            rounds = [];
          }
        }

        // Format the data for the component
        const formattedData = {
          id: refreshedData.id,
          company: refreshedData.job?.company?.name || refreshedData.job?.companyName || 'Company',
          job: refreshedData.job?.jobTitle || 'Job Title',
          round: refreshedData.currentRound || rounds[0]?.name || 'Round 1',
          status: refreshedData.status?.toLowerCase() || 'ongoing',
          stats: {
            total: refreshedData.totalCandidates || 0,
            done: refreshedData.doneCandidates || 0,
            pending: refreshedData.pendingCandidates || 0,
            selected: refreshedData.selectedCandidates || 0,
            onHold: refreshedData.onHoldCandidates || 0
          },
          rounds: rounds.map((round, index) => ({
            id: index + 1,
            name: round.name || `Round ${index + 1}`,
            criteria: round.criteria || 'Assessment criteria',
            status: round.status || 'pending'
          }))
        };
        
        setInterviewData(formattedData);
      } else {
        // Fallback: update local state if refresh fails
        setInterviewData(prev => ({
          ...prev,
          rounds: prev.rounds.map(r => r.id === roundId ? { ...r, name: roundName, criteria: criteriaText } : r)
        }));
      }

      setEditingRound(null);
      setRoundName('');
      setCriteriaText('');
    } catch (error) {
      console.error('Error updating round:', error);
      alert(`Failed to update round: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingRound(null);
    setRoundName('');
    setCriteriaText('');
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this interview session? This action cannot be undone.')) {
      return;
    }

    try {
      const data = await api.endInterviewSession(interviewId);
      
      // Show thank you popup
      setShowThankYouPopup(true);
      
      // Reload interview data to show completed status after popup closes
      setTimeout(() => {
        window.location.reload();
      }, 6000); // Reload after popup animation completes
    } catch (error) {
      console.error('Error ending session:', error);
      alert(`Failed to end session: ${error.message}`);
    }
  };

  const handleStartAssessment = async (roundName) => {
    try {
      console.log(`🚀 [InterviewSessionPage] Starting round: ${roundName} for interview: ${interviewId}`);
      const data = await api.startInterviewRound(interviewId, roundName);
      console.log('✅ [InterviewSessionPage] Round started successfully:', data);
      
      // Redirect to assessment page
      navigate(`/admin/assessment/${interviewId}/${encodeURIComponent(roundName)}`);
    } catch (error) {
      console.error('❌ [InterviewSessionPage] Error starting assessment:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.status,
        interviewId,
        roundName,
      });
      
      // Show detailed error message
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to start assessment';
      alert(`Failed to start assessment: ${errorMessage}`);
    }
  };

  const handleCreateRound = async () => {
    if (!newRoundName.trim()) {
      alert('Please enter a round name');
      return;
    }

    try {
      await api.updateInterviewRound(interviewId, {
        action: 'create',
        newRoundName: newRoundName.trim(),
        criteria: newRoundCriteria || ''
      });

      // Reload interview data from server to ensure we have the latest state
      const refreshedData = await api.getInterviewSession(interviewId);
      
      // Parse rounds from JSON string if needed
      let rounds = [];
      if (refreshedData.rounds) {
        try {
          rounds = typeof refreshedData.rounds === 'string' ? JSON.parse(refreshedData.rounds) : refreshedData.rounds;
        } catch (e) {
          console.error('Error parsing rounds:', e);
          rounds = [];
        }
      }

      // Format the data for the component
      const formattedData = {
        id: refreshedData.id,
        company: refreshedData.job?.company?.name || refreshedData.job?.companyName || 'Company',
        job: refreshedData.job?.jobTitle || 'Job Title',
        round: refreshedData.currentRound || rounds[0]?.name || 'Round 1',
        status: refreshedData.status?.toLowerCase() || 'ongoing',
        stats: {
          total: refreshedData.totalCandidates || 0,
          done: refreshedData.doneCandidates || 0,
          pending: refreshedData.pendingCandidates || 0,
          selected: refreshedData.selectedCandidates || 0,
          onHold: refreshedData.onHoldCandidates || 0
        },
        rounds: rounds.map((round, index) => ({
          id: index + 1,
          name: round.name || `Round ${index + 1}`,
          criteria: round.criteria || 'Assessment criteria',
          status: round.status || 'pending'
        }))
      };
      
      setInterviewData(formattedData);

      // Reset form
      setNewRoundName('');
      setNewRoundCriteria('');
      setShowCreateRound(false);
    } catch (error) {
      console.error('Error creating round:', error);
      alert(`Failed to create round: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div ref={containerRef} className="flex justify-center mb-6">
            {/* dotlottie-wc will be inserted here via useEffect */}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Interview Session</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!interviewData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Interview Session Not Found</h2>
          {error ? <p className="text-gray-600">{error}</p> : null}
          <button
            onClick={() => navigate(`${base}?tab=interviewScheduling`)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4"
          >
            Back to Schedule Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Interview Session</h1>
              <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-sm">
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-800">{interviewData.company}</span>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-200">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold text-gray-800">{interviewData.job}</span>
                </div>
                <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg border border-purple-200">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-800">{interviewData.round}</span>
                </div>
                <div>
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm ${
                    interviewData.status === 'ongoing' || interviewData.status === 'not_started'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                      : interviewData.status === 'completed'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {interviewData.status === 'not_started' ? 'Not Started' : interviewData.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {interviewData.status === 'ongoing' && (
                <button
                  onClick={handleEndSession}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  End Session
                </button>
              )}
              <button
                onClick={() => navigate(`${base}?tab=interviewScheduling`)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Real-time Dashboard - Using Student Dashboard Style */}
        <div className="w-full mb-6 lg:mb-8">
          <fieldset className="bg-white rounded-xl border-2 border-[#8ec5ff] py-5 px-4 sm:px-6 lg:px-8 transition-all duration-200 shadow-lg">
            <legend className="text-lg sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
              Interview Statistics
            </legend>

            <div className="mb-3 mt-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                {/* Total */}
                <div className="bg-gradient-to-br from-white to-gray-100 p-4 rounded-xl border border-gray-200 hover:border-[#3c80a7] hover:shadow-md transition-all duration-200 min-h-[120px] flex flex-col justify-between">
                  <div className="flex items-center">
                    <div className="p-2 mr-3 flex items-center justify-center shadow-sm rounded-full bg-gray-600">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Total</p>
                      <p className="text-2xl font-bold text-black break-words">{interviewData.stats.total}</p>
                    </div>
                  </div>
                </div>

                {/* Done */}
                <div className="bg-gradient-to-br from-white to-green-200 p-4 rounded-xl border border-gray-200 hover:border-[#3c80a7] hover:shadow-md transition-all duration-200 min-h-[120px] flex flex-col justify-between">
                  <div className="flex items-center">
                    <div className="p-2 mr-3 flex items-center justify-center shadow-sm rounded-full bg-green-600">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-green-700">Done</p>
                      <p className="text-2xl font-bold text-black break-words">{interviewData.stats.done}</p>
                    </div>
                  </div>
                </div>

                {/* Pending */}
                <div className="bg-gradient-to-br from-white to-yellow-200 p-4 rounded-xl border border-gray-200 hover:border-[#3c80a7] hover:shadow-md transition-all duration-200 min-h-[120px] flex flex-col justify-between">
                  <div className="flex items-center">
                    <div className="p-2 mr-3 flex items-center justify-center shadow-sm rounded-full bg-yellow-600">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-yellow-700">Pending</p>
                      <p className="text-2xl font-bold text-black break-words">{interviewData.stats.pending}</p>
                    </div>
                  </div>
                </div>

                {/* Selected */}
                <div className="bg-gradient-to-br from-white to-blue-200 p-4 rounded-xl border border-gray-200 hover:border-[#3c80a7] hover:shadow-md transition-all duration-200 min-h-[120px] flex flex-col justify-between">
                  <div className="flex items-center">
                    <div className="p-2 mr-3 flex items-center justify-center shadow-sm rounded-full bg-blue-600">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-700">Selected</p>
                      <p className="text-2xl font-bold text-black break-words">{interviewData.stats.selected}</p>
                    </div>
                  </div>
                </div>

                {/* On Hold */}
                <div className="bg-gradient-to-br from-white to-orange-200 p-4 rounded-xl border border-gray-200 hover:border-[#3c80a7] hover:shadow-md transition-all duration-200 min-h-[120px] flex flex-col justify-between">
                  <div className="flex items-center">
                    <div className="p-2 mr-3 flex items-center justify-center shadow-sm rounded-full bg-orange-600">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-orange-700">On Hold</p>
                      <p className="text-2xl font-bold text-black break-words">{interviewData.stats.onHold}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
        </div>

        {/* Rounds Section - Using Student Dashboard Style */}
        <div className="w-full mb-6 lg:mb-8">
          <fieldset className="bg-white rounded-xl border-2 border-[#8ec5ff] py-5 px-4 sm:px-6 lg:px-8 transition-all duration-200 shadow-lg">
            <legend className="text-lg sm:text-xl font-bold px-3 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
              Interview Rounds
            </legend>

            <div className="mb-2 ">
              <div className="flex items-center justify-end mb-1 mr-[-1%]">
                <button
                  onClick={() => setShowCreateRound(true)}
                  className="rounded-full p-2 shadow transition bg-[#8ec5ff] hover:bg-[#5e9ad6]"
                  aria-label="Create new round"
                  title="Create new round"
                >
                  <Plus size={18} className="text-white" />
                </button>
              </div>

              {/* Create Round Form */}
              {showCreateRound && (
                <div className="mb-1 p-1 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Round</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Round Name *
                      </label>
                      <input
                        type="text"
                        value={newRoundName}
                        onChange={(e) => setNewRoundName(e.target.value)}
                        placeholder="e.g., Technical Round 1"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Criteria
                      </label>
                      <textarea
                        value={newRoundCriteria}
                        onChange={(e) => setNewRoundCriteria(e.target.value)}
                        placeholder="e.g., DSA, System Design, Problem Solving"
                        rows={2}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCreateRound}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateRound(false);
                          setNewRoundName('');
                          setNewRoundCriteria('');
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 mt-4">
              {interviewData.rounds.map((round, index) => (
                <div
                  key={round.id}
                  className={`group relative bg-white rounded-xl border-2 ${
                    round.status === 'pending' 
                      ? 'border-gray-300 hover:border-blue-400' 
                      : round.status === 'ongoing'
                      ? 'border-blue-400 shadow-lg shadow-blue-100'
                      : 'border-green-300'
                  } p-5 lg:p-6 transition-all duration-300 hover:shadow-xl`}
                >
                  {/* Round Number Badge */}
                  <div className="absolute -top-3 -left-3 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                    {round.id || index + 1}
                  </div>

                  {/* Edit Button - Top Right */}
                  {editingRound !== round.id && (
                    <button
                      onClick={() => handleEditRound(round)}
                      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Edit round"
                    >
                      <SquarePen className="h-4 w-4" />
                    </button>
                  )}

                  {editingRound === round.id ? (
                    /* Edit Mode */
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Round Name:</label>
                        <input
                          type="text"
                          value={roundName}
                          onChange={(e) => setRoundName(e.target.value)}
                          className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Criteria:</label>
                        <textarea
                          value={criteriaText}
                          onChange={(e) => setCriteriaText(e.target.value)}
                          rows={3}
                          className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleSaveRound(round.id)}
                          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="pt-2">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-3">{round.name}</h3>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1 font-medium">Assessment Criteria:</p>
                          <p className="text-gray-800 text-sm leading-relaxed">{round.criteria || 'No criteria specified'}</p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-6">
                        {round.status === 'pending' ? (
                          <button
                            onClick={() => handleStartAssessment(round.name)}
                            disabled={interviewData.rounds.some(r => r.status === 'ongoing' && r.name !== round.name)}
                            className={`w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 ${
                              interviewData.rounds.some(r => r.status === 'ongoing' && r.name !== round.name)
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed border-2 border-gray-300'
                                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg border-2 border-transparent'
                            }`}
                            title={interviewData.rounds.some(r => r.status === 'ongoing' && r.name !== round.name) 
                              ? 'Another round is currently ongoing' 
                              : 'Start this round'}
                          >
                            <Lock className={`w-5 h-5 ${interviewData.rounds.some(r => r.status === 'ongoing' && r.name !== round.name) ? '' : 'hidden'}`} />
                            <PlayCircle className="w-5 h-5" />
                            Start Round
                          </button>
                        ) : round.status === 'ongoing' ? (
                          <div className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg">
                            <PlayCircle className="w-5 h-5 animate-pulse" />
                            Round Active
                          </div>
                        ) : (
                          <div className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg">
                            <CheckCircle className="w-5 h-5" />
                            Round Completed
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              </div>
            </div>
          </fieldset>
        </div>
      </div>

      {/* Thank You Popup */}
      <ThankYouPopup 
        isOpen={showThankYouPopup} 
        onClose={() => setShowThankYouPopup(false)} 
      />
    </div>
  );
};

export default InterviewSessionPage;
