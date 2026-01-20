import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ImEye } from 'react-icons/im';
import { FaSearch, FaFilter, FaChevronLeft, FaChevronRight, FaTimes, FaEdit, FaUser, FaEnvelope, FaPhone, FaGraduationCap, FaMapMarkerAlt, FaCalendarAlt, FaIdCard, FaInfoCircle, FaCheckCircle, FaUsers, FaChartLine, FaExternalLinkAlt } from 'react-icons/fa';
import { MdBlock } from 'react-icons/md';
import { Loader, Download, Upload, SquarePen, User, LinkIcon } from 'lucide-react';
import PWIOILOGO from '../../../assets/images/brand_logo.webp';
import { getAllStudents, updateStudentStatus, updateStudentProfile, updateEducationalBackground } from '../../../services/students';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import { API_BASE_URL } from '../../../config/api';
import CustomDropdown from '../../common/CustomDropdown';
import { CENTER_OPTIONS, SCHOOL_OPTIONS } from '../../../constants/academics';
import StudentDetailsModal from '../../common/StudentDetailsModal';
import BlockModal from '../../common/BlockModal';
// TODO: Replace Firebase operations with API calls

const STATUS_OPTIONS = [
  { id: 'Active', name: 'Active' },
  { id: 'Inactive', name: 'Inactive' },
  { id: 'Blocked', name: 'Blocked' },
];

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
      const cgpaStr = formData.cgpa.trim();
      // Validate CGPA format: 0.00 to 10.00 with EXACTLY 2 decimal places
      const cgpaRegex = /^(10\.00|[0-9]\.[0-9]{2})$/;
      
      if (!cgpaRegex.test(cgpaStr)) {
        // Check if user entered value without 2 decimals (e.g., 9, 9.0, 9.5)
        if (/^\d+$/.test(cgpaStr)) {
          newErrors.cgpa = 'Enter CGPA with 2 decimals (e.g., 9.00)';
        } else if (/^\d+\.\d?$/.test(cgpaStr)) {
          newErrors.cgpa = 'Enter CGPA with 2 decimals (e.g., 9.00)';
        } else {
          newErrors.cgpa = 'CGPA must be between 0.00 and 10.00 with exactly 2 decimal places (e.g., 9.00, 8.75)';
        }
      } else {
        // Validate range without using parseFloat to avoid rounding errors
        const parts = cgpaStr.split('.');
        const integerPart = parseInt(parts[0], 10);
        const decimalPart = parseInt(parts[1], 10);
        
        if (isNaN(integerPart) || isNaN(decimalPart)) {
          newErrors.cgpa = 'Invalid CGPA format';
        } else if (integerPart > 10 || (integerPart === 10 && decimalPart > 0)) {
          newErrors.cgpa = 'CGPA must be between 0.00 and 10.00';
        } else if (integerPart < 0) {
          newErrors.cgpa = 'CGPA must be between 0.00 and 10.00';
        }
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-600 to-emerald-600">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaEdit className="text-green-200" />
            Edit Student
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 bg-gray-50">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full p-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 ${
                  errors.fullName 
                    ? 'border-red-400 bg-red-50' 
                    : 'border-gray-200 bg-white focus:border-green-500'
                }`}
                placeholder="Enter student's full name"
              />
              {errors.fullName && <p className="text-red-600 text-sm mt-1.5 font-medium">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full p-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 ${
                  errors.email 
                    ? 'border-red-400 bg-red-50' 
                    : 'border-gray-200 bg-white focus:border-green-500'
                }`}
                placeholder="Enter student email"
              />
              {errors.email && <p className="text-red-600 text-sm mt-1.5 font-medium">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full p-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 ${
                  errors.phone 
                    ? 'border-red-400 bg-red-50' 
                    : 'border-gray-200 bg-white focus:border-green-500'
                }`}
                placeholder="+91 12345 67890"
              />
              {errors.phone && <p className="text-red-600 text-sm mt-1.5 font-medium">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                className={`w-full p-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 ${
                  errors.cgpa 
                    ? 'border-red-400 bg-red-50' 
                    : 'border-gray-200 bg-white focus:border-green-500'
                }`}
              />
              {errors.cgpa && <p className="text-red-600 text-sm mt-1.5 font-medium">{errors.cgpa}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition-all duration-200 border-2 border-gray-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold shadow-md hover:shadow-lg transition-all duration-200"
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

// CGPA Edit Modal Component
const EditCGPAModal = ({ isOpen, onClose, student, onSave }) => {
  const [cgpa, setCgpa] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (student && isOpen) {
      // Format CGPA to always show 2 decimal places when loading
      const cgpaValue = student.cgpa;
      if (cgpaValue) {
        const cgpaStr = String(cgpaValue);
        // If it's already in format like "9.00", use as-is
        if (/^(10\.00|[0-9]\.[0-9]{2})$/.test(cgpaStr)) {
          setCgpa(cgpaStr);
        } else if (/^\d+$/.test(cgpaStr)) {
          // Integer like "9" -> "9.00"
          setCgpa(cgpaStr + '.00');
        } else if (/^\d+\.\d+$/.test(cgpaStr)) {
          // Has decimal but not 2 places
          const parts = cgpaStr.split('.');
          setCgpa(parts[0] + '.' + parts[1].padEnd(2, '0').substring(0, 2));
        } else {
          setCgpa(cgpaStr);
        }
      } else {
        setCgpa('');
      }
      setError('');
    }
  }, [student, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate CGPA format: 0.00 to 10.00 with EXACTLY 2 decimal places
    const cgpaStr = String(cgpa).trim();
    if (cgpaStr) {
      const cgpaRegex = /^(10\.00|[0-9]\.[0-9]{2})$/;
      
      if (!cgpaRegex.test(cgpaStr)) {
        // Check if user entered value without 2 decimals (e.g., 9, 9.0, 9.5)
        if (/^\d+$/.test(cgpaStr)) {
          setError('Enter CGPA with 2 decimals (e.g., 9.00)');
        } else if (/^\d+\.\d?$/.test(cgpaStr)) {
          setError('Enter CGPA with 2 decimals (e.g., 9.00)');
        } else {
          setError('CGPA must be between 0.00 and 10.00 with exactly 2 decimal places (e.g., 9.00, 8.75)');
        }
        return;
      }
      
      // Validate range without using parseFloat to avoid rounding errors
      const parts = cgpaStr.split('.');
      const integerPart = parseInt(parts[0], 10);
      const decimalPart = parseInt(parts[1], 10);
      
      if (isNaN(integerPart) || isNaN(decimalPart)) {
        setError('Invalid CGPA format');
        return;
      } else if (integerPart > 10 || (integerPart === 10 && decimalPart > 0)) {
        setError('CGPA must be between 0.00 and 10.00');
        return;
      } else if (integerPart < 0) {
        setError('CGPA must be between 0.00 and 10.00');
        return;
      }
    }

    setLoading(true);
    try {
      // Format CGPA to exactly 2 decimal places without rounding
      let formattedCgpa = null;
      if (cgpaStr) {
        // If already in correct format (e.g., 9.00), use as-is
        if (/^(10\.00|[0-9]\.[0-9]{2})$/.test(cgpaStr)) {
          formattedCgpa = cgpaStr;
        } else {
          // Format to 2 decimal places without rounding
          const parts = cgpaStr.split('.');
          if (parts.length === 1) {
            // Integer like "9" -> "9.00"
            formattedCgpa = parts[0] + '.00';
          } else {
            // Has decimal part
            const integerPart = parts[0];
            const decimalPart = parts[1].substring(0, 2).padEnd(2, '0');
            formattedCgpa = integerPart + '.' + decimalPart;
          }
        }
      }
      await onSave(student.id, { cgpa: formattedCgpa });
      onClose();
    } catch (err) {
      console.error('Error updating CGPA:', err);
      setError(err.message || 'Failed to update CGPA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Edit CGPA</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Name
            </label>
            <input
              type="text"
              value={student.fullName || student.email || 'N/A'}
              disabled
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CGPA <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={cgpa}
              onChange={(e) => {
                // Enforce exactly 2 decimal places
                const value = e.target.value;
                const sanitized = value.replace(/[^0-9.]/g, '');
                const parts = sanitized.split('.');
                let finalValue = parts[0] || '';
                
                // If user has typed a decimal point, ensure we format to 2 decimal places
                if (parts.length > 1) {
                  const decimals = parts.slice(1).join('').substring(0, 2);
                  // Always show 2 decimal places if decimal point is present
                  finalValue += '.' + decimals.padEnd(2, '0');
                }
                
                // Ensure value doesn't exceed 10.00
                if (finalValue) {
                  const numValue = parseFloat(finalValue);
                  if (!isNaN(numValue) && numValue > 10) {
                    finalValue = '10.00';
                  } else if (!isNaN(numValue) && numValue < 0) {
                    finalValue = '0.00';
                  }
                }
                
                setCgpa(finalValue);
              }}
              onBlur={(e) => {
                // On blur, ensure exactly 2 decimal places if value exists
                const value = e.target.value.trim();
                if (value && !value.includes('.')) {
                  // If user entered integer (e.g., 9), format to 9.00
                  setCgpa(value + '.00');
                } else if (value && value.includes('.')) {
                  const parts = value.split('.');
                  if (parts[1] && parts[1].length < 2) {
                    // If user entered 9.0 or 9.5, pad to 2 decimals
                    setCgpa(parts[0] + '.' + parts[1].padEnd(2, '0'));
                  }
                }
              }}
              placeholder="Enter CGPA (e.g., 9.00, 8.75)"
              pattern="^(10\.00|[0-9]\.[0-9]{2})$"
              maxLength="5"
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            <p className="text-xs text-gray-500 mt-1">Format: Must have exactly 2 decimals (e.g., 9.00, 8.75). Values like 9 or 9.0 are not accepted.</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
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

      // Request a high limit to get all students (backend max is now 1000)
      const studentsData = await getAllStudents({ limit: 1000 }, { retries: 2, retryDelay: 1000 });
      
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
      
      // Handle both array response (backwards compatibility) and object with students array
      let studentsArray = [];
      if (Array.isArray(studentsData)) {
        studentsArray = studentsData;
      } else if (studentsData && Array.isArray(studentsData.students)) {
        studentsArray = studentsData.students;
      } else {
        console.error('❌ Invalid response format:', studentsData);
        setError('Invalid response format from server');
        setLastErrorTime(new Date().toISOString());
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }
      
      // Format students with safe defaults
      // Normalize status from uppercase (ACTIVE, BLOCKED) to title case (Active, Blocked)
      const normalizeStatus = (status) => {
        if (!status) return 'Active';
        const statusUpper = status.toUpperCase();
        if (statusUpper === 'ACTIVE') return 'Active';
        if (statusUpper === 'BLOCKED') return 'Blocked';
        if (statusUpper === 'PENDING') return 'Inactive';
        if (statusUpper === 'REJECTED') return 'Inactive';
        if (statusUpper === 'INACTIVE') return 'Inactive';
        return 'Active'; // Default to Active for unknown statuses
      };
      
      const formattedStudents = studentsArray.map(student => ({
        ...student,
        status: normalizeStatus(student.user?.status || 'ACTIVE'),
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
    // Compare CGPA values using string comparison when possible to avoid rounding errors
    const matchesMinCgpa = filters.minCgpa ? (() => {
      const studentCgpa = student.cgpa ? String(student.cgpa).trim() : '0.00';
      const minCgpa = String(filters.minCgpa).trim();
      // Normalize both to 2 decimal places for comparison
      const studentParts = studentCgpa.includes('.') ? studentCgpa.split('.') : [studentCgpa, '00'];
      const minParts = minCgpa.includes('.') ? minCgpa.split('.') : [minCgpa, '00'];
      const studentInt = parseInt(studentParts[0] || '0', 10);
      const studentDec = parseInt((studentParts[1] || '00').padEnd(2, '0').substring(0, 2), 10);
      const minInt = parseInt(minParts[0] || '0', 10);
      const minDec = parseInt((minParts[1] || '00').padEnd(2, '0').substring(0, 2), 10);
      return studentInt > minInt || (studentInt === minInt && studentDec >= minDec);
    })() : true;
    const matchesMaxCgpa = filters.maxCgpa ? (() => {
      const studentCgpa = student.cgpa ? String(student.cgpa).trim() : '0.00';
      const maxCgpa = String(filters.maxCgpa).trim();
      // Normalize both to 2 decimal places for comparison
      const studentParts = studentCgpa.includes('.') ? studentCgpa.split('.') : [studentCgpa, '00'];
      const maxParts = maxCgpa.includes('.') ? maxCgpa.split('.') : [maxCgpa, '00'];
      const studentInt = parseInt(studentParts[0] || '0', 10);
      const studentDec = parseInt((studentParts[1] || '00').padEnd(2, '0').substring(0, 2), 10);
      const maxInt = parseInt(maxParts[0] || '0', 10);
      const maxDec = parseInt((maxParts[1] || '00').padEnd(2, '0').substring(0, 2), 10);
      return studentInt < maxInt || (studentInt === maxInt && studentDec <= maxDec);
    })() : true;

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

  // Get status styling - matching job moderation style
  const getStatusChip = (status) => {
    const statusStyles = {
      active: { 
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50', 
        text: 'text-green-700', 
        border: 'border-green-200',
        label: 'Active'
      },
      inactive: { 
        bg: 'bg-gradient-to-r from-yellow-50 to-amber-50', 
        text: 'text-yellow-700', 
        border: 'border-yellow-200',
        label: 'Inactive'
      },
      blocked: { 
        bg: 'bg-gradient-to-r from-red-50 to-rose-50', 
        text: 'text-red-700', 
        border: 'border-red-200',
        label: 'Blocked'
      }
    };
    
    const normalizedStatus = status?.toLowerCase();
    const style = statusStyles[normalizedStatus] || statusStyles.inactive;
    
    return (
      <span className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${style.bg} ${style.text} border ${style.border} inline-flex items-center shadow-sm`}>
        {style.label}
      </span>
    );
  };

  const handleBlockClick = (student) => {
    setSelectedStudent(student);
    setBlockModalOpen(true);
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setDetailsModalOpen(true);
  };

  const handleViewPublicProfile = (student) => {
    const publicProfileId = student.publicProfileId || student.user?.publicProfileId;
    if (publicProfileId) {
      const publicProfileUrl = `${window.location.origin}/profile/${publicProfileId}`;
      window.open(publicProfileUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert('This student has not generated a public profile link yet.');
    }
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

  const handleStudentUpdate = async (studentId, updatedData) => {
    if (!canModifyStudents()) {
      alert('Only administrators can edit student information.');
      throw new Error('Permission denied');
    }

    try {
      // Update local state
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.id === studentId 
            ? { ...student, ...updatedData }
            : student
        )
      );
      
      // Also update selectedStudent if it's the same student
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent(prev => ({ ...prev, ...updatedData }));
      }
    } catch (error) {
      console.error('Error updating student in list:', error);
      throw error;
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

  // Calculate statistics from ALL students (not filtered) - must be before conditional returns to follow Rules of Hooks
  const stats = useMemo(() => {
    const active = students.filter(s => s.status === 'Active').length;
    const blocked = students.filter(s => s.status === 'Blocked').length;
    const inactive = students.filter(s => s.status === 'Inactive').length;
    return { total: students.length, active, blocked, inactive };
  }, [students]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12">
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Loader className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                  <div className="absolute inset-0 h-12 w-12 border-4 border-blue-200 rounded-full"></div>
                </div>
                <span className="text-gray-700 font-medium text-lg">Loading students...</span>
                <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error screen only if no students loaded AND error exists
  if (error && students.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12">
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center">
                  <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Failed to Load Students</h2>
              <p className="text-red-600 mb-8 max-w-md mx-auto font-medium">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={refreshStudents}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold transform hover:scale-105"
                >
                  Retry
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    loadStudents();
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-semibold border-2 border-gray-200"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-6">
                If the problem persists, check your connection or contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Analytics */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Student Directory</h2>
            <p className="text-gray-600 text-lg">Manage and monitor all student accounts</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => downloadFilteredStudents('export')}
              className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={refreshStudents}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-medium shadow-sm hover:shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <FaChartLine className="w-4 h-4" />
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>

        {/* Analytics Cards - Matching Job Moderation Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <FaUsers className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-blue-700">{stats.total}</div>
            </div>
            <div className="text-sm font-medium text-blue-600">Total Students</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-5 rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <FaCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-green-700">{stats.active}</div>
            </div>
            <div className="text-sm font-medium text-green-600">Active</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-100 p-5 rounded-xl shadow-sm border border-red-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <MdBlock className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-red-700">{stats.blocked}</div>
            </div>
            <div className="text-sm font-medium text-red-600">Blocked</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-amber-100 p-5 rounded-xl shadow-sm border border-yellow-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <FaUser className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div className="text-3xl font-bold text-yellow-700">{stats.inactive}</div>
            </div>
            <div className="text-sm font-medium text-yellow-600">Inactive</div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && students.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-yellow-800">
                <strong>Warning:</strong> {error}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Showing previously loaded data. Click retry to refresh.
              </p>
            </div>
            <div className="ml-auto flex-shrink-0 flex gap-2">
              <button
                onClick={refreshStudents}
                className="text-sm font-medium text-yellow-800 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-3 py-1 rounded-md transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => setError(null)}
                className="text-sm text-yellow-800 hover:text-yellow-900 p-1 rounded-md hover:bg-yellow-100 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <FaFilter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filters & Search</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Search Students</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Center Filter */}
          <CustomDropdown
            label="Center"
            icon={FaMapMarkerAlt}
            iconColor="text-indigo-600"
            options={filterCenterOptions.map(opt => ({ value: opt.id, label: opt.name }))}
            value={filters.center}
            onChange={(value) => handleFilterDropdownChange('center', value)}
            placeholder="All Centers"
          />

          {/* School Filter */}
          <CustomDropdown
            label="School"
            icon={FaGraduationCap}
            iconColor="text-purple-600"
            options={filterSchoolOptions.map(opt => ({ value: opt.id, label: opt.name }))}
            value={filters.school}
            onChange={(value) => handleFilterDropdownChange('school', value)}
            placeholder="All Schools"
          />

          {/* Status Filter */}
          <CustomDropdown
            label="Status"
            icon={FaCheckCircle}
            iconColor="text-green-600"
            options={STATUS_OPTIONS.map(opt => ({ value: opt.id, label: opt.name }))}
            value={filters.status}
            onChange={(value) => handleFilterDropdownChange('status', value)}
            placeholder="All Status"
          />
        </div>

        {/* CGPA Range and Reset */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FaGraduationCap className="w-4 h-4 text-blue-600" />
              Min CGPA
            </label>
            <input
              type="number"
              name="minCgpa"
              placeholder="0.00"
              min="0"
              max="10"
              step="0.01"
              value={filters.minCgpa}
              onChange={handleFilterChange}
              className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer bg-white text-gray-900 font-medium hover:border-gray-400 shadow-sm hover:shadow-md"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FaGraduationCap className="w-4 h-4 text-orange-600" />
              Max CGPA
            </label>
            <input
              type="number"
              name="maxCgpa"
              placeholder="10.00"
              min="0"
              max="10"
              step="0.01"
              value={filters.maxCgpa}
              onChange={handleFilterChange}
              className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer bg-white text-gray-900 font-medium hover:border-gray-400 shadow-sm hover:shadow-md"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Search Results Summary */}
      {!loading && (
        <div className="text-sm text-gray-600">
          {search || Object.values(filters).some(f => f) ? (
            <span>
              Showing {filteredStudents.length} of {students.length} students
              {search && <span className="font-medium"> matching "{search}"</span>}
            </span>
          ) : (
            <span>Showing all {students.length} students</span>
          )}
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="animate-spin text-blue-600 mr-3" />
            <span className="text-gray-600">Loading students...</span>
          </div>
        ) : displayedStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 max-w-md w-full border-2 border-blue-200 shadow-lg">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <FaUsers className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Students Found</h3>
                <div className="text-sm text-gray-600 leading-relaxed">
                  {search ? (
                    <div className="space-y-2">
                      <p className="font-medium">No students match your search criteria.</p>
                      <p className="text-gray-500">Try adjusting your search terms or filters.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium">No students have been registered yet.</p>
                      <p className="text-gray-500">Students will appear here once they register.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Student Details
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Enrollment ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Center
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      School
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      CGPA
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-500/30">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-gray-900 leading-tight whitespace-nowrap overflow-hidden text-ellipsis" title={student.fullName || student.email || 'N/A'}>
                            {student.fullName || student.email || 'N/A'}
                          </div>
                          {student.phone && (
                            <div className="flex items-center gap-1.5">
                              <FaPhone className="w-3 h-3 text-gray-500" />
                              <span className="text-xs text-gray-600">{student.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <FaEnvelope className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="text-xs font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis" title={student.email}>
                            {student.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded inline-block">
                          {student.enrollmentId || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <FaMapMarkerAlt className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <div className="text-xs font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis" title={student.center || 'N/A'}>
                            {student.center || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <FaGraduationCap className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <div className="text-xs font-semibold text-gray-900">{student.school || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-green-50 rounded-lg">
                            <FaGraduationCap className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {student.cgpa 
                                ? (() => {
                                    // Ensure CGPA is displayed with exactly 2 decimal places
                                    const cgpaStr = String(student.cgpa);
                                    if (/^(10\.00|[0-9]\.[0-9]{2})$/.test(cgpaStr)) {
                                      return cgpaStr;
                                    } else if (/^\d+$/.test(cgpaStr)) {
                                      return cgpaStr + '.00';
                                    } else if (/^\d+\.\d+$/.test(cgpaStr)) {
                                      const parts = cgpaStr.split('.');
                                      return parts[0] + '.' + parts[1].padEnd(2, '0').substring(0, 2);
                                    }
                                    return cgpaStr;
                                  })()
                                : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        {getStatusChip(student.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center gap-2">
                          {/* View Public Profile Button */}
                          <button
                            onClick={() => handleViewPublicProfile(student)}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300"
                            title={student.publicProfileId || student.user?.publicProfileId ? "View Public Profile" : "No Public Profile Available"}
                            disabled={!student.publicProfileId && !student.user?.publicProfileId}
                          >
                            <ImEye className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditStudent(student)}
                            disabled={!canModifyStudents() || operationLoading}
                            className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                            title="Edit Student"
                          >
                            {operationLoading ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <FaEdit className="w-4 h-4" />
                            )}
                          </button>

                          {/* Block/Unblock Button */}
                          <button
                            onClick={() => handleBlockClick(student)}
                            disabled={!canModifyStudents() || operationLoading}
                            className="p-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                            title={student.status === 'Blocked' ? 'Unblock Student' : 'Block Student'}
                          >
                            {operationLoading ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <MdBlock className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredStudents.length > studentsPerPage && (
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-t-2 border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span className="text-gray-500">Showing</span>
                    <span className="font-semibold text-blue-700">{((currentPage - 1) * studentsPerPage) + 1}</span>
                    <span className="text-gray-500">to</span>
                    <span className="font-semibold text-blue-700">{Math.min(currentPage * studentsPerPage, filteredStudents.length)}</span>
                    <span className="text-gray-500">of</span>
                    <span className="font-semibold text-blue-700">{filteredStudents.length}</span>
                    <span className="text-gray-500">results</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 flex items-center gap-2 shadow-sm"
                    >
                      <FaChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 shadow-sm">
                      <span className="text-blue-700">{currentPage}</span>
                      <span className="text-gray-500 mx-1">/</span>
                      <span>{totalPages}</span>
                    </div>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 flex items-center gap-2 shadow-sm"
                    >
                      <span>Next</span>
                      <FaChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
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

      <BlockModal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        entity={selectedStudent}
        entityType="student"
        onConfirm={handleBlockConfirm}
      />

    </div>
  );
}