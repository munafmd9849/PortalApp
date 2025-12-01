import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ImEye } from 'react-icons/im';
import { MdBlock } from 'react-icons/md';
import { FaSearch, FaFilter, FaChevronLeft, FaChevronRight, FaTimes, FaUserEdit, FaUser, FaEnvelope, FaPhone, FaGraduationCap, FaMapMarkerAlt, FaCalendarAlt, FaIdCard } from 'react-icons/fa';
import { Loader, Download, Upload } from 'lucide-react';
import { getAllStudents, updateStudentStatus, updateStudentProfile, getEducationalBackground, getStudentSkills, updateEducationalBackground } from '../../../services/students';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import DashboardHome from '../../../components/dashboard/student/DashboardHome';
import { getStudentApplications } from '../../../services/applications';
import { getTargetedJobsForStudent } from '../../../services/jobs';
import SelectDropdown from '../../common/SelectDropdown';
import { CENTER_OPTIONS, SCHOOL_OPTIONS } from '../../../constants/academics';
// TODO: Replace Firebase operations with API calls

const STATUS_OPTIONS = [
  { id: 'Active', name: 'Active' },
  { id: 'Inactive', name: 'Inactive' },
  { id: 'Blocked', name: 'Blocked' },
];


const StudentDetailsModal = ({ isOpen, onClose, student }) => {
  const [detailedStudent, setDetailedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch detailed student data when modal opens
  useEffect(() => {
    if (isOpen && student?.id) {
      fetchDetailedStudentData();
    }
  }, [isOpen, student?.id]);

  const fetchDetailedStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [educationData, skillsData] = await Promise.all([
        getEducationalBackground(student.id),
        getStudentSkills(student.id)
      ]);

      setDetailedStudent({
        ...student,
        education: educationData.sort((a, b) => new Date(b.endYear || '9999') - new Date(a.endYear || '9999')),
        skills: skillsData.sort((a, b) => (b.rating || 0) - (a.rating || 0))
      });

    } catch (err) {
      console.error('Error fetching detailed student data:', err);
      setError('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !student) return null;

  const studentData = detailedStudent || student;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Student Details</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <span className="text-gray-600">Loading student details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchDetailedStudentData}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FaUser className="mr-2 text-blue-600" />
                Personal Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-800">{studentData.fullName || studentData.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-800 flex items-center">
                    <FaEnvelope className="mr-2 text-gray-400" size={14} />
                    {studentData.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-800 flex items-center">
                    <FaPhone className="mr-2 text-gray-400" size={14} />
                    {studentData.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Enrollment ID</label>
                  <p className="text-gray-800 flex items-center">
                    <FaIdCard className="mr-2 text-gray-400" size={14} />
                    {studentData.enrollmentId || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FaGraduationCap className="mr-2 text-green-600" />
                Academic Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">School</label>
                  <p className="text-gray-800">{studentData.school || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Center</label>
                  <p className="text-gray-800 flex items-center">
                    <FaMapMarkerAlt className="mr-2 text-gray-400" size={14} />
                    {studentData.center || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">CGPA</label>
                  <p className="text-gray-800">{studentData.cgpa || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Batch</label>
                  <p className="text-gray-800 flex items-center">
                    <FaCalendarAlt className="mr-2 text-gray-400" size={14} />
                    {studentData.batch || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-gray-800">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${studentData.status === 'Active' ? 'bg-green-100 text-green-800' :
                        studentData.status === 'Blocked' ? 'bg-red-200 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>
                      {studentData.status || 'Active'}
                    </span>
                  </p>
                  {studentData.blockDetails && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs text-red-600">
                        <strong>Blocked:</strong> {studentData.blockDetails.reason}
                      </p>
                      {studentData.blockDetails.notes && (
                        <p className="text-xs text-red-600 mt-1">{studentData.blockDetails.notes}</p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Bio</label>
                  <p className="text-gray-800">{studentData.bio || 'No bio available'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tagline</label>
                  <p className="text-gray-800">{studentData.tagline || 'No tagline available'}</p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Application Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{student.stats?.applied || 0}</div>
                  <div className="text-sm text-gray-500">Applied</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{student.stats?.shortlisted || 0}</div>
                  <div className="text-sm text-gray-500">Shortlisted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{student.stats?.interviewed || 0}</div>
                  <div className="text-sm text-gray-500">Interviewed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{studentData.stats?.offers || 0}</div>
                  <div className="text-sm text-gray-500">Offers</div>
                </div>
              </div>
            </div>

            {/* Educational Background */}
            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FaGraduationCap className="mr-2 text-purple-600" />
                Educational Background
              </h3>
              {studentData.education && studentData.education.length > 0 ? (
                <div className="space-y-3">
                  {studentData.education.map((edu, index) => (
                    <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">{edu.degree || 'N/A'}</p>
                          <p className="text-gray-600">{edu.institution || 'N/A'}</p>
                          <p className="text-sm text-gray-500">
                            {edu.fieldOfStudy && `${edu.fieldOfStudy} • `}
                            {edu.startYear || 'N/A'} - {edu.endYear || 'Present'}
                          </p>
                        </div>
                        {edu.gpa && (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-700">GPA: {edu.gpa}</p>
                          </div>
                        )}
                      </div>
                      {edu.description && (
                        <p className="text-sm text-gray-600 mt-2">{edu.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No educational background information available</p>
              )}
            </div>

            {/* Skills */}
            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Skills & Expertise</h3>
              {studentData.skills && studentData.skills.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {studentData.skills.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                      <span className="font-medium text-gray-800">{skill.skillName}</span>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">Rating:</span>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-sm ${star <= (skill.rating || 0) ? 'text-yellow-500' : 'text-gray-300'
                                }`}
                            >
                              ★
                            </span>
                          ))}
                          <span className="ml-1 text-xs text-gray-600">({skill.rating || 0}/5)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No skills information available</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Edit Student Modal
const EditStudentModal = ({ isOpen, onClose, student, onSave }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cgpa: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (student && isOpen) {
      setFormData({
        fullName: student.fullName || '',
        email: student.email || '',
        phone: student.phone || '',
        cgpa: student.cgpa || ''
      });
      setErrors({});
    }
  }, [student, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (formData.cgpa.trim()) {
      const cgpaValue = parseFloat(formData.cgpa);
      if (isNaN(cgpaValue) || cgpaValue < 0 || cgpaValue > 10) {
        newErrors.cgpa = 'CGPA must be between 0 and 10';
      }
    } else {
      newErrors.cgpa = 'CGPA is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(student.id, formData);
      onClose();
    } catch (error) {
      console.error('Error updating student:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Edit Student</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.fullName ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="Enter student's full name"
              />
              {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="Enter student email"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="+91 12345 67890"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CGPA *
              </label>
              <input
                type="number"
                name="cgpa"
                value={formData.cgpa}
                onChange={handleChange}
                min="0"
                max="10"
                step="0.01"
                placeholder="Enter CGPA (0-10)"
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.cgpa ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              {errors.cgpa && <p className="text-red-500 text-sm mt-1">{errors.cgpa}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading && <Loader className="h-4 w-4 animate-spin mr-2" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// Student Dashboard Panel Component
const StudentDashboardPanel = ({ isOpen, onClose, student, dashboardData }) => {
  // Prevent body scroll when panel is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  const handleApplyToJob = () => {
    // Admin view - no job application allowed
    console.log('Job application disabled in admin view');
  };

  const hasApplied = () => false;

  return (
    <>
      {/* Backdrop with blur and fade */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-[9998] ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          backdropFilter: isOpen ? 'blur(4px)' : 'none',
          WebkitBackdropFilter: isOpen ? 'blur(4px)' : 'none'
        }}
        onClick={onClose}
      />

      {/* Sliding Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full lg:w-[60%] bg-white shadow-2xl z-[9999] transform transition-transform duration-300 ease-out overflow-hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div className="flex flex-col p-4 lg:p-6 border-b bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 shadow-sm space-y-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg lg:text-2xl font-bold text-gray-800 truncate">
                Student Dashboard
              </h2>
              <p className="text-xs lg:text-sm text-gray-600 mt-1 truncate">
                {student.fullName || student.email} {student.enrollmentId && `- ${student.enrollmentId}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white transition-colors flex-shrink-0"
              aria-label="Close panel"
            >
              <FaTimes size={20} className="lg:w-6 lg:h-6" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 text-xs sm:text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-700">CGPA:</span>
              <span>{student.cgpa || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-700">School:</span>
              <span>{student.school || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-700">Batch:</span>
              <span>{student.batch || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-700">Center:</span>
              <span>{student.center || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Panel Content - Scrollable */}
        <div className="h-[calc(100%-73px)] lg:h-[calc(100%-89px)] overflow-y-auto">
          <div className="p-4 lg:p-6">
            {dashboardData.loading ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center">
                  <Loader className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                  <span className="text-gray-600 text-sm lg:text-base">Loading student dashboard...</span>
                </div>
              </div>
            ) : dashboardData.error ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Dashboard</h3>
                  <p className="text-red-600 mb-4 text-sm">{dashboardData.error}</p>
                  <div className="text-xs text-red-500 space-y-1">
                    <p>• Check if backend server is running on port 3000</p>
                    <p>• Verify you're logged in as admin</p>
                    <p>• Check browser console for more details</p>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            ) : (
            <DashboardHome
                studentData={{
                  ...student,
                  id: student.id
                }}
                jobs={dashboardData.jobs}
                applications={dashboardData.applications}
                skillsEntries={dashboardData.skills}
                loadingJobs={false}
                loadingApplications={false}
                loadingSkills={false}
                handleApplyToJob={handleApplyToJob}
                hasApplied={hasApplied}
                applying={{}}
              hideFooter
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const BlockStudentModal = ({ isOpen, onClose, student, onConfirm }) => {
  const [blockType, setBlockType] = useState('Permanent');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [otherReason, setOtherReason] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setBlockType('Permanent');
      setEndDate('');
      setEndTime('');
      setReason('');
      setNotes('');
      setOtherReason('');
    }
  }, [isOpen]);

  const isConfirmEnabled =
    reason &&
    notes &&
    (blockType === 'Permanent' || (blockType === 'Temporary' && endDate && endTime));

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm({
        blockType,
        endDate: blockType === 'Temporary' ? endDate : null,
        endTime: blockType === 'Temporary' ? endTime : null,
        reason: reason === 'Other' ? otherReason : reason,
        notes,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Block Student</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4">
          Are you sure you want to block the following student? This action is irreversible.
        </p>
        <div className="mb-4">
          <p className="text-sm sm:text-base font-medium text-gray-700">Name: {student?.fullName}</p>
          <p className="text-sm sm:text-base font-medium text-gray-700">Enrollment ID: {student?.enrollmentId}</p>
          <p className="text-sm sm:text-base font-medium text-gray-700">Program: {student?.school}</p>
        </div>
        <div className="mb-4">
          <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">Block Type</label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="blockType"
                value="Permanent"
                checked={blockType === 'Permanent'}
                onChange={() => setBlockType('Permanent')}
                className="mr-2"
              />
              Permanent Block
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="blockType"
                value="Temporary"
                checked={blockType === 'Temporary'}
                onChange={() => setBlockType('Temporary')}
                className="mr-2"
              />
              Temporary Block
            </label>
          </div>
        </div>
        {blockType === 'Temporary' && (
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">Reason for Blocking</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a reason</option>
            <option value="Placed Already">Placed Already</option>
            <option value="Academic Reasons">Academic Reasons</option>
            <option value="Policy Violation">Policy Violation</option>
            <option value="Other">Other</option>
          </select>
          {reason === 'Other' && (
            <input
              type="text"
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder="Specify the reason"
              className="w-full mt-2 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}
        </div>
        <div className="mb-4">
          <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">Administrative Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Provide specific details for the audit log"
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          ></textarea>
        </div>
        <p className="text-sm sm:text-base text-red-600 mb-4">
          Warning: {blockType === 'Permanent'
            ? 'Blocking this student will permanently revoke their application privileges.'
            : `Blocking this student will revoke their application privileges until ${endDate} ${endTime}.`}
        </p>
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmEnabled}
            className={`px-4 py-2 rounded-lg text-white ${isConfirmEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            Confirm Block
          </button>
        </div>
      </div>
    </div>
  );
};

export default function StudentDirectory() {
  const { user, role, loading: authLoading } = useAuth();
  const userRole = role?.toLowerCase();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    center: '',
    school: '',
    status: '',
    minCgpa: '',
    maxCgpa: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const studentsPerPage = 10;
  const [retryCount, setRetryCount] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState(null);
  const loadAttemptsRef = useRef(0);
  const isLoadingRef = useRef(false); // Track if a load is in progress
  const [showStudentView, setShowStudentView] = useState(false);
  const [studentDashboardData, setStudentDashboardData] = useState({
    applications: [],
    jobs: [],
    skills: [],
    loading: false,
    error: null
  });

  const clearPollingInterval = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const loadStudents = useCallback(async () => {
    // Prevent concurrent loads using ref
    if (isLoadingRef.current) {
      console.log('⚠️ Load already in progress, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      // Only clear error on new attempt (not retries)
      if (loadAttemptsRef.current === 0) {
        setError(null);
      }
      loadAttemptsRef.current += 1;
      
      console.log(`📡 Loading students... (attempt ${loadAttemptsRef.current})`);

      const studentsData = await getAllStudents({}, { retries: 2, retryDelay: 1000 });
      
      // Reset attempts on success
      loadAttemptsRef.current = 0;
      
      // Handle error response object (from getAllStudents error handling)
      if (studentsData && typeof studentsData === 'object' && studentsData.error) {
        console.warn('⚠️ Received error response from getAllStudents:', studentsData);
        setError(studentsData.message || 'Failed to load students data');
        setLastErrorTime(new Date().toISOString());
        // Keep existing students on error (graceful degradation)
        // Don't clear students array to maintain UI state
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }
      
      // Validate response is an array
      if (!Array.isArray(studentsData)) {
        console.error('❌ Invalid response format:', studentsData);
        setError('Invalid response format from server');
        setLastErrorTime(new Date().toISOString());
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }
      
      // Format students with safe defaults
      const formattedStudents = studentsData.map(student => ({
        ...student,
        status: student.user?.status || 'ACTIVE',
        emailVerified: student.user?.emailVerified || false,
        createdAt: student.user?.createdAt || student.createdAt,
        // Ensure all fields have safe defaults for filtering
        fullName: student.fullName || student.email || 'N/A',
        email: student.email || '',
        enrollmentId: student.enrollmentId || null,
        center: student.center || '',
        school: student.school || '',
        cgpa: student.cgpa || null,
      }));

      console.log(`✅ Loaded ${formattedStudents.length} students`);
      setStudents(formattedStudents);
      setError(null); // Clear any previous errors
      setRetryCount(0); // Reset retry count on success
      setLastErrorTime(null);
      setLoading(false);
      loadAttemptsRef.current = 0; // Reset attempts on success
    } catch (error) {
      console.error('❌ Error loading students:', error);
      
      // Handle authentication/authorization errors differently
      if (error?.status === 401 || error?.status === 403) {
        setError('Access denied. Please log in again.');
        setLastErrorTime(new Date().toISOString());
        // Don't clear students on auth errors - let auth system handle it
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }
      
      // For other errors, show error but keep existing data
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load students data';
      setError(`Failed to load students data: ${errorMessage}`);
      setLastErrorTime(new Date().toISOString());
      // Keep existing students array (graceful degradation)
      setLoading(false);
      
      // Don't increment retryCount automatically - let polling handle retries
      // Only increment if this is a manual retry (handled by retry button)
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  const setupStudentSubscription = useCallback(() => {
    clearPollingInterval();
    loadAttemptsRef.current = 0; // Reset attempts on new subscription setup
    setRetryCount(0); // Reset retry count
    
    // Initial load
    loadStudents();
    
    // Set up polling interval (30 seconds)
    // Will continue even if loadStudents fails
    pollIntervalRef.current = setInterval(() => {
      // Only poll if not currently loading
      if (!isLoadingRef.current) {
        loadStudents();
      }
    }, 30000);
    
    return () => {
      clearPollingInterval();
    };
  }, [loadStudents]);

  // REMOVED auto-retry useEffect - it was causing infinite loops
  // The polling interval (30 seconds) will handle retries naturally
  // Users can manually retry using the "Retry" button in the error UI

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || userRole !== 'admin') {
      setError('Admin access required to view the student directory.');
      setLoading(false);
      return;
    }

    // Setup subscription only once when component mounts or user changes
    const cleanup = setupStudentSubscription();

    return () => {
      clearPollingInterval();
      if (cleanup) cleanup();
    };
  }, [authLoading, user?.id, userRole, setupStudentSubscription]);

  const refreshStudents = () => {
    setupStudentSubscription();
  };

  const filteredStudents = students.filter((student) => {
    // Safe null/undefined handling for search filter
    const searchLower = search.toLowerCase();
    const fullName = (student.fullName || '').toLowerCase();
    const email = (student.email || '').toLowerCase();
    const enrollmentId = (student.enrollmentId || '').toLowerCase();
    
    const matchesSearch =
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      enrollmentId.includes(searchLower);
    const matchesCenter = filters.center ? student.center === filters.center : true;
    const matchesSchool = filters.school ? student.school === filters.school : true;
    const matchesStatus = filters.status ? student.status === filters.status : true;
    const matchesMinCgpa = filters.minCgpa ? parseFloat(student.cgpa || 0) >= parseFloat(filters.minCgpa) : true;
    const matchesMaxCgpa = filters.maxCgpa ? parseFloat(student.cgpa || 0) <= parseFloat(filters.maxCgpa) : true;

    return (
      matchesSearch &&
      matchesCenter &&
      matchesSchool &&
      matchesStatus &&
      matchesMinCgpa &&
      matchesMaxCgpa
    );
  });

  const downloadFilteredStudents = useCallback((mode = 'export') => {
    try {
      if (filteredStudents.length === 0) {
        alert('No data matches the current filter to export');
        return;
      }

      const headers = [
        'Full Name',
        'Email',
        'Enrollment ID',
        'Center',
        'School',
        'CGPA',
        'Phone',
        'Batch',
        'Status',
        'Highest Education',
        'Institution',
        'Top Skills'
      ];

      const csvRows = filteredStudents.map(student => [
        student.fullName || '',
        student.email || '',
        student.enrollmentId || '',
        student.center || '',
        student.school || '',
        student.cgpa || '',
        student.phone || '',
        student.batch || '',
        student.status || '',
        student.highestEducation || '',
        student.institution || '',
        student.topSkills?.join(', ') || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `students_${mode}_${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`Downloaded ${filteredStudents.length} students (${mode})`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to prepare the CSV');
    }
  }, [filteredStudents]);

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const displayedStudents = filteredStudents.slice(
    (currentPage - 1) * studentsPerPage,
    currentPage * studentsPerPage
  );

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    let validatedValue = value;

    if (name === 'minCgpa') {
      validatedValue = Math.max(0, parseFloat(value) || 0);
    } else if (name === 'maxCgpa') {
      validatedValue = Math.min(10, parseFloat(value) || 10);
    }

    setFilters((prev) => ({ ...prev, [name]: validatedValue }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleFilterDropdownChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value || ''
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      center: '',
      school: '',
      status: '',
      minCgpa: '',
      maxCgpa: '',
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'Blocked':
        return 'bg-red-200 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleBlockClick = (student) => {
    setSelectedStudent(student);
    setBlockModalOpen(true);
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setDetailsModalOpen(true);
  };

  const handleViewStudentDashboard = async (student) => {
    setSelectedStudent(student);
    setShowStudentView(true);
    setStudentDashboardData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch student dashboard data in parallel
      // Use admin endpoints to fetch data for the specific student
      const [applicationsResponse, jobs, skills] = await Promise.all([
        // Use admin getAllApplications endpoint with studentId filter
        api.getAllApplications({ studentId: student.id }).catch((err) => {
          console.error('Error fetching applications:', err);
          return { applications: [] };
        }),
        // Get targeted jobs - this will fetch all jobs and we'll filter client-side if needed
        getTargetedJobsForStudent(student.id).catch((err) => {
          console.error('Error fetching jobs:', err);
          return [];
        }),
        // Get student skills using admin access - note: this endpoint may need admin access
        getStudentSkills(student.id).catch((err) => {
          console.error('Error fetching skills:', err);
          return [];
        })
      ]);

      // Handle applications response format
      const applications = Array.isArray(applicationsResponse) 
        ? applicationsResponse 
        : (applicationsResponse?.applications || []);

      setStudentDashboardData({
        applications: applications || [],
        jobs: jobs || [],
        skills: skills || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading student dashboard data:', error);
      
      // Provide helpful error messages
      let errorMessage = 'Failed to load student dashboard data.';
      
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        errorMessage = 'Cannot connect to backend server. Please ensure the backend is running on port 3000.';
      } else if (error?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error?.status === 403) {
        errorMessage = 'Permission denied. Admin access required.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setStudentDashboardData({
        applications: [],
        jobs: [],
        skills: [],
        loading: false,
        error: errorMessage
      });
    }
  };

  const handleCloseStudentView = () => {
    setShowStudentView(false);
    setSelectedStudent(null);
    setStudentDashboardData({
      applications: [],
      jobs: [],
      skills: [],
      loading: false
    });
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setEditModalOpen(true);
  };

  const handleEditSave = async (studentId, updatedData) => {
    if (!canModifyStudents()) {
      alert('Only administrators can edit student information.');
      throw new Error('Permission denied');
    }

    try {
      setOperationLoading(true);
      // Update student profile
      await updateStudentProfile(studentId, updatedData);

      console.log('Student updated successfully');
      alert('Student information updated successfully!');

    } catch (error) {
      console.error('Error updating student:', error);
      setError('Failed to update student');
      alert('Failed to update student: ' + (error.message || 'Unknown error'));
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  // Permission check for admin-only actions
  const canModifyStudents = () => {
    return user && (user.role === 'admin' || user.userType === 'admin');
  };

  const handleBlockConfirm = async (blockDetails) => {
    if (!canModifyStudents()) {
      alert('Only administrators can block/unblock students.');
      return;
    }

    if (operationLoading) {
      return; // Prevent multiple operations
    }

    try {
      setOperationLoading(true);
      const newStatus = selectedStudent.status === 'Blocked' ? 'Active' : 'Blocked';
      const isBlocking = newStatus === 'Blocked';

      // Enhanced block details with admin info
      const enhancedBlockDetails = isBlocking ? {
        ...blockDetails,
        blockedBy: user.id,
        blockedByName: user.displayName || user.email || 'Admin',
        blockedAt: new Date()
      } : null;

      // Update student status
      await updateStudentStatus(selectedStudent.id, newStatus, enhancedBlockDetails);

      // Create notification entry for audit trail
      try {
        const notificationData = {
          type: isBlocking ? 'student_blocked' : 'student_unblocked',
          title: `Student ${isBlocking ? 'Blocked' : 'Unblocked'}`,
          message: `${selectedStudent.fullName} (${selectedStudent.enrollmentId}) has been ${isBlocking ? 'blocked' : 'unblocked'} by ${user.displayName || user.email}`,
          studentId: selectedStudent.id,
          studentName: selectedStudent.fullName,
          studentEnrollmentId: selectedStudent.enrollmentId,
          adminId: user.id,
          adminName: user.displayName || user.email || 'Admin',
          priority: 'high',
          metadata: {
            reason: isBlocking ? blockDetails.reason : 'Unblocked',
            notes: isBlocking ? blockDetails.notes : 'Student account unblocked',
            studentEmail: selectedStudent.email,
            studentCenter: selectedStudent.center,
            studentSchool: selectedStudent.school
          },
          createdAt: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0]
        };

        // TODO: Replace with API call: api.createNotification() or backend handles automatically
        console.log('Notification would be created for student status change');

      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError);
        // Don't fail the operation if notification fails
      }

      console.log(`Student ${isBlocking ? 'blocked' : 'unblocked'} successfully`);
      alert(`Student has been ${isBlocking ? 'blocked' : 'unblocked'} successfully.`);

    } catch (error) {
      console.error('Error updating student status:', error);
      setError('Failed to update student status');
      alert('Failed to update student status: ' + (error.message || 'Unknown error'));
    } finally {
      setOperationLoading(false);
    }
  };

  // Get unique values for filter dropdowns
  const uniqueCenters = [...new Set(students.map(s => s.center).filter(c => c && c !== 'N/A'))];
  const uniqueSchools = [...new Set(students.map(s => s.school).filter(s => s && s !== 'N/A'))];
  const filterCenterOptions = useMemo(() => {
    const merged = [...CENTER_OPTIONS];
    uniqueCenters.forEach((center) => {
      if (!merged.some(option => option.id === center)) {
        merged.push({ id: center, name: center });
      }
    });
    return merged;
  }, [uniqueCenters]);
  const filterSchoolOptions = useMemo(() => {
    const merged = [...SCHOOL_OPTIONS];
    uniqueSchools.forEach((school) => {
      if (!merged.some(option => option.id === school)) {
        merged.push({ id: school, name: school });
      }
    });
    return merged;
  }, [uniqueSchools]);

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center">
              <Loader className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <span className="text-gray-600">Loading students...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error screen only if no students loaded AND error exists
  if (error && students.length === 0 && !loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center py-12">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Failed to Load Students</h2>
            <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={refreshStudents}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => {
                  setError(null);
                  loadStudents();
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              If the problem persists, check your connection or contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Error Banner (shows if error exists but we have previous data) */}
        {error && students.length > 0 && (
          <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> {error}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Showing previously loaded data. Click retry to refresh.
                </p>
              </div>
              <div className="ml-auto flex-shrink-0">
                <button
                  onClick={refreshStudents}
                  className="text-sm text-yellow-800 hover:text-yellow-900 underline mr-3"
                >
                  Retry
                </button>
                <button
                  onClick={() => setError(null)}
                  className="text-sm text-yellow-800 hover:text-yellow-900"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Student Directory</h1>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={refreshStudents}
              disabled={loading}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => downloadFilteredStudents('import')}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
            >
              <Upload className="text-sm" />
              Import CSV
            </button>
            <button
              onClick={() => downloadFilteredStudents('export')}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
            >
              <Download className="text-sm" />
              Export CSV
            </button>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'} found
            </span>
          </div>
        </div>



        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or enrollment ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Toggle filters"
          >
            <FaFilter />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-700">Filters</h2>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <SelectDropdown
                  label="Center"
                  options={filterCenterOptions}
                  value={filters.center}
                  onChange={(value) => handleFilterDropdownChange('center', value)}
                  placeholder="All Centers"
                />
              </div>

              <div>
                <SelectDropdown
                  label="School"
                  options={filterSchoolOptions}
                  value={filters.school}
                  onChange={(value) => handleFilterDropdownChange('school', value)}
                  placeholder="All Schools"
                />
              </div>

              <div>
                <SelectDropdown
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={filters.status}
                  onChange={(value) => handleFilterDropdownChange('status', value)}
                  placeholder="All Status(es)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min CGPA</label>
                <input
                  type="number"
                  name="minCgpa"
                  placeholder="0.00"
                  min="0"
                  max="10"
                  step="0.01"
                  value={filters.minCgpa}
                  onChange={handleFilterChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max CGPA</label>
                <input
                  type="number"
                  name="maxCgpa"
                  placeholder="10.00"
                  min="0"
                  max="10"
                  step="0.01"
                  value={filters.maxCgpa}
                  onChange={handleFilterChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Student Table (horizontally scrollable with controls) */}
        <div className="relative rounded-lg shadow">

          <div
            id="students-table-scroll"
            className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider">EnRoll ID</th>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider">Center</th>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider">School</th>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider">CGPA</th>
                  <th className="p-3 text-left font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="p-3 text-center font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayedStudents.length > 0 ? (
                  displayedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="p-3 text-gray-800 font-medium">{student.fullName || student.email || 'N/A'}</td>
                      <td className="p-3 text-gray-600 truncate max-w-[190px]">{student.email}</td>
                      <td className="p-3 text-gray-600 font-mono text-xs">{student.enrollmentId}</td>
                      <td className="p-3 text-gray-600 truncate max-w-[90px]">{student.center}</td>
                      <td className="p-3 text-gray-600">{student.school}</td>
                      <td className="p-3 text-gray-600 font-medium">{student.cgpa}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center space-x-3">
                          <div className="relative group">
                            <button
                              onClick={() => handleViewStudentDashboard(student)}
                              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              <ImEye className="text-md" />
                            </button>
                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                              View Dashboard
                            </span>
                          </div>
                          <div className="relative group">
                            <button
                              onClick={() => handleEditStudent(student)}
                              disabled={!canModifyStudents() || operationLoading}
                              className={`p-2 rounded-lg transition-colors ${operationLoading
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : canModifyStudents()
                                    ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                              {operationLoading ? <Loader className="h-5 w-5 animate-spin" /> : <FaUserEdit className="text-md" />}
                            </button>
                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                              {canModifyStudents() ? 'Edit Student' : 'Admin access required'}
                            </span>
                          </div>
                          <div className="relative group">
                            <button
                              onClick={() => handleBlockClick(student)}
                              disabled={!canModifyStudents() || operationLoading}
                              className={`p-2 rounded-lg transition-colors ${operationLoading
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : canModifyStudents()
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                              {operationLoading ? <Loader className="h-5 w-5 animate-spin" /> : <MdBlock className="text-md" />}
                            </button>
                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                              {canModifyStudents()
                                ? `${student.status === 'Blocked' ? 'Unblock' : 'Block'} Student`
                                : 'Admin access required'
                              }
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg font-medium text-gray-500">No students found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {filteredStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 space-y-4 sm:space-y-0">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, filteredStudents.length)} of {filteredStudents.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronLeft className="mr-1 text-xs" />
                Previous
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm font-medium rounded-lg ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'} transition-colors`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <span className="px-2 py-1 text-gray-500">...</span>
                )}

                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {totalPages}
                  </button>
                )}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <FaChevronRight className="ml-1 text-xs" />
              </button>
            </div>
          </div>
        )}
      </div>

      <StudentDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        student={selectedStudent}
      />


      <EditStudentModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        student={selectedStudent}
        onSave={handleEditSave}
      />

      <BlockStudentModal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        student={selectedStudent}
        onConfirm={handleBlockConfirm}
      />

      {/* Student Dashboard Panel */}
      <StudentDashboardPanel
        isOpen={showStudentView}
        onClose={handleCloseStudentView}
        student={selectedStudent}
        dashboardData={studentDashboardData}
      />
    </div>
  );
}