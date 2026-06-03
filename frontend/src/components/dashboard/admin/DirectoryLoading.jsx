import React from 'react';
import { Loader } from 'lucide-react';

/**
 * Shared loading UI for Student Directory and Recruiter Directory.
 */
export function DirectoryLoadingSpinner({ size = 'lg' }) {
  const iconClass = size === 'sm' ? 'h-8 w-8' : 'h-12 w-12';
  const ringClass = size === 'sm' ? 'border-[3px]' : 'border-4';

  return (
    <div className="relative">
      <Loader className={`${iconClass} animate-spin text-indigo-600`} strokeWidth={2} />
      <div
        className={`pointer-events-none absolute inset-0 rounded-full ${ringClass} border-indigo-100`}
        aria-hidden
      />
    </div>
  );
}

export default function DirectoryLoadingPanel({
  title = 'Loading...',
  subtitle = 'Please wait while we fetch the data',
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-10 shadow-sm sm:p-12">
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <div className="mb-5">
          <DirectoryLoadingSpinner />
        </div>
        <p className="font-outfit text-lg font-semibold text-slate-800">{title}</p>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}
