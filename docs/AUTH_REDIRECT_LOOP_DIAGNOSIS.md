# 🔍 Authentication Redirect Loop - Root Cause Analysis

## **Problem Summary**
Infinite redirect loop: `/` → `/student` → `/` → `/student` repeatedly after login/registration.

---

## **Root Causes Identified**

### **1. ProtectedRoute Role Case Mismatch** ⚠️ CRITICAL
- **File**: `frontend/src/components/ProtectedRoute.jsx:17`
- **Issue**: Backend returns uppercase role (`'STUDENT'`), but `allowRoles` array uses lowercase (`['student']`)
- **Impact**: User gets redirected back to `/` even when authenticated
- **Code**:
  ```javascript
  if (allowRoles && Array.isArray(allowRoles) && !allowRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  ```

### **2. AuthRedirect Depends on location.pathname** ⚠️ CRITICAL
- **File**: `frontend/src/components/AuthRedirect.jsx:61`
- **Issue**: `location.pathname` is in dependency array, causing effect to re-run on every path change
- **Impact**: Every navigation triggers the redirect logic again
- **Code**:
  ```javascript
  }, [user, role, loading, location.pathname, navigate]);
  ```

### **3. LoginModal + AuthRedirect Double Navigation** ⚠️ HIGH
- **Files**: 
  - `frontend/src/components/landing/LoginModal.jsx:423, 449`
  - `frontend/src/components/AuthRedirect.jsx:39`
- **Issue**: Both components navigate after login/register, causing race conditions
- **Impact**: Conflicting navigation calls

### **4. AuthContext loadUser() Race Condition** ⚠️ MEDIUM
- **File**: `frontend/src/context/AuthContextJWT.jsx:25-51`
- **Issue**: `loadUser()` is async, but AuthRedirect checks user/role immediately
- **Impact**: Redirect might happen before user is loaded, or after navigation starts

### **5. redirectingRef Timeout Too Short** ⚠️ MEDIUM
- **File**: `frontend/src/components/AuthRedirect.jsx:41-43`
- **Issue**: 100ms timeout might not be enough for React Router navigation
- **Impact**: Flag resets before navigation completes

### **6. ProtectedRoute Role Check Not Normalized** ⚠️ HIGH
- **File**: `frontend/src/components/ProtectedRoute.jsx:17`
- **Issue**: Direct string comparison without normalization
- **Impact**: Uppercase 'STUDENT' != lowercase 'student'

---

## **Files Requiring Fixes**

1. ✅ `frontend/src/components/ProtectedRoute.jsx` - Normalize role comparison
2. ✅ `frontend/src/components/AuthRedirect.jsx` - Remove location.pathname from deps, improve logic
3. ✅ `frontend/src/components/landing/LoginModal.jsx` - Remove manual navigation, let AuthRedirect handle
4. ✅ `frontend/src/context/AuthContextJWT.jsx` - Ensure proper token storage/loading
5. ✅ `frontend/src/services/api.js` - Verify token storage/reading
6. ✅ `frontend/src/services/socket.js` - Already fixed (port 3001)

---

## **Token Storage Status**

✅ **Token Storage**: Using `localStorage` correctly
- `accessToken` stored in `localStorage.getItem('accessToken')`
- `refreshToken` stored in `localStorage.getItem('refreshToken')`
- Tokens set correctly on login/register
- Tokens cleared on logout

---

## **Backend /auth/me Status**

✅ **Backend Endpoint**: `/api/auth/me` exists and works correctly
- Uses `authenticate` middleware
- Returns user with role (uppercase)
- File: `backend/src/routes/auth.js:298-331`

---

## **Firebase Remnants**

✅ **No Active Firebase Auth**: All references are comments/documentation
- All Firebase imports removed
- No `onAuthStateChanged` listeners
- No Firebase SDK usage

---

## **Fix Strategy**

1. Fix ProtectedRoute to normalize role comparison
2. Fix AuthRedirect to prevent loops:
   - Remove `location.pathname` from dependencies
   - Use ref to track if redirect was attempted
   - Only redirect AFTER user is loaded
3. Remove manual navigation from LoginModal
4. Ensure AuthContext properly loads user before redirect
5. Add proper loading states

