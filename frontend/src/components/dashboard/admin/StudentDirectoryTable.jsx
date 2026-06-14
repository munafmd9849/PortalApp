import React, { useMemo } from 'react';
import { Download, Edit3, Eye, FileSpreadsheet, Loader, Search, ShieldAlert, ShieldOff } from 'lucide-react';

const ACTIONS_WIDTH = 144;

const SR_WIDTH = 64;
const NAME_WIDTH = 220;

const ACTION_BTN =
  'p-2 rounded-xl border active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

const BADGE_STYLES = {
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  mint: 'bg-green-50 text-green-700 border border-green-100',
  yellow: 'bg-amber-50 text-amber-800 border border-amber-100',
  pink: 'bg-rose-50 text-rose-600 border border-rose-100',
  blue: 'bg-sky-50 text-sky-700 border border-sky-100',
  red: 'bg-red-50 text-red-700 border border-red-100',
  gray: 'bg-slate-100 text-slate-600 border border-slate-200',
};

function StatusBadge({ label, variant = 'gray' }) {
  if (!label || label === '--') {
    return <span className="text-slate-400 text-sm font-medium">--</span>;
  }
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${BADGE_STYLES[variant] || BADGE_STYLES.gray}`}
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

const MOCK_INTERVIEW_COLUMN = [
  { key: 'mockInterviews', label: 'Mock Interviews', minW: 120 },
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
  default: 'text-slate-700 font-medium',
  blue: 'text-indigo-600 font-semibold',
  green: 'text-emerald-600 font-semibold',
  lime: 'text-lime-600 font-semibold',
  orange: 'text-orange-600 font-semibold',
};

function headerClass(col) {
  return 'bg-slate-50 text-slate-700 border-slate-200/60';
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
  if (col.key === 'mockInterviews') {
    return (
      <span className="text-sm font-semibold text-slate-600 tabular-nums">
        {displayMock(row.mockInterviews)}
      </span>
    );
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
    <span className="text-sm text-slate-600 truncate block max-w-[200px]" title={val || ''}>
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
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onView?.(row)}
        className={`${ACTION_BTN} bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100`}
        title="View Full Profile in Sidebar"
      >
        <Eye className="w-4 h-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => onEdit?.(row)}
        disabled={!canModifyStudents?.() || operationLoading}
        className={`${ACTION_BTN} bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100`}
        title="Edit Student"
      >
        {operationLoading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <Edit3 className="w-4 h-4" strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        onClick={() => onBlock?.(row)}
        disabled={blockDisabled}
        className={`${ACTION_BTN} ${
          row.status === 'Blocked'
            ? 'bg-slate-700 hover:bg-slate-800 text-white border-slate-700'
            : 'bg-gray-50 hover:bg-gray-100 text-slate-700 border-gray-200'
        }`}
        title={blockTitle}
      >
        {operationLoading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : row.status === 'Blocked' ? (
          <ShieldOff className="w-4 h-4" strokeWidth={2} />
        ) : (
          <ShieldAlert className="w-4 h-4" strokeWidth={2} />
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
  onExportToSheets,
  sheetsExporting = false,
  onConfigureSheets,
  showSheetsConfig = false,
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
      ...MOCK_INTERVIEW_COLUMN,
      ...STATS_COLUMNS,
    ],
    [],
  );

  const stickyShadow = 'shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)]';
  const stickyHeaderCell =
    'sticky z-20 bg-slate-50 border-r border-slate-200/60 text-slate-400 uppercase tracking-wider font-semibold text-xs';
  const stickyBodyCell =
    'sticky z-20 bg-white group-hover:bg-slate-50 border-r border-slate-100 overflow-hidden align-middle';
  const scrollHeaderCell =
    'px-6 py-4 text-xs font-semibold whitespace-nowrap border-r border-slate-200/60 last:border-r-0 uppercase tracking-wider';
  const scrollBodyCell =
    'relative z-0 px-6 py-4 border-r border-slate-100 align-middle bg-white group-hover:bg-slate-50 text-slate-600';

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <p className="text-sm text-slate-500 font-medium font-outfit">
          Showing <span className="text-slate-800 font-bold">{showingCount}</span> of <span className="text-slate-800 font-bold">{totalCount}</span> Learners
        </p>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" strokeWidth={2} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />
          </div>
          <button
            type="button"
            onClick={onExportToSheets}
            disabled={sheetsExporting}
            className="p-2 border border-slate-200 rounded-xl text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 active:scale-95 transition-all bg-white disabled:opacity-50"
            title="Export to Google Sheets"
          >
            {sheetsExporting ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-5 h-5" />
            )}
          </button>
          {showSheetsConfig && (
            <button
              type="button"
              onClick={onConfigureSheets}
              className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
              title="Configure Google Sheets workbook"
            >
              Sheets setup
            </button>
          )}
          <button
            type="button"
            onClick={onExport}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-white hover:text-slate-900 hover:border-slate-300 active:scale-95 transition-all bg-white"
            title="Export CSV"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" style={{ minWidth: 1520 }}>
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th
                className={`${stickyHeaderCell} left-0 px-6 py-4 text-center font-outfit`}
                style={{ width: SR_WIDTH, minWidth: SR_WIDTH }}
              >
                Sr. No
              </th>
              <th
                className={`${stickyHeaderCell} px-6 py-4 font-outfit ${stickyShadow}`}
                style={{ left: SR_WIDTH, width: NAME_WIDTH, minWidth: NAME_WIDTH }}
              >
                Name
              </th>
              {allScrollColumns.map((col) => (
                <th
                  key={col.key}
                  className={`${scrollHeaderCell} font-outfit ${headerClass(col)}`}
                  style={{ minWidth: col.minW }}
                >
                  {col.label}
                </th>
              ))}
              <th
                className="sticky right-0 z-20 bg-slate-50 px-6 py-4 text-xs font-semibold text-slate-400 border-l border-slate-200/60 text-center font-outfit uppercase tracking-wider shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]"
                style={{ width: ACTIONS_WIDTH, minWidth: ACTIONS_WIDTH }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="group hover:bg-slate-50/70 transition-colors"
              >
                <td
                  className={`${stickyBodyCell} left-0 px-6 py-4 text-sm text-slate-500 text-center font-medium`}
                  style={{ width: SR_WIDTH, minWidth: SR_WIDTH }}
                >
                  {formatSrNo(row.srNo)}
                </td>
                <td
                  className={`${stickyBodyCell} px-6 py-4 ${stickyShadow}`}
                  style={{ left: SR_WIDTH, width: NAME_WIDTH, minWidth: NAME_WIDTH }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-indigo-50 flex-shrink-0">
                      {getInitials(row.fullName || row.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className="font-bold text-slate-800 text-sm truncate"
                        title={row.fullName || row.email}
                      >
                        {row.fullName || '—'}
                      </h4>
                      {row.enrollmentId && (
                        <span className="text-xs text-slate-400 block truncate" title={row.enrollmentId}>
                          ID: {row.enrollmentId}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                {allScrollColumns.map((col) => (
                  <td
                    key={col.key}
                    className={scrollBodyCell}
                    style={{ minWidth: col.minW }}
                  >
                    {cellContent(row, col)}
                  </td>
                ))}
                <td
                  className={`${stickyBodyCell} right-0 px-6 py-4 border-l border-slate-100 text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]`}
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
