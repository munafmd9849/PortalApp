import React from 'react';
import { Activity } from 'lucide-react';

export const STAT_ICON_BOX = {
  indigo: 'bg-indigo-50 border-indigo-100',
  emerald: 'bg-emerald-50 border-emerald-100',
  amber: 'bg-amber-50 border-amber-100',
  purple: 'bg-purple-50 border-purple-100',
  violet: 'bg-violet-50 border-violet-100',
};

export const STAT_ICON_COLOR = {
  indigo: 'text-indigo-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  purple: 'text-purple-600',
  violet: 'text-violet-600',
};

const FEEDBACK_RATING_FIELDS = [
  'communication',
  'confidence',
  'technicalSkills',
  'problemSolving',
  'bodyLanguage',
  'resumeKnowledge',
  'overallPerformance',
];

export function feedbackScorePercent(feedback) {
  if (!feedback) return null;
  const values = FEEDBACK_RATING_FIELDS.map((key) => feedback[key]).filter(
    (v) => typeof v === 'number' && v > 0
  );
  if (!values.length) return null;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(avg * 20);
}

export function aiInterviewStatusMeta(status) {
  const isCompleted = status === 'COMPLETED';
  if (isCompleted) {
    return { label: 'Completed', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  }
  if (status === 'IN_PROGRESS') {
    return { label: 'In Progress', color: 'text-amber-600 bg-amber-50 border-amber-100' };
  }
  return { label: 'Not Started', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
}

export function conversationalStatusMeta(status) {
  const isCompleted = status === 'COMPLETED';
  if (isCompleted) {
    return { label: 'Completed', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  }
  if (status === 'IN_PROGRESS') {
    return { label: 'In Progress', color: 'text-amber-600 bg-amber-50 border-amber-100' };
  }
  return { label: 'Not Started', color: 'text-violet-600 bg-violet-50 border-violet-100' };
}

export function StatGrid({ stats, loading }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
              {loading ? '—' : stat.val}
            </p>
          </div>
          <div
            className={`w-8 h-8 rounded-lg border flex items-center justify-center ${STAT_ICON_BOX[stat.color]}`}
          >
            <Activity className={`w-4 h-4 ${STAT_ICON_COLOR[stat.color]}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingBlock({ message = 'Syncing your schedule...' }) {
  return (
    <div className="py-32 flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-sm font-bold text-slate-400 animate-pulse">{message}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">{subtitle}</p>
      </div>
    </div>
  );
}

export function PageShell({ children }) {
  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {children}
    </div>
  );
}
