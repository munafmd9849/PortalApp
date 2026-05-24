import React, { useMemo } from 'react';
import { ImEye } from 'react-icons/im';
import { FaEdit, FaSearch } from 'react-icons/fa';
import { MdBlock } from 'react-icons/md';
import { Download, Loader } from 'lucide-react';

const ACTIONS_WIDTH = 120;

const SR_WIDTH = 52;
const NAME_WIDTH = 168;

const BADGE_STYLES = {
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  mint: 'bg-green-50 text-green-700 border border-green-100',
  yellow: 'bg-amber-50 text-amber-800 border border-amber-100',
  pink: 'bg-rose-50 text-rose-600 border border-rose-100',
  blue: 'bg-sky-50 text-sky-700 border border-sky-100',
  red: 'bg-red-50 text-red-700 border border-red-100',
  gray: 'bg-gray-100 text-gray-600 border border-gray-200',
};

function StatusBadge({ label, variant = 'gray' }) {
  if (!label || label === '--') {
    return <span className="text-gray-400 text-sm">--</span>;
  }
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${BADGE_STYLES[variant] || BADGE_STYLES.gray}`}
    >
      {label}
    </span>
  );
}

const BASIC_COLUMNS = [
  { key: 'email', label: 'Email', minW: 200 },
  { key: 'program', label: 'Program', minW: 140 },
  { key: 'cohort', label: 'Cohort', minW: 160 },
  { key: 'currentLocation', label: 'Current Location', minW: 130 },
  { key: 'contactNumber', label: 'Contact Number', minW: 130 },
  { key: 'csStatus', label: 'CS Status', minW: 110, badge: 'csStatus' },
  { key: 'activation', label: 'Activation', minW: 100, badge: 'activation' },
];

const AI_MOCK_COLUMNS = [
  { key: 'aiMock1', label: 'AI Mock 1', minW: 88 },
  { key: 'aiMock2', label: 'AI Mock 2', minW: 88 },
];

const SME_MOCK_COLUMNS = [
  { key: 'smeMock1', label: 'SME Mock 1', minW: 96 },
  { key: 'smeMock2', label: 'SME Mock 2', minW: 96 },
];

const STATS_COLUMNS = [
  { key: 'placementStatus', label: 'Placement Status', minW: 120, badge: 'placementStatus' },
  { key: 'jobsAssigned', label: 'Jobs Assigned', minW: 108, metric: 'default' },
  { key: 'eligibleJobs', label: 'Eligible Jobs', minW: 100, metric: 'default' },
  { key: 'jobsApplied', label: 'Jobs Applied', minW: 100, metric: 'blue' },
  { key: 'appliedClosed', label: 'Applied (Closed)', minW: 118, metric: 'green' },
  { key: 'noShows', label: 'No-Shows', minW: 88, metric: 'lime' },
  { key: 'unapplied', label: 'Unapplied', minW: 96, metric: 'orange' },
];

const METRIC_TEXT = {
  default: 'text-gray-900',
  blue: 'text-blue-600 font-medium',
  green: 'text-emerald-600 font-medium',
  lime: 'text-lime-600 font-medium',
  orange: 'text-orange-600 font-medium',
};

function headerClass(col) {
  if (col.group === 'ai') return 'bg-violet-100 text-violet-900';
  if (col.group === 'sme') return 'bg-sky-100 text-sky-900';
  return 'bg-slate-50 text-slate-700';
}

function formatSrNo(n) {
  if (n == null) return '--';
  return String(n).padStart(2, '0');
}

function displayMock(val) {
  if (val == null || val === '' || val === '—' || val === '-') return '--';
  return val;
}

function cellContent(row, col) {
  if (col.badge === 'csStatus') {
    return <StatusBadge label={row.csStatus?.label} variant={row.csStatus?.variant} />;
  }
  if (col.badge === 'activation') {
    return <StatusBadge label={row.activation?.label} variant={row.activation?.variant} />;
  }
  if (col.badge === 'placementStatus') {
    return <StatusBadge label={row.placementStatus?.label} variant={row.placementStatus?.variant} />;
  }
  if (col.key === 'aiMock1' || col.key === 'aiMock2' || col.key === 'smeMock1' || col.key === 'smeMock2') {
    return <span className="text-sm text-gray-500">{displayMock(row[col.key])}</span>;
  }
  if (col.metric) {
    const val = row[col.key];
    const display = val === 0 || val ? val : '-';
    return (
      <span className={`text-sm tabular-nums ${METRIC_TEXT[col.metric]}`}>{display}</span>
    );
  }
  const val = row[col.key];
  return (
    <span className="text-sm text-gray-800 truncate block max-w-[200px]" title={val || ''}>
      {val || '—'}
    </span>
  );
}

function RowActions({
  row,
  operationLoading,
  canModifyStudents,
  isSuperAdmin,
  onView,
  onEdit,
  onBlock,
}) {
  const blockDisabled =
    !canModifyStudents?.() ||
    operationLoading ||
    (row.status === 'Blocked' && row.blockInfo?.type === 'permanent' && !isSuperAdmin?.());

  const blockTitle =
    row.status === 'Blocked' && row.blockInfo?.type === 'permanent' && !isSuperAdmin?.()
      ? 'Permanently blocked — only Super Admin can unblock'
      : row.status === 'Blocked'
        ? 'Unblock Student'
        : 'Block Student';

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onView?.(row)}
        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all border border-blue-200 hover:border-blue-300"
        title="View Student Profile"
      >
        <ImEye className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onEdit?.(row)}
        disabled={!canModifyStudents?.() || operationLoading}
        className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        title="Edit Student"
      >
        {operationLoading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <FaEdit className="w-4 h-4" />
        )}
      </button>
      <button
        type="button"
        onClick={() => onBlock?.(row)}
        disabled={blockDisabled}
        className={`p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
          row.status === 'Blocked'
            ? 'bg-gray-500 hover:bg-gray-600 text-white'
            : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white'
        }`}
        title={blockTitle}
      >
        {operationLoading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <MdBlock className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

export default function StudentDirectoryTable({
  rows = [],
  showingCount = 0,
  totalCount = 0,
  searchQuery = '',
  onSearchChange,
  onExport,
  operationLoading = false,
  canModifyStudents,
  isSuperAdmin,
  onView,
  onEdit,
  onBlock,
}) {
  const allScrollColumns = useMemo(
    () => [
      ...BASIC_COLUMNS,
      ...AI_MOCK_COLUMNS.map((c) => ({ ...c, group: 'ai' })),
      ...SME_MOCK_COLUMNS.map((c) => ({ ...c, group: 'sme' })),
      ...STATS_COLUMNS,
    ],
    [],
  );

  const stickyShadow = 'shadow-[4px_0_6px_-2px_rgba(0,0,0,0.08)]';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Toolbar — matches reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
        <p className="text-sm text-gray-600">
          Showing (
          <span className="font-medium text-gray-800">{showingCount}</span>
          {' of '}
          <span className="font-medium text-gray-800">{totalCount}</span>
          {' Learners)'}
        </p>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative flex-1 sm:w-56">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search Candid..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            />
          </div>
          <button
            type="button"
            onClick={onExport}
            className="flex-shrink-0 p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            title="Export"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" style={{ minWidth: 1520 }}>
          <thead>
            <tr className="border-b border-gray-200">
              <th
                className="sticky left-0 z-30 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 border-r border-gray-200 text-center"
                style={{ width: SR_WIDTH, minWidth: SR_WIDTH }}
              >
                Sr No.
              </th>
              <th
                className={`sticky z-30 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 border-r border-gray-200 ${stickyShadow}`}
                style={{ left: SR_WIDTH, width: NAME_WIDTH, minWidth: NAME_WIDTH }}
              >
                Name
              </th>
              {allScrollColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-r border-gray-200 last:border-r-0 ${headerClass(col)}`}
                  style={{ minWidth: col.minW }}
                >
                  {col.label}
                </th>
              ))}
              <th
                className="sticky right-0 z-30 bg-slate-50 px-2 py-2.5 text-xs font-semibold text-slate-700 border-l border-gray-200 text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.08)]"
                style={{ width: ACTIONS_WIDTH, minWidth: ACTIONS_WIDTH }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="group border-b border-gray-100 hover:bg-slate-50/80 transition-colors"
              >
                <td
                  className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-3 py-3 text-sm text-gray-600 text-center border-r border-gray-100"
                  style={{ width: SR_WIDTH, minWidth: SR_WIDTH }}
                >
                  {formatSrNo(row.srNo)}
                </td>
                <td
                  className={`sticky z-10 bg-white group-hover:bg-slate-50 px-3 py-3 border-r border-gray-100 ${stickyShadow}`}
                  style={{ left: SR_WIDTH, width: NAME_WIDTH, minWidth: NAME_WIDTH }}
                >
                  <span
                    className="text-sm font-bold text-gray-900 truncate block"
                    title={row.fullName}
                  >
                    {row.fullName || '—'}
                  </span>
                </td>
                {allScrollColumns.map((col) => (
                  <td
                    key={col.key}
                    className="px-3 py-3 border-r border-gray-50 align-middle bg-white group-hover:bg-slate-50"
                    style={{ minWidth: col.minW }}
                  >
                    {cellContent(row, col)}
                  </td>
                ))}
                <td
                  className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 px-2 py-2 border-l border-gray-100 align-middle shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.08)]"
                  style={{ width: ACTIONS_WIDTH, minWidth: ACTIONS_WIDTH }}
                >
                  <RowActions
                    row={row}
                    operationLoading={operationLoading}
                    canModifyStudents={canModifyStudents}
                    isSuperAdmin={isSuperAdmin}
                    onView={onView}
                    onEdit={onEdit}
                    onBlock={onBlock}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
