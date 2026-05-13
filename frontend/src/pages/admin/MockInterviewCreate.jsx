import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, BookOpen, Info, Users, 
  ArrowLeft, Save, Plus, Trash2, CheckCircle2,
  AlertCircle, Layout, MessageSquare, Timer, UserPlus, Search
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';

export default function MockInterviewCreate() {
  const navigate = useNavigate();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'TECHNICAL',
    description: '',
    instructions: '',
    date: '',
    startTime: '',
    endTime: '',
    slotDuration: 30,
    breakDuration: 5,
    bufferTime: 0,
    targetBatches: [],
    targetBranches: [],
    targetStudentIds: []
  });

  React.useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const res = await api.getAllStudents();
      setStudents(res.students || []);
    } catch (err) {
      console.error('Failed to load students');
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const categories = [
    { id: 'TECHNICAL', label: 'Technical Interview', icon: Layout },
    { id: 'HR', label: 'HR Interview', icon: Users },
    { id: 'BEHAVIORAL', label: 'Behavioral Round', icon: MessageSquare },
    { id: 'COMMUNICATION', label: 'Communication Training', icon: BookOpen },
    { id: 'GD_PREP', label: 'Group Discussion Prep', icon: Users }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Combine date and time for backend
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      if (endDateTime <= startDateTime) {
        toast.error('End time must be after start time');
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        targetStudentIds: selectedStudents
      };

      const res = await api.createMockInterviewDrive(payload);
      toast.success(`Successfully created ${res.slotsGenerated} slots and assigned ${res.studentsAssigned} students!`);
      navigate('/admin?tab=mockInterviews');
    } catch (err) {
      toast.error(err.message || 'Failed to create mock interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/admin?tab=mockInterviews')}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-500 border border-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Campaign</h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Configure Interview Sessions</p>
          </div>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
        >
          {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Publish Sessions
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Config */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Details */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Basic Details</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Interview Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Q2 Mock Technical Round - Frontend Developers"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Category</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({...formData, category: cat.id})}
                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                          formData.category === cat.id 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-600' 
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Description & Objectives</label>
                <textarea 
                  rows={4}
                  placeholder="What is this mock interview for? Who should attend?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Instructions for Students</label>
                <textarea 
                  rows={3}
                  placeholder="Preparation tips, pre-requisites..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                  value={formData.instructions}
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* Timing Configuration */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Timing Configuration</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Interview Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Start Time</label>
                  <input 
                    type="time"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">End Time</label>
                  <input 
                    type="time"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-3 gap-6 pt-4 border-t border-slate-100 mt-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Slot Duration</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none border-indigo-100"
                      value={formData.slotDuration}
                      onChange={(e) => setFormData({...formData, slotDuration: e.target.value})}
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Mins</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Break Time</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none border-indigo-100"
                      value={formData.breakDuration}
                      onChange={(e) => setFormData({...formData, breakDuration: e.target.value})}
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Mins</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Buffer Time</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none border-indigo-100"
                      value={formData.bufferTime}
                      onChange={(e) => setFormData({...formData, bufferTime: e.target.value})}
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Mins</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Student Selection */}
        <div className="lg:col-span-3">
          <section className="bg-white rounded-[40px] p-10 border border-slate-200 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
              <Users className="w-64 h-64" />
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-500/20">
                  <UserPlus className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select Students</h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Cherry-pick candidates for auto-assignment</p>
                </div>
              </div>
              <div className="flex items-center gap-6 bg-slate-50 px-8 py-5 rounded-3xl border border-slate-100">
                <div className="text-center px-6 border-r border-slate-200">
                  <span className="text-3xl font-black text-indigo-600 block">{selectedStudents.length}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Selected</span>
                </div>
                <div className="text-center px-6">
                  <span className="text-3xl font-black text-slate-900 block">{students.length}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Available</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 relative z-10">
              <div className="lg:col-span-1 space-y-6">
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Search candidates..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
                
                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                  <div className="flex gap-3 text-amber-800">
                    <Info className="w-5 h-5 flex-shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">
                      Students selected here will be automatically assigned to the generated time slots in the order they are selected.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-200">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map(student => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => toggleStudent(student.id)}
                        className={`p-6 flex items-center justify-between rounded-[2rem] border-2 transition-all group ${
                          selectedStudents.includes(student.id)
                          ? 'bg-indigo-50 border-indigo-500 shadow-lg shadow-indigo-500/10'
                          : 'bg-white border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all ${
                            selectedStudents.includes(student.id)
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'
                          }`}>
                            {student.fullName[0]}
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{student.fullName}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{student.batch}</div>
                          </div>
                        </div>
                        {selectedStudents.includes(student.id) ? (
                          <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        ) : (
                          <Plus className="w-6 h-6 text-slate-200 group-hover:text-indigo-400 transition-all group-hover:scale-125" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-300">
                        <Users className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No candidates found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Preview / Summary */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-950/20 sticky top-28">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-indigo-400" />
              Slot Generation Summary
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-xs text-slate-400 font-medium">Total Duration</span>
                <span className="text-sm font-bold">
                  {formData.startTime && formData.endTime ? (
                    `${(new Date(`2000-01-01T${formData.endTime}`) - new Date(`2000-01-01T${formData.startTime}`)) / 60000} mins`
                  ) : 'Select times'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-xs text-slate-400 font-medium">Est. Total Slots</span>
                <span className="text-2xl font-black text-indigo-400">
                  {formData.startTime && formData.endTime ? (
                    Math.floor(
                      ((new Date(`2000-01-01T${formData.endTime}`) - new Date(`2000-01-01T${formData.startTime}`)) / 60000) / 
                      (parseInt(formData.slotDuration) + parseInt(formData.breakDuration))
                    )
                  ) : '0'}
                </span>
              </div>

              <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <p className="text-[10px] leading-relaxed text-indigo-200/80 font-medium italic">
                  Slots will be automatically generated upon publishing. Students can be assigned to these slots once published.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
