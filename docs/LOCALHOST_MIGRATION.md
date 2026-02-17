# Migration from Deployed Backend to Localhost

## ✅ Migration Complete

All references to the deployed backend (`https://portal-backend-orcin.vercel.app`) have been updated to use localhost (`http://localhost:3000`).

## Files Updated

### Frontend Configuration
1. **`frontend/src/config/api.js`**
   - Updated error messages to reference `http://localhost:3000/api`
   - Updated Socket.IO URL references to `http://localhost:3000`

2. **`frontend/env.txt`**
   - Changed `VITE_API_URL` to `http://localhost:3000/api`
   - Changed `VITE_SOCKET_URL` to `http://localhost:3000`
   - Added commented production URLs for reference

### Scripts
3. **`scripts/updateJobDates.js`**
   - Default API URL changed to `http://localhost:3000/api`

4. **`scripts/updateJobDatesSimple.js`**
   - API URL changed to `http://localhost:3000/api`

5. **`scripts/updateJobDatesBrowser.js`**
   - Default fallback URL changed to `http://localhost:3000/api`

### Documentation
6. **`BACKEND_CONFIGURATION.md`**
   - Updated all examples to use `http://localhost:3000`
   - Updated verification instructions

7. **`frontend/INTEGRATION_AUDIT.md`**
   - Updated backend URL references
   - Changed status from "Production Ready" to "Local Development Ready"

8. **`backend/JOB_DATE_UPDATE_VALIDATION.md`**
   - Updated curl example to use `http://localhost:3000/api`

## Environment Variables

### Required for Frontend
Create or update `frontend/.env`:
```bash
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_FRONTEND_URL=http://localhost:5173
```

## Running the Application

### 1. Start Backend
```bash
cd backend
npm install
npm run dev
```
Backend will run on `http://localhost:3000`

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend will run on `http://localhost:5173` and connect to backend at `http://localhost:3000`

## Verification

1. **Check Backend is Running:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Check Frontend Console:**
   - Open browser DevTools
   - Check Network tab - API calls should go to `http://localhost:3000/api`
   - Check Console - Socket.IO should connect to `http://localhost:3000`

3. **Test API Connection:**
   - Login to the application
   - Verify API calls work correctly
   - Check that data loads from localhost backend

## Reverting to Deployed Backend

If you need to switch back to the deployed backend:

1. Update `frontend/.env`:
   ```bash
   VITE_API_URL=https://portal-backend-orcin.vercel.app/api
   VITE_SOCKET_URL=https://portal-backend-orcin.vercel.app
   ```

2. Restart the frontend dev server

## Notes

- Build files (`frontend/dist/`) may still contain old URLs - rebuild if needed
- The backend server must be running on port 3000 before starting the frontend
- CORS is configured to allow localhost connections in development mode
