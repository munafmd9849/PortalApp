import React from 'react';
import { Star } from 'lucide-react';

const DIMENSION_STYLES = [
  { accent: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', ring: 'stroke-violet-500' },
  { accent: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', ring: 'stroke-indigo-500' },
  { accent: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100', ring: 'stroke-sky-500' },
  { accent: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', ring: 'stroke-emerald-500' },
  { accent: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', ring: 'stroke-amber-500' },
  { accent: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', ring: 'stroke-rose-500' },
  { accent: 'text-fuchsia-600', bg: 'bg-fuchsia-50', border: 'border-fuchsia-100', ring: 'stroke-fuchsia-500' },
];

function StarRow({ value, max = 5 }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value;
        return (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${filled ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`}
          />
        );
      })}
    </div>
  );
}

function ScoreRing({ value, max = 5, ringClass }) {
  const pct = Math.min(100, Math.round(((value || 0) / max) * 100));
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative w-11 h-11 shrink-0">
      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100" />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={ringClass}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 tabular-nums">
        {value}
      </span>
    </div>
  );
}

export default function MockInterviewRatingsGrid({
  ratings = [],
  compact = false,
  showSummary = true,
}) {
  if (!ratings.length) {
    return (
      <p className="text-sm text-slate-400 font-medium py-6 text-center border border-dashed border-slate-200 rounded-2xl">
        No rating breakdown available.
      </p>
    );
  }

  const avg =
    ratings.reduce((a, r) => a + (r.value || 0), 0) / Math.max(1, ratings.length);
  const avgPct = Math.round((avg / 5) * 100);

  return (
    <div className="space-y-5">
      {showSummary ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Interviewer ratings</p>
            <p className="text-sm font-medium text-slate-600 mt-0.5">Average across {ratings.length} dimensions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{avg.toFixed(1)}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">out of 5.0</p>
            </div>
            <div className="h-10 w-px bg-indigo-200" />
            <p className="text-xl font-bold text-indigo-600 tabular-nums">{avgPct}%</p>
          </div>
        </div>
      ) : null}

      <div
        className={
          compact
            ? 'grid gap-3 sm:grid-cols-2'
            : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }
      >
        {ratings.map((r, idx) => {
          const style = DIMENSION_STYLES[idx % DIMENSION_STYLES.length];
          const max = r.max ?? 5;
          return (
            <div
              key={r.key || r.label}
              className={`rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${style.bg} ${style.border}`}
            >
              <div className="flex items-start gap-3">
                <ScoreRing value={r.value} max={max} ringClass={style.ring} />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold leading-snug ${style.accent}`}>{r.label}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
                    {r.value}
                    <span className="text-sm font-semibold text-slate-400">/{max}</span>
                  </p>
                  <div className="mt-2">
                    <StarRow value={r.value} max={max} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
