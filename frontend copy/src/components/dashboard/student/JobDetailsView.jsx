/**
 * JobDetailsView Component
 * Inline display component for job details (non-modal)
 * Reuses JobContent internally
 * 
 * Props:
 * - job: Job object (can be partial)
 * - onApply: (job) => void - Optional apply handler
 * - onShare: (job) => void - Optional share handler
 * - onPrint: (job) => void - Optional print handler
 */

import React, { useState, Suspense, lazy } from 'react';
import { useJobDetails } from '../../../hooks/useJobDetails';
import JobDescriptionSkeleton from './JobDescriptionSkeleton';

// Lazy load JobContent for code splitting
const JobContent = lazy(() => import('./JobContent'));

const JobDetailsView = ({ 
  job,
  onApply,
  onShare,
  onPrint,
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch job details with caching
  const { job: jobDetails, loading, error, refetch } = useJobDetails(
    job?.id || null,
    job, // Fallback to prop data
    !!job?.id // Only fetch if job has ID
  );

  // Use fetched details or fallback to prop
  const displayJob = jobDetails || job;

  if (!displayJob) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No job data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {loading && (
        <JobDescriptionSkeleton />
      )}

      {error && !loading && (
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">
            {error.message || 'Failed to load job details'}
          </p>
          {displayJob && (
            <p className="text-sm text-gray-500">
              Showing cached/fallback data
            </p>
          )}
        </div>
      )}

      {!loading && (
        <Suspense fallback={<JobDescriptionSkeleton />}>
          <JobContent
            job={displayJob}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showFooter={false} // No footer for inline view
            onClose={null} // No close button for inline view
            onApply={onApply}
            onShare={onShare}
            onPrint={onPrint}
          />
        </Suspense>
      )}
    </div>
  );
};

export default React.memo(JobDetailsView);

