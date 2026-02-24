import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/dashboard/shared/DashboardLayout';
import DashboardHome from '../../components/dashboard/student/DashboardHome';

import { useAuth } from '../../hooks/useAuth';
import showLogoutConfirm from '../../utils/logoutConfirm';
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
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import ResumeBuilder from '../../components/resume/ResumeBuilder';
import Query from '../../components/dashboard/student/Query';
import Resources from '../../components/dashboard/student/Resources';
import ConnectGoogleCalendar from '../ConnectGoogleCalendar';
import EndorsementManagement from '../../components/dashboard/student/EndorsementManagement';
import { StudentMobileMenuContext } from '../../contexts/StudentMobileMenuContext';

/** Format CGPA for display (avoids floating-point e.g. 8.699999999999999 → "8.70") */
function formatCgpaForDisplay(val) {
  if (val === undefined || val === null || val === '') return '';
  const n = parseFloat(val);
  if (Number.isNaN(n)) return String(val).trim();
  const clamped = Math.max(0, Math.min(10, n));
  return clamped.toFixed(2);
}

const normalizeProfileSnapshot = (profile = {}) => ({
  fullName: profile.fullName || '',
  email: profile.email || '',
  phone: profile.phone || '',
  enrollmentId: profile.enrollmentId || '',
  cgpa: profile.cgpa !== undefined && profile.cgpa !== null ? formatCgpaForDisplay(profile.cgpa) : '',
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
  const { logout, user, profileCompleted } = useAuth();


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
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // PERSISTENT CACHE: Use localStorage to cache data across page navigation
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

  // Helper functions for caching (defined after user is available)
  const getCachedData = useCallback((key) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      if (now - timestamp > CACHE_DURATION) {
        localStorage.removeItem(key); // Expired cache
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }, []);

  const setCachedData = useCallback((key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Failed to cache data:', e);
    }
  }, []);

  const clearCache = useCallback(() => {
    if (!user?.id) return;
    const cacheKeys = [
      `student_profile_${user.id}`,
      `student_applications_${user.id}`,
      `student_jobs_${user.id}`,
      `student_interview_history_${user.id}`,
      `student_public_profile_${user.id}`,
    ];
    cacheKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  }, [user?.id]);

  // Get cache key for current user
  const getCacheKey = useCallback((type) => {
    if (!user?.id) return null;
    const keys = {
      profile: `student_profile_${user.id}`,
      applications: `student_applications_${user.id}`,
      jobs: `student_jobs_${user.id}`,
      interviewHistory: `student_interview_history_${user.id}`,
      publicProfile: `student_public_profile_${user.id}`,
    };
    return keys[type];
  }, [user?.id]);
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
  const [profileSectionsOpen, setProfileSectionsOpen] = useState({
    photo: true,
    personal: true,
    academic: false,
    location: false,
    professional: false,
    social: false,
    coding: false,
    otherProfiles: false,
    bio: false,
    terms: false,
    publicProfile: false,
  });
  const toggleProfileSection = (id) => {
    setProfileSectionsOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Show mandatory profile completion modal when needed
  useEffect(() => {
    if (user?.role === 'STUDENT' && profileCompleted === false) {
      navigate('/student/onboarding', { replace: true });
    }
  }, [user?.role, profileCompleted, navigate]);

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
    setCgpa(formatCgpaForDisplay(snapshot.cgpa));
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

  // Career stats from backend (Shortlisted, Interviewed, Offers - used in dashboard)
  const [studentStats, setStudentStats] = useState({ applied: 0, shortlisted: 0, interviewed: 0, offers: 0 });

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
  const [pendingApplicationJobId, setPendingApplicationJobId] = useState(null);
  const [currentApplicationsPage, setCurrentApplicationsPage] = useState(1);
  const [pastApplicationsPage, setPastApplicationsPage] = useState(1);
  const APPLICATIONS_LIST_PER_PAGE = 10;
  const [focusedJobId, setFocusedJobId] = useState(null); // when navigating from dashboard tracker
  // Shared button sizing for consistent appearance across statuses
  // Mobile: full width; Desktop: fixed min-width so all statuses align
  const BUTTON_SIZE = 'w-full sm:min-w-[12rem] min-h-[36px] sm:min-h-[40px] px-3 sm:px-4 py-2 sm:py-2.5';

  // Reset pagination to page 1 when switching between Current and Past applications
  useEffect(() => {
    setCurrentApplicationsPage(1);
    setPastApplicationsPage(1);
  }, [applicationsView]);

  useEffect(() => {
    if (!pendingApplicationJobId || !applications.length) return;
    const matchIndex = applications.findIndex((app) => {
      const jobId = app.jobId || app.job?.id;
      return String(jobId) === String(pendingApplicationJobId);
    });
    if (matchIndex === -1) return;
    const match = applications[matchIndex];
    setExpandedApplications((prev) => {
      const next = new Set(prev);
      next.add(match.id);
      return next;
    });
    const targetPage = Math.floor(matchIndex / APPLICATIONS_LIST_PER_PAGE) + 1;
    setCurrentApplicationsPage(targetPage);
    setApplicationsView('current');
    setPendingApplicationJobId(null);
  }, [pendingApplicationJobId, applications, APPLICATIONS_LIST_PER_PAGE]);

  // Collapse all cards when leaving Track Applications tab
  useEffect(() => {
    if (activeTab !== 'applications') {
      setExpandedApplications(new Set());
    }
  }, [activeTab]);

  // Jobs state
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [applying, setApplying] = useState({});
  const [jobsPage, setJobsPage] = useState(1);
  const JOBS_PER_PAGE = 10;


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

  // Career Insights: real counts from pipeline (screening → shortlisted, test → interviewed, offer).
  // No artificial funnel normalization — we show what the backend actually tracked.
  const displayStats = useMemo(() => {
    if (!applications || applications.length === 0) {
      return {
        applied: studentStats.applied ?? 0,
        shortlisted: studentStats.shortlisted ?? 0,
        interviewed: studentStats.interviewed ?? 0,
        offers: studentStats.offers ?? 0,
      };
    }
    const applied = applications.length;
    const asUpper = (x) => (typeof x === 'string' ? x : '').toUpperCase();
    const asLower = (x) => (typeof x === 'string' ? x : '').toLowerCase();

    // Shortlisted = passed resume screening (or went further: qualified for interview = passed screening + test)
    const hasShortlisted = (app) => {
      const screening = asUpper(app.screeningStatus);
      const status = asLower(app.currentStage || app.status);
      return (
        screening === 'RESUME_SELECTED' ||
        screening === 'SCREENING_SELECTED' ||
        screening === 'TEST_SELECTED' ||
        screening === 'INTERVIEW_ELIGIBLE' ||
        status === 'shortlisted' ||
        status === 'screening qualified' ||
        status === 'qualified for interview'
      );
    };

    // Interviewed = qualified for interview (TEST_SELECTED / INTERVIEW_ELIGIBLE) or had interview rounds or got offer
    const hasInterviewed = (app) => {
      const screening = asUpper(app.screeningStatus);
      const status = asLower(app.currentStage || app.status);
      const interviewStatus = asUpper(
        typeof app.interviewStatus === 'string'
          ? app.interviewStatus
          : (app.interviewStatus?.statusText ?? app.interviewStatus?.status ?? '')
      );
      return (
        screening === 'TEST_SELECTED' ||
        screening === 'INTERVIEW_ELIGIBLE' ||
        status.includes('interview round') ||
        status === 'qualified for interview' ||
        status === 'interview completed' ||
        status === 'interviewed' ||
        interviewStatus === 'SELECTED'
      );
    };

    // Offers = got offer (status OFFERED/SELECTED or interviewStatus SELECTED)
    const hasOffer = (app) => {
      const status = asLower(app.currentStage || app.status);
      const interviewStatus = asUpper(
        typeof app.interviewStatus === 'string'
          ? app.interviewStatus
          : (app.interviewStatus?.statusText ?? app.interviewStatus?.status ?? '')
      );
      return (
        status === 'offered' ||
        status === 'selected' ||
        status === 'selected (final)' ||
        interviewStatus === 'SELECTED'
      );
    };

    const shortlisted = applications.filter(hasShortlisted).length;
    const interviewed = applications.filter(hasInterviewed).length;
    const offers = applications.filter(hasOffer).length;
    return { applied, shortlisted, interviewed, offers };
  }, [applications, studentStats]);

  // Job loading with proper targeting logic
  const loadJobsData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;

    // OPTIMIZED: Check cache first
    if (!forceRefresh) {
      const cacheKey = getCacheKey('jobs');
      if (cacheKey) {
        const cachedJobs = getCachedData(cacheKey);
        if (cachedJobs) {
          console.log('✅ Using cached jobs data');
          setJobs(cachedJobs);
          setJobsPage(1);
          setLoadingJobs(false);
          return; // Use cached data, skip API call
        }
      }
    }

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
        setJobsPage(1);
        // CACHE: Store filtered jobs in localStorage
        const jobsCacheKey = getCacheKey('jobs');
        if (jobsCacheKey) {
          setCachedData(jobsCacheKey, targetedJobs);
        }
      } else {
        setJobs(jobs);
        setJobsPage(1);
        // CACHE: Store all jobs in localStorage
        const jobsCacheKey = getCacheKey('jobs');
        if (jobsCacheKey) {
          setCachedData(jobsCacheKey, jobs);
        }
      }

    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]);
      setJobsPage(1);
    } finally {
      setLoadingJobs(false);
    }
  }, [school, center, batch, profileComplete, user?.id]); // Cache functions are stable, no need in deps

  // UPDATED: Load profile data function without defaults
  // Use ref to track loading state to prevent infinite loops
  const loadingProfileRef = useRef(false);

  const loadProfile = useCallback(async (forceRefresh = false) => {
    if (!user?.id || loadingProfileRef.current) return;

    // OPTIMIZED: Check persistent cache first
    if (!forceRefresh) {
      const cacheKey = getCacheKey('profile');
      if (cacheKey) {
        const cachedProfile = getCachedData(cacheKey);
        if (cachedProfile) {
          console.log('✅ Using cached profile data');
          // Use cached data to populate state
          setFullName(cachedProfile.fullName || '');
          setEmail(cachedProfile.email || '');
          setPhone(cachedProfile.phone || '');
          setEnrollmentId(cachedProfile.enrollmentId || '');
          setCgpa(formatCgpaForDisplay(cachedProfile.cgpa));
          setBacklogs(cachedProfile.backlogs || '');
          setBatch(cachedProfile.batch || '');
          setCenter(cachedProfile.center || '');
          setSchool(cachedProfile.school || '');
          setBio(cachedProfile.bio || '');
          setHeadline(cachedProfile.headline || cachedProfile.Headline || '');
          setCity(cachedProfile.city || '');
          setStateRegion(cachedProfile.stateRegion || cachedProfile.state || '');
          setLinkedin(cachedProfile.linkedin || '');
          setLeetcode(cachedProfile.leetcode || '');
          setCodeforces(cachedProfile.codeforces || '');
          setGfg(cachedProfile.gfg || '');
          setHackerrank(cachedProfile.hackerrank || '');
          setGithubUrl(cachedProfile.githubUrl || cachedProfile.github || '');
          setYoutubeUrl(cachedProfile.youtubeUrl || cachedProfile.youtube || '');
          setInstagramUrl(cachedProfile.instagramUrl || cachedProfile.instagram || '');
          setProfilePhoto(cachedProfile.profileImageUrl || cachedProfile.profilePhoto || '');
          setJobFlexibility(cachedProfile.jobFlexibility || '');
          if (cachedProfile.otherProfiles) {
            try {
              const parsed = typeof cachedProfile.otherProfiles === 'string'
                ? JSON.parse(cachedProfile.otherProfiles)
                : cachedProfile.otherProfiles;
              setOtherProfiles(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
              setOtherProfiles([]);
            }
          } else {
            setOtherProfiles([]);
          }
          setSkillsEntries(Array.isArray(cachedProfile.skills) ? cachedProfile.skills : []);

          // Set initial snapshot
          initialProfileRef.current = normalizeProfileSnapshot(cachedProfile);
          setIsFormDirty(false);
          setDataLoaded(true);
          setLastLoadTime(Date.now());
          return; // Use cached data, skip API call
        }
      }
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
        setCgpa(formatCgpaForDisplay(profileData.cgpa));
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
        const profileImg = profileData.profileImageUrl || profileData.profilePhoto || '';
        setProfilePhoto(profileImg);
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

        // Set skills from profile data (already loaded, no need for separate API call)
        setSkillsEntries(Array.isArray(profileData.skills) ? profileData.skills : []);

        // Set career stats from backend (Shortlisted, Interviewed, Offers)
        setStudentStats({
          applied: profileData.statsApplied ?? 0,
          shortlisted: profileData.statsShortlisted ?? 0,
          interviewed: profileData.statsInterviewed ?? 0,
          offers: profileData.statsOffers ?? 0,
        });

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

        // CACHE: Store profile data in localStorage
        const profileCacheKey = getCacheKey('profile');
        if (profileCacheKey) {
          setCachedData(profileCacheKey, profileData);
        }

      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ No profile data found - new user?');
        }
        // Keep empty states for new users
        initialProfileRef.current = normalizeProfileSnapshot({});
        setIsFormDirty(false);
      }

      const now = Date.now();
      setDataLoaded(true);
      setLastLoadTime(now);

    } catch (err) {
      console.error('❌ Failed to load profile data:', err);
      setDataLoaded(true); // Still mark as loaded to prevent infinite retries
    } finally {
      loadingProfileRef.current = false;
    }
  }, [user?.id]); // Cache functions are stable useCallback hooks, no need in deps

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

  const loadApplicationsData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      console.warn('⚠️ [loadApplicationsData] No user ID, skipping');
      return;
    }

    // OPTIMIZED: Check cache first (but verify it's not empty)
    if (!forceRefresh) {
      const cacheKey = getCacheKey('applications');
      if (cacheKey) {
        const cachedApplications = getCachedData(cacheKey);
        // Only use cache if it has data (not empty array)
        if (cachedApplications && Array.isArray(cachedApplications) && cachedApplications.length > 0) {
          console.log('✅ Using cached applications data:', cachedApplications.length, 'applications');
          setApplications(cachedApplications);
          setLoadingApplications(false);
          return; // Use cached data, skip API call
        } else if (cachedApplications && Array.isArray(cachedApplications) && cachedApplications.length === 0) {
          // Cache exists but is empty array - clear it and fetch fresh data
          console.log('⚠️ Cached data is empty array, clearing cache and fetching fresh data');
          localStorage.removeItem(cacheKey);
        }
      }
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

      // CACHE: Store applications data in localStorage
      const appsCacheKey = getCacheKey('applications');
      if (appsCacheKey) {
        setCachedData(appsCacheKey, applicationsData || []);
      }
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
  }, [user?.id, getCacheKey, getCachedData, setCachedData]);

  // Load interview history
  const loadInterviewHistory = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;

    // OPTIMIZED: Check cache first
    if (!forceRefresh) {
      const cacheKey = getCacheKey('interviewHistory');
      if (cacheKey) {
        const cachedHistory = getCachedData(cacheKey);
        if (cachedHistory) {
          console.log('✅ Using cached interview history data');
          setInterviewHistory(cachedHistory);
          setLoadingInterviewHistory(false);
          return; // Use cached data, skip API call
        }
      }
    }

    setLoadingInterviewHistory(true);
    try {
      const historyData = await getStudentInterviewHistory(user.id);
      setInterviewHistory(historyData || []);

      // CACHE: Store interview history in localStorage
      const historyCacheKey = getCacheKey('interviewHistory');
      if (historyCacheKey) {
        setCachedData(historyCacheKey, historyData || []);
      }

      // CACHE: Store interview history in localStorage
      setCachedData(CACHE_KEYS.interviewHistory, historyData || []);
    } catch (err) {
      console.error('Failed to load interview history:', err);
      setInterviewHistory([]);
    } finally {
      setLoadingInterviewHistory(false);
    }
  }, [user?.id, getCacheKey, getCachedData, setCachedData]);

  // Load resumes from API
  const loadResumes = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingResumes(true);
      const data = await api.getResumes();
      setResumes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading resumes:', err);
      // If 404, set empty array; otherwise keep existing resumes
      if (err.status === 404) {
        setResumes([]);
      }
    } finally {
      setLoadingResumes(false);
    }
  }, [user?.id]);

  const handleApplyToJob = async (job) => {
    if (!user?.id || !job?.id) {
      console.error('Missing user ID or job ID');
      return;
    }

    // Check if application deadline has passed
    if (isDeadlinePassed(job)) {
      const deadline = job.applicationDeadline || job.deadline;
      const deadlineStr = deadline ? new Date(deadline).toLocaleString() : 'the deadline';
      showError(`Application deadline has passed. The deadline was ${deadlineStr}. Applications are no longer being accepted.`);
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
      // Clear applications cache before reloading
      const appsCacheKey = getCacheKey('applications');
      if (appsCacheKey) {
        localStorage.removeItem(appsCacheKey);
      }
      // Reset the loading flag to force a fresh load
      dataLoadingRef.current.applications = false;
      // Reload immediately (forceRefresh=true bypasses cache)
      await loadApplicationsData(true); // Force refresh after applying

    } catch (error) {
      console.error('❌ [handleApplyToJob] Full error:', error);
      console.error('❌ [handleApplyToJob] Error response:', error.response);
      console.error('❌ [handleApplyToJob] Error data:', error.response?.data);

      // Handle "Already applied" gracefully - just refresh and update button, no error shown
      const errorData = error.response?.data || error.response || {};
      const errorMessage = errorData.error || errorData.message || error.message;

      if (errorMessage === 'Already applied to this job' || errorData.error === 'Already applied to this job') {
        // Silently refresh applications to update button state
        await loadApplicationsData(true); // Force refresh after applying
        return; // Exit early, no error message needed
      }
      
      // Handle eligibility errors (CGPA, YOP, etc.) with consistent "E" toast
      const isEligibilityError = 
        errorMessage === 'CGPA requirement not met' || errorMessage === 'CGPA requirement check failed' ||
        errorMessage?.toLowerCase?.().includes('eligibility') || errorMessage?.toLowerCase?.().includes('cgpa') ||
        errorData.error === 'CGPA requirement not met' || errorData.error === 'CGPA requirement check failed' ||
        errorData.error?.toLowerCase?.().includes('eligibility');
      if (isEligibilityError) {
        showError('Eligibility criteria not met', 'E');
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

  // Check if application deadline has passed
  const isDeadlinePassed = useCallback((job) => {
    if (!job) return false;
    const deadline = job.applicationDeadline || job.deadline;
    if (!deadline) return false; // No deadline set, allow application

    const deadlineDate = new Date(deadline);
    const now = new Date();
    return now > deadlineDate;
  }, []);

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

  // Check if student's derived Year of Passing (from batch) meets job YOP requirement
  // Rule: job.yop = Y → students with YOP <= Y can apply.
  const meetsYopRequirement = (job) => {
    const jobYop = job?.yop;
    if (!jobYop || !batch) {
      // No YOP restriction or student has no batch set → allow
      return true;
    }

    const jobYopInt = parseInt(String(jobYop).trim(), 10);
    if (Number.isNaN(jobYopInt)) {
      // If job YOP is not a valid number, don't block
      return true;
    }

    // Derive student's year of passing from batch string, e.g. "23-27" → 2027
    const parts = String(batch)
      .split('-')
      .map((p) => p.trim())
      .filter(Boolean);
    const endPart = parts.length > 1 ? parts[1] : parts[0];
    const endNum = endPart ? parseInt(endPart, 10) : NaN;

    if (Number.isNaN(endNum)) {
      // If batch format is unexpected, don't block
      return true;
    }

    const studentYop = endNum < 100 ? 2000 + endNum : endNum;
    return studentYop <= jobYopInt;
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
    const handleNavigateToApplications = (e) => {
      setActiveTab('applications');
      const view = e?.detail?.view || 'current';
      const jobId = e?.detail?.jobId || null;
      setApplicationsView(view);
      setPendingApplicationJobId(jobId);
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

  // When focusedJobId is set (via navigate event), expand and scroll to the matching application
  useEffect(() => {
    if (!focusedJobId) return;
    if (!applications || applications.length === 0) return;
    // Find matching application by application id or job id
    const targetApp = applications.find(a => {
      if (!a) return false;
      if (String(a.id) === String(focusedJobId)) return true;
      if (a.job && (String(a.job.id) === String(focusedJobId) || String(a.jobId) === String(focusedJobId))) return true;
      if (String(a.jobId) === String(focusedJobId)) return true;
      return false;
    });
    if (!targetApp) return;

    // Expand the application
    setExpandedApplications(prev => {
      const newSet = new Set(prev);
      newSet.add(targetApp.id);
      return newSet;
    });

    // Scroll into view
    setTimeout(() => {
      const el = document.getElementById(`application-${targetApp.id}`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add temporary highlight
        el.classList.add('ring-4', 'ring-indigo-200');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-indigo-200');
        }, 2500);
      }
    }, 200); // allow render/expand to complete

    // Clear focusedJobId after a short delay to avoid re-triggering
    const clearTimer = setTimeout(() => setFocusedJobId(null), 3000);
    return () => clearTimeout(clearTimer);
  }, [focusedJobId, applications]);

  // OPTIMIZED: Load profile and public profile settings in parallel for faster initial load
  useEffect(() => {
    if (user?.id && !dataLoaded) {
      const loadInitialData = async () => {
        // Load profile and public profile settings in parallel
        await Promise.all([
          loadProfile(),
          (async () => {
            try {
              const settings = await api.getPublicProfileSettings();
              setPublicProfileId(settings.publicProfileId);
              setPublicProfileShowEmail(settings.showEmail ?? true);
              setPublicProfileShowPhone(settings.showPhone ?? false);
            } catch (err) {
              console.error('Failed to load public profile settings:', err);
              // Don't show error - settings are optional
            }
          })()
        ]);
      };
      loadInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on user.id, loadProfile is stable

  // Skills are now loaded with profile data - no separate API call needed
  // Removed redundant loadSkillsData call to improve performance

  // Track if jobs/applications have been loaded to prevent repeated calls
  const dataLoadingRef = useRef({ jobs: false, applications: false });

  // OPTIMIZED: Load jobs and applications in parallel for faster loading
  useEffect(() => {
    if (!user?.id) return;

    const loadDashboardData = async () => {
      // Load applications and interview history in parallel (both are independent)
      const promises = [];

      if (!dataLoadingRef.current.applications) {
        dataLoadingRef.current.applications = true;
        promises.push(loadApplicationsData());
      }

      // Load interview history in parallel with applications (same data source)
      promises.push(loadInterviewHistory());

      // Wait for both to complete
      await Promise.all(promises);

      // Load jobs when profile is complete (requires profile data for filtering)
      if (profileComplete && !dataLoadingRef.current.jobs) {
        dataLoadingRef.current.jobs = true;
        loadJobsData();
      }
    };

    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profileComplete]); // Load jobs when profile complete, applications immediately

  // Keep "Explore Job Opportunities" section in sync after first-time profile completion modal
  useEffect(() => {
    if (!user?.id) return;

    const handleProfileUpdated = async (event) => {
      const updatedUserId = event?.detail?.userId;
      if (updatedUserId && updatedUserId !== user.id) return;

      try {
        // Clear any cached profile/jobs so we get fresh data
        clearCache();

        // Force reload profile so local state (fullName/phone/enrollmentId/school/center/batch) is updated
        loadingProfileRef.current = false;
        await loadProfile(true);

        // Force reload jobs with the new targeting fields
        dataLoadingRef.current.jobs = false;
        await loadJobsData(true);
      } catch (err) {
        // Non-fatal: just log for debugging
        console.error('Error reloading profile after profileUpdated event', err);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdated);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdated);
  }, [user?.id, loadProfile, loadJobsData]);

  // OPTIMIZED: Interview history is now loaded on mount with applications (no need to reload on tab switch)
  // Track last active tab for other potential use cases
  const lastActiveTabRef = useRef(null);
  useEffect(() => {
    if (activeTab) {
      lastActiveTabRef.current = activeTab;
    }
  }, [activeTab]);

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

    if (!bio.trim()) {
      errors.push('Bio is required');
      missingFields.push({ field: 'bio', section: 'bio' });
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
      case 'bio':
        if (!value.trim()) {
          errors.bio = 'Bio is required';
        } else {
          delete errors.bio;
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
      case 'backlogs':
        if (value && value.trim() !== '') {
          // Remove + sign for validation, keep it for display
          const numericValue = value.replace(/\+/g, '');
          if (numericValue !== '') {
            const num = parseInt(numericValue, 10);
            if (isNaN(num) || num < 0) {
              errors.backlogs = 'Active backlogs must be a non-negative number';
            } else if (num > 32) {
              errors.backlogs = 'Active backlogs cannot exceed 32';
            } else {
              delete errors.backlogs;
            }
          } else {
            delete errors.backlogs;
          }
        } else {
          delete errors.backlogs;
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

      // Validate backlogs before saving
      if (backlogs && backlogs.trim() !== '') {
        const numericValue = backlogs.replace(/\+/g, '').trim();
        if (numericValue !== '') {
          const num = parseInt(numericValue, 10);
          if (!isNaN(num) && num > 32) {
            showError('Active backlogs cannot exceed 32');
            setValidationErrors({ ...validationErrors, backlogs: 'Active backlogs cannot exceed 32' });
            setSaving(false);
            return;
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
        setCgpa(formatCgpaForDisplay(updatedProfile.cgpa));
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

      // Clear ALL cache when profile is updated (profile changes affect jobs/applications visibility)
      clearCache();

      // Dispatch custom event to notify DashboardLayout to reload profile
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: { userId: user.id }
      }));

      // Force reload profile to update header immediately (without cache)
      loadingProfileRef.current = false;
      await loadProfile(true);

      // Reload jobs since profile changes (school/center/batch) affect job visibility
      const jobsCacheKey = getCacheKey('jobs');
      if (jobsCacheKey) {
        localStorage.removeItem(jobsCacheKey);
      }
      dataLoadingRef.current.jobs = false;
      await loadJobsData(true); // Force refresh jobs

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
    { id: 'leetcode', label: 'LeetCode', icon: LeetCodeIcon, color: 'text-orange-600' },
    { id: 'codeforces', label: 'Codeforces', icon: SiCodeforces, color: 'text-blue-600' },
    { id: 'gfg', label: 'GeeksforGeeks', icon: SiGeeksforgeeks, color: 'text-green-600' },
    { id: 'hackerrank', label: 'HackerRank', icon: FaHackerrank, color: 'text-emerald-600' },
    { id: 'github', label: 'GitHub', icon: Github, color: 'text-gray-700' },
    { id: 'instagram', label: 'Instagram', icon: FaInstagram, color: 'text-pink-500' },
    { id: 'youtube', label: 'YouTube', icon: FaYoutube, color: 'text-red-600' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-600' },
  ];

  // Social links (LinkedIn, YouTube, Instagram) visible for all schools when student has added them.
  // Coding platforms (LeetCode, Codeforces, GFG, HackerRank, GitHub) only for SOT.
  const visibleSkillsCredentials = React.useMemo(() => {
    if (school === 'SOT') {
      // Tech students: social (LinkedIn, YouTube) + coding platforms (GitHub, LeetCode, etc.) — no Instagram
      return skillsCredentials.filter((skill) => ['linkedin', 'youtube', 'github', 'leetcode', 'codeforces', 'gfg', 'hackerrank'].includes(skill.id));
    } else if (school === 'SOH') {
      // School of Healthcare: LinkedIn, YouTube, Instagram
      return skillsCredentials.filter((skill) => ['youtube', 'instagram', 'linkedin'].includes(skill.id));
    } else if (school === 'SOM') {
      // School of Management: LinkedIn, Instagram, YouTube (LinkedIn allowed for all schools)
      return skillsCredentials.filter((skill) => ['linkedin', 'instagram', 'youtube'].includes(skill.id));
    } else {
      // Other schools / not set: only social links (LinkedIn, YouTube, Instagram) — no coding platforms
      return skillsCredentials.filter((skill) => ['linkedin', 'youtube', 'instagram'].includes(skill.id));
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
    // Show confirmation dialog (custom modal)
    const confirmed = await showLogoutConfirm('Are you sure you want to logout?');
    if (!confirmed) {
      return; // User cancelled, don't proceed with logout
    }

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
    const statusLower = status?.toLowerCase() || '';
    // Handle both old status values and new currentStage values
    if (statusLower === 'applied') return <Clock size={16} />;
    if (statusLower === 'shortlisted' || statusLower === 'screening qualified') return <AlertCircle size={16} />;
    if (statusLower.includes('interview round') || statusLower === 'qualified for interview' || statusLower === 'interview completed') return <CheckCircle size={16} />;
    if (statusLower === 'offered' || statusLower === 'selected' || statusLower === 'selected (final)') return <CheckCircle size={16} />;
    if (statusLower.includes('rejected')) return <XCircle size={16} />;
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
    const statusLower = status?.toLowerCase() || '';
    // Handle both old status values and new currentStage values
    if (statusLower === 'applied') return 'bg-[#3c80a7]/20 text-[#3c80a7]';
    if (statusLower === 'shortlisted' || statusLower === 'screening qualified') return 'bg-yellow-100 text-yellow-800';
    if (statusLower.includes('interview round') || statusLower === 'qualified for interview' || statusLower === 'interview completed') return 'bg-purple-100 text-purple-800';
    if (statusLower === 'offered' || statusLower === 'selected' || statusLower === 'selected (final)') return 'bg-green-100 text-green-800';
    if (statusLower.includes('rejected')) return 'bg-red-100 text-red-800';
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
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-green-500 to-emerald-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-red-500 to-rose-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-orange-500 to-orange-600',
      'bg-gradient-to-br from-teal-500 to-cyan-600'
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
      if (salary.includes('As per industry standards')) {
        return 'As per industry standards';
      }
      return salary.replace(/\$/g, '₹');
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
            jobFlexibility,
            stats: displayStats,
          }}
          jobs={jobs}
          applications={applications}
          skillsEntries={skillsEntries}
          initialSkills={skillsEntries}
          loadingJobs={loadingJobs}
          loadingApplications={loadingApplications}
          loadingSkills={loadingSkills}
          handleApplyToJob={handleApplyToJob}
          hasApplied={hasApplied}
          applying={applying}
        />;

      case 'jobs':
        return (
          <div className="space-y-4 md:space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Explore Job Opportunities</h2>

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
                <div className="space-y-4">
                  {/* Column Headers - Desktop Only; equal spacing between Company, Job Title, Drive Date, Salary (CTC), Status */}
                  <div className="hidden md:grid mb-2 py-4 px-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 min-w-0 items-center justify-items-stretch w-full" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', columnGap: '1.5rem' }}>
                    <div className="text-gray-700 font-bold text-sm uppercase tracking-wide flex items-center min-w-0">
                      <Briefcase className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
                      Company
                    </div>
                    <div className="text-gray-700 font-bold text-sm uppercase tracking-wide min-w-0">Job Title</div>
                    <div className="text-gray-700 font-bold text-sm uppercase tracking-wide min-w-0">Salary (CTC)</div>
                    <div className="text-gray-700 font-bold text-sm uppercase tracking-wide flex items-center min-w-0">
                      <Calendar className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
                      Drive Date
                    </div>
                    <div className="text-gray-700 font-bold text-sm uppercase tracking-wide min-w-0">Status</div>
                  </div>

                  {/* Job Listings - paginated (10 per page) */}
                  {(() => {
                    const totalJobs = jobs.length;
                    const totalPages = Math.max(1, Math.ceil(totalJobs / JOBS_PER_PAGE));
                    const currentPage = Math.min(Math.max(1, jobsPage), totalPages);
                    const start = (currentPage - 1) * JOBS_PER_PAGE;
                    const paginatedJobs = jobs.slice(start, start + JOBS_PER_PAGE);
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-3 sm:gap-4">
                          {paginatedJobs.map((job) => {
                            const companyName = job.company?.name || job.company || 'Company';
                            const isApplied = hasApplied(job.id);
                            const isApplying = applying[job.id];
                            const deadlinePassed = isDeadlinePassed(job);
                            const yopNotEligible = !meetsYopRequirement(job);

                            // Compute failed reasons (unified "Not eligible")
                            const failedReasons = [];
                            if (typeof meetsCgpaRequirement === 'function' && !meetsCgpaRequirement(job)) {
                              const jobMinCgpa = job.minCgpa || job.cgpaRequirement || null;
                              if (jobMinCgpa) failedReasons.push(`CGPA requirement: ${jobMinCgpa}`);
                              else failedReasons.push('CGPA requirement not met');
                            }
                            if (yopNotEligible) {
                              if (job.yop) failedReasons.push(`YOP requirement: up to ${job.yop}`);
                              else failedReasons.push('YOP requirement not met');
                            }
                            if (deadlinePassed) {
                              const dl = job.applicationDeadline || job.deadline;
                              failedReasons.push(`Applications closed on ${dl ? new Date(dl).toLocaleDateString() : 'N/A'}`);
                            }
                            if (job.backlogs && batch !== undefined && batch !== null) {
                              const requirementStr = String(job.backlogs).trim().toLowerCase();
                              const studentBacklogsNum = parseInt(String(backlogs || 0)) || 0;
                              let allowed = true;
                              if (requirementStr === 'no' || requirementStr === '0' || requirementStr === 'none') {
                                allowed = studentBacklogsNum === 0;
                              } else if (requirementStr.includes('-')) {
                                const [minStr, maxStr] = requirementStr.split('-').map(s => s.trim());
                                const minB = parseInt(minStr) || 0;
                                const maxB = parseInt(maxStr) || 0;
                                allowed = studentBacklogsNum >= minB && studentBacklogsNum <= maxB;
                              } else {
                                const maxAllowed = parseInt(requirementStr) || 0;
                                allowed = studentBacklogsNum <= maxAllowed;
                              }
                              if (!allowed) failedReasons.push(`Backlogs requirement: ${job.backlogs}`);
                            }
                            const notEligible = failedReasons.length > 0;

                            return (
                              <div
                                key={job.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => navigate(`/job/${job.id}`)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    navigate(`/job/${job.id}`);
                                  }
                                }}
                                className="group bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg sm:hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                              >
                                {/* Mobile Layout */}
                                <div className="md:hidden p-3 sm:p-5 space-y-2.5 sm:space-y-4">
                                  <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-base sm:text-lg font-bold flex-shrink-0 shadow-md ${getCompanyColor(companyName)}`}>
                                      {getCompanyInitial(companyName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">{companyName}</h3>
                                      <p className="text-sm sm:text-base font-semibold text-blue-600 mb-1.5 sm:mb-2 truncate">{job.jobTitle}</p>
                                      <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                          <span className="font-semibold text-green-600">{formatSalary(job.salary || job.ctc)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                          <span>{job.driveDate ? formatDate(job.driveDate) : 'TBD'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 border-t border-gray-200">
                                      <button
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleApplyToJob(job);
                                      }}
                                      disabled={isApplied || isApplying || deadlinePassed || notEligible}
                                      title={ isApplied ? 'Already applied' : ( notEligible ? failedReasons.join(' • ') : (deadlinePassed ? 'Application deadline has passed. Applications are no longer being accepted.' : '') ) }
                                      className={`flex-1 min-w-0 ${BUTTON_SIZE} rounded-md sm:rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 border-2 shadow-sm hover:shadow-md touch-manipulation ${isApplied
                                        ? 'bg-green-100 text-green-700 cursor-not-allowed border-green-300'
                                        : isApplying
                                          ? 'bg-blue-100 text-blue-700 cursor-not-allowed border-blue-300'
                                          : deadlinePassed || notEligible
                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300'
                                            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 border-transparent'
                                        }`}
                                    >
                                      {isApplied ? (
                                        <>
                                          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                          <span className="truncate">Applied</span>
                                        </>
                                      ) : isApplying ? (
                                        <>
                                          <Loader className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 animate-spin" />
                                          <span className="truncate">Applying...</span>
                                        </>
                                      ) : deadlinePassed ? (
                                        <>
                                          <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                          <span className="truncate">Deadline Passed</span>
                                        </>
                                      ) : notEligible ? (
                                        <>
                                          <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                          <span className="truncate">Not eligible</span>
                                        </>
                                      ) : (
                                        <>
                                          <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                          <span className="truncate">Apply Now</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Desktop Layout - 5 equal columns: Company, Job Title, Drive Date, Salary (CTC), Status */}
                                <div className="hidden md:grid p-6 items-center min-w-0 overflow-hidden justify-items-stretch w-full" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', columnGap: '1.5rem' }}>
                                  <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-lg ${getCompanyColor(companyName)}`}>
                                      {getCompanyInitial(companyName)}
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                      <h3 className="text-base font-bold text-gray-900 truncate">{companyName}</h3>
                                    </div>
                                  </div>

                                  <div className="min-w-0 overflow-hidden flex items-center">
                                    <p className="text-sm font-semibold text-blue-600 truncate">{job.jobTitle}</p>
                                  </div>

                                  <div className="flex items-center min-w-0 overflow-hidden">
                                    <span className="text-sm font-bold text-green-600 truncate">{formatSalary(job.salary || job.ctc)}</span>
                                  </div>

                                  <div className="flex items-center min-w-0 overflow-hidden">
                                    <div className="flex items-center gap-2 text-gray-700 min-w-0">
                                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                      <span className="text-sm font-medium truncate">{job.driveDate ? formatDate(job.driveDate) : 'TBD'}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center min-w-0 overflow-hidden">
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleApplyToJob(job);
                                      }}
                                      disabled={isApplied || isApplying || deadlinePassed || notEligible}
                                      title={ isApplied ? 'Already applied' : ( notEligible ? failedReasons.join(' • ') : (deadlinePassed ? 'Application deadline has passed. Applications are no longer being accepted.' : '') ) }
                          className={`${BUTTON_SIZE} px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 border-2 shadow-sm hover:shadow-md ${isApplied
                                        ? 'bg-green-100 text-green-700 cursor-not-allowed border-green-300'
                                        : isApplying
                                          ? 'bg-blue-100 text-blue-700 cursor-not-allowed border-blue-300'
                                          : deadlinePassed || notEligible
                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300'
                                            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 border-transparent'
                                        }`}
                                    >
                                      {isApplied ? (
                                        <>
                                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                          Applied
                                        </>
                                      ) : isApplying ? (
                                        <>
                                          <Loader className="h-4 w-4 flex-shrink-0 animate-spin" />
                                          Applying...
                                        </>
                                      ) : deadlinePassed ? (
                                        <>
                                          <XCircle className="h-4 w-4 flex-shrink-0" />
                                          Deadline Passed
                                        </>
                                      ) : notEligible ? (
                                        <>
                                          <XCircle className="h-4 w-4 flex-shrink-0" />
                                          Not eligible
                                        </>
                                      ) : (
                                        <>
                                          <Briefcase className="h-4 w-4 flex-shrink-0" />
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

                        {/* Pagination */}
                        {totalJobs > JOBS_PER_PAGE && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {start + 1}–{Math.min(start + JOBS_PER_PAGE, totalJobs)} of {totalJobs} jobs
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Previous
                              </button>
                              <span className="px-3 py-2 text-sm text-gray-700">
                                Page {currentPage} of {totalPages}
                              </span>
                              <button
                                type="button"
                                onClick={() => setJobsPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
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

        // Use same pipeline stats as Career Insights (screening → shortlisted, test → interviewed, offer)
        const { applied: totalApplied, shortlisted, interviewed, offers } = displayStats;

        // Past Applications: only final outcomes (Selected/Rejected)
        const pastRecords = interviewHistory.filter(app => {
          const history = app.interviewHistory;
          return history?.isCracked || history?.isRejected;
        });

        return (
          <div className="space-y-5 sm:space-y-8 overflow-x-hidden">
            {/* Application Dashboard – same style as Career Insights (fieldset + gradient legend) */}
            <div className="py-3 px-3 sm:px-4 bg-gradient-to-r from-slate-50 via-white to-blue-50 rounded-xl border border-gray-200 shadow-sm">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full max-w-6xl mx-auto justify-items-stretch items-stretch">
                <div className="bg-gradient-to-br from-white to-red-100 p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 border-gray-200 hover:shadow-md transition-all duration-300 min-h-[64px] sm:min-h-[112px] flex flex-col justify-between group">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 sm:p-2.5 flex items-center justify-center shadow-md rounded-lg sm:rounded-xl flex-shrink-0 bg-red-600 group-hover:scale-105 transition-transform duration-300">
                      <Briefcase className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-base sm:text-lg font-bold uppercase tracking-wider text-red-700 mb-0.5 truncate">Applied</p>
                      <p className="text-3xl sm:text-5xl font-extrabold text-gray-900 truncate" title={String(totalApplied)}>{totalApplied}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-white to-blue-200 p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 border-gray-200 hover:shadow-md transition-all duration-300 min-h-[64px] sm:min-h-[112px] flex flex-col justify-between group">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 sm:p-2.5 flex items-center justify-center shadow-md rounded-lg sm:rounded-xl flex-shrink-0 bg-blue-600 group-hover:scale-105 transition-transform duration-300">
                      <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-base sm:text-lg font-bold uppercase tracking-wider text-blue-700 mb-0.5 truncate">Shortlisted</p>
                      <p className="text-3xl sm:text-5xl font-extrabold text-gray-900 truncate" title={String(shortlisted)}>{shortlisted}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-white to-green-200 p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 border-gray-200 hover:shadow-md transition-all duration-300 min-h-[64px] sm:min-h-[112px] flex flex-col justify-between group">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 sm:p-2.5 flex items-center justify-center shadow-md rounded-lg sm:rounded-xl flex-shrink-0 bg-green-600 group-hover:scale-105 transition-transform duration-300">
                      <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-base sm:text-lg font-bold uppercase tracking-wider text-green-700 mb-0.5 truncate">Interviewed</p>
                      <p className="text-3xl sm:text-5xl font-extrabold text-gray-900 truncate" title={String(interviewed)}>{interviewed}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-white to-purple-200 p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 border-gray-200 hover:shadow-md transition-all duration-300 min-h-[64px] sm:min-h-[112px] flex flex-col justify-between group">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 sm:p-2.5 flex items-center justify-center shadow-md rounded-lg sm:rounded-xl flex-shrink-0 bg-purple-600 group-hover:scale-105 transition-transform duration-300">
                      <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-base sm:text-lg font-bold uppercase tracking-wider text-purple-700 mb-0.5 truncate">Offers</p>
                      <p className="text-3xl sm:text-5xl font-extrabold text-gray-900 truncate" title={String(offers)}>{offers}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced View Toggle - responsive: stack on mobile, row on desktop */}
            <div className="flex justify-center px-1">
              <div className="bg-white/80 backdrop-blur-lg rounded-xl sm:rounded-2xl p-2 shadow-xl border border-gray-200/50 w-full max-w-md sm:max-w-none sm:w-auto inline-flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setApplicationsView('current')}
                  className={`w-full sm:w-auto px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base ${applicationsView === 'current'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg sm:scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                  <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  Current Applications
                </button>
                <button
                  onClick={() => setApplicationsView('past')}
                  className={`w-full sm:w-auto px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base ${applicationsView === 'past'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg sm:scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                  <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  Past Applications
                </button>
              </div>
            </div>

            {applicationsView === 'past' ? (
              /* Enhanced Past Applications View - responsive */
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-gradient-to-r from-slate-100 via-gray-50 to-purple-50 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 truncate">Past Applications</h2>
                  <p className="text-sm sm:text-base text-gray-600">Your interview history and results</p>
                </div>

                {loadingInterviewHistory ? (
                  <div className="flex flex-col items-center justify-center py-12 sm:py-20 bg-white rounded-xl sm:rounded-2xl shadow-lg px-4">
                    <Loader className="animate-spin h-10 w-10 sm:h-12 sm:w-12 text-purple-600 mb-4" />
                    <span className="text-gray-600 text-sm sm:text-lg font-medium text-center">Loading interview history...</span>
                  </div>
                ) : pastRecords.length === 0 ? (
                  <div className="text-center py-12 sm:py-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mb-4 sm:mb-6">
                      <ClipboardList className="w-8 h-8 sm:w-12 sm:h-12 text-purple-500" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">No Past Records</h3>
                    <p className="text-gray-500 text-sm sm:text-lg mb-1">Your completed interview records will appear here.</p>
                    <p className="text-gray-400 text-xs sm:text-sm">Keep applying and attending interviews to build your history!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(() => {
                      const totalPast = pastRecords.length;
                      const totalPastPages = Math.max(1, Math.ceil(totalPast / APPLICATIONS_LIST_PER_PAGE));
                      const pastPage = Math.min(Math.max(1, pastApplicationsPage), totalPastPages);
                      const startPast = (pastPage - 1) * APPLICATIONS_LIST_PER_PAGE;
                      const paginatedPastRecords = pastRecords.slice(startPast, startPast + APPLICATIONS_LIST_PER_PAGE);
                      return (
                        <>
                          {paginatedPastRecords.map((record, index) => {
                            const history = record.interviewHistory;
                            const isCracked = history.isCracked;
                            const isRejected = history.isRejected;

                            return (
                              <div
                                key={record.id}
                                className="group relative overflow-hidden bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                                style={{ animationDelay: `${index * 100}ms` }}
                              >
                                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${isCracked ? 'from-green-500 to-emerald-500' :
                                  isRejected ? 'from-red-500 to-rose-500' :
                                    'from-gray-400 to-gray-500'
                                  }`}></div>

                                <div className="p-4 sm:p-6 lg:p-8">
                                  {/* Header: stack on mobile, row on desktop */}
                                  <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                                        <div className={`${getCompanyColor(record.company?.name)} w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                                          <span className="text-white font-bold text-lg sm:text-2xl">
                                            {getCompanyInitial(record.company?.name)}
                                          </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1 truncate group-hover:text-purple-600 transition-colors">
                                            {record.job?.jobTitle || 'Unknown Position'}
                                          </h3>
                                          <p className="text-sm sm:text-lg font-semibold text-gray-600 flex items-center gap-2 truncate">
                                            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                            {record.company?.name || 'Unknown Company'}
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setExpandedApplications(prev => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(record.id)) newSet.delete(record.id);
                                            else newSet.add(record.id);
                                            return newSet;
                                          });
                                        }}
                                        className="self-start sm:self-center flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 text-sm font-medium text-gray-700"
                                      >
                                        <span>View Details</span>
                                        {expandedApplications.has(record.id) ? (
                                          <IoIosArrowDropup className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                        ) : (
                                          <IoIosArrowDropdown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {expandedApplications.has(record.id) && (
                                    <div className="mb-4 sm:mb-6 space-y-4 sm:space-y-6 border-t border-gray-200 pt-4 sm:pt-6">
                                      {record.screeningStatusText && (
                                        <div className={`p-3 sm:p-4 border rounded-lg ${record.screeningStatus === 'RESUME_REJECTED' || record.screeningStatus === 'TEST_REJECTED'
                                          ? 'bg-red-50 border-red-200'
                                          : record.screeningStatus === 'TEST_SELECTED'
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-yellow-50 border-yellow-200'
                                          }`}>
                                          <div className="flex items-center gap-2 mb-1">
                                            <Info className={`w-5 h-5 ${record.screeningStatus === 'RESUME_REJECTED' || record.screeningStatus === 'TEST_REJECTED'
                                              ? 'text-red-600'
                                              : record.screeningStatus === 'TEST_SELECTED'
                                                ? 'text-green-600'
                                                : 'text-yellow-600'
                                              }`} />
                                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Screening Status</span>
                                          </div>
                                          <p className={`text-base font-bold ${record.screeningStatus === 'RESUME_REJECTED' || record.screeningStatus === 'TEST_REJECTED'
                                            ? 'text-red-800'
                                            : record.screeningStatus === 'TEST_SELECTED'
                                              ? 'text-green-800'
                                              : 'text-yellow-800'
                                            }`}>
                                            {record.screeningStatusText}
                                          </p>
                                        </div>
                                      )}

                                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-center sm:justify-start">
                                        {isCracked && (
                                          <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 shadow-md">
                                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                            Cracked
                                          </span>
                                        )}
                                        {isRejected && (
                                          <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200 shadow-md">
                                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                            Rejected
                                          </span>
                                        )}
                                        {!isCracked && !isRejected && (
                                          <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 shadow-md">
                                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                            Pending
                                          </span>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 sm:p-5 rounded-lg sm:rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Trophy className="w-5 h-5 text-blue-600" />
                                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Round Reached</p>
                                          </div>
                                          <p className="text-sm sm:text-lg font-bold text-gray-800 break-words">
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
                                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-gray-200 overflow-x-hidden">
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
                                                  className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-200 ${wasReached
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
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition-all duration-200 ${wasReached ? baseColor : mutedColor + ' opacity-75'
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

                                                  <div className="space-y-2 pl-0 sm:pl-16">
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
                                                            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${evaluation.status === 'SELECTED'
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

                                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200 flex items-center gap-3">
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
                          {totalPast > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 mt-4">
                              <p className="text-sm text-gray-600">
                                Showing {startPast + 1}–{Math.min(startPast + APPLICATIONS_LIST_PER_PAGE, totalPast)} of {totalPast} application{totalPast !== 1 ? 's' : ''}
                              </p>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setPastApplicationsPage((p) => Math.max(1, p - 1))} disabled={pastPage <= 1} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                  <ChevronLeft className="h-4 w-4" /> Prev
                                </button>
                                <span className="text-sm font-medium text-gray-700 px-2">Page {pastPage} of {totalPastPages}</span>
                                <button type="button" onClick={() => setPastApplicationsPage((p) => Math.min(totalPastPages, p + 1))} disabled={pastPage >= totalPastPages} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                  Next <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
            /* Current Applications View - responsive */
              <div className="space-y-4 sm:space-y-6">
                {/* Header for Current Applications */}
                <div className="bg-gradient-to-r from-slate-100 via-white to-blue-50 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 truncate">Current Applications</h2>
                  <p className="text-sm sm:text-base text-gray-600">Track ongoing applications, statuses, and upcoming interviews</p>
                  
                </div>
                {loadingApplications ? (
                  <div className="flex flex-col items-center justify-center py-12 sm:py-20 bg-white rounded-xl sm:rounded-2xl shadow-lg px-4">
                    <Loader className="animate-spin h-10 w-10 sm:h-12 sm:w-12 text-indigo-600 mb-4" />
                    <span className="text-gray-600 text-sm sm:text-lg font-medium text-center">Loading your applications...</span>
                  </div>
                ) : !applications || applications.length === 0 ? (
                  <div className="text-center py-12 sm:py-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4 sm:mb-6">
                      <ClipboardList className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-500" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">No Applications Yet</h3>
                    <p className="text-gray-500 text-sm sm:text-lg mb-1">Start your job search journey today!</p>
                    <p className="text-gray-400 text-xs sm:text-sm">Browse available jobs and apply to track your progress here.</p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {(() => {
                      const isFinalOutcome = (app) => {
                        const finalStatus = String(app?.finalStatus || '').toUpperCase();
                        if (finalStatus === 'SELECTED' || finalStatus === 'REJECTED') return true;

                        const interviewStatus = app?.interviewStatus;
                        if (typeof interviewStatus === 'string') {
                          if (interviewStatus === 'SELECTED') return true;
                          if (interviewStatus.startsWith('REJECTED_IN_ROUND_')) return true;
                        }

                        const status = String(app?.status || '').toUpperCase();
                        return status === 'SELECTED' || status === 'REJECTED';
                      };

                      const currentApplications = applications.filter(app => !isFinalOutcome(app));
                      const totalCurrent = currentApplications.length;
                      const totalCurrentPages = Math.max(1, Math.ceil(totalCurrent / APPLICATIONS_LIST_PER_PAGE));
                      const currentPage = Math.min(Math.max(1, currentApplicationsPage), totalCurrentPages);
                      const startCurrent = (currentPage - 1) * APPLICATIONS_LIST_PER_PAGE;
                      const paginatedApplications = currentApplications.slice(startCurrent, startCurrent + APPLICATIONS_LIST_PER_PAGE);
                      return (
                        <>
                          {paginatedApplications.map((application, index) => (
                            <div
                              key={application.id}
                              className="group relative overflow-hidden bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                              style={{ animationDelay: `${index * 100}ms` }}
                              data-application-id={application.id}
                            >
                              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${(() => {
                                const status = (application.currentStage || application.status)?.toLowerCase() || '';
                                if (status === 'applied') return 'from-blue-500 to-cyan-500';
                                if (status === 'shortlisted' || status === 'screening qualified') return 'from-yellow-500 to-amber-500';
                                if (status.includes('interview round') || status === 'qualified for interview' || status === 'interview completed') return 'from-purple-500 to-pink-500';
                                if (status === 'offered' || status === 'selected' || status === 'selected (final)') return 'from-green-500 to-emerald-500';
                                if (status.includes('rejected')) return 'from-red-500 to-rose-500';
                                return 'from-gray-400 to-gray-500';
                              })()
                        }`}></div>

                              <div id={`application-${application.id}`} className="p-4 sm:p-6 lg:p-8">
                                <div className="flex flex-col gap-3 sm:gap-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                                      <div className={`${getCompanyColor(application.company?.name)} w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                                        <span className="text-white font-bold text-lg sm:text-2xl">
                                          {getCompanyInitial(application.company?.name)}
                                        </span>
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1 truncate group-hover:text-indigo-600 transition-colors">
                                          {application.job?.jobTitle || 'Unknown Position'}
                                        </h3>
                                        <p className="text-sm sm:text-lg font-semibold text-gray-600 flex items-center gap-2 truncate">
                                          <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                          {application.company?.name || 'Unknown Company'}
                                        </p>
                                        {application.screeningStatusText && (
                                          <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{application.screeningStatusText}</p>
                                        )}
                                      </div>
                                    </div>
                                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start sm:self-center">
                                      <span className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-md ${getStatusColor(application.currentStage || application.status)}`}>
                                        {getStatusIcon(application.currentStage || application.status)}
                                        <span className="truncate max-w-[120px] sm:max-w-none">
                                          {(() => {
                                            const status = application.currentStage || application.status;
                                            if (status === 'job_removed') return 'Job Removed';
                                            if (status) return status.charAt(0).toUpperCase() + status.slice(1);
                                            return 'Unknown';
                                          })()}
                                        </span>
                                      </span>
                                      {(application.jobId || application.job?.id) && (
                                        <button
                                          onClick={() => navigate(`/job/${application.jobId || application.job?.id}`)}
                                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors duration-200 text-sm font-medium"
                                          title="View Job Description"
                                        >
                                          <FileText className="w-4 h-4 flex-shrink-0" />
                                          <span>View JD</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setExpandedApplications(prev => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(application.id)) newSet.delete(application.id);
                                            else newSet.add(application.id);
                                            return newSet;
                                          });
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 text-sm font-medium text-gray-700"
                                      >
                                        <span>View Details</span>
                                        {expandedApplications.has(application.id) ? (
                                          <IoIosArrowDropup className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                        ) : (
                                          <IoIosArrowDropdown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {expandedApplications.has(application.id) && (
                                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 space-y-4 sm:space-y-6">
                                    {(() => {
                                      // Don't show screening status badge if already selected or completed
                                      const currentStage = (application.currentStage || application.status)?.toLowerCase() || '';
                                      const isFinal = currentStage === 'selected (final)' || currentStage === 'interview completed';

                                      // Only show screening status if not in final state
                                      if (isFinal || !application.screeningStatusText) return null;

                                      return (
                                        <div className={`p-3 sm:p-3 border rounded-lg ${application.screeningStatus === 'RESUME_REJECTED' || application.screeningStatus === 'TEST_REJECTED'
                                          ? 'bg-red-50 border-red-200'
                                          : application.screeningStatus === 'TEST_SELECTED'
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-yellow-50 border-yellow-200'
                                          }`}>
                                          <div className="flex items-center gap-2">
                                            <Info className={`w-4 h-4 ${application.screeningStatus === 'RESUME_REJECTED' || application.screeningStatus === 'TEST_REJECTED'
                                              ? 'text-red-600'
                                              : application.screeningStatus === 'TEST_SELECTED'
                                                ? 'text-green-600'
                                                : 'text-yellow-600'
                                              }`} />
                                            <span className={`text-sm font-medium ${application.screeningStatus === 'RESUME_REJECTED' || application.screeningStatus === 'TEST_REJECTED'
                                              ? 'text-red-800'
                                              : application.screeningStatus === 'TEST_SELECTED'
                                                ? 'text-green-800'
                                                : 'text-yellow-800'
                                              }`}>
                                              {application.screeningStatusText}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* Interview Status Badge (only if passed screening) */}
                                    {application.interviewStatus?.hasSession && application.screeningStatus === 'TEST_SELECTED' && (
                                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
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

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                                      <div className="group/item bg-gradient-to-br from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center gap-2 mb-2">
                                          <MapPin className="w-4 h-4 text-blue-600" />
                                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Location</p>
                                        </div>
                                        <p className="text-sm sm:text-base font-bold text-gray-800 break-words">
                                          {application.job?.location || 'Not specified'}
                                        </p>
                                      </div>
                                      <div className="group/item bg-gradient-to-br from-purple-50 to-pink-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-purple-100 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Briefcase className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Experience</p>
                                        </div>
                                        <p className="text-sm sm:text-base font-bold text-gray-800 break-words">
                                          {application.job?.experienceLevel || 'Not specified'}
                                        </p>
                                      </div>
                                      <div className="group/item bg-gradient-to-br from-green-50 to-emerald-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-green-100 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Clock className="w-4 h-4 text-green-600 flex-shrink-0" />
                                          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Job Type</p>
                                        </div>
                                        <p className="text-sm sm:text-base font-bold text-gray-800 break-words">
                                          {application.job?.jobType || 'Not specified'}
                                        </p>
                                      </div>
                                      <div className="group/item bg-gradient-to-br from-amber-50 to-yellow-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-amber-100 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Award className="w-4 h-4 text-amber-600" />
                                          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Salary</p>
                                        </div>
                                        <p className="text-sm sm:text-base font-bold text-gray-800 break-words">
                                          {application.job?.salaryRange || 'Not disclosed'}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 sm:p-5 rounded-lg sm:rounded-xl border border-gray-200 mb-4 sm:mb-6">
                                      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
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

                                    {(() => {
                                      // Match JobContent mapping: jobDescription || description || responsibilities
                                      const jdText = application.job?.jobDescription || application.job?.description || application.job?.responsibilities || '';
                                      if (!jdText || typeof jdText !== 'string' || !jdText.trim()) return null;
                                      const jobId = application.jobId || application.job?.id;
                                      return (
                                        <div className="mb-4 sm:mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 p-3 sm:p-5 rounded-lg sm:rounded-xl border border-indigo-100">
                                          <div className="flex items-center justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2">
                                              <FileText className="w-5 h-5 text-indigo-600" />
                                              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Job Description</p>
                                            </div>
                                            {jobId && (
                                              <button
                                                onClick={() => navigate(`/job/${jobId}`)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
                                              >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                View Full JD
                                              </button>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                                            {jdText.length > 200 ? `${jdText.substring(0, 200)}...` : jdText}
                                          </p>
                                        </div>
                                      );
                                    })()}

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
                                )}
                              </div>
                            </div>
                          ))}
                          {totalCurrent > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 mt-4">
                              <p className="text-sm text-gray-600">
                                Showing {startCurrent + 1}–{Math.min(startCurrent + APPLICATIONS_LIST_PER_PAGE, totalCurrent)} of {totalCurrent} application{totalCurrent !== 1 ? 's' : ''}
                              </p>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setCurrentApplicationsPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                  <ChevronLeft className="h-4 w-4" /> Prev
                                </button>
                                <span className="text-sm font-medium text-gray-700 px-2">Page {currentPage} of {totalCurrentPages}</span>
                                <button type="button" onClick={() => setCurrentApplicationsPage((p) => Math.min(totalCurrentPages, p + 1))} disabled={currentPage >= totalCurrentPages} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                  Next <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
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
          <div className="min-w-0 overflow-x-hidden pb-24 md:pb-0 w-full">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 w-full max-w-4xl md:max-w-none mx-auto">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Edit Profile</h2>
                <p className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
                  <span className="text-red-500">*</span> required
                </p>
              </div>

              <form id="editProfileForm" className="space-y-4 sm:space-y-6 md:space-y-8" onSubmit={handleSaveProfile}>
                {/* Profile Photo Section - collapsible on mobile */}
                <div className="border border-gray-200 rounded-lg overflow-hidden md:border-0 md:rounded-none md:overflow-visible">
                  <button
                    type="button"
                    onClick={() => toggleProfileSection('photo')}
                    className="md:hidden w-full flex items-center justify-between p-3 sm:p-4 bg-blue-50 border-b border-blue-100/50 text-left"
                  >
                    <span className="font-semibold text-gray-900 flex items-center gap-2">
                      <ImageIcon size={18} className="text-blue-600" />
                      Profile Photo
                    </span>
                    {profileSectionsOpen.photo ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>
                  <div className={`${profileSectionsOpen.photo ? 'block' : 'hidden'} md:block`}>
                    <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-100">
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
                          {profilePhoto && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm('Are you sure you want to remove your profile photo? It will revert to the default photo.')) {
                                  return;
                                }

                                try {
                                  await api.deleteProfileImage();
                                  setProfilePhoto('');
                                  showSuccess('Profile photo removed successfully!');
                                } catch (err) {
                                  console.error('Error deleting profile image:', err);
                                  let errorMessage = 'Failed to remove profile photo';
                                  if (err.response?.data?.error) {
                                    errorMessage = err.response.data.error;
                                  } else if (err.message) {
                                    errorMessage = err.message;
                                  }
                                  showError(errorMessage);
                                }
                              }}
                              className="absolute top-2.5 right-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10 -translate-x-1/2"
                              title="Remove profile photo"
                            >
                              <XCircle size={14} className="text-white" />
                            </button>
                          )}
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
                  </div>
                </div>

                {/* Personal Information Section - collapsible on mobile */}
                <div className="border border-gray-200 rounded-lg overflow-hidden md:border-0 md:rounded-none md:overflow-visible">
                  <button
                    type="button"
                    onClick={() => toggleProfileSection('personal')}
                    className="md:hidden w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b border-gray-200 text-left"
                  >
                    <span className="font-semibold text-gray-900 flex items-center gap-2">
                      <User size={18} className="text-blue-600" />
                      Personal Information
                    </span>
                    {profileSectionsOpen.personal ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>
                  <div className={`${profileSectionsOpen.personal ? 'block' : 'hidden'} md:block p-3 sm:p-0 md:p-0`}>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 md:mt-0 mt-2">
                        <User size={20} className="text-blue-600 hidden md:block" />
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Personal Information</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${validationErrors.phone ? 'border-red-500' : 'border-gray-300'
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
                  </div>
                </div>

                {/* Academic Information Section - collapsible on mobile */}
                <div className="border border-gray-200 rounded-lg overflow-hidden md:border-0 md:rounded-none md:overflow-visible">
                  <button
                    type="button"
                    onClick={() => toggleProfileSection('academic')}
                    className="md:hidden w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b border-gray-200 text-left"
                  >
                    <span className="font-semibold text-gray-900 flex items-center gap-2">
                      <FaGraduationCap size={18} className="text-purple-600" />
                      Academic Information
                    </span>
                    {profileSectionsOpen.academic ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>
                  <div className={`${profileSectionsOpen.academic ? 'block' : 'hidden'} md:block p-3 sm:p-0 md:p-0`}>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 md:mt-0 mt-2">
                        <FaGraduationCap size={20} className="text-purple-600 hidden md:block" />
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Academic Information</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Trophy size={16} className="text-orange-500" />
                            Active Backlogs
                          </label>
                          <input
                            type="text"
                            className={`w-full border ${validationErrors.backlogs ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text`}
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
                              // Validate the value
                              validateField('backlogs', value);
                            }}
                          />
                          {validationErrors.backlogs && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.backlogs}</p>
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
                  </div>
                </div>

                {/* Location Section - collapsible on mobile */}
                <div className="border border-gray-200 rounded-lg overflow-hidden md:border-0 md:rounded-none md:overflow-visible">
                  <button
                    type="button"
                    onClick={() => toggleProfileSection('location')}
                    className="md:hidden w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b border-gray-200 text-left"
                  >
                    <span className="font-semibold text-gray-900 flex items-center gap-2">
                      <MapPin size={18} className="text-green-600" />
                      Location
                    </span>
                    {profileSectionsOpen.location ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>
                  <div className={`${profileSectionsOpen.location ? 'block' : 'hidden'} md:block p-3 sm:p-0 md:p-0`}>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 md:mt-0 mt-2">
                        <MapPin size={20} className="text-green-600 hidden md:block" />
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Location</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <MapPin size={16} className="text-gray-500" />
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${validationErrors.city ? 'border-red-500' : 'border-gray-300'
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
                            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${validationErrors.stateRegion ? 'border-red-500' : 'border-gray-300'
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
                  </div>
                </div>

                {/* Professional Profile Section - collapsible on mobile */}
                <div className="border border-gray-200 rounded-lg overflow-hidden md:border-0 md:rounded-none md:overflow-visible">
                  <button
                    type="button"
                    onClick={() => toggleProfileSection('professional')}
                    className="md:hidden w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b border-gray-200 text-left"
                  >
                    <span className="font-semibold text-gray-900 flex items-center gap-2">
                      <Briefcase size={18} className="text-indigo-600" />
                      Professional Profile
                    </span>
                    {profileSectionsOpen.professional ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>
                  <div className={`${profileSectionsOpen.professional ? 'block' : 'hidden'} md:block p-3 sm:p-0 md:p-0`}>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 md:mt-0 mt-2">
                        <Briefcase size={20} className="text-indigo-600 hidden md:block" />
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Professional Profile</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-text ${validationErrors.linkedin ? 'border-red-500' : 'border-gray-300'
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
                  </div>
                </div>

                {/* Social Media & Coding - collapsible on mobile (no inner collapsible for each sub-section to keep edit smaller) */}
                {(school === 'SOT' || school === 'SOM' || school === 'SOH') && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden md:border-0 md:rounded-none md:overflow-visible">
                    <button
                      type="button"
                      onClick={() => toggleProfileSection('social')}
                      className="md:hidden w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b border-gray-200 text-left"
                    >
                      <span className="font-semibold text-gray-900 flex items-center gap-2">
                        <Globe size={18} className="text-blue-600" />
                        Social & Links
                      </span>
                      {profileSectionsOpen.social ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                    </button>
                    <div className={`${profileSectionsOpen.social ? 'block' : 'hidden'} md:block p-3 sm:p-0 md:p-0`}>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 md:mt-0 mt-2">
                          <Globe size={20} className="text-blue-600 hidden md:block" />
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Social Media & Coding Profiles</h3>
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
                    </div>
                  </div>
                )}

                {/* Coding Platforms Section - Only for SOT, collapsible on mobile */}
                {school === 'SOT' && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden md:border-0 md:rounded-none md:overflow-visible">
                    <button
                      type="button"
                      onClick={() => toggleProfileSection('coding')}
                      className="md:hidden w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b border-gray-200 text-left"
                    >
                      <span className="font-semibold text-gray-900 flex items-center gap-2">
                        <Code2 size={18} className="text-orange-600" />
                        Coding Platforms
                      </span>
                      {profileSectionsOpen.coding ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                    </button>
                    <div className={`${profileSectionsOpen.coding ? 'block' : 'hidden'} md:block p-3 sm:p-0 md:p-0`}>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 md:mt-0 mt-2">
                          <Code2 size={20} className="text-orange-600 hidden md:block" />
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Coding Platforms</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                    </div>
                  </div>
                )}

                {/* Other Profiles Section - collapsible on mobile */}
                {(school === 'SOT' || school === 'SOM' || school === 'SOH') && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden md:border-0 md:rounded-none md:overflow-visible">
                    <button
                      type="button"
                      onClick={() => toggleProfileSection('otherProfiles')}
                      className="md:hidden w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b border-gray-200 text-left"
                    >
                      <span className="font-semibold text-gray-900 flex items-center gap-2">
                        <LinkIcon size={18} className="text-purple-600" />
                        Other Profiles
                      </span>
                      {profileSectionsOpen.otherProfiles ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                    </button>
                    <div className={`${profileSectionsOpen.otherProfiles ? 'block' : 'hidden'} md:block p-3 sm:p-0 md:p-0`}>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 md:mt-0 mt-2">
                          <LinkIcon size={20} className="text-purple-600 hidden md:block" />
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Other Profiles</h3>
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
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${showAddProfileForm
                            ? 'text-white bg-blue-600 hover:bg-blue-700'
                            : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                            }`}
                        >
                          <Plus size={16} />
                          Add Profile
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bio Section - collapsible on mobile */}
                <div className="border border-gray-200 rounded-lg overflow-hidden md:border-0 md:rounded-none md:overflow-visible">
                  <button
                    type="button"
                    onClick={() => toggleProfileSection('bio')}
                    className="md:hidden w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b border-gray-200 text-left"
                  >
                    <span className="font-semibold text-gray-900 flex items-center gap-2">
                      <FileText size={18} className="text-gray-600" />
                      About Me
                    </span>
                    {profileSectionsOpen.bio ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>
                  <div className={`${profileSectionsOpen.bio ? 'block' : 'hidden'} md:block p-3 sm:p-0 md:p-0`}>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 md:mt-0 mt-2">
                        <FileText size={20} className="text-gray-600 hidden md:block" />
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">About Me</h3>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <FileText size={16} className="text-gray-500" />
                          Bio <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="bio"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none cursor-text"
                          rows="4"
                          placeholder="Write a brief bio about yourself"
                          value={bio}
                          onChange={(e) => {
                            setBio(e.target.value);
                            validateField('bio', e.target.value);
                          }}
                        ></textarea>
                        {validationErrors.bio && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms & Actions Section - collapsible on mobile */}
                <div className="border border-gray-200 rounded-lg overflow-hidden md:border-0 md:rounded-none md:overflow-visible">
                  <button
                    type="button"
                    onClick={() => toggleProfileSection('terms')}
                    className="md:hidden w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b border-gray-200 text-left"
                  >
                    <span className="font-semibold text-gray-900">Terms & Save</span>
                    {profileSectionsOpen.terms ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>
                  <div className={`${profileSectionsOpen.terms ? 'block' : 'hidden'} md:block p-3 sm:p-0 md:p-0`}>
                    <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
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
                        <div className="hidden md:flex md:flex-nowrap gap-4 justify-end pt-4 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              resetProfileForm();
                              setIsChecked(false);
                              setValidationErrors({});
                            }}
                            className="flex-shrink-0 px-6 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-medium cursor-pointer"
                          >
                            Reset
                          </button>
                          <button
                            type="submit"
                            id='editSaveBtn'
                            disabled={!isChecked || saving}
                            className={`flex-shrink-0 px-8 py-2 rounded-md text-white transition-colors font-medium shadow-md ${(!isChecked || saving)
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
                  </div>
                </div>

                {/* Public Profile Sharing Section - collapsible on mobile */}
                <div className="border border-gray-200 rounded-lg overflow-hidden md:border-0 md:rounded-none md:overflow-visible">
                  <button
                    type="button"
                    onClick={() => toggleProfileSection('publicProfile')}
                    className="md:hidden w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b border-gray-200 text-left"
                  >
                    <span className="font-semibold text-gray-900 flex items-center gap-2">
                      <LinkIcon size={18} className="text-indigo-600" />
                      Share Profile
                    </span>
                    {profileSectionsOpen.publicProfile ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>
                  <div className={`${profileSectionsOpen.publicProfile ? 'block' : 'hidden'} md:block p-3 sm:p-0 md:p-0`}>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-6 shadow-sm">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
                        <LinkIcon size={20} className="text-slate-600 hidden md:block" />
                        <h3 className="text-base sm:text-lg font-semibold text-slate-800">Public Profile Sharing</h3>
                      </div>

                      <div className="space-y-4">
                        {/* Share Button */}
                        <div className="flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setLoadingPublicProfile(true);
                                let profileId = publicProfileId;

                                // Generate if doesn't exist
                                if (!profileId) {
                                  try {
                                    const response = await api.generatePublicProfileId();
                                    profileId = response?.publicProfileId || response?.data?.publicProfileId;

                                    if (!profileId || typeof profileId !== 'string') {
                                      throw new Error('Invalid response: publicProfileId not found or invalid');
                                    }

                                    setPublicProfileId(profileId);
                                  } catch (generateError) {
                                    throw generateError;
                                  }
                                }

                                // Build public profile URL
                                const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
                                const publicUrl = `${frontendUrl}/profile/${profileId}`;

                                // Copy to clipboard
                                await navigator.clipboard.writeText(publicUrl);
                                showSuccess('Profile link copied. Anyone with this link can view your profile.');
                              } catch (err) {
                                let errorMessage = 'Failed to generate profile link. Please try again.';
                                if (err.response?.data) {
                                  errorMessage = err.response.data.message || err.response.data.error || errorMessage;
                                } else if (err.message) {
                                  errorMessage = err.message;
                                }
                                showError(errorMessage);
                              } finally {
                                setLoadingPublicProfile(false);
                              }
                            }}
                            disabled={loadingPublicProfile}
                            className="w-fit flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {loadingPublicProfile ? (
                              <>
                                <Loader className="animate-spin" size={16} />
                                Generating...
                              </>
                            ) : (
                              'Copy Public Profile Link'
                            )}
                          </button>

                          {publicProfileId && (
                            <p className="text-xs text-gray-500">
                              Your profile link is permanent and will always stay the same.
                            </p>
                          )}
                        </div>

                        {/* Visibility Toggles */}
                        <div className="space-y-3 pt-4 mt-2">
                          <p className="text-sm font-medium text-gray-700 mb-2">Visibility Settings</p>

                          <label className="flex items-center justify-between p-3 bg-gray-50 rounded border border-transparent hover:border-gray-200 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Mail size={16} className="text-gray-500" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">Show Email</span>
                                <p className="text-xs text-gray-500">Allow visitors to see your email address</p>
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
                                  const response = await api.updatePublicProfileSettings({ showEmail: newValue });
                                  if (response?.showEmail !== undefined) {
                                    setPublicProfileShowEmail(response.showEmail);
                                  }
                                } catch (err) {
                                  setPublicProfileShowEmail(oldValue); // Revert on error
                                  const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update email visibility.';
                                  showError(errorMessage);
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </label>

                          <label className="flex items-center justify-between p-3 bg-gray-50 rounded border border-transparent hover:border-gray-200 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Phone size={16} className="text-gray-500" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">Show Phone</span>
                                <p className="text-xs text-gray-500">Allow visitors to see your phone number</p>
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
                                  const response = await api.updatePublicProfileSettings({ showPhone: newValue });
                                  if (response?.showPhone !== undefined) {
                                    setPublicProfileShowPhone(response.showPhone);
                                  }
                                } catch (err) {
                                  setPublicProfileShowPhone(oldValue); // Revert on error
                                  const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update phone visibility.';
                                  showError(errorMessage);
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </form>

              {/* Sticky Save bar - mobile only */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-3 py-3 safe-area-pb">
                <div className="max-w-4xl mx-auto flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => setIsChecked(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
                    />
                    <span className="text-sm text-gray-700">I confirm the information is accurate</span>
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetProfileForm();
                        setIsChecked(false);
                        setValidationErrors({});
                      }}
                      className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      form="editProfileForm"
                      disabled={!isChecked || saving}
                      className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-lg font-medium transition-colors ${(!isChecked || saving)
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader className="animate-spin" size={18} />
                          Saving...
                        </span>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </div>
              </div>
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
            jobFlexibility,
            stats: displayStats,
          }}
          jobs={jobs}
          applications={applications}
          skillsEntries={skillsEntries}
          initialSkills={skillsEntries}
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
    <StudentMobileMenuContext.Provider value={{ mobileMenuOpen, setMobileMenuOpen }}>

      <DashboardLayout
        studentProfile={{
          fullName,
          profilePhoto: profilePhoto || undefined,
          profileImageUrl: profilePhoto || undefined,
          enrollmentId,
          cgpa,
          headline: Headline,
          tagline: Headline,
          school,
          email,
          phone,
          city,
          stateRegion,
          bio,
        }}
      >
        <div className="flex min-h-screen relative">
          {/* Desktop sidebar: visible from md up */}
          <aside
            className="hidden md:block bg-white border-r border-gray-200 fixed h-[calc(100vh-5rem)] overflow-y-auto scrollbar-hide transition-all duration-200 ease-in-out z-40"
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
                      const raw = skill.id === 'leetcode' ? leetcode
                        : skill.id === 'codeforces' ? codeforces
                          : skill.id === 'gfg' ? gfg
                            : skill.id === 'hackerrank' ? hackerrank
                              : skill.id === 'github' ? githubUrl
                                : skill.id === 'instagram' ? instagramUrl
                                  : skill.id === 'youtube' ? youtubeUrl
                                    : skill.id === 'linkedin' ? linkedin
                                      : '';
                      const profileUrl = (raw && typeof raw === 'string') ? raw.trim() : '';
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

          {/* Mobile drawer overlay */}
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              aria-hidden
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
          {/* Mobile drawer sidebar */}
          <aside
            className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white border-r border-gray-200 shadow-xl z-50 md:hidden overflow-y-auto scrollbar-hide transition-transform duration-300 ease-out flex flex-col ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            aria-modal
            aria-label="Navigation menu"
          >
            <div className="p-3 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Navigation</h2>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {(tabs || []).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <div key={tab.id} className="mb-1">
                      <button
                        onClick={() => handleTabClick(tab.id)}
                        className={`w-full flex items-center rounded-lg text-sm font-medium transition-all px-3 py-3 cursor-pointer ${activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {tab.label}
                      </button>
                    </div>
                  );
                })}
              </nav>
              {((visibleSkillsCredentials && visibleSkillsCredentials.length > 0) || (otherProfiles && otherProfiles.length > 0)) && (
                <div className="mt-6">
                  <h2 className="text-base font-bold text-gray-900 mb-3">Skills & Credentials</h2>
                  <nav className="space-y-1">
                    {(visibleSkillsCredentials || []).map((skill) => {
                      const Icon = skill.icon;
                      const raw = skill.id === 'leetcode' ? leetcode : skill.id === 'codeforces' ? codeforces : skill.id === 'gfg' ? gfg : skill.id === 'hackerrank' ? hackerrank : skill.id === 'github' ? githubUrl : skill.id === 'instagram' ? instagramUrl : skill.id === 'youtube' ? youtubeUrl : skill.id === 'linkedin' ? linkedin : '';
                      const profileUrl = (raw && typeof raw === 'string') ? raw.trim() : '';
                      if (!profileUrl) return null;
                      return (
                        <div key={skill.id} className="mb-1">
                          <button
                            onClick={() => handleSkillClick(skill.id)}
                            className="w-full flex items-center rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 px-3 py-2"
                          >
                            <Icon className={`h-4 w-4 mr-2 ${skill.color}`} />
                            {skill.label}
                          </button>
                        </div>
                      );
                    })}
                    {otherProfiles && otherProfiles.length > 0 && otherProfiles.map((profile, index) => {
                      if (!profile.platformName || !profile.profileId) return null;
                      let profileUrl = profile.profileId;
                      if (!profileUrl.startsWith('http')) {
                        const platformLower = profile.platformName.toLowerCase();
                        if (platformLower.includes('kaggle')) profileUrl = `https://www.kaggle.com/${profile.profileId}`;
                        else if (platformLower.includes('codechef')) profileUrl = `https://www.codechef.com/users/${profile.profileId}`;
                        else if (platformLower.includes('atcoder')) profileUrl = `https://atcoder.jp/users/${profile.profileId}`;
                        else if (platformLower.includes('topcoder')) profileUrl = `https://www.topcoder.com/members/${profile.profileId}`;
                      }
                      return (
                        <div key={`other-${index}`} className="mb-1">
                          <button
                            onClick={() => window.open(profileUrl, '_blank')}
                            className="w-full flex items-center rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 px-3 py-2"
                          >
                            <LinkIcon className="h-4 w-4 mr-2 text-purple-600" />
                            {profile.platformName}
                          </button>
                        </div>
                      );
                    })}
                  </nav>
                </div>
              )}
              <div className="mt-auto pt-4 border-t border-gray-300">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center rounded-lg text-sm font-medium text-red-500 hover:bg-red-100 px-3 py-3"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </aside>

          <main
            className="bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 min-h-screen transition-all duration-200 ease-in-out"
            style={{
              marginLeft: isMobile ? 0 : `${sidebarWidth}%`,
              width: isMobile ? '100%' : `${100 - sidebarWidth}%`
            }}
          >
            {/* All pages: reduced side/top/bottom wrapping so content uses more space */}
            <div className="px-3 py-4 sm:px-4 sm:py-5 md:px-5 md:py-6">
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
    </StudentMobileMenuContext.Provider>
  );
}