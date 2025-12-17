# Google Calendar - Environment Variables Setup

## ⚠️ IMPORTANT: Add Credentials to Your Local .env Files

The credentials have been provided. Please add them to your **local** `.env` files (NOT committed to git).

---

## 📝 Backend `.env` File

**Location:** `backend/.env`

Add these lines to your `backend/.env` file:

```env
# Google OAuth2 Credentials for Calendar Integration
GOOGLE_CLIENT_ID=620332349787-8elql0hf7t3c0mh6kom6md1pt9prdq3q.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:5173
```

---

## 📝 Frontend `.env` File

**Location:** `frontend/.env`

Create or update `frontend/.env` file:

```env
# Google OAuth Client ID (for reference, OAuth happens through backend)
VITE_GOOGLE_CLIENT_ID=620332349787-8elql0hf7t3c0mh6kom6md1pt9prdq3q.apps.googleusercontent.com
```

**Note:** The frontend `VITE_GOOGLE_CLIENT_ID` is optional since all OAuth operations happen through the backend.

---

## ✅ Verification Steps

1. **Check that `.env` files exist:**
   ```bash
   # Backend
   ls -la backend/.env
   
   # Frontend (if needed)
   ls -la frontend/.env
   ```

2. **Verify `.env` files are in `.gitignore`:**
   ```bash
   # Both should be ignored
   cat backend/.gitignore | grep .env
   cat frontend/.gitignore | grep .env
   ```

3. **Test the setup:**
   - Start backend server: `cd backend && npm run dev`
   - Start frontend server: `cd frontend && npm run dev`
   - Navigate to: `http://localhost:5173/calendar`
   - Try connecting Google Calendar

---

## 🔐 Security Reminders

- ✅ **Never commit `.env` files to git**
- ✅ **Use `.env.example` for documentation only (without real credentials)**
- ✅ **Keep credentials private and secure**
- ✅ **Rotate credentials if exposed**

---

## 🚀 Next Steps

After adding credentials:

1. **Verify Google Cloud Console settings:**
   - Redirect URI: `http://localhost:3000/api/auth/google/callback`
   - JavaScript origins: `http://localhost:3000`, `http://localhost:5173`

2. **Run database migration:**
   ```bash
   cd backend
   npx prisma migrate dev --name add_google_calendar_token
   npx prisma generate
   ```

3. **Install dependencies (if not done):**
   ```bash
   cd backend
   npm install googleapis
   ```

4. **Start testing the integration!**

---

## 📚 Full Setup Guide

See `GOOGLE_CALENDAR_SETUP.md` for complete setup instructions.



