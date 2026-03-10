import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeJobs } from '../../../services/jobs';
import api from '../../../services/api';
import { Loader, Building2, Calendar, GraduationCap, View, Users, Briefcase, MapPin, PlayCircle, XCircle, AlertTriangle, Clock, CheckSquare, CheckCircle, Lock } from 'lucide-react';
import { useToast } from '../../ui/Toast';

export default function ScheduleInterview() {
  const navigate = useNavigate();
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingInterview, setStartingInterview] = useState(new Set());
  

  // Real-time jobs subscription
  const jobsSubscriptionRef = useRef(null);

  // Check if job is posted
  const isJobPosted = (job) => {
    if (job.isPosted === true) return true;
    if (job.posted === true) return true;
    const status = (job.status || '').toLowerCase();
    return status === 'posted' || status === 'active';
  };
  
  useEffect(() => {
    setLoading(true);

    const subscription = subscribeJobs((jobsList) => {
      // Filter to show only posted jobs
      const postedJobs = jobsList.filter(job => isJobPosted(job));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 ScheduleInterview - Posted jobs received:', postedJobs.length);
      }
      
      setJobs(postedJobs);
      setLoading(false);
    });

    // Store subscription for manual refresh
    jobsSubscriptionRef.current = subscription;

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      } else if (typeof subscription === 'function') {
        subscription(); // Backward compatibility
      }
      jobsSubscriptionRef.current = null;
    };
  }, []);

  // Get job status display
  const getJobStatus = (job) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (job.adminStatus) {
      switch (job.adminStatus.toLowerCase()) {
        case 'cancelled':
        case 'canceled':
          return { text: 'Cancelled', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> };
        case 'postponed':
          return { text: 'Postponed', color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="w-3 h-3" /> };
        case 'rescheduled':
          return { text: 'Rescheduled', color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-3 h-3" /> };
        case 'completed':
        case 'finished':
          return { text: 'Completed', color: 'bg-green-100 text-green-800', icon: <CheckSquare className="w-3 h-3" /> };
        case 'in_progress':
        case 'ongoing':
          return { text: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: <PlayCircle className="w-3 h-3" /> };
        case 'results_declared':
          return { text: 'Results Out', color: 'bg-indigo-100 text-indigo-800', icon: <CheckSquare className="w-3 h-3" /> };
      }
    }

    if (!job.driveDate) {
      return { text: 'Posted', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> };
    }

    let interviewDate;
    if (job.driveDate.toDate) {
      interviewDate = job.driveDate.toDate();
    } else {
      interviewDate = new Date(job.driveDate);
    }
    interviewDate.setHours(0, 0, 0, 0);

    if (interviewDate < today) {
      return { text: 'Past', color: 'bg-gray-100 text-gray-800', icon: <Calendar className="w-3 h-3" /> };
    } else if (interviewDate.getTime() === today.getTime()) {
      return { text: 'Today', color: 'bg-blue-100 text-blue-800', icon: <Calendar className="w-3 h-3" /> };
    } else {
      return { text: 'Upcoming', color: 'bg-green-100 text-green-800', icon: <Calendar className="w-3 h-3" /> };
    }
  };

  // Check if drive date has been reached
  const isDriveDateReached = (job) => {
    if (!job?.driveDate) return false;
    const driveDate = job.driveDate?.toDate ? job.driveDate.toDate() : new Date(job.driveDate);
    const now = new Date();
    return now >= driveDate;
  };

  // Handle start interview session
  const handleStartInterview = async (jobId) => {
    setStartingInterview(prev => new Set([...prev, jobId]));
    
    try {
      // Use API client to start interview session
      const response = await api.post(`/admin/interview/${jobId}/start`, {});
      const data = response.data || response;
      const interviewId = data.interview?.id || data.id || data.interviewId;
      
      if (!interviewId) {
        throw new Error('Interview ID not returned from server');
      }
      
      // Navigate to interview session page with the correct interview ID
      navigate(`/admin/interview-session/${interviewId}`, { replace: false });
      
      toast.success('Interview session started successfully');
    } catch (error) {
      console.error('Error starting interview session:', error);
      toast.error(error.message || 'Failed to start interview session');
    } finally {
      setStartingInterview(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  // Helper functions for display
  const getSchoolDisplay = (schools) => {
    if (!schools || schools.length === 0) return 'N/A';
    if (schools.length === 1) return schools[0];
    return `${schools.length} Schools`;
  };

  const getBatchDisplay = (batches) => {
    if (!batches || batches.length === 0) return 'N/A';
    if (batches.length === 1) return batches[0];
    return `${batches.length} Batches`;
  };

  const getCenterDisplay = (centers) => {
    if (!centers || centers.length === 0) return 'N/A';
    if (centers.length === 1) return centers[0];
    return `${centers.length} Centers`;
  };

  const postedJobs = jobs.filter(job => isJobPosted(job));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Schedule Interview</h2>
          <p className="text-sm text-slate-600 mt-1">
            Start interview sessions for posted jobs
          </p>
        </div>
      </div>

      {/* Jobs list */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span className="text-slate-600">Loading posted jobs...</span>
          </div>
        ) : postedJobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No posted jobs available for interview scheduling</p>
          </div>
        ) : (
          postedJobs.map((job) => {
            const jobStatus = getJobStatus(job);
            // Check if drive date has been reached for this job
            const canStartInterview = isDriveDateReached(job);

            return (
              <div key={job.id} className="relative border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 mb-4 mx-4 bg-green-50">
                <div className="p-4">
                  {/* First Row: Company, Interview Date, School, Batch, Center */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Company */}
                    <div className="flex-4 min-w-0">
                      <div className="flex items-center gap-2 mb-2 -mt-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">Company</span>
                        {jobStatus && (
                          <span className={`px-2 py-1 text-xs rounded-md border border-gray-600 flex items-center gap-2 ${jobStatus.color}`}>
                            {jobStatus.icon}
                            {jobStatus.text}
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
                      <div className="text-slate-900 text-sm">
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
                        {/* Start Interview Session Button */}
                        <button
                          onClick={() => handleStartInterview(job.id)}
                          disabled={startingInterview.has(job.id) || !canStartInterview}
                          title={
                            !canStartInterview && job.driveDate
                              ? `Interview session can start only on the drive date (${new Date(job.driveDate?.toDate ? job.driveDate.toDate() : job.driveDate).toLocaleDateString()})`
                              : !job.driveDate
                              ? 'Drive date is to be announced for this job'
                              : ''
                          }
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 justify-center min-w-[180px] ${
                            startingInterview.has(job.id)
                              ? 'bg-blue-100 text-blue-500 cursor-not-allowed'
                              : !canStartInterview
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                          }`}
                        >
                          {startingInterview.has(job.id) ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              <span>Starting...</span>
                            </>
                          ) : !canStartInterview ? (
                            <>
                              <Lock className="w-4 h-4" />
                              <span>Drive Date Not Reached</span>
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-4 h-4" />
                              <span>Start Interview Session</span>
                            </>
                          )}
                        </button>

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

    </div>
  );
}

