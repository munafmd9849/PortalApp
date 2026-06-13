/**
 * Interview Scheduling Page (Admin)
 * Single control center for interview management
 */

import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { Loader, Building2, Briefcase, Users, User, Plus, X, Mail, Save, CheckCircle, AlertCircle, Lock, LockOpen, PlayCircle, Calendar, GraduationCap, MapPin, Settings, View, Clock, ChevronRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import {
  getInterviewDriveStatusBadges,
  isDriveFinished,
  isInterviewConfigurationComplete,
} from '../../../utils/interviewDriveStatus';

export default function InterviewScheduling() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, role } = useAuth();
  const isSuperAdmin = (role || user?.role || '').toLowerCase() === 'super_admin';
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionsByJobId, setSessionsByJobId] = useState({});
  const [jobsPage, setJobsPage] = useState(1);
  const JOBS_PER_PAGE = 10;

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
  const [freezeLoading, setFreezeLoading] = useState(false);

  // Check if drive date has been reached
  const isDriveDateReached = (job) => {
    if (!job?.driveDate) return false;
    const driveDate = job.driveDate?.toDate ? job.driveDate.toDate() : new Date(job.driveDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const interviewDay = new Date(driveDate.getFullYear(), driveDate.getMonth(), driveDate.getDate());
    return today >= interviewDay;
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    const handleJobsRefresh = (event) => {
      loadJobs();
    };
    window.addEventListener('jobsRefresh', handleJobsRefresh);
    return () => window.removeEventListener('jobsRefresh', handleJobsRefresh);
  }, []);

  const loadJobs = async (forceRefresh = false) => {
    try {
      const isRecruiter = (role || user?.role || '').toLowerCase() === 'recruiter';
      let recruiterId = null;
      if (isRecruiter) {
        const me = await api.getCurrentUser();
        recruiterId = me?.user?.recruiter?.id;
      }

      const params = isRecruiter 
        ? { recruiterId, isPosted: true, status: 'POSTED', limit: 1000 }
        : { isPosted: true, status: 'POSTED' };

      setLoading(true);
      const data = await api.getJobs(params);
      const jobsList = data.jobs || (Array.isArray(data) ? data : []);
      setJobs(jobsList);
      
      const sessionResults = await Promise.allSettled(
        jobsList.map(job => api.get(`/interview-sessions/${job.id}`, { silent: true }))
      );
      
      const sessionMap = {};
      sessionResults.forEach((res, index) => {
        if (res.status === 'fulfilled' && res.value) {
          const sessionData = res.value.session ?? res.value.data?.session;
          if (sessionData) {
            sessionMap[jobsList[index].id] = {
              status: sessionData.status,
              rounds: Array.isArray(sessionData.rounds) ? sessionData.rounds : [],
            };
          }
        }
      });
      setSessionsByJobId(sessionMap);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectJob = async (job) => {
    if (!job || !job.id) {
      toast.error('Invalid job selected');
      return;
    }

    try {
      setSelectedJob(job);
      setIsModalOpen(true);
      setLoadingSession(true);
      setSession(null);
      
      const response = await api.get(`/admin/interview-scheduling/session/${job.id}`);
      const data = response.data || response;
        
      if (!data.session) {
        toast.error('Session data not found');
        setLoadingSession(false);
        return;
      }

      setSession(data.session);
      setRounds(Array.isArray(data.session.rounds) ? data.session.rounds : []);
      setInterviewerEmails(data.session.interviewerInvites?.map(inv => inv.email) || []);

      setSessionsByJobId((prev) => ({
        ...prev,
        [job.id]: {
          status: data.session.status,
          rounds: Array.isArray(data.session.rounds) ? data.session.rounds : [],
        },
      }));
      
      if (Array.isArray(data.session.rounds) && data.session.rounds.length === 0 && data.session.suggestedRounds?.length > 0) {
        setRounds(data.session.suggestedRounds);
        toast.success(`Suggested ${data.session.suggestedRounds.length} rounds from JD`);
      }
      
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error('Failed to load session');
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
    document.body.style.overflow = '';
  };

  const handleAddRound = () => {
    if (!roundName.trim()) return;
    const newRound = {
      roundNumber: safeRounds.length + 1,
      name: roundName.trim(),
    };
    setRounds([...safeRounds, newRound]);
    setRoundName('');
  };

  const handleRemoveRound = (index) => {
    const newRounds = safeRounds.filter((_, i) => i !== index);
    setRounds(newRounds.map((r, i) => ({ ...r, roundNumber: i + 1 })));
  };

  const handleConfigureRounds = async (e) => {
    if (e) e.preventDefault();
    if (safeRounds.length === 0) return;
    try {
      setConfiguringRounds(true);
      const data = await api.post(`/admin/interview-scheduling/session/${session.id}/rounds`, { rounds: safeRounds });
      const payload = data?.data || data;
      setRounds(Array.isArray(payload.rounds) ? payload.rounds : []);
      toast.success('Rounds configured');
    } catch (error) {
      toast.error('Failed to configure rounds');
    } finally {
      setConfiguringRounds(false);
    }
  };

  const handleAddInterviewer = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(interviewerEmail)) return;
    if (safeInterviewerEmails.includes(interviewerEmail)) return;
    setInterviewerEmails([...safeInterviewerEmails, interviewerEmail]);
    setInterviewerEmail('');
  };

  const handleRemoveInterviewer = (email) => {
    setInterviewerEmails(safeInterviewerEmails.filter(e => e !== email));
  };

  const handleInviteInterviewers = async (e) => {
    if (e) e.preventDefault();
    if (safeInterviewerEmails.length === 0) return;
    try {
      setInviting(true);
      await api.post(`/admin/interview-scheduling/session/${session.id}/invite-interviewers`, { emails: safeInterviewerEmails });
      toast.success('Invitations sent');
      if (selectedJob) handleSelectJob(selectedJob);
    } catch (error) {
      toast.error('Failed to send invites');
    } finally {
      setInviting(false);
    }
  };

  const handleFreeze = async () => {
    if (!session?.id || !isSuperAdmin) return;
    try {
      setFreezeLoading(true);
      await api.freezeInterviewSession(session.id);
      toast.success('Session frozen');
      if (selectedJob) await handleSelectJob(selectedJob);
    } catch (e) {
      toast.error('Freeze failed');
    } finally {
      setFreezeLoading(false);
    }
  };

  const handleUnfreeze = async () => {
    if (!session?.id || !isSuperAdmin) return;
    try {
      setFreezeLoading(true);
      await api.unfreezeInterviewSession(session.id);
      toast.success('Session unfrozen');
      if (selectedJob) await handleSelectJob(selectedJob);
    } catch (e) {
      toast.error('Unfreeze failed');
    } finally {
      setFreezeLoading(false);
    }
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6 md:p-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-100 rounded-md shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-100 rounded w-1/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
            <div className="w-28 h-9 bg-gray-100 rounded-md shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="grid grid-cols-1 gap-3">
        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-14 h-14 bg-gray-50 text-gray-300 rounded-md flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-gray-900 font-semibold text-base">No active drives</h3>
            <p className="text-gray-500 text-sm mt-1">There are no posted jobs ready for interview scheduling.</p>
          </div>
        ) : (() => {
          const totalJobs = jobs.length;
          const totalPages = Math.max(1, Math.ceil(totalJobs / JOBS_PER_PAGE));
          const currentPage = Math.min(Math.max(1, jobsPage), totalPages);
          const start = (currentPage - 1) * JOBS_PER_PAGE;
          const paginatedJobs = jobs.slice(start, start + JOBS_PER_PAGE);
          
          return (
            <div className="space-y-4">
              {paginatedJobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const jobSession = sessionsByJobId[job.id] || null;
                const statusBadges = getInterviewDriveStatusBadges(job, jobSession);
                const driveFinished = isDriveFinished(jobSession);
                const configurationComplete = isInterviewConfigurationComplete(jobSession);
                const driveDate = job.driveDate ? new Date(job.driveDate) : null;

                return (
                  <div 
                    key={job.id}
                    className={`bg-white rounded-lg border ${isSelected ? 'border-blue-800 ring-1 ring-blue-100' : 'border-gray-200'} p-4 shadow-sm hover:border-gray-300 transition-colors group`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-md flex items-center justify-center font-semibold text-sm border shrink-0 ${
                          isSelected ? 'bg-blue-800 text-white border-blue-800' : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {getInitials(job.company?.name || job.companyName || 'Job')}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                            {statusBadges.map((badge) => (
                              <span
                                key={badge.key}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium border ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            ))}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {job.company?.name || job.companyName}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{job.jobTitle}</span>
                            <span className="text-gray-300">|</span>
                            <span>{driveDate ? driveDate.toLocaleDateString('en-GB') : 'TBD'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/job/${job.id}`)}
                          className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                          title="View job description"
                        >
                          <View className="w-4 h-4" />
                        </button>
                        
                        {driveFinished ? (
                          <div className="px-3 py-2 bg-gray-100 text-gray-600 border border-gray-200 rounded-md text-xs font-medium flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-gray-500" />
                            Drive finished
                          </div>
                        ) : configurationComplete ? (
                          <button
                            type="button"
                            onClick={() => handleSelectJob(job)}
                            className={`px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 border ${
                              isSelected
                                ? 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {isSelected ? <Settings className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            {isSelected ? 'Manage session' : 'Session ready'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectJob(job)}
                            className={`px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 border ${
                              isSelected
                                ? 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            {isSelected ? <Settings className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                            {isSelected ? 'Manage session' : 'Setup session'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalJobs > JOBS_PER_PAGE && (
                <div className="flex items-center justify-between py-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Showing {start + 1}–{Math.min(start + JOBS_PER_PAGE, totalJobs)} of {totalJobs} jobs
                  </p>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setJobsPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button 
                      type="button"
                      onClick={() => setJobsPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Session Management Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" 
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-[32px] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-slate-900 to-indigo-900 text-white relative">
              <button
                onClick={handleCloseModal}
                className="absolute top-6 right-8 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[22px] flex items-center justify-center font-bold text-2xl">
                  {getInitials(selectedJob?.company?.name || selectedJob?.companyName || 'Job')}
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Session Configuration</h2>
                  <div className="flex items-center gap-4 mt-1 opacity-80 text-[10px] font-semibold tracking-wide uppercase">
                    <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {selectedJob?.company?.name}</span>
                    <span className="flex items-center gap-1.5 text-indigo-300"><Briefcase className="w-3.5 h-3.5" /> {selectedJob?.jobTitle}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc] space-y-8">
              {loadingSession ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader className="w-10 h-10 text-indigo-600 animate-spin" />
                  <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Initializing Session...</p>
                </div>
              ) : session ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Status & Overview */}
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1 text-center md:text-left space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Status</h4>
                      <div className="flex items-center justify-center md:justify-start gap-3">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${
                          session.status === 'ONGOING' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`} />
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">{session.status}</span>
                      </div>
                    </div>
                    
                    <div className="h-px w-full md:w-px md:h-12 bg-slate-100" />
                    
                    <div className="flex-1 text-center md:text-left space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Pool</h4>
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Users className="w-5 h-5 text-indigo-500" />
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">{session.eligibleApplications || 0} Candidates</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isSuperAdmin && session.status !== 'FROZEN' && (
                        <button onClick={handleFreeze} className="px-6 py-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5" /> Freeze
                        </button>
                      )}
                      {isSuperAdmin && session.status === 'FROZEN' && (
                        <button onClick={handleUnfreeze} className="px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2">
                          <LockOpen className="w-3.5 h-3.5" /> Unfreeze
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Left Column: Rounds */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex-1">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 tracking-tight">Round Sequence</h4>
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Define the flow of evaluations</p>
                        </div>
                      </div>

                      {session.status === 'NOT_STARTED' && (
                        <div className="space-y-4 mb-8">
                          <div className="relative">
                            <input
                              type="text"
                              value={roundName}
                              onChange={(e) => setRoundName(e.target.value)}
                              placeholder="Add Round (e.g. GD, Tech, HR)"
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-14 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                            <button onClick={handleAddRound} className="absolute right-3 top-3 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        {(safeRounds.length > 0 ? safeRounds : (session.rounds || [])).map((round, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 bg-white text-indigo-600 rounded-lg flex items-center justify-center font-black text-sm shadow-sm border border-indigo-100">
                                {round.roundNumber || idx + 1}
                              </div>
                              <span className="font-bold text-slate-700">{round.name}</span>
                            </div>
                            {session.status === 'NOT_STARTED' && (
                              <button onClick={() => handleRemoveRound(idx)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {session.status === 'NOT_STARTED' && safeRounds.length > 0 && (
                        <button onClick={handleConfigureRounds} className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                          {configuringRounds ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Finalize Rounds
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Interviewers */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex-1">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 tracking-tight">Access Control</h4>
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Invite external interviewers via email</p>
                        </div>
                      </div>

                      <div className="space-y-4 mb-8">
                        <div className="relative">
                          <input
                            type="email"
                            value={interviewerEmail}
                            onChange={(e) => setInterviewerEmail(e.target.value)}
                            placeholder="Interviewer Email"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-14 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                          <button onClick={handleAddInterviewer} className="absolute right-3 top-3 w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all">
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {safeInterviewerEmails.map((email, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                            <div className="flex items-center gap-3">
                              <Mail className="w-4 h-4 text-emerald-500" />
                              <span className="font-bold text-slate-700 text-sm">{email}</span>
                            </div>
                            <button onClick={() => handleRemoveInterviewer(email)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {safeInterviewerEmails.length > 0 && (
                        <button onClick={handleInviteInterviewers} className="w-full mt-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                          {inviting ? <Loader className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                          Send Access Invites
                        </button>
                      )}

                      {session.interviewerInvites?.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-dashed border-slate-200 space-y-4">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Invites</h5>
                          {session.interviewerInvites.map((invite) => (
                            <div key={invite.id} className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-600">{invite.email}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                                invite.used ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {invite.used ? 'Accessed' : 'Pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center">
                  <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                  <h3 className="text-xl font-black text-slate-900">Failed to Load Session</h3>
                  <p className="text-slate-500 mt-2">The session data could not be retrieved from the server.</p>
                </div>
              )}
            </div>

            <div className="px-8 py-5 border-t border-slate-100 bg-white text-center">
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                Close Session Manager
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}