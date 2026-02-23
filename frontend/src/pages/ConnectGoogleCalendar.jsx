/**
 * Connect Google Calendar Page
 * Complete calendar integration with custom UI
 * 
 * Flow:
 * 1. User visits page
 * 2. If calendar NOT connected: Show "Connect Google Calendar" button
 * 3. On click: Fetch OAuth URL from backend, open popup (600x700px, centered)
 * 4. User authorizes in popup
 * 5. Popup redirects to callback, closes automatically, notifies parent
 * 6. Main page refreshes calendar status
 * 7. If connected: Show custom calendar UI (monthly/weekly/list views)
 * 8. Role-based event creation (RECRUITER/ADMIN only)
 */

import React, { useState, useEffect, useRef } from 'react';
import { FaGoogle, FaCalendar, FaCheckCircle, FaSpinner, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import CustomCalendar from '../components/calendar/CustomCalendar';
import EventCreationModal from '../components/calendar/EventCreationModal';

// Simple logger for frontend
const logger = {
  info: (msg, data) => console.log(`[Calendar] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[Calendar] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[Calendar] ${msg}`, data || ''),
};

const ConnectGoogleCalendar = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [connected, setConnected] = useState(null); // null = checking, true/false = status
  const [hasFullScope, setHasFullScope] = useState(null); // null = unknown, true/false = scope status
  const [connectedGoogleEmail, setConnectedGoogleEmail] = useState(null); // Connected Google email
  const [registeredEmail, setRegisteredEmail] = useState(null); // User's registered email
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null); // Error message state
  const popupTimeoutRef = useRef(null); // Store timeout reference for cleanup

  // Check calendar connection status on mount and listen for OAuth result
  useEffect(() => {
    checkCalendarStatus();

    const handleOAuthResult = (result) => {
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
        popupTimeoutRef.current = null;
      }
      setConnecting(false);
      if (result?.status === 'SUCCESS') {
        logger.info('Calendar connection successful', { calendarEmail: result.calendarEmail });
        if (toast) toast.success('Google Calendar connected successfully!', 'Success');
        checkCalendarStatus();
        setErrorMessage(null);
      } else if (result?.status === 'FAILED') {
        let errorMsg = result.error || 'Failed to connect Google Calendar';
        if (result.reason === 'EMAIL_MISMATCH') {
          errorMsg = `Calendar connection failed. Use your registered email.\n\nGoogle Account Used: ${result.calendarEmail || 'N/A'}\n\nPlease connect using the same email address you used to register.`;
        } else if (result.reason === 'EMAIL_NOT_VERIFIED') {
          errorMsg = 'Google account email is not verified. Please verify your email with Google and try again.';
        } else if (result.reason === 'EMAIL_NOT_RETURNED') {
          errorMsg = result.error || 'Could not verify Google account email. Please try again.';
        }
        setErrorMessage(errorMsg);
        setConnected(false);
        setHasFullScope(null);
        setConnectedGoogleEmail(null);
        logger.warn('Calendar connection failed', { reason: result.reason, error: result.error, calendarEmail: result.calendarEmail });
      }
    };

    // 1) Direct postMessage - receives when popup posts to this window (opener)
    const handleMessage = (event) => {
      if (event.data?.type === 'GOOGLE_CALENDAR_RESULT') {
        handleOAuthResult(event.data);
      }
    };

    // 2) Custom event - fallback when App dispatches (e.g. after tab switch)
    const handleOAuthComplete = (e) => {
      if (e.detail?.type === 'GOOGLE_CALENDAR_RESULT') {
        handleOAuthResult(e.detail);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('calendar-oauth-complete', handleOAuthComplete);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('calendar-oauth-complete', handleOAuthComplete);
    };
  }, []);

  // Refetch calendar status when tab becomes visible (handles case where user switched tabs during OAuth)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkCalendarStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch events when connected
  useEffect(() => {
    if (connected === true) {
      // Small delay to ensure status is synced
      const timer = setTimeout(() => {
        fetchEvents();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Clear events if not connected
      setEvents([]);
    }
  }, [connected]);

  /**
   * Check if calendar is connected
   */
  const checkCalendarStatus = async () => {
    try {
      const response = await api.get('/calendar/status');
      const isConnected = response.data.connected;
      const scopeStatus = response.data.hasFullScope;
      const googleEmail = response.data.connectedGoogleEmail;
      const regEmail = response.data.registeredEmail;
      setConnected(isConnected);
      setHasFullScope(scopeStatus);
      setConnectedGoogleEmail(googleEmail || null);
      setRegisteredEmail(regEmail || user?.email || null);
      
      // If status says connected but we get errors, there might be a sync issue
      if (isConnected) {
        // Try to fetch events to verify connection actually works
        try {
          await fetchEvents();
        } catch (fetchError) {
          // If fetch fails, status might be wrong - refresh it
          if (fetchError.response?.status === 400 || fetchError.message?.includes('not connected')) {
            console.warn('Status shows connected but events fetch failed - syncing status');
            const recheck = await api.get('/calendar/status');
            setConnected(recheck.data.connected);
            setHasFullScope(recheck.data.hasFullScope);
          }
        }
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
      setConnected(false);
      setHasFullScope(null);
    }
  };

  /**
   * Disconnect Google Calendar
   */
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Google Calendar? You will need to reconnect to use calendar features.')) {
      return;
    }

    try {
      setDisconnecting(true);
      await api.delete('/calendar/disconnect');
      setConnected(false);
      setHasFullScope(null);
      setEvents([]);
      
      // Prompt to reconnect immediately
      if (window.confirm('Google Calendar disconnected successfully. Would you like to reconnect now with full permissions?')) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          handleConnect();
        }, 500);
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      setErrorMessage('Failed to disconnect calendar. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  /**
   * Fetch OAuth URL and open popup
   */
  const handleConnect = async () => {
    try {
      setConnecting(true);

      // Fetch OAuth URL from backend
      const response = await api.get('/calendar/oauth-url');
      const authUrl = response.data.url;

      // Calculate popup position (centered)
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      // Open popup window
      const popup = window.open(
        authUrl,
        'Google Calendar Authorization',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        setErrorMessage('Popup blocked. Please allow popups for this site.');
        setConnecting(false);
        return;
      }

      // Note: We do NOT poll for popup.closed due to Cross-Origin-Opener-Policy (COOP)
      // When the popup navigates to Google OAuth (different origin), checking popup.closed
      // triggers COOP warnings. We rely entirely on postMessage for communication.
      // The message handler will set connecting to false when OAuth completes.

      // Clear any existing timeout
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
        popupTimeoutRef.current = null;
      }

      // Timeout after 5 minutes - attempt to close popup if still open
      // This is a safety fallback in case postMessage fails
      popupTimeoutRef.current = setTimeout(() => {
        try {
          // Try to close popup - may fail due to COOP, which is fine
          if (popup) {
            popup.close();
          }
        } catch (error) {
          // COOP error is expected and harmless
        }
        setConnecting(false);
        setErrorMessage('Connection timeout. Please try again.');
        popupTimeoutRef.current = null;
      }, 300000); // 5 minutes
    } catch (error) {
      console.error('Error connecting calendar:', error);
      setErrorMessage('Failed to initiate Google Calendar connection. Please try again.');
      setConnecting(false);
    }
  };

  /**
   * Fetch calendar events
   */
  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const response = await api.get('/calendar/events', {
        params: {
          maxResults: 250, // Get more events for calendar view
        },
      });
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      
      // Handle different error cases
      if (error.response?.status === 400) {
        // Calendar not connected - this is expected, don't show error
        console.log('Calendar not connected yet');
        setEvents([]);
      } else if (error.response?.status === 401) {
        // Authentication failed - need to reconnect
        setErrorMessage('Calendar authentication expired. Please reconnect your Google Calendar.');
        setConnected(false);
        checkCalendarStatus(); // Sync status
      } else if (error.response?.status === 400 && error.response?.data?.message?.includes('not connected')) {
        // Calendar not connected - sync status
        setConnected(false);
        setHasFullScope(null);
        checkCalendarStatus(); // Sync status
      } else if (error.response?.status === 403 && error.response?.data?.requiresReconnect) {
        // Insufficient scope - update status
        setHasFullScope(false);
        checkCalendarStatus(); // Sync status
      } else {
        // Other errors - show message
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch calendar events.';
        console.error('Full error:', error.response?.data || error);
        // Don't show error for "not connected" as it's handled above
        if (!errorMessage.includes('not connected')) {
          setErrorMessage(`Error: ${errorMessage}`);
        }
      }
    } finally {
      setLoadingEvents(false);
    }
  };

  /**
   * Handle date click from calendar
   */
  const handleDateClick = (date) => {
    // If user can create events, open modal with selected date
    if (user?.role === 'RECRUITER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      setSelectedDate(date);
      setShowEventModal(true);
    }
  };

  /**
   * Handle event creation success
   */
  const handleEventCreated = (newEvent) => {
    // Refresh events list
    fetchEvents();
    setShowEventModal(false);
    setSelectedDate(null);
    // Refresh status to check scope
    checkCalendarStatus();
  };

  // Show loading state while checking connection
  if (connected === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Checking Calendar Connection</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  // Show connect button if not connected
  if (connected === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg relative">
              <button
                onClick={() => setErrorMessage(null)}
                className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded transition-colors"
                title="Dismiss"
              >
                <FaTimes className="text-red-600 text-sm" />
              </button>
              <div className="flex items-start gap-3 pr-6">
                <FaExclamationTriangle className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <FaCalendar className="text-3xl text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Connect Google Calendar</h1>
            <p className="text-gray-600 mb-2">
              Connect your Google Calendar to view and manage your events in one place.
            </p>
            {registeredEmail && (
              <p className="text-sm text-gray-500">
                <span className="font-medium">Important:</span> You must connect using the same email address you registered with: <span className="font-semibold text-gray-700">{registeredEmail}</span>
              </p>
            )}
          </div>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold transition-colors"
          >
            {connecting ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <FaGoogle />
                <span>Connect Google Calendar</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            A popup window will open for authorization. Please allow popups for this site.
          </p>
        </div>
      </div>
    );
  }

  // Show custom calendar UI if connected
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Error Message Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg relative shadow-md">
            <button
              onClick={() => setErrorMessage(null)}
              className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded transition-colors"
              title="Dismiss"
            >
              <FaTimes className="text-red-600 text-sm" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <FaExclamationTriangle className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FaCheckCircle className="text-green-500 text-2xl" />
                <h1 className="text-3xl font-bold text-gray-800">My Calendar</h1>
              </div>
              <p className="text-gray-600">
                {user?.role === 'STUDENT' 
                  ? 'View your calendar events. Students have read-only access.'
                  : 'View and manage your calendar events.'}
              </p>
              {connectedGoogleEmail && (
                <div className="mt-2 text-sm text-gray-500">
                  <span className="font-medium">Connected Google Account:</span> {connectedGoogleEmail}
                  {registeredEmail && registeredEmail.toLowerCase() !== connectedGoogleEmail.toLowerCase() && (
                    <span className="ml-2 text-yellow-600">⚠️</span>
                  )}
                </div>
              )}
              {connected && hasFullScope === false && (
                <div className="mt-3 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-900 mb-2">
                        Limited Permissions Detected
                      </p>
                      <p className="text-sm text-yellow-800 mb-3">
                        Your calendar connection has <strong>read-only access</strong>. 
                        You cannot create events with this permission level. 
                        Please disconnect and reconnect to grant full access.
                      </p>
                      <button
                        onClick={handleDisconnect}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                      >
                        🔄 Disconnect & Reconnect Now
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Connection Status - Modern indicator style */}
              {connected ? (
                <>
                  {hasFullScope === false ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-300 rounded-lg text-sm font-medium text-yellow-800" title="Read-only permissions. Reconnect for full access.">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Read-Only</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-300 rounded-lg text-sm font-medium text-green-800">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Connected</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-300 rounded-lg text-sm font-medium text-red-800">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Not Connected</span>
                </div>
              )}
              
              {/* Action Buttons - Modern button style */}
              <button
                onClick={checkCalendarStatus}
                disabled={loadingEvents || disconnecting}
                className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-all font-medium shadow-sm hover:shadow"
                title="Check connection status"
              >
                <span>Check Status</span>
              </button>
              
              {connected && (
                <>
                  <button
                    onClick={fetchEvents}
                    disabled={loadingEvents || disconnecting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2 transition-all font-medium shadow-md hover:shadow-lg"
                  >
                    {loadingEvents ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <span>Refresh Events</span>
                    )}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="px-4 py-2 bg-white border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-600 disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-all font-medium shadow-sm hover:shadow"
                    title="Disconnect Google Calendar"
                  >
                    {disconnecting ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>Disconnecting...</span>
                      </>
                    ) : (
                      <span>Disconnect</span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Custom Calendar Component */}
        <CustomCalendar
          events={events}
          onDateClick={handleDateClick}
          onCreateEvent={() => {
            // Check if user has full scope before allowing event creation
            if (hasFullScope === false) {
              if (window.confirm('Your calendar has read-only permissions. To create events, you need to disconnect and reconnect with full access. Would you like to disconnect now?')) {
                handleDisconnect();
              }
              return;
            }
            setSelectedDate(null);
            setShowEventModal(true);
          }}
          onEditEvent={async (event) => {
            // Check if user has full scope
            if (hasFullScope === false) {
              setErrorMessage('Your calendar has read-only permissions. Please disconnect and reconnect with full access to edit events.');
              return;
            }
            // Open edit modal (reuse creation modal with event data)
            setSelectedDate(new Date(event.start));
            setShowEventModal(true);
            // TODO: Pass event data to modal for editing
          }}
          onDeleteEvent={async (eventId) => {
            // Check if user has full scope
            if (hasFullScope === false) {
              setErrorMessage('Your calendar has read-only permissions. Please disconnect and reconnect with full access to delete events.');
              return;
            }
            try {
              await api.delete(`/calendar/events/${eventId}`);
              fetchEvents(); // Refresh events
            } catch (error) {
              console.error('Error deleting event:', error);
              setErrorMessage(error.response?.data?.message || 'Failed to delete event. Please try again.');
            }
          }}
          onRespondToEvent={async (eventId, responseStatus) => {
            try {
              await api.post(`/calendar/events/${eventId}/respond`, { responseStatus });
              fetchEvents(); // Refresh events
            } catch (error) {
              console.error('Error responding to event:', error);
              setErrorMessage(error.response?.data?.message || 'Failed to respond to event. Please try again.');
            }
          }}
          userRole={user?.role}
        />
      </div>

      {/* Event Creation Modal */}
      {(user?.role === 'RECRUITER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
        <EventCreationModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedDate(null);
          }}
          onSuccess={handleEventCreated}
          userRole={user?.role}
          selectedDate={selectedDate}
          onReconnectRequest={handleDisconnect}
        />
      )}
    </div>
  );
};

export default ConnectGoogleCalendar;
