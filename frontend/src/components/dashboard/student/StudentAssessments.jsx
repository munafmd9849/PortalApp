import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Clock, Calendar, ChevronRight, 
  CheckCircle, AlertCircle, PlayCircle, 
  Camera, Users, FileText, Activity,
  Lock, ArrowRight, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useToast } from '../../ui/Toast';

export default function StudentAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStudentAssessments();
      setAssessments(data);
    } catch (e) {
      toast?.error('Failed to load your assessments');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'COMPLETED': return { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', label: 'Completed' };
      case 'IN_PROGRESS': return { color: 'text-amber-600 bg-amber-50 border-amber-100', label: 'In Progress' };
      default: return { color: 'text-indigo-600 bg-indigo-50 border-indigo-100', label: 'Not Started' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'MOCK_TEST': return <FileText className="w-5 h-5" />;
      case 'MOCK_INTERVIEW_AUTO': return <Camera className="w-5 h-5" />;
      case 'MOCK_INTERVIEW_LIVE': return <Users className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Syncing Assessment Engine...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 sm:space-y-12 py-6 sm:py-8 animate-in fade-in duration-500">
      {/* Page Header / Hero Section */}
      <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/10">
        <div className="relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Secure Testing Environment</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Your Assessment Hub</h1>
          <p className="text-slate-400 max-w-xl text-sm sm:text-base leading-relaxed font-medium">
            Improve your performance with standardized mock tests and live interview sessions. 
            Track your progress and receive detailed institutional feedback.
          </p>
        </div>
        
        {/* Modern decorative background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[100px] -mr-48 -mt-48 rounded-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[80px] -ml-32 -mb-32 rounded-full" />
      </div>

      {/* Statistics Row (Mini-cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {[
           { label: 'Pending Tests', val: assessments.filter(a => !a.sessions?.length).length, color: 'indigo' },
           { label: 'Completed', val: assessments.filter(a => a.sessions?.[0]?.status === 'COMPLETED').length, color: 'emerald' },
           { label: 'Ongoing', val: assessments.filter(a => a.sessions?.[0]?.status === 'IN_PROGRESS').length, color: 'amber' },
           { label: 'Avg Score', val: '84%', color: 'purple' }
         ].map((stat, i) => (
           <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                 <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">{stat.val}</p>
              </div>
              <div className={`w-8 h-8 rounded-lg bg-${stat.color}-50 border border-${stat.color}-100 flex items-center justify-center`}>
                 <Activity className={`w-4 h-4 text-${stat.color}-600`} />
              </div>
           </div>
         ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {assessments.map((item) => {
          const session = item.sessions?.[0];
          const isCompleted = session?.status === 'COMPLETED';
          const assignment =
            item.assignments?.find((a) => a.scheduledAt) ||
            item.assignments?.find((a) => a.studentId) ||
            item.assignments?.[0];
          const scheduledAt = assignment?.scheduledAt;
          const status = getStatusConfig(session?.status);
          
          // Allow joining if no schedule is set OR if it's within 15 mins of start time
          const canJoin = !scheduledAt || (new Date(scheduledAt).getTime() - new Date().getTime() <= 15 * 60 * 1000);
          const isEarly = scheduledAt && !canJoin;

          return (
            <div 
              key={item.id} 
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group flex flex-col h-full relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-xl ${status.color} border shadow-sm`}>
                  {getTypeIcon(item.type)}
                </div>
                <div className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${status.color}`}>
                  {status.label}
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed font-medium">
                  {item.description || 'Institutional assessment for performance evaluation.'}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span className="uppercase">{item.duration} Mins</span>
                  </div>
                  {scheduledAt && (
                    <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">
                        {new Date(scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>

                {isCompleted ? (
                  <div className="space-y-3">
                     <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Performance Score</span>
                        <span className="text-sm font-bold text-emerald-600">{session.score}%</span>
                     </div>
                     <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${session.score}%` }} />
                     </div>
                     <button 
                       onClick={() => navigate(`/assessment/results/${session.id}`)}
                       className="w-full mt-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                     >
                       <FileText className="w-4 h-4" /> View Detailed Analytics
                     </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => canJoin && navigate(`/assessment/${item.id}`)}
                    disabled={isEarly}
                    className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 ${
                      isEarly 
                        ? 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed' 
                        : 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-indigo-600 hover:shadow-indigo-500/20'
                    }`}
                  >
                    {isEarly ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Window Not Open
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4" />
                        {item.type?.includes('INTERVIEW') ? 'Join Session' : 'Start Mock Test'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {assessments.length === 0 && (
          <div className="col-span-full py-40 flex flex-col items-center justify-center text-slate-600">
             <Shield className="w-16 h-16 mb-4 opacity-10" />
             <p className="font-bold text-sm">No pending assessments at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
