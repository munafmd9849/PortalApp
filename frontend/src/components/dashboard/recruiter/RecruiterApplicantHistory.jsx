/**
 * Recruiter Applicant History
 * Shows all jobs from recruiter's company with comprehensive applicant details
 * Similar to AdminJobApplications but filtered to company's jobs
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { Search, Users, ExternalLink, Briefcase, Filter, ChevronLeft, ChevronRight, X, Building2, Calendar } from 'lucide-react';
import CustomDropdown from '../../common/CustomDropdown';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-200 rounded" /></td>
      <td className="px-6 py-4"><div className="h-4 w-56 bg-slate-200 rounded" /></td>
      <td className="px-6 py-4"><div className="h-4 w-36 bg-slate-200 rounded" /></td>
      <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
      <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
      <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
      <td className="px-6 py-4"><div className="h-8 w-24 bg-slate-200 rounded" /></td>
    </tr>
  );
}

function StatusPill({ value }) {
  const v = String(value || '').toUpperCase();
  const config = {
    'SELECTED': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✓' },
    'REJECTED': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: '✕' },
    'ONGOING': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', icon: '◉' },
  };
  const style = config[v] || config['ONGOING'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      <span>{style.icon}</span>
      {v || 'ONGOING'}
    </span>
  );
}

function StageBadge({ stage }) {
  const stages = {
    'Applied': { color: 'bg-slate-100 text-slate-700', icon: '📝' },
    'Screening Qualified': { color: 'bg-blue-100 text-blue-700', icon: '🔍' },
    'Qualified for Interview': { color: 'bg-indigo-100 text-indigo-700', icon: '✅' },
    'Interview Round 1': { color: 'bg-purple-100 text-purple-700', icon: '1️⃣' },
    'Interview Round 2': { color: 'bg-violet-100 text-violet-700', icon: '2️⃣' },
    'Selected': { color: 'bg-emerald-100 text-emerald-700', icon: '🎯' },
    'Rejected': { color: 'bg-rose-100 text-rose-700', icon: '❌' },
  };
  const stageConfig = stages[stage] || stages['Applied'];
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-xs">{stageConfig.icon}</span>
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${stageConfig.color}`}>
        {stage || 'Applied'}
      </span>
    </div>
  );
}

export default function RecruiterApplicantHistory() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [overallStats, setOverallStats] = useState(null);
  const [expandedFeedback, setExpandedFeedback] = useState(new Set());
  
  // Application data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    stage: '',
    finalStatus: '',
    lastRoundReached: '',
  });
  const [sortBy, setSortBy] = useState('appliedAt');
  const [order, setOrder] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  // Load company jobs
  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoadingJobs(true);
        const me = await api.getCurrentUser();
        const recruiterId = me?.user?.recruiter?.id;
        if (!recruiterId) {
          setJobs([]);
          setOverallStats(null);
          return;
        }
        // Get all jobs for this recruiter's company (posted and approved)
        const response = await api.getJobs({ recruiterId, isPosted: true, status: 'POSTED', limit: 1000 });
        const jobsList = Array.isArray(response) ? response : (response.jobs || []);
        if (!jobsList.length) {
          setJobs([]);
          setOverallStats(null);
          return;
        }
        const completedJobs = jobsList.filter((job) => {
          const status = (job?.interviewSession?.status || job?.interviewSessionStatus || '').toUpperCase();
          return status === 'COMPLETED';
        });
        if (!completedJobs.length) {
          setJobs([]);
          setOverallStats(null);
          return;
        }
        setJobs(completedJobs);

        // Aggregate overall stats across completed jobs
        try {
          const statsResponses = await Promise.all(
            completedJobs.map((job) =>
              api.get(`/admin/jobs/${job.id}/applications`, { params: { page: 1, limit: 1 } })
            )
          );
          const totals = statsResponses.reduce(
            (acc, res) => {
              const stats = res?.data?.stats || res?.stats || {};
              acc.totalApplications += stats.totalApplications || 0;
              acc.shortlisted += stats.shortlisted || 0;
              acc.interviewing += stats.interviewing || 0;
              acc.selected += stats.selected || 0;
              acc.rejected += stats.rejected || 0;
              return acc;
            },
            { totalApplications: 0, shortlisted: 0, interviewing: 0, selected: 0, rejected: 0 }
          );
          setOverallStats(totals);
        } catch (err) {
          console.error('Failed to aggregate overall stats:', err);
          setOverallStats(null);
        }
        
        // Do not auto-select; user must choose a job
      } catch (error) {
        console.error('Error loading jobs:', error);
        toast?.error('Failed to load jobs');
      } finally {
        setLoadingJobs(false);
      }
    };
    loadJobs();
  }, [user]);

  // Load applications for selected job
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!selectedJobId) {
        setPayload(null);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const params = {
          page,
          limit,
          q: debouncedSearch || undefined,
          stage: filters.stage || undefined,
          finalStatus: filters.finalStatus || undefined,
          lastRoundReached: filters.lastRoundReached || undefined,
          sortBy,
          order,
        };

        Object.keys(params).forEach(key => {
          if (params[key] === undefined || params[key] === '') {
            delete params[key];
          }
        });

        const res = await api.get(`/admin/jobs/${selectedJobId}/applications`, { params });
        if (cancelled) return;
        setPayload(res?.data || null);
      } catch (e) {
        if (cancelled) return;
        console.error('Failed to load applications:', e);
        setError(e?.message || 'Failed to load applications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [selectedJobId, page, limit, debouncedSearch, filters, sortBy, order]);

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const jobTitle = selectedJob?.jobTitle || selectedJob?.title || 'Job';
  const companyName = selectedJob?.companyName || selectedJob?.company?.name || 'Company';
  const stats = payload?.stats || null;
  const applications = useMemo(
    () => (Array.isArray(payload?.applications) ? payload.applications : []),
    [payload]
  );

  const computeStatsFromApplications = (list) => {
    if (!Array.isArray(list) || list.length === 0) return null;
    const totalApplications = list.length;
    const shortlisted = list.filter((row) =>
      ['RESUME_SELECTED', 'SCREENING_SELECTED'].includes(
        String(row.screeningStatus || '').toUpperCase()
      )
    ).length;
    const selected = list.filter((row) =>
      ['SELECTED'].includes(String(row.finalStatus || '').toUpperCase())
    ).length;
    const rejected = list.filter((row) =>
      ['REJECTED'].includes(String(row.finalStatus || '').toUpperCase())
    ).length;
    const interviewing = list.filter((row) => {
      const status = String(row.screeningStatus || '').toUpperCase();
      return ['TEST_SELECTED', 'INTERVIEW_ELIGIBLE'].includes(status);
    }).length;
    return { totalApplications, shortlisted, interviewing, selected, rejected };
  };

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.search ||
      filters.stage ||
      filters.finalStatus ||
      filters.lastRoundReached
    );
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      search: '',
      stage: '',
      finalStatus: '',
      lastRoundReached: '',
    });
    setPage(1);
  };

  const total = payload?.pagination?.total ?? null;
  const totalPages = payload?.pagination?.totalPages ?? null;

  const toggleFeedback = (applicationId) => {
    setExpandedFeedback((prev) => {
      const next = new Set(prev);
      if (next.has(applicationId)) {
        next.delete(applicationId);
      } else {
        next.add(applicationId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 -m-8 p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-7 h-7 text-indigo-600" />
            Applicant History
          </h1>
          <p className="text-slate-600 mt-1">
            View all applicants for your company's jobs
          </p>
        </div>

        {!loading && (selectedJobId ? stats : overallStats) && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Total</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{(selectedJobId ? stats?.totalApplications : overallStats?.totalApplications) ?? 0}</div>
                </div>
                <div className="text-2xl opacity-20">👥</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Shortlisted</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">{(selectedJobId ? stats?.shortlisted : overallStats?.shortlisted) ?? 0}</div>
                </div>
                <div className="text-2xl opacity-20">⭐</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">Interviewing</div>
                  <div className="text-2xl font-bold text-indigo-900 mt-1">{(selectedJobId ? stats?.interviewing : overallStats?.interviewing) ?? 0}</div>
                </div>
                <div className="text-2xl opacity-20">🎤</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Selected</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">{(selectedJobId ? stats?.selected : overallStats?.selected) ?? 0}</div>
                </div>
                <div className="text-2xl opacity-20">✅</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-rose-600 font-semibold uppercase tracking-wide">Rejected</div>
                  <div className="text-2xl font-bold text-rose-700 mt-1">{(selectedJobId ? stats?.rejected : overallStats?.rejected) ?? 0}</div>
                </div>
                <div className="text-2xl opacity-20">❌</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Job Selector */}
      <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 shadow-sm">
        <label className="block text-xs font-medium text-slate-600 mb-2">Select Job</label>
        {loadingJobs ? (
          <div className="h-10 bg-slate-200 rounded-lg animate-pulse" />
        ) : jobs.length === 0 ? (
          <div className="text-center py-4 text-slate-500">
            <Briefcase className="mx-auto mb-2 text-slate-400" size={24} />
            <p>No completed interviews found</p>
          </div>
        ) : (
          <CustomDropdown
            options={jobs.map(job => ({
              value: job.id,
              label: `${job.jobTitle || job.title || 'Untitled'} - ${job.companyName || job.company?.name || 'Company'}`,
            }))}
            value={selectedJobId || ''}
            onChange={(value) => {
              setSelectedJobId(value);
              setPage(1);
              resetFilters();
            }}
            placeholder="Select a job to view applicants"
          />
        )}
        {selectedJob && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Building2 size={16} />
                <span className="font-medium">{companyName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>Drive Date: {selectedJob.driveDate ? new Date(selectedJob.driveDate).toLocaleDateString() : 'TBD'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedJobId && (
        <>
          {/* Comprehensive Filters */}
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 shadow-sm relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Filter className="w-4 h-4" />
                Filters
              </div>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Reset Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={filters.search}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, search: e.target.value }));
                      setPage(1);
                    }}
                    placeholder="Name, email, phone, application ID"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
                <CustomDropdown
                  options={[
                    { value: '', label: 'All Stages' },
                    { value: 'Applied', label: 'Applied' },
                    { value: 'Screening Qualified', label: 'Screening Qualified' },
                    { value: 'Qualified for Interview', label: 'Qualified for Interview' },
                    { value: 'Interview Round 1', label: 'Interview Round 1' },
                    { value: 'Interview Round 2', label: 'Interview Round 2' },
                    { value: 'Selected', label: 'Selected' },
                    { value: 'Rejected', label: 'Rejected' },
                  ]}
                  value={filters.stage}
                  onChange={(value) => {
                    setFilters(prev => ({ ...prev, stage: value }));
                    setPage(1);
                  }}
                  placeholder="All Stages"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-medium text-slate-600">Active Filters:</span>
                  {filters.stage && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                      Stage: {filters.stage}
                    </span>
                  )}
                </div>
              </div>
            )}

            {total !== null && (
              <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-600">
                {total} total • page {page}{totalPages ? ` / ${totalPages}` : ''}
              </div>
            )}
          </div>

          {/* Applications Table */}
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative z-0">
            {error ? (
              <div className="p-8 text-center">
                <div className="text-rose-700 font-semibold mb-2">{error}</div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <div className="p-6">
                <div className="h-5 w-56 bg-slate-200 rounded animate-pulse mb-4" />
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">Stage</th>
                        <th className="px-4 py-3">Last Round</th>
                      <th className="px-4 py-3">Final Status</th>
                      <th className="px-4 py-3">Profile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 8 }).map((_, idx) => <SkeletonRow key={idx} />)}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <div className="text-slate-900 font-semibold text-lg mb-1">No applicants found</div>
                <div className="text-slate-500 text-sm">
                  {hasActiveFilters ? 'Try adjusting your filters or search terms.' : 'This job has no applications yet.'}
                </div>
              </div>
            ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                    Student Details
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                    Enrollment ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                    Center
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                    School
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((row) => (
                  <React.Fragment key={row.applicationId}>
                    <tr className="hover:bg-indigo-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {(row?.student?.name || 'U')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 truncate">{row?.student?.name || 'Unknown'}</div>
                            {row?.student?.phone && (
                              <a href={`tel:${row.student.phone}`} className="text-xs text-indigo-600 hover:text-indigo-800 mt-0.5 inline-block">
                                📞 {row.student.phone}
                              </a>
                            )}
                            <div className="text-xs text-slate-500 mt-0.5">
                              Stage: {row.currentStage || 'Applied'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`mailto:${row?.student?.email || ''}`} className="text-slate-700 hover:text-indigo-600 truncate text-sm">
                          {row?.student?.email || ''}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {row?.student?.enrollmentId || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {row?.student?.center || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {row?.student?.school || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill value={row.finalStatus || 'ONGOING'} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-center">
                          {Array.isArray(row.evaluations) && row.evaluations.length > 0 && (
                            <button
                              onClick={() => toggleFeedback(row.applicationId)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
                            >
                              {expandedFeedback.has(row.applicationId) ? 'Hide feedback' : 'View feedback'}
                            </button>
                          )}
                          <button
                            disabled={!row?.student?.profileLink}
                            onClick={() => row?.student?.profileLink && window.open(row.student.profileLink, '_blank')}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                              row?.student?.profileLink
                                ? 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-md'
                                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                            }`}
                          >
                            View Profile
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedFeedback.has(row.applicationId) && Array.isArray(row.evaluations) && row.evaluations.length > 0 && (
                      <tr className="bg-indigo-50/40">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="text-sm font-semibold text-slate-700 mb-2">Interview Feedback</div>
                          <div className="space-y-3">
                            {row.evaluations.map((evaluation, idx) => (
                              <div key={`${row.applicationId}-${idx}`} className="bg-white border border-indigo-100 rounded-lg p-3">
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                  <span className="font-semibold text-slate-800">
                                    {evaluation.roundName || `Round ${evaluation.roundNumber || '-'}`}
                                  </span>
                                  {evaluation.status && (
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      {evaluation.status}
                                    </span>
                                  )}
                                  {evaluation.evaluatedAt && (
                                    <span>
                                      {new Date(evaluation.evaluatedAt).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2 text-sm text-slate-700">
                                  {evaluation.remarks ? evaluation.remarks : 'No remarks provided.'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

            {/* Pagination */}
            {!loading && !error && totalPages && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white/70">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    page <= 1 ? 'text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed' : 'text-slate-700 border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>

                <div className="text-sm text-slate-600">
                  Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
                  <span className="font-semibold text-slate-900">{totalPages}</span>
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    page >= totalPages ? 'text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed' : 'text-slate-700 border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* No extra prompt when no job selected */}
    </div>
  );
}
