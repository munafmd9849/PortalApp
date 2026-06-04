import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Video,
  X,
  ChevronRight,
  Calendar,
  Clock,
  BookOpen,
  Info,
  Users,
  Layout,
  MessageSquare,
  Terminal,
  CheckCircle2,
  Plus,
  Search,
  AlertCircle,
} from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../ui/Toast';
import { createCodingQuestion } from '../../../utils/mockInterviewQuestions';

const INITIAL_FORM = {
  title: '',
  category: 'TECHNICAL',
  enableCodeConsole: true,
  description: '',
  instructions: '',
  date: '',
  startTime: '',
  endTime: '',
  slotDuration: 30,
  bufferTime: 0,
  targetBatches: [],
  targetBranches: [],
  targetStudentIds: [],
};

const CATEGORIES = [
  { id: 'TECHNICAL', label: 'Technical', icon: Layout },
  { id: 'HR', label: 'HR Interview', icon: Users },
  { id: 'BEHAVIORAL', label: 'Behavioral', icon: MessageSquare },
  { id: 'COMMUNICATION', label: 'Communication', icon: BookOpen },
  { id: 'GD_PREP', label: 'GD Prep', icon: Users },
];

function estimateSlots(formData) {
  if (!formData.startTime || !formData.endTime) return 0;
  const mins =
    (new Date(`2000-01-01T${formData.endTime}`) - new Date(`2000-01-01T${formData.startTime}`)) /
    60000;
  const block = parseInt(formData.slotDuration, 10);
  if (!block || mins <= 0) return 0;
  return Math.floor(mins / block);
}

export default function MockInterviewCreateModal({ isOpen, onClose, onSuccess }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [codingQuestions, setCodingQuestions] = useState([]);

  const resetForm = useCallback(() => {
    setStep(1);
    setFormData(INITIAL_FORM);
    setSelectedStudents([]);
    setStudentSearch('');
    setCodingQuestions([]);
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const res = await api.getAllStudents();
      setStudents(res.students || []);
    } catch {
      console.error('Failed to load students');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      loadStudents();
    }
  }, [isOpen, resetForm, loadStudents]);

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
          s.email?.toLowerCase().includes(studentSearch.toLowerCase())
      ),
    [students, studentSearch]
  );

  const estSlots = estimateSlots(formData);

  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const validateStep = (s) => {
    if (s === 1) {
      if (!formData.title.trim()) {
        toast.error('Interview title is required');
        return false;
      }
      return true;
    }
    if (s === 2) {
      if (!formData.date || !formData.startTime || !formData.endTime) {
        toast.error('Date and time window are required');
        return false;
      }
      const start = new Date(`${formData.date}T${formData.startTime}`);
      const end = new Date(`${formData.date}T${formData.endTime}`);
      if (end <= start) {
        toast.error('End time must be after start time');
        return false;
      }
      if (estSlots < 1) {
        toast.error('Time window is too short for at least one slot');
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const buildPayload = (publish) => {
    const startDateTime =
      formData.date && formData.startTime
        ? new Date(`${formData.date}T${formData.startTime}`)
        : null;
    const endDateTime =
      formData.date && formData.endTime
        ? new Date(`${formData.date}T${formData.endTime}`)
        : null;
    return {
      ...formData,
      date: formData.date || undefined,
      slotDuration: parseInt(formData.slotDuration, 10) || 30,
      breakDuration: 0,
      bufferTime: parseInt(formData.bufferTime, 10) || 0,
      startTime: startDateTime?.toISOString(),
      endTime: endDateTime?.toISOString(),
      targetStudentIds: selectedStudents,
      enableCodeConsole: Boolean(formData.enableCodeConsole),
      codingQuestions: formData.enableCodeConsole ? codingQuestions : [],
      publish,
    };
  };

  const handleSaveDraft = async () => {
    if (!validateStep(1)) return;
    setSubmitting(true);
    try {
      const res = await api.createMockInterviewDrive(buildPayload(false));
      toast.success('Draft saved — publish when schedule is ready');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Failed to save draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!validateStep(1) || !validateStep(2)) return;
    setSubmitting(true);
    try {
      const res = await api.createMockInterviewDrive(buildPayload(true));
      toast.success(
        `Published · ${res.slotsGenerated} slots · ${res.studentsAssigned} students assigned`
      );
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Failed to publish mock interview drive');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">New Mock Interview Drive</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Configuration Wizard • Step {step} of 3
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-1.5 w-full bg-slate-100 relative">
          <div
            className="absolute inset-0 bg-indigo-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-8 sm:p-10 custom-scrollbar bg-white">
          {step === 1 && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Drive Title
                </label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-bold text-slate-900 transition-all"
                  placeholder="e.g. Q2 Mock Technical Round — Frontend"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Interview Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          category: cat.id,
                          enableCodeConsole: cat.id === 'TECHNICAL',
                        })
                      }
                      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        formData.category === cat.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/5'
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <cat.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-[10px] font-bold uppercase truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-slate-200 p-5 bg-slate-50/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        formData.enableCodeConsole
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Code console (Tech Board)</p>
                      <p className="text-xs text-slate-500 font-medium mt-1 max-w-md">
                        When enabled, the live interview room includes a shared coding panel for
                        technical rounds. Turn off for HR, behavioral, or video-only sessions.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.enableCodeConsole}
                    onClick={() =>
                      setFormData({ ...formData, enableCodeConsole: !formData.enableCodeConsole })
                    }
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                      formData.enableCodeConsole ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        formData.enableCodeConsole ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Description & Objectives
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-medium text-slate-700 h-28 resize-none transition-all"
                  placeholder="What is this mock interview for? Who should attend?"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Instructions for Students
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-medium text-slate-700 h-24 resize-none transition-all"
                  placeholder="Preparation tips, prerequisites..."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Interview Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full p-4 pl-11 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-bold text-slate-900 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-bold text-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-bold text-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { key: 'slotDuration', label: 'Slot Duration (min)' },
                  { key: 'bufferTime', label: 'Buffer (min)' },
                ].map((field) => (
                  <div key={field.key} className="space-y-2.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData[field.key]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-bold text-slate-900 text-xs"
                    />
                  </div>
                ))}
              </div>

              {formData.enableCodeConsole && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Coding questions (optional)</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pre-load problems for the live room. You can add more during the interview.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCodingQuestions((prev) => [...prev, createCodingQuestion()])}
                      className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add question
                    </button>
                  </div>
                  {codingQuestions.length === 0 ? (
                    <p className="text-xs text-slate-500">No questions yet — add in the room if you prefer.</p>
                  ) : (
                    <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar">
                      {codingQuestions.map((q, idx) => (
                        <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Question {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCodingQuestions((prev) => prev.filter((x) => x.id !== q.id))
                              }
                              className="text-[10px] font-bold text-rose-600 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            value={q.title}
                            onChange={(e) =>
                              setCodingQuestions((prev) =>
                                prev.map((x) =>
                                  x.id === q.id ? { ...x, title: e.target.value } : x
                                )
                              )
                            }
                            placeholder="Title e.g. Two Sum"
                            className="w-full p-3 text-sm font-bold border border-slate-200 rounded-xl"
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
                            placeholder="Problem statement..."
                            rows={2}
                            className="w-full p-3 text-xs border border-slate-200 rounded-xl resize-none"
                          />
                          <textarea
                            value={q.starterCode || ''}
                            onChange={(e) =>
                              setCodingQuestions((prev) =>
                                prev.map((x) =>
                                  x.id === q.id ? { ...x, starterCode: e.target.value } : x
                                )
                              )
                            }
                            placeholder="Starter code (function solution...)"
                            rows={4}
                            className="w-full p-3 text-xs font-mono border border-slate-200 rounded-xl resize-none bg-slate-900 text-emerald-400"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Estimated slots
                    </p>
                    <p className="text-2xl font-black text-indigo-400 tabular-nums">{estSlots}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 max-w-md">
                  <AlertCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Slots are generated when you publish. Selected students are auto-assigned in order.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Assign Candidates</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Optional — cherry-pick students for automatic slot assignment.
                  </p>
                </div>
                <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-xl border border-slate-200">
                  <div className="text-center">
                    <span className="text-xl font-black text-indigo-600 block tabular-nums">
                      {selectedStudents.length}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Selected</span>
                  </div>
                  <div className="text-center border-l border-slate-100 pl-6">
                    <span className="text-xl font-black text-slate-900 block tabular-nums">
                      {students.length}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Available</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full p-4 pl-11 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-bold text-slate-900 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto p-1 custom-scrollbar">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleStudent(student.id)}
                      className={`p-4 flex items-center justify-between rounded-xl border-2 transition-all text-left ${
                        selectedStudents.includes(student.id)
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            selectedStudents.includes(student.id)
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {student.fullName?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {student.fullName}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase truncate">
                            {student.batch || student.email}
                          </div>
                        </div>
                      </div>
                      {selectedStudents.includes(student.id) ? (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                      ) : (
                        <Plus className="w-5 h-5 text-slate-300 shrink-0" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                    No candidates found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => s - 1)}
            className="px-6 py-3 text-xs font-bold text-slate-400 hover:text-slate-900 disabled:opacity-0 transition-all uppercase tracking-widest"
          >
            Back
          </button>
          <div className="flex gap-3">
            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="px-6 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50 flex items-center gap-2"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={submitting}
                  className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  Publish drive
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
