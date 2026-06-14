import React, { useState, useEffect } from 'react';
import { Star, Mail } from 'lucide-react';
import { JobListingStatus, JOB_LISTING_GRID_COLS } from './JobListingStatus';

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
  // Function to get company logo URL from Clearbit API or other sources
  const getCompanyLogoUrl = (companyName) => {
    if (!companyName) return null;
    
    // Ensure companyName is a string
    const nameStr = typeof companyName === 'string' ? companyName : (companyName?.name || String(companyName));
    
    // Check if nameStr already looks like a domain
    const isDomain = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}$/i.test(nameStr.trim());
    
    let domain = '';
    if (isDomain) {
      domain = nameStr.trim().toLowerCase();
    } else {
      // Clean company name for URL and append .com
      const cleanName = nameStr.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
      domain = `${cleanName}.com`;
    }
    
    // Return Clearbit as primary - but we could rotate or try others if needed
    return `https://logo.clearbit.com/${domain}`;
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
        <div className={`${sizeClass} rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0 relative`}>
          {/* Fallback while loading - always present but covered by image when loaded */}
          <div className={`absolute inset-0 rounded-full ${getCompanyColor(companyName)} flex items-center justify-center text-white font-bold ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
            {getCompanyInitial(companyName)}
          </div>
          
          <img
            src={logoUrl}
            alt={`${companyName} logo`}
            className="w-full h-full object-contain relative z-10 bg-white"
            onLoad={() => handleLogoLoad(companyName)}
            onError={() => handleLogoError(companyName)}
            style={{ opacity: logoState === 'loaded' ? 1 : 0 }}
          />
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
      <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] py-3 px-3 sm:px-4 transition-all duration-200 shadow-lg">
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
              <div className="hidden md:grid mb-2 py-2 px-3 min-w-0 items-center" style={{ gridTemplateColumns: JOB_LISTING_GRID_COLS, columnGap: '0.75rem' }}>
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
                    className={`flex flex-col md:grid gap-1.5 p-2 md:px-3 md:py-2 rounded-lg transition-all duration-200 border min-w-0 overflow-hidden md:items-center cursor-pointer ${
                      job.isInvited 
                        ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400 hover:shadow-amber-100 shadow-sm' 
                        : job.isRecommended 
                          ? 'bg-indigo-50/50 border-indigo-200 hover:border-indigo-400 hover:shadow-indigo-100 shadow-sm' 
                          : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:bg-[#f0f8fa] hover:shadow-md border-gray-200'
                    }`}
                    style={{ gridTemplateColumns: JOB_LISTING_GRID_COLS, columnGap: '0.75rem' }}
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {renderCompanyLogo(companyName, true)}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm sm:text-base font-semibold text-black block truncate">
                            {companyName}
                          </span>
                          <div className="flex items-center flex-wrap gap-1">
                            <span className="text-xs sm:text-sm font-medium text-gray-700 block truncate">
                              {job.jobTitle || job.title || 'Position Available'}
                            </span>
                            {job.isRecommended && (
                              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold rounded flex items-center gap-1 border border-indigo-200">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                REC
                              </span>
                            )}
                            {job.isInvited && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded flex items-center gap-1 border border-amber-200">
                                <Mail className="w-2.5 h-2.5" />
                                INV
                              </span>
                            )}
                          </div>
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
                      <div className="flex">
                        <JobListingStatus
                          mobile
                          isApplied={hasApplied && hasApplied(job.id)}
                          isApplying={applying && applying[job.id]}
                          deadlinePassed={isDeadlinePassed && isDeadlinePassed(job)}
                          notEligible={notEligible && !(isDeadlinePassed && isDeadlinePassed(job))}
                          title={
                            hasApplied && hasApplied(job.id)
                              ? 'Already applied'
                              : notEligible
                                ? failedReasons.join(' • ')
                                : isDeadlinePassed && isDeadlinePassed(job)
                                  ? `Applications closed on ${new Date(job.applicationDeadline || job.deadline).toLocaleDateString()}`
                                  : ''
                          }
                          onApply={(e) => {
                            e.stopPropagation();
                            onApply && onApply(job);
                          }}
                        />
                      </div>
                    </div>

                    {/* Desktop Layout - 5 equal columns: Company, Job Title, Drive Date, Salary (CTC), Status */}
                    <>
                      <div className="hidden md:flex items-center min-w-0 overflow-hidden space-x-2">
                        {renderCompanyLogo(companyName, true)}
                        <span className="text-sm lg:text-base font-semibold text-black truncate min-w-0">
                          {companyName}
                        </span>
                      </div>

                      <div className="hidden md:flex items-center min-w-0 overflow-hidden gap-2">
                        <span className="truncate block font-medium text-gray-800">{job.jobTitle || job.title || 'Position Available'}</span>
                        {job.isRecommended && (
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold rounded flex items-center gap-1 border border-indigo-200 shrink-0">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            Recommended
                          </span>
                        )}
                        {job.isInvited && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded flex items-center gap-1 border border-amber-200 shrink-0">
                            <Mail className="w-2.5 h-2.5" />
                            Invited
                          </span>
                        )}
                      </div>

                      <div className="hidden md:block text-sm font-medium text-gray-800 min-w-0 overflow-hidden">
                        {formatSalary(job.salary || job.ctc)}
                      </div>

                      <div className="hidden md:block text-sm text-gray-600 min-w-0 overflow-hidden">
                        {job.driveDate ? formatDate(job.driveDate) : 'TBD'}
                      </div>

                      <div className="hidden md:flex items-center justify-end min-w-0 overflow-hidden">
                        <JobListingStatus
                          isApplied={hasApplied && hasApplied(job.id)}
                          isApplying={applying && applying[job.id]}
                          deadlinePassed={isDeadlinePassed && isDeadlinePassed(job)}
                          notEligible={notEligible && !(isDeadlinePassed && isDeadlinePassed(job))}
                          title={
                            hasApplied && hasApplied(job.id)
                              ? 'Already applied'
                              : notEligible
                                ? failedReasons.join(' • ')
                                : isDeadlinePassed && isDeadlinePassed(job)
                                  ? `Applications closed on ${new Date(job.applicationDeadline || job.deadline).toLocaleDateString()}`
                                  : ''
                          }
                          onApply={(e) => {
                            e.stopPropagation();
                            onApply && onApply(job);
                          }}
                        />
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
