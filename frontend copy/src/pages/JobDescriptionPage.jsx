/**
 * Job Description Page
 * Separate page for viewing job descriptions (converted from modal)
 */

import React, { useState, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useJobDetails } from '../hooks/useJobDetails';
import JobDescriptionSkeleton from '../components/dashboard/student/JobDescriptionSkeleton';
import { FaRedo } from 'react-icons/fa';

// Lazy load JobContent for code splitting
const JobContent = lazy(() => import('../components/dashboard/student/JobContent'));

const JobDescriptionPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch job details
  const { job: jobDetails, loading, error, refetch } = useJobDetails(
    jobId || null,
    null,
    !!jobId
  );

  const displayJob = jobDetails;

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  if (!jobId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Job Selected</h2>
          <p className="text-gray-600 mb-6">Please select a job to view its description.</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header with Back Button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Job Description</h1>
              {displayJob && (
                <p className="text-sm text-gray-600 mt-1">
                  {displayJob.jobTitle} • {displayJob.company?.name || displayJob.companyName}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <JobDescriptionSkeleton />
          </div>
        )}

        {/* Error State */}
        {error && !loading && !displayJob && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500 via-pink-500 to-red-600 flex items-center justify-center shadow-2xl">
                <span className="text-white text-4xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Error Loading Job</h3>
              <p className="text-red-600 mb-8 text-sm font-medium">
                {error.message || 'Failed to load job details'}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={refetch}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg flex items-center gap-2 font-semibold"
                >
                  <FaRedo className="w-4 h-4" />
                  Retry
                </button>
                <button
                  onClick={handleBack}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-lg font-semibold"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Job Content */}
        {!loading && displayJob && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <Suspense fallback={<JobDescriptionSkeleton />}>
              <JobContent
                job={displayJob}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showFooter={true}
                hideHeader={true}
                onClose={handleBack}
                onApply={null}
                onShare={null}
                onPrint={null}
              />
            </Suspense>
          </div>
        )}

        {/* Error with cached data */}
        {error && displayJob && !loading && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Error Banner */}
            <div className="bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-b border-yellow-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                  <span className="text-yellow-900 text-lg">⚠️</span>
                </div>
                <p className="text-sm text-yellow-800 font-semibold">
                  Using cached data. Some details may be outdated.
                </p>
              </div>
              <button
                onClick={refetch}
                className="text-yellow-800 hover:text-yellow-900 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-yellow-100 transition-all duration-200"
              >
                <FaRedo className="w-4 h-4" />
                Refresh
              </button>
            </div>
            <Suspense fallback={<JobDescriptionSkeleton />}>
              <JobContent
                job={displayJob}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showFooter={true}
                hideHeader={true}
                onClose={handleBack}
                onApply={null}
                onShare={null}
                onPrint={null}
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDescriptionPage;
