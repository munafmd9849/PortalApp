import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Video, Activity,
  PlayCircle, Info, Trophy,
  Camera, Lock, FileText,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';

const STAT_ICON_BOX = {
  blue: 'bg-blue-50 border-blue-100',
  emerald: 'bg-emerald-50 border-emerald-100',
  amber: 'bg-amber-50 border-amber-100',
  slate: 'bg-gray-50 border-gray-200',
};

const STAT_ICON_COLOR = {
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  slate: 'text-gray-600',
};

const EMPTY_STATS = {
  completed: 0,
  upcoming: 0,
  avgScore: null,
  assigned: 0,
};

export default function MockInterviewStudentDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [aiInterviews, setAiInterviews] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);

  const loadSlots = useCallback(async () => {
    try {
      setLoading(true);
      const [data, ai, summary] = await Promise.all([
        api.getStudentMockInterviews(),
        api.getStudentAiInterviews().catch(() => []),
        api.getStudentMockInterviewStats().catch(() => EMPTY_STATS),
      ]);
      setSlots(Array.isArray(data) ? data : []);
      setAiInterviews(Array.isArray(ai) ? ai : []);
      setStats({
        completed: summary?.completed ?? 0,
        upcoming: summary?.upcoming ?? 0,
        avgScore: summary?.avgScore ?? null,
        assigned: summary?.assigned ?? 0,
      });
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
      case 'SCHEDULED':
        return (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded border border-blue-100">
            Scheduled
          </span>
        );
      case 'WAITING':
        return (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-medium rounded border border-amber-100">
            Waiting
          </span>
        );
      case 'LIVE':
        return (
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded border border-emerald-100">
            Live
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-medium rounded border border-gray-200">
            Completed
          </span>
        );
      case 'MISSED':
        return (
          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[11px] font-medium rounded border border-red-100">
            Missed
          </span>
        );
      default:
        return null;
    }
  };

  const renderAiInterviewCard = (iv) => {
    const isCompleted = iv.status === 'COMPLETED';
    const statusColor = isCompleted
      ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
      : iv.status === 'IN_PROGRESS'
        ? 'text-amber-700 bg-amber-50 border-amber-100'
        : 'text-blue-700 bg-blue-50 border-blue-100';
    const statusLabel = isCompleted
      ? 'Completed'
      : iv.status === 'IN_PROGRESS'
        ? 'In Progress'
        : 'Not Started';

    return (
      <div
        key={iv.enrollmentId}
        className="bg-white rounded-lg border border-gray-200 p-3.5 hover:shadow-sm transition-shadow flex flex-col"
      >
        <div className="flex justify-between items-start mb-2.5">
          <div className={`p-2 rounded-md border ${statusColor}`}>
            <Camera className="w-4 h-4" />
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{iv.title}</h3>
          <p className="text-xs text-gray-500">
            {iv.questionCount} questions · {iv.progressPercent ?? 0}% done
          </p>
          {iv.startDate && iv.endDate && (
            <p className="text-[11px] text-gray-400 line-clamp-1">
              {new Date(iv.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              {' – '}
              {new Date(iv.endDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          {isCompleted ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <FileText className="w-3.5 h-3.5" /> Submitted
            </div>
          ) : iv.canStart ? (
            <button
              type="button"
              onClick={() => navigate(`/student/interviews/${iv.interviewId}`)}
              className="w-full py-2 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-black transition-colors flex items-center justify-center gap-1.5"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              {iv.status === 'IN_PROGRESS' ? 'Resume session' : 'Start session'}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-2 rounded-md text-xs font-medium bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
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
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Completed', val: loading ? '—' : stats.completed, color: 'emerald' },
          { label: 'Upcoming', val: loading ? '—' : stats.upcoming, color: 'blue' },
          {
            label: 'Avg. Score',
            val: loading ? '—' : stats.avgScore != null ? `${stats.avgScore}%` : '—',
            color: 'slate',
          },
          { label: 'Assigned', val: loading ? '—' : stats.assigned, color: 'amber' },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-[11px] font-medium text-gray-500">{stat.label}</p>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{stat.val}</p>
            </div>
            <div
              className={`w-7 h-7 rounded-md border flex items-center justify-center ${STAT_ICON_BOX[stat.color]}`}
            >
              <Activity className={`w-3.5 h-3.5 ${STAT_ICON_COLOR[stat.color]}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {aiInterviews.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {aiInterviews.map(renderAiInterviewCard)}
          </div>
        )}

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 bg-white rounded-lg border border-gray-200">
            <div className="w-8 h-8 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs text-gray-500">Loading sessions...</p>
          </div>
        ) : slots.length === 0 && aiInterviews.length === 0 ? (
          <div className="bg-white rounded-lg p-8 border border-gray-200 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6 text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No sessions scheduled</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              You haven&apos;t been assigned to any mock interviews yet.
            </p>
          </div>
        ) : slots.length > 0 ? (
          <div className="space-y-3">
            {slots.map((slot) => {
              const driveDate = new Date(slot.startTime);
              const isCompleted = slot.status === 'COMPLETED';
              const hasFeedback = Boolean(slot.feedback);

              return (
                <div
                  key={slot.id}
                  className="bg-white rounded-lg p-3.5 border border-gray-200 hover:shadow-sm transition-shadow border-l-[3px] border-l-blue-600"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                      <div className="w-10 h-10 bg-blue-600 rounded-md flex flex-col items-center justify-center text-white flex-shrink-0">
                        <span className="text-[9px] font-medium uppercase opacity-90">
                          {driveDate.toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="text-sm font-bold leading-none">{driveDate.getDate()}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded border border-blue-100">
                            {slot.drive?.category} Round
                          </span>
                          {getStatusBadge(slot.status)}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{slot.drive?.title}</h3>
                        <div className="flex items-center gap-1 mt-0.5 text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span className="text-[11px] tabular-nums">
                            {driveDate.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isCompleted ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/mock-interview-precheck/${slot.id}`)}
                          className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" /> Enter room
                        </button>
                      ) : hasFeedback ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/mock-interview/results/${slot.id}`)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-blue-100"
                        >
                          <Trophy className="w-3.5 h-3.5" /> View report
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded-md border border-gray-100">
                          Awaiting feedback
                        </span>
                      )}
                      <button
                        type="button"
                        className="p-1.5 bg-gray-50 text-gray-400 rounded-md hover:bg-gray-100 hover:text-gray-600 transition-colors border border-gray-200"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
