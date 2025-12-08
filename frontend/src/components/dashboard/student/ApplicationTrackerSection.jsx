import React from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const ApplicationTrackerSection = ({ applications, onTrackAll }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied': return 'bg-[#3c80a7]/20 text-[#3c80a7]';
      case 'shortlisted': return 'bg-yellow-100 text-yellow-800';
      case 'interviewed': return 'bg-purple-100 text-purple-800';
      case 'offered': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
      case 'applied': return 'from-[#f0f8fa] to-[#d6eaf5]';   // lighter teal shades
      case 'shortlisted': return 'from-yellow-50 to-yellow-100';
      case 'interviewed': return 'from-purple-50 to-purple-100';
      case 'offered': return 'from-green-50 to-green-100';
      case 'rejected': return 'from-red-50 to-red-100';
      default: return 'from-gray-50 to-gray-100';
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
    const colors = [
      'bg-[#3c80a7]', 'bg-green-600', 'bg-purple-600',
      'bg-red-600', 'bg-indigo-600', 'bg-pink-600'
    ];
    const index = companyName ? companyName.length % colors.length : 0;
    return colors[index];
  };

  return (
    <div className="w-full">
      <fieldset className="bg-white rounded-lg border-2 border-[#65a1e1] py-4 px-4 sm:px-6 transition-all duration-200 shadow-lg">
        
        <legend className="text-lg sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
          Live Application Tracker
        </legend>

        <div className="mb-3 mt-1">
          {!applications || applications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No applications found. Start applying to jobs!</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-2">
              {/* Column Headers - Hidden on mobile */}
              <div className="hidden md:grid grid-cols-4 gap-4 mb-2 p-4">
                <div className="text-black font-bold text-sm lg:text-lg">Company</div>
                <div className="text-black font-bold text-sm lg:text-lg">Job Title</div>
                <div className="text-black font-bold text-sm lg:text-lg">Date Applied</div>
                <div className="text-black font-bold text-sm lg:text-lg text-right">Status</div>
              </div>

              {/* Rows */}
              {applications.slice(0, 3).map((application) => (
                <div
                  key={application.id}
                  className={`flex flex-col md:grid md:grid-cols-4 gap-3 md:gap-4 p-3 sm:p-4 rounded-xl bg-gradient-to-r ${getRowBgColor(application.status)} hover:shadow-md transition-all duration-200`}
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
                        <div className="text-base font-semibold text-black truncate">
                          {application.company?.name || 'Unknown Company'}
                        </div>
                        <div className="text-sm font-medium text-gray-700">
                          {application.job?.jobTitle || 'Unknown Position'}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
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
                      <div className="text-sm lg:text-base font-semibold text-black truncate">
                        {application.company?.name || 'Unknown Company'}
                      </div>
                    </div>
                    <div className="hidden md:block text-sm font-medium text-gray-800 flex items-center truncate">
                      {application.job?.jobTitle || 'Unknown Position'}
                    </div>
                    <div className="hidden md:block text-sm text-gray-600 flex items-center">
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
                    className="px-4 py-2.5 sm:px-3 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-900 text-white font-medium rounded-md sm:rounded-sm hover:bg-[#3c80a7] hover:text-white transition-all duration-200 shadow-md transform hover:scale-105 text-sm touch-manipulation"
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
