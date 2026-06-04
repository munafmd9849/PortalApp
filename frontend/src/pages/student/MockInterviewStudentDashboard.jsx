import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, Video, BookOpen, 
  ChevronRight, AlertCircle, CheckCircle2,
  Timer, Star, MessageSquare, ArrowRight,
  Shield, User, PlayCircle, Clock3, Ban,
  Layout, Info, Trophy, Target, Sparkles,
  Camera, Lock, FileText,
} from 'lucide-react';
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
      case 'SCHEDULED': return <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full border border-indigo-100 uppercase tracking-wider">Scheduled</span>;
      case 'WAITING': return <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full border border-amber-100 uppercase tracking-wider flex items-center gap-2">Waiting Room</span>;
      case 'LIVE': return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100 uppercase tracking-wider flex items-center gap-2 animate-pulse">Session Live</span>;
      case 'COMPLETED': return <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200 uppercase tracking-wider">Completed</span>;
      case 'MISSED': return <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full border border-rose-100 uppercase tracking-wider">Missed</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">My Mock Interviews</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Live 1:1 sessions and AI video mock interviews</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 flex items-center gap-2 shadow-sm shadow-indigo-500/5">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Candidate Portal</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Timeline */}
        <div className="lg:col-span-2 space-y-6">
           {aiInterviews.length > 0 && (
             <div className="space-y-6">
               <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/10">
                 <div className="relative z-10 space-y-3">
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                     <Shield className="w-3.5 h-3.5 text-indigo-400" />
                     <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Secure video session</span>
                   </div>
                   <h2 className="text-xl font-bold tracking-tight">AI Video Mock Interviews</h2>
                   <p className="text-slate-400 text-sm font-medium max-w-lg">
                     Proctored one-way interviews with timed questions. Use a quiet room, camera, and fullscreen.
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
                         <div className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${statusColor}`}>
                           {statusLabel}
                         </div>
                       </div>
                       <div className="flex-1 space-y-2">
                         <span className="text-[9px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                           {iv.interviewType?.replace(/_/g, ' ')}
                         </span>
                         <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                           {iv.title}
                         </h3>
                         <p className="text-sm text-slate-500 font-medium">
                           {iv.questionCount} questions · {iv.progressPercent ?? 0}% progress
                         </p>
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
                             Opens {new Date(iv.startDate).toLocaleDateString()}
                           </button>
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           )}

           <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Calendar className="w-4 h-4" /> Live 1:1 Sessions
              </h2>
           </div>

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
                   You haven't been assigned to any mock drives. Check back later or notify your placement officer.
                </p>
             </div>
           ) : (
             <div className="space-y-4">
                {slots.map((slot) => {
                  const driveDate = new Date(slot.startTime);
                  const isCompleted = slot.status === 'COMPLETED';
                  const hasFeedback = Boolean(slot.feedback);

                  return (
                    <div key={slot.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative border-l-4 border-l-indigo-600">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                         <div className="flex gap-5">
                            {/* Date Card */}
                            <div className="w-14 h-14 bg-slate-900 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0 shadow-lg shadow-slate-900/10">
                               <span className="text-[10px] font-bold uppercase tracking-tight opacity-70">
                                 {driveDate.toLocaleString('default', { month: 'short' })}
                               </span>
                               <span className="text-xl font-bold leading-none">
                                 {driveDate.getDate()}
                               </span>
                            </div>

                            <div>
                               <div className="flex items-center gap-3 mb-1">
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded uppercase tracking-wider border border-indigo-100">
                                     {slot.drive.category} Round
                                  </span>
                                  {getStatusBadge(slot.status)}
                               </div>
                               <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {slot.drive.title}
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
                            <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200">
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

        {/* Right Column: Stats & Tips */}
        <div className="space-y-8">
           {/* Performance Widget */}
           <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-900/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Trophy className="w-32 h-32 text-white" />
              </div>

              <div className="relative z-10 space-y-6">
                 <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Session Analytics</h3>
                    <p className="text-2xl font-bold">Prep Performance</p>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      const completed = slots.filter(s => s.status === 'COMPLETED').length;
                      const upcoming = slots.filter(s => ['SCHEDULED', 'WAITING', 'LIVE'].includes(s.status)).length;
                      return (
                        <>
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed</p>
                             <p className="text-xl font-bold mt-1 tabular-nums">{completed}</p>
                          </div>
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Upcoming</p>
                             <p className="text-xl font-bold mt-1 tabular-nums">{upcoming}</p>
                          </div>
                        </>
                      );
                    })()}
                 </div>

                 <div className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <Target className="w-3 h-3" /> Readiness Score
                       </span>
                       <span className="text-xs font-bold text-emerald-400">85%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 w-[85%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                    </div>
                 </div>
              </div>
           </div>

           {/* Quick Tips */}
           <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Info className="w-3.5 h-3.5" /> Interview Success Tips
              </h4>
              <div className="space-y-4">
                 {[
                   { title: "Stable Connection", desc: "Test your internet speed 15 mins before your slot." },
                   { title: "Formal Attire", desc: "Dress for success as you would for a real interview." },
                   { title: "Quiet Setting", desc: "Choose a distraction-free space for best focus." }
                 ].map((tip, i) => (
                   <div key={i} className="flex gap-4 group">
                      <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
                        {i + 1}
                      </div>
                      <div>
                         <p className="text-xs font-bold text-slate-900">{tip.title}</p>
                         <p className="text-[10px] font-medium text-slate-500 leading-relaxed mt-0.5">{tip.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
