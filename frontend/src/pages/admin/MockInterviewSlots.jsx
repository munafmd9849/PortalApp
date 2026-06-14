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
         className="px-4 py-2 bg-blue-800 text-white rounded-md text-sm font-medium hover:bg-blue-900"
       >
         Back to drives
       </button>
    </div>
  );

  const slots = drive.slots || [];
  const assignedCount = slots.filter(s => s.status !== 'AVAILABLE').length;

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => navigate('/admin?tab=mockInterviews')}
            className="p-2 hover:bg-gray-50 rounded-md transition-colors text-gray-500 border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-gray-900">{drive.title}</h1>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded border border-gray-200">
                {drive.category}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {drive.date ? new Date(drive.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No date set'}
            </p>
          </div>
        </div>
        <div className="text-right border-l border-gray-100 pl-4">
          <p className="text-xs text-gray-500">Assigned</p>
          <p className="text-base font-semibold text-gray-900 tabular-nums">{assignedCount} / {slots.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {slots.map((slot) => {
          const student = slot.student;
          const isAvailable = slot.status === 'AVAILABLE';

          return (
            <div 
              key={slot.id} 
              className={`bg-white rounded-lg p-4 border transition-colors group relative flex flex-col justify-between ${
                slot.status === 'LIVE' ? 'border-blue-300' : 
                slot.status === 'WAITING' ? 'border-gray-300' :
                'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                 <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${getStatusStyle(slot.status)}`}>
                    {slot.status}
                 </span>
                 <button 
                    type="button"
                    onClick={() => {
                      setEditingSlot(slot);
                      setEditTiming({
                        startTime: toDatetimeLocalValue(slot.startTime),
                        endTime: toDatetimeLocalValue(slot.endTime),
                      });
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                 >
                    <Edit2 className="w-3.5 h-3.5" />
                 </button>
              </div>

              {!isAvailable ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-700 font-semibold text-sm border border-gray-200">
                      {student?.fullName?.[0]}
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{student?.fullName}</h4>
                      <p className="text-xs text-gray-500 truncate">{student?.batch}</p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-md border border-gray-100 tabular-nums">
                    {slot.startTime ? new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    {' – '}
                    {slot.endTime ? new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {slot.status === 'SCHEDULED' && (
                      <button 
                        type="button"
                        onClick={() => updateStatus(slot.id, 'WAITING')}
                        className="py-2 border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50"
                      >
                        Waiting
                      </button>
                    )}
                    {slot.status === 'WAITING' && (
                      <button 
                        type="button"
                        onClick={() => updateStatus(slot.id, 'LIVE')}
                        className="py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-md text-xs font-medium"
                      >
                        Start
                      </button>
                    )}
                    {(slot.status === 'LIVE' || slot.status === 'SCHEDULED' || slot.status === 'WAITING') && (
                      <button 
                        type="button"
                        onClick={() => navigate(`/mock-interview-room/${slot.id}?role=interviewer&studentId=${slot.student?.id}`)}
                        className="py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" /> Join
                      </button>
                    )}
                    {(slot.status === 'SCHEDULED' || slot.status === 'WAITING') && (
                      <button 
                        type="button"
                        onClick={() => updateStatus(slot.id, 'MISSED')}
                        className="py-2 border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50"
                      >
                        Missed
                      </button>
                    )}
                    {slot.status === 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/mock-interviews/${id}/results?slot=${slot.id}`)}
                        className="col-span-2 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-md text-xs font-medium"
                      >
                        View feedback
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 py-8 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-md bg-gray-50">
                  <UserPlus className="w-5 h-5 text-gray-300 mb-3" />
                  <button 
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className="px-4 py-2 bg-blue-800 text-white rounded-md text-xs font-medium hover:bg-blue-900"
                  >
                    Assign candidate
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Assignment Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200 relative my-auto">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-800 text-white">
              <div>
                <h3 className="text-base font-semibold">Assign candidate</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Slot: {selectedSlot?.startTime ? new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="p-1.5 hover:bg-slate-700 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search by name, email, or batch"
                  className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-gray-400 text-sm">
                    No students match your search
                  </div>
                ) : (
                  filteredStudents.map(student => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleAssign(student.id)}
                      disabled={assignmentLoading}
                      className="w-full p-3 flex items-center justify-between bg-white border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50/30 transition-colors group disabled:opacity-50 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-gray-100 text-gray-600 rounded-md flex items-center justify-center font-medium text-sm">
                          {student.fullName[0]}
                        </div>
                        <div className="overflow-hidden min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{student.fullName}</div>
                          <div className="text-xs text-gray-500 truncate">{student.batch}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-800 shrink-0" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200 relative my-auto">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-800 text-white">
              <h3 className="text-base font-semibold">Edit timing</h3>
              <button type="button" onClick={() => setEditingSlot(null)} className="p-1.5 hover:bg-slate-700 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
               <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Start</label>
                  <input 
                    type="datetime-local" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800"
                    value={editTiming.startTime}
                    onChange={(e) => setEditTiming({...editTiming, startTime: e.target.value})}
                  />
               </div>
               <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">End</label>
                  <input 
                    type="datetime-local" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800"
                    value={editTiming.endTime}
                    onChange={(e) => setEditTiming({...editTiming, endTime: e.target.value})}
                  />
               </div>
               
               <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleUpdateTiming}
                    className="flex-1 py-2 bg-blue-800 text-white rounded-md text-sm font-medium hover:bg-blue-900"
                  >
                    Save
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
