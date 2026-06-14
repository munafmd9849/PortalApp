/**
 * Create / Disable Admins (Super Admin only)
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaUserPlus, FaBan, FaCheckCircle, FaSpinner, FaUsers } from 'react-icons/fa';
import { Settings, X, Briefcase, Users, Target, Activity, Clock, ChevronRight, Mail, User, Shield, Info, BarChart3, TrendingUp, History } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../ui/Toast';

export default function CreateDisableAdmins() {
  const toast = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [performanceModal, setPerformanceModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [perfData, setPerfData] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [form, setForm] = useState({ 
    email: '', 
    password: '', 
    displayName: '',
    role: 'ADMIN',
    allowedSchoolIds: [],
    allowedCenterIds: [],
    allowedBatchIds: []
  });
  const [academicData, setAcademicData] = useState({ schools: [], centers: [], batches: [] });
  const [academicLoading, setAcademicLoading] = useState(false);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const res = await api.listSuperAdminAdmins();
      setAdmins(res.admins || []);
    } catch (e) {
      console.error('Load admins error:', e);
      toast?.error(e.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const loadAcademicData = async () => {
    try {
      setAcademicLoading(true);
      const [s, c, b] = await Promise.all([
        api.getSchools(),
        api.getCenters(),
        api.getBatches()
      ]);
      setAcademicData({ 
        schools: s || [], 
        centers: c || [], 
        batches: b || [] 
      });
    } catch (e) {
      console.error('Load academic data error:', e);
    } finally {
      setAcademicLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    loadAcademicData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email?.trim() || !form.password?.trim()) {
      toast?.error('Email and password are required');
      return;
    }
    try {
      setActionLoading({ create: true });
      await api.createSuperAdminAdmin({
        email: form.email.trim(),
        password: form.password,
        displayName: form.displayName?.trim() || undefined,
        role: form.role,
        allowedSchoolIds: form.allowedSchoolIds,
        allowedCenterIds: form.allowedCenterIds,
        allowedBatchIds: form.allowedBatchIds,
        permissions: ['*'] 
      });
      toast?.success('Admin created successfully');
      setCreateModal(false);
      resetForm();
      await loadAdmins();
    } catch (e) {
      toast?.error(e.message || 'Failed to create admin');
    } finally {
      setActionLoading({ create: false });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setActionLoading({ update: true });
      await api.updateSuperAdminAdmin(selectedAdmin.userId, {
        displayName: form.displayName?.trim(),
        role: form.role,
        allowedSchoolIds: form.allowedSchoolIds,
        allowedCenterIds: form.allowedCenterIds,
        allowedBatchIds: form.allowedBatchIds,
      });
      toast?.success('Admin updated successfully');
      setEditModal(false);
      resetForm();
      await loadAdmins();
    } catch (e) {
      toast?.error(e.message || 'Failed to update admin');
    } finally {
      setActionLoading({ update: false });
    }
  };

  const resetForm = () => {
    setForm({ 
      email: '', 
      password: '', 
      displayName: '', 
      role: 'ADMIN',
      allowedSchoolIds: [],
      allowedCenterIds: [],
      allowedBatchIds: []
    });
    setSelectedAdmin(null);
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setForm({
      email: admin.email,
      displayName: admin.displayName || '',
      role: admin.role || 'ADMIN',
      allowedSchoolIds: Array.isArray(admin.allowedSchoolIds) ? admin.allowedSchoolIds : (admin.allowedSchoolIds ? JSON.parse(admin.allowedSchoolIds) : []),
      allowedCenterIds: Array.isArray(admin.allowedCenterIds) ? admin.allowedCenterIds : (admin.allowedCenterIds ? JSON.parse(admin.allowedCenterIds) : []),
      allowedBatchIds: Array.isArray(admin.allowedBatchIds) ? admin.allowedBatchIds : (admin.allowedBatchIds ? JSON.parse(admin.allowedBatchIds) : []),
    });
    setEditModal(true);
  };

  const openPerformanceModal = async (admin) => {
    setSelectedAdmin(admin);
    setPerformanceModal(true);
    setPerfLoading(true);
    try {
      const res = await api.getAdminPerformance(admin.id);
      setPerfData(res);
    } catch (e) {
      toast?.error('Failed to load performance data');
      setPerformanceModal(false);
    } finally {
      setPerfLoading(false);
    }
  };

  // Body Scroll Lock
  useEffect(() => {
    if (performanceModal || createModal || editModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [performanceModal, createModal, editModal]);

  const handleDisable = async (admin) => {
    if (!window.confirm(`Disable admin "${admin.email}"?`)) return;
    try {
      setActionLoading((p) => ({ ...p, [admin.id]: true }));
      await api.disableSuperAdminAdmin(admin.userId);
      toast?.success('Admin disabled');
      await loadAdmins();
    } catch (e) {
      toast?.error(e.message || 'Failed to disable admin');
    } finally {
      setActionLoading((p) => ({ ...p, [admin.id]: false }));
    }
  };

  const handleEnable = async (admin) => {
    try {
      setActionLoading((p) => ({ ...p, [admin.id]: true }));
      await api.enableSuperAdminAdmin(admin.userId);
      toast?.success('Admin enabled');
      await loadAdmins();
    } catch (e) {
      toast?.error(e.message || 'Failed to enable admin');
    } finally {
      setActionLoading((p) => ({ ...p, [admin.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaUsers className="text-violet-600" />
            Create / Disable Admins
          </h1>
          <button
            onClick={() => setCreateModal(true)}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2"
          >
            <FaUserPlus /> Create Admin
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <FaSpinner className="animate-spin text-3xl text-violet-500 mx-auto mb-2" />
              <p className="text-gray-500">Loading admin directory...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FaUsers className="text-4xl text-gray-300 mx-auto mb-2" />
              <p>No administrative accounts found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Name / Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Scope (School/Center)</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {admins.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => openPerformanceModal(a)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm group-hover:bg-violet-600 group-hover:text-white transition-all">
                            {a.displayName?.[0] || a.email?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">{a.displayName || 'Unnamed Admin'}</div>
                            <div className="text-xs text-gray-500">{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          a.role === 'SUPER_ADMIN' ? 'bg-amber-100 text-amber-700' : 
                          a.role === 'COORDINATOR' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
                        }`}>
                          {a.role || 'ADMIN'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600 max-w-[200px] truncate">
                          <span className="font-semibold text-violet-600">Branches:</span> {
                            (() => {
                              const ids = Array.isArray(a.allowedSchoolIds) ? a.allowedSchoolIds : (a.allowedSchoolIds ? JSON.parse(a.allowedSchoolIds) : []);
                              if (ids.length === 0) return 'All Access';
                              return ids.map(id => academicData.schools.find(s => s.id === id)?.name || 'Unknown').join(', ');
                            })()
                          }
                        </div>
                        <div className="text-xs text-gray-500 max-w-[200px] truncate">
                          <span className="font-semibold text-violet-600">Campuses:</span> {
                            (() => {
                              const ids = Array.isArray(a.allowedCenterIds) ? a.allowedCenterIds : (a.allowedCenterIds ? JSON.parse(a.allowedCenterIds) : []);
                              if (ids.length === 0) return 'All Access';
                              return ids.map(id => academicData.centers.find(c => c.id === id)?.name || 'Unknown').join(', ');
                            })()
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          a.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(a); }}
                            className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            title="Edit Scope"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          {a.role !== 'SUPER_ADMIN' && (
                            a.status === 'ACTIVE' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDisable(a); }}
                                disabled={actionLoading[a.id]}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Disable"
                              >
                                {actionLoading[a.id] ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaBan className="w-4 h-4" />}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEnable(a); }}
                                disabled={actionLoading[a.id]}
                                className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                title="Enable"
                              >
                                {actionLoading[a.id] ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaCheckCircle className="w-4 h-4" />}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(createModal || editModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                {createModal ? 'Create New Admin' : 'Update Admin Scope'}
              </h2>
              <button onClick={() => { setCreateModal(false); setEditModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={createModal ? handleCreate : handleUpdate} className="p-6 space-y-4">
              {createModal && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                        placeholder="admin@institution.edu"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password *</label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                        placeholder="••••••••"
                        required={createModal}
                        minLength={6}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Display Name</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Access Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                >
                  <option value="ADMIN">Admin (Full access to scoped data)</option>
                  <option value="COORDINATOR">Coordinator (Limited access to scoped data)</option>
                  <option value="SUPER_ADMIN">Super Admin (Global Access)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-gray-50">
                <h3 className="text-xs font-bold text-violet-600 uppercase mb-3">Institutional Scope (Data Isolation)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Allowed Branches</label>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50 space-y-1">
                      {academicData.schools.length === 0 ? (
                        <div className="text-[10px] text-gray-400 italic p-1">No branches defined</div>
                      ) : (
                        academicData.schools.map(s => (
                          <label key={s.id} className="flex items-center gap-2 px-2 py-1 hover:bg-white rounded cursor-pointer transition-colors text-[11px] text-gray-700">
                            <input 
                              type="checkbox" 
                              checked={form.allowedSchoolIds.includes(s.id)}
                              onChange={(e) => {
                                const newIds = e.target.checked 
                                  ? [...form.allowedSchoolIds, s.id]
                                  : form.allowedSchoolIds.filter(id => id !== s.id);
                                setForm(p => ({ ...p, allowedSchoolIds: newIds }));
                              }}
                              className="w-3 h-3 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                            />
                            {s.name}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Allowed Campuses</label>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50 space-y-1">
                      {academicData.centers.length === 0 ? (
                        <div className="text-[10px] text-gray-400 italic p-1">No campuses defined</div>
                      ) : (
                        academicData.centers.map(c => (
                          <label key={c.id} className="flex items-center gap-2 px-2 py-1 hover:bg-white rounded cursor-pointer transition-colors text-[11px] text-gray-700">
                            <input 
                              type="checkbox" 
                              checked={form.allowedCenterIds.includes(c.id)}
                              onChange={(e) => {
                                const newIds = e.target.checked 
                                  ? [...form.allowedCenterIds, c.id]
                                  : form.allowedCenterIds.filter(id => id !== c.id);
                                setForm(p => ({ ...p, allowedCenterIds: newIds }));
                              }}
                              className="w-3 h-3 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                            />
                            {c.name}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Allowed Batches</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                    {academicData.batches.length === 0 ? (
                      <div className="text-[10px] text-gray-400 italic">No batches defined</div>
                    ) : (
                      academicData.batches.map(b => (
                        <label key={b.id} className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all border ${
                          form.allowedBatchIds.includes(b.id) 
                            ? 'bg-violet-600 border-violet-600 text-white' 
                            : 'bg-white border-gray-200 text-gray-500 hover:border-violet-300'
                        }`}>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={form.allowedBatchIds.includes(b.id)}
                            onChange={(e) => {
                              const newIds = e.target.checked 
                                ? [...form.allowedBatchIds, b.id]
                                : form.allowedBatchIds.filter(id => id !== b.id);
                              setForm(p => ({ ...p, allowedBatchIds: newIds }));
                            }}
                          />
                          {b.year}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => { setCreateModal(false); setEditModal(false); resetForm(); }}
                  className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.create || actionLoading.update}
                  className="px-8 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 shadow-lg shadow-violet-200 disabled:opacity-50 flex items-center gap-2 font-semibold transition-all"
                >
                  {(actionLoading.create || actionLoading.update) && <FaSpinner className="animate-spin" />}
                  {createModal ? 'Create Admin' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
       )}

      {/* Performance Dashboard Modal */}
      {performanceModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setPerformanceModal(false)}>
          <div className="bg-[#f8fafc] rounded-[32px] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-violet-600 to-indigo-700 text-white relative">
              <button onClick={() => setPerformanceModal(false)} className="absolute top-6 right-8 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-xl border border-white/30 rounded-[22px] flex items-center justify-center font-bold text-2xl shadow-inner">
                  {selectedAdmin?.displayName?.[0] || selectedAdmin?.email?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{selectedAdmin?.displayName || 'Admin'}</h2>
                  <div className="flex items-center gap-4 mt-1 opacity-90 text-xs font-semibold tracking-wide uppercase">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {selectedAdmin?.email}</span>
                    <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> {selectedAdmin?.adminRole || 'ADMIN'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {perfLoading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                  <FaSpinner className="animate-spin text-4xl text-violet-500" />
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Gathering Performance Data...</p>
                </div>
              ) : perfData ? (
                <>
                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{perfData.stats.totalJobsCreated}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Jobs Created</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{perfData.stats.totalJobsUpdated}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Updates Made</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{perfData.stats.totalApplications}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Applications</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center mb-4">
                        <Target className="w-5 h-5" />
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{perfData.stats.totalReach}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Reach</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Drives */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <History className="w-4 h-4 text-violet-500" />
                        Recent Job Postings
                      </h3>
                      <div className="space-y-3">
                        {perfData.recentJobs.length === 0 ? (
                          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-400 font-medium">No jobs posted yet</p>
                          </div>
                        ) : perfData.recentJobs.map(job => (
                          <div key={job.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-violet-300 transition-all">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 truncate">{job.jobTitle}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{job.companyName} • {new Date(job.createdAt).toLocaleDateString()}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              job.status === 'POSTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {job.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        Live Activity Trail
                      </h3>
                      <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                        {perfData.recentActivity.length === 0 ? (
                          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-400 font-medium">No recent activity logged</p>
                          </div>
                        ) : perfData.recentActivity.map((log, idx) => (
                          <div key={log.id} className="relative pl-10">
                            <div className="absolute left-0 top-1 w-10 h-10 bg-white border-4 border-slate-50 rounded-full flex items-center justify-center z-10 shadow-sm">
                              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" />
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{log.action.replace(/_/g, ' ')}</span>
                                <span className="text-[9px] text-slate-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed italic line-clamp-2">
                                {log.details || `Admin performed ${log.action} on ${log.target}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  Failed to load performance data.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-white border-t border-slate-100 text-center">
              <button onClick={() => setPerformanceModal(false)} className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-colors">
                Click outside to close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
