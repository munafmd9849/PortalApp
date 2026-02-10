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
import { showSuccess, showError, showWarning, showInfo, showLoading, replaceLoadingToast, dismissToast } from '../../utils/toast';
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
  Link as LinkIcon,
  Eye,
  DollarSign
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
  backlogs: profile.backlogs || '',
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
  // Old alert system removed - using toast notifications instead

  // Edit Profile form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [backlogs, setBacklogs] = useState('');
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

  const getCurrentProfileSnapshot = useCallback(() => normalizeProfileSnapshot({
    fullName,
    email,
    phone,
    enrollmentId,
    cgpa,
    backlogs,
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
    backlogs,
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
    setBacklogs(snapshot.backlogs);
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
  
  // Debug: Monitor applications state changes
  useEffect(() => {
    console.log('📊 [applications state changed]', {
      length: applications.length,
      loading: loadingApplications,
      applications: applications.map(app => ({
        id: app.id,
        jobId: app.jobId,
        jobTitle: app.job?.jobTitle
      }))
    });
  }, [applications, loadingApplications]);
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

  // Public Profile state
  const [publicProfileId, setPublicProfileId] = useState(null);
  const [publicProfileShowEmail, setPublicProfileShowEmail] = useState(true);
  const [publicProfileShowPhone, setPublicProfileShowPhone] = useState(false);
  const [loadingPublicProfile, setLoadingPublicProfile] = useState(false);

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
      if (isFormDirty) {
        resetProfileForm();
        setIsFormDirty(false);
        setIsChecked(false);
        setValidationErrors({});
        showInfo('Unsaved profile changes were discarded.');
      }
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab, isFormDirty, resetProfileForm]);

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
        setBacklogs(profileData.backlogs || '');
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
    if (!user?.id) {
      console.warn('⚠️ [loadApplicationsData] No user ID, skipping');
      return;
    }
    
    console.log('📋 [loadApplicationsData] Loading applications for user:', user.id);
    setLoadingApplications(true);
    try {
      const applicationsData = await getStudentApplications(user.id);
      console.log('📋 [loadApplicationsData] API response:', {
        isArray: Array.isArray(applicationsData),
        length: applicationsData?.length || 0,
        data: applicationsData
      });
      
      if (applicationsData && applicationsData.length > 0) {
        console.log('📋 [loadApplicationsData] Application details:', applicationsData.map(app => ({ 
          appId: app.id, 
          jobId: app.jobId, 
          jobTitle: app.job?.jobTitle,
          status: app.status,
          companyName: app.company?.name || app.job?.company?.name
        })));
      } else {
        console.warn('⚠️ [loadApplicationsData] No applications returned from API');
      }
      
      console.log('📋 [loadApplicationsData] About to set applications state:', {
        applicationsDataLength: applicationsData?.length || 0,
        isArray: Array.isArray(applicationsData),
        firstApp: applicationsData?.[0] ? {
          id: applicationsData[0].id,
          jobId: applicationsData[0].jobId,
          jobTitle: applicationsData[0].job?.jobTitle
        } : null
      });
      
      setApplications(applicationsData || []);
      
      // Verify state was set correctly
      setTimeout(() => {
        console.log('📋 [loadApplicationsData] State verification after setApplications:', {
          // Note: We can't directly read state here, but we can log what we set
          setValue: applicationsData?.length || 0
        });
      }, 100);
      
      console.log('✅ [loadApplicationsData] Applications state updated:', (applicationsData || []).length);
    } catch (err) {
      console.error('❌ [loadApplicationsData] Error loading applications:', err);
      console.error('❌ [loadApplicationsData] Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
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
      
      // Show success toast
      showSuccess(`Successfully applied to ${pendingJob.jobTitle} at ${pendingJob.company?.name || 'the company'}!`);
      
      // Clear applying state immediately
      setApplying(prev => ({ ...prev, [pendingJob.id]: false }));
      
      // Force refresh applications list to get complete data from backend (including the new application)
      // Reset the loading flag to force a fresh load
      dataLoadingRef.current.applications = false;
      // Reload immediately
      await loadApplicationsData();
      
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
        showError(`${message}\n\nYour CGPA: ${yourCgpa}\nRequired CGPA: ${requiredCgpa}\n\nPlease update your profile with a higher CGPA or apply to jobs with lower requirements.`);
      } else if (error.isNetworkError || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        // Network error - already handled by API layer, but show if not shown
        showError('Network error: Cannot connect to server. Please check your internet connection and ensure the backend server is running.');
      } else {
        // Clean error message for other errors
        const cleanMessage = errorData.message || errorMessage || 'Failed to apply to job. Please try again.';
        showError(cleanMessage);
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

  // Load public profile settings
  useEffect(() => {
    const loadPublicProfileSettings = async () => {
      if (!user?.id) return;
      try {
        const settings = await api.getPublicProfileSettings();
        setPublicProfileId(settings.publicProfileId);
        setPublicProfileShowEmail(settings.showEmail ?? true);
        setPublicProfileShowPhone(settings.showPhone ?? false);
      } catch (err) {
        console.error('Failed to load public profile settings:', err);
        // Don't show error - settings are optional
      }
    };
    loadPublicProfileSettings();
  }, [user?.id]);

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
    console.log('📋 [useEffect applications] Triggered:', {
      hasUserId: !!user?.id,
      userId: user?.id,
      alreadyLoaded: dataLoadingRef.current.applications,
      currentApplicationsLength: applications.length
    });
    
    if (user?.id) {
      // Always load if we don't have applications yet, or if flag says not loaded
      if (!dataLoadingRef.current.applications || applications.length === 0) {
        console.log('📋 [useEffect] Loading applications for user:', user.id);
        dataLoadingRef.current.applications = true;
        loadApplicationsData();
      } else {
        console.log('📋 [useEffect] Applications already loaded, current count:', applications.length);
      }
    } else {
      console.warn('⚠️ [useEffect] No user ID available for loading applications');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Remove loadApplicationsData from dependencies

  // Load applications and interview history when applications tab is active
  useEffect(() => {
    if (user?.id && activeTab === 'applications') {
      console.log('📋 [useEffect] Applications tab active, reloading data');
      console.log('📋 [useEffect] Current applications state before reload:', {
        length: applications.length,
        loading: loadingApplications
      });
      
      // Always reload when tab is opened to ensure fresh data
      // Reset loading flag to allow reload
      dataLoadingRef.current.applications = false;
      loadApplicationsData();
      loadInterviewHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeTab]); // Reload when tab changes to applications

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
      showError('Please fix the following errors:\n\n' + validation.errors.join('\n'));
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
        backlogs: backlogs.trim() || null,
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
      showSuccess('Profile details updated successfully');
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
        setBacklogs(updatedProfile.backlogs || '');
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
          backlogs: updatedProfile.backlogs || '',
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
        // Alert removed - using toast notifications
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
      
      showError(errorMessage);
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
    { id: 'leetcode', label: 'LeetCode', icon: LeetCodeIcon, color: 'text-[var(--pl-primary)]' },
    { id: 'codeforces', label: 'Codeforces', icon: SiCodeforces, color: 'text-[var(--pl-primary)]' },
    { id: 'gfg', label: 'GeeksforGeeks', icon: SiGeeksforgeeks, color: 'text-[var(--pl-primary)]' },
    { id: 'hackerrank', label: 'HackerRank', icon: FaHackerrank, color: 'text-[var(--pl-primary)]' },
    { id: 'github', label: 'GitHub', icon: Github, color: 'text-[var(--pl-text-secondary)]' },
    { id: 'instagram', label: 'Instagram', icon: FaInstagram, color: 'text-[var(--pl-primary)]' },
    { id: 'youtube', label: 'YouTube', icon: FaYoutube, color: 'text-[var(--pl-primary)]' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-[var(--pl-primary)]' },
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
    // Alert system removed - using toast notifications
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
      case 'applied':
        return 'bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] text-[var(--pl-primary)]';
      case 'shortlisted':
        return 'bg-[color-mix(in_oklab,var(--pl-warning)_12%,white)] text-[var(--pl-warning)]';
      case 'interviewed':
        return 'bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] text-[var(--pl-primary)]';
      case 'offered':
        return 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)]';
      case 'rejected':
        return 'bg-[color-mix(in_oklab,var(--pl-danger)_12%,white)] text-[var(--pl-danger)]';
      case 'job_removed':
        return 'bg-[color-mix(in_oklab,var(--pl-warning)_12%,white)] text-[var(--pl-warning)]';
      default:
        return 'bg-[color-mix(in_oklab,var(--pl-text-muted)_12%,white)] text-[var(--pl-text-secondary)]';
    }
  };

  const getRowBgColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied':
        return 'bg-[color-mix(in_oklab,var(--pl-primary)_5%,white)]';
      case 'shortlisted':
        return 'bg-[color-mix(in_oklab,var(--pl-warning)_8%,white)]';
      case 'interviewed':
        return 'bg-[color-mix(in_oklab,var(--pl-primary)_5%,white)]';
      case 'offered':
        return 'bg-[color-mix(in_oklab,var(--pl-success)_8%,white)]';
      case 'rejected':
        return 'bg-[color-mix(in_oklab,var(--pl-danger)_8%,white)]';
      case 'job_removed':
        return 'bg-[color-mix(in_oklab,var(--pl-warning)_8%,white)]';
      default:
        return 'bg-[var(--pl-surface-strong)]';
    }
  };

  const getCompanyInitial = (companyName) => {
    return companyName ? companyName.charAt(0).toUpperCase() : '?';
  };

  const getCompanyColor = (companyName) => {
    return 'bg-[var(--pl-primary)]';
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
        // Handle Firebase Timestamp objects
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
            <div className="bg-[var(--pl-surface-strong)] rounded-lg shadow-sm border border-[var(--pl-border)] p-6">
              <h2 className="text-2xl font-bold text-[var(--pl-text)] mb-4">Explore Job Opportunities</h2>
              
              {/* Profile completion check */}
              {!profileComplete ? (
                <div className="bg-[color-mix(in_oklab,var(--pl-warning)_8%,white)] border-l-4 border-[var(--pl-warning)] p-6 rounded-lg mb-6">
                  <div className="flex items-center mb-3">
                    <AlertTriangle className="h-6 w-6 text-[var(--pl-warning)] mr-3" />
                    <h3 className="text-lg font-semibold text-[var(--pl-warning)]">Complete Your Profile to View Jobs</h3>
                  </div>
                  <p className="text-[var(--pl-text-secondary)] mb-4">
                    To see available job opportunities, please complete all required fields (marked with *) in your profile:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    <div className={`flex items-center p-2 rounded text-sm ${fullName && fullName.trim() ? 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)]' : 'bg-[color-mix(in_oklab,var(--pl-danger)_12%,white)] text-[var(--pl-danger)]'}`}>
                      {fullName && fullName.trim() ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Full Name: {fullName && fullName.trim() ? '✓' : 'Required'}
                    </div>
                    <div className={`flex items-center p-2 rounded text-sm ${email && email.trim() ? 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)]' : 'bg-[color-mix(in_oklab,var(--pl-danger)_12%,white)] text-[var(--pl-danger)]'}`}>
                      {email && email.trim() ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Email: {email && email.trim() ? '✓' : 'Required'}
                    </div>
                    <div className={`flex items-center p-2 rounded text-sm ${phone && phone.trim() ? 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)]' : 'bg-[color-mix(in_oklab,var(--pl-danger)_12%,white)] text-[var(--pl-danger)]'}`}>
                      {phone && phone.trim() ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Phone: {phone && phone.trim() ? '✓' : 'Required'}
                    </div>
                    <div className={`flex items-center p-2 rounded text-sm ${enrollmentId && enrollmentId.trim() ? 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)]' : 'bg-[color-mix(in_oklab,var(--pl-danger)_12%,white)] text-[var(--pl-danger)]'}`}>
                      {enrollmentId && enrollmentId.trim() ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Enrollment ID: {enrollmentId && enrollmentId.trim() ? '✓' : 'Required'}
                    </div>
                    <div className={`flex items-center p-2 rounded text-sm ${school ? 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)]' : 'bg-[color-mix(in_oklab,var(--pl-danger)_12%,white)] text-[var(--pl-danger)]'}`}>
                      {school ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      School: {school || 'Not selected'}
                    </div>
                    <div className={`flex items-center p-2 rounded text-sm ${center ? 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)]' : 'bg-[color-mix(in_oklab,var(--pl-danger)_12%,white)] text-[var(--pl-danger)]'}`}>
                      {center ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Center: {center || 'Not selected'}
                    </div>
                    <div className={`flex items-center p-2 rounded text-sm ${batch ? 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)]' : 'bg-[color-mix(in_oklab,var(--pl-danger)_12%,white)] text-[var(--pl-danger)]'}`}>
                      {batch ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Batch: {batch || 'Not selected'}
                    </div>
                  </div>
                  <div className="bg-[color-mix(in_oklab,var(--pl-primary)_8%,white)] border border-[color-mix(in_oklab,var(--pl-primary)_35%,white)] rounded-lg p-3 mb-4">
                    <p className="text-[var(--pl-primary)] text-sm">
                      <strong>Note:</strong> All fields marked with a red asterisk (*) in the Edit Profile section are required to view and apply for jobs.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('editProfile');
                      navigate('/student?tab=editProfile', { replace: true });
                    }}
                    className="bg-[var(--pl-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--pl-link-hover)] transition-colors font-medium cursor-pointer"
                  >
                    Complete Profile Now
                  </button>
                </div>
              ) : loadingJobs ? (
                <div className="flex justify-center items-center py-12">
                  <Loader className="h-8 w-8 animate-spin text-[var(--pl-primary)]" />
                  <span className="ml-2 text-[var(--pl-text-secondary)]">Loading posted jobs...</span>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-[var(--pl-surface-strong)] border border-[var(--pl-border)] rounded-lg p-8">
                    <Briefcase className="h-12 w-12 text-[var(--pl-text-muted)] mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--pl-text)] mb-2">No Jobs Available</h3>
                    <p className="text-[var(--pl-text-secondary)] mb-4">
                      No jobs are currently posted for your profile ({school} | {center} | {batch}).
                    </p>
                    <div className="text-sm text-[var(--pl-text-muted)]">
                      <p>• Jobs may be targeted to specific schools, centers, or batches</p>
                      <p>• Check back later for new opportunities</p>
                      <p>• Contact admin if you believe this is an error</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Column Headers - Desktop Only */}
                  <div className="hidden md:grid grid-cols-12 gap-4 mb-2 py-4 px-6 bg-[var(--pl-surface-strong)] rounded-xl border border-[var(--pl-border)]">
                    <div className="col-span-3 text-[var(--pl-text)] font-bold text-sm uppercase tracking-wide flex items-center">
                      <Briefcase className="h-4 w-4 mr-2 text-[var(--pl-primary)]" />
                      Company & Role
                    </div>
                    <div className="col-span-2 text-[var(--pl-text)] font-bold text-sm uppercase tracking-wide flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-[var(--pl-primary)]" />
                      Drive Date
                    </div>
                    <div className="col-span-2 text-[var(--pl-text)] font-bold text-sm uppercase tracking-wide flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-[var(--pl-primary)]" />
                      Salary (CTC)
                    </div>
                    <div className="col-span-5 text-right text-[var(--pl-text)] font-bold text-sm uppercase tracking-wide">
                      Actions
                    </div>
                  </div>

                  {/* Job Listings */}
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    {jobs.map((job) => {
                      const companyName = job.company?.name || job.company || 'Company';
                      const isApplied = hasApplied(job.id);
                      const isApplying = applying[job.id];
                      const cgpaNotMet = !meetsCgpaRequirement(job);
                      
                      return (
                        <div
                          key={job.id}
                          className="group bg-[var(--pl-surface-strong)] rounded-xl border border-[var(--pl-border)] hover:border-[var(--pl-primary)] hover:shadow-md transition-all duration-300 overflow-hidden"
                        >
                          {/* Mobile Layout */}
                          <div className="md:hidden p-5 space-y-4">
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm ${getCompanyColor(companyName)}`}>
                                {getCompanyInitial(companyName)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-[var(--pl-text)] mb-1 truncate">{companyName}</h3>
                                <p className="text-base font-semibold text-[var(--pl-primary)] mb-2">{job.jobTitle}</p>
                                <div className="flex flex-wrap gap-3 text-sm text-[var(--pl-text-secondary)]">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4 text-[var(--pl-text-muted)]" />
                                    <span>{formatDate(job.driveDate || job.applicationDeadline)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-4 w-4 text-[var(--pl-success)]" />
                                    <span className="font-semibold text-[var(--pl-success)]">{formatSalary(job.salary || job.ctc)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-[var(--pl-border)]">
                              <button
                                onClick={() => handleKnowMore(job)}
                                className="flex-1 px-4 py-2.5 bg-[color-mix(in_oklab,var(--pl-primary)_8%,white)] text-[var(--pl-primary)] font-semibold rounded-lg hover:bg-[color-mix(in_oklab,var(--pl-primary)_12%,white)] transition-all duration-200 flex items-center justify-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Know More
                              </button>
                              <button
                                onClick={() => handleApplyToJob(job)}
                                disabled={isApplied || isApplying || cgpaNotMet}
                                title={cgpaNotMet ? (() => {
                                  const jobMinCgpa = job.minCgpa || job.cgpaRequirement;
                                  const studentCgpa = cgpa ? parseFloat(cgpa) : null;
                                  if (jobMinCgpa && studentCgpa !== null && !isNaN(studentCgpa)) {
                                    return `Your CGPA (${studentCgpa.toFixed(2)}) does not meet the minimum requirement of ${jobMinCgpa} for this job.`;
                                  }
                                  return "CGPA requirement not met. Please check the job requirements.";
                                })() : ''}
                                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                                  isApplied
                                    ? 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)] cursor-not-allowed border border-[color-mix(in_oklab,var(--pl-success)_35%,white)]'
                                    : isApplying
                                    ? 'bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] text-[var(--pl-primary)] cursor-not-allowed border border-[color-mix(in_oklab,var(--pl-primary)_35%,white)]'
                                    : cgpaNotMet
                                    ? 'bg-[color-mix(in_oklab,var(--pl-disabled)_20%,white)] text-[var(--pl-disabled)] cursor-not-allowed border border-[var(--pl-border)]'
                                    : 'bg-[var(--pl-success)] text-white hover:bg-[color-mix(in_oklab,var(--pl-success)_90%,black)] shadow-sm hover:shadow-md border border-transparent'
                                }`}
                              >
                                {isApplied ? (
                                  <>
                                    <CheckCircle className="h-5 w-5" />
                                    Applied!
                                  </>
                                ) : isApplying ? (
                                  <>
                                    <Loader className="h-5 w-5 animate-spin" />
                                    Applying...
                                  </>
                                ) : cgpaNotMet ? (
                                  <>
                                    <XCircle className="h-5 w-5" />
                                    CGPA Not Met
                                  </>
                                ) : (
                                  <>
                                    <Briefcase className="h-5 w-5" />
                                    Apply Now
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Desktop Layout */}
                          <div className="hidden md:grid md:grid-cols-12 gap-4 p-6 items-center">
                            <div className="col-span-3 flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-sm ${getCompanyColor(companyName)}`}>
                                {getCompanyInitial(companyName)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-base font-bold text-[var(--pl-text)] truncate mb-1">{companyName}</h3>
                                <p className="text-sm font-semibold text-[var(--pl-primary)] truncate">{job.jobTitle}</p>
                              </div>
                            </div>

                            <div className="col-span-2 flex items-center">
                              <div className="flex items-center gap-2 text-[var(--pl-text-secondary)]">
                                <Calendar className="h-4 w-4 text-[var(--pl-text-muted)]" />
                                <span className="text-sm font-medium">{formatDate(job.driveDate || job.applicationDeadline)}</span>
                              </div>
                            </div>

                            <div className="col-span-2 flex items-center">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-[var(--pl-success)]" />
                                <span className="text-sm font-bold text-[var(--pl-success)]">{formatSalary(job.salary || job.ctc)}</span>
                              </div>
                            </div>

                            <div className="col-span-5 flex items-center justify-end gap-3">
                              <button
                                onClick={() => handleKnowMore(job)}
                                className="px-4 py-2 bg-[color-mix(in_oklab,var(--pl-primary)_8%,white)] text-[var(--pl-primary)] font-semibold rounded-lg hover:bg-[color-mix(in_oklab,var(--pl-primary)_12%,white)] transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
                              >
                                <Eye className="h-4 w-4" />
                                Know More
                              </button>
                              <button
                                onClick={() => handleApplyToJob(job)}
                                disabled={isApplied || isApplying || cgpaNotMet}
                                title={cgpaNotMet ? (() => {
                                  const jobMinCgpa = job.minCgpa || job.cgpaRequirement;
                                  const studentCgpa = cgpa ? parseFloat(cgpa) : null;
                                  if (jobMinCgpa && studentCgpa !== null && !isNaN(studentCgpa)) {
                                    return `Your CGPA (${studentCgpa.toFixed(2)}) does not meet the minimum requirement of ${jobMinCgpa} for this job.`;
                                  }
                                  return "CGPA requirement not met. Please check the job requirements.";
                                })() : ''}
                                className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                                  isApplied
                                    ? 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)] cursor-not-allowed border border-[color-mix(in_oklab,var(--pl-success)_35%,white)]'
                                    : isApplying
                                    ? 'bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] text-[var(--pl-primary)] cursor-not-allowed border border-[color-mix(in_oklab,var(--pl-primary)_35%,white)]'
                                    : cgpaNotMet
                                    ? 'bg-[color-mix(in_oklab,var(--pl-disabled)_20%,white)] text-[var(--pl-disabled)] cursor-not-allowed border border-[var(--pl-border)]'
                                    : 'bg-[var(--pl-success)] text-white hover:bg-[color-mix(in_oklab,var(--pl-success)_90%,black)] shadow-sm hover:shadow-md border border-transparent'
                                }`}
                              >
                                {isApplied ? (
                                  <>
                                    <CheckCircle className="h-5 w-5" />
                                    Applied!
                                  </>
                                ) : isApplying ? (
                                  <>
                                    <Loader className="h-5 w-5 animate-spin" />
                                    Applying...
                                  </>
                                ) : cgpaNotMet ? (
                                  <>
                                    <XCircle className="h-5 w-5" />
                                    CGPA Not Met
                                  </>
                                ) : (
                                  <>
                                    <Briefcase className="h-5 w-5" />
                                    Apply Now
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
        console.log('📊 [applications tab] Current applications state:', {
          applicationsLength: applications.length,
          applications: applications,
          loadingApplications,
          interviewHistoryLength: interviewHistory.length,
          applicationsType: typeof applications,
          isArray: Array.isArray(applications),
          firstApp: applications[0] ? {
            id: applications[0].id,
            jobId: applications[0].jobId,
            jobTitle: applications[0].job?.jobTitle
          } : null
        });
        
        // Force reload if applications is empty but we expect data
        if (applications.length === 0 && !loadingApplications && user?.id) {
          console.warn('⚠️ [applications tab] Applications is empty, forcing reload...');
          setTimeout(() => {
            loadApplicationsData();
          }, 500);
        }
        
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
            <div className="relative overflow-hidden bg-[var(--pl-surface-strong)] rounded-xl shadow-sm border border-[var(--pl-border)] p-5">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--pl-text)] mb-1">Application Dashboard</h3>
                    <p className="text-sm text-[var(--pl-text-secondary)]">Track your job application journey</p>
                  </div>
                  <div className="hidden md:block">
                    <Briefcase className="w-10 h-10 text-[var(--pl-text-muted)]" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="group bg-[var(--pl-surface-strong)] rounded-lg p-4 border border-[var(--pl-border)] hover:border-[var(--pl-primary)] hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="p-1.5 bg-[var(--pl-primary)] rounded-lg">
                        <ClipboardList className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[var(--pl-primary)] mb-0.5">{totalApplied}</div>
                    <div className="text-xs text-[var(--pl-text-secondary)] font-medium">Total Applied</div>
                  </div>
                  
                  <div className="group bg-[var(--pl-surface-strong)] rounded-lg p-4 border border-[var(--pl-border)] hover:border-[var(--pl-warning)] hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="p-1.5 bg-[var(--pl-warning)] rounded-lg">
                        <AlertCircle className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[var(--pl-warning)] mb-0.5">{shortlisted}</div>
                    <div className="text-xs text-[var(--pl-text-secondary)] font-medium">Shortlisted</div>
                  </div>
                  
                  <div className="group bg-[var(--pl-surface-strong)] rounded-lg p-4 border border-[var(--pl-border)] hover:border-[var(--pl-primary)] hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="p-1.5 bg-[var(--pl-primary)] rounded-lg">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[var(--pl-primary)] mb-0.5">{interviewed}</div>
                    <div className="text-xs text-[var(--pl-text-secondary)] font-medium">Interviewed</div>
                  </div>
                  
                  <div className="group bg-[var(--pl-surface-strong)] rounded-lg p-4 border border-[var(--pl-border)] hover:border-[var(--pl-success)] hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="p-1.5 bg-[var(--pl-success)] rounded-lg">
                        <Award className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[var(--pl-success)] mb-0.5">{offers}</div>
                    <div className="text-xs text-[var(--pl-text-secondary)] font-medium">Offers</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced View Toggle */}
            <div className="flex justify-center">
              <div className="bg-[var(--pl-surface-strong)] rounded-2xl p-2 shadow-sm border border-[var(--pl-border)] inline-flex gap-2">
                <button
                  onClick={() => setApplicationsView('current')}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                    applicationsView === 'current' 
                      ? 'bg-[var(--pl-primary)] text-white shadow-md scale-105' 
                      : 'text-[var(--pl-text-secondary)] hover:text-[var(--pl-text)] hover:bg-[color-mix(in_oklab,var(--pl-text-muted)_5%,white)]'
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                  Current Applications
                </button>
                <button
                  onClick={() => setApplicationsView('past')}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                    applicationsView === 'past' 
                      ? 'bg-[var(--pl-primary)] text-white shadow-md scale-105' 
                      : 'text-[var(--pl-text-secondary)] hover:text-[var(--pl-text)] hover:bg-[color-mix(in_oklab,var(--pl-text-muted)_5%,white)]'
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
                <div className="bg-[var(--pl-surface-strong)] rounded-2xl shadow-sm border border-[var(--pl-border)] p-6">
                  <h2 className="text-3xl font-bold text-[var(--pl-text)] mb-2">Past Applications</h2>
                  <p className="text-[var(--pl-text-secondary)]">Your interview history and results</p>
                </div>
                
                {loadingInterviewHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-[var(--pl-surface-strong)] rounded-2xl shadow-sm border border-[var(--pl-border)]">
                    <Loader className="animate-spin h-12 w-12 text-[var(--pl-primary)] mb-4" />
                    <span className="text-[var(--pl-text-secondary)] text-lg font-medium">Loading interview history...</span>
                  </div>
                ) : pastRecords.length === 0 ? (
                  <div className="text-center py-20 bg-[var(--pl-surface-strong)] rounded-2xl shadow-sm border border-[var(--pl-border)]">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] rounded-full mb-6">
                      <ClipboardList className="w-12 h-12 text-[var(--pl-primary)]" />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--pl-text)] mb-2">No Past Records</h3>
                    <p className="text-[var(--pl-text-muted)] text-lg mb-1">Your completed interview records will appear here.</p>
                    <p className="text-[var(--pl-text-muted)] text-sm">Keep applying and attending interviews to build your history!</p>
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
                          className="group relative overflow-hidden bg-[var(--pl-surface-strong)] rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-[var(--pl-border)]"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          {/* Gradient accent bar */}
                          <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                            isCracked ? 'bg-[var(--pl-success)]' :
                            isRejected ? 'bg-[var(--pl-danger)]' :
                            'bg-[var(--pl-text-muted)]'
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
                                  <h3 className="text-2xl font-bold text-[var(--pl-text)] mb-1 group-hover:text-purple-600 transition-colors">
                                    {record.job?.jobTitle || 'Unknown Position'}
                                  </h3>
                                  <p className="text-lg font-semibold text-[var(--pl-text-secondary)] flex items-center gap-2">
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
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[color-mix(in_oklab,var(--pl-text-muted)_12%,white)] hover:bg-[color-mix(in_oklab,var(--pl-text-muted)_20%,white)] transition-colors duration-200"
                                >
                                  <span className="text-sm font-medium text-[var(--pl-text-secondary)]">View Details</span>
                                  {expandedApplications.has(record.id) ? (
                                    <IoIosArrowDropup className="w-5 h-5 text-[var(--pl-text-secondary)]" />
                                  ) : (
                                    <IoIosArrowDropdown className="w-5 h-5 text-[var(--pl-text-secondary)]" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Dropdown Content - Status and Round Details */}
                            {expandedApplications.has(record.id) && (
                              <div className="mb-6 space-y-6 border-t border-[var(--pl-border)] pt-6">
                                {/* Screening Status Badge (shown first, before interview status) */}
                                {record.screeningStatusText && (
                                  <div className={`p-4 border rounded-lg ${
                                    record.screeningStatus === 'RESUME_REJECTED' || record.screeningStatus === 'TEST_REJECTED'
                                      ? 'bg-red-50 border-[color-mix(in_oklab,var(--pl-danger)_35%,white)]'
                                      : record.screeningStatus === 'TEST_SELECTED'
                                      ? 'bg-[color-mix(in_oklab,var(--pl-success)_8%,white)] border-[color-mix(in_oklab,var(--pl-success)_35%,white)]'
                                      : 'bg-[color-mix(in_oklab,var(--pl-warning)_8%,white)] border-[color-mix(in_oklab,var(--pl-warning)_35%,white)]'
                                  }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Info className={`w-5 h-5 ${
                                        record.screeningStatus === 'RESUME_REJECTED' || record.screeningStatus === 'TEST_REJECTED'
                                          ? 'text-[var(--pl-danger)]'
                                          : record.screeningStatus === 'TEST_SELECTED'
                                          ? 'text-[var(--pl-success)]'
                                          : 'text-[var(--pl-warning)]'
                                      }`} />
                                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--pl-text-secondary)]">Screening Status</span>
                                    </div>
                                    <p className={`text-base font-bold ${
                                      record.screeningStatus === 'RESUME_REJECTED' || record.screeningStatus === 'TEST_REJECTED'
                                        ? 'text-[var(--pl-danger)]'
                                        : record.screeningStatus === 'TEST_SELECTED'
                                        ? 'text-[var(--pl-success)]'
                                        : 'text-[var(--pl-warning)]'
                                    }`}>
                                      {record.screeningStatusText}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Status Badges */}
                                <div className="flex items-center gap-3 justify-center md:justify-start">
                                  {isCracked && (
                                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)] border border-[color-mix(in_oklab,var(--pl-success)_35%,white)] shadow-sm">
                                      <CheckCircle className="w-5 h-5" />
                                      Cracked
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[color-mix(in_oklab,var(--pl-danger)_12%,white)] text-[var(--pl-danger)] border border-[color-mix(in_oklab,var(--pl-danger)_35%,white)] shadow-sm">
                                      <XCircle className="w-5 h-5" />
                                      Rejected
                                    </span>
                                  )}
                                  {!isCracked && !isRejected && (
                                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[color-mix(in_oklab,var(--pl-text-muted)_12%,white)] text-[var(--pl-text-secondary)] border border-[var(--pl-border)] shadow-sm">
                                      <Clock className="w-5 h-5" />
                                      Pending
                                    </span>
                                  )}
                                </div>

                                {/* Enhanced Interview Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-[var(--pl-surface-strong)] p-5 rounded-xl border border-[var(--pl-border)] hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Trophy className="w-5 h-5 text-[var(--pl-primary)]" />
                                      <p className="text-xs font-semibold text-[var(--pl-primary)] uppercase tracking-wide">Round Reached</p>
                                    </div>
                                    <p className="text-lg font-bold text-[var(--pl-text)]">
                                      {history.lastRoundReached || 'Not evaluated'}
                                    </p>
                                  </div>
                                  <div className="bg-[var(--pl-surface-strong)] p-5 rounded-xl border border-[var(--pl-border)] hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <ClipboardList className="w-5 h-5 text-[var(--pl-primary)]" />
                                      <p className="text-xs font-semibold text-[var(--pl-primary)] uppercase tracking-wide">Total Rounds</p>
                                    </div>
                                    <p className="text-lg font-bold text-[var(--pl-text)]">
                                      {history.rounds?.length || 0} rounds
                                    </p>
                                  </div>
                                </div>

                                {/* Enhanced Rounds Progress */}
                                {history.rounds && history.rounds.length > 0 && (
                                  <div className="bg-[var(--pl-surface-strong)] p-6 rounded-xl border border-[var(--pl-border)]">
                                    <div className="flex items-center gap-2 mb-4">
                                      <ClipboardList className="w-5 h-5 text-[var(--pl-primary)]" />
                                      <p className="text-sm font-semibold text-[var(--pl-primary)] uppercase tracking-wide">Interview Rounds</p>
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
                                                  ? 'bg-[color-mix(in_oklab,var(--pl-success)_8%,white)] border-[var(--pl-success)] shadow-sm'
                                                  : evaluation?.status === 'REJECTED'
                                                  ? 'bg-[color-mix(in_oklab,var(--pl-danger)_8%,white)] border-[var(--pl-danger)] shadow-sm'
                                                  : 'bg-[color-mix(in_oklab,var(--pl-primary)_8%,white)] border-[var(--pl-primary)] shadow-sm'
                                                : 'bg-[var(--pl-surface-strong)] border-[var(--pl-border)]'
                                            }`}
                                          >
                                            <div className="flex items-center gap-3 mb-3">
                                              {(() => {
                                                const roundNumber = index + 1;
                                                
                                                return (
                                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-sm transition-all duration-200 ${
                                                    wasReached ? 'bg-[var(--pl-primary)]' : 'bg-[color-mix(in_oklab,var(--pl-primary)_50%,white)] opacity-75'
                                                  }`}>
                                                    <span className="text-lg">{roundNumber}</span>
                                                  </div>
                                                );
                                              })()}
                                              <div>
                                                <span className="font-semibold text-base text-[var(--pl-text)] block">
                                                  {round.name || `Round ${index + 1}`}
                                                </span>
                                              </div>
                                            </div>
                                            
                                            {/* Round Details */}
                                            <div className="space-y-2 pl-16">
                                              {wasReached ? (
                                                <>
                                                  {evaluation?.marks !== null && (
                                                    <div className="flex items-center justify-between p-3 bg-[var(--pl-surface-strong)] rounded-lg border border-[var(--pl-border)]">
                                                      <span className="text-sm font-semibold text-[var(--pl-text-secondary)]">Score:</span>
                                                      <span className="text-base font-bold text-[var(--pl-primary)]">{evaluation.marks}/100</span>
                                                    </div>
                                                  )}
                                                  {evaluation?.status && (
                                                    <div className="flex items-center justify-between p-3 bg-[var(--pl-surface-strong)] rounded-lg border border-[var(--pl-border)]">
                                                      <span className="text-sm font-semibold text-[var(--pl-text-secondary)]">Status:</span>
                                                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                                                        evaluation.status === 'SELECTED'
                                                          ? 'bg-[color-mix(in_oklab,var(--pl-success)_20%,white)] text-[var(--pl-success)]'
                                                          : evaluation.status === 'REJECTED'
                                                          ? 'bg-[color-mix(in_oklab,var(--pl-danger)_20%,white)] text-[var(--pl-danger)]'
                                                          : 'bg-[color-mix(in_oklab,var(--pl-primary)_20%,white)] text-[var(--pl-primary)]'
                                                      }`}>
                                                        {evaluation.status}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {evaluation?.remarks && (
                                                    <div className="p-3 bg-[var(--pl-surface-strong)] rounded-lg border border-[var(--pl-border)]">
                                                      <span className="text-sm font-semibold text-[var(--pl-text-secondary)] block mb-1">Remarks:</span>
                                                      <p className="text-sm text-[var(--pl-text-secondary)]">{evaluation.remarks}</p>
                                                    </div>
                                                  )}
                                                </>
                                              ) : (
                                                <div className="p-3 bg-[var(--pl-surface-strong)] rounded-lg border border-[var(--pl-border)] text-center">
                                                  <span className="text-sm font-medium text-[var(--pl-text-muted)]">Not reached</span>
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
                            <div className="bg-[var(--pl-surface-strong)] p-4 rounded-xl border border-[var(--pl-border)] flex items-center gap-3">
                              <div className="p-2 bg-[color-mix(in_oklab,var(--pl-primary)_12%,white)] rounded-lg">
                                <Calendar className="w-5 h-5 text-[var(--pl-primary)]" />
                              </div>
                              <div>
                                <p className="text-xs text-[var(--pl-text-muted)] font-medium">Applied Date</p>
                                <p className="font-semibold text-[var(--pl-text)]">{formatDate(record.appliedDate)}</p>
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
                  <div className="flex flex-col items-center justify-center py-20 bg-[var(--pl-surface-strong)] rounded-2xl shadow-lg">
                    <Loader className="animate-spin h-12 w-12 text-indigo-600 mb-4" />
                    <span className="text-[var(--pl-text-secondary)] text-lg font-medium">Loading your applications...</span>
                  </div>
                ) : !applications || applications.length === 0 ? (
                  <div className="text-center py-20 bg-[var(--pl-surface-strong)] rounded-2xl shadow-sm border border-[var(--pl-border)]">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] rounded-full mb-6">
                      <ClipboardList className="w-12 h-12 text-[var(--pl-primary)]" />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--pl-text)] mb-2">No Applications Yet</h3>
                    <p className="text-[var(--pl-text-muted)] text-lg mb-1">Start your job search journey today!</p>
                    <p className="text-[var(--pl-text-muted)] text-sm">Browse available jobs and apply to track your progress here.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Enhanced Application Cards */}
                    {applications.map((application, index) => (
                      <div
                        key={application.id}
                        className="group relative overflow-hidden bg-[var(--pl-surface-strong)] rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-[var(--pl-border)]"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {/* Gradient accent bar */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                          application.status?.toLowerCase() === 'applied' ? 'bg-[var(--pl-primary)]' :
                          application.status?.toLowerCase() === 'shortlisted' ? 'bg-[var(--pl-warning)]' :
                          application.status?.toLowerCase() === 'interviewed' ? 'bg-[var(--pl-primary)]' :
                          application.status?.toLowerCase() === 'offered' || application.status?.toLowerCase() === 'selected' ? 'bg-[var(--pl-success)]' :
                          application.status?.toLowerCase() === 'rejected' ? 'bg-[var(--pl-danger)]' :
                          'bg-[var(--pl-text-muted)]'
                        }`}></div>
                        
                        <div className="p-8">
                          {/* Screening Status Badge (shown first, before interview status) */}
                          {application.screeningStatusText && (
                            <div className={`mb-4 p-3 border rounded-lg ${
                              application.screeningStatus === 'RESUME_REJECTED' || application.screeningStatus === 'TEST_REJECTED'
                                ? 'bg-red-50 border-[color-mix(in_oklab,var(--pl-danger)_35%,white)]'
                                : application.screeningStatus === 'TEST_SELECTED'
                                ? 'bg-green-50 border-[color-mix(in_oklab,var(--pl-success)_35%,white)]'
                                : 'bg-yellow-50 border-[color-mix(in_oklab,var(--pl-warning)_35%,white)]'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Info className={`w-4 h-4 ${
                                  application.screeningStatus === 'RESUME_REJECTED' || application.screeningStatus === 'TEST_REJECTED'
                                    ? 'text-[var(--pl-danger)]'
                                    : application.screeningStatus === 'TEST_SELECTED'
                                    ? 'text-[var(--pl-success)]'
                                    : 'text-[var(--pl-warning)]'
                                }`} />
                                <span className={`text-sm font-medium ${
                                  application.screeningStatus === 'RESUME_REJECTED' || application.screeningStatus === 'TEST_REJECTED'
                                    ? 'text-[var(--pl-danger)]'
                                    : application.screeningStatus === 'TEST_SELECTED'
                                    ? 'text-[var(--pl-success)]'
                                    : 'text-[var(--pl-warning)]'
                                }`}>
                                  {application.screeningStatusText}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Interview Status Badge (only if passed screening) */}
                          {application.interviewStatus?.hasSession && application.screeningStatus === 'TEST_SELECTED' && (
                            <div className="mb-4 p-3 bg-[color-mix(in_oklab,var(--pl-primary)_8%,white)] border border-[color-mix(in_oklab,var(--pl-primary)_35%,white)] rounded-lg">
                              <div className="flex items-center gap-2">
                                <Info className="w-4 h-4 text-[var(--pl-primary)]" />
                                <span className="text-sm font-medium text-[var(--pl-primary)]">
                                  {application.interviewStatus.statusText || 'Interview Status'}
                                </span>
                              </div>
                              {application.interviewStatus.lastRoundReached > 0 && (
                                <p className="text-xs text-[var(--pl-primary)] mt-1 ml-6">
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
                                <h3 className="text-2xl font-bold text-[var(--pl-text)] mb-1 group-hover:text-[var(--pl-primary)] transition-colors">
                                  {application.job?.jobTitle || 'Unknown Position'}
                                </h3>
                                <p className="text-lg font-semibold text-[var(--pl-text-secondary)] flex items-center gap-2">
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
                            <div className="group/item bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-[color-mix(in_oklab,var(--pl-primary)_35%,white)] hover:shadow-md transition-all duration-200">
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-[var(--pl-primary)]" />
                                <p className="text-xs font-semibold text-[var(--pl-primary)] uppercase tracking-wide">Location</p>
                              </div>
                              <p className="text-base font-bold text-[var(--pl-text)]">
                                {application.job?.location || 'Not specified'}
                              </p>
                            </div>
                            <div className="group/item bg-[var(--pl-surface-strong)] p-4 rounded-xl border border-[var(--pl-border)] hover:shadow-md transition-all duration-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Briefcase className="w-4 h-4 text-purple-600" />
                                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Experience</p>
                              </div>
                              <p className="text-base font-bold text-[var(--pl-text)]">
                                {application.job?.experienceLevel || 'Not specified'}
                              </p>
                            </div>
                            <div className="group/item bg-[var(--pl-surface-strong)] p-4 rounded-xl border border-[var(--pl-border)] hover:shadow-md transition-all duration-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-[var(--pl-primary)]" />
                                <p className="text-xs font-semibold text-[var(--pl-primary)] uppercase tracking-wide">Job Type</p>
                              </div>
                              <p className="text-base font-bold text-[var(--pl-text)]">
                                {application.job?.jobType || 'Not specified'}
                              </p>
                            </div>
                            <div className="group/item bg-[var(--pl-surface-strong)] p-4 rounded-xl border border-[var(--pl-border)] hover:shadow-md transition-all duration-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Award className="w-4 h-4 text-[var(--pl-primary)]" />
                                <p className="text-xs font-semibold text-[var(--pl-primary)] uppercase tracking-wide">Salary</p>
                              </div>
                              <p className="text-base font-bold text-[var(--pl-text)]">
                                {application.job?.salaryRange || 'Not disclosed'}
                              </p>
                            </div>
                          </div>

                          {/* Enhanced Application Timeline */}
                          <div className="bg-[var(--pl-surface-strong)] p-5 rounded-xl border border-[var(--pl-border)] mb-6">
                            <div className="flex flex-wrap items-center gap-6 text-sm">
                              <div className="flex items-center gap-2 text-[var(--pl-text-secondary)]">
                                <div className="p-2 bg-[color-mix(in_oklab,var(--pl-primary)_12%,white)] rounded-lg">
                                  <Calendar className="w-4 h-4 text-[var(--pl-primary)]" />
                                </div>
                                <div>
                                  <p className="text-xs text-[var(--pl-text-muted)] font-medium">Applied</p>
                                  <p className="font-semibold text-[var(--pl-text)]">{formatDate(application.appliedDate)}</p>
                                </div>
                              </div>
                              {application.interviewDate && (
                                <div className="flex items-center gap-2 text-[var(--pl-text-secondary)]">
                                  <div className="p-2 bg-[color-mix(in_oklab,var(--pl-primary)_12%,white)] rounded-lg">
                                    <Clock className="w-4 h-4 text-[var(--pl-primary)]" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-[var(--pl-text-muted)] font-medium">Interview</p>
                                    <p className="font-semibold text-[var(--pl-text)]">{formatDate(application.interviewDate)}</p>
                                  </div>
                                </div>
                              )}
                              {application.job?.deadline && (
                                <div className="flex items-center gap-2 text-[var(--pl-text-secondary)]">
                                  <div className="p-2 bg-[color-mix(in_oklab,var(--pl-danger)_12%,white)] rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-[var(--pl-danger)]" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-[var(--pl-text-muted)] font-medium">Deadline</p>
                                    <p className="font-semibold text-[var(--pl-text)]">{formatDate(application.job.deadline)}</p>
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
                              <p className="text-sm text-[var(--pl-text-secondary)] line-clamp-3 leading-relaxed">
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
                                      className="px-4 py-2 bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] text-[var(--pl-primary)] text-sm font-semibold rounded-full border border-[color-mix(in_oklab,var(--pl-primary)_35%,white)] hover:bg-[color-mix(in_oklab,var(--pl-primary)_15%,white)] transition-all duration-200 shadow-sm"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                  {skills.length > 8 && (
                                    <span className="px-4 py-2 bg-[color-mix(in_oklab,var(--pl-text-muted)_12%,white)] text-[var(--pl-text-secondary)] text-sm font-semibold rounded-full border border-[var(--pl-border)]">
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
            <div className="bg-[var(--pl-surface-strong)] rounded-lg shadow-sm border border-[var(--pl-border)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[var(--pl-text)]">Edit Profile</h2>
                <div className="text-sm text-[var(--pl-text-muted)]">
                  Fields marked with <span className="text-red-500">*</span> are required
                </div>
              </div>
              
              <form className="space-y-8" onSubmit={handleSaveProfile}>
                {/* Profile Photo Section */}
                <div className="bg-[color-mix(in_oklab,var(--pl-primary)_8%,white)] rounded-lg p-6 border border-[color-mix(in_oklab,var(--pl-primary)_35%,white)]">
                  <div className="flex items-start gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                        <ImageIcon size={16} className="text-[var(--pl-primary)]" />
                        Profile Photo
                      </label>
                    </div>
                    <div className="relative group flex-shrink-0">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[color-mix(in_oklab,var(--pl-primary)_35%,white)] shadow-lg bg-[color-mix(in_oklab,var(--pl-text-muted)_12%,white)] flex items-center justify-center">
                        {profilePhoto ? (
                          <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User size={48} className="text-[var(--pl-text-muted)]" />
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
                              showError('Only JPG, PNG, and WebP images are allowed');
                              return;
                            }

                            if (file.size > maxSize) {
                              showError('File size must be less than 2MB');
                              return;
                            }

                            try {
                              // Upload to Cloudinary
                              const response = await api.uploadProfileImage(file);
                              
                              // Update profile photo state with Cloudinary URL
                              setProfilePhoto(response.profileImage.url);
                              
                              showSuccess('Profile image uploaded successfully!');
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
                              showError(errorMessage);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Personal Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--pl-border)]">
                    <User size={20} className="text-[var(--pl-primary)]" />
                    <h3 className="text-lg font-semibold text-[var(--pl-text)]">Personal Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                        <User size={16} className="text-[var(--pl-text-muted)]" />
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
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
                      <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                        <Mail size={16} className="text-[var(--pl-text-muted)]" />
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
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
                      <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                        <Phone size={16} className="text-[var(--pl-text-muted)]" />
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                          validationErrors.phone ? 'border-red-500' : 'border-[var(--pl-border)]'
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
                      <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                        <Hash size={16} className="text-[var(--pl-text-muted)]" />
                        Enrollment ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="enrollmentId"
                        type="text"
                        className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
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
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--pl-border)]">
                    <FaGraduationCap size={20} className="text-purple-600" />
                    <h3 className="text-lg font-semibold text-[var(--pl-text)]">Academic Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                        <Trophy size={16} className="text-yellow-500" />
                        CGPA
                      </label>
                      <input
                        type="text"
                        className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
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
                      <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                        <Trophy size={16} className="text-orange-500" />
                        Active Backlogs
                      </label>
                      <input
                        type="text"
                        className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                        placeholder="Enter backlogs (e.g., 0, 1, 2, 3+)"
                        value={backlogs}
                        onChange={(e) => {
                          let value = e.target.value;
                          // Allow numbers and + sign (for "3+" format)
                          value = value.replace(/[^0-9+]/g, '');
                          // Limit length
                          if (value.length > 5) {
                            value = value.substring(0, 5);
                          }
                          setBacklogs(value);
                        }}
                      />
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
                        iconColor="text-[var(--pl-primary)]"
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
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--pl-border)]">
                    <MapPin size={20} className="text-[var(--pl-success)]" />
                    <h3 className="text-lg font-semibold text-[var(--pl-text)]">Location</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                        <MapPin size={16} className="text-[var(--pl-text-muted)]" />
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                          validationErrors.city ? 'border-red-500' : 'border-[var(--pl-border)]'
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
                      <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                        <Building2 size={16} className="text-[var(--pl-text-muted)]" />
                        State/Region <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                          validationErrors.stateRegion ? 'border-red-500' : 'border-[var(--pl-border)]'
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
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--pl-border)]">
                    <Briefcase size={20} className="text-indigo-600" />
                    <h3 className="text-lg font-semibold text-[var(--pl-text)]">Professional Profile</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                        <Type size={16} className="text-[var(--pl-text-muted)]" />
                        Headline <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                        placeholder="Your professional headline"
                        value={Headline}
                        onChange={(e) => setHeadline(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                        <Linkedin size={16} className="text-[var(--pl-primary)]" />
                        LinkedIn <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${
                          validationErrors.linkedin ? 'border-red-500' : 'border-[var(--pl-border)]'
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
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--pl-border)]">
                      <Globe size={20} className="text-[var(--pl-primary)]" />
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Social Media & Coding Profiles</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                          <Youtube size={16} className="text-[var(--pl-danger)]" />
                          YouTube
                        </label>
                        <input
                          type="url"
                          className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                          placeholder="https://youtube.com/@channel"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                        />
                      </div>
                      {school === 'SOT' && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                            <Github size={16} className="text-[var(--pl-text-secondary)]" />
                            GitHub
                          </label>
                          <input
                            type="url"
                            className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                            placeholder="https://github.com/username"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                          />
                        </div>
                      )}
                      {(school === 'SOM' || school === 'SOH') && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                            <FaInstagram size={16} className="text-pink-500" />
                            Instagram
                          </label>
                          <input
                            type="url"
                            className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
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
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--pl-border)]">
                      <Code2 size={20} className="text-orange-600" />
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Coding Platforms</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                          <LeetCodeIcon className="h-4 w-4 text-orange-600" size={16} />
                          LeetCode
                        </label>
                        <input
                          type="url"
                          className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                          placeholder="https://leetcode.com/u/username"
                          value={leetcode}
                          onChange={(e) => setLeetcode(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                          <SiCodeforces size={16} className="text-[var(--pl-primary)]" />
                          Codeforces
                        </label>
                        <input
                          type="url"
                          className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                          placeholder="https://codeforces.com/profile/username"
                          value={codeforces}
                          onChange={(e) => setCodeforces(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                          <SiGeeksforgeeks size={16} className="text-[var(--pl-success)]" />
                          GeeksforGeeks
                        </label>
                        <input
                          type="url"
                          className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
                          placeholder="https://auth.geeksforgeeks.org/user/username"
                          value={gfg}
                          onChange={(e) => setGfg(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                          <FaHackerrank size={16} className="text-emerald-600" />
                          HackerRank
                        </label>
                        <input
                          type="url"
                          className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text"
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
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--pl-border)]">
                      <LinkIcon size={20} className="text-purple-600" />
                      <h3 className="text-lg font-semibold text-[var(--pl-text)]">Other Profiles</h3>
                    </div>
                    <p className="text-sm text-[var(--pl-text-secondary)]">
                      Add additional profiles (e.g., Kaggle, CodeChef, or any other platform)
                    </p>
                    
                    {/* List of existing profiles */}
                    {otherProfiles.length > 0 && (
                      <div className="space-y-3">
                        {otherProfiles.map((profile, index) => (
                          <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-[var(--pl-border)]">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-[var(--pl-text-secondary)] mb-1">Platform Name</label>
                                <input
                                  type="text"
                                  value={profile.platformName || ''}
                                  onChange={(e) => {
                                    const updated = [...otherProfiles];
                                    updated[index] = { ...updated[index], platformName: e.target.value };
                                    setOtherProfiles(updated);
                                  }}
                                  className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="e.g., Kaggle"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-[var(--pl-text-secondary)] mb-1">Profile ID/URL</label>
                                <input
                                  type="text"
                                  value={profile.profileId || ''}
                                  onChange={(e) => {
                                    const updated = [...otherProfiles];
                                    updated[index] = { ...updated[index], profileId: e.target.value };
                                    setOtherProfiles(updated);
                                  }}
                                  className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              className="mt-6 p-2 text-[var(--pl-danger)] hover:bg-red-50 rounded-lg transition-colors"
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
                        className="mb-4 p-4 border border-[var(--pl-border)] rounded bg-gray-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2">
                              Platform Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newProfile.platformName}
                              onChange={(e) => setNewProfile({ ...newProfile, platformName: e.target.value })}
                              className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Kaggle, CodeChef"
                              autoFocus
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2">
                              Profile ID/URL <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newProfile.profileId}
                              onChange={(e) => setNewProfile({ ...newProfile, profileId: e.target.value })}
                              className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="username or full URL"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--pl-border)]">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddProfileForm(false);
                              setNewProfile({ platformName: '', profileId: '' });
                            }}
                            className="px-4 py-2 text-sm font-medium text-[var(--pl-text-secondary)] bg-[color-mix(in_oklab,var(--pl-text-muted)_12%,white)] rounded-lg hover:bg-[color-mix(in_oklab,var(--pl-text-muted)_20%,white)] transition-colors"
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
                            className="px-4 py-2 text-sm font-medium text-white bg-[var(--pl-primary)] rounded-lg hover:bg-[var(--pl-link-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          ? 'text-white bg-[var(--pl-primary)] hover:bg-[var(--pl-link-hover)]' 
                          : 'text-[var(--pl-primary)] bg-[color-mix(in_oklab,var(--pl-primary)_8%,white)] hover:bg-[color-mix(in_oklab,var(--pl-primary)_12%,white)]'
                      }`}
                    >
                      <Plus size={16} />
                      Add Profile
                    </button>
                  </div>
                )}

                {/* Bio Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--pl-border)]">
                    <FileText size={20} className="text-[var(--pl-text-secondary)]" />
                    <h3 className="text-lg font-semibold text-[var(--pl-text)]">About Me</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--pl-text-secondary)] mb-2 flex items-center gap-2">
                      <FileText size={16} className="text-[var(--pl-text-muted)]" />
                      Bio <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="w-full border border-[var(--pl-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none cursor-text"
                      rows="4"
                      placeholder="Write a brief bio about yourself"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                {/* Terms & Actions Section */}
                <div className="bg-gray-50 rounded-lg p-6 border border-[var(--pl-border)]">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="editCheckbox"
                        checked={isChecked}
                        onChange={() => setIsChecked(!isChecked)}
                        className="mt-1 w-4 h-4 text-[var(--pl-primary)] border-[var(--pl-border)] rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="editCheckbox" className="text-sm text-[var(--pl-text-secondary)] cursor-pointer">
                        I acknowledge that the information provided on this dashboard is accurate to the best of the institution's knowledge. I understand that the institution shall not be held liable for any errors, omissions, or discrepancies.
                      </label>
                    </div>
                    <div className="flex space-x-4 justify-end pt-4 border-t border-[var(--pl-border)]">
                      <button
                        type="button"
                        onClick={() => {
                          resetProfileForm();
                          setIsChecked(false);
                          setValidationErrors({});
                        }}
                        className="px-6 py-2 rounded-md bg-[color-mix(in_oklab,var(--pl-text-muted)_20%,white)] text-[var(--pl-text-secondary)] hover:bg-gray-300 transition-colors font-medium cursor-pointer"
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
                            : 'bg-[var(--pl-primary)] hover:bg-[var(--pl-link-hover)] shadow-lg hover:shadow-xl cursor-pointer'
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

                {/* Public Profile Sharing Section */}
                <div className="bg-[var(--pl-surface-strong)] rounded-lg p-6 border border-[var(--pl-border)]">
                  <div className="flex items-center gap-2 pb-3 border-b border-indigo-200 mb-4">
                    <LinkIcon size={20} className="text-indigo-600" />
                    <h3 className="text-lg font-semibold text-[var(--pl-text)]">Public Profile Sharing</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Share Button */}
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setLoadingPublicProfile(true);
                            let profileId = publicProfileId;
                            
                            // Generate if doesn't exist
                            if (!profileId) {
                              console.log('📝 [Share Profile] Generating public profile ID...');
                              try {
                                const response = await api.generatePublicProfileId();
                                console.log('✅ [Share Profile] Response received:', response);
                                  
                                // Handle both direct response and wrapped response
                                profileId = response?.publicProfileId || response?.data?.publicProfileId;
                                  
                                if (!profileId || typeof profileId !== 'string') {
                                  console.error('❌ [Share Profile] Invalid response format:', {
                                    response,
                                    type: typeof response,
                                    keys: response ? Object.keys(response) : null
                                  });
                                  throw new Error('Invalid response: publicProfileId not found or invalid');
                                }
                                  
                                console.log('✅ [Share Profile] Profile ID extracted:', profileId);
                                setPublicProfileId(profileId);
                              } catch (generateError) {
                                console.error('❌ [Share Profile] Error generating profile ID:', generateError);
                                throw generateError; // Re-throw to be caught by outer catch
                              }
                            }
                            
                            // Build public profile URL
                            const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
                            const publicUrl = `${frontendUrl}/profile/${profileId}`;
                            
                            console.log('Public profile URL:', publicUrl);
                            
                            // Copy to clipboard
                            await navigator.clipboard.writeText(publicUrl);
                            showSuccess('Profile link copied. Anyone with this link can view your profile.');
                          } catch (err) {
                            console.error('❌ [Share Profile] Failed to generate/copy profile link:', err);
                            console.error('❌ [Share Profile] Error details:', {
                              message: err.message,
                              response: err.response,
                              status: err.status,
                              error: err.error,
                              stack: err.stack
                            });
                            
                            // Extract error message from various possible formats
                            let errorMessage = 'Failed to generate profile link. Please try again.';
                            if (err.response?.data) {
                              errorMessage = err.response.data.message || err.response.data.error || errorMessage;
                            } else if (err.message) {
                              errorMessage = err.message;
                            } else if (err.error) {
                              errorMessage = err.error;
                            }
                            
                            showError(errorMessage);
                          } finally {
                            setLoadingPublicProfile(false);
                          }
                        }}
                        disabled={loadingPublicProfile}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingPublicProfile ? (
                          <>
                            <Loader className="animate-spin" size={16} />
                            Generating...
                          </>
                        ) : (
                          <>
                            <LinkIcon size={16} />
                            Share Profile
                          </>
                        )}
                      </button>
                      
                      {publicProfileId && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setLoadingPublicProfile(true);
                              const response = await api.regeneratePublicProfileId();
                              setPublicProfileId(response.publicProfileId);
                              showSuccess('Profile link regenerated. Old link is no longer valid.');
                            } catch (err) {
                              console.error('Failed to regenerate profile link:', err);
                              showError('Failed to regenerate profile link. Please try again.');
                            } finally {
                              setLoadingPublicProfile(false);
                            }
                          }}
                          disabled={loadingPublicProfile}
                          className="flex items-center gap-2 px-4 py-3 bg-[color-mix(in_oklab,var(--pl-text-muted)_20%,white)] text-[var(--pl-text-secondary)] rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Reset Link
                        </button>
                      )}
                    </div>

                    {/* Visibility Toggles */}
                    <div className="space-y-3 pt-4 border-t border-indigo-200">
                      <p className="text-sm font-medium text-[var(--pl-text-secondary)] mb-3">Profile Visibility Settings</p>
                      
                      <label className="flex items-center justify-between p-3 bg-[var(--pl-surface-strong)] rounded-lg border border-[var(--pl-border)] hover:border-indigo-300 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Mail size={16} className="text-[var(--pl-text-muted)]" />
                          <div>
                            <span className="text-sm font-medium text-[var(--pl-text)]">Show Email</span>
                            <p className="text-xs text-[var(--pl-text-muted)]">Display your email on public profile</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={publicProfileShowEmail}
                          onChange={async (e) => {
                            const newValue = e.target.checked;
                            const oldValue = publicProfileShowEmail;
                            setPublicProfileShowEmail(newValue);
                            try {
                              console.log('📝 [Email Visibility] Updating to:', newValue);
                              const response = await api.updatePublicProfileSettings({ showEmail: newValue });
                              console.log('✅ [Email Visibility] Update successful:', response);
                              // Update state from response if provided
                              if (response?.showEmail !== undefined) {
                                setPublicProfileShowEmail(response.showEmail);
                              }
                            } catch (err) {
                              console.error('❌ [Email Visibility] Failed to update:', err);
                              console.error('❌ [Email Visibility] Error details:', {
                                message: err.message,
                                response: err.response,
                                status: err.status,
                                error: err.error,
                              });
                              setPublicProfileShowEmail(oldValue); // Revert on error
                              const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update email visibility. Please try again.';
                              showError(errorMessage);
                            }
                          }}
                          className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 bg-[var(--pl-surface-strong)] rounded-lg border border-[var(--pl-border)] hover:border-indigo-300 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Phone size={16} className="text-[var(--pl-text-muted)]" />
                          <div>
                            <span className="text-sm font-medium text-[var(--pl-text)]">Show Phone</span>
                            <p className="text-xs text-[var(--pl-text-muted)]">Display your phone number on public profile</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={publicProfileShowPhone}
                          onChange={async (e) => {
                            const newValue = e.target.checked;
                            const oldValue = publicProfileShowPhone;
                            setPublicProfileShowPhone(newValue);
                            try {
                              console.log('📝 [Phone Visibility] Updating to:', newValue);
                              const response = await api.updatePublicProfileSettings({ showPhone: newValue });
                              console.log('✅ [Phone Visibility] Update successful:', response);
                              // Update state from response if provided
                              if (response?.showPhone !== undefined) {
                                setPublicProfileShowPhone(response.showPhone);
                              }
                            } catch (err) {
                              console.error('❌ [Phone Visibility] Failed to update:', err);
                              console.error('❌ [Phone Visibility] Error details:', {
                                message: err.message,
                                response: err.response,
                                status: err.status,
                                error: err.error,
                              });
                              setPublicProfileShowPhone(oldValue); // Revert on error
                              const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update phone visibility. Please try again.';
                              showError(errorMessage);
                            }
                          }}
                          className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-[var(--pl-border)]">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => setIsChecked(e.target.checked)}
                        className="w-4 h-4 text-[var(--pl-primary)] rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-[var(--pl-text-secondary)]">
                        I confirm that all information provided is accurate
                      </span>
                    </label>
                    <button
                      type="submit"
                      id='editSaveBtn'
                      disabled={!isChecked || saving}
                      className={`px-8 py-2 rounded-md text-white transition-colors font-medium shadow-md ${
                        (!isChecked || saving) 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-[var(--pl-primary)] hover:bg-[var(--pl-link-hover)] shadow-lg hover:shadow-xl cursor-pointer'
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
            className="bg-[var(--pl-surface-strong)] border-r border-[var(--pl-border)] fixed top-[7rem] left-0 h-[calc(100vh-7rem)] flex flex-col transition-all duration-200 ease-in-out z-40"
            style={{ width: `${sidebarWidth}%` }}
          >
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 flex flex-col">
                <div className="mb-6">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <div key={tab.id} className="mb-1">
                        <button
                          onClick={() => handleTabClick(tab.id)}
                          className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${activeTab === tab.id
                            ? 'bg-[var(--pl-primary)] text-white'
                            : 'text-[var(--pl-text-secondary)] hover:text-[var(--pl-primary)] hover:bg-[color-mix(in_oklab,var(--pl-primary)_5%,white)]'
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
                    <h2 className="text-base font-bold text-[var(--pl-text)] mb-3">Skills & Credentials</h2>
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
                            className={`w-full flex items-center rounded-lg text-xs font-medium text-[var(--pl-text-secondary)] hover:bg-[color-mix(in_oklab,var(--pl-text-muted)_8%,white)] transition-all duration-200 group cursor-pointer ${sidebarWidth < 12 ? 'justify-center px-2 py-2' : 'px-3 py-2'
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
                            className={`w-full flex items-center rounded-lg text-xs font-medium text-[var(--pl-text-secondary)] hover:bg-[color-mix(in_oklab,var(--pl-text-muted)_8%,white)] transition-all duration-200 group cursor-pointer ${sidebarWidth < 12 ? 'justify-center px-2 py-2' : 'px-3 py-2'
                              }`}
                            title={sidebarWidth < 9 ? profile.platformName : ''}
                          >
                            <LinkIcon className={`h-4 w-4 ${sidebarWidth >= 9 ? 'mr-2' : ''} text-[var(--pl-primary)]`} />
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

                <div className="mt-auto pt-4 pb-[35%] border-t border-[var(--pl-border)]">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`w-full flex items-center rounded-lg text-xs font-medium text-[var(--pl-danger)] hover:bg-[color-mix(in_oklab,var(--pl-danger)_10%,white)] transition-all duration-200 cursor-pointer ${sidebarWidth < 9 ? 'justify-center px-2 py-2 mb-10' : 'px-2 py-3'
                      }`}
                    title={sidebarWidth < 9 ? 'Logout' : ''}
                  >
                    <LogOut className={`h-4 w-4 ${sidebarWidth >= 9 ? 'mr-2' : ''}`} />
                    {sidebarWidth >= 9 && 'Logout'}
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={dragRef}
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-[var(--pl-disabled)] hover:bg-[var(--pl-primary)] transition-colors duration-200"
              onMouseDown={handleMouseDown}
            />
          </aside>

          <main
            className="bg-[var(--pl-bg)] min-h-screen transition-all duration-200 ease-in-out"
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
      
      {/* Old floating alert removed - using toast notifications instead */}


      {/* Resume Selection Modal */}
      {isResumeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => {
          setIsResumeModalOpen(false);
          setPendingJob(null);
        }}>
          <div className="bg-[var(--pl-surface-strong)] rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--pl-border)]">
              <h2 className="text-xl font-semibold text-[var(--pl-text)]">Select Resume</h2>
              <button
                onClick={() => {
                  setIsResumeModalOpen(false);
                  setPendingJob(null);
                }}
                className="text-[var(--pl-text-muted)] hover:text-[var(--pl-text-secondary)] transition-colors rounded-full p-1 hover:bg-[color-mix(in_oklab,var(--pl-text-muted)_12%,white)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {pendingJob && (
              <div className="mb-4 p-3 bg-[color-mix(in_oklab,var(--pl-primary)_8%,white)] rounded-lg border border-[color-mix(in_oklab,var(--pl-primary)_35%,white)]">
                <p className="text-xs font-medium text-[var(--pl-primary)] mb-1">Applying to:</p>
                <p className="text-sm font-semibold text-[var(--pl-text)]">{pendingJob.jobTitle}</p>
                <p className="text-xs text-[var(--pl-text-secondary)]">{pendingJob.companyName || pendingJob.company?.name}</p>
              </div>
            )}
            
            <p className="text-sm text-[var(--pl-text-secondary)] mb-6">
              Choose how you want to submit your resume for this application.
            </p>

            {loadingResumes ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="animate-spin text-[var(--pl-primary)]" size={24} />
                <span className="ml-2 text-[var(--pl-text-secondary)]">Loading resumes...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Use Existing Resume Option */}
                {resumes.length > 0 && (
                  <div className="border border-[var(--pl-border)] rounded-lg p-4 bg-gray-50">
                    <h3 className="text-sm font-semibold text-[var(--pl-text-secondary)] mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[var(--pl-primary)]" />
                      Use Existing Resume
                    </h3>
                    <div className="space-y-2">
                      {resumes.map((resume) => (
                        <button
                          key={resume.id || resume.fileName}
                          onClick={() => handleResumeSelection(resume.id || resume.fileName)}
                          className="w-full text-left px-4 py-3 border border-[color-mix(in_oklab,var(--pl-primary)_35%,white)] rounded-md hover:bg-[color-mix(in_oklab,var(--pl-primary)_8%,white)] hover:border-[var(--pl-primary)] transition-all flex items-center justify-between bg-[var(--pl-surface-strong)] shadow-sm group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[color-mix(in_oklab,var(--pl-primary)_12%,white)] rounded-md">
                              <FileText className="h-4 w-4 text-[var(--pl-primary)]" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-[var(--pl-text-secondary)] block">
                                {resume.title || resume.fileName || resume.name || 'Resume'}
                              </span>
                              {resume.uploadedAt && (
                                <span className="text-xs text-[var(--pl-text-muted)]">
                                  Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                                </span>
                              )}
                              {resume.isDefault && (
                                <span className="text-xs text-[var(--pl-primary)] font-medium ml-2">(Default)</span>
                              )}
                            </div>
                          </div>
                          <CheckCircle className="h-5 w-5 text-[var(--pl-success)] opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create New Resume Option */}
                <button
                  onClick={handleCreateResume}
                  className="w-full px-4 py-4 border-2 border-dashed border-[var(--pl-primary)] rounded-lg hover:bg-[color-mix(in_oklab,var(--pl-primary)_8%,white)] hover:border-blue-400 transition-all flex items-center justify-center gap-3 text-[var(--pl-primary)] font-semibold bg-[var(--pl-surface-strong)] shadow-sm"
                >
                  <FilePlus className="h-5 w-5" />
                  <span>Create New Resume</span>
                </button>

                {/* If no resumes exist, show message */}
                {resumes.length === 0 && (
                  <p className="text-xs text-[var(--pl-text-muted)] text-center py-2 italic">
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