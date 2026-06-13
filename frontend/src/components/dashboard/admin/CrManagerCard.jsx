import React, { useState } from 'react';

const VALUE_COLORS = {
  green: 'text-emerald-700',
  red: 'text-red-700',
  amber: 'text-amber-700',
  blue: 'text-sky-700',
  gray: 'text-slate-600',
};

const STATUS_BADGE = {
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red-100 text-red-800',
  amber: 'bg-amber-100 text-amber-800',
  gray: 'bg-slate-100 text-slate-700',
  blue: 'bg-sky-100 text-sky-800',
};

/**
 * Admin stat card with hover breakdown (reference dashboard style).
 */
export default function CrManagerCard({
  name,
  value,
  breakdown = [],
  variant = 'manager',
  popoverAlign = 'start',
  adminStatusLabel,
}) {
  const [hovered, setHovered] = useState(false);

  const isPurple = variant === 'jds';
  const cardClass = isPurple
    ? 'rounded-md px-3 py-3 min-h-[88px] min-w-[120px] flex-1 flex flex-col justify-center border-2 border-[#c4b5dc] bg-[#e8dff5] shadow-sm'
    : `rounded-md px-3 py-3 min-h-[88px] min-w-[110px] flex-1 flex flex-col justify-center border-2 shadow-sm cursor-pointer transition-all duration-200 ${
        hovered ? 'border-emerald-400 ring-2 ring-emerald-200/60' : 'border-[#a8d4b4] bg-[#dff3e4]'
      }`;

  const valueClass = isPurple ? 'text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums mt-1' : 'text-2xl sm:text-3xl font-bold text-emerald-900 tabular-nums mt-1';

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cardClass}>
        <p className="text-xs text-gray-700 font-medium leading-tight truncate" title={name}>
          {name}
        </p>
        <p className={valueClass}>{value ?? 0}</p>
        {!isPurple && adminStatusLabel && (
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">{adminStatusLabel}</p>
        )}
      </div>

      {!isPurple && hovered && breakdown.length > 0 && (
        <div
          className={`absolute z-[100] min-w-[260px] max-w-[300px] top-full mt-1
            bg-white rounded-lg border border-gray-200 shadow-lg py-2 px-3
            opacity-0 translate-y-1 animate-[crPopoverIn_0.2s_ease-out_forwards]
            ${popoverAlign === 'end' ? 'right-0 left-auto' : 'left-0'}`}
          role="tooltip"
        >
          <p className="text-xs font-semibold text-gray-800 mb-2 pb-1 border-b border-gray-100 truncate" title={name}>
            {name}
          </p>
          {breakdown.map((item, idx) => (
            <div
              key={item.label}
              className={`flex justify-between gap-4 py-1.5 text-sm ${idx < breakdown.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <span className="text-gray-600 shrink-0">{item.label}</span>
              {item.value != null ? (
                <span className={`font-semibold px-2 py-0.5 rounded text-xs ${STATUS_BADGE[item.color] || STATUS_BADGE.gray}`}>
                  {item.value}
                </span>
              ) : (
                <span className={`font-semibold tabular-nums ${VALUE_COLORS[item.color] || 'text-gray-900'}`}>
                  {item.count ?? 0}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes crPopoverIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
