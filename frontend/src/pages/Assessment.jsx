import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { 
  Loader, 
  X, 
  Download, 
  Send, 
  Power, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Eye,
  Users
} from 'lucide-react';
import DashboardHome from '../components/dashboard/student/DashboardHome';
import { getStudentProfile, getEducationalBackground, getStudentSkills } from '../services/students';
import { getTargetedJobsForStudent } from '../services/jobs';
import { getStudentApplications } from '../services/applications';
import { ImEye } from 'react-icons/im';
import { FaTimes } from 'react-icons/fa';
import PWIOILOGO from '../assets/images/brand_logo.webp';
import { SquarePen } from 'lucide-react';

const STATUS_OPTIONS = [
  { id: 'PENDING', name: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { id: 'SELECTED', name: 'Selected', color: 'bg-green-100 text-green-800 border-green-300' },
  { id: 'REJECTED', name: 'Rejected', color: 'bg-red-100 text-red-800 border-red-300' },
  { id: 'ON_HOLD', name: 'On Hold', color: 'bg-orange-100 text-orange-800 border-orange-300' },
];

const Assessment = () => {
  const { interviewId, roundName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [dashboardData, setDashboardData] = useState({ loading: true, error: null, jobs: [], applications: [], skills: [] });
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editingMarks, setEditingMarks] = useState('');
  const [editingRemarks, setEditingRemarks] = useState('');
  const [editingStatus, setEditingStatus] = useState('PENDING');
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [roundInfo, setRoundInfo] = useState(null);
  const activitiesIntervalRef = useRef(null);

  // Calculate stats from candidates
  const stats = useMemo(() => {
    const total = candidates.length;
    const interviewed = candidates.filter(c => c.evaluation?.marks !== null && c.evaluation?.marks !== undefined).length;
    const pending = candidates.filter(c => !c.evaluation || c.evaluation.status === 'PENDING').length;
    const selected = candidates.filter(c => c.evaluation?.status === 'SELECTED').length;
    const rejected = candidates.filter(c => c.evaluation?.status === 'REJECTED').length;
    const onHold = candidates.filter(c => c.evaluation?.status === 'ON_HOLD').length;
    
    return { total, interviewed, pending, selected, rejected, onHold };
  }, [candidates]);

  // Check authentication (admin or super_admin)
  useEffect(() => {
    const r = (role || '').toLowerCase();
    if (!user || (r !== 'admin' && r !== 'super_admin')) {
      navigate(base || '/admin', { replace: true });
    }
  }, [user, role, navigate, base]);

  // Load candidates and activities
  useEffect(() => {
    if (interviewId && roundName) {
      loadCandidates();
      loadActivities();
      
      // Set up polling for real-time updates (every 5 seconds as per requirements)
      activitiesIntervalRef.current = setInterval(() => {
        loadActivities();
        loadCandidates();
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (activitiesIntervalRef.current) {
        clearInterval(activitiesIntervalRef.current);
      }
    };
  }, [interviewId, roundName]);

  const loadCandidates = async () => {
    try {
      console.log('🔍 [Assessment] Loading candidates:', { interviewId, roundName });
      const data = await api.getInterviewCandidates(interviewId, roundName);
      console.log('✅ [Assessment] Candidates loaded:', {
        count: data.candidates?.length || 0,
        candidates: data.candidates,
      });
      setCandidates(data.candidates || []);
      setRoundInfo(data.round);
      setLoading(false);
    } catch (error) {
      console.error('❌ [Assessment] Error loading candidates:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.status,
        interviewId,
        roundName,
      });
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const data = await api.getInterviewActivities(interviewId);
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const handleViewProfile = async (candidate) => {
    setSelectedCandidate(candidate);
    setShowProfile(true);
    
    // Load dashboard data for the student
    try {
      setDashboardData({ loading: true, error: null, jobs: [], applications: [], skills: [] });
      
      const [profile, education, skills, jobs, applications] = await Promise.all([
        getStudentProfile(candidate.student.id),
        getEducationalBackground(candidate.student.id),
        getStudentSkills(candidate.student.id),
        getTargetedJobsForStudent(candidate.student.id),
        getStudentApplications(candidate.student.id)
      ]);

      setDashboardData({
        loading: false,
        error: null,
        jobs: jobs || [],
        applications: applications || [],
        skills: skills || [],
        education: education || [],
      });
    } catch (error) {
      console.error('Error loading student data:', error);
      setDashboardData({ loading: false, error: 'Failed to load student data', jobs: [], applications: [], skills: [] });
    }
  };

  const handleEditEvaluation = (candidate) => {
    setEditingCandidate(candidate);
    setEditingMarks(candidate.evaluation?.marks?.toString() || '');
    setEditingRemarks(candidate.evaluation?.remarks || '');
    setEditingStatus(candidate.evaluation?.status || 'PENDING');
  };

  const handleCancelEdit = () => {
    setEditingCandidate(null);
    setEditingMarks('');
    setEditingRemarks('');
    setEditingStatus('PENDING');
  };

  const handleSaveEvaluation = async (candidate) => {
    if (!candidate) return;

    // Validate remarks for REJECTED or ON_HOLD
    if ((editingStatus === 'REJECTED' || editingStatus === 'ON_HOLD') && (!editingRemarks || editingRemarks.trim().length === 0)) {
      alert('Remarks are required for REJECTED or ON_HOLD status');
      return;
    }

    // Validate marks range if provided
    if (editingMarks && editingMarks.trim() !== '') {
      const marksNum = parseFloat(editingMarks);
      if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
        alert('Marks must be a number between 0 and 100');
        return;
      }
    }

    try {
      setSavingEvaluation(true);
      await api.evaluateCandidate(interviewId, candidate.student.id, {
        roundName: roundName,
        marks: editingMarks && editingMarks.trim() !== '' ? parseFloat(editingMarks) : null,
        remarks: editingRemarks.trim() || null,
        status: editingStatus
      });

      // Reload candidates to reflect changes
      await loadCandidates();
      await loadActivities();
      
      setEditingCandidate(null);
      setEditingMarks('');
      setEditingRemarks('');
      setEditingStatus('PENDING');
    } catch (error) {
      console.error('Error saving evaluation:', error);
      alert(`Failed to save evaluation: ${error.message}`);
    } finally {
      setSavingEvaluation(false);
    }
  };

  const handleEndSession = async () => {
    try {
      setEndingSession(true);
      const data = await api.endInterviewSession(interviewId);
      
      // Show summary modal
      alert(`Session ended successfully!\n\nSummary:\n- Total: ${data.summary?.totalCandidates || data.summary?.total || 0}\n- Selected: ${data.summary?.selectedCandidates || data.summary?.selected || 0}\n- Rejected: ${data.summary?.rejectedCandidates || data.summary?.rejected || 0}\n- On Hold: ${data.summary?.onHoldCandidates || data.summary?.onHold || 0}\n- Pending: ${data.summary?.pendingCandidates || data.summary?.pending || 0}`);
      
      // Close tab after confirmation
      if (window.confirm('Session ended. Close this tab?')) {
        window.close();
      }
    } catch (error) {
      console.error('Error ending session:', error);
      alert(`Failed to end session: ${error.message}`);
    } finally {
      setEndingSession(false);
      setShowEndSessionModal(false);
    }
  };

  const handleExportResults = () => {
    // TODO: Implement export functionality
    alert('Export functionality coming soon!');
  };

  const handleSendAnnouncement = () => {
    // TODO: Implement announcement functionality
    alert('Announcement functionality coming soon!');
  };

  const getStatusBadge = (status) => {
    const statusOption = STATUS_OPTIONS.find(s => s.id === status) || STATUS_OPTIONS[0];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusOption.color}`}>
        {statusOption.name}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assessment - {roundName}</h1>
            <p className="text-sm text-gray-600 mt-1">Interview Session ID: {interviewId}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Live Feed with Stats - Above Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Live Feed & Statistics</h2>
          </div>
          
          {/* Stats Cards */}
          <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-gradient-to-br from-white to-gray-100 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-600 rounded-full">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">Total</p>
                  <p className="text-2xl font-bold text-black">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-blue-200 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-full">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-700">Interviewed</p>
                  <p className="text-2xl font-bold text-black">{stats.interviewed}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-yellow-200 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-600 rounded-full">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-yellow-700">Pending</p>
                  <p className="text-2xl font-bold text-black">{stats.pending}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-green-200 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-full">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-700">Selected</p>
                  <p className="text-2xl font-bold text-black">{stats.selected}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-red-200 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-full">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-700">Rejected</p>
                  <p className="text-2xl font-bold text-black">{stats.rejected}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-orange-200 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-600 rounded-full">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-orange-700">On Hold</p>
                  <p className="text-2xl font-bold text-black">{stats.onHold}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Live Feed Activities */}
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No activities yet</p>
              ) : (
                activities.slice(0, 5).map((activity) => {
                  // Determine icon based on activity type
                  let icon = <Clock className="w-4 h-4 text-gray-600" />;
                  if (activity.activityType === 'EVALUATION') {
                    icon = <CheckCircle className="w-4 h-4 text-green-600" />;
                  } else if (activity.activityType === 'ROUND_STARTED') {
                    icon = <Clock className="w-4 h-4 text-blue-600" />;
                  } else if (activity.activityType === 'SESSION_ENDED') {
                    icon = <XCircle className="w-4 h-4 text-red-600" />;
                  } else if (activity.activityType === 'SESSION_STARTED') {
                    icon = <CheckCircle className="w-4 h-4 text-green-600" />;
                  }

                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Excel-like Candidate Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Candidates ({candidates.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">Name</th>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">Email</th>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">Enrollment ID</th>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">Batch</th>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">Marks</th>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">Remarks</th>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">Status</th>
                  <th className="p-3 text-center font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-gray-500">
                      No candidates found for this round
                    </td>
                  </tr>
                ) : (
                  candidates.map((candidate) => (
                    <tr key={candidate.student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 text-gray-800 font-medium border-r border-gray-200">
                        {candidate.student.fullName || candidate.student.user?.displayName || 'N/A'}
                      </td>
                      <td className="p-3 text-gray-600 border-r border-gray-200 text-xs">
                        {candidate.student.email || 'N/A'}
                      </td>
                      <td className="p-3 text-gray-600 border-r border-gray-200">
                        {candidate.student.enrollmentId || 'N/A'}
                      </td>
                      <td className="p-3 text-gray-600 border-r border-gray-200">{candidate.student.batch || 'N/A'}</td>
                      <td className="p-3 border-r border-gray-200">
                        {editingCandidate?.student.id === candidate.student.id ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={editingMarks}
                            onChange={(e) => setEditingMarks(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Marks"
                          />
                        ) : (
                          <span className="text-gray-600 font-medium">
                            {candidate.evaluation?.marks !== null && candidate.evaluation?.marks !== undefined
                              ? candidate.evaluation.marks
                              : '-'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 border-r border-gray-200">
                        {editingCandidate?.student.id === candidate.student.id ? (
                          <input
                            type="text"
                            value={editingRemarks}
                            onChange={(e) => setEditingRemarks(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Remarks"
                          />
                        ) : (
                          <span className="text-gray-600 text-xs">
                            {candidate.evaluation?.remarks || '-'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 border-r border-gray-200">
                        {editingCandidate?.student.id === candidate.student.id ? (
                          <div className="relative">
                            <select
                              value={editingStatus}
                              onChange={(e) => setEditingStatus(e.target.value)}
                              className={`w-full border-2 rounded-full px-3 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer ${
                                STATUS_OPTIONS.find(s => s.id === editingStatus)?.color || ''
                              }`}
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 0.5rem center',
                                paddingRight: '2rem'
                              }}
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          getStatusBadge(candidate.evaluation?.status || 'PENDING')
                        )}
                      </td>
                      <td className="p-3">
                        {editingCandidate?.student.id === candidate.student.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleSaveEvaluation(candidate)}
                              disabled={savingEvaluation}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {savingEvaluation ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditEvaluation(candidate)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Evaluation"
                            >
                              <SquarePen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleViewProfile(candidate)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Control Buttons - Below Table */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleExportResults}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Results
            </button>
            <button
              onClick={handleSendAnnouncement}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Send Announcement
            </button>
            <button
              onClick={() => setShowEndSessionModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Power className="w-4 h-4" />
              End Session
            </button>
          </div>
        </div>
      </div>

      {/* Student Profile Sidebar - Using StudentDashboardPanel pattern */}
      {showProfile && selectedCandidate && (
        <StudentDashboardPanel
          isOpen={showProfile}
          onClose={() => {
            setShowProfile(false);
            setSelectedCandidate(null);
          }}
          student={selectedCandidate.student}
          dashboardData={dashboardData}
        />
      )}

      {/* End Session Modal */}
      {showEndSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">End Interview Session</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to end this interview session? This will mark the current round as completed.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleEndSession}
                  disabled={endingSession}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {endingSession ? 'Ending...' : 'End Session'}
                </button>
                <button
                  onClick={() => setShowEndSessionModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Student Dashboard Panel Component - Similar to StudentDirectory
const StudentDashboardPanel = ({ isOpen, onClose, student, dashboardData }) => {
  const [currentStudent, setCurrentStudent] = useState(student);

  React.useEffect(() => {
    setCurrentStudent(student);
  }, [student]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  const handleApplyToJob = () => {
    console.log('Job application disabled in admin view');
  };

  const hasApplied = () => false;

  const profileImageSrc = currentStudent?.profilePhoto || currentStudent?.user?.profilePhoto;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-[9998] ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          backdropFilter: isOpen ? 'blur(4px)' : 'none',
          WebkitBackdropFilter: isOpen ? 'blur(4px)' : 'none'
        }}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-full w-full lg:w-[60%] bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 shadow-2xl z-[9999] transform transition-transform duration-300 ease-out overflow-hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="bg-white border-b border-blue-100 sticky top-0 z-50">
          <div className="w-full px-2 py-1">
            <div className="px-6 py-1 rounded-xl bg-gradient-to-br from-white to-blue-300 border-2 border-gray-400">
              <div className="flex justify-between items-center h-23 gap-2 relative">
                <div className="flex items-center flex-1">
                  <div className="flex-shrink-0 relative">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg overflow-hidden w-20 h-20">
                      {profileImageSrc ? (
                        <img src={profileImageSrc} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-white w-10 h-10" />
                      )}
                    </div>
                  </div>
                  <div className="ml-4 space-y-1.5">
                    <h2 className="text-2xl font-bold text-black">
                      {currentStudent?.fullName || currentStudent?.user?.displayName || 'Student Name'}
                    </h2>
                    <p className="text-sm text-gray-600">{currentStudent?.user?.email || currentStudent?.email}</p>
                    <p className="text-sm text-gray-600">Batch: {currentStudent?.batch || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white transition-colors flex-shrink-0"
                  >
                    <FaTimes size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="h-[calc(100%-5rem)] overflow-y-auto">
          <div className="p-4 lg:p-6">
            {dashboardData.loading ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              </div>
            ) : dashboardData.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{dashboardData.error}</p>
              </div>
            ) : (
              <DashboardHome
                studentData={{
                  ...currentStudent,
                  ...student,
                  id: student.id
                }}
                jobs={dashboardData.jobs}
                applications={dashboardData.applications}
                skillsEntries={dashboardData.skills}
                loadingJobs={false}
                loadingApplications={false}
                loadingSkills={false}
                handleApplyToJob={handleApplyToJob}
                hasApplied={hasApplied}
                applying={{}}
                hideApplicationTracker={true}
                hideJobPostings={true}
                hideFooter={true}
                isAdminView={true}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Assessment;
