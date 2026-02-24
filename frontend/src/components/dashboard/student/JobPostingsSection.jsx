import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader, XCircle } from 'lucide-react';

export default function JobPostingsSection({
  jobs,
  onApply,
  hasApplied,
  applying,
  meetsCgpaRequirement,
  isDeadlinePassed,
  meetsYopRequirement,
  onExploreMore,
  onKnowMore,
  studentCgpa,
  studentBatch,
  studentBacklogs,
}) {
  const [logoStates, setLogoStates] = useState({});
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  // Shared button sizing for consistent appearance across statuses
  // Mobile: full width; Desktop: fixed min-width so all statuses align
  const BUTTON_SIZE = 'w-full sm:min-w-[12rem] min-h-[36px] sm:min-h-[40px] px-3 sm:px-4 py-2 sm:py-2.5';

  // Function to get company logo URL from Clearbit API or other sources
  const getCompanyLogoUrl = (companyName) => {
    if (!companyName) return null;
    
    // Ensure companyName is a string
    const nameStr = typeof companyName === 'string' ? companyName : (companyName?.name || String(companyName));
    
    // Clean company name for URL
    const cleanName = nameStr.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
    
    // Try multiple logo sources
    const logoSources = [
      `https://logo.clearbit.com/${cleanName}.com`,
      `https://img.logo.dev/${cleanName}.com?token=pk_X-XcVpYzThmk7wK4y3w_tQ`, // Logo.dev API
      `https://logo.uplead.com/${cleanName}.com`,
      `https://api.brandfetch.io/v2/search/${companyName}`, // Brandfetch API
    ];
    
    return logoSources[0]; // Primary source: Clearbit
  };

  // Handle logo loading states
  const handleLogoLoad = (companyName) => {
    setLogoStates(prev => ({
      ...prev,
      [companyName]: 'loaded'
    }));
  };

  const handleLogoError = (companyName) => {
    setLogoStates(prev => ({
      ...prev,
      [companyName]: 'error'
    }));
  };

  // Get company initial for fallback
  const getCompanyInitial = (companyName) => {
    if (!companyName) return '?';
    const nameStr = typeof companyName === 'string' ? companyName : (companyName?.name || String(companyName));
    return nameStr.charAt(0).toUpperCase();
  };

  // Get company color for fallback avatar
  const getCompanyColor = (companyName) => {
    const colors = [
      'bg-gradient-to-r from-blue-500 to-purple-600',
      'bg-gradient-to-r from-green-500 to-teal-600',
      'bg-gradient-to-r from-purple-500 to-pink-600',
      'bg-gradient-to-r from-red-500 to-orange-600',
      'bg-gradient-to-r from-indigo-500 to-blue-600',
      'bg-gradient-to-r from-pink-500 to-rose-600',
      'bg-gradient-to-r from-teal-500 to-cyan-600',
      'bg-gradient-to-r from-orange-500 to-red-600',
    ];
    if (!companyName) return colors[0];
    const nameStr = typeof companyName === 'string' ? companyName : (companyName?.name || String(companyName));
    const index = nameStr.length % colors.length;
    return colors[index];
  };

  // Render company logo or fallback (compact = smaller for mobile)
  const renderCompanyLogo = (companyName, compact = false) => {
    const logoUrl = getCompanyLogoUrl(companyName);
    const logoState = logoStates[companyName];
    const sizeClass = compact ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10';

    if (logoUrl && logoState !== 'error') {
      return (
        <div className={`${sizeClass} rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0`}>
          <img
            src={logoUrl}
            alt={`${companyName} logo`}
            className="w-full h-full object-contain"
            onLoad={() => handleLogoLoad(companyName)}
            onError={() => handleLogoError(companyName)}
            style={{ display: logoState === 'error' ? 'none' : 'block' }}
          />
          {/* Fallback while loading or on error */}
          {(logoState === 'error' || !logoState) && (
            <div className={`w-full h-full rounded-full ${getCompanyColor(companyName)} flex items-center justify-center text-white font-bold ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
              {getCompanyInitial(companyName)}
            </div>
          )}
        </div>
      );
    }

    // Fallback to letter avatar
    return (
      <div className={`${sizeClass} rounded-full flex-shrink-0 ${getCompanyColor(companyName)} flex items-center justify-center text-white font-bold ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
        {getCompanyInitial(companyName)}
      </div>
    );
  };

  const formatSalary = (salary) => {
    if (!salary || (typeof salary === 'string' && salary.trim() === '')) return 'As per industry standards';
    if (salary === 'As per industry standards') return 'As per industry standards';
    if (typeof salary === 'number') {
      return `₹${(salary / 100000).toFixed(0)} LPA`;
    }
    if (typeof salary === 'string' && salary.includes('As per industry standards')) {
      return 'As per industry standards';
    }
    return String(salary).replace(/\$/g, '₹');
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

  // Show all jobs from backend (already filtered by StudentDashboard with case-insensitive matching)
  const displayJobs = jobs || [];

  return (
    <div className="w-full">
      <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] py-4 px-4 sm:px-6 transition-all duration-200 shadow-lg">
        <legend className="text-lg sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
          Latest Job Postings
        </legend>

        <div className="mb-3 mt-1">
          {displayJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No job postings available at the moment.</p>
              <p className="text-gray-400 text-sm mt-2">Complete your profile to see targeted job opportunities.</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {/* Column Headers - Hidden on mobile; equal spacing */}
              <div className="hidden md:grid mb-3 py-3 px-4 lg:px-6 min-w-0 items-center" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', columnGap: '1.25rem' }}>
                <div className="text-black font-bold text-sm lg:text-lg min-w-0">Company</div>
                <div className="text-black font-bold text-sm lg:text-lg min-w-0">Job Title</div>
                <div className="text-black font-bold text-sm lg:text-lg min-w-0">Salary (CTC)</div>
                <div className="text-black font-bold text-sm lg:text-lg min-w-0">Drive Date</div>
                <div className="text-black font-bold text-sm lg:text-lg min-w-0">Status</div>
              </div>

              {/* Job Listings - 3 on mobile, 5 on desktop */}
              {displayJobs.slice(0, isMobile ? 3 : 5).map((job) => {
                // Handle both object and string company formats
                let companyName = 'Unknown Company';
                if (job.company) {
                  companyName = typeof job.company === 'string' ? job.company : (job.company.name || 'Unknown Company');
                } else if (job.companyName) {
                  companyName = job.companyName;
                }

                const yopNotEligible =
                  typeof meetsYopRequirement === 'function'
                    ? !meetsYopRequirement(job)
                    : false;

                // Determine failed reasons for "Not eligible" tooltip
                const failedReasons = [];
                // CGPA check
                if (typeof meetsCgpaRequirement === 'function' && !meetsCgpaRequirement(job)) {
                  const minCgpa = job.minCgpa || job.cgpaRequirement || null;
                  if (minCgpa) failedReasons.push(`CGPA requirement: ${minCgpa}`);
                  else failedReasons.push('CGPA requirement not met');
                }
                // YOP check
                if (yopNotEligible) {
                  if (job.yop) failedReasons.push(`YOP requirement: up to ${job.yop}`);
                  else failedReasons.push('YOP requirement not met');
                }
                // Deadline check
                if (typeof isDeadlinePassed === 'function' && isDeadlinePassed(job)) {
                  const dl = job.applicationDeadline || job.deadline;
                  failedReasons.push(`Applications closed on ${dl ? new Date(dl).toLocaleDateString() : 'N/A'}`);
                }
                // Backlogs check (basic)
                if (job.backlogs && studentBacklogs !== undefined && studentBacklogs !== null) {
                  const requirementStr = String(job.backlogs).trim().toLowerCase();
                  let allowed = true;
                  const studentBacklogsNum = parseInt(String(studentBacklogs)) || 0;
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
                  if (!allowed) {
                    failedReasons.push(`Backlogs requirement: ${job.backlogs}`);
                  }
                }

                const notEligible = failedReasons.length > 0;

                const openJobDetails = () => {
                  if (typeof onKnowMore === 'function') {
                    onKnowMore(job);
                  } else {
                    window.location.href = `/job/${job.id}`;
                  }
                };

                return (
                  <div
                    key={job.id}
                    role="button"
                    tabIndex={0}
                    onClick={openJobDetails}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openJobDetails();
                      }
                    }}
                    className="flex flex-col md:grid gap-2 p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:bg-[#f0f8fa] hover:shadow-md transition-all duration-200 border border-gray-200 min-w-0 overflow-hidden md:items-center cursor-pointer"
                    style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', columnGap: '1.25rem' }}
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {renderCompanyLogo(companyName, true)}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm sm:text-base font-semibold text-black block truncate">
                            {companyName}
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-gray-700 block truncate">
                            {job.jobTitle || job.title || 'Position Available'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                        <div className="min-w-0">
                          <span className="text-gray-500">Drive:</span>
                          <span className="ml-1 text-gray-800 truncate block">{job.driveDate ? formatDate(job.driveDate) : 'TBD'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-gray-500">CTC:</span>
                          <span className="ml-1 text-gray-800 font-medium truncate block">{formatSalary(job.salary || job.ctc)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onApply && onApply(job);
                          }}
                          disabled={
                            (hasApplied && hasApplied(job.id)) ||
                            (applying && applying[job.id]) ||
                            (isDeadlinePassed && isDeadlinePassed(job)) ||
                            notEligible
                          }
                          title={ (hasApplied && hasApplied(job.id)) ? 'Already applied' : ( notEligible ? failedReasons.join(' • ') : (
                            (isDeadlinePassed && isDeadlinePassed(job))
                              ? `Applications closed on ${new Date(job.applicationDeadline || job.deadline).toLocaleDateString()}`
                              : ''
                          ))}
                          className={`w-full ${BUTTON_SIZE} font-medium rounded-md sm:rounded-lg transition-all duration-200 shadow-sm text-[11px] sm:text-xs text-center flex items-center justify-center gap-1 border-2 touch-manipulation ${
                            hasApplied && hasApplied(job.id)
                              ? 'bg-green-100 text-green-800 cursor-not-allowed border-green-300'
                              : applying && applying[job.id]
                              ? 'bg-blue-100 text-blue-700 cursor-not-allowed border-blue-300'
                              : (meetsCgpaRequirement && !meetsCgpaRequirement(job)) ||
                                (isDeadlinePassed && isDeadlinePassed(job)) ||
                                yopNotEligible
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300'
                              : 'border-transparent bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                          }`}
                        >
                          {hasApplied && hasApplied(job.id) ? (
                            <>
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              Applied
                            </>
                          ) : applying && applying[job.id] ? (
                            <>
                              <Loader className="h-3 w-3 inline mr-1 animate-spin" />
                              Applying...
                            </>
                          ) : (isDeadlinePassed && isDeadlinePassed(job)) ? (
                            <>
                              <XCircle className="h-3 w-3 inline mr-1" />
                              Deadline Passed
                            </>
                          ) : notEligible ? (
                            <>
                              <XCircle className="h-3 w-3 inline mr-1" />
                              Not eligible
                            </>
                          ) : (
                            'Apply Now'
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Desktop Layout - 5 equal columns: Company, Job Title, Drive Date, Salary (CTC), Status */}
                    <>
                      <div className="hidden md:flex items-center min-w-0 overflow-hidden space-x-3">
                        {renderCompanyLogo(companyName)}
                        <span className="text-sm lg:text-base font-semibold text-black truncate min-w-0">
                          {companyName}
                        </span>
                      </div>

                      <div className="hidden md:block text-sm font-medium text-gray-800 min-w-0 overflow-hidden">
                        <span className="truncate block">{job.jobTitle || job.title || 'Position Available'}</span>
                      </div>

                      <div className="hidden md:block text-sm font-medium text-gray-800 min-w-0 overflow-hidden">
                        {formatSalary(job.salary || job.ctc)}
                      </div>

                      <div className="hidden md:block text-sm text-gray-600 min-w-0 overflow-hidden">
                        {job.driveDate ? formatDate(job.driveDate) : 'TBD'}
                      </div>

                      <div className="hidden md:flex items-center min-w-0 overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onApply && onApply(job);
                          }}
                          disabled={
                            (hasApplied && hasApplied(job.id)) ||
                            (applying && applying[job.id]) ||
                            (isDeadlinePassed && isDeadlinePassed(job)) ||
                            notEligible
                          }
                          title={ (hasApplied && hasApplied(job.id)) ? 'Already applied' : ( notEligible ? failedReasons.join(' • ') : (
                            (isDeadlinePassed && isDeadlinePassed(job))
                              ? `Applications closed on ${new Date(job.applicationDeadline || job.deadline).toLocaleDateString()}`
                              : ''
                          ))}
                          className={`${BUTTON_SIZE} font-medium rounded-lg transition-all duration-200 shadow-sm text-xs whitespace-nowrap border-2 ${
                            hasApplied && hasApplied(job.id)
                              ? 'bg-green-100 text-green-800 cursor-not-allowed border-green-300'
                              : applying && applying[job.id]
                              ? 'bg-blue-100 text-blue-700 cursor-not-allowed border-blue-300'
                              : (meetsCgpaRequirement && !meetsCgpaRequirement(job)) ||
                                (isDeadlinePassed && isDeadlinePassed(job)) ||
                                yopNotEligible
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300'
                              : 'border-transparent bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                          }`}
                        >
                          {hasApplied && hasApplied(job.id) ? (
                            <>
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              Applied
                            </>
                          ) : applying && applying[job.id] ? (
                            <>
                              <Loader className="h-3 w-3 inline mr-1 animate-spin" />
                              Applying...
                            </>
                          ) : (isDeadlinePassed && isDeadlinePassed(job)) ? (
                            <>
                              <XCircle className="h-3 w-3 inline mr-1" />
                              Deadline Passed
                            </>
                          ) : notEligible ? (
                            <>
                              <XCircle className="h-3 w-3 inline mr-1" />
                              Not eligible
                            </>
                          ) : (
                            'Apply Now'
                          )}
                        </button>
                      </div>
                    </>
                  </div>
                );
              })}

              {displayJobs.length > (isMobile ? 3 : 5) && (
                <div className="flex justify-end pt-1.5 sm:pt-2">
                  <button 
                    onClick={() => onExploreMore && onExploreMore()}
                    className="min-h-[36px] px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-900 text-white font-medium rounded-md hover:bg-[#3c80a7] transition-all duration-200 shadow-md text-xs sm:text-sm touch-manipulation"
                  >
                    Explore More
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </fieldset>
    </div>
  );
}
