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
      <td className="px-4 py-3"><div className="h-4 w-40 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-4 w-56 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-4 w-44 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-4 w-10 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-8 w-20 bg-slate-200 rounded" /></td>
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
  
  // Application data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    applicationStatus: '',
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
          return;
        }
        // Get all jobs for this recruiter's company (posted and approved)
        const response = await api.getJobs({ recruiterId, isPosted: true, status: 'POSTED', limit: 1000 });
        const jobsList = Array.isArray(response) ? response : (response.jobs || []);
        setJobs(jobsList);
        
        // Auto-select first job if available
        if (jobsList.length > 0 && !selectedJobId) {
          setSelectedJobId(jobsList[0].id);
        }
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
          applicationStatus: filters.applicationStatus || undefined,
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

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.search ||
      filters.applicationStatus ||
      filters.stage ||
      filters.finalStatus ||
      filters.lastRoundReached
    );
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      search: '',
      applicationStatus: '',
      stage: '',
      finalStatus: '',
      lastRoundReached: '',
    });
    setPage(1);
  };

  const total = payload?.pagination?.total ?? null;
  const totalPages = payload?.pagination?.totalPages ?? null;

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

        {!loading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Total</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalApplications ?? 0}</div>
                </div>
                <div className="text-2xl opacity-20">👥</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Shortlisted</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">{stats.shortlisted ?? 0}</div>
                </div>
                <div className="text-2xl opacity-20">⭐</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">Interviewing</div>
                  <div className="text-2xl font-bold text-indigo-900 mt-1">{stats.interviewing ?? 0}</div>
                </div>
                <div className="text-2xl opacity-20">🎤</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Selected</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.selected ?? 0}</div>
                </div>
                <div className="text-2xl opacity-20">✅</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-rose-600 font-semibold uppercase tracking-wide">Rejected</div>
                  <div className="text-2xl font-bold text-rose-700 mt-1">{stats.rejected ?? 0}</div>
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
            <p>No posted jobs found</p>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Application Status</label>
                <CustomDropdown
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'applied', label: 'Applied' },
                    { value: 'shortlisted', label: 'Shortlisted' },
                    { value: 'interview_scheduled', label: 'Interview Scheduled' },
                    { value: 'interviewed', label: 'Interviewed' },
                    { value: 'selected', label: 'Selected' },
                    { value: 'rejected', label: 'Rejected' },
                  ]}
                  value={filters.applicationStatus}
                  onChange={(value) => {
                    setFilters(prev => ({ ...prev, applicationStatus: value }));
                    setPage(1);
                  }}
                  placeholder="All Status"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-medium text-slate-600">Active Filters:</span>
                  {filters.applicationStatus && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                      Status: {filters.applicationStatus}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sort By</label>
                <CustomDropdown
                  options={[
                    { value: 'appliedAt', label: 'Applied Date' },
                    { value: 'name', label: 'Student Name' },
                  ]}
                  value={sortBy}
                  onChange={(value) => setSortBy(value)}
                  placeholder="Sort By"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Order</label>
                <CustomDropdown
                  options={[
                    { value: 'desc', label: 'Descending' },
                    { value: 'asc', label: 'Ascending' },
                  ]}
                  value={order}
                  onChange={(value) => setOrder(value)}
                  placeholder="Order"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Per Page</label>
                <CustomDropdown
                  options={[
                    { value: '25', label: '25 / page' },
                    { value: '50', label: '50 / page' },
                    { value: '100', label: '100 / page' },
                  ]}
                  value={String(limit)}
                  onChange={(value) => { setLimit(parseInt(value, 10)); setPage(1); }}
                  placeholder="Per Page"
                />
              </div>

              <div className="flex items-end justify-end text-sm text-slate-600 pb-2">
                {total !== null && (
                  <span>
                    {total} total • page {page}{totalPages ? ` / ${totalPages}` : ''}
                  </span>
                )}
              </div>
            </div>
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
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b-2 border-slate-200">
                      <th className="px-4 py-4">Student</th>
                      <th className="px-4 py-4">Contact</th>
                      <th className="px-4 py-4">Stage</th>
                      <th className="px-4 py-4 text-center">Round</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((row) => (
                      <tr key={row.applicationId} className="hover:bg-indigo-50/50 transition-colors group">
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {(row?.student?.name || 'U')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 truncate">{row?.student?.name || 'Unknown'}</div>
                              {row?.student?.enrollmentId && (
                                <div className="text-xs text-slate-500 mt-0.5">ID: {row.student.enrollmentId}</div>
                              )}
                              {row?.student?.phone && (
                                <a href={`tel:${row.student.phone}`} className="text-xs text-indigo-600 hover:text-indigo-800 mt-0.5 inline-block">
                                  📞 {row.student.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <a href={`mailto:${row?.student?.email || ''}`} className="text-slate-700 hover:text-indigo-600 truncate text-sm">
                              {row?.student?.email || ''}
                            </a>
                            {row?.student?.city && row?.student?.stateRegion && (
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                📍 {row.student.city}, {row.student.stateRegion}
                              </div>
                            )}
                            {row?.student?.school && (
                              <div className="text-xs text-slate-500">School: {row.student.school}</div>
                            )}
                            {row?.student?.batch && (
                              <div className="text-xs text-slate-500">Batch: {row.student.batch}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StageBadge stage={row.currentStage} />
                          {row.finalStatus === 'REJECTED' && row.rejectedIn && (
                            <div className="text-xs text-rose-600 mt-2 flex items-center gap-1">
                              ⚠️ Rejected in: {row.rejectedIn}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                              {row.lastRoundReached || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusPill value={row.finalStatus} />
                        </td>
                        <td className="px-4 py-4">
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
                        </td>
                      </tr>
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

      {!selectedJobId && !loadingJobs && jobs.length > 0 && (
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-12 text-center">
          <Briefcase className="mx-auto mb-4 text-slate-400" size={48} />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a Job</h3>
          <p className="text-slate-500">Choose a job from the dropdown above to view its applicants</p>
        </div>
      )}
    </div>
  );
}
