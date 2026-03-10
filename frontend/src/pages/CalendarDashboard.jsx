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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                <FaCalendarAlt className="text-blue-600" />
                Google Calendar Integration
              </h1>
              <p className="text-gray-600">Manage your calendar events</p>
            </div>
            {connected && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                  <FaPlus />
                  Add Event
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
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
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaGoogle className="text-4xl text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Connect Google Calendar
              </h2>
              <p className="text-gray-600 mb-6">
                Connect your Google Calendar to view and manage events
              </p>
              <button
                onClick={handleGoogleLogin}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-3 mx-auto transition-colors shadow-md hover:shadow-lg"
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
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaPlus className="text-blue-600" />
                  Create New Event
                </h2>
                <form onSubmit={handleAddEvent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter event title"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.start}
                        onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.end}
                        onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter event location"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter event description"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Events List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FaCalendarAlt className="text-blue-600" />
                  Upcoming Events
                </h2>
                <button
                  onClick={loadEvents}
                  disabled={loadingEvents}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {loadingEvents ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {loadingEvents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Loading events...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12">
                  <FaCalendarAlt className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No upcoming events</p>
                  <p className="text-gray-500 text-sm mt-2">Create an event to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {event.title}
                          </h3>
                          {event.description && (
                            <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                          )}
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <FaClock className="text-blue-500" />
                              <span>
                                {formatDateTime(event.start)} - {formatDateTime(event.end)}
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <FaMapMarkerAlt className="text-green-500" />
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
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium ml-4"
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











