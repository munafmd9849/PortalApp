import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import { Search, ExternalLink, Users, Filter, X, Building2, FileText, Calendar, StickyNote, Pencil, Check, ChevronRight, Briefcase, User, Info, Loader } from 'lucide-react';
import { useToast } from '../../ui/Toast';

function CompanyFilterDropdown({ companies, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = React.useRef(null);

  const options = useMemo(() => {
    const names = companies.map((c) => c.companyName).sort((a, b) => a.localeCompare(b));
    return names;
  }, [companies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((name) => name.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabel = value || 'All companies';

  useEffect(() => {
    const onOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  return (
    <div className="relative w-full lg:w-72" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          <Building2 className="w-4 h-4 text-blue-800 shrink-0" />
          <span className="truncate">{selectedLabel}</span>
        </span>
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search companies"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-800 focus:border-blue-800"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); setQuery(''); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!value ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700'}`}
              >
                All companies
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400">No companies match</li>
            ) : (
              filtered.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => { onChange(name); setOpen(false); setQuery(''); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 truncate ${value === name ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700'}`}
                  >
                    {name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function CompanyCardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-md" />
        <div className="space-y-2">
          <div className="h-5 w-48 bg-slate-200 rounded" />
          <div className="h-3 w-32 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="h-px bg-slate-100 w-full mb-4" />
      <div className="flex justify-between items-center">
        <div className="h-4 w-24 bg-slate-100 rounded" />
        <div className="h-8 w-24 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
}

// Group jobs by company name (normalized for grouping)
function groupJobsByCompany(jobs) {
  const map = new Map();
  for (const job of jobs) {
    const name = (job?.companyName || job?.company?.name || 'Unknown Company').trim() || 'Unknown Company';
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(job);
  }
  return Array.from(map.entries()).map(([companyName, companyJobs]) => ({
    companyName,
    jobs: companyJobs,
    totalApplicants: companyJobs.reduce((sum, j) => sum + (j?.applicationCount ?? j?.totalApplications ?? 0), 0),
  }));
}

function formatDriveDate(job) {
  const d = job?.driveDate;
  if (!d) return '—';
  try {
    const date = typeof d === 'object' && d.toMillis ? new Date(d.toMillis()) : new Date(d);
    return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return '—';
  }
}

// Helper for company initials/color
const getCompanyTheme = (name) => {
  const colors = [
    { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
    { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
    { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' }
  ];
  const index = name.length % colors.length;
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return { ...colors[index], initials };
};

export default function AdminApplicantsHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const addNoteJobId = searchParams.get('addNote');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null); // { companyName, jobs, totalApplicants }
  const [editingNoteJobId, setEditingNoteJobId] = useState(null);
  const [editingNoteValue, setEditingNoteValue] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [filters, setFilters] = useState({
    company: '',
  });
  const [companiesPage, setCompaniesPage] = useState(1);
  const COMPANIES_PER_PAGE = 12;

  const toast = useToast();

  // Body Scroll Lock when modal is open
  useEffect(() => {
    if (selectedCompany) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedCompany]);

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      setLoading(true);
      setError('');
      try {
        const params = {
          page: 1,
          limit: 200,
          isPosted: true,
          status: 'POSTED',
        };

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
  }, []);

  const allCompanies = useMemo(() => groupJobsByCompany(jobs), [jobs]);

  const companies = useMemo(() => {
    if (!filters.company) return allCompanies;
    return allCompanies.filter((c) => c.companyName === filters.company);
  }, [allCompanies, filters.company]);

  const hasActiveFilters = useMemo(() => !!filters.company, [filters.company]);

  const resetFilters = () => {
    setFilters({ company: '' });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCompaniesPage(1);
  }, [filters.company]);

  // When landing with addNote=jobId (from thank-you email), open company modal and start editing note
  useEffect(() => {
    if (!addNoteJobId || loading || jobs.length === 0) return;
    const job = jobs.find((j) => (j?.id || j?.jobId) === addNoteJobId);
    if (!job) return;
    const companyName = job?.companyName || job?.company?.name || 'Unknown Company';
    const companyJobs = jobs.filter(
      (j) => (j?.companyName || j?.company?.name || 'Unknown Company').trim() === companyName.trim()
    );
    const totalApplicants = companyJobs.reduce(
      (sum, j) => sum + (j?.applicationCount ?? j?.totalApplications ?? 0),
      0
    );
    setSelectedCompany({ companyName, jobs: companyJobs, totalApplicants });
    setEditingNoteJobId(addNoteJobId);
    setEditingNoteValue(job?.adminNote || '');
    setSearchParams((prev) => {
      prev.delete('addNote');
      return prev;
    }, { replace: true });
  }, [addNoteJobId, loading, jobs, setSearchParams]);

  return (
    <div className="space-y-6 min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Applicants</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review applications by company and role</p>
        </div>
      </div>

      {/* Control Bar (Filters) */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <CompanyFilterDropdown
            companies={allCompanies}
            value={filters.company}
            onChange={(company) => setFilters({ company })}
          />
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="p-2.5 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 rounded-md transition-colors shrink-0"
              title="Clear filter"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      {error ? (
        <div className="bg-white border border-red-200 rounded-lg p-12 text-center">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-md flex items-center justify-center mx-auto mb-4">
            <Info className="w-7 h-7" />
          </div>
          <h3 className="text-gray-900 font-semibold text-base">Unable to load applicants</h3>
          <p className="text-gray-600 text-sm mt-1 max-w-md mx-auto">{error}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, idx) => <CompanyCardSkeleton key={idx} />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10" />
          </div>
          <h3 className="text-gray-900 font-semibold text-base">No companies found</h3>
          <p className="text-gray-500 text-sm mt-1">Adjust your filters or try a different search term</p>
          <button onClick={resetFilters} className="mt-6 px-5 py-2 bg-blue-800 text-white rounded-md text-sm font-medium hover:bg-blue-900 transition-colors">
            Reset filters
          </button>
        </div>
      ) : (() => {
        const totalCompanies = companies.length;
        const totalPages = Math.max(1, Math.ceil(totalCompanies / COMPANIES_PER_PAGE));
        const currentPage = Math.min(Math.max(1, companiesPage), totalPages);
        const start = (currentPage - 1) * COMPANIES_PER_PAGE;
        const paginatedCompanies = companies.slice(start, start + COMPANIES_PER_PAGE);
        
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedCompanies.map(({ companyName, jobs: companyJobs, totalApplicants }) => {
                const theme = getCompanyTheme(companyName);
                return (
                  <div
                    key={companyName}
                    onClick={() => setSelectedCompany({ companyName, jobs: companyJobs, totalApplicants })}
                    className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group cursor-pointer relative"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-11 h-11 ${theme.bg} ${theme.text} ${theme.border} border rounded-md flex items-center justify-center font-semibold text-base`}>
                        {theme.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 text-sm truncate group-hover:text-blue-800 transition-colors">
                          {companyName}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {companyJobs.length} open roles
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100">
                      <div>
                        <span className="text-xs text-gray-500">Applicants</span>
                        <p className="text-base font-semibold text-gray-900 flex items-center gap-1.5 mt-0.5">
                          {totalApplicants}
                          <Users className="w-3.5 h-3.5 text-blue-800" />
                        </p>
                      </div>
                      <span className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-md group-hover:bg-blue-800 group-hover:text-white group-hover:border-blue-800 transition-colors">
                        Review
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Premium Pagination */}
            {totalCompanies > COMPANIES_PER_PAGE && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Showing {start + 1}–{Math.min(start + COMPANIES_PER_PAGE, totalCompanies)} of {totalCompanies} companies
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCompaniesPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-2 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCompaniesPage(i + 1)}
                        className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                          currentPage === i + 1 
                            ? 'bg-blue-800 text-white' 
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompaniesPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Company Jobs Modal (Side Drawer Style or Center) */}
      {selectedCompany && createPortal(
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[9999]"
          onClick={() => setSelectedCompany(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-800 text-white relative border-b border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-700 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 pr-10">
                <div className="w-12 h-12 bg-slate-700 border border-slate-600 rounded-md flex items-center justify-center font-semibold text-lg text-white">
                  {getCompanyTheme(selectedCompany.companyName).initials}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{selectedCompany.companyName}</h2>
                  <p className="text-slate-300 text-sm mt-0.5 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      {selectedCompany.jobs.length} active roles
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {selectedCompany.totalApplicants} applicants
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="grid grid-cols-1 gap-6">
                {selectedCompany.jobs.map((job) => {
                  const jobId = job?.id || job?.jobId;
                  const title = job?.jobTitle || job?.title || 'Job';
                  const adminNote = job?.adminNote ?? null;
                  const notesDisplay = adminNote || job?.instructions || job?.notes || null;
                  const driveDateStr = formatDriveDate(job);
                  const applicationCount = job?.applicationCount ?? job?.totalApplications ?? 0;
                  const isEditingThis = editingNoteJobId === jobId;

                  const handleSaveNote = async () => {
                    if (editingNoteJobId !== jobId) return;
                    setSavingNote(true);
                    try {
                      await api.patch(`/admin/jobs/${jobId}/note`, { note: editingNoteValue });
                      setSelectedCompany((prev) => ({
                        ...prev,
                        jobs: prev.jobs.map((j) =>
                          (j?.id || j?.jobId) === jobId ? { ...j, adminNote: editingNoteValue || null } : j
                        ),
                      }));
                      setEditingNoteJobId(null);
                      setEditingNoteValue('');
                      toast.success('Note updated');
                    } catch (e) {
                      toast.error('Failed to update note');
                    } finally {
                      setSavingNote(false);
                    }
                  };

                  return (
                    <div
                      key={jobId}
                      className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:border-gray-300 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 text-xs font-medium rounded border border-blue-100">
                              Active
                            </span>
                            <span className="text-gray-400 text-xs">Ref. {jobId.slice(-6).toUpperCase()}</span>
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>

                          <div className="flex flex-wrap gap-3 items-center text-sm text-gray-600">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              Drive: {driveDateStr}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                              {applicationCount} applicants
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`/admin/job/${jobId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                            title="View job description"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCompany(null);
                              navigate(`/admin/jobs/${jobId}/applications`);
                            }}
                            className="px-4 py-2 bg-blue-800 text-white rounded-md text-sm font-medium hover:bg-blue-900 transition-colors flex items-center gap-2"
                          >
                            <Users className="w-4 h-4" />
                            View applicants
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-md flex items-center justify-center flex-shrink-0 border border-amber-100">
                            <StickyNote className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-xs font-medium text-gray-500">Internal notes</h4>
                              {!isEditingThis && (
                                <button
                                  type="button"
                                  onClick={() => { setEditingNoteJobId(jobId); setEditingNoteValue(adminNote || ''); }}
                                  className="text-blue-800 hover:text-blue-900 text-xs font-medium flex items-center gap-1"
                                >
                                  <Pencil className="w-3 h-3" /> {adminNote ? 'Edit' : 'Add note'}
                                </button>
                              )}
                            </div>

                            {isEditingThis ? (
                              <div className="mt-2 space-y-2">
                                <textarea
                                  value={editingNoteValue}
                                  onChange={(e) => setEditingNoteValue(e.target.value)}
                                  placeholder="Add notes for your team…"
                                  className="w-full bg-gray-50 border border-gray-300 rounded-md p-3 text-sm focus:ring-1 focus:ring-blue-800 focus:border-blue-800 outline-none min-h-[80px]"
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={handleSaveNote}
                                    disabled={savingNote}
                                    className="px-3 py-1.5 bg-blue-800 text-white text-xs font-medium rounded-md disabled:opacity-50 flex items-center gap-1.5 hover:bg-blue-900"
                                  >
                                    {savingNote ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setEditingNoteJobId(null); setEditingNoteValue(''); }}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {notesDisplay || 'No internal notes added.'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-slate-100 bg-white text-center">
              <button 
                onClick={() => setSelectedCompany(null)}
                className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                Click outside to close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
