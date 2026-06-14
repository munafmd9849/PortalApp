import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, Check, GraduationCap, Users, MapPin,
  Loader2, ChevronDown,
} from 'lucide-react';
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

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
          isOpen ? 'border-blue-800 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        {Icon && <Icon className={`w-3.5 h-3.5 ${isOpen ? 'text-blue-800' : 'text-gray-400'}`} />}
        <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
          {selectedOption?.label || label}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180 text-blue-800' : 'text-gray-400'}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-[110] py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors flex items-center justify-between ${
                value === opt.value ? 'bg-blue-50 text-blue-800' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
              {value === opt.value && <Check className="w-3 h-3 text-blue-800" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const StudentSelectorModal = ({
  isOpen,
  onClose,
  onSelect,
  initialSelected = [],
  jobTitle = '',
  isReadOnly = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set(initialSelected));
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    school: 'ALL',
    batch: 'ALL',
    center: 'ALL',
  });

  const [schoolOptions, setSchoolOptions] = useState([{ label: 'All schools', value: 'ALL' }]);
  const [batchOptions, setBatchOptions] = useState([{ label: 'All batches', value: 'ALL' }]);
  const [centerOptions, setCenterOptions] = useState([{ label: 'All centres', value: 'ALL' }]);

  useEffect(() => {
    const loadAcademicFilters = async () => {
      try {
        const { fetchAcademicOptions, buildStandardFilterOptions } = await import(
          '../../../utils/academicOptions'
        );
        const raw = await fetchAcademicOptions();
        const academic = buildStandardFilterOptions(raw);
        setSchoolOptions([
          { label: 'All schools', value: 'ALL' },
          ...academic.schools.map((s) => ({ label: s.code || s.name, value: s.id })),
        ]);
        setBatchOptions([
          { label: 'All batches', value: 'ALL' },
          ...academic.batches.map((b) => ({ label: b.label || b.id, value: b.id })),
        ]);
        setCenterOptions([
          { label: 'All centres', value: 'ALL' },
          ...academic.centers.map((c) => ({ label: c.name, value: c.id })),
        ]);
      } catch (err) {
        console.error('StudentSelectorModal: failed to load academic filters', err);
      }
    };
    loadAcademicFilters();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
      const ids = initialSelected.map((item) => (typeof item === 'object' ? (item.studentId || item.id) : item));
      setSelectedIds(new Set(ids.filter((id) => !!id)));
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
    return students.filter((student) => {
      const name = student.fullName || student.name || '';
      const roll = student.enrollmentId || student.rollNumber || student.studentId || '';

      const matchesSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        roll.toLowerCase().includes(search.toLowerCase());

      const norm = (v) => (v || '').toString().trim().toLowerCase();
      const matchesSchool = filters.school === 'ALL' || norm(student.school) === norm(filters.school);
      const matchesBatch = filters.batch === 'ALL' || norm(student.batch) === norm(filters.batch);
      const matchesCenter = filters.center === 'ALL' || norm(student.center) === norm(filters.center);

      const isSelected = selectedIds.has(student.id);
      if (isReadOnly && !isSelected) return false;

      return matchesSearch && matchesSchool && matchesBatch && matchesCenter;
    });
  }, [students, search, filters, isReadOnly, selectedIds]);

  const toggleStudent = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const selectAllFiltered = () => {
    const newSelected = new Set(selectedIds);
    filteredStudents.forEach((s) => newSelected.add(s.id));
    setSelectedIds(newSelected);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleConfirm = () => {
    onSelect(Array.from(selectedIds));
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-lg shadow-xl flex flex-col overflow-hidden border border-gray-200">

        <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold">
              {isReadOnly ? 'Invited candidates' : 'Select candidates'}
            </h2>
            <p className="text-slate-300 text-sm mt-0.5">
              {jobTitle ? `Role: ${jobTitle}` : 'Choose students to invite to this drive'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-300 hidden sm:inline">
              {selectedIds.size} of {students.length} selected
            </span>
            <button type="button" onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-md transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or enrollment ID"
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-800 focus:border-blue-800 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <CustomDropdown
            label="School"
            value={filters.school}
            options={schoolOptions}
            onChange={(val) => setFilters((f) => ({ ...f, school: val }))}
            icon={GraduationCap}
          />
          <CustomDropdown
            label="Batch"
            value={filters.batch}
            options={batchOptions}
            onChange={(val) => setFilters((f) => ({ ...f, batch: val }))}
            icon={Users}
          />
          <CustomDropdown
            label="Centre"
            value={filters.center}
            options={centerOptions}
            onChange={(val) => setFilters((f) => ({ ...f, center: val }))}
            icon={MapPin}
          />

          {!isReadOnly && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="px-3 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-800" />
              <p className="text-gray-500 text-sm">Loading student directory…</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2 text-center">
              <p className="text-base font-medium text-gray-700">No students found</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredStudents.map((student) => {
                const selected = selectedIds.has(student.id);
                return (
                  <div
                    key={student.id}
                    onClick={isReadOnly ? undefined : () => toggleStudent(student.id)}
                    className={`p-3 rounded-md border transition-colors ${
                      isReadOnly ? 'cursor-default' : 'cursor-pointer hover:border-blue-300'
                    } ${
                      selected
                        ? 'border-blue-800 bg-blue-50/50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-semibold ${
                        selected ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {(student.fullName || student.name || '?').charAt(0)}
                      </div>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selected ? 'bg-blue-800 border-blue-800' : 'border-gray-300'
                      }`}>
                        {selected && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                      </div>
                    </div>

                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {student.fullName || student.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {student.enrollmentId || student.rollNumber || '—'}
                    </p>

                    <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                      {student.school && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">{student.school}</span>
                      )}
                      {student.batch && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">{student.batch}</span>
                      )}
                      {student.center && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">{student.center}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{selectedIds.size}</span> selected
          </p>
          <div className="flex items-center gap-3">
            {isReadOnly ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-blue-800 text-white rounded-md text-sm font-medium hover:bg-blue-900 transition-colors"
              >
                Close
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={selectedIds.size === 0}
                  className="px-5 py-2 bg-blue-800 text-white rounded-md text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-50"
                >
                  Confirm selection
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default StudentSelectorModal;
