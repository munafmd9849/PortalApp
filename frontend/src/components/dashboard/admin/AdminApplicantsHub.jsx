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

  const selectedLabel = value || 'All Companies';

  useEffect(() => {
    const onOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  return (
    <div className="relative w-full sm:w-72" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-indigo-300 transition-all"
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="truncate">{selectedLabel}</span>
        </span>
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search companies..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); setQuery(''); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 ${!value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'}`}
              >
                All Companies
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400">No companies match</li>
            ) : (
              filtered.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => { onChange(name); setOpen(false); setQuery(''); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 truncate ${value === name ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'}`}
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
    <div className="animate-pulse bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-slate-200 rounded-xl" />
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
    { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
    { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    { bg: 'bg-sky-100', text: 'text-sky-600', border: 'border-sky-200' },
    { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-200' }
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
    <div className="space-y-6 min-h-screen bg-[#f8fafc] p-4 sm:p-6 md:p-8 font-outfit">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Applicants <span className="text-indigo-600">Hub</span>
          </h1>
        </div>
      </div>

      {/* Control Bar (Filters) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 w-full">
          <CompanyFilterDropdown
            companies={allCompanies}
            value={filters.company}
            onChange={(company) => setFilters({ company })}
          />
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="p-2.5 bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all shrink-0 self-end sm:self-auto"
              title="Clear filter"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      {error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8" />
          </div>
          <h3 className="text-rose-900 font-bold text-lg">Failed to Load Data</h3>
          <p className="text-rose-600 mt-1 max-w-md mx-auto">{error}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, idx) => <CompanyCardSkeleton key={idx} />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10" />
          </div>
          <h3 className="text-slate-900 font-bold text-xl">No Companies Found</h3>
          <p className="text-slate-500 mt-2">Adjust your filters or try a different search term</p>
          <button onClick={resetFilters} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200">
            Reset All Filters
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
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5 text-indigo-400" />
                    </div>

                    <div className="flex items-center gap-4 mb-5">
                      <div className={`w-14 h-14 ${theme.bg} ${theme.text} ${theme.border} border-2 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner`}>
                        {theme.initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 text-base truncate leading-tight group-hover:text-indigo-600 transition-colors">
                          {companyName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[10px] uppercase tracking-widest mt-1">
                          <Briefcase className="w-3 h-3" />
                          {companyJobs.length} Positions
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total Applicants</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-base font-bold text-slate-900">{totalApplicants}</span>
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                      </div>
                      <button className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                        Review
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Premium Pagination */}
            {totalCompanies > COMPANIES_PER_PAGE && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-6 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Showing <span className="text-slate-900">{start + 1}–{Math.min(start + COMPANIES_PER_PAGE, totalCompanies)}</span> of <span className="text-slate-900">{totalCompanies}</span> Companies
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCompaniesPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCompaniesPage(i + 1)}
                        className={`w-9 h-9 rounded-xl font-bold text-xs transition-all ${
                          currentPage === i + 1 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCompaniesPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5" />
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
          onClick={() => setSelectedCompany(null)}
        >
          <div
            className="bg-white rounded-[32px] shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-slate-200 to-indigo-200 text-slate-900 relative border-b border-indigo-300 shadow-md">
              <button
                onClick={() => setSelectedCompany(null)}
                className="absolute top-6 right-8 w-10 h-10 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center transition-all shadow-sm"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
              
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white border border-indigo-200 rounded-[22px] flex items-center justify-center font-semibold text-2xl text-indigo-600 shadow-sm">
                  {getCompanyTheme(selectedCompany.companyName).initials}
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{selectedCompany.companyName}</h2>
                  <div className="flex items-center gap-4 mt-1 text-slate-500 font-semibold tracking-wide uppercase text-[10px]">
                    <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-indigo-500" /> {selectedCompany.jobs.length} Active Openings</span>
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-indigo-500" /> {selectedCompany.totalApplicants} Total Candidates</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
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
                      className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-indigo-200 transition-all"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-semibold uppercase tracking-widest rounded-full border border-indigo-100">
                              Active Job
                            </span>
                            <span className="text-slate-400 text-[10px] font-semibold">#{jobId.slice(-6).toUpperCase()}</span>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 tracking-tight mb-2">{title}</h3>
                          
                          <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="text-[11px] font-semibold text-slate-600">Drive: <span className="text-slate-900">{driveDateStr}</span></span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100">
                              <Users className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="text-[11px] font-semibold text-indigo-700">{applicationCount} Applicants</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <a
                            href={`/admin/job/${jobId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl transition-all shadow-sm"
                            title="JD View"
                          >
                            <FileText className="w-5 h-5" />
                          </a>
                          <button
                            onClick={() => {
                              setSelectedCompany(null);
                              navigate(`/admin/jobs/${jobId}/applications`);
                            }}
                            className="flex-1 lg:flex-none px-6 py-3.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-2xl font-semibold text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-3"
                          >
                            <Users className="w-4 h-4" />
                            View Candidates
                          </button>
                        </div>
                      </div>

                      {/* Admin Notes Section */}
                      <div className="mt-6 pt-6 border-t border-dashed border-slate-200">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <StickyNote className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrative Notes</h4>
                              {!isEditingThis && (
                                <button
                                  onClick={() => { setEditingNoteJobId(jobId); setEditingNoteValue(adminNote || ''); }}
                                  className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
                                >
                                  <Pencil className="w-3 h-3" /> {adminNote ? 'Edit' : 'Add Note'}
                                </button>
                              )}
                            </div>
                            
                            {isEditingThis ? (
                              <div className="mt-2 space-y-3">
                                <textarea
                                  value={editingNoteValue}
                                  onChange={(e) => setEditingNoteValue(e.target.value)}
                                  placeholder="Type notes for the admin team..."
                                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[100px]"
                                />
                                <div className="flex gap-2">
                                    <button
                                      onClick={handleSaveNote}
                                      disabled={savingNote}
                                      className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-2 hover:bg-indigo-100"
                                    >
                                      {savingNote ? <Loader className="w-3 h-3 animate-spin text-indigo-400" /> : <Check className="w-3 h-3 text-indigo-500" />}
                                      Save Note
                                    </button>
                                  <button
                                    onClick={() => { setEditingNoteJobId(null); setEditingNoteValue(''); }}
                                    className="px-4 py-2 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-xl"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                                {notesDisplay || 'No administrative notes added yet.'}
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
