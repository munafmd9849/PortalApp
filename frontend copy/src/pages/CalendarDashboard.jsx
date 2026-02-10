import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { 
  FaGoogle, 
  FaCalendarAlt, 
  FaPlus, 
  FaTrash,
  FaClock,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaExclamationCircle
} from 'react-icons/fa';
import { Loader } from 'lucide-react';
import api from '../services/api';

const CalendarDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    location: ''
  });

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Load events when connected
  useEffect(() => {
    if (connected) {
      loadEvents();
    }
  }, [connected]);

  // Check for OAuth callback success/error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.showSuccess('Google Calendar connected successfully!');
      checkConnectionStatus();
      // Clean URL
      window.history.replaceState({}, '', '/calendar');
    } else if (params.get('error')) {
      toast.showError('Failed to connect Google Calendar. Please try again.');
      window.history.replaceState({}, '', '/calendar');
    }
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/calendar/status');
      setConnected(response.data.connected);
    } catch (error) {
      console.error('Error checking connection status:', error);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await api.get('/auth/google');
      if (response.data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
      toast.showError('Failed to initiate Google Calendar login');
    }
  };

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const response = await api.get('/calendar/events', {
        params: { maxResults: 20 }
      });
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Error loading events:', error);
      if (error.response?.status === 401) {
        toast.showError('Google Calendar not connected. Please connect your account.');
        setConnected(false);
      } else {
        toast.showError('Failed to load calendar events');
      }
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.start || !formData.end) {
      toast.showError('Please fill in title, start date, and end date');
      return;
    }

    try {
      const response = await api.post('/calendar/add-event', formData);
      
      if (response.data.success) {
        toast.showSuccess('Event created successfully!');
        setFormData({
          title: '',
          description: '',
          start: '',
          end: '',
          location: ''
        });
        setShowAddForm(false);
        loadEvents(); // Refresh events list
      }
    } catch (error) {
      console.error('Error creating event:', error);
      if (error.response?.status === 401) {
        toast.showError('Google Calendar not connected. Please connect your account.');
        setConnected(false);
      } else {
        toast.showError(error.response?.data?.error || 'Failed to create event');
      }
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Calendar?')) {
      return;
    }

    try {
      await api.delete('/calendar/disconnect');
      toast.showSuccess('Google Calendar disconnected');
      setConnected(false);
      setEvents([]);
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.showError('Failed to disconnect Google Calendar');
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--pl-bg)] via-[var(--pl-surface-strong)] to-[var(--pl-bg)] flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-[var(--pl-primary)] mx-auto mb-4" />
          <p className="text-[var(--pl-text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--pl-bg)] via-[var(--pl-surface-strong)] to-[var(--pl-bg)] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-[var(--pl-surface-strong)] rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--pl-text)] mb-2 flex items-center gap-3">
                <FaCalendarAlt className="text-[var(--pl-primary)]" />
                Google Calendar Integration
              </h1>
              <p className="text-[var(--pl-text-secondary)]">Manage your calendar events</p>
            </div>
            {connected && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-4 py-2 bg-[var(--pl-primary)] text-white rounded-lg hover:bg-[var(--pl-link-hover)] flex items-center gap-2 transition-colors"
                >
                  <FaPlus />
                  Add Event
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-[var(--pl-danger)] text-white rounded-lg hover:bg-[var(--pl-danger)]/90 flex items-center gap-2 transition-colors"
                >
                  <FaTrash />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Connection Status */}
        {!connected ? (
          <div className="bg-[var(--pl-surface-strong)] rounded-xl shadow-lg p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-[var(--pl-primary)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaGoogle className="text-4xl text-[var(--pl-primary)]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--pl-text)] mb-2">
                Connect Google Calendar
              </h2>
              <p className="text-[var(--pl-text-secondary)] mb-6">
                Connect your Google Calendar to view and manage events
              </p>
              <button
                onClick={handleGoogleLogin}
                className="px-6 py-3 bg-[var(--pl-primary)] text-white rounded-lg hover:bg-[var(--pl-link-hover)] font-semibold flex items-center gap-3 mx-auto transition-colors shadow-md hover:shadow-lg"
              >
                <FaGoogle />
                Connect with Google Calendar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Add Event Form */}
            {showAddForm && (
              <div className="bg-[var(--pl-surface-strong)] rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-[var(--pl-text)] mb-4 flex items-center gap-2">
                  <FaPlus className="text-[var(--pl-primary)]" />
                  Create New Event
                </h2>
                <form onSubmit={handleAddEvent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--pl-text)] mb-1">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--pl-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)]"
                      placeholder="Enter event title"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--pl-text)] mb-1">
                        Start Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.start}
                        onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                        className="w-full px-4 py-2 border border-[var(--pl-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--pl-text)] mb-1">
                        End Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.end}
                        onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                        className="w-full px-4 py-2 border border-[var(--pl-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--pl-text)] mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--pl-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)]"
                      placeholder="Enter event location"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--pl-text)] mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-[var(--pl-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pl-primary)]"
                      placeholder="Enter event description"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[var(--pl-primary)] text-white rounded-lg hover:bg-[var(--pl-link-hover)] transition-colors font-medium"
                    >
                      Create Event
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setFormData({
                          title: '',
                          description: '',
                          start: '',
                          end: '',
                          location: ''
                        });
                      }}
                      className="px-6 py-2 bg-[var(--pl-surface)] text-[var(--pl-text)] rounded-lg hover:bg-[var(--pl-surface)]/80 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Events List */}
            <div className="bg-[var(--pl-surface-strong)] rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--pl-text)] flex items-center gap-2">
                  <FaCalendarAlt className="text-[var(--pl-primary)]" />
                  Upcoming Events
                </h2>
                <button
                  onClick={loadEvents}
                  disabled={loadingEvents}
                  className="px-4 py-2 bg-[var(--pl-surface)] text-[var(--pl-text)] rounded-lg hover:bg-[var(--pl-surface)]/80 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {loadingEvents ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {loadingEvents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="h-6 w-6 animate-spin text-[var(--pl-primary)] mr-2" />
                  <span className="text-[var(--pl-text-secondary)]">Loading events...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12">
                  <FaCalendarAlt className="text-6xl text-[var(--pl-text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--pl-text-secondary)] text-lg">No upcoming events</p>
                  <p className="text-[var(--pl-text-muted)] text-sm mt-2">Create an event to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="border border-[var(--pl-border)] rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-[var(--pl-text)] mb-2">
                            {event.title}
                          </h3>
                          {event.description && (
                            <p className="text-[var(--pl-text-secondary)] text-sm mb-3">{event.description}</p>
                          )}
                          <div className="space-y-1 text-sm text-[var(--pl-text-secondary)]">
                            <div className="flex items-center gap-2">
                              <FaClock className="text-[var(--pl-primary)]" />
                              <span>
                                {formatDateTime(event.start)} - {formatDateTime(event.end)}
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <FaMapMarkerAlt className="text-[var(--pl-success)]" />
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {event.htmlLink && (
                          <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-[var(--pl-primary)]/20 text-[var(--pl-primary)] rounded-lg hover:bg-[var(--pl-primary)]/30 transition-colors text-sm font-medium ml-4"
                          >
                            View in Google
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarDashboard;











