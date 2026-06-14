import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Clock,
  Users,
  Search,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Layout,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import DirectoryLoadingPanel from '../../components/dashboard/admin/DirectoryLoading';

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

export default function ConversationalInterviewManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const adminBase = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getConversationalInterviews();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load conversational interviews');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleClickAway = (e) => {
      if (e.target.closest('[data-drive-menu-root]')) return;
      setShowMenu(null);
    };
    document.addEventListener('click', handleClickAway);
    return () => document.removeEventListener('click', handleClickAway);
  }, []);

  const handleDelete = async (id, title) => {
    if (
      !window.confirm(
        `Delete "${title}"?\n\nAll enrollments, recordings, and reviews will be permanently removed.`
      )
    ) {
      return;
    }
    try {
      await api.deleteConversationalInterview(id);
      toast.success('Conversational interview deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const total = items.length;
  const activeCount = items.filter(aiIsActive).length;
  const upcomingCount = items.filter(aiIsUpcoming).length;
  const pastCount = items.filter(aiIsPast).length;
  const inProgress = items.reduce((n, iv) => n + (iv.stats?.inProgress ?? 0), 0);
  const completed = items.reduce((n, iv) => n + (iv.stats?.completed ?? 0), 0);

  const stats = [
    { label: 'Total', val: total, icon: Layout, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { label: 'Upcoming', val: upcomingCount, icon: Clock, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { label: 'In progress', val: inProgress, icon: Users, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { label: 'Completed', val: completed, icon: CheckCircle2, color: 'bg-blue-50 text-blue-600 border-blue-100' },
  ];

  const filterTabs = [
    { id: 'all', label: 'All Interviews', shortLabel: 'All', count: total },
    { id: 'active', label: 'Active Sessions', shortLabel: 'Active', count: activeCount },
    { id: 'upcoming', label: 'Upcoming', shortLabel: 'Upcoming', count: upcomingCount },
    { id: 'past', label: 'Past Archives', shortLabel: 'Past', count: pastCount },
  ];

  const filteredItems = useMemo(() => {
    return items.filter((iv) => {
      if (searchQuery && !iv.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterTab === 'all') return true;
      if (filterTab === 'active') return aiIsActive(iv);
      if (filterTab === 'upcoming') return aiIsUpcoming(iv);
      if (filterTab === 'past') return aiIsPast(iv);
      return true;
    });
  }, [items, filterTab, searchQuery]);

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Conversational AI Interviews
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Publish dynamic AI interviews and review candidate submissions
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`${adminBase}/conversational-interviews/create`)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/10 active:scale-95"
        >
          <Plus className="w-4 h-4" /> New conversational interview
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
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
              placeholder="Search interviews..."
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
                title="Loading conversational interviews..."
                subtitle="Please wait while we fetch the data"
              />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-32 flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-slate-200" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  No {filterTab === 'all' ? '' : `${filterTab} `}interviews found
                </h3>
              </div>
              {filterTab === 'all' && !searchQuery && (
                <button
                  type="button"
                  onClick={() => navigate(`${adminBase}/conversational-interviews/create`)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs"
                >
                  Create your first conversational interview
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredItems.map((iv) => {
                const assigned = iv.stats?.assigned ?? 0;
                const completedCount = iv.stats?.completed ?? 0;
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
                            {start ? start.toLocaleString('default', { month: 'short' }) : '---'}
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
                                    : 'Conversational'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tabular-nums">
                              {assigned} assigned
                            </span>
                            {iv.conversationalMaxTurns ? (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tabular-nums">
                                {iv.conversationalMaxTurns} exchanges max
                              </span>
                            ) : null}
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600">
                            {iv.title}
                          </h3>
                          {iv.conversationalTopic ? (
                            <p className="text-xs text-slate-500 font-medium">{iv.conversationalTopic}</p>
                          ) : null}
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
                                      width: `${assigned > 0 ? (completedCount / assigned) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight tabular-nums">
                                  {completedCount} completed
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => navigate(`${adminBase}/mock-interviews/${iv.id}/review`)}
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
                                  handleDelete(iv.id, iv.title);
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
  );
}
