import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../../services/api';
import { Search, Users, ExternalLink, ArrowLeft, Filter, ChevronLeft, ChevronRight, X, Calendar, GraduationCap, Building2, Briefcase, Info, CheckCircle, Clock } from 'lucide-react';
import CustomDropdown from '../../common/CustomDropdown';
import { useToast } from '../../ui/Toast';

const STAGE_OPTIONS = [
  { label: 'All Stages', value: '' },
  { label: 'Applied', value: 'Applied' },
  { label: 'Screening Qualified', value: 'Screening Qualified' },
  { label: 'Test Qualified', value: 'Qualified for Interview' },
  { label: 'Interview Round 1', value: 'Interview Round 1' },
  { label: 'Interview Round 2', value: 'Interview Round 2' },
  { label: 'Selected', value: 'Selected' },
  { label: 'Rejected', value: 'Rejected' },
];

const FINAL_STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Ongoing', value: 'ONGOING' },
  { label: 'Selected', value: 'SELECTED' },
  { label: 'Rejected', value: 'REJECTED' },
];

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-200 rounded" /></td>
      <td className="px-6 py-4"><div className="h-4 w-56 bg-slate-200 rounded" /></td>
      <td className="px-6 py-4"><div className="h-4 w-44 bg-slate-200 rounded" /></td>
      <td className="px-6 py-4"><div className="h-4 w-10 bg-slate-200 rounded" /></td>
      <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
      <td className="px-6 py-4"><div className="h-9 w-24 bg-slate-200 rounded-md" /></td>
    </tr>
  );
}

function StatusPill({ value }) {
  const v = String(value || '').toUpperCase();
  const config = {
    'SELECTED': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'CheckCircle' },
    'REJECTED': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'X' },
    'ONGOING': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: 'Clock' },
    'REVOKED_BY_ADMIN': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', icon: 'Lock' },
    'WITHDRAWN': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'X' },
  };
  const style = config[v] || config['ONGOING'];
  const label = v === 'REVOKED_BY_ADMIN' ? 'REVOKED' : v === 'WITHDRAWN' ? 'WITHDRAWN' : v;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
      {label}
    </span>
  );
}

function StageBadge({ stage }) {
  const stages = {
    'Applied': { color: 'bg-slate-100 text-slate-700', label: 'Applied' },
    'Screening Qualified': { color: 'bg-blue-100 text-blue-700', label: 'Screening' },
    'Qualified for Interview': { color: 'bg-blue-100 text-blue-800', label: 'Interview ready' },
    'Interview Round 1': { color: 'bg-purple-100 text-purple-700', label: 'Round 1' },
    'Interview Round 2': { color: 'bg-violet-100 text-violet-700', label: 'Round 2' },
    'Selected': { color: 'bg-emerald-100 text-emerald-700', label: 'Selected' },
    'Rejected': { color: 'bg-rose-100 text-rose-700', label: 'Rejected' },
    'REVOKED_BY_ADMIN': { color: 'bg-slate-200 text-slate-700', label: 'Revoked' },
    'WITHDRAWN': { color: 'bg-amber-100 text-amber-800', label: 'Withdrawn' },
  };
  const stageConfig = stages[stage] || stages['Applied'];
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${stageConfig.color}`}>
      {stageConfig.label}
    </span>
  );
}

export default function AdminJobApplications() {
  const params = useParams();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const jobId = params.jobId || location.pathname.match(/\/admin\/jobs\/([^/]+)\/applications/)?.[1] ||
    location.pathname.match(/\/super-admin\/jobs\/([^/]+)\/applications/)?.[1];

  const basePath = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    applicationStatus: '',
    stage: '',
    finalStatus: '',
    lastRoundReached: '',
  });
  const [sortBy, setSortBy] = useState('appliedAt');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    async function load() {
      if (!jobId) return;
      try {
        setLoading(true);
        const queryParams = {
          page,
          limit: LIMIT,
          sortBy,
          order,
          q: debouncedSearch || undefined,
          stage: filters.stage || undefined,
          finalStatus: filters.finalStatus || undefined,
        };
        const res = await api.get(`/admin/jobs/${jobId}/applications`, { params: queryParams });
        setPayload(res.data);
      } catch (err) {
        setError(err.message || 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId, page, sortBy, order, debouncedSearch, filters.stage, filters.finalStatus]);

  const stats = payload?.stats || {};
  const applications = payload?.applications || [];
  const pagination = payload?.pagination || { total: 0, totalPages: 1 };
  const job = payload?.job || {};

  return (
    <div className="space-y-5 p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 bg-white border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Application review
              </h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {job.companyName}
                </span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {job.title || job.jobTitle}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-center min-w-[72px]">
              <span className="text-xs text-gray-500 block">Total</span>
              <span className="text-base font-semibold text-gray-900">{pagination.total}</span>
            </div>
            <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-center min-w-[72px]">
              <span className="text-xs text-gray-500 block">Selected</span>
              <span className="text-base font-semibold text-emerald-700">{stats.selected ?? stats.Selected ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col lg:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search by student name, email, or USN..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-800 focus:border-blue-800 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="w-full lg:w-48">
              <CustomDropdown
                options={STAGE_OPTIONS}
                value={filters.stage}
                onChange={(val) => setFilters(prev => ({ ...prev, stage: val }))}
                placeholder="Stage"
                className="rounded-md border-gray-200 shadow-none"
              />
            </div>
            <div className="w-full lg:w-48">
              <CustomDropdown
                options={FINAL_STATUS_OPTIONS}
                value={filters.finalStatus}
                onChange={(val) => setFilters(prev => ({ ...prev, finalStatus: val }))}
                placeholder="Result"
                className="rounded-md border-gray-200 shadow-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500">Candidate</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500">Academic details</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500">Stage</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 text-center">Outcome</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8" />
                    </div>
                    <p className="text-gray-900 font-medium">No candidates match your filters</p>
                    <p className="text-gray-500 text-sm mt-1">Try adjusting the stage or search term</p>
                  </td>
                </tr>
              ) : (
                applications.map((app) => {
                  const applicationId = app.applicationId || app.id;
                  const studentName = app.student?.name || app.student?.user?.displayName || 'Unknown';
                  const studentInitial = studentName.charAt(0).toUpperCase();
                  return (
                  <tr key={applicationId} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 text-gray-700 rounded-md flex items-center justify-center font-semibold text-xs border border-gray-200">
                          {studentInitial}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{studentName}</p>
                          <p className="text-xs text-gray-500">{app.student?.enrollmentId || app.student?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600 flex items-center gap-1.5">
                          <GraduationCap className="w-3 h-3 text-gray-400" />
                          {app.student?.school} {app.student?.branch ? `| ${app.student.branch}` : ''}
                        </p>
                        <p className="text-xs text-gray-500">
                          Batch {app.student?.batch}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <StageBadge stage={app.currentStage} />
                    </td>
                    <td className="px-6 py-5 text-center">
                      <StatusPill value={app.finalStatus} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {app.student?.profileLink && (
                        <a
                          href={app.student.profileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-50 text-gray-400 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                          title="View profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`${basePath}/jobs/${jobId}/applications/${applicationId}`)}
                          className="px-3 py-1.5 bg-blue-800 text-white rounded-md text-xs font-medium hover:bg-blue-900 transition-colors"
                        >
                          View details
                        </button>
                      </div>
                    </td>
                  </tr>
                );})
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        {!loading && pagination.total > LIMIT && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {applications.length} of {pagination.total} candidates
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-white border border-gray-200 rounded-md text-gray-600 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">Page {page} of {pagination.totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 bg-white border border-gray-200 rounded-md text-gray-600 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
