import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { Loader, ArrowLeft, Building2, Briefcase, Calendar, SquarePen, Save, X, Plus, PlayCircle, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

const InterviewSessionPage = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [interviewData, setInterviewData] = useState(null);
  const [editingRound, setEditingRound] = useState(null);
  const [roundName, setRoundName] = useState('');
  const [criteriaText, setCriteriaText] = useState('');
  const [showCreateRound, setShowCreateRound] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');
  const [newRoundCriteria, setNewRoundCriteria] = useState('');
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

  // Check authentication
  useEffect(() => {
    if (!user || role?.toLowerCase() !== 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, role, navigate]);

  // Load interview session data
  useEffect(() => {
    const loadInterviewData = async () => {
      if (!interviewId) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        
        // Wrap fetch in try-catch to handle network errors gracefully
        let response;
        let timeoutId;
        try {
          // Create AbortController for timeout (AbortSignal.timeout not available in all browsers)
          const controller = new AbortController();
          timeoutId = setTimeout(() => controller.abort(), 5000);
          
          response = await fetch(`${API_BASE_URL}/admin/interview/${interviewId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            signal: controller.signal,
          });
          
          if (timeoutId) clearTimeout(timeoutId);
        } catch (fetchError) {
          // Network error - use fallback data
          console.warn('Network error loading interview session (backend may be down), using fallback data:', fetchError);
          // Don't throw - allow fallback data to be used
          response = null;
          // Clear timeout if it exists
          if (timeoutId) clearTimeout(timeoutId);
        }

        if (response && response.ok) {
          const data = await response.json();
        
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

          // If no rounds exist, create default rounds
          if (rounds.length === 0) {
            rounds = [
              { name: 'Technical Round 1', criteria: 'Technical skills assessment', status: 'pending' },
              { name: 'Technical Round 2', criteria: 'Advanced technical evaluation', status: 'pending' },
              { name: 'HR Round', criteria: 'Cultural fit and communication', status: 'pending' }
            ];
          }

          // Format the data for the component
          const formattedData = {
            id: data.id,
            company: data.job?.company?.name || data.job?.companyName || 'Company',
            job: data.job?.jobTitle || 'Job Title',
            round: data.currentRound || rounds[0]?.name || 'Round 1',
            status: data.status?.toLowerCase() || 'ongoing',
            stats: {
              total: data.totalCandidates || 0,
              done: data.doneCandidates || 0,
              pending: data.pendingCandidates || 0,
              selected: data.selectedCandidates || 0,
              onHold: data.onHoldCandidates || 0
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
          // No response or error response - use fallback data (don't throw, just use fallback)
          // This allows the page to render even when backend is down
          console.warn('API call failed or no response, using fallback data');
          throw new Error('API call failed - using fallback data');
        }
      } catch (error) {
        console.error('Error loading interview session:', error);
        // Fallback to mock data if API fails - this allows the page to still render
        // The user can see the page structure even if data can't be loaded
        const mockData = {
          id: interviewId,
          company: 'Company Name',
          job: 'Job Title',
          round: 'Technical Round 1',
          status: 'ongoing',
          stats: {
            total: 0,
            done: 0,
            pending: 0,
            selected: 0,
            onHold: 0
          },
          rounds: [
            { id: 1, name: 'Technical Round 1', criteria: 'Technical skills assessment', status: 'pending' },
            { id: 2, name: 'Technical Round 2', criteria: 'Advanced technical evaluation', status: 'pending' },
            { id: 3, name: 'HR Round', criteria: 'Cultural fit and communication', status: 'pending' }
          ]
        };
        setInterviewData(mockData);
        // Don't show error alert - just use fallback data so page can render
      } finally {
        setLoading(false);
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

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/admin/interview/${interviewId}/round`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          action: 'update',
          roundName: roundName,
          newRoundName: roundName,
          criteria: criteriaText
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to update round');
      }

      const data = await response.json();
      
      // Reload interview data from server to ensure we have the latest state
      const refreshResponse = await fetch(`${API_BASE_URL}/admin/interview/${interviewId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

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
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/admin/interview/${interviewId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to end session');
      }

      const data = await response.json();
      alert(`Session ended successfully!\n\nSummary:\n- Total: ${data.summary.totalCandidates}\n- Done: ${data.summary.doneCandidates}\n- Selected: ${data.summary.selectedCandidates}\n- On Hold: ${data.summary.onHoldCandidates}\n- Rejected: ${data.summary.rejectedCandidates}`);
      
      // Reload interview data to show completed status
      window.location.reload();
    } catch (error) {
      console.error('Error ending session:', error);
      alert(`Failed to end session: ${error.message}`);
    }
  };

  const handleStartAssessment = async (roundName) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/admin/interview/${interviewId}/round/${encodeURIComponent(roundName)}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to start assessment');
      }

      const data = await response.json();
      
      // Redirect to assessment page
      navigate(`/admin/assessment/${interviewId}/${encodeURIComponent(roundName)}`);
    } catch (error) {
      console.error('Error starting assessment:', error);
      alert(`Failed to start assessment: ${error.message}`);
    }
  };

  const handleCreateRound = async () => {
    if (!newRoundName.trim()) {
      alert('Please enter a round name');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/admin/interview/${interviewId}/round`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          action: 'create',
          newRoundName: newRoundName.trim(),
          criteria: newRoundCriteria || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to create round');
      }

      // Reload interview data from server to ensure we have the latest state
      const refreshResponse = await fetch(`${API_BASE_URL}/admin/interview/${interviewId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

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
      }

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
          <button
            onClick={() => navigate('/admin?tab=scheduleInterview')}
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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Interview Session</h1>
              <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>{interviewData.company}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>{interviewData.job}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{interviewData.round}</span>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    interviewData.status === 'ongoing' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {interviewData.status.toUpperCase()}
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
                onClick={() => navigate('/admin?tab=scheduleInterview')}
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Real-time Dashboard - Using Student Dashboard Style */}
        <div className="w-full mb-8">
          <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] py-4 px-4 sm:px-6 transition-all duration-200 shadow-lg">
            <legend className="text-lg sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
              Interview Statistics
            </legend>

            <div className="mb-3 mt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
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
        <div className="w-full mb-8">
          <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] py-4 px-4 sm:px-6 transition-all duration-200 shadow-lg">
            <legend className="text-lg sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
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

              <div className="space-y-4 mt-0">
              {interviewData.rounds.map((round, index) => (
                <div
                  key={round.id}
                  className={`flex flex-col md:grid md:grid-cols-4 gap-3 md:gap-4 p-3 sm:p-4 rounded-xl relative
                    bg-gradient-to-r 
                    ${index % 2 !== 0 ? 'from-gray-50 to-gray-100' : 'from-[#f0f8fa] to-[#e6f3f8]'}
                    hover:shadow-md transition`}
                >
                  <div className="md:col-span-3">
                    {editingRound === round.id ? (
                      /* Edit Mode - Both Name and Criteria */
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Round Name:</label>
                          <input
                            type="text"
                            value={roundName}
                            onChange={(e) => setRoundName(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Criteria:</label>
                          <textarea
                            value={criteriaText}
                            onChange={(e) => setCriteriaText(e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveRound(round.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base font-semibold text-black">{round.name}</h3>
                          <button
                            onClick={() => handleEditRound(round)}
                            className="p-1 text-black relative hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50 cursor-pointer"
                            title="Edit round"
                            aria-label="Edit round"
                          >
                            <SquarePen className="h-3 w-3 absolute start-0" />
                          </button>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">Criteria:</label>
                          <p className="text-gray-700 text-sm">{round.criteria}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Start Assessment Button - Only show for pending rounds when not editing */}
                  {editingRound !== round.id && round.status === 'pending' && (
                    <div className="md:col-span-1 flex items-center justify-end pr-2">
                      <button
                        onClick={() => handleStartAssessment(round.name)}
                        disabled={interviewData.rounds.some(r => r.status === 'ongoing' && r.name !== round.name)}
                        className={`rounded-full p-2 shadow transition flex items-center justify-center ${
                          interviewData.rounds.some(r => r.status === 'ongoing' && r.name !== round.name)
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                        title={interviewData.rounds.some(r => r.status === 'ongoing' && r.name !== round.name) 
                          ? 'Another round is currently ongoing' 
                          : 'Start Assessment'}
                        aria-label="Start Assessment"
                      >
                        <PlayCircle size={18} className="text-white" />
                      </button>
                    </div>
                  )}
                  
                  {/* Status Badge for ongoing/completed rounds */}
                  {editingRound !== round.id && round.status !== 'pending' && (
                    <div className="md:col-span-1 flex items-center justify-end pr-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        round.status === 'ongoing' 
                          ? 'bg-blue-100 text-blue-800' 
                          : round.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {round.status === 'ongoing' ? 'Ongoing' : round.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              </div>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
};

export default InterviewSessionPage;
