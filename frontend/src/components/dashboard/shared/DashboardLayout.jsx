import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import { getStudentProfile } from '../../../services/students';
import SOTbanner from '../../../assets/images/SOTbanner.jpg';
import PWIOILOGO from '../../../assets/images/brand_logo.webp';
import { useStudentMobileMenu } from '../../../contexts/StudentMobileMenuContext';

import { 
  User,
  SquarePen,
  Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/** Format CGPA for display (avoids floating-point like 8.699999999999999 → "8.70") */
function formatCgpaDisplay(val) {
  if (val === undefined || val === null || val === '') return '';
  const n = parseFloat(val);
  if (Number.isNaN(n)) return String(val);
  const clamped = Math.max(0, Math.min(10, n));
  return clamped.toFixed(2);
}

export default function DashboardLayout({ children, studentProfile: profileProp = null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [studentProfile, setStudentProfile] = useState(profileProp);
  const [loading, setLoading] = useState(!profileProp); // If profile provided, don't show loading
  const profileLoadedRef = useRef(!!profileProp); // Mark as loaded if profile provided

  // Load student profile function (reusable - only used if profile not provided as prop)
  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      console.log('No user ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const profile = await getStudentProfile(userId);
      setStudentProfile(profile);
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      // Set a default profile structure even on error so we can show email
      setStudentProfile(null);
      setLoading(false);
    }
  }, []);

  // OPTIMIZED: Use profile from props if provided, otherwise load it
  useEffect(() => {
    // If profile is provided as prop, use it and skip API call
    if (profileProp !== null && profileProp !== undefined) {
      setStudentProfile(profileProp);
      setLoading(false);
      profileLoadedRef.current = true;
      return;
    }

    // Otherwise, load profile (fallback for other pages that don't pass profile)
    if (!user?.id) {
      console.log('No user ID available');
      setLoading(false);
      return;
    }

    // Prevent repeated calls
    if (profileLoadedRef.current) {
      setLoading(false); // Ensure loading is false if already loaded
      return;
    }

    profileLoadedRef.current = true;
    loadProfile(user.id);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profileProp]); // Re-run if profileProp changes - this keeps header in sync

  // Listen for profile update events and reload profile (only if profile not provided as prop)
  useEffect(() => {
    // If profile is passed as prop, parent component will update it - no need to listen
    if (profileProp !== null) {
      return;
    }

    const handleProfileUpdate = (event) => {
      // Verify it's for the current user
      if (event.detail?.userId === user?.id) {
        console.log('Profile updated, reloading header...');
        // Reset ref to allow reload
        profileLoadedRef.current = false;
        // Reload profile
        loadProfile(user.id).then(() => {
          profileLoadedRef.current = true;
        });
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user?.id, loadProfile, profileProp]);

  // School-specific header texts (desktop center tagline)
  const getSchoolHeaderText = (school) => {
    const schoolTexts = {
      'SOT': 'Building with Code. Empowering with Innovation.',
      'SOM': 'Leading with Vision. Strategizing with Innovation.',
      'SOH': 'Healing with Science. Caring with Innovation.'
    };
    return schoolTexts[school] || schoolTexts['SOT'];
  };

  const normalizeSchool = (value) => {
    if (!value) return 'SOT';
    const v = String(value).trim().toUpperCase();
    if (v === 'SOT' || v === 'SCHOOL OF TECHNOLOGY') return 'SOT';
    if (v === 'SOM' || v === 'SCHOOL OF MANAGEMENT') return 'SOM';
    if (v === 'SOH' || v === 'SCHOOL OF HEALTHCARE' || v === 'SCHOOL OF HEALTH CARE') return 'SOH';
    return 'SOT';
  };

  const getStudentSchool = () => {
    const raw = studentProfile?.school || user?.school || 'SOT';
    return normalizeSchool(raw);
  };

  // Calculate profile completion percentage (50-100%)
  const calculateProfileCompletion = () => {
    if (!studentProfile) return 50;

    let completion = 50; // Base completion
    const maxCompletion = 100;
    const stepValue = 5;

    // Check various profile fields
    if (studentProfile.fullName) completion += stepValue;
    if (studentProfile.email) completion += stepValue;
    if (studentProfile.phone) completion += stepValue;
    if (studentProfile.enrollmentId) completion += stepValue;
    if (studentProfile.school) completion += stepValue;
    if (studentProfile.batch) completion += stepValue;
    if (studentProfile.cgpa) completion += stepValue;
    if (studentProfile.headline || studentProfile.tagline) completion += stepValue;
    if (studentProfile.bio) completion += stepValue;
    if (studentProfile.city) completion += stepValue;

    return Math.min(completion, maxCompletion);
  };

  const completionPercentage = calculateProfileCompletion();
  const profileImageSrc = studentProfile?.profilePhoto || studentProfile?.profileImageUrl || user?.profilePhoto;

  // Profile image sizing (original desktop)
  const profileConfig = {
    imageSize: 20,
    svgSize: 80,
    circleRadius: 36,
    strokeWidth: 4,
    iconSize: 8,
    profileImageSize: 64
  };

  const getProgressColor = (percentage) => {
    if (percentage < 40) return '#ef4444';
    if (percentage < 70) return '#eab308';
    return '#22c55e';
  };

  const studentMobileMenu = useStudentMobileMenu();
  const displayName = loading ? 'Loading...' : (studentProfile?.fullName || user?.displayName || user?.email || 'Student Name');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      {/* Horizontal Navbar - fixed at top, never scrolls */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-blue-100">
        <div className="w-full px-2 py-1">
          <div className="px-4 md:px-6 py-1 rounded-xl bg-gradient-to-br from-white to-blue-300 border-2 border-gray-400">
            {/* Mobile header: Hamburger (left) | Logo (center, small) | Name + Profile (right) */}
            <div className="flex md:hidden justify-between items-center min-h-[3.5rem] gap-2">
              <div className="flex-shrink-0 flex items-center">
                {studentMobileMenu && (
                  <button
                    type="button"
                    onClick={() => studentMobileMenu.setMobileMenuOpen(true)}
                    className="p-2 -ml-1 rounded-lg text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors touch-manipulation"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                )}
              </div>
              <div className="flex-1 flex justify-center min-w-0">
                <img src={PWIOILOGO} alt="" className="h-6 w-auto object-contain" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0 justify-end">
                <span className="truncate text-xs font-semibold text-gray-900 max-w-[8rem] sm:max-w-[10rem]">{displayName}</span>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden shadow">
                  {profileImageSrc ? (
                    <img src={profileImageSrc} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-white h-3.5 w-3.5" />
                  )}
                </div>
              </div>
            </div>

            {/* Desktop header - original UI */}
            <div className="hidden md:flex justify-between items-center h-23 gap-2 relative">
              {/* Left Side - Student Details (original) */}
              <div className="flex items-center flex-1 min-w-0 z-10">
                <div className="flex-shrink-0 relative" style={{ width: `${profileConfig.svgSize}px`, height: `${profileConfig.svgSize}px` }}>
                  <svg
                    className="absolute inset-0 transform -rotate-90"
                    width={profileConfig.svgSize}
                    height={profileConfig.svgSize}
                    style={{ zIndex: 1 }}
                  >
                    <circle
                      cx={profileConfig.svgSize / 2}
                      cy={profileConfig.svgSize / 2}
                      r={profileConfig.circleRadius}
                      stroke="#E5E7EB"
                      strokeWidth={profileConfig.strokeWidth}
                      fill="none"
                    />
                    <circle
                      cx={profileConfig.svgSize / 2}
                      cy={profileConfig.svgSize / 2}
                      r={profileConfig.circleRadius}
                      stroke={getProgressColor(completionPercentage)}
                      strokeWidth={profileConfig.strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * profileConfig.circleRadius}
                      strokeDashoffset={2 * Math.PI * profileConfig.circleRadius - (completionPercentage / 100) * (2 * Math.PI * profileConfig.circleRadius)}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div
                    className="absolute bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg overflow-hidden"
                    style={{
                      width: `${profileConfig.profileImageSize}px`,
                      height: `${profileConfig.profileImageSize}px`,
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 2
                    }}
                  >
                    {profileImageSrc ? (
                      <img src={profileImageSrc} alt="Profile photo" className="w-full h-full object-cover" />
                    ) : (
                      <User className="text-white" style={{ width: `${profileConfig.iconSize * 0.25}rem`, height: `${profileConfig.iconSize * 0.25}rem` }} />
                    )}
                  </div>
                </div>

                <div className="ml-4 space-y-1.5">
                  <div className="flex items-center">
                    <h2 className="text-2xl font-bold text-black flex items-center gap-2">
                      {loading ? 'Loading...' : (studentProfile?.fullName || user?.displayName || user?.email || 'Student Name')}
                      <button
                        onClick={() => {
                          navigate('/student?tab=editProfile', { replace: true });
                          window.dispatchEvent(new CustomEvent('editProfileClicked'));
                        }}
                        className="p-1 text-black relative hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50 cursor-pointer"
                        aria-label="Edit profile"
                      >
                        <SquarePen className="h-3 w-3 absolute start-0" />
                      </button>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-label="Verified Icon" role="img">
                        <path d="m23 12-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69zm-12.91 4.72-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48z" />
                      </svg>
                    </h2>
                  </div>
                  <div className="ml-2 italic">
                    <p>{loading ? 'Loading...' : (studentProfile?.headline || studentProfile?.tagline || 'Complete your profile to add a headline')}</p>
                  </div>
                  <div className="ml-2 flex flex-col sm:flex-row sm:space-x-6 text-sm text-black min-w-0">
                    <div className="min-w-0 max-w-full flex items-baseline gap-1">
                      <span className="font-medium text-gray-700 flex-shrink-0">ID:</span>
                      <span className="truncate" title={studentProfile?.enrollmentId || ''}>{loading ? 'Loading...' : (studentProfile?.enrollmentId || 'Click edit to set')}</span>
                    </div>
                    <div className="min-w-0 max-w-full flex items-baseline gap-1">
                      <span className="font-medium text-gray-700 flex-shrink-0">CGPA:</span>
                      <span className="truncate" title={studentProfile?.cgpa != null ? formatCgpaDisplay(studentProfile.cgpa) : ''}>{loading ? 'Loading...' : (() => {
                        const cgpaValue = studentProfile?.cgpa;
                        if (cgpaValue === undefined || cgpaValue === null || cgpaValue === '') return 'Click edit to set';
                        return formatCgpaDisplay(cgpaValue);
                      })()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute top-1 start-1/2 -translate-x-1/5 w-fit flex flex-col items-center gap-2">
                <img src={PWIOILOGO} alt="" className="w-20" />
                <h1 className="text-nowrap text-3xl text-black-300 opacity-90 font-caveat">{getSchoolHeaderText(getStudentSchool())}</h1>
              </div>

              <div className="flex items-center">
                <div className="hidden md:block">
                  <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#C0C0C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
                    <circle cx="12" cy="8" r="6" />
                  </svg>
                </div>
              </div>
            </div>
            {/* end desktop header */}
          </div>
        </div>
      </nav>

      {/* Main Content Area - padding-top reserves space for fixed header */}
      <main className="min-h-screen pt-[6.5rem] bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
        {children}
      </main>
    </div>
  );
}