# 🔗 Frontend-Backend Connection Analysis

**Complete analysis of API endpoints, Socket.IO connections, and integration points between React frontend and Express backend.**

---

## 📋 Executive Summary

### ✅ What Works
- Core authentication flow (login, register, refresh) is properly defined
- Socket.IO structure is correctly set up
- Most API endpoints match between frontend and backend
- JWT authentication middleware is properly configured

### ⚠️ Issues Found
1. **API Parameter Mismatches**: 2 critical issues
2. **File Upload Field Name**: Mismatch between frontend and backend
3. **Environment Variables**: Need verification and setup
4. **AuthContext Usage**: May still be using old Firebase AuthContext
5. **Missing Endpoints**: Some frontend calls may not have backend routes

---

## 🔍 Detailed Analysis

### 1. Authentication Endpoints

#### Frontend Calls (`frontend/src/services/api.js`)

| Endpoint | Method | Frontend Call | Status |
|----------|--------|---------------|--------|
| `/auth/register` | POST | `api.register(data)` | ✅ Matches |
| `/auth/login` | POST | `api.login({ email, password, selectedRole })` | ⚠️ **ISSUE** |
| `/auth/logout` | POST | `api.logout()` | ✅ Matches |
| `/auth/refresh` | POST | `api.refreshAccessToken()` | ✅ Matches |
| `/auth/me` | GET | `api.getCurrentUser()` | ✅ Matches |
| `/auth/reset-password` | POST | `api.resetPassword(email)` | ✅ Matches |

#### Backend Routes (`backend/src/routes/auth.js`)

| Endpoint | Method | Backend Route | Expected Body |
|----------|--------|---------------|---------------|
| `/api/auth/register` | POST | ✅ Exists | `{ email, password, role, profile }` |
| `/api/auth/login` | POST | ✅ Exists | `{ email, password, role }` ← **MISMATCH** |
| `/api/auth/logout` | POST | ✅ Exists | `{ refreshToken }` |
| `/api/auth/refresh` | POST | ✅ Exists | `{ refreshToken }` |
| `/api/auth/me` | GET | ✅ Exists | (Auth header) |
| `/api/auth/reset-password` | POST | ✅ Exists | `{ email }` |

#### 🔴 **ISSUE #1: Login Parameter Mismatch**

**Frontend sends:**
```javascript
api.login({ email, password, selectedRole })
```

**Backend expects:**
```javascript
{ email, password, role }  // Not 'selectedRole'
```

**Fix Required:**
- Option A: Change frontend to send `role` instead of `selectedRole`
- Option B: Change backend to accept `selectedRole` (already checks for `selectedRole` in code, but validation expects `role`)

**Backend code (line 148):**
```javascript
const { email, password, selectedRole } = req.body;  // Already extracts selectedRole
// But validation expects 'role'
```

**Recommendation:** Backend already handles `selectedRole`, but validation needs update.

---

### 2. Student Endpoints

#### Frontend Calls

| Endpoint | Method | Frontend Call | Status |
|----------|--------|---------------|--------|
| `/students/profile` | GET | `api.getStudentProfile()` | ✅ Matches |
| `/students/profile` | PUT | `api.updateStudentProfile(data)` | ✅ Matches |
| `/students/skills` | GET | `api.getStudentSkills()` | ✅ Matches |
| `/students/skills` | POST | `api.addOrUpdateSkill(skill)` | ✅ Matches |
| `/students/skills/:skillId` | DELETE | `api.deleteSkill(skillId)` | ✅ Matches |
| `/students/resume` | POST | `api.uploadResume(file, onProgress)` | ⚠️ **ISSUE** |

#### Backend Routes

| Endpoint | Method | Backend Route | Expected |
|----------|--------|---------------|----------|
| `/api/students/profile` | GET | ✅ Exists | (Auth required) |
| `/api/students/profile` | PUT | ✅ Exists | `{ ...profileData }` |
| `/api/students/skills` | GET | ✅ Exists | (Auth required) |
| `/api/students/skills` | POST | ✅ Exists | `{ ...skillData }` |
| `/api/students/skills/:skillId` | DELETE | ✅ Exists | (Auth required) |
| `/api/students/resume` | POST | ✅ Exists | `multer.single('resume')` ← **MISMATCH** |

#### 🔴 **ISSUE #2: Resume Upload Field Name**

**Frontend uploads:**
```javascript
formData.append('file', file);  // Field name: 'file'
```

**Backend expects:**
```javascript
multer.single('resume')  // Field name: 'resume'
```

**Fix Required:** Change frontend `uploadFile` function to use field name `'resume'` instead of `'file'`.

---

### 3. Job Endpoints

#### Frontend Calls

| Endpoint | Method | Frontend Call | Status |
|----------|--------|---------------|--------|
| `/jobs/targeted` | GET | `api.getTargetedJobs()` | ✅ Matches |
| `/jobs` | GET | `api.getJobs(params)` | ✅ Matches |
| `/jobs/:jobId` | GET | `api.getJob(jobId)` | ✅ Matches |
| `/jobs` | POST | `api.createJob(data)` | ✅ Matches |
| `/jobs/:jobId` | PUT | `api.updateJob(jobId, data)` | ✅ Matches |
| `/jobs/:jobId/post` | POST | `api.postJob(jobId, targeting)` | ✅ Matches |

#### Backend Routes

| Endpoint | Method | Backend Route | Auth Required |
|----------|--------|---------------|---------------|
| `/api/jobs/targeted` | GET | ✅ Exists | Student role |
| `/api/jobs` | GET | ✅ Exists | Authenticated |
| `/api/jobs/:jobId` | GET | ✅ Exists | Authenticated |
| `/api/jobs` | POST | ✅ Exists | Recruiter/Admin |
| `/api/jobs/:jobId` | PUT | ✅ Exists | Recruiter/Admin |
| `/api/jobs/:jobId/post` | POST | ✅ Exists | Admin only |

**✅ All Job Endpoints Match!**

---

### 4. Application Endpoints

#### Frontend Calls

| Endpoint | Method | Frontend Call | Status |
|----------|--------|---------------|--------|
| `/applications` | GET | `api.getStudentApplications()` | ✅ Matches |
| `/applications/jobs/:jobId` | POST | `api.applyToJob(jobId)` | ✅ Matches |
| `/applications/:applicationId/status` | PATCH | `api.updateApplicationStatus(id, status, date)` | ✅ Matches |

#### Backend Routes

| Endpoint | Method | Backend Route | Auth Required |
|----------|--------|---------------|---------------|
| `/api/applications` | GET | ✅ Exists | Student role |
| `/api/applications/jobs/:jobId` | POST | ✅ Exists | Student role |
| `/api/applications/:applicationId/status` | PATCH | ✅ Exists | Admin/Recruiter |

**✅ All Application Endpoints Match!**

---

### 5. Notification Endpoints

#### Frontend Calls

| Endpoint | Method | Frontend Call | Status |
|----------|--------|---------------|--------|
| `/notifications` | GET | `api.getNotifications(params)` | ✅ Matches |
| `/notifications/:notificationId/read` | PATCH | `api.markNotificationRead(id)` | ✅ Matches |

#### Backend Routes

| Endpoint | Method | Backend Route | Auth Required |
|----------|--------|---------------|---------------|
| `/api/notifications` | GET | ✅ Exists | Authenticated |
| `/api/notifications/:notificationId/read` | PATCH | ✅ Exists | Authenticated |

**✅ All Notification Endpoints Match!**

---

### 6. Socket.IO Connection

#### Frontend (`frontend/src/services/socket.js`)

**Connection:**
```javascript
socket = io(SOCKET_URL, {
  auth: { token },  // ✅ Correct
  transports: ['websocket', 'polling'],
});
```

**Subscriptions:**
```javascript
socket.emit('subscribe:jobs');           // ✅ Handled
socket.emit('subscribe:applications');   // ✅ Handled
socket.emit('subscribe:notifications');  // ✅ Handled
```

**Event Listeners:**
```javascript
socket.on('application:created', ...)    // ✅ Should emit from backend
socket.on('application:updated', ...)    // ✅ Should emit from backend
socket.on('notification:new', ...)       // ✅ Should emit from backend
socket.on('job:posted', ...)             // ✅ Should emit from backend
socket.on('job:updated', ...)            // ✅ Should emit from backend
```

#### Backend (`backend/src/config/socket.js`)

**Authentication:**
```javascript
const token = socket.handshake.auth.token || 
              socket.handshake.headers.authorization?.split(' ')[1];  // ✅ Good fallback
```

**Room Joining:**
```javascript
socket.join(`user:${userId}`);           // ✅ User-specific room
socket.join(`${role}:${userId}`);        // ✅ Role-specific room
socket.join('students');                 // ✅ Role-based broadcast
```

**Event Handlers:**
```javascript
socket.on('subscribe:jobs', () => {...});           // ✅ Handles
socket.on('subscribe:applications', () => {...});   // ✅ Handles
socket.on('subscribe:notifications', () => {...});  // ✅ Handles
```

#### ✅ Socket.IO Connection is Correct!

**Verification:** Ensure backend controllers emit Socket.IO events (check controllers).

---

## 🔧 Required Fixes

### Fix #1: Login Parameter Name

**File:** `backend/src/routes/auth.js`

**Current (line 140):**
```javascript
body('role').optional().isIn(['STUDENT', 'RECRUITER', 'ADMIN']),
```

**Change to:**
```javascript
body('selectedRole').optional().isIn(['STUDENT', 'RECRUITER', 'ADMIN']),
body('role').optional().isIn(['STUDENT', 'RECRUITER', 'ADMIN']), // Keep for backward compat
```

**OR**

**File:** `frontend/src/services/api.js` (line 156)

**Change:**
```javascript
login: (data) => {
  // If data has selectedRole, rename it to role
  const body = { ...data };
  if (body.selectedRole) {
    body.role = body.selectedRole;
    delete body.selectedRole;
  }
  const response = apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then(...);
  return response;
},
```

**Recommendation:** Fix backend validation to accept both `role` and `selectedRole`.

---

### Fix #2: Resume Upload Field Name

**File:** `frontend/src/services/api.js` (line 115-144)

**Current:**
```javascript
async function uploadFile(endpoint, file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);  // ❌ Wrong field name
  ...
}
```

**Change to:**
```javascript
async function uploadFile(endpoint, file, onProgress) {
  const formData = new FormData();
  
  // Determine field name based on endpoint
  const fieldName = endpoint.includes('/resume') ? 'resume' : 'file';
  formData.append(fieldName, file);  // ✅ Correct field name
  
  ...
}
```

**OR** Better yet, pass field name as parameter:
```javascript
async function uploadFile(endpoint, file, fieldName = 'file', onProgress) {
  const formData = new FormData();
  formData.append(fieldName, file);
  ...
}

// In api object:
uploadResume: (file, onProgress) => uploadFile('/students/resume', file, 'resume', onProgress),
```

---

## ⚙️ Environment Variables

### Frontend Environment Variables

**File:** `frontend/.env`

**Required:**
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

**Check:** Verify these are set correctly.

---

### Backend Environment Variables

**File:** `backend/.env`

**Required:**
```env
# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/portal"
# DATABASE_URL must be a PostgreSQL (Neon) connection string (sslmode=require)

# JWT Authentication (CRITICAL - Keep Secure)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-token-secret-min-32-chars"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""  # Optional

# AWS S3 (File Storage)
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="your-bucket-name"

# Email Service (Nodemailer)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE="false"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
EMAIL_FROM="PWIOI Portal <noreply@pwioi.com>"
```

**⚠️ CRITICAL:** Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are strong and unique!

---

## 🔐 CORS Configuration

### Backend (`backend/src/server.js`)

**Current:**
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
```

**✅ Correct!** Make sure `CORS_ORIGIN` matches your frontend URL.

---

## 📱 Frontend Integration Points

### AuthContext Usage

**Check:** `frontend/src/App.jsx` or main entry point

**Should use:**
```javascript
import { AuthProvider } from './context/AuthContextJWT';  // ✅ New JWT version
```

**NOT:**
```javascript
import { AuthProvider } from './context/AuthContext';  // ❌ Old Firebase version
```

**Action Required:** Verify `App.jsx` is using `AuthContextJWT.jsx`.

---

### Socket.IO Initialization

**File:** `frontend/src/context/AuthContextJWT.jsx`

**Current:**
```javascript
// Initialize Socket.IO
initSocket();  // ✅ Called after login
```

**✅ Correct!** Socket.IO is initialized after successful authentication.

---

## 🔍 Missing Connections

### 1. RefreshToken Model

**Check:** `backend/prisma/schema.prisma`

**Required:**
```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}
```

**Verification:** Confirm this model exists in schema.

---

### 2. Backend Controllers Emit Socket.IO Events

**Check:** `backend/src/controllers/applications.js`, `notifications.js`, etc.

**Required:** Controllers should emit Socket.IO events:
```javascript
import { getIO } from '../config/socket.js';

// In applyToJob:
const io = getIO();
if (io) {
  io.to(`user:${userId}`).emit('application:created', application);
}

// In updateApplicationStatus:
io.to(`user:${application.student.user.id}`).emit('application:updated', updated);
```

**Action Required:** Verify controllers emit Socket.IO events.

---

## 📊 Endpoint Summary

### ✅ Fully Connected Endpoints (28)

| Category | Endpoints | Status |
|----------|-----------|--------|
| Authentication | 6 | ✅ All match |
| Students | 6 | ⚠️ 1 issue (resume upload) |
| Jobs | 6 | ✅ All match |
| Applications | 3 | ✅ All match |
| Notifications | 2 | ✅ All match |

### ⚠️ Issues Summary

1. **Login parameter:** `selectedRole` vs `role` (backend validation)
2. **Resume upload:** Field name `file` vs `resume` (frontend)
3. **AuthContext:** Verify `App.jsx` uses `AuthContextJWT`
4. **Socket.IO events:** Verify controllers emit events
5. **Environment variables:** Setup required

---

## ✅ Action Checklist

### Immediate Fixes

- [ ] **Fix #1:** Update backend login route validation to accept `selectedRole`
- [ ] **Fix #2:** Update frontend `uploadFile` to use `resume` field name
- [ ] **Verify:** `App.jsx` uses `AuthContextJWT` not `AuthContext`
- [ ] **Setup:** Frontend `.env` with `VITE_API_URL` and `VITE_SOCKET_URL`
- [ ] **Setup:** Backend `.env` with all required variables

### Verification

- [ ] **Check:** RefreshToken model exists in Prisma schema
- [ ] **Verify:** Controllers emit Socket.IO events
- [ ] **Test:** Login flow with JWT tokens
- [ ] **Test:** Refresh token flow
- [ ] **Test:** Socket.IO connection after login
- [ ] **Test:** File upload (resume)
- [ ] **Test:** Real-time updates (applications, notifications)

### Integration Testing

- [ ] **Test:** Full auth flow (register → login → refresh → logout)
- [ ] **Test:** Student profile management
- [ ] **Test:** Job browsing and applications
- [ ] **Test:** Real-time notifications
- [ ] **Test:** File uploads (resume)
- [ ] **Test:** Role-based access control

---

## 🚀 Next Steps

1. **Apply Fixes:** Implement Fix #1 and Fix #2
2. **Setup Environment:** Configure `.env` files
3. **Verify Integration:** Check `App.jsx` uses correct AuthContext
4. **Test Endpoints:** Use Postman or curl to test backend
5. **Test Frontend:** Run frontend and test full flow
6. **Monitor Logs:** Check backend logs for errors
7. **Socket.IO Testing:** Verify real-time updates work

---

**Status:** 🟡 2 Critical Issues Found, Ready for Fixes  
**Last Updated:** November 19, 2024

