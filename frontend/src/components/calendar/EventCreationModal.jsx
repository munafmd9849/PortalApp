/**
 * Event Creation Modal
 * Role-based event creation form
 * 
 * Permissions:
 * - STUDENT: Cannot create (should not be shown)
 * - RECRUITER: Can create events, can invite students
 * - ADMIN: Can create events, can invite anyone
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, FileText, Search, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { FaGraduationCap, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';
import api from '../../services/api';
import { getAllStudents } from '../../services/students';
import { CENTER_OPTIONS, SCHOOL_OPTIONS, BATCH_OPTIONS } from '../../constants/academics';
import CustomDropdown from '../common/CustomDropdown';

const LOCATION_OPTIONS = [
  { value: '', label: 'Select or type below' },
  { value: 'Google Meet', label: 'Google Meet' },
  { value: 'PW IOI Campus, Bangalore', label: 'PW IOI Campus, Bangalore' },
  { value: 'PW IOI Campus, Noida', label: 'PW IOI Campus, Noida' },
  { value: 'PW IOI Campus, Lucknow', label: 'PW IOI Campus, Lucknow' },
  { value: 'PW IOI Campus, Pune', label: 'PW IOI Campus, Pune' },
  { value: 'Company Premises', label: 'Company Premises' },
];

const EventCreationModal = ({ isOpen, onClose, onSuccess, userRole, selectedDate = null, onReconnectRequest }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    location: '',
    attendeesEmails: [],
    meetLink: true, // Default on – most events are online
  });
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Student selector state (for ADMIN only)
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [studentFilters, setStudentFilters] = useState({ school: '', center: '', batch: '' });

  // Set default dates when modal opens or selectedDate changes
  useEffect(() => {
    if (isOpen) {
      const defaultDate = selectedDate || new Date();
      const startDate = new Date(defaultDate);
      startDate.setHours(9, 0, 0, 0); // 9 AM
      const endDate = new Date(startDate);
      endDate.setHours(10, 0, 0, 0); // 10 AM

      setFormData(prev => ({
        ...prev,
        start: startDate.toISOString().slice(0, 16), // Format for datetime-local input
        end: endDate.toISOString().slice(0, 16),
      }));
    }
  }, [isOpen, selectedDate]);

  // Fetch students when selector is opened (lazy) or filters change
  useEffect(() => {
    if (showStudentSelector && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) {
      fetchStudents();
    }
  }, [showStudentSelector, userRole, studentFilters.school, studentFilters.center, studentFilters.batch]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        description: '',
        start: '',
        end: '',
        location: '',
        attendeesEmails: [],
        meetLink: true,
      });
      setAttendeeEmail('');
      setError('');
      setSelectedStudents([]);
      setStudentSearch('');
      setShowStudentSelector(false);
      setStudentFilters({ school: '', center: '', batch: '' });
    }
  }, [isOpen]);

  // Fetch students list with optional School/Center/Batch filters (server-side)
  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const filters = { limit: 500 };
      if (studentFilters.school) filters.school = studentFilters.school;
      if (studentFilters.center) filters.center = studentFilters.center;
      if (studentFilters.batch) filters.batch = studentFilters.batch;
      const studentsData = await getAllStudents(filters, { retries: 1 });
      const list = Array.isArray(studentsData) ? studentsData : (studentsData?.students || studentsData?.data || []);
      setStudents(list);
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Filter students based on search
  const filteredStudents = students.filter(student => {
    if (!studentSearch.trim()) return true;
    const searchLower = studentSearch.toLowerCase();
    const fullName = (student.fullName || '').toLowerCase();
    const email = (student.email || '').toLowerCase();
    const enrollmentId = (student.enrollmentId || '').toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower) || enrollmentId.includes(searchLower);
  });

  // Handle student selection
  // Select all currently filtered students
  const handleSelectAllFiltered = () => {
    const toAdd = filteredStudents.filter(s => s.email && !formData.attendeesEmails.includes(s.email));
    if (toAdd.length === 0) return;
    setSelectedStudents(prev => {
      const byEmail = new Map(prev.map(s => [s.email, s]));
      toAdd.forEach(s => byEmail.set(s.email, s));
      return [...byEmail.values()];
    });
    setFormData(prev => ({
      ...prev,
      attendeesEmails: [...prev.attendeesEmails, ...toAdd.map(s => s.email)],
    }));
  };

  // Deselect all students selected from the portal (keeps manually added emails)
  const handleDeselectAll = () => {
    const studentEmails = new Set(selectedStudents.map(s => s.email));
    setSelectedStudents([]);
    setFormData(prev => ({
      ...prev,
      attendeesEmails: prev.attendeesEmails.filter(e => !studentEmails.has(e)),
    }));
  };

  // Clear all attendees (portal + manual)
  const handleClearAllAttendees = () => {
    setSelectedStudents([]);
    setFormData(prev => ({ ...prev, attendeesEmails: [] }));
  };

  const handleSelectStudent = (student) => {
    const studentEmail = student.email;
    if (!studentEmail) return;

    // Check if already selected
    if (selectedStudents.find(s => s.email === studentEmail)) {
      // Deselect
      const updated = selectedStudents.filter(s => s.email !== studentEmail);
      setSelectedStudents(updated);
      // Remove from attendees
      setFormData(prev => ({
        ...prev,
        attendeesEmails: prev.attendeesEmails.filter(e => e !== studentEmail),
      }));
    } else {
      // Select
      const updated = [...selectedStudents, student];
      setSelectedStudents(updated);
      // Add to attendees if not already there
      if (!formData.attendeesEmails.includes(studentEmail)) {
        setFormData(prev => ({
          ...prev,
          attendeesEmails: [...prev.attendeesEmails, studentEmail],
        }));
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Duration presets – set end time from start
  const applyDurationPreset = (minutes) => {
    if (!formData.start) return;
    const start = new Date(formData.start);
    const end = new Date(start.getTime() + minutes * 60 * 1000);
    setFormData(prev => ({
      ...prev,
      end: end.toISOString().slice(0, 16),
    }));
  };

  const handleAddAttendee = () => {
    if (attendeeEmail.trim() && !formData.attendeesEmails.includes(attendeeEmail.trim())) {
      setFormData(prev => ({
        ...prev,
        attendeesEmails: [...prev.attendeesEmails, attendeeEmail.trim()],
      }));
      setAttendeeEmail('');
    }
  };

  const handleRemoveAttendee = (email) => {
    setFormData(prev => ({
      ...prev,
      attendeesEmails: prev.attendeesEmails.filter(e => e !== email),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Convert datetime-local format to ISO string
      const startISO = new Date(formData.start).toISOString();
      const endISO = new Date(formData.end).toISOString();

      // Validate dates
      if (new Date(endISO) <= new Date(startISO)) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }

      const response = await api.post('/calendar/events', {
        title: formData.title,
        description: formData.description,
        start: startISO,
        end: endISO,
        location: formData.location,
        attendeesEmails: formData.attendeesEmails,
        meetLink: formData.meetLink,
      });

      if (onSuccess) {
        onSuccess(response.data.event);
      }
      onClose();
    } catch (err) {
      console.error('Error creating event:', err);
      console.error('Error response:', err.response);
      console.error('Error status:', err.status);
      
      // Handle insufficient scopes error (check multiple possible error formats)
      const errorData = err.response?.data || err.response || {};
      const errorMessage = errorData.message || errorData.error || err.message || 'Failed to create event';
      const status = err.status || err.response?.status;
      
      // Check for scope/permission errors
      const isScopeError = status === 403 || 
                          errorData.requiresReconnect ||
                          errorMessage.toLowerCase().includes('insufficient') || 
                          errorMessage.toLowerCase().includes('read-only') ||
                          errorMessage.toLowerCase().includes('permission');
      
      if (isScopeError) {
        const fullMessage = 'Your calendar connection has read-only permissions. Please disconnect and reconnect your Google Calendar to grant full access for creating events.';
        setError(fullMessage);
        
        // Show immediate action button (already in error display)
        // Auto-prompt after a delay
        if (onReconnectRequest) {
          setTimeout(() => {
            if (window.confirm('⚠️ Calendar Permission Issue\n\nYour calendar has read-only permissions and cannot create events.\n\nWould you like to disconnect and reconnect your calendar now to get full access?')) {
              onReconnectRequest();
              onClose();
            }
          }, 2000);
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden scrollbar-hide overscroll-contain">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className={`p-4 border rounded-lg ${
              error.includes('read-only') || error.includes('Insufficient') 
                ? 'bg-yellow-50 border-yellow-300' 
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm font-medium ${
                error.includes('read-only') || error.includes('Insufficient')
                  ? 'text-yellow-900'
                  : 'text-red-800'
              }`}>
                {error}
              </p>
              {(error.includes('read-only') || error.includes('Insufficient')) && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onReconnectRequest) {
                        onReconnectRequest();
                        onClose();
                      }
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                  >
                    Disconnect & Reconnect Now
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Interview with John Doe"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Event description..."
            />
          </div>

          {/* Date and Time */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="start"
                  value={formData.start}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  End Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="end"
                  value={formData.end}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs font-medium text-gray-500 self-center">Quick duration:</span>
              {[30, 60, 120].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => applyDurationPreset(m)}
                  className="px-4 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  {m === 30 ? '30 min' : m === 60 ? '1 hr' : '2 hr'}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <CustomDropdown
              label="Location"
              icon={MapPin}
              iconColor="text-indigo-600"
              options={LOCATION_OPTIONS}
              value={LOCATION_OPTIONS.some(o => o.value && o.value === formData.location) ? formData.location : ''}
              onChange={(val) => setFormData(prev => ({ ...prev, location: val || '' }))}
              placeholder="Select or type below"
            />
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="mt-2 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Or type custom location..."
            />
          </div>

          {/* Attendees */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <label className="text-sm font-semibold text-gray-800">Attendees</label>
            </div>

            {/* Student Selector (Admin only) */}
            {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowStudentSelector(!showStudentSelector)}
                  className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-100/80 transition-colors text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600">
                      <Users className="h-4 w-4" />
                    </span>
                    <div>
                      <span className="font-medium text-gray-900">Select Students from Portal</span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {showStudentSelector
                          ? 'Filter by school, center, batch and search'
                          : selectedStudents.length > 0
                            ? `${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''} selected`
                            : 'Browse and add students to invite'}
                      </span>
                    </div>
                    {selectedStudents.length > 0 && !showStudentSelector && (
                      <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium">
                        {selectedStudents.length}
                      </span>
                    )}
                  </span>
                  <span className="text-gray-400 flex-shrink-0">
                    {showStudentSelector ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </span>
                </button>

                {showStudentSelector && (
                  <div className="border-t border-gray-200 bg-white max-h-80 overflow-hidden flex flex-col">
                    {/* School / Center / Batch filters - CustomDropdowns */}
                    <div className="p-3 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <CustomDropdown
                        label="School"
                        options={[
                          { value: '', label: 'All Schools' },
                          ...SCHOOL_OPTIONS.map(o => ({ value: o.id, label: o.name })),
                        ]}
                        value={studentFilters.school}
                        onChange={(val) => setStudentFilters(f => ({ ...f, school: val || '' }))}
                        placeholder="All Schools"
                        icon={FaGraduationCap}
                        iconColor="text-blue-600"
                      />
                      <CustomDropdown
                        label="Center"
                        options={[
                          { value: '', label: 'All Centers' },
                          ...CENTER_OPTIONS.map(o => ({ value: o.id, label: o.name })),
                        ]}
                        value={studentFilters.center}
                        onChange={(val) => setStudentFilters(f => ({ ...f, center: val || '' }))}
                        placeholder="All Centers"
                        icon={FaMapMarkerAlt}
                        iconColor="text-indigo-600"
                      />
                      <CustomDropdown
                        label="Batch"
                        options={[
                          { value: '', label: 'All Batches' },
                          ...BATCH_OPTIONS.map(o => ({ value: o.id, label: o.name })),
                        ]}
                        value={studentFilters.batch}
                        onChange={(val) => setStudentFilters(f => ({ ...f, batch: val || '' }))}
                        placeholder="All Batches"
                        icon={FaUsers}
                        iconColor="text-purple-600"
                      />
                    </div>
                    {/* Search + Select all / Deselect all */}
                    <div className="p-3 border-b border-gray-200 flex flex-wrap gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="Search by name, email, or enrollment ID..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-2">
                        {filteredStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={handleSelectAllFiltered}
                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                          >
                            Select all ({filteredStudents.length})
                          </button>
                        )}
                        {selectedStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={handleDeselectAll}
                            className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 whitespace-nowrap"
                          >
                            Deselect all ({selectedStudents.length})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Students List */}
                    <div className="overflow-y-auto flex-1 scrollbar-hide overscroll-contain">
                      {loadingStudents ? (
                        <div className="p-4 text-center text-gray-500">Loading students...</div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          {studentSearch ? 'No students found' : 'No students available'}
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {filteredStudents.map((student) => {
                            const isSelected = selectedStudents.find(s => s.email === student.email);
                            return (
                              <button
                                key={student.id}
                                type="button"
                                onClick={() => handleSelectStudent(student)}
                                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
                                  isSelected ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 truncate">
                                    {student.fullName || 'Unknown'}
                                  </div>
                                  <div className="text-sm text-gray-600 truncate">
                                    {student.email}
                                  </div>
                                  {student.enrollmentId && (
                                    <div className="text-xs text-gray-500">
                                      ID: {student.enrollmentId}
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="h-5 w-5 text-blue-600 flex-shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Email Input */}
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Or add email addresses manually
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAttendee();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="name@example.com"
                />
                <button
                  type="button"
                  onClick={handleAddAttendee}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Selected Attendees - compact scrollable list (scales to 1000+ selections) */}
            {formData.attendeesEmails.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {formData.attendeesEmails.length} attendee{formData.attendeesEmails.length !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllAttendees}
                    className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Clear all
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto scrollbar-hide overscroll-contain">
                  {formData.attendeesEmails.map((email) => {
                    const student = selectedStudents.find(s => s.email === email);
                    const displayName = student ? student.fullName : email;
                    return (
                      <div
                        key={email}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <span className="text-sm text-gray-900 truncate flex-1 min-w-0">{displayName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            handleRemoveAttendee(email);
                            if (student) {
                              setSelectedStudents(prev => prev.filter(s => s.email !== email));
                            }
                          }}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 rounded"
                          aria-label={`Remove ${displayName}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500">
              {userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
                ? 'Select students from the portal or add email addresses to invite'
                : userRole === 'RECRUITER'
                ? 'Add student email addresses to invite them to the event'
                : 'Add email addresses to invite attendees'}
            </p>
          </div>

          {/* Google Meet Link */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="meetLink"
              id="meetLink"
              checked={formData.meetLink}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="meetLink" className="ml-2 text-sm text-gray-700">
              Create Google Meet link for this event
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 mt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventCreationModal;
