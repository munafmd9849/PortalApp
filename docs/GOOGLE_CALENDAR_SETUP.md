# Google Calendar Integration - Complete Setup Guide

## 📋 Overview

This guide provides complete setup instructions for Google Calendar OAuth2 integration with read/write event capabilities.

---

## 🔧 Prerequisites

1. Google Cloud Project created
2. OAuth 2.0 Client ID and Client Secret generated
3. Node.js and npm installed
4. Project dependencies installed

---

## 📦 Step 1: Install Backend Dependencies

```bash
cd backend
npm install googleapis
```

---

## 🔐 Step 2: Configure Environment Variables

### Backend `.env` File

Add these variables to `backend/.env`:

```env
# Google OAuth2 Credentials
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Frontend URL (for redirects after OAuth)
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env` File

Add this variable to `frontend/.env`:

```env
# Google OAuth Client ID (for reference, not used directly)
VITE_GOOGLE_CLIENT_ID=your_client_id_here
```

**Note:** The frontend `VITE_GOOGLE_CLIENT_ID` is optional and mainly for reference. All OAuth operations happen through the backend.

---

## 🗄️ Step 3: Update Database Schema

1. **Run Prisma migration:**

```bash
cd backend
npx prisma migrate dev --name add_google_calendar_token
```

This will create the `GoogleCalendarToken` table in your database.

2. **Generate Prisma Client:**

```bash
npx prisma generate
```

---

## ✅ Step 4: Google Cloud Console Configuration

### 1. Authorized Redirect URIs

In your Google Cloud Console OAuth 2.0 Client settings, add this redirect URI:

```
http://localhost:3000/api/auth/google/callback
```

**For production**, add:
```
https://yourdomain.com/api/auth/google/callback
```

### 2. Authorized JavaScript Origins

Add these origins:

```
http://localhost:3000
http://localhost:5173
```

**For production:**
```
https://yourdomain.com
```

### 3. OAuth Consent Screen

Ensure your OAuth consent screen is configured with:
- Scopes: `calendar` and `calendar.events`
- User type: Internal or External (depending on your needs)

---

## 🚀 Step 5: Start the Application

### Backend Server

```bash
cd backend
npm run dev
```

Server should start on `http://localhost:3000`

### Frontend Server

```bash
cd frontend
npm run dev
```

Frontend should start on `http://localhost:5173`

---

## 🧪 Step 6: Test the Integration

### Complete Flow Test:

1. **Navigate to Calendar Dashboard:**
   - Go to: `http://localhost:5173/calendar`
   - You should see "Connect Google Calendar" button

2. **Click "Connect with Google Calendar":**
   - You'll be redirected to Google OAuth consent screen
   - Grant permissions for Calendar access

3. **After Granting Permission:**
   - Google redirects to: `http://localhost:3000/api/auth/google/callback`
   - Backend exchanges code for tokens
   - You're redirected back to: `http://localhost:5173/calendar?success=true`
   - Calendar dashboard now shows connected status

4. **View Events:**
   - Click "Refresh" to load upcoming events from your Google Calendar

5. **Create Event:**
   - Click "Add Event"
   - Fill in event details (title, start, end, location, description)
   - Click "Create Event"
   - Event should appear in your Google Calendar

---

## 📁 Files Created/Modified

### Backend Files Created:

1. **`backend/src/controllers/calendar.js`**
   - OAuth2 flow handlers
   - Calendar API operations (get events, create event)
   - Token refresh logic

2. **`backend/src/routes/calendar.js`**
   - API route definitions:
     - `GET /api/auth/google` - Get OAuth URL
     - `GET /api/auth/google/callback` - Handle OAuth callback
     - `GET /api/calendar/events` - Get upcoming events
     - `POST /api/calendar/add-event` - Create event
     - `GET /api/calendar/status` - Check connection status
     - `DELETE /api/calendar/disconnect` - Disconnect calendar

### Backend Files Modified:

1. **`backend/prisma/schema.prisma`**
   - Added `GoogleCalendarToken` model
   - Added relation to `User` model

2. **`backend/src/server.js`**
   - Added calendar routes import
   - Mounted calendar routes at `/api/calendar`

3. **`backend/package.json`**
   - Added `googleapis` dependency

### Frontend Files Created:

1. **`frontend/src/pages/CalendarDashboard.jsx`**
   - Calendar dashboard UI
   - Google Calendar connection flow
   - Event listing and creation

### Frontend Files Modified:

1. **`frontend/src/App.jsx`**
   - Added `/calendar` route (protected)
   - Imported CalendarDashboard component

---

## 🔒 Security Notes

1. **Tokens Storage:**
   - Access tokens and refresh tokens are stored in the database
   - In production, consider encrypting tokens before storing

2. **Token Refresh:**
   - Backend automatically refreshes expired access tokens using refresh token
   - Refresh token is stored securely for long-term access

3. **CORS Configuration:**
   - CORS is already configured in `server.js` for localhost in development
   - Update `CORS_ORIGIN` in production `.env`

4. **Authentication:**
   - All calendar endpoints require user authentication (JWT token)
   - User ID is passed securely via OAuth `state` parameter

---

## 🌐 API Endpoints

### Authentication Endpoints

#### `GET /api/auth/google`
- **Auth Required:** Yes (JWT token)
- **Description:** Get Google OAuth URL
- **Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### `GET /api/auth/google/callback`
- **Auth Required:** No (called by Google)
- **Description:** Handle OAuth callback, exchange code for tokens
- **Query Params:** `code`, `state`
- **Redirects to:** Frontend `/calendar` page

### Calendar Endpoints

#### `GET /api/calendar/status`
- **Auth Required:** Yes
- **Description:** Check if user has Google Calendar connected
- **Response:**
```json
{
  "connected": true,
  "connectedAt": "2024-01-01T00:00:00.000Z"
}
```

#### `GET /api/calendar/events`
- **Auth Required:** Yes
- **Description:** Get user's upcoming calendar events
- **Query Params:** `maxResults` (optional, default: 10)
- **Response:**
```json
{
  "events": [
    {
      "id": "event_id",
      "title": "Meeting",
      "description": "Description",
      "start": "2024-01-01T10:00:00Z",
      "end": "2024-01-01T11:00:00Z",
      "location": "Location",
      "htmlLink": "https://calendar.google.com/..."
    }
  ]
}
```

#### `POST /api/calendar/add-event`
- **Auth Required:** Yes
- **Description:** Create a new calendar event
- **Body:**
```json
{
  "title": "Event Title",
  "description": "Event Description",
  "start": "2024-01-01T10:00:00",
  "end": "2024-01-01T11:00:00",
  "location": "Event Location"
}
```
- **Response:**
```json
{
  "success": true,
  "event": {
    "id": "event_id",
    "title": "Event Title",
    "htmlLink": "https://calendar.google.com/..."
  }
}
```

#### `DELETE /api/calendar/disconnect`
- **Auth Required:** Yes
- **Description:** Disconnect Google Calendar
- **Response:**
```json
{
  "success": true,
  "message": "Google Calendar disconnected"
}
```

---

## 🐛 Troubleshooting

### Issue: "Failed to get access token"
- **Solution:** Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct in `.env`
- Verify redirect URI matches exactly in Google Cloud Console

### Issue: "User not authenticated" on `/api/auth/google`
- **Solution:** Ensure you're logged in and JWT token is sent in Authorization header

### Issue: Events not loading
- **Solution:** 
  - Check if tokens were saved correctly
  - Verify token hasn't expired (refresh should happen automatically)
  - Check backend logs for API errors

### Issue: OAuth callback redirects to wrong URL
- **Solution:** 
  - Check `FRONTEND_URL` in backend `.env`
  - Verify `GOOGLE_REDIRECT_URI` matches Google Cloud Console settings

---

## 📝 Next Steps (Optional Enhancements)

1. **Token Encryption:**
   - Encrypt tokens before storing in database
   - Use libraries like `crypto` or `node-forge`

2. **Event Editing/Deletion:**
   - Add endpoints for updating and deleting events

3. **Calendar Selection:**
   - Allow users to select which calendar to use
   - Support multiple calendars

4. **Event Sync:**
   - Periodically sync events from Google Calendar
   - Handle calendar changes from external sources

5. **Notifications:**
   - Send notifications before upcoming events
   - Integrate with existing notification system

---

## ✅ Verification Checklist

- [ ] `googleapis` package installed in backend
- [ ] Environment variables set in backend `.env`
- [ ] Database migration run successfully
- [ ] Google Cloud Console redirect URI configured
- [ ] Backend server running on port 3000
- [ ] Frontend server running on port 5173
- [ ] Can access `/calendar` page when logged in
- [ ] OAuth flow completes successfully
- [ ] Events can be viewed
- [ ] Events can be created

---

**Implementation Complete!** 🎉

All files have been created and the integration is ready to use. Follow the steps above to configure and test the Google Calendar integration.



