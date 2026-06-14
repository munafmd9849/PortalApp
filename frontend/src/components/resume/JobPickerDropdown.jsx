import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, ChevronDown, X, Search, Building2, Loader2 } from 'lucide-react';
import api from '../../services/api';

/**
 * Reusable job picker dropdown.
 * Fetches the student's visible/targeted jobs and lets them pick one.
 *
 * Props:
 *   selectedJob: { id, jobTitle, companyName } | null
 *   onSelect: (job | null) => void
 *   placeholder?: string
 *   className?: string
 */
export default function JobPickerDropdown({ selectedJob, onSelect, placeholder = 'Select a job to match against', className = '' }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load jobs when dropdown opens for the first time
  useEffect(() => {
    if (!open || jobs.length > 0) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.getTargetedJobs();
        const list = Array.isArray(data) ? data : (data?.jobs || []);
        setJobs(list.filter(j => j.status === 'POSTED' || j.postedAt));
      } catch (err) {
        setError('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    return (j.jobTitle || '').toLowerCase().includes(q) || (j.companyName || '').toLowerCase().includes(q);
  });

  const handleSelect = (job) => {
    onSelect(job);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null);
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white border-2 border-blue-200 rounded-2xl hover:border-blue-400 focus:outline-none focus:border-blue-500 transition-all text-left shadow-sm"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 flex-shrink-0">
          <Briefcase className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          {selectedJob ? (
            <>
              <p className="text-sm font-semibold text-slate-800 truncate">{selectedJob.jobTitle}</p>
              <p className="text-xs text-slate-500 truncate">{selectedJob.companyName || 'Company'}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">{placeholder}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedJob && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search jobs or companies..."
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Job List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading jobs...</span>
              </div>
            ) : error ? (
              <div className="text-center py-6 text-sm text-red-500">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400">
                {search ? 'No jobs match your search' : 'No posted jobs available'}
              </div>
            ) : (
              filtered.map(job => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => handleSelect(job)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-slate-50 last:border-0 ${selectedJob?.id === job.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex-shrink-0">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{job.jobTitle}</p>
                    <p className="text-xs text-slate-500 truncate">{job.companyName || 'Company'}</p>
                  </div>
                  {selectedJob?.id === job.id && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
