/**
 * JobContent Component
 * Shared content component for JobDescriptionModal and JobDetailsView
 * Contains all the tab content and business logic
 */

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  FaBriefcase,
  FaMapMarkerAlt,
  FaBuilding,
  FaMoneyBillWave,
  FaExternalLinkAlt,
  FaTasks,
  FaEnvelopeOpen,
  FaClipboardList,
  FaPhone,
  FaUserCheck,
  FaUsers,
  FaCheckCircle,
  FaTimes,
} from 'react-icons/fa';

// Register GSAP ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * HTML Sanitization Utility
 * Install DOMPurify for production: npm install dompurify
 * For now, uses basic HTML escaping
 */
function sanitizeHTML(html) {
  if (!html) return '';
  
  // Try to use DOMPurify if available
  try {
    if (typeof window !== 'undefined' && window.DOMPurify) {
      return window.DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        ALLOWED_ATTR: [],
      });
    }
  } catch (e) {
    // DOMPurify not available, fall through to basic sanitization
  }
  
  // Basic HTML escaping (fallback)
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }
  
  // Server-side: basic escape
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Default timeline steps (fallback when no job-specific data)
const defaultInterviewTimeline = [
  {
    label: "Round 1: Aptitude Test",
    description: "Initial screening test covering quantitative, logical, and verbal reasoning. This round assesses your fundamental problem-solving abilities and analytical thinking.",
    color: "bg-blue-500",
    number: "1",
    icon: <FaClipboardList className="text-white" size={20} />,
  },
  {
    label: "Round 2: Technical Interview",
    description: "In-depth discussion of technical skills, problem-solving, and domain knowledge. Be prepared to demonstrate your coding abilities and technical expertise.",
    color: "bg-purple-500",
    number: "2",
    icon: <FaPhone className="text-white" size={20} />,
  },
  {
    label: "Round 3: HR Interview",
    description: "Evaluation of cultural fit, communication skills, and career aspirations. This round focuses on understanding your personality, values, and long-term goals.",
    color: "bg-green-500",
    number: "3",
    icon: <FaTasks className="text-white" size={20} />,
  },
  {
    label: "Round 4: Group Discussion",
    description: "Assessment of teamwork, leadership, and communication abilities. You'll participate in group activities to demonstrate your collaborative skills.",
    color: "bg-yellow-500",
    number: "4",
    icon: <FaUserCheck className="text-white" size={20} />,
  },
  {
    label: "Round 5: Final Decision",
    description: "Selection committee review and final decision making. The hiring team evaluates all candidates and makes the final selection.",
    color: "bg-indigo-500",
    number: "5",
    icon: <FaUsers className="text-white" size={20} />,
  },
  {
    label: "OFFER",
    description: "Formal job offer extended to selected candidates. Congratulations! You'll receive the official offer letter with compensation and benefits details.",
    color: "bg-teal-500",
    number: "6",
    icon: <FaCheckCircle className="text-white" size={20} />,
  },
  {
    label: "Onboarding",
    description: "Orientation and integration process for new hires. Welcome to the team! You'll go through orientation, training, and meet your colleagues.",
    color: "bg-red-500",
    number: "7",
    icon: <FaEnvelopeOpen className="text-white" size={20} />,
  },
];

// Color palette for dynamic rounds
const roundColors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-red-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-cyan-500",
];

// Icon mapping for common round types
const getRoundIcon = (label) => {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("aptitude") || lowerLabel.includes("test") || lowerLabel.includes("written")) {
    return <FaClipboardList className="text-white" size={18} />;
  }
  if (lowerLabel.includes("technical") || lowerLabel.includes("coding") || lowerLabel.includes("programming")) {
    return <FaPhone className="text-white" size={18} />;
  }
  if (lowerLabel.includes("hr") || lowerLabel.includes("human resource")) {
    return <FaTasks className="text-white" size={18} />;
  }
  if (lowerLabel.includes("group") || lowerLabel.includes("discussion") || lowerLabel.includes("gd")) {
    return <FaUserCheck className="text-white" size={18} />;
  }
  if (lowerLabel.includes("final") || lowerLabel.includes("decision")) {
    return <FaUsers className="text-white" size={18} />;
  }
  if (lowerLabel.includes("offer") || lowerLabel.includes("selection")) {
    return <FaCheckCircle className="text-white" size={18} />;
  }
  if (lowerLabel.includes("onboarding") || lowerLabel.includes("orientation")) {
    return <FaEnvelopeOpen className="text-white" size={18} />;
  }
  return <FaTasks className="text-white" size={18} />;
};


/**
 * Format salary for display
 */
function formatSalary(salary) {
  if (!salary) return "Not specified";
  if (typeof salary === "number") {
    return `₹${(salary / 100000).toFixed(1)} LPA`;
  }
  return salary;
}

/**
 * Format date for display
 */
function formatDriveDate(driveDate) {
  if (!driveDate) return new Date().toLocaleDateString('en-GB');
  try {
    const date = new Date(driveDate);
    return date.toLocaleDateString('en-GB');
  } catch (err) {
    return new Date().toLocaleDateString('en-GB');
  }
}

/**
 * JobContent Component
 * Props: job, activeTab, onTabChange, showFooter, onClose, onApply, onShare, onPrint
 */
const JobContent = React.memo(({
  hideHeader = false, // New prop to hide header when used in page mode 
  job, 
  activeTab, 
  onTabChange,
  showFooter = true,
  onClose,
  onApply,
  onShare,
  onPrint,
}) => {
  const [now, setNow] = useState(Date.now());

  // Update time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Normalize job data from multiple sources
  const displayJob = useMemo(() => {
    if (!job) return null;
    
    return {
      ...job,
      // Company
      companyName: job.company?.name || job.companyName || job.company || "Company Name",
      logoUrl: job.company?.logoUrl || job.company?.logo || job.logoUrl,
      website: job.company?.website || job.website || job.companyWebsite,
      // Skills
      skills: job.requiredSkills || job.skillsRequired || job.skills || [],
      // Salary
      salary: job.salary || job.stipend || job.ctc || job.salaryRange,
      // Dates
      deadline: job.driveDate || job.applicationDeadline,
      // CGPA
      minCgpa: job.minCgpa || job.cgpaRequirement,
      // Eligibility Criteria
      qualification: job.qualification,
      specialization: job.specialization,
      yop: job.yop || job.yearOfPassing,
      gapAllowed: job.gapAllowed,
      gapYears: job.gapYears,
      backlogs: job.backlogs,
      // Additional fields
      reportingTime: job.reportingTime || "9:00 AM",
      documentsRequired: job.documentsRequired || "Resume, ID Proof, Academic Certificates",
      dressCode: job.dressCode || "Formal",
    };
  }, [job]);

  if (!displayJob) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No job data available</p>
      </div>
    );
  }

  // Calculate countdown
  const countdown = useMemo(() => {
    const deadline = displayJob.deadline 
      ? new Date(displayJob.deadline).getTime()
      : Date.now() + 3 * 24 * 60 * 60 * 1000;
    
    const diff = deadline - now;
    if (diff <= 0) return "Deadline passed";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { days, hours, minutes, seconds };
  }, [displayJob.deadline, now]);

  // Extract skills
  const skillsRequired = useMemo(() => {
    const skills = displayJob.skills;
    
    // If it's already an array, return it
    if (Array.isArray(skills) && skills.length > 0) {
      // Filter out any stringified arrays and flatten if needed
      return skills.flatMap(skill => {
        if (typeof skill === 'string' && skill.trim().startsWith('[') && skill.trim().endsWith(']')) {
          // It's a JSON string array, parse it
          try {
            const parsed = JSON.parse(skill);
            return Array.isArray(parsed) ? parsed : [skill];
          } catch {
            return [skill];
          }
        }
        return [skill];
      }).filter(skill => skill && skill.toString().trim().length > 0);
    }
    
    // If it's a string, check if it's a JSON array
    if (typeof skills === 'string' && skills.trim()) {
      const trimmed = skills.trim();
      
      // Check if it's a JSON array string like ["java", "python"]
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter(skill => skill && skill.toString().trim().length > 0);
          }
        } catch {
          // Not valid JSON, fall through to string splitting
        }
      }
      
      // Split by common delimiters
      return trimmed
        .split(/[,;•\n\r]/)
        .map(skill => skill.trim().replace(/^["']|["']$/g, '')) // Remove quotes
        .filter(skill => skill.length > 0);
    }
    
    // Default skills
    return [
      "Problem Solving",
      "JavaScript & ES6+",
      "React.js & Node.js",
      "Git & Version Control",
      "Database Management",
      "Team Collaboration",
      "REST APIs",
      "Agile Methodology",
    ];
  }, [displayJob.skills]);

  // Extract job description with mock data
  const jobDescription = useMemo(() => {
    if (displayJob.jobDescription && typeof displayJob.jobDescription === 'string' && displayJob.jobDescription.trim()) {
      return displayJob.jobDescription;
    }
    
    // Mock job description
    return `We are seeking a talented and motivated ${displayJob.jobTitle || 'Software Engineer'} to join our dynamic team. In this role, you will work on cutting-edge projects, collaborate with experienced professionals, and contribute to innovative solutions that drive business growth.

As a key member of our team, you will have the opportunity to:
• Work on challenging projects that push the boundaries of technology
• Collaborate with cross-functional teams including product managers, designers, and other engineers
• Contribute to architectural decisions and technical strategy
• Mentor junior developers and share knowledge with the team
• Stay updated with the latest industry trends and best practices

This position offers excellent growth opportunities, competitive compensation, and a supportive work environment where your ideas and contributions are valued. We are looking for someone who is passionate about technology, eager to learn, and ready to make a significant impact.`;
  }, [displayJob.jobDescription, displayJob.jobTitle]);

  // Extract responsibilities
  const responsibilities = useMemo(() => {
    let items = [];
    
    if (displayJob.responsibilities && typeof displayJob.responsibilities === 'string' && displayJob.responsibilities.trim()) {
      items = displayJob.responsibilities
        .split(/[•\n\r;]/)
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .map(item => item.replace(/^[-•*]\s*/, ''));
    } else if (Array.isArray(displayJob.responsibilities) && displayJob.responsibilities.length > 0) {
      items = displayJob.responsibilities;
    } else if (displayJob.jobDescription && typeof displayJob.jobDescription === 'string' && displayJob.jobDescription.trim()) {
      items = displayJob.jobDescription
        .split(/[•\n\r;]/)
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .map(item => item.replace(/^[-•*]\s*/, ''));
    } else {
      // Enhanced mock responsibilities
      items = [
        "Design, develop, and maintain scalable software applications using modern technologies",
        "Collaborate with cross-functional teams including product managers, designers, and QA engineers",
        "Write clean, efficient, and well-documented code following industry best practices",
        "Participate in code reviews, technical discussions, and knowledge sharing sessions",
        "Debug, troubleshoot, and resolve software defects and performance issues",
        "Contribute to architectural decisions and help shape technical strategy",
        "Stay updated with emerging technologies and industry trends",
        "Mentor junior developers and provide technical guidance when needed"
      ];
    }
    
    return items;
  }, [displayJob.responsibilities, displayJob.jobDescription]);

  // Generate interview timeline
  const interviewTimeline = useMemo(() => {
    let rounds = [];
    
    // Method 1: Check for interviewRounds array
    if (displayJob.interviewRounds && Array.isArray(displayJob.interviewRounds) && displayJob.interviewRounds.length > 0) {
      rounds = displayJob.interviewRounds.map((round, index) => ({
        label: round.title || `Round ${index + 1}`,
        description: round.detail || round.description || "Interview round details will be shared.",
        color: roundColors[index % roundColors.length],
        number: String(index + 1),
        icon: getRoundIcon(round.title || `Round ${index + 1}`),
      }));
    }
    // Method 2: Check for baseRoundDetails and extraRounds
    else if (displayJob.baseRoundDetails || displayJob.extraRounds) {
      const baseRounds = Array.isArray(displayJob.baseRoundDetails) ? displayJob.baseRoundDetails : [];
      const extraRounds = Array.isArray(displayJob.extraRounds) ? displayJob.extraRounds : [];
      
      // Process base rounds
      baseRounds.forEach((round, index) => {
        if (round && typeof round === 'string' && round.trim()) {
          rounds.push({
            label: `Round ${index + 1}`,
            description: round.trim(),
            color: roundColors[index % roundColors.length],
            number: String(index + 1),
            icon: getRoundIcon(round),
          });
        } else if (round && typeof round === 'object' && round.title) {
          rounds.push({
            label: round.title || `Round ${index + 1}`,
            description: round.detail || round.description || "Interview round details will be shared.",
            color: roundColors[index % roundColors.length],
            number: String(index + 1),
            icon: getRoundIcon(round.title),
          });
        }
      });
      
      // Process extra rounds
      extraRounds.forEach((round, index) => {
        if (round && typeof round === 'object') {
          rounds.push({
            label: round.title || `Round ${baseRounds.length + index + 1}`,
            description: round.detail || round.description || "Interview round details will be shared.",
            color: roundColors[(baseRounds.length + index) % roundColors.length],
            number: String(baseRounds.length + index + 1),
            icon: getRoundIcon(round.title),
          });
        }
      });
    }
    // Method 3: Parse from requirements field
    else if (displayJob.requirements && typeof displayJob.requirements === 'string') {
      const requirementsText = displayJob.requirements;
      const roundPatterns = [
        /Round\s*(\d+)[:]\s*([^\n\r]+)/gi,
        /(\d+)[.]\s*([^\n\r]+)/gi,
        /([A-Z][^:]+):\s*([^\n\r]+)/g,
      ];
      
      let foundRounds = [];
      roundPatterns.forEach(pattern => {
        const matches = [...requirementsText.matchAll(pattern)];
        matches.forEach((match) => {
          if (match[1] && match[2]) {
            foundRounds.push({
              label: match[1].trim(),
              description: match[2].trim(),
            });
          }
        });
      });
      
      if (foundRounds.length > 0) {
        rounds = foundRounds.map((round, index) => ({
          label: round.label || `Round ${index + 1}`,
          description: round.description || "Interview round details will be shared.",
          color: roundColors[index % roundColors.length],
          number: String(index + 1),
          icon: getRoundIcon(round.label),
        }));
      }
    }
    
    // If we found rounds, add Offer and Onboarding
    if (rounds.length > 0) {
      rounds.push({
        label: "OFFER",
        description: "Formal job offer extended to selected candidates.",
        color: "bg-teal-500",
        number: String(rounds.length + 1),
        icon: <FaCheckCircle className="text-white" size={18} />,
      });
      rounds.push({
        label: "Onboarding",
        description: "Orientation and integration process for new hires.",
        color: "bg-red-500",
        number: String(rounds.length + 1),
        icon: <FaEnvelopeOpen className="text-white" size={18} />,
      });
      return rounds;
    }
    
    // Fallback to default timeline
    return defaultInterviewTimeline;
  }, [displayJob]);

  // Handle share
  const handleShare = () => {
    if (navigator.share && displayJob.id) {
      navigator.share({
        title: `${displayJob.jobTitle} - ${displayJob.companyName}`,
        text: `Check out this job opportunity: ${displayJob.jobTitle} at ${displayJob.companyName}`,
        url: window.location.href,
      }).catch(err => console.log('Error sharing:', err));
    } else if (onShare) {
      onShare(displayJob);
    }
  };

  // Handle print
  const handlePrint = () => {
    if (onPrint) {
      onPrint(displayJob);
    } else {
      window.print();
    }
  };

  return (
    <>
      {/* Header - Premium design */}
      {!hideHeader && (
      <div 
        className="flex items-center justify-between p-6 md:p-8 border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50"
        style={{
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="flex items-center gap-5">
          {displayJob.logoUrl ? (
            <div className="relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <img
                src={displayJob.logoUrl}
                alt={displayJob.companyName}
                className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl object-contain border-2 border-white/30 shadow-2xl transform group-hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextElementSibling) {
                    e.target.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
            </div>
          ) : null}
          <div
            className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 text-white shadow-2xl transform hover:scale-110 transition-transform duration-300 ${displayJob.logoUrl ? 'hidden' : ''}`}
            style={{
              boxShadow: '0 10px 30px rgba(139, 92, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            }}
          >
            {displayJob.companyName?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
              {displayJob.jobTitle || "Job Position"}
            </h2>
            <p className="text-gray-600 font-semibold flex items-center gap-2 text-sm md:text-base">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {displayJob.companyName}
              </span>
              {displayJob.location && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{displayJob.location}</span>
                </>
              )}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-3 rounded-2xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-300 group"
            aria-label="Close"
          >
            <FaTimes size={22} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        )}
      </div>
      )}

      {/* Tabs - Premium design */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex px-6 md:px-8 overflow-x-auto scrollbar-hide">
          <button
            className={`px-6 py-4 font-bold text-sm md:text-base transition-all duration-300 relative group ${
              activeTab === "overview" 
                ? "text-blue-600" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => onTabChange("overview")}
          >
            <span className="relative z-10">Overview</span>
            {activeTab === "overview" && (
              <>
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 rounded-t-full shadow-lg"></span>
                <span className="absolute inset-0 bg-blue-50/50 rounded-t-xl"></span>
              </>
            )}
            <span className="absolute inset-0 bg-gray-50 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </button>
          <button
            className={`px-6 py-4 font-bold text-sm md:text-base transition-all duration-300 relative group ${
              activeTab === "requirements" 
                ? "text-blue-600" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => onTabChange("requirements")}
          >
            <span className="relative z-10">Requirements</span>
            {activeTab === "requirements" && (
              <>
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 rounded-t-full shadow-lg"></span>
                <span className="absolute inset-0 bg-blue-50/50 rounded-t-xl"></span>
              </>
            )}
            <span className="absolute inset-0 bg-gray-50 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </button>
          <button
            className={`px-6 py-4 font-bold text-sm md:text-base transition-all duration-300 relative group ${
              activeTab === "process" 
                ? "text-blue-600" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => onTabChange("process")}
          >
            <span className="relative z-10">Process</span>
            {activeTab === "process" && (
              <>
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 rounded-t-full shadow-lg"></span>
                <span className="absolute inset-0 bg-blue-50/50 rounded-t-xl"></span>
              </>
            )}
            <span className="absolute inset-0 bg-gray-50 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "overview" && (
          <OverviewTab 
            displayJob={displayJob}
            countdown={countdown}
            responsibilities={responsibilities}
            jobDescription={jobDescription}
            formatSalary={formatSalary}
            formatDriveDate={formatDriveDate}
          />
        )}

        {activeTab === "requirements" && (
          <RequirementsTab 
            displayJob={displayJob}
            skillsRequired={skillsRequired}
          />
        )}

        {activeTab === "process" && (
          <ProcessTab 
            displayJob={displayJob}
            interviewTimeline={interviewTimeline}
          />
        )}
      </div>

      {/* Footer - Enhanced styling */}
      {showFooter && (
        <div className="border-t p-5 bg-gradient-to-r from-gray-50 to-white shadow-inner">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              {displayJob.website && (
                <a
                  href={displayJob.website.startsWith('http') ? displayJob.website : `https://${displayJob.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 group"
                >
                  <FaExternalLinkAlt size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /> 
                  <span>{displayJob.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
            </div>
            <div className="flex gap-3 flex-wrap justify-center sm:justify-end">
              {onPrint && (
                <button
                  onClick={handlePrint}
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
                >
                  Print
                </button>
              )}
              {onShare && (
                <button
                  onClick={handleShare}
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
                >
                  Share
                </button>
              )}
              {onApply && (
                <button
                  onClick={() => onApply(displayJob)}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold text-sm shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  Apply Now
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

JobContent.displayName = 'JobContent';

// Overview Tab Component - Premium Design
const OverviewTab = React.memo(({ displayJob, countdown, responsibilities, jobDescription, formatSalary, formatDriveDate }) => (
  <div className="space-y-6 md:space-y-8">
    {/* Key Details - Premium glassmorphism cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <div 
        className="group relative p-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/50 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer overflow-hidden"
        style={{
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative z-10 flex items-center gap-3 text-gray-700 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <FaBriefcase className="text-white" size={18} />
          </div>
          <span className="text-sm font-bold uppercase tracking-wide">Job Type</span>
        </div>
        <p className="relative z-10 font-semibold text-gray-900 text-lg md:text-xl">{displayJob.jobType || "Full-time"}</p>
      </div>
      <div 
        className="group relative p-6 rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-green-100/50 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer overflow-hidden"
        style={{
          boxShadow: '0 4px 20px rgba(34, 197, 94, 0.15)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative z-10 flex items-center gap-3 text-gray-700 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
            <FaBuilding className="text-white" size={18} />
          </div>
          <span className="text-sm font-bold uppercase tracking-wide">Work Mode</span>
        </div>
        <p className="relative z-10 font-semibold text-gray-900 text-lg md:text-xl">{displayJob.workMode || "Onsite"}</p>
      </div>
      <div 
        className="group relative p-6 rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-red-100/50 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer overflow-hidden"
        style={{
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative z-10 flex items-center gap-3 text-gray-700 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
            <FaMapMarkerAlt className="text-white" size={18} />
          </div>
          <span className="text-sm font-bold uppercase tracking-wide">Location</span>
        </div>
        <p className="relative z-10 font-semibold text-gray-900 text-lg md:text-xl">{displayJob.location || "Bangalore"}</p>
      </div>
      <div 
        className="group relative p-6 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-purple-100/50 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer overflow-hidden"
        style={{
          boxShadow: '0 4px 20px rgba(168, 85, 247, 0.15)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative z-10 flex items-center gap-3 text-gray-700 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
            <FaMoneyBillWave className="text-white" size={18} />
          </div>
          <span className="text-sm font-bold uppercase tracking-wide">CTC</span>
        </div>
        <p className="relative z-10 font-semibold text-gray-900 text-lg md:text-xl">{formatSalary(displayJob.salary)}</p>
      </div>
    </div>

    {/* Countdown Timer - Enhanced */}
    <div className="bg-gradient-to-r from-blue-50 via-blue-100/50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-base md:text-lg mb-1">Application Deadline</h3>
          <p className="text-sm text-gray-600 font-medium">
            Drive Date: <span className="text-gray-800">{formatDriveDate(displayJob.driveDate)}</span>
          </p>
        </div>
        <div className="text-right w-full sm:w-auto">
          {countdown === "Deadline passed" ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold">
              <span>⏰</span>
              <span>Deadline passed</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="bg-white rounded-xl px-4 py-3 shadow-lg border border-gray-100 min-w-[70px]">
                  <span className="text-2xl font-bold text-gray-900 block">{countdown.days}</span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Days</span>
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-400">:</span>
              <div className="text-center">
                <div className="bg-white rounded-xl px-4 py-3 shadow-lg border border-gray-100 min-w-[70px]">
                  <span className="text-2xl font-bold text-gray-900 block">{countdown.hours}</span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Hours</span>
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-400">:</span>
              <div className="text-center">
                <div className="bg-white rounded-xl px-4 py-3 shadow-lg border border-gray-100 min-w-[70px]">
                  <span className="text-2xl font-bold text-gray-900 block">{countdown.minutes}</span>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Mins</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Description */}
    <div>
      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Job Description</h3>
      <div 
        className="p-6 md:p-8 rounded-2xl border border-gray-200 bg-gray-50"
        style={{
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div 
          className="text-gray-700 prose prose-sm md:prose-base max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 whitespace-pre-line"
          dangerouslySetInnerHTML={{ 
            __html: sanitizeHTML(jobDescription) 
          }}
        />
      </div>
    </div>

    {/* Responsibilities */}
    <div>
      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Responsibilities</h3>
      <div 
        className="p-6 md:p-8 rounded-2xl border border-gray-200 bg-gray-50"
        style={{
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <ul className="list-none space-y-3">
          {responsibilities.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 text-gray-700">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mt-2 flex-shrink-0 shadow-md"></span>
              <span className="font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
));

OverviewTab.displayName = 'OverviewTab';

// Requirements Tab Component - Premium Design
const RequirementsTab = React.memo(({ displayJob, skillsRequired }) => (
  <div className="space-y-6 md:space-y-8">
    {/* Skills - Premium badges */}
    <div>
      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Required Skills</h3>
      <div className="flex flex-wrap gap-3">
        {skillsRequired.map((skill, index) => {
          // Ensure skill is displayed as a string, not as an array or object
          const skillText = typeof skill === 'string' 
            ? skill 
            : (Array.isArray(skill) 
              ? skill.join(', ') 
              : String(skill || ''));
          return (
            <span 
              key={index} 
              className="group relative px-4 py-2 rounded-xl text-sm font-bold text-blue-700 border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 transition-all duration-300 hover:scale-110 hover:shadow-xl cursor-pointer overflow-hidden"
              style={{
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)',
              }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative z-10">{skillText}</span>
            </span>
          );
        })}
      </div>
    </div>

    {/* Eligibility - Premium design with mock data */}
    <div>
      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">Eligibility Criteria</h3>
      <div 
        className="p-6 md:p-8 rounded-2xl border border-gray-200 bg-gray-50"
        style={{
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Qualification */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all duration-300">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mt-0.5 flex-shrink-0 shadow-lg">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <div>
                <p className="font-semibold text-gray-900 mb-1">Qualification</p>
              <p className="text-sm text-gray-600">{displayJob.qualification || "B.E./B.Tech, M.E./M.Tech, MCA, or equivalent degree"}</p>
            </div>
          </div>
          
          {/* Specialization */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all duration-300">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mt-0.5 flex-shrink-0 shadow-lg">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <div>
                <p className="font-semibold text-gray-900 mb-1">Specialization</p>
              <p className="text-sm text-gray-600">{displayJob.specialization || "Computer Science, Information Technology, Software Engineering, or related fields"}</p>
            </div>
          </div>
          
          {/* Minimum CGPA/Percentage */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all duration-300">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mt-0.5 flex-shrink-0 shadow-lg">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <div>
                <p className="font-semibold text-gray-900 mb-1">Minimum CGPA/Percentage</p>
              <p className="text-sm text-gray-600">{displayJob.minCgpa || "7.0 CGPA or 70% aggregate"}</p>
            </div>
          </div>
          
          {/* Year of Passing */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all duration-300">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mt-0.5 flex-shrink-0 shadow-lg">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <div>
                <p className="font-semibold text-gray-900 mb-1">Year of Passing</p>
              <p className="text-sm text-gray-600">{displayJob.yop || displayJob.yearOfPassing || "2024, 2025, or 2026"}</p>
            </div>
          </div>
          
          {/* Year Gaps */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all duration-300">
            <div className={`w-8 h-8 rounded-full ${(displayJob.gapAllowed === 'Allowed' || !displayJob.gapAllowed) ? 'bg-gradient-to-br from-green-400 to-green-500' : 'bg-gradient-to-br from-red-400 to-red-500'} flex items-center justify-center mt-0.5 flex-shrink-0 shadow-lg`}>
              <span className="text-white text-sm font-bold">
                {(displayJob.gapAllowed === 'Allowed' || !displayJob.gapAllowed) ? '✓' : '✗'}
              </span>
            </div>
            <div>
                <p className="font-semibold text-gray-900 mb-1">Year Gaps</p>
              <p className="text-sm text-gray-600">
                {displayJob.gapAllowed || "Allowed (Max 2 years)"}
                {displayJob.gapAllowed === 'Allowed' && displayJob.gapYears && ` (Max ${displayJob.gapYears} years)`}
              </p>
            </div>
          </div>
          
          {/* Active Backlogs */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all duration-300">
            <div className={`w-8 h-8 rounded-full ${(displayJob.backlogs === 'Allowed' || !displayJob.backlogs) ? 'bg-gradient-to-br from-green-400 to-green-500' : 'bg-gradient-to-br from-red-400 to-red-500'} flex items-center justify-center mt-0.5 flex-shrink-0 shadow-lg`}>
              <span className="text-white text-sm font-bold">
                {(displayJob.backlogs === 'Allowed' || !displayJob.backlogs) ? '✓' : '✗'}
              </span>
            </div>
            <div>
                <p className="font-semibold text-gray-900 mb-1">Active Backlogs</p>
              <p className="text-sm text-gray-600">{displayJob.backlogs || "Not Allowed (Must have cleared all backlogs)"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
));

RequirementsTab.displayName = 'RequirementsTab';

// Process Tab Component with Enhanced Vertical Timeline and Staggered Animations
const ProcessTab = React.memo(({ displayJob, interviewTimeline }) => {
  const timelineContainerRef = React.useRef(null);
  const timelineLineRef = React.useRef(null);
  const timelineLineMobileRef = React.useRef(null);
  const stepRefs = React.useRef([]);
  const stepTimelines = React.useRef([]);
  const visibleStepsRef = React.useRef(new Set());

  React.useEffect(() => {
    if (!timelineContainerRef.current || interviewTimeline.length === 0) return;

    const timelineContainer = timelineContainerRef.current;
    const timelineLine = timelineLineRef.current;
    const timelineLineMobile = timelineLineMobileRef.current;
    const steps = stepRefs.current.filter(Boolean);
    const totalSteps = interviewTimeline.length;

    // Find the scrollable container (modal content area)
    // The scroll container is the parent div with overflow-y-auto
    let scrollElement = null;
    
    // Find the scrollable parent container
    let parent = timelineContainer.parentElement;
    while (parent && parent !== document.body) {
      const style = window.getComputedStyle(parent);
      const hasOverflow = style.overflowY === 'auto' || style.overflowY === 'scroll' || 
                         style.overflow === 'auto' || style.overflow === 'scroll' ||
                         parent.classList.contains('overflow-y-auto') ||
                         parent.classList.contains('overflow-auto');
      
      if (hasOverflow && parent.scrollHeight > parent.clientHeight) {
        scrollElement = parent;
        break;
      }
      parent = parent.parentElement;
    }

    // Function to calculate and set timeline height
    function setTimelineHeight() {
      if (steps.length === 0) return;

      const firstStep = steps[0];
      const lastStep = steps[steps.length - 1];
      const firstStepIcon = firstStep?.querySelector('.step-icon-wrapper');
      const lastStepIcon = lastStep?.querySelector('.step-icon-wrapper');

      if (!firstStepIcon || !lastStepIcon) return;

      const containerRect = timelineContainer.getBoundingClientRect();
      const firstIconRect = firstStepIcon.getBoundingClientRect();
      const lastIconRect = lastStepIcon.getBoundingClientRect();

      const firstIconCenter = firstIconRect.top - containerRect.top + (firstIconRect.height / 2);
      const lastIconBottom = lastIconRect.top - containerRect.top + lastIconRect.height;

      const totalHeight = lastIconBottom - firstIconCenter;

      gsap.set([timelineLine, timelineLineMobile], {
        height: totalHeight,
        top: firstIconCenter,
        transformOrigin: "top center"
      });
    }

    // Set initial states for all steps
    steps.forEach((step, index) => {
      if (!step) return;
      const stepIcon = step.querySelector('.step-icon-wrapper');
      const stepNumber = step.querySelector('.step-number-badge');
      const stepCard = step.querySelector('.step-content-card');
      const nextIndicator = step.querySelector('.next-indicator');
      const finalBadge = step.querySelector('.final-badge');

      if (stepIcon) gsap.set(stepIcon, { scale: 0, rotation: 180 });
      if (stepNumber) gsap.set(stepNumber, { opacity: 0, scale: 0 });
      if (stepCard) gsap.set(stepCard, { x: 30, opacity: 0 });
      if (nextIndicator) gsap.set(nextIndicator, { opacity: 0 });
      if (finalBadge) gsap.set(finalBadge, { opacity: 0, scale: 0 });
      gsap.set(step, { opacity: 0, y: 30 });
    });

    // Wait for DOM to be fully rendered and modal to be visible
    const initTimeout = setTimeout(() => {
      setTimelineHeight();
      // Initialize timeline line to 0
      gsap.set([timelineLine, timelineLineMobile], {
        scaleY: 0
      });
      // Refresh ScrollTrigger with delays to ensure modal is fully rendered
      setTimeout(() => {
        ScrollTrigger.refresh();
        // Force refresh again after modal animations complete
        setTimeout(() => {
          ScrollTrigger.refresh();
          // One more refresh to ensure everything is synced
          setTimeout(() => {
            ScrollTrigger.refresh();
          }, 300);
        }, 500);
      }, 200);
    }, 400);

    // Create timeline for each step
    stepTimelines.current = [];
    steps.forEach((step, index) => {
      if (!step) return;

      const stepIcon = step.querySelector('.step-icon-wrapper');
      const stepNumber = step.querySelector('.step-number-badge');
      const stepCard = step.querySelector('.step-content-card');
      const nextIndicator = step.querySelector('.next-indicator');
      const finalBadge = step.querySelector('.final-badge');

      const stepTimeline = gsap.timeline({ paused: true });

      // Step container animation
      stepTimeline.to(step, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out"
      }, 0);

      // Icon animation
      if (stepIcon) {
        stepTimeline.to(stepIcon, {
          scale: 1,
          rotation: 0,
          duration: 0.6,
          ease: "back.out(1.7)"
        }, 0.1);
      }

      // Step number badge animation
      if (stepNumber) {
        stepTimeline.to(stepNumber, {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: "back.out(1.7)"
        }, 0.3);
      }

      // Card animation
      if (stepCard) {
        stepTimeline.to(stepCard, {
          x: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out"
        }, 0.2);
      }

      // Next indicator animation
      if (nextIndicator) {
        stepTimeline.to(nextIndicator, {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out"
        }, 0.6);
      }

      // Final badge animation
      if (finalBadge) {
        stepTimeline.to(finalBadge, {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: "back.out(1.7)"
        }, 0.5);
      }

      stepTimelines.current[index] = stepTimeline;

      // ScrollTrigger to control the timeline
      ScrollTrigger.create({
        trigger: step,
        scroller: scrollElement || undefined, // Use modal scroll container if found
        start: "top 85%",
        end: "bottom 15%",
        markers: false, // Set to true for debugging
        onEnter: () => {
          stepTimeline.play();
          visibleStepsRef.current.add(index);
          // Use requestAnimationFrame to ensure state is updated before calculating
          requestAnimationFrame(() => {
            updateTimelineLine();
          });
        },
        onLeave: () => {
          // Only reverse if scrolling down past the step (not when scrolling up)
          if (stepTimeline.progress() > 0) {
            stepTimeline.reverse();
          }
          visibleStepsRef.current.delete(index);
          requestAnimationFrame(() => {
            updateTimelineLine();
          });
        },
        onEnterBack: () => {
          stepTimeline.play();
          visibleStepsRef.current.add(index);
          requestAnimationFrame(() => {
            updateTimelineLine();
          });
        },
        onLeaveBack: () => {
          // Only reverse if scrolling up past the step
          if (stepTimeline.progress() > 0) {
            stepTimeline.reverse();
          }
          visibleStepsRef.current.delete(index);
          requestAnimationFrame(() => {
            updateTimelineLine();
          });
        }
      });
    });

    // Function to update timeline line based on visible steps
    function updateTimelineLine() {
      if (visibleStepsRef.current.size === 0) {
        // No steps visible, reset timeline
        gsap.to([timelineLine, timelineLineMobile], {
          scaleY: 0,
          duration: 0.3,
          ease: "power2.out"
        });
        return;
      }

      // Get the highest visible step index (most recent step that entered)
      const visibleIndices = Array.from(visibleStepsRef.current);
      const highestIndex = Math.max(...visibleIndices);
      
      // Calculate progress: (highestIndex + 1) / totalSteps
      // +1 because index is 0-based, but we want progress from 1 to totalSteps
      const progress = (highestIndex + 1) / totalSteps;
      
      // Ensure timeline reaches 100% when last step is visible
      const finalProgress = highestIndex === totalSteps - 1 ? 1 : Math.min(progress, 1);

      gsap.to([timelineLine, timelineLineMobile], {
        scaleY: finalProgress,
        duration: 0.4,
        ease: "power2.out"
      });
    }

    // Handle window resize
    const handleResize = () => {
      setTimelineHeight();
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(initTimeout);
      window.removeEventListener('resize', handleResize);
      // Kill all ScrollTriggers created for these steps
      const allTriggers = ScrollTrigger.getAll();
      allTriggers.forEach(trigger => {
        const triggerEl = trigger.trigger;
        if (triggerEl && steps.includes(triggerEl)) {
          trigger.kill();
        }
      });
      stepTimelines.current.forEach(tl => tl?.kill());
      stepTimelines.current = [];
      visibleStepsRef.current.clear();
    };
  }, [interviewTimeline.length]);

  // Refresh ScrollTrigger when component becomes visible (e.g., tab switch)
  React.useEffect(() => {
    if (timelineContainerRef.current) {
      const refreshTimeout = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 100);
      return () => clearTimeout(refreshTimeout);
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* Interview Process Timeline - Enhanced Vertical Layout with Scroll Animations */}
      <div className="w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
            <FaTasks className="text-white" size={20} />
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-gray-900">Interview Process</h3>
        </div>
        
        <div ref={timelineContainerRef} className="relative w-full max-w-3xl mx-auto">
          {/* Vertical Timeline Line - Animated */}
          <div 
            ref={timelineLineRef}
            className="absolute left-8 md:left-12 top-0 w-1 bg-gradient-to-b from-blue-400 via-purple-400 to-blue-400 hidden md:block rounded-full overflow-hidden"
            style={{
              transform: 'scaleY(0)',
              transformOrigin: 'top center',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)',
            }}
          >
            <div 
              className="w-full h-full bg-gradient-to-b from-blue-400 via-purple-400 to-blue-400 animate-timeline-glow"
              style={{
                animation: 'timelineGlow 2s ease-in-out infinite',
              }}
            />
          </div>
          
          {/* Mobile Timeline Line - Animated */}
          <div 
            ref={timelineLineMobileRef}
            className="absolute left-8 top-0 w-0.5 bg-gradient-to-b from-blue-400 via-purple-400 to-blue-400 md:hidden"
            style={{
              transform: 'scaleY(0)',
              transformOrigin: 'top center',
            }}
          />
          
          {/* Steps - Vertical Layout with Scroll-Triggered Animations */}
          <div className="relative z-10 space-y-6 md:space-y-8">
            {interviewTimeline.map((step, idx) => {
              return (
                <div
                  key={step.number || idx}
                  ref={el => {
                    if (el) stepRefs.current[idx] = el;
                  }}
                  className="relative flex items-start gap-4 md:gap-6 group"
                >
                  {/* Step Number & Icon - Animated */}
                  <div className="relative z-20 flex-shrink-0">
                    <div 
                      className={`step-icon-wrapper w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-2xl border-4 border-white ${step.color} shadow-2xl transform group-hover:scale-110`}
                      style={{
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                      }}
                    >
                      {step.icon}
                    </div>
                    {/* Step Number Badge - Animated */}
                    {step.number && (
                      <div className="step-number-badge absolute -top-2 -right-2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center shadow-lg">
                        <span className="text-xs md:text-sm font-black text-gray-700">{step.number}</span>
                      </div>
                    )}
                  </div>
              
                  {/* Content Card - Animated */}
                  <div className="flex-1 pt-2">
                    <div 
                      className="step-content-card bg-white rounded-2xl border border-gray-200 px-6 py-5 md:px-8 md:py-6 hover:shadow-xl transform hover:scale-[1.02] group-hover:border-blue-300"
                      style={{
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h4 className="font-semibold text-gray-900 text-base md:text-lg leading-tight">{step.label}</h4>
                        {idx === interviewTimeline.length - 1 && (
                          <span className="final-badge px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
                            Final Step
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm md:text-base leading-relaxed">{step.description}</p>
                      
                      {/* Progress Indicator - Animated */}
                      {idx < interviewTimeline.length - 1 && (
                        <div className="next-indicator mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className="font-semibold">Next: {interviewTimeline[idx + 1]?.label || 'Continue'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Connecting Arrow (Mobile) - Animated */}
                  {idx < interviewTimeline.length - 1 && (
                    <div className="absolute left-8 top-16 md:top-20 w-0.5 h-6 md:h-8 bg-gradient-to-b from-blue-400 to-purple-400 md:hidden" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mt-12">
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-6">Additional Information</h3>
        <div 
          className="p-6 md:p-8 rounded-2xl border border-gray-200 bg-gray-50"
          style={{
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Drive Venue - Blue */}
            <div 
              className="p-5 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
              style={{
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.15)',
              }}
            >
              <p className="font-semibold text-sm text-blue-700 mb-2">Drive Venue</p>
              <p className="text-gray-900 font-semibold">
                {(displayJob.driveVenues && Array.isArray(displayJob.driveVenues) && displayJob.driveVenues.length > 0) 
                  ? displayJob.driveVenues[0] 
                  : displayJob.location || "Campus Placement Cell"}
              </p>
            </div>
            
            {/* Reporting Time - Green */}
            <div 
              className="p-5 rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
              style={{
                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.15)',
              }}
            >
              <p className="font-semibold text-sm text-green-700 mb-2">Reporting Time</p>
              <p className="text-gray-900 font-semibold">{displayJob.reportingTime || "9:00 AM"}</p>
            </div>
            
            {/* Documents Required - Purple */}
            <div 
              className="p-5 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
              style={{
                boxShadow: '0 4px 15px rgba(168, 85, 247, 0.15)',
              }}
            >
              <p className="font-semibold text-sm text-purple-700 mb-2">Documents Required</p>
              <p className="text-gray-900 font-semibold">{displayJob.documentsRequired || "Resume, ID Proof, Academic Certificates"}</p>
            </div>
            
            {/* Dress Code - Orange/Amber */}
            <div 
              className="p-5 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
              style={{
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.15)',
              }}
            >
              <p className="font-semibold text-sm text-amber-700 mb-2">Dress Code</p>
              <p className="text-gray-900 font-semibold">{displayJob.dressCode || "Formal"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS animations */}
      <style>{`
        @keyframes timelineGlow {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
          }
        }
        .animate-timeline-glow {
          animation: timelineGlow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});

ProcessTab.displayName = 'ProcessTab';

export default JobContent;

