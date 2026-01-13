import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/dashboard/shared/DashboardLayout';
import DashboardHome from '../../components/dashboard/student/DashboardHome';
import { useAuth } from '../../hooks/useAuth';
import { 
  getStudentProfile, 
  updateCompleteStudentProfile, 
  createCompleteStudentProfile,
  getStudentSkills,
  getEducationalBackground,
} from '../../services/students';
import { getStudentApplications, applyToJob, subscribeStudentApplications, getStudentInterviewHistory } from '../../services/applications';
import { getTargetedJobsForStudent, subscribeJobs, subscribePostedJobs } from '../../services/jobs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';
import api from '../../services/api';
import { SiCodeforces, SiGeeksforgeeks } from 'react-icons/si';
import { FaHackerrank, FaInstagram, FaYoutube, FaUsers, FaGraduationCap, FaMapMarkerAlt } from 'react-icons/fa';
import { IoIosArrowDropdown, IoIosArrowDropup } from 'react-icons/io';
import CustomDropdown from '../../components/common/CustomDropdown';
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
  X,
  User,
  Mail,
  Phone,
  Hash,
  Award,
  MapPin,
  Building2,
  Type,
  Linkedin,
  Image as ImageIcon,
  Camera,
  Globe,
  Plus,
  Link as LinkIcon
} from 'lucide-react';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import ResumeBuilder from '../../components/resume/ResumeBuilder';
import Query from '../../components/dashboard/student/Query';
import Resources from '../../components/dashboard/student/Resources';
import ConnectGoogleCalendar from '../ConnectGoogleCalendar';
import EndorsementManagement from '../../components/dashboard/student/EndorsementManagement';

const normalizeProfileSnapshot = (profile = {}) => ({
  fullName: profile.fullName || '',
  email: profile.email || '',
  phone: profile.phone || '',
  enrollmentId: profile.enrollmentId || '',
  cgpa:
    profile.cgpa !== undefined && profile.cgpa !== null
      ? (() => {
          // Always format to 2 decimal places for display
          const cgpaStr = String(profile.cgpa);
          if (/^(10\.00|[0-9]\.[0-9]{2})$/.test(cgpaStr)) {
            return cgpaStr; // Already in correct format
          } else if (/^\d+$/.test(cgpaStr)) {
            return cgpaStr + '.00'; // Integer -> add .00
          } else if (/^\d+\.\d+$/.test(cgpaStr)) {
            // Has decimal but not 2 places
            const parts = cgpaStr.split('.');
            return parts[0] + '.' + parts[1].padEnd(2, '0').substring(0, 2);
          }
          return cgpaStr;
        })()
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
  otherProfiles: profile.otherProfiles ? (typeof profile.otherProfiles === 'string' ? JSON.parse(profile.otherProfiles) : profile.otherProfiles) : [],
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
  const [otherProfiles, setOtherProfiles] = useState([]); // [{platformName: string, profileId: string}]
  const [showAddProfileForm, setShowAddProfileForm] = useState(false);
  const [newProfile, setNewProfile] = useState({ platformName: '', profileId: '' });
  const addProfileFormRef = useRef(null);
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
    otherProfiles,
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
    otherProfiles,
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
    setOtherProfiles(snapshot.otherProfiles || []);
  }, []);
  
  
  // Skills state
  const [skillsEntries, setSkillsEntries] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [newSkill, setNewSkill] = useState({ skillName: '', rating: 1 });
  
  // Applications state
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [loadingInterviewHistory, setLoadingInterviewHistory] = useState(false);
  const [applicationsView, setApplicationsView] = useState('current'); // 'current' or 'past'
  const [expandedApplications, setExpandedApplications] = useState(new Set()); // Track expanded application details
  
  // Jobs state
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [applying, setApplying] = useState({});
  
  
  // Resume Selection Modal state
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [pendingJob, setPendingJob] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

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
        // Format CGPA to always show 2 decimal places
        const cgpaValue = profileData.cgpa;
        if (cgpaValue) {
          const cgpaStr = String(cgpaValue);
          if (/^(10\.00|[0-9]\.[0-9]{2})$/.test(cgpaStr)) {
            setCgpa(cgpaStr);
          } else if (/^\d+$/.test(cgpaStr)) {
            setCgpa(cgpaStr + '.00');
          } else if (/^\d+\.\d+$/.test(cgpaStr)) {
            const parts = cgpaStr.split('.');
            setCgpa(parts[0] + '.' + parts[1].padEnd(2, '0').substring(0, 2));
          } else {
            setCgpa(cgpaStr);
          }
        } else {
          setCgpa('');
        }
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
        // Profile photo can be from user.profilePhoto (old) or student.profileImageUrl (new Cloudinary)
        setProfilePhoto(profileData.profileImageUrl || profileData.profilePhoto || '');
        setJobFlexibility(profileData.jobFlexibility || '');
        
        // Parse otherProfiles from JSON string if it exists
        if (profileData.otherProfiles) {
          try {
            const parsed = typeof profileData.otherProfiles === 'string' 
              ? JSON.parse(profileData.otherProfiles) 
              : profileData.otherProfiles;
            setOtherProfiles(Array.isArray(parsed) ? parsed : []);
          } catch (e) {
            console.error('Error parsing otherProfiles:', e);
            setOtherProfiles([]);
          }
        } else {
          setOtherProfiles([]);
        }

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
            otherProfiles: profileData.otherProfiles ? (typeof profileData.otherProfiles === 'string' ? JSON.parse(profileData.otherProfiles) : profileData.otherProfiles) : [],
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
      console.log('📋 Loaded applications:', applicationsData?.length || 0, 'applications');
      if (applicationsData && applicationsData.length > 0) {
        console.log('📋 Application jobIds:', applicationsData.map(app => ({ 
          appId: app.id, 
          jobId: app.jobId, 
          jobIdFromJob: app.job?.id 
        })));
      }
      setApplications(applicationsData || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
      setApplications([]);
    } finally {
      setLoadingApplications(false);
    }
  }, [user?.id]);

  // Load interview history
  const loadInterviewHistory = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingInterviewHistory(true);
    try {
      const historyData = await getStudentInterviewHistory(user.id);
      setInterviewHistory(historyData || []);
    } catch (err) {
      console.error('Failed to load interview history:', err);
      setInterviewHistory([]);
    } finally {
      setLoadingInterviewHistory(false);
    }
  }, [user?.id]);

  // Load resumes from API
  const loadResumes = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoadingResumes(true);
      const response = await fetch(`${API_BASE_URL}/students/resumes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setResumes(Array.isArray(data) ? data : []);
      } else if (response.status === 404) {
        setResumes([]);
      } else {
        throw new Error('Failed to load resumes');
      }
    } catch (err) {
      console.error('Error loading resumes:', err);
      setResumes([]);
    } finally {
      setLoadingResumes(false);
    }
  }, [user?.id]);

  const handleApplyToJob = async (job) => {
    if (!user?.id || !job?.id) {
      console.error('Missing user ID or job ID');
      return;
    }

    // Store the job and show resume selection modal
    setPendingJob(job);
    await loadResumes();
    setIsResumeModalOpen(true);
  };

  const handleResumeSelection = async (resumeId = null) => {
    if (!pendingJob) return;
    
    setIsResumeModalOpen(false);
    
    try {
      setApplying(prev => ({ ...prev, [pendingJob.id]: true }));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 Applying to job:', {
          jobId: pendingJob.id,
          jobTitle: pendingJob.jobTitle,
          companyId: pendingJob.companyId,
          companyName: pendingJob.company?.name,
          resumeId,
          studentId: user.id
        });
      }
      
      const companyId = pendingJob.companyId || pendingJob.company?.id || null;
      // Pass resumeId in applicationData if backend supports it
      let applicationResult;
      try {
        applicationResult = await applyToJob(user.id, pendingJob.id, { companyId, resumeId });
      } catch (applyError) {
        // Re-throw with more context
        console.error('❌ [handleResumeSelection] applyToJob error:', applyError);
        throw applyError;
      }
      
      // Immediately add to applications state for instant UI update
      if (applicationResult && pendingJob.id) {
        const newApplication = {
          id: applicationResult.id || `temp_${Date.now()}`,
          jobId: pendingJob.id,
          studentId: user.id,
          status: 'APPLIED',
          appliedDate: new Date().toISOString(),
          company: pendingJob.company || { name: pendingJob.companyName },
          job: {
            id: pendingJob.id,
            jobTitle: pendingJob.jobTitle,
            ...pendingJob
          }
        };
        setApplications(prev => {
          // Check if already exists to avoid duplicates
          const exists = prev.some(app => app.jobId === pendingJob.id);
          if (exists) return prev;
          return [newApplication, ...prev];
        });
      }
      
      // Show success message in clean alert box
      setAlertMessage(`Successfully applied to ${pendingJob.jobTitle} at ${pendingJob.company?.name || 'the company'}!`);
      setAlertType('success');
      setShowFloatingAlert(true);
      
      // Refresh applications list to get complete data from backend
      await loadApplicationsData();
      
      // Clear applying state after successful application
      setApplying(prev => ({ ...prev, [pendingJob.id]: false }));
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setShowFloatingAlert(false);
        setAlertMessage(null);
      }, 3000);
      
    } catch (error) {
      console.error('❌ [handleApplyToJob] Full error:', error);
      console.error('❌ [handleApplyToJob] Error response:', error.response);
      console.error('❌ [handleApplyToJob] Error data:', error.response?.data);
      
      // Handle "Already applied" gracefully - just refresh and update button, no error shown
      const errorData = error.response?.data || error.response || {};
      const errorMessage = errorData.error || errorData.message || error.message;
      
      if (errorMessage === 'Already applied to this job' || errorData.error === 'Already applied to this job') {
        // Silently refresh applications to update button state
        await loadApplicationsData();
        return; // Exit early, no error message needed
      }
      
      // Handle CGPA requirement error with precise message
      if (errorMessage === 'CGPA requirement not met' || errorMessage === 'CGPA requirement check failed' || 
          errorData.error === 'CGPA requirement not met' || errorData.error === 'CGPA requirement check failed') {
        // Clean and precise error message
        const yourCgpa = errorData.yourCgpa || 'Not set';
        const requiredCgpa = errorData.requiredCgpa || errorData.requirement || 'Not specified';
        const message = errorData.message || 'Your CGPA does not meet the minimum requirement for this job.';
        
        const fullMessage = `${message}\n\nYour CGPA: ${yourCgpa}\nRequired CGPA: ${requiredCgpa}\n\nPlease update your profile with a higher CGPA or apply to jobs with lower requirements.`;
        setAlertMessage(fullMessage);
        setAlertType('error');
        setShowFloatingAlert(true);
        
        setTimeout(() => {
          setShowFloatingAlert(false);
          setAlertMessage(null);
        }, 7000);
      } else if (error.isNetworkError || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        // Network error
        setAlertMessage('Network error: Cannot connect to server. Please check your internet connection and ensure the backend server is running.');
        setAlertType('error');
        setShowFloatingAlert(true);
        
        setTimeout(() => {
          setShowFloatingAlert(false);
          setAlertMessage(null);
        }, 5000);
      } else {
        // Clean error message for other errors
        const cleanMessage = errorData.message || errorMessage || 'Failed to apply to job. Please try again.';
        setAlertMessage(cleanMessage);
        setAlertType('error');
        setShowFloatingAlert(true);
        
        setTimeout(() => {
          setShowFloatingAlert(false);
          setAlertMessage(null);
        }, 5000);
      }
    } finally {
      setApplying(prev => ({ ...prev, [pendingJob.id]: false }));
      setPendingJob(null);
    }
  };

  const handleCreateResume = () => {
    setIsResumeModalOpen(false);
    setPendingJob(null);
    setActiveTab('resume');
    navigate('/student?tab=resume', { replace: true });
  };

  const hasApplied = (jobId) => {
    if (!jobId || !applications || applications.length === 0) {
      return false;
    }
    const applied = applications.some(app => {
      // Check both jobId and job.id for compatibility
      const matches = app.jobId === jobId || app.job?.id === jobId;
      return matches;
    });
    return applied;
  };

  // Check if student's CGPA meets job requirement
  const meetsCgpaRequirement = (job) => {
    const jobMinCgpa = job.minCgpa || job.cgpaRequirement;
    if (!jobMinCgpa || !cgpa) {
      // If no requirement specified or student hasn't entered CGPA, allow application
      return true;
    }

    // Parse student CGPA
    const studentCgpa = parseFloat(cgpa);
    if (isNaN(studentCgpa)) {
      // If student CGPA is not a valid number, assume they meet requirement (edge case)
      return true;
    }

    // Parse job requirement - could be CGPA (0-10) or percentage (0-100)
    const requirementStr = String(jobMinCgpa).trim();
    let requiredCgpa = null;

    // Check if it's a percentage (ends with %)
    if (requirementStr.endsWith('%')) {
      const percentage = parseFloat(requirementStr.slice(0, -1));
      if (!isNaN(percentage)) {
        // Convert percentage to CGPA (assuming 10-point scale: 70% = 7.0)
        requiredCgpa = percentage / 10;
      }
    } else {
      // Try to parse as CGPA directly
      requiredCgpa = parseFloat(requirementStr);
    }

    if (isNaN(requiredCgpa)) {
      // If we can't parse the requirement, allow application
      return true;
    }

    // Compare: student CGPA must be >= required CGPA
    return studentCgpa >= requiredCgpa;
  };

  // Job Description navigation handler
  const handleKnowMore = (job) => {
    navigate(`/job/${job.id}`);
  };


  // Handle click outside to close add profile form
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAddProfileForm && addProfileFormRef.current && !addProfileFormRef.current.contains(event.target)) {
        // Check if click is not on the Add Profile button
        const addButton = event.target.closest('button');
        if (addButton && addButton.textContent.includes('Add Profile')) {
          return; // Don't close if clicking the Add Profile button
        }
        setShowAddProfileForm(false);
        setNewProfile({ platformName: '', profileId: '' });
      }
    };

    if (showAddProfileForm) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddProfileForm]);

  // Handle URL parameters to set active tab
  useEffect(() => {
    const tab = searchParams.get('tab');

    const handleEditProfileClick = () => {
      setActiveTab('editProfile');
      // Only navigate if URL doesn't already have the correct tab
      if (tab !== 'editProfile') {
        navigate('/student?tab=editProfile', { replace: true });
      }
    };
    const handleNavigateToJobs = () => {
      setActiveTab('jobs');
      if (tab !== 'jobs') {
        navigate('/student?tab=jobs', { replace: true });
      }
    };
    const handleNavigateToApplications = () => {
      setActiveTab('applications');
      if (tab !== 'applications') {
        navigate('/student?tab=applications', { replace: true });
      }
    };
    const handleNavigateToQuery = () => {
      setActiveTab('raiseQuery');
      if (tab !== 'raiseQuery') {
        navigate('/student?tab=raiseQuery', { replace: true });
      }
    };

    window.addEventListener('editProfileClicked', handleEditProfileClick);
    window.addEventListener('navigateToJobs', handleNavigateToJobs);
    window.addEventListener('navigateToApplications', handleNavigateToApplications);
    window.addEventListener('navigateToQuery', handleNavigateToQuery);

    // Set active tab based on URL parameter
    if (tab && ['dashboard', 'jobs', 'calendar', 'applications', 'resources', 'endorsements', 'resume', 'editProfile', 'raiseQuery'].includes(tab)) {
      setActiveTab(tab);
    } else if (tab === null || tab === '') {
      // Only reset to dashboard if there's no tab parameter at all
      setActiveTab('dashboard');
    }

    return () => {
      window.removeEventListener('editProfileClicked', handleEditProfileClick);
      window.removeEventListener('navigateToJobs', handleNavigateToJobs);
      window.removeEventListener('navigateToApplications', handleNavigateToApplications);
      window.removeEventListener('navigateToQuery', handleNavigateToQuery);
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

  // Load interview history when applications tab is active
  useEffect(() => {
    if (user?.id && activeTab === 'applications') {
      loadInterviewHistory();
    }
  }, [user?.id, activeTab, loadInterviewHistory]);

  // Validation helper functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Remove all spaces, dashes, and parentheses
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    // Must be exactly 10 digits and start with 6, 7, 8, or 9
    const phoneRegex = /^[6789]\d{9}$/;
    return phoneRegex.test(cleanedPhone);
  };

  // Capitalize first letter of city/state
  const capitalizeFirstLetter = (str) => {
    if (!str || !str.trim()) return str;
    return str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();
  };

  const validateCGPA = (cgpa, allowPartial = false) => {
    if (!cgpa || cgpa.trim() === '') return false;
    const cgpaStr = String(cgpa).trim();
    
    // If allowPartial is true, accept integers and partial decimals during typing
    if (allowPartial) {
      // Accept integers (0-10)
      if (/^(10|[0-9])$/.test(cgpaStr)) {
        return true;
      }
      // Accept partial decimals (e.g., 8., 8.0, 8.5)
      if (/^(10|[0-9])\.[0-9]{0,2}$/.test(cgpaStr)) {
        // Check if the value is within range
        const numValue = parseFloat(cgpaStr);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
          return true;
        }
      }
      return false;
    }
    
    // Strict validation: must be in format 0.00 to 10.00 with exactly 2 decimal places
    const cgpaRegex = /^(10\.00|[0-9]\.[0-9]{2})$/;
    if (!cgpaRegex.test(cgpaStr)) {
      return false;
    }
    // Validate range without using parseFloat to avoid rounding errors
    const parts = cgpaStr.split('.');
    const integerPart = parseInt(parts[0], 10);
    const decimalPart = parseInt(parts[1], 10);
    if (isNaN(integerPart) || isNaN(decimalPart)) {
      return false;
    }
    if (integerPart > 10 || (integerPart === 10 && decimalPart > 0)) {
      return false;
    }
    if (integerPart < 0) {
      return false;
    }
    return true;
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
      errors.push('Invalid phone number. Must be 10 digits starting with 6, 7, 8, or 9');
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

    // Required field validations - LinkedIn, City, State/Region
    if (!linkedin.trim()) {
      errors.push('LinkedIn URL is required');
      missingFields.push({ field: 'linkedin', section: 'professional' });
    } else if (!validateURL(linkedin.trim())) {
      errors.push('Please enter a valid LinkedIn URL');
      missingFields.push({ field: 'linkedin', section: 'professional' });
    }

    if (!city.trim()) {
      errors.push('City is required');
      missingFields.push({ field: 'city', section: 'location' });
    }

    if (!stateRegion.trim()) {
      errors.push('State/Region is required');
      missingFields.push({ field: 'stateRegion', section: 'location' });
    }

    // Optional field validations
    if (cgpa && !validateCGPA(cgpa)) errors.push('CGPA must be between 0 and 10');
    
    // URL validations for other social profiles (optional)
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
          errors.phone = 'Invalid phone number. Must be 10 digits starting with 6, 7, 8, or 9';
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
      case 'linkedin':
        if (!value.trim()) {
          errors.linkedin = 'LinkedIn URL is required';
        } else if (!validateURL(value.trim())) {
          errors.linkedin = 'Please enter a valid LinkedIn URL';
        } else {
          delete errors.linkedin;
        }
        break;
      case 'city':
        if (!value.trim()) {
          errors.city = 'City is required';
        } else {
          delete errors.city;
        }
        break;
      case 'stateRegion':
        if (!value.trim()) {
          errors.stateRegion = 'State/Region is required';
        } else {
          delete errors.stateRegion;
        }
        break;
      case 'cgpa':
        if (value) {
          // During typing, allow partial values (e.g., "8", "8.", "8.0", "8.5")
          // On blur/submit, require exact format (e.g., "8.00")
          if (!validateCGPA(value, true)) {
            errors.cgpa = 'CGPA must be between 0.00 and 10.00';
          } else {
            delete errors.cgpa;
          }
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
      
      // Format CGPA to exactly 2 decimal places if provided - NO ROUNDING
      let formattedCgpa = null;
      if (cgpa && cgpa.trim() !== '') {
        const cgpaStr = String(cgpa).trim();
        
        // If already in correct format (e.g., 9.00, 8.75), use as-is
        if (/^(10\.00|[0-9]\.[0-9]{2})$/.test(cgpaStr)) {
          formattedCgpa = cgpaStr;
        } else if (/^\d+$/.test(cgpaStr)) {
          // Integer like "9" -> "9.00" (no rounding, just add .00)
          const integerPart = parseInt(cgpaStr, 10);
          if (integerPart >= 0 && integerPart <= 10) {
            formattedCgpa = cgpaStr + '.00';
          }
        } else if (/^\d+\.\d+$/.test(cgpaStr)) {
          // Has decimal part - preserve exact value, pad to 2 decimals
          const parts = cgpaStr.split('.');
          const integerPart = parseInt(parts[0], 10);
          const decimalPart = parts[1].substring(0, 2).padEnd(2, '0');
          
          // Validate range
          if (integerPart >= 0 && integerPart <= 10) {
            if (integerPart === 10 && parseInt(decimalPart, 10) > 0) {
              formattedCgpa = '10.00'; // Cap at 10.00
            } else {
              formattedCgpa = parts[0] + '.' + decimalPart;
            }
          }
        }
      }

      const profileData = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        enrollmentId: enrollmentId.trim(),
        // Send CGPA with exactly 2 decimal places or null
        cgpa: formattedCgpa,
        batch,
        center,
        bio: bio.trim(),
        Headline: Headline.trim(),
        city: capitalizeFirstLetter(city),
        stateRegion: capitalizeFirstLetter(stateRegion),
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
      
      // Reload profile from server to get the latest data
      const updatedProfile = await getStudentProfile(user.id);
      if (updatedProfile) {
        // Update all state with the latest profile data
        setFullName(updatedProfile.fullName || '');
        setEmail(updatedProfile.email || '');
        setPhone(updatedProfile.phone || '');
        setEnrollmentId(updatedProfile.enrollmentId || '');
        // Format CGPA to always show 2 decimal places
        const cgpaValue = updatedProfile.cgpa;
        if (cgpaValue) {
          const cgpaStr = String(cgpaValue);
          if (/^(10\.00|[0-9]\.[0-9]{2})$/.test(cgpaStr)) {
            setCgpa(cgpaStr);
          } else if (/^\d+$/.test(cgpaStr)) {
            setCgpa(cgpaStr + '.00');
          } else if (/^\d+\.\d+$/.test(cgpaStr)) {
            const parts = cgpaStr.split('.');
            setCgpa(parts[0] + '.' + parts[1].padEnd(2, '0').substring(0, 2));
          } else {
            setCgpa(cgpaStr);
          }
        } else {
          setCgpa('');
        }
        setBatch(updatedProfile.batch || '');
        setCenter(updatedProfile.center || '');
        setSchool(updatedProfile.school || '');
        setBio(updatedProfile.bio || '');
        setHeadline(updatedProfile.headline || updatedProfile.Headline || '');
        setCity(updatedProfile.city || '');
        setStateRegion(updatedProfile.stateRegion || updatedProfile.state || '');
        setLinkedin(updatedProfile.linkedin || '');
        setLeetcode(updatedProfile.leetcode || '');
        setCodeforces(updatedProfile.codeforces || '');
        setGfg(updatedProfile.gfg || '');
        setHackerrank(updatedProfile.hackerrank || '');
        setGithubUrl(updatedProfile.githubUrl || updatedProfile.github || '');
        setYoutubeUrl(updatedProfile.youtubeUrl || updatedProfile.youtube || '');
        setInstagramUrl(updatedProfile.instagramUrl || updatedProfile.instagram || '');
        // Profile photo can be from user.profilePhoto (old) or student.profileImageUrl (new Cloudinary)
        setProfilePhoto(updatedProfile.profileImageUrl || updatedProfile.profilePhoto || '');
        setJobFlexibility(updatedProfile.jobFlexibility || '');
        
        // Parse otherProfiles
        if (updatedProfile.otherProfiles) {
          try {
            const parsed = typeof updatedProfile.otherProfiles === 'string' 
              ? JSON.parse(updatedProfile.otherProfiles) 
              : updatedProfile.otherProfiles;
            setOtherProfiles(Array.isArray(parsed) ? parsed : []);
          } catch (e) {
            console.error('Error parsing otherProfiles:', e);
            setOtherProfiles([]);
          }
        } else {
          setOtherProfiles([]);
        }
        
        // Update initial snapshot
        const sanitizedProfile = {
          fullName: updatedProfile.fullName || '',
          email: updatedProfile.email || '',
          phone: updatedProfile.phone || '',
          enrollmentId: updatedProfile.enrollmentId || '',
          cgpa: updatedProfile.cgpa?.toString?.() || '',
          batch: updatedProfile.batch || '',
          center: updatedProfile.center || '',
          school: updatedProfile.school || '',
          bio: updatedProfile.bio || '',
          Headline: updatedProfile.headline || updatedProfile.Headline || '',
          city: updatedProfile.city || '',
          stateRegion: updatedProfile.stateRegion || updatedProfile.state || '',
          linkedin: updatedProfile.linkedin || '',
          githubUrl: updatedProfile.githubUrl || updatedProfile.github || '',
          youtubeUrl: updatedProfile.youtubeUrl || updatedProfile.youtube || '',
          instagramUrl: updatedProfile.instagramUrl || updatedProfile.instagram || '',
          leetcode: updatedProfile.leetcode || '',
          codeforces: updatedProfile.codeforces || '',
          gfg: updatedProfile.gfg || '',
          hackerrank: updatedProfile.hackerrank || '',
          profilePhoto: updatedProfile.profilePhoto || '',
          jobFlexibility: updatedProfile.jobFlexibility || '',
          otherProfiles: updatedProfile.otherProfiles ? (typeof updatedProfile.otherProfiles === 'string' ? JSON.parse(updatedProfile.otherProfiles) : updatedProfile.otherProfiles) : [],
        };
        initialProfileRef.current = normalizeProfileSnapshot(sanitizedProfile);
      } else {
        // Fallback to using profileData if reload fails
        initialProfileRef.current = normalizeProfileSnapshot(profileData);
      }
      setIsFormDirty(false);
      
      // Dispatch custom event to notify DashboardLayout to reload profile
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { userId: user.id } 
      }));
      
      setTimeout(() => {
        setShowFloatingAlert(false);
        setAlertMessage(null);
        setActiveTab('dashboard');
        navigate('/student', { replace: true });
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
    { id: 'endorsements', label: 'Endorsements', icon: Mail },
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
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-600' },
  ];

  const visibleSkillsCredentials = React.useMemo(() => {
    if (school === 'SOH') {
      // School of HealthCare: YouTube, Instagram, and LinkedIn
      return skillsCredentials.filter((skill) => ['youtube', 'instagram', 'linkedin'].includes(skill.id));
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
    // Update URL to reflect the current tab
    if (tabId === 'dashboard') {
      // Remove tab parameter for dashboard (default view)
      navigate('/student', { replace: true });
    } else {
      // Update URL with current tab
      navigate(`/student?tab=${tabId}`, { replace: true });
    }
  };

  const handleSkillClick = (skillId) => {
    const urls = {
      leetcode: leetcode || 'https://leetcode.com',
      codeforces: codeforces || 'https://codeforces.com',
      gfg: gfg || 'https://geeksforgeeks.org',
      hackerrank: hackerrank || 'https://hackerrank.com',
      github: githubUrl || 'https://github.com',
      instagram: instagramUrl || 'https://instagram.com',
      youtube: youtubeUrl || 'https://youtube.com',
      linkedin: linkedin || 'https://linkedin.com'
    };
    const url = urls[skillId];
    if (url) {
      window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
    }
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

  const formatDate = (dateValue) => {
    if (!dateValue) return 'TBD';
    try {
      let date;
      // Handle different date formats
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
        // Handle Firebase Timestamp or mock date objects
        date = dateValue.toDate();
      } else if (dateValue && typeof dateValue === 'object' && dateValue.getTime) {
        // Handle date-like objects
        date = new Date(dateValue.getTime());
      } else {
        date = new Date(dateValue);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'TBD';
      }
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      console.warn('Date formatting error:', error, dateValue);
      return 'TBD';
    }
  };

  const formatSalary = (salary) => {
    if (!salary || (typeof salary === 'string' && salary.trim() === '')) return 'As per industry standards';
    if (salary === 'As per industry standards') return 'As per industry standards';
    
    // Handle number format
    if (typeof salary === 'number') {
      if (salary >= 100000) {
        return `₹${(salary / 100000).toFixed(1)} LPA`;
      } else {
        return `₹${salary.toLocaleString()}`;
      }
    }
    
    // Handle string format
    if (typeof salary === 'string') {
      // Try to parse if it's a number string
      const numSalary = parseFloat(salary);
      if (!isNaN(numSalary)) {
        if (numSalary >= 100000) {
          return `₹${(numSalary / 100000).toFixed(1)} LPA`;
        } else {
          return `₹${numSalary.toLocaleString()}`;
        }
      }
      // Check if it contains "As per industry standards"
      if (salary.includes('As per industry standards')) {
        return 'As per industry standards';
      }
      // Return as-is if it's already formatted
      return salary;
    }
    
    return 'As per industry standards';
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
                    onClick={() => {
                      setActiveTab('editProfile');
                      navigate('/student?tab=editProfile', { replace: true });
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer"
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
                          className="px-2 py-1 border border-[#3c80a7] bg-[#8ec5ff] text-black font-medium rounded-sm hover:bg-[#2563eb] hover:text-white transition-all duration-200 shadow-sm text-xs whitespace-nowrap cursor-pointer"
                        >
                          Know More
                        </button>
                        <button
                          onClick={() => handleApplyToJob(job)}
                          disabled={hasApplied(job.id) || applying[job.id] || !meetsCgpaRequirement(job)}
                          title={!meetsCgpaRequirement(job) ? (() => {
                            const jobMinCgpa = job.minCgpa || job.cgpaRequirement;
                            const studentCgpa = cgpa ? parseFloat(cgpa) : null;
                            if (jobMinCgpa && studentCgpa !== null && !isNaN(studentCgpa)) {
                              return `Your CGPA (${studentCgpa.toFixed(2)}) does not meet the minimum requirement of ${jobMinCgpa} for this job.`;
                            }
                            return "CGPA requirement not met. Please check the job requirements.";
                          })() : ''}
                          className={`px-2 py-1 rounded-sm text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                            hasApplied(job.id)
                              ? 'bg-green-200 text-green-800 cursor-not-allowed border border-green-400'
                              : applying[job.id]
                              ? 'bg-blue-100 text-blue-700 cursor-not-allowed border border-blue-300'
                              : !meetsCgpaRequirement(job)
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'
                              : 'border border-green-600 bg-[#268812] text-white hover:bg-green-600 cursor-pointer'
                          }`}
                        >
                          {hasApplied(job.id) ? (
                            <>
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              Applied!
                            </>
                          ) : applying[job.id] ? (
                            <>
                              <Loader className="h-3 w-3 inline mr-1 animate-spin" />
                              Applying...
                            </>
                          ) : !meetsCgpaRequirement(job) ? (
                            <>
                              <XCircle className="h-3 w-3 inline mr-1" />
                              CGPA Not Met
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
          <ErrorBoundary>
            <ConnectGoogleCalendar />
          </ErrorBoundary>
        );

      case 'applications':
        // Calculate application statistics
        const totalApplied = applications.length;
        const shortlisted = applications.filter(app => {
          const status = app.status?.toUpperCase();
          return status === 'SHORTLISTED';
        }).length;
        const interviewed = applications.filter(app => {
          const status = app.status?.toUpperCase();
          return status === 'INTERVIEWED';
        }).length;
        const offers = applications.filter(app => {
          const status = app.status?.toUpperCase();
          return status === 'OFFERED' || status === 'SELECTED';
        }).length;

        // Filter applications with interview history (Past Records)
        const pastRecords = interviewHistory.filter(app => app.interviewHistory?.hasInterview);

        return (
          <div className="space-y-8">
            {/* Enhanced Application Summary - Muted Colors - Compact Size */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-100 via-gray-50 to-blue-50 rounded-xl shadow-lg border border-gray-200 p-5">
              {/* Subtle background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-200 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl"></div>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">Application Dashboard</h3>
                    <p className="text-sm text-gray-600">Track your job application journey</p>
                  </div>
                  <div className="hidden md:block">
                    <Briefcase className="w-10 h-10 text-gray-300" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="p-1.5 bg-blue-200 rounded-lg">
                        <ClipboardList className="w-4 h-4 text-blue-700" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-700 mb-0.5">{totalApplied}</div>
                    <div className="text-xs text-blue-600 font-medium">Total Applied</div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-4 border-2 border-yellow-200 hover:border-yellow-400 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="p-1.5 bg-yellow-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-yellow-700" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-700 mb-0.5">{shortlisted}</div>
                    <div className="text-xs text-yellow-600 font-medium">Shortlisted</div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200 hover:border-purple-400 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="p-1.5 bg-purple-200 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-purple-700" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-purple-700 mb-0.5">{interviewed}</div>
                    <div className="text-xs text-purple-600 font-medium">Interviewed</div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200 hover:border-green-400 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="p-1.5 bg-green-200 rounded-lg">
                        <Award className="w-4 h-4 text-green-700" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-700 mb-0.5">{offers}</div>
                    <div className="text-xs text-green-600 font-medium">Offers</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced View Toggle */}
            <div className="flex justify-center">
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-2 shadow-xl border border-gray-200/50 inline-flex gap-2">
                <button
                  onClick={() => setApplicationsView('current')}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                    applicationsView === 'current' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                  Current Applications
                </button>
                <button
                  onClick={() => setApplicationsView('past')}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                    applicationsView === 'past' 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <ClipboardList className="w-5 h-5" />
                  Past Applications
                </button>
              </div>
            </div>

            {applicationsView === 'past' ? (
              /* Enhanced Past Applications View */
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-slate-100 via-gray-50 to-purple-50 rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Past Applications</h2>
                  <p className="text-gray-600">Your interview history and results</p>
                </div>
                
                {loadingInterviewHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-lg">
                    <Loader className="animate-spin h-12 w-12 text-purple-600 mb-4" />
                    <span className="text-gray-600 text-lg font-medium">Loading interview history...</span>
                  </div>
                ) : pastRecords.length === 0 ? (
                  <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg border border-gray-200">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mb-6">
                      <ClipboardList className="w-12 h-12 text-purple-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">No Past Records</h3>
                    <p className="text-gray-500 text-lg mb-1">Your completed interview records will appear here.</p>
                    <p className="text-gray-400 text-sm">Keep applying and attending interviews to build your history!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pastRecords.map((record, index) => {
                      const history = record.interviewHistory;
                      const isCracked = history.isCracked;
                      const isRejected = history.isRejected;
                      
                      return (
                        <div
                          key={record.id}
                          className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          {/* Gradient accent bar */}
                          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                            isCracked ? 'from-green-500 to-emerald-500' :
                            isRejected ? 'from-red-500 to-rose-500' :
                            'from-gray-400 to-gray-500'
                          }`}></div>
                          
                          <div className="p-8">
                            {/* Enhanced Header Row */}
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                              <div className="flex items-center gap-4">
                                <div className={`${getCompanyColor(record.company?.name)} w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                                  <span className="text-white font-bold text-2xl">
                                    {getCompanyInitial(record.company?.name)}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                                    {record.job?.jobTitle || 'Unknown Position'}
                                  </h3>
                                  <p className="text-lg font-semibold text-gray-600 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    {record.company?.name || 'Unknown Company'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {/* Dropdown Button */}
                                <button
                                  onClick={() => {
                                    setExpandedApplications(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(record.id)) {
                                        newSet.delete(record.id);
                                      } else {
                                        newSet.add(record.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                                >
                                  <span className="text-sm font-medium text-gray-700">View Details</span>
                                  {expandedApplications.has(record.id) ? (
                                    <IoIosArrowDropup className="w-5 h-5 text-gray-600" />
                                  ) : (
                                    <IoIosArrowDropdown className="w-5 h-5 text-gray-600" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Dropdown Content - Status and Round Details */}
                            {expandedApplications.has(record.id) && (
                              <div className="mb-6 space-y-6 border-t border-gray-200 pt-6">
                                {/* Status Badges */}
                                <div className="flex items-center gap-3 justify-center md:justify-start">
                                  {isCracked && (
                                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 shadow-md">
                                      <CheckCircle className="w-5 h-5" />
                                      Cracked
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200 shadow-md">
                                      <XCircle className="w-5 h-5" />
                                      Rejected
                                    </span>
                                  )}
                                  {!isCracked && !isRejected && (
                                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 shadow-md">
                                      <Clock className="w-5 h-5" />
                                      Pending
                                    </span>
                                  )}
                                </div>

                                {/* Enhanced Interview Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Trophy className="w-5 h-5 text-blue-600" />
                                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Round Reached</p>
                                    </div>
                                    <p className="text-lg font-bold text-gray-800">
                                      {history.lastRoundReached || 'Not evaluated'}
                                    </p>
                                  </div>
                                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-100 hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <ClipboardList className="w-5 h-5 text-purple-600" />
                                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Total Rounds</p>
                                    </div>
                                    <p className="text-lg font-bold text-gray-800">
                                      {history.rounds?.length || 0} rounds
                                    </p>
                                  </div>
                                </div>

                                {/* Enhanced Rounds Progress */}
                                {history.rounds && history.rounds.length > 0 && (
                                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                                    <div className="flex items-center gap-2 mb-4">
                                      <ClipboardList className="w-5 h-5 text-indigo-600" />
                                      <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Interview Rounds</p>
                                    </div>
                                    <div className="space-y-3">
                                      {history.rounds.map((round, index) => {
                                        const wasReached = history.roundsReached?.includes(round.name);
                                        const evaluation = history.evaluations?.find(e => e.roundName === round.name);
                                        
                                        return (
                                          <div
                                            key={index}
                                            className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                                              wasReached 
                                                ? evaluation?.status === 'SELECTED'
                                                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-sm'
                                                  : evaluation?.status === 'REJECTED'
                                                  ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300 shadow-sm'
                                                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-sm'
                                                : 'bg-white border-gray-200'
                                            }`}
                                          >
                                            <div className="flex items-center gap-3 mb-3">
                                              {(() => {
                                                // Different colors for each round number - always show colors
                                                const roundColors = [
                                                  'bg-gradient-to-br from-blue-500 to-indigo-600',      // Round 1 - Blue
                                                  'bg-gradient-to-br from-purple-500 to-pink-600',      // Round 2 - Purple
                                                  'bg-gradient-to-br from-amber-500 to-orange-600',     // Round 3 - Amber
                                                  'bg-gradient-to-br from-teal-500 to-cyan-600',        // Round 4 - Teal
                                                  'bg-gradient-to-br from-rose-500 to-red-600',         // Round 5 - Rose
                                                  'bg-gradient-to-br from-emerald-500 to-green-600',    // Round 6 - Emerald
                                                  'bg-gradient-to-br from-violet-500 to-purple-600',    // Round 7 - Violet
                                                  'bg-gradient-to-br from-sky-500 to-blue-600',         // Round 8 - Sky
                                                ];
                                                const roundNotReachedColors = [
                                                  'bg-gradient-to-br from-blue-300 to-indigo-400',      // Round 1 - Light Blue
                                                  'bg-gradient-to-br from-purple-300 to-pink-400',      // Round 2 - Light Purple
                                                  'bg-gradient-to-br from-amber-300 to-orange-400',     // Round 3 - Light Amber
                                                  'bg-gradient-to-br from-teal-300 to-cyan-400',        // Round 4 - Light Teal
                                                  'bg-gradient-to-br from-rose-300 to-red-400',         // Round 5 - Light Rose
                                                  'bg-gradient-to-br from-emerald-300 to-green-400',    // Round 6 - Light Emerald
                                                  'bg-gradient-to-br from-violet-300 to-purple-400',    // Round 7 - Light Violet
                                                  'bg-gradient-to-br from-sky-300 to-blue-400',         // Round 8 - Light Sky
                                                ];
                                                const roundNumber = index + 1;
                                                const colorIndex = (roundNumber - 1) % roundColors.length;
                                                const baseColor = roundColors[colorIndex];
                                                const mutedColor = roundNotReachedColors[colorIndex];
                                                
                                                return (
                                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition-all duration-200 ${
                                                    wasReached ? baseColor : mutedColor + ' opacity-75'
                                                  }`}>
                                                    <span className="text-lg">{roundNumber}</span>
                                                  </div>
                                                );
                                              })()}
                                              <div>
                                                <span className="font-semibold text-base text-gray-800 block">
                                                  {round.name || `Round ${index + 1}`}
                                                </span>
                                              </div>
                                            </div>
                                            
                                            {/* Round Details */}
                                            <div className="space-y-2 pl-16">
                                              {wasReached ? (
                                                <>
                                                  {evaluation?.marks !== null && (
                                                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                                                      <span className="text-sm font-semibold text-gray-700">Score:</span>
                                                      <span className="text-base font-bold text-indigo-700">{evaluation.marks}/100</span>
                                                    </div>
                                                  )}
                                                  {evaluation?.status && (
                                                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                                                      <span className="text-sm font-semibold text-gray-700">Status:</span>
                                                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                                                        evaluation.status === 'SELECTED'
                                                          ? 'bg-green-200 text-green-800'
                                                          : evaluation.status === 'REJECTED'
                                                          ? 'bg-red-200 text-red-800'
                                                          : 'bg-blue-200 text-blue-800'
                                                      }`}>
                                                        {evaluation.status}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {evaluation?.remarks && (
                                                    <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                                                      <span className="text-sm font-semibold text-gray-700 block mb-1">Remarks:</span>
                                                      <p className="text-sm text-gray-600">{evaluation.remarks}</p>
                                                    </div>
                                                  )}
                                                </>
                                              ) : (
                                                <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg text-center">
                                                  <span className="text-sm font-medium text-gray-500">Not reached</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Enhanced Applied Date */}
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Calendar className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">Applied Date</p>
                                <p className="font-semibold text-gray-800">{formatDate(record.appliedDate)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Enhanced Current Applications View */
              <div className="space-y-6">
                {loadingApplications ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-lg">
                    <Loader className="animate-spin h-12 w-12 text-indigo-600 mb-4" />
                    <span className="text-gray-600 text-lg font-medium">Loading your applications...</span>
                  </div>
                ) : !applications || applications.length === 0 ? (
                  <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg border border-gray-200">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-6">
                      <ClipboardList className="w-12 h-12 text-indigo-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">No Applications Yet</h3>
                    <p className="text-gray-500 text-lg mb-1">Start your job search journey today!</p>
                    <p className="text-gray-400 text-sm">Browse available jobs and apply to track your progress here.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Enhanced Application Cards */}
                    {applications.map((application, index) => (
                      <div
                        key={application.id}
                        className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {/* Gradient accent bar */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                          application.status?.toLowerCase() === 'applied' ? 'from-blue-500 to-cyan-500' :
                          application.status?.toLowerCase() === 'shortlisted' ? 'from-yellow-500 to-amber-500' :
                          application.status?.toLowerCase() === 'interviewed' ? 'from-purple-500 to-pink-500' :
                          application.status?.toLowerCase() === 'offered' || application.status?.toLowerCase() === 'selected' ? 'from-green-500 to-emerald-500' :
                          application.status?.toLowerCase() === 'rejected' ? 'from-red-500 to-rose-500' :
                          'from-gray-400 to-gray-500'
                        }`}></div>
                        
                        <div className="p-8">
                          {/* Interview Status Badge */}
                          {application.interviewStatus?.hasSession && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">
                                  {application.interviewStatus.statusText || 'Interview Status'}
                                </span>
                              </div>
                              {application.interviewStatus.lastRoundReached > 0 && (
                                <p className="text-xs text-blue-600 mt-1 ml-6">
                                  Last Round Reached: Round {application.interviewStatus.lastRoundReached}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {/* Enhanced Header Row */}
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                            <div className="flex items-center gap-4">
                              <div className={`${getCompanyColor(application.company?.name)} w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                                <span className="text-white font-bold text-2xl">
                                  {getCompanyInitial(application.company?.name)}
                                </span>
                              </div>
                              <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                                  {application.job?.jobTitle || 'Unknown Position'}
                                </h3>
                                <p className="text-lg font-semibold text-gray-600 flex items-center gap-2">
                                  <Building2 className="w-4 h-4" />
                                  {application.company?.name || 'Unknown Company'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow-md ${getStatusColor(application.status)}`}>
                                {getStatusIcon(application.status)}
                                {application.status === 'job_removed'
                                  ? 'Job Removed'
                                  : application.status
                                  ? application.status.charAt(0).toUpperCase() + application.status.slice(1)
                                  : 'Unknown'}
                              </span>
                            </div>
                          </div>

                          {/* Enhanced Job Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="group/item bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200">
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Location</p>
                              </div>
                              <p className="text-base font-bold text-gray-800">
                                {application.job?.location || 'Not specified'}
                              </p>
                            </div>
                            <div className="group/item bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100 hover:shadow-md transition-all duration-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Briefcase className="w-4 h-4 text-purple-600" />
                                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Experience</p>
                              </div>
                              <p className="text-base font-bold text-gray-800">
                                {application.job?.experienceLevel || 'Not specified'}
                              </p>
                            </div>
                            <div className="group/item bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100 hover:shadow-md transition-all duration-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-green-600" />
                                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Job Type</p>
                              </div>
                              <p className="text-base font-bold text-gray-800">
                                {application.job?.jobType || 'Not specified'}
                              </p>
                            </div>
                            <div className="group/item bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-100 hover:shadow-md transition-all duration-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Award className="w-4 h-4 text-amber-600" />
                                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Salary</p>
                              </div>
                              <p className="text-base font-bold text-gray-800">
                                {application.job?.salaryRange || 'Not disclosed'}
                              </p>
                            </div>
                          </div>

                          {/* Enhanced Application Timeline */}
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200 mb-6">
                            <div className="flex flex-wrap items-center gap-6 text-sm">
                              <div className="flex items-center gap-2 text-gray-700">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 font-medium">Applied</p>
                                  <p className="font-semibold text-gray-800">{formatDate(application.appliedDate)}</p>
                                </div>
                              </div>
                              {application.interviewDate && (
                                <div className="flex items-center gap-2 text-gray-700">
                                  <div className="p-2 bg-purple-100 rounded-lg">
                                    <Clock className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 font-medium">Interview</p>
                                    <p className="font-semibold text-gray-800">{formatDate(application.interviewDate)}</p>
                                  </div>
                                </div>
                              )}
                              {application.job?.deadline && (
                                <div className="flex items-center gap-2 text-gray-700">
                                  <div className="p-2 bg-red-100 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 font-medium">Deadline</p>
                                    <p className="font-semibold text-gray-800">{formatDate(application.job.deadline)}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Enhanced Job Description Preview */}
                          {application.job?.description && (
                            <div className="mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100">
                              <div className="flex items-center gap-2 mb-3">
                                <FileText className="w-5 h-5 text-indigo-600" />
                                <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Job Description</p>
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                                {application.job.description.length > 200 
                                  ? `${application.job.description.substring(0, 200)}...` 
                                  : application.job.description}
                              </p>
                            </div>
                          )}

                          {/* Enhanced Skills Required */}
                          {(() => {
                            // Parse requiredSkills - it might be a JSON string or array
                            let skills = [];
                            if (application.job?.requiredSkills) {
                              try {
                                if (typeof application.job.requiredSkills === 'string') {
                                  skills = JSON.parse(application.job.requiredSkills);
                                } else if (Array.isArray(application.job.requiredSkills)) {
                                  skills = application.job.requiredSkills;
                                }
                              } catch (e) {
                                // If parsing fails, try to split by comma or treat as single skill
                                if (typeof application.job.requiredSkills === 'string') {
                                  skills = application.job.requiredSkills.split(',').map(s => s.trim()).filter(s => s);
                                }
                              }
                            }
                            
                            return skills.length > 0 ? (
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Code2 className="w-5 h-5 text-indigo-600" />
                                  <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Required Skills</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {skills.slice(0, 8).map((skill, index) => (
                                    <span
                                      key={index}
                                      className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 text-sm font-semibold rounded-full border border-indigo-200 hover:from-indigo-200 hover:to-purple-200 transition-all duration-200 shadow-sm"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                  {skills.length > 8 && (
                                    <span className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-full border border-gray-200">
                                      +{skills.length - 8} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    ))}

                </div>
              )}
            </div>
            )}
          </div>
        );

      case 'resources':
        return <Resources />;

      case 'endorsements':
        return (
          <ErrorBoundary>
            <EndorsementManagement />
          </ErrorBoundary>
        );

      case 'editProfile':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
                <div className="text-sm text-gray-500">
                  Fields marked with <span className="text-red-500">*</span> are required
                </div>
              </div>
              
              <form className="space-y-8" onSubmit={handleSaveProfile}>
                {/* Profile Photo Section */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                  <div className="flex items-start gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <ImageIcon size={16} className="text-blue-600" />
                        Profile Photo
                      </label>
                    </div>
                    <div className="relative group flex-shrink-0">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg bg-gray-100 flex items-center justify-center">
                        {profilePhoto ? (
                          <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User size={48} className="text-gray-400" />
                        )}
                      </div>
                      <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        <Camera size={24} className="text-white" />
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;

                            // Validate file
                            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                            const maxSize = 2 * 1024 * 1024; // 2MB

                            if (!allowedTypes.includes(file.type)) {
                              setAlertMessage('Only JPG, PNG, and WebP images are allowed');
                              setAlertType('error');
                              setShowFloatingAlert(true);
                              setTimeout(() => setShowFloatingAlert(false), 3000);
                              return;
                            }

                            if (file.size > maxSize) {
                              setAlertMessage('File size must be less than 2MB');
                              setAlertType('error');
                              setShowFloatingAlert(true);
                              setTimeout(() => setShowFloatingAlert(false), 3000);
                              return;
                            }

                            try {
                              // Upload to Cloudinary
                              const response = await api.uploadProfileImage(file);
                              
                              // Update profile photo state with Cloudinary URL
                              setProfilePhoto(response.profileImage.url);
                              
                              setAlertMessage('Profile image uploaded successfully!');
                              setAlertType('success');
                              setShowFloatingAlert(true);
                              setTimeout(() => setShowFloatingAlert(false), 3000);
                            } catch (err) {
                              console.error('Error uploading profile image:', err);
                              // Extract error message from various error formats
                              let errorMessage = 'Failed to upload profile image';
                              if (err.message) {
                                errorMessage = err.message;
                              } else if (err.response?.data?.error) {
                                errorMessage = err.response.data.error;
                              } else if (err.response?.error) {
                                errorMessage = err.response.error;
                              }
                              setAlertMessage(errorMessage);
                              setAlertType('error');
                              setShowFloatingAlert(true);
                              setTimeout(() => setShowFloatingAlert(false), 5000);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Personal Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <User size={20} className="text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <User size={16} className="text-gray-500" />
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Mail size={16} className="text-gray-500" />
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Phone size={16} className="text-gray-500" />
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                          validationErrors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter your 10-digit phone number (starting with 6, 7, 8, or 9)"
                        value={phone}
                        maxLength={10}
                        onChange={(e) => {
                          // Only allow digits
                          const digitsOnly = e.target.value.replace(/\D/g, '');
                          setPhone(digitsOnly);
                          validateField('phone', digitsOnly);
                        }}
                      />
                      {validationErrors.phone && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Hash size={16} className="text-gray-500" />
                        Enrollment ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="enrollmentId"
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
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
                </div>

                {/* Academic Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <FaGraduationCap size={20} className="text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Academic Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Trophy size={16} className="text-yellow-500" />
                        CGPA
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                        placeholder="Enter your CGPA (e.g., 9.00, 8.75)"
                        value={cgpa}
                        onChange={(e) => {
                          let value = e.target.value;
                          // Allow only numbers and one decimal point
                          value = value.replace(/[^0-9.]/g, '');
                          // Ensure only one decimal point
                          const parts = value.split('.');
                          if (parts.length > 2) {
                            value = parts[0] + '.' + parts.slice(1).join('');
                          }
                          // Limit to 5 characters (e.g., 10.00)
                          if (value.length > 5) {
                            value = value.substring(0, 5);
                          }
                          setCgpa(value);
                          // Only validate if value is clearly invalid (out of range)
                          // Allow partial input during typing (e.g., "8", "8.", "8.0")
                          if (value) {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && (numValue < 0 || numValue > 10)) {
                              validateField('cgpa', value);
                            } else {
                              // Clear error if value is valid or partial
                              setValidationErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.cgpa;
                                return newErrors;
                              });
                            }
                          } else {
                            // Clear error if empty
                            setValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.cgpa;
                              return newErrors;
                            });
                          }
                        }}
                        onBlur={(e) => {
                          // On blur, format to exactly 2 decimal places and validate
                          const value = e.target.value.trim();
                          if (value) {
                            let formattedValue = value;
                            if (/^\d+$/.test(value)) {
                              // Integer like "9" -> "9.00"
                              formattedValue = value + '.00';
                            } else if (/^\d+\.\d*$/.test(value)) {
                              // Has decimal point
                              const parts = value.split('.');
                              const integerPart = parts[0];
                              const decimalPart = (parts[1] || '').substring(0, 2).padEnd(2, '0');
                              formattedValue = integerPart + '.' + decimalPart;
                            }
                            setCgpa(formattedValue);
                            // Validate the formatted value
                            validateField('cgpa', formattedValue);
                          }
                        }}
                        pattern="^(10\.00|[0-9]\.[0-9]{2})$"
                        maxLength="5"
                      />
                      {validationErrors.cgpa && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.cgpa}</p>
                      )}
                    </div>
                    <div>
                      <CustomDropdown
                        label={
                          <>
                            Batch <span className="text-red-500">*</span>
                          </>
                        }
                        icon={FaUsers}
                        iconColor="text-indigo-600"
                        options={[
                          { value: '', label: 'Select Batch' },
                          { value: '25-29', label: '25-29' },
                          { value: '24-28', label: '24-28' },
                          { value: '23-27', label: '23-27' }
                        ]}
                        value={batch}
                        onChange={(value) => {
                          setBatch(value);
                          validateField('batch', value);
                        }}
                        placeholder="Select Batch"
                      />
                      {validationErrors.batch && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.batch}</p>
                      )}
                    </div>
                    <div>
                      <CustomDropdown
                        label={
                          <>
                            School <span className="text-red-500">*</span>
                          </>
                        }
                        icon={FaGraduationCap}
                        iconColor="text-purple-600"
                        options={[
                          { value: '', label: 'Select School' },
                          { value: 'SOT', label: 'School of Technology' },
                          { value: 'SOM', label: 'School of Management' },
                          { value: 'SOH', label: 'School of HealthCare' }
                        ]}
                        value={school}
                        onChange={(value) => {
                          setSchool(value);
                          validateField('school', value);
                        }}
                        placeholder="Select School"
                      />
                      {validationErrors.school && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.school}</p>
                      )}
                    </div>
                    <div>
                      <CustomDropdown
                        label={
                          <>
                            Center <span className="text-red-500">*</span>
                          </>
                        }
                        icon={FaMapMarkerAlt}
                        iconColor="text-blue-600"
                        options={[
                          { value: '', label: 'Select Center' },
                          { value: 'BANGALORE', label: 'Bangalore' },
                          { value: 'NOIDA', label: 'Noida' },
                          { value: 'LUCKNOW', label: 'Lucknow' },
                          { value: 'PUNE', label: 'Pune' },
                          { value: 'PATNA', label: 'Patna' },
                          { value: 'INDORE', label: 'Indore' }
                        ]}
                        value={center}
                        onChange={(value) => {
                          setCenter(value);
                          validateField('center', value);
                        }}
                        placeholder="Select Center"
                      />
                      {validationErrors.center && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.center}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <MapPin size={20} className="text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Location</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <MapPin size={16} className="text-gray-500" />
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                          validationErrors.city ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter your city"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          validateField('city', e.target.value);
                        }}
                        onBlur={(e) => {
                          const capitalized = capitalizeFirstLetter(e.target.value);
                          setCity(capitalized);
                          validateField('city', capitalized);
                        }}
                      />
                      {validationErrors.city && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.city}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Building2 size={16} className="text-gray-500" />
                        State/Region <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                          validationErrors.stateRegion ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter your state or region"
                        value={stateRegion}
                        onChange={(e) => {
                          setStateRegion(e.target.value);
                          validateField('stateRegion', e.target.value);
                        }}
                        onBlur={(e) => {
                          const capitalized = capitalizeFirstLetter(e.target.value);
                          setStateRegion(capitalized);
                          validateField('stateRegion', capitalized);
                        }}
                      />
                      {validationErrors.stateRegion && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.stateRegion}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Professional Profile Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Briefcase size={20} className="text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Professional Profile</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Type size={16} className="text-gray-500" />
                        Headline <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                        placeholder="Your professional headline"
                        value={Headline}
                        onChange={(e) => setHeadline(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Linkedin size={16} className="text-blue-600" />
                        LinkedIn <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                          validationErrors.linkedin ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="https://linkedin.com/in/username"
                        value={linkedin}
                        onChange={(e) => {
                          setLinkedin(e.target.value);
                          validateField('linkedin', e.target.value);
                        }}
                      />
                      {validationErrors.linkedin && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.linkedin}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Social Media & Coding Profiles Section */}
                {(school === 'SOT' || school === 'SOM' || school === 'SOH') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <Globe size={20} className="text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Social Media & Coding Profiles</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Youtube size={16} className="text-red-600" />
                          YouTube
                        </label>
                        <input
                          type="url"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                          placeholder="https://youtube.com/@channel"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                        />
                      </div>
                      {school === 'SOT' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Github size={16} className="text-gray-700" />
                            GitHub
                          </label>
                          <input
                            type="url"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                            placeholder="https://github.com/username"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                          />
                        </div>
                      )}
                      {(school === 'SOM' || school === 'SOH') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <FaInstagram size={16} className="text-pink-500" />
                            Instagram
                          </label>
                          <input
                            type="url"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                            placeholder="https://instagram.com/username"
                            value={instagramUrl}
                            onChange={(e) => setInstagramUrl(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Coding Platforms Section - Only for SOT */}
                {school === 'SOT' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <Code2 size={20} className="text-orange-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Coding Platforms</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <LeetCodeIcon className="h-4 w-4 text-orange-600" size={16} />
                          LeetCode
                        </label>
                        <input
                          type="url"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                          placeholder="https://leetcode.com/u/username"
                          value={leetcode}
                          onChange={(e) => setLeetcode(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <SiCodeforces size={16} className="text-blue-600" />
                          Codeforces
                        </label>
                        <input
                          type="url"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                          placeholder="https://codeforces.com/profile/username"
                          value={codeforces}
                          onChange={(e) => setCodeforces(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <SiGeeksforgeeks size={16} className="text-green-600" />
                          GeeksforGeeks
                        </label>
                        <input
                          type="url"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                          placeholder="https://auth.geeksforgeeks.org/user/username"
                          value={gfg}
                          onChange={(e) => setGfg(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <FaHackerrank size={16} className="text-emerald-600" />
                          HackerRank
                        </label>
                        <input
                          type="url"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                          placeholder="https://www.hackerrank.com/profile/username"
                          value={hackerrank}
                          onChange={(e) => setHackerrank(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Other Profiles Section - After Coding Platforms */}
                {(school === 'SOT' || school === 'SOM' || school === 'SOH') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <LinkIcon size={20} className="text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Other Profiles</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Add additional profiles (e.g., Kaggle, CodeChef, or any other platform)
                    </p>
                    
                    {/* List of existing profiles */}
                    {otherProfiles.length > 0 && (
                      <div className="space-y-3">
                        {otherProfiles.map((profile, index) => (
                          <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Platform Name</label>
                                <input
                                  type="text"
                                  value={profile.platformName || ''}
                                  onChange={(e) => {
                                    const updated = [...otherProfiles];
                                    updated[index] = { ...updated[index], platformName: e.target.value };
                                    setOtherProfiles(updated);
                                  }}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="e.g., Kaggle"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Profile ID/URL</label>
                                <input
                                  type="text"
                                  value={profile.profileId || ''}
                                  onChange={(e) => {
                                    const updated = [...otherProfiles];
                                    updated[index] = { ...updated[index], profileId: e.target.value };
                                    setOtherProfiles(updated);
                                  }}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="username or URL"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = otherProfiles.filter((_, i) => i !== index);
                                setOtherProfiles(updated);
                              }}
                              className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove profile"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Inline Add Profile Form */}
                    {showAddProfileForm && (
                      <div 
                        ref={addProfileFormRef}
                        className="mb-4 p-4 border border-gray-300 rounded bg-gray-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Platform Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newProfile.platformName}
                              onChange={(e) => setNewProfile({ ...newProfile, platformName: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Kaggle, CodeChef"
                              autoFocus
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Profile ID/URL <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newProfile.profileId}
                              onChange={(e) => setNewProfile({ ...newProfile, profileId: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="username or full URL"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddProfileForm(false);
                              setNewProfile({ platformName: '', profileId: '' });
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (newProfile.platformName.trim() && newProfile.profileId.trim()) {
                                setOtherProfiles([...otherProfiles, { 
                                  platformName: newProfile.platformName.trim(), 
                                  profileId: newProfile.profileId.trim() 
                                }]);
                                setShowAddProfileForm(false);
                                setNewProfile({ platformName: '', profileId: '' });
                              }
                            }}
                            disabled={!newProfile.platformName.trim() || !newProfile.profileId.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Add new profile button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (showAddProfileForm) {
                          // Cancel adding if form is already shown
                          setShowAddProfileForm(false);
                          setNewProfile({ platformName: '', profileId: '' });
                        } else {
                          // Show form
                          setNewProfile({ platformName: '', profileId: '' });
                          setShowAddProfileForm(true);
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        showAddProfileForm 
                          ? 'text-white bg-blue-600 hover:bg-blue-700' 
                          : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      <Plus size={16} />
                      Add Profile
                    </button>
                  </div>
                )}

                {/* Bio Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <FileText size={20} className="text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">About Me</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FileText size={16} className="text-gray-500" />
                      Bio <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none cursor-text"
                      rows="4"
                      placeholder="Write a brief bio about yourself"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                {/* Terms & Actions Section */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="editCheckbox"
                        checked={isChecked}
                        onChange={() => setIsChecked(!isChecked)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="editCheckbox" className="text-sm text-gray-700 cursor-pointer">
                        I acknowledge that the information provided on this dashboard is accurate to the best of the institution's knowledge. I understand that the institution shall not be held liable for any errors, omissions, or discrepancies.
                      </label>
                    </div>
                    <div className="flex space-x-4 justify-end pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          resetProfileForm();
                          setIsChecked(false);
                          setValidationErrors({});
                        }}
                        className="px-6 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium cursor-pointer"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        id='editSaveBtn'
                        disabled={!isChecked || saving}
                        className={`px-8 py-2 rounded-md text-white transition-colors font-medium shadow-md ${
                          (!isChecked || saving) 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl cursor-pointer'
                        }`}
                      >
                        {saving ? (
                          <span className="flex items-center gap-2">
                            <Loader className="animate-spin" size={16} />
                            Saving...
                          </span>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </div>
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
                          className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${activeTab === tab.id
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

              {(visibleSkillsCredentials.length > 0 || (otherProfiles && otherProfiles.length > 0)) && (
                <div className="mb-6">
                  {sidebarWidth >= 9 && (
                    <h2 className="text-base font-bold text-gray-900 mb-3">Skills & Credentials</h2>
                  )}
                  <nav className="space-y-1">
                    {visibleSkillsCredentials.map((skill) => {
                      const Icon = skill.icon;
                      const profileUrl = skill.id === 'leetcode' ? leetcode
                        : skill.id === 'codeforces' ? codeforces
                        : skill.id === 'gfg' ? gfg
                        : skill.id === 'hackerrank' ? hackerrank
                        : skill.id === 'github' ? githubUrl
                        : skill.id === 'instagram' ? instagramUrl
                        : skill.id === 'youtube' ? youtubeUrl
                        : skill.id === 'linkedin' ? linkedin
                        : '';
                      
                      if (!profileUrl) return null;
                      
                      return (
                        <div key={skill.id} className="mb-1">
                          <button
                            onClick={() => handleSkillClick(skill.id)}
                            className={`w-full flex items-center rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition-all duration-200 group cursor-pointer ${sidebarWidth < 12 ? 'justify-center px-2 py-2' : 'px-3 py-2'
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
                    
                    {/* Display Other Profiles */}
                    {otherProfiles && otherProfiles.length > 0 && otherProfiles.map((profile, index) => {
                      if (!profile.platformName || !profile.profileId) return null;
                      
                      // Build URL - if profileId looks like a URL, use it directly, otherwise try common patterns
                      let profileUrl = profile.profileId;
                      if (!profileUrl.startsWith('http')) {
                        // Common platform URL patterns
                        const platformLower = profile.platformName.toLowerCase();
                        if (platformLower.includes('kaggle')) {
                          profileUrl = `https://www.kaggle.com/${profile.profileId}`;
                        } else if (platformLower.includes('codechef')) {
                          profileUrl = `https://www.codechef.com/users/${profile.profileId}`;
                        } else if (platformLower.includes('atcoder')) {
                          profileUrl = `https://atcoder.jp/users/${profile.profileId}`;
                        } else if (platformLower.includes('topcoder')) {
                          profileUrl = `https://www.topcoder.com/members/${profile.profileId}`;
                        } else {
                          // Generic fallback
                          profileUrl = profile.profileId;
                        }
                      }
                      
                      return (
                        <div key={`other-${index}`} className="mb-1">
                          <button
                            onClick={() => window.open(profileUrl, '_blank')}
                            className={`w-full flex items-center rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition-all duration-200 group cursor-pointer ${sidebarWidth < 12 ? 'justify-center px-2 py-2' : 'px-3 py-2'
                              }`}
                            title={sidebarWidth < 9 ? profile.platformName : ''}
                          >
                            <LinkIcon className={`h-4 w-4 ${sidebarWidth >= 9 ? 'mr-2' : ''} text-purple-600`} />
                            {sidebarWidth >= 9 && (
                              <>
                                <span className="flex-1 text-left">{profile.platformName}</span>
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
                  className={`w-full flex items-center rounded-lg text-xs font-medium text-red-500 hover:bg-red-100 transition-all duration-200 cursor-pointer ${sidebarWidth < 9 ? 'justify-center px-2 py-2 mb-10' : 'px-2 py-3'
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


      {/* Resume Selection Modal */}
      {isResumeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => {
          setIsResumeModalOpen(false);
          setPendingJob(null);
        }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Select Resume</h2>
              <button
                onClick={() => {
                  setIsResumeModalOpen(false);
                  setPendingJob(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {pendingJob && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-medium text-blue-800 mb-1">Applying to:</p>
                <p className="text-sm font-semibold text-gray-900">{pendingJob.jobTitle}</p>
                <p className="text-xs text-gray-600">{pendingJob.companyName || pendingJob.company?.name}</p>
              </div>
            )}
            
            <p className="text-sm text-gray-600 mb-6">
              Choose how you want to submit your resume for this application.
            </p>

            {loadingResumes ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="animate-spin text-blue-600" size={24} />
                <span className="ml-2 text-gray-600">Loading resumes...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Use Existing Resume Option */}
                {resumes.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Use Existing Resume
                    </h3>
                    <div className="space-y-2">
                      {resumes.map((resume) => (
                        <button
                          key={resume.id || resume.fileName}
                          onClick={() => handleResumeSelection(resume.id || resume.fileName)}
                          className="w-full text-left px-4 py-3 border border-blue-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-between bg-white shadow-sm group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-md">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700 block">
                                {resume.title || resume.fileName || resume.name || 'Resume'}
                              </span>
                              {resume.uploadedAt && (
                                <span className="text-xs text-gray-500">
                                  Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                                </span>
                              )}
                              {resume.isDefault && (
                                <span className="text-xs text-blue-600 font-medium ml-2">(Default)</span>
                              )}
                            </div>
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-500 opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create New Resume Option */}
                <button
                  onClick={handleCreateResume}
                  className="w-full px-4 py-4 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-3 text-blue-600 font-semibold bg-white shadow-sm"
                >
                  <FilePlus className="h-5 w-5" />
                  <span>Create New Resume</span>
                </button>

                {/* If no resumes exist, show message */}
                {resumes.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2 italic">
                    No resumes uploaded yet. Create a new one to proceed.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}