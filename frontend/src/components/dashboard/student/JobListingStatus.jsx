import { Briefcase, CheckCircle, Loader, XCircle } from 'lucide-react';

/** Grid columns: company, title, salary, date, status */
export const JOB_LISTING_GRID_COLS =
  'minmax(0,1.15fr) minmax(0,1.15fr) minmax(0,0.75fr) minmax(0,0.9fr) minmax(88px,104px)';

const statusPill =
  'inline-flex items-center justify-center gap-0.5 w-full max-w-[104px] px-1.5 py-1 rounded-md text-[10px] sm:text-[11px] leading-tight font-medium border text-center';

const applyBtn =
  'w-full max-w-[104px] min-h-[28px] px-2 py-1 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 border border-transparent bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-colors touch-manipulation';

const applyBtnMobile =
  'w-full min-h-[30px] px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 border border-transparent bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-colors touch-manipulation';

export function JobListingStatus({
  isApplied,
  isApplying,
  deadlinePassed,
  notEligible,
  onApply,
  title = '',
  mobile = false,
}) {
  const iconCls = 'h-3 w-3 flex-shrink-0';

  if (isApplied) {
    return (
      <span className={`${statusPill} bg-green-50 text-green-700 border-green-200`} title={title}>
        <CheckCircle className={iconCls} />
        <span className="whitespace-normal leading-tight">Applied</span>
      </span>
    );
  }

  if (isApplying) {
    return (
      <span className={`${statusPill} bg-blue-50 text-blue-700 border-blue-200`} title={title}>
        <Loader className={`${iconCls} animate-spin`} />
        <span className="whitespace-normal leading-tight">Applying</span>
      </span>
    );
  }

  if (deadlinePassed) {
    return (
      <span className={`${statusPill} bg-gray-50 text-gray-500 border-gray-200`} title={title}>
        <XCircle className={iconCls} />
        <span className="whitespace-normal leading-tight">Deadline passed</span>
      </span>
    );
  }

  if (notEligible) {
    return (
      <span className={`${statusPill} bg-gray-50 text-gray-500 border-gray-200`} title={title}>
        <XCircle className={iconCls} />
        <span className="whitespace-normal leading-tight">Not eligible</span>
      </span>
    );
  }

  return (
    <button type="button" onClick={onApply} className={mobile ? applyBtnMobile : applyBtn} title={title}>
      <Briefcase className={iconCls} />
      Apply
    </button>
  );
}
