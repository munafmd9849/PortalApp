# Google Calendar Integration - Complete Implementation

## Overview
Complete Google Calendar integration with 100% custom UI. Google Calendar is used ONLY as a backend service - no iframes or embedded Google UI.

## ✅ Implementation Status

### Backend
- ✅ **Database Schema**: Added `googleCalendarConnected` boolean to User model
- ✅ **Unified Token Storage**: All users use `GoogleCalendarToken` model
- ✅ **OAuth Flow**: Complete OAuth 2.0 flow with popup support
- ✅ **Token Refresh**: Automatic token refresh on expiry
- ✅ **Role-Based Permissions**: 
  - STUDENT: Read-only (cannot create events)
  - RECRUITER: Can create events (can invite students)
  - ADMIN: Can create events (can invite anyone)

### API Endpoints

#### `GET /api/calendar/status`
- Check if user's Google Calendar is connected
- Returns: `{ connected: boolean }`

#### `GET /api/calendar/oauth-url`
- Generate Google OAuth URL for calendar connection
- Returns: `{ url: string }`
- Scopes: `https://www.googleapis.com/auth/calendar` (full access)

#### `GET /auth/google/calendar/callback`
- OAuth callback handler
- Exchanges code for tokens
- Stores tokens in database
- Sets `googleCalendarConnected = true`
- Responds with HTML that closes popup and notifies parent window

#### `GET /api/calendar/events`
- Fetch calendar events
- Query params: `timeMin`, `timeMax`, `maxResults`
- Returns: `{ events: [...] }`

#### `POST /api/calendar/events`
- Create a new calendar event
- **Role-based**: STUDENT cannot create (403 Forbidden)
- Request body:
  ```json
  {
    "title": "string (required)",
    "description": "string (optional)",
    "start": "ISO string (required)",
    "end": "ISO string (required)",
    "location": "string (optional)",
    "attendeesEmails": ["email1@example.com", "email2@example.com"],
    "meetLink": false
  }
  ```
- Returns: `{ event: {...} }`

### Frontend

#### Components
- ✅ **CustomCalendar**: Custom calendar UI with monthly/weekly/list views
  - Monthly grid view with event indicators
  - Weekly view with detailed event cards
  - List view with all events (upcoming and past)
  - Date navigation (previous/next month, today button)
  - View toggle (month/week/list)
  - Role-based "Create Event" button

- ✅ **EventCreationModal**: Event creation form
  - Title, description, date/time pickers
  - Location field
  - Attendee management (add/remove emails)
  - Google Meet link option
  - Role-based visibility (only for RECRUITER/ADMIN)

- ✅ **ConnectGoogleCalendar**: Main calendar page
  - Connection status check
  - OAuth popup flow (600x700px, centered)
  - Custom calendar display when connected
  - Event creation integration

## 🔧 Setup Instructions

### 1. Environment Variables

Update your `.env` file in the backend directory:

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/calendar/callback
```

**Important**: Update `GOOGLE_REDIRECT_URI` to match the new callback path:
- Old: `http://localhost:3000/auth/google/callback`
- New: `http://localhost:3000/auth/google/calendar/callback`

### 2. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/calendar/callback`
6. For production, add your production callback URL

### 3. Database Migration

The schema has been updated. Run:

```bash
cd backend
npx prisma db push
```

Or create a migration:

```bash
npx prisma migrate dev --name add_google_calendar_connected
```

## 📋 User Flows

### Student Flow
1. Navigate to Calendar page
2. Click "Connect Google Calendar"
3. Authorize in popup
4. View events in custom calendar UI
5. **Cannot create events** (read-only)

### Recruiter Flow
1. Navigate to Calendar page
2. Connect calendar (if not connected)
3. View events in custom calendar UI
4. Click "Create Event" button
5. Fill event form (can invite students)
6. Event created in Google Calendar
7. Invited students receive calendar invitation

### Admin Flow
1. Navigate to Calendar page
2. Connect calendar (if not connected)
3. View events in custom calendar UI
4. Click "Create Event" button
5. Fill event form (can invite anyone)
6. Event created in Google Calendar

## 🎨 UI Features

### Calendar Views
- **Monthly View**: Grid layout with event indicators
- **Weekly View**: Detailed week view with event cards
- **List View**: Chronological list of all events

### Event Display
- Event title
- Date and time
- Location (if provided)
- Attendees list
- Created by information
- Google Meet link (if created)

### Event Creation
- Date/time pickers
- Title and description
- Location field
- Attendee management (add/remove emails)
- Google Meet link option
- Role-based permissions enforced

## 🔒 Security

- ✅ Client secret stored only in backend
- ✅ Tokens encrypted at rest (database)
- ✅ Access tokens never exposed to frontend
- ✅ Automatic token refresh
- ✅ Role-based permission checks
- ✅ OAuth state parameter for security

## 🧪 Testing Checklist

- [ ] OAuth popup opens correctly (600x700px, centered)
- [ ] OAuth callback closes popup and notifies parent
- [ ] Calendar status updates after connection
- [ ] Events load and display correctly
- [ ] Monthly/weekly/list views work
- [ ] Student cannot create events (403 error)
- [ ] Recruiter can create events
- [ ] Admin can create events
- [ ] Event creation form validates dates
- [ ] Attendees are added to events
- [ ] Google Meet links are created (if option selected)
- [ ] Token refresh works automatically

## 📝 Code Structure

```
backend/
├── src/
│   ├── controllers/
│   │   ├── calendar.js          # Main calendar controller
│   │   └── calendarOAuth.js     # OAuth callback handler
│   ├── routes/
│   │   └── calendar.js           # Calendar routes
│   ├── services/
│   │   └── calendarServiceEnhanced.js  # Calendar service (updated)
│   └── utils/
│       └── googleCalendar.js     # Google Calendar utilities
│
frontend/
├── src/
│   ├── components/
│   │   └── calendar/
│   │       ├── CustomCalendar.jsx        # Custom calendar UI
│   │       └── EventCreationModal.jsx   # Event creation form
│   └── pages/
│       └── ConnectGoogleCalendar.jsx    # Main calendar page
```

## 🚀 Next Steps

1. **Update Environment Variables**: Set `GOOGLE_REDIRECT_URI` to new callback path
2. **Test OAuth Flow**: Connect calendar and verify popup flow
3. **Test Event Creation**: Create events as RECRUITER/ADMIN
4. **Test Permissions**: Verify STUDENT cannot create events
5. **Production Setup**: Update redirect URI in Google Cloud Console for production

## 📚 API Usage Examples

### Check Connection Status
```javascript
const response = await api.get('/calendar/status');
console.log(response.data.connected); // true/false
```

### Get OAuth URL
```javascript
const response = await api.get('/calendar/oauth-url');
const authUrl = response.data.url;
// Open in popup window
```

### Fetch Events
```javascript
const response = await api.get('/calendar/events', {
  params: {
    timeMin: new Date().toISOString(),
    maxResults: 250
  }
});
console.log(response.data.events);
```

### Create Event
```javascript
const response = await api.post('/calendar/events', {
  title: 'Interview with John Doe',
  description: 'Technical interview',
  start: '2024-01-15T10:00:00Z',
  end: '2024-01-15T11:00:00Z',
  location: 'Conference Room A',
  attendeesEmails: ['student@example.com'],
  meetLink: true
});
console.log(response.data.event);
```

## ⚠️ Important Notes

1. **Redirect URI**: Must match exactly in Google Cloud Console
2. **OAuth Scope**: Uses full calendar access (not readonly) for event creation
3. **Token Storage**: All users use unified `GoogleCalendarToken` model
4. **Role Permissions**: Enforced at API level, not just UI
5. **Custom UI**: No Google Calendar iframe/embed - 100% custom implementation

## 🐛 Troubleshooting

### OAuth Popup Not Opening
- Check browser popup blocker settings
- Verify OAuth URL is generated correctly

### "Calendar not connected" Error
- Check if `googleCalendarConnected` is true in database
- Verify tokens exist in `GoogleCalendarToken` table

### Token Refresh Fails
- Check if refresh token exists
- Verify Google OAuth credentials are correct
- Check token expiry dates

### Events Not Loading
- Verify calendar is connected
- Check API response for errors
- Verify date range parameters

---

**Implementation Complete** ✅
All requirements have been implemented with production-ready code, role-based permissions, and a complete custom UI.
