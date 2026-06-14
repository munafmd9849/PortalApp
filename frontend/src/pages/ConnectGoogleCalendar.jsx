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
import DirectoryLoadingPanel from '../components/dashboard/admin/DirectoryLoading';
import {
  consumeCalendarOAuthResult,
  isAllowedCalendarOAuthOrigin,
  peekCalendarOAuthResult,
  saveCalendarOAuthReturnPath,
} from '../utils/calendarOAuth';

// Simple logger for frontend
const logger = {
  info: (msg, data) => console.log(`[Calendar] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[Calendar] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[Calendar] ${msg}`, data || ''),
};

const ConnectGoogleCalendar = () => {
  const { user, loading: authLoading } = useAuth();
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
  const popupTimeoutRef = useRef(null);
  const statusRequestIdRef = useRef(0);
  const lastVisibilityCheckRef = useRef(0);

  // Prevent page scroll on connect gate (loading / not connected)
  useEffect(() => {
    if (connected !== true) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [connected]);

  const applyOAuthResult = (result) => {
    if (!result || result.type !== 'GOOGLE_CALENDAR_RESULT') return;

    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }
    setConnecting(false);

    if (result.status === 'SUCCESS') {
      logger.info('Calendar connection successful', { calendarEmail: result.calendarEmail });
      if (toast) toast.success('Google Calendar connected successfully!', 'Success');
      setConnected(true);
      setConnectedGoogleEmail(result.calendarEmail || null);
      setHasFullScope(true);
      setErrorMessage(null);
      checkCalendarStatus();
      return;
    }

    if (result.status === 'FAILED') {
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
      logger.warn('Calendar connection failed', {
        reason: result.reason,
        error: result.error,
        calendarEmail: result.calendarEmail,
      });
    }
  };

  // Status + OAuth listeners (after auth is ready)
  useEffect(() => {
    if (authLoading) return undefined;

    const pending = consumeCalendarOAuthResult();
    if (pending) {
      applyOAuthResult(pending);
    } else {
      checkCalendarStatus();
    }

    const handleMessage = (event) => {
      if (!isAllowedCalendarOAuthOrigin(event.origin)) return;
      if (event.data?.type === 'GOOGLE_CALENDAR_RESULT') {
        applyOAuthResult(event.data);
      }
    };

    const handleOAuthComplete = (e) => {
      if (e.detail?.type === 'GOOGLE_CALENDAR_RESULT') {
        applyOAuthResult(e.detail);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('calendar-oauth-complete', handleOAuthComplete);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('calendar-oauth-complete', handleOAuthComplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  useEffect(() => {
    if (authLoading || connected !== null) return undefined;
    const t = setTimeout(() => {
      setConnected(false);
      setErrorMessage('Could not verify calendar status. Please try again.');
    }, 20000);
    return () => clearTimeout(t);
  }, [authLoading, connected]);

  const syncAfterOAuthPopup = () => {
    const pending = consumeCalendarOAuthResult();
    if (pending) {
      applyOAuthResult(pending);
      return true;
    }
    if (connecting) {
      checkCalendarStatus();
    }
    return false;
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || authLoading) return;
      const now = Date.now();
      const debounceMs = connecting ? 300 : 3000;
      if (now - lastVisibilityCheckRef.current < debounceMs) return;
      lastVisibilityCheckRef.current = now;
      syncAfterOAuthPopup();
    };

    const handleWindowFocus = () => {
      if (authLoading) return;
      if (connecting || peekCalendarOAuthResult()) {
        syncAfterOAuthPopup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting, authLoading]);

  // Poll localStorage while OAuth popup is open (opener/postMessage often lost after Google redirect)
  useEffect(() => {
    if (!connecting || authLoading) return undefined;
    const id = setInterval(() => {
      if (peekCalendarOAuthResult()) {
        syncAfterOAuthPopup();
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting, authLoading]);

  // Fetch events once when connection becomes true
  useEffect(() => {
    if (connected === true) {
      fetchEvents();
    } else if (connected === false) {
      setEvents([]);
    }
  }, [connected]);

  /**
   * Check if calendar is connected
   */
  const checkCalendarStatus = async () => {
    const requestId = ++statusRequestIdRef.current;
    try {
      const response = await api.get('/calendar/status');
      if (requestId !== statusRequestIdRef.current) return;

      const isConnected = Boolean(response.data?.connected);
      const scopeStatus = response.data?.hasFullScope;
      const googleEmail = response.data?.connectedGoogleEmail;
      const regEmail = response.data?.registeredEmail;

      setRegisteredEmail(regEmail || user?.email || null);
      setConnectedGoogleEmail(googleEmail || null);
      setHasFullScope(scopeStatus ?? null);

      if (response.data?.emailMismatch) {
        setErrorMessage(
          `Use your registered email to connect (${regEmail || user?.email || 'your account email'}).`,
        );
        setConnected(false);
        return;
      }

      setConnected(isConnected);
      if (!isConnected) {
        setEvents([]);
      }
    } catch (error) {
      if (requestId !== statusRequestIdRef.current) return;
      console.error('Error checking calendar status:', error);
      setConnected(false);
      setHasFullScope(null);
      setErrorMessage('Unable to check calendar status. Please refresh and try again.');
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
      setErrorMessage(null);
      saveCalendarOAuthReturnPath(`${window.location.pathname}${window.location.search}`);

      const response = await api.get('/calendar/oauth-url');
      const authUrl = response.data.url;

      const width = 520;
      const height = 680;
      const left = Math.max(0, (window.screen.width - width) / 2);
      const top = Math.max(0, (window.screen.height - height) / 2);
      const popupName = 'Google Calendar Authorization';

      const popup = window.open(
        authUrl,
        popupName,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`,
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
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 7, 0, 23, 59, 59).toISOString();

      const response = await api.get('/calendar/events', {
        params: {
          timeMin,
          timeMax,
          maxResults: 100,
        },
      });
      setEvents(response.data.events || []);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching events:', error);

      const code = error.response?.data?.code;
      const msg = error.response?.data?.message || '';

      if (error.response?.status === 403 && (code === 'RECONNECT_REQUIRED' || msg.includes('not connected'))) {
        setConnected(false);
        setHasFullScope(null);
        setEvents([]);
        setErrorMessage(
          msg.includes('registered email')
            ? msg
            : 'Please reconnect Google Calendar using your registered email.',
        );
        return;
      }

      if (error.response?.status === 401 || code === 'RECONNECT_REQUIRED') {
        setConnected(false);
        setHasFullScope(null);
        setEvents([]);
        setErrorMessage('Calendar authentication expired. Please reconnect your Google Calendar.');
        return;
      }

      const errMsg = error.response?.data?.message || error.message || 'Failed to fetch calendar events.';
      if (!errMsg.toLowerCase().includes('not connected')) {
        setErrorMessage(errMsg);
      }
      setEvents([]);
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

  const connectGateShell = (content) => (
    <div
      className="-m-3 flex w-[calc(100%+1.5rem)] items-center justify-center overflow-hidden sm:-m-6 sm:w-[calc(100%+3rem)] md:-m-8 md:w-[calc(100%+4rem)]"
      style={{ height: 'calc(100dvh - 6.5rem)', maxHeight: 'calc(100dvh - 6.5rem)' }}
    >
      <div className="w-full max-w-lg shrink-0 px-4">{content}</div>
    </div>
  );

  if (authLoading || connected === null) {
    return connectGateShell(
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <FaSpinner className="mx-auto mb-4 h-9 w-9 animate-spin text-indigo-600" />
        <h2 className="font-outfit text-xl font-bold text-slate-900">Checking calendar</h2>
        <p className="mt-2 text-sm text-slate-500">
          {authLoading ? 'Signing you in…' : 'Please wait a moment…'}
        </p>
      </div>,
    );
  }

  // Show connect button if not connected
  if (connected === false) {
    return connectGateShell(
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {errorMessage && (
          <div className="relative max-h-24 overflow-y-auto border-b border-rose-100 bg-rose-50 px-4 py-3">
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="absolute right-3 top-3 rounded-lg p-1 text-rose-500 hover:bg-rose-100"
              title="Dismiss"
            >
              <FaTimes className="text-sm" />
            </button>
            <p className="pr-8 text-sm leading-relaxed text-rose-900 whitespace-pre-line">{errorMessage}</p>
          </div>
        )}

        <div className="p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <FaCalendar className="h-6 w-6" />
            </div>
            <h1 className="font-outfit text-2xl font-bold text-slate-900">Connect Google Calendar</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
              Connect your Google Calendar to view and manage your events in one place.
            </p>
          </div>

          {registeredEmail && (
            <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Registered email</p>
              <p className="mt-1 break-all text-sm font-medium text-slate-800">{registeredEmail}</p>
              <p className="mt-1.5 text-xs text-amber-900/90">Use this exact Gmail account when signing in with Google.</p>
            </div>
          )}

          {connecting ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
              <FaSpinner className="mx-auto h-5 w-5 animate-spin text-indigo-600" />
              <p className="mt-2 text-sm font-semibold text-slate-800">Connecting to Google…</p>
              <p className="mt-1 text-xs text-slate-600">Complete sign-in in the popup window.</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200/50 transition-all hover:bg-indigo-700 active:scale-[0.99]"
            >
              <FaGoogle className="h-4 w-4" />
              Connect Google Calendar
            </button>
          )}

          <p className="mt-3 text-center text-xs text-slate-500">
            A popup will open for authorization. Please allow popups for this site.
          </p>
        </div>
      </div>,
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

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
          {connected && hasFullScope === false && (
            <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
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
          <div className="flex items-center gap-3 flex-wrap justify-end">
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

        {loadingEvents && events.length === 0 ? (
          <DirectoryLoadingPanel
            title="Loading your calendar..."
            subtitle="Fetching events from Google Calendar"
          />
        ) : (
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
        )}
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
