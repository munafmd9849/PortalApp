import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader, XCircle } from 'lucide-react';

export default function JobPostingsSection({ jobs, onApply, hasApplied, applying, meetsCgpaRequirement, onExploreMore, onKnowMore }) {
  const [logoStates, setLogoStates] = useState({});

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
    return 'bg-[var(--pl-primary)]';
  };

  // Render company logo or fallback
  const renderCompanyLogo = (companyName) => {
    const logoUrl = getCompanyLogoUrl(companyName);
    const logoState = logoStates[companyName];

    if (logoUrl && logoState !== 'error') {
      return (
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
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
            <div className={`w-full h-full rounded-full ${getCompanyColor(companyName)} flex items-center justify-center text-white font-bold text-sm`}>
              {getCompanyInitial(companyName)}
            </div>
          )}
        </div>
      );
    }

    // Fallback to letter avatar
    return (
      <div className={`w-10 h-10 rounded-full ${getCompanyColor(companyName)} flex items-center justify-center text-white font-bold text-sm`}>
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
    // Check if it contains "As per industry standards"
    if (typeof salary === 'string' && salary.includes('As per industry standards')) {
      return 'As per industry standards';
    }
    return salary;
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
      <fieldset className="bg-[var(--pl-surface-strong)] rounded-lg border border-[var(--pl-border)] py-4 px-4 sm:px-6 transition-all duration-200 shadow-sm">
        <legend className="text-lg sm:text-xl font-bold px-2 text-[var(--pl-text)] rounded-full">
          Latest Job Postings
        </legend>

        <div className="mb-3 mt-1">
          {displayJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[var(--pl-text-secondary)]">No job postings available at the moment.</p>
              <p className="text-[var(--pl-text-muted)] text-sm mt-2">Complete your profile to see targeted job opportunities.</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-2">
              {/* Column Headers - Hidden on mobile */}
              <div className="hidden md:grid grid-cols-5 gap-4 lg:gap-6 mb-3 py-3 px-4 lg:px-6">
                <div className="text-[var(--pl-text)] font-bold text-sm lg:text-lg col-span-1 flex items-center space-x-3">
                  Company
                </div>
                <div className="text-[var(--pl-text)] font-bold text-sm lg:text-lg">Job Title</div>
                <div className="text-[var(--pl-text)] font-bold text-sm lg:text-lg">Drive Date</div>
                <div className="text-[var(--pl-text)] font-bold text-sm lg:text-lg">Salary (CTC)</div>
                <div></div>
              </div>

              {/* Job Listings - Latest 5 jobs */}
              {displayJobs.slice(0, 5).map((job) => {
                // Handle both object and string company formats
                let companyName = 'Unknown Company';
                if (job.company) {
                  companyName = typeof job.company === 'string' ? job.company : (job.company.name || 'Unknown Company');
                } else if (job.companyName) {
                  companyName = job.companyName;
                }

                return (
                  <div
                    key={job.id}
                    className="flex flex-col md:grid md:grid-cols-5 gap-3 md:gap-4 lg:gap-6 p-3 sm:p-4 rounded-xl bg-[var(--pl-surface-strong)] hover:shadow-md transition-all duration-200 border border-[var(--pl-border)]"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-center space-x-3">
                        {renderCompanyLogo(companyName)}
                        <div className="flex-1 min-w-0">
                          <span className="text-base font-semibold text-[var(--pl-text)] block truncate">
                            {companyName}
                          </span>
                          <span className="text-sm font-medium text-[var(--pl-text-secondary)]">
                            {job.jobTitle || job.title || 'Position Available'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-[var(--pl-text-muted)]">Drive Date:</span>
                          <span className="ml-2 text-[var(--pl-text-secondary)]">{formatDate(job.driveDate || job.applicationDeadline)}</span>
                        </div>
                        <div>
                          <span className="text-[var(--pl-text-muted)]">Salary:</span>
                          <span className="ml-2 text-[var(--pl-text-secondary)] font-medium">{formatSalary(job.salary || job.ctc)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onKnowMore && onKnowMore(job)}
                          className="flex-1 px-3 py-2 border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] text-[var(--pl-text)] font-medium rounded-md hover:bg-[color-mix(in_oklab,var(--pl-primary)_5%,white)] hover:text-[var(--pl-primary)] transition-all duration-200 shadow-sm text-sm"
                        >
                          Know More
                        </button>
                        <button
                          onClick={() => onApply && onApply(job)}
                          disabled={hasApplied && hasApplied(job.id) || applying && applying[job.id] || (meetsCgpaRequirement && !meetsCgpaRequirement(job))}
                          title={(meetsCgpaRequirement && !meetsCgpaRequirement(job)) ? "Couldn't apply for Job as CGPA requirement not met." : ''}
                          className={`flex-1 px-3 py-2 font-medium rounded-md transition-all duration-200 shadow-sm text-sm ${
                            hasApplied && hasApplied(job.id)
                              ? 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)] cursor-not-allowed border border-[color-mix(in_oklab,var(--pl-success)_35%,white)]'
                              : applying && applying[job.id]
                              ? 'bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] text-[var(--pl-primary)] cursor-not-allowed border border-[color-mix(in_oklab,var(--pl-primary)_35%,white)]'
                              : (meetsCgpaRequirement && !meetsCgpaRequirement(job))
                              ? 'bg-[color-mix(in_oklab,var(--pl-disabled)_20%,white)] text-[var(--pl-disabled)] cursor-not-allowed border border-[var(--pl-border)]'
                              : 'border border-[var(--pl-success)] bg-[var(--pl-success)] text-white hover:bg-[color-mix(in_oklab,var(--pl-success)_90%,black)]'
                          }`}
                        >
                          {hasApplied && hasApplied(job.id) ? (
                            <>
                              <CheckCircle className="h-4 w-4 inline mr-1" />
                              Applied!
                            </>
                          ) : applying && applying[job.id] ? (
                            <>
                              <Loader className="h-4 w-4 inline mr-1 animate-spin" />
                              Applying...
                            </>
                          ) : (meetsCgpaRequirement && !meetsCgpaRequirement(job)) ? (
                            <>
                              <XCircle className="h-4 w-4 inline mr-1" />
                              CGPA Not Met
                            </>
                          ) : (
                            'Apply Now'
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <>
                      <div className="hidden md:flex items-center space-x-3">
                        {renderCompanyLogo(companyName)}
                        <span className="text-sm lg:text-base font-semibold text-[var(--pl-text)] truncate">
                          {companyName}
                        </span>
                      </div>

                      <div className="hidden md:block text-sm font-medium text-[var(--pl-text-secondary)] flex items-center truncate">
                        {job.jobTitle || job.title || 'Position Available'}
                      </div>

                      <div className="hidden md:block text-sm text-[var(--pl-text-muted)] flex items-center">
                        {formatDate(job.driveDate || job.applicationDeadline)}
                      </div>

                      <div className="hidden md:block text-sm font-medium text-[var(--pl-text-secondary)] flex items-center">
                        {formatSalary(job.salary || job.ctc)}
                      </div>

                      <div className="hidden md:flex justify-end space-x-2">
                        <button
                          onClick={() => onKnowMore && onKnowMore(job)}
                          className="px-2 py-1 border border-[var(--pl-border)] bg-[var(--pl-surface-strong)] text-[var(--pl-text)] font-medium rounded-sm hover:bg-[color-mix(in_oklab,var(--pl-primary)_5%,white)] hover:text-[var(--pl-primary)] transition-all duration-200 shadow-sm text-xs whitespace-nowrap"
                        >
                          Know More
                        </button>
                        <button
                          onClick={() => onApply && onApply(job)}
                          disabled={hasApplied && hasApplied(job.id) || applying && applying[job.id] || (meetsCgpaRequirement && !meetsCgpaRequirement(job))}
                          title={(meetsCgpaRequirement && !meetsCgpaRequirement(job)) ? "Couldn't apply for Job as CGPA requirement not met." : ''}
                          className={`px-2 py-1 font-medium rounded-sm transition-all duration-200 shadow-sm text-xs whitespace-nowrap ${
                            hasApplied && hasApplied(job.id)
                              ? 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)] cursor-not-allowed border border-[color-mix(in_oklab,var(--pl-success)_35%,white)]'
                              : applying && applying[job.id]
                              ? 'bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] text-[var(--pl-primary)] cursor-not-allowed border border-[color-mix(in_oklab,var(--pl-primary)_35%,white)]'
                              : (meetsCgpaRequirement && !meetsCgpaRequirement(job))
                              ? 'bg-[color-mix(in_oklab,var(--pl-disabled)_20%,white)] text-[var(--pl-disabled)] cursor-not-allowed border border-[var(--pl-border)]'
                              : 'border border-[var(--pl-success)] bg-[var(--pl-success)] text-white hover:bg-[color-mix(in_oklab,var(--pl-success)_90%,black)]'
                          }`}
                        >
                          {hasApplied && hasApplied(job.id) ? (
                            <>
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              Applied!
                            </>
                          ) : applying && applying[job.id] ? (
                            <>
                              <Loader className="h-3 w-3 inline mr-1 animate-spin" />
                              Applying...
                            </>
                          ) : (meetsCgpaRequirement && !meetsCgpaRequirement(job)) ? (
                            <>
                              <XCircle className="h-3 w-3 inline mr-1" />
                              CGPA Not Met
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

              {displayJobs.length > 5 && (
                <div className="flex justify-end pt-2">
                  <button 
                    onClick={() => onExploreMore && onExploreMore()}
                    className="px-4 py-2.5 sm:px-3 sm:py-2 bg-[var(--pl-primary)] text-white font-medium rounded-md sm:rounded-sm hover:bg-[var(--pl-link-hover)] transition-all duration-200 shadow-sm text-sm touch-manipulation"
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
