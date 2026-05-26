import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Search, Filter, Check, GraduationCap, Users, MapPin, 
  ChevronRight, Loader2, UserCheck, SearchX, MousePointer2, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';

const CustomDropdown = ({ label, value, options, onChange, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all ${
          isOpen ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/5' : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        {Icon && <Icon className={`w-4 h-4 ${isOpen ? 'text-indigo-600' : 'text-slate-400'}`} />}
        <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
          {selectedOption?.label || label}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-[110] py-2 overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-xs font-semibold transition-colors flex items-center justify-between ${
                  value === opt.value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
                {value === opt.value && <Check className="w-3 h-3 text-indigo-600" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StudentSelectorModal = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  initialSelected = [], 
  jobTitle = '',
  isReadOnly = false
}) => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set(initialSelected));
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    school: 'ALL',
    batch: 'ALL',
    center: 'ALL'
  });

  const schoolOptions = [
    { label: 'All Schools', value: 'ALL' },
    { label: 'SOT', value: 'SOT' },
    { label: 'SOM', value: 'SOM' },
    { label: 'SOH', value: 'SOH' },
  ];

  const batchOptions = [
    { label: 'All Batches', value: 'ALL' },
    { label: '23-27', value: '23-27' },
    { label: '24-28', value: '24-28' },
    { label: '25-29', value: '25-29' },
  ];

  const centerOptions = [
    { label: 'All Centers', value: 'ALL' },
    { label: 'BANGALORE', value: 'BANGALORE' },
    { label: 'NOIDA', value: 'NOIDA' },
    { label: 'PUNE', value: 'PUNE' },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
      // Extract IDs if objects are passed, otherwise use directly
      const ids = initialSelected.map(item => typeof item === 'object' ? (item.studentId || item.id) : item);
      setSelectedIds(new Set(ids.filter(id => !!id)));
      // Disable body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/students?limit=1000');
      const studentData = response.data?.students || response.data || [];
      setStudents(studentData);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const name = student.fullName || student.name || '';
      const roll = student.enrollmentId || student.rollNumber || student.studentId || '';
      
      const matchesSearch = 
        name.toLowerCase().includes(search.toLowerCase()) ||
        roll.toLowerCase().includes(search.toLowerCase());
      
      const matchesSchool = filters.school === 'ALL' || student.school === filters.school;
      const matchesBatch = filters.batch === 'ALL' || student.batch === filters.batch;
      const matchesCenter = filters.center === 'ALL' || student.center === filters.center;

      const isSelected = selectedIds.has(student.id);
      if (isReadOnly && !isSelected) return false;

      return matchesSearch && matchesSchool && matchesBatch && matchesCenter;
    });
  }, [students, search, filters, isReadOnly, selectedIds]);

  const toggleStudent = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAllFiltered = () => {
    const newSelected = new Set(selectedIds);
    filteredStudents.forEach(s => newSelected.add(s.id));
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    onSelect(Array.from(selectedIds));
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/45 backdrop-blur-[2px]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20"
      >
        
        {/* Header - Solid Indigo */}
        <div className="px-8 py-6 bg-indigo-600 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                <MousePointer2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight leading-none">
                  {isReadOnly ? 'Targeted Candidates' : 'Cherry Pick Candidates'}
                </h2>
                <p className="text-indigo-100 text-xs font-medium opacity-80 mt-1">
                  Targeting for <span className="text-white font-semibold">{jobTitle}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-3">
                <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="text-[9px] font-bold uppercase tracking-wider">{students.length} Available</span>
                </div>
                <div className="px-3 py-1.5 bg-white/20 rounded-xl border border-white/20 flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider">{selectedIds.size} Picked</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors group"
              >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Search and Custom Dropdowns */}
        <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search Name, Email or ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center flex-wrap gap-2">
            <CustomDropdown 
              label="School" 
              value={filters.school} 
              options={schoolOptions} 
              onChange={(val) => setFilters(f => ({ ...f, school: val }))} 
              icon={GraduationCap}
            />
            <CustomDropdown 
              label="Batch" 
              value={filters.batch} 
              options={batchOptions} 
              onChange={(val) => setFilters(f => ({ ...f, batch: val }))} 
              icon={Users}
            />
            <CustomDropdown 
              label="Center" 
              value={filters.center} 
              options={centerOptions} 
              onChange={(val) => setFilters(f => ({ ...val, center: val }))} 
              icon={MapPin}
            />
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2 ml-auto">
              <button 
                onClick={selectAllFiltered}
                className="px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors uppercase tracking-widest"
              >
                Select All
              </button>
              <button 
                onClick={clearSelection}
                className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors uppercase tracking-widest"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Student Grid */}
        <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              <p className="text-slate-500 font-semibold">Loading Directory...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 text-center">
              <SearchX className="w-12 h-12 text-slate-300" />
              <div>
                <p className="text-lg font-semibold text-slate-600">No students found</p>
                <p className="text-sm">Try different filters or search terms.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredStudents.map((student) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={student.id}
                    onClick={isReadOnly ? undefined : () => toggleStudent(student.id)}
                    className={`group relative p-4 rounded-3xl border-2 transition-all ${isReadOnly ? 'cursor-default' : 'cursor-pointer active:scale-95 hover:shadow-xl'} ${
                      selectedIds.has(student.id) 
                        ? 'border-indigo-500 bg-indigo-50/30' 
                        : 'border-slate-100 bg-white hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all ${
                        selectedIds.has(student.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {(student.fullName || student.name || '?').charAt(0)}
                      </div>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        selectedIds.has(student.id) 
                          ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-lg shadow-emerald-100' 
                          : 'border-slate-200 group-hover:border-indigo-300'
                      }`}>
                        {selectedIds.has(student.id) && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-800 leading-tight truncate">
                        {student.fullName || student.name}
                      </h3>
                      <p className="text-[10px] font-semibold text-slate-400 tracking-wider">
                        ID: {student.enrollmentId || student.rollNumber || 'N/A'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100/50 flex flex-wrap gap-1.5">
                      <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold uppercase tracking-tighter">{student.school}</span>
                      <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold uppercase tracking-tighter">{student.batch}</span>
                      <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold uppercase tracking-tighter">{student.center}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-indigo-600 leading-none">{selectedIds.size}</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Students Selected</span>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
          </div>

          <div className="flex items-center gap-4">
            {isReadOnly ? (
              <button 
                onClick={onClose}
                className="px-10 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all uppercase tracking-widest"
              >
                Close View
              </button>
            ) : (
              <>
                <button 
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={selectedIds.size === 0}
                  className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-3 uppercase tracking-widest"
                >
                  Confirm Selection
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default StudentSelectorModal;
