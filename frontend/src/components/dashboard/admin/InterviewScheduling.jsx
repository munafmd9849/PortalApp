/**
 * Interview Scheduling Page (Admin)
 * Single control center for interview management
 */

import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../config/api';
import { Loader, Building2, Briefcase, Users, Plus, X, Mail, Save, CheckCircle, AlertCircle, Lock, PlayCircle, Calendar, GraduationCap, MapPin, Settings, View } from 'lucide-react';
import { useToast } from '../../ui/Toast';
import JobDescriptionModal from '../student/JobDescriptionModal';

export default function InterviewScheduling() {
  const toast = useToast();
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

  // Round configuration
  const [rounds, setRounds] = useState([]);
  const [roundName, setRoundName] = useState('');
  const [configuringRounds, setConfiguringRounds] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Job Description Modal state
  const [viewingJob, setViewingJob] = useState(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        toast.error('Authentication required. Please log in again.');
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
        const jobsList = data.jobs || data || [];
        setJobs(jobsList);
        
        // Note: Completed session check is done lazily when selecting a job
        // to avoid making too many API calls on initial load
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 401 || response.status === 403) {
          toast.error('Authentication failed. Please log in again.');
        } else {
          toast.error(errorData.error || 'Failed to load jobs');
        }
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectJob = async (job) => {
    if (!job || !job.id) {
      toast.error('Invalid job selected');
      return;
    }

    setSelectedJob(job);
    setIsModalOpen(true);
    setLoadingSession(true);
    setSession(null); // Clear previous session to show loading state
    
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        toast.error('Authentication required. Please log in again.');
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
          toast.error('Session data not found in response');
          setLoadingSession(false);
          return;
        }

        setSession(data.session);
        setRounds(data.session.rounds || []);
        setInterviewerEmails(data.session.interviewerInvites?.map(inv => inv.email) || []);
        
        // Track completed sessions (Issue #6)
        if (data.session.status === 'COMPLETED') {
          setCompletedSessions(prev => new Set([...prev, job.id]));
        } else {
          setCompletedSessions(prev => {
            const newSet = new Set(prev);
            newSet.delete(job.id);
            return newSet;
          });
        }
        
        // Auto-populate rounds from job description if no rounds exist (Issue #7)
        if (data.session.rounds.length === 0 && data.session.suggestedRounds && data.session.suggestedRounds.length > 0) {
          setRounds(data.session.suggestedRounds);
          toast.success(`Found ${data.session.suggestedRounds.length} round(s) from job description. You can modify them before saving.`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        if (response.status === 401 || response.status === 403) {
          toast.error('Authentication failed. Please log in again.');
        } else if (response.status === 404) {
          toast.error(errorData.error || 'Session not found');
        } else {
          toast.error(errorData.error || `Failed to load session (${response.status})`);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoadingSession(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJob(null);
    setSession(null);
  };

  const handleAddRound = () => {
    if (!roundName.trim()) {
      toast.error('Please enter a round name');
      return;
    }

    const newRound = {
      roundNumber: rounds.length + 1,
      name: roundName.trim(),
    };

    setRounds([...rounds, newRound]);
    setRoundName('');
  };

  const handleRemoveRound = (index) => {
    const newRounds = rounds.filter((_, i) => i !== index);
    // Renumber rounds
    const renumbered = newRounds.map((r, i) => ({
      ...r,
      roundNumber: i + 1,
    }));
    setRounds(renumbered);
  };

  const handleConfigureRounds = async () => {
    if (rounds.length === 0) {
      toast.error('Please add at least one round');
      return;
    }

    try {
      setConfiguringRounds(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/interview-scheduling/session/${session.id}/rounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ rounds }),
      });

      if (response.ok) {
        const data = await response.json();
        setRounds(data.rounds);
        toast.success('Rounds configured successfully');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 401 || response.status === 403) {
          toast.error('Authentication failed. Please log in again.');
        } else {
          toast.error(errorData.error || 'Failed to configure rounds');
        }
      }
    } catch (error) {
      console.error('Error configuring rounds:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setConfiguringRounds(false);
    }
  };

  const handleAddInterviewer = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(interviewerEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (interviewerEmails.includes(interviewerEmail)) {
      toast.error('This email is already added');
      return;
    }

    setInterviewerEmails([...interviewerEmails, interviewerEmail]);
    setInterviewerEmail('');
  };

  const handleRemoveInterviewer = (email) => {
    setInterviewerEmails(interviewerEmails.filter(e => e !== email));
  };

  const handleInviteInterviewers = async () => {
    if (interviewerEmails.length === 0) {
      toast.error('Please add at least one interviewer email');
      return;
    }

    try {
      setInviting(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/interview-scheduling/session/${session.id}/invite-interviewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ emails: interviewerEmails }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Invites sent to ${data.invites.length} interviewer(s)`);
        // Reload session to get updated invites
        if (selectedJob) {
          handleSelectJob(selectedJob);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 401 || response.status === 403) {
          toast.error('Authentication failed. Please log in again.');
        } else {
          toast.error(errorData.error || 'Failed to invite interviewers');
        }
      }
    } catch (error) {
      console.error('Error inviting interviewers:', error);
      toast.error('Network error. Please check your connection and try again.');
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

      {/* Jobs list - matching ScheduleInterview style */}
      <div>
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No posted jobs available for interview scheduling</p>
          </div>
        ) : (
          jobs.map((job) => {
            const isDisabled = completedSessions.has(job.id);
            const isSelected = selectedJob?.id === job.id;
            
            return (
              <div 
                key={job.id} 
                className={`relative border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 mb-4 mx-4 ${
                  isSelected 
                    ? 'bg-blue-50 border-blue-300' 
                    : isDisabled
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
                        {isDisabled && (
                          <span className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-800 border border-gray-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Completed
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
                        <span className="text-sm font-medium text-slate-600">Interview</span>
                      </div>
                      <div className="text-slate-900 text-sm text-center">
                        {job.driveDate ? (
                          job.driveDate.toDate ?
                            job.driveDate.toDate().toLocaleDateString('en-GB') :
                            new Date(job.driveDate).toLocaleDateString('en-GB')
                        ) : 'TBD'}
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
                        {/* Manage Interview Session Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isDisabled) {
                              console.log('Button clicked for job:', job.id);
                              handleSelectJob(job);
                            }
                          }}
                          disabled={isDisabled}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 justify-center min-w-[180px] ${
                            isDisabled
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : isSelected
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

                        {/* View JD Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setViewingJob(viewingJob?.id === job.id ? null : job);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={handleCloseModal}>
          <div 
            className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Interview Session Management</h2>
                {selectedJob && (
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedJob.jobTitle} • {selectedJob.company?.name || selectedJob.companyName}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loadingSession ? (
                <div className="flex items-center justify-center py-20">
                  <Loader className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                  <span className="text-slate-600 text-lg">Loading session...</span>
                </div>
              ) : session ? (
                <div className="space-y-6">
                  {/* Session Info Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-1">Session Details</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Status</p>
                        <p className={`text-lg font-bold mt-1 ${
                          session.status === 'NOT_STARTED' ? 'text-gray-700' :
                          session.status === 'ONGOING' ? 'text-blue-700' :
                          'text-green-700'
                        }`}>
                          {session.status === 'NOT_STARTED' && 'Not Started'}
                          {session.status === 'ONGOING' && 'Ongoing'}
                          {session.status === 'COMPLETED' && 'Completed'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Applications</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">{session.totalApplications || 0}</p>
                      </div>
                    </div>
                  </div>

                {/* Section 3: Round Configuration */}
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900">Round Configuration</h2>
                  </div>
                  
                  {session.status === 'ONGOING' || session.status === 'COMPLETED' ? (
                    <div className={`border border-slate-200 rounded-xl p-4 ${
                      session.status === 'COMPLETED' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`w-5 h-5 ${
                          session.status === 'COMPLETED' 
                            ? 'text-green-600' 
                            : 'text-yellow-600'
                        }`} />
                        <p className={`text-sm font-medium ${
                          session.status === 'COMPLETED' 
                            ? 'text-green-800' 
                            : 'text-yellow-800'
                        }`}>
                          {session.status === 'COMPLETED' 
                            ? 'Session completed. You can view the configuration but cannot modify it.'
                            : `Rounds cannot be modified while session is ${session.status.toLowerCase()}.`
                          }
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={roundName}
                          onChange={(e) => setRoundName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddRound()}
                          placeholder="Enter round name (e.g., Technical Round 1)"
                          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
                        />
                        <button
                          onClick={handleAddRound}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Round
                        </button>
                      </div>

                      {rounds.length > 0 && (
                        <div className="space-y-2">
                          {rounds.map((round, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold shadow-sm">
                                  {round.roundNumber}
                                </span>
                                <span className="font-medium text-slate-900">{round.name}</span>
                                <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  LOCKED
                                </span>
                              </div>
                              <button
                                onClick={() => handleRemoveRound(index)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove round"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={handleConfigureRounds}
                            disabled={configuringRounds}
                            className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm transition-colors font-medium"
                          >
                            {configuringRounds ? (
                              <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Configuring...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                Save Round Configuration
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {session.rounds && session.rounds.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-slate-700 mb-3 uppercase tracking-wide">Configured Rounds:</p>
                          <div className="space-y-2">
                            {session.rounds.map((round) => (
                              <div
                                key={round.id}
                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-sm transition-all"
                              >
                                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold shadow-sm">
                                  {round.roundNumber}
                                </span>
                                <span className="font-medium text-slate-900 flex-1">{round.name}</span>
                                <span className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                                  round.status === 'LOCKED' ? 'bg-slate-200 text-slate-700' :
                                  round.status === 'ACTIVE' ? 'bg-blue-200 text-blue-700' :
                                  'bg-green-200 text-green-700'
                                }`}>
                                  {round.status === 'LOCKED' && <Lock className="w-3 h-3" />}
                                  {round.status === 'ACTIVE' && <PlayCircle className="w-3 h-3" />}
                                  {round.status === 'ENDED' && <CheckCircle className="w-3 h-3" />}
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

                {/* Section 2: Interviewer Setup */}
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900">
                      Interviewer Setup
                      {session.status === 'NOT_STARTED' && (
                        <span className="ml-2 text-sm font-normal text-red-600">* Required before starting session</span>
                      )}
                    </h2>
                  </div>
                  {session.status === 'COMPLETED' && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-sm font-medium text-green-800">
                          Session completed. Interviewer information is view-only.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    {(() => {
                      const isSessionCompleted = session.status === 'COMPLETED';
                      return (
                        <>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              value={interviewerEmail}
                              onChange={(e) => setInterviewerEmail(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && !isSessionCompleted && handleAddInterviewer()}
                              placeholder="Enter interviewer email"
                              disabled={isSessionCompleted}
                              className={`flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 ${
                                isSessionCompleted ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''
                              }`}
                            />
                            <button
                              onClick={handleAddInterviewer}
                              disabled={isSessionCompleted}
                              className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors ${
                                isSessionCompleted ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              <Plus className="w-4 h-4" />
                              Add
                            </button>
                          </div>

                          {interviewerEmails.length > 0 && (
                            <div className="space-y-2">
                              {interviewerEmails.map((email, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-sm transition-all"
                                >
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-600" />
                                    <span className="text-slate-900">{email}</span>
                                  </div>
                                  <button
                                    onClick={() => !isSessionCompleted && handleRemoveInterviewer(email)}
                                    disabled={isSessionCompleted}
                                    className={`p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
                                      isSessionCompleted ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                    title="Remove interviewer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={handleInviteInterviewers}
                                disabled={inviting || isSessionCompleted}
                                className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm transition-colors font-medium"
                              >
                                {inviting ? (
                                  <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Sending Invites...
                                  </>
                                ) : (
                                  <>
                                    <Mail className="w-4 h-4" />
                                    Send Invites to Interviewers
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {session.interviewerInvites && session.interviewerInvites.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-slate-700 mb-3 uppercase tracking-wide">Invited Interviewers:</p>
                        <div className="space-y-2">
                          {session.interviewerInvites.map((invite) => (
                            <div
                              key={invite.id}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-600" />
                                <span className="text-slate-900">{invite.email}</span>
                                {invite.used && (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">
                                    Used
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">
                                Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                              </span>
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
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Job Description Modal - Shared modal for all jobs */}
      <JobDescriptionModal
        job={viewingJob}
        isOpen={!!viewingJob}
        onClose={() => setViewingJob(null)}
      />
    </div>
  );
}