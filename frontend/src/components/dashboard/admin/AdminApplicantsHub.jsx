import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { Search, ExternalLink, Users } from 'lucide-react';

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
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      setLoading(true);
      setError('');
      try {
        const res = await api.getJobs({ page: 1, limit: 200 });
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
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => {
      const title = (j?.jobTitle || j?.title || '').toLowerCase();
      const company = (j?.companyName || j?.company?.name || '').toLowerCase();
      return title.includes(q) || company.includes(q);
    });
  }, [jobs, search]);

  return (
    <div className="space-y-6 min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 -m-8 p-8">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-6 h-6 text-indigo-600" />
              Applicants Tracking
            </h1>
            <p className="text-slate-600 mt-1">
              Select a job to view its applicant pipeline (screening → test → interview rounds → final).
            </p>
          </div>
          <div className="w-full max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs by title or company"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>
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
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
          <div className="text-slate-900 font-semibold">No jobs found</div>
          <div className="text-slate-500 text-sm mt-1">Try adjusting your search.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((job) => {
            const jobId = job?.id || job?.jobId;
            const title = job?.jobTitle || job?.title || 'Job';
            const company = job?.companyName || job?.company?.name || 'Company';
            const status = String(job?.status || '').toUpperCase();

            return (
              <div key={jobId} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{title}</div>
                    <div className="text-sm text-slate-600 truncate">{company}</div>
                  </div>
                  {status && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
                      {status}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => navigate(`/admin/jobs/${jobId}/applications`)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-semibold"
                  >
                    Open Applicants
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

