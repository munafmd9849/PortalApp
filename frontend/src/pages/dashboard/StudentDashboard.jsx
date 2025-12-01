import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/dashboard/shared/DashboardLayout';
import DashboardHome from '../../components/dashboard/student/DashboardHome';
import JobDescription from '../../components/dashboard/student/JobDescription';
import { useAuth } from '../../hooks/useAuth';
import { 
  getStudentProfile, 
  updateCompleteStudentProfile, 
  createCompleteStudentProfile,
  getStudentSkills,
  getEducationalBackground,
} from '../../services/students';
import { getStudentApplications, applyToJob, subscribeStudentApplications } from '../../services/applications';
import { getTargetedJobsForStudent, subscribeJobs, subscribePostedJobs } from '../../services/jobs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SiCodeforces, SiGeeksforgeeks } from 'react-icons/si';
import { FaHackerrank, FaInstagram, FaYoutube } from 'react-icons/fa';
import {
  Home,
  Briefcase,
  Calendar,
  SquarePen,
  Code2,
  Trophy,
  Github,
  Youtube,
  ExternalLink,
  LogOut,
  GripVertical,
  ClipboardList,
  BookOpen,
  FileText,
  Trash2,
  Upload,
  FilePlus,
  ScanLine,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Info,
  AlertTriangle,
  X
} from 'lucide-react';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import ResumeBuilder from '../../components/resume/ResumeBuilder';
import Query from '../../components/dashboard/student/Query';
import Resources from '../../components/dashboard/student/Resources';

const normalizeProfileSnapshot = (profile = {}) => ({
  fullName: profile.fullName || '',
  email: profile.email || '',
  phone: profile.phone || '',
  enrollmentId: profile.enrollmentId || '',
  cgpa:
    profile.cgpa !== undefined && profile.cgpa !== null
      ? String(profile.cgpa)
      : '',
  batch: profile.batch || '',
  center: profile.center || '',
  school: profile.school || '',
  bio: profile.bio || '',
  Headline: profile.Headline || profile.headline || '',
  city: profile.city || '',
  stateRegion: profile.stateRegion || profile.state || '',
  linkedin: profile.linkedin || '',
  githubUrl: profile.githubUrl || profile.github || '',
  youtubeUrl: profile.youtubeUrl || profile.youtube || '',
  instagramUrl: profile.instagramUrl || profile.instagram || '',
  leetcode: profile.leetcode || '',
  codeforces: profile.codeforces || '',
  gfg: profile.gfg || '',
  hackerrank: profile.hackerrank || '',
  profilePhoto: profile.profilePhoto || '',
  jobFlexibility: profile.jobFlexibility || '',
});

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data caching to avoid reloading on tab switches
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState(null);
  
  // Scroll to top when activeTab changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(15);
  const [isDragging, setIsDragging] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dragRef = useRef(null);
  
  // UPDATED: Remove static profile data - students must have complete profiles
  const [batch, setBatch] = useState('');
  const [center, setCenter] = useState('');
  const [school, setSchool] = useState('');
  
  // Other profile states
  const [isChecked, setIsChecked] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState('info');
  const [showFloatingAlert, setShowFloatingAlert] = useState(false);

  // Edit Profile form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [Headline, setHeadline] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [leetcode, setLeetcode] = useState('');
  const [codeforces, setCodeforces] = useState('');
  const [gfg, setGfg] = useState('');
  const [hackerrank, setHackerrank] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [jobFlexibility, setJobFlexibility] = useState('');
  const initialProfileRef = useRef(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const prevActiveTabRef = useRef('dashboard');
  const discardAlertTimeoutRef = useRef(null);

  const getCurrentProfileSnapshot = useCallback(() => normalizeProfileSnapshot({
    fullName,
    email,
    phone,
    enrollmentId,
    cgpa,
    batch,
    center,
    school,
    bio,
    Headline,
    city,
    stateRegion,
    linkedin,
    githubUrl,
    youtubeUrl,
    instagramUrl,
    leetcode,
    codeforces,
    gfg,
    hackerrank,
    profilePhoto,
    jobFlexibility,
  }), [
    fullName,
    email,
    phone,
    enrollmentId,
    cgpa,
    batch,
    center,
    school,
    bio,
    Headline,
    city,
    stateRegion,
    linkedin,
    githubUrl,
    youtubeUrl,
    instagramUrl,
    leetcode,
    codeforces,
    gfg,
    hackerrank,
    profilePhoto,
    jobFlexibility,
  ]);

  const resetProfileForm = useCallback(() => {
    const snapshot = initialProfileRef.current;
    if (!snapshot) return;
    setFullName(snapshot.fullName);
    setEmail(snapshot.email);
    setPhone(snapshot.phone);
    setEnrollmentId(snapshot.enrollmentId);
    setCgpa(snapshot.cgpa);
    setBatch(snapshot.batch);
    setCenter(snapshot.center);
    setSchool(snapshot.school);
    setBio(snapshot.bio);
    setHeadline(snapshot.Headline);
    setCity(snapshot.city);
    setStateRegion(snapshot.stateRegion);
    setLinkedin(snapshot.linkedin);
    setGithubUrl(snapshot.githubUrl);
    setYoutubeUrl(snapshot.youtubeUrl);
    setInstagramUrl(snapshot.instagramUrl);
    setLeetcode(snapshot.leetcode);
    setCodeforces(snapshot.codeforces);
    setGfg(snapshot.gfg);
    setHackerrank(snapshot.hackerrank);
    setProfilePhoto(snapshot.profilePhoto);
    setJobFlexibility(snapshot.jobFlexibility);
  }, []);
  
  
  // Skills state
  const [skillsEntries, setSkillsEntries] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [newSkill, setNewSkill] = useState({ skillName: '', rating: 1 });
  
  // Applications state
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  
  // Jobs state
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [applying, setApplying] = useState({});
  
  // Job Description Modal state
  const [selectedJob, setSelectedJob] = useState(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  // Case-insensitive string matching helper
  const matchesIgnoreCase = (str1, str2) => {
    if (!str1 || !str2) return false;
    return str1.toLowerCase().trim() === str2.toLowerCase().trim();
  };

  // Check if student profile is complete for job access
  // All fields marked with * (red asterisk) in editProfile section are required
  const isProfileComplete = useCallback(() => {
    return fullName && fullName.trim() &&
           email && email.trim() && 
           phone && phone.trim() &&
           enrollmentId && enrollmentId.trim() &&
           school && school.trim() &&
           center && center.trim() &&
           batch && batch.trim();
  }, [fullName, email, phone, enrollmentId, school, center, batch]);
  
  // Memoized profile completeness status to prevent infinite loops
  const profileComplete = useMemo(() => {
    return fullName && email && phone && enrollmentId && school && center && batch;
  }, [fullName, email, phone, enrollmentId, school, center, batch]);

  useEffect(() => {
    if (!initialProfileRef.current) return;
    const currentSnapshot = getCurrentProfileSnapshot();
    const initialSnapshot = initialProfileRef.current;
    const dirty = Object.keys(currentSnapshot).some(
      (key) => (initialSnapshot[key] ?? '') !== (currentSnapshot[key] ?? '')
    );
    setIsFormDirty(dirty);
  }, [getCurrentProfileSnapshot]);

  useEffect(() => {
    const previousTab = prevActiveTabRef.current;
    if (previousTab === 'editProfile' && activeTab !== 'editProfile') {
      if (discardAlertTimeoutRef.current) {
        clearTimeout(discardAlertTimeoutRef.current);
        discardAlertTimeoutRef.current = null;
      }

      if (isFormDirty) {
        resetProfileForm();
        setIsFormDirty(false);
        setIsChecked(false);
        setValidationErrors({});
        setAlertMessage('Unsaved profile changes were discarded.');
        setAlertType('info');
        setShowFloatingAlert(true);

        discardAlertTimeoutRef.current = setTimeout(() => {
          setShowFloatingAlert(false);
          setAlertMessage(null);
          discardAlertTimeoutRef.current = null;
        }, 3000);
      }
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab, isFormDirty, resetProfileForm]);

  useEffect(() => {
    return () => {
      if (discardAlertTimeoutRef.current) {
        clearTimeout(discardAlertTimeoutRef.current);
      }
    };
  }, []);

  // Job loading with proper targeting logic
  const loadJobsData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingJobs(true);
    
    try {
      // Get targeted jobs from backend API
      const jobs = await getTargetedJobsForStudent(user.id);
      
      // Apply job targeting logic with proper "ALL" handling
      if (profileComplete && school && center && batch) {
        const targetedJobs = jobs.filter(job => {
          const targetCenters = job.targetCenters || [];
          const targetSchools = job.targetSchools || [];
          const targetBatches = job.targetBatches || [];
          
          // If no targeting specified, show to all students
          if (targetCenters.length === 0 && targetSchools.length === 0 && targetBatches.length === 0) {
            return true;
          }
          
          // CENTER MATCH LOGIC:
          let centerMatch = false;
          if (targetCenters.length === 0) {
            centerMatch = true; // No center targeting
          } else if (targetCenters.includes('ALL')) {
            centerMatch = true; // "ALL" means every student
          } else {
            // Exact match required (case-insensitive)
            centerMatch = targetCenters.some(targetCenter => 
              targetCenter.toLowerCase().trim() === center.toLowerCase().trim()
            );
          }
          
          // SCHOOL MATCH LOGIC:
          let schoolMatch = false;
          if (targetSchools.length === 0) {
            schoolMatch = true; // No school targeting
          } else if (targetSchools.includes('ALL')) {
            schoolMatch = true; // "ALL" means every student
          } else {
            // Exact match required (case-insensitive)
            schoolMatch = targetSchools.some(targetSchool => 
              targetSchool.toLowerCase().trim() === school.toLowerCase().trim()
            );
          }
          
          // BATCH MATCH LOGIC:
          let batchMatch = false;
          if (targetBatches.length === 0) {
            batchMatch = true; // No batch targeting
          } else if (targetBatches.includes('ALL')) {
            batchMatch = true; // "ALL" means every student
          } else {
            // Exact match required (case-insensitive)
            batchMatch = targetBatches.some(targetBatch => 
              targetBatch.toLowerCase().trim() === batch.toLowerCase().trim()
            );
          }
          
          // Job is eligible only if ALL three criteria match
          return centerMatch && schoolMatch && batchMatch;
        });
        
        setJobs(targetedJobs);
      } else {
        setJobs(jobs);
      }
      
    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, [school, center, batch, profileComplete, user?.id]); // Re-load when profile changes

  // UPDATED: Load profile data function without defaults
  // Use ref to track loading state to prevent infinite loops
  const loadingProfileRef = useRef(false);
  
  const loadProfile = useCallback(async (forceRefresh = false) => {
    if (!user?.id || loadingProfileRef.current) return;
    
    // Check cache validity
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000;
    if (!forceRefresh && dataLoaded && lastLoadTime && (now - lastLoadTime) < twoMinutes) {
      return;
    }
    
    loadingProfileRef.current = true;
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('📖 Loading student profile from backend...');
      }
      const profileData = await getStudentProfile(user.id);
      
      if (profileData) {
        
        // Update all profile states - REMOVED DEFAULT VALUES
        setFullName(profileData.fullName || '');
        setEmail(profileData.email || '');
        setPhone(profileData.phone || '');
        setEnrollmentId(profileData.enrollmentId || '');
        setCgpa(profileData.cgpa?.toString?.() || '');
        setBatch(profileData.batch || ''); // No default - must be set
        setCenter(profileData.center || ''); // No default - must be set
        setSchool(profileData.school || ''); // No default - must be set
        setBio(profileData.bio || '');
        setHeadline(profileData.headline || profileData.Headline || ''); // Handle both cases
        setCity(profileData.city || '');
        setStateRegion(profileData.stateRegion || profileData.state || '');
        setLinkedin(profileData.linkedin || '');
        setLeetcode(profileData.leetcode || '');
        setCodeforces(profileData.codeforces || '');
        setGfg(profileData.gfg || '');
        setHackerrank(profileData.hackerrank || '');
        setGithubUrl(profileData.githubUrl || profileData.github || '');
        setYoutubeUrl(profileData.youtubeUrl || profileData.youtube || '');
        setInstagramUrl(profileData.instagramUrl || profileData.instagram || '');
        setProfilePhoto(profileData.profilePhoto || '');
        setJobFlexibility(profileData.jobFlexibility || '');

        const sanitizedProfile = {
          fullName: profileData.fullName || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          enrollmentId: profileData.enrollmentId || '',
          cgpa: profileData.cgpa?.toString?.() || '',
          batch: profileData.batch || '',
          center: profileData.center || '',
          school: profileData.school || '',
          bio: profileData.bio || '',
          Headline: profileData.headline || profileData.Headline || '',
          city: profileData.city || '',
          stateRegion: profileData.stateRegion || profileData.state || '',
          linkedin: profileData.linkedin || '',
          githubUrl: profileData.githubUrl || profileData.github || '',
          youtubeUrl: profileData.youtubeUrl || profileData.youtube || '',
          instagramUrl: profileData.instagramUrl || profileData.instagram || '',
          leetcode: profileData.leetcode || '',
          codeforces: profileData.codeforces || '',
          gfg: profileData.gfg || '',
          hackerrank: profileData.hackerrank || '',
          profilePhoto: profileData.profilePhoto || '',
          jobFlexibility: profileData.jobFlexibility || '',
        };
        initialProfileRef.current = normalizeProfileSnapshot(sanitizedProfile);
        setIsFormDirty(false);

      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ No profile data found - new user?');
        }
        // Keep empty states for new users
        initialProfileRef.current = normalizeProfileSnapshot({});
        setIsFormDirty(false);
      }
      
      setDataLoaded(true);
      setLastLoadTime(now);
      
    } catch (err) {
      console.error('❌ Failed to load profile data:', err);
      setDataLoaded(true); // Still mark as loaded to prevent infinite retries
    } finally {
      loadingProfileRef.current = false;
    }
  }, [user?.id]); // Removed dataLoaded and lastLoadTime from dependencies

  const loadSkillsData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingSkills(true);
      const skillsData = await getStudentSkills(user.id);
      setSkillsEntries(skillsData || []);
    } catch (err) {
      console.error('Failed to load skills data', err);
    } finally {
      setLoadingSkills(false);
    }
  }, [user?.id]);

  const loadApplicationsData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingApplications(true);
    try {
      const applicationsData = await getStudentApplications(user.id);
      setApplications(applicationsData || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
      setApplications([]);
    } finally {
      setLoadingApplications(false);
    }
  }, [user?.id]);

  const handleApplyToJob = async (job) => {
    if (!user?.id || !job?.id) {
      console.error('Missing user ID or job ID');
      return;
    }

    try {
      setApplying(prev => ({ ...prev, [job.id]: true }));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 Applying to job:', {
          jobId: job.id,
          jobTitle: job.jobTitle,
          companyId: job.companyId,
          companyName: job.company?.name
        });
      }
      
      const companyId = job.companyId || job.company?.id || null;
      await applyToJob(user.id, job.id, companyId);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Application submitted successfully');
      }
      
    } catch (error) {
      console.error('❌ Error applying to job:', error);
      alert('Failed to apply to job. Please try again.');
    } finally {
      setApplying(prev => ({ ...prev, [job.id]: false }));
    }
  };

  const hasApplied = (jobId) => {
    return applications.some(app => app.jobId === jobId);
  };

  // Job Description Modal handlers
  const handleKnowMore = (job) => {
    setSelectedJob(job);
    setIsJobModalOpen(true);
  };

  const handleCloseJobModal = () => {
    setIsJobModalOpen(false);
    setSelectedJob(null);
  };


  // Handle URL parameters to set active tab
  useEffect(() => {
    const tab = searchParams.get('tab');

    const handleEditProfileClick = () => setActiveTab('editProfile');
    const handleNavigateToJobs = () => setActiveTab('jobs');
    const handleNavigateToApplications = () => setActiveTab('applications');

    window.addEventListener('editProfileClicked', handleEditProfileClick);
    window.addEventListener('navigateToJobs', handleNavigateToJobs);
    window.addEventListener('navigateToApplications', handleNavigateToApplications);

    if (tab && ['dashboard', 'jobs', 'calendar', 'applications', 'resources', 'resume', 'editProfile'].includes(tab)) {
      const isRefresh = window.performance.navigation?.type === 1 ||
        window.performance.getEntriesByType('navigation')[0]?.type === 'reload';

      if (!isRefresh || tab !== 'editProfile') {
        setActiveTab(tab);
      } else {
        setActiveTab('dashboard');
        navigate('/student', { replace: true });
      }
    } else {
      setActiveTab('dashboard');
    }

    return () => {
      window.removeEventListener('editProfileClicked', handleEditProfileClick);
      window.removeEventListener('navigateToJobs', handleNavigateToJobs);
      window.removeEventListener('navigateToApplications', handleNavigateToApplications);
    };
  }, [searchParams, navigate]);

  // Load profile when user is available (only once)
  useEffect(() => {
    if (user?.id && !dataLoaded) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on user.id, loadProfile is stable

  // Load skills after profile is loaded (only once)
  const skillsLoadedRef = useRef(false);
  useEffect(() => {
    if (user?.id && dataLoaded && !skillsLoadedRef.current) {
      skillsLoadedRef.current = true;
      loadSkillsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, dataLoaded]); // Remove loadSkillsData from dependencies

  // Track if jobs/applications have been loaded to prevent repeated calls
  const dataLoadingRef = useRef({ jobs: false, applications: false });
  
  // UPDATED: Load data once when profile is complete
  useEffect(() => {
    if (user?.id && profileComplete && !dataLoadingRef.current.jobs) {
      // Load jobs once when profile is complete
      dataLoadingRef.current.jobs = true;
      loadJobsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profileComplete]); // Remove loadJobsData from dependencies
  
  // Load applications once (even without complete profile)
  useEffect(() => {
    if (user?.id && !dataLoadingRef.current.applications) {
      dataLoadingRef.current.applications = true;
      loadApplicationsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Remove loadApplicationsData from dependencies

  // Validation helper functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,11}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const validateCGPA = (cgpa) => {
    const cgpaNum = parseFloat(cgpa);
    return !isNaN(cgpaNum) && cgpaNum >= 0.0 && cgpaNum <= 10.0;
  };

  const validateURL = (url) => {
    if (!url.trim()) return true; // Optional field
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const validateProfile = () => {
    const errors = [];
    const missingFields = [];

    // Required field validations with field tracking
    if (!fullName.trim()) {
      errors.push('Full name is required');
      missingFields.push({ field: 'fullName', section: 'basic' });
    }
    if (!email.trim()) {
      errors.push('Email is required');
      missingFields.push({ field: 'email', section: 'basic' });
    } else if (!validateEmail(email.trim())) {
      errors.push('Please enter a valid email address');
      missingFields.push({ field: 'email', section: 'basic' });
    }
    
    if (!phone.trim()) {
      errors.push('Phone number is required');
      missingFields.push({ field: 'phone', section: 'basic' });
    } else if (!validatePhone(phone.trim())) {
      errors.push('Please enter a valid phone number');
      missingFields.push({ field: 'phone', section: 'basic' });
    }

    if (!enrollmentId.trim()) {
      errors.push('Enrollment ID is required');
      missingFields.push({ field: 'enrollmentId', section: 'basic' });
    }

    if (!school.trim()) {
      errors.push('School selection is required');
      missingFields.push({ field: 'school', section: 'academic' });
    }

    if (!center.trim()) {
      errors.push('Center selection is required');
      missingFields.push({ field: 'center', section: 'academic' });
    }

    if (!batch.trim()) {
      errors.push('Batch selection is required');
      missingFields.push({ field: 'batch', section: 'academic' });
    }

    // Optional field validations
    if (cgpa && !validateCGPA(cgpa)) errors.push('CGPA must be between 0 and 10');
    
    // URL validations for social profiles
    if (linkedin && !validateURL(linkedin)) errors.push('Please enter a valid LinkedIn URL');
    if (githubUrl && !validateURL(githubUrl)) errors.push('Please enter a valid GitHub URL');
    if (youtubeUrl && !validateURL(youtubeUrl)) errors.push('Please enter a valid YouTube URL');

    return { errors, missingFields };
  };

  // Real-time field validation
  const validateField = (fieldName, value) => {
    const errors = { ...validationErrors };
    
    switch (fieldName) {
      case 'fullName':
        if (!value.trim()) {
          errors.fullName = 'Full name is required';
        } else {
          delete errors.fullName;
        }
        break;
      case 'email':
        if (!value.trim()) {
          errors.email = 'Email is required';
        } else if (!validateEmail(value.trim())) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        break;
      case 'phone':
        if (!value.trim()) {
          errors.phone = 'Phone number is required';
        } else if (!validatePhone(value.trim())) {
          errors.phone = 'Please enter a valid phone number';
        } else {
          delete errors.phone;
        }
        break;
      case 'enrollmentId':
        if (!value.trim()) {
          errors.enrollmentId = 'Enrollment ID is required';
        } else if (value.trim().length < 3) {
          errors.enrollmentId = 'Enrollment ID must be at least 3 characters';
        } else {
          delete errors.enrollmentId;
        }
        break;
      case 'school':
        if (!value.trim()) {
          errors.school = 'School selection is required';
        } else {
          delete errors.school;
        }
        break;
      case 'center':
        if (!value.trim()) {
          errors.center = 'Center selection is required';
        } else {
          delete errors.center;
        }
        break;
      case 'batch':
        if (!value.trim()) {
          errors.batch = 'Batch selection is required';
        } else {
          delete errors.batch;
        }
        break;
      case 'cgpa':
        if (value && !validateCGPA(value)) {
          errors.cgpa = 'CGPA must be between 0 and 10';
        } else {
          delete errors.cgpa;
        }
        break;
      default:
        break;
    }
    
    setValidationErrors(errors);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      alert('You must be logged in to save your profile.');
      return;
    }

    // Validate form data
    const validation = validateProfile();
    if (validation.errors.length > 0) {
      // Focus on first missing field and scroll to its section
      if (validation.missingFields.length > 0) {
        const firstMissing = validation.missingFields[0];
        const fieldElement = document.getElementById(firstMissing.field);
        if (fieldElement) {
          fieldElement.focus();
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      setAlertMessage('Please fix the following errors:\n\n' + validation.errors.join('\n'));
      setAlertType('error');
      setShowFloatingAlert(true);
      
      setTimeout(() => {
        setShowFloatingAlert(false);
        setAlertMessage(null);
      }, 4000);
      return;
    }

    try {
      setSaving(true);
      
      const profileData = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        enrollmentId: enrollmentId.trim(),
        cgpa: cgpa ? Number(cgpa) : null,
        batch,
        center,
        bio: bio.trim(),
        Headline: Headline.trim(),
        city: city.trim(),
        stateRegion: stateRegion.trim(),
        linkedin: linkedin.trim(),
        githubUrl: githubUrl.trim(),
        youtubeUrl: youtubeUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        leetcode: leetcode.trim(),
        codeforces: codeforces.trim(),
        gfg: gfg.trim(),
        hackerrank: hackerrank.trim(),
        school: school.trim(),
        profilePhoto: profilePhoto.trim(),
        jobFlexibility: jobFlexibility.trim(),
      };

      // Show success immediately for better UX (optimistic update)
      setAlertMessage('Successfully Update Profile Details');
      setAlertType('success');
      setShowFloatingAlert(true);
      setIsChecked(false);
      
      // Save to database in background
      const existing = await getStudentProfile(user.id);
      if (existing) {
        await updateCompleteStudentProfile(user.id, profileData, []);
      } else {
        await createCompleteStudentProfile(user.id, profileData, []);
      }
      initialProfileRef.current = normalizeProfileSnapshot(profileData);
      setIsFormDirty(false);
      
      // Dispatch custom event to notify DashboardLayout to reload profile
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { userId: user.id } 
      }));
      
      setTimeout(() => {
        setShowFloatingAlert(false);
        setAlertMessage(null);
        setActiveTab('dashboard');
      }, 3000);
    } catch (err) {
      console.error('Failed to save profile', err);
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        response: err.response,
        code: err.code,
      });
      
      // More specific error messages
      let errorMessage = 'Failed to save profile. ';
      
      // Check for backend error response
      if (err.response?.error) {
        errorMessage += err.response.error;
      } else if (err.message) {
        // Remove "Failed to update profile" if it's already in the message to avoid duplication
        const message = err.message.replace(/^Failed to (save|update) profile\.?\s*/i, '');
        errorMessage += message || 'Failed to update profile';
      } else if (err.code === 'permission-denied') {
        errorMessage += 'You do not have permission to update this profile.';
      } else if (err.code === 'network-request-failed') {
        errorMessage += 'Please check your internet connection and try again.';
      } else if (err.code === 'unavailable') {
        errorMessage += 'Service is temporarily unavailable. Please try again later.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      setAlertMessage(errorMessage);
      setAlertType('error');
      setShowFloatingAlert(true);
      
      setTimeout(() => {
        setShowFloatingAlert(false);
        setAlertMessage(null);
      }, 4000);
    } finally {
      setSaving(false);
    }
  };


  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'jobs', label: 'Explore Jobs', icon: Briefcase },
    { id: 'resume', label: 'Resume', icon: FileText },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'applications', label: 'Track Applications', icon: ClipboardList },
    { id: 'resources', label: 'Placement Resources', icon: BookOpen },
    { id: 'editProfile', label: 'Edit Profile', icon: SquarePen },
    { id: 'raiseQuery', label: 'Raise Query', icon: AlertCircle },
  ];

  const LeetCodeIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="m15.42 16.94-2.25 2.17a2.1 2.1 0 0 1-1.52.56 2.1 2.1 0 0 1-1.52-.56l-3.61-3.63a2.18 2.18 0 0 1-.58-1.55 2.07 2.07 0 0 1 .58-1.52l3.6-3.65a2.1 2.1 0 0 1 1.53-.54 2.08 2.08 0 0 1 1.52.55l2.25 2.17A1.14 1.14 0 0 0 17 9.33l-2.17-2.2a4.24 4.24 0 0 0-2-1.12l2.06-2.08a1.15 1.15 0 0 0-1.62-1.62l-8.43 8.42a4.48 4.48 0 0 0-1.24 3.2 4.57 4.57 0 0 0 1.24 3.23l3.63 3.63A4.38 4.38 0 0 0 11.66 22a4.45 4.45 0 0 0 3.2-1.25L17 18.56a1.14 1.14 0 0 0-1.61-1.62z"></path>
      <path d="M19.34 12.84h-8.45a1.12 1.12 0 0 0 0 2.24h8.45a1.12 1.12 0 0 0 0-2.24"></path>
    </svg>
  );

  const skillsCredentials = [
    { id: 'leetcode', label: 'LeetCode', icon: LeetCodeIcon, color: 'text-orange-600' },
    { id: 'codeforces', label: 'Codeforces', icon: SiCodeforces, color: 'text-blue-600' },
    { id: 'gfg', label: 'GeeksforGeeks', icon: SiGeeksforgeeks, color: 'text-green-600' },
    { id: 'hackerrank', label: 'HackerRank', icon: FaHackerrank, color: 'text-emerald-600' },
    { id: 'github', label: 'GitHub', icon: Github, color: 'text-gray-700' },
    { id: 'instagram', label: 'Instagram', icon: FaInstagram, color: 'text-pink-500' },
    { id: 'youtube', label: 'YouTube', icon: FaYoutube, color: 'text-red-600' },
  ];

  const visibleSkillsCredentials = React.useMemo(() => {
    if (school === 'SOH') {
      // School of HealthCare: No Skills & Credentials section
      return [];
    } else if (school === 'SOM') {
      // School of Management: Only Instagram and YouTube
      return skillsCredentials.filter((skill) => ['instagram', 'youtube'].includes(skill.id));
    } else if (school === 'SOT') {
      // School of Technology: All skills except Instagram
      return skillsCredentials.filter((skill) => skill.id !== 'instagram');
    } else {
      // Default: Show all skills (for when school is not yet selected)
      return skillsCredentials;
    }
  }, [school]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    // Clear alert when switching tabs
    setShowFloatingAlert(false);
    setAlertMessage(null);
  };

  const handleSkillClick = (skillId) => {
    const urls = {
      leetcode: 'https://leetcode.com',
      codeforces: 'https://codeforces.com',
      gfg: 'https://geeksforgeeks.org',
      hackerrank: 'https://hackerrank.com',
      github: 'https://github.com',
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com'
    };
    window.open(urls[skillId], '_blank');
  };

  const handleLogout = async () => {
    try {
      console.log('Logout button clicked - starting logout process');
      await logout();
      console.log('Logout successful - navigating to home');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout failed: ' + error.message);
    }
  };

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const windowWidth = window.innerWidth;
    const newWidth = (e.clientX / windowWidth) * 100;

    // Constrain between 5% and 15%
    const constrainedWidth = Math.min(Math.max(newWidth, 5), 15);
    setSidebarWidth(constrainedWidth);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'applied': return <Clock size={16} />;
      case 'shortlisted': return <AlertCircle size={16} />;
      case 'interviewed': return <CheckCircle size={16} />;
      case 'offered': return <CheckCircle size={16} />;
      case 'selected': return <CheckCircle size={16} />;
      case 'rejected': return <XCircle size={16} />;
      case 'job_removed': return <AlertTriangle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied': return 'bg-[#3c80a7]/20 text-[#3c80a7]';
      case 'shortlisted': return 'bg-yellow-100 text-yellow-800';
      case 'interviewed': return 'bg-purple-100 text-purple-800';
      case 'offered': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'job_removed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRowBgColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied': return 'from-[#f0f8fa] to-[#d6eaf5]';
      case 'shortlisted': return 'from-yellow-50 to-yellow-100';
      case 'interviewed': return 'from-purple-50 to-purple-100';
      case 'offered': return 'from-green-50 to-green-100';
      case 'rejected': return 'from-red-50 to-red-100';
      case 'job_removed': return 'from-orange-50 to-orange-100';
      default: return 'from-gray-50 to-gray-100';
    }
  };

  const getCompanyInitial = (companyName) => {
    return companyName ? companyName.charAt(0).toUpperCase() : '?';
  };

  const getCompanyColor = (companyName) => {
    const colors = [
      'bg-[#3c80a7]', 'bg-green-600', 'bg-purple-600',
      'bg-red-600', 'bg-indigo-600', 'bg-pink-600'
    ];
    const index = companyName ? companyName.length % colors.length : 0;
    return colors[index];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatSalary = (salary) => {
    if (!salary) return 'Not specified';
    if (typeof salary === 'number') {
      return `₹${(salary / 100000).toFixed(0)} LPA`;
    }
    return salary;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome 
          studentData={{
            fullName,
            email,
            phone,
            enrollmentId,
            cgpa,
            batch,
            center,
            bio,
            Headline,
            city,
            stateRegion,
            linkedin,
            leetcode,
            codeforces,
            gfg,
            hackerrank,
            githubUrl,
            youtubeUrl,
            school,
            profilePhoto,
            jobFlexibility
          }}
          jobs={jobs}
          applications={applications}
          skillsEntries={skillsEntries}
          loadingJobs={loadingJobs}
          loadingApplications={loadingApplications}
          loadingSkills={loadingSkills}
          handleApplyToJob={handleApplyToJob}
          hasApplied={hasApplied}
          applying={applying}
        />;

      case 'jobs':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Explore Job Opportunities</h2>
              
              {/* Profile completion check */}
              {!profileComplete ? (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-6 rounded-lg mb-6">
                  <div className="flex items-center mb-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600 mr-3" />
                    <h3 className="text-lg font-semibold text-amber-800">Complete Your Profile to View Jobs</h3>
                  </div>
                  <p className="text-amber-700 mb-4">
                    To see available job opportunities, please complete all required fields (marked with *) in your profile:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    <div className={`flex items-center p-2 rounded text-sm ${fullName && fullName.trim() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {fullName && fullName.trim() ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Full Name: {fullName && fullName.trim() ? '✓' : 'Required'}
                    </div>
                    <div className={`flex items-center p-2 rounded text-sm ${email && email.trim() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {email && email.trim() ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Email: {email && email.trim() ? '✓' : 'Required'}
                    </div>
                    <div className={`flex items-center p-2 rounded text-sm ${phone && phone.trim() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {phone && phone.trim() ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Phone: {phone && phone.trim() ? '✓' : 'Required'}
                    </div>
                    <div className={`flex items-center p-2 rounded text-sm ${enrollmentId && enrollmentId.trim() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {enrollmentId && enrollmentId.trim() ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Enrollment ID: {enrollmentId && enrollmentId.trim() ? '✓' : 'Required'}
                    </div>
                    <div className={`flex items-center p-2 rounded text-sm ${school ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {school ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      School: {school || 'Not selected'}
                    </div>
                    <div className={`flex items-center p-2 rounded text-sm ${center ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {center ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Center: {center || 'Not selected'}
                    </div>
                    <div className={`flex items-center p-2 rounded text-sm ${batch ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {batch ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Batch: {batch || 'Not selected'}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Note:</strong> All fields marked with a red asterisk (*) in the Edit Profile section are required to view and apply for jobs.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('editProfile')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Complete Profile Now
                  </button>
                </div>
              ) : loadingJobs ? (
                <div className="flex justify-center items-center py-12">
                  <Loader className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading posted jobs...</span>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8">
                    <Briefcase className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Available</h3>
                    <p className="text-gray-600 mb-4">
                      No jobs are currently posted for your profile ({school} | {center} | {batch}).
                    </p>
                    <div className="text-sm text-gray-500">
                      <p>• Jobs may be targeted to specific schools, centers, or batches</p>
                      <p>• Check back later for new opportunities</p>
                      <p>• Contact admin if you believe this is an error</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Column Headers */}
                  <div className="grid grid-cols-5 gap-4 mb-3 py-3 px-4 bg-gray-50 rounded-lg">
                    <div className="text-gray-700 font-semibold text-sm">Company</div>
                    <div className="text-gray-700 font-semibold text-sm">Job Title</div>
                    <div className="text-gray-700 font-semibold text-sm">Drive Date</div>
                    <div className="text-gray-700 font-semibold text-sm">Salary (CTC)</div>
                    <div></div>
                  </div>

                  {/* Job Listings */}
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="grid grid-cols-5 gap-4 p-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 hover:shadow-md transition-all duration-200 border border-gray-200"
                    >
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 ${getCompanyColor(job.company?.name || job.company)}`}>
                          {getCompanyInitial(job.company?.name || job.company)}
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {job.company?.name || job.company || 'Company'}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {job.jobTitle}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 truncate">
                          {formatDate(job.driveDate || job.applicationDeadline)}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <span className="text-sm font-medium text-green-600">
                          {formatSalary(job.salary || job.ctc)}
                        </span>
                      </div>

                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleKnowMore(job)}
                          className="px-2 py-1 border border-[#3c80a7] bg-[#8ec5ff] text-black font-medium rounded-sm hover:bg-[#2563eb] hover:text-white transition-all duration-200 shadow-sm text-xs whitespace-nowrap"
                        >
                          Know More
                        </button>
                        <button
                          onClick={() => handleApplyToJob(job)}
                          disabled={hasApplied(job.id) || applying[job.id]}
                          className={`px-2 py-1 rounded-sm text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                            hasApplied(job.id)
                              ? 'bg-green-100 text-green-700 cursor-not-allowed border border-green-300'
                              : applying[job.id]
                              ? 'bg-blue-100 text-blue-700 cursor-not-allowed border border-blue-300'
                              : 'border border-green-600 bg-[#268812] text-white hover:bg-green-600'
                          }`}
                        >
                          {hasApplied(job.id) ? (
                            <>
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              Applied
                            </>
                          ) : applying[job.id] ? (
                            <>
                              <Loader className="h-3 w-3 inline mr-1 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            'Apply Now'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'resume':
        return (
          <ErrorBoundary>
            <ResumeBuilder />
          </ErrorBoundary>
        );

      case 'calendar':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Academic Calendar</h2>
              {/* Calendar content omitted for brevity */}
            </div>
          </div>
        );

      case 'applications':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Track Applications</h2>
              
              {loadingApplications ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="animate-spin h-8 w-8 text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading applications...</span>
                </div>
              ) : !applications || applications.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 text-lg">No applications found</p>
                  <p className="text-gray-400 text-sm">Start applying to jobs to track your applications here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Application Cards with Full Job Details */}
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className={`p-6 rounded-xl bg-gradient-to-r ${getRowBgColor(application.status)} hover:shadow-lg transition-all duration-200 border border-gray-100`}
                    >
                      {/* Header Row */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className={`${getCompanyColor(application.company?.name)} w-12 h-12 rounded-lg mr-4 flex items-center justify-center`}>
                            <span className="text-white font-bold text-lg">
                              {getCompanyInitial(application.company?.name)}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {application.job?.jobTitle || 'Unknown Position'}
                            </h3>
                            <p className="text-lg font-semibold text-gray-700">
                              {application.company?.name || 'Unknown Company'}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                          {getStatusIcon(application.status)}
                          {application.status === 'job_removed'
                            ? 'Job Removed'
                            : application.status
                            ? application.status.charAt(0).toUpperCase() + application.status.slice(1)
                            : 'Unknown'}
                        </span>
                      </div>

                      {/* Job Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white/50 p-3 rounded-lg">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {application.job?.location || 'Not specified'}
                          </p>
                        </div>
                        <div className="bg-white/50 p-3 rounded-lg">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Experience</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {application.job?.experienceLevel || 'Not specified'}
                          </p>
                        </div>
                        <div className="bg-white/50 p-3 rounded-lg">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Job Type</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {application.job?.jobType || 'Not specified'}
                          </p>
                        </div>
                        <div className="bg-white/50 p-3 rounded-lg">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Salary</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {application.job?.salaryRange || 'Not disclosed'}
                          </p>
                        </div>
                      </div>

                      {/* Application Timeline */}
                      <div className="flex items-center justify-between text-sm text-gray-600 bg-white/30 p-3 rounded-lg">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span className="font-medium">Applied: {formatDate(application.appliedDate)}</span>
                        </div>
                        {application.interviewDate && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            <span className="font-medium">Interview: {formatDate(application.interviewDate)}</span>
                          </div>
                        )}
                        {application.job?.deadline && (
                          <div className="flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            <span className="font-medium">Deadline: {formatDate(application.job.deadline)}</span>
                          </div>
                        )}
                      </div>

                      {/* Job Description Preview */}
                      {application.job?.description && (
                        <div className="mt-4 bg-white/30 p-3 rounded-lg">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Job Description</p>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {application.job.description.length > 150 
                              ? `${application.job.description.substring(0, 150)}...` 
                              : application.job.description}
                          </p>
                        </div>
                      )}

                      {/* Skills Required */}
                      {application.job?.requiredSkills && application.job.requiredSkills.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Required Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {application.job.requiredSkills.slice(0, 6).map((skill, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                            {application.job.requiredSkills.length > 6 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                +{application.job.requiredSkills.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Summary */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Application Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{applications.length}</div>
                        <div className="text-sm text-blue-700">Total Applied</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {applications.filter(app => app.status === 'shortlisted').length}
                        </div>
                        <div className="text-sm text-yellow-700">Shortlisted</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {applications.filter(app => app.status === 'interviewed').length}
                        </div>
                        <div className="text-sm text-purple-700">Interviewed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {applications.filter(app => app.status === 'offered').length}
                        </div>
                        <div className="text-sm text-green-700">Offers</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'resources':
        return <Resources />;

      case 'editProfile':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h2>
              
              <form className="space-y-6" onSubmit={handleSaveProfile}>
                {/* Profile Photo Section - Top Row */}
                <div className="flex gap-4 w-1/2 pr-3">
                  {profilePhoto && (
                    <div className="w-1/2 flex items-center justify-center">
                      <div className="text-center">
                        <img src={profilePhoto} alt="Profile Preview" className="w-23 h-23 rounded-full object-cover mx-auto border-4 border-gray-200 shadow-lg" />
                        <p className="text-sm text-gray-600 mt-2">Profile Preview</p>
                      </div>
                    </div>
                  )}
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => setProfilePhoto(e.target.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer hover:bg-gray-50 transition-colors">
                        <span className="text-gray-700">
                          {profilePhoto ? 'Change Photo' : 'Choose a photo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                    <input
                      id="fullName"
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        validateField('fullName', e.target.value);
                      }}
                    />
                    {validationErrors.fullName && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.fullName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                    <input
                      id="email"
                      type="email"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        validateField('email', e.target.value);
                      }}
                    />
                    {validationErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                    <input
                      id="phone"
                      type="tel"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        validateField('phone', e.target.value);
                      }}
                    />
                    {validationErrors.phone && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Enrollment ID <span className="text-red-500">*</span></label>
                    <input
                      id="enrollmentId"
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your enrollment ID"
                      value={enrollmentId}
                      onChange={(e) => {
                        setEnrollmentId(e.target.value);
                        validateField('enrollmentId', e.target.value);
                      }}
                    />
                    {validationErrors.enrollmentId && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.enrollmentId}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CGPA</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your CGPA"
                      value={cgpa}
                      onChange={(e) => {
                        setCgpa(e.target.value);
                        validateField('cgpa', e.target.value);
                      }}
                    />
                    {validationErrors.cgpa && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.cgpa}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Batch <span className="text-red-500">*</span></label>
                    <select
                      id="batch"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={batch}
                      onChange={(e) => {
                        setBatch(e.target.value);
                        validateField('batch', e.target.value);
                      }}
                    >
                      <option value="">Select Batch</option>
                      <option value="25-29">25-29</option>
                      <option value="24-28">24-28</option>
                      <option value="23-27">23-27</option>
                    </select>
                    {validationErrors.batch && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.batch}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">School <span className="text-red-500">*</span></label>
                    <select
                      id="school"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={school}
                      onChange={(e) => {
                        setSchool(e.target.value);
                        validateField('school', e.target.value);
                      }}
                    >
                      <option value="">Select School</option>
                      <option value="SOT">School of Technology</option>
                      <option value="SOM">School of Management</option>
                      <option value="SOH">School of HealthCare</option>
                    </select>
                    {validationErrors.school && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.school}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Center <span className="text-red-500">*</span></label>
                    <select
                      id="center"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={center}
                      onChange={(e) => {
                        setCenter(e.target.value);
                        validateField('center', e.target.value);
                      }}
                    >
                      <option value="">Select Center</option>
                      <option value="BANGALORE">Bangalore</option>
                      <option value="NOIDA">Noida</option>
                      <option value="LUCKNOW">Lucknow</option>
                      <option value="PUNE">Pune</option>
                      <option value="PATNA">Patna</option>
                      <option value="INDORE">Indore</option>
                    </select>
                    {validationErrors.center && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.center}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State/Region</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your state or region"
                      value={stateRegion}
                      onChange={(e) => setStateRegion(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Headline</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your professional Headline"
                      value={Headline}
                      onChange={(e) => setHeadline(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                    <input
                      type="url"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://linkedin.com/in/username"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                    />
                  </div>
                </div>

                {/* Skills & Credentials Section - Only show for SOT and SOM, not SOH */}
                {(school === 'SOT' || school === 'SOM') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">YouTube</label>
                      <input
                        type="url"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://youtube.com/@channel"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                      />
                    </div>
                    {school === 'SOT' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">GitHub</label>
                        <input
                          type="url"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://github.com/username"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                        />
                      </div>
                    )}
                    {school === 'SOM' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                        <input
                          type="url"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://instagram.com/username"
                          value={instagramUrl}
                          onChange={(e) => setInstagramUrl(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {school === 'SOT' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">LeetCode</label>
                      <input
                        type="url"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://leetcode.com/u/username"
                        value={leetcode}
                        onChange={(e) => setLeetcode(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Codeforces</label>
                      <input
                        type="url"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://codeforces.com/profile/username"
                        value={codeforces}
                        onChange={(e) => setCodeforces(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {school === 'SOT' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">GeeksforGeeks</label>
                      <input
                        type="url"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://auth.geeksforgeeks.org/user/username"
                        value={gfg}
                        onChange={(e) => setGfg(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">HackerRank</label>
                      <input
                        type="url"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://www.hackerrank.com/profile/username"
                        value={hackerrank}
                        onChange={(e) => setHackerrank(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                    placeholder="Write a brief bio about yourself"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  ></textarea>
                </div>

                <div className="space-x-2 px-4 mb-2 text-xs">
                  <input
                    type="checkbox"
                    id="editCheckbox"
                    checked={isChecked}
                    onChange={() => setIsChecked(!isChecked)}
                  />
                  <label htmlFor="editCheckbox">
                    I acknowledge that the information provided on this dashboard is accurate to the best of the institution's knowledge. I understand that the institution shall not be held liable for any errors, omissions, or discrepancies.
                  </label>
                </div>

                <div className="flex space-x-4 justify-center">
                  <button
                    type="submit"
                    id='editSaveBtn'
                    disabled={!isChecked || saving}
                    className={`px-6 py-2 rounded-md text-white transition-colors ${(!isChecked || saving) ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      case 'raiseQuery':
        return <Query />;

      default:
        return <DashboardHome 
          studentData={{
            fullName,
            email,
            phone,
            enrollmentId,
            cgpa,
            batch,
            center,
            bio,
            Headline,
            city,
            stateRegion,
            linkedin,
            leetcode,
            codeforces,
            gfg,
            hackerrank,
            githubUrl,
            youtubeUrl,
            school,
            profilePhoto,
            jobFlexibility
          }}
          jobs={jobs}
          applications={applications}
          skillsEntries={skillsEntries}
          loadingJobs={loadingJobs}
          loadingApplications={loadingApplications}
          loadingSkills={loadingSkills}
          handleApplyToJob={handleApplyToJob}
          hasApplied={hasApplied}
          applying={applying}
        />;
    }
  };

  return (
    <>
      <DashboardLayout>
        <div className="flex min-h-screen relative">
          <aside
            className="bg-white border-r border-gray-200 fixed h-[calc(100vh-5rem)] overflow-y-auto transition-all duration-200 ease-in-out"
            style={{ width: `${sidebarWidth}%` }}
          >
            <div className="p-3 h-full flex flex-col">
              <div className="mb-6">
                {sidebarWidth >= 9 && (
                  <h2 className="text-base font-bold text-gray-900 mb-3">Navigation</h2>
                )}
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <div key={tab.id} className="mb-1">
                        <button
                          onClick={() => handleTabClick(tab.id)}
                          className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                            : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                            } ${sidebarWidth < 9 ? 'justify-center px-2 py-2' : 'px-2 py-3'}`}
                          title={sidebarWidth < 9 ? tab.label : ''}
                        >
                          <Icon className={`h-4 w-4 ${sidebarWidth >= 9 ? 'mr-2' : ''}`} />
                          {sidebarWidth >= 9 && tab.label}
                        </button>
                      </div>
                    );
                  })}
                </nav>
              </div>

              {visibleSkillsCredentials.length > 0 && (
                <div className="mb-6">
                  {sidebarWidth >= 9 && (
                    <h2 className="text-base font-bold text-gray-900 mb-3">Skills & Credentials</h2>
                  )}
                  <nav className="space-y-1">
                    {visibleSkillsCredentials.map((skill) => {
                      const Icon = skill.icon;
                      return (
                        <div key={skill.id} className="mb-1">
                          <button
                            onClick={() => handleSkillClick(skill.id)}
                            className={`w-full flex items-center rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition-all duration-200 group ${sidebarWidth < 12 ? 'justify-center px-2 py-2' : 'px-3 py-2'
                              }`}
                            title={sidebarWidth < 9 ? skill.label : ''}
                          >
                            <Icon className={`h-4 w-4 ${sidebarWidth >= 9 ? 'mr-2' : ''} ${skill.color}`} />
                            {sidebarWidth >= 9 && (
                              <>
                                <span className="flex-1 text-left">{skill.label}</span>
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </nav>
                </div>
              )}

              <div className="mt-auto pt-4 pb-[35%] border-t border-gray-300">
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full flex items-center rounded-lg text-xs font-medium text-red-500 hover:bg-red-100 transition-all duration-200 ${sidebarWidth < 9 ? 'justify-center px-2 py-2 mb-10' : 'px-2 py-3'
                    }`}
                  title={sidebarWidth < 9 ? 'Logout' : ''}
                >
                  <LogOut className={`h-4 w-4 ${sidebarWidth >= 9 ? 'mr-2' : ''}`} />
                  {sidebarWidth >= 9 && 'Logout'}
                </button>
              </div>
            </div>

            <div
              ref={dragRef}
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-gray-300 hover:bg-blue-500 transition-colors duration-200"
              onMouseDown={handleMouseDown}
            />
          </aside>

          <main
            className="bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 min-h-screen transition-all duration-200 ease-in-out"
            style={{
              marginLeft: `${sidebarWidth}%`,
              width: `${100 - sidebarWidth}%`
            }}
          >
            <div className="p-8">
              {renderContent()}
            </div>
          </main>
        </div>
      </DashboardLayout>
      
      {/* Floating Alert for All Types */}
      {showFloatingAlert && alertMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className={`rounded-lg shadow-lg border p-4 flex items-center space-x-3 min-w-[300px] ${
            alertType === 'success' 
              ? 'bg-white border-green-200'
              : alertType === 'error'
              ? 'bg-white border-red-200'
              : alertType === 'warning'
              ? 'bg-white border-yellow-200'
              : 'bg-white border-blue-200'
          }`}>
            <div className="flex-shrink-0">
              {alertType === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
              {alertType === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
              {alertType === 'warning' && <AlertTriangle className="h-6 w-6 text-yellow-600" />}
              {alertType === 'info' && <Info className="h-6 w-6 text-blue-600" />}
            </div>
            <div className="flex-1">
              <div className={`text-sm font-medium ${
                alertType === 'success' 
                  ? 'text-green-800'
                  : alertType === 'error'
                  ? 'text-red-800'
                  : alertType === 'warning'
                  ? 'text-yellow-800'
                  : 'text-blue-800'
              }`}>
                {alertType === 'success' && 'Success'}
                {alertType === 'error' && 'Error'}
                {alertType === 'warning' && 'Warning'}
                {alertType === 'info' && 'Information'}
              </div>
              <div className={`text-sm whitespace-pre-line ${
                alertType === 'success' 
                  ? 'text-gray-700'
                  : alertType === 'error'
                  ? 'text-gray-700'
                  : alertType === 'warning'
                  ? 'text-gray-700'
                  : 'text-gray-700'
              }`}>
                {alertMessage}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowFloatingAlert(false);
                setAlertMessage(null);
              }}
              className={`flex-shrink-0 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                alertType === 'success' 
                  ? 'text-green-500 hover:bg-green-100 focus:ring-green-600'
                  : alertType === 'error'
                  ? 'text-red-500 hover:bg-red-100 focus:ring-red-600'
                  : alertType === 'warning'
                  ? 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600'
                  : 'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Job Description Modal */}
      <JobDescription 
        job={selectedJob}
        isOpen={isJobModalOpen}
        onClose={handleCloseJobModal}
      />
    </>
  );
}