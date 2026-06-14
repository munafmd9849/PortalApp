import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Video, Info, Camera, Trophy } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import {
  PageShell,
  PageHeader,
  StatGrid,
  LoadingBlock,
  getAiEnrollmentStatusBadge,
} from './interviewStudentShared';

export default function GuidedAiInterviewsStudent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentAiInterviews();
      setInterviews(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load guided AI interviews');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const completed = interviews.filter((iv) => iv.status === 'COMPLETED').length;
    const upcoming = interviews.filter((iv) => iv.status !== 'COMPLETED').length;
    const progressValues = interviews
      .map((iv) => iv.progressPercent)
      .filter((v) => typeof v === 'number');
    const avgProgress = progressValues.length
      ? Math.round(progressValues.reduce((sum, v) => sum + v, 0) / progressValues.length)
      : null;

    return [
      { label: 'Completed', val: completed, color: 'emerald' },
      { label: 'Upcoming', val: upcoming, color: 'indigo' },
      {
        label: 'Avg. Progress',
        val: avgProgress != null ? `${avgProgress}%` : '—',
        color: 'purple',
      },
      { label: 'Assigned', val: interviews.length, color: 'amber' },
    ];
  }, [interviews]);

  return (
    <PageShell>
      <PageHeader
        title="Guided AI Interviews"
        subtitle="Proctored one-way interviews with a fixed set of timed questions"
      />

      <StatGrid stats={stats} loading={loading} />

      {loading ? (
        <LoadingBlock message="Loading guided interviews..." />
      ) : interviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
            <Calendar className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No guided AI interviews assigned</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-xs leading-relaxed font-medium">
            When your placement team assigns guided AI mocks, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {interviews.map((iv) => {
            const sessionDate = iv.startDate ? new Date(iv.startDate) : null;
            const isCompleted = iv.status === 'COMPLETED';
            const hasReport = isCompleted && iv.aiInsightStatus === 'COMPLETED';
            const reportPending = isCompleted && iv.aiInsightStatus === 'PENDING';

            return (
              <div
                key={iv.enrollmentId}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative border-l-4 border-l-indigo-600"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex gap-5">
                    <div className="w-14 h-14 bg-slate-900 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0 shadow-lg shadow-slate-900/10">
                      {sessionDate ? (
                        <>
                          <span className="text-[10px] font-bold uppercase tracking-tight opacity-70">
                            {sessionDate.toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-xl font-bold leading-none">{sessionDate.getDate()}</span>
                        </>
                      ) : (
                        <Camera className="w-6 h-6 opacity-80" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded uppercase tracking-wider border border-indigo-100">
                          Guided AI
                        </span>
                        {getAiEnrollmentStatusBadge(iv.status)}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {iv.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-slate-500">
                        {sessionDate && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Opens{' '}
                            {sessionDate.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                        <span className="text-xs font-semibold text-slate-500">
                          {iv.questionCount} questions · {iv.progressPercent ?? 0}% progress
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isCompleted ? (
                      iv.canStart ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/student/interviews/${iv.interviewId}`)}
                          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95"
                        >
                          <Video className="w-4 h-4" />
                          {iv.status === 'IN_PROGRESS' ? 'Resume Session' : 'Enter Room'}
                        </button>
                      ) : (
                        <span className="px-4 py-2.5 text-xs font-semibold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                          Opens{' '}
                          {sessionDate
                            ? sessionDate.toLocaleString([], {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : 'soon'}
                        </span>
                      )
                    ) : hasReport ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/student/ai-interview/results/${iv.enrollmentId}`, {
                            state: { from: 'guided' },
                          })
                        }
                        className="px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Trophy className="w-4 h-4" /> View Report
                      </button>
                    ) : reportPending ? (
                      <span className="px-4 py-2.5 text-xs font-semibold text-amber-600 bg-amber-50 rounded-xl border border-amber-100">
                        Generating report…
                      </span>
                    ) : (
                      <span className="px-4 py-2.5 text-xs font-semibold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                        Submitted for review
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
