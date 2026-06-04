import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Calendar, Clock, Users,
  Search, MoreHorizontal, CheckCircle2,
  AlertCircle, Trash2, Edit2, Layout,
  ChevronRight, Sparkles, Video,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import MockInterviewCreateModal from '../../components/dashboard/admin/MockInterviewCreateModal';
import MockInterviewEditDriveModal from '../../components/dashboard/admin/MockInterviewEditDriveModal';
import DirectoryLoadingPanel from '../../components/dashboard/admin/DirectoryLoading';

function driveHasLiveSlots(drive) {
  return drive.slots?.some((s) => ['WAITING', 'LIVE'].includes(s.status));
}

function driveIsDraft(drive) {
  return drive.status === 'DRAFT';
}

function driveIsActive(drive) {
  if (driveIsDraft(drive)) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const driveDate = new Date(drive.date);
  driveDate.setHours(0, 0, 0, 0);
  const isToday = driveDate.getTime() === now.getTime();
  return isToday || driveHasLiveSlots(drive);
}

function driveIsUpcoming(drive) {
  if (driveIsDraft(drive)) return false;
  if (driveHasLiveSlots(drive)) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const driveDate = new Date(drive.date);
  driveDate.setHours(0, 0, 0, 0);
  return driveDate > now;
}

function driveIsPast(drive) {
  if (driveIsDraft(drive)) return false;
  if (driveHasLiveSlots(drive)) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const driveDate = new Date(drive.date);
  driveDate.setHours(0, 0, 0, 0);
  return driveDate < now;
}

function aiIsActive(iv) {
  if (iv.status === 'DRAFT') return false;
  const now = new Date();
  const start = iv.startDate ? new Date(iv.startDate) : null;
  const end = iv.endDate ? new Date(iv.endDate) : null;
  if (start && end) return now >= start && now <= end;
  return iv.status === 'PUBLISHED';
}

function aiIsUpcoming(iv) {
  if (!iv.startDate) return false;
  return new Date(iv.startDate) > new Date();
}

function aiIsPast(iv) {
  if (!iv.endDate) return false;
  return new Date(iv.endDate) < new Date();
}

export default function MockInterviewManagement({ autoOpenCreate = false }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const initialMode = searchParams.get('mode') === 'ai' ? 'ai' : 'live';

  const [loading, setLoading] = useState(true);
  const [drives, setDrives] = useState([]);
  const [aiInterviews, setAiInterviews] = useState([]);
  const [mainMode, setMainMode] = useState(initialMode);
  const [filterTab, setFilterTab] = useState('all');
  const [showMenu, setShowMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(autoOpenCreate);
  const [editDrive, setEditDrive] = useState(null);

  const syncUrl = useCallback(
    (mode) => {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'mockInterviews');
      if (mode === 'ai') next.set('mode', 'ai');
      else next.delete('mode');
      next.delete('aiFilter');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setMode = (mode) => {
    setMainMode(mode);
    setSearchQuery('');
    setFilterTab('all');
    syncUrl(mode);
  };

  const openCreateModal = () => setShowCreateModal(true);

  useEffect(() => {
    if (autoOpenCreate) setShowCreateModal(true);
  }, [autoOpenCreate]);

  const loadDrives = useCallback(async () => {
    try {
      setLoading(true);
      const [data, ai] = await Promise.all([
        api.getMockInterviewDrives(),
        api.getAiMockInterviews().catch(() => []),
      ]);
      setDrives(data);
      setAiInterviews(Array.isArray(ai) ? ai : []);
    } catch {
      toast.error('Failed to load mock interviews');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDrives();
  }, [loadDrives]);

  useEffect(() => {
    const handleClickAway = (e) => {
      if (e.target.closest('[data-drive-menu-root]')) return;
      setShowMenu(null);
    };
    document.addEventListener('click', handleClickAway);
    return () => document.removeEventListener('click', handleClickAway);
  }, []);

  const handlePublishDrive = async (drive) => {
    if (drive.endTime && drive.startTime && new Date(drive.endTime) <= new Date(drive.startTime)) {
      toast.error('Edit the drive and set a valid schedule before publishing');
      return;
    }
    try {
      const res = await api.publishMockInterviewDrive(drive.id);
      toast.success(`Published · ${res.slotsGenerated} slots created`);
      loadDrives();
    } catch (err) {
      toast.error(err?.message || 'Failed to publish drive');
    }
  };

  const handleDeleteDrive = async (id) => {
    if (!window.confirm('Delete this drive? All slots and session data will be permanently removed.')) return;
    try {
      await api.deleteMockInterviewDrive(id);
      toast.success('Drive deleted');
      loadDrives();
    } catch {
      toast.error('Failed to delete drive');
    }
  };

  const handleDeleteAiInterview = async (id, title) => {
    if (
      !window.confirm(
        `Delete "${title}"?\n\nAll questions, enrollments, recordings, and reviews will be permanently removed.`
      )
    ) {
      return;
    }
    try {
      await api.deleteAiMockInterview(id);
      toast.success('AI interview deleted');
      loadDrives();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete AI interview');
    }
  };

  const getDriveStats = (drive) => {
    const total = drive._count?.slots || 0;
    const assigned = drive.slots?.filter((s) => s.status !== 'AVAILABLE').length || 0;
    const completed = drive.slots?.filter((s) => s.status === 'COMPLETED').length || 0;
    return { total, assigned, completed };
  };

  const totalDrives = drives.length;
  const totalAi = aiInterviews.length;
  const aiActiveCount = aiInterviews.filter(aiIsActive).length;
  const aiUpcomingCount = aiInterviews.filter(aiIsUpcoming).length;
  const aiPastCount = aiInterviews.filter(aiIsPast).length;

  const filteredDrives = drives.filter((drive) => {
    if (searchQuery && !drive.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterTab === 'all') return true;
    if (filterTab === 'active') return driveIsActive(drive);
    if (filterTab === 'upcoming') return driveIsUpcoming(drive);
    if (filterTab === 'past') return driveIsPast(drive);
    return true;
  });

  const filteredAi = useMemo(() => {
    return aiInterviews.filter((iv) => {
      if (searchQuery && !iv.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterTab === 'all') return true;
      if (filterTab === 'active') return aiIsActive(iv);
      if (filterTab === 'upcoming') return aiIsUpcoming(iv);
      if (filterTab === 'past') return aiIsPast(iv);
      return true;
    });
  }, [aiInterviews, filterTab, searchQuery]);
  const upcomingDrivesCount = drives.filter(driveIsUpcoming).length;
  const activeDrivesCount = drives.filter(driveIsActive).length;
  const pastDrivesCount = drives.filter(driveIsPast).length;
  const ongoingSlots = drives.reduce(
    (acc, d) => acc + (d.slots || []).filter((s) => ['SCHEDULED', 'WAITING', 'LIVE'].includes(s.status)).length,
    0
  );
  const completedOverall = drives.reduce(
    (acc, d) => acc + (d.slots || []).filter((s) => s.status === 'COMPLETED').length,
    0
  );

  const waitingCandidates = drives.reduce(
    (acc, d) => acc + (d.slots || []).filter((s) => s.status === 'WAITING').length,
    0
  );

  const liveStats = [
    { label: 'Total Drives', val: totalDrives, icon: Layout, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { label: 'Upcoming Slots', val: ongoingSlots, icon: Clock, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { label: 'Waiting List', val: waitingCandidates, icon: Users, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { label: 'Completed', val: completedOverall, icon: CheckCircle2, color: 'bg-blue-50 text-blue-600 border-blue-100' },
  ];

  const aiInProgress = aiInterviews.reduce((n, iv) => n + (iv.stats?.inProgress ?? 0), 0);
  const aiCompleted = aiInterviews.reduce((n, iv) => n + (iv.stats?.completed ?? 0), 0);
  const aiAssigned = aiInterviews.reduce((n, iv) => n + (iv.stats?.assigned ?? 0), 0);

  const aiStats = [
    { label: 'Total AI', val: totalAi, icon: Layout, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { label: 'Upcoming', val: aiUpcomingCount, icon: Clock, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { label: 'In progress', val: aiInProgress, icon: Users, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { label: 'Completed', val: aiCompleted, icon: CheckCircle2, color: 'bg-blue-50 text-blue-600 border-blue-100' },
  ];

  const filterTabs =
    mainMode === 'live'
      ? [
          { id: 'all', label: 'All Drives', shortLabel: 'All', count: totalDrives },
          { id: 'active', label: 'Active Sessions', shortLabel: 'Active', count: activeDrivesCount },
          { id: 'upcoming', label: 'Upcoming Drives', shortLabel: 'Upcoming', count: upcomingDrivesCount },
          { id: 'past', label: 'Past Archives', shortLabel: 'Past', count: pastDrivesCount },
        ]
      : [
          { id: 'all', label: 'All AI', shortLabel: 'All', count: totalAi },
          { id: 'active', label: 'Active Sessions', shortLabel: 'Active', count: aiActiveCount },
          { id: 'upcoming', label: 'Upcoming', shortLabel: 'Upcoming', count: aiUpcomingCount },
          { id: 'past', label: 'Past Archives', shortLabel: 'Past', count: aiPastCount },
        ];

  return (
    <>
      <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Mock Interviews
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              {mainMode === 'live'
                ? 'Schedule live 1:1 drives and manage interviewer slots'
                : 'Publish AI video interviews and review candidate submissions'}
            </p>
          </div>
          {mainMode === 'live' ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/10 active:scale-95"
            >
              <Plus className="w-4 h-4" /> New live drive
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/admin/mock-interviews/create-ai-interview')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/10 active:scale-95"
            >
              <Plus className="w-4 h-4" /> New AI interview
            </button>
          )}
        </div>

        {/* Main mode tabs — Manage Jobs style */}
        <div className="flex justify-center">
          <div className="bg-white rounded-lg p-1 shadow-sm border border-slate-200 inline-flex flex-wrap justify-center gap-1">
            <button
              type="button"
              onClick={() => setMode('live')}
              className={`px-4 sm:px-6 py-2 rounded-md font-bold text-sm transition-all touch-manipulation flex items-center gap-2 ${
                mainMode === 'live'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Video className="w-4 h-4" />
              Live 1:1 ({totalDrives})
            </button>
            <button
              type="button"
              onClick={() => setMode('ai')}
              className={`px-4 sm:px-6 py-2 rounded-md font-bold text-sm transition-all touch-manipulation flex items-center gap-2 ${
                mainMode === 'ai'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI video ({aiInterviews.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {(mainMode === 'live' ? liveStats : aiStats).map((stat, i) => (
            <div
              key={i}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border ${stat.color}`}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">{stat.val}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-visible flex flex-col">
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid w-full grid-cols-4 gap-1 rounded-xl bg-slate-200/50 p-1 shadow-inner lg:max-w-3xl lg:flex-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[10px] font-bold transition-all sm:gap-2 sm:px-3 sm:text-[11px] ${
                    filterTab === tab.id
                      ? 'bg-white text-indigo-600 shadow-md'
                      : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'
                  }`}
                >
                  <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                  <span className="sm:hidden whitespace-nowrap">{tab.shortLabel}</span>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] tabular-nums ${
                      filterTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full shrink-0 lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={
                  mainMode === 'live' ? 'Search by drive title...' : 'Search AI interviews...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-visible rounded-b-3xl">
            {loading ? (
              <div className="p-4 sm:p-6">
                <DirectoryLoadingPanel
                  title={
                    mainMode === 'live'
                      ? 'Loading mock interview drives...'
                      : 'Loading AI interviews...'
                  }
                  subtitle="Please wait while we fetch the data"
                />
              </div>
            ) : mainMode === 'live' ? (
              filteredDrives.length === 0 ? (
                <div className="py-32 flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-slate-200" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      No {filterTab === 'all' ? '' : `${filterTab} `}drives found
                    </h3>
                  </div>
                  {filterTab === 'all' && !searchQuery && (
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs"
                    >
                      Create your first drive
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredDrives.map((drive) => {
                    const stats = getDriveStats(drive);
                    const isDraft = driveIsDraft(drive);
                    const isPast = !isDraft && new Date(drive.date) < new Date().setHours(0, 0, 0, 0);
                    const hasActiveSession = drive.slots?.some((s) =>
                      ['WAITING', 'LIVE'].includes(s.status)
                    );

                    return (
                      <div
                        key={drive.id}
                        className="p-6 sm:p-8 hover:bg-slate-50/40 transition-all group relative text-left overflow-visible"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex gap-6">
                            <div
                              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm border ${
                                hasActiveSession
                                  ? 'bg-indigo-600 text-white border-indigo-400'
                                  : 'bg-white text-slate-900 border-slate-200'
                              }`}
                            >
                              <span className="text-[10px] font-bold uppercase opacity-80">
                                {drive.date
                                  ? new Date(drive.date).toLocaleString('default', { month: 'short' })
                                  : '---'}
                              </span>
                              <span className="text-xl font-black leading-none">
                                {drive.date ? new Date(drive.date).getDate() : '--'}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase border ${
                                    isDraft
                                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                                      : hasActiveSession
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        : isPast
                                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                                          : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                  }`}
                                >
                                  {isDraft
                                    ? 'Draft'
                                    : hasActiveSession
                                      ? 'Live now'
                                      : isPast
                                        ? 'Past'
                                        : drive.category}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tabular-nums">
                                  {stats.total} slots
                                </span>
                              </div>
                              <h3
                                className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 cursor-pointer"
                                onClick={() => navigate(`/admin?tab=mockInterviews-slots&id=${drive.id}`)}
                              >
                                {drive.title}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                                <Clock className="w-3.5 h-3.5" />
                                {drive.startTime
                                  ? new Date(drive.startTime).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '--:--'}
                                –
                                {drive.endTime
                                  ? new Date(drive.endTime).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '--:--'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/mock-interviews/${drive.id}/results`)}
                              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                            >
                              View results
                            </button>
                            {isDraft ? (
                              <button
                                type="button"
                                onClick={() => handlePublishDrive(drive)}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                              >
                                Publish drive
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigate(`/admin?tab=mockInterviews-slots&id=${drive.id}`)}
                                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-1"
                              >
                                Manage slots <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                            <div className="relative" data-drive-menu-root>
                              <button
                                type="button"
                                onClick={() => setShowMenu(showMenu === drive.id ? null : drive.id)}
                                className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {showMenu === drive.id && (
                                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[200]">
                                  {isDraft && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowMenu(null);
                                        handlePublishDrive(drive);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-3"
                                    >
                                      <CheckCircle2 className="w-4 h-4" /> Publish drive
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowMenu(null);
                                      setEditDrive(drive);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                                  >
                                    <Edit2 className="w-4 h-4" /> Edit details
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowMenu(null);
                                      handleDeleteDrive(drive.id);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3"
                                  >
                                    <Trash2 className="w-4 h-4" /> Delete drive
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredAi.length === 0 ? (
              <div className="py-32 flex flex-col items-center text-center gap-6">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-slate-200" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    No {filterTab === 'all' ? '' : `${filterTab} `}AI interviews found
                  </h3>
                </div>
                {filterTab === 'all' && !searchQuery && (
                  <button
                    type="button"
                    onClick={() => navigate('/admin/mock-interviews/create-ai-interview')}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs"
                  >
                    Create your first AI interview
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredAi.map((iv) => {
                  const assigned = iv.stats?.assigned ?? 0;
                  const completed = iv.stats?.completed ?? 0;
                  const isActive = aiIsActive(iv);
                  const isPast = aiIsPast(iv);
                  const isDraft = iv.status === 'DRAFT';
                  const start = iv.startDate ? new Date(iv.startDate) : null;

                  return (
                    <div
                      key={iv.id}
                      className="p-6 sm:p-8 hover:bg-slate-50/40 transition-all group relative text-left overflow-visible"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex gap-6">
                          <div
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm border ${
                              isActive
                                ? 'bg-indigo-600 text-white border-indigo-400'
                                : 'bg-white text-slate-900 border-slate-200'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase opacity-80">
                              {start
                                ? start.toLocaleString('default', { month: 'short' })
                                : '---'}
                            </span>
                            <span className="text-xl font-black leading-none">
                              {start ? start.getDate() : '--'}
                            </span>
                            {start && (
                              <span className="text-[8px] font-bold mt-0.5 opacity-80 tabular-nums">
                                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase border ${
                                  isActive
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : isPast
                                      ? 'bg-slate-100 text-slate-500 border-slate-200'
                                      : isDraft
                                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                                        : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                }`}
                              >
                                {isActive
                                  ? 'Active now'
                                  : isPast
                                    ? 'Past'
                                    : isDraft
                                      ? 'Draft'
                                      : 'AI Video'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tabular-nums">
                                {assigned} assigned
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600">
                              {iv.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500 pt-1">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-semibold tabular-nums text-slate-600">
                                  {iv.startDate
                                    ? new Date(iv.startDate).toLocaleString([], {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                      })
                                    : '—'}{' '}
                                  –{' '}
                                  {iv.endDate
                                    ? new Date(iv.endDate).toLocaleString([], {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                      })
                                    : '—'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <div className="flex items-center gap-1.5">
                                  <div className="w-20 sm:w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-1000 ${
                                        isActive ? 'bg-emerald-500' : 'bg-indigo-500'
                                      }`}
                                      style={{
                                        width: `${
                                          assigned > 0 ? (completed / assigned) * 100 : 0
                                        }%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight tabular-nums">
                                    {completed} completed
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/mock-interviews/${iv.id}/review`)}
                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                          >
                            View results
                          </button>
                          <div className="relative" data-drive-menu-root>
                            <button
                              type="button"
                              onClick={() => setShowMenu(showMenu === iv.id ? null : iv.id)}
                              className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {showMenu === iv.id && (
                              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[200]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowMenu(null);
                                    handleDeleteAiInterview(iv.id, iv.title);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete interview
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <MockInterviewCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadDrives}
      />

      <MockInterviewEditDriveModal
        drive={editDrive}
        isOpen={Boolean(editDrive)}
        onClose={() => setEditDrive(null)}
        onSuccess={loadDrives}
      />
    </>
  );
}
