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

        <div className="grid md:grid-cols-2 gap-6">
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

        <div className="mt-6 bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-gray-700 font-semibold">
            <FaUsers /> Admins
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {admins.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No admins</div>
            ) : (
              admins.map((a) => (
                <div key={a.id} className="flex justify-between items-center px-4 py-3 hover:bg-gray-50">
                  <div>
                    <span className="font-medium text-gray-800">{a.displayName || a.email}</span>
                    <span className="text-sm text-gray-500 ml-2">({a.email})</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-sm ${a.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                  >
                    {a.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
