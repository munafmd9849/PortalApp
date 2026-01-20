/**
 * Interview Scheduling Page (Admin)
 * Single control center for interview management
 */

import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../config/api';
import { Loader, Building2, Briefcase, Users, Plus, X, Mail, Save, CheckCircle, AlertCircle, Lock, PlayCircle, Calendar, GraduationCap, MapPin, Settings, View, Clock } from 'lucide-react';
import { showSuccess, showError, showWarning, showLoading, replaceLoadingToast, dismissToast } from '../../../utils/toast';
import { useNavigate } from 'react-router-dom';

export default function InterviewScheduling() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(new Set()); // Track completed sessions

  // Interviewer setup
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [interviewerEmails, setInterviewerEmails] = useState([]);
  const [inviting, setInviting] = useState(false);
  
  // Safety: Ensure interviewerEmails is always an array
  const safeInterviewerEmails = Array.isArray(interviewerEmails) ? interviewerEmails : [];

  // Round configuration
  const [rounds, setRounds] = useState([]);
  const [roundName, setRoundName] = useState('');
  const [configuringRounds, setConfiguringRounds] = useState(false);
  
  // Safety: Ensure rounds is always an array
  const safeRounds = Array.isArray(rounds) ? rounds : [];
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check if drive date has been reached
  const isDriveDateReached = (job) => {
    if (!job?.driveDate) return false;
    const driveDate = job.driveDate?.toDate ? job.driveDate.toDate() : new Date(job.driveDate);
    const now = new Date();
    return now >= driveDate;
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        showError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/jobs?isPosted=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both response formats: { jobs: [...] } or direct array
        const jobsList = data.jobs || (Array.isArray(data) ? data : []);
        setJobs(jobsList);
        
        if (jobsList.length === 0) {
          console.log('No jobs found with isPosted=true filter');
        }
        
        // Note: Completed session check is done lazily when selecting a job
        // to avoid making too many API calls on initial load
      } else {
        const errorData = await response.json().catch(() => ({ 
          success: false,
          error: 'Unknown error',
          message: `HTTP ${response.status}: ${response.statusText}`
        }));
        
        console.error('Failed to load jobs:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        if (response.status === 401 || response.status === 403) {
          showError('Authentication failed. Please log in again.');
        } else {
          showError(errorData.message || errorData.error || 'Failed to load jobs. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error loading jobs:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Check if it's a network error or API error
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        showError('Network error. Please check your connection and ensure the backend server is running.');
      } else {
        showError(error.message || 'Failed to load jobs. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectJob = async (job) => {
    if (!job || !job.id) {
      showError('Invalid job selected');
      return;
    }

    try {
      setSelectedJob(job);
      setIsModalOpen(true);
      setLoadingSession(true);
      setSession(null); // Clear previous session to show loading state
      
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        showError('Authentication required. Please log in again.');
        setLoadingSession(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/interview-scheduling/session/${job.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (!data.session) {
          showError('Session data not found in response');
          setLoadingSession(false);
          return;
        }

        setSession(data.session);
        // Ensure rounds is always an array
        const sessionRounds = Array.isArray(data.session.rounds) ? data.session.rounds : [];
        setRounds(sessionRounds);
        setInterviewerEmails(data.session.interviewerInvites?.map(inv => inv.email) || []);
        
        // Track completed and incomplete sessions
        if (data.session.status === 'COMPLETED' || data.session.status === 'INCOMPLETE') {
          setCompletedSessions(prev => new Set([...prev, job.id]));
        } else {
          setCompletedSessions(prev => {
            const newSet = new Set(prev);
            newSet.delete(job.id);
            return newSet;
          });
        }
        
        // Auto-populate rounds from job description if no rounds exist (Issue #7)
        if (sessionRounds.length === 0 && data.session.suggestedRounds && Array.isArray(data.session.suggestedRounds) && data.session.suggestedRounds.length > 0) {
          setRounds(data.session.suggestedRounds);
          showSuccess(`Found ${data.session.suggestedRounds.length} round(s) from job description. You can modify them before saving.`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        console.error('Failed to get/create session:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          jobId: job.id
        });
        
        if (response.status === 401 || response.status === 403) {
          showError('Authentication failed. Please log in again.');
        } else if (response.status === 404) {
          showError(errorData.error || errorData.message || 'Session not found');
        } else if (response.status === 400) {
          showError(errorData.error || errorData.message || 'Invalid request. Please check the job configuration.');
        } else {
          // Show detailed error message from backend
          const errorMessage = errorData.details || errorData.message || errorData.error || `Failed to load session (${response.status})`;
          showError(errorMessage);
          // Log full error details for debugging
          if (errorData.stack) {
            console.error('Backend error stack:', errorData.stack);
          }
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      showError('Network error. Please check your connection and try again.');
      // Don't close modal on error, let user see the error state
    } finally {
      setLoadingSession(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJob(null);
    setSession(null);
    setRounds([]);
    setRoundName('');
    setInterviewerEmails([]);
    setInterviewerEmail('');
    // Re-enable body scroll
    document.body.style.overflow = '';
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const handleAddRound = () => {
    if (!roundName.trim()) {
      showWarning('Please enter a round name');
      return;
    }

    const newRound = {
      roundNumber: safeRounds.length + 1,
      name: roundName.trim(),
    };

    setRounds([...safeRounds, newRound]);
    setRoundName('');
  };

  const handleRemoveRound = (index) => {
    const newRounds = safeRounds.filter((_, i) => i !== index);
    // Renumber rounds
    const renumbered = newRounds.map((r, i) => ({
      ...r,
      roundNumber: i + 1,
    }));
    setRounds(renumbered);
  };

  const handleConfigureRounds = async (e) => {
    // Prevent form submission and page reload
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (safeRounds.length === 0) {
      showWarning('Please add at least one round');
      return;
    }

    try {
      setConfiguringRounds(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        showError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/interview-scheduling/session/${session.id}/rounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ rounds: safeRounds }),
      });

      if (response.ok) {
        const data = await response.json();
        setRounds(Array.isArray(data.rounds) ? data.rounds : []);
        showSuccess('Rounds configured successfully');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 401 || response.status === 403) {
          showError('Authentication failed. Please log in again.');
        } else {
          showError(errorData.error || errorData.message || 'Failed to configure rounds');
        }
      }
    } catch (error) {
      console.error('Error configuring rounds:', error);
      showError('Network error. Please check your connection and try again.');
    } finally {
      setConfiguringRounds(false);
    }
  };

  const handleAddInterviewer = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(interviewerEmail)) {
      showWarning('Please enter a valid email address');
      return;
    }

    if (safeInterviewerEmails.includes(interviewerEmail)) {
      showWarning('This email is already added');
      return;
    }

    setInterviewerEmails([...safeInterviewerEmails, interviewerEmail]);
    setInterviewerEmail('');
  };

  const handleRemoveInterviewer = (email) => {
    setInterviewerEmails(safeInterviewerEmails.filter(e => e !== email));
  };

  const handleInviteInterviewers = async (e) => {
    // Prevent form submission and page reload
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (safeInterviewerEmails.length === 0) {
      showWarning('Please add at least one interviewer email');
      return;
    }

    try {
      setInviting(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        showError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/interview-scheduling/session/${session.id}/invite-interviewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ emails: safeInterviewerEmails }),
      });

      if (response.ok) {
        const data = await response.json();
        const invitesCount = Array.isArray(data.invites) ? data.invites.length : (data.invites ? 1 : 0);
        showSuccess(`Invites sent to ${invitesCount} interviewer(s)`);
        // Reload session to get updated invites
        if (selectedJob) {
          handleSelectJob(selectedJob);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 401 || response.status === 403) {
          showError('Authentication failed. Please log in again.');
        } else {
          showError(errorData.error || errorData.message || 'Failed to invite interviewers');
        }
      }
    } catch (error) {
      console.error('Error inviting interviewers:', error);
      showError('Network error. Please check your connection and try again.');
    } finally {
      setInviting(false);
    }
  };

  // Helper functions for display (matching ScheduleInterview style)
  const getSchoolDisplay = (schools) => {
    if (!schools || schools.length === 0) return 'N/A';
    if (typeof schools === 'string') {
      try {
        const parsed = JSON.parse(schools);
        if (Array.isArray(parsed)) {
          if (parsed.length === 1) return parsed[0];
          return `${parsed.length} Schools`;
        }
      } catch (e) {
        return schools;
      }
    }
    if (Array.isArray(schools)) {
      if (schools.length === 1) return schools[0];
      return `${schools.length} Schools`;
    }
    return 'N/A';
  };

  const getBatchDisplay = (batches) => {
    if (!batches || batches.length === 0) return 'N/A';
    if (typeof batches === 'string') {
      try {
        const parsed = JSON.parse(batches);
        if (Array.isArray(parsed)) {
          if (parsed.length === 1) return parsed[0];
          return `${parsed.length} Batches`;
        }
      } catch (e) {
        return batches;
      }
    }
    if (Array.isArray(batches)) {
      if (batches.length === 1) return batches[0];
      return `${batches.length} Batches`;
    }
    return 'N/A';
  };

  const getCenterDisplay = (centers) => {
    if (!centers || centers.length === 0) return 'N/A';
    if (typeof centers === 'string') {
      try {
        const parsed = JSON.parse(centers);
        if (Array.isArray(parsed)) {
          if (parsed.length === 1) return parsed[0];
          return `${parsed.length} Centers`;
        }
      } catch (e) {
        return centers;
      }
    }
    if (Array.isArray(centers)) {
      if (centers.length === 1) return centers[0];
      return `${centers.length} Centers`;
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        <span className="text-slate-600">Loading posted jobs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Interview Scheduling</h2>
          <p className="text-sm text-slate-600 mt-1">
            Configure interview sessions, rounds, and invite interviewers
          </p>
        </div>
      </div>

      {/* Jobs list */}
      <div>
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No posted jobs available for interview scheduling</p>
          </div>
        ) : (
          jobs.map((job) => {
            const isSelected = selectedJob?.id === job.id;
            const hasCompletedSession = completedSessions.has(job.id);
            
            // Check if drive date has been reached
            const driveDateReached = isDriveDateReached(job);
            const driveDate = job.driveDate ? (job.driveDate.toDate ? job.driveDate.toDate() : new Date(job.driveDate)) : null;
            const now = new Date();
            
            // Determine date status
            let dateStatus = null; // 'past', 'today', 'future'
            let dateStatusLabel = '';
            if (driveDate) {
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const interviewDay = new Date(driveDate.getFullYear(), driveDate.getMonth(), driveDate.getDate());
              
              if (interviewDay < today) {
                dateStatus = 'past';
                dateStatusLabel = 'Past';
              } else if (interviewDay.getTime() === today.getTime()) {
                dateStatus = 'today';
                dateStatusLabel = 'Today';
              } else {
                dateStatus = 'future';
                dateStatusLabel = 'Upcoming';
              }
            }
            
            return (
              <div 
                key={job.id} 
                className={`relative border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 mb-4 mx-4 ${
                  isSelected 
                    ? 'bg-blue-50 border-blue-300' 
                    : hasCompletedSession
                    ? 'bg-gray-100 opacity-60'
                    : 'bg-green-50'
                }`}
              >
                <div className="p-4">
                  {/* First Row: Company, Interview Date, School, Batch, Center */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Company */}
                    <div className="flex-4 min-w-0">
                      <div className="flex items-center gap-2 mb-2 -mt-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">Company</span>
                        {isSelected && (
                          <span className="px-2 py-1 text-xs rounded-md bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Selected
                          </span>
                        )}
                        {hasCompletedSession && (
                          <span className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-800 border border-gray-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Session Complete/Incomplete
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-900 text-xl truncate ml-[5%]">
                        {job.company?.name || job.companyName || job.company || 'N/A'}
                      </div>
                    </div>

                    {/* Interview Date */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-center gap-2 mb-2 -mt-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">Interview</span>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-900 text-sm font-semibold">
                          {driveDate ? (
                            driveDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          ) : 'TBD'}
                        </div>
                        {dateStatus && (
                          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                            dateStatus === 'past' ? 'bg-gray-100 text-gray-700 border border-gray-300' :
                            dateStatus === 'today' ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                            'bg-blue-100 text-blue-700 border border-blue-300'
                          }`}>
                            {dateStatusLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* School */}
                    <div className="flex-2 min-w-0">
                      <div className="flex justify-center -translate-x-2 items-center gap-2 mb-1">
                        <GraduationCap className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">School</span>
                      </div>
                      <div className="text-slate-900 text-sm text-center">
                        {getSchoolDisplay(job.targetSchools)}
                      </div>
                    </div>

                    {/* Batch */}
                    <div className="flex-2 min-w-0">
                      <div className="flex justify-center -translate-x-2 items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">Batch</span>
                      </div>
                      <div className="text-slate-900 text-sm text-center">
                        {getBatchDisplay(job.targetBatches)}
                      </div>
                    </div>

                    {/* Center */}
                    <div className="flex-3 min-w-0">
                      <div className="flex justify-center -translate-x-2 items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">Center</span>
                      </div>
                      <div className="text-slate-900 text-sm text-center">
                        {getCenterDisplay(job.targetCenters)}
                      </div>
                    </div>
                  </div>

                  {/* Second Row: Role and Actions */}
                  <div className="mt-2 pt-2 border-t border-slate-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Briefcase className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">Role:</span>
                        <span className="font-semibold text-slate-900 truncate">{job.jobTitle || 'N/A'}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {!hasCompletedSession && (
                          <>
                            {driveDateReached || isSelected ? (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSelectJob(job);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 justify-center min-w-[180px] ${
                                  isSelected
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <Settings className="w-4 h-4" />
                                    <span>Manage Session</span>
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="w-4 h-4" />
                                    <span>Start Session</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                disabled
                                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 justify-center min-w-[180px] bg-gray-300 text-gray-500 cursor-not-allowed shadow-sm"
                                title={`Session can only be started after ${driveDate ? driveDate.toLocaleDateString('en-GB') : 'the interview date'}`}
                              >
                                <Clock className="w-4 h-4" />
                                <span>Starts {dateStatus === 'future' ? 'After ' + (driveDate ? driveDate.toLocaleDateString('en-GB') : 'Date') : 'On Date'}</span>
                              </button>
                            )}
                          </>
                        )}
                        
                        {hasCompletedSession && (
                          <div className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 justify-center min-w-[180px] bg-gray-100 text-gray-700">
                            <CheckCircle className="w-4 h-4" />
                            <span>Session Completed/Incomplete</span>
                          </div>
                        )}

                        {/* View JD Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/job/${job.id}`);
                          }}
                          className="p-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors shadow-sm"
                          title="View JD"
                        >
                          <View className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Session Management Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm" 
          onClick={handleCloseModal}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div 
            className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90vh' }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Session Management</h2>
                {selectedJob && (
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedJob.jobTitle} • {selectedJob.company?.name || selectedJob.companyName}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-white/80 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 relative">
              {loadingSession ? (
                <div className="flex items-center justify-center py-20">
                  <Loader className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                  <span className="text-slate-600 text-lg">Loading session...</span>
                </div>
              ) : session ? (
                <div className="space-y-6">
                  {/* Session Info Header - Redesigned */}
                  <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-5 border border-blue-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-800 mb-3">Session Overview</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/80 rounded-lg p-3 border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className={`w-4 h-4 ${
                                session.status === 'NOT_STARTED' ? 'text-gray-500' :
                                session.status === 'ONGOING' ? 'text-blue-500' :
                                'text-green-500'
                              }`} />
                              <p className="text-xs font-medium text-slate-600">Status</p>
                            </div>
                            <p className={`text-base font-bold ${
                              session.status === 'NOT_STARTED' ? 'text-gray-700' :
                              session.status === 'ONGOING' ? 'text-blue-700' :
                              session.status === 'COMPLETED' ? 'text-green-700' :
                              session.status === 'INCOMPLETE' ? 'text-red-700' :
                              'text-gray-700'
                            }`}>
                              {session.status === 'NOT_STARTED' && 'Not Started'}
                              {session.status === 'ONGOING' && 'Ongoing'}
                              {session.status === 'COMPLETED' && 'Completed'}
                              {session.status === 'INCOMPLETE' && 'Incomplete'}
                              {!session.status && 'Unknown'}
                            </p>
                          </div>
                          <div className="bg-white/80 rounded-lg p-3 border border-blue-100">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="w-4 h-4 text-blue-500" />
                              <p className="text-xs font-medium text-slate-600">Eligible Candidates</p>
                            </div>
                            <p className="text-base font-bold text-slate-900">{session.eligibleApplications || 0}</p>
                            {session.totalApplications !== undefined && session.totalApplications !== session.eligibleApplications && (
                              <p className="text-xs text-slate-500 mt-1">of {session.totalApplications} total</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Section 3: Round Configuration - Redesigned */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Settings className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Round Configuration</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Add and manage interview rounds</p>
                    </div>
                  </div>
                  
                  {session.status === 'ONGOING' || session.status === 'COMPLETED' || session.status === 'INCOMPLETE' ? (
                    <div className={`border-2 rounded-xl p-4 ${
                      session.status === 'COMPLETED' 
                        ? 'bg-green-50 border-green-300' 
                        : session.status === 'INCOMPLETE'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-yellow-50 border-yellow-300'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          session.status === 'COMPLETED' 
                            ? 'bg-green-100' 
                            : session.status === 'INCOMPLETE'
                            ? 'bg-red-100'
                            : 'bg-yellow-100'
                        }`}>
                          <AlertCircle className={`w-5 h-5 ${
                            session.status === 'COMPLETED' 
                              ? 'text-green-600' 
                              : session.status === 'INCOMPLETE'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }`} />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold mb-1 ${
                            session.status === 'COMPLETED' 
                              ? 'text-green-900' 
                              : session.status === 'INCOMPLETE'
                              ? 'text-red-900'
                              : 'text-yellow-900'
                          }`}>
                            {session.status === 'COMPLETED' 
                              ? 'Session Completed'
                              : session.status === 'INCOMPLETE'
                              ? 'Session Incomplete'
                              : 'Session In Progress'
                            }
                          </p>
                          <p className={`text-sm ${
                            session.status === 'COMPLETED' 
                              ? 'text-green-700' 
                              : session.status === 'INCOMPLETE'
                              ? 'text-red-700'
                              : 'text-yellow-700'
                          }`}>
                            {session.status === 'COMPLETED' 
                              ? 'This session has been completed. You can view the configuration but cannot modify it.'
                              : session.status === 'INCOMPLETE'
                              ? 'This session is incomplete. The interview drive date passed before the session was completed. No further actions are allowed.'
                              : `Rounds cannot be modified while the session is ${session.status.toLowerCase()}.`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Add New Round
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={roundName}
                            onChange={(e) => setRoundName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddRound()}
                            placeholder="e.g., Technical Round 1, HR Round"
                            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={handleAddRound}
                            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all text-sm font-medium hover:shadow-md"
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </button>
                        </div>
                      </div>

                      {safeRounds.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-slate-700">New Rounds ({safeRounds.length})</p>
                          {safeRounds.map((round, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-blue-100 hover:border-blue-300 hover:shadow-md transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                                  {round.roundNumber}
                                </span>
                                <div>
                                  <span className="font-semibold text-slate-900 block">{round.name}</span>
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium flex items-center gap-1 w-fit mt-1">
                                    <Lock className="w-3 h-3" />
                                    Pending
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveRound(index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove round"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <div className="flex justify-end mt-3">
                            <button
                              type="button"
                              onClick={handleConfigureRounds}
                              disabled={configuringRounds}
                              className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-md transition-all text-sm font-semibold hover:shadow-lg"
                            >
                            {configuringRounds ? (
                              <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Saving Rounds...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                Save Rounds
                              </>
                            )}
                            </button>
                          </div>
                        </div>
                      )}

                      {session.rounds && Array.isArray(session.rounds) && session.rounds.length > 0 && (
                        <div className="mt-5 pt-5 border-t border-slate-200">
                          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Configured Rounds ({session.rounds.length})
                          </p>
                          <div className="space-y-2">
                            {session.rounds.map((round) => (
                              <div
                                key={round.id}
                                className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-all"
                              >
                                <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${
                                  round.status === 'LOCKED' ? 'bg-slate-100 text-slate-600' :
                                  round.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {round.roundNumber}
                                </span>
                                <span className="font-semibold text-slate-900 flex-1">{round.name}</span>
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                                  round.status === 'LOCKED' ? 'bg-slate-100 text-slate-700' :
                                  round.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {round.status === 'LOCKED' && <Lock className="w-3.5 h-3.5" />}
                                  {round.status === 'ACTIVE' && <PlayCircle className="w-3.5 h-3.5" />}
                                  {round.status === 'ENDED' && <CheckCircle className="w-3.5 h-3.5" />}
                                  {round.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 2: Interviewer Setup - Redesigned */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        Interviewer Setup
                        {session.status === 'NOT_STARTED' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">Required</span>
                        )}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">Add interviewers and send invitation links</p>
                    </div>
                  </div>
                  {(session.status === 'COMPLETED' || session.status === 'INCOMPLETE') && (
                    <div className={`border-2 rounded-xl p-4 mb-4 ${
                      session.status === 'COMPLETED'
                        ? 'bg-green-50 border-green-300'
                        : 'bg-red-50 border-red-300'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          session.status === 'COMPLETED'
                            ? 'bg-green-100'
                            : 'bg-red-100'
                        }`}>
                          <CheckCircle className={`w-5 h-5 ${
                            session.status === 'COMPLETED'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold mb-1 ${
                            session.status === 'COMPLETED'
                              ? 'text-green-900'
                              : 'text-red-900'
                          }`}>
                            {session.status === 'COMPLETED'
                              ? 'Session Completed'
                              : 'Session Incomplete'}
                          </p>
                          <p className={`text-sm ${
                            session.status === 'COMPLETED'
                              ? 'text-green-700'
                              : 'text-red-700'
                          }`}>
                            {session.status === 'COMPLETED'
                              ? 'Interviewer information is view-only for completed sessions.'
                              : 'The interview drive date passed before the session was completed. No further actions are allowed.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    {(() => {
                      const isSessionCompleted = session.status === 'COMPLETED' || session.status === 'INCOMPLETE';
                      return (
                        <>
                          <div className="bg-white rounded-lg p-4 border border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Add Interviewer Email
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="email"
                                value={interviewerEmail}
                                onChange={(e) => setInterviewerEmail(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !isSessionCompleted && handleAddInterviewer()}
                                placeholder="interviewer@example.com"
                                disabled={isSessionCompleted}
                                className={`flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 ${
                                  isSessionCompleted ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''
                                }`}
                              />
                              <button
                                type="button"
                                onClick={handleAddInterviewer}
                                disabled={isSessionCompleted}
                                className={`px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all text-sm font-medium hover:shadow-md ${
                                  isSessionCompleted ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <Plus className="w-4 h-4" />
                                Add
                              </button>
                            </div>
                          </div>

                          {safeInterviewerEmails.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-slate-700">Interviewers ({safeInterviewerEmails.length})</p>
                              {safeInterviewerEmails.map((email, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-blue-100 hover:border-blue-300 hover:shadow-md transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                      <Mail className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span className="font-medium text-slate-900">{email}</span>
                                  </div>
                                  <button
                                    onClick={() => !isSessionCompleted && handleRemoveInterviewer(email)}
                                    disabled={isSessionCompleted}
                                    className={`p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
                                      isSessionCompleted ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                    title="Remove interviewer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <div className="flex justify-end mt-3">
                                <button
                                  type="button"
                                  onClick={handleInviteInterviewers}
                                  disabled={inviting || isSessionCompleted}
                                  className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-md transition-all text-sm font-semibold hover:shadow-lg"
                                >
                                {inviting ? (
                                  <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Sending Invites...
                                  </>
                                ) : (
                                  <>
                                    <Mail className="w-4 h-4" />
                                    Send Invites
                                  </>
                                )}
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {session.interviewerInvites && Array.isArray(session.interviewerInvites) && session.interviewerInvites.length > 0 && (
                      <div className="mt-5 pt-5 border-t border-slate-200">
                        <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Invited Interviewers ({session.interviewerInvites.length})
                        </p>
                        <div className="space-y-2">
                          {session.interviewerInvites.map((invite) => (
                            <div
                              key={invite.id}
                              className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-50 rounded-lg">
                                  <Mail className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <span className="font-medium text-slate-900 block">{invite.email}</span>
                                  <span className="text-xs text-slate-500 mt-0.5">
                                    Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {invite.used && (
                                  <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                                    Used
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 text-lg">Failed to load interview session</p>
                  <button
                    onClick={handleCloseModal}
                    className="mt-4 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}