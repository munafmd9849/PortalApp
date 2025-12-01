import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import AboutMe from './AboutMe';
import DashboardStatsSection from './DashboardStatsSection';
import ApplicationTrackerSection from './ApplicationTrackerSection';
import JobPostingsSection from './JobPostingsSection';
import EducationSection from './EducationSection';
import SkillsSection from './SkillsSection';
import ProjectsSection from './ProjectsSection';
import Achievements from './Achievements';
import StudentFooter from './StudentFooter';
import JobDescription from './JobDescription';
import { Loader } from 'lucide-react';

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
  hideFooter = false
}) => {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  // Convert studentData props to expected format and calculate stats
  const formattedStudentData = studentData ? {
    id: user?.id,
    ...studentData,
    stats: {
      applied: applications.length,
      shortlisted: applications.filter(app => app.status === 'shortlisted').length,
      interviewed: applications.filter(app => app.status === 'interviewed').length,
      offers: applications.filter(app => app.status === 'selected' || app.status === 'offered').length
    }
  } : null;


  //job details modal
  const handleKnowMore = (job) => {
    setSelectedJob(job);
    setIsJobModalOpen(true);
  };

  const handleCloseJobModal = () => {
    setIsJobModalOpen(false);
    setSelectedJob(null);
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

  return (
    <div className="space-y-4 sm:space-y-4 px-2 sm:px-0">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <p className="text-red-800 text-xs sm:text-sm">{error}</p>
        </div>
      )}


      {/* About Me Section */}
      <AboutMe profileData={formattedStudentData} />

      {/* Student Stats Section */}
      <DashboardStatsSection studentData={formattedStudentData} />

      {/* Live Application Tracker Section */}
      <ApplicationTrackerSection 
        applications={applications} 
        onTrackAll={() => window.dispatchEvent(new CustomEvent('navigateToApplications'))}
      />

      {/* Latest Job Postings Section */}
      <JobPostingsSection 
        jobs={jobs} 
        onKnowMore={handleKnowMore} 
        onApply={handleApplyToJob}
        hasApplied={hasApplied}
        applying={applying}
        onExploreMore={() => window.dispatchEvent(new CustomEvent('navigateToJobs'))}
      />

      {/* Education Section */}
      <EducationSection />

      {/* Skills Section */}
      <SkillsSection />

      {/* Projects Section */}
      <ProjectsSection studentId={user?.id} />

      {/* Achievements & Certifications Section */}
      <Achievements />

      {/* Student Footer */}
      {!hideFooter && (
        <div>
          <StudentFooter
            onPlacementPolicy={openPlacementPolicy}
            onContactTeam={contactAdmin}
          />
        </div>
      )}

      {/* Job Description Modal */}
      <JobDescription 
        job={selectedJob}
        isOpen={isJobModalOpen}
        onClose={handleCloseJobModal}
      />
      
    </div>
  );
};

export default DashboardHome;
