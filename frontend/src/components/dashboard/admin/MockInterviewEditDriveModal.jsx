import React, { useCallback, useEffect, useState } from 'react';
import {
  Video,
  X,
  Layout,
  Users,
  MessageSquare,
  BookOpen,
  Terminal,
  Plus,
  Loader2,
} from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../ui/Toast';
import { createCodingQuestion, parseCodingQuestions } from '../../../utils/mockInterviewQuestions';

const CATEGORIES = [
  { id: 'TECHNICAL', label: 'Technical', icon: Layout },
  { id: 'HR', label: 'HR Interview', icon: Users },
  { id: 'BEHAVIORAL', label: 'Behavioral', icon: MessageSquare },
  { id: 'COMMUNICATION', label: 'Communication', icon: BookOpen },
  { id: 'GD_PREP', label: 'GD Prep', icon: Users },
];

export default function MockInterviewEditDriveModal({ drive, isOpen, onClose, onSuccess }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'TECHNICAL',
    description: '',
    instructions: '',
    enableCodeConsole: false,
  });
  const [codingQuestions, setCodingQuestions] = useState([]);

  const hydrateFromDrive = useCallback((d) => {
    if (!d) return;
    setFormData({
      title: d.title || '',
      category: d.category || 'TECHNICAL',
      description: d.description || '',
      instructions: d.instructions || '',
      enableCodeConsole: Boolean(d.enableCodeConsole),
    });
    setCodingQuestions(parseCodingQuestions(d.codingQuestions));
  }, []);

  useEffect(() => {
    if (isOpen && drive) hydrateFromDrive(drive);
  }, [isOpen, drive, hydrateFromDrive]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.updateMockInterviewDrive(drive.id, {
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description,
        instructions: formData.instructions,
        enableCodeConsole: Boolean(formData.enableCodeConsole),
        codingQuestions: formData.enableCodeConsole ? codingQuestions : [],
      });
      toast.success('Drive details updated');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Failed to update drive');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !drive) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Edit Drive Details</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {drive.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
            Schedule and slot times are not changed here. Use <strong>Manage 1:1 Slots</strong> to edit
            individual slot timings.
          </p>

          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Drive Title
            </label>
            <input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-bold text-slate-900"
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.id })}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    formData.category === cat.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-100 bg-slate-50 text-slate-500'
                  }`}
                >
                  <cat.icon className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-slate-700 resize-none"
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Instructions for Students
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              rows={2}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-slate-700 resize-none"
            />
          </div>

          <div className="rounded-2xl border-2 border-slate-200 p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-sm font-bold text-slate-900">Code console (Tech Board)</p>
                <p className="text-xs text-slate-500">Live coding in interview rooms</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.enableCodeConsole}
              onClick={() =>
                setFormData({ ...formData, enableCodeConsole: !formData.enableCodeConsole })
              }
              className={`relative w-12 h-7 rounded-full shrink-0 ${
                formData.enableCodeConsole ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  formData.enableCodeConsole ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {formData.enableCodeConsole && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">Coding questions</p>
                <button
                  type="button"
                  onClick={() => setCodingQuestions((prev) => [...prev, createCodingQuestion()])}
                  className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {codingQuestions.map((q, idx) => (
                <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold text-slate-400">Q{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCodingQuestions((prev) => prev.filter((x) => x.id !== q.id))
                      }
                      className="text-[10px] font-bold text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={q.title}
                    onChange={(e) =>
                      setCodingQuestions((prev) =>
                        prev.map((x) => (x.id === q.id ? { ...x, title: e.target.value } : x))
                      )
                    }
                    placeholder="Title"
                    className="w-full p-2 text-sm font-bold border border-slate-200 rounded-lg"
                  />
                  <textarea
                    value={q.description}
                    onChange={(e) =>
                      setCodingQuestions((prev) =>
                        prev.map((x) =>
                          x.id === q.id ? { ...x, description: e.target.value } : x
                        )
                      )
                    }
                    placeholder="Problem statement"
                    rows={2}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg resize-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-xs font-bold text-slate-500 uppercase"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
