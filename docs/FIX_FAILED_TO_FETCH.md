# Fix "Failed to Fetch" Error - Action Plan

## Problem Analysis

The "Failed to Fetch" error occurs when the frontend cannot establish a connection to the backend server. This is a **network-level error**, not a validation or application error.

## Root Causes

1. **Backend Server Not Running** - Most common cause
   - Backend server on `http://localhost:3001` is not started
   - Server crashed or stopped unexpectedly

2. **CORS Configuration Issue**
   - Backend CORS not allowing requests from `http://localhost:5173`
   - CORS middleware not properly configured

3. **Network Connectivity**
   - Firewall blocking connection
   - Port 3001 is blocked or in use by another application
   - Network configuration issues

4. **Request Timeout**
   - Backend taking too long to respond (>30 seconds)
   - Server overloaded or stuck

5. **Backend Server Error**
   - Backend crashed during request processing
   - Unhandled exception causing server to stop responding

## Solutions Implemented

### 1. Enhanced Error Handling (`frontend/src/services/api.js`)
- ✅ Added try-catch around fetch to catch network errors
- ✅ Distinguishes between network errors and HTTP errors
- ✅ Provides specific error messages for different failure types
- ✅ Logs detailed error information for debugging

### 2. Improved User Feedback (`CreateJob.jsx`)
- ✅ Shows specific error messages for network errors
- ✅ Provides actionable steps to resolve the issue
- ✅ Better error messages for validation vs network errors

## Action Plan to Fix

### Step 1: Verify Backend Server is Running

**Check if backend is running:**
```bash
# In the backend directory
cd backend
npm run dev
# or
node src/server.js
```

**Expected output:**
```
🚀 Server running on http://localhost:3001
🌐 CORS origin: http://localhost:5173
✅ Database connected
```

**If server is not running:**
1. Navigate to `backend/` directory
2. Run `npm install` (if dependencies missing)
3. Run `npm run dev` or `node src/server.js`
4. Check for any error messages in the console

### Step 2: Check Backend Port

**Verify port 3001 is available:**
```bash
# On Mac/Linux
lsof -i :3001

# On Windows
netstat -ano | findstr :3001
```

**If port is in use:**
- Kill the process using port 3001
- Or change the backend port in `backend/src/server.js` and update `VITE_API_URL` in frontend

### Step 3: Test Backend Endpoint Directly

**Test if backend is accessible:**
```bash
# Test health endpoint (if exists)
curl http://localhost:3001/api/health

# Or test a simple endpoint
curl http://localhost:3001/api/auth/me
```

**If curl fails:**
- Backend is not running or not accessible
- Check backend server logs for errors

### Step 4: Check CORS Configuration

**Verify CORS in `backend/src/server.js`:**
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
```

**If CORS is the issue:**
- Ensure `CORS_ORIGIN` environment variable is set correctly
- Or update the default to match your frontend URL

### Step 5: Check Browser Console

**Open browser DevTools (F12) and check:**
1. **Console tab** - Look for error messages
2. **Network tab** - Check if request is being sent
   - Status: (failed) or (pending)
   - Error: "Failed to fetch" or "net::ERR_CONNECTION_REFUSED"

**Common Network Tab Errors:**
- `ERR_CONNECTION_REFUSED` - Backend not running
- `ERR_CONNECTION_TIMED_OUT` - Backend not responding
- `CORS error` - CORS configuration issue

### Step 6: Check Backend Logs

**Look for errors in backend console:**
- Database connection errors
- Unhandled exceptions
- Validation errors causing crashes
- Missing environment variables

### Step 7: Verify Environment Variables

**Check backend `.env` file:**
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
CORS_ORIGIN="http://localhost:5173"
PORT=3001
```

**Check frontend `.env` file:**
```env
VITE_API_URL="http://localhost:3001/api"
```

## Quick Fix Checklist

- [ ] Backend server is running on port 3001
- [ ] Backend shows "Server running" message
- [ ] No errors in backend console
- [ ] Port 3001 is not blocked by firewall
- [ ] CORS is configured correctly
- [ ] Frontend `.env` has correct `VITE_API_URL`
- [ ] Browser console shows no CORS errors
- [ ] Network tab shows request is being sent

## Testing After Fix

1. **Start backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend server:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test job submission:**
   - Fill out the job form
   - Click "Submit for Review"
   - Should see success message or specific error (not "Failed to Fetch")

## Enhanced Error Messages

After the fix, you'll see more specific error messages:

- **Network Error:** "Failed to connect to server. Cannot reach the server..."
- **Validation Error:** "Validation failed: • Field 1 • Field 2"
- **Server Error:** "Server error (500): Internal server error"

## Common Issues and Solutions

### Issue: Backend starts but immediately crashes
**Solution:** Check backend logs for:
- Database connection errors
- Missing environment variables
- Syntax errors in code

### Issue: Backend running but requests timeout
**Solution:** 
- Check if backend is processing requests (look at logs)
- Increase timeout in `api.js` (currently 30 seconds)
- Check for infinite loops or blocking operations

### Issue: CORS errors in browser console
**Solution:**
- Verify `CORS_ORIGIN` in backend matches frontend URL
- Check backend CORS middleware is properly configured
- Ensure credentials are allowed if using cookies

### Issue: Port already in use
**Solution:**
```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change backend port
# Update PORT in backend/.env
# Update VITE_API_URL in frontend/.env
```

## Next Steps

1. **Immediate:** Start the backend server
2. **Verify:** Check backend is accessible via curl or browser
3. **Test:** Try submitting the job form again
4. **Debug:** If still failing, check browser console and backend logs

## Support

If the issue persists after following these steps:
1. Check backend server logs for specific errors
2. Check browser console for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed (`npm install` in both frontend and backend)

