import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ImEye } from 'react-icons/im';
import { FaSearch, FaFilter, FaChevronLeft, FaChevronRight, FaTimes, FaEdit, FaUser, FaEnvelope, FaPhone, FaGraduationCap, FaMapMarkerAlt, FaCalendarAlt, FaIdCard, FaInfoCircle, FaCheckCircle, FaUsers, FaChartLine, FaExternalLinkAlt } from 'react-icons/fa';
import { MdBlock } from 'react-icons/md';
import { Loader, Download, Upload, SquarePen, User, Activity, TrendingUp, GraduationCap, BarChart2, Phone, CheckCircle2, MessageSquare, Briefcase, Code, X, Tag, Folder, ExternalLink, Check, ClipboardList } from 'lucide-react';
import PWIOILOGO from '../../../assets/images/brand_logo.webp';
import { getAllStudents, updateStudentProfile } from '../../../services/students';
import { fetchStudentsWithScores } from '../../../services/adminReadiness';
import { fetchStudentDirectory, exportStudentDirectory, fetchStudentPanelExtras } from '../../../services/studentDirectory';
import StudentDirectoryTable from './StudentDirectoryTable';
import DirectoryLoadingPanel from './DirectoryLoading';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import { API_BASE_URL } from '../../../config/api';
import CustomDropdown from '../../common/CustomDropdown';
import StudentDetailsModal from '../../common/StudentDetailsModal';
import BlockModal from '../../common/BlockModal';
import { fetchAcademicOptions, buildStandardFilterOptions } from '../../../utils/academicOptions';
// TODO: Replace Firebase operations with API calls

const STATUS_OPTIONS = [
  { id: 'Active', name: 'Active' },
  { id: 'Inactive', name: 'Inactive' },
  { id: 'Blocked', name: 'Blocked' },
];

const READINESS_TIER_OPTIONS = [
  { id: '', name: 'All readiness' },
  { id: 'ready', name: 'Ready (≥75%)' },
  { id: 'developing', name: 'Developing' },
  { id: 'at_risk', name: 'At risk' },
];

const READINESS_TIER_LABELS = { ready: 'Ready', developing: 'Developing', at_risk: 'At risk' };
const PROBABILITY_TIER_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };

function normalizePlacementMetric(metric) {
  if (metric == null) return { score: null, tier: null, components: null };
  if (typeof metric === 'number' || typeof metric === 'string') {
    const score = parseFloat(metric);
    return { score: Number.isFinite(score) ? score : null, tier: null, components: null };
  }
  const score = metric.score != null ? parseFloat(metric.score) : null;
  return {
    score: Number.isFinite(score) ? score : null,
    tier: metric.tier ?? null,
    components: metric.components ?? null,
  };
}

function formatPlacementMetricDisplay(metric, tierLabels, fallback = '—') {
  const { score, tier } = normalizePlacementMetric(metric);
  if (score == null && !tier) return fallback;
  const label = tier ? (tierLabels[tier] || String(tier).replace(/_/g, ' ')) : null;
  if (score != null) return label ? `${score}% (${label})` : `${score}%`;
  return label || fallback;
}

function PlacementScoreCell({ score, tier, components, label }) {
  const [open, setOpen] = useState(false);
  const tierColors = {
    ready: 'bg-green-100 text-green-800',
    developing: 'bg-amber-100 text-amber-800',
    at_risk: 'bg-red-100 text-red-800',
    high: 'bg-green-100 text-green-800',
    medium: 'bg-blue-100 text-blue-800',
    low: 'bg-gray-100 text-gray-700',
  };
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${tierColors[tier] || 'bg-gray-100'}`}>
        {score != null ? `${score}%` : '—'}
      </span>
      {open && components && (
        <div className="absolute z-30 left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs">
          <p className="font-semibold text-gray-700 mb-1">{label}</p>
          {Object.entries(components).map(([k, v]) => (
            <div key={k} className="flex justify-between py-0.5">
              <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="font-medium">{v}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 text-white border-b border-slate-700">
          <h2 className="text-lg font-semibold">Edit student</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <FaTimes size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 transition-colors ${errors.fullName
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 bg-white'
                  }`}
                placeholder="Student full name"
              />
              {errors.fullName && <p className="text-red-600 text-xs mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 transition-colors ${errors.email
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 bg-white'
                  }`}
                placeholder="Email address"
              />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 transition-colors ${errors.phone
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 bg-white'
                  }`}
                placeholder="+91 12345 67890"
              />
              {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                placeholder="e.g. 8.75"
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 transition-colors ${errors.cgpa
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 bg-white'
                  }`}
              />
              {errors.cgpa && <p className="text-red-600 text-xs mt-1">{errors.cgpa}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-800 text-white rounded-md text-sm font-medium hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            >
              {loading && <Loader className="h-4 w-4 animate-spin mr-2" />}
              {loading ? 'Saving…' : 'Save changes'}
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
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'
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
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filters, setFilters] = useState({
    center: '',
    school: '',
    status: '',
    batch: '',
    minCgpa: '',
    maxCgpa: '',
    tier: '',
    minReadiness: '',
  });
  const [sortByScores, setSortByScores] = useState('readiness');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [dashboardData, setDashboardData] = useState({ loading: true, error: null, jobs: [], applications: [], skills: [] });
  const studentsPerPage = 50;
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [studentSummary, setStudentSummary] = useState({
    totalStudents: 0,
    activeStudents: 0,
    blockedStudents: 0,
    pendingStudents: 0,
    rejectedStudents: 0,
  });
  const [retryCount, setRetryCount] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState(null);
  const loadAttemptsRef = useRef(0);
  const isLoadingRef = useRef(false); // Track if a load is in progress
  const [academicFilterOptions, setAcademicFilterOptions] = useState({
    schools: [],
    centers: [],
    batches: [],
  });

  useEffect(() => {
    const loadAcademicFilters = async () => {
      try {
        const raw = await fetchAcademicOptions();
        setAcademicFilterOptions(buildStandardFilterOptions(raw));
      } catch (err) {
        console.error('Failed to load academic options for directory filters:', err);
      }
    };
    loadAcademicFilters();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (appliedSearch !== searchQuery) {
        setAppliedSearch(searchQuery);
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, appliedSearch]);


  const clearPollingInterval = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const loadStudents = useCallback(async (showLoading = true) => {
    // Prevent concurrent loads using ref
    if (isLoadingRef.current) {
      console.log('⚠️ Load already in progress, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      if (showLoading) setLoading(true);

      // Only clear error on new attempt (not retries)
      if (loadAttemptsRef.current === 0) {
        setError(null);
      }
      loadAttemptsRef.current += 1;

      console.log(`📡 Loading students... (attempt ${loadAttemptsRef.current})`);

      const queryParams = {
        limit: studentsPerPage,
        page: currentPage,
        search: appliedSearch,
        center: filters.center,
        school: filters.school,
        status: filters.status,
        batch: filters.batch,
        minCgpa: filters.minCgpa,
        maxCgpa: filters.maxCgpa,
        sortBy: sortByScores,
        sortDir: 'desc',
      };
      if (filters.tier) queryParams.tier = filters.tier;
      if (filters.minReadiness) queryParams.minReadiness = filters.minReadiness;

      const studentsData = await fetchStudentDirectory(queryParams).catch(async () => {
        return fetchStudentsWithScores(queryParams).catch(async () => {
          return getAllStudents(queryParams, { retries: 2, retryDelay: 1000, returnPagination: true });
        });
      });

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
      let paginationData = { totalPages: 1, total: 0 };
      if (studentsData && Array.isArray(studentsData.students)) {
        studentsArray = studentsData.students;
        if (studentsData.pagination) paginationData = studentsData.pagination;
      } else if (Array.isArray(studentsData)) {
        studentsArray = studentsData;
        paginationData.total = studentsArray.length;
      } else {
        console.error('❌ Invalid response format:', studentsData);
        setError('Invalid response format from server');
        setLastErrorTime(new Date().toISOString());
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }
      setTotalPages(paginationData.totalPages || 1);
      setTotalStudents(paginationData.total || studentsArray.length);
      if (studentsData?.summary) {
        setStudentSummary(studentsData.summary);
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

      const formattedStudents = studentsArray.map(student => {
        // Parse blockInfo if it exists
        let blockInfo = null;
        if (student.user?.blockInfo) {
          try {
            blockInfo = typeof student.user.blockInfo === 'string'
              ? JSON.parse(student.user.blockInfo)
              : student.user.blockInfo;
          } catch (e) {
            console.warn('Failed to parse blockInfo for student:', student.id, e);
          }
        }

        let parsedBlock = blockInfo;
        if (student.blockInfo && !parsedBlock) {
          try {
            parsedBlock = typeof student.blockInfo === 'string'
              ? JSON.parse(student.blockInfo)
              : student.blockInfo;
          } catch {
            parsedBlock = null;
          }
        }

        return {
          ...student,
          status: normalizeStatus(student.status || student.user?.status || 'ACTIVE'),
          emailVerified: Boolean(
            student.emailVerified ?? student.user?.emailVerified ?? student.user?.lastLoginAt,
          ),
          createdAt: student.user?.createdAt || student.createdAt,
          blockInfo: parsedBlock,
          fullName: student.fullName || student.email || 'N/A',
          email: student.email || '',
          phone: student.phone || student.contactNumber || '',
          enrollmentId: student.enrollmentId || null,
          center: student.center || '',
          school: student.school || '',
          batch: student.batch || student.cohort || '',
          cgpa: student.cgpa || null,
          placementReadiness: student.placementReadiness || null,
          placementProbability: student.placementProbability || null,
        };
      });

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
      setError(`Failed to load students data: ${errorMessage} `);
      setLastErrorTime(new Date().toISOString());
      // Keep existing students array (graceful degradation)
      setLoading(false);

      // Don't increment retryCount automatically - let polling handle retries
      // Only increment if this is a manual retry (handled by retry button)
    } finally {
      isLoadingRef.current = false;
    }
  }, [currentPage, appliedSearch, filters, sortByScores]);

  const setupStudentSubscription = useCallback(() => {
    clearPollingInterval();
    loadAttemptsRef.current = 0; // Reset attempts on new subscription setup
    setRetryCount(0); // Reset retry count

    // Initial load (show spinner)
    loadStudents(true);

    // Poll every 60s, only when tab is visible (no spinner on refresh)
    pollIntervalRef.current = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (!isLoadingRef.current) {
        loadStudents(false);
      }
    }, 60000);

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

    if (!user || !['admin', 'super_admin'].includes(userRole)) {
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
  }, [authLoading, user?.id, userRole, setupStudentSubscription, currentPage, appliedSearch, filters]);

  const refreshStudents = () => {
    setupStudentSubscription();
  };

  

  const downloadFilteredStudents = useCallback(async (mode = 'export') => {
    try {
      const exportResponse = await exportStudentDirectory({
        search: appliedSearch,
        center: filters.center,
        school: filters.school,
        status: filters.status,
        batch: filters.batch,
        minCgpa: filters.minCgpa,
        maxCgpa: filters.maxCgpa,
        tier: filters.tier,
        limit: 2000,
        page: 1,
      }).catch(() => getAllStudents({
        search: appliedSearch,
        center: filters.center,
        school: filters.school,
        status: filters.status,
        batch: filters.batch,
        minCgpa: filters.minCgpa,
        maxCgpa: filters.maxCgpa,
        limit: 1000,
        page: 1,
      }));

      if (exportResponse && exportResponse.error) {
        throw new Error(exportResponse.message || 'Failed to load students for export');
      }

      const studentsToExport = Array.isArray(exportResponse)
        ? exportResponse
        : exportResponse.students || [];

      if (studentsToExport.length === 0) {
        alert('No data matches the current filter to export');
        return;
      }

      const headers = [
        'Sr No',
        'Name',
        'Email',
        'Program',
        'Cohort',
        'Current Location',
        'Contact',
        'CS Status',
        'Activation',
        'Placement Status',
        'Activity Score',
        'Mock Interviews',
        'Jobs Assigned',
        'Eligible Jobs',
        'Jobs Applied',
        'Applied Closed',
        'No Shows',
        'Unapplied',
        'Readiness %',
        'Probability %',
        'Risk Flags',
        'Account Status',
      ];

      const csvRows = studentsToExport.map(student => [
        student.srNo ?? '',
        student.fullName || '',
        student.email || '',
        student.program || '',
        student.cohort || student.batch || '',
        student.currentLocation || '',
        student.contactNumber || student.phone || '',
        student.csStatus?.label || '',
        student.activation?.label || '',
        student.placementStatus?.label || '',
        student.activityScore ?? '',
        student.mockInterviews ?? '',
        student.jobsAssigned ?? '',
        student.eligibleJobs ?? '',
        student.jobsApplied ?? '',
        student.appliedClosed ?? '',
        student.noShows ?? '',
        student.unapplied ?? '',
        student.placementReadiness?.score ?? '',
        student.placementProbability?.score ?? '',
        (student.riskFlags || []).map((f) => f.label).join('; '),
        student.status || '',
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

      console.log(`Downloaded ${studentsToExport.length} students(${mode})`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to prepare the CSV');
    }
  }, [filters, appliedSearch]);

  

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
      batch: '',
      status: '',
      minCgpa: '',
      maxCgpa: '',
      tier: '',
      minReadiness: '',
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
      <span className={`px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${style.bg} ${style.text} border ${style.border} inline-flex items-center shadow-sm`}>
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

  const handleViewProfile = async (student) => {
    const studentId = student?.id;
    if (!studentId) return;

    setSelectedStudent(student);
    setShowProfile(true);
    setDashboardData({ loading: true, error: null });

    try {
      const panel = await fetchStudentPanelExtras(studentId);
      if (!panel?.profile?.id) {
        throw new Error('Student profile not found');
      }

      const mergedStudent = {
        ...student,
        ...panel.profile,
        program: panel.program || student.program || panel.education?.[0]?.degree || null,
        branch: panel.branch || panel.education?.[0]?.description || student.branch || null,
        currentLocation: panel.currentLocation || student.currentLocation || null,
        placementReadiness: panel.metricsAvailable ? panel.placementReadiness : null,
        placementProbability: panel.metricsAvailable ? panel.placementProbability : null,
        metricsAvailable: panel.metricsAvailable !== false,
      };

      setSelectedStudent(mergedStudent);
      setDashboardData({
        loading: false,
        error: null,
        profile: panel.profile,
        applications: panel.applications || [],
        skills: panel.skills || [],
        education: panel.education || [],
        projects: panel.projects || [],
        achievements: panel.achievements || [],
        certifications: panel.certifications || [],
        experiences: panel.experiences || [],
        mockInterviews: panel.mockInterviews || { interviews: [], completedCount: 0 },
        assessments: panel.assessments || [],
        funnelStats: panel.funnelStats || {
          applied: panel.profile.statsApplied ?? 0,
          shortlisted: panel.profile.statsShortlisted ?? 0,
          interviewed: panel.profile.statsInterviewed ?? 0,
          offers: panel.profile.statsOffers ?? 0,
        },
        metricsAvailable: panel.metricsAvailable !== false,
      });
    } catch (error) {
      console.error('Error loading student data:', error);
      setDashboardData({
        loading: false,
        error: 'Failed to load student profile. Please try again.',
        profile: null,
        applications: [],
        skills: [],
        metricsAvailable: false,
      });
    }
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

  // Permission check for admin / super admin actions
  const canModifyStudents = () => {
    const r = (user?.role || user?.userType || '').toLowerCase();
    return user && (r === 'admin' || r === 'super_admin');
  };

  // Only Super Admin can unblock permanently blocked students
  const isSuperAdmin = () => (user?.role || user?.userType || '').toLowerCase() === 'super_admin';

  const handleBlockConfirm = async (blockDetails) => {
    if (!canModifyStudents()) {
      alert('Only administrators can block/unblock students.');
      return;
    }

    if (operationLoading) {
      return;
    }

    try {
      setOperationLoading(true);
      const newStatus = selectedStudent.status === 'Blocked' ? 'Active' : 'Blocked';
      const isBlocking = newStatus === 'Blocked';

      const unblock = blockDetails?.isUnblocking === true || !isBlocking;
      const payload = {
        isUnblocking: unblock,
        blockType: !unblock && blockDetails?.blockType
          ? (blockDetails.blockType === 'Temporary' || blockDetails.blockType === 'temporary' ? 'temporary' : 'permanent')
          : 'permanent',
        startDate: !unblock && blockDetails?.startDate ? blockDetails.startDate : null,
        endDate: !unblock && blockDetails?.endDate ? blockDetails.endDate : null,
        endTime: !unblock && blockDetails?.endTime ? blockDetails.endTime : null,
        reason: !unblock && blockDetails?.reason ? blockDetails.reason : '',
        notes: !unblock && blockDetails?.notes ? blockDetails.notes : '',
      };

      await api.blockUnblockStudent(selectedStudent.id, payload);
      setBlockModalOpen(false);
      setSelectedStudent(null);
      await loadStudents();
      alert(`Student has been ${isBlocking ? 'blocked' : 'unblocked'} successfully.`);
    } catch (error) {
      console.error('Error updating student status:', error);
      setError('Failed to update student status');
      const msg = error?.response?.data?.message || error.message || 'Unknown error';
      if (error?.response?.status === 403) {
        alert(msg);
      } else {
        alert('Failed to update student status: ' + msg);
      }
    } finally {
      setOperationLoading(false);
    }
  };

  // Calculate statistics from ALL students (not filtered) - must be before conditional returns to follow Rules of Hooks
  const stats = studentSummary;

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
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                {error || 'We couldn\'t load the student directory. This might be due to a connection issue or server error.'}
              </p>
              <div className="flex justify-center gap-4">
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
      {/* Quick student metrics — from API (scoped to current filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-sky-50 border border-sky-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-slate-800 tabular-nums">{stats.totalStudents ?? 0}</div>
          <div className="text-sm text-slate-600 mt-1">Total Students</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-800 tabular-nums">{stats.activeStudents ?? 0}</div>
          <div className="text-sm text-emerald-700 mt-1">Active</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-800 tabular-nums">{stats.blockedStudents ?? 0}</div>
          <div className="text-sm text-red-700 mt-1">Blocked</div>
        </div>
      </div>

      {/* Error Banner */}
      {error && students.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 p-4 rounded-xl shadow-sm mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-semibold text-yellow-800">
                <strong>Warning:</strong> {error}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Showing previously loaded data. Click retry to refresh.
              </p>
            </div>
            <div className="ml-auto flex-shrink-0 flex gap-2">
              <button
                onClick={refreshStudents}
                className="text-sm font-semibold text-yellow-850 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-250/80 px-3 py-1 rounded-lg transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => setError(null)}
                className="text-sm text-yellow-850 hover:text-yellow-900 p-1 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search - Upgraded design */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <CustomDropdown
            label="Center"
            compact
            options={academicFilterOptions.centers.map((opt) => ({ value: opt.id, label: opt.name }))}
            value={filters.center}
            onChange={(value) => handleFilterDropdownChange('center', value)}
            placeholder="All centres"
          />

          <CustomDropdown
            label="School"
            compact
            options={academicFilterOptions.schools.map((opt) => ({ value: opt.id, label: opt.name }))}
            value={filters.school}
            onChange={(value) => handleFilterDropdownChange('school', value)}
            placeholder="All schools"
          />

          <CustomDropdown
            label="Batch"
            compact
            options={academicFilterOptions.batches.map((opt) => ({
              value: opt.id,
              label: opt.label || opt.name,
            }))}
            value={filters.batch}
            onChange={(value) => handleFilterDropdownChange('batch', value)}
            placeholder="All batches"
          />

          <CustomDropdown
            label="Status"
            compact
            options={STATUS_OPTIONS.map(opt => ({ value: opt.id, label: opt.name }))}
            value={filters.status}
            onChange={(value) => handleFilterDropdownChange('status', value)}
            placeholder="All status"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <CustomDropdown
            label="Readiness tier"
            compact
            options={READINESS_TIER_OPTIONS.map(opt => ({ value: opt.id, label: opt.name }))}
            value={filters.tier}
            onChange={(value) => handleFilterDropdownChange('tier', value)}
            placeholder="All readiness"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 bg-white text-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 bg-white text-gray-800"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-sm font-medium transition-colors"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div>
        {loading ? (
          <DirectoryLoadingPanel
            title="Loading students..."
            subtitle="Please wait while we fetch the data"
          />
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 max-w-md w-full border-2 border-blue-200 shadow-lg">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <FaUsers className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Students Found</h3>
                <div className="text-sm text-gray-600 leading-relaxed">
                  {appliedSearch || Object.values(filters).some(f => f) ? (
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
            <StudentDirectoryTable
              rows={students}
              showingCount={students.length}
              totalCount={totalStudents}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onExport={() => downloadFilteredStudents('export')}
              operationLoading={operationLoading}
              canModifyStudents={canModifyStudents}
              isSuperAdmin={isSuperAdmin}
              onView={handleViewProfile}
              onEdit={handleEditStudent}
              onBlock={handleBlockClick}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span className="text-gray-500">Showing</span>
                    <span className="font-semibold text-blue-700">{((currentPage - 1) * studentsPerPage) + 1}</span>
                    <span className="text-gray-500">to</span>
                    <span className="font-semibold text-blue-700">{Math.min(currentPage * studentsPerPage, totalStudents)}</span>
                    <span className="text-gray-500">of</span>
                    <span className="font-semibold text-blue-700">{totalStudents}</span>
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
        onClose={() => { setBlockModalOpen(false); setSelectedStudent(null); }}
        entity={selectedStudent}
        entityType="student"
        isUnblocking={selectedStudent?.status === 'Blocked'}
        canUnblockPermanent={isSuperAdmin()}
        onConfirm={handleBlockConfirm}
      />

      {/* Student Profile Sidebar */}
      {showProfile && selectedStudent && (
        <StudentDashboardPanel
          isOpen={showProfile}
          onClose={() => {
            setShowProfile(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
          dashboardData={dashboardData}
        />
      )}

    </div>
  );
}

function InterviewAppraisalCard({ interview }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm border-l-4 border-l-indigo-500">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <h5 className="font-bold text-slate-800 text-sm font-outfit">{interview.driveTitle}</h5>
          {interview.driveCategory && (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 mt-0.5">
              {interview.driveCategory}
            </p>
          )}
          {interview.date && (
            <p className="text-xs text-slate-500 mt-1">
              {new Date(interview.date).toLocaleString()}
            </p>
          )}
        </div>
        {interview.score && (
          <span className="shrink-0 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 font-outfit">
            {interview.score}
          </span>
        )}
      </div>
      {interview.result && (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Result: <span className="text-slate-700">{interview.result.replace(/_/g, ' ')}</span>
        </p>
      )}
      {interview.remarks && (
        <p className="mt-2 text-xs leading-relaxed text-slate-600">{interview.remarks}</p>
      )}
    </div>
  );
}

// Student Dashboard Panel Component - Similar to Assessment.jsx
const StudentDashboardPanel = ({ isOpen, onClose, student, dashboardData }) => {
  const [currentStudent, setCurrentStudent] = useState(student);
  const [activeTab, setActiveTab] = useState('overview');

  React.useEffect(() => {
    if (dashboardData?.profile) {
      setCurrentStudent({
        ...student,
        ...dashboardData.profile,
        id: dashboardData.profile.id || student?.id,
        program: student?.program || dashboardData.profile.program || dashboardData.education?.[0]?.degree || null,
        branch: student?.branch || dashboardData.profile.branch || dashboardData.education?.[0]?.description || null,
        currentLocation: dashboardData.profile.currentLocation || student?.currentLocation || null,
        placementReadiness: dashboardData.metricsAvailable === false
          ? null
          : (student?.placementReadiness ?? dashboardData.profile.placementReadiness ?? null),
        placementProbability: dashboardData.metricsAvailable === false
          ? null
          : (student?.placementProbability ?? dashboardData.profile.placementProbability ?? null),
        emailVerified: Boolean(
          dashboardData.profile.emailVerified
            ?? student?.emailVerified
            ?? student?.user?.lastLoginAt,
        ),
      });
    } else {
      setCurrentStudent(student);
    }
  }, [student, dashboardData?.profile, dashboardData?.metricsAvailable, dashboardData?.education]);

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

  const profileImageSrc = currentStudent?.profilePhoto || currentStudent?.user?.profilePhoto;

  const getReadinessDisplay = (metric) => {
    const { score, tier } = normalizePlacementMetric(metric);
    if (score == null && !tier) {
      return { text: 'Not Available', class: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    if (score == null && tier) {
      const label = READINESS_TIER_LABELS[tier] || tier;
      const tierClass =
        tier === 'ready'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
          : tier === 'developing'
            ? 'bg-amber-50 text-amber-800 border-amber-100'
            : 'bg-rose-50 text-rose-700 border-rose-100';
      return { text: label, class: tierClass, dotClass: tier === 'ready' ? 'bg-emerald-500' : tier === 'developing' ? 'bg-amber-500' : 'bg-rose-500' };
    }
    const numScore = score;
    if (numScore >= 75) {
      return {
        text: `${numScore}% (Ready)`,
        class: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        dotClass: 'bg-emerald-500',
      };
    } else if (numScore >= 50) {
      return {
        text: `${numScore}% (Developing)`,
        class: 'bg-amber-50 text-amber-800 border-amber-100',
        dotClass: 'bg-amber-500',
      };
    } else {
      return {
        text: `${numScore}% (At Risk)`,
        class: 'bg-rose-50 text-rose-700 border-rose-100',
        dotClass: 'bg-rose-500',
      };
    }
  };

  const getApplicationStatusBadge = (status) => {
    const norm = (status || 'applied').toLowerCase();
    switch (norm) {
      case 'offered':
      case 'offer':
      case 'hired':
        return 'bg-emerald-50 text-emerald-800 border-emerald-100';
      case 'shortlisted':
      case 'selected':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'interviewing':
      case 'interview':
      case 'round 1':
      case 'round 2':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'rejected':
      case 'declined':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const readiness = getReadinessDisplay(
    dashboardData?.metricsAvailable === false ? null : currentStudent?.placementReadiness,
  );
  const funnel = dashboardData?.funnelStats || {
    applied: currentStudent?.statsApplied ?? dashboardData?.applications?.length ?? 0,
    shortlisted: currentStudent?.statsShortlisted ?? 0,
    interviewed: currentStudent?.statsInterviewed ?? 0,
    offers: currentStudent?.statsOffers ?? 0,
  };

  const panel = (
    <>
      <div
        className={`fixed inset-0 bg-slate-900/60 transition-opacity duration-300 z-[9998] ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Student profile"
        className={`fixed inset-y-0 right-0 z-[9999] flex h-dvh max-h-dvh w-full flex-col overflow-hidden border-l border-slate-200/80 bg-slate-50 shadow-2xl transition-transform duration-300 ease-out sm:w-[88vw] md:w-[76vw] lg:w-[62vw] lg:max-w-[58rem] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation Header */}
        <div className="flex-shrink-0 border-b border-slate-100 bg-white/80 px-6 py-6 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {profileImageSrc ? (
                  <img
                    src={profileImageSrc}
                    alt="Profile"
                    className="w-16 h-16 rounded-2xl object-cover shadow-md ring-4 ring-indigo-50"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md flex items-center justify-center text-white font-extrabold text-2xl font-outfit ring-4 ring-indigo-50">
                    {getInitials(currentStudent?.fullName || currentStudent?.email)}
                  </div>
                )}
                <span
                  className={`absolute -bottom-1.5 -right-1.5 border-2 border-white w-4.5 h-4.5 rounded-full ${
                    currentStudent?.status === 'Blocked' ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  title={currentStudent?.status}
                ></span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900 font-outfit">
                    {currentStudent?.fullName || 'Student Name'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Learner
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{currentStudent?.email}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Batch: {currentStudent?.batch || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all active:scale-95"
                title="Close Panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs List */}
          <div className="mt-6 flex items-center gap-1 border-b border-slate-100 overflow-x-auto scrollbar-hide">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'mock', label: 'Mock Interviews', icon: MessageSquare },
              { id: 'assessments', label: 'Assessments', icon: ClipboardList },
              { id: 'applications', label: 'Applications', icon: Briefcase },
              { id: 'skills', label: 'Skills & Projects', icon: Code },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`relative -mb-[2px] flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm transition-all ${
                  activeTab === id
                    ? 'border-indigo-600 font-semibold text-indigo-600'
                    : 'border-transparent font-medium text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 space-y-6 custom-scrollbar">
          {dashboardData.loading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <Loader className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
              <span className="text-slate-500 text-sm font-medium">Fetching details...</span>
            </div>
          ) : dashboardData.error ? (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
              <p className="text-rose-600 text-sm font-medium">{dashboardData.error}</p>
            </div>
          ) : (
            <>
              {/* Overview Tab Content */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
                      <div className="p-3 bg-indigo-500 text-white rounded-xl">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-indigo-700/80 font-medium">Placement Readiness</span>
                        <div className="mt-0.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${readiness.class}`}>
                            {readiness.dotClass && <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${readiness.dotClass}`}></span>}
                            {readiness.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
                      <div className="p-3 bg-emerald-500 text-white rounded-xl">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-emerald-700/80 font-medium">Placement Probability</span>
                        <p className="text-sm font-bold text-emerald-950 font-outfit mt-1">
                          {dashboardData?.metricsAvailable === false
                            ? 'Not Available'
                            : formatPlacementMetricDisplay(
                                currentStudent?.placementProbability,
                                PROBABILITY_TIER_LABELS,
                                'Not Available',
                              )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Academic Details */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
                      <GraduationCap className="w-4.5 h-4.5 text-indigo-500" /> Academic Details
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs block">School</span>
                        <span className="text-slate-800 font-medium">{currentStudent?.school || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block">Center</span>
                        <span className="text-slate-800 font-medium">{currentStudent?.center || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block">Degree / Program</span>
                        <span className="text-slate-800 font-medium">{currentStudent?.program || dashboardData?.education?.[0]?.degree || 'Not Available'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block">CGPA</span>
                        <span className="text-slate-800 font-semibold text-indigo-600">
                          {currentStudent?.cgpa ? `${currentStudent.cgpa} / 10.00` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Funnel Counters */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-4 border-b border-slate-100">
                      <BarChart2 className="w-4.5 h-4.5 text-indigo-500" /> Application Funnel Stats
                    </h3>
                    <div className="grid grid-cols-4 divide-x divide-slate-100 text-center mt-4">
                      <div>
                        <span className="text-2xl font-extrabold text-slate-800 font-outfit">
                          {funnel.applied ?? 0}
                        </span>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mt-1">Applied</p>
                      </div>
                      <div>
                        <span className="text-2xl font-extrabold text-amber-600 font-outfit">
                          {funnel.shortlisted ?? 0}
                        </span>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mt-1">Shortlisted</p>
                      </div>
                      <div>
                        <span className="text-2xl font-extrabold text-indigo-600 font-outfit">
                          {funnel.interviewed ?? 0}
                        </span>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mt-1">Interviewing</p>
                      </div>
                      <div>
                        <span className="text-2xl font-extrabold text-emerald-600 font-outfit">
                          {funnel.offers ?? 0}
                        </span>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mt-1">Offers</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact & General Info */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
                      <Phone className="w-4.5 h-4.5 text-indigo-500" /> Contact & General Info
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs block">Contact Number</span>
                        <span className="text-slate-800 font-medium">{currentStudent?.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block">Location</span>
                        <span className="text-slate-800 font-medium">{currentStudent?.currentLocation || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block">Registration Date</span>
                        <span className="text-slate-800 font-medium">
                          {currentStudent?.createdAt ? new Date(currentStudent.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block">Email Verification</span>
                        <span className={`inline-flex items-center gap-1 font-semibold ${
                          currentStudent?.emailVerified ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          <CheckCircle2 className="w-4 h-4" /> {currentStudent?.emailVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mock Interviews — manual drives with interviewer feedback */}
              {activeTab === 'mock' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <MessageSquare className="w-4.5 h-4.5 text-indigo-500" /> Mock Interview Feedback
                    </h3>
                    <span className="text-xs text-slate-400">
                      Completed: {dashboardData.mockInterviews?.completedCount ?? 0}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Scores and remarks from completed mock interview drives (interviewer-submitted feedback).
                  </p>

                  <div className="space-y-3">
                    {(dashboardData.mockInterviews?.interviews || []).map((interview) => (
                      <InterviewAppraisalCard key={interview.id} interview={interview} />
                    ))}

                    {(!dashboardData.mockInterviews?.interviews ||
                      dashboardData.mockInterviews.interviews.length === 0) && (
                      <p className="text-center py-8 text-sm text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                        No completed mock interviews with feedback yet.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Assessments Tab */}
              {activeTab === 'assessments' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <ClipboardList className="w-4.5 h-4.5 text-indigo-500" /> Assessments
                    </h3>
                    <span className="text-xs text-slate-400">
                      Total: {dashboardData.assessments?.length || 0}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {dashboardData.assessments?.map((session) => (
                      <div key={session.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <h5 className="font-bold text-slate-800 text-sm font-outfit truncate">
                              {session.title}
                            </h5>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {session.type?.replace(/_/g, ' ') || 'Assessment'}
                              {session.difficulty ? ` · ${session.difficulty}` : ''}
                            </p>
                          </div>
                          {session.score != null ? (
                            <span className="shrink-0 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-sm font-bold text-indigo-700">
                              {session.score}%
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
                              {session.status?.replace(/_/g, ' ') || 'Pending'}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-50 pt-2.5 text-[11px] text-slate-400 font-medium">
                          <span>
                            Started:{' '}
                            {session.startTime
                              ? new Date(session.startTime).toLocaleString()
                              : 'N/A'}
                          </span>
                          {session.endTime && (
                            <span>Ended: {new Date(session.endTime).toLocaleString()}</span>
                          )}
                          {session.violationsCount > 0 && (
                            <span className="text-amber-600">
                              Violations: {session.violationsCount}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {(!dashboardData.assessments || dashboardData.assessments.length === 0) && (
                      <p className="text-center py-6 text-sm text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                        No assessment attempts recorded for this student.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Applications Tab Content */}
              {activeTab === 'applications' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Briefcase className="w-4.5 h-4.5 text-indigo-500" /> Active Applications
                    </h3>
                    <span className="text-xs text-slate-400">Total: {dashboardData.applications?.length || 0}</span>
                  </div>

                  <div className="space-y-3">
                    {dashboardData.applications?.map((app) => (
                      <div key={app.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <h5 className="font-bold text-slate-800 text-sm font-outfit">
                              {app.jobTitle || app.job?.jobTitle || app.job?.title || 'Not Available'}
                            </h5>
                            <p className="text-xs text-slate-550 mt-0.5 font-medium">
                              {app.companyName || app.job?.company?.name || 'Not Available'}
                              {app.location || app.job?.location ? ` · ${app.location || app.job?.location}` : ''}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize ${getApplicationStatusBadge(app.status)}`}>
                            {app.status || 'Applied'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-50 text-[11px] text-slate-400 font-medium">
                          <span>
                            Applied on:{' '}
                            {app.appliedDate || app.createdAt
                              ? new Date(app.appliedDate || app.createdAt).toLocaleDateString()
                              : 'Not Available'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {(!dashboardData.applications || dashboardData.applications.length === 0) && (
                      <p className="text-center py-6 text-sm text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                        No applications recorded for this student.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Skills & Projects Content */}
              {activeTab === 'skills' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
                      <CheckCircle2 className="w-4.5 h-4.5 text-indigo-500" /> Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {dashboardData.skills?.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                        >
                          {typeof skill === 'string' ? skill : (skill.name || skill.title)}
                        </span>
                      ))}
                      {(!dashboardData.skills || dashboardData.skills.length === 0) && (
                        <span className="text-slate-400 text-xs font-medium">No verified skills entered.</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Folder className="w-4.5 h-4.5 text-indigo-500" /> Projects
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {dashboardData.projects?.map((proj, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="font-bold text-slate-800 text-sm font-outfit">{proj.title}</h5>
                            {proj.githubLink && (
                              <a
                                href={proj.githubLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-indigo-655 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-medium">{proj.description}</p>
                        </div>
                      ))}
                      {(!dashboardData.projects || dashboardData.projects.length === 0) && (
                        <p className="text-center py-6 text-sm text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                          No projects entered.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer status */}
        <div className="flex-shrink-0 flex items-center gap-1.5 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              currentStudent?.status === 'Blocked' ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          />
          <span className="text-xs font-medium text-slate-500">
            {currentStudent?.status === 'Blocked' ? 'Account blocked' : 'Active'}
          </span>
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
};