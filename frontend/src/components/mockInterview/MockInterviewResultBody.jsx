import React from 'react';
import { Trophy, Clock, CheckCircle2, Star, MessageSquare } from 'lucide-react';
import MockInterviewRatingsGrid from './MockInterviewRatingsGrid';

function formatDuration(seconds) {
  if (seconds == null) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

/**
 * Shared mock interview feedback layout (student report + admin deep dive).
 */
export default function MockInterviewResultBody({
  scorePercent = 0,
  feedback,
  durationSeconds,
  driveCategory = 'Mock',
  badgeSuffix = 'Interviewer feedback',
  statusLabel = 'Completed',
  sessionTime,
}) {
  const score = scorePercent ?? 0;
  const ratings = feedback?.ratings || [];

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 rounded-[32px] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div>
              <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-bold uppercase tracking-widest text-indigo-300 border border-white/5">
                {driveCategory} · {badgeSuffix}
              </span>
              <h2 className="text-4xl font-bold mt-4 leading-tight">{score}% Overall</h2>
              <p className="text-slate-400 text-sm mt-3 font-medium">
                {feedback?.result?.replace(/_/g, ' ') || 'Evaluated'}
              </p>
            </div>
            <div className="flex flex-wrap gap-6 pt-4 border-t border-white/5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Session</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span className="text-lg font-bold tabular-nums">{formatDuration(durationSeconds)}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-lg font-bold uppercase">{statusLabel}</span>
                </div>
              </div>
              {sessionTime && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Started</p>
                  <p className="text-sm font-bold text-slate-300 mt-1">{sessionTime}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" aria-hidden>
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="transparent"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="12"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="transparent"
                  stroke="white"
                  strokeWidth="12"
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * score) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <Trophy className="absolute w-10 h-10 text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
          <Star className="w-4 h-4 text-indigo-600" /> Skill ratings
        </h3>
        <MockInterviewRatingsGrid ratings={ratings} showSummary={false} />
      </div>

      {feedback?.detailedRemarks ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-indigo-600" /> Interviewer remarks
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {feedback.detailedRemarks}
          </p>
        </div>
      ) : null}
    </div>
  );
}
