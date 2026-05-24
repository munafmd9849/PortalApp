import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loader2, Search, Download, AlertCircle, Briefcase, Users, BarChart3 } from 'lucide-react';
import HoverStatCard from './HoverStatCard';
import CustomDropdown from '../../common/CustomDropdown';
import {
  fetchJobOpportunitiesOverview,
  fetchCardBreakdown,
  fetchCrManagers,
  fetchMomTable,
  fetchJobOpportunitiesFilterOptions,
} from '../../../services/jobOpportunities';

const EMBED_BORDERS = ['border-blue-200', 'border-green-200', 'border-purple-200', 'border-red-200'];

function SectionBar({ title, embedded, icon: Icon = Briefcase }) {
  if (embedded) {
    return (
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
          <Icon className="w-5 h-5 mr-2 text-blue-600" />
          {title}
        </h2>
      </div>
    );
  }
  return (
    <div className="bg-[#c5d9e8] px-4 py-2 rounded-t-md border border-[#b0c9db] border-b-0">
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
    </div>
  );
}

function StaticStatCard({ label, value, variant = 'blue', embedded = false, accentIndex = 0 }) {
  if (embedded) {
    const border = EMBED_BORDERS[accentIndex % EMBED_BORDERS.length];
    return (
      <div className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${border} hover:shadow-md transition-all duration-300`}>
        <p className="text-sm text-gray-600">{label}</p>
        <h3 className="text-2xl font-bold text-gray-800 mt-2 tabular-nums">{value ?? 0}</h3>
      </div>
    );
  }
  const bg = { blue: 'bg-[#dceaf7]', green: 'bg-[#dff3e4]', purple: 'bg-[#e8dff5]' };
  return (
    <div className={`rounded-md px-3 py-3 min-h-[88px] border-2 border-[#9ec5e8] shadow-sm flex flex-col justify-center ${bg[variant]}`}>
      <p className="text-xs text-gray-700 font-medium leading-tight">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums mt-1">{value ?? 0}</p>
    </div>
  );
}

const EMPTY_OVERVIEW = {
  row1: {
    totalCsPool: 0, activeCsPool: 0, inactiveCsPool: 0, companiesOnboarded: 0,
    jdsAnnounced: 0, openPositions: 0, applicationsShared: 0, transitions: 0,
  },
  row2: {
    active: 0, hold: 0, inProcess: 0, yetToStart: 0, closedDrives: 0,
    learnerNotApplied: 0, notDeliverable: 0,
  },
};

/** Job Opportunities block — use embedded on Admin Dashboard or standalone page */
export function JobOpportunitiesSection({ embedded = false }) {
  const [filterOpts, setFilterOpts] = useState({ segments: [], quarters: [], months: [], crManagers: [] });
  const [filters, setFilters] = useState({
    segment: '',
    quarter: '',
    month: '',
    crManager: '',
    search: '',
  });
  const [appliedSearch, setAppliedSearch] = useState('');
  const [overview, setOverview] = useState(null);
  const [crData, setCrData] = useState(null);
  const [momRows, setMomRows] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const breakdownCacheEpoch = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(filters.search), 400);
    return () => clearTimeout(t);
  }, [filters.search]);

  const queryParams = useMemo(() => {
    const p = {};
    if (filters.segment) p.segment = filters.segment;
    if (filters.quarter) p.quarter = filters.quarter;
    if (filters.month) p.month = filters.month;
    if (filters.crManager) p.crManager = filters.crManager;
    if (appliedSearch) p.search = appliedSearch;
    return p;
  }, [filters.segment, filters.quarter, filters.month, filters.crManager, appliedSearch]);

  const filterCacheKey = JSON.stringify(queryParams);

  useEffect(() => {
    breakdownCacheEpoch.current += 1;
  }, [filterCacheKey]);

  useEffect(() => {
    fetchJobOpportunitiesFilterOptions().then(setFilterOpts).catch(console.error);
  }, []);

  const loadAll = useCallback(async () => {
    setLoadingOverview(true);
    setLoadingTable(true);
    setLoadError(null);
    try {
      const [ov, cr, mom] = await Promise.all([
        fetchJobOpportunitiesOverview(queryParams),
        fetchCrManagers(queryParams),
        fetchMomTable(queryParams),
      ]);
      setOverview(ov?.row1 ? ov : EMPTY_OVERVIEW);
      setCrData(cr || { jdsPunched: 0, managers: [] });
      setMomRows(mom?.rows || []);
    } catch (e) {
      console.error('Job opportunities load error:', e);
      setLoadError(
        e?.response?.data?.error
        || e?.message
        || 'Could not load dashboard data. Restart the backend server and ensure you are logged in as Admin.',
      );
      setOverview(EMPTY_OVERVIEW);
      setCrData({ jdsPunched: 0, managers: [] });
      setMomRows([]);
    } finally {
      setLoadingOverview(false);
      setLoadingTable(false);
    }
  }, [queryParams]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadBreakdown = useCallback(
    async (cardKey) => {
      const epoch = breakdownCacheEpoch.current;
      const data = await fetchCardBreakdown(cardKey, queryParams);
      if (epoch !== breakdownCacheEpoch.current) throw new Error('stale');
      return data;
    },
    [queryParams],
  );

  const r1 = overview?.row1 || EMPTY_OVERVIEW.row1;
  const r2 = overview?.row2 || EMPTY_OVERVIEW.row2;

  const exportCsv = () => {
    const headers = [
      'CR Manager', 'Segment', 'Goal', 'Closed Drives', 'Achieved %',
      'Companies', 'Jobs', 'Transitions', 'Yet To Start', 'Hold', 'In Process', 'Not Applied', 'Not Deliverable',
    ];
    const lines = momRows.map((row) => [
      row.crManager, row.segment, row.goal, row.closedDrives, row.achievedGoalPct,
      row.companies, row.jobs, row.transitions, row.yetToStart, row.hold, row.inProcess, row.notApplied, row.notDeliverable,
    ]);
    const csv = [headers, ...lines].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `job-opportunities-mom-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const groupedMom = useMemo(() => {
    const map = new Map();
    momRows.forEach((row) => {
      if (!map.has(row.crManager)) map.set(row.crManager, []);
      map.get(row.crManager).push(row);
    });
    return map;
  }, [momRows]);

  const content = (
    <>
        {!embedded && (
          <header>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Job Opportunities</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track Your Institute&apos;s Activity &amp; Performance at Glance
            </p>
          </header>
        )}

        {embedded && (
          <div className="relative">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Job Opportunities</h2>
            <p className="text-sm text-gray-500 mt-0.5">Track your institute&apos;s activity &amp; performance at a glance</p>
            <div className="absolute -bottom-1 left-0 w-32 h-0.5 bg-gradient-to-r from-blue-500 to-transparent" />
          </div>
        )}

        {loadError && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={loadAll}
              className="px-3 py-1.5 bg-amber-800 text-white rounded-md text-xs font-medium hover:bg-amber-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Overview */}
        <section className={embedded ? 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible' : 'bg-white rounded-md border border-[#b0c9db] shadow-sm overflow-visible'}>
          <SectionBar title="Overview" embedded={embedded} icon={BarChart3} />
          <div className={`relative space-y-4 min-h-[200px] ${embedded ? 'p-4 sm:p-6' : 'p-3 space-y-2.5 bg-[#eef4fa] border border-[#b0c9db] border-t-0 rounded-b-md'}`}>
            {loadingOverview && (
              <div className={`absolute inset-0 z-10 flex items-center justify-center rounded-b-xl ${embedded ? 'bg-white/80' : 'bg-[#eef4fa]/80'}`}>
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StaticStatCard embedded={embedded} accentIndex={0} label="Total CS Pool" value={r1.totalCsPool} />
              <StaticStatCard embedded={embedded} accentIndex={1} label="Active CS Pool" value={r1.activeCsPool} />
              <StaticStatCard embedded={embedded} accentIndex={2} label="Inactive CS Pool" value={r1.inactiveCsPool} />
              <StaticStatCard embedded={embedded} accentIndex={3} label="Companies Onboarded" value={r1.companiesOnboarded} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StaticStatCard embedded={embedded} accentIndex={0} label="JDs Announced" value={r1.jdsAnnounced} />
              <StaticStatCard embedded={embedded} accentIndex={1} label="Open Positions" value={r1.openPositions} />
              <HoverStatCard
                embedded={embedded}
                accentIndex={2}
                key={`apps-${filterCacheKey}`}
                label="Applications Shared"
                value={r1.applicationsShared}
                cardKey="applications_shared"
                loadBreakdown={loadBreakdown}
              />
              <HoverStatCard
                embedded={embedded}
                accentIndex={3}
                key={`trans-${filterCacheKey}`}
                label="Transitions"
                value={r1.transitions}
                cardKey="transitions"
                loadBreakdown={loadBreakdown}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StaticStatCard embedded={embedded} accentIndex={0} label="Active" value={r2.active} />
              <StaticStatCard embedded={embedded} accentIndex={1} label="Hold" value={r2.hold} />
              <StaticStatCard embedded={embedded} accentIndex={2} label="In Process" value={r2.inProcess} />
              <StaticStatCard embedded={embedded} accentIndex={3} label="Yet to Start" value={r2.yetToStart} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <HoverStatCard
                embedded={embedded}
                accentIndex={0}
                key={`closed-${filterCacheKey}`}
                label="Closed Drives"
                value={r2.closedDrives}
                cardKey="closed_drives"
                loadBreakdown={loadBreakdown}
              />
              <StaticStatCard embedded={embedded} accentIndex={1} label="Learner Not Applied" value={r2.learnerNotApplied} />
              <StaticStatCard embedded={embedded} accentIndex={2} label="Not Deliverable" value={r2.notDeliverable} />
            </div>
          </div>
        </section>

        {/* CR Managers */}
        <section className={embedded ? 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' : 'bg-white rounded-md border border-[#b0c9db] shadow-sm overflow-hidden'}>
          <SectionBar title="CR Managers Overview" embedded={embedded} icon={Users} />
          <div className={embedded ? 'p-4 sm:p-6' : 'p-3 bg-[#eef4fa] border border-[#b0c9db] border-t-0 rounded-b-md'}>
            {loadingOverview ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto my-6 text-blue-600" />
            ) : (
              <div className="flex flex-wrap gap-4">
                <div className="bg-purple-50 rounded-lg p-4 text-center min-w-[130px] flex-1 max-w-[200px]">
                  <div className="text-sm text-purple-600 font-medium">JDs Punched</div>
                  <div className="text-2xl font-bold text-purple-700 mt-1 tabular-nums">{crData?.jdsPunched ?? 0}</div>
                </div>
                {(crData?.managers || []).map((m, i) => (
                  <div
                    key={m.id}
                    className={`rounded-lg p-4 text-center min-w-[110px] flex-1 max-w-[180px] ${
                      i % 2 === 0 ? 'bg-green-50' : 'bg-blue-50'
                    }`}
                  >
                    <div className={`text-sm font-medium truncate ${i % 2 === 0 ? 'text-green-600' : 'text-blue-600'}`} title={m.name}>
                      {m.name}
                    </div>
                    <div className={`text-2xl font-bold mt-1 tabular-nums ${i % 2 === 0 ? 'text-green-700' : 'text-blue-700'}`}>
                      {m.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* MoM Table */}
        <section className={embedded ? 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' : 'bg-white rounded-md border border-[#b0c9db] shadow-sm overflow-hidden'}>
          <SectionBar title="CR Manager wise MoM Detailed Analysis" embedded={embedded} icon={BarChart3} />
          <div className={`space-y-3 ${embedded ? 'p-4 sm:p-6' : 'p-3 border border-[#b0c9db] border-t-0 bg-white rounded-b-md'}`}>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="w-40">
                <CustomDropdown
                  label="Select Segments"
                  options={[
                    { value: '', label: 'All Segments' },
                    ...filterOpts.segments.map((s) => ({ value: s, label: s })),
                  ]}
                  value={filters.segment}
                  onChange={(v) => setFilters((f) => ({ ...f, segment: v }))}
                />
              </div>
              <div className="w-36">
                <CustomDropdown
                  label="Select Quarter"
                  options={[
                    { value: '', label: 'All Quarters' },
                    ...(filterOpts.quarters || []).map((q) => ({
                      value: q.id || q.value,
                      label: q.name || q.label,
                    })),
                  ]}
                  value={filters.quarter}
                  onChange={(v) => setFilters((f) => ({ ...f, quarter: v, month: v ? '' : f.month }))}
                />
              </div>
              <div className="w-36">
                <CustomDropdown
                  label="Select Month"
                  options={[
                    { value: '', label: 'All Months' },
                    ...(filterOpts.months || []).map((m) => ({
                      value: m.id || m.value,
                      label: m.name || m.label,
                    })),
                  ]}
                  value={filters.month}
                  onChange={(v) => setFilters((f) => ({ ...f, month: v, quarter: v ? '' : f.quarter }))}
                />
              </div>
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-8 w-4 h-4 text-gray-400" />
                <label className="block text-xs font-medium text-gray-600 mb-1">Search Cr Manager</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Search..."
                />
              </div>
              <button
                type="button"
                onClick={exportCsv}
                disabled={!momRows.length}
                className="ml-auto p-2.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
                title="Export CSV"
              >
                <Download className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {loadingTable ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-700" />
              </div>
            ) : (
              <div className={`overflow-x-auto rounded-lg border ${embedded ? 'border-gray-200' : 'border-[#b0c9db]'}`}>
                <table className="min-w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className={embedded ? 'bg-blue-50 text-gray-800' : 'bg-[#c5d9e8] text-gray-900'}>
                      {[
                        'CR Manager', 'Segment', 'Goal', 'Closed Drives', 'Achieved Goal %',
                        'Companies', 'Jobs', 'Transitions', 'Yet To Start', 'Hold', 'In Process', 'Not Applied', 'Not Deliverable',
                      ].map((h) => (
                        <th key={h} className={`px-2 py-2 text-left font-semibold border whitespace-nowrap ${embedded ? 'border-gray-200' : 'border-[#b0c9db]'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {momRows.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="text-center py-10 text-gray-500 border border-gray-200">
                          No data for selected filters
                        </td>
                      </tr>
                    ) : (
                      [...groupedMom.entries()].map(([manager, rows]) =>
                        rows.map((row, idx) => (
                          <tr key={`${row.crManagerId}-${row.segment}`} className="bg-white hover:bg-sky-50/50">
                            {idx === 0 ? (
                              <td
                                rowSpan={rows.length}
                                className="px-2 py-2 border border-gray-200 font-medium text-gray-900 align-top bg-gray-50/80"
                              >
                                {manager}
                              </td>
                            ) : null}
                            <td className="px-2 py-2 border border-gray-200">{row.segment}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.goal}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">
                              <span className="inline-flex items-center gap-1">
                                {row.closedDrives}
                                {row.closedDrives > 0 && (
                                  <AlertCircle className="w-3.5 h-3.5 text-gray-400" title="From closed pipeline records" />
                                )}
                              </span>
                            </td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.achievedGoalPct}%</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.companies}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.jobs}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.transitions}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.yetToStart}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.hold}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.inProcess}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.notApplied}</td>
                            <td className="px-2 py-2 border border-gray-200 text-center tabular-nums">{row.notDeliverable}</td>
                          </tr>
                        )),
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
    </>
  );

  if (embedded) {
    return <div className="space-y-5 w-full">{content}</div>;
  }

  return (
    <div className="min-h-full bg-[#eef1f4] p-4 md:p-6">
      <div className="max-w-[1680px] mx-auto space-y-5">{content}</div>
    </div>
  );
}

export default function JobOpportunitiesDashboard() {
  return <JobOpportunitiesSection embedded={false} />;
}
