# Quick Fix: Calendar Permission Error

## The Problem
You're seeing: **"Insufficient calendar permissions"** or **"Request had insufficient authentication scopes"**

This means your Google Calendar token has **read-only** permissions instead of **full** permissions.

## The Solution (3 Steps)

### Step 1: Disconnect
1. Go to **Calendar** page
2. Look for the **"Disconnect"** button (red button, top right)
3. Click it and confirm

### Step 2: Reconnect  
1. After disconnecting, you'll be prompted to reconnect
2. Click **"Yes"** when asked
3. A popup will open for Google authorization

### Step 3: Grant Full Access
**IMPORTANT**: When authorizing in the popup:
- ✅ Make sure to grant **"See, edit, share, and permanently delete all the calendars you can access using Google Calendar"**
- ❌ Do NOT just grant "View your calendars" (read-only)

## Visual Indicators

### Before Fix (Read-Only)
- Badge shows: **"⚠️ Read-Only"** (yellow)
- Warning message appears in header
- Event creation fails with permission error

### After Fix (Full Access)
- Badge shows: **"Connected"** (green)
- No warning messages
- Event creation works ✅

## Still Having Issues?

### Check Status
Click **"Check Status"** button - it should show:
```json
{
  "connected": true,
  "hasFullScope": true  // Must be true!
}
```

### Manual Database Fix
If UI doesn't work:

```sql
-- Delete readonly token
DELETE FROM google_calendar_tokens WHERE userId = 'your-user-id';

-- Reset flag
UPDATE users SET googleCalendarConnected = false WHERE id = 'your-user-id';
```

Then reconnect through UI.

## Why This Happened
- Your calendar was connected using an old OAuth flow that requested readonly scope
- Google doesn't allow upgrading scope - you must re-authenticate
- The new OAuth flow requests full scope, but existing tokens keep old permissions

## Prevention
- Always use the **"Connect Google Calendar"** button from the Calendar page
- Never use old/legacy OAuth endpoints
- Verify scope after connecting (check status endpoint)

---

**Need Help?** Check the browser console for detailed error messages.
