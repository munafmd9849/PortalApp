import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Trophy, Clock, Users, Search, Activity,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import MockInterviewResultBody from '../../components/mockInterview/MockInterviewResultBody';

const CONTENT_WIDTH = 'w-full lg:w-[75%] max-w-full mx-auto px-4 sm:px-6';

function formatSessionTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AdminMockInterviewResultsComponent() {
  const { id: driveId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const basePath = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!driveId) return;
    try {
      setLoading(true);
      const res = await api.getMockInterviewDriveResults(driveId);
      setData(res);
      const slotParam = searchParams.get('slot');
      if (slotParam && res?.sessions?.length) {
        const match = res.sessions.find((s) => s.id === slotParam);
        setSelectedSession(match || null);
      } else {
        setSelectedSession(null);
      }
    } catch (err) {
      toast?.error(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [driveId, searchParams, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBack = () => {
    navigate(`${basePath}?tab=mockInterviews`);
  };

  const openReport = (session) => {
    setSelectedSession(session);
    setSearchParams({ slot: session.id });
  };

  const closeReport = () => {
    setSelectedSession(null);
    setSearchParams({});
  };

  const sessions = (data?.sessions || []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.student?.fullName?.toLowerCase().includes(q) ||
      s.student?.enrollmentId?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
          Loading mock interview results
        </p>
      </div>
    );
  }

  const drive = data?.drive;
  const stats = data?.stats || { totalAttempts: 0, avgScore: 0 };
  const avgScore = stats.avgScore ?? 0;

  if (selectedSession) {
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
                Mock Interview Review:{' '}
                <span className="text-indigo-600">{selectedSession.student?.fullName}</span>
              </h1>
            </div>
            <p className="hidden sm:block text-xs text-slate-400 font-medium shrink-0 ml-4">
              {selectedSession.student?.enrollmentId}
            </p>
          </div>
        </div>

        <div className={`${CONTENT_WIDTH} mt-8`}>
          <MockInterviewResultBody
            scorePercent={selectedSession.scorePercent}
            feedback={selectedSession.feedback}
            durationSeconds={selectedSession.durationSeconds}
            driveCategory={drive?.category}
            badgeSuffix="Candidate feedback"
            sessionTime={formatSessionTime(selectedSession.startTime)}
          />
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
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg border border-slate-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-slate-900">
              Mock Interview Review:{' '}
              <span className="text-indigo-600">{drive?.title}</span>
            </h1>
          </div>
        </div>
      </div>

      <div className={`${CONTENT_WIDTH} mt-8 space-y-8`}>
        <div className="bg-slate-900 rounded-[32px] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-bold uppercase tracking-widest text-indigo-300 border border-white/5">
                  {drive?.category || 'Mock'} · Drive results
                </span>
                <h2 className="text-4xl font-bold mt-4 leading-tight">{avgScore}% Average</h2>
                <p className="text-slate-400 text-sm mt-3 font-medium">
                  {stats.totalAttempts} completed session{stats.totalAttempts === 1 ? '' : 's'} with feedback
                </p>
              </div>
              <div className="flex flex-wrap gap-6 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Candidates</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span className="text-lg font-bold tabular-nums">{stats.totalAttempts}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Drive date</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="text-lg font-bold">
                      {drive?.date ? new Date(drive.date).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" aria-hidden>
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="transparent"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="transparent"
                    stroke="white"
                    strokeWidth="12"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * avgScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <Trophy className="absolute w-10 h-10 text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" /> Candidate performance
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
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rank</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Score</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Result</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((session, idx) => (
                  <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-500">#{idx + 1}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{session.student?.fullName || '—'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{session.student?.enrollmentId}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-lg font-bold text-indigo-600 tabular-nums">
                        {session.scorePercent ?? 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold uppercase text-slate-600">
                        {session.feedback?.result?.replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatSessionTime(session.startTime)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openReport(session)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-colors"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-400 font-medium">
                      No completed sessions with interviewer feedback yet.
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

export default function AdminMockInterviewResults() {
  return (
    <ErrorBoundary>
      <AdminMockInterviewResultsComponent />
    </ErrorBoundary>
  );
}
