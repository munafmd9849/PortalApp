/**
 * Recruiter Applicant History
 * Shows all jobs posted by recruiter's company and list of applicants
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { Briefcase, Users, Search, ExternalLink, Calendar, MapPin, Building2, ChevronRight, Loader } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';

export default function RecruiterApplicantHistory() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  useEffect(() => {
    loadJobs();
  }, [user]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      // Get current user to find recruiter ID
      const me = await api.getCurrentUser();
      const recruiterId = me?.user?.recruiter?.id;
      if (!recruiterId) {
        setJobs([]);
        setLoading(false);
        return;
      }
      // Get jobs for current recruiter
      const response = await api.getJobs({ recruiterId, limit: 1000 });
      const jobsList = Array.isArray(response) ? response : (response.jobs || []);
      // Filter to show only posted jobs
      const postedJobs = jobsList.filter(job => 
        job.status === 'POSTED' || job.isPosted || job.posted
      );
      setJobs(postedJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast?.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async (jobId) => {
    try {
      setLoadingApplications(true);
      const response = await api.get(`/admin/jobs/${jobId}/applications`, {
        params: { limit: 1000 }
      });
      const data = response.data || response;
      setApplications(data.applications || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast?.error('Failed to load applications');
      setApplications([]);
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    loadApplications(job.id);
  };

  const filteredJobs = useMemo(() => {
    if (!searchTerm.trim()) return jobs;
    const term = searchTerm.toLowerCase();
    return jobs.filter(job => 
      job.jobTitle?.toLowerCase().includes(term) ||
      job.companyName?.toLowerCase().includes(term) ||
      job.company?.name?.toLowerCase().includes(term)
    );
  }, [jobs, searchTerm]);

  const getStatusBadge = (status) => {
    const statusUpper = (status || '').toUpperCase();
    const configs = {
      'SELECTED': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Selected' },
      'REJECTED': { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      'ONGOING': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ongoing' },
      'APPLIED': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Applied' },
    };
    const config = configs[statusUpper] || configs['APPLIED'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 -m-8 p-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Briefcase className="text-blue-600" size={32} />
              Applicant History
            </h1>
            <p className="text-gray-600 mt-2">View all jobs and their applicants</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search jobs by title or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Your Posted Jobs</h2>
              <p className="text-sm text-gray-600">{filteredJobs.length} job(s)</p>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredJobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>No posted jobs found</p>
                </div>
              ) : (
                filteredJobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => handleJobSelect(job)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedJob?.id === job.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1">{job.jobTitle}</h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                          <Building2 size={14} />
                          {job.companyName || job.company?.name}
                        </p>
                        {job.driveDate && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(job.driveDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <ChevronRight className={`text-gray-400 ${selectedJob?.id === job.id ? 'text-blue-600' : ''}`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Applications List */}
          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedJob.jobTitle}</h2>
                    <p className="text-gray-600">{selectedJob.companyName || selectedJob.company?.name}</p>
                  </div>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>

                {loadingApplications ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="animate-spin text-blue-600" size={24} />
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="mx-auto mb-2 text-gray-400" size={32} />
                    <p>No applicants for this job</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">
                        Total Applicants: {applications.length}
                      </p>
                    </div>
                    <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                      {applications.map(app => (
                        <div
                          key={app.id}
                          className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-800 mb-1">
                                {app.student?.name || app.student?.fullName || 'Unknown Student'}
                              </h3>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p>Email: {app.student?.email || 'N/A'}</p>
                                {app.student?.enrollmentId && (
                                  <p>Enrollment ID: {app.student.enrollmentId}</p>
                                )}
                                {app.student?.school && (
                                  <p>School: {app.student.school}</p>
                                )}
                                {app.student?.center && (
                                  <p>Center: {app.student.center}</p>
                                )}
                                {app.student?.batch && (
                                  <p>Batch: {app.student.batch}</p>
                                )}
                                {app.appliedDate && (
                                  <p className="text-xs text-gray-500">
                                    Applied: {new Date(app.appliedDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="ml-4">
                              {getStatusBadge(app.currentStage || app.status)}
                            </div>
                          </div>
                          {app.student?.profileLink && (
                            <a
                              href={app.student.profileLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                            >
                              View Profile <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Briefcase className="mx-auto mb-4 text-gray-400" size={48} />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Job</h3>
                <p className="text-gray-500">Choose a job from the list to view its applicants</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
