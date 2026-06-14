import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Video, Info, Trophy } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import {
  PageShell,
  PageHeader,
  StatGrid,
  LoadingBlock,
  feedbackScorePercent,
} from './interviewStudentShared';

function getStatusBadge(status) {
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
}

export default function LiveMockInterviewsStudent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentMockInterviews();
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load live mock interviews');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const completed = slots.filter((s) => s.status === 'COMPLETED').length;
    const upcoming = slots.filter((s) =>
      ['SCHEDULED', 'WAITING', 'LIVE'].includes(s.status)
    ).length;
    const feedbackScores = slots
      .map((s) => feedbackScorePercent(s.feedback))
      .filter((score) => score != null);
    const avgFeedbackScore = feedbackScores.length
      ? Math.round(feedbackScores.reduce((sum, s) => sum + s, 0) / feedbackScores.length)
      : null;

    return [
      { label: 'Completed', val: completed, color: 'emerald' },
      { label: 'Upcoming', val: upcoming, color: 'indigo' },
      {
        label: 'Avg. Score',
        val: avgFeedbackScore != null ? `${avgFeedbackScore}%` : '—',
        color: 'purple',
      },
      { label: 'Assigned', val: slots.length, color: 'amber' },
    ];
  }, [slots]);

  return (
    <PageShell>
      <PageHeader
        title="Live Mock Interviews"
        subtitle="Scheduled 1:1 mock drives with interviewers — enter the room at your slot time"
      />

      <StatGrid stats={stats} loading={loading} />

      {loading ? (
        <LoadingBlock />
      ) : slots.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
            <Calendar className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No live sessions scheduled</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-xs leading-relaxed font-medium">
            You haven&apos;t been assigned to any live mock drives yet. Check back later.
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
                          {driveDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
    </PageShell>
  );
}
