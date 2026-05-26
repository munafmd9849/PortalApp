/**
 * Super Admin Statistics: by center, department (school), admins, summary
 */

import React, { useEffect, useState } from 'react';
import { FaChartBar, FaUniversity, FaBuilding, FaUsers, FaBriefcase, FaClipboardList, FaSpinner } from 'react-icons/fa';
import api from '../../../services/api';

export default function SuperAdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.getStatsSummary();
        if (!cancelled) setStats(res);
      } catch (e) {
        console.error('Super Admin stats error:', e);
        if (!cancelled) setStats({ byCenter: [], bySchool: [], admins: [], summary: {} });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-violet-500 mx-auto mb-2" />
          <p className="text-gray-500">Loading statistics...</p>
        </div>
      </div>
    );
  }

  const s = stats?.summary || {};
  const byCenter = stats?.byCenter || [];
  const bySchool = stats?.bySchool || [];
  const byBatch = stats?.byBatch || [];
  // For admins, we still use the old stats call if we need the full list, 
  // or we can fetch them separately. For Phase 1, focus on the stats counters.
  const admins = stats?.admins || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">
          <FaChartBar className="text-violet-600" />
          Admin Panel & Statistics
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <FaUsers /> Total Students
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.totalStudents ?? 0}</div>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <FaBriefcase /> Total Jobs
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.totalJobs ?? 0}</div>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <FaClipboardList /> Applications
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.totalApplications ?? 0}</div>
          </div>
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <FaUsers /> Placed
            </div>
            <div className="text-2xl font-bold text-green-700">{s.placedStudents ?? 0}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-gray-700 font-semibold">
              <FaBuilding /> By Center
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {byCenter.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No data</div>
              ) : (
                byCenter.map((c) => (
                  <div key={c.center} className="flex justify-between items-center px-4 py-3 hover:bg-gray-50">
                    <span className="font-medium text-gray-800">{c.center}</span>
                    <span className="text-sm text-gray-500">
                      {c.active} active / {c.total} total
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-gray-700 font-semibold">
              <FaUniversity /> By Department (School)
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {bySchool.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No data</div>
              ) : (
                bySchool.map((x) => (
                  <div key={x.school} className="flex justify-between items-center px-4 py-3 hover:bg-gray-50">
                    <span className="font-medium text-gray-800">{x.school}</span>
                    <span className="text-sm text-gray-500">
                      {x.active} active / {x.total} total
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* New Admin Activity Table Section */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FaUsers className="text-violet-600" />
              Admin Activity Overview
            </h2>
            <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold">
              {admins.length} Total Admins
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/30 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Admin Profile</th>
                  <th className="px-6 py-4 text-center">Jobs Posted</th>
                  <th className="px-6 py-4">Last Activity</th>
                  <th className="px-6 py-4 text-right">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-gray-400">No admin accounts found</td>
                  </tr>
                ) : (
                  admins.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 group-hover:text-violet-700 transition-colors">
                            {a.displayName || 'Unnamed Admin'}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">{a.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 font-extrabold px-4 py-1.5 rounded-xl border border-indigo-100 shadow-sm min-w-[50px]">
                          {a.jobsCount || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-sm text-gray-600">
                          {a.lastJobAt ? (
                            <>
                              <span className="font-bold text-gray-700">{new Date(a.lastJobAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              <span className="text-[10px] text-gray-400 uppercase font-medium">{new Date(a.lastJobAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 italic text-xs">No jobs posted yet</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          a.status === 'ACTIVE' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm shadow-rose-100'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
