import React from 'react';
import { 
  FaFileAlt, 
  FaInfoCircle, 
  FaBuilding, 
  FaMapMarkerAlt, 
  FaCalendarAlt,
  FaMoneyBillWave
} from 'react-icons/fa';

/**
 * Shared component for displaying job information fields
 * Used across different job modals to ensure consistency
 */
const JobInfoDisplay = ({ 
  job, 
  variant = 'detailed', // 'detailed' | 'compact'
  showMetadata = true,
  showTargeting = false 
}) => {
  if (!job) return null;

  // Helper function to format dates
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-GB');
    } catch {
      return 'N/A';
    }
  };

  // Helper function to format salary
  const formatSalary = (salary, jobType, stipend) => {
    if (jobType === 'Internship' && stipend && String(stipend).trim() !== '' && stipend !== 'As per industry standards') {
      const s = String(stipend).replace(/\$/g, '₹');
      return s.startsWith('₹') ? s : `₹${s}`;
    }
    
    // If salary is "As per industry standards", return as-is
    if (salary === 'As per industry standards') {
      return 'As per industry standards';
    }
    
    if (salary) {
      if (typeof salary === 'number') {
        return `₹${(salary / 100000).toFixed(1)} LPA`;
      }
      if (String(salary).includes('As per industry standards')) {
        return 'As per industry standards';
      }
      const s = String(salary).replace(/\$/g, '₹');
      return s.startsWith('₹') ? s : `₹${s}`;
    }
    
    // Default for empty/null salary
    return 'As per industry standards';
  };

  // Get skills array
  const skillsArray = (() => {
    if (job.skills && Array.isArray(job.skills) && job.skills.length > 0) {
      return job.skills;
    }
    if (job.requiredSkills && Array.isArray(job.requiredSkills) && job.requiredSkills.length > 0) {
      return job.requiredSkills;
    }
    if (job.skillsRequired && Array.isArray(job.skillsRequired) && job.skillsRequired.length > 0) {
      return job.skillsRequired;
    }
    if (job.requiredSkills && typeof job.requiredSkills === 'string') {
      return job.requiredSkills
        .split(/[,;•\n\r]/)
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);
    }
    return [];
  })();

  if (variant === 'compact') {
    return (
      <div className="space-y-4">
        {/* Job Title */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            {job.jobTitle || 'Job Position'}
          </h3>
          <div className="flex items-center text-sm text-gray-600 space-x-4">
            {job.jobType && (
              <span className="flex items-center">
                <FaFileAlt className="mr-1" size={12} />
                {job.jobType}
              </span>
            )}
            {job.companyLocation && (
              <span className="flex items-center">
                <FaMapMarkerAlt className="mr-1" size={12} />
                {job.companyLocation || job.location}
              </span>
            )}
          </div>
        </div>

        {/* Key Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(job.salary || job.stipend) && (
            <div className="flex items-center text-sm">
              <FaMoneyBillWave className="text-green-500 mr-2" size={14} />
              <span className="font-medium">Compensation: </span>
              <span className="ml-1">{formatSalary(job.salary, job.jobType, job.stipend)}</span>
            </div>
          )}
          {job.driveDate && (
            <div className="flex items-center text-sm">
              <FaCalendarAlt className="text-blue-500 mr-2" size={14} />
              <span className="font-medium">Drive Date: </span>
              <span className="ml-1">{formatDate(job.driveDate)}</span>
            </div>
          )}
        </div>

        {/* Responsibilities (truncated) */}
        {job.responsibilities && (
          <div>
            <h4 className="font-medium text-gray-800 mb-2 text-sm">Responsibilities:</h4>
            <p className="text-sm text-gray-600 line-clamp-3">
              {job.responsibilities}
            </p>
          </div>
        )}

        {/* Skills */}
        {skillsArray.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-800 mb-2 text-sm">Skills Required:</h4>
            <div className="flex flex-wrap gap-2">
              {skillsArray.map((skill, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className="space-y-6">
      {/* Job Description - Prominent Section */}
      {job.responsibilities && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaFileAlt className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Job Description</h3>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="prose prose-sm max-w-none">
              <div 
                className="text-gray-800 leading-relaxed whitespace-pre-wrap font-medium" 
                style={{ 
                  fontSize: '15px',
                  lineHeight: '1.8',
                  wordBreak: 'break-word'
                }}
              >
                {job.responsibilities}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Job Information */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <FaInfoCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-800">Job Information</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Job Title
              </label>
              <p className="text-base font-semibold text-gray-900">{job.jobTitle || 'N/A'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Job Type
                </label>
                <p className="text-sm font-medium text-gray-900">{job.jobType || 'N/A'}</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Salary/Stipend
                </label>
                <p className="text-sm font-medium text-gray-900">
                  {formatSalary(job.salary, job.jobType, job.stipend)}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Location
              </label>
              <p className="text-sm font-medium text-gray-900">
                {job.companyLocation || job.location || 'Not specified'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                  Drive Date
                </label>
                <p className="text-sm font-semibold text-blue-900">{formatDate(job.driveDate)}</p>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <label className="block text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">
                  Application Deadline
                </label>
                <p className="text-sm font-semibold text-orange-900">
                  {formatDate(job.applicationDeadline) || 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Company & Recruiter Information */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <FaBuilding className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-800">Company & Recruiter</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
              <label className="block text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                Company Name
              </label>
              <p className="text-base font-semibold text-indigo-900">
                {job.companyDetails?.name || job.company || job.companyName || 'N/A'}
              </p>
            </div>
            
            {job.recruiter?.name && (
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Recruiter Name
                </label>
                <p className="text-sm font-medium text-gray-900">{job.recruiter.name}</p>
              </div>
            )}
            
            {job.recruiter?.email && (
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Recruiter Email
                </label>
                <p className="text-sm font-medium text-blue-600 break-all">{job.recruiter.email}</p>
              </div>
            )}

            {/* Targeting Information */}
            {showTargeting && (job.targetSchools || job.targetCenters || job.targetBatches) && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <label className="block text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">
                  Targeting
                </label>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-medium text-green-700">Schools: </span>
                    <span className="text-sm font-semibold text-green-900">
                      {job.targetSchools?.length ? job.targetSchools.join(', ') : 'All Schools'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-green-700">Centers: </span>
                    <span className="text-sm font-semibold text-green-900">
                      {job.targetCenters?.length ? job.targetCenters.join(', ') : 'All Centers'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-green-700">Batches: </span>
                    <span className="text-sm font-semibold text-green-900">
                      {job.targetBatches?.length ? job.targetBatches.join(', ') : 'All Batches'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skills Required */}
      {skillsArray.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FaFileAlt className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Required Skills</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {skillsArray.map((skill, index) => (
              <span 
                key={index} 
                className="px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 rounded-lg text-sm font-semibold border border-purple-200 shadow-sm hover:shadow-md transition-shadow"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Additional Metadata */}
      {showMetadata && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaInfoCircle className="w-5 h-5 text-gray-600" />
            Additional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {job.status && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Status
                </label>
                <p className="text-sm font-semibold text-gray-900 capitalize">{job.status}</p>
              </div>
            )}
            {job.createdAt && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Created At
                </label>
                <p className="text-sm font-medium text-gray-700">{formatDate(job.createdAt)}</p>
              </div>
            )}
            {job.postedAt && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Posted At
                </label>
                <p className="text-sm font-medium text-gray-700">{formatDate(job.postedAt)}</p>
              </div>
            )}
          </div>
          
          {job.rejectionReason && (
            <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <label className="block text-sm font-bold text-red-700 mb-2">Rejection Reason</label>
              <p className="text-red-900 font-medium leading-relaxed">{job.rejectionReason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobInfoDisplay;











