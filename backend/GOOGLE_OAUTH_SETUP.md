# Google OAuth Setup Guide - Fix "Access Blocked" Error

## Problem
When trying to connect Google Calendar, you see:
```
Access blocked: Assignment Tracker has not completed the Google verification process
Error 403: access_denied
```

This happens because the Google OAuth app is in **"Testing"** mode and only approved test users can access it.

## Solution Options

### Option 1: Add Test Users (Quick Fix - Recommended for Development)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (the one with your OAuth credentials)

2. **Navigate to OAuth Consent Screen**
   - Go to: **APIs & Services** → **OAuth consent screen**
   - Or direct link: https://console.cloud.google.com/apis/credentials/consent

3. **Add Test Users**
   - Scroll down to **"Test users"** section
   - Click **"+ ADD USERS"**
   - Add the email addresses that need access:
     - `charansai07136@gmail.com`
     - Any other student/admin/recruiter emails that will use the calendar
   - Click **"ADD"**

4. **Save Changes**
   - The changes take effect immediately
   - Users can now connect their Google Calendar

### Option 2: Change to Internal (Google Workspace Only)

If you're using Google Workspace (not personal Gmail):

1. **Go to OAuth Consent Screen**
   - https://console.cloud.google.com/apis/credentials/consent

2. **Change User Type**
   - Change from **"External"** to **"Internal"**
   - This allows all users in your Google Workspace to access the app
   - **Note:** This only works if all users are in the same Google Workspace domain

### Option 3: Publish the App (For Production)

**⚠️ Warning:** Publishing requires Google verification, which can take weeks.

1. **Go to OAuth Consent Screen**
   - https://console.cloud.google.com/apis/credentials/consent

2. **Complete Required Fields**
   - App name: "PWIOI Placement Portal" (or your app name)
   - User support email: Your email
   - Developer contact information: Your email
   - App domain (if applicable)
   - Privacy policy URL (required for production)
   - Terms of service URL (required for production)

3. **Add Scopes**
   - Ensure these scopes are added:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`

4. **Submit for Verification**
   - Click **"PUBLISH APP"**
   - Google will review your app (can take 1-4 weeks)
   - Once approved, all users can access it

## Quick Fix Steps (Recommended)

**For immediate access, use Option 1:**

1. Open: https://console.cloud.google.com/apis/credentials/consent
2. Scroll to **"Test users"**
3. Click **"+ ADD USERS"**
4. Add: `charansai07136@gmail.com`
5. Click **"ADD"**
6. Try connecting Google Calendar again

## Verify Your OAuth Credentials

Make sure these are set in your `.env` file:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

## Find Your OAuth Credentials

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your **OAuth 2.0 Client ID**
3. Copy the **Client ID** and **Client Secret**

## Common Issues

### Issue: "Redirect URI mismatch"
- **Fix:** Ensure `GOOGLE_REDIRECT_URI` in `.env` matches the **Authorized redirect URIs** in Google Cloud Console
- Go to: https://console.cloud.google.com/apis/credentials
- Click on your OAuth 2.0 Client ID
- Add your redirect URI to **Authorized redirect URIs**

### Issue: "Invalid client"
- **Fix:** Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct in `.env`
- Make sure there are no extra spaces or quotes

### Issue: "Access denied" even after adding test user
- **Fix:** 
  - Wait 1-2 minutes for changes to propagate
  - Clear browser cache and cookies
  - Try in incognito/private mode
  - Make sure you're using the exact email address that was added

## Testing

After adding test users:

1. **Restart your backend server** (if running)
2. **Try connecting Google Calendar again**
3. **Check backend logs** for any OAuth errors

## Production Deployment

For production, you'll need to:

1. **Publish the app** (Option 3 above)
2. **Add production redirect URIs**:
   - `https://yourdomain.com/auth/google/callback`
   - Update `GOOGLE_REDIRECT_URI` in production `.env`
3. **Complete Google verification** (can take weeks)

## Support

If issues persist:
1. Check Google Cloud Console for error details
2. Review backend logs for OAuth errors
3. Verify all environment variables are set correctly


