import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Calendar, Info, Plus, X, Loader, ChevronsUp, ChevronsDown, ChevronDown, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { saveJobDraft, addAnotherPositionDraft, postJob, submitJobForReview } from '../../../services/jobs';
import ExcelUploader from './ExcelUploader'; // Import Excel component
import JDFormatGuide from './JDFormatGuide'; // Import JD Format Guide

// Utility helpers
const toISOFromDDMMYYYY = (val) => {
  if (!val) return '';
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  const [_, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
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
  const { user } = useAuth();
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
    serviceAgreement: '',
    blockingPeriod: '',
    baseRoundDetails: ['', '', ''],
    extraRounds: [],
    instructions: '',
  });

  // Local draft for About Drive section
  const [driveDraft, setDriveDraft] = useState({
    driveDateText: '',
    driveDateISO: '',
    driveVenues: [],
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
    if (data.jobTitle || data.title) updates.jobTitle = data.jobTitle || data.title;
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
    if (jobData.jobTitle) updates.jobTitle = jobData.jobTitle;
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
      // Handle drive date conversion
      const dateStr = jobData.driveDate;
      if (dateStr.includes('/')) {
        updates.driveDateText = dateStr;
        updates.driveDateISO = toISOFromDDMMYYYY(dateStr);
      }
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
    const base = form.company?.trim() && form.jobTitle?.trim() && form.companyLocation?.trim() && form.website?.trim() && form.linkedin?.trim() && form.workMode?.trim() && form.workMode !== '' && form.jobType?.trim() && form.jobType !== '';
    const comp = form.jobType === 'Internship'
      ? form.stipend?.trim() && form.duration?.trim()
      : form.jobType === 'Full-Time' ? form.salary?.trim() : false;
    const websiteOk = !form.website?.trim() || isValidUrl(form.website.trim());
    const linkedinOk = !form.linkedin?.trim() || isValidLinkedInUrl(form.linkedin.trim());
    const stipendOk = !form.stipend?.trim() || !stipendError;
    const durationOk = !form.duration?.trim() || !durationError;
    const salaryOk = !form.salary?.trim() || !salaryError;
    const locationOk = !form.companyLocation?.trim() || !companyLocationError;
    return !!(base && comp && websiteOk && linkedinOk && stipendOk && durationOk && salaryOk && locationOk);
  }, [form, websiteError, linkedinError, stipendError, durationError, salaryError, companyLocationError]);

  const isDriveDetailsComplete = useMemo(() => {
    return !!(form.driveDateISO || toISOFromDDMMYYYY(form.driveDateText)) && form.driveVenues.length > 0;
  }, [form.driveDateISO, form.driveDateText, form.driveVenues]);

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
    if (value === '' || isValidNumeric(value)) {
      update({ stipend: value });
      setStipendError('');
    } else {
      setStipendError('Please enter the amount');
    }
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
    if (value === '' || isValidNumeric(value.replace(/[,]/g, ''))) {
      update({ salary: value });
      setSalaryError('');
    } else {
      setSalaryError('Please enter the amount');
    }
  };

  const onCompanyLocationChange = (value) => {
    if (value === '' || isValidAlphabetic(value)) {
      update({ companyLocation: value });
      setCompanyLocationError('');
    } else {
      setCompanyLocationError('Please enter the location');
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
    update({ spocs: [...form.spocs, { fullName: '', email: '', phone: '' }] });
  };

  const removeSpoc = (idx) => {
    if (form.spocs.length > 1) {
      const next = [...form.spocs];
      next.splice(idx, 1);
      update({ spocs: next });
    }
  };

  const updateSpoc = (idx, field, value) => {
    const next = [...form.spocs];
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
      driveVenues: [],
    });

    setParseResult(null);
    setUploadError('');
  };

  const buildJobPayload = () => {
    // Ensure required fields are not empty strings
    const companyName = (form.company || '').trim();
    const description = (form.responsibilities || '').trim();
    const jobTitle = (form.jobTitle || '').trim();
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
      // Drive details
      driveDate: form.driveDateISO || toISOFromDDMMYYYY(form.driveDateText) || null,
      driveVenues: Array.isArray(form.driveVenues) ? form.driveVenues : [],
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
      alert('Please fill in at least Company and Job Title before saving as draft.');
      return;
    }
    
    try {
      setIsSaving(true);
      const payload = buildJobPayload();
      await saveJobDraft(payload);
      alert('Saved as draft successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save draft: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAnotherPosition = async () => {
    // Basic validation for saving position - only require company and job title
    if (!form.company?.trim() || !form.jobTitle?.trim()) {
      alert('Please fill in at least Company and Job Title before saving this position.');
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
        driveVenues: [],
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
      });

      setCollapsedSections(new Set());
      alert('Position saved; new form prefilled');
    } catch (err) {
      console.error(err);
      alert('Failed to add another position: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canPost) {
      // Provide specific validation feedback
      let missingFields = [];
      if (!isCompanyDetailsComplete) missingFields.push('Company Details');
      if (!isDriveDetailsComplete) missingFields.push('Drive Details');
      if (!isSkillsEligibilityComplete) missingFields.push('Skills & Eligibility');
      if (!isInterviewProcessComplete) missingFields.push('Interview Process');
      
      alert(`Please complete the following sections before submitting:\n\n• ${missingFields.join('\n• ')}`);
      return;
    }
    
    try {
      setPosting(true);
      const payload = buildJobPayload();
      
      // Debug: Log payload to see what's being sent
      console.log('Job Payload:', JSON.stringify(payload, null, 2));
      
      // Submit job for review - it will appear in ManageJobs "In Review" section
      const { jobId } = await submitJobForReview(payload);
      
      if (onCreated) onCreated();
      alert('Job submitted successfully! It has been sent for review and will appear in the "In Review" section of Manage Jobs.');
      resetForm();
    } catch (err) {
      console.error('Submit error:', err);
      
      // Handle network errors separately
      if (err?.isNetworkError || err?.message?.includes('Failed to connect') || err?.message?.includes('Failed to fetch')) {
        const backendPort = import.meta.env.VITE_API_URL?.match(/:(\d+)/)?.[1] || '3000';
        alert(`Network Error:\n\n${err.message}\n\nPlease check:\n1. Backend server is running (http://localhost:${backendPort})\n2. No firewall is blocking the connection\n3. Backend server logs for any errors`);
        return;
      }
      
      // Extract detailed validation errors if available
      let errorMessage = err?.message || 'Unknown error';
      if (err?.response?.errors && Array.isArray(err.response.errors)) {
        const validationErrors = err.response.errors.map(e => `• ${e.msg || e.message || e}`).join('\n');
        errorMessage = `Validation failed:\n\n${validationErrors}`;
      } else if (err?.response?.error) {
        errorMessage = err.response.error;
      } else if (err?.status) {
        errorMessage = `Server error (${err.status}): ${errorMessage}`;
      }
      
      alert(`Failed to submit job:\n\n${errorMessage}`);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header - ALWAYS VISIBLE */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Job Description</h2>
        <p className="text-sm text-slate-600">Please fill the following details</p>
      </div>

      {/* THREE CREATION METHOD OPTIONS - ALWAYS VISIBLE */}
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-sm p-1 shadow-sm border border-gray-200 inline-flex gap-2">
          <button
            onClick={() => setCreationMethod('manual')}
            className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${creationMethod === 'manual'
              ? 'bg-gradient-to-br from-blue-600 to-purple-700 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            Manual Entry
          </button>

          <button
            onClick={() => setCreationMethod('uploadJD')}
            className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${creationMethod === 'uploadJD'
              ? 'bg-gradient-to-b from-blue-600 to-purple-700 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            Upload JD
          </button>

          <button
            onClick={() => setCreationMethod('uploadExcel')}
            className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${creationMethod === 'uploadExcel'
              ? 'bg-gradient-to-tr to-blue-600 from-purple-700 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            Upload Excel
          </button>
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

      {/* MANUAL FORM */}
      {creationMethod === 'manual' && (
        <form onSubmit={handleSubmit} noValidate className="bg-white border border-slate-200 rounded-lg p-4 space-y-6">
          
          {/* Section 1: Company Details */}
          <section className="space-y-4 border-b-[1.5px] border-gray-700 pb-6 mb-6">
            <h3 className="text-lg font-semibold">Company Details</h3>

            {!isSectionCollapsed('company') && (
              <>
                {/* Company field taking full row */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-black font-medium">Company <span className="text-red-500">*</span>:</label>
                  <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${form.company?.trim() ? 'bg-green-100' : 'bg-gray-100'}`} placeholder="e.g. ABC Corp" value={form.company} onChange={(e) => update({ company: e.target.value })} />
                </div>

                {/* LinkedIn and Website fields half-half */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-blue-600 font-medium">LinkedIn <span className="text-red-500">*</span>:</label>
                    <input className={`border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-700 placeholder:text-gray-400 ${linkedinError ? 'border-red-400 bg-red-50' : form.linkedin?.trim() ? 'bg-green-100' : 'bg-gray-100'}`} placeholder="https://linkedin.com/company/example" value={form.linkedin} onChange={(e) => onLinkedInChange(e.target.value)} required />
                    {linkedinError && <p className="text-xs text-red-600 mt-1">{linkedinError}</p>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-blue-600 font-medium">Website <span className="text-red-500">*</span>:</label>
                    <input className={`border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-700 placeholder:text-gray-400 ${websiteError ? 'border-red-400 bg-red-50' : form.website?.trim() ? 'bg-green-100' : 'bg-gray-100'}`} placeholder="www.company.com" value={form.website} onChange={(e) => onWebsiteChange(e.target.value)} required />
                    {websiteError && <p className="text-xs text-red-600 mt-1">{websiteError}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Job Type Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium">Job Type <span className="text-red-500">*</span>:</label>
                    <div className="relative" ref={jobTypeDropdownRef}>
                      <button
                        type="button"
                        className={`w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-blue-100 text-left flex items-center justify-between ${form.jobType && form.jobType !== '' ? 'bg-green-100' : 'bg-gray-100'}`}
                        onClick={() => setShowJobTypes(prev => !prev)}
                      >
                        <span className="truncate">
                          {form.jobType || 'Select Job Type'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      </button>
                      {showJobTypes && (
                        <div className="absolute z-10 overflow-hidden w-full bg-white border-2 border-slate-300 rounded-md shadow-md">
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-green-100 cursor-pointer border-b border-slate-200 text-left"
                            onClick={() => {
                              onJobTypeChange('Internship');
                              setShowJobTypes(false);
                            }}
                          >
                            <span>Internship</span>
                          </button>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-green-100 cursor-pointer text-left"
                            onClick={() => {
                              onJobTypeChange('Full-Time');
                              setShowJobTypes(false);
                            }}
                          >
                            <span>Full-Time</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {form.jobType === 'Internship' ? (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-sm text-black font-medium">Stipend <span className="text-red-500">*</span>:</label>
                        <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${stipendError ? 'border-red-400 bg-red-50' : form.stipend?.trim() ? 'bg-green-100' : 'bg-gray-100'}`} placeholder="₹ per month (e.g. 15000)" value={form.stipend} onChange={(e) => onStipendChange(e.target.value)} />
                        {stipendError && <p className="text-xs text-red-600 mt-1">{stipendError}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-sm text-black font-medium">Duration <span className="text-red-500">*</span>:</label>
                        <input className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm pr-10 ${durationError ? 'border-red-400 bg-red-50' : form.duration?.trim() ? 'bg-green-100' : 'bg-gray-100'}`} placeholder="e.g. 6 months" value={form.duration} onChange={(e) => onDurationChange(e.target.value)} />
                        {durationError && <p className="text-xs text-red-600 mt-1">{durationError}</p>}
                      </div>
                    </>
                  ) : form.jobType === 'Full-Time' ? (
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-sm text-black font-medium">Salary (CTC) <span className="text-red-500">*</span>:</label>
                      <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${salaryError ? 'border-red-400 bg-red-50' : form.salary?.trim() ? 'bg-green-100' : 'bg-gray-100'}`} placeholder="₹ per annum (e.g. 12,00,000)" value={form.salary} onChange={(e) => onSalaryChange(e.target.value)} />
                      {salaryError && <p className="text-xs text-red-600 mt-1">{salaryError}</p>}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium">Job Title <span className="text-red-500">*</span>:</label>
                    <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${form.jobTitle?.trim() ? 'bg-green-100' : 'bg-gray-100'}`} placeholder="e.g. Full Stack Developer" value={form.jobTitle} onChange={(e) => update({ jobTitle: e.target.value })} />
                  </div>

                  {/* Work Mode Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium">Work Mode <span className="text-red-500">*</span>:</label>
                    <div className="relative" ref={workModeDropdownRef}>
                      <button
                        type="button"
                        className={`w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-blue-100 text-left flex items-center justify-between ${form.workMode && form.workMode !== '' ? 'bg-green-100' : 'bg-gray-100'}`}
                        onClick={() => setShowWorkModes(prev => !prev)}
                      >
                        <span className="truncate">
                          {form.workMode || 'Select Work Mode'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      </button>
                      {showWorkModes && (
                        <div className="absolute z-10 overflow-hidden w-full bg-white border-2 border-slate-300 rounded-md shadow-md">
                          {['On-site', 'Hybrid', 'Remote'].map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-green-100 cursor-pointer border-b border-slate-200 last:border-b-0 text-left"
                              onClick={() => {
                                update({ workMode: mode });
                                setShowWorkModes(false);
                              }}
                            >
                              <span>{mode}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-sm text-black font-medium">Company Location <span className="text-red-500">*</span>:</label>
                    <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${companyLocationError ? 'border-red-400 bg-red-50' : form.companyLocation?.trim() ? 'bg-green-100' : 'bg-gray-100'}`} placeholder="City, State (e.g. Bangalore, Karnataka)" value={form.companyLocation} onChange={(e) => onCompanyLocationChange(e.target.value)} />
                    {companyLocationError && <p className="text-xs text-red-600 mt-1">{companyLocationError}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium">Open Positions:</label>
                    <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${form.openings?.trim() ? 'bg-green-50' : 'bg-gray-50'}`} placeholder="e.g. 15" value={form.openings} onChange={(e) => update({ openings: e.target.value })} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm text-black font-medium">Roles & Responsibilities:</label>
                  <textarea
                    className={`border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[120px] max-h-[300px] resize-y ${form.responsibilities?.trim() ? 'bg-green-50' : 'bg-gray-50'}`}
                    placeholder="Outline responsibilities, tech stack, team, etc. (optional)"
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
                  <h4 className="text-md font-medium text-gray-800 mb-4">Company SPOC</h4>
                  {form.spocs.map((spoc, idx) => (
                    <div key={idx} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-gray-700">SPOC {idx + 1}</h5>
                        {form.spocs.length > 1 && (
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm text-black font-medium">Full Name:</label>
                          <input
                            className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${spoc.fullName?.trim() ? 'bg-green-50' : 'bg-white'}`}
                            placeholder="e.g. Amit Kumar"
                            value={spoc.fullName}
                            onChange={(e) => updateSpoc(idx, 'fullName', e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-sm text-black font-medium">Email ID:</label>
                          <input
                            type="email"
                            className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${spoc.email?.trim() ? 'bg-green-50' : 'bg-white'}`}
                            placeholder="e.g. amit.kumar@company.com"
                            value={spoc.email}
                            onChange={(e) => updateSpoc(idx, 'email', e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-sm text-black font-medium">Phone Number:</label>
                          <input
                            type="tel"
                            className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${spoc.phone?.trim() ? 'bg-green-50' : 'bg-white'}`}
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
          <section className="space-y-4 border-b-[1.5px] border-gray-600 pb-6 mb-6">
            <h3 className="text-lg font-semibold">About Drive</h3>

            {!isSectionCollapsed('drive') && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium">Drive Date <span className="text-red-500">*</span>:</label>
                    <div className="relative">
                      <input
                        className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm pr-10 ${driveDraft.driveDateText?.trim() ? 'bg-green-100' : 'bg-gray-100'}`}
                        placeholder="DD/MM/YYYY"
                        value={driveDraft.driveDateText || ''}
                        onChange={(e) => onDriveDateText(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => hiddenDateRef.current?.showPicker?.() || hiddenDateRef.current?.click()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900"
                        title="Pick a date"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                      <input ref={hiddenDateRef} type="date" className="sr-only" onChange={onPickDate} />
                    </div>
                  </div>

                  {/* Drive Venue Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium">Drive Venue <span className="text-red-500">*</span>:</label>
                    <div ref={venueDropdownRef} className="relative">
                      <button
                        type="button"
                        className={`w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-blue-100 text-left flex items-center justify-between ${driveDraft.driveVenues.length ? 'bg-green-100' : 'bg-gray-100'}`}
                        onClick={() => setShowVenues((v) => !v)}
                      >
                        <span>
                          {driveDraft.driveVenues.length ? driveDraft.driveVenues.join(', ') : 'Select venues'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      </button>
                      {showVenues && (
                        <div className="absolute z-10 overflow-hidden w-full bg-white border-2 border-slate-300 rounded-md shadow-lg">
                          {DRIVE_VENUES.map((v) => (
                            <label key={v} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-green-100 cursor-pointer border-b border-slate-200 last:border-b-0">
                              <input type="checkbox" checked={driveDraft.driveVenues.includes(v)} onChange={() => toggleVenue(v)} />
                              <span>{v}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
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
          <section className="space-y-4 border-b-[1.5px] border-gray-600 pb-6 mb-6">
            <h3 className="text-lg font-semibold">Skills & Eligibility</h3>

            {!isSectionCollapsed('skills') && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium">Qualification <span className="text-red-500">*</span>:</label>
                    <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${form.qualification?.trim() ? 'bg-green-100' : 'bg-gray-100'}`} placeholder="e.g. B.Tech, BCA, MCA" value={form.qualification} onChange={(e) => update({ qualification: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium">Specialization:</label>
                    <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${form.specialization?.trim() ? 'bg-green-50' : 'bg-gray-50'}`} placeholder="e.g. Computer Science (optional)" value={form.specialization} onChange={(e) => update({ specialization: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium">Year of Passing <span className="text-red-500">*</span>:</label>
                    <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${form.yop?.trim() ? 'bg-green-100' : 'bg-gray-100'}`} placeholder="e.g. 2025 or 25" value={form.yop} onChange={(e) => onYopChange(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium">Minimum CGPA/Percentage <span className="text-red-500">*</span>:</label>
                    <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${minCgpaError ? 'border-red-400 bg-red-50' : form.minCgpa?.trim() ? 'bg-green-100' : 'bg-gray-100'}`} placeholder="e.g. 7.0 or 70%" value={form.minCgpa} onChange={(e) => onMinCgpaChange(e.target.value)} onBlur={(e) => onMinCgpaBlur(e.target.value)} />
                    {minCgpaError && <p className="text-xs text-red-600 mt-1">{minCgpaError}</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm text-black font-medium">Skills <span className="text-red-500">*</span>:</label>
                  <div className={`relative border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[42px] flex flex-wrap items-center gap-1 ${form.skills.length > 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
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
                      placeholder={form.skills.length === 0 ? "e.g. JavaScript, React, Node.js (comma separated)" : ""}
                      value={form.skillsInput}
                      onChange={(e) => update({ skillsInput: e.target.value })}
                      onKeyDown={onSkillsKeyDown}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Year Gaps Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium">Year Gaps <span className="text-red-500">*</span>:</label>
                    <div className="relative" ref={gapAllowedDropdownRef}>
                      {!gapInputMode ? (
                        <>
                          <button
                            type="button"
                            className={`w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-blue-100 text-left flex items-center justify-between ${form.gapAllowed && form.gapAllowed !== '' ? 'bg-green-100' : 'bg-gray-100'}`}
                            onClick={() => setShowGapAllowed(prev => !prev)}
                          >
                            <span className="truncate">
                              {form.gapAllowed === 'Custom' && form.gapYears
                                ? `${form.gapYears} Year/s Allowed`
                                : form.gapAllowed || 'Select Gap Policy'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          </button>
                          {showGapAllowed && (
                            <div className="absolute z-10 overflow-hidden w-full bg-white border-2 border-slate-300 rounded-md shadow-lg">
                              {['Allowed', 'Not Allowed'].map((policy) => (
                                <button
                                  key={policy}
                                  type="button"
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-green-100 cursor-pointer border-b border-slate-200 text-left"
                                  onClick={() => {
                                    update({ gapAllowed: policy, gapYears: '' });
                                    setShowGapAllowed(false);
                                  }}
                                >
                                  <span>{policy}</span>
                                </button>
                              ))}
                              <button
                                type="button"
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-green-100 cursor-pointer text-left"
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
                        <div className="border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm w-full flex items-center">
                          <input
                            data-gap-input
                            type="text"
                            className="bg-transparent border-none outline-none text-sm w-8 text-center"
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
                          <span className="text-sm ml-1">Year/s Allowed</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Backlogs Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium">Active Backlogs <span className="text-red-500">*</span>:</label>
                    <div className="relative" ref={backlogsDropdownRef}>
                      <button
                        type="button"
                        className={`w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-blue-100 text-left flex items-center justify-between ${form.backlogs && form.backlogs !== '' ? 'bg-green-100' : 'bg-gray-100'}`}
                        onClick={() => setShowBacklogs(prev => !prev)}
                      >
                        <span className="truncate">
                          {form.backlogs || 'Select Backlog Policy'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      </button>
                      {showBacklogs && (
                        <div className="absolute z-10 overflow-hidden w-full bg-white border-2 border-slate-300 rounded-md shadow-lg">
                          {['Allowed', 'Not Allowed'].map((policy) => (
                            <button
                              key={policy}
                              type="button"
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-green-100 cursor-pointer border-b border-slate-200 last:border-b-0 text-left"
                              onClick={() => {
                                update({ backlogs: policy });
                                setShowBacklogs(false);
                              }}
                            >
                              <span>{policy}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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
          <section className="space-y-4 border-b-[1.5px] border-gray-600 pb-6 mb-6">
            <h3 className="text-lg font-semibold">Interview Process</h3>

            {!isSectionCollapsed('interview') && (
              <>
                {/* Base fixed rounds */}
                <div className="flex flex-wrap items-center gap-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="text-xs font-medium text-black whitespace-nowrap">{[`${toRoman(1)} Round`, `${toRoman(2)} Round`, `${toRoman(3)} Round`][i]} <span className="text-red-500">*</span></div>
                      <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm w-48 ${form.baseRoundDetails[i]?.trim() ? 'bg-green-100' : 'bg-gray-100'}`} placeholder="e.g. Online test, DS&A" value={form.baseRoundDetails[i]} onChange={(e) => updateBaseRoundDetail(i, e.target.value)} required />
                      {i < 2 && <span className="text-slate-300">—</span>}
                    </div>
                  ))}
                </div>

                {/* Extra rounds */}
                <div className="flex flex-wrap items-center gap-4">
                  {form.extraRounds.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="text-xs font-medium text-slate-600 whitespace-nowrap">{r.title}</div>
                      <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm w-48 ${r.detail?.trim() ? 'bg-green-50' : 'bg-gray-50'}`} placeholder="e.g. Managerial round (optional)" value={r.detail} onChange={(e) => updateExtraRoundDetail(idx, e.target.value)} />
                      <button type="button" onClick={() => removeExtraRound(idx)} className="text-slate-500 hover:text-red-600" title="Remove this round">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addRound} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                    <Plus className="w-4 h-4" /> Add Round
                  </button>
                </div>

                {/* Agreement notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium flex items-center gap-2">
                      Service Agreement:
                      <div className="relative">
                        <Info
                          className="w-3 h-3 text-slate-500 hover:text-slate-700 cursor-help"
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
                    <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${form.serviceAgreement?.trim() ? 'bg-green-50' : 'bg-gray-50'}`} placeholder="e.g. 1 year bond (optional)" value={form.serviceAgreement} onChange={(e) => update({ serviceAgreement: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black font-medium flex items-center gap-2">
                      Blocking Period:
                      <div className="relative">
                        <Info
                          className="w-3 h-3 text-slate-500 hover:text-slate-700 cursor-help"
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
                    <input className={`border border-gray-300 rounded-md px-3 py-2 text-sm ${form.blockingPeriod?.trim() ? 'bg-green-50' : 'bg-gray-50'}`} placeholder="e.g. 6 months (optional)" value={form.blockingPeriod} onChange={(e) => update({ blockingPeriod: e.target.value })} />
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

          {/* Final Section: Instructions + Buttons */}
          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-black font-medium">Any Specific Instructions:</label>
              <textarea
                className={`border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[120px] max-h-[250px] resize-y ${form.instructions?.trim() ? 'bg-green-50' : 'bg-gray-50'}`}
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

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canPost || posting}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm text-white ${!canPost || posting ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {posting ? <Loader className="w-4 h-4 animate-spin" /> : null}
                Submit for Review
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || (!form.company?.trim() || !form.jobTitle?.trim())}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm border ${isSaving || (!form.company?.trim() || !form.jobTitle?.trim()) ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'}`}
              >
                {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : null}
                Save (Draft)
              </button>
              <button
                type="button"
                onClick={handleAddAnotherPosition}
                disabled={isSaving || (!form.company?.trim() || !form.jobTitle?.trim())}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm border ${isSaving || (!form.company?.trim() || !form.jobTitle?.trim()) ? 'bg-emerald-200 text-emerald-500 border-emerald-300 cursor-not-allowed' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'}`}
              >
                {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : null}
                + Add Another Position
              </button>
              <button
                type="button"
                onClick={() => resetForm()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm border border-slate-200 hover:bg-slate-50"
              >
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

