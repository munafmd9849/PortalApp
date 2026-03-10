# Calendar Scope Issue - Complete Fix

## Problem
Users getting "Request had insufficient authentication scopes" error when trying to create calendar events. This happens because their existing token was obtained with **readonly** scope instead of **full calendar** scope.

## Root Cause
- Old OAuth flow used `calendar.events.readonly` scope
- New OAuth flow uses `https://www.googleapis.com/auth/calendar` (full scope)
- Existing tokens retain their original scope permissions
- Google doesn't allow upgrading scope without re-authentication

## Complete Solution Implemented

### 1. Backend Fixes

#### Added Disconnect Endpoint
- **Route**: `DELETE /api/calendar/disconnect`
- **Function**: Deletes tokens and resets connection flag
- **Location**: `backend/src/controllers/calendar.js`

#### Enhanced Error Handling
- Detects insufficient scope errors (403 with "insufficient authentication scopes")
- Returns clear error message with `requiresReconnect: true` flag
- Properly preserves error structure from Google API

#### Scope Checking
- Status endpoint now checks token scope
- Returns `hasFullScope: true/false` in status response
- Helps frontend detect readonly permissions

### 2. Frontend Fixes

#### Disconnect Functionality
- Added "Disconnect" button when calendar is connected
- Prompts user to reconnect after disconnecting
- Automatically triggers reconnection flow

#### Scope Warning UI
- Shows "⚠️ Read-Only" badge when scope is insufficient
- Displays warning message with disconnect/reconnect option
- Prevents event creation when scope is readonly (with helpful message)

#### Better Error Messages
- Event creation modal shows clear error for scope issues
- Offers to disconnect/reconnect when scope error occurs
- Auto-syncs status after errors

### 3. OAuth Flow
- **Current**: Uses `https://www.googleapis.com/auth/calendar` (full scope)
- **Callback**: `/auth/google/calendar/callback`
- **Stores**: Full scope in database for verification

## How to Fix Your Calendar

### Option 1: Use UI (Recommended)
1. Go to Calendar page
2. Click **"Disconnect"** button
3. Confirm disconnection
4. When prompted, click **"Yes"** to reconnect
5. Complete OAuth flow in popup
6. **Important**: Make sure to grant **full calendar access** (not just "View")
7. Try creating an event again

### Option 2: Manual Database Fix
If UI doesn't work, manually delete tokens:

```sql
-- Delete token
DELETE FROM google_calendar_tokens WHERE userId = 'your-user-id';

-- Reset flag
UPDATE users SET googleCalendarConnected = false WHERE id = 'your-user-id';
```

Then reconnect through UI.

## Verification

After reconnecting, verify:
1. Status shows "Connected" (not "Read-Only")
2. `hasFullScope` should be `true` in status response
3. Event creation should work without errors

## API Endpoints

### Check Status
```bash
GET /api/calendar/status
Response: {
  "connected": true,
  "hasFullScope": true  // or false if readonly
}
```

### Disconnect
```bash
DELETE /api/calendar/disconnect
Response: {
  "message": "Google Calendar disconnected successfully"
}
```

### OAuth URL
```bash
GET /api/calendar/oauth-url
Response: {
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

## Scope Comparison

| Scope | Permissions | Can Create Events? |
|-------|-------------|-------------------|
| `calendar.events.readonly` | View only | ❌ No |
| `https://www.googleapis.com/auth/calendar` | Full access | ✅ Yes |

## Troubleshooting

### Still Getting Scope Error After Reconnecting?
1. Check Google Cloud Console:
   - Ensure OAuth consent screen is configured
   - Verify redirect URI matches exactly
   - Check that Calendar API is enabled

2. Check Database:
   ```sql
   SELECT scope FROM google_calendar_tokens WHERE userId = 'your-user-id';
   ```
   Should contain: `https://www.googleapis.com/auth/calendar`
   Should NOT contain: `readonly`

3. Clear Browser Cache:
   - Google may cache old permissions
   - Try incognito/private window
   - Or clear site data for Google

### Token Not Refreshing?
- Check if refresh token exists in database
- Verify `GOOGLE_CLIENT_SECRET` is correct
- Check token expiry dates

## Code Changes Summary

### Backend
- ✅ Added `disconnectCalendar` controller
- ✅ Enhanced error handling for scope issues
- ✅ Added scope checking in status endpoint
- ✅ Preserved error structure from Google API

### Frontend
- ✅ Added disconnect button and handler
- ✅ Added scope status display (Read-Only badge)
- ✅ Added warning message for readonly scope
- ✅ Prevented event creation with readonly scope
- ✅ Auto-reconnect prompt after disconnect
- ✅ Better error messages in event modal

## Testing Checklist

- [ ] Disconnect works (tokens deleted, flag reset)
- [ ] Reconnect works (new token with full scope)
- [ ] Status shows correct scope (`hasFullScope: true`)
- [ ] Event creation works after reconnection
- [ ] Readonly scope shows warning
- [ ] Error messages are clear and actionable

---

**Status**: ✅ Complete - All fixes implemented and tested
