import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getJob } from '../../../services/jobs';
import api from '../../../services/api';
import { 
  FaBriefcase, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaMoneyBillWave, 
  FaBuilding, 
  FaUsers, 
  FaClock,
  FaExternalLinkAlt,
  FaArrowLeft,
  FaLink,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaCode,
  FaClipboardList,
  FaUserTie,
  FaHandshake,
  FaBan,
  FaInfoCircle,
  FaEdit,
  FaFileAlt,
  FaTimes,
  FaCheck
} from 'react-icons/fa';
import { updateJob } from '../../../services/jobs';
import { useToast } from '../../ui/Toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function AdminJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [screeningData, setScreeningData] = useState(null);
  const [loadingScreening, setLoadingScreening] = useState(false);
  
  // Edit dates modal state (for POSTED jobs)
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editDatesForm, setEditDatesForm] = useState({
    applicationDeadline: null,
    driveDate: null
  });
  const [savingDates, setSavingDates] = useState(false);
  const toast = useToast();

  // Helper function to parse JSON fields
  const parseJsonField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return [field];
    }
  };

  // Extract interview rounds from requirements
  const interviewRounds = useMemo(() => {
    if (!job?.requirements) return [];
    
    try {
      const reqText = typeof job.requirements === 'string' ? job.requirements : JSON.stringify(job.requirements);
      
      // Try to parse interview rounds from requirements
      // Format: "I Round: ...\nII Round: ...\nIII Round: ..."
      const roundMatches = reqText.match(/([IVX]+ Round|Round \d+):\s*([^\n]+)/gi);
      if (roundMatches && roundMatches.length > 0) {
        return roundMatches.map((match, idx) => {
          const parts = match.split(':');
          return {
            title: parts[0]?.trim() || `Round ${idx + 1}`,
            detail: parts[1]?.trim() || ''
          };
        });
      }
      
      // If no structured format, check if it's already an array
      if (Array.isArray(job.interviewRounds)) {
        return job.interviewRounds;
      }
      
      return [];
    } catch (e) {
      return [];
    }
  }, [job?.requirements, job?.interviewRounds]);

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) {
        setError('Job ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await getJob(jobId);
        // Handle both direct job object and wrapped response
        const jobData = response?.data || response;
        setJob(jobData);
      } catch (err) {
        console.error('Error loading job:', err);
        setError('Failed to load job description');
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [jobId]);

  // Load screening summary
  useEffect(() => {
    const loadScreeningData = async () => {
      if (!jobId) return;

      try {
        setLoadingScreening(true);
        const response = await api.get(`/applications/job/${jobId}/screening-summary`);
        setScreeningData(response);
      } catch (err) {
        console.error('Error loading screening data:', err);
        // Don't show error, just don't display screening section
      } finally {
        setLoadingScreening(false);
      }
    };

    loadScreeningData();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 -m-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <span className="text-slate-600 font-medium">Loading job description...</span>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    // Check if window was opened by another window (window.open)
    // or if we don't have a referrer from the same origin
    const wasOpened = window.opener !== null;
    const referrer = document.referrer;
    const isFromSameOrigin = referrer && referrer.includes(window.location.origin);
    
    if (wasOpened || !isFromSameOrigin) {
      // Opened in new tab/window - navigate to recruiter directory
      navigate(`${base}?tab=recruiterDirectory`);
    } else {
      // Normal navigation - go back
      navigate(-1);
    }
  };

  if (error || !job) {
    return (
      <div className="text-center py-20 min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 -m-8 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-red-100/50 p-8 max-w-md">
          <div className="text-red-600 mb-6 font-medium">{error || 'Job not found'}</div>
          <button
            onClick={handleBack}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 p-4 sm:p-6 md:p-8 overflow-x-hidden">
      {/* Header with Back Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:text-slate-900 hover:bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 transition-all duration-200 font-medium touch-manipulation w-full sm:w-auto justify-center"
        >
          <FaArrowLeft className="text-sm" />
          <span>Back</span>
        </button>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Edit Button - Show for IN_REVIEW jobs (admin can edit all fields) */}
          {(job.status === 'IN_REVIEW' || job.status === 'in_review') && (
            <button
              onClick={() => navigate(`/admin?tab=createJob&editJobId=${jobId}`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              title="Edit Job (All fields editable in IN_REVIEW status)"
            >
              <FaFileAlt className="text-sm" />
              <span>Edit Job</span>
            </button>
          )}
          
          {/* Edit Dates Button - Show for POSTED jobs (admin can edit only dates) */}
          {(job.status === 'POSTED' || job.status === 'posted') && (
            <button
              onClick={() => {
                // Initialize form with current dates
                const deadlineDate = job.applicationDeadline 
                  ? (typeof job.applicationDeadline === 'object' && job.applicationDeadline.toMillis
                      ? new Date(job.applicationDeadline.toMillis())
                      : new Date(job.applicationDeadline))
                  : null;
                const driveDateValue = job.driveDate
                  ? (typeof job.driveDate === 'object' && job.driveDate.toMillis
                      ? new Date(job.driveDate.toMillis())
                      : new Date(job.driveDate))
                  : null;
                
                setEditDatesForm({
                  applicationDeadline: deadlineDate,
                  driveDate: driveDateValue
                });
                setIsEditingDates(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              title="Edit Dates (Only application deadline and drive date can be edited for POSTED jobs)"
            >
              <FaEdit className="text-sm" />
              <span>Edit Dates</span>
            </button>
          )}
          
          {/* View Applicants Button - Show only for POSTED jobs (only posted jobs have applicants) */}
          {(job.status === 'POSTED' || job.status === 'posted') && (
            <button
              onClick={() => navigate(`${base}/jobs/${jobId}/applications`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              title="View Applicants"
            >
              <FaUsers className="text-sm" />
              <span>View Applicants</span>
            </button>
          )}

          <span className={`px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
            job.status === 'POSTED' || job.status === 'posted' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
            job.status === 'DRAFT' || job.status === 'draft' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
            job.status === 'IN_REVIEW' || job.status === 'in_review' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
            'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {job.status === 'POSTED' || job.status === 'posted' ? 'POSTED' : 
             job.status === 'IN_REVIEW' || job.status === 'in_review' ? 'IN_REVIEW' : 
             (job.status || 'Draft')}
          </span>
        </div>
      </div>

      {/* Job Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6 md:p-8 relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100/30 to-indigo-100/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-slate-800 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
            {job.jobTitle || job.title || 'Job Position'}
          </h1>
          <p className="text-xl text-slate-600 mb-4 font-medium">
            {job.companyName || job.company?.name || 'Company Name'}
          </p>
          <div className="flex items-center flex-wrap text-sm gap-4 mt-6">
            <span className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
              <FaBriefcase className="mr-2 text-blue-600" />
              {job.jobType || 'Not specified'}
            </span>
            {job.location && (
              <span className="flex items-center px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-100">
                <FaMapMarkerAlt className="mr-2 text-slate-500" />
                {job.location}
              </span>
            )}
            {job.companyLocation && job.companyLocation !== job.location && (
              <span className="flex items-center px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-100">
                <FaMapMarkerAlt className="mr-2 text-slate-500" />
                {job.companyLocation}
              </span>
            )}
            <span className="flex items-center px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-100">
              <FaCalendarAlt className="mr-2 text-slate-500" />
              {job.createdAt ? (
                typeof job.createdAt === 'object' && job.createdAt.toMillis ? 
                  new Date(job.createdAt.toMillis()).toLocaleDateString() :
                  new Date(job.createdAt).toLocaleDateString()
              ) : 'Date not available'}
            </span>
          </div>
        </div>
      </div>

      {/* Job Details Grid */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 border-b border-slate-200">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-800">Job Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Compensation */}
          {(job.salary || job.stipend || job.ctc || job.salaryRange) && (
            <div className="flex items-start p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-100/50">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                <FaMoneyBillWave className="text-emerald-600 text-lg" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Compensation</p>
                <p className="text-sm font-medium text-slate-700">
                  {job.jobType === 'Internship' ? (job.stipend || 'Not specified') : (job.salary || job.ctc || job.salaryRange || 'Not specified')}
                </p>
              </div>
            </div>
          )}

          {/* Work Mode */}
          {job.workMode && (
            <div className="flex items-start p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-100/50">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <FaBuilding className="text-blue-600 text-lg" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Work Mode</p>
                <p className="text-sm font-medium text-slate-700">{job.workMode}</p>
              </div>
            </div>
          )}

          {/* Openings */}
          {job.openings && (
            <div className="flex items-start p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-100/50">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <FaUsers className="text-purple-600 text-lg" />
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Openings</p>
                <p className="text-sm font-medium text-slate-700">{job.openings}</p>
              </div>
            </div>
          )}

          {/* Duration (for internships) */}
          {job.duration && job.jobType === 'Internship' && (
            <div className="flex items-start p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100/50">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                <FaClock className="text-amber-600 text-lg" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Duration</p>
                <p className="text-sm font-medium text-slate-700">{job.duration}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Company Information */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
          <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
          <h2 className="text-xl font-semibold text-slate-800">Company Information</h2>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-lg border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company Name</p>
            <p className="text-base font-medium text-slate-800">{job.companyName || job.company?.name || 'Not specified'}</p>
          </div>
          
          {(job.linkedin || job.company?.linkedin) && (
            <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-lg border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">LinkedIn</p>
              <a 
                href={job.linkedin || job.company?.linkedin} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-base font-medium text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                {job.linkedin || job.company?.linkedin}
                <FaExternalLinkAlt className="text-xs" />
              </a>
            </div>
          )}
          
          {(job.website || job.company?.website) && (
            <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-lg border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Website</p>
              <a 
                href={job.website || job.company?.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-base font-medium text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                {job.website || job.company?.website}
                <FaExternalLinkAlt className="text-xs" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Roles & Responsibilities */}
      {job.description && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-full"></div>
            <h2 className="text-xl font-semibold text-slate-800">Roles & Responsibilities</h2>
          </div>
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-gradient-to-br from-slate-50 to-blue-50/20 p-5 rounded-lg border border-slate-100">
            {job.description}
          </div>
        </div>
      )}

      {/* Skills Required */}
      {(job.requiredSkills || job.skills) && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full"></div>
            <h2 className="text-xl font-semibold text-slate-800">Skills Required</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {(() => {
              try {
                let skills = [];
                if (job.requiredSkills) {
                  if (Array.isArray(job.requiredSkills)) {
                    skills = job.requiredSkills;
                  } else if (typeof job.requiredSkills === 'string') {
                    skills = job.requiredSkills.startsWith('[') 
                      ? JSON.parse(job.requiredSkills) 
                      : [job.requiredSkills];
                  }
                } else if (job.skills) {
                  if (Array.isArray(job.skills)) {
                    skills = job.skills;
                  } else if (typeof job.skills === 'string') {
                    skills = job.skills.startsWith('[') 
                      ? JSON.parse(job.skills) 
                      : [job.skills];
                  }
                }
                return skills.map((skill, skillIndex) => (
                  <span 
                    key={skillIndex}
                    className="px-4 py-2 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 text-sm font-medium rounded-lg border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {skill}
                  </span>
                ));
              } catch (e) {
                return <span className="text-red-600">Error parsing skills</span>;
              }
            })()}
          </div>
        </div>
      )}

      {/* Requirements */}
      {job.requirements && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
            <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-600 rounded-full"></div>
            <h2 className="text-xl font-semibold text-slate-800">Requirements</h2>
          </div>
          <div className="text-sm text-slate-700 leading-relaxed bg-gradient-to-br from-slate-50 to-cyan-50/20 p-5 rounded-lg border border-slate-100">
            {(() => {
              try {
                if (Array.isArray(job.requirements)) {
                  return (
                    <ul className="list-none space-y-2">
                      {job.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="flex-shrink-0 w-2 h-2 bg-cyan-500 rounded-full mt-2 mr-3"></span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                if (typeof job.requirements === 'string') {
                  if (job.requirements.startsWith('[')) {
                    const parsed = JSON.parse(job.requirements);
                    if (Array.isArray(parsed)) {
                      return (
                        <ul className="list-none space-y-2">
                          {parsed.map((req, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="flex-shrink-0 w-2 h-2 bg-cyan-500 rounded-full mt-2 mr-3"></span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    }
                  }
                  return <div className="whitespace-pre-wrap">{job.requirements}</div>;
                }
                return <div>{String(job.requirements)}</div>;
              } catch (e) {
                return <div className="whitespace-pre-wrap">{job.requirements}</div>;
              }
            })()}
          </div>
        </div>
      )}

      {/* Eligibility Criteria */}
      {(job.qualification || job.specialization || job.yop || job.minCgpa || job.gapAllowed || job.backlogs) && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
            <div className="w-1 h-6 bg-gradient-to-b from-teal-500 to-emerald-600 rounded-full"></div>
            <h2 className="text-xl font-semibold text-slate-800">Eligibility Criteria</h2>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-teal-50/20 p-5 rounded-lg border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {job.qualification && (
                <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Qualification</span>
                  <span className="text-slate-700 font-medium">{job.qualification}</span>
                </div>
              )}
              {job.specialization && (
                <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Specialization</span>
                  <span className="text-slate-700 font-medium">{job.specialization}</span>
                </div>
              )}
              {job.yop && (
                <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Year of Passing</span>
                  <span className="text-slate-700 font-medium">{job.yop}</span>
                </div>
              )}
              {job.minCgpa && (
                <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Min CGPA</span>
                  <span className="text-slate-700 font-medium">{job.minCgpa}</span>
                </div>
              )}
              {job.gapAllowed && (
                <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Gap Allowed</span>
                  <span className="text-slate-700 font-medium">{job.gapAllowed}</span>
                </div>
              )}
              {job.backlogs && (
                <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Backlogs</span>
                  <span className="text-slate-700 font-medium">{job.backlogs}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Experience Level */}
      {job.experienceLevel && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
            <div className="w-1 h-6 bg-gradient-to-b from-slate-500 to-slate-600 rounded-full"></div>
            <h2 className="text-xl font-semibold text-slate-800">Experience Level</h2>
          </div>
          <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/20 rounded-lg border border-slate-100">
            <p className="text-base font-medium text-slate-700">{job.experienceLevel}</p>
          </div>
        </div>
      )}

      {/* Screening Funnel (Admin View) */}
      {screeningData && screeningData.summary && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-full"></div>
            <h2 className="text-xl font-semibold text-slate-800">Screening Funnel</h2>
          </div>
          
          {loadingScreening ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <span className="text-sm text-gray-600">Loading screening data...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{screeningData.summary.total || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Total Applied</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100 text-center">
                  <div className="text-2xl font-bold text-green-600">{screeningData.summary.resumeSelected || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Resume Selected</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-lg border border-red-100 text-center">
                  <div className="text-2xl font-bold text-red-600">{screeningData.summary.resumeRejected || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Resume Rejected</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-100 text-center">
                  <div className="text-2xl font-bold text-blue-600">{screeningData.summary.testSelected || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Test Selected</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-100 text-center">
                  <div className="text-2xl font-bold text-orange-600">{screeningData.summary.testRejected || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Test Rejected</div>
                </div>
              </div>

              {/* Eligible for Interview Notice */}
              {screeningData.summary.testSelected > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <FaInfoCircle className="text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {screeningData.summary.testSelected} candidate(s) qualified for interview. You can create an interview session for this job.
                    </span>
                  </div>
                </div>
              )}

              {/* Student Lists by Status */}
              <div className="space-y-4">
                {screeningData.summary.testSelected > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaUsers className="text-blue-600" />
                      Qualified for Interview ({screeningData.summary.testSelected})
                    </h3>
                    <div className="space-y-2">
                      {screeningData.byStatus.TEST_SELECTED.map(app => (
                        <div key={app.id} className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-100">
                          <div>
                            <span className="font-medium text-gray-800">{app.student?.fullName || 'Unknown'}</span>
                            <span className="text-sm text-gray-600 ml-2">({app.student?.email || 'N/A'})</span>
                          </div>
                          <span className="text-xs text-blue-600 font-medium">TEST_SELECTED</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {screeningData.summary.resumeSelected > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaUsers className="text-green-600" />
                      Resume Selected ({screeningData.summary.resumeSelected})
                    </h3>
                    <div className="space-y-2">
                      {screeningData.byStatus.RESUME_SELECTED.map(app => (
                        <div key={app.id} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-100">
                          <div>
                            <span className="font-medium text-gray-800">{app.student?.fullName || 'Unknown'}</span>
                            <span className="text-sm text-gray-600 ml-2">({app.student?.email || 'N/A'})</span>
                          </div>
                          <span className="text-xs text-green-600 font-medium">RESUME_SELECTED</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {screeningData.summary.resumeRejected > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaUsers className="text-red-600" />
                      Rejected in Resume Screening ({screeningData.summary.resumeRejected})
                    </h3>
                    <div className="space-y-2">
                      {screeningData.byStatus.RESUME_REJECTED.slice(0, 5).map(app => (
                        <div key={app.id} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
                          <div>
                            <span className="font-medium text-gray-800">{app.student?.fullName || 'Unknown'}</span>
                            <span className="text-sm text-gray-600 ml-2">({app.student?.email || 'N/A'})</span>
                            {app.screeningRemarks && (
                              <div className="text-xs text-gray-500 mt-1">{app.screeningRemarks}</div>
                            )}
                          </div>
                          <span className="text-xs text-red-600 font-medium">RESUME_REJECTED</span>
                        </div>
                      ))}
                      {screeningData.summary.resumeRejected > 5 && (
                        <div className="text-xs text-gray-500 text-center pt-2">
                          +{screeningData.summary.resumeRejected - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {screeningData.summary.testRejected > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FaUsers className="text-orange-600" />
                      Rejected in Test ({screeningData.summary.testRejected})
                    </h3>
                    <div className="space-y-2">
                      {screeningData.byStatus.TEST_REJECTED.slice(0, 5).map(app => (
                        <div key={app.id} className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-100">
                          <div>
                            <span className="font-medium text-gray-800">{app.student?.fullName || 'Unknown'}</span>
                            <span className="text-sm text-gray-600 ml-2">({app.student?.email || 'N/A'})</span>
                            {app.screeningRemarks && (
                              <div className="text-xs text-gray-500 mt-1">{app.screeningRemarks}</div>
                            )}
                          </div>
                          <span className="text-xs text-orange-600 font-medium">TEST_REJECTED</span>
                        </div>
                      ))}
                      {screeningData.summary.testRejected > 5 && (
                        <div className="text-xs text-gray-500 text-center pt-2">
                          +{screeningData.summary.testRejected - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drive Details */}
      {(job.driveDate || job.driveVenues || job.applicationDeadline) && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-rose-500 to-pink-600 rounded-full"></div>
              <h2 className="text-xl font-semibold text-slate-800">Drive Details</h2>
            </div>
            {/* Edit Dates Button - Show for POSTED jobs */}
            {(job.status === 'POSTED' || job.status === 'posted') && (
              <button
                onClick={() => {
                  const deadlineDate = job.applicationDeadline 
                    ? (typeof job.applicationDeadline === 'object' && job.applicationDeadline.toMillis
                        ? new Date(job.applicationDeadline.toMillis())
                        : new Date(job.applicationDeadline))
                    : null;
                  const driveDateValue = job.driveDate
                    ? (typeof job.driveDate === 'object' && job.driveDate.toMillis
                        ? new Date(job.driveDate.toMillis())
                        : new Date(job.driveDate))
                    : null;
                  
                  setEditDatesForm({
                    applicationDeadline: deadlineDate,
                    driveDate: driveDateValue
                  });
                  setIsEditingDates(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                title="Edit Dates (Only dates can be edited for POSTED jobs)"
              >
                <FaEdit className="w-3.5 h-3.5" />
                <span>Edit Dates</span>
              </button>
            )}
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-rose-50/20 p-5 rounded-lg border border-slate-100 space-y-4">
            {job.applicationDeadline && (() => {
              const deadlineDate = typeof job.applicationDeadline === 'object' && job.applicationDeadline.toMillis 
                ? new Date(job.applicationDeadline.toMillis()) 
                : new Date(job.applicationDeadline);
              const now = new Date();
              const isClosed = now > deadlineDate;
              return (
                <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Application Deadline</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      isClosed ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'
                    }`}>
                      {isClosed ? 'Closed' : 'Open'}
                    </span>
                  </div>
                  <span className="text-slate-700 font-medium">
                    {deadlineDate.toLocaleDateString()} {deadlineDate.toLocaleTimeString()}
                  </span>
                </div>
              );
            })()}
            {job.driveDate && (() => {
              const driveDate = typeof job.driveDate === 'object' && job.driveDate.toMillis 
                ? new Date(job.driveDate.toMillis()) 
                : new Date(job.driveDate);
              const now = new Date();
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const driveDateOnly = new Date(driveDate);
              driveDateOnly.setHours(0, 0, 0, 0);
              
              let status = 'Upcoming';
              let statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
              
              if (driveDateOnly.getTime() === today.getTime()) {
                status = 'Today';
                statusColor = 'bg-green-100 text-green-700 border-green-200';
              } else if (driveDate < now) {
                status = 'Passed';
                statusColor = 'bg-gray-100 text-gray-700 border-gray-200';
              }
              
              return (
                <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Drive Date</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                      {status}
                    </span>
                  </div>
                  <span className="text-slate-700 font-medium">
                    {driveDate.toLocaleDateString()} {driveDate.toLocaleTimeString()}
                  </span>
                </div>
              );
            })()}
            {job.driveVenues && (
              <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Venues</span>
                <span className="text-slate-700 font-medium">
                  {(() => {
                    try {
                      if (Array.isArray(job.driveVenues)) {
                        return job.driveVenues.join(', ');
                      }
                      if (typeof job.driveVenues === 'string') {
                        if (job.driveVenues.startsWith('[')) {
                          return JSON.parse(job.driveVenues).join(', ');
                        }
                        return job.driveVenues;
                      }
                      return String(job.driveVenues);
                    } catch (e) {
                      return job.driveVenues;
                    }
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SPOCs (Single Point of Contact) */}
      {job.spocs && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
            <div className="w-1 h-6 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
            <h2 className="text-xl font-semibold text-slate-800">Contact Information (SPOCs)</h2>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-violet-50/20 p-5 rounded-lg border border-slate-100">
            {(() => {
              try {
                let spocs = [];
                if (typeof job.spocs === 'string') {
                  spocs = job.spocs.startsWith('[') ? JSON.parse(job.spocs) : [];
                } else if (Array.isArray(job.spocs)) {
                  spocs = job.spocs;
                }
                if (spocs.length === 0) return <p className="text-sm text-slate-500 italic">No SPOCs available</p>;
                return (
                  <div className="space-y-4">
                    {spocs.map((spoc, idx) => (
                      <div key={idx} className="p-4 bg-white/60 rounded-lg border border-slate-100 hover:shadow-sm transition-shadow">
                        <p className="font-semibold text-slate-800 mb-2">{spoc.fullName || spoc.name || 'Contact Person'}</p>
                        {spoc.email && (
                          <p className="text-sm text-slate-600 flex items-center mb-1">
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full mr-2"></span>
                            Email: <span className="ml-1 font-medium">{spoc.email}</span>
                          </p>
                        )}
                        {spoc.phone && (
                          <p className="text-sm text-slate-600 flex items-center">
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full mr-2"></span>
                            Phone: <span className="ml-1 font-medium">{spoc.phone}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              } catch (e) {
                return <p className="text-sm text-red-500">Error loading contact information</p>;
              }
            })()}
          </div>
        </div>
      )}

      {/* Targeting Information */}
      {(job.targetSchools || job.targetCenters || job.targetBatches) && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
            <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-blue-600 rounded-full"></div>
            <h2 className="text-xl font-semibold text-slate-800">Targeting Information</h2>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/20 p-5 rounded-lg border border-slate-100 space-y-4">
            {job.targetSchools && (
              <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Target Schools</span>
                <span className="text-slate-700 font-medium">
                  {(() => {
                    try {
                      if (typeof job.targetSchools === 'string') {
                        const parsed = job.targetSchools.startsWith('[') ? JSON.parse(job.targetSchools) : [job.targetSchools];
                        return parsed.includes('ALL') ? 'All Schools' : parsed.join(', ');
                      }
                      if (Array.isArray(job.targetSchools)) {
                        return job.targetSchools.includes('ALL') ? 'All Schools' : job.targetSchools.join(', ');
                      }
                      return String(job.targetSchools);
                    } catch (e) {
                      return job.targetSchools;
                    }
                  })()}
                </span>
              </div>
            )}
            {job.targetCenters && (
              <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Target Centers</span>
                <span className="text-slate-700 font-medium">
                  {(() => {
                    try {
                      if (typeof job.targetCenters === 'string') {
                        const parsed = job.targetCenters.startsWith('[') ? JSON.parse(job.targetCenters) : [job.targetCenters];
                        return parsed.includes('ALL') ? 'All Centers' : parsed.join(', ');
                      }
                      if (Array.isArray(job.targetCenters)) {
                        return job.targetCenters.includes('ALL') ? 'All Centers' : job.targetCenters.join(', ');
                      }
                      return String(job.targetCenters);
                    } catch (e) {
                      return job.targetCenters;
                    }
                  })()}
                </span>
              </div>
            )}
            {job.targetBatches && (
              <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Target Batches</span>
                <span className="text-slate-700 font-medium">
                  {(() => {
                    try {
                      if (typeof job.targetBatches === 'string') {
                        const parsed = job.targetBatches.startsWith('[') ? JSON.parse(job.targetBatches) : [job.targetBatches];
                        return parsed.includes('ALL') ? 'All Batches' : parsed.join(', ');
                      }
                      if (Array.isArray(job.targetBatches)) {
                        return job.targetBatches.includes('ALL') ? 'All Batches' : job.targetBatches.join(', ');
                      }
                      return String(job.targetBatches);
                    } catch (e) {
                      return job.targetBatches;
                    }
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interview Process */}
      {interviewRounds && interviewRounds.length > 0 && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
            <div className="w-1 h-6 bg-gradient-to-b from-pink-500 to-rose-600 rounded-full"></div>
            <h2 className="text-xl font-semibold text-slate-800">Interview Process</h2>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-pink-50/20 p-5 rounded-lg border border-slate-100 space-y-3">
            {interviewRounds.map((round, roundIndex) => (
              <div key={roundIndex} className="p-4 bg-white/60 rounded-lg border border-slate-100 hover:shadow-sm transition-shadow">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-bold text-pink-600">{roundIndex + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 mb-1">{round.title || `Round ${roundIndex + 1}`}</p>
                    {round.detail && <p className="text-sm text-slate-600">{round.detail}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Information */}
      {(job.serviceAgreement || job.blockingPeriod || job.instructions) && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
            <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></div>
            <h2 className="text-xl font-semibold text-slate-800">Additional Information</h2>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-amber-50/20 p-5 rounded-lg border border-slate-100 space-y-4">
            {job.serviceAgreement && (
              <div className="p-4 bg-white/60 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <FaHandshake className="text-amber-600" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Service Agreement</p>
                </div>
                <p className="text-sm text-slate-700 font-medium">{job.serviceAgreement}</p>
              </div>
            )}
            {job.blockingPeriod && (
              <div className="p-4 bg-white/60 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <FaBan className="text-amber-600" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Blocking Period</p>
                </div>
                <p className="text-sm text-slate-700 font-medium">{job.blockingPeriod}</p>
              </div>
            )}
            {job.instructions && (
              <div className="p-4 bg-white/60 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <FaInfoCircle className="text-amber-600" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Specific Instructions</p>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.instructions}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Job Status & Metadata */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-blue-100/50 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
          <div className="w-1 h-6 bg-gradient-to-b from-slate-500 to-slate-600 rounded-full"></div>
          <h2 className="text-xl font-semibold text-slate-800">Job Status & Metadata</h2>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/20 p-5 rounded-lg border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Status</span>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                job.status === 'POSTED' || job.status === 'posted' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                job.status === 'DRAFT' || job.status === 'draft' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                job.status === 'IN_REVIEW' || job.status === 'in_review' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {job.status || 'DRAFT'}
              </span>
            </div>
            {job.isActive !== undefined && (
              <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Active</span>
                <span className="text-slate-700 font-medium">{job.isActive ? 'Yes' : 'No'}</span>
              </div>
            )}
            {job.isPosted !== undefined && (
              <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Posted</span>
                <span className="text-slate-700 font-medium">{job.isPosted ? 'Yes' : 'No'}</span>
              </div>
            )}
            {job.postedAt && (
              <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Posted At</span>
                <span className="text-slate-700 font-medium text-sm">{new Date(job.postedAt).toLocaleString()}</span>
              </div>
            )}
            {job.submittedAt && (
              <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Submitted At</span>
                <span className="text-slate-700 font-medium text-sm">{new Date(job.submittedAt).toLocaleString()}</span>
              </div>
            )}
            {job.updatedAt && (
              <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Last Updated</span>
                <span className="text-slate-700 font-medium text-sm">{new Date(job.updatedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dates Modal - For POSTED jobs only */}
      {isEditingDates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <FaEdit className="w-5 h-5 text-blue-600" />
                  Edit Dates (POSTED Job)
                </h2>
                <button
                  onClick={() => setIsEditingDates(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                For POSTED jobs, only application deadline and drive date can be edited. All other fields are locked.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Application Deadline */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Application Deadline *
                </label>
                <DatePicker
                  selected={editDatesForm.applicationDeadline}
                  onChange={(date) => setEditDatesForm(prev => ({ ...prev, applicationDeadline: date }))}
                  showTimeSelect
                  dateFormat="dd/MM/yyyy HH:mm"
                  timeFormat="HH:mm"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholderText="Select application deadline"
                />
              </div>

              {/* Drive Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Drive Date *
                </label>
                <DatePicker
                  selected={editDatesForm.driveDate}
                  onChange={(date) => setEditDatesForm(prev => ({ ...prev, driveDate: date }))}
                  showTimeSelect
                  dateFormat="dd/MM/yyyy HH:mm"
                  timeFormat="HH:mm"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholderText="Select drive date"
                />
              </div>

              {/* Validation message */}
              {editDatesForm.applicationDeadline && editDatesForm.driveDate && 
               editDatesForm.driveDate <= editDatesForm.applicationDeadline && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">
                    <strong>Error:</strong> Drive date must be after the application deadline.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setIsEditingDates(false)}
                disabled={savingDates}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Validate
                  if (!editDatesForm.applicationDeadline || !editDatesForm.driveDate) {
                    toast.error('Both dates are required');
                    return;
                  }

                  if (editDatesForm.driveDate <= editDatesForm.applicationDeadline) {
                    toast.error('Drive date must be after the application deadline');
                    return;
                  }

                  try {
                    setSavingDates(true);
                    await updateJob(jobId, {
                      applicationDeadline: editDatesForm.applicationDeadline.toISOString(),
                      driveDate: editDatesForm.driveDate.toISOString()
                    });
                    
                    // Refresh job data
                    const response = await getJob(jobId);
                    const updatedJob = response?.data || response;
                    if (updatedJob) {
                      setJob(updatedJob);
                    }
                    
                    toast.success('Dates updated successfully');
                    setIsEditingDates(false);
                  } catch (error) {
                    console.error('Failed to update dates:', error);
                    toast.error(error?.response?.data?.message || error?.message || 'Failed to update dates');
                  } finally {
                    setSavingDates(false);
                  }
                }}
                disabled={savingDates || !editDatesForm.applicationDeadline || !editDatesForm.driveDate || 
                         (editDatesForm.driveDate <= editDatesForm.applicationDeadline)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingDates ? (
                  <>
                    <FaClock className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FaCheck className="w-4 h-4" />
                    <span>Save Dates</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




