import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import { Search, Users, ExternalLink, ArrowLeft, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const cls =
    v === 'SELECTED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : v === 'REJECTED'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-sky-50 text-sky-700 border-sky-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {v || 'ONGOING'}
    </span>
  );
}

export default function AdminJobApplications() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  // Filters (server-side)
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [finalStatus, setFinalStatus] = useState('');
  const [lastRoundReached, setLastRoundReached] = useState('');
  const [sortBy, setSortBy] = useState('appliedAt');
  const [order, setOrder] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Debounced search term for server-side query
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!jobId) return;

      setLoading(true);
      setError('');
      try {
        const params = {
          page,
          limit,
          q: debouncedSearch || undefined,
          stage: stage || undefined,
          finalStatus: finalStatus || undefined,
          lastRoundReached: lastRoundReached || undefined,
          sortBy,
          order,
        };

        const res = await api.get(`/admin/jobs/${jobId}/applications`, { params });
        if (cancelled) return;
        setPayload(res?.data || null);
      } catch (e) {
        if (cancelled) return;
        console.error('Failed to load job applications:', e);
        setError(e?.message || 'Failed to load applications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [jobId, page, limit, debouncedSearch, stage, finalStatus, lastRoundReached, sortBy, order]);

  const jobTitle = payload?.job?.title || 'Job';
  const companyName = payload?.job?.companyName || 'Company';
  const stats = payload?.stats || null;
  const applications = useMemo(
    () => (Array.isArray(payload?.applications) ? payload.applications : []),
    [payload]
  );

  // Client-side quick filter (keeps UI snappy while server-side search runs)
  const clientFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((a) => {
      const name = a?.student?.name?.toLowerCase() || '';
      const email = a?.student?.email?.toLowerCase() || '';
      const enrollment = (a?.student?.enrollmentId || '').toLowerCase();
      return name.includes(q) || email.includes(q) || enrollment.includes(q);
    });
  }, [applications, search]);

  const total = payload?.pagination?.total ?? null;
  const totalPages = payload?.pagination?.totalPages ?? null;

  return (
    <div className="space-y-6 min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 -m-8 p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 border border-slate-200 rounded-lg shadow-sm hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mt-4">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-7 h-7 text-indigo-600" />
              Applicants
            </h1>
            <p className="text-slate-600 mt-1">
              <span className="font-semibold text-slate-800">{jobTitle}</span>
              <span className="mx-2">•</span>
              {companyName}
            </p>
          </div>
        </div>

        {!loading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white/90 border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-xs text-slate-500 font-semibold">Total</div>
              <div className="text-xl font-bold text-slate-900">{stats.totalApplications ?? 0}</div>
            </div>
            <div className="bg-white/90 border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-xs text-slate-500 font-semibold">Shortlisted</div>
              <div className="text-xl font-bold text-slate-900">{stats.shortlisted ?? 0}</div>
            </div>
            <div className="bg-white/90 border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-xs text-slate-500 font-semibold">Interviewing</div>
              <div className="text-xl font-bold text-slate-900">{stats.interviewing ?? 0}</div>
            </div>
            <div className="bg-white/90 border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-xs text-slate-500 font-semibold">Selected</div>
              <div className="text-xl font-bold text-emerald-700">{stats.selected ?? 0}</div>
            </div>
            <div className="bg-white/90 border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-xs text-slate-500 font-semibold">Rejected</div>
              <div className="text-xl font-bold text-rose-700">{stats.rejected ?? 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 font-semibold mb-4">
          <Filter className="w-4 h-4" />
          Filters
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, enrollment ID"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          <select
            value={stage}
            onChange={(e) => { setStage(e.target.value); setPage(1); }}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white"
          >
            {STAGE_OPTIONS.map(o => (
              <option key={o.label} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={finalStatus}
            onChange={(e) => { setFinalStatus(e.target.value); setPage(1); }}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white"
          >
            {FINAL_STATUS_OPTIONS.map(o => (
              <option key={o.label} value={o.value}>{o.label}</option>
            ))}
          </select>

          <input
            value={lastRoundReached}
            onChange={(e) => { setLastRoundReached(e.target.value.replace(/[^\d]/g, '')); setPage(1); }}
            placeholder="Last round (e.g. 1, 2)"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white"
          >
            <option value="appliedAt">Sort: Applied Date</option>
            <option value="name">Sort: Student Name</option>
            <option value="stage">Sort: Stage</option>
          </select>

          <select
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white"
          >
            <option value="desc">Order: Desc</option>
            <option value="asc">Order: Asc</option>
          </select>

          <select
            value={limit}
            onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          <div className="md:col-span-2 flex items-center justify-end text-sm text-slate-600">
            {total !== null && (
              <span>
                {total} total • page {page}{totalPages ? ` / ${totalPages}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
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
                    <th className="px-4 py-3">Email</th>
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
        ) : clientFiltered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-slate-800 font-semibold">No applicants found</div>
            <div className="text-slate-500 text-sm mt-1">
              Try adjusting filters or search.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Last Round</th>
                  <th className="px-4 py-3">Final Status</th>
                  <th className="px-4 py-3">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientFiltered.map((row) => (
                  <tr key={row.applicationId} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{row?.student?.name || 'Unknown'}</div>
                      {row?.student?.enrollmentId && (
                        <div className="text-xs text-slate-500">Enrollment: {row.student.enrollmentId}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row?.student?.email || ''}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900 font-medium">{row.currentStage}</div>
                      {row.finalStatus === 'REJECTED' && row.rejectedIn && (
                        <div className="text-xs text-slate-500">Rejected in: {row.rejectedIn}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.lastRoundReached || 0}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill value={row.finalStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={!row?.student?.profileLink}
                        onClick={() => row?.student?.profileLink && window.open(row.student.profileLink, '_blank')}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border ${
                          row?.student?.profileLink
                            ? 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                            : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        View
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
    </div>
  );
}

