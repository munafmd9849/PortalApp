
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '../../components/dashboard/shared/AdminLayout';
import { AdminMobileMenuContext } from '../../contexts/AdminMobileMenuContext';
import AdminHome from '../../components/dashboard/admin/AdminHome';
import CreateJob from '../../components/dashboard/admin/CreateJob';
import ManageJobs from '../../components/dashboard/admin/ManageJobs';
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
import CreateDisableAdmins from '../../components/dashboard/admin/CreateDisableAdmins';
import SuperAdminStats from '../../components/dashboard/admin/SuperAdminStats';
import AuditLogs from '../../components/dashboard/admin/AuditLogs';
import ConnectGoogleCalendar from '../ConnectGoogleCalendar';
import { Home, FilePlus2, Briefcase, GripVertical, LogOut, Users, Bell, Settings, User, Calendar, UserPlus, BarChart3, X, History } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import showLogoutConfirm from '../../utils/logoutConfirm';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

const BASE = '/super-admin';

export default function SuperAdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [sidebarWidth, setSidebarWidth] = useState(15);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const dragRef = useRef(null);
  const { logout, user, role, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = () => setIsMobileView(mql.matches);
    mql.addEventListener('change', handler);
    handler();
    return () => mql.removeEventListener('change', handler);
  }, []);

  const isJobDetailPage = location.pathname.includes(`${BASE}/job/`);
  const isJobApplicationsPage = location.pathname.includes(`${BASE}/jobs/`) && location.pathname.endsWith('/applications');

  useEffect(() => {
    if (loading) return;
    const userRole = (role || user?.role || '').toUpperCase();
    if (!user) {
      navigate('/', { replace: true });
      return;
    }
    if (userRole !== 'SUPER_ADMIN') {
      const redirectPath = userRole === 'STUDENT' ? '/student' : userRole === 'ADMIN' ? '/admin' : userRole === 'RECRUITER' ? '/recruiter' : '/';
      navigate(redirectPath, { replace: true });
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (isJobApplicationsPage) {
      if (activeTab !== 'jobApplications') setActiveTab('jobApplications');
      return;
    }
    if (isJobDetailPage) {
      if (activeTab !== 'manageJobs') setActiveTab('manageJobs');
      return;
    }
    const tab = searchParams.get('tab') || 'dashboard';
    if (tab !== activeTab) setActiveTab(tab);
  }, [searchParams, activeTab, isJobApplicationsPage, isJobDetailPage]);

  useEffect(() => {
    const handleEditProfileClick = () => {
      setActiveTab('profile');
      navigate(`${BASE}?tab=profile`);
    };
    window.addEventListener('editProfileClicked', handleEditProfileClick);
    return () => window.removeEventListener('editProfileClicked', handleEditProfileClick);
  }, [navigate]);

  const userRole = (role || user?.role || '').toUpperCase();
  if (loading || !user || userRole !== 'SUPER_ADMIN') return null;

  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'createJob', label: 'Create Job', icon: FilePlus2 },
    { id: 'manageJobs', label: 'Manage Jobs', icon: Briefcase },
    { id: 'jobApplications', label: 'Applicants', icon: Users },
    { id: 'interviewScheduling', label: 'Interview Scheduling', icon: Calendar },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'studentDirectory', label: 'Student Directory', icon: Users },
    { id: 'recruiterDirectory', label: 'Recruiter Directory', icon: Briefcase },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'createDisableAdmins', label: 'Create / Disable Admins', icon: UserPlus },
    { id: 'auditLogs', label: 'Audit Logs', icon: History },
    { id: 'adminPanel', label: 'Admin Panel', icon: Settings },
    { id: 'superAdminStats', label: 'Statistics', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const tabs = allTabs;
  const sidebarActiveTab = useMemo(() => {
    if (isJobApplicationsPage) return 'jobApplications';
    if (isJobDetailPage) return 'manageJobs';
    return activeTab;
  }, [activeTab, isJobApplicationsPage, isJobDetailPage]);

  const handleMouseDown = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const newWidth = Math.min(Math.max((e.clientX / window.innerWidth) * 100, 5), 15);
    setSidebarWidth(newWidth);
  }, [isDragging]);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isDragging) return;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleLogout = async () => {
    const confirmed = await showLogoutConfirm('Are you sure you want to logout?');
    if (!confirmed) return;
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (e) {
      alert('Logout failed: ' + (e?.message || 'Unknown error'));
    }
  };

  const renderContent = () => {
    if (isJobDetailPage) return <AdminJobDetail />;
    if (isJobApplicationsPage) return <AdminJobApplications />;
    switch (activeTab) {
      case 'dashboard': return <AdminHome />;
      case 'createJob': return <CreateJob onCreated={() => setActiveTab('manageJobs')} />;
      case 'manageJobs': return <ManageJobs />;
      case 'jobApplications': return <AdminApplicantsHub />;
      case 'interviewScheduling': return <InterviewScheduling />;
      case 'calendar': return <ConnectGoogleCalendar />;
      case 'jobPostingsManager': return <JobPostingsManager />;
      case 'studentDirectory': return <StudentDirectory />;
      case 'recruiterDirectory': return <RecruiterDirectory />;
      case 'notifications': return <Notifications />;
      case 'createDisableAdmins': return <CreateDisableAdmins />;
      case 'auditLogs': return <AuditLogs />;
      case 'adminPanel': return <AdminPanel />;
      case 'superAdminStats': return <SuperAdminStats />;
      case 'profile': return <AdminProfile />;
      default: return <AdminHome />;
    }
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    navigate(`${BASE}?tab=${encodeURIComponent(tabId)}`);
  };

  return (
    <AdminMobileMenuContext.Provider value={{ mobileMenuOpen, setMobileMenuOpen }}>
      <AdminLayout>
        <div className="flex min-h-screen relative">
          <aside
            className="hidden md:block bg-white border-r border-gray-200 fixed h-[calc(100vh-5rem)] overflow-hidden transition-all duration-200 ease-in-out z-40"
            style={{ width: `${sidebarWidth}%` }}
          >
            <div className="p-3 h-full flex flex-col min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide">
                <div className="mb-6">
                  {sidebarWidth >= 9 && <h2 className="text-base font-bold text-gray-900 mb-3">Super Admin</h2>}
                  <nav className="space-y-1">
                    {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <div key={tab.id} className="mb-1">
                        <button
                          onClick={() => { setActiveTab(tab.id); navigate(`${BASE}?tab=${encodeURIComponent(tab.id)}`); }}
                          className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-200 ${sidebarActiveTab === tab.id ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' : 'text-gray-600 hover:text-violet-600 hover:bg-violet-50'
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
              <div className="flex-shrink-0 pt-4 pb-4 border-t border-gray-300 mt-auto">
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full flex items-center rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 ${sidebarWidth < 12 ? 'justify-center px-2 py-2 mb-15' : 'px-3 py-2.5'}`}
                  title={sidebarWidth < 9 ? 'Logout' : ''}
                >
                  <LogOut className={`h-4 w-4 ${sidebarWidth >= 9 ? 'mr-2' : ''}`} />
                  {sidebarWidth >= 9 && 'Logout'}
                </button>
              </div>
            </div>
          </aside>
          {mobileMenuOpen && (
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" aria-hidden onClick={() => setMobileMenuOpen(false)} />
          )}
          <aside
            className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white border-r border-gray-200 shadow-xl z-50 md:hidden overflow-hidden transition-transform duration-300 ease-out flex flex-col ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            aria-modal
            aria-label="Navigation menu"
          >
            <div className="p-3 h-full flex flex-col min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-900">Super Admin</h2>
                  <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 touch-manipulation" aria-label="Close menu">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <div key={tab.id} className="mb-1">
                        <button
                          onClick={() => handleTabClick(tab.id)}
                          className={`w-full flex items-center rounded-lg text-sm font-medium px-3 py-3 touch-manipulation ${sidebarActiveTab === tab.id ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' : 'text-gray-600 hover:text-violet-600 hover:bg-violet-50'}`}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {tab.label}
                        </button>
                      </div>
                    );
                  })}
                </nav>
              </div>
              <div className="flex-shrink-0 pt-4 border-t border-gray-300">
                <button type="button" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full flex items-center rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-3 touch-manipulation">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </aside>
          <div
            ref={dragRef}
            onMouseDown={handleMouseDown}
            className="hidden md:flex fixed top-0 h-screen w-1 bg-gray-300 hover:bg-violet-500 cursor-col-resize z-10 transition-colors duration-200 items-center justify-center group"
            style={{ left: `${sidebarWidth}%` }}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center">
              <GripVertical className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors duration-200" />
            </div>
          </div>
          <main
            className="bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 min-h-screen transition-all duration-200 ease-in-out"
            style={isMobileView ? { marginLeft: 0, width: '100%' } : { marginLeft: `${sidebarWidth}%`, width: `${100 - sidebarWidth}%` }}
          >
            <div className="p-4 sm:p-6 md:p-8">{renderContent()}</div>
          </main>
        </div>
      </AdminLayout>
    </AdminMobileMenuContext.Provider>
  );
}
