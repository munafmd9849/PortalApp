/**
 * Skeleton Loader for Job Description Modal
 * Shows while job details are being fetched
 */

import React from 'react';

const JobDescriptionSkeleton = () => {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
          <div>
            <div className="h-6 w-48 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b">
        <div className="flex px-6">
          <div className="h-12 w-24 bg-gray-200 rounded-t mr-4"></div>
          <div className="h-12 w-32 bg-gray-200 rounded-t mr-4"></div>
          <div className="h-12 w-24 bg-gray-200 rounded-t"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-6 space-y-6">
        {/* Key Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-50 p-4 rounded-lg">
              <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
              <div className="h-5 w-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Countdown Timer Skeleton */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-5 w-40 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded px-3 py-2">
                  <div className="h-6 w-8 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 w-12 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description Skeleton */}
        <div>
          <div className="h-6 w-32 bg-gray-200 rounded mb-3"></div>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
          </div>
        </div>

        {/* Responsibilities Skeleton */}
        <div>
          <div className="h-6 w-32 bg-gray-200 rounded mb-3"></div>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-full bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionSkeleton;

