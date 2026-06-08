import React from 'react';
import {
  Briefcase,
  Eye,
  History,
  Loader,
  Mail,
  Search,
  ShieldAlert,
  ShieldOff,
} from 'lucide-react';

const ACTIONS_WIDTH = 200;
const SR_WIDTH = 64;
const COMPANY_WIDTH = 220;

const ACTION_BTN =
  'p-2 rounded-xl border active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

const SCROLL_COLUMNS = [
  { key: 'recruiterName', label: 'Recruiter', minW: 160 },
  { key: 'email', label: 'Email', minW: 200 },
  { key: 'location', label: 'Location', minW: 140 },
  { key: 'lastJobPostedAt', label: 'Last Job Posted', minW: 150 },
  { key: 'status', label: 'Status', minW: 110, badge: 'status' },
];

function StatusBadge({ status }) {
  const norm = String(status || 'ACTIVE').toUpperCase();
  if (norm === 'BLOCKED') {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-100">
        Blocked
      </span>
    );
  }
  return (
    <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-100">
      Active
    </span>
  );
}

function formatSrNo(n) {
  if (n == null) return '--';
  return String(n).padStart(2, '0');
}

function getInitials(name) {
  if (!name) return 'RC';
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function cellContent(row, col) {
  if (col.badge === 'status') {
    return <StatusBadge status={row.status} />;
  }
  const val = row[col.key];
  return (
    <span className="text-sm text-slate-600 truncate block max-w-[220px]" title={val || ''}>
      {val || '—'}
    </span>
  );
}

function RowActions({
  row,
  canSendMail,
  isSuperAdmin,
  blockLoading,
  onMail,
  onViewJobs,
  onBlock,
  onHistory,
}) {
  const isBlocked = String(row.status || '').toUpperCase() === 'BLOCKED';

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onMail?.(row)}
        disabled={!canSendMail}
        className={`${ACTION_BTN} bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100`}
        title="Send Mail"
      >
        <Mail className="w-4 h-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => onViewJobs?.(row)}
        className={`${ACTION_BTN} bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100`}
        title="View Job Descriptions"
      >
        <Eye className="w-4 h-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => onBlock?.(row)}
        disabled={!isSuperAdmin || blockLoading}
        className={`${ACTION_BTN} ${
          isBlocked
            ? 'bg-slate-500 hover:bg-slate-600 text-white border-slate-600'
            : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100'
        }`}
        title={isBlocked ? 'Unblock Recruiter' : 'Block Recruiter (Super Admin only)'}
      >
        {blockLoading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : isBlocked ? (
          <ShieldOff className="w-4 h-4" strokeWidth={2} />
        ) : (
          <ShieldAlert className="w-4 h-4" strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        onClick={() => onHistory?.(row)}
        className={`${ACTION_BTN} bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100`}
        title="View History"
      >
        <History className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}

export default function RecruiterDirectoryTable({
  rows = [],
  showingCount = 0,
  totalCount = 0,
  searchQuery = '',
  onSearchChange,
  canSendMail = false,
  isSuperAdmin = false,
  operationLoading = {},
  onMail,
  onViewJobs,
  onBlock,
  onHistory,
}) {
  const stickyShadow = 'shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)]';
  const stickyHeaderCell =
    'sticky z-20 bg-slate-50 border-r border-slate-200/60 text-slate-400 uppercase tracking-wider font-semibold text-xs';
  const stickyBodyCell =
    'sticky z-20 bg-white group-hover:bg-slate-50 border-r border-slate-100 overflow-hidden align-middle';
  const scrollHeaderCell =
    'px-6 py-4 text-xs font-semibold whitespace-nowrap border-r border-slate-200/60 last:border-r-0 uppercase tracking-wider bg-slate-50 text-slate-400';
  const scrollBodyCell =
    'relative z-0 px-6 py-4 border-r border-slate-100 align-middle bg-white group-hover:bg-slate-50 text-slate-600';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <p className="text-sm text-slate-500 font-medium font-outfit">
          Showing <span className="text-slate-800 font-bold">{showingCount}</span> of{' '}
          <span className="text-slate-800 font-bold">{totalCount}</span> Recruiters
        </p>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search recruiters..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" style={{ minWidth: 1100 }}>
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
                style={{ left: SR_WIDTH, width: COMPANY_WIDTH, minWidth: COMPANY_WIDTH }}
              >
                Company
              </th>
              {SCROLL_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`${scrollHeaderCell} font-outfit`}
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
              <tr key={row.id} className="group hover:bg-slate-50/70 transition-colors">
                <td
                  className={`${stickyBodyCell} left-0 px-6 py-4 text-sm text-slate-500 text-center font-medium`}
                  style={{ width: SR_WIDTH, minWidth: SR_WIDTH }}
                >
                  {formatSrNo(row.srNo)}
                </td>
                <td
                  className={`${stickyBodyCell} px-6 py-4 ${stickyShadow}`}
                  style={{ left: SR_WIDTH, width: COMPANY_WIDTH, minWidth: COMPANY_WIDTH }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-indigo-50 flex-shrink-0">
                      {getInitials(row.companyName || row.recruiterName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className="font-bold text-slate-800 text-sm truncate"
                        title={row.companyName}
                      >
                        {row.companyName || '—'}
                      </h4>
                      <span className="text-xs text-slate-400 flex items-center gap-1 truncate">
                        <Briefcase className="w-3 h-3 flex-shrink-0" />
                        {row.totalJobPostings ?? 0} jobs
                      </span>
                    </div>
                  </div>
                </td>
                {SCROLL_COLUMNS.map((col) => (
                  <td key={col.key} className={scrollBodyCell} style={{ minWidth: col.minW }}>
                    {cellContent(row, col)}
                  </td>
                ))}
                <td
                  className={`${stickyBodyCell} right-0 px-6 py-4 border-l border-slate-100 text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]`}
                  style={{ width: ACTIONS_WIDTH, minWidth: ACTIONS_WIDTH }}
                >
                  <RowActions
                    row={row}
                    canSendMail={canSendMail}
                    isSuperAdmin={isSuperAdmin}
                    blockLoading={!!operationLoading[`block_${row.id}`]}
                    onMail={onMail}
                    onViewJobs={onViewJobs}
                    onBlock={onBlock}
                    onHistory={onHistory}
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
