/**
 * JobDescriptionModal Component
 * Premium, world-class modal with stunning UI/UX
 * 
 * Features:
 * - Glassmorphism effects
 * - Smooth animations and transitions
 * - Premium gradients
 * - Micro-interactions
 * - Advanced visual effects
 * - React Query-like caching (5 minutes)
 * - Skeleton loaders
 * - Error handling with retry
 * 
 * Props:
 * - job: Job object (can be partial)
 * - isOpen: boolean - Modal visibility
 * - onClose: () => void - Close handler
 * - onApply: (job) => void - Optional apply handler
 * - onShare: (job) => void - Optional share handler
 * - onPrint: (job) => void - Optional print handler
 */

import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { FaTimes, FaRedo } from 'react-icons/fa';
import { useJobDetails } from '../../../hooks/useJobDetails';
import JobDescriptionSkeleton from './JobDescriptionSkeleton';

// Lazy load JobContent for code splitting
const JobContent = lazy(() => import('./JobContent'));

const JobDescriptionModal = ({ 
  job, 
  isOpen, 
  onClose,
  onApply,
  onShare,
  onPrint,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isAnimating, setIsAnimating] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const contentRef = useRef(null);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("overview");
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Track mouse position for parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (modalRef.current && isOpen) {
        const rect = modalRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
        setMousePosition({ x, y });
      }
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  // Fetch job details with caching
  const { job: jobDetails, loading, error, refetch } = useJobDetails(
    job?.id || null,
    job,
    isOpen && !!job?.id
  );

  const displayJob = jobDetails || job;

  if (!isOpen) return null;

  if (!job && !jobDetails) {
    return (
      <div 
        ref={backdropRef}
        className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fadeIn"
        onClick={handleBackdropClick}
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(88, 28, 135, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)',
        }}
      >
        <div 
          className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 text-center max-w-md w-full border border-white/20 transform transition-all duration-500 hover:scale-105"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
            <FaTimes className="text-white text-2xl" />
          </div>
          <p className="text-white text-xl font-bold mb-6">No job selected</p>
          <button
            onClick={onClose}
            className="px-8 py-3.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={backdropRef}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 transition-all duration-500 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleBackdropClick}
      style={{
        background: isOpen 
          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(88, 28, 135, 0.85) 50%, rgba(15, 23, 42, 0.95) 100%)'
          : 'transparent',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/10 animate-float-slow"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 10 + 10}s`,
            }}
          />
        ))}
      </div>

      <div 
        ref={modalRef}
        className={`relative w-full max-w-6xl h-[88vh] md:h-[92vh] overflow-hidden flex flex-col transform transition-all duration-700 ease-out bg-white ${
          isOpen 
            ? 'scale-100 opacity-100 translate-y-0 rotate-0' 
            : 'scale-95 opacity-0 translate-y-8 rotate-1'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: '2rem',
          boxShadow: `
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(0, 0, 0, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.8)
          `,
          transform: isOpen 
            ? `translateY(0) scale(1) rotate(0deg)`
            : 'translateY(2rem) scale(0.95)',
        }}
      >
        {/* Shimmer effect overlay */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
            animation: 'shimmer 3s infinite',
          }}
        />

        {/* Loading State - Skeleton */}
        {loading && (
          <div className="absolute inset-0 bg-white z-10 rounded-3xl">
            <JobDescriptionSkeleton />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="absolute inset-0 bg-white flex items-center justify-center z-10 rounded-3xl">
            <div className="text-center p-8 max-w-md">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500 via-pink-500 to-red-600 flex items-center justify-center shadow-2xl animate-pulse">
                <FaTimes className="text-white text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Error Loading Job</h3>
              <p className="text-red-600 mb-8 text-sm font-medium">
                {error.message || 'Failed to load job details'}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={refetch}
                  className="px-6 py-3.5 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center gap-2 font-semibold transform hover:scale-105"
                >
                  <FaRedo className="w-4 h-4" />
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-xl hover:shadow-2xl font-semibold transform hover:scale-105"
                >
                  Close
                </button>
              </div>
              {displayJob && (
                <p className="text-xs text-gray-500 mt-6">
                  Showing cached/fallback data
                </p>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <Suspense fallback={<JobDescriptionSkeleton />}>
            <div ref={contentRef} className="flex-1 flex flex-col overflow-hidden">
              <JobContent
                job={displayJob}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showFooter={true}
                onClose={onClose}
                onApply={onApply}
                onShare={onShare}
                onPrint={onPrint}
              />
            </div>
          </Suspense>
        )}

        {/* Fallback: Show content even if there's an error */}
        {error && displayJob && !loading && (
          <Suspense fallback={<JobDescriptionSkeleton />}>
            <div className="relative h-full flex flex-col">
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
              <div className="flex-1 overflow-hidden">
                <JobContent
                  job={displayJob}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  showFooter={true}
                  onClose={onClose}
                  onApply={onApply}
                  onShare={onShare}
                  onPrint={onPrint}
                />
              </div>
            </div>
          </Suspense>
        )}

        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-br-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-blue-500/20 to-transparent rounded-tl-full blur-2xl pointer-events-none" />
      </div>

      {/* Add shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default React.memo(JobDescriptionModal);
