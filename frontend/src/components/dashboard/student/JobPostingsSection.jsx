import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader } from 'lucide-react';

export default function JobPostingsSection({ jobs, onApply, hasApplied, applying, onExploreMore, onKnowMore }) {
  const [logoStates, setLogoStates] = useState({});

  // Function to get company logo URL from Clearbit API or other sources
  const getCompanyLogoUrl = (companyName) => {
    if (!companyName) return null;
    
    // Clean company name for URL
    const cleanName = companyName.toLowerCase()
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
    return companyName ? companyName.charAt(0).toUpperCase() : '?';
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
    const index = companyName ? companyName.length % colors.length : 0;
    return colors[index];
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
    if (!salary) return 'Not specified';
    if (typeof salary === 'number') {
      return `₹${(salary / 100000).toFixed(0)} LPA`;
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
            <div className="space-y-3 sm:space-y-2">
              {/* Column Headers - Hidden on mobile */}
              <div className="hidden md:grid grid-cols-5 gap-4 lg:gap-6 mb-3 py-3 px-4 lg:px-6">
                <div className="text-black font-bold text-sm lg:text-lg col-span-1 flex items-center space-x-3">
                  Company
                </div>
                <div className="text-black font-bold text-sm lg:text-lg">Job Title</div>
                <div className="text-black font-bold text-sm lg:text-lg">Drive Date</div>
                <div className="text-black font-bold text-sm lg:text-lg">Salary (CTC)</div>
                <div></div>
              </div>

              {/* Job Listings - Latest 5 jobs */}
              {displayJobs.slice(0, 5).map((job) => {
                const companyName = job.company || job.companyName || 'Unknown Company';

                return (
                  <div
                    key={job.id}
                    className="flex flex-col md:grid md:grid-cols-5 gap-3 md:gap-4 lg:gap-6 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:bg-[#f0f8fa] hover:shadow-md transition-all duration-200 border border-gray-200"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-center space-x-3">
                        {renderCompanyLogo(companyName)}
                        <div className="flex-1 min-w-0">
                          <span className="text-base font-semibold text-black block truncate">
                            {companyName}
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {job.jobTitle || job.title || 'Position Available'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Drive Date:</span>
                          <span className="ml-2 text-gray-800">{formatDate(job.driveDate || job.applicationDeadline)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Salary:</span>
                          <span className="ml-2 text-gray-800 font-medium">{formatSalary(job.salary || job.ctc)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onKnowMore && onKnowMore(job)}
                          className="flex-1 px-3 py-2 border border-[#3c80a7] bg-[#8ec5ff] text-black font-medium rounded-md hover:bg-[#2563eb] hover:text-white transition-all duration-200 shadow-sm text-sm"
                        >
                          Know More
                        </button>
                        <button
                          onClick={() => onApply && onApply(job)}
                          disabled={hasApplied && hasApplied(job.id) || applying && applying[job.id]}
                          className={`flex-1 px-3 py-2 font-medium rounded-md transition-all duration-200 shadow-sm text-sm ${
                            hasApplied && hasApplied(job.id)
                              ? 'bg-green-100 text-green-700 cursor-not-allowed border border-green-300'
                              : applying && applying[job.id]
                              ? 'bg-blue-100 text-blue-700 cursor-not-allowed border border-blue-300'
                              : 'border border-green-600 bg-[#268812] text-white hover:bg-green-600'
                          }`}
                        >
                          {hasApplied && hasApplied(job.id) ? (
                            <>
                              <CheckCircle className="h-4 w-4 inline mr-1" />
                              Applied
                            </>
                          ) : applying && applying[job.id] ? (
                            <>
                              <Loader className="h-4 w-4 inline mr-1 animate-spin" />
                              Applying...
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
                        <span className="text-sm lg:text-base font-semibold text-black truncate">
                          {companyName}
                        </span>
                      </div>

                      <div className="hidden md:block text-sm font-medium text-gray-800 flex items-center truncate">
                        {job.jobTitle || job.title || 'Position Available'}
                      </div>

                      <div className="hidden md:block text-sm text-gray-600 flex items-center">
                        {formatDate(job.driveDate || job.applicationDeadline)}
                      </div>

                      <div className="hidden md:block text-sm font-medium text-gray-800 flex items-center">
                        {formatSalary(job.salary || job.ctc)}
                      </div>

                      <div className="hidden md:flex justify-end space-x-2">
                        <button
                          onClick={() => onKnowMore && onKnowMore(job)}
                          className="px-2 py-1 border border-[#3c80a7] bg-[#8ec5ff] text-black font-medium rounded-sm hover:bg-[#2563eb] hover:text-white transition-all duration-200 shadow-sm text-xs whitespace-nowrap"
                        >
                          Know More
                        </button>
                        <button
                          onClick={() => onApply && onApply(job)}
                          disabled={hasApplied && hasApplied(job.id) || applying && applying[job.id]}
                          className={`px-2 py-1 font-medium rounded-sm transition-all duration-200 shadow-sm text-xs whitespace-nowrap ${
                            hasApplied && hasApplied(job.id)
                              ? 'bg-green-100 text-green-700 cursor-not-allowed border border-green-300'
                              : applying && applying[job.id]
                              ? 'bg-blue-100 text-blue-700 cursor-not-allowed border border-blue-300'
                              : 'border border-green-600 bg-[#268812] text-white hover:bg-green-600'
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
                    className="px-4 py-2.5 sm:px-3 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-900 text-white font-medium rounded-md sm:rounded-sm hover:bg-[#3c80a7] hover:text-white transition-all duration-200 shadow-md transform hover:scale-105 text-sm touch-manipulation"
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
