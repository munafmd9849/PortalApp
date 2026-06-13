import React, { useState } from 'react';

const STAGE_TONES = {
  applied: { card: 'bg-sky-50 border-sky-200', value: 'text-slate-800' },
  shortlisted: { card: 'bg-amber-50 border-amber-200', value: 'text-amber-800' },
  interviewed: { card: 'bg-indigo-50 border-indigo-200', value: 'text-indigo-800' },
  offered: { card: 'bg-emerald-50 border-emerald-200', value: 'text-emerald-800' },
  joined: { card: 'bg-green-50 border-green-200', value: 'text-green-800' },
};

/**
 * Overview-style funnel card — fixed size; details in hover popover (like Job Opportunities).
 */
export default function FunnelStatCard({
  label,
  count = 0,
  pctOfEligible = 0,
  drop = 0,
  stageKey = 'applied',
  popoverAlign = 'start',
}) {
  const [hovered, setHovered] = useState(false);
  const styles = STAGE_TONES[stageKey] || STAGE_TONES.applied;

  return (
    <div
      className="relative flex-1 min-w-[110px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`rounded-md px-3 py-3 min-h-[88px] border-2 shadow-sm flex flex-col justify-center transition-all duration-200 ${
          styles.card
        } ${hovered ? 'ring-2 ring-slate-400/40' : ''} cursor-pointer`}
      >
        <p className="text-xs text-gray-700 font-medium leading-tight">{label}</p>
        <p className={`text-2xl sm:text-3xl font-bold tabular-nums mt-1 ${styles.value}`}>{count}</p>
      </div>

      {hovered && (
        <div
          className={`absolute z-[100] min-w-[220px] top-full mt-1
            bg-white rounded-lg border border-gray-200 shadow-lg py-2 px-3
            opacity-0 translate-y-1 animate-[funnelPopoverIn_0.2s_ease-out_forwards]
            ${popoverAlign === 'end' ? 'right-0 left-auto' : 'left-0'}`}
          role="tooltip"
        >
          <p className="text-xs font-semibold text-gray-800 mb-1">{label}</p>
          <p className="text-xs text-gray-600 tabular-nums">
            {count} · {pctOfEligible}% of eligible · −{drop} drop
          </p>
        </div>
      )}

      <style>{`
        @keyframes funnelPopoverIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
