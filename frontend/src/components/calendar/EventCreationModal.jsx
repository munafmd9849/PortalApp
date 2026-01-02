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
import { X, Calendar, Clock, MapPin, Users, FileText, Search, Check } from 'lucide-react';
import api from '../../services/api';
import { getAllStudents } from '../../services/students';

const EventCreationModal = ({ isOpen, onClose, onSuccess, userRole, selectedDate = null, onReconnectRequest }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    location: '',
    attendeesEmails: [],
    meetLink: false,
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

  // Fetch students when modal opens (for ADMIN only)
  useEffect(() => {
    if (isOpen && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) {
      fetchStudents();
    }
  }, [isOpen, userRole]);

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
        meetLink: false,
      });
      setAttendeeEmail('');
      setError('');
      setSelectedStudents([]);
      setStudentSearch('');
      setShowStudentSelector(false);
    }
  }, [isOpen]);

  // Fetch students list
  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const studentsData = await getAllStudents({}, { retries: 1 });
      setStudents(studentsData || []);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Conference Room A, Google Meet, etc."
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="inline h-4 w-4 mr-1" />
              Attendees
            </label>

            {/* Student Selector (Admin only) */}
            {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowStudentSelector(!showStudentSelector)}
                  className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Select Students from Portal
                    {selectedStudents.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-200 rounded-full text-xs">
                        {selectedStudents.length} selected
                      </span>
                    )}
                  </span>
                  <span className="text-sm">{showStudentSelector ? '▼' : '▶'}</span>
                </button>

                {showStudentSelector && (
                  <div className="mt-2 border border-gray-200 rounded-lg bg-white max-h-64 overflow-hidden flex flex-col">
                    {/* Search */}
                    <div className="p-3 border-b border-gray-200">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="Search by name, email, or enrollment ID..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Students List */}
                    <div className="overflow-y-auto flex-1">
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Or add email addresses manually:
              </label>
              <div className="flex gap-2 mb-2">
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
                <button
                  type="button"
                  onClick={handleAddAttendee}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Selected Attendees */}
            {formData.attendeesEmails.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {formData.attendeesEmails.map((email) => {
                    const student = selectedStudents.find(s => s.email === email);
                    return (
                      <span
                        key={email}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {student ? student.fullName : email}
                        <button
                          type="button"
                          onClick={() => {
                            handleRemoveAttendee(email);
                            if (student) {
                              setSelectedStudents(prev => prev.filter(s => s.email !== email));
                            }
                          }}
                          className="hover:text-blue-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              {userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
                ? 'Select students from the portal or add email addresses manually'
                : userRole === 'RECRUITER'
                ? 'Add student email addresses to invite them to the event'
                : 'Add email addresses to invite attendees to the event'}
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
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
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
