import React from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const ApplicationTrackerSection = ({ applications, onTrackAll }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied':
        return 'bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] text-[var(--pl-primary)]';
      case 'shortlisted':
        return 'bg-[color-mix(in_oklab,var(--pl-warning)_12%,white)] text-[var(--pl-warning)]';
      case 'interviewed':
        return 'bg-[color-mix(in_oklab,var(--pl-primary)_10%,white)] text-[var(--pl-primary)]';
      case 'offered':
        return 'bg-[color-mix(in_oklab,var(--pl-success)_12%,white)] text-[var(--pl-success)]';
      case 'rejected':
        return 'bg-[color-mix(in_oklab,var(--pl-danger)_12%,white)] text-[var(--pl-danger)]';
      default:
        return 'bg-[color-mix(in_oklab,var(--pl-text-muted)_12%,white)] text-[var(--pl-text-secondary)]';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied': return <Clock className="h-3 w-3 mr-1" />;
      case 'shortlisted': return <AlertCircle className="h-3 w-3 mr-1" />;
      case 'interviewed': return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'offered': return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'rejected': return <XCircle className="h-3 w-3 mr-1" />;
      default: return <Clock className="h-3 w-3 mr-1" />;
    }
  };

  const getRowBgColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied':
        return 'bg-[color-mix(in_oklab,var(--pl-primary)_5%,white)]';
      case 'shortlisted':
        return 'bg-[color-mix(in_oklab,var(--pl-warning)_8%,white)]';
      case 'interviewed':
        return 'bg-[color-mix(in_oklab,var(--pl-primary)_5%,white)]';
      case 'offered':
        return 'bg-[color-mix(in_oklab,var(--pl-success)_8%,white)]';
      case 'rejected':
        return 'bg-[color-mix(in_oklab,var(--pl-danger)_8%,white)]';
      default:
        return 'bg-[var(--pl-surface-strong)]';
    }
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
    return 'bg-[var(--pl-primary)]';
  };

  return (
    <div className="w-full">
      <fieldset className="bg-[var(--pl-surface-strong)] rounded-lg border border-[var(--pl-border)] py-4 px-4 sm:px-6 transition-all duration-200 shadow-sm">
        
        <legend className="text-lg sm:text-xl font-bold px-2 text-[var(--pl-text)] rounded-full">
          Live Application Tracker
        </legend>

        <div className="mb-3 mt-1">
          {!applications || applications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[var(--pl-text-secondary)]">No applications found. Start applying to jobs!</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-2">
              {/* Column Headers - Hidden on mobile */}
              <div className="hidden md:grid grid-cols-4 gap-4 mb-2 p-4">
                <div className="text-[var(--pl-text)] font-bold text-sm lg:text-lg">Company</div>
                <div className="text-[var(--pl-text)] font-bold text-sm lg:text-lg">Job Title</div>
                <div className="text-[var(--pl-text)] font-bold text-sm lg:text-lg">Date Applied</div>
                <div className="text-[var(--pl-text)] font-bold text-sm lg:text-lg text-right">Status</div>
              </div>

              {/* Rows */}
              {applications.slice(0, 3).map((application) => (
                <div
                  key={application.id}
                  className={`flex flex-col md:grid md:grid-cols-4 gap-3 md:gap-4 p-3 sm:p-4 rounded-xl ${getRowBgColor(application.status)} hover:shadow-md transition-all duration-200 border border-[var(--pl-border)]`}
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className={`${getCompanyColor(application.company?.name)} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-bold text-sm">
                          {getCompanyInitial(application.company?.name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-[var(--pl-text)] truncate">
                          {application.company?.name || 'Unknown Company'}
                        </div>
                        <div className="text-sm font-medium text-[var(--pl-text-secondary)]">
                          {application.job?.jobTitle || 'Unknown Position'}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--pl-text-muted)]">
                        {formatDate(application.appliedDate)}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        {application.status
                          ? application.status.charAt(0).toUpperCase() + application.status.slice(1)
                          : 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <>
                    <div className="hidden md:flex items-center">
                      <div className={`${getCompanyColor(application.company?.name)} w-8 h-8 rounded-lg mr-3 flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-bold text-sm">
                          {getCompanyInitial(application.company?.name)}
                        </span>
                      </div>
                      <div className="text-sm lg:text-base font-semibold text-[var(--pl-text)] truncate">
                        {application.company?.name || 'Unknown Company'}
                      </div>
                    </div>
                    <div className="hidden md:block text-sm font-medium text-[var(--pl-text-secondary)] flex items-center truncate">
                      {application.job?.jobTitle || 'Unknown Position'}
                    </div>
                    <div className="hidden md:block text-sm text-[var(--pl-text-muted)] flex items-center">
                      {formatDate(application.appliedDate)}
                    </div>
                    <div className="hidden md:flex justify-end">
                      <span className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        {application.status
                          ? application.status.charAt(0).toUpperCase() + application.status.slice(1)
                          : 'Unknown'}
                      </span>
                    </div>
                  </>
                </div>
              ))}

              {applications.length > 3 && (
                <div className="flex justify-end pt-2">
                  <button 
                    onClick={() => onTrackAll && onTrackAll()}
                    className="px-4 py-2.5 sm:px-3 sm:py-2 bg-[var(--pl-primary)] text-white font-medium rounded-md sm:rounded-sm hover:bg-[var(--pl-link-hover)] transition-all duration-200 shadow-sm text-sm touch-manipulation"
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
