import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import AboutMe from './AboutMe';
import DashboardStatsSection from './DashboardStatsSection';
import ApplicationTrackerSection from './ApplicationTrackerSection';
import JobPostingsSection from './JobPostingsSection';
import EducationSection from './EducationSection';
import SkillsSection from './SkillsSection';
import ProjectsSection from './ProjectsSection';
import Achievements from './Achievements';
import Endorsements from './Endorsements';
import StudentFooter from './StudentFooter';
import { getStudentProfile } from '../../../services/students';
import { useNavigate } from 'react-router-dom';
import { 
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';

const DashboardHome = ({ 
  studentData, 
  jobs = [], 
  applications = [], 
  skillsEntries = [],
  loadingJobs = false,
  loadingApplications = false,
  loadingSkills = false,
  handleApplyToJob,
  hasApplied,
  applying = {},
  hideApplicationTracker = false,
  hideJobPostings = false,
  hideFooter = false,
  isAdminView = false,
  profileData: propProfileData = null // Allow passing profile data from parent
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState(propProfileData);
  const [loadingProfile, setLoadingProfile] = useState(!propProfileData);

  // Load profile data to check which sections have data (only if not provided as prop)
  useEffect(() => {
    // If profile data is provided as prop (e.g., from admin view), use it
    if (propProfileData) {
      setProfileData(propProfileData);
      setLoadingProfile(false);
      return;
    }

    const loadProfileData = async () => {
      if (!user?.id) {
        setLoadingProfile(false);
        return;
      }

      try {
        setLoadingProfile(true);
        const profile = await getStudentProfile(user.id);
        setProfileData(profile);
      } catch (error) {
        console.error('Error loading profile data:', error);
        setProfileData(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfileData();
  }, [user?.id, propProfileData]);

  // IMPORTANT: Production behavior — no fallback datasets.
  // UI renders from real API data only (or empty arrays while loading).
  const displayApplications = Array.isArray(applications) ? applications : [];
  const displayJobs = Array.isArray(jobs) ? jobs : [];

  // Use parent's stats (StudentDashboard sends displayStats with funnel enforced: offers <= interviewed <= shortlisted <= applied)
  const stats =
    studentData?.stats && typeof studentData.stats.applied === 'number'
      ? studentData.stats
      : { applied: 0, shortlisted: 0, interviewed: 0, offers: 0 };
  const formattedStudentData = studentData ? {
    id: user?.id,
    ...studentData,
    stats,
  } : null;


  //job details navigation
  const handleKnowMore = (job) => {
    navigate(`/job/${job.id}`);
  };

  // Footer actions
  const openPlacementPolicy = () => {
    window.open(
      'https://docs.google.com/document/d/1umgfuxaRYNI_bqzw70RMrzzG6evMJyKGi1O18AJ7gXU/edit?usp=sharing',
      '_blank'
    );
  };

  const contactAdmin = () => {
    window.location.href = 'mailto:placement@pwioi.edu.in';
  };

  // whether a student meets eligibility criteria
  const meetsEligibility = (eligibilityCriteria) => {
    if (!formattedStudentData?.cgpa || !eligibilityCriteria) return true;
    
    // CGPA check 
    const match = eligibilityCriteria.match(/CGPA\s*>=\s*(\d+\.?\d*)/i);
    if (match) {
      const requiredCGPA = parseFloat(match[1]);
      return formattedStudentData.cgpa >= requiredCGPA;
    }
    
    return true; // If we can't parse criteria, assume eligible
  };

  // Check if application deadline has passed
  const isDeadlinePassed = (job) => {
    if (!job) return false;
    const deadline = job.applicationDeadline || job.deadline;
    if (!deadline) return false; // No deadline set, allow application
    
    const deadlineDate = new Date(deadline);
    const now = new Date();
    return now > deadlineDate;
  };

  // Check if student's CGPA meets job requirement
  const meetsCgpaRequirement = (job) => {
    const jobMinCgpa = job.minCgpa || job.cgpaRequirement;
    const studentCgpa = formattedStudentData?.cgpa;
    if (!jobMinCgpa || !studentCgpa) {
      // If no requirement specified or student hasn't entered CGPA, allow application
      return true;
    }

    // Parse student CGPA
    const studentCgpaNum = parseFloat(studentCgpa);
    if (isNaN(studentCgpaNum)) {
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
    return studentCgpaNum >= requiredCgpa;
  };

  // Check if student's Year of Passing (derived from batch) meets job YOP requirement
  const meetsYopRequirement = (job) => {
    const jobYop = job?.yop;
    const studentBatch = formattedStudentData?.batch;

    if (!jobYop || !studentBatch) {
      return true;
    }

    const jobYopInt = parseInt(String(jobYop).trim(), 10);
    if (Number.isNaN(jobYopInt)) {
      return true;
    }

    const parts = String(studentBatch)
      .split('-')
      .map((p) => p.trim())
      .filter(Boolean);
    const endPart = parts.length > 1 ? parts[1] : parts[0];
    const endNum = endPart ? parseInt(endPart, 10) : NaN;

    if (Number.isNaN(endNum)) {
      return true;
    }

    const studentYop = endNum < 100 ? 2000 + endNum : endNum;
    return studentYop <= jobYopInt;
  };

  // ----------------------------
  // Dashboard: live application mapping
  // Only show non-terminal applications and map labels to Applied / Shortlisted
  // ----------------------------
  const isLiveApplication = (app) => {
    // Exclude final terminal states
    const finalStatus = (app.finalStatus || app.status || '').toString().toUpperCase();
    if (finalStatus === 'SELECTED' || finalStatus === 'REJECTED') return false;

    const interviewStatus = (app.interviewStatus || '').toString();
    if (interviewStatus.startsWith('REJECTED_IN_ROUND_')) return false;

    // Treat interview-in-progress as past (exclude). If you want to keep them, remove this check.
    if (interviewStatus && interviewStatus.toUpperCase().includes('IN_PROGRESS')) return false;

    return true;
  };

  const getTrackerLabel = (app) => {
    const screening = (app.screeningStatus || '').toString().toUpperCase();
    const requiresScreening = app.job?.requiresScreening !== false; // default true

    const shortlistedStatuses = ['RESUME_SELECTED', 'SCREENING_SELECTED', 'TEST_SELECTED', 'INTERVIEW_ELIGIBLE'];
    if (shortlistedStatuses.includes(screening)) return 'Shortlisted';
    if (!requiresScreening && screening === 'APPLIED') return 'Shortlisted'; // auto-shortlist when no screening
    return 'Applied';
  };

  const liveApplications = (displayApplications || [])
    .filter(isLiveApplication)
    .map(a => ({ ...a, trackerLabel: getTrackerLabel(a) }));

  const getStatusColor = (status) => {
    switch (status) {
      case 'applied': return 'text-blue-600 bg-blue-100';
      case 'shortlisted': return 'text-yellow-600 bg-yellow-100';
      case 'selected': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'applied': return <Clock size={16} />;
      case 'shortlisted': return <AlertCircle size={16} />;
      case 'selected': return <CheckCircle size={16} />;
      case 'rejected': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };



  return (
    <div className="space-y-3 md:space-y-4 min-w-0 overflow-hidden">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 md:p-3">
          <p className="text-red-800 text-xs md:text-sm break-words">{error}</p>
        </div>
      )}


      {/* About Me Section */}
      <AboutMe profileData={formattedStudentData} />

      {/* Student Stats Section */}
      <DashboardStatsSection studentData={formattedStudentData} />

      {/* Live Application Tracker Section */}
      {!hideApplicationTracker && (
        <ApplicationTrackerSection 
          applications={liveApplications} 
          onTrackAll={() => window.dispatchEvent(new CustomEvent('navigateToApplications', { detail: { view: 'current' } }))}
          onRowClick={(jobId) => window.dispatchEvent(new CustomEvent('navigateToApplications', { detail: { view: 'current', jobId } }))}
        />
      )}

      {/* Latest Job Postings Section */}
      {!hideJobPostings && (
        <JobPostingsSection 
          jobs={displayJobs} 
          onKnowMore={handleKnowMore} 
          onApply={handleApplyToJob}
          hasApplied={hasApplied}
          applying={applying}
          onExploreMore={() => window.dispatchEvent(new CustomEvent('navigateToJobs'))}
          meetsCgpaRequirement={meetsCgpaRequirement}
          isDeadlinePassed={isDeadlinePassed}
          meetsYopRequirement={meetsYopRequirement}
          studentCgpa={formattedStudentData?.cgpa}
          studentBatch={formattedStudentData?.batch}
          studentBacklogs={formattedStudentData?.backlogs}
        />
      )}

      {/* Profile sections render with real data only; they handle their own empty states */}
      <EducationSection isAdminView={isAdminView} />
      <SkillsSection isAdminView={isAdminView} />
      <ProjectsSection studentId={user?.id} isAdminView={isAdminView} />
      <Achievements isAdminView={isAdminView} />
      <Endorsements 
        isAdminView={isAdminView} 
        studentId={isAdminView && formattedStudentData?.id ? formattedStudentData.id : undefined}
        profileData={profileData}
      />

      {/* Student Footer */}
      {!hideFooter && (
        <div>
          <StudentFooter
            onPlacementPolicy={openPlacementPolicy}
            onContactTeam={contactAdmin}
          />
        </div>
      )}

    </div>
  );
};

export default DashboardHome;
