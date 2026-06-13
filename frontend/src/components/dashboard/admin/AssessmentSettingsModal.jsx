import React, { useState } from 'react';
import { X, Trash2, Save, AlertTriangle } from 'lucide-react';
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
      className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-xl max-h-[min(90vh,900px)] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col border border-gray-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assessment-settings-title"
      >
        <div className="shrink-0 px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-800 text-white">
          <p id="assessment-settings-title" className="text-sm font-medium">Settings</p>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Title</label>
            <input 
              type="text" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Start time</label>
              <input 
                type="datetime-local" 
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">End time</label>
              <input 
                type="datetime-local" 
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800"
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md space-y-3">
            <p className="text-xs font-medium text-gray-700">Join window</p>
            <p className="text-xs text-gray-500">
              Adjust when students can enter after publish.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Opens (min before start)</label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Closes (min after start)</label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            {formData.startTime && (
              <p className="text-xs text-gray-600">
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

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Duration (minutes)</label>
            <input 
              type="number" 
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            {showDeleteConfirm ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-gray-600" />
                  <p className="text-sm text-gray-700">Delete this assessment permanently?</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                  <button type="button" onClick={handleDelete} disabled={loading} className="px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-md hover:bg-slate-900 disabled:opacity-50">Delete</button>
                </div>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm w-full justify-center py-2 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <Trash2 className="w-4 h-4" /> Delete assessment
              </button>
            )}
          </div>
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 bg-blue-800 text-white text-sm font-medium rounded-md hover:bg-blue-900 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
