import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Video, Activity,
  Shield, PlayCircle, Info, Trophy,
  Camera, Lock, FileText,
} from 'lucide-react';

const STAT_ICON_BOX = {
  indigo: 'bg-indigo-50 border-indigo-100',
  emerald: 'bg-emerald-50 border-emerald-100',
  amber: 'bg-amber-50 border-amber-100',
  purple: 'bg-purple-50 border-purple-100',
};

const STAT_ICON_COLOR = {
  indigo: 'text-indigo-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  purple: 'text-purple-600',
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

function feedbackScorePercent(feedback) {
  if (!feedback) return null;
  const values = FEEDBACK_RATING_FIELDS.map((key) => feedback[key]).filter(
    (v) => typeof v === 'number' && v > 0
  );
  if (!values.length) return null;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(avg * 20);
}

function computeMockInterviewStats(slots, aiInterviews) {
  const liveCompleted = slots.filter((s) => s.status === 'COMPLETED').length;
  const liveUpcoming = slots.filter((s) =>
    ['SCHEDULED', 'WAITING', 'LIVE'].includes(s.status)
  ).length;
  const aiCompleted = aiInterviews.filter((iv) => iv.status === 'COMPLETED').length;
  const aiUpcoming = aiInterviews.filter((iv) => iv.status !== 'COMPLETED').length;

  const feedbackScores = slots
    .map((s) => feedbackScorePercent(s.feedback))
    .filter((score) => score != null);

  const avgFeedbackScore = feedbackScores.length
    ? Math.round(feedbackScores.reduce((sum, s) => sum + s, 0) / feedbackScores.length)
    : null;

  return {
    completed: liveCompleted + aiCompleted,
    upcoming: liveUpcoming + aiUpcoming,
    liveCompleted,
    aiCompleted,
    totalAssigned: slots.length + aiInterviews.length,
    avgFeedbackScore,
    feedbackCount: feedbackScores.length,
  };
}
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';

export default function MockInterviewStudentDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [aiInterviews, setAiInterviews] = useState([]);

  const loadSlots = useCallback(async () => {
    try {
      setLoading(true);
      const [data, ai] = await Promise.all([
        api.getStudentMockInterviews(),
        api.getStudentAiInterviews().catch(() => []),
      ]);
      setSlots(data);
      setAiInterviews(Array.isArray(ai) ? ai : []);
    } catch (err) {
      toast.error('Failed to load your mock interviews');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SCHEDULED':
        return (
          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full border border-indigo-100 uppercase tracking-wider">
            Scheduled
          </span>
        );
      case 'WAITING':
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full border border-amber-100 uppercase tracking-wider">
            Waiting Room
          </span>
        );
      case 'LIVE':
        return (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100 uppercase tracking-wider animate-pulse">
            Session Live
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200 uppercase tracking-wider">
            Completed
          </span>
        );
      case 'MISSED':
        return (
          <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full border border-rose-100 uppercase tracking-wider">
            Missed
          </span>
        );
      default:
        return null;
    }
  };

  const stats = computeMockInterviewStats(slots, aiInterviews);

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">My Mock Interviews</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Live 1:1 sessions and AI video mock interviews
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Completed', val: loading ? '—' : stats.completed, color: 'emerald' },
          { label: 'Upcoming', val: loading ? '—' : stats.upcoming, color: 'indigo' },
          {
            label: 'Avg. Score',
            val: loading
              ? '—'
              : stats.avgFeedbackScore != null
                ? `${stats.avgFeedbackScore}%`
                : '—',
            color: 'purple',
          },
          { label: 'Assigned', val: loading ? '—' : stats.totalAssigned, color: 'amber' },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">{stat.val}</p>
            </div>
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center ${STAT_ICON_BOX[stat.color]}`}
            >
              <Activity className={`w-4 h-4 ${STAT_ICON_COLOR[stat.color]}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
          {aiInterviews.length > 0 && (
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/10">
                <div className="relative z-10 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      Secure video session
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">AI Video Mock Interviews</h2>
                  <p className="text-slate-400 text-sm font-medium max-w-lg">
                    Proctored one-way interviews with timed questions. Use a quiet room, camera, and
                    fullscreen.
                  </p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] -mr-24 -mt-24 rounded-full" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {aiInterviews.map((iv) => {
                  const isCompleted = iv.status === 'COMPLETED';
                  const statusColor = isCompleted
                    ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                    : iv.status === 'IN_PROGRESS'
                      ? 'text-amber-600 bg-amber-50 border-amber-100'
                      : 'text-indigo-600 bg-indigo-50 border-indigo-100';
                  const statusLabel = isCompleted
                    ? 'Completed'
                    : iv.status === 'IN_PROGRESS'
                      ? 'In Progress'
                      : 'Not Started';
                  return (
                    <div
                      key={iv.enrollmentId}
                      className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group flex flex-col h-full"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className={`p-3 rounded-xl border shadow-sm ${statusColor}`}>
                          <Camera className="w-5 h-5" />
                        </div>
                        <div
                          className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${statusColor}`}
                        >
                          {statusLabel}
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <span className="text-[9px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          AI Video Interview
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                          {iv.title}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium">
                          {iv.questionCount} questions · {iv.progressPercent ?? 0}% progress
                        </p>
                        {iv.startDate && iv.endDate && (
                          <p className="text-xs text-slate-400 font-medium">
                            Window:{' '}
                            {new Date(iv.startDate).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}{' '}
                            –{' '}
                            {new Date(iv.endDate).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </p>
                        )}
                      </div>
                      <div className="mt-8 pt-6 border-t border-slate-100">
                        {isCompleted ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase">
                            <FileText className="w-4 h-4" /> Submitted for review
                          </div>
                        ) : iv.canStart ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/student/interviews/${iv.interviewId}`)}
                            className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-indigo-600 hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            <PlayCircle className="w-4 h-4" />
                            {iv.status === 'IN_PROGRESS' ? 'Resume session' : 'Enter secure portal'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <Lock className="w-4 h-4" />
                            Opens{' '}
                            {new Date(iv.startDate).toLocaleString([], {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-400 animate-pulse">Syncing your schedule...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 border border-slate-200 shadow-sm flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                <Calendar className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No sessions scheduled yet</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-xs leading-relaxed font-medium">
                You haven&apos;t been assigned to any mock drives. Check back later or notify your
                placement officer.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {slots.map((slot) => {
                const driveDate = new Date(slot.startTime);
                const isCompleted = slot.status === 'COMPLETED';
                const hasFeedback = Boolean(slot.feedback);

                return (
                  <div
                    key={slot.id}
                    className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative border-l-4 border-l-indigo-600"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex gap-5">
                        <div className="w-14 h-14 bg-slate-900 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0 shadow-lg shadow-slate-900/10">
                          <span className="text-[10px] font-bold uppercase tracking-tight opacity-70">
                            {driveDate.toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-xl font-bold leading-none">{driveDate.getDate()}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded uppercase tracking-wider border border-indigo-100">
                              {slot.drive?.category} Round
                            </span>
                            {getStatusBadge(slot.status)}
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {slot.drive?.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-slate-500">
                            <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {driveDate.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {!isCompleted ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/mock-interview-precheck/${slot.id}`)}
                            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95"
                          >
                            <Video className="w-4 h-4" /> Enter Room
                          </button>
                        ) : hasFeedback ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/mock-interview/results/${slot.id}`)}
                            className="px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            <Trophy className="w-4 h-4" /> View Report
                          </button>
                        ) : (
                          <span className="px-4 py-2.5 text-xs font-semibold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                            Awaiting feedback
                          </span>
                        )}
                        <button
                          type="button"
                          className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}
