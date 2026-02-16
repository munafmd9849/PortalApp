import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiHome, FiBriefcase, FiUsers, FiCalendar, FiMessageSquare, FiBarChart2, FiSettings, FiLogOut } from 'react-icons/fi';
import { SquarePen } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import PWIOILOGO from '../../assets/images/brand_logo.webp';
import Dashboard from '../recruiter/dashboard';
import JobPostings from '../recruiter/JobPostings';
import RecruiterCalendar from '../../components/dashboard/recruiter/RecruiterCalendar';
import RecruiterAnalytics from '../../components/dashboard/recruiter/RecruiterAnalytics';
import CompanyHistory from '../../components/dashboard/recruiter/CompanyHistory';
import HelpSupport from '../../components/dashboard/recruiter/HelpSupport';
import RecruiterProfile from '../../components/dashboard/recruiter/RecruiterProfile';
import RecruiterQuery from '../../components/dashboard/recruiter/RecruiterQuery';
import InterviewScheduling from '../../components/dashboard/admin/InterviewScheduling';
import { useAuth } from '../../hooks/useAuth';
import showLogoutConfirm from '../../utils/logoutConfirm';
import api from '../../services/api';

const RecruiterDashboard = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const addNoteFromUrl = searchParams.get('addNote');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'dashboard');
  const [sidebarWidth, setSidebarWidth] = useState(15);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, role, loading: authLoading } = useAuth();

  // When landing with addNote=jobId (e.g. from thank-you email), open Company History and keep URL in sync
  useEffect(() => {
    if (tabFromUrl && ['dashboard', 'jobPostings', 'interviewScheduling', 'calendar', 'analytics', 'history', 'raiseQuery', 'help', 'profile'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
    if (addNoteFromUrl) {
      setActiveTab('history');
      if (!tabFromUrl || tabFromUrl !== 'history') {
        navigate(`/recruiter?tab=history&addNote=${addNoteFromUrl}`, { replace: true });
      }
    }
  }, [tabFromUrl, addNoteFromUrl, navigate]);
  const [recruiterProfile, setRecruiterProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // MANDATORY: Hard block unauthorized access on mount
  useEffect(() => {
    if (authLoading) return;

    const userRole = role?.toUpperCase() || user?.role?.toUpperCase() || '';
    const allowedRoles = ['RECRUITER', 'ADMIN']; // ADMIN can also access recruiter dashboard

    if (!user) {
      console.error('🚫 RecruiterDashboard: No authenticated user');
      navigate('/', { replace: true });
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      console.error('🚫 RecruiterDashboard: Unauthorized access attempt:', {
        userRole,
        userId: user?.id,
        email: user?.email,
        path: location.pathname,
        timestamp: new Date().toISOString(),
      });

      // Redirect based on role
      const redirectPath = userRole === 'STUDENT' ? '/student' : '/';
      navigate(redirectPath, { replace: true });
    }
  }, [user, role, authLoading, navigate, location.pathname]);

  // Don't render anything if unauthorized
  if (authLoading) return null;

  const userRole = role?.toUpperCase() || user?.role?.toUpperCase() || '';
  const allowedRoles = ['RECRUITER', 'ADMIN'];

  if (!user || !allowedRoles.includes(userRole)) {
    return null; // Will redirect via useEffect
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome, path: '/recruiter/dashboard' },
    { id: 'jobPostings', label: 'Job Postings', icon: FiBriefcase },
    { id: 'interviewScheduling', label: 'Interview Session', icon: FiCalendar },
    { id: 'calendar', label: 'Calendar', icon: FiCalendar },
    { id: 'analytics', label: 'HR Analytics', icon: FiBarChart2 },
    { id: 'history', label: 'Company History', icon: FiBriefcase },
    { id: 'raiseQuery', label: 'Raise Query', icon: FiMessageSquare },
    { id: 'help', label: 'Help & Support', icon: FiMessageSquare },
    { id: 'profile', label: 'Profile', icon: FiSettings },
  ];

  // Load recruiter profile
  useEffect(() => {
    loadRecruiterProfile();
  }, [user]);

  const loadRecruiterProfile = async () => {
    try {
      setLoading(true);
      const userData = await api.getCurrentUser();
      setRecruiterProfile(userData.user);
    } catch (error) {
      console.error('Error loading recruiter profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const windowWidth = window.innerWidth;
    const newWidth = (e.clientX / windowWidth) * 100;
    const constrainedWidth = Math.min(Math.max(newWidth, 5), 15);
    setSidebarWidth(constrainedWidth);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleLogout = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Show confirmation dialog (custom modal)
    const confirmed = await showLogoutConfirm('Are you sure you want to logout?');
    if (!confirmed) {
      return; // User cancelled, don't proceed with logout
    }

    console.log('Recruiter logout - starting...');

    // Call logout (this clears tokens and state immediately)
    await logout();

    console.log('Recruiter logout - state cleared, navigating to home');

    // Navigate immediately - state is already cleared
    navigate('/', { replace: true });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'jobPostings':
        return <JobPostings/>;
      case 'interviewScheduling':
        return <InterviewScheduling />;
      case 'calendar':
        return <RecruiterCalendar />;
      case 'analytics':
        return <RecruiterAnalytics />;
      case 'history':
        return <CompanyHistory />;
      case 'raiseQuery':
        return <RecruiterQuery />;
      case 'help':
        return <HelpSupport />;
      case 'profile':
        return <RecruiterProfile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      {/* Horizontal Navbar */}
      <nav className="bg-white border-b border-blue-100 sticky top-0 z-50">
        <div className="w-full px-2 py-1">
          <div
            className="px-6 py-1 rounded-xl bg-gradient-to-br from-white to-blue-300 border-2 border-gray-400"
          >
            <div className="flex justify-between items-center h-23 gap-2 relative">
              <div className="ml-4 space-y-0">
                <div className="flex items-center">
                  <h2 className="text-2xl font-bold text-black flex items-center gap-2">
                    {loading ? 'Loading...' : (recruiterProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Recruiter')}
                    <button
                      onClick={() => {
                        setActiveTab('profile');
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
                <div className='ml-2 -mt-0 mb-1 italic'>
                  <p>Connecting Opportunities with Talent.</p>
                </div>
              </div>

              <div className='absolute top-1 start-1/2 -translate-x-1/5 w-fit flex flex-col items-center gap-2'>
                <img src={PWIOILOGO} alt="" className='w-30' />
                <h1 className='text-nowrap text-3xl text-black-300 opacity-90 font-caveat'>Connecting Opportunities with Talent.</h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex min-h-[calc(100vh-5rem)] relative">
        <aside
          className="bg-white border-r border-gray-200 fixed h-[calc(100vh-5rem)] overflow-y-auto transition-all duration-200 ease-in-out"
          style={{ width: `${sidebarWidth}%` }}
        >
          <div className="p-3 h-full flex flex-col">
            <div className="mb-6">
              {sidebarWidth >= 9 && (
                <h2 className="text-base font-bold text-gray-900 mb-3">Navigation</h2>
              )}
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <div key={tab.id} className="mb-1">
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-200 ${
                          activeTab === tab.id
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                            : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                        } ${sidebarWidth < 9 ? 'justify-center px-2 py-2' : 'px-2 py-3'}`}
                        title={sidebarWidth < 9 ? tab.label : ''}
                      >
                        <Icon className={`h-4 w-4 ${sidebarWidth >= 9 ? 'mr-2' : ''}`} />
                        {sidebarWidth >= 9 && tab.label}
                      </button>
                    </div>
                  );
                })}
              </nav>
            </div>

            <div className="mt-auto pt-4 pb-[35%] border-t border-gray-300">
              <button
                type="button"
                onClick={handleLogout}
                className={`w-full flex items-center rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 ${
                  sidebarWidth < 12 ? 'justify-center px-2 py-2 mb-15' : 'px-3 py-2.5'
                }`}
                title={sidebarWidth < 9 ? 'Logout' : ''}
              >
                <FiLogOut className={`h-4 w-4 ${sidebarWidth >= 9 ? 'mr-2' : ''}`} />
                {sidebarWidth >= 9 && 'Logout'}
              </button>
            </div>
          </div>
        </aside>

        <div
          ref={dragRef}
          onMouseDown={handleMouseDown}
          className="fixed top-0 h-screen w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize z-10 transition-colors duration-200 flex items-center justify-center group"
          style={{ left: `${sidebarWidth}%` }}
        >
          <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center">
            <div className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors duration-200" />
          </div>
        </div>

        <main
          className="bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 min-h-screen transition-all duration-200 ease-in-out"
          style={{
            marginLeft: `${sidebarWidth}%`,
            width: `${100 - sidebarWidth}%`
          }}
        >
          <div className="p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default RecruiterDashboard;