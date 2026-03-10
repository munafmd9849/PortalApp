/**
 * Student Calendar Component
 * Displays interviews, drive dates, deadlines, and other important events
 */

import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Briefcase, AlertCircle, CheckCircle, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

const StudentCalendar = ({ applications = [], jobs = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Get current month/year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Collect all events from applications and jobs
  const events = useMemo(() => {
    const eventMap = {};

    // Add interview dates from applications
    applications.forEach(app => {
      if (app.interviewDate) {
        const date = new Date(app.interviewDate);
        const dateKey = formatDateKey(date);
        if (!eventMap[dateKey]) {
          eventMap[dateKey] = [];
        }
        eventMap[dateKey].push({
          type: 'interview',
          title: `Interview: ${app.job?.jobTitle || 'Unknown'}`,
          company: app.company?.name || 'Unknown Company',
          time: formatTime(date),
          color: 'bg-blue-500',
          icon: Clock,
        });
      }
    });

    // Add application deadlines from jobs
    jobs.forEach(job => {
      if (job.applicationDeadline) {
        const date = new Date(job.applicationDeadline);
        const dateKey = formatDateKey(date);
        if (!eventMap[dateKey]) {
          eventMap[dateKey] = [];
        }
        eventMap[dateKey].push({
          type: 'deadline',
          title: `Deadline: ${job.jobTitle}`,
          company: job.companyName || job.company?.name || 'Unknown',
          color: 'bg-red-500',
          icon: AlertCircle,
        });
      }

      // Add drive dates
      if (job.driveDate) {
        const date = new Date(job.driveDate);
        const dateKey = formatDateKey(date);
        if (!eventMap[dateKey]) {
          eventMap[dateKey] = [];
        }
        eventMap[dateKey].push({
          type: 'drive',
          title: `Drive: ${job.jobTitle}`,
          company: job.companyName || job.company?.name || 'Unknown',
          location: job.companyLocation || job.company?.location || 'TBD',
          color: 'bg-green-500',
          icon: Briefcase,
        });
      }
    });

    return eventMap;
  }, [applications, jobs]);

  // Format date key (YYYY-MM-DD)
  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format time (HH:MM AM/PM)
  function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Format date for display
  function formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Check if date has events
  const getDateEvents = (day) => {
    const date = new Date(currentYear, currentMonth, day);
    const dateKey = formatDateKey(date);
    return events[dateKey] || [];
  };

  // Check if date is today
  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  // Check if date is selected
  const isSelected = (day) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth === selectedDate.getMonth() &&
      currentYear === selectedDate.getFullYear()
    );
  };

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Get selected date events
  const selectedDateEvents = selectedDate ? getDateEvents(selectedDate.getDate()) : [];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Academic Calendar
          </h2>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Today
          </button>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h3 className="text-xl font-semibold text-gray-800">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dateEvents = getDateEvents(day);
            const hasEvents = dateEvents.length > 0;
            const today = isToday(day);
            const selected = isSelected(day);

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
                className={`
                  aspect-square border rounded-lg p-2 cursor-pointer transition-all
                  ${today ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                  ${selected ? 'ring-2 ring-blue-500 bg-blue-100' : ''}
                  ${hasEvents ? 'hover:bg-gray-50' : 'hover:bg-gray-50'}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                      text-sm font-medium
                      ${today ? 'text-blue-600 font-bold' : 'text-gray-700'}
                      ${selected ? 'text-blue-700' : ''}
                    `}
                  >
                    {day}
                  </span>
                  {hasEvents && (
                    <div className="flex gap-1">
                      {dateEvents.slice(0, 2).map((event, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${event.color}`}
                          title={event.title}
                        />
                      ))}
                      {dateEvents.length > 2 && (
                        <span className="text-xs text-gray-500">+{dateEvents.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-700">Interviews</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-700">Deadlines</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700">Drive Dates</span>
          </div>
        </div>

        {/* Selected Date Events */}
        {selectedDate && selectedDateEvents.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-3">
              Events on {formatDate(selectedDate)}
            </h4>
            <div className="space-y-3">
              {selectedDateEvents.map((event, index) => {
                const Icon = event.icon;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${event.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900">{event.title}</h5>
                        <p className="text-sm text-gray-600 mt-1">{event.company}</p>
                        {event.time && (
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {event.time}
                          </p>
                        )}
                        {event.location && (
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedDate && selectedDateEvents.length === 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500">No events on {formatDate(selectedDate)}</p>
          </div>
        )}

        {!selectedDate && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
            <p className="text-gray-600">Click on a date to view events</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCalendar;

