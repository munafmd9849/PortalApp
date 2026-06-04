import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Plus, Trash2, Save, Video, Users, FileText, BookOpen, MessageSquare, Layers,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';

const INTERVIEW_TYPES = [
  { id: 'HR', label: 'HR', icon: Users },
  { id: 'TECHNICAL', label: 'Technical', icon: FileText },
  { id: 'BEHAVIORAL', label: 'Behavioral', icon: MessageSquare },
  { id: 'PLACEMENT_READINESS', label: 'Placement', icon: BookOpen },
  { id: 'MIXED', label: 'Mixed', icon: Layers },
  { id: 'CUSTOM', label: 'Custom', icon: Video },
];

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
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    interviewType: 'HR',
    instructions: '',
    startDate: '',
    endDate: '',
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

  const handleSave = async (publish) => {
    if (!form.title.trim()) return toast.error('Interview name is required');
    if (!form.startDate || !form.endDate) return toast.error('Dates required');
    if (!questions.some((q) => q.questionText.trim())) return toast.error('Add at least one question');
    setSubmitting(true);
    try {
      await api.createAiMockInterview({
        ...form,
        targetStudentIds: selectedStudents,
        questions: questions.filter((q) => q.questionText.trim()).map((q, i) => ({ ...q, orderIndex: i })),
        publish,
      });
      toast.success(publish ? 'Published' : 'Draft saved');
      navigate('/admin?tab=mockInterviews');
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

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
            onClick={() => navigate('/admin?tab=mockInterviews')}
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
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Interview name
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 ring-indigo-500/10"
                    placeholder="e.g. HR Placement Mock Round 1"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Interview type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {INTERVIEW_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm({ ...form, interviewType: t.id })}
                        className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                          form.interviewType === t.id
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-100 bg-slate-50 text-slate-500'
                        }`}
                      >
                        <t.icon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
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
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm"
                  />
                </div>
              </div>
              <button type="button" onClick={() => setStep(2)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm">
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
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Batches</label>
                  <select
                    multiple
                    className="w-full h-28 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs"
                    value={form.targetBatches}
                    onChange={(e) =>
                      setForm({ ...form, targetBatches: [...e.target.selectedOptions].map((o) => o.value) })
                    }
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label || b.year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campuses</label>
                  <select
                    multiple
                    className="w-full h-28 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs"
                    value={form.targetSchoolIds}
                    onChange={(e) =>
                      setForm({ ...form, targetSchoolIds: [...e.target.selectedOptions].map((o) => o.value) })
                    }
                  >
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <input
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl divide-y">
                {filteredStudents.slice(0, 40).map((s) => (
                  <label key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s.id)}
                      onChange={() =>
                        setSelectedStudents((prev) =>
                          prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                        )
                      }
                    />
                    <span className="font-semibold text-slate-800">{s.fullName}</span>
                  </label>
                ))}
              </div>
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
