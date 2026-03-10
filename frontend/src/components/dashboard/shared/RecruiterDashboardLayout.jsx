import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiBriefcase, FiUsers, FiCalendar, FiMessageSquare, FiBarChart2, FiSettings, FiLogOut } from 'react-icons/fi';
import PWIOILOGO from '../../../assets/images/brand_logo.webp';
import { useAuth } from '../../../hooks/useAuth';
import showLogoutConfirm from '../../../utils/logoutConfirm';

const RecruiterDashboardLayout = ({ children }) => {
  const [sidebarWidth, setSidebarWidth] = useState(15); // Sidebar width in percentage
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome, path: '/recruiter/dashboard' },
    { id: 'jobs', label: 'Job Postings', icon: FiBriefcase },
    { id: 'candidates', label: 'Candidates', icon: FiUsers },
    { id: 'calendar', label: 'Calendar', icon: FiCalendar },
    { id: 'messages', label: 'Messages', icon: FiMessageSquare },
    { id: 'analytics', label: 'Analytics', icon: FiBarChart2 },
    { id: 'settings', label: 'Settings', icon: FiSettings },
  ];

  const [activeTab, setActiveTab] = useState('dashboard');

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const windowWidth = window.innerWidth;
    const newWidth = (e.clientX / windowWidth) * 100;
    const constrainedWidth = Math.min(Math.max(newWidth, 5), 15);
    setSidebarWidth(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
  }, [isDragging]);

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

  const recruiterTagline = 'Connecting Opportunities with Talent.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      {/* Horizontal Navbar - fixed at top, never scrolls */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-blue-100">
        <div className="w-full px-2 py-1">
          <div
            className="px-6 py-1 rounded-xl bg-gradient-to-br from-white to-blue-300 border-2 border-gray-400"
          >
            <div className="flex justify-between items-center h-23 gap-2 relative">
              {/* Left Side - Recruiter Details */}
              <div className="flex items-center flex-1">
                <div className="ml-4 space-y-1.5">
                  <div className="flex items-center">
                    <h2 className="text-2xl font-bold text-black flex items-center">
                      Welcome, Recruiter!
                    </h2>
                  </div>
                  <div className='ml-2 italic'>
                    <p>{recruiterTagline}</p>
                  </div>
                </div>
              </div>

              {/* Center - PWIOI logo and tagline */}
              <div className='absolute top-1 start-1/2 -translate-x-1/5 w-fit flex flex-col items-center gap-2 pointer-events-none z-0'>
                <img src={PWIOILOGO} alt="" className='w-20' />
                <h1 className='text-nowrap text-3xl text-black-300 opacity-90 font-caveat'>{recruiterTagline}</h1>
              </div>

              {/* Right Side - empty (no actions) */}
              <div className="flex items-center gap-2 z-30"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar and Main Content - pt reserves space for fixed header */}
      <div className="flex min-h-[calc(100vh-6.5rem)] pt-[6.5rem]">
        {/* Sidebar */}
        <aside
          className="bg-white border-r border-gray-200 fixed top-[6.5rem] left-0 bottom-[4rem] overflow-y-auto overflow-x-hidden scrollbar-hide transition-all duration-200 ease-in-out z-40"
          style={{ width: `${sidebarWidth}%` }}
        >
          <div className="p-3 pb-4">
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
                        onClick={() => {
                          setActiveTab(tab.id);
                          if (tab.path) navigate(tab.path);
                        }}
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
          </div>
        </aside>
        {/* Logout - fixed at bottom-left, always visible */}
        <div
          className="fixed bottom-0 left-0 z-50 p-3 border-t border-gray-300 bg-white"
          style={{ width: `${sidebarWidth}%` }}
        >
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 ${
              sidebarWidth < 12 ? 'justify-center px-2 py-2' : 'px-3 py-2.5'
            }`}
            title={sidebarWidth < 9 ? 'Logout' : ''}
          >
            <FiLogOut className={`h-4 w-4 ${sidebarWidth >= 9 ? 'mr-2' : ''}`} />
            {sidebarWidth >= 9 && 'Logout'}
          </button>
        </div>

        <div
          onMouseDown={handleMouseDown}
          className="fixed top-0 h-screen w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize z-10 transition-colors duration-200 flex items-center justify-center group"
          style={{ left: `${sidebarWidth}%` }}
        >
          <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center">
            <div className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors duration-200" />
          </div>
        </div>

        {/* Main Content */}
        <main
          className="bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 min-h-screen transition-all duration-200 ease-in-out"
          style={{
            marginLeft: `${sidebarWidth}%`,
            width: `${100 - sidebarWidth}%`
          }}
        >
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default RecruiterDashboardLayout;