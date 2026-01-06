import React from 'react';
import { 
  FaFileAlt, 
  FaTimesCircle, 
  FaCheckCircle, 
  FaArchive, 
  FaSpinner 
} from 'react-icons/fa';
import JobInfoDisplay from './JobInfoDisplay';

/**
 * Shared Job Details Modal Component
 * Used for admin job moderation with approve/reject/archive actions
 * 
 * @component
 */
const JobDetailsModal = ({ 
  isOpen, 
  job, 
  onClose, 
  onApprove, 
  onReject, 
  onArchive, 
  actionLoading, 
  userRole 
}) => {
  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FaFileAlt className="w-5 h-5 text-blue-600" />
            Job Details
          </h2>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-600 rounded-lg transition-all duration-200 border border-gray-200 hover:border-gray-300 font-medium text-sm"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <JobInfoDisplay 
            job={job} 
            variant="detailed" 
            showMetadata={true}
            showTargeting={true}
          />
        </div>

        {/* Footer with Actions */}
        {userRole === 'admin' && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            {(job.status === 'draft' || job.status === 'in_review') && (
              <>
                <button
                  onClick={() => onReject(job)}
                  className="p-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Reject Job"
                >
                  <FaTimesCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onApprove(job)}
                  disabled={actionLoading[`approve_${job.id}`]}
                  className="p-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  title="Approve Job"
                >
                  {actionLoading[`approve_${job.id}`] ? (
                    <FaSpinner className="w-5 h-5 animate-spin" />
                  ) : (
                    <FaCheckCircle className="w-5 h-5" />
                  )}
                </button>
              </>
            )}
            
            {(job.status === 'active' || job.status === 'posted') && (
              <button
                onClick={() => onArchive(job)}
                disabled={actionLoading[`archive_${job.id}`]}
                className="p-2.5 bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                title="Archive Job"
              >
                {actionLoading[`archive_${job.id}`] ? (
                  <FaSpinner className="w-5 h-5 animate-spin" />
                ) : (
                  <FaArchive className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetailsModal;








