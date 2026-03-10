# Frontend Integration Guide - Google Calendar

## Quick Integration Steps

### 1. Admin Dashboard - Add "Schedule Event" Button

**File:** `frontend/src/components/dashboard/admin/StudentDirectory.jsx` or `AdminHome.jsx`

```jsx
import ScheduleEventModal from '../../calendar/ScheduleEventModal';
import ConnectCalendarButton from '../../calendar/ConnectCalendarButton';
import { useState } from 'react';

// Add state
const [showScheduleModal, setShowScheduleModal] = useState(false);
const [selectedStudents, setSelectedStudents] = useState([]);

// Add button in your component
<button
  onClick={() => setShowScheduleModal(true)}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
  Schedule Event
</button>

// Add modal
<ScheduleEventModal
  isOpen={showScheduleModal}
  onClose={() => setShowScheduleModal(false)}
  recipients={selectedStudents} // or students from your list
  onSuccess={(data) => {
    console.log('Events created:', data);
    // Refresh students list or show success message
  }}
  userRole="admin"
/>

// Add connect button
<ConnectCalendarButton onConnected={() => {/* refresh status */}} />
```

### 2. Recruiter Dashboard - Interview Scheduling

**File:** `frontend/src/components/dashboard/recruiter/RecruiterJobs.jsx` or similar

```jsx
import ScheduleEventModal from '../../calendar/ScheduleEventModal';
import ConnectCalendarButton from '../../calendar/ConnectCalendarButton';

// When scheduling interview for a student:
<button
  onClick={() => setShowScheduleModal(true)}
  className="px-4 py-2 bg-green-600 text-white rounded-lg"
>
  Schedule Interview
</button>

<ScheduleEventModal
  isOpen={showScheduleModal}
  onClose={() => setShowScheduleModal(false)}
  recipients={[{ id: studentId, fullName: studentName, email: studentEmail }]}
  onSuccess={(data) => {
    // Handle success - maybe update application status
  }}
  userRole="recruiter"
/>
```

### 3. Student Dashboard - Self Events

**File:** `frontend/src/components/dashboard/student/StudentDashboard.jsx` or similar

```jsx
import ScheduleEventModal from '../../calendar/ScheduleEventModal';
import ConnectCalendarButton from '../../calendar/ConnectCalendarButton';

// Add "Add to Calendar" button
<button
  onClick={() => setShowScheduleModal(true)}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
>
  Add to Calendar
</button>

<ScheduleEventModal
  isOpen={showScheduleModal}
  onClose={() => setShowScheduleModal(false)}
  recipients={[]} // Empty for self-event
  onSuccess={(data) => {
    // Show success message
  }}
  userRole="student"
/>

// Show connection status
<ConnectCalendarButton variant="badge" />
```

### 4. Show Connection Alert for Failed Recipients

**After creating events, show alert if some failed:**

```jsx
import ConnectCalendarButton from '../../calendar/ConnectCalendarButton';

// After API response with failed recipients:
{response.data.failed && response.data.failed.length > 0 && (
  <div className="mt-4">
    <p className="text-yellow-600 mb-2">
      {response.data.failed.length} student(s) have not connected Google Calendar
    </p>
    <ConnectCalendarButton variant="alert" />
  </div>
)}
```

---

## Component Props

### ScheduleEventModal

```typescript
{
  isOpen: boolean;
  onClose: () => void;
  recipients: Array<{
    id?: string;
    studentId?: string;
    fullName?: string;
    name?: string;
    email: string;
  }>;
  onSuccess?: (data: any) => void;
  userRole: 'admin' | 'recruiter' | 'student';
}
```

### ConnectCalendarButton

```typescript
{
  onConnected?: () => void;
  variant?: 'button' | 'badge' | 'alert';
}
```

---

## API Endpoints Reference

### Check Connection Status
```javascript
const response = await api.get('/auth/google/status');
// Returns: { connected: boolean, role: string }
```

### Initiate OAuth (Redirect)
```javascript
window.location.href = '/api/auth/google/init';
```

### Disconnect
```javascript
await api.delete('/auth/google/disconnect');
```

### Create Admin Event
```javascript
await api.post('/calendar/admin/create', {
  studentIds: ['id1', 'id2'],
  eventData: {
    summary: 'Event Title',
    start: '2024-01-01T10:00:00Z',
    end: '2024-01-01T11:00:00Z',
    location: 'Optional',
    meetLink: true, // Optional
  },
});
```

### Create Recruiter Event
```javascript
await api.post('/calendar/recruiter/create', {
  studentId: 'student-id',
  eventData: { /* same as above */ },
});
```

### Create Student Event
```javascript
await api.post('/calendar/student/create', {
  eventData: { /* same as above */ },
});
```

---

## Example: Complete Admin Integration

```jsx
import React, { useState } from 'react';
import ScheduleEventModal from '../../calendar/ScheduleEventModal';
import ConnectCalendarButton from '../../calendar/ConnectCalendarButton';
import { FaCalendarPlus } from 'react-icons/fa';

function StudentDirectory() {
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  return (
    <div>
      {/* Header with buttons */}
      <div className="flex justify-between items-center mb-4">
        <h2>Students</h2>
        <div className="flex gap-3">
          <ConnectCalendarButton />
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
          >
            <FaCalendarPlus />
            Schedule Event
          </button>
        </div>
      </div>

      {/* Students list with checkboxes */}
      {students.map(student => (
        <div key={student.id}>
          <input
            type="checkbox"
            checked={selectedStudents.includes(student.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedStudents([...selectedStudents, student.id]);
              } else {
                setSelectedStudents(selectedStudents.filter(id => id !== student.id));
              }
            }}
          />
          {student.fullName}
        </div>
      ))}

      {/* Modal */}
      <ScheduleEventModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        recipients={students.filter(s => selectedStudents.includes(s.id))}
        onSuccess={(data) => {
          console.log('Created:', data.createdFor);
          console.log('Failed:', data.failed);
          setShowModal(false);
        }}
        userRole="admin"
      />
    </div>
  );
}
```

---

**Ready to integrate!** Follow these patterns to add calendar functionality to your dashboards.



