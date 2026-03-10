# Google Calendar Environment Variables

## Required Environment Variables

Add these to your `.env` file in the `backend` directory:

```env
# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

## For Production

Update `GOOGLE_REDIRECT_URI` to your production URL:

```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
```

## How to Get These Values

### Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External (or Internal if using Google Workspace)
   - App name: Your app name
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `https://www.googleapis.com/auth/calendar`
   - Save and continue

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "Portal Calendar Integration" (or any name)
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (for development)
     - `https://yourdomain.com/auth/google/callback` (for production)
   - Click "Create"

5. Copy the credentials:
   - **Client ID** → `GOOGLE_CLIENT_ID`
   - **Client secret** → `GOOGLE_CLIENT_SECRET`

### Step 3: Add to .env File

Create or update `backend/.env`:

```env
# Database (existing)
DATABASE_URL=postgresql://<user>:<password>@<neon-host>/<db>?sslmode=require

# Google Calendar OAuth
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Other existing variables...
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
# ... etc
```

## Important Notes

### Redirect URI
- **Must match exactly** in Google Cloud Console and `.env` file
- Both `/auth/google/callback` and `/auth/google/calendar/callback` are supported
- For development: `http://localhost:3000/auth/google/callback`
- For production: `https://yourdomain.com/auth/google/callback`

### OAuth Consent Screen
- Must be configured before creating OAuth credentials
- Must include `https://www.googleapis.com/auth/calendar` scope
- Users will see this screen when connecting their calendar

### Security
- **Never commit** `.env` file to git
- Keep `GOOGLE_CLIENT_SECRET` secure
- Use different credentials for development and production
- Rotate secrets if compromised

## Verification

After adding the variables, verify:

1. **Backend starts without errors**
2. **OAuth URL generation works**: `GET /api/calendar/oauth-url`
3. **Check logs**: Should not see "GOOGLE_CLIENT_ID is not defined"

## Troubleshooting

### "Invalid client" error
- Check `GOOGLE_CLIENT_ID` is correct
- Verify OAuth credentials are created (not API key)

### "Redirect URI mismatch" error
- Ensure redirect URI in `.env` matches Google Cloud Console exactly
- Check for trailing slashes or protocol differences (http vs https)

### "Access blocked" error
- Verify OAuth consent screen is published (for external users)
- Check that Calendar API is enabled

## Example .env File

```env
# Database
DATABASE_URL=postgresql://<user>:<password>@<neon-host>/<db>?sslmode=require

# JWT (existing)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Google Calendar OAuth
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz123456789
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Email (if using)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

---

**Share this document with your team** so they can set up their local development environment.

