# Fix OAuth Redirect URI Mismatch Error

## Error Message
```
Error 400: redirect_uri_mismatch
```

This error occurs when the redirect URI in your OAuth request doesn't match what's configured in Google Cloud Console.

## Solution

### Step 1: Find Your Redirect URI

The redirect URI is configured in your `.env` file or defaults to:
- **Default:** `http://localhost:3000/auth/google/callback`
- **Environment Variable:** `GOOGLE_REDIRECT_URI` (if set)

Check your `backend/.env` file:
```bash
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### Step 2: Add Redirect URI to Google Cloud Console

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials

2. **Find Your OAuth 2.0 Client:**
   - Look for "OAuth 2.0 Client IDs" section
   - Find the client ID that matches `GOOGLE_CLIENT_ID` in your `.env` file
   - Click on it to edit

3. **Add Authorized Redirect URIs:**
   - Scroll to "Authorized redirect URIs" section
   - Click "+ ADD URI"
   - Add these URIs (one per line):
     ```
     http://localhost:3000/auth/google/callback
     http://localhost:3000/auth/google/calendar/callback
     ```
   
   **For Production:**
   ```
   https://yourdomain.com/auth/google/callback
   https://yourdomain.com/auth/google/calendar/callback
   ```

4. **Save Changes:**
   - Click "SAVE" at the bottom
   - Wait 1-2 minutes for changes to propagate

### Step 3: Verify Your Configuration

Check your `backend/.env` file has:
```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### Step 4: Restart Your Server

After updating Google Cloud Console:
```bash
# Stop your server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

### Step 5: Test Again

Try connecting Google Calendar again. The redirect URI should now match.

## Common Issues

### Issue: Still getting redirect_uri_mismatch
**Solution:**
- Make sure you added the EXACT redirect URI (including `http://` or `https://`)
- Check for trailing slashes - they must match exactly
- Wait 1-2 minutes after saving in Google Cloud Console
- Clear browser cache and try again

### Issue: Multiple redirect URIs needed
**Solution:**
- Add ALL redirect URIs you might use:
  - `http://localhost:3000/auth/google/callback`
  - `http://localhost:3000/auth/google/calendar/callback`
  - Production URLs (when deployed)

### Issue: Can't find OAuth Client in Console
**Solution:**
- Make sure you're in the correct Google Cloud project
- Check that `GOOGLE_CLIENT_ID` in `.env` matches the client ID in Console
- You may need to create a new OAuth 2.0 Client ID if one doesn't exist

## Quick Checklist

- [ ] Redirect URI added to Google Cloud Console
- [ ] Exact match (including protocol and port)
- [ ] Saved changes in Console
- [ ] Waited 1-2 minutes
- [ ] Restarted server
- [ ] Cleared browser cache (if needed)

## Still Having Issues?

1. **Check server logs** for the exact redirect URI being used
2. **Verify `.env` file** has correct `GOOGLE_REDIRECT_URI`
3. **Check Google Cloud Console** shows the URI in "Authorized redirect URIs"
4. **Try incognito/private browsing** to rule out cache issues

