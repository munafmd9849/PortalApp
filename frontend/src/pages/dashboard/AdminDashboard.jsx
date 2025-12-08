import React, { useCallback, useEffect, useRef, useState } from 'react';
import AdminLayout from '../../components/dashboard/shared/AdminLayout';
import AdminHome from '../../components/dashboard/admin/AdminHome';
import CreateJob from '../../components/dashboard/admin/CreateJob';
import ManageJobs from '../../components/dashboard/admin/ManageJobs';
import JobPostingsManager from '../../components/dashboard/admin/JobPostingsManager';
import StudentDirectory from '../../components/dashboard/admin/StudentDirectory';
import RecruiterDirectory from '../../components/dashboard/admin/RecruiterDirectory';
import AdminPanel from '../../components/dashboard/admin/AdminPanel';
import Notifications from '../../components/dashboard/admin/Notifications';
import AdminProfile from '../../components/dashboard/admin/AdminProfile';
import AdminJobDetail from '../../components/dashboard/admin/AdminJobDetail';
import { Home, FilePlus2, Briefcase, ClipboardList, GripVertical, LogOut, Users, Bell, Settings, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [sidebarWidth, setSidebarWidth] = useState(15); // % width, 5-15 like student
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Sync activeTab with URL params
  useEffect(() => {
    const tab = searchParams.get('tab') || 'dashboard';
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  // Listen for editProfileClicked event
  useEffect(() => {
    const handleEditProfileClick = () => {
      setActiveTab('profile');
      setSearchParams({ tab: 'profile' });
    };

    window.addEventListener('editProfileClicked', handleEditProfileClick);
    return () => {
      window.removeEventListener('editProfileClicked', handleEditProfileClick);
    };
  }, [setSearchParams]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'createJob', label: 'Create Job', icon: FilePlus2 },
    { id: 'manageJobs', label: 'Manage Jobs', icon: Briefcase },
    { id: 'jobPostingsManager', label: 'Job Moderation', icon: ClipboardList },
    { id: 'studentDirectory', label: 'Student Directory', icon: Users },
    { id: 'recruiterDirectory', label: 'Recruiter Directory', icon: Briefcase },
    { id: 'adminPanel', label: 'Admin Panel', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
  ];

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

  const handleLogout = async () => {
    try {
      console.log('Attempting logout...');
      await logout();
      console.log('Logout successful - navigating to home');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout failed: ' + error.message);
    }
  };

  const location = useLocation();
  const isJobDetailPage = location.pathname.includes('/admin/job/');

  const renderContent = () => {
    // Check if we're on a job detail page
    if (isJobDetailPage) {
      return <AdminJobDetail />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <AdminHome />;
      case 'createJob':
        return <CreateJob onCreated={() => setActiveTab('manageJobs')} />;
      case 'manageJobs':
        return <ManageJobs />;
      case 'jobPostingsManager':
        return <JobPostingsManager />;
      case 'studentDirectory':
        return <StudentDirectory />;
      case 'recruiterDirectory':
        return <RecruiterDirectory />;
      case 'adminPanel':
        return <AdminPanel />;
      case 'notifications':
        return <Notifications />;
      case 'profile':
        return <AdminProfile />;
      default:
        return <AdminHome />;

    }
  };

  return (
    <AdminLayout>
      <div className="flex min-h-screen relative">
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
                        onClick={() => {
                          setActiveTab(tab.id);
                          setSearchParams({ tab: tab.id });
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

            <div className="mt-auto pt-4 pb-[35%] border-t border-gray-300">
              <button
                type="button"
                onClick={handleLogout}
                className={`w-full flex items-center rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 ${
                  sidebarWidth < 12 ? 'justify-center px-2 py-2 mb-15' : 'px-3 py-2.5'
                }`}
                title={sidebarWidth < 9 ? 'Logout' : ''}
              >
                <LogOut className={`h-4 w-4 ${sidebarWidth >= 9 ? 'mr-2' : ''}`} />
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
            <GripVertical className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors duration-200" />
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
    </AdminLayout>
  );
}
