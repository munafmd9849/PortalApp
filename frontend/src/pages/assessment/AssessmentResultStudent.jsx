import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Trophy, Clock, Shield, CheckCircle, 
  XCircle, AlertTriangle, FileText, Code, Activity,
  Target, BarChart3, ChevronRight, Terminal, BookOpen,
  Info, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { mcqAnswersMatch, resolveMcqOptionLabel } from '../../utils/mcqAnswers';
import { useToast } from '../../components/ui/Toast';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

function AssessmentResultStudentComponent() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentSessionResults(sessionId);
      setSession(data);
    } catch (error) {
      console.error("[Student Results] Fetch failed:", error);
      setErrorMsg(error.message || 'Failed to load results');
      toast?.error('Could not retrieve assessment feedback');
    } finally {
      setLoading(false);
    }
  }, [sessionId, toast]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Processing Performance Analytics</p>
    </div>
  );

  if (errorMsg) return (
    <div className="h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
         <AlertTriangle className="w-8 h-8 text-rose-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Results Unavailable</h2>
      <p className="text-slate-500 text-sm mb-6 text-center max-w-md">{errorMsg}</p>
      <button onClick={() => navigate('/student')} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Back to Dashboard</button>
    </div>
  );

  const { assessment, score, startTime, endTime, duration, responses, status, violations } = session;
  const questions = assessment?.questions || [];
  
  let parsedResponses = { rawAnswers: {}, executionLogs: {} };
  try {
    parsedResponses = JSON.parse(responses || '{}');
  } catch (e) {}

  const rawAnswers = parsedResponses.rawAnswers || {};
  const executionLogs = parsedResponses.executionLogs || {};

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in duration-700">
      {/* Top Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/student')}
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg border border-slate-200 transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="h-5 w-[1px] bg-slate-200 mx-1" />
            <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-none">
              Performance Review: <span className="text-indigo-600">{assessment?.title}</span>
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Shield className="w-3.5 h-3.5 text-emerald-500" /> Secure Submission
            </div>
            <button className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-widest shadow-md shadow-indigo-600/20 active:scale-95 transition-all">
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 mt-8 space-y-8">
        {/* Hero Performance Header */}
        <div className="bg-slate-900 rounded-[32px] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/10">
           <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                 <div>
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-widest text-indigo-300 border border-white/5">
                       Assessment Insights
                    </span>
                    <h2 className="text-4xl font-bold mt-4 leading-tight">{score || 0}% Final Score</h2>
                    <p className="text-slate-400 text-sm mt-3 leading-relaxed max-w-sm font-medium">
                       Great work! Your performance indicates high proficiency in the core concepts evaluated.
                    </p>
                 </div>
                 <div className="flex flex-wrap gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time Taken</p>
                       <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-400" />
                          <span className="text-lg font-bold tabular-nums">{formatDuration(duration)}</span>
                       </div>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</p>
                       <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-lg font-bold uppercase tracking-tight">{status || 'COMPLETED'}</span>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="flex justify-center md:justify-end">
                 <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                    {/* Visual Progress Ring */}
                    <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                       <circle cx="50%" cy="50%" r="45%" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                       <circle cx="50%" cy="50%" r="45%" fill="transparent" stroke="white" strokeWidth="12" strokeDasharray="283" strokeDashoffset={283 - (283 * (score || 0)) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <Trophy className="w-10 h-10 text-indigo-400 mb-2" />
                       <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Scorecard</span>
                    </div>
                 </div>
              </div>
           </div>
           {/* Decorative elements */}
           <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full -mr-32 -mt-32" />
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -ml-32 -mb-32" />
        </div>

        {/* Security & Integrity Feedback */}
        <div className={`p-6 rounded-3xl border flex items-center gap-6 transition-all ${
          violations?.length > 0 
            ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-amber-900/5' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-900/5'
        } shadow-lg`}>
           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm shrink-0 ${
             violations?.length > 0 ? 'bg-white border-amber-200' : 'bg-white border-emerald-200'
           }`}>
              {violations?.length > 0 ? <AlertTriangle className="w-7 h-7 text-amber-500" /> : <Shield className="w-7 h-7 text-emerald-500" />}
           </div>
           <div>
              <p className="text-sm font-bold tracking-tight">
                {violations?.length > 0 ? 'Security Advisory Noted' : 'Exceptional Integrity Observed'}
              </p>
              <p className="text-xs font-medium opacity-70 mt-1 max-w-2xl">
                {violations?.length > 0 
                  ? `Our monitoring system recorded ${violations.length} behavioral logs during your attempt. While this doesn't always indicate a violation, please maintain standard testing decorum in future assessments.`
                  : 'Your assessment session met all institutional security standards. No behavioral anomalies were recorded by our proctoring engine.'}
              </p>
           </div>
        </div>

        {/* Question-wise Breakdown */}
        <div className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                 <BarChart3 className="w-4 h-4 text-indigo-600" /> Detailed Performance Breakdown
              </h3>
              <span className="text-[10px] font-bold text-slate-500">{questions.length} Items Evaluated</span>
           </div>

           <div className="space-y-8">
              {questions.map((q, i) => {
                 const studentAnswer = rawAnswers[q.id];
                 const isCorrect = q.type === 'MCQ'
                   ? mcqAnswersMatch(studentAnswer, q.correctAnswer, q.options)
                   : true;
                 const logData = executionLogs[q.id];
                 const isWrongMCQ = q.type === 'MCQ' && !isCorrect;
                 const studentAnswerLabel = q.type === 'MCQ'
                   ? resolveMcqOptionLabel(q.options, studentAnswer)
                   : studentAnswer;
                 const correctAnswerLabel = q.type === 'MCQ'
                   ? resolveMcqOptionLabel(q.options, q.correctAnswer)
                   : q.correctAnswer;

                 return (
                    <div key={q.id} className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm hover:border-indigo-200 transition-all group/card">
                       {/* Question Header */}
                       <div className="p-6 sm:p-8 bg-slate-50/30 border-b border-slate-100 flex items-start justify-between gap-4">
                          <div className="flex gap-4">
                             <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-400 shrink-0 shadow-sm">
                                {i + 1}
                             </div>
                             <div>
                                <div className="flex items-center gap-3 mb-2">
                                   <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                                      q.type === 'MCQ' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                      q.type === 'CODING' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                                      'bg-amber-50 text-amber-600 border-amber-100'
                                   }`}>
                                      {q.type}
                                   </span>
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">• {q.points} Points Available</span>
                                </div>
                                <h4 className="text-base font-bold text-slate-900 leading-snug">{q.questionText}</h4>
                             </div>
                          </div>
                          {q.type === 'MCQ' && (
                             <div className={`p-2 rounded-xl border ${isCorrect ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                {isCorrect ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                             </div>
                          )}
                       </div>

                       {/* Question Body / Answer Area */}
                       <div className="p-8 space-y-6">
                          {q.type === 'MCQ' && (
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your Submission</p>
                                   <div className={`p-5 rounded-[20px] border-2 transition-all ${
                                      isCorrect ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-rose-50/50 border-rose-200 text-rose-800'
                                   }`}>
                                      <p className="text-sm font-bold leading-relaxed">{studentAnswerLabel || 'NO ATTEMPT RECORDED'}</p>
                                   </div>
                                </div>
                                {isWrongMCQ && (
                                   <div className="space-y-3">
                                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                         <Target className="w-3.5 h-3.5" /> Correct Answer Reference
                                      </p>
                                      <div className="p-5 rounded-[20px] border-2 bg-indigo-50/50 border-indigo-200 text-indigo-800">
                                         <p className="text-sm font-bold leading-relaxed">{correctAnswerLabel ?? '—'}</p>
                                      </div>
                                   </div>
                                )}
                             </div>
                          )}

                          {q.type === 'CODING' && (
                             <div className="space-y-6">
                                <div className="bg-slate-950 rounded-[20px] p-6 relative overflow-hidden shadow-xl">
                                   <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                         <Terminal className="w-4 h-4 text-emerald-400" />
                                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Submitted Solution</span>
                                      </div>
                                   </div>
                                   <pre className="text-xs font-mono text-indigo-300/90 overflow-x-auto leading-relaxed custom-scrollbar">
                                      {studentAnswer || '// No solution provided'}
                                   </pre>
                                </div>

                                {logData && (
                                   <div className="bg-white border border-slate-200 rounded-[20px] p-6">
                                      <div className="flex items-center justify-between mb-6">
                                         <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Execution Analytics</p>
                                            <h5 className="text-sm font-bold text-slate-900 mt-1">
                                               {logData.passed} / {logData.total} Test Cases Cleared
                                            </h5>
                                         </div>
                                         <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                               className="h-full bg-indigo-600 rounded-full" 
                                               style={{ width: `${(logData.passed / logData.total) * 100}%` }} 
                                            />
                                         </div>
                                      </div>
                                      <div className="grid gap-3">
                                         {logData.logs?.slice(0, 3).map((log, lidx) => (
                                            <div key={lidx} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                                               log.passed ? 'bg-emerald-50/30 border-emerald-100 text-emerald-800' : 'bg-rose-50/30 border-rose-100 text-rose-800'
                                            }`}>
                                               <div className="flex items-center gap-3 font-mono text-[11px]">
                                                  <div className={`w-2 h-2 rounded-full ${log.passed ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                                                  <span>Input: {log.input}</span>
                                               </div>
                                               <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                                                  {log.passed ? 'Verified' : 'Mismatch'}
                                               </span>
                                            </div>
                                         ))}
                                      </div>
                                   </div>
                                )}
                             </div>
                          )}

                          {q.type === 'DESCRIPTIVE' && (
                             <div className="space-y-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your response</p>
                                <div className="p-6 bg-slate-50 border border-slate-100 rounded-[20px] text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                                   {studentAnswer || 'No response recorded for this question.'}
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 w-fit">
                                   <Info className="w-3.5 h-3.5 text-indigo-500" />
                                   <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Awaiting Manual Verification by Faculty</span>
                                </div>
                             </div>
                          )}
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>

        {/* Footer CTA */}
        <div className="bg-white rounded-[32px] p-8 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                 <Activity className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                 <h4 className="text-lg font-bold text-slate-900 leading-tight">Want to improve?</h4>
                 <p className="text-sm text-slate-500 font-medium mt-0.5">Check out recommended study paths based on your gaps.</p>
              </div>
           </div>
           <button 
              onClick={() => navigate('/student')}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-3"
           >
              Return to Student Hub <ChevronRight className="w-4 h-4" />
           </button>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentResultStudent() {
  return (
    <ErrorBoundary>
      <AssessmentResultStudentComponent />
    </ErrorBoundary>
  );
}
