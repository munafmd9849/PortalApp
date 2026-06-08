import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, UserPlus, Search, 
  CheckCircle2, Video, AlertCircle, X,
  ExternalLink, User, MoreVertical, Filter,
  PlayCircle, PauseCircle, Ban, History, Info,
  ArrowRight, ChevronRight, Edit2, Calendar
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { toDatetimeLocalValue, datetimeLocalToISO } from '../../utils/datetimeLocal';

export default function MockInterviewSlots() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [drive, setDrive] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [editTiming, setEditTiming] = useState({ startTime: '', endTime: '' });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const drives = await api.getMockInterviewDrives();
      const current = drives.find(d => d.id === id);
      setDrive(current);
    } catch (err) {
      toast.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  const loadStudents = useCallback(async () => {
    try {
      const res = await api.getAllStudents();
      setStudents(res.students || []);
    } catch (err) {
      console.error('Failed to load students');
    }
  }, []);

  useEffect(() => {
    loadData();
    loadStudents();
  }, [loadData, loadStudents]);

  const handleAssign = async (studentId) => {
    if (!selectedSlot) return;
    setAssignmentLoading(true);
    try {
      await api.assignStudentToSlot({
        slotId: selectedSlot.id,
        studentId: studentId
      });
      toast.success('Student assigned successfully!');
      setSelectedSlot(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Assignment failed');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const updateStatus = async (slotId, status) => {
    try {
      await api.updateMockSlotStatus({ slotId, status });
      toast.success(`Slot status updated to ${status}`);
      loadData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleUpdateTiming = async () => {
    const startISO = datetimeLocalToISO(editTiming.startTime);
    const endISO = datetimeLocalToISO(editTiming.endTime);
    if (!startISO || !endISO) {
      toast.error('Please set valid start and end times');
      return;
    }
    if (new Date(endISO) <= new Date(startISO)) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      const updated = await api.updateMockInterviewSlot(editingSlot.id, {
        startTime: startISO,
        endTime: endISO,
      });
      toast.success('Interview timing updated successfully');
      setEditingSlot(null);
      setDrive((prev) => {
        if (!prev?.slots) return prev;
        return {
          ...prev,
          slots: prev.slots
            .map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
        };
      });
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update timing');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-slate-50 text-slate-400 border-slate-100';
      case 'SCHEDULED': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'WAITING': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'LIVE': return 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-2 ring-emerald-500/20 animate-pulse';
      case 'COMPLETED': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'MISSED': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'NO_SHOW': return 'bg-slate-900 text-white border-slate-900';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !drive) return (
    <div className="h-96 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400 animate-pulse">Fetching Drive Details...</p>
      </div>
    </div>
  );

  if (!drive) return (
    <div className="h-96 flex flex-col items-center justify-center gap-6 text-center max-w-sm mx-auto">
       <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-slate-200" />
       </div>
       <div>
         <h3 className="text-lg font-bold text-slate-900">Drive not found</h3>
         <p className="text-sm text-slate-500 mt-2 font-medium">The mock interview drive you're looking for doesn't exist or has been removed.</p>
       </div>
       <button 
         onClick={() => navigate('/admin?tab=mockInterviews')}
         className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-xs active:scale-95"
       >
         Back to Drives
       </button>
    </div>
  );

  const slots = drive.slots || [];
  const assignedCount = slots.filter(s => s.status !== 'AVAILABLE').length;

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => navigate('/admin?tab=mockInterviews')}
            className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-500 border border-slate-200 shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{drive.title}</h1>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded uppercase tracking-wider border border-indigo-100">
                {drive.category}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">
                {drive.date ? new Date(drive.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No Date Set'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 border-l border-slate-100 pl-6 h-12">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students Assigned</p>
            <p className="text-lg font-bold text-slate-900 leading-none mt-1 tabular-nums">{assignedCount} / {slots.length}</p>
          </div>
          <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 active:scale-95">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {slots.map((slot) => {
          const student = slot.student;
          const isAvailable = slot.status === 'AVAILABLE';

          return (
            <div 
              key={slot.id} 
              className={`bg-white rounded-2xl p-6 border transition-all group relative flex flex-col justify-between ${
                slot.status === 'LIVE' ? 'border-emerald-500 shadow-lg shadow-emerald-500/5' : 
                slot.status === 'WAITING' ? 'border-amber-400 shadow-lg shadow-amber-500/5' :
                'border-slate-200 hover:border-indigo-200 hover:shadow-md'
              }`}
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-6">
                 <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-tight rounded-md border flex items-center gap-1.5 shadow-sm ${getStatusStyle(slot.status)}`}>
                    {slot.status === 'LIVE' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />}
                    {slot.status}
                 </span>
                 <button 
                    onClick={() => {
                      setEditingSlot(slot);
                      setEditTiming({
                        startTime: toDatetimeLocalValue(slot.startTime),
                        endTime: toDatetimeLocalValue(slot.endTime),
                      });
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                 >
                    <Edit2 className="w-3.5 h-3.5" />
                 </button>
              </div>

              {/* Slot Content */}
              {!isAvailable ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-inner group-hover:bg-indigo-600 transition-colors">
                      {student?.fullName?.[0]}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{student?.fullName}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate mt-0.5">{student?.batch}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold tabular-nums">
                      {slot.startTime ? new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} - {slot.endTime ? new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {slot.status === 'SCHEDULED' && (
                      <button 
                        onClick={() => updateStatus(slot.id, 'WAITING')}
                        className="flex items-center justify-center gap-2 py-2.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-amber-100 transition-all active:scale-95"
                      >
                        <PauseCircle className="w-3.5 h-3.5" /> Waiting
                      </button>
                    )}
                    {slot.status === 'WAITING' && (
                      <button 
                        onClick={() => updateStatus(slot.id, 'LIVE')}
                        className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-emerald-100 transition-all active:scale-95"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Start
                      </button>
                    )}
                    {(slot.status === 'LIVE' || slot.status === 'SCHEDULED' || slot.status === 'WAITING') && (
                      <button 
                        onClick={() => navigate(`/mock-interview-room/${slot.id}?role=interviewer&studentId=${slot.student?.id}`)}
                        className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Video className="w-3.5 h-3.5" /> Join
                      </button>
                    )}
                    {(slot.status === 'SCHEDULED' || slot.status === 'WAITING') && (
                      <button 
                        onClick={() => updateStatus(slot.id, 'MISSED')}
                        className="flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-rose-100 transition-all active:scale-95"
                      >
                        <Ban className="w-3.5 h-3.5" /> Missed
                      </button>
                    )}
                    {slot.status === 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/mock-interviews/${id}/results?slot=${slot.id}`)}
                        className="col-span-2 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-indigo-100 transition-all active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> View Feedback
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 py-10 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 group-hover:bg-indigo-50/20 group-hover:border-indigo-100 transition-all">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                    <UserPlus className="w-5 h-5 text-slate-300" />
                  </div>
                  <button 
                    onClick={() => setSelectedSlot(slot)}
                    className="px-5 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm active:scale-95"
                  >
                    Assign Candidate
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Assignment Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-300 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 relative my-auto">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Assign Candidate</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Slot: {selectedSlot?.startTime ? new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSlot(null)}
                className="p-2.5 hover:bg-slate-100 rounded-full transition-all active:scale-95"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <div className="relative mb-6 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search students by name, email, or batch..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-inner"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {filteredStudents.length === 0 ? (
                  <div className="col-span-full py-10 text-center text-slate-400">
                    <p className="text-sm font-bold">No students found matching your search</p>
                  </div>
                ) : (
                  filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => handleAssign(student.id)}
                      disabled={assignmentLoading}
                      className="w-full p-4 flex items-center justify-between bg-white border border-slate-100 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all group disabled:opacity-50 text-left active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          {student.fullName[0]}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-sm font-bold text-slate-900 truncate">{student.fullName}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{student.batch}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Timing Modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-300 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 relative my-auto">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/10">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Edit Timing</h3>
              </div>
              <button onClick={() => setEditingSlot(null)} className="p-2.5 hover:bg-slate-100 rounded-full transition-all active:scale-95">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 space-y-5">
               <div className="space-y-2 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                    value={editTiming.startTime}
                    onChange={(e) => setEditTiming({...editTiming, startTime: e.target.value})}
                  />
               </div>
               <div className="space-y-2 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End Date & Time</label>
                  <input 
                    type="datetime-local" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                    value={editTiming.endTime}
                    onChange={(e) => setEditTiming({...editTiming, endTime: e.target.value})}
                  />
               </div>
               
               <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setEditingSlot(null)}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUpdateTiming}
                    className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/10 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    Save Changes
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
