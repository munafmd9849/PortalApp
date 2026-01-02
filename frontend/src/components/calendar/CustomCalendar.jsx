/**
 * Custom Calendar Component
 * 100% custom UI - NO Google Calendar iframe/embed
 * 
 * Features:
 * - Monthly view (default)
 * - Weekly view
 * - List view
 * - Event display with details
 * - Role-based event creation
 */

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, List, Grid, Plus, Edit, Trash2, X } from 'lucide-react';

const CustomCalendar = ({ 
  events = [], 
  onDateClick, 
  onCreateEvent, 
  userRole,
  onEditEvent,
  onDeleteEvent,
  onRespondToEvent,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'week', 'list'
  const [selectedEvent, setSelectedEvent] = useState(null); // For event detail modal

  // Get first day of month and number of days
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const startDayOfWeek = monthStart.getDay(); // 0 = Sunday

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventDateStr = eventStart.toISOString().split('T')[0];
      return eventDateStr === dateStr;
    });
  };

  // Get events for current week
  const getWeekEvents = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    }
    
    return days;
  }, [currentDate, startDayOfWeek, daysInMonth]);

  // Monthly view
  const renderMonthView = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && 
                          today.getFullYear() === currentDate.getFullYear();

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700 bg-gray-50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="min-h-[100px] border-r border-b border-gray-100" />;
            }

            const dayEvents = getEventsForDate(date);
            const isToday = date.toDateString() === today.toDateString();
            const isCurrentMonthDate = date.getMonth() === currentDate.getMonth();

            return (
              <div
                key={date.toISOString()}
                className={`min-h-[100px] border-r border-b border-gray-100 p-2 ${
                  !isCurrentMonthDate ? 'bg-gray-50' : 'bg-white'
                } ${isToday ? 'bg-blue-50' : ''} hover:bg-gray-50 transition-colors cursor-pointer`}
                onClick={() => onDateClick && onDateClick(date)}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-blue-600 font-bold' : isCurrentMonthDate ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded truncate"
                      title={event.title}
                    >
                      {formatTime(event.start)} {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 px-2">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Weekly view
  const renderWeekView = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week (Sunday)
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      weekDays.push(date);
    }

    const weekEvents = getWeekEvents();
    const today = new Date();

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((date, index) => {
            const isToday = date.toDateString() === today.toDateString();
            const dayEvents = weekEvents.filter(event => {
              const eventDate = new Date(event.start);
              return eventDate.toDateString() === date.toDateString();
            });

            return (
              <div key={index} className={`p-4 border-r border-gray-200 ${index === 6 ? '' : 'border-r'} ${isToday ? 'bg-blue-50' : 'bg-white'}`}>
                <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-2xl font-bold mb-2 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-2">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="text-xs p-2 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200"
                      title={`${formatTime(event.start)} - ${event.title}`}
                    >
                      <div className="font-medium">{formatTime(event.start)}</div>
                      <div className="truncate">{event.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // List view
  const renderListView = () => {
    const sortedEvents = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEvents = sortedEvents.filter(event => new Date(event.start) >= today);
    const pastEvents = sortedEvents.filter(event => new Date(event.start) < today);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">All Events</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {upcomingEvents.length > 0 && (
            <>
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700">Upcoming</h4>
              </div>
              {upcomingEvents.map(event => (
                <div
                  key={event.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onDateClick && onDateClick(new Date(event.start))}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          <span className="font-medium">Date:</span>{' '}
                          {new Date(event.start).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                        <div>
                          <span className="font-medium">Time:</span>{' '}
                          {formatTime(event.start)} - {formatTime(event.end)}
                        </div>
                        {event.location && (
                          <div>
                            <span className="font-medium">Location:</span> {event.location}
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div>
                            <span className="font-medium">Attendees:</span>{' '}
                            {event.attendees.map(a => a.displayName || a.email).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {pastEvents.length > 0 && (
            <>
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700">Past</h4>
              </div>
              {pastEvents.map(event => (
                <div
                  key={event.id}
                  className="p-4 hover:bg-gray-50 transition-colors opacity-60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                      <div className="text-sm text-gray-600">
                        {new Date(event.start).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })} at {formatTime(event.start)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {events.length === 0 && (
            <div className="p-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No events found</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Controls */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          
          <h2 className="text-xl font-bold text-gray-900 min-w-[200px] text-center">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Next month"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>

          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('month')}
              className={`p-2 rounded transition-colors ${
                view === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Month view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('week')}
              className={`p-2 rounded transition-colors ${
                view === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Week view"
            >
              <Calendar className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded transition-colors ${
                view === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Create Event Button (only for RECRUITER and ADMIN) */}
          {(userRole === 'RECRUITER' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
            <button
              onClick={onCreateEvent}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Create Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Calendar View */}
      <div>
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'list' && renderListView()}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <span className="font-semibold text-gray-700">Date & Time:</span>
                <p className="text-gray-900">
                  {new Date(selectedEvent.start).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-gray-600">
                  {formatTime(selectedEvent.start)} - {formatTime(selectedEvent.end)}
                </p>
              </div>

              {selectedEvent.location && (
                <div>
                  <span className="font-semibold text-gray-700">Location:</span>
                  <p className="text-gray-900">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <span className="font-semibold text-gray-700">Description:</span>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div>
                  <span className="font-semibold text-gray-700">Attendees:</span>
                  <div className="mt-2 space-y-1">
                    {selectedEvent.attendees.map((attendee, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-gray-900">{attendee.displayName || attendee.email}</span>
                        {attendee.responseStatus && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            attendee.responseStatus === 'accepted' ? 'bg-green-100 text-green-800' :
                            attendee.responseStatus === 'declined' ? 'bg-red-100 text-red-800' :
                            attendee.responseStatus === 'tentative' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {attendee.responseStatus}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.htmlLink && (
                <div>
                  <a
                    href={selectedEvent.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Open in Google Calendar
                  </a>
                </div>
              )}

              {selectedEvent.hangoutLink && (
                <div>
                  <a
                    href={selectedEvent.hangoutLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Join Google Meet
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                {(userRole === 'RECRUITER' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                  <>
                    <button
                      onClick={() => {
                        onEditEvent && onEditEvent(selectedEvent);
                        setSelectedEvent(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Event
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${selectedEvent.title}"?`)) {
                          onDeleteEvent && onDeleteEvent(selectedEvent.id);
                          setSelectedEvent(null);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Event
                    </button>
                  </>
                )}
                {userRole === 'STUDENT' && (
                  <div className="flex items-center gap-3">
                    {selectedEvent.userResponseStatus !== 'accepted' && (
                      <button
                        onClick={() => {
                          onRespondToEvent && onRespondToEvent(selectedEvent.id, 'accepted');
                          setSelectedEvent(null);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Accept
                      </button>
                    )}
                    {selectedEvent.userResponseStatus !== 'declined' && (
                      <button
                        onClick={() => {
                          onRespondToEvent && onRespondToEvent(selectedEvent.id, 'declined');
                          setSelectedEvent(null);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Decline
                      </button>
                    )}
                    {selectedEvent.userResponseStatus !== 'tentative' && (
                      <button
                        onClick={() => {
                          onRespondToEvent && onRespondToEvent(selectedEvent.id, 'tentative');
                          setSelectedEvent(null);
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Maybe
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomCalendar;
