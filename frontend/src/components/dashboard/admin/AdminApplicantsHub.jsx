import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import { Search, ExternalLink, Users, Filter, X, Building2, FileText, Calendar, StickyNote, Pencil, Check } from 'lucide-react';
import CustomDropdown from '../../common/CustomDropdown';

function CompanyCardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-slate-200 p-4">
      <div className="h-5 w-48 bg-slate-200 rounded mb-2" />
      <div className="h-3 w-32 bg-slate-200 rounded mb-3" />
      <div className="mt-3 h-9 w-36 bg-slate-200 rounded" />
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
    search: '',
    status: '',
  });
  const [companiesPage, setCompaniesPage] = useState(1);
  const COMPANIES_PER_PAGE = 10;

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

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
          search: debouncedSearch || undefined,
        };

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

  const hasActiveFilters = useMemo(() => !!(filters.search || filters.status), [filters]);

  const resetFilters = () => {
    setFilters({ search: '', status: '' });
  };

  const companies = useMemo(() => groupJobsByCompany(jobs), [jobs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCompaniesPage(1);
  }, [debouncedSearch, filters.status]);

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
    <div className="space-y-4 sm:space-y-6 min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 p-4 sm:p-6 md:p-8 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-6 h-6 text-indigo-600" />
              Applicants Tracking
            </h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              Select a company to see all jobs posted by that company. Open a job to view JD, notes, drive date, and applicants.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Company name or job title"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                />
              </div>
            </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => <CompanyCardSkeleton key={idx} />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-12 text-center relative z-0">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <div className="text-slate-900 font-semibold text-lg mb-1">No companies found</div>
          <div className="text-slate-500 text-sm">
            {hasActiveFilters ? 'Try adjusting your search or filters.' : 'No companies with posted jobs at the moment.'}
          </div>
        </div>
      ) : (() => {
        const totalCompanies = companies.length;
        const totalPages = Math.max(1, Math.ceil(totalCompanies / COMPANIES_PER_PAGE));
        const currentPage = Math.min(Math.max(1, companiesPage), totalPages);
        const start = (currentPage - 1) * COMPANIES_PER_PAGE;
        const paginatedCompanies = companies.slice(start, start + COMPANIES_PER_PAGE);
        
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-0">
              {paginatedCompanies.map(({ companyName, jobs: companyJobs, totalApplicants }) => (
            <div
              key={companyName}
              onClick={() => setSelectedCompany({ companyName, jobs: companyJobs, totalApplicants })}
              className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-200 p-6 group cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-lg truncate group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    {companyName}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    {companyJobs.length} job{companyJobs.length !== 1 ? 's' : ''} posted
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">{totalApplicants}</span>
                  <span className="text-xs text-slate-500">applicant{totalApplicants !== 1 ? 's' : ''}</span>
                </div>
                <span className="inline-flex items-center gap-2 text-indigo-600 text-sm font-medium">
                  View jobs
                  <ExternalLink className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
            </div>

            {/* Pagination */}
            {totalCompanies > COMPANIES_PER_PAGE && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing {start + 1}–{Math.min(start + COMPANIES_PER_PAGE, totalCompanies)} of {totalCompanies} companies
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCompaniesPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCompaniesPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Company jobs modal */}
      {selectedCompany && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedCompany(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-sky-50 rounded-t-2xl">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2 min-w-0 truncate">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
                  <span className="truncate">{selectedCompany.companyName}</span>
                </h2>
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                {selectedCompany.jobs.length} job(s) • {selectedCompany.totalApplicants} total applicant(s)
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4">
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
                    } catch (e) {
                      console.error('Failed to save admin note:', e);
                      alert(e?.response?.data?.message || e?.message || 'Failed to save note');
                    } finally {
                      setSavingNote(false);
                    }
                  };

                  return (
                    <div
                      key={jobId}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="font-semibold text-slate-900 text-lg">{title}</h3>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          <Users className="w-3.5 h-3.5 inline mr-1" />
                          {applicationCount} applicant{applicationCount !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-start gap-2 sm:col-span-1">
                          <StickyNote className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-slate-500 block">Notes</span>
                            {isEditingThis ? (
                              <div className="mt-1 space-y-2">
                                <textarea
                                  value={editingNoteValue}
                                  onChange={(e) => setEditingNoteValue(e.target.value)}
                                  placeholder="Add a note about this drive..."
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm min-h-[60px]"
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleSaveNote}
                                    disabled={savingNote}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 text-white text-xs font-medium disabled:opacity-50"
                                  >
                                    <Check className="w-3 h-3" />
                                    Save
                                  </button>
                                  <button
                                    onClick={() => { setEditingNoteJobId(null); setEditingNoteValue(''); }}
                                    disabled={savingNote}
                                    className="px-2 py-1 rounded border border-slate-300 text-slate-700 text-xs font-medium"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-1 mt-0.5">
                                <span className="text-slate-700 line-clamp-2 flex-1">{notesDisplay || '—'}</span>
                                <button
                                  onClick={() => {
                                    setEditingNoteJobId(jobId);
                                    setEditingNoteValue(adminNote || '');
                                  }}
                                  className="flex-shrink-0 p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                                  title="Add or edit note"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <div>
                            <span className="text-xs font-medium text-slate-500 block">Drive date</span>
                            <span className="text-slate-700">{driveDateStr}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center sm:justify-end">
                          <a
                            href={`/admin/job/${jobId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-sm"
                          >
                            <FileText className="w-4 h-4" />
                            JD View
                          </a>
                          <button
                            onClick={() => {
                              setSelectedCompany(null);
                              navigate(`/admin/jobs/${jobId}/applications`);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-sm"
                          >
                            <Users className="w-4 h-4" />
                            View Applicants
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

