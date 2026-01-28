/**
 * Create / Disable Admins (Super Admin only)
 */

import React, { useEffect, useState } from 'react';
import { FaUserPlus, FaBan, FaCheckCircle, FaSpinner, FaUsers } from 'react-icons/fa';
import api from '../../../services/api';
import { useToast } from '../../ui/Toast';

export default function CreateDisableAdmins() {
  const toast = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });

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

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email?.trim() || !form.password?.trim()) {
      toast?.error('Email and password are required');
      return;
    }
    if (form.password.length < 6) {
      toast?.error('Password must be at least 6 characters');
      return;
    }
    try {
      setActionLoading({ create: true });
      await api.createSuperAdminAdmin({
        email: form.email.trim(),
        password: form.password,
        displayName: form.displayName?.trim() || undefined,
      });
      toast?.success('Admin created successfully');
      setCreateModal(false);
      setForm({ email: '', password: '', displayName: '' });
      await loadAdmins();
    } catch (e) {
      toast?.error(e.message || 'Failed to create admin');
    } finally {
      setActionLoading({ create: false });
    }
  };

  const handleDisable = async (admin) => {
    if (!window.confirm(`Disable admin "${admin.email}"? They will lose access until re-enabled.`)) return;
    try {
      setActionLoading((p) => ({ ...p, [admin.id]: true }));
      await api.disableSuperAdminAdmin(admin.id);
      toast?.success(`${admin.email} disabled`);
      await loadAdmins();
    } catch (e) {
      toast?.error(e.message || 'Failed to disable admin');
    } finally {
      setActionLoading((p) => ({ ...p, [admin.id]: false }));
    }
  };

  const handleEnable = async (admin) => {
    if (!window.confirm(`Enable admin "${admin.email}"?`)) return;
    try {
      setActionLoading((p) => ({ ...p, [admin.id]: true }));
      await api.enableSuperAdminAdmin(admin.id);
      toast?.success(`${admin.email} enabled`);
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

        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <FaSpinner className="animate-spin text-3xl text-violet-500 mx-auto mb-2" />
              <p className="text-gray-500">Loading admins...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FaUsers className="text-4xl text-gray-300 mx-auto mb-2" />
              <p>No admin accounts yet. Create one above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {admins.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{a.displayName || a.email}</p>
                    <p className="text-sm text-gray-500">{a.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Last login: {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        a.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {a.status}
                    </span>
                    {a.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleDisable(a)}
                        disabled={actionLoading[a.id]}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                      >
                        {actionLoading[a.id] ? <FaSpinner className="animate-spin" /> : <FaBan />}
                        Disable
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnable(a)}
                        disabled={actionLoading[a.id]}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                      >
                        {actionLoading[a.id] ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                        Enable
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {createModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Create Admin</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setCreateModal(false); setForm({ email: '', password: '', displayName: '' }); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.create}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading.create && <FaSpinner className="animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
