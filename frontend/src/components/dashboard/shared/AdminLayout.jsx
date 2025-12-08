import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import PWIOILOGO from '../../../assets/images/brand_logo.webp';
import { User, SquarePen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

export default function AdminLayout({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const profileLoadedRef = useRef(false);

  // Load admin profile function
  const loadProfile = useCallback(async (userId, forceReload = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      if (forceReload) {
        setLoading(true);
      }
      // Get current user which includes profilePhoto and displayName
      const userData = await api.getCurrentUser();
      const newProfile = {
        displayName: userData.user?.displayName || '',
        profilePhoto: userData.user?.profilePhoto || '',
      };
      setAdminProfile(newProfile);
      setLoading(false);
    } catch (error) {
      console.error('Error loading admin profile:', error);
      setAdminProfile(null);
      setLoading(false);
    }
  }, []);

  // Load profile on mount
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (profileLoadedRef.current) {
      setLoading(false);
      return;
    }

    profileLoadedRef.current = true;
    loadProfile(user.id);
  }, [user?.id, loadProfile]);

  // Listen for profile update events
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      // Reload profile if it's for the current user, or if no userId is specified (assume current user)
      if (!event.detail?.userId || event.detail?.userId === user?.id) {
        profileLoadedRef.current = false;
        if (user?.id) {
          // Force reload to get latest data
          loadProfile(user.id, true).then(() => {
            profileLoadedRef.current = true;
          });
        }
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user?.id, loadProfile]);

  // School-specific header texts (same as DashboardLayout)
  const getSchoolHeaderText = (school) => {
    const schoolTexts = {
      SOT: 'Fostering Innovation. Strengthening Foundations.',
      SOM: 'Leading with Vision. Strategizing with Innovation.',
      SOH: 'Healing with Science. Caring with Innovation.',
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

  const getUserSchool = () => normalizeSchool(user?.school || 'SOT');

  // Profile image sizing (reuse simplified config)
  const profileConfig = {
    imageSize: 16,
    iconSize: 8,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      {/* Horizontal Navbar (mirrors DashboardLayout without progress ring and details) */}
      <nav className="bg-white border-b border-blue-100 sticky top-0 z-50">
        <div className="w-full px-2 py-1">
          <div className="px-6 py-1 rounded-xl bg-gradient-to-br from-white to-blue-300 border-2 border-gray-400">
            <div className="flex justify-between items-center h-20 gap-2 relative">
              {/* Left Side - Admin avatar and name (no progress ring) */}
              <div className="flex items-center flex-1">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                  <div
                    className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg overflow-hidden"
                    style={{
                      width: `${profileConfig.imageSize * 0.25}rem`,
                      height: `${profileConfig.imageSize * 0.25}rem`,
                    }}
                  >
                    {loading ? (
                      <User
                        className="text-white"
                        style={{
                          width: `${profileConfig.iconSize * 0.25}rem`,
                          height: `${profileConfig.iconSize * 0.25}rem`,
                        }}
                      />
                    ) : adminProfile?.profilePhoto ? (
                      <img
                        src={adminProfile.profilePhoto}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User
                        className="text-white"
                        style={{
                          width: `${profileConfig.iconSize * 0.25}rem`,
                          height: `${profileConfig.iconSize * 0.25}rem`,
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Admin Details (only name/email, no tagline/ID/CGPA) */}
                <div className="ml-4 space-y-0">
                  <div className="flex items-center">
                    <h2 className="text-2xl font-bold text-black flex items-center gap-2">
                      {loading ? 'Loading...' : (adminProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Admin')}
                      
                      <button
                        onClick={() => {
                          navigate('/admin?tab=profile');
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('editProfileClicked'));
                          }, 100);
                        }}
                        className="p-1 text-black relative hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50 cursor-pointer"
                        aria-label="Edit profile"
                      >
                        <SquarePen className="h-3 w-3 absolute start-0" />
                      </button>
                    </h2>
                  </div>
                  <p className='font-medium'><span className='text-gray-600'>Role:</span> Admin</p>
                </div>
              </div>

              {/* Center - PWIOI logo and school-specific motto */}
              <div className="absolute top-1 start-1/2 -translate-x-1/5 w-fit flex flex-col items-center gap-1">
                <img src={PWIOILOGO} alt="Brand" className="w-30" />
                <h1 className="text-nowrap text-3xl text-black-300 opacity-90 font-caveat">{getSchoolHeaderText(getUserSchool())}</h1>
              </div>

              {/* Right Side - empty (no actions) */}
              <div className="flex items-center gap-2"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
        {children}
      </main>
    </div>
  );
}
