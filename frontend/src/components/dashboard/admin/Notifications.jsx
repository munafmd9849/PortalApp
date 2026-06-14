import React, { useState, useEffect } from 'react';
import { 
  FaBell, 
  FaUserGraduate, 
  FaBriefcase, 
  FaClipboardCheck, 
  FaUsers, 
  FaSearch, 
  FaFilter,
  FaCheck,
  FaTimes,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaClock,
  FaChevronDown,
  FaChevronUp,
  FaSync,
  FaSpinner,
  FaEnvelopeOpen,
  FaQuestionCircle,
  FaChartLine,
  FaCalendarAlt,
  FaReply
} from 'react-icons/fa';
import { 
  QUERY_STATUS,
  QUERY_TYPES
} from '../../../services/queries';

// Notification types constants (moved from queries service for compatibility)
const NOTIFICATION_TYPES = {
  JD_APPROVAL: 'jd_approval',
  JOB_APPLICATION: 'job_application',
  STUDENT_QUERY: 'student_query',
  ADMIN_COORDINATION: 'admin_coordination',
  RECRUITER_INQUIRY: 'recruiter_inquiry'
};

const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};
import { 
  subscribeToNotifications, 
  markNotificationAsRead, 
  deleteNotification,
  listNotificationsForUser
} from '../../../services/notifications';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { respondToStudentQuery } from '../../../services/queries';

const Notifications = () => {
  const { user, role, getPendingAdminRequests, approveAdminRequest, rejectAdminRequest } = useAuth();
  const isSuperAdmin = (role || user?.role || '').toLowerCase() === 'super_admin';
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [respondingToQuery, setRespondingToQuery] = useState(false);
  
  // Firebase state
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  
  // Admin requests state
  const [adminRequests, setAdminRequests] = useState([]);
  const [loadingAdminRequests, setLoadingAdminRequests] = useState(false);

  // Search handlers
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const notificationsList = await listNotificationsForUser();
      setNotifications(notificationsList || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      alert('Failed to load notifications: ' + error.message);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Load notifications from backend API with real-time subscription
  useEffect(() => {
    console.log('🔄 Setting up notifications subscription...');
    setLoadingNotifications(true);
    
    const unsubscribe = subscribeToNotifications(
      (notificationsList) => {
        console.log('📨 Received notifications:', notificationsList.length);
        console.log('📨 Notification details:', notificationsList.map(n => ({
          id: n.id,
          title: n.title,
          type: n.type,
          isRead: n.isRead,
          meta: n.meta
        })));
        setNotifications(notificationsList || []);
        setLoadingNotifications(false);
      }
    );

    loadNotifications();
    return () => {
      console.log('🧹 Cleaning up notifications subscription');
      if (unsubscribe) unsubscribe();
    };
  }, [activeFilter]);

  // Clear search input when filter changes
  useEffect(() => {
    setSearchInput('');
    setSearchQuery('');
  }, [activeFilter]);

  // Switch away from Admin Coordination if viewer is not Super Admin
  useEffect(() => {
    if (!isSuperAdmin && activeFilter === 'admin_coordination') {
      setActiveFilter('all');
    }
  }, [isSuperAdmin, activeFilter]);

  // Load admin requests only for Super Admin when admin_coordination filter is active
  useEffect(() => {
    if (isSuperAdmin && activeFilter === 'admin_coordination') {
      loadAdminRequests();
    }
  }, [isSuperAdmin, activeFilter]);

  const loadAdminRequests = async () => {
    try {
      setLoadingAdminRequests(true);
      const requests = await getPendingAdminRequests();
      setAdminRequests(requests);
    } catch (error) {
      console.error('Error loading admin requests:', error);
    } finally {
      setLoadingAdminRequests(false);
    }
  };

  // Handle admin request approval
  const handleApproveAdmin = async (requestId, requestUid, email) => {
    setActionLoading(prev => ({ ...prev, [`admin_${requestId}`]: 'approving' }));
    try {
      await approveAdminRequest(requestId, requestUid);
      setAdminRequests(prev => prev.filter(req => req.id !== requestId));
      console.log(`✅ Admin request approved for ${email}`);
    } catch (error) {
      console.error('Error approving admin request:', error);
      alert(`Failed to approve ${email}: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`admin_${requestId}`]: null }));
    }
  };

  // Handle admin request rejection
  const handleRejectAdmin = async (requestId, requestUid, email) => {
    setActionLoading(prev => ({ ...prev, [`admin_${requestId}`]: 'rejecting' }));
    try {
      await rejectAdminRequest(requestId, requestUid);
      setAdminRequests(prev => prev.filter(req => req.id !== requestId));
      console.log(`❌ Admin request rejected for ${email}`);
    } catch (error) {
      console.error('Error rejecting admin request:', error);
      alert(`Failed to reject ${email}: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`admin_${requestId}`]: null }));
    }
  };

  // Admit/Reject PENDING admin who tried to log in (admin_login notification) — Super Admin only
  const handleAdmitAdminLogin = async (notificationId, userId, email) => {
    const key = `admin_login_admit_${notificationId}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      await api.enableSuperAdminAdmin(userId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      console.log(`✅ Admin admitted: ${email}`);
    } catch (error) {
      console.error('Error admitting admin:', error);
      alert(`Failed to admit ${email}: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleRejectAdminLogin = async (notificationId, userId, email) => {
    const key = `admin_login_reject_${notificationId}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      await api.disableSuperAdminAdmin(userId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      console.log(`❌ Admin rejected: ${email}`);
    } catch (error) {
      console.error('Error rejecting admin:', error);
      alert(`Failed to reject ${email}: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const NOTIFICATION_THEMES = {
    question_request: {
      iconBg: 'bg-blue-50', iconText: 'text-blue-600', accent: 'border-l-blue-400', chip: 'bg-blue-50 text-blue-700',
    },
    cgpa_request: {
      iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', accent: 'border-l-emerald-400', chip: 'bg-emerald-50 text-emerald-700',
    },
    calendar_request: {
      iconBg: 'bg-violet-50', iconText: 'text-violet-600', accent: 'border-l-violet-400', chip: 'bg-violet-50 text-violet-700',
    },
    [NOTIFICATION_TYPES.JD_APPROVAL]: {
      iconBg: 'bg-amber-50', iconText: 'text-amber-600', accent: 'border-l-amber-400', chip: 'bg-amber-50 text-amber-700',
    },
    jd_approval: {
      iconBg: 'bg-amber-50', iconText: 'text-amber-600', accent: 'border-l-amber-400', chip: 'bg-amber-50 text-amber-700',
    },
    [NOTIFICATION_TYPES.JOB_APPLICATION]: {
      iconBg: 'bg-sky-50', iconText: 'text-sky-600', accent: 'border-l-sky-400', chip: 'bg-sky-50 text-sky-700',
    },
    applicationreview: {
      iconBg: 'bg-sky-50', iconText: 'text-sky-600', accent: 'border-l-sky-400', chip: 'bg-sky-50 text-sky-700',
    },
    application: {
      iconBg: 'bg-sky-50', iconText: 'text-sky-600', accent: 'border-l-sky-400', chip: 'bg-sky-50 text-sky-700',
    },
    admincollab: {
      iconBg: 'bg-indigo-50', iconText: 'text-indigo-600', accent: 'border-l-indigo-400', chip: 'bg-indigo-50 text-indigo-700',
    },
    admin_coordination: {
      iconBg: 'bg-indigo-50', iconText: 'text-indigo-600', accent: 'border-l-indigo-400', chip: 'bg-indigo-50 text-indigo-700',
    },
    admin_login: {
      iconBg: 'bg-indigo-50', iconText: 'text-indigo-600', accent: 'border-l-indigo-400', chip: 'bg-indigo-50 text-indigo-700',
    },
    [NOTIFICATION_TYPES.RECRUITER_INQUIRY]: {
      iconBg: 'bg-teal-50', iconText: 'text-teal-600', accent: 'border-l-teal-400', chip: 'bg-teal-50 text-teal-700',
    },
    recruiter_inquiry: {
      iconBg: 'bg-teal-50', iconText: 'text-teal-600', accent: 'border-l-teal-400', chip: 'bg-teal-50 text-teal-700',
    },
    default: {
      iconBg: 'bg-gray-50', iconText: 'text-gray-500', accent: 'border-l-gray-300', chip: 'bg-gray-50 text-gray-600',
    },
  };

  const FILTER_THEMES = {
    all: {
      active: 'bg-slate-100 text-slate-800',
      inactive: 'text-gray-500 hover:bg-slate-50 hover:text-slate-700',
      header: 'bg-slate-50 border-slate-100',
      headerText: 'text-slate-700',
      count: 'text-slate-500',
      empty: 'text-slate-300',
    },
    unread: {
      active: 'bg-blue-50 text-blue-800',
      inactive: 'text-gray-500 hover:bg-blue-50/50 hover:text-blue-700',
      header: 'bg-blue-50/60 border-blue-100',
      headerText: 'text-blue-800',
      count: 'text-blue-600',
      empty: 'text-blue-200',
    },
    jd_approvals: {
      active: 'bg-amber-50 text-amber-800',
      inactive: 'text-gray-500 hover:bg-amber-50/50 hover:text-amber-700',
      header: 'bg-amber-50/60 border-amber-100',
      headerText: 'text-amber-800',
      count: 'text-amber-600',
      empty: 'text-amber-200',
    },
    student_queries: {
      active: 'bg-emerald-50 text-emerald-800',
      inactive: 'text-gray-500 hover:bg-emerald-50/50 hover:text-emerald-700',
      header: 'bg-emerald-50/60 border-emerald-100',
      headerText: 'text-emerald-800',
      count: 'text-emerald-600',
      empty: 'text-emerald-200',
    },
    job_applications: {
      active: 'bg-sky-50 text-sky-800',
      inactive: 'text-gray-500 hover:bg-sky-50/50 hover:text-sky-700',
      header: 'bg-sky-50/60 border-sky-100',
      headerText: 'text-sky-800',
      count: 'text-sky-600',
      empty: 'text-sky-200',
    },
    admin_coordination: {
      active: 'bg-indigo-50 text-indigo-800',
      inactive: 'text-gray-500 hover:bg-indigo-50/50 hover:text-indigo-700',
      header: 'bg-indigo-50/60 border-indigo-100',
      headerText: 'text-indigo-800',
      count: 'text-indigo-600',
      empty: 'text-indigo-200',
    },
    recruiter_inquiries: {
      active: 'bg-teal-50 text-teal-800',
      inactive: 'text-gray-500 hover:bg-teal-50/50 hover:text-teal-700',
      header: 'bg-teal-50/60 border-teal-100',
      headerText: 'text-teal-800',
      count: 'text-teal-600',
      empty: 'text-teal-200',
    },
  };

  const getNotificationTheme = (type) => NOTIFICATION_THEMES[type] || NOTIFICATION_THEMES.default;

  const getFilterTheme = (filterId) => FILTER_THEMES[filterId] || FILTER_THEMES.all;

  const getNotificationTypeLabel = (type) => {
    switch (type) {
      case 'question_request': return 'Question';
      case 'cgpa_request': return 'CGPA';
      case 'calendar_request': return 'Calendar';
      case NOTIFICATION_TYPES.JD_APPROVAL:
      case 'jd_approval': return 'JD approval';
      case NOTIFICATION_TYPES.JOB_APPLICATION:
      case 'applicationreview':
      case 'application': return 'Application';
      case 'admincollab':
      case 'admin_coordination':
      case 'admin_login': return 'Admin';
      case NOTIFICATION_TYPES.RECRUITER_INQUIRY:
      case 'recruiter_inquiry': return 'Recruiter';
      default: return 'Notice';
    }
  };

  const getNotificationIcon = (type) => {
    const theme = getNotificationTheme(type);
    const iconBox = (Icon) => (
      <div className={`w-7 h-7 flex items-center justify-center rounded-sm ${theme.iconBg} ${theme.iconText}`}>
        <Icon className="text-xs" />
      </div>
    );
    switch (type) {
      case 'question_request':
        return iconBox(FaQuestionCircle);
      case 'cgpa_request':
        return iconBox(FaChartLine);
      case 'calendar_request':
        return iconBox(FaCalendarAlt);
      case NOTIFICATION_TYPES.JD_APPROVAL:
      case 'jd_approval':
        return iconBox(FaBriefcase);
      case NOTIFICATION_TYPES.JOB_APPLICATION:
      case 'applicationreview':
        return iconBox(FaClipboardCheck);
      case 'admincollab':
      case 'admin_coordination':
      case 'admin_login':
        return iconBox(FaUsers);
      case NOTIFICATION_TYPES.RECRUITER_INQUIRY:
      case 'recruiter_inquiry':
        return iconBox(FaEnvelopeOpen);
      default:
        return iconBox(FaBell);
    }
  };

  const filteredAdminRequests = adminRequests.filter((request) => {
    if (!searchQuery) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return (
      request.email?.toLowerCase().includes(query) ||
      request.uid?.toLowerCase().includes(query) ||
      request.reason?.toLowerCase().includes(query)
    );
  });

  // Filter notifications based on active filter and search
  const filteredNotifications = notifications.filter(notification => {
    // Filter by type
    if (activeFilter !== 'all') {
      if (activeFilter === 'student_queries') {
        const studentQueryTypes = [
          'question_request',
          'cgpa_request', 
          'calendar_request'
        ];
        if (!studentQueryTypes.includes(notification.type)) return false;
      } else if (activeFilter === 'jd_approvals') {
        if (notification.type !== NOTIFICATION_TYPES.JD_APPROVAL && notification.type !== 'jd_approval') return false;
      } else if (activeFilter === 'job_applications') {
        if (notification.type !== NOTIFICATION_TYPES.JOB_APPLICATION && 
            notification.type !== 'applicationreview' && 
            notification.type !== 'application') return false;
      } else if (activeFilter === 'admin_coordination') {
        if (notification.type !== 'admincollab' && notification.type !== 'admin_coordination' && notification.type !== 'admin_login') return false;
      } else if (activeFilter === 'recruiter_inquiries') {
        if (notification.type !== NOTIFICATION_TYPES.RECRUITER_INQUIRY && notification.type !== 'recruiter_inquiry') return false;
      } else if (activeFilter === 'unread') {
        if (notification.isRead) return false;
      } else if (activeFilter === 'high_priority') {
        if (notification.priority !== PRIORITY_LEVELS.HIGH && notification.priority !== 'high') return false;
      }
    }

    // Filter by search query (only if searchQuery has actual content)
    if (searchQuery && searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      const matches = (
        notification.title?.toLowerCase().includes(query) ||
        notification.message?.toLowerCase().includes(query) ||
        notification.body?.toLowerCase().includes(query) ||
        notification.from?.toLowerCase().includes(query) ||
        notification.meta?.studentName?.toLowerCase().includes(query) ||
        notification.meta?.recruiterName?.toLowerCase().includes(query) ||
        notification.meta?.userName?.toLowerCase().includes(query) ||
        notification.meta?.company?.toLowerCase().includes(query) ||
        notification.meta?.companyName?.toLowerCase().includes(query) ||
        notification.meta?.email?.toLowerCase().includes(query) ||
        notification.meta?.contactNumber?.toLowerCase().includes(query)
      );
      if (!matches) return false;
    }

    return true;
  });

  // Mark notification as read
  const markAsRead = async (id) => {
    if (actionLoading[id]) return;
    
    setActionLoading({ ...actionLoading, [id]: true });
    
    try {
      await markNotificationAsRead(id);
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      alert('Failed to mark notification as read');
    } finally {
      setActionLoading({ ...actionLoading, [id]: false });
    }
  };

  // Delete notification
  const handleDeleteNotification = async (id) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    setActionLoading({ ...actionLoading, [id]: true });
    
    try {
      await deleteNotification(id);
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== id));
      console.log('✅ Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification: ' + error.message);
    } finally {
      setActionLoading({ ...actionLoading, [id]: false });
    }
  };

  // Open notification detail modal
  const openDetailModal = async (notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
    
    // Mark as read when opened
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  // Handle query response
  const handleRespondToQuery = async () => {
    if (!selectedNotification?.meta?.queryId || !responseText.trim()) {
      alert('Please enter a response');
      return;
    }

    setRespondingToQuery(true);
    try {
      await respondToStudentQuery(selectedNotification.meta.queryId, {
        response: responseText.trim(),
        status: 'RESOLVED'
      });
      
      // Update notification to reflect response
      setNotifications(prev => prev.map(n => 
        n.id === selectedNotification.id 
          ? { ...n, isRead: true, meta: { ...n.meta, responded: true } }
          : n
      ));
      
      setShowResponseModal(false);
      setShowDetailModal(false);
      setResponseText('');
      alert('Response sent successfully!');
    } catch (error) {
      console.error('Error responding to query:', error);
      alert('Failed to send response: ' + error.message);
    } finally {
      setRespondingToQuery(false);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (markingAllAsRead) return;
    
    const unreadNotifications = notifications.filter(n => !n.isRead);
    const unreadCount = unreadNotifications.length;
    
    if (unreadCount === 0) {
      alert('No unread notifications to mark as read.');
      return;
    }

    if (!confirm(`Are you sure you want to mark all ${unreadCount} unread notifications as read?`)) {
      return;
    }

    setMarkingAllAsRead(true);
    
    try {
      await api.markAllNotificationsRead();
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      
      console.log('✅ Mark all as read completed');
      alert(`Successfully marked ${unreadCount} notifications as read!`);
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      alert('Failed to mark all notifications as read: ' + error.message);
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  // Get filter counts with proper counting
  const getFilterCounts = () => {
    const counts = {
      all: notifications.length,
      student_queries: notifications.filter(n => [
        'question_request',
        'cgpa_request',
        'calendar_request'
      ].includes(n.type)).length,
      jd_approvals: notifications.filter(n => 
        n.type === NOTIFICATION_TYPES.JD_APPROVAL || n.type === 'jd_approval'
      ).length,
      job_applications: notifications.filter(n => 
        n.type === NOTIFICATION_TYPES.JOB_APPLICATION || 
        n.type === 'applicationreview' || 
        n.type === 'application'
      ).length,
      admin_coordination: notifications.filter(n => 
        n.type === 'admincollab' || n.type === 'admin_coordination' || n.type === 'admin_login'
      ).length + adminRequests.length,
      recruiter_inquiries: notifications.filter(n => 
        n.type === NOTIFICATION_TYPES.RECRUITER_INQUIRY || n.type === 'recruiter_inquiry'
      ).length,
      unread: notifications.filter(n => !n.isRead).length + adminRequests.filter(req => !req.isApproved && !req.isRejected).length,
      high_priority: notifications.filter(n => 
        n.priority === PRIORITY_LEVELS.HIGH || n.priority === 'high'
      ).length
    };
    return counts;
  };

  const filterCounts = getFilterCounts();

  const allFilters = [
    { id: 'all', name: 'All', icon: FaBell, count: filterCounts.all },
    { id: 'unread', name: 'Unread', icon: FaEnvelopeOpen, count: filterCounts.unread },
    { id: 'jd_approvals', name: 'JD approvals', icon: FaBriefcase, count: filterCounts.jd_approvals },
    { id: 'student_queries', name: 'Student queries', icon: FaUserGraduate, count: filterCounts.student_queries },
    { id: 'job_applications', name: 'Applications', icon: FaClipboardCheck, count: filterCounts.job_applications },
    { id: 'admin_coordination', name: 'Admin coordination', icon: FaUsers, count: filterCounts.admin_coordination },
    { id: 'recruiter_inquiries', name: 'Recruiter inquiries', icon: FaEnvelopeOpen, count: filterCounts.recruiter_inquiries },
  ];
  const filters = isSuperAdmin
    ? allFilters
    : allFilters.filter((f) => f.id !== 'admin_coordination');

  console.log('🎨 Rendering notifications component:', {
    total: notifications.length,
    filtered: filteredNotifications.length,
    loading: loadingNotifications,
    counts: filterCounts
  });

  const activeTheme = getFilterTheme(activeFilter);
  const selectedModalTheme = selectedNotification
    ? getNotificationTheme(selectedNotification.type)
    : null;

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{filterCounts.all} total</span>
            {filterCounts.unread > 0 && (
              <>
                <span>·</span>
                <span className="text-blue-600">{filterCounts.unread} unread</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="flex items-center">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-300 text-[10px]" />
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  className="pl-7 pr-7 py-1 text-sm border-0 border-b border-gray-200 rounded-none bg-transparent focus:outline-none focus:border-gray-400 w-40 sm:w-48"
                  value={searchInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchInput(value);
                    setSearchQuery(value.trim());
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-1 flex items-center text-gray-300 hover:text-gray-500"
                    title="Clear search"
                  >
                    <FaTimes className="text-[10px]" />
                  </button>
                )}
              </div>
            </form>

            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={markingAllAsRead || loadingNotifications}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              {markingAllAsRead ? 'Marking…' : 'Mark all read'}
            </button>
          </div>
        </div>

        {searchQuery && (
          <p className="text-[11px] text-gray-400">
            Results for &quot;{searchQuery}&quot;
          </p>
        )}

        <div className="flex flex-wrap gap-1 border-b border-gray-100 pb-2">
          {filters.map((filter) => {
            const theme = getFilterTheme(filter.id);
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`px-2.5 py-1 rounded-sm text-xs font-medium flex items-center gap-1 transition-colors ${
                  isActive ? theme.active : theme.inactive
                }`}
              >
                <filter.icon className={`text-[10px] ${isActive ? '' : 'opacity-60'}`} />
                <span>{filter.name}</span>
                {filter.count > 0 && (
                  <span className={`text-[10px] tabular-nums ${isActive ? theme.count : 'text-gray-400'}`}>
                    {filter.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="border border-gray-100 rounded overflow-hidden">
          <div className={`px-3 py-2 border-b flex items-center justify-between ${activeTheme.header}`}>
            <p className={`text-xs font-medium ${activeTheme.headerText}`}>
              {activeFilter === 'all' ? 'All' :
               activeFilter === 'unread' ? 'Unread' :
               filters.find(f => f.id === activeFilter)?.name}
              <span className="opacity-60 font-normal ml-1">({filteredNotifications.length})</span>
            </p>
          </div>

          <div>
            {loadingNotifications ? (
              <div className="text-center py-16">
                <FaSpinner className="animate-spin text-2xl text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading notifications…</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-16">
                <div className={`text-4xl mb-3 ${activeTheme.empty}`}>
                  {activeFilter === 'student_queries' ? <FaUserGraduate /> :
                   activeFilter === 'jd_approvals' ? <FaBriefcase /> :
                   activeFilter === 'job_applications' ? <FaClipboardCheck /> :
                   activeFilter === 'admin_coordination' ? <FaUsers /> :
                   <FaBell />}
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {searchQuery ? 'No matching notifications' : 'No notifications found'}
                </p>
                <p className="text-xs text-gray-400">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : activeFilter === 'all'
                      ? 'New notifications will appear here'
                      : `No ${filters.find(f => f.id === activeFilter)?.name.toLowerCase()} at this time`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredNotifications.map((notification) => {
                  const theme = getNotificationTheme(notification.type);
                  return (
                  <div
                    key={notification.id}
                    className={`px-3 py-3 transition-colors hover:bg-gray-50/60 border-l-2 ${theme.accent} ${
                      !notification.isRead ? 'bg-white' : 'bg-white/80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${theme.chip}`}>
                                {getNotificationTypeLabel(notification.type)}
                              </span>
                              {!notification.isRead && (
                                <span className="w-1 h-1 bg-blue-400 rounded-full shrink-0" />
                              )}
                            </div>
                            <p className={`text-sm truncate ${
                              notification.isRead ? 'font-normal text-gray-700' : 'font-medium text-gray-900'
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-gray-400 mt-0.5 text-xs line-clamp-1">
                              {notification.message}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {(notification.priority === 'high' || notification.priority === PRIORITY_LEVELS.HIGH) && (
                              <span className="px-1.5 py-0.5 rounded-sm text-[10px] text-rose-600 bg-rose-50 font-medium">High</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                          <p className="text-[11px] text-gray-400">
                            {notification.from}
                            {notification.enrollmentId && ` · ${notification.enrollmentId}`}
                            {` · ${notification.date} ${notification.time}`}
                          </p>

                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => markAsRead(notification.id)}
                              disabled={actionLoading[notification.id]}
                              className="p-1 text-gray-300 hover:text-gray-500"
                              title={notification.isRead ? 'Mark as unread' : 'Mark as read'}
                            >
                              {actionLoading[notification.id] ? (
                                <FaSpinner className="animate-spin text-[10px]" />
                              ) : (
                                <FaBell className={`text-[10px] ${notification.isRead ? '' : 'text-blue-400'}`} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNotification(notification.id)}
                              disabled={actionLoading[notification.id]}
                              className="p-1 text-gray-300 hover:text-rose-400"
                              title="Delete"
                            >
                              {actionLoading[notification.id] ? (
                                <FaSpinner className="animate-spin text-[10px]" />
                              ) : (
                                <FaTrash className="text-[10px]" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => openDetailModal(notification)}
                              className={`ml-1 px-2 py-0.5 text-[11px] rounded-sm border transition-colors ${theme.chip} border-current/20 hover:opacity-80`}
                            >
                              View
                            </button>
                          {/* Admit/Reject for admin_login (PENDING admin tried to enter) — Super Admin only */}
                          {isSuperAdmin &&
                            notification.type === 'admin_login' &&
                            (notification.meta?.adminUserId || notification.data?.adminUserId) && (
                              <>
                                <button
                                  onClick={() =>
                                    handleAdmitAdminLogin(
                                      notification.id,
                                      notification.meta?.adminUserId || notification.data?.adminUserId,
                                      notification.meta?.adminEmail || notification.data?.adminEmail || 'admin'
                                    )
                                  }
                                  disabled={actionLoading[`admin_login_admit_${notification.id}`]}
                                  className="px-2 py-0.5 text-[11px] text-indigo-700 border border-indigo-200 bg-indigo-50 rounded-sm hover:bg-indigo-100 disabled:opacity-50"
                                >
                                  {actionLoading[`admin_login_admit_${notification.id}`] ? (
                                    <FaSync className="animate-spin text-[10px] inline" />
                                  ) : (
                                    'Admit'
                                  )}
                                </button>
                                <button
                                  onClick={() =>
                                    handleRejectAdminLogin(
                                      notification.id,
                                      notification.meta?.adminUserId || notification.data?.adminUserId,
                                      notification.meta?.adminEmail || notification.data?.adminEmail || 'admin'
                                    )
                                  }
                                  disabled={actionLoading[`admin_login_reject_${notification.id}`]}
                                  className="px-2 py-0.5 text-[11px] text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                >
                                  {actionLoading[`admin_login_reject_${notification.id}`] ? (
                                    <FaSync className="animate-spin text-[10px] inline" />
                                  ) : (
                                    'Reject'
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
                
                {/* Admin Requests Section - Super Admin only, when admin_coordination filter is active */}
                {activeFilter === 'admin_coordination' && isSuperAdmin && (
                  <>
                    {filteredAdminRequests.length > 0 && (
                      <div className="border-t border-indigo-100 bg-indigo-50/30">
                        <p className="px-3 py-2 text-xs font-medium text-indigo-700">
                          Pending admin requests ({filteredAdminRequests.length})
                        </p>

                        {loadingAdminRequests ? (
                          <div className="text-center py-6">
                            <FaSync className="animate-spin text-lg text-gray-200 mx-auto mb-2" />
                            <p className="text-[11px] text-gray-400">Loading…</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-50">
                            {filteredAdminRequests.map((request) => (
                              <div
                                key={request.id}
                                className="px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-indigo-50/40 border-l-2 border-l-indigo-300"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-sm flex items-center justify-center shrink-0">
                                    <span className="text-indigo-600 font-medium text-[10px]">
                                      {request.email.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-gray-700 truncate">{request.email}</p>
                                    <p className="text-[11px] text-gray-400">
                                      {new Date(request.requestedAt || request.createdAt?.toDate?.() || request.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex gap-1 shrink-0">
                                  {isSuperAdmin ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleApproveAdmin(request.id, request.uid || request.user?.id, request.email)}
                                        disabled={actionLoading[`admin_${request.id}`]}
                                        className="px-2 py-0.5 text-[11px] text-indigo-700 border border-indigo-200 bg-indigo-50 rounded-sm hover:bg-indigo-100 disabled:opacity-50"
                                      >
                                        {actionLoading[`admin_${request.id}`] === 'approving' ? '…' : 'Approve'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRejectAdmin(request.id, request.uid || request.user?.id, request.email)}
                                        disabled={actionLoading[`admin_${request.id}`]}
                                        className="px-2 py-0.5 text-[11px] text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                      >
                                        {actionLoading[`admin_${request.id}`] === 'rejecting' ? '…' : 'Reject'}
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[11px] text-gray-400">Super Admin only</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {filteredAdminRequests.length === 0 && !loadingAdminRequests && (
                      <div className="border-t border-gray-50 text-center py-6">
                        <p className="text-xs text-gray-400">No pending admin requests</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal - SIMPLIFIED VERSION */}
        {showDetailModal && selectedNotification && selectedModalTheme && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded border border-gray-100 shadow-lg max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className={`px-4 py-3 border-b flex items-start justify-between gap-3 ${selectedModalTheme.iconBg}`}>
                <div className="min-w-0 flex items-start gap-2.5">
                  <div className="shrink-0 mt-0.5">
                    {getNotificationIcon(selectedNotification.type)}
                  </div>
                  <div className="min-w-0">
                    <span className={`inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-medium mb-1 ${selectedModalTheme.chip}`}>
                      {getNotificationTypeLabel(selectedNotification.type)}
                    </span>
                    <p className="text-sm font-medium text-gray-800 truncate">{selectedNotification.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {selectedNotification.from} · {selectedNotification.date} {selectedNotification.time}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
                >
                  <FaTimes className="text-xs" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                  <p className="text-[11px] text-gray-400 mb-1">Message</p>
                  <p className="text-sm text-gray-700">{selectedNotification.message}</p>
                </div>
                
                {/* Meta Information */}
                {selectedNotification.meta && (
                  <div className="bg-gray-50/80 rounded-sm border border-gray-100 p-3 mb-4">
                    <p className="text-[11px] text-gray-400 mb-2">Additional information</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {(selectedNotification.meta.studentName || selectedNotification.meta.recruiterName || selectedNotification.meta.userName) && (
                        <div>
                          <span className="text-gray-500">
                            {selectedNotification.meta.recruiterName ? 'Recruiter' : 'Student'}:
                          </span>
                          <p className="text-gray-800 font-medium">
                            {selectedNotification.meta.studentName || selectedNotification.meta.recruiterName || selectedNotification.meta.userName}
                          </p>
                        </div>
                      )}
                      {selectedNotification.meta.enrollmentId && (
                        <div>
                          <span className="text-gray-500">Enrollment ID:</span>
                          <p className="text-gray-800 font-medium">{selectedNotification.meta.enrollmentId}</p>
                        </div>
                      )}
                      {selectedNotification.meta.companyName && (
                        <div>
                          <span className="text-gray-500">Company:</span>
                          <p className="text-gray-800 font-medium">{selectedNotification.meta.companyName}</p>
                        </div>
                      )}
                      {selectedNotification.meta.queryType && (
                        <div>
                          <span className="text-gray-500">Query Type:</span>
                          <p className="text-gray-800 font-medium capitalize">{selectedNotification.meta.queryType}</p>
                        </div>
                      )}
                      {selectedNotification.meta.subject && (
                        <div>
                          <span className="text-gray-500">Subject:</span>
                          <p className="text-gray-800 font-medium">{selectedNotification.meta.subject}</p>
                        </div>
                      )}
                      {/* Recruiter Inquiry Details */}
                      {selectedNotification.meta?.companyName && (
                        <div>
                          <span className="text-gray-500">Company Name:</span>
                          <p className="text-gray-800 font-medium">{selectedNotification.meta.companyName}</p>
                        </div>
                      )}
                      {selectedNotification.meta?.contactNumber && (
                        <div>
                          <span className="text-gray-500">Contact Number:</span>
                          <p className="text-gray-800 font-medium">{selectedNotification.meta.contactNumber}</p>
                        </div>
                      )}
                      {selectedNotification.meta?.email && (
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <p className="text-gray-800 font-medium">
                            <a href={`mailto:${selectedNotification.meta.email}`} className="text-blue-600 hover:underline">
                              {selectedNotification.meta.email}
                            </a>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Recruiter Inquiry Message */}
                {selectedNotification.meta?.message && selectedNotification.type === NOTIFICATION_TYPES.RECRUITER_INQUIRY && (
                  <div className="mb-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Recruitment needs</p>
                    <div className="bg-gray-50 rounded-sm p-3 border border-gray-200">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedNotification.meta.message}</p>
                    </div>
                  </div>
                )}

                {selectedNotification.meta?.queryType === 'question' && selectedNotification.meta?.jobId && (
                  <div className="mb-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Job posting</p>
                    <div className="bg-gray-50 rounded-sm p-3 border border-gray-200">
                      <p className="text-sm text-gray-800 font-medium">
                        {selectedNotification.meta.subject || 'Question about a job posting'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Job ID: {selectedNotification.meta.jobId}
                      </p>
                    </div>
                  </div>
                )}

                {selectedNotification.meta?.message && (
                  <div className="mb-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Query message</p>
                    <div className="bg-gray-50 rounded-sm p-3 border border-gray-200">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedNotification.meta.message}</p>
                    </div>
                  </div>
                )}

                {(selectedNotification.meta?.queryType === 'cgpa' || selectedNotification.meta?.queryType === 'backlog') && (
                  <div className="mb-5">
                    <p className="text-xs font-medium text-gray-500 mb-1">Update details</p>
                    <div className="bg-gray-50 rounded-sm p-3 border border-gray-200">
                      {selectedNotification.meta?.queryType === 'cgpa' && selectedNotification.meta?.cgpa && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-600">Updated CGPA:</span>
                          <p className="text-lg font-bold text-green-700 mt-1">{selectedNotification.meta.cgpa}</p>
                        </div>
                      )}
                      {selectedNotification.meta?.queryType === 'backlog' && selectedNotification.meta?.backlogs && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-600">Updated Backlogs:</span>
                          <p className="text-lg font-bold text-orange-700 mt-1">{selectedNotification.meta.backlogs}</p>
                        </div>
                      )}
                      {/* Proof Document Display */}
                      {selectedNotification.meta?.proofDocumentUrl && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs font-medium text-gray-500 block mb-2">Proof document</span>
                          <a
                            href={selectedNotification.meta.proofDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 text-xs font-medium"
                          >
                            <FaEye className="text-xs" />
                            View document
                          </a>
                        </div>
                      )}
                      {!selectedNotification.meta?.proofDocumentUrl && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-amber-600">
                            Proof document not available.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Query Details */}
                {selectedNotification.meta?.queryType && (
                  <div className="mb-5">
                    <p className="text-xs font-medium text-gray-500 mb-2">Query details</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedNotification.meta.center && (
                        <div>
                          <span className="text-gray-500">Center:</span>
                          <p className="text-gray-800 font-medium">{selectedNotification.meta.center}</p>
                        </div>
                      )}
                      {selectedNotification.meta.school && (
                        <div>
                          <span className="text-gray-500">School:</span>
                          <p className="text-gray-800 font-medium">{selectedNotification.meta.school}</p>
                        </div>
                      )}
                      {selectedNotification.meta.batch && (
                        <div>
                          <span className="text-gray-500">Batch:</span>
                          <p className="text-gray-800 font-medium">{selectedNotification.meta.batch}</p>
                        </div>
                      )}
                      {selectedNotification.meta.referenceId && (
                        <div>
                          <span className="text-gray-500">Reference ID:</span>
                          <p className="text-gray-800 font-medium">{selectedNotification.meta.referenceId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>

                  {selectedNotification.meta?.queryId && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowResponseModal(true);
                        setShowDetailModal(false);
                      }}
                      className={`px-2 py-1 text-xs rounded-sm border border-current/20 hover:opacity-80 ${selectedModalTheme.chip}`}
                    >
                      Respond
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showResponseModal && selectedNotification && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded border border-gray-100 shadow-lg max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">Respond to query</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {selectedNotification.meta?.studentName || selectedNotification.meta?.recruiterName || selectedNotification.meta?.userName || 'User'}
                    {selectedNotification.meta?.subject ? ` · ${selectedNotification.meta.subject}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowResponseModal(false);
                    setResponseText('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="text-xs" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-3">
                  <p className="text-[11px] text-gray-400 mb-1">Query</p>
                  <div className="bg-gray-50/80 rounded-sm p-3 border border-gray-100">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedNotification.meta?.message || selectedNotification.message}
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Your response <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Enter your response…"
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm focus:outline-none focus:border-gray-400 resize-y"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResponseModal(false);
                      setResponseText('');
                    }}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                    disabled={respondingToQuery}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRespondToQuery}
                    disabled={respondingToQuery || !responseText.trim()}
                    className="px-2 py-1 text-xs text-gray-700 border border-gray-200 rounded-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {respondingToQuery ? 'Sending…' : 'Send response'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
