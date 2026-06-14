import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X, Plus, Trash2, Save, Video, Calendar, Clock, Search, CheckCircle2,
  Users, GraduationCap, Building2, Info,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { combineDateAndTime } from '../../utils/datetimeWindow';

const emptyQuestion = (orderIndex) => ({
  orderIndex,
  questionText: '',
  notes: '',
  prepTimeSeconds: 30,
  answerTimeSeconds: 120,
  mandatory: true,
});

export default function AiMockInterviewCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const adminBase = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    instructions: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '21:00',
    targetBatches: [],
    targetSchoolIds: [],
  });
  const [questions, setQuestions] = useState([emptyQuestion(0)]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [sRes, bRes, schRes] = await Promise.all([
          api.getAllStudents(),
          api.getBatches(),
          api.getSchools(),
        ]);
        setStudents(sRes.students || []);
        setBatches(bRes.batches || bRes || []);
        setSchools(schRes.schools || schRes || []);
      } catch {
        toast.error('Failed to load targeting data');
      }
    })();
  }, [toast]);

  const buildWindow = () => {
    const startIso = combineDateAndTime(form.startDate, form.startTime);
    const endIso = combineDateAndTime(form.endDate, form.endTime);
    return { startIso, endIso };
  };

  const validateWindow = () => {
    const { startIso, endIso } = buildWindow();
    if (!startIso || !endIso) {
      toast.error('Start and end date with times are required');
      return false;
    }
    if (new Date(endIso) <= new Date(startIso)) {
      toast.error('End must be after start (date and time)');
      return false;
    }
    return true;
  };

  const handleSave = async (publish) => {
    if (!form.title.trim()) return toast.error('Interview name is required');
    if (!validateWindow()) return;
    if (!questions.some((q) => q.questionText.trim())) return toast.error('Add at least one question');
    const { startIso, endIso } = buildWindow();
    setSubmitting(true);
    try {
      await api.createAiMockInterview({
        ...form,
        startDate: startIso,
        endDate: endIso,
        interviewType: 'AI_VIDEO',
        targetStudentIds: selectedStudents,
        questions: questions.filter((q) => q.questionText.trim()).map((q, i) => ({ ...q, orderIndex: i })),
        publish,
      });
      toast.success(publish ? 'Published' : 'Draft saved');
      navigate(`${adminBase}?tab=aiInterviews`);
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const batchLabel = (b) => b.label || (b.year ? `Batch ${b.year}` : 'Batch');

  const studentMatchesFilters = (s) => {
    if (form.targetBatches.length) {
      const batchMatch =
        form.targetBatches.includes(s.batchId) ||
        form.targetBatches.some((id) => {
          const b = batches.find((x) => x.id === id);
          if (!b) return false;
          const year = String(b.year ?? '');
          const label = String(b.label ?? '');
          const sb = String(s.batch ?? '').trim();
          return sb === year || sb === label || sb.includes(year);
        });
      if (!batchMatch) return false;
    }
    if (form.targetSchoolIds.length && !form.targetSchoolIds.includes(s.schoolId)) {
      return false;
    }
    return true;
  };

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((s) => {
      if (!studentMatchesFilters(s)) return false;
      if (!q) return true;
      return (
        s.fullName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        String(s.batch ?? '').toLowerCase().includes(q) ||
        String(s.school ?? '').toLowerCase().includes(q) ||
        String(s.center ?? '').toLowerCase().includes(q)
      );
    });
  }, [students, studentSearch, form.targetBatches, form.targetSchoolIds, batches]);

  const audienceCount = useMemo(
    () => students.filter((s) => studentMatchesFilters(s)).length,
    [students, form.targetBatches, form.targetSchoolIds, batches]
  );

  const toggleBatch = (id) => {
    setForm((prev) => ({
      ...prev,
      targetBatches: prev.targetBatches.includes(id)
        ? prev.targetBatches.filter((x) => x !== id)
        : [...prev.targetBatches, id],
    }));
  };

  const toggleSchool = (id) => {
    setForm((prev) => ({
      ...prev,
      targetSchoolIds: prev.targetSchoolIds.includes(id)
        ? prev.targetSchoolIds.filter((x) => x !== id)
        : [...prev.targetSchoolIds, id],
    }));
  };

  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    const ids = filteredStudents.map((s) => s.id);
    setSelectedStudents((prev) => [...new Set([...prev, ...ids])]);
  };

  const clearSelection = () => setSelectedStudents([]);

  const clearAudienceFilters = () => {
    setForm((prev) => ({ ...prev, targetBatches: [], targetSchoolIds: [] }));
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">AI Video Mock Interview</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Configuration Wizard · Step {step} of 3
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`${adminBase}?tab=aiInterviews`)}
            className="w-10 h-10 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-1.5 w-full bg-slate-100 relative shrink-0">
          <div
            className="absolute inset-0 bg-indigo-600 transition-all duration-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-8 sm:p-10 bg-white">
          {step === 1 && (
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Interview name
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 ring-indigo-500/10"
                  placeholder="e.g. Placement Mock Round 1"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl h-28 resize-none font-medium"
                  placeholder="Purpose and scope..."
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Student instructions
                </label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl h-28 resize-none font-medium"
                  placeholder="Shown before the secure session starts..."
                />
              </div>
              <div className="space-y-6 p-6 bg-slate-50/80 border border-slate-200 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Availability window
                </p>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-600">Opens</span>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        Start date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          value={form.startDate}
                          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                          className="w-full p-4 pl-11 bg-white border border-slate-200 rounded-2xl font-bold text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        Start time
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="time"
                          value={form.startTime}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                          className="w-full p-4 pl-11 bg-white border border-slate-200 rounded-2xl font-bold text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-600">Closes</span>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        End date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          value={form.endDate}
                          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                          className="w-full p-4 pl-11 bg-white border border-slate-200 rounded-2xl font-bold text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        End time
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="time"
                          value={form.endTime}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                          className="w-full p-4 pl-11 bg-white border border-slate-200 rounded-2xl font-bold text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!validateWindow()) return;
                  setStep(2);
                }}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm"
              >
                Next: Question builder
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-3xl mx-auto space-y-4">
              {questions.map((q, idx) => (
                <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Question {idx + 1}</span>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => setQuestions(questions.filter((_, i) => i !== idx))} className="text-rose-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={q.questionText}
                    onChange={(e) => {
                      const copy = [...questions];
                      copy[idx].questionText = e.target.value;
                      setQuestions(copy);
                    }}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium"
                    placeholder="Question text"
                    rows={2}
                  />
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <label>
                      Prep (sec)
                      <input
                        type="number"
                        className="w-full mt-1 p-2 border rounded-lg"
                        value={q.prepTimeSeconds}
                        onChange={(e) => {
                          const copy = [...questions];
                          copy[idx].prepTimeSeconds = +e.target.value;
                          setQuestions(copy);
                        }}
                      />
                    </label>
                    <label>
                      Answer (sec)
                      <input
                        type="number"
                        className="w-full mt-1 p-2 border rounded-lg"
                        value={q.answerTimeSeconds}
                        onChange={(e) => {
                          const copy = [...questions];
                          copy[idx].answerTimeSeconds = +e.target.value;
                          setQuestions(copy);
                        }}
                      />
                    </label>
                    <label className="flex items-end gap-2 pb-2">
                      <input
                        type="checkbox"
                        checked={q.mandatory}
                        onChange={(e) => {
                          const copy = [...questions];
                          copy[idx].mandatory = e.target.checked;
                          setQuestions(copy);
                        }}
                      />
                      Mandatory
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setQuestions([...questions, emptyQuestion(questions.length)])}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-500 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add question
              </button>
              <button type="button" onClick={() => setStep(3)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm">
                Next: Assign students
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Assign students</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Filter by batch and school, then pick individuals. On publish, everyone in the
                    filters plus your selections is enrolled.
                  </p>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 bg-white px-5 sm:px-6 py-3 rounded-xl border border-slate-200 shrink-0">
                  <div className="text-center">
                    <span className="text-xl font-black text-indigo-600 block tabular-nums">
                      {selectedStudents.length}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Selected</span>
                  </div>
                  <div className="text-center border-l border-slate-100 pl-4 sm:pl-6">
                    <span className="text-xl font-black text-slate-900 block tabular-nums">
                      {audienceCount}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">In audience</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-900/80 font-medium leading-relaxed">
                  Leave filters empty to show all students. Selecting batches or schools narrows the
                  list below. Individual picks are added on top when you publish.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Audience filters
                  </span>
                  {(form.targetBatches.length > 0 || form.targetSchoolIds.length > 0) && (
                    <button
                      type="button"
                      onClick={clearAudienceFilters}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  <div className="space-y-3 sm:pr-4 sm:border-r sm:border-slate-100">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-700">Batches</span>
                      {form.targetBatches.length > 0 && (
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {form.targetBatches.length} selected
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {batches.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No batches configured</p>
                      ) : (
                        batches.map((b) => {
                          const active = form.targetBatches.includes(b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => toggleBatch(b.id)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                                active
                                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                  : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'
                              }`}
                            >
                              {batchLabel(b)}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-700">Schools</span>
                      {form.targetSchoolIds.length > 0 && (
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {form.targetSchoolIds.length} selected
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {schools.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No schools configured</p>
                      ) : (
                        schools.map((s) => {
                          const active = form.targetSchoolIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleSchool(s.id)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all text-left max-w-full ${
                                active
                                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                  : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'
                              }`}
                            >
                              {s.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, batch, or school..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full p-4 pl-11 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ring-indigo-500/10 outline-none font-bold text-slate-900 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  {filteredStudents.length} showing
                  {studentSearch.trim() ? ` · “${studentSearch.trim()}”` : ''}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    disabled={filteredStudents.length === 0}
                    className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 disabled:opacity-40"
                  >
                    Select all shown
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={selectedStudents.length === 0}
                    className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    Clear selection
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[min(340px,45vh)] overflow-y-auto p-1">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const selected = selectedStudents.includes(student.id);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => toggleStudent(student.id)}
                        className={`p-4 flex items-center justify-between rounded-xl border-2 transition-all text-left gap-2 ${
                          selected
                            ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                            : 'border-slate-100 bg-slate-50/80 hover:border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                              selected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {student.fullName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {student.fullName}
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase truncate">
                              {[student.batch, student.school || student.center]
                                .filter(Boolean)
                                .join(' · ') || student.email}
                            </div>
                          </div>
                        </div>
                        {selected ? (
                          <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                        ) : (
                          <Plus className="w-5 h-5 text-slate-300 shrink-0" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-full py-14 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      No students match
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      Try clearing filters or changing your search
                    </p>
                  </div>
                )}
              </div>

              {selectedStudents.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 uppercase w-full mb-1">
                    Selected ({selectedStudents.length})
                  </span>
                  {selectedStudents.slice(0, 12).map((id) => {
                    const s = students.find((x) => x.id === id);
                    if (!s) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-white border border-indigo-100 text-xs font-bold text-slate-700"
                      >
                        {s.fullName}
                        <button
                          type="button"
                          onClick={() => toggleStudent(id)}
                          className="p-0.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                          aria-label={`Remove ${s.fullName}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {selectedStudents.length > 12 && (
                    <span className="text-xs font-bold text-slate-400 self-center">
                      +{selectedStudents.length - 12} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600">
              Back
            </button>
          )}
          <div className="flex-1" />
          {step === 3 && (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSave(false)}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Draft
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSave(true)}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700"
              >
                Publish & assign
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
