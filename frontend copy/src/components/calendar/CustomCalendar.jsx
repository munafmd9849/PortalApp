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
      <div className="bg-[var(--pl-surface-strong)] rounded-lg shadow-sm border border-[var(--pl-border)]">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b border-[var(--pl-border)]">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-[var(--pl-text)] bg-[var(--pl-surface)]">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="min-h-[100px] border-r border-b border-[var(--pl-border)]" />;
            }

            const dayEvents = getEventsForDate(date);
            const isToday = date.toDateString() === today.toDateString();
            const isCurrentMonthDate = date.getMonth() === currentDate.getMonth();

            return (
              <div
                key={date.toISOString()}
                className={`min-h-[100px] border-r border-b border-[var(--pl-border)] p-2 ${
                  !isCurrentMonthDate ? 'bg-[var(--pl-surface)]' : 'bg-[var(--pl-surface-strong)]'
                } ${isToday ? 'bg-[var(--pl-primary)]/10' : ''} hover:bg-[var(--pl-surface)] transition-colors cursor-pointer`}
                onClick={() => onDateClick && onDateClick(date)}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-[var(--pl-primary)] font-bold' : isCurrentMonthDate ? 'text-[var(--pl-text)]' : 'text-[var(--pl-text-muted)]'
                }`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="text-xs px-2 py-1 bg-[var(--pl-primary)]/20 text-[var(--pl-primary)] rounded truncate"
                      title={event.title}
                    >
                      {formatTime(event.start)} {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-[var(--pl-text-muted)] px-2">
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
      <div className="bg-[var(--pl-surface-strong)] rounded-lg shadow-sm border border-[var(--pl-border)]">
        <div className="grid grid-cols-7 border-b border-[var(--pl-border)]">
          {weekDays.map((date, index) => {
            const isToday = date.toDateString() === today.toDateString();
            const dayEvents = weekEvents.filter(event => {
              const eventDate = new Date(event.start);
              return eventDate.toDateString() === date.toDateString();
            });

            return (
              <div key={index} className={`p-4 border-r border-[var(--pl-border)] ${index === 6 ? '' : 'border-r'} ${isToday ? 'bg-[var(--pl-primary)]/10' : 'bg-[var(--pl-surface-strong)]'}`}>
                <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-[var(--pl-primary)]' : 'text-[var(--pl-text)]'}`}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-2xl font-bold mb-2 ${isToday ? 'text-[var(--pl-primary)]' : 'text-[var(--pl-text)]'}`}>
                  {date.getDate()}
                </div>
                <div className="space-y-2">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="text-xs p-2 bg-[var(--pl-primary)]/20 text-[var(--pl-primary)] rounded cursor-pointer hover:bg-[var(--pl-primary)]/30"
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
      <div className="bg-[var(--pl-surface-strong)] rounded-lg shadow-sm border border-[var(--pl-border)]">
        <div className="p-4 border-b border-[var(--pl-border)]">
          <h3 className="font-semibold text-[var(--pl-text)]">All Events</h3>
        </div>
        <div className="divide-y divide-[var(--pl-border)]">
          {upcomingEvents.length > 0 && (
            <>
              <div className="p-3 bg-[var(--pl-surface)] border-b border-[var(--pl-border)]">
                <h4 className="text-sm font-semibold text-[var(--pl-text)]">Upcoming</h4>
              </div>
              {upcomingEvents.map(event => (
                <div
                  key={event.id}
                  className="p-4 hover:bg-[var(--pl-surface)] transition-colors cursor-pointer"
                  onClick={() => onDateClick && onDateClick(new Date(event.start))}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[var(--pl-text)] mb-1">{event.title}</h4>
                      <div className="text-sm text-[var(--pl-text-secondary)] space-y-1">
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
              <div className="p-3 bg-[var(--pl-surface)] border-b border-[var(--pl-border)]">
                <h4 className="text-sm font-semibold text-[var(--pl-text)]">Past</h4>
              </div>
              {pastEvents.map(event => (
                <div
                  key={event.id}
                  className="p-4 hover:bg-[var(--pl-surface)] transition-colors opacity-60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[var(--pl-text)] mb-1">{event.title}</h4>
                      <div className="text-sm text-[var(--pl-text-secondary)]">
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
              <Calendar className="mx-auto h-12 w-12 text-[var(--pl-text-muted)] mb-4" />
              <p className="text-[var(--pl-text-secondary)]">No events found</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Controls */}
      <div className="flex items-center justify-between bg-[var(--pl-surface-strong)] rounded-lg shadow-sm border border-[var(--pl-border)] p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-[var(--pl-surface)] rounded-lg transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="h-5 w-5 text-[var(--pl-text-secondary)]" />
          </button>
          
          <h2 className="text-xl font-bold text-[var(--pl-text)] min-w-[200px] text-center">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-[var(--pl-surface)] rounded-lg transition-colors"
            title="Next month"
          >
            <ChevronRight className="h-5 w-5 text-[var(--pl-text-secondary)]" />
          </button>

          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-[var(--pl-primary)] hover:bg-[var(--pl-primary)]/10 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-[var(--pl-surface)] rounded-lg p-1">
            <button
              onClick={() => setView('month')}
              className={`p-2 rounded transition-colors ${
                view === 'month' ? 'bg-[var(--pl-surface-strong)] shadow-sm text-[var(--pl-primary)]' : 'text-[var(--pl-text-secondary)] hover:text-[var(--pl-text)]'
              }`}
              title="Month view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('week')}
              className={`p-2 rounded transition-colors ${
                view === 'week' ? 'bg-[var(--pl-surface-strong)] shadow-sm text-[var(--pl-primary)]' : 'text-[var(--pl-text-secondary)] hover:text-[var(--pl-text)]'
              }`}
              title="Week view"
            >
              <Calendar className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded transition-colors ${
                view === 'list' ? 'bg-[var(--pl-surface-strong)] shadow-sm text-[var(--pl-primary)]' : 'text-[var(--pl-text-secondary)] hover:text-[var(--pl-text)]'
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
              className="flex items-center gap-2 px-4 py-2 bg-[var(--pl-primary)] text-white rounded-lg hover:bg-[var(--pl-link-hover)] transition-colors font-medium"
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
          <div className="bg-[var(--pl-surface-strong)] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--pl-surface-strong)] border-b border-[var(--pl-border)] p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-[var(--pl-text)]">{selectedEvent.title}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-[var(--pl-surface)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--pl-text-secondary)]" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <span className="font-semibold text-[var(--pl-text)]">Date & Time:</span>
                <p className="text-[var(--pl-text)]">
                  {new Date(selectedEvent.start).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-[var(--pl-text-secondary)]">
                  {formatTime(selectedEvent.start)} - {formatTime(selectedEvent.end)}
                </p>
              </div>

              {selectedEvent.location && (
                <div>
                  <span className="font-semibold text-[var(--pl-text)]">Location:</span>
                  <p className="text-[var(--pl-text)]">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <span className="font-semibold text-[var(--pl-text)]">Description:</span>
                  <p className="text-[var(--pl-text)] whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div>
                  <span className="font-semibold text-[var(--pl-text)]">Attendees:</span>
                  <div className="mt-2 space-y-1">
                    {selectedEvent.attendees.map((attendee, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[var(--pl-text)]">{attendee.displayName || attendee.email}</span>
                        {attendee.responseStatus && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            attendee.responseStatus === 'accepted' ? 'bg-[var(--pl-success)]/20 text-[var(--pl-success)]' :
                            attendee.responseStatus === 'declined' ? 'bg-[var(--pl-danger)]/20 text-[var(--pl-danger)]' :
                            attendee.responseStatus === 'tentative' ? 'bg-[var(--pl-warning)]/20 text-[var(--pl-warning)]' :
                            'bg-[var(--pl-surface)] text-[var(--pl-text)]'
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
                    className="text-[var(--pl-primary)] hover:text-[var(--pl-link-hover)] underline"
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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--pl-primary)] text-white rounded-lg hover:bg-[var(--pl-link-hover)] transition-colors"
                  >
                    Join Google Meet
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-[var(--pl-border)]">
                {(userRole === 'RECRUITER' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                  <>
                    <button
                      onClick={() => {
                        onEditEvent && onEditEvent(selectedEvent);
                        setSelectedEvent(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--pl-primary)] text-white rounded-lg hover:bg-[var(--pl-link-hover)] transition-colors"
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
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--pl-danger)] text-white rounded-lg hover:bg-[var(--pl-danger)]/90 transition-colors"
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
                        className="px-4 py-2 bg-[var(--pl-success)] text-white rounded-lg hover:bg-[var(--pl-success)]/90 transition-colors"
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
                        className="px-4 py-2 bg-[var(--pl-danger)] text-white rounded-lg hover:bg-[var(--pl-danger)]/90 transition-colors"
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
                        className="px-4 py-2 bg-[var(--pl-warning)] text-white rounded-lg hover:bg-[var(--pl-warning)]/90 transition-colors"
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
