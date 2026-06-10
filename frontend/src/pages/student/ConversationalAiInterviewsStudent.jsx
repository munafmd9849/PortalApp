import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, PlayCircle, Lock, FileText } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import {
  PageShell,
  PageHeader,
  StatGrid,
  LoadingBlock,
  conversationalStatusMeta,
} from './interviewStudentShared';

export default function ConversationalAiInterviewsStudent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentConversationalInterviews();
      setInterviews(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load conversational AI interviews');
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
    const inProgress = interviews.filter((iv) => iv.status === 'IN_PROGRESS').length;
    return [
      { label: 'Assigned', val: interviews.length, color: 'violet' },
      { label: 'Upcoming', val: upcoming, color: 'amber' },
      { label: 'In Progress', val: inProgress, color: 'purple' },
      { label: 'Completed', val: completed, color: 'emerald' },
    ];
  }, [interviews]);

  return (
    <PageShell>
      <PageHeader
        title="Conversational AI Interviews"
        subtitle="Dynamic follow-up questions — the AI adapts based on your previous answers"
      />

      <StatGrid stats={stats} loading={loading} />

      <div className="bg-violet-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl shadow-violet-900/10">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <MessageCircle className="w-3.5 h-3.5 text-violet-300" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-200">
              Dynamic follow-up
            </span>
          </div>
          <p className="text-violet-200/80 text-sm font-medium max-w-lg">
            Same proctored video session as guided interviews, but each new question is generated
            from your prior responses.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-[80px] -mr-24 -mt-24 rounded-full" />
      </div>

      {loading ? (
        <LoadingBlock message="Loading conversational interviews..." />
      ) : interviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <MessageCircle className="w-12 h-12 text-violet-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No conversational interviews assigned</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-xs font-medium">
            When your placement team assigns conversational AI mocks, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {interviews.map((iv) => {
            const { label: statusLabel, color: statusColor } = conversationalStatusMeta(iv.status);
            const isCompleted = iv.status === 'COMPLETED';

            return (
              <div
                key={iv.enrollmentId}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-xl border shadow-sm ${statusColor}`}>
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${statusColor}`}
                  >
                    {statusLabel}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <span className="text-[9px] font-bold uppercase text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                    Conversational AI
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-violet-600 transition-colors">
                    {iv.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">
                    {iv.topic || 'Open topic'} · up to {iv.maxTurns} exchanges ·{' '}
                    {iv.progressPercent ?? 0}% progress
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
                      onClick={() =>
                        navigate(`/student/conversational-interviews/${iv.interviewId}`)
                      }
                      className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-violet-700 text-white shadow-lg shadow-violet-900/10 hover:bg-violet-600 transition-all flex items-center justify-center gap-2 active:scale-95"
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
      )}
    </PageShell>
  );
}
