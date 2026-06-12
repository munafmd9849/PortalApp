import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, Calendar,
  CheckCircle, PlayCircle,
  Camera, Users, FileText, Activity,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { getAssessmentEntryStatus, formatAssessmentWindow } from '../../../utils/assessmentEntryWindow';
import { useToast } from '../../ui/Toast';

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
      case 'COMPLETED':
        return { color: 'text-emerald-700 bg-emerald-50 border-emerald-100', label: 'Completed' };
      case 'IN_PROGRESS':
        return { color: 'text-amber-700 bg-amber-50 border-amber-100', label: 'In Progress' };
      default:
        return { color: 'text-blue-700 bg-blue-50 border-blue-100', label: 'Not Started' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'MOCK_TEST':
        return <FileText className="w-5 h-5" />;
      case 'MOCK_INTERVIEW_AUTO':
        return <Camera className="w-5 h-5" />;
      case 'MOCK_INTERVIEW_LIVE':
        return <Users className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const pendingCount = assessments.filter((a) => !a.sessions?.length).length;
  const completedCount = assessments.filter((a) => a.sessions?.[0]?.status === 'COMPLETED').length;
  const ongoingCount = assessments.filter((a) => a.sessions?.[0]?.status === 'IN_PROGRESS').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-10 h-10 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading assessments...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 p-4 sm:p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', val: pendingCount, color: 'blue' },
          { label: 'Completed', val: completedCount, color: 'emerald' },
          { label: 'In Progress', val: ongoingCount, color: 'amber' },
          { label: 'Total', val: assessments.length, color: 'slate' },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-gray-500">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5 tabular-nums">{stat.val}</p>
            </div>
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center ${STAT_ICON_BOX[stat.color]}`}
            >
              <Activity className={`w-4 h-4 ${STAT_ICON_COLOR[stat.color]}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assessments.map((item) => {
          const session = item.sessions?.[0];
          const isCompleted = session?.status === 'COMPLETED';
          const assignment =
            item.assignments?.find((a) => a.scheduledAt) ||
            item.assignments?.find((a) => a.studentId) ||
            item.assignments?.[0];
          const scheduledAt = assignment?.scheduledAt;
          const status = getStatusConfig(session?.status);
          const entry = getAssessmentEntryStatus(item);
          const canJoin =
            !isCompleted &&
            (entry.status === 'ALLOWED' || entry.status === 'UNSCHEDULED');
          const isEarly = entry.status === 'TOO_EARLY';
          const isLate = entry.status === 'TOO_LATE';

          return (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-lg border ${status.color}`}>
                  {getTypeIcon(item.type)}
                </div>
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${status.color}`}>
                  {status.label}
                </span>
              </div>

              <div className="flex-1 space-y-1.5">
                <h3 className="text-base font-semibold text-gray-900 leading-snug">{item.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {item.description || 'Assessment assigned by your institution.'}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{item.duration} min</span>
                  </div>
                  {(item.startTime || scheduledAt) && (
                    <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">
                        {item.startTime
                          ? formatAssessmentWindow(item.startTime)
                          : new Date(scheduledAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                      </span>
                    </div>
                  )}
                </div>

                {isCompleted ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Score</span>
                      <span className="text-sm font-semibold text-emerald-700">{session.score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${session.score}%` }}
                      />
                    </div>
                    <button
                      onClick={() => navigate(`/assessment/results/${session.id}`)}
                      className="w-full mt-2 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> View results
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => canJoin && navigate(`/assessment/${item.id}`)}
                    disabled={isEarly || isLate}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      isEarly || isLate
                        ? 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isEarly ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Opens {formatAssessmentWindow(entry.entryOpensAt)}
                      </>
                    ) : isLate ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Entry closed
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4" />
                        {item.type?.includes('INTERVIEW') ? 'Join session' : 'Start test'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {assessments.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-lg border border-gray-200">
            <FileText className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">No assessments assigned yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
