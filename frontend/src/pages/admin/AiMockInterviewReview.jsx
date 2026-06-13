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
        <div className="w-12 h-12 border-4 border-gray-100 border-t-blue-800 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading results…</p>
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
              <h1 className="text-sm font-semibold text-gray-900 truncate">
                AI results: <span className="text-blue-800">{student?.fullName || 'Candidate'}</span>
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
              <Loader2 className="w-8 h-8 text-blue-800 animate-spin" />
            </div>
          ) : (
            <>
              {detail?.aiInsight && (
                <div className="bg-slate-800 rounded-lg p-6 text-white border border-slate-700">
                  <div className="space-y-4">
                    <span className="text-xs text-slate-400">AI-assisted insights</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        ['Communication', detail.aiInsight.communicationScore],
                        ['Confidence', detail.aiInsight.confidenceScore],
                        ['Clarity', detail.aiInsight.clarityScore],
                        ['Technical', detail.aiInsight.technicalUnderstanding],
                        ['Overall', detail.aiInsight.overallPerformance],
                      ].map(([label, val]) => (
                        <div key={label} className="bg-slate-700/50 rounded-md p-3 border border-slate-600">
                          <p className="text-[10px] text-slate-400">{label}</p>
                          <p className="text-lg font-semibold mt-0.5 tabular-nums">{val ?? '—'}%</p>
                        </div>
                      ))}
                    </div>
                    {detail.aiInsight.strengths && (
                      <p className="text-sm text-slate-300"><span className="font-medium text-white">Strengths:</span> {detail.aiInsight.strengths}</p>
                    )}
                    {detail.aiInsight.improvements && (
                      <p className="text-sm text-slate-300"><span className="font-medium text-white">Improve:</span> {detail.aiInsight.improvements}</p>
                    )}
                    <button
                      type="button"
                      onClick={regenerateAi}
                      className="text-xs font-medium text-slate-300 hover:text-white"
                    >
                      Regenerate insights
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700">Question recordings</h3>
                </div>
                <div className="p-4 space-y-4 divide-y divide-gray-100">
                  {detail?.answers?.map((a, i) => (
                    <div key={a.id} className={i > 0 ? 'pt-4' : ''}>
                      <p className="text-sm font-medium text-gray-900 mb-2">Q{i + 1}: {a.questionText}</p>
                      {a.videoUrl ? (
                        <video src={a.videoUrl} controls className="w-full rounded-md max-h-64 bg-black border border-gray-200" />
                      ) : (
                        <p className="text-xs text-gray-400">No recording uploaded</p>
                      )}
                    </div>
                  ))}
                  {!detail?.answers?.length && (
                    <p className="text-sm text-gray-400 text-center py-6">No answers recorded yet.</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Human review</h3>
                <label className="block text-xs font-medium text-gray-600">
                  Overall rating (1–10): <span className="text-blue-800">{reviewForm.overallRating}</span>
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
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-md text-sm resize-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 outline-none"
                  placeholder="Comments"
                  rows={3}
                  value={reviewForm.comments}
                  onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                />
                <textarea
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-md text-sm resize-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 outline-none"
                  placeholder="Strengths"
                  rows={2}
                  value={reviewForm.strengths}
                  onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                />
                <textarea
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-md text-sm resize-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 outline-none"
                  placeholder="Areas for improvement"
                  rows={2}
                  value={reviewForm.improvements}
                  onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })}
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveReview}
                  className="w-full py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-md text-sm font-medium disabled:opacity-60"
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
              onClick={() => navigate('/admin?tab=mockInterviews&mode=ai')}
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg border border-slate-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-gray-900">
              AI results: <span className="text-blue-800">{interview?.title}</span>
            </h1>
          </div>
        </div>
      </div>

      <div className={`${CONTENT_WIDTH} mt-8 space-y-6`}>
        <div className="bg-slate-800 rounded-lg p-6 sm:p-8 text-white border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-400">AI video interview</span>
                <h2 className="text-2xl font-semibold mt-2">{completionRate}% completion</h2>
                <p className="text-slate-400 text-sm mt-2">
                  {completed} of {assigned} candidates finished · {analytics?.pending ?? 0} pending
                </p>
              </div>
              <div className="flex flex-wrap gap-6 pt-3 border-t border-slate-700 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Assigned</p>
                  <span className="font-semibold tabular-nums">{assigned}</span>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Completed</p>
                  <span className="font-semibold tabular-nums">{completed}</span>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">High-risk flags</p>
                  <span className="font-semibold tabular-nums">{analytics?.highRiskViolations ?? 0}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" aria-hidden>
                  <circle cx="50%" cy="50%" r="45%" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="transparent"
                    stroke="white"
                    strokeWidth="10"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * completionRate) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <Sparkles className="absolute w-8 h-8 text-slate-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-gray-700">Candidate submissions</h3>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate"
                className="bg-transparent border-none outline-none text-sm text-gray-700 w-40 sm:w-48 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">#</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">Candidate</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">Progress</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">Violations</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s, idx) => (
                  <tr key={s.enrollmentId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">#{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{s.student?.fullName || '—'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.student?.enrollmentId}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-blue-800 tabular-nums">{s.progressPercent ?? 0}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${statusBadge(s.status)}`}>
                        {s.status?.replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 tabular-nums">
                      {s.violationsCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openStudent(s.enrollmentId)}
                        className="px-3 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-medium rounded-md transition-colors"
                      >
                        View report
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
