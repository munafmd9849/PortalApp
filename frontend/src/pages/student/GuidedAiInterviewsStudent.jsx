import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, PlayCircle, Camera, Lock, FileText } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import {
  PageShell,
  PageHeader,
  StatGrid,
  LoadingBlock,
  aiInterviewStatusMeta,
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
    const inProgress = interviews.filter((iv) => iv.status === 'IN_PROGRESS').length;
    return [
      { label: 'Assigned', val: interviews.length, color: 'indigo' },
      { label: 'Upcoming', val: upcoming, color: 'amber' },
      { label: 'In Progress', val: inProgress, color: 'purple' },
      { label: 'Completed', val: completed, color: 'emerald' },
    ];
  }, [interviews]);

  return (
    <PageShell>
      <PageHeader
        title="Guided AI Interviews"
        subtitle="Proctored one-way interviews with a fixed set of timed questions"
      />

      <StatGrid stats={stats} loading={loading} />

      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/10">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
              Secure video session
            </span>
          </div>
          <p className="text-slate-400 text-sm font-medium max-w-lg">
            Use a quiet room, camera, and fullscreen. The AI interviewer acknowledges each answer
            before moving to the next question.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] -mr-24 -mt-24 rounded-full" />
      </div>

      {loading ? (
        <LoadingBlock message="Loading guided interviews..." />
      ) : interviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <Camera className="w-12 h-12 text-indigo-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No guided AI interviews assigned</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-xs font-medium">
            When your placement team assigns guided AI mocks, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {interviews.map((iv) => {
            const { label: statusLabel, color: statusColor } = aiInterviewStatusMeta(iv.status);
            const isCompleted = iv.status === 'COMPLETED';

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
                    Guided AI
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
      )}
    </PageShell>
  );
}
