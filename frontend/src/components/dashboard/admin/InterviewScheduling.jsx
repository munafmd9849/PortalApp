/**
 * Interview Scheduling Page (Admin)
 * Single control center for interview management
 */

import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../config/api';
import { Loader, Building2, Briefcase, Users, Plus, X, Mail, Save, CheckCircle, AlertCircle, Lock, PlayCircle } from 'lucide-react';
import { useToast } from '../../ui/Toast';

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
    setSelectedJob(job);
    setLoadingSession(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        toast.error('Authentication required. Please log in again.');
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
          // Optionally redirect to login
          // window.location.href = '/login';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Interview Scheduling</h1>

        {/* Section 1: Job Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Job</h2>
          {jobs.length === 0 ? (
            <p className="text-gray-500">No posted jobs available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => {
                // Check if this job has a completed session (Issue #6)
                const isDisabled = completedSessions.has(job.id);
                
                return (
                <button
                  key={job.id}
                  onClick={() => !isDisabled && handleSelectJob(job)}
                  disabled={isDisabled}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedJob?.id === job.id
                      ? 'border-blue-500 bg-blue-50'
                      : isDisabled
                      ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Briefcase className="w-5 h-5 text-blue-600 mt-1" />
                    {selectedJob?.id === job.id && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{job.jobTitle}</h3>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {job.company?.name || job.companyName || 'Unknown Company'}
                  </p>
                  {isDisabled && (
                    <p className="text-xs text-gray-500 mt-1 italic">Session completed</p>
                  )}
                </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2 & 3: Session Management */}
        {selectedJob && (
          <div className="border-t pt-6">
            {loadingSession ? (
              <div className="flex items-center justify-center py-10">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : session ? (
              <div className="space-y-6">
                {/* Session Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Session Status</p>
                      <p className="text-lg font-semibold text-blue-900">
                        {session.status === 'NOT_STARTED' && 'Not Started'}
                        {session.status === 'ONGOING' && 'Ongoing'}
                        {session.status === 'COMPLETED' && 'Completed'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-600 font-medium">Total Applications</p>
                      <p className="text-lg font-semibold text-blue-900">{session.totalApplications || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Round Configuration */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Round Configuration</h2>
                  
                  {session.status === 'ONGOING' || session.status === 'COMPLETED' ? (
                    <div className={`border rounded-lg p-4 ${
                      session.status === 'COMPLETED' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <p className={`text-sm ${
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
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={roundName}
                          onChange={(e) => setRoundName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddRound()}
                          placeholder="Enter round name (e.g., Technical Round 1)"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={handleAddRound}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
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
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                                  {round.roundNumber}
                                </span>
                                <span className="font-medium text-gray-900">{round.name}</span>
                                <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  LOCKED
                                </span>
                              </div>
                              <button
                                onClick={() => handleRemoveRound(index)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={handleConfigureRounds}
                            disabled={configuringRounds}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                          <p className="text-sm font-medium text-gray-700 mb-2">Configured Rounds:</p>
                          <div className="space-y-2">
                            {session.rounds.map((round) => (
                              <div
                                key={round.id}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                                  {round.roundNumber}
                                </span>
                                <span className="font-medium text-gray-900">{round.name}</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                                  round.status === 'LOCKED' ? 'bg-gray-200 text-gray-700' :
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
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Interviewer Setup
                    {session.status === 'NOT_STARTED' && (
                      <span className="ml-2 text-sm font-normal text-red-600">* Required before starting session</span>
                    )}
                  </h2>
                  {session.status === 'COMPLETED' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-green-800">
                        Session completed. Interviewer information is view-only.
                      </p>
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
                              className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                isSessionCompleted ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                              }`}
                            />
                            <button
                              onClick={handleAddInterviewer}
                              disabled={isSessionCompleted}
                              className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 ${
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
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-600" />
                                    <span className="text-gray-900">{email}</span>
                                  </div>
                                  <button
                                    onClick={() => !isSessionCompleted && handleRemoveInterviewer(email)}
                                    disabled={isSessionCompleted}
                                    className={`p-1 text-red-600 hover:bg-red-50 rounded ${
                                      isSessionCompleted ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={handleInviteInterviewers}
                                disabled={inviting || isSessionCompleted}
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                        <p className="text-sm font-medium text-gray-700 mb-2">Invited Interviewers:</p>
                        <div className="space-y-2">
                          {session.interviewerInvites.map((invite) => (
                            <div
                              key={invite.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-600" />
                                <span className="text-gray-900">{invite.email}</span>
                                {invite.used && (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                    Used
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(invite.expiresAt).toLocaleDateString()}
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
              <div className="text-center py-10">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Failed to load interview session</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
