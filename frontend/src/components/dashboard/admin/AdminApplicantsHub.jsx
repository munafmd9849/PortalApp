import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { Search, ExternalLink, Users, Filter } from 'lucide-react';
import { SCHOOL_OPTIONS, BATCH_OPTIONS, CENTER_OPTIONS } from '../../../constants/academics';
import CustomDropdown from '../../common/CustomDropdown';
import { FaBriefcase, FaGraduationCap, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';

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
  const [filters, setFilters] = useState({
    jobType: '', // 'Internship' or 'Full-Time'
    center: '',
    school: '',
    batch: ''
  });

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

  // Extract unique centers, schools and batches from jobs for filter dropdowns
  const uniqueCenters = useMemo(() => {
    const centers = new Set();
    jobs.forEach(job => {
      try {
        const targetCenters = job?.targetCenters 
          ? (typeof job.targetCenters === 'string' ? JSON.parse(job.targetCenters) : job.targetCenters)
          : [];
        if (Array.isArray(targetCenters)) {
          targetCenters.forEach(center => {
            if (center && center !== 'ALL') {
              centers.add(center);
            }
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
    return Array.from(centers);
  }, [jobs]);

  const uniqueSchools = useMemo(() => {
    const schools = new Set();
    jobs.forEach(job => {
      try {
        const targetSchools = job?.targetSchools 
          ? (typeof job.targetSchools === 'string' ? JSON.parse(job.targetSchools) : job.targetSchools)
          : [];
        if (Array.isArray(targetSchools)) {
          targetSchools.forEach(school => {
            if (school && school !== 'ALL') {
              schools.add(school);
            }
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
    return Array.from(schools).sort();
  }, [jobs]);

  const uniqueBatches = useMemo(() => {
    const batches = new Set();
    jobs.forEach(job => {
      try {
        const targetBatches = job?.targetBatches 
          ? (typeof job.targetBatches === 'string' ? JSON.parse(job.targetBatches) : job.targetBatches)
          : [];
        if (Array.isArray(targetBatches)) {
          targetBatches.forEach(batch => {
            if (batch && batch !== 'ALL') {
              batches.add(batch);
            }
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
    return Array.from(batches).sort();
  }, [jobs]);

  // Build filter options like StudentDirectory
  const filterCenterOptions = useMemo(() => {
    const merged = [...CENTER_OPTIONS];
    uniqueCenters.forEach((center) => {
      if (!merged.some(option => option.id === center)) {
        merged.push({ id: center, name: center });
      }
    });
    return merged;
  }, [uniqueCenters]);

  const filterSchoolOptions = useMemo(() => {
    const merged = [...SCHOOL_OPTIONS];
    uniqueSchools.forEach((school) => {
      if (!merged.some(option => option.id === school)) {
        merged.push({ id: school, name: school });
      }
    });
    return merged;
  }, [uniqueSchools]);

  const filterBatchOptions = useMemo(() => {
    const merged = [...BATCH_OPTIONS];
    uniqueBatches.forEach((batch) => {
      if (!merged.some(option => option.id === batch)) {
        merged.push({ id: batch, name: batch });
      }
    });
    return merged;
  }, [uniqueBatches]);

  const filtered = useMemo(() => {
    let result = jobs;

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((j) => {
        const title = (j?.jobTitle || j?.title || '').toLowerCase();
        const company = (j?.companyName || j?.company?.name || '').toLowerCase();
        return title.includes(q) || company.includes(q);
      });
    }

    // Job Type filter
    if (filters.jobType) {
      result = result.filter((j) => {
        const jobType = j?.jobType || '';
        return jobType === filters.jobType;
      });
    }

    // Center filter
    if (filters.center) {
      result = result.filter((j) => {
        try {
          const targetCenters = j?.targetCenters 
            ? (typeof j.targetCenters === 'string' ? JSON.parse(j.targetCenters) : j.targetCenters)
            : [];
          if (Array.isArray(targetCenters)) {
            return targetCenters.includes('ALL') || targetCenters.includes(filters.center);
          }
          return false;
        } catch (e) {
          return false;
        }
      });
    }

    // School filter
    if (filters.school) {
      result = result.filter((j) => {
        try {
          const targetSchools = j?.targetSchools 
            ? (typeof j.targetSchools === 'string' ? JSON.parse(j.targetSchools) : j.targetSchools)
            : [];
          if (Array.isArray(targetSchools)) {
            return targetSchools.includes('ALL') || targetSchools.includes(filters.school);
          }
          return false;
        } catch (e) {
          return false;
        }
      });
    }

    // Batch filter
    if (filters.batch) {
      result = result.filter((j) => {
        try {
          const targetBatches = j?.targetBatches 
            ? (typeof j.targetBatches === 'string' ? JSON.parse(j.targetBatches) : j.targetBatches)
            : [];
          if (Array.isArray(targetBatches)) {
            return targetBatches.includes('ALL') || targetBatches.includes(filters.batch);
          }
          return false;
        } catch (e) {
          return false;
        }
      });
    }

    return result;
  }, [jobs, search, filters]);

  return (
    <div className="space-y-6 min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 -m-8 p-8">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-6">
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

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs by title or company"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Filters */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Filters & Search</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Job Type Filter */}
              <CustomDropdown
                label="Job Type"
                icon={FaBriefcase}
                iconColor="text-blue-600"
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'Internship', label: 'Internship' },
                  { value: 'Full-Time', label: 'Job (Full-Time)' }
                ]}
                value={filters.jobType}
                onChange={(value) => setFilters(prev => ({ ...prev, jobType: value || '' }))}
                placeholder="All Types"
              />

              {/* Center Filter */}
              <CustomDropdown
                label="Center"
                icon={FaMapMarkerAlt}
                iconColor="text-indigo-600"
                options={filterCenterOptions.map(opt => ({ value: opt.id, label: opt.name }))}
                value={filters.center}
                onChange={(value) => setFilters(prev => ({ ...prev, center: value || '' }))}
                placeholder="All Centers"
              />

              {/* School Filter */}
              <CustomDropdown
                label="School"
                icon={FaGraduationCap}
                iconColor="text-purple-600"
                options={filterSchoolOptions.map(opt => ({ value: opt.id, label: opt.id }))}
                value={filters.school}
                onChange={(value) => setFilters(prev => ({ ...prev, school: value || '' }))}
                placeholder="All Schools"
              />

              {/* Batch Filter */}
              <CustomDropdown
                label="Batch"
                icon={FaCalendarAlt}
                iconColor="text-green-600"
                options={filterBatchOptions.map(opt => ({ value: opt.id, label: opt.id }))}
                value={filters.batch}
                onChange={(value) => setFilters(prev => ({ ...prev, batch: value || '' }))}
                placeholder="All Batches"
              />
            </div>
            {/* Clear Filters Button */}
            {(filters.jobType || filters.center || filters.school || filters.batch) && (
              <button
                onClick={() => setFilters({ jobType: '', center: '', school: '', batch: '' })}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow"
              >
                Reset Filters
              </button>
            )}
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

