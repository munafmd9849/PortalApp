import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '../../components/dashboard/shared/AdminLayout';
import AdminHome from '../../components/dashboard/admin/AdminHome';
import CreateJob from '../../components/dashboard/admin/CreateJob';
import ManageJobs from '../../components/dashboard/admin/ManageJobs';
// import ScheduleInterview from '../../components/dashboard/admin/ScheduleInterview'; // Commented out - replaced by InterviewScheduling
import InterviewScheduling from '../../components/dashboard/admin/InterviewScheduling';
import JobPostingsManager from '../../components/dashboard/admin/JobPostingsManager';
import StudentDirectory from '../../components/dashboard/admin/StudentDirectory';
import RecruiterDirectory from '../../components/dashboard/admin/RecruiterDirectory';
import AdminPanel from '../../components/dashboard/admin/AdminPanel';
import Notifications from '../../components/dashboard/admin/Notifications';
import AdminProfile from '../../components/dashboard/admin/AdminProfile';
import AdminJobDetail from '../../components/dashboard/admin/AdminJobDetail';
import AdminJobApplications from '../../components/dashboard/admin/AdminJobApplications';
import AdminApplicantsHub from '../../components/dashboard/admin/AdminApplicantsHub';
import ConnectGoogleCalendar from '../ConnectGoogleCalendar';
import { Home, FilePlus2, Briefcase, GripVertical, LogOut, Users, Bell, Settings, User, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import RequireRole from '../../components/RequireRole';

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [sidebarWidth, setSidebarWidth] = useState(15); // % width, 5-15 like student
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const { logout, user, role, loading } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();
  const isJobDetailPage = location.pathname.includes('/admin/job/');
  const isJobApplicationsPage = location.pathname.includes('/admin/jobs/') && location.pathname.endsWith('/applications');

  // MANDATORY: Hard block unauthorized access on mount
  useEffect(() => {
    if (loading) return;

    const userRole = role?.toUpperCase() || user?.role?.toUpperCase() || '';
    const allowedRoles = ['ADMIN', 'RECRUITER'];

    if (!user) {
      console.error('🚫 AdminDashboard: No authenticated user');
      navigate('/', { replace: true });
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      console.error('🚫 AdminDashboard: Unauthorized access attempt:', {
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
  }, [user, role, loading, navigate, location.pathname]);

  // Don't render anything if unauthorized
  if (loading) return null;

  const userRole = role?.toUpperCase() || user?.role?.toUpperCase() || '';
  const allowedRoles = ['ADMIN', 'RECRUITER'];

  if (!user || !allowedRoles.includes(userRole)) {
    return null; // Will redirect via useEffect
  }

  // Sync activeTab with URL params
  useEffect(() => {
    // Special pages are driven by pathname, not ?tab=...
    if (isJobApplicationsPage) {
      if (activeTab !== 'jobApplications') setActiveTab('jobApplications');
      return;
    }
    if (isJobDetailPage) {
      if (activeTab !== 'manageJobs') setActiveTab('manageJobs');
      return;
    }

    const tab = searchParams.get('tab') || 'dashboard';
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab, isJobApplicationsPage, isJobDetailPage]);

  // Listen for editProfileClicked event
  useEffect(() => {
    const handleEditProfileClick = () => {
      setActiveTab('profile');
      // Ensure we leave special sub-routes like /admin/job/:id or /admin/jobs/:id/applications
      navigate('/admin?tab=profile');
    };

    window.addEventListener('editProfileClicked', handleEditProfileClick);
    return () => {
      window.removeEventListener('editProfileClicked', handleEditProfileClick);
    };
  }, [navigate]);

  // Role-based tab filtering - STUDENT users cannot see Create Job or other admin-only tabs
  // userRole is already declared above (line 68), reuse it here
  const userRoleUpper = userRole.toUpperCase();
  const isAdmin = userRoleUpper === 'ADMIN';
  const isSuperAdmin = userRoleUpper === 'SUPER_ADMIN';
  const isRecruiter = userRoleUpper === 'RECRUITER';
  const isStudent = userRoleUpper === 'STUDENT';
  const canCreateJobs = isAdmin || isRecruiter;
  const isAdminOnly = isAdmin;
  const isSuperAdminOnly = isSuperAdmin;

  // Base tabs available to all authorized users
  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['ADMIN', 'RECRUITER', 'STUDENT'] },
    { id: 'createJob', label: 'Create Job', icon: FilePlus2, roles: ['ADMIN', 'RECRUITER'] }, // ADMIN and RECRUITER only
    { id: 'manageJobs', label: 'Manage Jobs', icon: Briefcase, roles: ['ADMIN', 'RECRUITER'] }, // ADMIN and RECRUITER only
    { id: 'jobApplications', label: 'Applicants', icon: Users, roles: ['ADMIN', 'RECRUITER'] }, // ADMIN and RECRUITER only
    // { id: 'scheduleInterview', label: 'Schedule Interview', icon: Calendar }, // Commented out - replaced by InterviewScheduling
    { id: 'interviewScheduling', label: 'Interview Scheduling', icon: Calendar, roles: ['ADMIN', 'RECRUITER'] },
    { id: 'calendar', label: 'Calendar', icon: Calendar, roles: ['ADMIN', 'RECRUITER'] },
    // { id: 'jobPostingsManager', label: 'Job Moderation', icon: ClipboardList }, // Removed from sidebar - page still exists
    { id: 'studentDirectory', label: 'Student Directory', icon: Users, roles: ['ADMIN'] }, // ADMIN only
    { id: 'recruiterDirectory', label: 'Recruiter Directory', icon: Briefcase, roles: ['ADMIN'] }, // ADMIN only
    { id: 'adminPanel', label: 'Admin Panel', icon: Settings, roles: ['SUPER_ADMIN'] }, // SUPER_ADMIN only
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['ADMIN', 'RECRUITER', 'STUDENT'] },
    { id: 'profile', label: 'Profile', icon: User, roles: ['ADMIN', 'RECRUITER', 'STUDENT'] },
  ];

  // Filter tabs based on user role - STUDENT users should not see job creation tabs
  const tabs = allTabs.filter(tab => {
    const allowedRoles = tab.roles || [];
    return allowedRoles.includes(userRoleUpper);
  });

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
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) {
      return; // User cancelled, don't proceed with logout
    }

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

  // Sidebar highlight should reflect where we are, even on special pages
  const sidebarActiveTab = useMemo(() => {
    if (isJobApplicationsPage) return 'jobApplications';
    if (isJobDetailPage) return 'manageJobs';
    return activeTab;
  }, [activeTab, isJobApplicationsPage, isJobDetailPage]);

  const renderContent = () => {
    // ROLE CHECK: Block unauthorized access to job creation tabs
    const unauthorizedJobTabs = ['createJob', 'manageJobs', 'jobApplications', 'interviewScheduling', 'calendar'];
    if (isStudent && unauthorizedJobTabs.includes(activeTab)) {
      console.error('🚫 STUDENT user attempted to access restricted tab:', activeTab);
      // Redirect to dashboard and show error
      setActiveTab('dashboard');
      navigate('/admin?tab=dashboard');
      return <div className="text-red-600 font-semibold">Access denied: You don't have permission to access this section.</div>;
    }

    // Check if we're on a job detail page
    if (isJobDetailPage) {
      return <AdminJobDetail />;
    }
    // New: Admin Job -> Applicants -> Interview Progress (read-only)
    if (isJobApplicationsPage) {
      return <AdminJobApplications />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <AdminHome />;
      case 'createJob':
        // Additional role check before rendering CreateJob component
        if (!canCreateJobs) {
          console.error('🚫 Unauthorized user attempted to access Create Job:', { userRole, userId: user?.id });
          return <div className="text-red-600 font-semibold">Access denied: Only ADMIN or RECRUITER users can create jobs.</div>;
        }
        return <CreateJob onCreated={() => setActiveTab('manageJobs')} />;
      case 'manageJobs':
        if (!canCreateJobs) {
          console.error('🚫 Unauthorized user attempted to access Manage Jobs:', { userRole, userId: user?.id });
          return <div className="text-red-600 font-semibold">Access denied: Only ADMIN or RECRUITER users can manage jobs.</div>;
        }
        return <ManageJobs />;
      case 'jobApplications':
        if (!canCreateJobs) {
          return <div className="text-red-600 font-semibold">Access denied: Only ADMIN or RECRUITER users can view job applications.</div>;
        }
        return <AdminApplicantsHub />;
      // case 'scheduleInterview':
      //   return <ScheduleInterview />; // Commented out - replaced by InterviewScheduling
      case 'interviewScheduling':
        if (!canCreateJobs) {
          return <div className="text-red-600 font-semibold">Access denied: Only ADMIN or RECRUITER users can schedule interviews.</div>;
        }
        return <InterviewScheduling />;
      case 'calendar':
        if (!canCreateJobs) {
          return <div className="text-red-600 font-semibold">Access denied: Only ADMIN or RECRUITER users can access calendar.</div>;
        }
        return <ConnectGoogleCalendar />;
      case 'jobPostingsManager':
        if (!isAdminOnly) {
          return <div className="text-red-600 font-semibold">Access denied: Only ADMIN users can access job moderation.</div>;
        }
        return <JobPostingsManager />;
      case 'studentDirectory':
        if (!isAdminOnly) {
          return <div className="text-red-600 font-semibold">Access denied: Only ADMIN users can access student directory.</div>;
        }
        return <StudentDirectory />;
      case 'recruiterDirectory':
        if (!isAdminOnly) {
          return <div className="text-red-600 font-semibold">Access denied: Only ADMIN users can access recruiter directory.</div>;
        }
        return <RecruiterDirectory />;
      case 'adminPanel':
        if (!isSuperAdminOnly) {
          return <div className="text-red-600 font-semibold">Access denied: Only SUPER_ADMIN users can access admin panel.</div>;
        }
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
                          // IMPORTANT: Always navigate to the base admin route so
                          // special pages (job detail / job applications) don't trap navigation.
                          navigate(`/admin?tab=${encodeURIComponent(tab.id)}`);
                        }}
                        className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-200 ${
                          sidebarActiveTab === tab.id
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
