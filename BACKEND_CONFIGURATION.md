# Backend Configuration Guide

## Backend URL Configuration

### Frontend Environment Variables

The frontend uses environment variables to configure the backend URL. These are configured in `frontend/.env`:

```
VITE_API_URL=https://portal-backend-orcin.vercel.app/api
VITE_SOCKET_URL=https://portal-backend-orcin.vercel.app
VITE_FRONTEND_URL=http://localhost:5173
```

### Configuration Files

1. **`frontend/src/config/api.js`** - Central API configuration
   - Reads `VITE_API_URL` from environment
   - Falls back to `http://localhost:3000/api` if not set (development only)
   - All API calls use `API_BASE_URL` from this file

2. **`frontend/src/services/api.js`** - API service layer
   - Imports `API_BASE_URL` from config
   - All HTTP requests use this base URL

3. **`frontend/src/services/socket.js`** - Socket.IO client
   - Reads `VITE_SOCKET_URL` from environment
   - Falls back to `http://localhost:3000` if not set (development only)

### For Local Development

If you want to use the Vercel backend during local development, make sure `frontend/.env` has:
```
VITE_API_URL=https://portal-backend-orcin.vercel.app/api
VITE_SOCKET_URL=https://portal-backend-orcin.vercel.app
```

If you want to use a local backend, comment out the above and uncomment:
```
# VITE_API_URL=http://localhost:3000/api
# VITE_SOCKET_URL=http://localhost:3000
```

### For Vercel Deployment

**IMPORTANT**: When deploying frontend to Vercel, you MUST set environment variables in Vercel Dashboard:

1. Go to your Vercel project → Settings → Environment Variables
2. Add these variables:
   - `VITE_API_URL` = `https://portal-backend-orcin.vercel.app/api`
   - `VITE_SOCKET_URL` = `https://portal-backend-orcin.vercel.app`
   - `VITE_FRONTEND_URL` = `https://your-frontend-domain.vercel.app`

**Note**: The `.env` file is NOT used in Vercel deployment. You must set environment variables in the Vercel dashboard.

### Backend URL: https://portal-backend-orcin.vercel.app

This is your deployed backend on Vercel. All API endpoints are under `/api`.

### Verification

To verify the backend is connected:
1. Check browser console - should see API requests going to `https://portal-backend-orcin.vercel.app/api`
2. Check Socket.IO connection - should connect to `https://portal-backend-orcin.vercel.app`
3. Test an API call - should work with the Vercel backend
