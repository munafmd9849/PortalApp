import React from 'react';
import { Trophy, Clock, CheckCircle2, Sparkles, Star, MessageSquare, Loader2, AlertTriangle } from 'lucide-react';

function formatDuration(seconds) {
  if (seconds == null) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

const SCORE_FIELDS = [
  ['Overall', 'overallPerformance'],
  ['Communication', 'communicationScore'],
  ['Confidence', 'confidenceScore'],
  ['Clarity', 'clarityScore'],
  ['Professionalism', 'professionalismScore'],
  ['Technical', 'technicalDepthScore'],
  ['Behavioral', 'behavioralScore'],
];

/**
 * Shared AI interview feedback layout (student report + admin preview).
 */
export default function AiInterviewResultBody({
  aiInsight,
  durationSeconds,
  sessionMode = 'GUIDED',
  title,
  statusLabel = 'Completed',
  completedAt,
}) {
  const insightStatus = aiInsight?.status;
  const score = aiInsight?.overallPerformance ?? 0;

  if (insightStatus === 'PENDING') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 shadow-sm flex flex-col items-center text-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <h2 className="text-lg font-bold text-slate-900">Generating your AI report</h2>
        <p className="text-sm text-slate-500 max-w-md">
          We are analyzing your interview responses. This usually takes a minute — refresh this page shortly.
        </p>
      </div>
    );
  }

  if (insightStatus === 'FAILED' || !aiInsight) {
    return (
      <div className="bg-white rounded-3xl border border-rose-100 p-12 shadow-sm flex flex-col items-center text-center gap-4">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-900">Report unavailable</h2>
        <p className="text-sm text-slate-500 max-w-md">
          We could not generate your AI report automatically. Your placement team can review your session manually.
        </p>
      </div>
    );
  }

  const modeLabel = sessionMode === 'CONVERSATIONAL' ? 'Conversational AI' : 'Guided AI';

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 rounded-[32px] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div>
              <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-bold uppercase tracking-widest text-indigo-300 border border-white/5">
                {modeLabel} · AI performance report
              </span>
              <h2 className="text-4xl font-bold mt-4 leading-tight">{score}% Overall</h2>
              {title && <p className="text-slate-400 text-sm mt-2 font-medium">{title}</p>}
              {aiInsight.interviewSummary && (
                <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed">{aiInsight.interviewSummary}</p>
              )}
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
              {completedAt && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Completed</p>
                  <p className="text-sm font-bold text-slate-300 mt-1">
                    {new Date(completedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" aria-hidden>
                <circle cx="50%" cy="50%" r="45%" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
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
          <Sparkles className="w-4 h-4 text-indigo-600" /> Skill scores
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {SCORE_FIELDS.map(([label, key]) => (
            <div key={key} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1 tabular-nums">
                {aiInsight[key] ?? aiInsight.technicalUnderstanding ?? '—'}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {aiInsight.strengths && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-indigo-600" /> Strengths
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{aiInsight.strengths}</p>
        </div>
      )}

      {aiInsight.improvements && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-indigo-600" /> Areas to improve
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{aiInsight.improvements}</p>
        </div>
      )}

      {aiInsight.improvementPlan && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Improvement plan</h3>
          <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
            {aiInsight.improvementPlan}
          </pre>
        </div>
      )}
    </div>
  );
}
