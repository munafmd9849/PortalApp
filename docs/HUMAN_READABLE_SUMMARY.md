# Human-Readable Project Summary
## PWIOI Placement Portal - Simple Explanation

---

## 🎯 What Is This Project?

A **placement portal** where:
- **Students** can apply for jobs posted by companies
- **Recruiters** can post jobs and review applications
- **Admins** can manage users, approve jobs, and send notifications

Think of it like **LinkedIn for college students** - a platform connecting students with job opportunities.

---

## 📂 What Each Folder Does

### **`backend/`** - The Server (Brain of the System)
This is where all the **logic and data** lives.

- **`src/server.js`** - Starts the server, connects everything together
- **`src/routes/`** - Defines URLs like `/api/auth/login`, `/api/jobs`, etc.
- **`src/controllers/`** - Does the actual work (saves to database, sends emails, etc.)
- **`src/config/`** - Settings (database connection, email config, etc.)
- **`src/services/`** - Helper functions (like sending emails)
- **`prisma/schema.prisma`** - Defines the database structure (tables like Users, Jobs, Applications)

### **`frontend/`** - The UI (What Users See)
This is the **website** that users interact with.

- **`src/App.jsx`** - Main app file, defines all pages
- **`src/components/`** - Reusable UI pieces (buttons, modals, forms)
- **`src/pages/`** - Full pages (dashboard, login, etc.)
- **`src/services/api.js`** - Sends requests to the backend
- **`src/context/`** - Manages user login state
- **`src/hooks/`** - Custom React hooks

---

## 🔄 How Data Flows

### **Simple Example: User Signs Up**

```
1. User fills form → Frontend (LoginModal.jsx)
   ↓
2. Frontend sends email → Backend API (POST /api/auth/send-otp)
   ↓
3. Backend generates 6-digit code → Stores in database → Sends email via Gmail SMTP
   ↓
4. User enters code → Frontend sends to backend (POST /api/auth/verify-otp)
   ↓
5. Backend verifies code → Returns a "verification token"
   ↓
6. User enters password → Frontend sends to backend (POST /api/auth/register)
   ↓
7. Backend creates user account → Saves to database → Returns login tokens
   ↓
8. Frontend stores tokens → User is logged in → Redirects to dashboard
```

### **Another Example: Student Views Jobs**

```
1. Student opens dashboard → Frontend (StudentDashboard.jsx)
   ↓
2. Frontend requests jobs → Backend API (GET /api/jobs/targeted)
   ↓
3. Backend queries database → Finds jobs matching student's school/batch
   ↓
4. Backend returns job list → Frontend displays jobs
```

---

## 🔐 How Signup/Login Works

### **Signup (With OTP)**

1. **User enters email** → Clicks "Send OTP"
2. **Backend generates random 6-digit code** (e.g., 123456)
3. **Backend stores code in database** (expires in 5 minutes)
4. **Backend sends email** via Gmail SMTP with the code
5. **User receives email** → Enters code
6. **Backend verifies code** → Returns a "verification token"
7. **User enters password** → Clicks "Create account"
8. **Backend creates account** → Returns "access token" and "refresh token"
9. **Frontend stores tokens** → User is logged in

### **Login**

1. **User enters email + password**
2. **Backend checks password** → If correct, generates tokens
3. **Frontend stores tokens** → User is logged in

**Note**: Tokens are like "ID cards" - frontend sends them with every request to prove who you are.

---

## 📧 How OTP/Email Works

### **Email Setup**

- Uses **Gmail SMTP** (Simple Mail Transfer Protocol)
- Credentials stored in `backend/.env`:
  ```
  SMTP_USER=your@email.com
  SMTP_PASS=your_password
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  ```

### **How OTP Is Sent**

1. Backend generates 6-digit number
2. Saves to database (table: `OTP`) with expiry time
3. Calls `emailService.sendOTP(email, code)`
4. Uses **Nodemailer** (email library) to send via Gmail
5. User receives email in inbox

---

## 🌐 How Frontend Talks to Backend

### **The API Client** (`services/api.js`)

This is like a **translator** - it converts frontend actions into HTTP requests.

**Example**:
```javascript
// Frontend calls:
api.sendOTP('user@example.com')

// API client sends:
POST http://localhost:3000/api/auth/send-otp
Body: { email: 'user@example.com' }

// Backend responds:
{ success: true, message: 'OTP sent' }
```

### **All API Calls**

- `api.sendOTP(email)` → `POST /api/auth/send-otp`
- `api.verifyOTP(email, otp)` → `POST /api/auth/verify-otp`
- `api.register(data)` → `POST /api/auth/register`
- `api.login(data)` → `POST /api/auth/login`
- `api.getTargetedJobs()` → `GET /api/jobs/targeted`
- `api.getStudentProfile()` → `GET /api/students/profile`
- etc.

---

## ⚠️ Current Problems

### **1. Mixed Authentication Systems**

- **Two auth systems exist**:
  - `AuthContextJWT.jsx` ✅ (New - JWT tokens)
  - `AuthContext.jsx` 🔴 (Old - Firebase)

- **App.jsx uses the new one** ✅
- **But LoginModal.jsx still imports Firebase** 🔴
- **Result**: Confusion, may try to use Firebase even though it's not configured

### **2. Frontend Still Uses Firebase**

- Many components still use Firebase:
  - Student dashboard loads jobs from Firebase ❌
  - Student profile uses Firebase real-time listeners ❌
  - Many service files use Firebase ❌

- **Backend is fully migrated** ✅
- **Frontend is only 30% migrated** ⚠️

### **3. LoginModal Navigation Issue**

- After login, code tries to fetch user from Firebase
- But Firebase may not be configured
- **Fix**: Use `useAuth().user.role` instead (already available)

---

## 🗄️ Database Structure

### **Main Tables**

1. **`users`** - User accounts (email, password hash, role, status)
2. **`students`** - Student profiles (name, school, batch, skills, etc.)
3. **`recruiters`** - Recruiter profiles (company, location, etc.)
4. **`jobs`** - Job postings (title, description, salary, location, etc.)
5. **`applications`** - Job applications (which student applied to which job)
6. **`notifications`** - System notifications
7. **`otps`** - OTP codes (temporary, expires in 5 minutes)

### **Relationships**

- One **User** → One **Student** OR One **Recruiter** OR One **Admin**
- One **Recruiter** → Many **Jobs**
- One **Student** → Many **Applications**
- One **Job** → Many **Applications**

---

## 🔌 How Real-Time Updates Work

### **Socket.IO**

Instead of constantly asking "are there new jobs?", the frontend connects to Socket.IO and **waits for updates**.

**Example**:
- Student subscribes to job updates
- Admin posts a new job
- Backend **pushes** notification to student via Socket.IO
- Student dashboard **instantly updates** without refreshing

**Current Status**:
- ✅ Backend Socket.IO server configured
- ✅ Frontend Socket.IO client configured
- ⚠️ But frontend still uses Firebase `onSnapshot()` instead of Socket.IO

---

## 🎨 Why Certain Files Exist

### **`firebase.js`** - Why Still Exists?
- Old code needs it (frontend components still use Firebase)
- Should be removed once migration is complete

### **`AuthContext.jsx`** vs **`AuthContextJWT.jsx`**
- `AuthContext.jsx` = Old Firebase authentication
- `AuthContextJWT.jsx` = New JWT authentication
- **Only `AuthContextJWT.jsx` is used** (the other should be deleted)

### **`services/students.js`** vs **`services/api.js`**
- `services/students.js` = Uses Firebase directly
- `services/api.js` = Uses HTTP requests to backend
- **Should use `api.js`** instead of Firebase services

---

## 📝 Simple Data Flow Diagrams

### **Signup Flow**
```
User → LoginModal (enter email)
  ↓
Backend → Generate OTP → Save to DB → Send email
  ↓
User → LoginModal (enter OTP)
  ↓
Backend → Verify OTP → Return verification token
  ↓
User → LoginModal (enter password)
  ↓
Backend → Create account → Return login tokens
  ↓
User → Dashboard ✅
```

### **Login Flow**
```
User → LoginModal (enter email + password)
  ↓
Backend → Check password → Return login tokens
  ↓
User → Dashboard ✅
```

### **View Jobs Flow** (Should Work But Currently Uses Firebase)
```
Student → Dashboard
  ↓
Frontend → Firebase ❌ (Should use API)
  ↓
Display jobs
```

---

## 🐛 What's Broken Right Now

1. **LoginModal tries Firebase after login** - Will fail if Firebase not configured
2. **Student dashboard uses Firebase** - Jobs won't load without Firebase
3. **Student components use Firebase** - Profile won't load without Firebase
4. **Port 3000 might be blocked** - Backend can't start

---

## ✅ What's Working

1. **Backend server** - All routes work
2. **OTP sending** - Emails are sent via Gmail SMTP
3. **OTP verification** - Codes are verified correctly
4. **User registration** - Accounts are created in database
5. **JWT tokens** - Login tokens are generated and stored
6. **API client** - Frontend can talk to backend

---

## 🔧 Quick Fixes Needed

### **Fix #1: LoginModal Navigation**
**Problem**: After login, tries to use Firebase  
**Fix**: Remove Firebase import, use `useAuth().user.role` for navigation

### **Fix #2: Port 3000**
**Problem**: Backend can't start on port 3000  
**Fix**: Kill process on port 3000, ensure `.env` has `PORT=3000`

### **Fix #3: Student Dashboard Jobs**
**Problem**: Uses Firebase to load jobs  
**Fix**: Replace with `api.getTargetedJobs()`

---

## 🎯 Summary

- **Backend**: Fully working, migrated to Node.js/Express
- **Frontend**: Partially working, still uses Firebase in many places
- **Auth Flow**: OTP works, but login navigation has Firebase dependency
- **Main Issue**: Frontend is half-migrated - some parts use new API, others use old Firebase

**To make everything work**:
1. Remove Firebase dependencies from LoginModal
2. Migrate student dashboard to use API instead of Firebase
3. Migrate student components to use API + Socket.IO instead of Firebase

---

**This is a simplified explanation - see `COMPLETE_PROJECT_ANALYSIS.md` for technical details.**

