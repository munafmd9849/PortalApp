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
      <td className="px-6 py-4"><div className="h-9 w-24 bg-slate-200 rounded-xl" /></td>
    </tr>
  );
}

function StatusPill({ value }) {
  const v = String(value || '').toUpperCase();
  const config = {
    'SELECTED': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'CheckCircle' },
    'REJECTED': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'X' },
    'ONGOING': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: 'Clock' },
    'REVOKED_BY_ADMIN': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', icon: 'Lock' },
  };
  const style = config[v] || config['ONGOING'];
  const label = v === 'REVOKED_BY_ADMIN' ? 'REVOKED' : v;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
      {label}
    </span>
  );
}

function StageBadge({ stage }) {
  const stages = {
    'Applied': { color: 'bg-slate-100 text-slate-700', label: 'Applied' },
    'Screening Qualified': { color: 'bg-blue-100 text-blue-700', label: 'Screening' },
    'Qualified for Interview': { color: 'bg-indigo-100 text-indigo-700', label: 'Interview Ready' },
    'Interview Round 1': { color: 'bg-purple-100 text-purple-700', label: 'Round 1' },
    'Interview Round 2': { color: 'bg-violet-100 text-violet-700', label: 'Round 2' },
    'Selected': { color: 'bg-emerald-100 text-emerald-700', label: 'Selected' },
    'Rejected': { color: 'bg-rose-100 text-rose-700', label: 'Rejected' },
    'REVOKED_BY_ADMIN': { color: 'bg-slate-200 text-slate-700', label: 'Revoked' },
  };
  const stageConfig = stages[stage] || stages['Applied'];
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter ${stageConfig.color}`}>
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
          search: debouncedSearch || undefined,
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
    <div className="space-y-6 p-4 sm:p-6 md:p-8 bg-[#f8fafc] min-h-screen font-outfit">
      {/* Header & Job Info */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                Application <span className="text-indigo-600">Review</span>
              </h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  <Building2 className="w-3.5 h-3.5" />
                  {job.companyName}
                </span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  <Briefcase className="w-3.5 h-3.5" />
                  {job.jobTitle}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col items-center min-w-[80px]">
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Total</span>
              <span className="text-base font-bold text-indigo-700 leading-tight">{pagination.total}</span>
            </div>
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center min-w-[80px]">
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Selected</span>
              <span className="text-base font-bold text-emerald-700 leading-tight">{stats.Selected || 0}</span>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-[24px] border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search by student name, email, or USN..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="w-full lg:w-48">
              <CustomDropdown
                options={STAGE_OPTIONS}
                value={filters.stage}
                onChange={(val) => setFilters(prev => ({ ...prev, stage: val }))}
                placeholder="Stage"
                className="rounded-xl border-slate-200 shadow-none"
              />
            </div>
            <div className="w-full lg:w-48">
              <CustomDropdown
                options={FINAL_STATUS_OPTIONS}
                value={filters.finalStatus}
                onChange={(val) => setFilters(prev => ({ ...prev, finalStatus: val }))}
                placeholder="Result"
                className="rounded-xl border-slate-200 shadow-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate Profile</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Info</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Stage</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Result</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
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
                    <p className="text-slate-900 font-bold tracking-tight">No applicants matched your filters</p>
                    <p className="text-slate-500 text-sm mt-1">Try resetting the stage or search term</p>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm border border-indigo-100">
                          {app.student?.user?.displayName?.charAt(0) || 'S'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate tracking-tight">{app.student?.user?.displayName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{app.student?.usn || app.student?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                          <GraduationCap className="w-3 h-3 text-indigo-500" />
                          {app.student?.school} | {app.student?.branch}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Batch: {app.student?.batch}
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
                        <button 
                          onClick={() => navigate(`/admin/student/${app.studentId}`)}
                          className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Student Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => navigate(`/admin/jobs/${jobId}/applications/${app.id}`)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all opacity-0 group-hover:opacity-100"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        {!loading && pagination.total > LIMIT && (
          <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-900">{applications.length}</span> of <span className="text-slate-900">{pagination.total}</span> Candidates
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold text-slate-600 uppercase">Page {page} of {pagination.totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
