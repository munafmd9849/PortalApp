import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  ChevronLeft, Users, Clock, AlertTriangle, 
  CheckCircle, FileText, Code, Shield, X,
  Download, Share2, Filter, Search, ChevronRight,
  MoreHorizontal, Activity, Target, Trophy,
  Terminal, BookOpen, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

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
  const [errorMsg, setErrorMsg] = useState(null);

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

  const handleBack = () => {
    if (paramId) {
      navigate('/admin/assessments');
    } else {
      const basePath = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
      navigate(`${basePath}?tab=assessments`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'PENDING_REVIEW': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'DISQUALIFIED': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  if (errorMsg) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
           <AlertTriangle className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-slate-500 text-sm mb-6 text-center max-w-md">The assessment results couldn't be loaded. This might be due to a network error or missing data.</p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-600/20">Try Again</button>
      </div>
    );
  }

  if (loading) return (
    <div className="h-screen bg-white flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Analyzing Performance Data</p>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 border border-slate-200 transition-all shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{assessment?.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded uppercase tracking-wider border border-indigo-100">
                {assessment?.type?.replace('_', ' ')}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Results Insight
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="h-10 px-4 bg-white text-slate-600 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95">
             <Download className="w-4 h-4" /> Export
          </button>
          <button className="h-10 px-6 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95">
             <Share2 className="w-4 h-4" /> Publish Results
          </button>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Total Attempts', val: assessment?.sessions?.length || 0, icon: Users, color: 'indigo' },
          { label: 'Avg Score', val: `${assessment?.sessions?.length ? Math.round(assessment.sessions.reduce((acc, s) => acc + (s.score || 0), 0) / assessment.sessions.length) : 0}%`, icon: Trophy, color: 'emerald' },
          { label: 'Violations Rate', val: (assessment?.sessions?.length ? (assessment.sessions.reduce((acc, s) => acc + (s.violations?.length || 0), 0) / assessment.sessions.length).toFixed(1) : 0), icon: AlertTriangle, color: 'amber' },
          { label: 'Pass Rate', val: '72%', icon: Target, color: 'purple' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 group hover:border-indigo-200 transition-all">
             <div className={`w-12 h-12 bg-${stat.color}-50 rounded-xl flex items-center justify-center text-${stat.color}-600 border border-${stat.color}-100`}>
                <stat.icon className="w-5 h-5" />
             </div>
             <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
                <h3 className="text-xl font-bold text-slate-900 tabular-nums">{stat.val}</h3>
             </div>
          </div>
        ))}
      </div>

      {/* Main Leaderboard Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
           <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Candidate performance</h3>
           </div>
           <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
                 <Search className="w-3.5 h-3.5 text-slate-400" />
                 <input placeholder="Search candidate..." className="bg-transparent border-none outline-none text-[10px] font-bold w-40" />
              </div>
              <button className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-400">
                 <Filter className="w-3.5 h-3.5" />
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Info</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Score</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Security Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attempted At</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right pr-10">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {assessment?.sessions?.map((session, idx) => (
                <tr key={session.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-6 py-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200">
                      #{idx + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm uppercase">
                        {session.student?.fullName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{session.student?.fullName || 'Anonymous'}</p>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">{session.student?.enrollmentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex flex-col items-center">
                       <span className="text-lg font-bold text-indigo-600 tabular-nums leading-none">{session.score || 0}</span>
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">PERCENTILE: {95 - idx}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${getStatusBadge(session.status)}`}>
                         {session.status?.replace('_', ' ')}
                       </span>
                       <div className="flex items-center gap-1.5">
                          <AlertTriangle className={`w-3 h-3 ${session.violations?.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                          <span className="text-[10px] font-bold text-slate-400">{session.violations?.length || 0} Logs</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-600">
                           {new Date(session.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                           {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right pr-10">
                    <button 
                      onClick={() => setSelectedSession(session)}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-md shadow-slate-900/10"
                    >
                      Deep Dive
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
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[99999] animate-in fade-in duration-300">
          <div className="w-full h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-100">
             {/* Panel Header */}
             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-600/20">
                      {selectedSession.student?.fullName?.charAt(0) || '?'}
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-none">{selectedSession.student?.fullName}</h3>
                      <div className="flex items-center gap-2 mt-2">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate Performance Insight</span>
                         <div className="w-1 h-1 bg-slate-300 rounded-full" />
                         <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">#{selectedSession.id.slice(-6)}</span>
                      </div>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="w-10 h-10 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all flex items-center justify-center"
                >
                   <X className="w-5 h-5" />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
                {/* Score Section */}
                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
                   <Trophy className="absolute top-0 right-0 w-48 h-48 text-white/5 -mr-10 -mt-10" />
                   <div className="relative z-10 grid grid-cols-2 gap-8 items-center">
                      <div className="space-y-1">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Final Performance Score</p>
                         <div className="flex items-baseline gap-3">
                            <span className="text-5xl font-bold tabular-nums">{selectedSession.score || 0}%</span>
                            <span className="text-sm font-semibold text-slate-500 uppercase">Proficiency</span>
                         </div>
                         <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                             <Clock className="w-3.5 h-3.5" /> 
                             Time Spent: {
                               selectedSession.startTime && selectedSession.endTime 
                                 ? `${Math.floor((new Date(selectedSession.endTime) - new Date(selectedSession.startTime)) / 60000)}m ${Math.floor(((new Date(selectedSession.endTime) - new Date(selectedSession.startTime)) % 60000) / 1000)}s`
                                 : 'N/A'
                             }
                          </div>
                      </div>
                      <div className="text-right space-y-3">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Clearance</p>
                         <span className={`inline-block px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${getStatusBadge(selectedSession.status)} shadow-sm`}>
                            {selectedSession.status?.replace('_', ' ')}
                         </span>
                      </div>
                   </div>
                </div>

                {/* Proctored Logs */}
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-indigo-600" /> Proctoring Log
                      </h4>
                      <span className="text-[10px] font-bold text-slate-500">Live Snapshot History (3)</span>
                   </div>
                   
                   {selectedSession.violations?.length > 0 ? (
                     <div className="grid gap-3">
                        {selectedSession.violations.map((v, i) => (
                           <div key={i} className="flex items-start gap-4 p-5 bg-rose-50/50 border border-rose-100 rounded-2xl group hover:border-rose-300 transition-all">
                              <div className="w-10 h-10 bg-white rounded-xl border border-rose-100 flex items-center justify-center shrink-0">
                                 <AlertCircle className="w-5 h-5 text-rose-500" />
                              </div>
                              <div className="flex-1">
                                 <div className="flex justify-between items-start">
                                    <p className="text-xs font-bold text-rose-900 uppercase tracking-wide">{v.type?.replace(/_/g, ' ')}</p>
                                    <span className="text-[9px] font-bold text-rose-400 bg-white px-2 py-0.5 rounded border border-rose-100 tabular-nums">
                                       {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                 </div>
                                 <p className="text-[11px] font-medium text-rose-600/80 mt-1.5 leading-relaxed">{v.details}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                   ) : (
                     <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-5 text-emerald-700 shadow-sm shadow-emerald-500/5">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-emerald-100 shadow-sm">
                           <CheckCircle className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                           <p className="text-sm font-bold">Standard Integrity Observed</p>
                           <p className="text-xs font-medium opacity-70 mt-0.5">No critical proctoring violations were logged during this attempt.</p>
                        </div>
                     </div>
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
                                       <div className={`p-4 rounded-xl border-2 transition-all ${studentAnswer === q.correctAnswer ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                                          <span className="text-xs font-bold">{studentAnswer || 'NO RESPONSE'}</span>
                                       </div>
                                    </div>
                                    <div className="space-y-2">
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Key (Correct)</p>
                                       <div className="p-4 rounded-xl border-2 bg-slate-50 border-slate-200 text-slate-700">
                                          <span className="text-xs font-bold">{q.correctAnswer}</span>
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

             {/* Panel Footer */}
             <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-between items-center">
                <button className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest flex items-center gap-2">
                   <AlertCircle className="w-4 h-4" /> Void Attempt
                </button>
                <button 
                   onClick={() => setSelectedSession(null)}
                   className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-all"
                >
                   Close Insight
                </button>
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
