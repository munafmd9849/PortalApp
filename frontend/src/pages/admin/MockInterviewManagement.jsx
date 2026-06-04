import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Calendar, Clock, Users, ArrowRight, 
  Search, MoreHorizontal, CheckCircle2,
  Clock3, AlertCircle, Trash2, Edit2, Layout,
  ChevronRight, Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import MockInterviewCreateModal from '../../components/dashboard/admin/MockInterviewCreateModal';
import MockInterviewEditDriveModal from '../../components/dashboard/admin/MockInterviewEditDriveModal';
import DirectoryLoadingPanel from '../../components/dashboard/admin/DirectoryLoading';

function driveHasLiveSlots(drive) {
  return drive.slots?.some((s) => ['WAITING', 'LIVE'].includes(s.status));
}

function driveIsActive(drive) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const driveDate = new Date(drive.date);
  driveDate.setHours(0, 0, 0, 0);
  const isToday = driveDate.getTime() === now.getTime();
  return isToday || driveHasLiveSlots(drive);
}

function driveIsUpcoming(drive) {
  if (driveHasLiveSlots(drive)) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const driveDate = new Date(drive.date);
  driveDate.setHours(0, 0, 0, 0);
  return driveDate > now;
}

function driveIsPast(drive) {
  if (driveHasLiveSlots(drive)) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const driveDate = new Date(drive.date);
  driveDate.setHours(0, 0, 0, 0);
  return driveDate < now;
}

export default function MockInterviewManagement({ autoOpenCreate = false }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [drives, setDrives] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showMenu, setShowMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(autoOpenCreate);
  const [editDrive, setEditDrive] = useState(null);
  const [aiInterviews, setAiInterviews] = useState([]);

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

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
    } catch (err) {
      toast.error('Failed to load mock interview drives');
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

  const handleDeleteDrive = async (id) => {
    if (!window.confirm('Are you sure you want to delete this drive? All associated slots and data will be permanently removed.')) return;
    try {
      await api.deleteMockInterviewDrive(id);
      toast.success('Drive deleted successfully');
      loadDrives();
    } catch (err) {
      toast.error('Failed to delete drive');
    }
  };

  const getDriveStats = (drive) => {
    const total = drive._count?.slots || 0;
    const assigned = drive.slots?.filter(s => s.status !== 'AVAILABLE').length || 0;
    const completed = drive.slots?.filter(s => s.status === 'COMPLETED').length || 0;
    return { total, assigned, completed };
  };

  const filteredDrives = drives.filter(drive => {
    // Search filter
    if (searchQuery && !drive.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'active') return driveIsActive(drive);
    if (activeTab === 'upcoming') return driveIsUpcoming(drive);
    if (activeTab === 'past') return driveIsPast(drive);
    return true;
  });

  // Calculate Header Stats
  const totalDrives = drives.length;
  const upcomingDrivesCount = drives.filter(driveIsUpcoming).length;
  const activeDrivesCount = drives.filter(driveIsActive).length;
  const pastDrivesCount = drives.filter(driveIsPast).length;
  const ongoingSlots = drives.reduce((acc, d) => acc + (d.slots || []).filter(s => ['SCHEDULED', 'WAITING', 'LIVE'].includes(s.status)).length, 0);
  const waitingCandidates = drives.reduce((acc, d) => acc + (d.slots || []).filter(s => s.status === 'WAITING').length, 0);
  const completedOverall = drives.reduce((acc, d) => acc + (d.slots || []).filter(s => s.status === 'COMPLETED').length, 0);

  return (
    <>
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Mock Interview Drives
            <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
              Admin Portal
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage scheduling, candidates, and 1:1 session results</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/mock-interviews/create-ai-interview')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-indigo-600 transition-all shadow-md shadow-slate-900/10 active:scale-95"
          >
            <Sparkles className="w-4 h-4" /> AI Video Interview
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/10 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Live 1:1 Drive
          </button>
        </div>
      </div>

      {aiInterviews.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> AI video mock interviews
            </h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {aiInterviews.length} active assignment{aiInterviews.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {aiInterviews.map((iv) => {
              const rate =
                iv.stats?.assigned > 0
                  ? Math.round(((iv.stats?.completed ?? 0) / iv.stats.assigned) * 100)
                  : 0;
              return (
                <div
                  key={iv.id}
                  className="bg-slate-50/50 rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:shadow-slate-200/50 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-white text-slate-600 border-slate-200">
                      {iv.status || 'PUBLISHED'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {iv.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    {iv.interviewType?.replace(/_/g, ' ')} · {iv.stats?.completed ?? 0}/{iv.stats?.assigned ?? 0} completed
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Completion</span>
                      <span className="text-sm font-bold text-indigo-600 tabular-nums">{rate}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-4">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${rate}%` }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/mock-interviews/${iv.id}/review`)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      Review submissions
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Total Drives', val: totalDrives, icon: Layout, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
          { label: 'Upcoming Slots', val: ongoingSlots, icon: Clock, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
          { label: 'Waiting List', val: waitingCandidates, icon: Users, color: 'bg-amber-50 text-amber-600 border-amber-100' },
          { label: 'Completed', val: completedOverall, icon: CheckCircle2, color: 'bg-blue-50 text-blue-600 border-blue-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
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

      {/* Main List Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-visible flex flex-col">
        {/* Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid w-full grid-cols-4 gap-1 rounded-xl bg-slate-200/50 p-1 shadow-inner lg:max-w-3xl lg:flex-1">
            {[
              { id: 'all', label: 'All Drives', shortLabel: 'All', count: totalDrives },
              { id: 'active', label: 'Active Sessions', shortLabel: 'Active', count: activeDrivesCount },
              { id: 'upcoming', label: 'Upcoming Drives', shortLabel: 'Upcoming', count: upcomingDrivesCount },
              { id: 'past', label: 'Past Archives', shortLabel: 'Past', count: pastDrivesCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[10px] font-bold transition-all sm:gap-2 sm:px-3 sm:text-[11px] ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-md'
                    : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'
                }`}
              >
                <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                <span className="sm:hidden whitespace-nowrap">{tab.shortLabel}</span>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] tabular-nums ${
                    activeTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'
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
              placeholder="Search by drive title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Drives Content */}
        <div className="overflow-visible rounded-b-3xl">
          {loading ? (
            <div className="p-4 sm:p-6">
              <DirectoryLoadingPanel
                title="Loading mock interview drives..."
                subtitle="Please wait while we fetch the data"
              />
            </div>
          ) : filteredDrives.length === 0 ? (
            <div className="py-32 flex flex-col items-center justify-center gap-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-slate-200" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">No {activeTab} drives found</h3>
              </div>
              {activeTab === 'all' && (
                <button 
                  onClick={openCreateModal}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                >
                  Create Your First Drive
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredDrives.map((drive) => {
                const stats = getDriveStats(drive);
                const isPast = new Date(drive.date) < new Date().setHours(0,0,0,0);
                const hasActiveSession = drive.slots?.some(s => ['WAITING', 'LIVE'].includes(s.status));

                return (
                  <div key={drive.id} className="p-6 sm:p-8 hover:bg-slate-50/40 transition-all group relative text-left overflow-visible">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex gap-6">
                        {/* Date Mini-Card */}
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm border transition-all ${
                          hasActiveSession ? 'bg-indigo-600 text-white border-indigo-400 scale-105 shadow-indigo-200' : 'bg-white text-slate-900 border-slate-200 group-hover:border-indigo-200'
                        }`}>
                          <span className={`text-[10px] font-bold uppercase tracking-tighter ${hasActiveSession ? 'opacity-80' : 'text-slate-400'}`}>
                            {drive.date ? new Date(drive.date).toLocaleString('default', { month: 'short' }) : '---'}
                          </span>
                          <span className="text-xl sm:text-2xl font-black leading-none">
                            {drive.date ? new Date(drive.date).getDate() : '--'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider border shadow-sm ${
                              hasActiveSession 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                : isPast ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }`}>
                              {hasActiveSession ? 'Live Now' : isPast ? 'Completed' : drive.category}
                            </span>
                            <span className="text-slate-200">•</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight tabular-nums">{stats.total} TOTAL SLOTS</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => navigate(`/admin?tab=mockInterviews-slots&id=${drive.id}`)}>
                            {drive.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500 pt-1">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-xs font-semibold tabular-nums text-slate-600">
                                {drive.startTime ? new Date(drive.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} - 
                                {drive.endTime ? new Date(drive.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <div className="flex items-center gap-1.5">
                                <div className="w-20 sm:w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-1000 ${hasActiveSession ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${(stats.assigned / stats.total) * 100}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight tabular-nums">
                                  {stats.assigned} Assigned
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 ml-auto md:ml-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/mock-interviews/${drive.id}/results`)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                        >
                          View Results
                        </button>
                        <button 
                          type="button"
                          onClick={() => navigate(`/admin?tab=mockInterviews-slots&id=${drive.id}`)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm group/btn active:scale-95"
                        >
                          Manage 1:1 Slots 
                          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                        
                        <div className="relative z-20" data-drive-menu-root>
                          <button 
                            type="button"
                            onClick={() => setShowMenu(showMenu === drive.id ? null : drive.id)}
                            className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200 active:scale-95"
                            aria-expanded={showMenu === drive.id}
                            aria-haspopup="menu"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          
                          {showMenu === drive.id && (
                            <div
                              role="menu"
                              className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[200] animate-in fade-in zoom-in duration-200 origin-top-right"
                            >
                              <div className="px-4 py-2 mb-1 border-b border-slate-50">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left">Drive Management</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowMenu(null);
                                  setEditDrive(drive);
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-slate-400" /> Edit Details
                              </button>
                              <div className="h-px bg-slate-50 my-1.5" />
                              <button 
                                type="button"
                                onClick={() => { setShowMenu(null); handleDeleteDrive(drive.id); }}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-rose-400" /> Delete Drive
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
