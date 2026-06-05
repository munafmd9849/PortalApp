import React, { useState } from 'react';
import { X, Calendar, Clock, Trash2, Save, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../ui/Toast';
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
  getJoinWindowSettings,
  joinWindowSummary,
} from '../../../utils/assessmentEntryWindow';

export default function AssessmentSettingsModal({ assessment, onClose, onUpdate }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const initialJoin = getJoinWindowSettings(assessment);
  const [formData, setFormData] = useState({
    title: assessment.title || '',
    duration: assessment.duration || 60,
    startTime: toDatetimeLocalValue(assessment.startTime),
    endTime: toDatetimeLocalValue(assessment.endTime),
    joinOpensMinutesBeforeStart: initialJoin.opensMinutesBeforeStart,
    joinClosesMinutesAfterStart: initialJoin.closesMinutesAfterStart,
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      const startIso = fromDatetimeLocalValue(formData.startTime);
      const endIso = fromDatetimeLocalValue(formData.endTime);
      if (startIso && endIso && new Date(endIso) <= new Date(startIso)) {
        toast.error('End time must be after start time');
        setLoading(false);
        return;
      }
      await api.updateAssessment(assessment.id, {
        title: formData.title,
        duration: formData.duration,
        startTime: startIso,
        endTime: endIso,
        joinOpensMinutesBeforeStart: formData.joinOpensMinutesBeforeStart,
        joinClosesMinutesAfterStart: formData.joinClosesMinutesAfterStart,
      });
      toast.success('Assessment updated successfully');
      onUpdate?.();
      onClose?.();
    } catch (error) {
      toast.error(error.message || 'Failed to update assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await api.deleteAssessment(assessment.id);
      toast.success('Assessment deleted permanently');
      onUpdate?.();
      onClose?.();
    } catch (error) {
      toast.error(error.message || 'Failed to delete assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-xl max-h-[min(90vh,900px)] bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assessment-settings-title"
      >
        {/* Header — always visible */}
        <div className="shrink-0 p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 id="assessment-settings-title" className="text-xl font-black text-slate-900">Assessment Settings</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Configure & Manage</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl transition-all"
            aria-label="Close assessment settings"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body — scrolls when content is tall */}
        <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment Title</label>
            <input 
              type="text" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/20 outline-none font-bold text-slate-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Start Time
              </label>
              <input 
                type="datetime-local" 
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/20 outline-none font-bold text-slate-700"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" /> End Time
              </label>
              <input 
                type="datetime-local" 
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/20 outline-none font-bold text-slate-700"
              />
            </div>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4">
            <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Join window</p>
            <p className="text-[11px] text-slate-600 font-medium">
              Editable after publish — extend late join if students need more time.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Join opens (min before start)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.joinOpensMinutesBeforeStart}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      joinOpensMinutesBeforeStart: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Last join (min after start)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.joinClosesMinutesAfterStart}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      joinClosesMinutesAfterStart: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>
            {formData.startTime && (
              <p className="text-[11px] text-indigo-700 font-medium">
                {joinWindowSummary({
                  ...assessment,
                  startTime: fromDatetimeLocalValue(formData.startTime),
                  endTime: fromDatetimeLocalValue(formData.endTime),
                  config: JSON.stringify({
                    joinWindow: {
                      opensMinutesBeforeStart: formData.joinOpensMinutesBeforeStart,
                      closesMinutesAfterStart: formData.joinClosesMinutesAfterStart,
                    },
                  }),
                })}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3 h-3" /> Duration (Minutes)
            </label>
            <input 
              type="number" 
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/20 outline-none font-bold text-slate-700"
            />
          </div>

          {/* Danger Zone */}
          <div className="mt-8 pt-8 border-t border-rose-100">
            {showDeleteConfirm ? (
              <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  <div>
                    <h4 className="text-sm font-black text-rose-900">Are you absolutely sure?</h4>
                    <p className="text-[10px] font-bold text-rose-500 mt-0.5">This action cannot be undone.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-white text-slate-600 text-xs font-bold rounded-xl border border-slate-200">Cancel</button>
                  <button onClick={handleDelete} disabled={loading} className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-500 disabled:opacity-50">Delete Permanently</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-4 py-3 rounded-xl transition-all text-xs font-bold w-full justify-center"
              >
                <Trash2 className="w-4 h-4" /> Delete Assessment
              </button>
            )}
          </div>
        </div>

        {/* Footer — always visible */}
        <div className="shrink-0 p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-white text-slate-600 font-bold text-xs rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-8 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
