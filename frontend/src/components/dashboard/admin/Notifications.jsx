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
  const { getPendingAdminRequests, approveAdminRequest, rejectAdminRequest } = useAuth();
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

  // Load admin requests when admin_coordination filter is active
  useEffect(() => {
    if (activeFilter === 'admin_coordination') {
      loadAdminRequests();
    }
  }, [activeFilter]);

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

  // Get BIG notification icon based on type - MATCHING STUDENT QUERY ICONS
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'question_request':
        return (
          <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 rounded-xl border border-blue-200 shadow-sm">
            <FaQuestionCircle className="text-2xl" />
          </div>
        );
      case 'cgpa_request':
        return (
          <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 text-green-700 rounded-xl border border-green-200 shadow-sm">
            <FaChartLine className="text-2xl" />
          </div>
        );
      case 'calendar_request':
        return (
          <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 rounded-xl border border-purple-200 shadow-sm">
            <FaCalendarAlt className="text-2xl" />
          </div>
        );
      case NOTIFICATION_TYPES.JD_APPROVAL:
      case 'jd_approval':
        return (
          <div className="p-3 bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 rounded-xl border border-amber-200 shadow-sm">
            <FaBriefcase className="text-2xl" />
          </div>
        );
      case NOTIFICATION_TYPES.JOB_APPLICATION:
      case 'applicationreview':
        return (
          <div className="p-3 bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 rounded-xl border border-indigo-200 shadow-sm">
            <FaClipboardCheck className="text-2xl" />
          </div>
        );
      case 'admincollab':
      case 'admin_coordination':
        return (
          <div className="p-3 bg-gradient-to-br from-violet-100 to-violet-200 text-violet-700 rounded-xl border border-violet-200 shadow-sm">
            <FaUsers className="text-2xl" />
          </div>
        );
      case NOTIFICATION_TYPES.RECRUITER_INQUIRY:
      case 'recruiter_inquiry':
        return (
          <div className="p-3 bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 rounded-xl border border-teal-200 shadow-sm">
            <FaEnvelopeOpen className="text-2xl" />
          </div>
        );
      default:
        return (
          <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 rounded-xl border border-gray-200 shadow-sm">
            <FaBell className="text-2xl" />
          </div>
        );
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
        if (notification.type !== 'admincollab' && notification.type !== 'admin_coordination') return false;
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
        n.type === 'admincollab' || n.type === 'admin_coordination'
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

  // Filter buttons configuration with COUNTS - MATCHING STUDENT QUERY ICONS
  const filters = [
    { 
      id: 'all', 
      name: 'All', 
      icon: FaBell,
      color: 'from-blue-50 to-blue-100',
      count: filterCounts.all
    },
    { 
      id: 'unread', 
      name: 'Unread', 
      icon: FaEnvelopeOpen,
      color: 'from-purple-50 to-purple-100',
      count: filterCounts.unread
    },
    { 
      id: 'jd_approvals', 
      name: 'JD Approvals', 
      icon: FaBriefcase,
      color: 'from-amber-50 to-amber-100',
      count: filterCounts.jd_approvals
    },
    { 
      id: 'student_queries', 
      name: 'Student Queries', 
      icon:   FaUserGraduate,
      color: 'from-teal-50 to-teal-100',
      count: filterCounts.student_queries
    },
    { 
      id: 'job_applications', 
      name: 'Applications', 
      icon: FaClipboardCheck,
      color: 'from-indigo-50 to-indigo-100',
      count: filterCounts.job_applications
    },
    { 
      id: 'admin_coordination', 
      name: 'Admin Coordination', 
      icon: FaUsers,
      color: 'from-violet-50 to-violet-100',
      count: filterCounts.admin_coordination
    },
    { 
      id: 'recruiter_inquiries', 
      name: 'Recruiter Inquiries', 
      icon: FaEnvelopeOpen,
      color: 'from-teal-50 to-teal-100',
      count: filterCounts.recruiter_inquiries
    }
  ];

  console.log('🎨 Rendering notifications component:', {
    total: notifications.length,
    filtered: filteredNotifications.length,
    loading: loadingNotifications,
    counts: filterCounts
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* RESTRUCTURED HEADER - Title, Search & Mark All Read in One Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <FaBell className="mr-3 text-blue-600" />
              Notifications
              {filterCounts.unread > 0 && (
                <span className="ml-3 px-3 py-1 bg-rose-500 text-white text-lg font-semibold rounded-full">
                  {filterCounts.unread}
                </span>
              )}
            </h1>
          </div>
          
          <div className="flex items-center mt-4 md:mt-0 gap-3 flex-wrap md:flex-nowrap">
            <form onSubmit={handleSearchSubmit} className="flex items-center">
              <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search notifications..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchInput(value);
                    // Update search query immediately for real-time search
                    setSearchQuery(value.trim());
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    title="Clear search"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </form>
            
            {/* Mark All Read Button - NO ICON */}
            <button 
              onClick={handleMarkAllAsRead}
              disabled={markingAllAsRead || loadingNotifications}
              className="ml-3 px-4 py-2.5 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border border-blue-200 text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markingAllAsRead ? (
                <span className="flex items-center gap-2">
                  <FaSpinner className="animate-spin w-3 h-3" />
                  Marking as read...
                </span>
              ) : (
                'Mark all as read'
              )}
            </button>
          </div>
        </div>
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-500">
            Showing results for <span className="font-semibold text-gray-700">"{searchQuery}"</span>
          </div>
        )}

        {/* SUBTITLE - Separate Line */}
        <div className="mb-8">
          <p className="text-gray-600">
            Manage your placement-related notifications and requests 
            <span className="text-sm text-gray-500 ml-2">
              ({filterCounts.all} total, {filterCounts.unread} unread)
            </span>
          </p>
        </div>

        {/* Filter Buttons with COUNTS */}
        <div className="flex flex-wrap md:flex-nowrap gap-2 mb-6">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex-1 min-w-[140px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
                activeFilter === filter.id
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md border-blue-600'
                  : `bg-gradient-to-r ${filter.color} text-gray-700 border-gray-200 shadow-sm hover:shadow-md`
              }`}
            >
              <span className="flex items-center gap-2">
                <filter.icon className="text-base" />
                <span>{filter.name}</span>
              </span>
              {/* Show count badge for all filters */}
              {filter.count > 0 && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${
                  activeFilter === filter.id
                    ? 'bg-white/30 text-white'
                    : filter.id === 'unread' || filter.id === 'high_priority'
                    ? 'bg-rose-500 text-white'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {activeFilter === 'all' ? 'All' : 
               activeFilter === 'unread' ? 'Unread Notifications' : 
               filters.find(f => f.id === activeFilter)?.name}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredNotifications.length})
              </span>
              {activeFilter === 'all' && filterCounts.unread > 0 && (
                <span className="ml-2 text-sm text-rose-600">({filterCounts.unread} unread)</span>
              )}
            </h2>

            {loadingNotifications ? (
              <div className="text-center py-12">
                <FaSpinner className="animate-spin text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Loading notifications...</p>
                <p className="text-gray-400 text-sm">Please wait while we fetch your data</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">
                  {/* Use MATCHING notification-specific icon instead of mail */}
                  {activeFilter === 'student_queries' ? <FaUserGraduate /> :
                   activeFilter === 'jd_approvals' ? <FaBriefcase /> :
                   activeFilter === 'job_applications' ? <FaClipboardCheck /> :
                   activeFilter === 'admin_coordination' ? <FaUsers /> :
                   <FaBell />}
                </div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  {searchQuery ? 'No matching notifications' : 'No notifications found'}
                </h3>
                <p className="text-gray-500">
                  {searchQuery 
                    ? 'Try adjusting your search criteria'
                    : activeFilter === 'all' 
                      ? 'New notifications will appear here when students submit queries'
                      : `No ${filters.find(f => f.id === activeFilter)?.name.toLowerCase()} at this time`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-5 rounded-xl border transition-all duration-200 ${
                      notification.isRead
                        ? 'bg-white border-gray-200'
                        : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start">
                      {/* BIG notification icon - MATCHING STUDENT QUERY COLORS */}
                      <div className="flex-shrink-0 mr-4">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className={`font-semibold ${
                              notification.isRead ? 'text-gray-800' : 'text-gray-900'
                            }`}>
                              {notification.title}
                            </h3>
                            <p className="text-gray-600 mt-1 text-sm">
                              {notification.message}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            {/* Priority Badge */}
                            {(notification.priority === 'high' || notification.priority === PRIORITY_LEVELS.HIGH) && (
                              <span className="px-2.5 py-1 bg-gradient-to-r from-rose-100 to-rose-200 text-rose-800 text-xs font-medium rounded-full border border-rose-200 flex items-center w-fit">
                                <FaClock className="mr-1" />
                                High Priority
                              </span>
                            )}
                            
                            {/* Unread indicator */}
                            {!notification.isRead && (
                              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                        </div>
                        
                        {/* Notification meta info */}
                        <div className="flex flex-wrap items-center justify-between mt-4">
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">From: {notification.from}</span>
                            {notification.enrollmentId && (
                              <span className="ml-3">ID: {notification.enrollmentId}</span>
                            )}
                            <span className="ml-3">{notification.date} at {notification.time}</span>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                            <button
                              onClick={() => markAsRead(notification.id)}
                              disabled={actionLoading[notification.id]}
                              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                              title={notification.isRead ? 'Mark as unread' : 'Mark as read'}
                            >
                              {actionLoading[notification.id] ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                notification.isRead ? <FaBell /> : <FaBell className="text-blue-500" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteNotification(notification.id)}
                              disabled={actionLoading[notification.id]}
                              className="p-2 text-gray-400 hover:text-rose-600 rounded-full hover:bg-rose-50"
                              title="Delete notification"
                            >
                              {actionLoading[notification.id] ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaTrash />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {/* Quick action buttons */}
                        <div className="flex flex-wrap gap-3 mt-4">
                          <button
                            onClick={() => openDetailModal(notification)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border border-blue-200 text-sm font-medium rounded-lg flex items-center shadow-sm hover:shadow-md transition-all duration-200 hover:from-blue-200 hover:to-blue-300"
                          >
                            <FaEye className="mr-2" />
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Admin Requests Section - Only show when admin_coordination filter is active */}
                {activeFilter === 'admin_coordination' && (
                  <>
                    {filteredAdminRequests.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <FaUsers className="mr-2 text-violet-600" />
                          Pending Admin Requests ({filteredAdminRequests.length})
                        </h3>
                        
                        {loadingAdminRequests ? (
                          <div className="text-center py-8">
                            <FaSync className="animate-spin text-2xl text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-500">Loading admin requests...</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {filteredAdminRequests.map((request) => (
                              <div
                                key={request.id}
                                className="p-4 bg-gradient-to-r from-violet-50 to-violet-100 border border-violet-200 rounded-xl"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-violet-200 rounded-full flex items-center justify-center">
                                      <span className="text-violet-700 font-semibold text-sm">
                                        {request.email.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-900">{request.email}</h4>
                                      <p className="text-sm text-gray-600">
                                        Requested: {new Date(request.createdAt?.toDate?.() || request.createdAt).toLocaleDateString()}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        UID: <code className="bg-gray-200 px-1 rounded">{request.uid}</code>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleApproveAdmin(request.id, request.uid, request.email)}
                                      disabled={actionLoading[`admin_${request.id}`]}
                                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    >
                                      {actionLoading[`admin_${request.id}`] === 'approving' ? (
                                        <>
                                          <FaSync className="animate-spin text-xs" />
                                          Approving...
                                        </>
                                      ) : (
                                        <>
                                          <FaCheck className="text-xs" />
                                          Approve
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleRejectAdmin(request.id, request.uid, request.email)}
                                      disabled={actionLoading[`admin_${request.id}`]}
                                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    >
                                      {actionLoading[`admin_${request.id}`] === 'rejecting' ? (
                                        <>
                                          <FaSync className="animate-spin text-xs" />
                                          Rejecting...
                                        </>
                                      ) : (
                                        <>
                                          <FaTimes className="text-xs" />
                                          Reject
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {filteredAdminRequests.length === 0 && !loadingAdminRequests && (
                      <div className="mt-6 pt-6 border-t border-gray-200 text-center py-8">
                        <FaUsers className="text-4xl text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-600 mb-2">No Pending Admin Requests</h3>
                        <p className="text-gray-500">All admin requests have been processed.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal - SIMPLIFIED VERSION */}
        {showDetailModal && selectedNotification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(selectedNotification.type)}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-1">
                        {selectedNotification.title}
                      </h2>
                      <p className="text-sm text-gray-500">
                        From: {selectedNotification.from} • {selectedNotification.date} at {selectedNotification.time}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Message</h3>
                  <p className="text-gray-800">{selectedNotification.message}</p>
                </div>
                
                {/* Meta Information */}
                {selectedNotification.meta && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Additional Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedNotification.meta.studentName && (
                        <div>
                          <span className="text-gray-500">Student:</span>
                          <p className="text-gray-800 font-medium">{selectedNotification.meta.studentName}</p>
                        </div>
                      )}
                      {selectedNotification.meta.enrollmentId && (
                        <div>
                          <span className="text-gray-500">Enrollment ID:</span>
                          <p className="text-gray-800 font-medium">{selectedNotification.meta.enrollmentId}</p>
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
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Recruitment Needs</h3>
                    <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                      <p className="text-gray-800 whitespace-pre-wrap">{selectedNotification.meta.message}</p>
                    </div>
                  </div>
                )}
                
                {/* Query Message Display */}
                {selectedNotification.meta?.message && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Query Message</h3>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-gray-800 whitespace-pre-wrap">{selectedNotification.meta.message}</p>
                    </div>
                  </div>
                )}

                {/* Additional Query Details */}
                {selectedNotification.meta?.queryType && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Query Details</h3>
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

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  
                  {selectedNotification.meta?.queryId && (
                    <button 
                      onClick={() => {
                        setShowResponseModal(true);
                        setShowDetailModal(false);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FaReply className="text-sm" />
                      Respond to Query
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Query Response Modal */}
        {showResponseModal && selectedNotification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-1">
                      Respond to Student Query
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedNotification.meta?.studentName} - {selectedNotification.meta?.subject}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowResponseModal(false);
                      setResponseText('');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Query Details */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Student Query</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {selectedNotification.meta?.message || selectedNotification.message}
                    </p>
                  </div>
                </div>

                {/* Response Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Response <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Enter your response to the student..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    required
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowResponseModal(false);
                      setResponseText('');
                    }}
                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    disabled={respondingToQuery}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRespondToQuery}
                    disabled={respondingToQuery || !responseText.trim()}
                    className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {respondingToQuery ? (
                      <>
                        <FaSpinner className="animate-spin text-sm" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FaReply className="text-sm" />
                        Send Response
                      </>
                    )}
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
