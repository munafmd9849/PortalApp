import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, Users, Trophy, AlertTriangle, Activity, Search, Sparkles,
  Star, Shield, Video, Loader2,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

const CONTENT_WIDTH = 'w-full lg:w-[75%] max-w-full mx-auto px-4 sm:px-6';

function statusBadge(status) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'IN_PROGRESS':
      return 'bg-amber-50 text-amber-600 border-amber-100';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-200';
  }
}

function AiMockInterviewReviewComponent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [reviewForm, setReviewForm] = useState({
    overallRating: 7,
    comments: '',
    strengths: '',
    improvements: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getAiInterviewReview(id);
      setData(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openStudent = async (enrollmentId) => {
    setSelectedId(enrollmentId);
    setDetailLoading(true);
    try {
      const d = await api.getAiEnrollmentDetail(enrollmentId);
      setDetail(d);
      if (d.review) {
        setReviewForm({
          overallRating: d.review.overallRating ?? 7,
          comments: d.review.comments || '',
          strengths: d.review.strengths || '',
          improvements: d.review.improvements || '',
        });
      } else {
        setReviewForm({ overallRating: 7, comments: '', strengths: '', improvements: '' });
      }
    } catch {
      toast.error('Failed to load student detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeReport = () => {
    setSelectedId(null);
    setDetail(null);
  };

  const saveReview = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.saveAiEnrollmentReview(selectedId, reviewForm);
      toast.success('Review saved');
      load();
      openStudent(selectedId);
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const regenerateAi = async () => {
    if (!selectedId) return;
    try {
      await api.regenerateAiInsights(selectedId);
      toast.success('AI insights regenerated');
      openStudent(selectedId);
    } catch (err) {
      toast.error(err.message || 'AI generation failed');
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
          Loading AI interview results
        </p>
      </div>
    );
  }

  const { interview, analytics, students } = data || {};
  const completed = analytics?.completed ?? 0;
  const assigned = analytics?.assigned ?? 0;
  const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

  const filtered = (students || []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.student?.fullName?.toLowerCase().includes(q) ||
      s.student?.enrollmentId?.toLowerCase().includes(q)
    );
  });

  if (selectedId) {
    const student = detail?.enrollment?.student;
    return (
      <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in duration-700">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className={`${CONTENT_WIDTH} h-16 flex items-center justify-between`}>
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={closeReport}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg border border-slate-200 shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-sm font-bold text-slate-900 truncate">
                AI Interview Review:{' '}
                <span className="text-indigo-600">{student?.fullName || 'Candidate'}</span>
              </h1>
            </div>
            <p className="hidden sm:block text-xs text-slate-400 font-medium shrink-0 ml-4">
              {student?.enrollmentId}
            </p>
          </div>
        </div>

        <div className={`${CONTENT_WIDTH} mt-8 space-y-8`}>
          {detailLoading ? (
            <div className="py-24 flex justify-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <>
              {detail?.aiInsight && (
                <div className="bg-slate-900 rounded-[32px] p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 space-y-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[9px] font-bold uppercase tracking-widest text-indigo-300 border border-white/5">
                      <Sparkles className="w-3.5 h-3.5" /> Assistive AI insights
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {[
                        ['Communication', detail.aiInsight.communicationScore],
                        ['Confidence', detail.aiInsight.confidenceScore],
                        ['Clarity', detail.aiInsight.clarityScore],
                        ['Technical', detail.aiInsight.technicalUnderstanding],
                        ['Overall', detail.aiInsight.overallPerformance],
                      ].map(([label, val]) => (
                        <div key={label} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                          <p className="text-2xl font-bold mt-1 tabular-nums">{val ?? '—'}%</p>
                        </div>
                      ))}
                    </div>
                    {detail.aiInsight.strengths && (
                      <p className="text-sm text-slate-300"><span className="font-bold text-white">Strengths:</span> {detail.aiInsight.strengths}</p>
                    )}
                    {detail.aiInsight.improvements && (
                      <p className="text-sm text-slate-300"><span className="font-bold text-white">Improve:</span> {detail.aiInsight.improvements}</p>
                    )}
                    <button
                      type="button"
                      onClick={regenerateAi}
                      className="text-xs font-bold uppercase tracking-widest text-indigo-300 hover:text-white"
                    >
                      Regenerate insights
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Video className="w-4 h-4 text-indigo-600" /> Question recordings
                  </h3>
                </div>
                <div className="p-6 sm:p-8 space-y-6 divide-y divide-slate-100">
                  {detail?.answers?.map((a, i) => (
                    <div key={a.id} className={i > 0 ? 'pt-6' : ''}>
                      <p className="text-sm font-bold text-slate-900 mb-3">Q{i + 1}: {a.questionText}</p>
                      {a.videoUrl ? (
                        <video src={a.videoUrl} controls className="w-full rounded-2xl max-h-64 bg-black border border-slate-200" />
                      ) : (
                        <p className="text-xs text-slate-400 font-medium">No recording uploaded</p>
                      )}
                    </div>
                  ))}
                  {!detail?.answers?.length && (
                    <p className="text-sm text-slate-400 text-center py-8">No answers recorded yet.</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Star className="w-4 h-4 text-indigo-600" /> Human review
                </h3>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Overall rating (1–10): <span className="text-indigo-600">{reviewForm.overallRating}</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={reviewForm.overallRating}
                    onChange={(e) => setReviewForm({ ...reviewForm, overallRating: +e.target.value })}
                    className="w-full mt-2"
                  />
                </label>
                <textarea
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium resize-none"
                  placeholder="Comments"
                  rows={3}
                  value={reviewForm.comments}
                  onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                />
                <textarea
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium resize-none"
                  placeholder="Strengths"
                  rows={2}
                  value={reviewForm.strengths}
                  onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                />
                <textarea
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium resize-none"
                  placeholder="Areas for improvement"
                  rows={2}
                  value={reviewForm.improvements}
                  onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })}
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveReview}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-60"
                >
                  Save review
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in duration-700">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className={`${CONTENT_WIDTH} h-16 flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin?tab=mockInterviews')}
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg border border-slate-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-slate-900">
              AI Interview Review:{' '}
              <span className="text-indigo-600">{interview?.title}</span>
            </h1>
          </div>
          <span className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
            <Shield className="w-3.5 h-3.5" /> Proctored video session
          </span>
        </div>
      </div>

      <div className={`${CONTENT_WIDTH} mt-8 space-y-8`}>
        <div className="bg-slate-900 rounded-[32px] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-bold uppercase tracking-widest text-indigo-300 border border-white/5">
                  {interview?.interviewType?.replace(/_/g, ' ') || 'AI'} · Video mock
                </span>
                <h2 className="text-4xl font-bold mt-4 leading-tight">{completionRate}% Completion</h2>
                <p className="text-slate-400 text-sm mt-3 font-medium">
                  {completed} of {assigned} candidates finished · {analytics?.pending ?? 0} pending
                </p>
              </div>
              <div className="flex flex-wrap gap-6 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assigned</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span className="text-lg font-bold tabular-nums">{assigned}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Completed</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span className="text-lg font-bold tabular-nums">{completed}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">High risk flags</p>
                  <div className="flex items-center gap-2 mt-1">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span className="text-lg font-bold tabular-nums">{analytics?.highRiskViolations ?? 0}</span>
                  </div>
                </div>
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
                    strokeDashoffset={283 - (283 * completionRate) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <Sparkles className="absolute w-10 h-10 text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" /> Candidate submissions
            </h3>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate..."
                className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 w-40 sm:w-52 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">#</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Progress</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Violations</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s, idx) => (
                  <tr key={s.enrollmentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-500">#{idx + 1}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{s.student?.fullName || '—'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.student?.enrollmentId}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-lg font-bold text-indigo-600 tabular-nums">{s.progressPercent ?? 0}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border ${statusBadge(s.status)}`}>
                        {s.status?.replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-600 tabular-nums">
                      {s.violationsCount ?? 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openStudent(s.enrollmentId)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-colors"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-400 font-medium">
                      No candidates match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AiMockInterviewReview() {
  return (
    <ErrorBoundary>
      <AiMockInterviewReviewComponent />
    </ErrorBoundary>
  );
}
