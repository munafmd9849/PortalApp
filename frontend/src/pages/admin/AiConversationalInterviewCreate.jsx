import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Save, MessageCircle, Calendar, Clock, Search, CheckCircle2, Users } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { combineDateAndTime } from '../../utils/datetimeWindow';

export default function AiConversationalInterviewCreate() {
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
    conversationalTopic: 'Placement readiness and career goals',
    conversationalMaxTurns: 8,
    interviewType: 'PLACEMENT_READINESS',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '21:00',
    targetBatches: [],
    targetSchoolIds: [],
  });
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
      toast.error('End must be after start');
      return false;
    }
    return true;
  };

  const handleSave = async (publish) => {
    if (!form.title.trim()) return toast.error('Interview name is required');
    if (!form.conversationalTopic?.trim()) return toast.error('Conversation topic is required');
    if (!validateWindow()) return;
    const { startIso, endIso } = buildWindow();
    setSubmitting(true);
    try {
      await api.createConversationalInterview({
        ...form,
        startDate: startIso,
        endDate: endIso,
        targetStudentIds: selectedStudents,
        publish,
      });
      toast.success(publish ? 'Published' : 'Draft saved');
      navigate(`${adminBase}?tab=conversationalInterviews`);
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
          return String(s.batch ?? '').trim() === String(b.year ?? '') || String(s.batch ?? '').includes(String(b.label ?? ''));
        });
      if (!batchMatch) return false;
    }
    if (form.targetSchoolIds.length && !form.targetSchoolIds.includes(s.schoolId)) return false;
    return true;
  };

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((s) => {
      if (!studentMatchesFilters(s)) return false;
      if (!q) return true;
      return (
        s.fullName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    });
  }, [students, studentSearch, form.targetBatches, form.targetSchoolIds, batches]);

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-8 py-6 border-b flex items-center justify-between bg-indigo-50/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Conversational AI Interview</h2>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Step {step} of 2</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate(`${adminBase}?tab=conversationalInterviews`)} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {step === 1 && (
            <>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Interview name"
                className="w-full p-4 bg-slate-50 border rounded-2xl font-bold"
              />
              <textarea
                value={form.conversationalTopic}
                onChange={(e) => setForm({ ...form, conversationalTopic: e.target.value })}
                placeholder="Conversation topic (e.g. Placement readiness, final year projects)"
                className="w-full p-4 bg-slate-50 border rounded-2xl h-24"
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Max exchanges</label>
                  <input
                    type="number"
                    min={3}
                    max={15}
                    value={form.conversationalMaxTurns}
                    onChange={(e) => setForm({ ...form, conversationalMaxTurns: Number(e.target.value) })}
                    className="w-full p-3 border rounded-xl mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Type</label>
                  <select
                    value={form.interviewType}
                    onChange={(e) => setForm({ ...form, interviewType: e.target.value })}
                    className="w-full p-3 border rounded-xl mt-1"
                  >
                    <option value="PLACEMENT_READINESS">Placement Readiness</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="BEHAVIORAL">Behavioral</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
              </div>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                placeholder="Instructions for students"
                className="w-full p-4 bg-slate-50 border rounded-2xl h-20"
              />
              <div className="grid md:grid-cols-2 gap-4">
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="p-3 border rounded-xl" />
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="p-3 border rounded-xl" />
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="p-3 border rounded-xl" />
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="p-3 border rounded-xl" />
              </div>
              <button type="button" onClick={() => setStep(2)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs">
                Next: Assign students
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full p-3 border rounded-xl"
              />
              <div className="max-h-64 overflow-y-auto border rounded-xl divide-y">
                {filteredStudents.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s.id)}
                      onChange={() =>
                        setSelectedStudents((prev) =>
                          prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                        )
                      }
                    />
                    <span className="text-sm font-medium">{s.fullName} · {s.email}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500">{selectedStudents.length} students selected</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 border rounded-xl font-bold text-xs uppercase">Back</button>
                <button type="button" disabled={submitting} onClick={() => handleSave(true)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Publish
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
