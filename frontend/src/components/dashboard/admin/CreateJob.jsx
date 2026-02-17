import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { Calendar, Info, Plus, X, Loader, ChevronsUp, ChevronsDown, ChevronDown, Upload, FileText, CheckCircle, AlertCircle, Building2, Globe, Linkedin, Briefcase, MapPin, Users, GraduationCap, Code2, Award, Mail, Phone, Hash, Clock, User, Archive, Trash2 } from 'lucide-react';
import CustomDropdown from '../../common/CustomDropdown';
import { FaBriefcase, FaLaptop, FaMapMarkerAlt, FaClock, FaExclamationTriangle, FaCalendarAlt, FaDollarSign } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { saveJobDraft, addAnotherPositionDraft, postJob, submitJobForReview, getJob, updateJob } from '../../../services/jobs';
import ExcelUploader from './ExcelUploader'; // Import Excel component
import JDFormatGuide from './JDFormatGuide'; // Import JD Format Guide
import { showSuccess, showError, showWarning, showLoading, replaceLoadingToast, dismissToast } from '../../../utils/toast';

// Utility helpers
const toISOFromDDMMYYYY = (val) => {
  if (!val) return '';
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  const [_, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  // Set to end of day (23:59:59) to ensure the full day is available
  d.setHours(23, 59, 59, 999);
  return isNaN(d.getTime()) ? '' : d.toISOString();
};

const toRoman = (num) => {
  const romanNumerals = [
    { value: 10, symbol: 'X' },
    { value: 9, symbol: 'IX' },
    { value: 5, symbol: 'V' },
    { value: 4, symbol: 'IV' },
    { value: 1, symbol: 'I' }
  ];

  let result = '';
  for (const { value, symbol } of romanNumerals) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
};

const toDDMMYYYY = (date) => {
  try {
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return '';
  }
};

const DRIVE_VENUES = [
  'PW IOI Campus, Bangalore',
  'PW IOI Campus, Noida',
  'PW IOI Campus, Lucknow',
  'PW IOI Campus, Pune',
  'PW IOI Campus, Patna',
  'PW IOI Campus, Indore',
  'Company Premises',
];

export default function CreateJob({ onCreated }) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editJobId = searchParams.get('editJobId');
  const [isEditing, setIsEditing] = useState(!!editJobId);
  const [editingJob, setEditingJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(!!editJobId);
  
  // MANDATORY: Role-based access control - Check authorization immediately
  const userRole = role || user?.role || '';
  const userRoleUpper = userRole.toUpperCase();
  const isStudent = userRoleUpper === 'STUDENT';
  const isAdmin = userRoleUpper === 'ADMIN';
  const isRecruiter = userRoleUpper === 'RECRUITER';
  const canCreateJobs = isAdmin || isRecruiter;

  // MANDATORY: Block unauthorized users immediately on mount - do not render any UI
  useEffect(() => {
    if (!canCreateJobs) {
      console.error('🚫 UNAUTHORIZED ACCESS ATTEMPT - CreateJob component:', {
        userRole,
        userId: user?.id,
        email: user?.email,
        timestamp: new Date().toISOString(),
      });

      // Show error message
      showError('Access Denied: Only ADMIN or RECRUITER users can create jobs.');

      // Redirect immediately - do not render any UI
      if (isStudent) {
        navigate('/student', { replace: true });
      } else {
        navigate('/admin?tab=dashboard', { replace: true });
      }
    }
  }, [canCreateJobs, isStudent, userRole, user, navigate]);

  // EARLY RETURN: Do not render anything if unauthorized
  if (!canCreateJobs) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only ADMIN or RECRUITER users can create jobs.</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  const [posting, setPosting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Creation method state - controls the three options
  const [creationMethod, setCreationMethod] = useState('manual');

  // File upload states for JD parsing
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const fileInputRef = useRef(null);

  // Dropdown states for all custom dropdowns
  const [showVenues, setShowVenues] = useState(false);
  const [showJobTypes, setShowJobTypes] = useState(false);
  const [showWorkModes, setShowWorkModes] = useState(false);
  const [showGapAllowed, setShowGapAllowed] = useState(false);
  const [showBacklogs, setShowBacklogs] = useState(false);

  // Refs for all dropdowns
  const hiddenDateRef = useRef(null);
  const venueDropdownRef = useRef(null);
  const jobTypeDropdownRef = useRef(null);
  const workModeDropdownRef = useRef(null);
  const gapAllowedDropdownRef = useRef(null);
  const backlogsDropdownRef = useRef(null);

  const [websiteError, setWebsiteError] = useState('');
  const [linkedinError, setLinkedinError] = useState('');
  const [recruiterEmailError, setRecruiterEmailError] = useState('');
  const [stipendError, setStipendError] = useState('');
  const [durationError, setDurationError] = useState('');
  const [salaryError, setSalaryError] = useState('');
  const [companyLocationError, setCompanyLocationError] = useState('');
  const [minCgpaError, setMinCgpaError] = useState('');
  const [savedPositions, setSavedPositions] = useState([]);
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  const [gapInputMode, setGapInputMode] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState({ serviceAgreement: false, blockingPeriod: false });
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [showDraftsPanel, setShowDraftsPanel] = useState(false);

  // Load drafts on mount (component only renders if authorized)
  useEffect(() => {
    loadDrafts();
  }, []);

  // Load job for editing when editJobId is present
  useEffect(() => {
    const loadJobForEditing = async () => {
      if (!editJobId || !canCreateJobs) return;
      
      try {
        setLoadingJob(true);
        const job = await getJob(editJobId);
        const jobData = job?.data || job;
        
        if (!jobData) {
          showError('Job not found');
          navigate('/admin?tab=manageJobs');
          return;
        }

        setEditingJob(jobData);
        
        // Populate form with job data
        const driveDate = jobData.driveDate ? (
          typeof jobData.driveDate === 'object' && jobData.driveDate.toMillis
            ? new Date(jobData.driveDate.toMillis())
            : new Date(jobData.driveDate)
        ) : null;
        
        const applicationDeadline = jobData.applicationDeadline ? (
          typeof jobData.applicationDeadline === 'object' && jobData.applicationDeadline.toMillis
            ? new Date(jobData.applicationDeadline.toMillis())
            : new Date(jobData.applicationDeadline)
        ) : null;

        const updates = {
          company: jobData.companyName || jobData.company?.name || jobData.company || '',
          website: jobData.website || jobData.company?.website || '',
          linkedin: jobData.linkedin || jobData.company?.linkedin || '',
          recruiterEmails: Array.isArray(jobData.recruiterEmails) && jobData.recruiterEmails.length > 0 
            ? jobData.recruiterEmails 
            : [{ email: '', name: '' }],
          jobType: jobData.jobType || '',
          stipend: jobData.stipend || '',
          duration: jobData.duration || '',
          salary: jobData.salary || jobData.ctc || jobData.salaryRange || '',
          jobTitle: jobData.jobTitle || jobData.title || '',
          workMode: jobData.workMode || '',
          companyLocation: jobData.companyLocation || jobData.location || '',
          openings: jobData.openings?.toString() || '',
          responsibilities: jobData.description || jobData.responsibilities || '',
          spocs: Array.isArray(jobData.spocs) && jobData.spocs.length > 0 
            ? jobData.spocs 
            : [{ fullName: '', email: '', phone: '' }],
          driveDateText: driveDate ? toDDMMYYYY(driveDate.toISOString()) : '',
          driveDateISO: driveDate ? driveDate.toISOString() : '',
          driveDateNotDecided: !driveDate,
          applicationDeadlineText: applicationDeadline ? toDDMMYYYY(applicationDeadline.toISOString()) : '',
          applicationDeadlineISO: applicationDeadline ? applicationDeadline.toISOString() : '',
          driveVenues: Array.isArray(jobData.driveVenues) ? jobData.driveVenues : [],
          reportingTime: jobData.reportingTime || '',
          qualification: jobData.qualification || '',
          specialization: jobData.specialization || '',
          yop: jobData.yop || '',
          minCgpa: jobData.minCgpa || jobData.cgpaRequirement || '',
          skillsInput: '',
          skills: Array.isArray(jobData.requiredSkills) ? jobData.requiredSkills : 
            (typeof jobData.requiredSkills === 'string' ? JSON.parse(jobData.requiredSkills || '[]') : 
            (Array.isArray(jobData.skills) ? jobData.skills : [])),
          gapAllowed: jobData.gapAllowed || '',
          gapYears: jobData.gapYears || '',
          backlogs: jobData.backlogs || '',
          serviceAgreement: jobData.serviceAgreement || '',
          blockingPeriod: jobData.blockingPeriod || '',
          baseRoundDetails: jobData.baseRoundDetails || ['', '', ''],
          extraRounds: jobData.extraRounds || [],
          instructions: jobData.instructions || '',
          requiresScreening: jobData.requiresScreening || false,
          requiresTest: jobData.requiresTest || false,
        };

        setDriveDraft({
          driveDateText: updates.driveDateText,
          driveDateISO: updates.driveDateISO,
          applicationDeadlineText: updates.applicationDeadlineText,
          applicationDeadlineISO: updates.applicationDeadlineISO,
          driveVenues: updates.driveVenues,
          reportingTime: updates.reportingTime,
        });

        setForm(updates);
        setCreationMethod('manual');
        showSuccess('Job loaded for editing');
      } catch (error) {
        console.error('Error loading job for editing:', error);
        showError('Failed to load job for editing');
        navigate('/admin?tab=manageJobs');
      } finally {
        setLoadingJob(false);
      }
    };

    loadJobForEditing();
  }, [editJobId, canCreateJobs]);

  // Load drafts from localStorage
  const loadDrafts = () => {
    try {
      const drafts = JSON.parse(localStorage.getItem('jobDrafts') || '[]');
      // Sort by most recent first
      const sortedDrafts = drafts.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      setSavedDrafts(sortedDrafts);
    } catch (error) {
      console.error('Error loading drafts:', error);
      setSavedDrafts([]);
    }
  };

  // Load a draft into the form
  const loadDraft = (draft) => {
    try {
      // Populate form fields from draft
      const updates = {
        company: draft.company || '',
        website: draft.website || '',
        linkedin: draft.linkedin || '',
        recruiterEmails: draft.recruiterEmails || [{ email: '', name: '' }],
        jobType: draft.jobType || '',
        stipend: draft.stipend || '',
        duration: draft.duration || '',
        salary: draft.salary || '',
        jobTitle: draft.jobTitle || '',
        workMode: draft.workMode || '',
        companyLocation: draft.companyLocation || '',
        openings: draft.openings || '',
        responsibilities: draft.responsibilities || draft.description || '',
        spocs: draft.spocs || [{ fullName: '', email: '', phone: '' }],
        driveDateText: draft.driveDateText || '',
        driveDateISO: draft.driveDateISO || '',
        applicationDeadlineText: draft.applicationDeadlineText || '',
        applicationDeadlineISO: draft.applicationDeadlineISO || '',
        driveVenues: Array.isArray(draft.driveVenues) ? draft.driveVenues : [],
        reportingTime: draft.reportingTime || '',
        qualification: draft.qualification || '',
        specialization: draft.specialization || '',
        yop: draft.yop || '',
        minCgpa: draft.minCgpa || '',
        skillsInput: '',
        skills: Array.isArray(draft.skills) ? draft.skills : (Array.isArray(draft.requiredSkills) ? draft.requiredSkills : []),
        gapAllowed: draft.gapAllowed || '',
        gapYears: draft.gapYears || '',
        backlogs: draft.backlogs || '',
        serviceAgreement: draft.serviceAgreement || '',
        blockingPeriod: draft.blockingPeriod || '',
        baseRoundDetails: draft.baseRoundDetails || ['', '', ''],
        extraRounds: draft.extraRounds || [],
        instructions: draft.instructions || '',
        requiresScreening: draft.requiresScreening || false,
        requiresTest: draft.requiresTest || false,
      };

      // Update drive draft
      setDriveDraft({
        driveDateText: updates.driveDateText,
        driveDateISO: updates.driveDateISO,
        applicationDeadlineText: updates.applicationDeadlineText,
        applicationDeadlineISO: updates.applicationDeadlineISO,
        driveVenues: updates.driveVenues,
        reportingTime: updates.reportingTime,
      });

      // Update form
      setForm(updates);
      
      // Switch to manual entry method
      setCreationMethod('manual');
      
      // Close drafts panel
      setShowDraftsPanel(false);
      
      showSuccess('Draft loaded successfully!');
    } catch (error) {
      console.error('Error loading draft:', error);
      showError('Failed to load draft. Please try again.');
    }
  };

  // Delete a draft
  const deleteDraft = (draftId) => {
    try {
      const drafts = JSON.parse(localStorage.getItem('jobDrafts') || '[]');
      const filteredDrafts = drafts.filter(d => d.draftId !== draftId);
      localStorage.setItem('jobDrafts', JSON.stringify(filteredDrafts));
      setSavedDrafts(filteredDrafts);
      showSuccess('Draft deleted successfully!');
    } catch (error) {
      console.error('Error deleting draft:', error);
      showError('Failed to delete draft. Please try again.');
    }
  };

  // Enhanced useEffect for click outside detection for all dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (venueDropdownRef.current && !venueDropdownRef.current.contains(event.target)) {
        setShowVenues(false);
      }
      if (jobTypeDropdownRef.current && !jobTypeDropdownRef.current.contains(event.target)) {
        setShowJobTypes(false);
      }
      if (workModeDropdownRef.current && !workModeDropdownRef.current.contains(event.target)) {
        setShowWorkModes(false);
      }
      if (gapAllowedDropdownRef.current && !gapAllowedDropdownRef.current.contains(event.target)) {
        setShowGapAllowed(false);
      }
      if (backlogsDropdownRef.current && !backlogsDropdownRef.current.contains(event.target)) {
        setShowBacklogs(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // Form state
  const [form, setForm] = useState({
    company: '',
    website: '',
    linkedin: '',
    recruiterEmails: [{ email: '', name: '' }], // Array of recruiter/HR contacts: [{ email, name }]
    jobType: '',
    stipend: '',
    duration: '',
    salary: '',
    jobTitle: '',
    workMode: '',
    companyLocation: '',
    openings: '',
    responsibilities: '',
    spocs: [{ fullName: '', email: '', phone: '' }],
    driveDateText: '',
    driveDateISO: '',
    driveDateNotDecided: false,
    applicationDeadlineText: '',
    applicationDeadlineISO: '',
    driveVenues: [],
    reportingTime: '',
    qualification: '',
    specialization: '',
    yop: '',
    minCgpa: '',
    skillsInput: '',
    skills: [],
    gapAllowed: '',
    gapYears: '',
    backlogs: '',
    serviceAgreement: '',
    blockingPeriod: '',
    baseRoundDetails: ['', '', ''],
    extraRounds: [],
    instructions: '',
    // Pre-Interview Requirements
    requiresScreening: false,
    requiresTest: false,
  });

  // Local draft for About Drive section
  const [driveDraft, setDriveDraft] = useState({
    driveDateText: '',
    driveDateISO: '',
    applicationDeadlineText: '',
    applicationDeadlineISO: '',
    driveVenues: [],
    reportingTime: '',
  });

  // Handle JD file upload (PDF/DOC parsing)
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a PDF or Word document.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setParseResult(null);

    try {
      console.log('📄 Starting real JD parsing for:', file.name);
      
      // Import and use the real JD parser service
      const { parseJobDescription } = await import('../../../services/jdParser');
      const parseResult = await parseJobDescription(file);
      
      console.log('JD parsing result:', parseResult);

      if (parseResult.success && parseResult.data) {
        setParseResult(parseResult);
        populateFormFromParsedData(parseResult.data);
        setCreationMethod('manual');
        console.log('JD parsing completed successfully');
      } else {
        setUploadError(parseResult.error || 'Failed to parse the document. Please try manual entry.');
        console.error('JD parsing failed:', parseResult.error);
      }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during parsing. Please try again.';
      setUploadError(errorMessage);
      console.error('JD parsing error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Enhanced Excel data callback handlers
  const handleExcelJobSelected = (jobData) => {
    populateFormWithExcelData(jobData);
    setCreationMethod('manual'); // Switch back to manual after loading data
  };

  // Capitalize job title - first letter of each word
  const capitalizeJobTitle = (title) => {
    if (!title || !title.trim()) return title;
    return title
      .split(' ')
      .map(word => {
        if (!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Handle Excel bulk processing
  const handleExcelBulkUpload = async (results) => {
    console.log('Excel processing results:', results);
    
    const { totalJobs, successfulJobs, failedJobs } = results;
    
    if (successfulJobs.length > 0) {
      const successMessage = `Successfully created ${successfulJobs.length} job${successfulJobs.length > 1 ? 's' : ''} from Excel file!`;
      const failureMessage = failedJobs.length > 0 ? `\n⚠️ ${failedJobs.length} job${failedJobs.length > 1 ? 's' : ''} failed to process.` : '';
      
      alert(successMessage + failureMessage);
      
      // Trigger any parent callbacks
      if (onCreated) onCreated();
    } else {
      alert(`❌ No jobs were successfully created from the Excel file. Please check the format and try again.`);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length) {
      if (creationMethod === 'uploadJD') {
        fileInputRef.current.files = files;
        handleFileUpload({ target: { files } });
      }
    }
  };
  
  const populateFormFromParsedData = (data) => {
    const updates = {};

    // Map parser fields to form fields
    if (data.jobTitle || data.title) {
      const title = data.jobTitle || data.title;
      updates.jobTitle = capitalizeJobTitle(title);
    }
    if (data.company) updates.company = data.company;
    if (data.companyLocation || data.location) updates.companyLocation = data.companyLocation || data.location;
    if (data.responsibilities || data.description) updates.responsibilities = data.responsibilities || data.description;
    if (data.salary) updates.salary = data.salary;
    if (data.workMode) updates.workMode = data.workMode;
    if (data.website) updates.website = data.website;
    if (data.linkedin) updates.linkedin = data.linkedin;
    if (data.skills || data.skillsRequired) {
      updates.skills = Array.isArray(data.skills) ? data.skills : 
                       Array.isArray(data.skillsRequired) ? data.skillsRequired : 
                       [];
    }
    
    // Map additional fields if available
    if (data.jobType) updates.jobType = data.jobType;
    if (data.experience || data.experienceRequired) {
      // Could map to a field if needed
    }

    update(updates);
  };

  // ENHANCED: Complete form population function for Excel data
  const populateFormWithExcelData = (jobData) => {
    const updates = {};
    
    console.log('🔄 Populating form with Excel data:', jobData);

    // === SECTION 1: COMPANY DETAILS ===
    if (jobData.jobTitle) updates.jobTitle = capitalizeJobTitle(jobData.jobTitle);
    if (jobData.company) updates.company = jobData.company;
    if (jobData.companyLocation) updates.companyLocation = jobData.companyLocation;
    if (jobData.website) updates.website = jobData.website;
    if (jobData.linkedin) updates.linkedin = jobData.linkedin;
    if (jobData.jobType) updates.jobType = jobData.jobType;
    if (jobData.workMode) updates.workMode = jobData.workMode;
    if (jobData.salary) updates.salary = jobData.salary;
    if (jobData.stipend) updates.stipend = jobData.stipend;
    if (jobData.duration) updates.duration = jobData.duration;
    if (jobData.openings) updates.openings = jobData.openings;
    if (jobData.responsibilities) updates.responsibilities = jobData.responsibilities;
    
    // === SECTION 2: DRIVE INFORMATION ===
    if (jobData.driveDate) {
      const dateStr = jobData.driveDate;
      if (dateStr.includes('/')) {
        updates.driveDateText = dateStr;
        updates.driveDateISO = toISOFromDDMMYYYY(dateStr);
      }
      updates.driveDateNotDecided = false;
    } else {
      updates.driveDateNotDecided = true;
      updates.driveDateText = '';
      updates.driveDateISO = '';
    }
    
    if (jobData.driveVenue) {
      // Handle multiple venues (comma-separated)
      const venues = jobData.driveVenue.split(',').map(v => v.trim());
      updates.driveVenues = venues;
      
      // Update the driveDraft as well
      setDriveDraft(prev => ({
        ...prev,
        driveVenues: venues,
        driveDateText: updates.driveDateText || '',
        driveDateISO: updates.driveDateISO || ''
      }));
    }

    // === SECTION 3: SKILLS & ELIGIBILITY ===  
    if (jobData.qualifications) updates.qualification = jobData.qualifications;
    if (jobData.specialization) updates.specialization = jobData.specialization;
    if (jobData.yop) updates.yop = jobData.yop;
    if (jobData.minCgpa) updates.minCgpa = jobData.minCgpa;
    if (jobData.skills) updates.skills = Array.isArray(jobData.skills) ? jobData.skills : [];
    if (jobData.gapAllowed) updates.gapAllowed = jobData.gapAllowed;
    if (jobData.gapYears) updates.gapYears = jobData.gapYears;
    if (jobData.backlogs) updates.backlogs = jobData.backlogs;

    // === SECTION 4: INTERVIEW PROCESS ===
    const rounds = ['', '', ''];
    if (jobData.round1) rounds[0] = jobData.round1;
    if (jobData.round2) rounds[1] = jobData.round2;
    if (jobData.round3) rounds[2] = jobData.round3;
    
    // Update base rounds
    updates.baseRoundDetails = rounds;
    
    // Handle 4th round as extra round
    if (jobData.round4) {
      updates.extraRounds = [{
        title: 'IV Round',
        detail: jobData.round4
      }];
    }
    
    if (jobData.serviceAgreement) updates.serviceAgreement = jobData.serviceAgreement;
    if (jobData.blockingPeriod) updates.blockingPeriod = jobData.blockingPeriod;

    // === SECTION 5: ADDITIONAL INFORMATION ===
    if (jobData.description) {
      // Use description as responsibilities if no responsibilities provided
      if (!jobData.responsibilities) {
        updates.responsibilities = jobData.description;
      }
    }
    
    if (jobData.requirements) {
      // Combine with existing responsibilities if any
      const existing = updates.responsibilities || '';
      updates.responsibilities = existing ? `${existing}\n\nRequirements:\n${jobData.requirements}` : jobData.requirements;
    }
    
    if (jobData.instructions) updates.instructions = jobData.instructions;

    // === COMPANY SPOC INFORMATION ===
    if (jobData.contactPerson || jobData.contactEmail || jobData.contactPhone) {
      updates.spocs = [{
        fullName: jobData.contactPerson || '',
        email: jobData.contactEmail || '',
        phone: jobData.contactPhone || ''
      }];
    }

    console.log('✅ Form updates to be applied:', updates);
    update(updates);
  };

  // All existing completion checks
  const isCompanyDetailsComplete = useMemo(() => {
    // Check if at least one recruiter email is provided and valid
    const recruiterEmailsArray = Array.isArray(form.recruiterEmails) ? form.recruiterEmails : [];
    const hasValidRecruiterEmail = recruiterEmailsArray.length > 0 && 
      recruiterEmailsArray.some(rec => {
        const email = rec?.email?.trim();
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      });
    
    // Base required fields: company, jobTitle, companyLocation, website, linkedin, workMode, jobType, recruiterEmails
    const base = form.company?.trim() && 
                 form.jobTitle?.trim() && 
                 form.companyLocation?.trim() && 
                 form.website?.trim() && 
                 form.linkedin?.trim() && 
                 form.workMode?.trim() && 
                 form.workMode !== '' && 
                 form.jobType?.trim() && 
                 form.jobType !== '' && 
                 hasValidRecruiterEmail &&
                 form.responsibilities?.trim(); // Add responsibilities requirement
    
    // Conditional requirement based on job type
    const comp = form.jobType === 'Internship'
      ? form.stipend?.trim() && form.duration?.trim() // For internships, stipend is required (free text) along with duration
      : form.jobType === 'Full-Time' ? form.salary?.trim() : false;
    
    // Validation checks (format/error checks)
    const websiteOk = !form.website?.trim() || isValidUrl(form.website.trim());
    const linkedinOk = !form.linkedin?.trim() || isValidLinkedInUrl(form.linkedin.trim());
    const recruiterEmailOk = hasValidRecruiterEmail && !recruiterEmailError;
    const stipendOk = !form.stipend?.trim() || !stipendError;
    const durationOk = !form.duration?.trim() || !durationError;
    const salaryOk = !form.salary?.trim() || !salaryError;
    const locationOk = !form.companyLocation?.trim() || !companyLocationError;
    
    return !!(base && comp && websiteOk && linkedinOk && recruiterEmailOk && stipendOk && durationOk && salaryOk && locationOk);
  }, [form, websiteError, linkedinError, recruiterEmailError, stipendError, durationError, salaryError, companyLocationError]);

  const isDriveDetailsComplete = useMemo(() => {
    const hasDriveDate = !!(form.driveDateISO || driveDraft.driveDateISO || toISOFromDDMMYYYY(form.driveDateText) || toISOFromDDMMYYYY(driveDraft.driveDateText));
    const hasApplicationDeadline = !!(form.applicationDeadlineISO || driveDraft.applicationDeadlineISO || toISOFromDDMMYYYY(form.applicationDeadlineText) || toISOFromDDMMYYYY(driveDraft.applicationDeadlineText));
    const hasVenues = (form.driveVenues?.length > 0) || (driveDraft.driveVenues?.length > 0);
    // Drive date is either "not decided" (TBD) or a specific date
    const driveDateOk = form.driveDateNotDecided || hasDriveDate;
    return driveDateOk && hasApplicationDeadline && hasVenues;
  }, [form.driveDateISO, form.driveDateText, form.driveDateNotDecided, form.applicationDeadlineISO, form.applicationDeadlineText, form.driveVenues, driveDraft.driveDateISO, driveDraft.driveDateText, driveDraft.applicationDeadlineISO, driveDraft.applicationDeadlineText, driveDraft.driveVenues]);

  const isSkillsEligibilityComplete = useMemo(() => {
    return form.qualification?.trim() && form.yop?.trim() && form.minCgpa?.trim() && form.skills.length > 0 && form.gapAllowed?.trim() && form.gapAllowed !== '' && form.backlogs?.trim() && form.backlogs !== '' && !minCgpaError;
  }, [form.qualification, form.yop, form.minCgpa, form.skills, form.gapAllowed, form.backlogs, minCgpaError]);

  const isInterviewProcessComplete = useMemo(() => {
    return form.baseRoundDetails && form.baseRoundDetails.length >= 3 &&
      form.baseRoundDetails[0]?.trim() && form.baseRoundDetails[1]?.trim() && form.baseRoundDetails[2]?.trim();
  }, [form.baseRoundDetails]);

  const canPost = useMemo(() => {
    return isCompanyDetailsComplete && isDriveDetailsComplete && isSkillsEligibilityComplete && isInterviewProcessComplete;
  }, [isCompanyDetailsComplete, isDriveDetailsComplete, isSkillsEligibilityComplete, isInterviewProcessComplete]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  // All validation functions
  function isValidUrl(value) {
    if (!value) return true;
    if (value.startsWith('www.') && value.includes('.')) {
      return true;
    }
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function isValidLinkedInUrl(value) {
    if (!value) return true;
    const linkedinRegex = /(https?)?:?(\/\/)?((w{3}||[\w\w])\.)?linkedin\.com(\w+:{0,1}\w*@)?(\S+)(:([0-9])+)?(\/|\/[\w#!:.?+=&%@!\-\/])?/;
    return linkedinRegex.test(value);
  }

  function isValidNumeric(value) {
    return /^\d+$/.test(value);
  }

  function isValidAlphabetic(value) {
    return /^[a-zA-Z\s,.-]+$/.test(value);
  }

  // All input handlers
  const onWebsiteChange = (value) => {
    update({ website: value });
    if (!value) {
      setWebsiteError('');
      return;
    }
    setWebsiteError(isValidUrl(value) ? '' : 'Enter a valid URL (www.example.com or https://example.com)');
  };

  const onLinkedInChange = (value) => {
    update({ linkedin: value });
    if (!value) {
      setLinkedinError('');
      return;
    }
    setLinkedinError(isValidLinkedInUrl(value) ? '' : 'Enter a valid LinkedIn URL (e.g. https://linkedin.com/company/example)');
  };

  const onStipendChange = (value) => {
    update({ stipend: value });
    setStipendError('');
  };

  const onDurationChange = (value) => {
    const durationRegex = /^[\d\s]*(months?|years?|weeks?|days?)?$/i;
    if (value === '' || durationRegex.test(value)) {
      update({ duration: value });
      setDurationError('');
    } else {
      setDurationError('Please enter valid duration (e.g. 6 months)');
    }
  };

  const onSalaryChange = (value) => {
    update({ salary: value });
    setSalaryError('');
  };

  const onCompanyLocationChange = (value) => {
    if (value === '' || isValidAlphabetic(value)) {
      update({ companyLocation: value });
      setCompanyLocationError('');
    } else {
      setCompanyLocationError('Please enter the location');
    }
  };

  const onRecruiterEmailChange = (index, value) => {
    const recruiterEmailsArray = Array.isArray(form.recruiterEmails) ? form.recruiterEmails : [{ email: '', name: '' }];
    const updated = [...recruiterEmailsArray];
    updated[index] = { ...updated[index], email: value };
    update({ recruiterEmails: updated });
    
    // Validate email
    if (!value) {
      setRecruiterEmailError('');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setRecruiterEmailError(emailRegex.test(value) ? '' : 'Please enter a valid email address');
  };

  const onRecruiterNameChange = (index, value) => {
    const recruiterEmailsArray = Array.isArray(form.recruiterEmails) ? form.recruiterEmails : [{ email: '', name: '' }];
    const updated = [...recruiterEmailsArray];
    updated[index] = { ...updated[index], name: value };
    update({ recruiterEmails: updated });
  };

  const addRecruiterEmail = () => {
    const recruiterEmailsArray = Array.isArray(form.recruiterEmails) ? form.recruiterEmails : [{ email: '', name: '' }];
    update({ recruiterEmails: [...recruiterEmailsArray, { email: '', name: '' }] });
  };

  const removeRecruiterEmail = (index) => {
    const recruiterEmailsArray = Array.isArray(form.recruiterEmails) ? form.recruiterEmails : [{ email: '', name: '' }];
    if (recruiterEmailsArray.length > 1) {
      const updated = recruiterEmailsArray.filter((_, i) => i !== index);
      update({ recruiterEmails: updated });
    } else {
      showWarning('At least one recruiter email is required');
    }
  };

  const onYopChange = (value) => {
    if (/^\d{0,4}$/.test(value)) {
      update({ yop: value });
    }
  };

  const onMinCgpaChange = (value) => {
    update({ minCgpa: value });
    setMinCgpaError('');
  };

  const onMinCgpaBlur = (value) => {
    if (!value.trim()) {
      setMinCgpaError('');
      return;
    }

    const trimmed = value.trim();
    if (trimmed.endsWith('%')) {
      const numVal = parseFloat(trimmed.slice(0, -1));
      if (isNaN(numVal) || numVal < 0 || numVal > 100) {
        setMinCgpaError('Percentage must be between 0 and 100');
      } else {
        setMinCgpaError('');
      }
    } else {
      const numVal = parseFloat(trimmed);
      if (isNaN(numVal) || numVal < 0 || numVal > 10) {
        setMinCgpaError('CGPA must be between 0 and 10');
      } else {
        setMinCgpaError('');
      }
    }
  };

  const onJobTitleChange = (value) => {
    update({ jobTitle: value });
  };

  const onJobTitleBlur = (value) => {
    const capitalized = capitalizeJobTitle(value);
    update({ jobTitle: capitalized });
  };

  const onJobTypeChange = (val) => {
    update({ jobType: val });
  };

  const onSkillsKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = form.skillsInput?.trim().replace(/,$/, '') || '';
      if (!value) return;
      const pieces = value
        .split(',')
        .map((s) => s?.trim())
        .filter(Boolean);
      update({ skills: Array.from(new Set([...form.skills, ...pieces])), skillsInput: '' });
    }
  };

  const removeSkill = (idx) => {
    const next = [...form.skills];
    next.splice(idx, 1);
    update({ skills: next });
  };

  const addRound = () => {
    const count = form.extraRounds.length + 4;
    const romanNumeral = toRoman(count);
    update({ extraRounds: [...form.extraRounds, { title: `${romanNumeral} Round`, detail: '' }] });
  };

  const removeExtraRound = (idx) => {
    const next = [...form.extraRounds];
    next.splice(idx, 1);
    const updatedRounds = next.map((round, index) => ({
      ...round,
      title: `${toRoman(index + 4)} Round`
    }));
    update({ extraRounds: updatedRounds });
  };

  const updateBaseRoundDetail = (idx, val) => {
    const next = [...form.baseRoundDetails];
    next[idx] = val;
    update({ baseRoundDetails: next });
  };

  const updateExtraRoundDetail = (idx, val) => {
    const next = [...form.extraRounds];
    next[idx] = { ...next[idx], detail: val };
    update({ extraRounds: next });
  };

  // SPOC management functions
  const addSpoc = () => {
    const spocsArray = Array.isArray(form.spocs) ? form.spocs : [{ fullName: '', email: '', phone: '' }];
    update({ spocs: [...spocsArray, { fullName: '', email: '', phone: '' }] });
  };

  const removeSpoc = (idx) => {
    const spocsArray = Array.isArray(form.spocs) ? form.spocs : [{ fullName: '', email: '', phone: '' }];
    if (spocsArray.length > 1) {
      const next = [...spocsArray];
      next.splice(idx, 1);
      update({ spocs: next });
    }
  };

  const updateSpoc = (idx, field, value) => {
    const spocsArray = Array.isArray(form.spocs) ? form.spocs : [{ fullName: '', email: '', phone: '' }];
    const next = [...spocsArray];
    if (field === 'phone') {
      if (!/^[0-9]*$/.test(value) || value.length > 10) {
        return;
      }
    }
    next[idx] = { ...next[idx], [field]: value };
    update({ spocs: next });
  };

  const onPickDate = (e) => {
    const iso = e.target.value ? new Date(e.target.value).toISOString() : '';
    const text = e.target.value ? toDDMMYYYY(e.target.value) : '';
    setDriveDraft((d) => ({ ...d, driveDateISO: iso, driveDateText: text }));
    update({ driveDateISO: iso, driveDateText: text });
  };

  const onDriveDateText = (val) => {
    const iso = toISOFromDDMMYYYY(val);
    setDriveDraft((d) => ({ ...d, driveDateText: val, driveDateISO: iso }));
    update({ driveDateText: val, driveDateISO: iso });
  };

  const toggleVenue = (venue) => {
    const selected = new Set(driveDraft.driveVenues);
    if (selected.has(venue)) selected.delete(venue);
    else selected.add(venue);
    const arr = Array.from(selected);
    setDriveDraft((d) => ({ ...d, driveVenues: arr }));
    update({ driveVenues: arr });
  };

  const toggleSection = (sectionId) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const isSectionCollapsed = (sectionId) => collapsedSections.has(sectionId);

  // Form management functions
  const resetForm = (keep = {}) => {
    setForm((f) => ({
      company: keep.company ?? '',
      website: keep.website ?? '',
      linkedin: keep.linkedin ?? '',
      recruiterEmails: keep.recruiterEmails && Array.isArray(keep.recruiterEmails) && keep.recruiterEmails.length > 0 
        ? keep.recruiterEmails 
        : (keep.recruiterEmail ? [{ email: keep.recruiterEmail, name: keep.recruiterName || '' }] : [{ email: '', name: '' }]),
      jobType: '',
      stipend: '',
      duration: '',
      salary: '',
      jobTitle: '',
      workMode: '',
      companyLocation: keep.companyLocation ?? '',
      openings: '',
      responsibilities: '',
      spocs: [{ fullName: '', email: '', phone: '' }],
      driveDateText: '',
      driveDateISO: '',
      applicationDeadlineText: '',
      applicationDeadlineISO: '',
      driveVenues: [],
      qualification: '',
      specialization: '',
      yop: '',
      minCgpa: '',
      skillsInput: '',
      skills: [],
      gapAllowed: '',
      gapYears: '',
      backlogs: '',
      serviceAgreement: keep.serviceAgreement ?? '',
      blockingPeriod: '',
      baseRoundDetails: ['', '', ''],
      extraRounds: [],
      instructions: '',
    }));

    setDriveDraft({
      driveDateText: '',
      driveDateISO: '',
      applicationDeadlineText: '',
      applicationDeadlineISO: '',
      driveVenues: [],
    });

    setParseResult(null);
    setUploadError('');
  };

  const buildJobPayload = () => {
    // Ensure required fields are not empty strings
    const companyName = (form.company || '').trim();
    const description = (form.responsibilities || '').trim();
    const jobTitle = capitalizeJobTitle((form.jobTitle || '').trim());
    const requiredSkills = Array.isArray(form.skills) ? form.skills : [];
    
    // Validate required fields before building payload
    if (!companyName) {
      throw new Error('Company name is required');
    }
    if (!description) {
      throw new Error('Job description/responsibilities is required');
    }
    if (!jobTitle) {
      throw new Error('Job title is required');
    }
    
    return {
      // Company fields - send both for compatibility
      company: companyName,
      companyName: companyName, // Also send as companyName for backend validation
      website: form.website || '',
      linkedin: form.linkedin || '',
      companyLocation: form.companyLocation || '',
      // Recruiter/HR contacts (REQUIRED - at least one)
      recruiterEmails: Array.isArray(form.recruiterEmails) ? form.recruiterEmails : [{ email: '', name: '' }],
      // Job details
      jobType: form.jobType || '',
      stipend: form.stipend || '',
      duration: form.duration || '',
      salary: form.salary || '',
      jobTitle: jobTitle,
      workMode: form.workMode || '',
      openings: form.openings || '',
      // Description fields - send both for compatibility
      responsibilities: description,
      description: description, // Also send as description for backend validation
      // Skills and eligibility
      skills: requiredSkills,
      requiredSkills: requiredSkills, // Also send as requiredSkills for backend (must be array)
      qualification: form.qualification || '',
      specialization: form.specialization || '',
      yop: form.yop || '',
      minCgpa: form.minCgpa || '',
      gapAllowed: form.gapAllowed || '',
      gapYears: form.gapYears || '',
      backlogs: form.backlogs || '',
      // Drive details - drive date optional (null = "TBD")
      driveDate: form.driveDateNotDecided ? null : (form.driveDateISO || driveDraft.driveDateISO || toISOFromDDMMYYYY(form.driveDateText) || toISOFromDDMMYYYY(driveDraft.driveDateText) || null),
      applicationDeadline: form.applicationDeadlineISO || driveDraft.applicationDeadlineISO || toISOFromDDMMYYYY(form.applicationDeadlineText) || toISOFromDDMMYYYY(driveDraft.applicationDeadlineText) || null,
      driveVenues: (Array.isArray(form.driveVenues) && form.driveVenues.length > 0) ? form.driveVenues : (Array.isArray(driveDraft.driveVenues) ? driveDraft.driveVenues : []),
      reportingTime: (form.reportingTime || driveDraft.reportingTime || '').trim() || null,
      // Pre-Interview Requirements
      requiresScreening: form.requiresScreening || false,
      requiresTest: form.requiresTest || false,
      // Interview process
      interviewRounds: [
        { title: `${toRoman(1)} Round`, detail: form.baseRoundDetails[0] || '' },
        { title: `${toRoman(2)} Round`, detail: form.baseRoundDetails[1] || '' },
        { title: `${toRoman(3)} Round`, detail: form.baseRoundDetails[2] || '' },
        ...(Array.isArray(form.extraRounds) ? form.extraRounds : []),
      ],
      // Additional fields
      spocs: Array.isArray(form.spocs) ? form.spocs : [],
      serviceAgreement: form.serviceAgreement || '',
      blockingPeriod: form.blockingPeriod || '',
      instructions: form.instructions || '',
      // User context
      adminId: user?.id || null,
      recruiterId: user?.id || null, // Admin acts as recruiter
      postedBy: user?.id || null,
    };
  };

  // Form action handlers
  const handleSave = async () => {
    // Basic validation for drafts - only require company and job title
    if (!form.company?.trim() || !form.jobTitle?.trim()) {
      showWarning('Please fill in at least Company and Job Title before saving as draft.');
      return;
    }
    
    try {
      setIsSaving(true);
      // Build payload with all form data including drive dates
      const payload = {
        ...buildJobPayload(),
        // Ensure drive dates are included from driveDraft state if form doesn't have them
        driveDateText: form.driveDateText || driveDraft.driveDateText || '',
        driveDateISO: form.driveDateISO || driveDraft.driveDateISO || '',
        applicationDeadlineText: form.applicationDeadlineText || driveDraft.applicationDeadlineText || '',
        applicationDeadlineISO: form.applicationDeadlineISO || driveDraft.applicationDeadlineISO || '',
        driveVenues: form.driveVenues.length > 0 ? form.driveVenues : driveDraft.driveVenues,
        reportingTime: form.reportingTime || driveDraft.reportingTime || '',
      };
      await saveJobDraft(payload);
      // Reload drafts list after saving
      loadDrafts();
      showSuccess('Draft saved successfully! You can load it anytime from the "Saved Drafts" button.');
    } catch (err) {
      console.error(err);
      showError(err?.message || 'Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAnotherPosition = async () => {
    // Basic validation for saving position - only require company and job title
    if (!form.company?.trim() || !form.jobTitle?.trim()) {
      showWarning('Please fill in at least Company and Job Title before saving this position.');
      return;
    }
    
    try {
      setIsSaving(true);
      const payload = buildJobPayload();
      const { autofill } = await addAnotherPositionDraft(payload);

      setForm(prev => ({
        ...prev,
        jobTitle: '',
        jobType: '',
        stipend: '',
        duration: '',
        salary: '',
        workMode: '',
        openings: '',
        responsibilities: '',
        driveDateText: '',
        driveDateISO: '',
        applicationDeadlineText: '',
        applicationDeadlineISO: '',
        driveVenues: [],
        reportingTime: '',
        qualification: '',
        specialization: '',
        yop: '',
        minCgpa: '',
        skills: [],
        skillsInput: '',
        gapAllowed: '',
        gapYears: '',
        backlogs: '',
        blockingPeriod: '',
        instructions: '',
        company: autofill.company,
        website: autofill.website,
        linkedin: autofill.linkedin,
        companyLocation: autofill.companyLocation,
        spocs: autofill.spocs,
        serviceAgreement: autofill.serviceAgreement,
        baseRoundDetails: autofill.baseRoundDetails || ['', '', ''],
        extraRounds: autofill.extraRounds || [],
      }));

      setDriveDraft({
        driveDateText: '',
        driveDateISO: '',
        driveVenues: [],
        reportingTime: '',
      });

      setCollapsedSections(new Set());
      showSuccess('Position saved. New form has been prefilled.');
    } catch (err) {
      console.error(err);
      showError(err?.message || 'Failed to add another position. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check user role before submission
    const userRole = role || user?.role;
    const allowedRoles = ['ADMIN', 'RECRUITER'];
    const hasRequiredRole = userRole && allowedRoles.includes(userRole.toUpperCase());
    
    console.log('🔐 Pre-submission role check:', {
      'role from useAuth': role,
      'user?.role': user?.role,
      'userRole (combined)': userRole,
      'hasRequiredRole': hasRequiredRole,
      'allowedRoles': allowedRoles,
      'user object': user ? { id: user.id, email: user.email, role: user.role } : null,
    });
    
    if (!hasRequiredRole) {
      console.error('❌ Permission check failed - blocking submission:', {
        userRole,
        allowedRoles,
        user: user?.role,
        'role from context': role,
      });
      showError(`You don't have permission to create jobs.\n\nRequired role: ${allowedRoles.join(' or ')}\nYour current role: ${userRole || 'Unknown'}\n\nPlease contact an administrator if you need access to this feature.`);
      return;
    }
    
    console.log('✅ Role check passed, proceeding with submission');
    
    console.log('🚀 Submit button clicked');
    console.log('📋 Form validation state:', {
      canPost,
      isCompanyDetailsComplete,
      isDriveDetailsComplete,
      isSkillsEligibilityComplete,
      isInterviewProcessComplete,
      userRole,
    });
    
    // Detailed validation debugging
    console.log('🔍 Detailed validation check:', {
      company: {
        hasCompany: !!form.company?.trim(),
        hasLinkedIn: !!form.linkedin?.trim(),
        hasWebsite: !!form.website?.trim(),
        hasRecruiterEmail: (Array.isArray(form.recruiterEmails) ? form.recruiterEmails.some(r => r?.email?.trim()) : false) || false,
        hasJobType: !!form.jobType,
        hasJobTitle: !!form.jobTitle?.trim(),
        hasWorkMode: !!form.workMode,
        hasSalary: !!form.salary?.trim(),
        hasLocation: !!form.companyLocation?.trim(),
        hasResponsibilities: !!form.responsibilities?.trim(),
      },
      drive: {
        hasDriveDate: !!(form.driveDateISO || driveDraft.driveDateISO || toISOFromDDMMYYYY(form.driveDateText) || toISOFromDDMMYYYY(driveDraft.driveDateText)),
        hasApplicationDeadline: !!(form.applicationDeadlineISO || driveDraft.applicationDeadlineISO || toISOFromDDMMYYYY(form.applicationDeadlineText) || toISOFromDDMMYYYY(driveDraft.applicationDeadlineText)),
        formVenues: form.driveVenues?.length || 0,
        driveDraftVenues: driveDraft.driveVenues?.length || 0,
        hasVenues: (form.driveVenues?.length > 0) || (driveDraft.driveVenues?.length > 0),
      },
      skills: {
        hasQualification: !!form.qualification?.trim(),
        hasYop: !!form.yop?.trim(),
        hasMinCgpa: !!form.minCgpa?.trim(),
        skillsCount: form.skills?.length || 0,
        skillsInput: form.skillsInput || '',
        hasGapAllowed: !!form.gapAllowed?.trim() && form.gapAllowed !== '',
        hasBacklogs: !!form.backlogs?.trim() && form.backlogs !== '',
        minCgpaError: minCgpaError || null,
      },
      interview: {
        baseRounds: form.baseRoundDetails?.length || 0,
        round1: form.baseRoundDetails?.[0]?.trim() || '',
        round2: form.baseRoundDetails?.[1]?.trim() || '',
        round3: form.baseRoundDetails?.[2]?.trim() || '',
      },
    });
    
    if (!canPost) {
      // Provide specific validation feedback
      let missingFields = [];
      let details = [];
      
      if (!isCompanyDetailsComplete) {
        missingFields.push('Company Details');
        if (!form.company?.trim()) details.push('• Company name');
        if (!form.linkedin?.trim()) details.push('• LinkedIn URL');
        if (!form.website?.trim()) details.push('• Website URL');
        const recruiterEmailsArray = Array.isArray(form.recruiterEmails) ? form.recruiterEmails : [];
        if (!recruiterEmailsArray.some(r => r?.email?.trim())) details.push('• At least one recruiter email');
        if (!form.jobType) details.push('• Job Type');
        if (!form.jobTitle?.trim()) details.push('• Job Title');
        if (!form.workMode) details.push('• Work Mode');
        if (!form.salary?.trim() && form.jobType === 'Full-Time') details.push('• Salary (CTC)');
        if (!form.companyLocation?.trim()) details.push('• Company Location');
        if (!form.responsibilities?.trim()) details.push('• Roles & Responsibilities');
      }
      
      if (!isDriveDetailsComplete) {
        missingFields.push('Drive Details');
        const hasDriveDate = !!(form.driveDateISO || driveDraft.driveDateISO || toISOFromDDMMYYYY(form.driveDateText) || toISOFromDDMMYYYY(driveDraft.driveDateText));
        const hasApplicationDeadline = !!(form.applicationDeadlineISO || driveDraft.applicationDeadlineISO || toISOFromDDMMYYYY(form.applicationDeadlineText) || toISOFromDDMMYYYY(driveDraft.applicationDeadlineText));
        const hasVenues = (form.driveVenues?.length > 0) || (driveDraft.driveVenues?.length > 0);
        if (!form.driveDateNotDecided && !hasDriveDate) details.push('• Drive Date (or check "Drive date not decided")');
        if (!hasApplicationDeadline) details.push('• Application Deadline');
        if (!hasVenues) details.push('• Drive Venue (at least one)');
      }
      
      if (!isSkillsEligibilityComplete) {
        missingFields.push('Skills & Eligibility');
        if (!form.qualification?.trim()) details.push('• Qualification');
        if (!form.yop?.trim()) details.push('• Year of Passing');
        if (!form.minCgpa?.trim()) details.push('• Minimum CGPA/Percentage');
        if ((form.skills?.length || 0) === 0) details.push('• Skills (type and press Enter/comma to add)');
        if (!form.gapAllowed?.trim() || form.gapAllowed === '') details.push('• Year Gaps');
        if (!form.backlogs?.trim() || form.backlogs === '') details.push('• Active Backlogs');
        if (minCgpaError) details.push(`• ${minCgpaError}`);
      }
      
      if (!isInterviewProcessComplete) {
        missingFields.push('Interview Process');
        if (!form.baseRoundDetails?.[0]?.trim()) details.push('• I Round');
        if (!form.baseRoundDetails?.[1]?.trim()) details.push('• II Round');
        if (!form.baseRoundDetails?.[2]?.trim()) details.push('• III Round');
      }
      
      console.warn('❌ Form validation failed. Missing sections:', missingFields);
      console.warn('❌ Missing details:', details);
      
      const message = details.length > 0 
        ? `Please complete the following:\n\n${details.join('\n')}`
        : `Please complete the following sections before submitting: ${missingFields.join(', ')}`;
      
      showWarning(message);
      return;
    }
    
    let loadingToastId = null;
    try {
      setPosting(true);
      console.log('📝 Starting job submission...');
      
      // CRITICAL: Validate date relationship before submitting
      const driveDate = form.driveDateISO || (form.driveDateText ? toISOFromDDMMYYYY(form.driveDateText) : null);
      const applicationDeadline = form.applicationDeadlineISO || (form.applicationDeadlineText ? toISOFromDDMMYYYY(form.applicationDeadlineText) : null);
      
      console.log('📅 Date validation:', { driveDate, applicationDeadline });
      
      if (driveDate && applicationDeadline) {
        const driveDateTime = new Date(driveDate);
        const deadlineDate = new Date(applicationDeadline);
        
        if (driveDateTime <= deadlineDate) {
          console.error('❌ Date validation failed: Drive date must be after deadline');
          showError('Drive date must be after the application deadline. Interviews happen after applications close.');
          setPosting(false);
          return;
        }
      }
      
      loadingToastId = showLoading(isEditing ? 'Updating job...' : 'Submitting job for review...');
      
      const payload = buildJobPayload();
      
      // Debug: Log payload to see what's being sent
      console.log('📦 Job Payload:', JSON.stringify(payload, null, 2));
      
      // Check if we're editing or creating
      if (isEditing && editJobId) {
        // Update existing job
        console.log('📤 Calling updateJob...');
        const result = await updateJob(editJobId, payload);
        console.log('✅ updateJob response:', result);
        
        console.log('✅ Job updated successfully! Job ID:', editJobId);
        
        if (onCreated) {
          console.log('🔄 Calling onCreated callback...');
          onCreated();
        }
        replaceLoadingToast(loadingToastId, 'success', 'Job updated successfully! Changes will appear in the "In Review" section of Manage Jobs.');
        
        // Navigate back to manage jobs
        navigate('/admin?tab=manageJobs');
      } else {
        // Submit job for review - it will appear in ManageJobs "In Review" section
        console.log('📤 Calling submitJobForReview...');
        const result = await submitJobForReview(payload);
        console.log('✅ submitJobForReview response:', result);
        
        const jobId = result?.jobId || result?.id;
        if (!jobId) {
          console.error('❌ No jobId returned from submitJobForReview:', result);
          throw new Error('Job submission failed: No job ID returned from server');
        }
        
        console.log('✅ Job submitted successfully! Job ID:', jobId);
        
        if (onCreated) {
          console.log('🔄 Calling onCreated callback...');
          onCreated();
        }
        replaceLoadingToast(loadingToastId, 'success', 'Job submitted successfully! It has been sent for review and will appear in the "In Review" section of Manage Jobs.');
        resetForm();
      }
    } catch (err) {
      console.error('❌ Submit error:', err);
      console.error('❌ Error details:', {
        message: err?.message,
        stack: err?.stack,
        response: err?.response,
        status: err?.status,
      });
      
      if (loadingToastId) {
        dismissToast(loadingToastId);
      }
      
      // Handle network errors separately (production-safe, no localhost references)
      if (err?.isNetworkError || err?.message?.includes('Failed to connect') || err?.message?.includes('Failed to fetch')) {
        showError('Network error. Please check your connection and try again. If the problem persists, contact support.');
        return;
      }
      
      // Extract detailed validation errors if available
      let errorMessage = err?.message || 'Unknown error occurred';
      // The API service puts the response body in error.response.data
      const errorData = err?.response?.data || {};
      
      console.log('🔍 Error response structure:', {
        status: err?.status,
        response: err?.response,
        errorData,
        'errorData.required': errorData?.required,
        'errorData.current': errorData?.current,
        'errorData.error': errorData?.error,
        'user.role': user?.role,
        'auth.role': role,
      });
      
      if (err?.response?.errors && Array.isArray(err.response.errors)) {
        const validationErrors = err.response.errors.map(e => `• ${e.msg || e.message || e}`).join('\n');
        errorMessage = `Validation failed:\n\n${validationErrors}`;
      } else if (err?.status === 403) {
        // Handle permission errors with detailed information
        // Backend sends: { error: 'Insufficient permissions', required: [...], current: '...' }
        const required = errorData?.required;
        const current = errorData?.current;
        const userCurrentRole = role || user?.role || 'Unknown';
        
        if (required || current) {
          const requiredStr = Array.isArray(required) ? required.join(' or ') : (required || 'ADMIN or RECRUITER');
          const currentStr = current || userCurrentRole;
          errorMessage = `Insufficient permissions.\n\nRequired role: ${requiredStr}\nYour current role: ${currentStr}\n\nPlease contact an administrator if you need access to this feature.`;
        } else {
          // Fallback: use role from auth context if available
          errorMessage = `Insufficient permissions (403 Forbidden).\n\nYou don't have the required permissions to create jobs.\nRequired role: ADMIN or RECRUITER\nYour current role: ${userCurrentRole}\n\nPlease contact an administrator if you need access to this feature.`;
        }
      } else if (errorData?.error) {
        errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error, null, 2);
      } else if (err?.response?.error) {
        errorMessage = typeof err.response.error === 'string' ? err.response.error : JSON.stringify(err.response.error, null, 2);
      } else if (err?.status) {
        errorMessage = `Server error (${err.status}): ${errorMessage}`;
      }
      
      console.error('❌ Displaying error to user:', errorMessage);
      console.error('❌ Full error response:', {
        response: err?.response,
        errorData,
        status: err?.status,
        'JSON.stringify(errorData)': JSON.stringify(errorData),
      });
      showError(errorMessage || 'Failed to submit job. Please check all required fields and try again.');
    } finally {
      setPosting(false);
      console.log('🏁 Submit process completed');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 overflow-x-hidden">
      {/* Custom Calendar Styles */}
      <style>{`
        .react-datepicker {
          font-family: inherit;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .react-datepicker__header {
          background: linear-gradient(to right, #2563eb, #4f46e5);
          border-bottom: none;
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .react-datepicker__current-month {
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
        }
        .react-datepicker__day-name {
          color: white;
          font-weight: 500;
        }
        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background: linear-gradient(to right, #2563eb, #4f46e5);
          border-radius: 0.375rem;
        }
        .react-datepicker__day:hover {
          background-color: #dbeafe;
          border-radius: 0.375rem;
        }
        .react-datepicker__day--today {
          font-weight: 600;
          color: #2563eb;
        }
        .react-datepicker__navigation-icon::before {
          border-color: white;
        }
        .react-datepicker__triangle {
          display: none;
        }
      `}</style>

      {/* Header - ALWAYS VISIBLE */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg shadow-sm border border-blue-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit Job Posting' : 'Create Job Posting'}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    loadDrafts();
                    setShowDraftsPanel(!showDraftsPanel);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg border border-blue-300 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  Saved Drafts ({savedDrafts.length})
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Fields marked with <span className="text-red-500 font-semibold">*</span> are required</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {isEditing 
                ? 'Update the job details below. Changes will be saved to the job posting.'
                : 'Fill in the job details below to create a new job posting. You can save your progress as a draft and continue later.'}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-gray-600 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                <span>Save drafts anytime</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload JD or Excel</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span>Multiple positions supported</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Drafts Panel */}
      {showDraftsPanel && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Archive className="w-5 h-5 text-blue-600" />
              Saved Drafts
            </h3>
            <button
              onClick={() => setShowDraftsPanel(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {savedDrafts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Archive className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No saved drafts found.</p>
              <p className="text-xs mt-1">Save your progress using the "Save (Draft)" button to see drafts here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {savedDrafts.map((draft) => (
                <div
                  key={draft.draftId}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <p className="font-medium text-gray-900 truncate">
                        {draft.jobTitle || draft.company || 'Untitled Draft'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 ml-6">
                      {draft.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {draft.company}
                        </span>
                      )}
                      {draft.createdAt && (
                        <span>
                          Saved: {new Date(draft.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => loadDraft(draft)}
                      className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this draft?')) {
                          deleteDraft(draft.draftId);
                        }
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete draft"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* THREE CREATION METHOD OPTIONS - ALWAYS VISIBLE */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-center">
          <div className="bg-gray-50 rounded-lg p-1 inline-flex gap-2 border border-gray-200">
            <button
              onClick={() => setCreationMethod('manual')}
              className={`px-6 py-2.5 rounded-md font-medium transition-all duration-200 ${creationMethod === 'manual'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
            >
              Manual Entry
            </button>

            <button
              onClick={() => setCreationMethod('uploadJD')}
              className={`px-6 py-2.5 rounded-md font-medium transition-all duration-200 ${creationMethod === 'uploadJD'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
            >
              Upload JD
            </button>

            <button
              onClick={() => setCreationMethod('uploadExcel')}
              className={`px-6 py-2.5 rounded-md font-medium transition-all duration-200 ${creationMethod === 'uploadExcel'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
            >
              Upload Excel
            </button>
          </div>
        </div>
      </div>

      {/* JD UPLOAD FORM */}
      {creationMethod === 'uploadJD' && (
        <JDUploadForm
          isUploading={isUploading}
          parseResult={parseResult}
          uploadError={uploadError}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          setParseResult={setParseResult}
        />
      )}

      {/* EXCEL UPLOAD FORM */}
      {creationMethod === 'uploadExcel' && (
        <ExcelUploader
          onJobSelected={handleExcelJobSelected}
          onBulkProcessed={handleExcelBulkUpload}
          adminId={user?.id}
        />
      )}

      {/* Loading state when editing */}
      {loadingJob && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading job for editing...</p>
        </div>
      )}

      {/* MANUAL FORM */}
      {!loadingJob && creationMethod === 'manual' && (
        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
          
          {/* Section 1: Company Details */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <Building2 size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Company Details</h3>
            </div>

            {!isSectionCollapsed('company') && (
              <>
                {/* Company field taking full row */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Building2 size={16} className="text-gray-500" />
                    Company <span className="text-red-500">*</span>
                  </label>
                  <input 
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                      form.company?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                    }`} 
                    placeholder="e.g. ABC Corp" 
                    value={form.company} 
                    onChange={(e) => update({ company: e.target.value })} 
                  />
                </div>

                {/* LinkedIn and Website fields half-half */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Linkedin size={16} className="text-blue-600" />
                      LinkedIn <span className="text-red-500">*</span>
                    </label>
                    <input 
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                        linkedinError ? 'border-red-500 bg-red-50' : form.linkedin?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`} 
                      placeholder="https://linkedin.com/company/example" 
                      value={form.linkedin} 
                      onChange={(e) => onLinkedInChange(e.target.value)} 
                      required 
                    />
                    {linkedinError && <p className="text-red-500 text-sm mt-1">{linkedinError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Globe size={16} className="text-gray-500" />
                      Website <span className="text-red-500">*</span>
                    </label>
                    <input 
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                        websiteError ? 'border-red-500 bg-red-50' : form.website?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`} 
                      placeholder="www.company.com" 
                      value={form.website} 
                      onChange={(e) => onWebsiteChange(e.target.value)} 
                      required 
                    />
                    {websiteError && <p className="text-red-500 text-sm mt-1">{websiteError}</p>}
                  </div>
                </div>

                {/* Recruiter/HR Contact Information */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Mail size={16} className="text-purple-600" />
                      Recruiter/HR Contacts <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addRecruiterEmail}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200"
                    >
                      <Plus size={16} />
                      Add Email
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">These emails will receive the screening link after application deadline</p>
                  
                  {(Array.isArray(form.recruiterEmails) ? form.recruiterEmails : [{ email: '', name: '' }]).map((recruiter, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="email"
                          className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                            recruiterEmailError ? 'border-red-500 bg-red-50' : recruiter.email?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                          }`} 
                          placeholder="recruiter@company.com" 
                          value={recruiter.email || ''} 
                          onChange={(e) => onRecruiterEmailChange(index, e.target.value)} 
                          onBlur={(e) => onRecruiterEmailChange(index, e.target.value)}
                          required 
                        />
                      </div>

                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name <span className="text-gray-400">(Optional)</span>
                        </label>
                        <input 
                          className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                            recruiter.name?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                          }`} 
                          placeholder="e.g. John Doe" 
                          value={recruiter.name || ''} 
                          onChange={(e) => onRecruiterNameChange(index, e.target.value)} 
                        />
                      </div>

                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2 invisible">
                          Action
                        </label>
                        {(Array.isArray(form.recruiterEmails) ? form.recruiterEmails.length : 0) > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeRecruiterEmail(index)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 h-[42px] text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-200"
                          >
                            <X size={16} />
                            Remove
                          </button>
                        ) : (
                          <div className="w-full flex items-center justify-center gap-2 px-3 py-2 h-[42px] text-xs font-medium text-blue-600 bg-blue-50 rounded-md border border-blue-200">
                            <Info size={14} />
                            At least one email required
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {recruiterEmailError && <p className="text-red-500 text-sm mt-1">{recruiterEmailError}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Job Type Dropdown */}
                  <CustomDropdown
                    label={
                      <>
                        Job Type <span className="text-red-500">*</span>
                      </>
                    }
                    icon={FaBriefcase}
                    iconColor="text-blue-600"
                    options={[
                      { value: 'Internship', label: 'Internship' },
                      { value: 'Full-Time', label: 'Full-Time' }
                    ]}
                    value={form.jobType}
                    onChange={(value) => onJobTypeChange(value)}
                    placeholder="Select Job Type"
                  />

                  {/* Job Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Briefcase size={16} className="text-gray-500" />
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input 
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                        form.jobTitle?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`} 
                      placeholder="e.g. Full Stack Developer" 
                      value={form.jobTitle} 
                      onChange={(e) => onJobTitleChange(e.target.value)} 
                      onBlur={(e) => onJobTitleBlur(e.target.value)} 
                    />
                  </div>

                  {/* Work Mode Dropdown */}
                  <CustomDropdown
                    label={
                      <>
                        Work Mode <span className="text-red-500">*</span>
                      </>
                    }
                    icon={FaLaptop}
                    iconColor="text-indigo-600"
                    options={[
                      { value: 'On-site', label: 'On-site' },
                      { value: 'Hybrid', label: 'Hybrid' },
                      { value: 'Remote', label: 'Remote' }
                    ]}
                    value={form.workMode}
                    onChange={(value) => update({ workMode: value })}
                    placeholder="Select Work Mode"
                  />
                </div>

                {/* Conditional fields based on Job Type */}
                {form.jobType === 'Internship' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FaDollarSign size={16} className="text-gray-500" />
                        Stipend <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                          stipendError ? 'border-red-500 bg-red-50' : form.stipend?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`} 
                        placeholder="e.g. ₹15000 per month, As per performance, As per industry standards" 
                        value={form.stipend} 
                        onChange={(e) => onStipendChange(e.target.value)} 
                      />
                      {stipendError && <p className="text-red-500 text-sm mt-1">{stipendError}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FaClock size={16} className="text-gray-500" />
                        Duration <span className="text-red-500">*</span>
                      </label>
                      <input 
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                          durationError ? 'border-red-500 bg-red-50' : form.duration?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`} 
                        placeholder="e.g. 6 months" 
                        value={form.duration} 
                        onChange={(e) => onDurationChange(e.target.value)} 
                      />
                      {durationError && <p className="text-red-500 text-sm mt-1">{durationError}</p>}
                    </div>
                  </div>
                ) : form.jobType === 'Full-Time' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FaDollarSign size={16} className="text-gray-500" />
                      Salary (CTC) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                        salaryError ? 'border-red-500 bg-red-50' : form.salary?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`} 
                      placeholder="e.g. 12 LPA, 10–15 LPA, As per industry standards" 
                      value={form.salary} 
                      onChange={(e) => onSalaryChange(e.target.value)} 
                    />
                    {salaryError && <p className="text-red-500 text-sm mt-1">{salaryError}</p>}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <MapPin size={16} className="text-gray-500" />
                      Company Location <span className="text-red-500">*</span>
                    </label>
                    <input 
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                        companyLocationError ? 'border-red-500 bg-red-50' : form.companyLocation?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`} 
                      placeholder="City, State (e.g. Bangalore, Karnataka)" 
                      value={form.companyLocation} 
                      onChange={(e) => onCompanyLocationChange(e.target.value)} 
                    />
                    {companyLocationError && <p className="text-red-500 text-sm mt-1">{companyLocationError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Users size={16} className="text-gray-500" />
                      Open Positions
                    </label>
                    <input 
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                        form.openings?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`} 
                      placeholder="e.g. 15" 
                      value={form.openings} 
                      onChange={(e) => update({ openings: e.target.value })} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Briefcase size={16} className="text-gray-500" />
                    Roles & Responsibilities <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text min-h-[120px] max-h-[300px] resize-y ${
                      form.responsibilities?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                    }`}
                    placeholder="Outline responsibilities, tech stack, team, etc."
                    value={form.responsibilities}
                    onChange={(e) => update({ responsibilities: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const textarea = e.target;
                        const cursorPosition = textarea.selectionStart;
                        const textBefore = textarea.value.substring(0, cursorPosition);
                        const textAfter = textarea.value.substring(cursorPosition);

                        const lines = textBefore.split('\n');
                        const currentLine = lines[lines.length - 1];

                        let newText;
                        if (currentLine?.trim() === '' || currentLine?.trim() === '•') {
                          newText = textBefore + '\n• ' + textAfter;
                        } else if (currentLine.startsWith('• ')) {
                          newText = textBefore + '\n• ' + textAfter;
                        } else {
                          const updatedCurrentLine = '• ' + currentLine;
                          const updatedLines = [...lines.slice(0, -1), updatedCurrentLine];
                          newText = updatedLines.join('\n') + '\n• ' + textAfter;
                        }

                        update({ responsibilities: newText });

                        setTimeout(() => {
                          const newCursorPosition = newText.length - textAfter.length;
                          textarea.setSelectionRange(newCursorPosition, newCursorPosition);
                        }, 0);
                      }
                    }}
                  />
                </div>

                {/* Company SPOC Subsection */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={18} className="text-indigo-600" />
                    <h4 className="text-md font-semibold text-gray-900">Company SPOC</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Single Point of Contact for this job—the person candidates or the placement team can reach for queries (e.g. HR, recruiter, or hiring manager).</p>
                  {(Array.isArray(form.spocs) ? form.spocs : [{ fullName: '', email: '', phone: '' }]).map((spoc, idx) => (
                    <div key={idx} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-gray-700">SPOC {idx + 1}</h5>
                        {(Array.isArray(form.spocs) ? form.spocs.length : 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSpoc(idx)}
                            className="text-red-500 hover:text-red-700"
                            title="Remove this SPOC"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Hash size={16} className="text-gray-500" />
                            Full Name
                          </label>
                          <input
                            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                              spoc.fullName?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                            }`}
                            placeholder="e.g. Amit Kumar"
                            value={spoc.fullName}
                            onChange={(e) => updateSpoc(idx, 'fullName', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Mail size={16} className="text-gray-500" />
                            Email ID
                          </label>
                          <input
                            type="email"
                            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                              spoc.email?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                            }`}
                            placeholder="e.g. amit.kumar@company.com"
                            value={spoc.email}
                            onChange={(e) => updateSpoc(idx, 'email', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Phone size={16} className="text-gray-500" />
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                              spoc.phone?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                            }`}
                            placeholder="e.g. +91 9876543210"
                            value={spoc.phone}
                            onChange={(e) => updateSpoc(idx, 'phone', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={addSpoc}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                    >
                      <Plus className="w-4 h-4" /> Add More
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Collapse/expand button */}
            <div className={`flex justify-end ${isSectionCollapsed('company') ? '-mt-8' : 'pt-4'}`}>
              <button
                type="button"
                onClick={() => toggleSection('company')}
                className="text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-200 rounded-md"
                title={isSectionCollapsed('company') ? 'Expand section' : 'Minimize section'}
              >
                {isSectionCollapsed('company') ? <ChevronsDown className="w-6 h-6" /> : <ChevronsUp className="w-6 h-6" />}
              </button>
            </div>
          </section>

          {/* Section 2: About Drive */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <Calendar size={20} className="text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">About Drive</h3>
            </div>

            {!isSectionCollapsed('drive') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Drive Date with DatePicker or "Not decided" */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FaCalendarAlt className="w-4 h-4 text-green-600" />
                      Drive Date
                    </label>
                    {!form.driveDateNotDecided ? (
                      <div className="relative mb-2">
                        <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 w-5 h-5 pointer-events-none z-10" />
                        <DatePicker
                          selected={driveDraft.driveDateISO ? new Date(driveDraft.driveDateISO) : null}
                          onChange={(date) => {
                            if (date) {
                              const isoDate = date.toISOString();
                              const formattedDate = toDDMMYYYY(isoDate);
                              setDriveDraft(prev => ({
                                ...prev,
                                driveDateISO: isoDate,
                                driveDateText: formattedDate
                              }));
                              update({ driveDateISO: isoDate, driveDateText: formattedDate });
                            } else {
                              setDriveDraft(prev => ({
                                ...prev,
                                driveDateISO: '',
                                driveDateText: ''
                              }));
                              update({ driveDateISO: '', driveDateText: '' });
                            }
                          }}
                          dateFormat="dd/MM/yyyy"
                          placeholderText="Select drive date"
                          minDate={new Date()}
                          className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer bg-white text-gray-900 font-medium hover:border-gray-400 shadow-sm hover:shadow-md"
                          wrapperClassName="w-full"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic mb-2">Drive date will show as &quot;TBD&quot;. You can set it later when decided.</p>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.driveDateNotDecided}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          update({ driveDateNotDecided: checked });
                          if (checked) {
                            setDriveDraft(prev => ({ ...prev, driveDateISO: '', driveDateText: '' }));
                            update({ driveDateISO: '', driveDateText: '' });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Drive date not decided (TBD)</span>
                    </label>
                  </div>

                  {/* Application Deadline with DatePicker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Application Deadline <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 pointer-events-none z-10" />
                      <DatePicker
                        selected={driveDraft.applicationDeadlineISO ? new Date(driveDraft.applicationDeadlineISO) : null}
                        onChange={(date) => {
                          if (date) {
                            // Set to end of day (23:59:59) in local timezone to ensure the full day is available
                            const endOfDay = new Date(date);
                            endOfDay.setHours(23, 59, 59, 999);
                            const isoDate = endOfDay.toISOString();
                            const formattedDate = toDDMMYYYY(isoDate);
                            setDriveDraft(prev => ({
                              ...prev,
                              applicationDeadlineISO: isoDate,
                              applicationDeadlineText: formattedDate
                            }));
                            update({ applicationDeadlineISO: isoDate, applicationDeadlineText: formattedDate });
                          } else {
                            setDriveDraft(prev => ({
                              ...prev,
                              applicationDeadlineISO: '',
                              applicationDeadlineText: ''
                            }));
                            update({ applicationDeadlineISO: '', applicationDeadlineText: '' });
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select application deadline"
                        minDate={new Date()}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer bg-white text-gray-900 font-medium hover:border-gray-400 shadow-sm hover:shadow-md"
                        wrapperClassName="w-full"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Recruiters will receive screening link after this date</p>
                  </div>
                </div>

                {/* Drive Venue & Reporting Time - side by side */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Drive Venue Multi-Select Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <MapPin size={16} className="text-green-600" />
                      Drive Venue <span className="text-red-500">*</span>
                    </label>
                    <div ref={venueDropdownRef} className="relative">
                      <button
                        type="button"
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm text-left flex items-center justify-between transition-all duration-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none outline-none cursor-pointer"
                        onClick={() => setShowVenues((v) => !v)}
                      >
                        <span className="truncate flex-1 text-gray-900">
                          {driveDraft.driveVenues.length > 0 
                            ? driveDraft.driveVenues.join(', ') 
                            : 'Select venues'}
                        </span>
                        <ChevronDown className={`w-3 h-3 text-gray-500 flex-shrink-0 transition-transform duration-200 ${showVenues ? 'rotate-180' : ''}`} />
                      </button>
                      {showVenues && (
                        <div className="absolute z-20 w-full bg-white border-2 border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                          {DRIVE_VENUES.map((v) => {
                            const isSelected = driveDraft.driveVenues.includes(v);
                            return (
                              <label
                                key={v}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer border-b border-gray-100 last:border-b-0 text-left transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleVenue(v)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span>{v}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reporting Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Clock size={16} className="text-green-600" />
                      Reporting Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9:00 AM"
                      value={form.reportingTime || driveDraft.reportingTime || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        update({ reportingTime: val });
                        setDriveDraft((d) => ({ ...d, reportingTime: val }));
                      }}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Time candidates should report on the drive date</p>
                  </div>
                </div>
              </>
            )}

            {/* Collapse/expand button */}
            <div className={`flex justify-end ${isSectionCollapsed('drive') ? '-mt-8' : 'pt-4'}`}>
              <button
                type="button"
                onClick={() => toggleSection('drive')}
                className="text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-200 rounded-md"
                title={isSectionCollapsed('drive') ? 'Expand section' : 'Minimize section'}
              >
                {isSectionCollapsed('drive') ? <ChevronsDown className="w-6 h-6" /> : <ChevronsUp className="w-6 h-6" />}
              </button>
            </div>
          </section>

          {/* Section 3: Skills & Eligibility */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <GraduationCap size={20} className="text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Skills & Eligibility</h3>
            </div>

            {!isSectionCollapsed('skills') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <GraduationCap size={16} className="text-purple-600" />
                      Qualification <span className="text-red-500">*</span>
                    </label>
                    <input 
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                        form.qualification?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`} 
                      placeholder="e.g. B.Tech, BCA, MCA" 
                      value={form.qualification} 
                      onChange={(e) => update({ qualification: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Award size={16} className="text-gray-500" />
                      Specialization
                    </label>
                    <input 
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                        form.specialization?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`} 
                      placeholder="e.g. Computer Science (optional)" 
                      value={form.specialization} 
                      onChange={(e) => update({ specialization: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FaCalendarAlt className="w-4 h-4 text-amber-600" />
                      Year of Passing <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5 pointer-events-none z-10" />
                      <DatePicker
                        selected={form.yop?.trim() ? (() => {
                          const y = parseInt(form.yop, 10);
                          return isNaN(y) ? null : new Date(y < 100 ? 2000 + y : y, 0, 1);
                        })() : null}
                        onChange={(date) => update({ yop: date ? String(date.getFullYear()) : '' })}
                        showYearPicker
                        dateFormat="yyyy"
                        placeholderText="Select year"
                        yearItemNumber={12}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer bg-white text-gray-900 font-medium hover:border-gray-400 shadow-sm hover:shadow-md"
                        wrapperClassName="w-full"
                        minDate={new Date(2020, 0, 1)}
                        maxDate={new Date(2035, 11, 31)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Award size={16} className="text-yellow-500" />
                      Minimum CGPA/Percentage <span className="text-red-500">*</span>
                    </label>
                    <input 
                      className={`w-full border-2 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                        minCgpaError ? 'border-red-500 bg-red-50' : form.minCgpa?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`} 
                      placeholder="e.g. 7.0 or 70%" 
                      value={form.minCgpa} 
                      onChange={(e) => onMinCgpaChange(e.target.value)} 
                      onBlur={(e) => onMinCgpaBlur(e.target.value)} 
                    />
                    {minCgpaError && <p className="text-red-500 text-sm mt-1">{minCgpaError}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Code2 size={16} className="text-orange-600" />
                    Skills <span className="text-red-500">*</span>
                  </label>
                  <div className={`relative border rounded-md px-3 py-2 min-h-[42px] flex flex-wrap items-center gap-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors ${
                    form.skills.length > 0 ? 'border-green-300 bg-green-50' : form.skillsInput?.trim() ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300'
                  }`}>
                    {form.skills.map((s, idx) => (
                      <span key={`${s}-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {s}
                        <button type="button" className="ml-1 hover:text-blue-900" onClick={() => removeSkill(idx)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm"
                      placeholder={form.skills.length === 0 ? "e.g. JavaScript, React, Node.js (press Enter or comma to add)" : ""}
                      value={form.skillsInput}
                      onChange={(e) => update({ skillsInput: e.target.value })}
                      onKeyDown={onSkillsKeyDown}
                    />
                  </div>
                  {form.skillsInput?.trim() && form.skills.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">,</kbd> to add skills. You currently have {form.skills.length} skill(s) added.
                    </p>
                  )}
                  {form.skills.length === 0 && !form.skillsInput?.trim() && (
                    <p className="text-xs text-gray-500 mt-1">
                      Type skills and press Enter or comma to add them. At least one skill is required.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Year Gaps Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar size={16} className="text-gray-500" />
                      Year Gaps <span className="text-red-500">*</span>
                    </label>
                    <div className="relative" ref={gapAllowedDropdownRef}>
                      {!gapInputMode ? (
                        <>
                          <button
                            type="button"
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm text-left flex items-center justify-between transition-all duration-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none outline-none cursor-pointer"
                            onClick={() => setShowGapAllowed(prev => !prev)}
                          >
                            <span className="truncate flex-1 text-gray-900">
                              {form.gapAllowed === 'Custom' && form.gapYears
                                ? `${form.gapYears} Year/s Allowed`
                                : form.gapAllowed || 'Select Gap Policy'}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-gray-500 flex-shrink-0 transition-transform duration-200 ${showGapAllowed ? 'rotate-180' : ''}`} />
                          </button>
                          {showGapAllowed && (
                            <div className="absolute z-20 w-full bg-white border-2 border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                              {['Allowed', 'Not Allowed'].map((policy) => {
                                const isSelected = form.gapAllowed === policy;
                                return (
                                  <button
                                    key={policy}
                                    type="button"
                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer border-b border-gray-100 last:border-b-0 text-left transition-all duration-200 ${
                                      isSelected 
                                        ? 'bg-blue-50 text-blue-700 font-medium' 
                                        : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                                    }`}
                                    onClick={() => {
                                      update({ gapAllowed: policy, gapYears: '' });
                                      setShowGapAllowed(false);
                                    }}
                                  >
                                    <span>{policy}</span>
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer text-left transition-all duration-200 ${
                                  form.gapAllowed === 'Custom'
                                    ? 'bg-blue-50 text-blue-700 font-medium' 
                                    : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                                }`}
                                onClick={() => {
                                  setGapInputMode(true);
                                  setShowGapAllowed(false);
                                  setTimeout(() => {
                                    const input = document.querySelector('[data-gap-input]');
                                    if (input) input.focus();
                                  }, 100);
                                }}
                              >
                                <span>{form.gapYears ? `${form.gapYears} Year/s Allowed` : '_ Year/s Allowed'}</span>
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="border-2 border-gray-300 bg-white rounded-lg px-4 py-3 text-sm w-full flex items-center focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 transition-all duration-200">
                          <input
                            data-gap-input
                            type="text"
                            className="bg-transparent border-none outline-none text-sm w-8 text-center text-gray-900"
                            placeholder="_"
                            value={form.gapYears}
                            onChange={(e) => update({ gapYears: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && form.gapYears.trim()) {
                                update({ gapAllowed: 'Custom' });
                                setGapInputMode(false);
                              } else if (e.key === 'Escape') {
                                update({ gapAllowed: 'Not Allowed', gapYears: '' });
                                setGapInputMode(false);
                              }
                            }}
                            onBlur={() => {
                              if (form.gapYears && form.gapYears.trim()) {
                                update({ gapAllowed: 'Custom' });
                                setGapInputMode(false);
                              } else {
                                update({ gapAllowed: 'Not Allowed', gapYears: '' });
                                setGapInputMode(false);
                              }
                            }}
                          />
                          <span className="text-sm ml-1 text-gray-700">Year/s Allowed</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Backlogs Dropdown */}
                  <CustomDropdown
                    label={
                      <>
                        Active Backlogs <span className="text-red-500">*</span>
                      </>
                    }
                    icon={FaExclamationTriangle}
                    iconColor="text-orange-600"
                    options={[
                      { value: 'Allowed', label: 'Allowed' },
                      { value: 'Not Allowed', label: 'Not Allowed' }
                    ]}
                    value={form.backlogs}
                    onChange={(value) => update({ backlogs: value })}
                    placeholder="Select Backlog Policy"
                  />
                </div>
              </>
            )}

            {/* Collapse/expand button */}
            <div className={`flex justify-end ${isSectionCollapsed('skills') ? '-mt-8' : 'pt-4'}`}>
              <button
                type="button"
                onClick={() => toggleSection('skills')}
                className="text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-200 rounded-md"
                title={isSectionCollapsed('skills') ? 'Expand section' : 'Minimize section'}
              >
                {isSectionCollapsed('skills') ? <ChevronsDown className="w-6 h-6" /> : <ChevronsUp className="w-6 h-6" />}
              </button>
            </div>
          </section>

          {/* Section 4: Interview Process */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <Code2 size={20} className="text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Interview Process</h3>
            </div>

            {!isSectionCollapsed('interview') && (
              <>
                {/* Base fixed rounds */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i}>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Code2 size={16} className="text-indigo-600" />
                          {[`${toRoman(1)} Round`, `${toRoman(2)} Round`, `${toRoman(3)} Round`][i]} <span className="text-red-500">*</span>
                        </label>
                        <input 
                          className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                            form.baseRoundDetails[i]?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                          }`} 
                          placeholder="e.g. Online test, DS&A" 
                          value={form.baseRoundDetails[i]} 
                          onChange={(e) => updateBaseRoundDetail(i, e.target.value)} 
                          required 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Extra rounds */}
                <div className="space-y-3">
                  {form.extraRounds.map((r, idx) => (
                    <div key={idx} className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Code2 size={16} className="text-gray-500" />
                          {r.title}
                        </label>
                        <input 
                          className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                            r.detail?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                          }`} 
                          placeholder="e.g. Managerial round (optional)" 
                          value={r.detail} 
                          onChange={(e) => updateExtraRoundDetail(idx, e.target.value)} 
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeExtraRound(idx)} 
                        className="mb-0.5 px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors" 
                        title="Remove this round"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={addRound} 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Round
                  </button>
                </div>

                {/* Agreement notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FileText size={16} className="text-gray-500" />
                      Service Agreement
                      <div className="relative">
                        <Info
                          className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help"
                          onMouseEnter={() => setTooltipVisible(prev => ({ ...prev, serviceAgreement: true }))}
                          onMouseLeave={() => setTooltipVisible(prev => ({ ...prev, serviceAgreement: false }))}
                        />
                        {tooltipVisible.serviceAgreement && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10">
                            This defines the minimum tenure with company.
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        )}
                      </div>
                    </label>
                    <input 
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                        form.serviceAgreement?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`} 
                      placeholder="e.g. 1 year bond (optional)" 
                      value={form.serviceAgreement} 
                      onChange={(e) => update({ serviceAgreement: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Clock size={16} className="text-gray-500" />
                      Blocking Period
                      <div className="relative">
                        <Info
                          className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help"
                          onMouseEnter={() => setTooltipVisible(prev => ({ ...prev, blockingPeriod: true }))}
                          onMouseLeave={() => setTooltipVisible(prev => ({ ...prev, blockingPeriod: false }))}
                        />
                        {tooltipVisible.blockingPeriod && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10">
                            The duration candidate cannot apply elsewhere.
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        )}
                      </div>
                    </label>
                    <input 
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                        form.blockingPeriod?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`} 
                      placeholder="e.g. 6 months (optional)" 
                      value={form.blockingPeriod} 
                      onChange={(e) => update({ blockingPeriod: e.target.value })} 
                    />
                  </div>
                </div>
              </>
            )}

            {/* Collapse/expand button */}
            <div className={`flex justify-end ${isSectionCollapsed('interview') ? '-mt-8' : 'pt-4'}`}>
              <button
                type="button"
                onClick={() => toggleSection('interview')}
                className="text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-200 rounded-md"
                title={isSectionCollapsed('interview') ? 'Expand section' : 'Minimize section'}
              >
                {isSectionCollapsed('interview') ? <ChevronsDown className="w-6 h-6" /> : <ChevronsUp className="w-6 h-6" />}
              </button>
            </div>
          </section>

          {/* Section 5: Pre-Interview Requirements */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <Users size={20} className="text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Pre-Interview Requirements</h3>
            </div>

            {!isSectionCollapsed('preInterview') && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">What are Pre-Interview Requirements?</p>
                      <p className="text-blue-700">
                        Select the screening steps required before candidates can proceed to interview rounds. 
                        If both are enabled, candidates must pass Resume Screening before they can take the QA/Test.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors bg-white">
                    <input
                      type="checkbox"
                      id="requiresScreening"
                      checked={form.requiresScreening}
                      onChange={(e) => update({ requiresScreening: e.target.checked })}
                      className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label htmlFor="requiresScreening" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2">
                        Resume Screening required
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Recruiters will review resumes and applications before candidates proceed to interviews.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors bg-white">
                    <input
                      type="checkbox"
                      id="requiresTest"
                      checked={form.requiresTest}
                      onChange={(e) => update({ requiresTest: e.target.checked })}
                      className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label htmlFor="requiresTest" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2">
                        QA / Test required
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Candidates must complete a QA/Test assessment before proceeding to interviews. 
                        {form.requiresScreening && (
                          <span className="text-blue-700 font-medium"> (Available only after Resume Screening)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {!form.requiresScreening && !form.requiresTest && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> If no pre-interview requirements are selected, all candidates who apply will be eligible for interview rounds immediately after the application deadline.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Collapse/expand button */}
            <div className={`flex justify-end ${isSectionCollapsed('preInterview') ? '-mt-8' : 'pt-4'}`}>
              <button
                type="button"
                onClick={() => toggleSection('preInterview')}
                className="text-gray-500 hover:text-gray-700 px-2 py-1 bg-gray-200 rounded-md"
                title={isSectionCollapsed('preInterview') ? 'Expand section' : 'Minimize section'}
              >
                {isSectionCollapsed('preInterview') ? <ChevronsDown className="w-6 h-6" /> : <ChevronsUp className="w-6 h-6" />}
              </button>
            </div>
          </section>

          {/* Final Section: Instructions + Buttons */}
          <section className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText size={16} className="text-gray-500" />
                Any Specific Instructions
              </label>
              <textarea
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text min-h-[120px] max-h-[250px] resize-y ${
                  form.instructions?.trim() ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
                placeholder="Any notes for candidates or TPO team (optional)"
                value={form.instructions}
                onChange={(e) => update({ instructions: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const textarea = e.target;
                    const cursorPosition = textarea.selectionStart;
                    const textBefore = textarea.value.substring(0, cursorPosition);
                    const textAfter = textarea.value.substring(cursorPosition);

                    const lines = textBefore.split('\n');
                    const currentLine = lines[lines.length - 1];

                    let newText;
                    if (currentLine.trim() === '' || currentLine.trim() === '•') {
                      newText = textBefore + '\n• ' + textAfter;
                    } else if (currentLine.startsWith('• ')) {
                      newText = textBefore + '\n• ' + textAfter;
                    } else {
                      const updatedCurrentLine = '• ' + currentLine;
                      const updatedLines = [...lines.slice(0, -1), updatedCurrentLine];
                      newText = updatedLines.join('\n') + '\n• ' + textAfter;
                    }

                    update({ instructions: newText });

                    setTimeout(() => {
                      const newCursorPosition = newText.length - textAfter.length;
                      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
                    }, 0);
                  }
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={!canPost || posting}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-md font-medium text-white transition-all duration-200 ${
                  !canPost || posting 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg'
                }`}
              >
                {posting ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {isEditing ? 'Update Job' : 'Submit for Review'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || (!form.company?.trim() || !form.jobTitle?.trim())}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-md font-medium border transition-all duration-200 ${
                  isSaving || (!form.company?.trim() || !form.jobTitle?.trim()) 
                    ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300 shadow-sm hover:shadow'
                }`}
              >
                {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Save (Draft)
              </button>
              <button
                type="button"
                onClick={handleAddAnotherPosition}
                disabled={isSaving || (!form.company?.trim() || !form.jobTitle?.trim())}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-md font-medium border transition-all duration-200 ${
                  isSaving || (!form.company?.trim() || !form.jobTitle?.trim()) 
                    ? 'bg-emerald-200 text-emerald-500 border-emerald-300 cursor-not-allowed' 
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 shadow-sm hover:shadow'
                }`}
              >
                {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Another Position
              </button>
              <button
                type="button"
                onClick={() => resetForm()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200"
              >
                <X className="w-4 h-4" />
                Cancel / Reset
              </button>
            </div>
          </section>
        </form>
      )}
    </div>
  );
}

// JD Upload Component - UNCHANGED
const JDUploadForm = ({
  isUploading, parseResult, uploadError, fileInputRef, handleFileUpload,
  handleDragOver, handleDrop, setParseResult
}) => {
  return (
    <div className="space-y-6 bg-white border border-slate-200 rounded-lg p-6">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isUploading ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-gray-700">Analyzing your JD...</p>
          </div>
        ) : parseResult ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <CheckCircle className="w-12 h-12 text-green-600" />
            <p className="text-lg font-medium text-gray-900">JD Parsed Successfully!</p>
            <p className="text-sm text-gray-600">
              Data has been populated in the manual entry form. Click "Manual Entry" to review and complete.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Upload className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">Drag & Drop your Job Description</p>
              <p className="text-sm text-gray-600">or</p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Browse Files
            </button>
            <p className="text-xs text-gray-500">Supports PDF, DOC, DOCX • Max 5MB</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {parseResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
          <h3 className="font-medium text-green-900">Parsing Complete!</h3>
          <p className="text-sm text-green-700">
            We've extracted key information from your job description. The manual entry form has been automatically populated with the parsed data.
          </p>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setParseResult(null)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
            >
              Upload Different File
            </button>
          </div>
        </div>
      )}

      {/* JD Format Guide */}
      <JDFormatGuide />
    </div>
  );
};

