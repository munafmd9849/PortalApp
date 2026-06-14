import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  ChevronLeft, Users, Clock, AlertTriangle, 
  CheckCircle, FileText, Code, Shield, X,
  Download, Filter, Search, ChevronRight, ChevronDown,
  MoreHorizontal, Activity, Trophy,
  Terminal, BookOpen, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { mcqAnswersMatch, resolveMcqOptionLabel } from '../../utils/mcqAnswers';
import { useToast } from '../../components/ui/Toast';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

function formatSessionTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatSessionDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function normalizeSessionStatus(status) {
  if (status === 'AUTO_SUBMITTED') return 'COMPLETED';
  return status;
}

function formatSessionStatus(status) {
  return normalizeSessionStatus(status)?.replace(/_/g, ' ') || '';
}

function summarizeViolations(violations) {
  const counts = {};
  for (const v of violations || []) {
    const key = v.type || 'UNKNOWN';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/** % of candidates who scored lower than this session (ties share the same value). */
function computeSessionPercentiles(sessions) {
  const list = sessions || [];
  const scores = list.map((s) => s.score ?? 0);
  const n = scores.length;
  const byId = new Map();

  for (const session of list) {
    const score = session.score ?? 0;
    if (n === 0) {
      byId.set(session.id, 0);
    } else if (n === 1) {
      byId.set(session.id, 100);
    } else {
      const below = scores.filter((s) => s < score).length;
      byId.set(session.id, Math.round((below / (n - 1)) * 100));
    }
  }

  return byId;
}

function computeAssessmentStats(assessment) {
  const sessions = assessment?.sessions || [];
  const totalAttempts = sessions.length;

  if (!totalAttempts) {
    return {
      totalAttempts: 0,
      avgScore: '0%',
      violationsRate: '0%',
    };
  }

  const avgScore = Math.round(
    sessions.reduce((acc, s) => acc + (s.score || 0), 0) / totalAttempts
  );

  const sessionsWithViolations = sessions.filter(
    (s) => (s.violations?.length ?? s.violationsCount ?? 0) > 0
  ).length;
  const violationsRate = Math.round((sessionsWithViolations / totalAttempts) * 100);

  return {
    totalAttempts,
    avgScore: `${avgScore}%`,
    violationsRate: `${violationsRate}%`,
  };
}

function AdminAssessmentResultsComponent() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const id = paramId || searchParams.get('assessmentId');
  
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [proctoringDetails, setProctoringDetails] = useState(null);
  const [proctoringLoading, setProctoringLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [violationsOpen, setViolationsOpen] = useState(false);

  const stats = useMemo(() => computeAssessmentStats(assessment), [assessment]);
  const sessionPercentiles = useMemo(
    () => computeSessionPercentiles(assessment?.sessions),
    [assessment?.sessions]
  );

  const fetchResults = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getAssessmentDashboard(id);
      setAssessment(data);
    } catch (error) {
      console.error("[Frontend Error] fetchResults failed:", error);
      setErrorMsg(error.stack || error.message || String(error));
      toast?.error(`Failed to load assessment results`);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    if (!selectedSession?.id) {
      setProctoringDetails(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setProctoringLoading(true);
        const d = await api.getProctoringSessionDetails(selectedSession.id);
        const screenshots = Array.isArray(d?.screenshots) ? d.screenshots : [];
        const urls = await Promise.all(
          screenshots.map(async (s) => {
            try {
              const r = await api.getProctoringScreenshotUrl(s.id);
              return { id: s.id, url: r?.url || s.imageUrl };
            } catch {
              return { id: s.id, url: s.imageUrl };
            }
          })
        );
        const urlById = new Map(urls.map((u) => [u.id, u.url]));
        if (!cancelled) {
          setProctoringDetails({
            ...d,
            screenshots: screenshots.map((s) => ({
              ...s,
              signedUrl: urlById.get(s.id) || s.imageUrl,
            })),
          });
        }
      } catch {
        if (!cancelled) setProctoringDetails(null);
      } finally {
        if (!cancelled) setProctoringLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSession?.id]);

  useEffect(() => {
    const count = selectedSession?.violations?.length ?? 0;
    setViolationsOpen(count > 0 && count <= 5);
  }, [selectedSession?.id, selectedSession?.violations?.length]);

  const handleBack = () => {
    const basePath = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
    navigate(`${basePath}?tab=assessments`);
  };

  const handleExportExcel = () => {
    const sessions = assessment?.sessions || [];
    if (!sessions.length) {
      toast?.error('No results to export');
      return;
    }

    const rows = sessions.map((session, idx) => {
      const started = session.startTime ? new Date(session.startTime) : null;
      const ended = session.endTime ? new Date(session.endTime) : null;
      const timeSpentMin =
        started && ended && !Number.isNaN(started.getTime()) && !Number.isNaN(ended.getTime())
          ? Math.floor((ended.getTime() - started.getTime()) / 60000)
          : '';

      return {
        Rank: idx + 1,
        'Candidate Name': session.student?.fullName || 'Anonymous',
        'Enrollment ID': session.student?.enrollmentId || '',
        Batch: session.student?.batch || '',
        'Score (%)': session.score ?? 0,
        Status: formatSessionStatus(session.status),
        Violations: session.violations?.length ?? 0,
        'Started At': started && !Number.isNaN(started.getTime()) ? started.toLocaleString() : '',
        'Ended At': ended && !Number.isNaN(ended.getTime()) ? ended.toLocaleString() : '',
        'Time Spent (min)': timeSpentMin,
      };
    });

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Results');

    const safeTitle = (assessment?.title || 'assessment')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40) || 'assessment';

    XLSX.writeFile(workbook, `${safeTitle}-results.xlsx`);
    toast?.success('Results exported to Excel');
  };

  const getStatusBadge = (status) => {
    switch (normalizeSessionStatus(status)) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'PENDING_REVIEW': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'DISQUALIFIED': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  if (errorMsg) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center p-8">
        <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center mb-4 border border-gray-200">
           <AlertTriangle className="w-7 h-7 text-gray-500" />
        </div>
        <p className="text-sm font-medium text-gray-900 mb-1">Unable to load results</p>
        <p className="text-gray-500 text-sm mb-6 text-center max-w-md">The assessment results could not be loaded. This may be due to a network error or missing data.</p>
        <button type="button" onClick={() => window.location.reload()} className="px-5 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-md text-sm font-medium transition-colors">Try again</button>
      </div>
    );
  }

  if (loading) return (
    <div className="h-screen bg-white flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-gray-100 border-t-blue-800 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading results...</p>
    </div>
  );

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            type="button"
            onClick={handleBack}
            className="w-9 h-9 bg-white rounded-md flex items-center justify-center text-gray-500 hover:text-gray-900 border border-gray-200 transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{assessment?.title}</p>
            <span className="text-xs text-gray-500">
              {assessment?.type?.replace('_', ' ')}
            </span>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={!assessment?.sessions?.length}
          className="h-9 px-4 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Attempts', val: stats.totalAttempts },
          { label: 'Average score', val: stats.avgScore },
          { label: 'Violations rate', val: stats.violationsRate },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-gray-200">
             <p className="text-xs text-gray-500">{stat.label}</p>
             <p className="text-lg font-semibold text-gray-900 tabular-nums mt-0.5">{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
           <p className="text-sm font-medium text-gray-700">Candidate performance</p>
           <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input placeholder="Search candidate" className="bg-transparent border-none outline-none text-sm w-36" />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Rank</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Candidate</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">Score</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Attempted</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assessment?.sessions?.map((session, idx) => (
                <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500">#{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-gray-100 text-gray-600 border border-gray-200 flex items-center justify-center font-medium text-xs uppercase">
                        {session.student?.fullName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{session.student?.fullName || 'Anonymous'}</p>
                        <p className="text-xs text-gray-500">{session.student?.enrollmentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-blue-800 tabular-nums">{session.score || 0}%</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">P{sessionPercentiles.get(session.id) ?? 0}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(session.status)}`}>
                      {formatSessionStatus(session.status)}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">{session.violations?.length || 0} logs</p>
                  </td>
                  <td className="px-4 py-3">
                     <p className="text-xs text-gray-600">{formatSessionDate(session.startTime)}</p>
                     <p className="text-xs text-gray-400">{formatSessionTime(session.startTime)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      type="button"
                      onClick={() => setSelectedSession(session)}
                      className="px-3 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-medium rounded-md transition-colors"
                    >
                      View report
                    </button>
                  </td>
                </tr>
              ))}
              {(!assessment?.sessions || assessment.sessions.length === 0) && (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                       <Activity className="w-12 h-12 text-slate-100 mb-3" />
                       <p className="text-sm font-bold text-slate-400">Waiting for assessment completions...</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Dive Panel - Clean Right Side Panel */}
      {selectedSession && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 z-[99999]">
          <div className="w-full h-full bg-white shadow-xl flex flex-col border-l border-gray-200">
             <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-800 text-white">
                <div className="flex items-center gap-3 min-w-0">
                   <div className="w-9 h-9 rounded-md bg-slate-700 text-white flex items-center justify-center font-medium text-sm shrink-0">
                      {selectedSession.student?.fullName?.charAt(0) || '?'}
                   </div>
                   <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{selectedSession.student?.fullName}</p>
                      <p className="text-xs text-slate-300">Session #{selectedSession.id.slice(-6)}</p>
                   </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="p-1.5 hover:bg-slate-700 rounded-md transition-colors"
                  aria-label="Close"
                >
                   <X className="w-5 h-5" />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">
                <div className="bg-slate-800 rounded-lg p-5 text-white">
                   <div className="grid grid-cols-2 gap-6 items-center">
                      <div>
                         <p className="text-xs text-slate-400">Final score</p>
                         <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-3xl font-semibold tabular-nums">{selectedSession.score || 0}%</span>
                         </div>
                         <p className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                             <Clock className="w-3.5 h-3.5" /> 
                             Time spent: {
                               selectedSession.startTime && selectedSession.endTime 
                                 ? `${Math.floor((new Date(selectedSession.endTime) - new Date(selectedSession.startTime)) / 60000)}m ${Math.floor(((new Date(selectedSession.endTime) - new Date(selectedSession.startTime)) % 60000) / 1000)}s`
                                 : 'N/A'
                             }
                          </p>
                      </div>
                      <div className="text-right">
                         <p className="text-xs text-slate-400 mb-1">Status</p>
                         <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium border ${getStatusBadge(selectedSession.status)}`}>
                            {formatSessionStatus(selectedSession.status)}
                         </span>
                      </div>
                   </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViolationsOpen((o) => !o)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Shield className="w-4 h-4 text-gray-600 shrink-0" />
                      <span className="text-sm font-medium text-gray-700">
                        Proctoring log
                      </span>
                      <span className="text-xs text-gray-400">
                        ({selectedSession.violations?.length ?? 0} events)
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${violationsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {selectedSession.violations?.length > 0 ? (
                    <div className="px-5 pb-4 pt-1 border-t border-slate-100 bg-white">
                      <div className="flex flex-wrap gap-2 py-3">
                        {summarizeViolations(selectedSession.violations).map(([type, count]) => (
                          <span
                            key={type}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100 text-[10px] font-bold text-rose-700 uppercase tracking-wide"
                          >
                            {type.replace(/_/g, ' ')}
                            <span className="tabular-nums text-rose-500">{count}</span>
                          </span>
                        ))}
                      </div>

                      {violationsOpen && (
                        <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                          {selectedSession.violations.map((v) => (
                            <div
                              key={v.id || `${v.type}-${v.timestamp}`}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="font-bold text-rose-800 uppercase tracking-wide shrink-0">
                                {v.type?.replace(/_/g, ' ')}
                              </span>
                              <span className="text-slate-500 truncate flex-1 min-w-0">{v.details}</span>
                              <span className="text-[9px] font-bold text-slate-400 tabular-nums shrink-0">
                                {formatSessionTime(v.timestamp)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {!violationsOpen && (
                        <p className="text-[10px] text-slate-400 font-medium pb-2">
                          Expand to view full event timeline
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3 text-emerald-700 bg-emerald-50/50">
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                      <p className="text-xs font-medium">No proctoring violations logged.</p>
                    </div>
                  )}
                </div>

                {/* Snapshots */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-indigo-600" /> Camera Snapshots
                    </h4>
                    <span className="text-[10px] font-bold text-slate-500">
                      {proctoringDetails?.screenshots?.length ?? 0} captured
                      {proctoringLoading ? ' · loading…' : ''}
                    </span>
                  </div>
                  {proctoringDetails?.screenshots?.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
                      {proctoringDetails.screenshots.map((shot) => (
                        <a
                          key={shot.id}
                          href={shot.signedUrl || shot.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                          title={[
                            shot.captureType,
                            shot.event?.replace(/_/g, ' '),
                            formatSessionTime(shot.timestamp),
                          ].filter(Boolean).join(' · ')}
                        >
                          <img
                            src={shot.signedUrl || shot.imageUrl}
                            alt="Proctoring snapshot"
                            className="h-20 w-32 object-cover"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 font-medium py-2">No snapshots stored for this session.</p>
                  )}
                </div>

                {/* Submissions Section */}
                <div className="space-y-4">
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Code className="w-3.5 h-3.5 text-indigo-600" /> Submission Analytics
                   </h4>

                   <div className="space-y-6">
                     {assessment?.questions?.map((q, i) => {
                       let answersObj = {};
                       let execLogs = {};
                       try {
                         const responsesObj = JSON.parse(selectedSession.responses || '{}');
                         answersObj = responsesObj.rawAnswers || {};
                         execLogs = responsesObj.executionLogs || {};
                       } catch(e) {}

                       const studentAnswer = answersObj[q.id];
                       const mcqCorrect = q.type === 'MCQ' && mcqAnswersMatch(studentAnswer, q.correctAnswer, q.options);
                       const studentMcqLabel = q.type === 'MCQ' ? resolveMcqOptionLabel(q.options, studentAnswer) : studentAnswer;
                       const correctMcqLabel = q.type === 'MCQ' ? resolveMcqOptionLabel(q.options, q.correctAnswer) : q.correctAnswer;
                       const logData = execLogs[q.id];

                       return (
                         <div key={q.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm group">
                            <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex items-start justify-between">
                               <div className="flex gap-3 items-start">
                                  <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-slate-400">
                                     {i + 1}
                                  </div>
                                  <div>
                                     <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                          q.type === 'MCQ' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                                        }`}>
                                          {q.type}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">• {q.points} PTS</span>
                                     </div>
                                     <h5 className="text-sm font-bold text-slate-900 leading-tight">{q.questionText}</h5>
                                  </div>
                               </div>
                            </div>

                            <div className="p-6 space-y-6">
                               {q.type === 'MCQ' && (
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Candidate Selected</p>
                                       <div className={`p-4 rounded-xl border-2 transition-all ${mcqCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                                          <span className="text-xs font-bold">{studentMcqLabel || 'NO RESPONSE'}</span>
                                       </div>
                                    </div>
                                    <div className="space-y-2">
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Key (Correct)</p>
                                       <div className="p-4 rounded-xl border-2 bg-slate-50 border-slate-200 text-slate-700">
                                          <span className="text-xs font-bold">{correctMcqLabel ?? '—'}</span>
                                       </div>
                                    </div>
                                 </div>
                               )}

                               {q.type === 'CODING' && (
                                 <div className="space-y-4">
                                    <div className="bg-slate-900 rounded-2xl p-5 relative group/code overflow-hidden">
                                       <div className="absolute top-4 right-4 opacity-0 group-hover/code:opacity-100 transition-all">
                                          <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all" title="Copy Code">
                                             <FileText className="w-4 h-4" />
                                          </button>
                                       </div>
                                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                          <Terminal className="w-3.5 h-3.5" /> Source Code Submission
                                       </p>
                                       <pre className="text-xs font-mono text-emerald-400/90 overflow-x-auto custom-scrollbar leading-relaxed">
                                         {studentAnswer || '// No code submitted for this problem'}
                                       </pre>
                                    </div>
                                    
                                    {logData && (
                                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                                         <div className="flex items-center justify-between mb-4">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compiler Result</p>
                                            <div className="flex gap-2">
                                              <span className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded uppercase tracking-wider shadow-sm">{logData.passed} Passed</span>
                                              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-bold rounded uppercase tracking-wider">{logData.total} Total</span>
                                            </div>
                                         </div>
                                         <div className="grid gap-2">
                                           {logData.logs?.map((log, lidx) => (
                                             <div key={lidx} className={`p-3 rounded-xl text-[10px] font-mono border transition-all ${log.passed ? 'bg-white border-emerald-100 text-emerald-700' : 'bg-white border-rose-100 text-rose-700'}`}>
                                               <div className="flex items-center gap-2 font-bold mb-1 opacity-80">
                                                  <div className={`w-1.5 h-1.5 rounded-full ${log.passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                  Input: {log.input}
                                               </div>
                                               <div className="grid grid-cols-2 gap-4 mt-2 border-t border-slate-50 pt-2">
                                                  <p className="opacity-60">Expected: {log.expected}</p>
                                                  <p className="font-bold">Actual: {log.actual || log.error}</p>
                                               </div>
                                             </div>
                                           ))}
                                         </div>
                                      </div>
                                    )}
                                 </div>
                               )}

                               {q.type === 'DESCRIPTIVE' && (
                                 <div className="space-y-6">
                                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                                       {studentAnswer || 'No response recorded.'}
                                    </div>
                                    
                                    <div className="pt-6 border-t border-slate-100 bg-indigo-50/30 -mx-6 -mb-6 p-6">
                                       <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                                          <div className="flex-1 space-y-2">
                                             <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest ml-1">Award Manual Grade</label>
                                             <input 
                                                type="number" 
                                                placeholder={`Points (Max ${q.points})`} 
                                                className="w-full p-3 bg-white border border-indigo-100 rounded-xl focus:ring-4 ring-indigo-500/10 outline-none text-sm font-bold placeholder:text-slate-300 transition-all" 
                                             />
                                          </div>
                                          <button className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                                             Save Points
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                               )}
                            </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
             </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function AdminAssessmentResults() {
  return (
    <ErrorBoundary>
      <AdminAssessmentResultsComponent />
    </ErrorBoundary>
  );
}
