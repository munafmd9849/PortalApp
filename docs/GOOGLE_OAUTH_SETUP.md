# Google OAuth Redirect URI Setup Guide

## Error: redirect_uri_mismatch

This error occurs when the redirect URI in your OAuth request doesn't match what's configured in Google Cloud Console.

## Current Configuration

Your backend is using:
- **Default:** `http://localhost:3000/auth/google/callback`
- **From .env:** `GOOGLE_REDIRECT_URI` (if set)

## How to Fix

### Step 1: Check Your Current Redirect URI

The redirect URI is defined in:
- `backend/src/utils/googleCalendar.js` (line 16)
- Environment variable: `GOOGLE_REDIRECT_URI`

### Step 2: Add Redirect URI to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your **OAuth 2.0 Client ID**
5. Under **Authorized redirect URIs**, add:
   - For local development: `http://localhost:3000/auth/google/callback`
   - For production: `https://yourdomain.com/auth/google/callback`

### Step 3: Update Environment Variable (Optional)

If you want to use a different redirect URI, set it in `backend/.env`:

```env
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### Step 4: Restart Backend Server

After updating Google Cloud Console:
```bash
cd backend
npm run dev
```

## Important Notes

1. **Exact Match Required**: The redirect URI must match EXACTLY (including http/https, port, path)
2. **No Trailing Slash**: Don't add trailing slashes
3. **Multiple URIs**: You can add multiple redirect URIs (one per line)
4. **Save Changes**: Make sure to click "Save" in Google Cloud Console

## Common Redirect URIs

- **Local Development**: `http://localhost:3000/auth/google/callback`
- **Production**: `https://yourdomain.com/auth/google/callback`
- **Custom Port**: `http://localhost:5173/auth/google/callback` (if using different port)

## Verify

After adding the redirect URI:
1. Wait 1-2 minutes for changes to propagate
2. Try the OAuth flow again
3. The error should be resolved



