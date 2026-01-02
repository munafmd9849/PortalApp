# Calendar Events Fetch Error - Troubleshooting Guide

## Common Error: "Failed to fetch calendar events"

### Step 1: Check Browser Console
Open browser DevTools (F12) and check the Console tab for detailed error messages.

### Step 2: Check Backend Logs
Check your backend server logs for detailed error information.

### Step 3: Common Causes and Solutions

#### 1. Calendar Not Connected
**Error**: `Google Calendar not connected` (400 status)

**Solution**: 
- Click "Connect Google Calendar" button
- Complete OAuth flow in popup
- Verify connection status shows "Connected"

#### 2. Token Expired / Refresh Failed
**Error**: `Calendar token expired and could not be refreshed` or `Refresh token is invalid`

**Solution**:
- Disconnect and reconnect your Google Calendar
- Go to Calendar page → Disconnect (if available) → Reconnect
- This will get a new refresh token

#### 3. Missing Refresh Token
**Error**: `Refresh token is missing`

**Solution**:
- This happens if OAuth flow didn't get a refresh token
- Reconnect calendar and ensure `prompt=consent` is used
- Check that `access_type=offline` is set in OAuth URL

#### 4. Google API Error
**Error**: `Google Calendar API error`

**Possible causes**:
- Google Calendar API not enabled in Google Cloud Console
- Invalid OAuth credentials
- Rate limit exceeded

**Solution**:
- Verify Google Calendar API is enabled
- Check OAuth credentials in `.env` file
- Wait a few minutes if rate limited

#### 5. Network Error
**Error**: `Failed to fetch` or CORS error

**Solution**:
- Check backend server is running
- Verify CORS configuration
- Check network connectivity

### Step 4: Manual Diagnosis

#### Check Database
```sql
-- Check if calendar is connected
SELECT id, email, googleCalendarConnected FROM users WHERE id = 'your-user-id';

-- Check if tokens exist
SELECT userId, accessToken IS NOT NULL as hasAccessToken, 
       refreshToken IS NOT NULL as hasRefreshToken, 
       expiryDate 
FROM google_calendar_tokens 
WHERE userId = 'your-user-id';
```

#### Test API Directly
```bash
# Check status
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/calendar/status

# Fetch events
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/calendar/events
```

### Step 5: Reset Connection

If all else fails:

1. **Disconnect Calendar**:
   - Delete token from database:
     ```sql
     DELETE FROM google_calendar_tokens WHERE userId = 'your-user-id';
     UPDATE users SET googleCalendarConnected = false WHERE id = 'your-user-id';
     ```

2. **Reconnect Calendar**:
   - Go to Calendar page
   - Click "Connect Google Calendar"
   - Complete OAuth flow

### Debug Mode

Enable detailed logging in backend:

```javascript
// In backend/src/controllers/calendar.js
logger.error('Error fetching calendar events:', {
  error: error.message,
  stack: error.stack,
  userId,
  role,
  response: error.response?.data,
});
```

### Environment Variables Check

Ensure these are set correctly in `.env`:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/calendar/callback
```

### Still Having Issues?

1. Check backend logs for full error stack trace
2. Verify Google Cloud Console settings:
   - OAuth consent screen configured
   - Google Calendar API enabled
   - Redirect URI matches exactly
3. Test with a different Google account
4. Check if tokens are being stored correctly in database
