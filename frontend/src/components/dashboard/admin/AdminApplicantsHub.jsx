import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { Search, ExternalLink, Users, Filter, X } from 'lucide-react';
import CustomDropdown from '../../common/CustomDropdown';

function JobRowSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-slate-200 p-4">
      <div className="h-4 w-64 bg-slate-200 rounded mb-2" />
      <div className="h-3 w-40 bg-slate-200 rounded" />
      <div className="mt-3 h-9 w-36 bg-slate-200 rounded" />
    </div>
  );
}

export default function AdminApplicantsHub() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState([]);
  
  // Filters - Simplified: only search and status
  const [filters, setFilters] = useState({
    search: '', // Search by job title or company
    status: '', // Job status filter
  });


  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Load jobs with filters
  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      setLoading(true);
      setError('');
      try {
        const params = {
          page: 1,
          limit: 200,
          search: debouncedSearch || undefined,
          status: filters.status || undefined,
        };

        // Remove undefined params
        Object.keys(params).forEach(key => {
          if (params[key] === undefined || params[key] === '') {
            delete params[key];
          }
        });

        const res = await api.getJobs(params);
        const list = Array.isArray(res) ? res : (res?.jobs || []);
        if (!cancelled) setJobs(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error('Failed to load jobs:', e);
        if (!cancelled) setError(e?.message || 'Failed to load jobs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadJobs();
    return () => { cancelled = true; };
  }, [debouncedSearch, filters.status]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(filters.search || filters.status);
  }, [filters]);

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
    });
  };

  // Jobs are already filtered by backend, but we keep this for display
  const filtered = jobs;

  return (
    <div className="space-y-6 min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 -m-8 p-8">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-6 relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-6 h-6 text-indigo-600" />
              Applicants Tracking
            </h1>
            <p className="text-slate-600 mt-1">
              Select a job to view its applicant pipeline (screening → test → interview rounds → final).
            </p>
          </div>
        </div>

        {/* Filters Section - Simplified */}
        <div className="border-t border-slate-200 pt-4">
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

          {/* Search and Status Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Job title or company name"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <CustomDropdown
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'POSTED', label: 'Posted' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'IN_REVIEW', label: 'In Review' },
                  { value: 'REJECTED', label: 'Rejected' },
                ]}
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                placeholder="All Status"
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium text-slate-600">Active Filters:</span>
                {filters.status && (
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                    Status: {filters.status}
                  </span>
                )}
                {filters.search && (
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                    Search: {filters.search}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-rose-200 shadow-sm p-6 text-center">
          <div className="text-rose-700 font-semibold">{error}</div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => <JobRowSkeleton key={idx} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-12 text-center relative z-0">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <div className="text-slate-900 font-semibold text-lg mb-1">No jobs found</div>
          <div className="text-slate-500 text-sm">
            {hasActiveFilters ? 'Try adjusting your search or filters.' : 'No jobs are available at the moment.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-0">
          {filtered.map((job) => {
            const jobId = job?.id || job?.jobId;
            const title = job?.jobTitle || job?.title || 'Job';
            const company = job?.companyName || job?.company?.name || 'Company';
            const status = String(job?.status || '').toUpperCase();
            const applicationCount = job?.applicationCount || job?.totalApplications || 0;

            const statusConfig = {
              'POSTED': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✅' },
              'APPROVED': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '✓' },
              'IN_REVIEW': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '⏳' },
              'REJECTED': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: '✕' },
            };
            const statusStyle = statusConfig[status] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: '•' };

            return (
              <div key={jobId} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-200 p-6 group">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-lg truncate group-hover:text-indigo-600 transition-colors">{title}</div>
                    <div className="text-sm text-slate-600 truncate mt-1 flex items-center gap-2">
                      <span>🏢</span>
                      {company}
                    </div>
                  </div>
                  {status && (
                    <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} flex items-center gap-1`}>
                      <span>{statusStyle.icon}</span>
                      {status}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">{applicationCount}</span>
                    <span className="text-xs text-slate-500">applicant{applicationCount !== 1 ? 's' : ''}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/admin/jobs/${jobId}/applications`)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all font-semibold shadow-sm hover:shadow-md"
                  >
                    View
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

