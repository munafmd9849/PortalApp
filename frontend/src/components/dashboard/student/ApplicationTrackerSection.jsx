import React from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle, IndianRupee } from 'lucide-react';

const ApplicationTrackerSection = ({ applications, onTrackAll, onRowClick }) => {
  const formatSalary = (salary) => {
    if (!salary || (typeof salary === 'string' && salary.trim() === '')) return '—';
    if (salary === 'As per industry standards' || String(salary).toLowerCase().includes('as per')) return 'As per industry';
    if (typeof salary === 'number') {
      return salary >= 100000 ? `₹${(salary / 100000).toFixed(1)} LPA` : `₹${salary.toLocaleString()}`;
    }
    const num = parseFloat(salary);
    if (!isNaN(num)) return num >= 100000 ? `₹${(num / 100000).toFixed(1)} LPA` : `₹${num.toLocaleString()}`;
    return String(salary).replace(/\$/g, '₹');
  };
  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    // Handle both old status values and new currentStage values
    if (statusLower === 'applied') return 'bg-[#3c80a7]/20 text-[#3c80a7]';
    if (statusLower === 'shortlisted' || statusLower === 'screening qualified') return 'bg-yellow-100 text-yellow-800';
    if (statusLower === 'interviewed' || statusLower.includes('interview round') || statusLower === 'qualified for interview' || statusLower === 'interview completed') return 'bg-purple-100 text-purple-800';
    if (statusLower === 'offered' || statusLower === 'selected (final)') return 'bg-green-100 text-green-800';
    if (statusLower === 'rejected' || statusLower.includes('rejected')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const statusLower = status?.toLowerCase() || '';
    // Handle both old status values and new currentStage values
    if (statusLower === 'applied') return <Clock className="h-3 w-3 mr-1" />;
    if (statusLower === 'shortlisted' || statusLower === 'screening qualified') return <AlertCircle className="h-3 w-3 mr-1" />;
    if (statusLower === 'interviewed' || statusLower.includes('interview round') || statusLower === 'qualified for interview' || statusLower === 'interview completed') return <CheckCircle className="h-3 w-3 mr-1" />;
    if (statusLower === 'offered' || statusLower === 'selected (final)') return <CheckCircle className="h-3 w-3 mr-1" />;
    if (statusLower === 'rejected' || statusLower.includes('rejected')) return <XCircle className="h-3 w-3 mr-1" />;
    return <Clock className="h-3 w-3 mr-1" />;
  };

  const getRowBgColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    // Handle both old status values and new currentStage values
    if (statusLower === 'applied') return 'from-[#f0f8fa] to-[#d6eaf5]';   // lighter teal shades
    if (statusLower === 'shortlisted' || statusLower === 'screening qualified') return 'from-yellow-50 to-yellow-100';
    if (statusLower === 'interviewed' || statusLower.includes('interview round') || statusLower === 'qualified for interview' || statusLower === 'interview completed') return 'from-purple-50 to-purple-100';
    if (statusLower === 'offered' || statusLower === 'selected (final)') return 'from-green-50 to-green-100';
    if (statusLower === 'rejected' || statusLower.includes('rejected')) return 'from-red-50 to-red-100';
    return 'from-gray-50 to-gray-100';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  const getCompanyInitial = (companyName) => {
    return companyName ? companyName.charAt(0).toUpperCase() : '?';
  };

  const getCompanyColor = (companyName) => {
    const colors = [
      'bg-[#3c80a7]', 'bg-green-600', 'bg-purple-600',
      'bg-red-600', 'bg-indigo-600', 'bg-pink-600'
    ];
    const index = companyName ? companyName.length % colors.length : 0;
    return colors[index];
  };

  // Equal column widths so the same column-gap looks equal between every column (Company, Job Title, Salary, Date Applied, Status)
  const gridCols = 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)';
  const columnGap = '1.25rem';
  const rowGap = '0.75rem';

  return (
    <div className="w-full min-w-0">
      <fieldset className="bg-white rounded-lg md:rounded-xl border-2 border-[#65a1e1] py-3 px-3 md:py-5 md:px-6 transition-all duration-200 shadow-lg hover:shadow-xl min-w-0 overflow-hidden">
        
        <legend className="text-base md:text-lg md:text-xl font-bold px-2 md:px-3 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
          Live Application Tracker
        </legend>

        <div className="mb-2 md:mb-3 mt-1 md:mt-2">
          {!applications || applications.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <p className="text-gray-500 text-sm md:text-lg">No applications found. Start applying to jobs!</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {/* Column Headers - Hidden on mobile; equal column-gap between all columns */}
              <div className="hidden md:grid mb-0 p-4 pb-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg min-w-0 items-center" style={{ gridTemplateColumns: gridCols, columnGap, rowGap }}>
                <div className="text-gray-700 font-bold text-sm lg:text-base uppercase tracking-wide min-w-0">Company</div>
                <div className="text-gray-700 font-bold text-sm lg:text-base uppercase tracking-wide min-w-0">Job Title</div>
                <div className="text-gray-700 font-bold text-sm lg:text-base uppercase tracking-wide text-left min-w-0">Salary</div>
                <div className="text-gray-700 font-bold text-sm lg:text-base uppercase tracking-wide text-left min-w-0">Date Applied</div>
                <div className="text-gray-700 font-bold text-sm lg:text-base uppercase tracking-wide text-left min-w-0">Status</div>
              </div>

              {/* Rows - show first 3 as preview on dashboard */}
              {applications.slice(0, 3).map((application) => {
                const job = application.job || application;
                const jobId = application.jobId || job?.id;
                const salaryStr = formatSalary(job?.salary ?? job?.ctc ?? job?.salaryRange);
                const displayLabel = application.trackerLabel || application.currentStage || application.status;
                return (
                <div
                  key={application.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onRowClick?.(jobId)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick?.(jobId); } }}
                  className={`flex flex-col md:grid gap-2 p-3 md:py-4 md:px-4 rounded-lg md:rounded-xl bg-gradient-to-r ${getRowBgColor(displayLabel)} hover:shadow-lg border border-gray-200 hover:border-[#3c80a7] transition-all duration-300 group min-w-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3c80a7] focus:ring-offset-1 md:items-center overflow-hidden`}
                  style={{ gridTemplateColumns: gridCols, columnGap, rowGap }}
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className={`${getCompanyColor(application.company?.name)} w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-white font-bold text-sm md:text-base">
                          {getCompanyInitial(application.company?.name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm md:text-base font-bold text-gray-900 truncate" title={application.company?.name || 'Unknown Company'}>
                          {application.company?.name || 'Unknown Company'}
                        </div>
                        <div className="text-xs md:text-sm font-medium text-gray-600 mt-0.5 truncate" title={application.job?.jobTitle || 'Unknown Position'}>
                          {application.job?.jobTitle || 'Unknown Position'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-700">
                      <span className="flex items-center gap-1">
                        <IndianRupee className="h-3 w-3 flex-shrink-0" />
                        {salaryStr}
                      </span>
                      <span>{formatDate(application.appliedDate)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 md:pt-2 border-t border-gray-300 gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-[10px] md:text-xs font-semibold shadow-sm ${getStatusColor(displayLabel)}`}>
                        {getStatusIcon(displayLabel)}
                        {displayLabel ? displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1) : 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Layout - same grid + equal gap; company and status clamped so they never disturb layout */}
                  <>
                    <div className="hidden md:flex items-center min-w-0 max-w-full overflow-hidden">
                      <div className={`${getCompanyColor(application.company?.name)} w-10 h-10 rounded-xl mr-3 flex-shrink-0 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-white font-bold text-sm">
                          {getCompanyInitial(application.company?.name)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <span className="text-sm lg:text-base font-bold text-gray-900 truncate block" title={application.company?.name || 'Unknown Company'}>
                          {application.company?.name || 'Unknown Company'}
                        </span>
                      </div>
                    </div>
                    <div className="hidden md:block text-sm font-semibold text-gray-800 min-w-0 overflow-hidden">
                      <span className="truncate block" title={application.job?.jobTitle || 'Unknown Position'}>{application.job?.jobTitle || 'Unknown Position'}</span>
                    </div>
                    <div className="hidden md:flex items-center text-sm font-medium text-gray-700 min-w-0 overflow-hidden">
                      <span className="truncate" title={salaryStr}>{salaryStr}</span>
                    </div>
                    <div className="hidden md:flex items-center text-sm font-medium text-gray-700 min-w-0 overflow-hidden">
                      {formatDate(application.appliedDate)}
                    </div>
                    <div className="hidden md:flex items-center min-w-0 overflow-hidden">
                      <span
                        className={`inline-flex items-center gap-1 min-w-0 max-w-full px-2.5 py-1.5 rounded-full text-xs font-semibold shadow-sm overflow-hidden ${getStatusColor(displayLabel)}`}
                        title={displayLabel ? displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1) : 'Unknown'}
                      >
                        {getStatusIcon(displayLabel)}
                        <span className="truncate min-w-0">
                          {displayLabel ? displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1) : 'Unknown'}
                        </span>
                      </span>
                    </div>
                  </>
                </div>
              );})}

              {applications.length > 3 && (
                <div className="flex justify-end pt-2 md:pt-3">
                  <button 
                    onClick={() => onTrackAll && onTrackAll()}
                    className="px-4 py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-900 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs md:text-sm touch-manipulation"
                  >
                    Track All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </fieldset>
    </div>
  );
};

export default ApplicationTrackerSection;
