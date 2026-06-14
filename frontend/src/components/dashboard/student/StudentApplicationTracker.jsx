import React from 'react';
import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import {
  getApplicationPrimaryStatus,
  getApplicationTimeline,
  getApplicationTrackerDetails,
  getPrimaryStatusColorClass,
  isTerminalApplication,
} from '../../../utils/applicationTrackerState';

function TimelineIcon({ status }) {
  if (status === 'completed') {
    return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
  }
  if (status === 'rejected') {
    return <XCircle className="w-4 h-4 text-red-600 shrink-0" />;
  }
  if (status === 'current') {
    return <Clock className="w-4 h-4 text-indigo-600 shrink-0 animate-pulse" />;
  }
  return <Circle className="w-4 h-4 text-slate-300 shrink-0" />;
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export default function StudentApplicationTracker({ application }) {
  const primary = getApplicationPrimaryStatus(application);
  const timeline = getApplicationTimeline(application);
  const details = getApplicationTrackerDetails(application);
  const isFinal = primary.final || isTerminalApplication(application);

  const detailFields = [
    { label: 'Applied', value: formatDate(details.appliedDate || application.appliedDate) },
    { label: 'Last updated', value: formatDate(details.updatedAt || application.updatedAt) },
    ...(isFinal
      ? [
          ...(details.rejectedIn
            ? [{ label: 'Rejected in', value: details.rejectedIn }]
            : []),
          ...(details.finalOutcome
            ? [{ label: 'Final outcome', value: details.finalOutcome }]
            : []),
        ]
      : [
          { label: 'Resume screening', value: details.resumeScreening },
          { label: 'Recruiter screening', value: details.recruiterScreening },
          { label: 'QA test', value: details.qaTest },
          { label: 'Interview eligible', value: details.interviewEligible ? 'Yes' : 'No' },
          { label: 'Interview schedule', value: formatDate(details.interviewDate || application.interviewDate) },
          {
            label: 'Active round',
            value: details.activeRound
              ? `Round ${details.activeRound.roundNumber}${details.activeRound.name ? `: ${details.activeRound.name}` : ''}`
              : details.highestQualifiedRound
                ? `Through Round ${details.highestQualifiedRound}`
                : '—',
          },
        ]),
  ];

  return (
    <div className="space-y-5">
      <div className={`rounded-xl border p-4 sm:p-5 ${isFinal ? (primary.variant === 'success' ? 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-white' : 'border-red-100 bg-gradient-to-br from-red-50 to-white') : 'border-indigo-100 bg-gradient-to-br from-indigo-50 to-white'}`}>
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isFinal ? (primary.variant === 'success' ? 'text-emerald-600' : 'text-red-600') : 'text-indigo-500'}`}>
          {isFinal ? 'Final Outcome' : 'Current Status'}
        </p>
        <span
          className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border ${getPrimaryStatusColorClass(primary.variant)}`}
        >
          {primary.label}
        </span>
        {details.placementStatus && (
          <p className="text-xs text-slate-500 mt-3">
            Placement status: <span className="font-semibold text-slate-700">{details.placementStatus}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {detailFields.map((field) => (
          <Detail key={field.label} label={field.label} value={field.value} />
        ))}
        {details.rejectionReason && primary.variant === 'danger' && (
          <div className="sm:col-span-2 rounded-lg border border-red-100 bg-red-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Rejection reason</p>
            <p className="text-sm text-red-800 mt-1">{details.rejectionReason}</p>
          </div>
        )}
      </div>

      {timeline.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
            Application Timeline
          </p>
          <ol className="space-y-3">
            {timeline.map((step) => (
              <li key={step.id} className="flex gap-3">
                <div className="pt-0.5">
                  <TimelineIcon status={step.status} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      step.status === 'rejected'
                        ? 'text-red-700'
                        : step.status === 'current'
                          ? 'text-indigo-700'
                          : step.status === 'completed'
                            ? 'text-slate-800'
                            : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.detail && (
                    <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-wrap">{step.detail}</p>
                  )}
                  {step.date && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(step.date)}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{value || '—'}</p>
    </div>
  );
}
