import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Search, Download, Info } from 'lucide-react';
import CustomDropdown from '../../common/CustomDropdown';
import { fetchPlacementSummary, fetchStudentsWithScores } from '../../../services/adminReadiness';
import { fetchAcademicOptions, buildStandardFilterOptions } from '../../../utils/academicOptions';

const VALUE_COLORS = {
  green: 'text-emerald-600 font-semibold',
  red: 'text-red-600 font-semibold',
  amber: 'text-amber-600 font-semibold',
  blue: 'text-blue-600 font-semibold',
  gray: 'text-gray-600 font-semibold',
};

/**
 * Reference-style metric card: light blue tile, dark border on hover, white breakdown popover below.
 */
function HoverMetricCard({ label, value, breakdown, variant = 'blue', className = '' }) {
  const [hovered, setHovered] = useState(false);
  const hasBreakdown = breakdown && breakdown.length > 0;

  const bgMap = {
    blue: 'bg-[#dceaf7]',
    green: 'bg-[#dff3e4]',
    purple: 'bg-[#e8dff5]',
  };

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => hasBreakdown && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`
          rounded-lg px-4 py-3 min-h-[88px] flex flex-col justify-center transition-all duration-150
          ${bgMap[variant] || bgMap.blue}
          ${hovered && hasBreakdown ? 'ring-2 ring-gray-700 ring-offset-1 cursor-pointer' : 'border border-transparent'}
          ${hasBreakdown ? 'cursor-pointer' : ''}
        `}
      >
        <p className="text-[11px] sm:text-xs text-gray-600 font-medium leading-tight pr-1">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 tabular-nums">{value ?? '—'}</p>
      </div>

      {hovered && hasBreakdown && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1.5 min-w-[220px] bg-white rounded-md border border-gray-200 shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-2.5 px-3.5 animate-in fade-in duration-150"
          role="tooltip"
        >
          {breakdown.map((item, idx) => (
            <div
              key={item.label}
              className={`flex items-center justify-between gap-6 py-1.5 text-sm ${idx < breakdown.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <span className="text-gray-600 whitespace-nowrap">{item.label}</span>
              <span className={VALUE_COLORS[item.color] || 'text-gray-900 font-semibold tabular-nums'}>
                {item.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-base font-semibold text-gray-800 mb-3 tracking-tight">{children}</h2>
  );
}

function ScorePill({ score, tier }) {
  const colors = {
    ready: 'text-emerald-700',
    developing: 'text-amber-700',
    at_risk: 'text-red-700',
    high: 'text-emerald-700',
    medium: 'text-blue-700',
    low: 'text-gray-600',
  };
  return (
    <span className={`font-bold tabular-nums ${colors[tier] || 'text-gray-800'}`}>
      {score != null ? `${score}%` : '—'}
    </span>
  );
}

export default function PlacementAnalytics() {
  const [filters, setFilters] = useState({ center: '', school: '', batch: '' });
  const [academicFilters, setAcademicFilters] = useState({ centers: [], schools: [], batches: [] });
  const [tableSchool, setTableSchool] = useState('');
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortBy, setSortBy] = useState('readiness');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadAcademic = async () => {
      try {
        const raw = await fetchAcademicOptions();
        setAcademicFilters(buildStandardFilterOptions(raw));
      } catch (e) {
        console.error('PlacementAnalytics: failed to load academic filters', e);
      }
    };
    loadAcademic();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filterParams = useMemo(() => {
    const p = {};
    if (filters.center) p.center = filters.center;
    if (filters.school) p.school = filters.school;
    if (filters.batch) p.batch = filters.batch;
    if (appliedSearch) p.search = appliedSearch;
    return p;
  }, [filters, appliedSearch]);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      setSummary(await fetchPlacementSummary(filterParams));
    } catch (e) {
      console.error('Placement summary error:', e);
    } finally {
      setLoadingSummary(false);
    }
  }, [filterParams]);

  const loadStudents = useCallback(async () => {
    setLoadingTable(true);
    try {
      const params = { ...filterParams, page, limit: 25, sortBy, sortDir: 'desc' };
      if (tableSchool) params.school = tableSchool;
      const data = await fetchStudentsWithScores(params);
      setStudents(data.students || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (e) {
      console.error('Placement students error:', e);
    } finally {
      setLoadingTable(false);
    }
  }, [filterParams, page, sortBy, tableSchool]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadStudents(); }, [loadStudents]);

  const o = summary?.overview || {};
  const pipeline = summary?.jobPipeline || {};
  const dist = o.readinessDistribution || { ready: 0, developing: 0, at_risk: 0 };
  const closed = summary?.closedDrivesBreakdown || { total: 0, items: [] };
  const schoolRows = summary?.schoolOverview || [];
  const recruiters = summary?.recruiterOverview || { totalJobs: 0, managers: [] };

  const poolBreakdown = [
    { label: 'Active', count: o.activeStudents ?? 0, color: 'green' },
    { label: 'Inactive / blocked', count: o.inactiveStudents ?? 0, color: 'gray' },
    { label: 'Profile complete', count: o.profileCompleted ?? 0, color: 'blue' },
    { label: 'With resume', count: o.withResume ?? 0, color: 'blue' },
  ];

  const applicationsBreakdown = [
    { label: 'Shortlisted', count: o.shortlistedApps ?? 0, color: 'green' },
    { label: 'OA cleared', count: o.oaClearedApps ?? 0, color: 'blue' },
    { label: 'Transitions', count: o.transitionsCount ?? 0, color: 'amber' },
    { label: 'Placed students', count: o.placedStudents ?? 0, color: 'green' },
  ];

  const readinessBreakdown = [
    { label: 'Ready (≥75%)', count: dist.ready, color: 'green' },
    { label: 'Developing', count: dist.developing, color: 'amber' },
    { label: 'At risk', count: dist.at_risk, color: 'red' },
  ];

  const closedItems = closed.items?.length
    ? closed.items
    : [
        { label: 'Selected / Offered', count: 0, color: 'green' },
        { label: 'Rejected', count: 0, color: 'red' },
      ];

  const handleExportCsv = () => {
    const headers = ['Name', 'Email', 'Center', 'School', 'CGPA', 'Readiness', 'Probability', 'Applied', 'Shortlisted', 'Offers'];
    const rows = students.map((s) => [
      s.fullName, s.email, s.center, s.school, s.cgpa,
      s.placementReadiness?.score, s.placementProbability?.score,
      s.statsApplied, s.statsShortlisted, s.statsOffers,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `placement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="min-h-full bg-[#f4f6f8] p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Placement Opportunities</h1>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Live data from students, jobs, applications & interviews — hover cards for breakdown
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!students.length}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Global filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CustomDropdown
            label="Center"
            options={[{ id: '', name: 'All Centers' }, ...academicFilters.centers]}
            value={filters.center}
            onChange={(v) => { setFilters((f) => ({ ...f, center: v })); setPage(1); }}
          />
          <CustomDropdown
            label="School"
            options={[{ id: '', name: 'All Schools' }, ...academicFilters.schools]}
            value={filters.school}
            onChange={(v) => { setFilters((f) => ({ ...f, school: v })); setPage(1); }}
          />
          <CustomDropdown
            label="Batch"
            options={[{ id: '', name: 'All Batches' }, ...academicFilters.batches]}
            value={filters.batch}
            onChange={(v) => { setFilters((f) => ({ ...f, batch: v })); setPage(1); }}
          />
        </div>

        {loadingSummary ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* —— Overview (row 1) —— */}
            <section>
              <SectionTitle>Overview</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                <HoverMetricCard label="Total Student Pool" value={o.totalStudents} breakdown={poolBreakdown} />
                <HoverMetricCard label="Active Student Pool" value={o.activeStudents} breakdown={poolBreakdown} />
                <HoverMetricCard label="Inactive Student Pool" value={o.inactiveStudents} breakdown={poolBreakdown} />
                <HoverMetricCard label="Companies Onboarded" value={o.companiesOnboarded} />
                <HoverMetricCard label="JDs Announced" value={o.jobsPosted} />
                <HoverMetricCard label="Open Positions" value={o.openJobs} />
                <HoverMetricCard label="Applications Shared" value={o.totalApplications} breakdown={applicationsBreakdown} />
                <HoverMetricCard label="Transitions" value={o.transitionsCount} breakdown={applicationsBreakdown} />
              </div>
            </section>

            {/* —— Drive status (row 2) —— */}
            <section>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                <HoverMetricCard label="Active" value={pipeline.active} variant="blue" />
                <HoverMetricCard label="Hold" value={pipeline.hold} variant="blue" />
                <HoverMetricCard label="In Process" value={pipeline.inProcess} variant="blue" />
                <HoverMetricCard label="Yet to Start" value={pipeline.yetToStart} variant="blue" />
                <HoverMetricCard
                  label="Closed Drives"
                  value={pipeline.closed || closed.total}
                  breakdown={closedItems}
                />
                <HoverMetricCard
                  label="Learner Not Applied"
                  value={pipeline.notApplied ?? o.studentsNotApplied}
                  breakdown={[
                    { label: 'Zero applications', count: o.studentsNotApplied ?? 0, color: 'amber' },
                    { label: 'Active pool', count: o.activeStudents ?? 0, color: 'gray' },
                  ]}
                />
                <HoverMetricCard label="Not Deliverable" value={pipeline.notDeliverable} variant="blue" />
              </div>
            </section>

            {/* —— School overview (CR-style) —— */}
            <section>
              <SectionTitle>School-wise overview</SectionTitle>
              <div className="flex flex-wrap gap-2.5 items-stretch">
                <div className="rounded-lg px-5 py-3 min-w-[140px] bg-[#e8dff5] min-h-[88px] flex flex-col justify-center">
                  <p className="text-xs text-gray-600 font-medium">Avg readiness</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{o.avgReadiness ?? 0}%</p>
                </div>
                <HoverMetricCard
                  className="min-w-[160px] flex-1 max-w-[200px]"
                  label="Readiness tiers"
                  value={dist.ready + dist.developing + dist.at_risk}
                  breakdown={readinessBreakdown}
                  variant="purple"
                />
                {schoolRows.map((row) => (
                  <HoverMetricCard
                    key={row.school}
                    className="min-w-[130px] flex-1 max-w-[180px]"
                    label={row.school}
                    value={row.students}
                    variant="green"
                    breakdown={[
                      { label: 'Applications', count: row.applications, color: 'blue' },
                      { label: 'Placed', count: row.placed, color: 'green' },
                      { label: 'Ready (profile + applied)', count: row.ready, color: 'green' },
                      { label: 'Targeted jobs', count: row.jobs, color: 'gray' },
                    ]}
                  />
                ))}
              </div>
            </section>

            {/* —— Recruiter overview —— */}
            {recruiters.managers?.length > 0 && (
              <section>
                <SectionTitle>Recruiter overview</SectionTitle>
                <div className="flex flex-wrap gap-2.5">
                  <div className="rounded-lg px-5 py-3 bg-[#e8dff5] min-w-[140px] min-h-[88px] flex flex-col justify-center">
                    <p className="text-xs text-gray-600 font-medium">Jobs posted</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{recruiters.totalJobs}</p>
                  </div>
                  {recruiters.managers.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-lg px-4 py-3 bg-[#dff3e4] min-w-[120px] min-h-[88px] flex flex-col justify-center"
                    >
                      <p className="text-[11px] text-gray-600 font-medium truncate max-w-[140px]" title={m.name}>
                        {m.name}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{m.jobsPosted}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* —— Detailed analysis table —— */}
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <SectionTitle>School-wise detailed analysis</SectionTitle>
            <div className="flex flex-wrap gap-2 items-center mt-2">
              <CustomDropdown
                label=""
                options={[{ id: '', name: 'All Schools' }, ...academicFilters.schools]}
                value={tableSchool}
                onChange={(v) => { setTableSchool(v); setPage(1); }}
                placeholder="Select school"
              />
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search student"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="py-2 px-3 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="readiness">Sort: Readiness</option>
                <option value="probability">Sort: Probability</option>
              </select>
            </div>
          </div>

          {loadingTable ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#c5d9e8] text-gray-800">
                    <th className="px-3 py-2.5 text-left font-semibold border border-[#b0c9db]">Student</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-[#b0c9db]">School</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-[#b0c9db]">Center</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-[#b0c9db]">CGPA</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-[#b0c9db]">Readiness</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-[#b0c9db]">Probability</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-[#b0c9db]">Applied</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-[#b0c9db]">Shortlisted</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-[#b0c9db]">Offers</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-[#b0c9db]">Yet to apply</th>
                    <th className="px-3 py-2.5 text-left font-semibold border border-[#b0c9db]">In process</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-gray-500 border border-gray-200">
                        No students match filters
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => {
                      const applied = s.statsApplied ?? 0;
                      const yetToApply = applied === 0 ? 1 : 0;
                      const inProcess = (s.statsShortlisted ?? 0) > 0 && (s.statsOffers ?? 0) === 0 ? 1 : 0;
                      return (
                        <tr key={s.id} className="hover:bg-sky-50/60 bg-white">
                          <td className="px-3 py-2 border border-gray-200">
                            <div className="font-medium text-gray-900">{s.fullName}</div>
                            <div className="text-[11px] text-gray-500">{s.email}</div>
                          </td>
                          <td className="px-3 py-2 border border-gray-200">{s.school}</td>
                          <td className="px-3 py-2 border border-gray-200">{s.center}</td>
                          <td className="px-3 py-2 border border-gray-200 font-mono">{s.cgpa ?? '—'}</td>
                          <td className="px-3 py-2 border border-gray-200">
                            <ScorePill score={s.placementReadiness?.score} tier={s.placementReadiness?.tier} />
                          </td>
                          <td className="px-3 py-2 border border-gray-200">
                            <ScorePill score={s.placementProbability?.score} tier={s.placementProbability?.tier} />
                          </td>
                          <td className="px-3 py-2 border border-gray-200 text-center tabular-nums">{applied}</td>
                          <td className="px-3 py-2 border border-gray-200 text-center tabular-nums">{s.statsShortlisted ?? 0}</td>
                          <td className="px-3 py-2 border border-gray-200 text-center tabular-nums">{s.statsOffers ?? 0}</td>
                          <td className="px-3 py-2 border border-gray-200 text-center tabular-nums">{yetToApply}</td>
                          <td className="px-3 py-2 border border-gray-200 text-center tabular-nums">{inProcess}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm bg-gray-50">
              <span className="text-gray-600">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} students
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-gray-300 rounded bg-white disabled:opacity-40 text-sm"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border border-gray-300 rounded bg-white disabled:opacity-40 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
