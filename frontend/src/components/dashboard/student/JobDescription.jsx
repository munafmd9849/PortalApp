import React, { useEffect, useMemo, useState } from "react";
import {
  FaBriefcase,
  FaMapMarkerAlt,
  FaClock,
  FaBuilding,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaExternalLinkAlt,
  FaTasks,
  FaEnvelopeOpen,
  FaClipboardList,
  FaPhone,
  FaUserCheck,
  FaUsers,
  FaCheckCircle,
  FaTimes
} from "react-icons/fa";
import { GoChecklist } from "react-icons/go";
import { Loader } from "lucide-react";
import { getJob } from '../../../services/jobs';

// Default timeline steps (fallback when no job-specific data)
const defaultInterviewTimeline = [
  {
    label: "Round 1: Aptitude Test",
    description: "Initial screening test covering quantitative, logical, and verbal reasoning.",
    color: "bg-blue-500",
    number: "1",
    icon: <FaClipboardList className="text-white" size={18} />,
  },
  {
    label: "Round 2: Technical Interview",
    description: "In-depth discussion of technical skills, problem-solving, and domain knowledge.",
    color: "bg-purple-500",
    number: "2",
    icon: <FaPhone className="text-white" size={18} />,
  },
  {
    label: "Round 3: HR Interview",
    description: "Evaluation of cultural fit, communication skills, and career aspirations.",
    color: "bg-green-500",
    number: "3",
    icon: <FaTasks className="text-white" size={18} />,
  },
  {
    label: "Round 4: Group Discussion",
    description: "Assessment of teamwork, leadership, and communication abilities.",
    color: "bg-yellow-500",
    number: "4",
    icon: <FaUserCheck className="text-white" size={18} />,
  },
  {
    label: "Round 5: Final Decision",
    description: "Selection committee review and final decision making.",
    color: "bg-indigo-500",
    number: "5",
    icon: <FaUsers className="text-white" size={18} />,
  },
  {
    label: "OFFER",
    description: "Formal job offer extended to selected candidates.",
    color: "bg-teal-500",
    number: "6",
    icon: <FaCheckCircle className="text-white" size={18} />,
  },
  {
    label: "Onboarding",
    description: "Orientation and integration process for new hires.",
    color: "bg-red-500",
    number: "7",
    icon: <FaEnvelopeOpen className="text-white" size={18} />,
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
  // Default icon
  return <FaTasks className="text-white" size={18} />;
};

const JobDescription = ({ job, isOpen, onClose }) => {
  const [jobDetails, setJobDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState("overview");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setJobDetails(null);
      setError(null);
      setLoading(false);
      setActiveTab("overview");
    }
  }, [isOpen]);

  // Fetch comprehensive job details when modal opens
  useEffect(() => {
    if (isOpen && job) {
      if (job.id) {
        const fetchJobDetails = async () => {
          setLoading(true);
          setError(null);
          try {
            const details = await getJob(job.id);
            if (details) {
            setJobDetails(details);
            } else {
              // If API returns null/undefined, use the job data we already have
              console.warn('API returned no details, using provided job data');
              setJobDetails(job);
            }
          } catch (err) {
            console.error('Failed to fetch job details:', err);
            // Fallback: Use the job data we already have instead of showing error
            console.log('Using provided job data as fallback');
            setJobDetails(job);
            // Don't set error - we have the job data to display
          } finally {
            setLoading(false);
          }
        };
        fetchJobDetails();
      } else {
        // If no ID, use the job data directly
        console.warn('Modal opened but job has no ID, using provided job data:', job);
        setJobDetails(job);
        setLoading(false);
      }
    }
  }, [isOpen, job]);

  // Use detailed job data if available, fallback to basic job data
  const displayJob = jobDetails || job;

  // -------- Dynamic Interview Timeline --------
  const interviewTimeline = useMemo(() => {
    // Try to get interview rounds from job data
    let rounds = [];
    
    // Method 1: Check for interviewRounds array
    if (displayJob?.interviewRounds && Array.isArray(displayJob.interviewRounds) && displayJob.interviewRounds.length > 0) {
      rounds = displayJob.interviewRounds.map((round, index) => ({
        label: round.title || `Round ${index + 1}`,
        description: round.detail || round.description || "Interview round details will be shared.",
        color: roundColors[index % roundColors.length],
        number: String(index + 1),
        icon: getRoundIcon(round.title || `Round ${index + 1}`),
      }));
    }
    // Method 2: Check for baseRoundDetails and extraRounds
    else if (displayJob?.baseRoundDetails || displayJob?.extraRounds) {
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
    // Method 3: Parse from requirements field (if it contains interview rounds)
    else if (displayJob?.requirements && typeof displayJob.requirements === 'string') {
      // Try to extract interview rounds from requirements text
      const requirementsText = displayJob.requirements;
      const roundPatterns = [
        // Roman numerals: "I Round:", "II Round:", "III Round:", etc.
        /([IVX]+)\s+Round[:]\s*([^\n\r]+)/gi,
        // Arabic numerals: "Round 1:", "Round 2:", etc.
        /Round\s*(\d+)[:]\s*([^\n\r]+)/gi,
        // Numbered list: "1.", "2.", etc.
        /(\d+)[.]\s*([^\n\r]+)/gi,
        // Any text with colon: "Round Name: Description"
        /([A-Z][^:]+):\s*([^\n\r]+)/g,
      ];
      
      let foundRounds = [];
      const seenRounds = new Set(); // To avoid duplicates
      
      roundPatterns.forEach(pattern => {
        const matches = [...requirementsText.matchAll(pattern)];
        matches.forEach((match) => {
          if (match[1] && match[2]) {
            const roundKey = `${match[1].trim()}-${match[2].trim()}`;
            if (!seenRounds.has(roundKey)) {
              seenRounds.add(roundKey);
              foundRounds.push({
                label: match[1].trim(),
                description: match[2].trim(),
              });
            }
          }
        });
      });
      
      if (foundRounds.length > 0) {
        rounds = foundRounds.map((round, index) => {
          // Convert Roman numerals to readable format
          let roundLabel = round.label;
          const romanToNumber = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10 };
          if (romanToNumber[round.label]) {
            roundLabel = `Round ${romanToNumber[round.label]}`;
          } else if (!round.label.toLowerCase().includes('round')) {
            roundLabel = `Round ${index + 1}: ${round.label}`;
          }
          
          return {
            label: roundLabel,
            description: round.description || "Interview round details will be shared.",
            color: roundColors[index % roundColors.length],
            number: String(index + 1),
            icon: getRoundIcon(round.description || round.label),
          };
        });
      }
    }
    
    // If we found rounds, return ONLY those rounds (no auto-added steps).
    if (rounds.length > 0) return rounds;
    
    // Fallback to default timeline
    return defaultInterviewTimeline;
  }, [displayJob]);

  // -------- Dynamic Timer --------
  const deadline = useMemo(() => {
    if (displayJob?.driveDate) {
      return new Date(displayJob.driveDate).getTime();
    }
    if (displayJob?.applicationDeadline) {
      return new Date(displayJob.applicationDeadline).getTime();
    }
    return Date.now() + 3 * 24 * 60 * 60 * 1000;
  }, [displayJob?.driveDate, displayJob?.applicationDeadline]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const countdown = useMemo(() => {
    const diff = deadline - now;
    if (diff <= 0) return "Deadline passed";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { days, hours, minutes, seconds };
  }, [deadline, now]);

  // -------- Skills Array --------
  const skillsRequired = (() => {
    if (displayJob?.requiredSkills && Array.isArray(displayJob.requiredSkills) && displayJob.requiredSkills.length > 0) {
      return displayJob.requiredSkills;
    } else if (displayJob?.skillsRequired && Array.isArray(displayJob.skillsRequired) && displayJob.skillsRequired.length > 0) {
      return displayJob.skillsRequired;
    } else if (displayJob?.skills && Array.isArray(displayJob.skills) && displayJob.skills.length > 0) {
      return displayJob.skills;
    } else if (displayJob?.requiredSkills && typeof displayJob.requiredSkills === 'string') {
      return displayJob.requiredSkills
        .split(/[,;•\n\r]/)
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);
    } else {
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
    }
  })();

  // -------- Helpers --------
  const formatSalary = (salary) => {
    if (!salary) return "Not specified";
    if (typeof salary === "number") {
      return `₹${(salary / 100000).toFixed(1)} LPA`;
    }
    return String(salary).replace(/\$/g, '₹');
  };

  const formatDriveDate = (driveDate) => {
    if (!driveDate) return 'TBD';
    try {
      const date = new Date(driveDate);
      return date.toLocaleDateString('en-GB');
    } catch (err) {
      return 'TBD';
    }
  };

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const details = await getJob(job.id);
      if (details) {
        setJobDetails(details);
      } else {
        // Fallback: Use the job data we already have
        console.warn('API returned no details, using provided job data');
        setJobDetails(job);
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
      // Fallback: Use the job data we already have instead of showing error
      console.log('Using provided job data as fallback');
      setJobDetails(job);
      // Don't set error - we have the job data to display
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (!job) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
        <div className="bg-white rounded-xl shadow-2xl p-6 text-center">
          <p className="text-red-600 mb-4">No job selected</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <Loader className="h-8 w-8 animate-spin text-blue-600 mb-2" />
              <span className="text-gray-600">Loading job details...</span>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchJobDetails}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            {(() => {
              const logoUrl = displayJob.company?.logoUrl || displayJob.company?.logo || displayJob.logoUrl;
              const companyName = displayJob.company?.name || displayJob.companyName || displayJob.company || "Company Name";
              
              return logoUrl ? (
                <img
                  src={logoUrl}
                  alt={companyName}
                  className="w-12 h-12 rounded-lg object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null;
            })()}
            {(() => {
              const logoUrl = displayJob.company?.logoUrl || displayJob.company?.logo || displayJob.logoUrl;
              const companyName = displayJob.company?.name || displayJob.companyName || displayJob.company || "Company Name";
              
              return !logoUrl ? (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-semibold bg-blue-500 text-white">
                  {companyName?.[0]?.toUpperCase() || "?"}
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-semibold bg-blue-500 text-white" style={{display: 'none'}}>
                  {companyName?.[0]?.toUpperCase() || "?"}
                </div>
              );
            })()}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {displayJob.jobTitle || "Job Position"}
              </h2>
              <p className="text-gray-600">
                {displayJob.company?.name || displayJob.companyName || displayJob.company || "Company Name"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex px-6">
            <button
              className={`px-4 py-3 font-medium text-sm ${activeTab === "overview" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={`px-4 py-3 font-medium text-sm ${activeTab === "requirements" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("requirements")}
            >
              Requirements
            </button>
            <button
              className={`px-4 py-3 font-medium text-sm ${activeTab === "process" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("process")}
            >
              Process
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Key Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <FaBriefcase className="text-blue-500" />
                    <span className="text-sm">Job Type</span>
                  </div>
                  <p className="font-medium">{displayJob.jobType || "Full-time"}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <FaBuilding className="text-green-500" />
                    <span className="text-sm">Work Mode</span>
                  </div>
                  <p className="font-medium">{displayJob.workMode || displayJob.work_mode || "—"}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <FaMapMarkerAlt className="text-red-500" />
                    <span className="text-sm">Location</span>
                  </div>
                  <p className="font-medium">{displayJob.companyLocation || displayJob.company?.location || displayJob.location || "—"}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <FaMoneyBillWave className="text-purple-500" />
                    <span className="text-sm">CTC</span>
                  </div>
                  <p className="font-medium">{formatSalary(displayJob.salary || displayJob.ctc || displayJob.stipend)}</p>
                </div>
                {(displayJob.gapAllowed || displayJob.gapYears) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <FaClock className="text-amber-500" />
                      <span className="text-sm">Year Gap</span>
                    </div>
                    <p className="font-medium">{[displayJob.gapAllowed, displayJob.gapYears].filter(Boolean).join(' ')}</p>
                  </div>
                )}
              </div>

              {/* Countdown Timer */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">Application Deadline</h3>
                    <p className="text-sm text-gray-600">
                      Drive Date: {formatDriveDate(displayJob.driveDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    {countdown === "Deadline passed" ? (
                      <p className="text-red-600 font-medium">Deadline passed</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-center">
                          <div className="bg-white rounded px-3 py-2 shadow-sm">
                            <span className="text-xl font-bold">{countdown.days}</span>
                            <span className="text-xs block text-gray-500">Days</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="bg-white rounded px-3 py-2 shadow-sm">
                            <span className="text-xl font-bold">{countdown.hours}</span>
                            <span className="text-xs block text-gray-500">Hours</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="bg-white rounded px-3 py-2 shadow-sm">
                            <span className="text-xl font-bold">{countdown.minutes}</span>
                            <span className="text-xs block text-gray-500">Mins</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Job Description</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    {displayJob.jobDescription || "No description provided."}
                  </p>
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Responsibilities</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {(() => {
                      let responsibilities = [];
                      
                      if (displayJob.responsibilities && typeof displayJob.responsibilities === 'string' && displayJob.responsibilities.trim()) {
                        responsibilities = displayJob.responsibilities
                          .split(/[•\n\r;]/)
                          .map(item => item.trim())
                          .filter(item => item.length > 0)
                          .map(item => item.replace(/^[-•*]\s*/, ''));
                      } else if (displayJob.responsibilities && Array.isArray(displayJob.responsibilities) && displayJob.responsibilities.length > 0) {
                        responsibilities = displayJob.responsibilities;
                      } else if (displayJob.jobDescription && typeof displayJob.jobDescription === 'string' && displayJob.jobDescription.trim()) {
                        responsibilities = displayJob.jobDescription
                          .split(/[•\n\r;]/)
                          .map(item => item.trim())
                          .filter(item => item.length > 0)
                          .map(item => item.replace(/^[-•*]\s*/, ''));
                      } else {
                        responsibilities = [
                          "Develop and maintain software applications",
                          "Collaborate with cross-functional teams", 
                          "Participate in code reviews and technical discussions"
                        ];
                      }
                      
                      return responsibilities.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ));
                    })()}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === "requirements" && (
            <div className="space-y-6">
              {/* Skills */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {skillsRequired.map((skill, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Eligibility */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Eligibility Criteria</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayJob.qualification && (
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                          <span className="text-green-600 text-xs">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Qualification</p>
                          <p className="text-sm text-gray-600">{displayJob.qualification}</p>
                        </div>
                      </div>
                    )}
                    
                    {displayJob.specialization && (
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                          <span className="text-green-600 text-xs">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Specialization</p>
                          <p className="text-sm text-gray-600">{displayJob.specialization}</p>
                        </div>
                      </div>
                    )}
                    
                    {(() => {
                      const minCgpa = displayJob.minCgpa || displayJob.cgpaRequirement;
                      if (minCgpa) {
                        return (
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                              <span className="text-green-600 text-xs">✓</span>
                            </div>
                            <div>
                              <p className="font-medium">Minimum CGPA/Percentage</p>
                              <p className="text-sm text-gray-600">{minCgpa}</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {(displayJob.yop || displayJob.yearOfPassing) && (
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                          <span className="text-green-600 text-xs">✓</span>
                        </div>
                        <div>
                          <p className="font-medium">Year of Passing</p>
                          <p className="text-sm text-gray-600">{displayJob.yop || displayJob.yearOfPassing}</p>
                        </div>
                      </div>
                    )}
                    
                    {(() => {
                      const gapAllowed = displayJob.gapAllowed || displayJob.gapPolicy;
                      const gapYears = displayJob.gapYears;
                      
                      if (gapAllowed) {
                        return (
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full ${gapAllowed === 'Allowed' ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center mt-0.5 flex-shrink-0`}>
                              <span className={`text-xs ${gapAllowed === 'Allowed' ? 'text-green-600' : 'text-red-600'}`}>
                                {gapAllowed === 'Allowed' ? '✓' : '✗'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">Year Gaps</p>
                              <p className="text-sm text-gray-600">
                                {gapAllowed}
                                {gapAllowed === 'Allowed' && gapYears && ` (Max ${gapYears} years)`}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {(() => {
                      const backlogs = displayJob.backlogs || displayJob.backlogPolicy;
                      
                      if (backlogs) {
                        return (
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full ${backlogs === 'Allowed' ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center mt-0.5 flex-shrink-0`}>
                              <span className={`text-xs ${backlogs === 'Allowed' ? 'text-green-600' : 'text-red-600'}`}>
                                {backlogs === 'Allowed' ? '✓' : '✗'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">Active Backlogs</p>
                              <p className="text-sm text-gray-600">{backlogs}</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "process" && (
            <div className="space-y-6">
              {/* Interview Process Timeline */}
              <div className="w-full flex flex-col items-center py-4">
                <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                  <FaTasks className="text-blue-600" /> Interview Process
                </h3>
                <div className="relative w-full max-w-4xl mx-auto px-4">
                  {/* Vertical Timeline Line */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gray-200 hidden md:block"></div>
                  
                  {/* Steps */}
                  <div className="relative z-10 space-y-12">
                    {interviewTimeline.map((step, idx) => (
                      <div
                        key={step.number}
                        className={`flex ${idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} items-start relative`}
                      >
                        {/* Content */}
                        <div className={`w-full md:w-2/5 ${idx % 2 === 0 ? "md:pr-8 md:text-right" : "md:pl-8 md:text-left"} mb-4 md:mb-0`}>
                          <div className="bg-white rounded-lg shadow-md border px-5 py-4">
                            <h4 className="font-bold text-gray-900 text-base mb-2">{step.label}</h4>
                            <p className="text-sm text-gray-700">{step.description}</p>
                          </div>
                        </div>
                        
                        {/* Center Connector (Mobile) */}
                        <div className="absolute left-0 top-5 w-4 h-0.5 bg-gray-300 md:hidden"></div>
                        
                        {/* Step Indicator */}
                        <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center md:relative md:left-0 md:transform-none md:translate-y-0 md:w-1/10 md:flex md:justify-center">
                          <div className={`w-12 h-12 flex items-center justify-center rounded-full border-4 border-white ${step.color} shadow-lg z-10`}>
                            {step.icon}
                          </div>
                        </div>
                        
                        {/* Empty spacer for alternating layout */}
                        <div className="w-full md:w-2/5 hidden md:block"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-sm text-gray-500">Drive Venue</p>
                      <p className="text-gray-800">{(displayJob.driveVenues && Array.isArray(displayJob.driveVenues) && displayJob.driveVenues.length > 0) ? displayJob.driveVenues[0] : displayJob.location || displayJob.companyLocation || "—"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-500">Reporting Time</p>
                      <p className="text-gray-800">{displayJob.reportingTime || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-white">
          <div className="flex justify-between items-center">
            <div>
              {(() => {
                const website = displayJob.company?.website || displayJob.website || displayJob.companyWebsite;
                if (website) {
                  const formattedWebsite = website.startsWith('http') ? website : `https://${website}`;
                  const displayWebsite = website.replace(/^https?:\/\//, '');
                  
                  return (
                    <a
                      href={formattedWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
                    >
                      <FaExternalLinkAlt size={12} /> {displayWebsite}
                    </a>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex gap-3">
              <button
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
                onClick={onClose}
              >
                Close
              </button>
              {/* <button
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-800 transition-colors font-medium"
              >
                Apply Now
              </button> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDescription;