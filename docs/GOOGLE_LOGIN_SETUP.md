# Continue with Google – Setup Guide

This app uses **Google OAuth 2.0** for "Continue with Google" login. The flow uses a **popup**: your backend gives an auth URL, the user signs in with Google in the popup, Google redirects to your **backend** callback, and the backend then redirects to your **frontend** with JWT tokens.

---

## Why it might not be working

1. **Missing or wrong env vars** – Backend needs Google OAuth credentials and a **separate** redirect URI for **login** (not the calendar one).
2. **Redirect URI mismatch** – The redirect URI in Google Cloud Console must match **exactly** what the backend uses (including path and no trailing slash unless you use it).
3. **Popup blocked** – Browsers can block the login popup; the user must allow popups for your site.
4. **Wrong backend URL** – Frontend must call the correct backend (e.g. `VITE_API_BASE_URL`) to get the Google login URL.

---

## What you need to do

### 1. Google Cloud Console (OAuth credentials for login)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → your project (or create one).
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized JavaScript origins** (where the login popup is opened from):
   - Development: `http://localhost:5173` (or your frontend origin)
   - Production: `https://yourdomain.com`
5. **Authorized redirect URIs** (where Google sends the user after sign-in – this is your **backend**):
   - Development: `http://localhost:3000/api/auth/google-login/callback`  
     (replace `3000` with your backend port if different)
   - Production: `https://your-api-domain.com/api/auth/google-login/callback`
6. Copy the **Client ID** and **Client Secret**.

---

### 2. Backend `.env` (in `backend/`)

Add or set these. Do **not** reuse the calendar redirect URI for login.

```env
# Google OAuth for LOGIN (Continue with Google)
GOOGLE_CLIENT_ID=your_client_id_from_google_cloud.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Redirect URI for LOGIN only (Google redirects here after user signs in)
# Must match EXACTLY what you added in Google Cloud Console → Authorized redirect URIs
GOOGLE_AUTH_REDIRECT_URI=http://localhost:3000/api/auth/google-login/callback

# Frontend URL (backend redirects here with tokens after successful login)
FRONTEND_URL=http://localhost:5173
```

Notes:

- Use **`GOOGLE_AUTH_REDIRECT_URI`** for login. If you only set `GOOGLE_REDIRECT_URI` for the calendar, login will try to use that and fail.
- For production, set:
  - `GOOGLE_AUTH_REDIRECT_URI=https://your-api-domain.com/api/auth/google-login/callback`
  - `FRONTEND_URL=https://yourdomain.com`
- Backend port: if your API runs on another port (e.g. 5000), use that in `GOOGLE_AUTH_REDIRECT_URI`.

---

### 3. Frontend `.env`

Ensure the frontend can reach the backend:

```env
VITE_API_BASE_URL=http://localhost:3000/api
# or VITE_API_URL=http://localhost:3000/api
```

Use the same port as in `GOOGLE_AUTH_REDIRECT_URI`.

---

### 4. Restart and test

1. Restart backend after changing `.env`.
2. Open your app (e.g. `http://localhost:5173`), open Login modal, click **Continue with Google**.
3. Allow popups if the browser blocks the window.
4. If it fails, check:
   - Backend logs (e.g. “Use this EXACT URL in Google Cloud Console…” for the redirect URI).
   - Browser console (CORS, network errors, “Failed to get Google login URL”).
   - Google Cloud Console: redirect URI and JavaScript origins match your URLs.

---

## Flow summary

1. User clicks **Continue with Google** → frontend calls `GET /api/auth/google-login/url?role=STUDENT`.
2. Backend returns `authUrl` (Google OAuth URL with your `GOOGLE_AUTH_REDIRECT_URI`).
3. Frontend opens `authUrl` in a popup.
4. User signs in with Google → Google redirects to `GOOGLE_AUTH_REDIRECT_URI` (your backend) with `?code=...&state=...`.
5. Backend exchanges `code` for tokens, finds/creates user, issues JWT, then redirects to `FRONTEND_URL/auth/google-callback?accessToken=...&refreshToken=...`.
6. Frontend callback page (in the popup) reads tokens and sends them to the opener; popup closes and the main app is logged in.

---

## Domain rules (backend logic)

- **Student**: email must end with `@pwioi.com` for new sign-ups.
- **Admin**: email must end with `@pwioi.live` for new sign-ups.
- **Recruiter**: no domain restriction.

If the domain doesn’t match, the user is redirected back with an error (e.g. “Student sign-up requires a @pwioi.com email address”).
