# PWIOI Placement Portal - Comprehensive Project Explanation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Database Schema & Models](#database-schema--models)
4. [User Roles & Authentication](#user-roles--authentication)
5. [Core Features & Workflows](#core-features--workflows)
6. [Backend Structure](#backend-structure)
7. [Frontend Structure](#frontend-structure)
8. [Key Services & Integrations](#key-services--integrations)
9. [File-by-File Breakdown](#file-by-file-breakdown)

---

## 🎯 Project Overview

**PWIOI Placement Portal** is a comprehensive job placement management system for Physics Wallah Institute of Innovation (PWIOI). It facilitates the entire placement lifecycle from job posting to final selection, serving multiple user types: Students, Recruiters, Admins, and Super Admins.

### Key Capabilities:
- **Student Management**: Profile creation, resume upload, job applications, interview tracking
- **Recruiter Management**: Job posting, candidate screening, interview scheduling
- **Admin Management**: Job approval, interview session management, candidate tracking
- **Super Admin**: System-wide administration, admin creation, statistics
- **Interview System**: Multi-round interview evaluation with token-based access
- **Real-time Updates**: Socket.IO for live notifications and updates
- **Email System**: Automated notifications, OTP verification, screening emails
- **Google Calendar Integration**: Interview scheduling with calendar sync

---

## 🏗️ Architecture & Technology Stack

### Backend (Node.js/Express)
- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js 5.0
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: JWT (Access + Refresh tokens)
- **Real-time**: Socket.IO
- **File Storage**: Cloudinary (images/resumes), AWS S3 (optional)
- **Email**: Nodemailer (SMTP)
- **AI Integration**: Google Gemini API (for resume enhancement)
- **Task Queue**: BullMQ (Redis-based)
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting

### Frontend (React)
- **Framework**: React 19 with Vite
- **Routing**: React Router DOM 7
- **State Management**: Context API (AuthContext)
- **Styling**: Tailwind CSS
- **UI Components**: Custom components + Lucide React icons
- **Charts**: Chart.js, Recharts
- **Calendar**: FullCalendar
- **Real-time**: Socket.IO Client
- **PDF Processing**: pdf-parse, react-pdf
- **File Upload**: Custom implementation with Cloudinary

### Database
- **Type**: PostgreSQL (hosted on Render)
- **ORM**: Prisma 5.0
- **Connection Pooling**: Optimized for Render free tier (10 connections)

---

## 📊 Database Schema & Models

### Core User Models

#### User
- Base authentication model
- Fields: `id`, `email`, `passwordHash`, `role`, `status`, `emailVerified`
- Roles: `STUDENT`, `RECRUITER`, `ADMIN`, `SUPER_ADMIN`
- Status: `ACTIVE`, `PENDING`, `REJECTED`, `BLOCKED`
- Relations: One-to-one with Student/Recruiter/Admin profiles

#### Student
- Comprehensive student profile
- Academic: `batch`, `center`, `school`, `cgpa`, `backlogs`
- Profile: `fullName`, `phone`, `enrollmentId`, `bio`, `headline`
- Social: `linkedin`, `githubUrl`, `leetcode`, etc.
- Resume: Multiple resume files (Cloudinary URLs)
- Statistics: `statsApplied`, `statsShortlisted`, `statsInterviewed`, `statsOffers`
- Public Profile: Shareable via UUID token
- Endorsements: Magic link-based endorsement system

#### Recruiter
- Company association
- Fields: `companyId`, `companyName`, `location`, `relationshipType`, `zone`
- Status: Starts as `PENDING`, requires admin approval

#### Admin
- Additional admin-specific data
- Fields: `name`, `userId`
- Created by Super Admin

### Job & Application Models

#### Job
- Complete job posting
- Basic: `jobTitle`, `description`, `requirements`, `requiredSkills`
- Company: `companyId`, `recruiterId`, `companyName`
- Compensation: `salary`, `ctc`, `salaryRange`
- Dates: `driveDate` (interview date), `applicationDeadline` (deadline)
- Eligibility: `qualification`, `specialization`, `yop`, `minCgpa`, `gapAllowed`, `backlogs`
- Targeting: `targetSchools`, `targetCenters`, `targetBatches` (JSON arrays)
- Status: `IN_REVIEW`, `APPROVED`, `REJECTED`, `POSTED`
- Screening: `requiresScreening`, `requiresTest`
- SPOCs: Array of contact persons (JSON)

#### Application
- Student job application
- Status: `APPLIED`, `SHORTLISTED`, `INTERVIEWED`, `OFFERED`, `SELECTED`, `REJECTED`
- Screening Status: `APPLIED`, `SCREENING_SELECTED`, `SCREENING_REJECTED`, `TEST_SELECTED`, `TEST_REJECTED`, `INTERVIEW_ELIGIBLE`
- Interview Tracking: `interviewStatus`, `lastRoundReached`
- Unique constraint: One application per student per job

### Interview System Models

#### InterviewSession
- Main interview session for a job
- Status: `NOT_STARTED`, `ONGOING`, `COMPLETED`, `INCOMPLETE`, `FROZEN`
- Created by Admin
- One session per job

#### InterviewRound
- Individual interview rounds
- Fields: `roundNumber`, `name`, `status` (`LOCKED`, `ACTIVE`, `ENDED`)
- Timestamps: `startedAt`, `endedAt`
- Belongs to InterviewSession

#### RoundEvaluation
- Candidate evaluation per round
- Fields: `status` (`SELECTED`, `REJECTED`, `ON_HOLD`), `remarks`
- Links: `roundId`, `applicationId`, `interviewerEmail`
- Unique: One evaluation per candidate per round

#### InterviewerInvite
- Token-based interviewer access
- Fields: `email`, `token`, `expiresAt`, `used`
- No login required - token-based access

### Screening Models

#### RecruiterScreeningSession
- Token-based screening access for recruiters
- Fields: `jobId`, `token`, `expiresAt`
- Allows recruiters to screen candidates without login

### Other Models

#### Notification
- In-app notifications
- Fields: `title`, `body`, `data` (JSON), `isRead`, `readAt`
- Real-time via Socket.IO

#### Endorsement & EndorsementToken
- Magic link-based endorsement system
- Teachers/mentors can endorse students via secure token
- Fields: `endorserName`, `endorserEmail`, `endorserRole`, `organization`, `message`, `skills`

#### GoogleCalendarToken
- OAuth tokens for Google Calendar integration
- Fields: `accessToken`, `refreshToken`, `expiryDate`, `connectedGoogleEmail`

---

## 🔐 User Roles & Authentication

### Authentication Flow

1. **Registration**:
   - User provides email, password, role
   - OTP sent to email (optional verification)
   - Password hashed with bcrypt
   - Role-specific profile created (Student/Recruiter/Admin)
   - JWT tokens generated (access + refresh)

2. **Login**:
   - Email + password authentication
   - Role validation
   - JWT tokens issued
   - Last login timestamp updated
   - Socket.IO connection established

3. **Token Management**:
   - Access Token: Short-lived (1 hour default)
   - Refresh Token: Long-lived (7 days)
   - Stored in database for revocation
   - Automatic refresh on frontend

4. **Super Admin**:
   - Special email-based login (`SUPER_ADMIN_EMAIL` env var)
   - Can access all roles
   - Bypasses role restrictions

### Role Permissions

#### STUDENT
- View and apply to jobs
- Manage profile and resume
- Track applications
- View notifications
- Request endorsements
- Public profile sharing

#### RECRUITER
- Create job postings (requires approval)
- Screen candidates (token-based)
- View applications
- Manage company profile
- Status: PENDING → ACTIVE (admin approval)

#### ADMIN
- Approve/reject jobs
- Create interview sessions
- Manage interview rounds
- Evaluate candidates
- View all applications
- Manage student/recruiter data
- Google Calendar integration

#### SUPER_ADMIN
- All admin permissions
- Create/disable admins
- System-wide statistics
- Access all dashboards
- Admin panel management

---

## 🔄 Core Features & Workflows

### 1. Job Posting Flow

```
Recruiter Creates Job
    ↓
Job Status: IN_REVIEW
    ↓
Admin Reviews Job
    ↓
[APPROVED] → Status: APPROVED → Posted → Status: POSTED
[REJECTED] → Status: REJECTED (with reason)
    ↓
Students See Job (if eligible)
    ↓
Application Deadline Reached
    ↓
Email Sent to Recruiter (screening token)
```

**Key Files**:
- `backend/src/controllers/jobs.js` - Job CRUD operations
- `backend/src/routes/jobs.js` - Job routes
- `backend/src/services/screeningEmailService.js` - Deadline email automation

### 2. Application Flow

```
Student Views Job
    ↓
Checks Eligibility (CGPA, backlogs, batch, etc.)
    ↓
Selects Resume (if multiple)
    ↓
Applies to Job
    ↓
Application Created (status: APPLIED, screeningStatus: APPLIED)
    ↓
Notifications Sent (Student + Recruiter)
    ↓
[If requiresScreening = true]
    ↓
Recruiter Screens (via token link)
    ↓
Screening Status Updated:
    - SCREENING_SELECTED → Can proceed to test/interview
    - SCREENING_REJECTED → Application ends
    ↓
[If requiresTest = true]
    ↓
Test Status:
    - TEST_SELECTED → Proceeds to interview
    - TEST_REJECTED → Application ends
    ↓
INTERVIEW_ELIGIBLE → Ready for interview
```

**Key Files**:
- `backend/src/controllers/applications.js` - Application logic
- `backend/src/routes/applications.js` - Application routes
- `backend/src/controllers/recruiterScreening.js` - Screening logic

### 3. Interview Session Flow

```
Admin Creates Interview Session
    ↓
InterviewSession Created (status: NOT_STARTED)
    ↓
Rounds Configured (InterviewRound records)
    ↓
Interviewers Invited (InterviewerInvite with tokens)
    ↓
Round 1 Started:
    - Session status: ONGOING
    - Round status: ACTIVE
    - All applications eligible
    ↓
Interviewers Evaluate (via token link)
    ↓
RoundEvaluations Created:
    - SELECTED → Proceeds to next round
    - REJECTED → Eliminated
    - ON_HOLD → Pending decision
    ↓
Round 1 Ended:
    - Round status: ENDED
    - Selected candidates identified
    ↓
Round 2 Started (if exists):
    - Only SELECTED candidates from Round 1
    ↓
Final Round Completed
    ↓
Session Status: COMPLETED
    ↓
Applications Updated:
    - interviewStatus: SELECTED / REJECTED_IN_ROUND_X
    - lastRoundReached: Final round number
```

**Key Files**:
- `backend/src/controllers/interviewScheduling.js` - Session management
- `backend/src/controllers/interviews.js` - Interview operations
- `backend/src/routes/interviewScheduling.js` - Session routes
- `frontend/src/pages/interview/InterviewerDashboard.jsx` - Interviewer UI

### 4. Screening Flow

```
Application Deadline Passes
    ↓
Scheduled Task Checks (every 1 minute)
    ↓
Email Sent to Recruiter with Screening Token
    ↓
Recruiter Clicks Link (no login required)
    ↓
RecruiterScreeningSession Validated
    ↓
Recruiter Views Candidates
    ↓
Recruiter Updates Screening Status:
    - SCREENING_SELECTED
    - SCREENING_REJECTED
    ↓
Screening Status Saved
    ↓
Notifications Sent to Students
```

**Key Files**:
- `backend/src/services/screeningEmailService.js` - Email automation
- `backend/src/controllers/recruiterScreening.js` - Screening logic
- `frontend/src/pages/recruiter/RecruiterScreening.jsx` - Screening UI

### 5. Endorsement Flow

```
Student Requests Endorsement
    ↓
EndorsementToken Created (secure token)
    ↓
Email Sent to Teacher/Mentor (magic link)
    ↓
Teacher Clicks Link (no login required)
    ↓
Endorsement Form Displayed
    ↓
Teacher Submits Endorsement:
    - Name, Role, Organization
    - Message, Skills, Rating
    - Consent checkbox
    ↓
Endorsement Created
    ↓
Token Marked as Used
    ↓
Student Profile Updated
```

**Key Files**:
- `backend/src/controllers/endorsements.js` - Endorsement logic
- `backend/src/routes/endorsements.js` - Endorsement routes
- `frontend/src/pages/Endorsement.jsx` - Endorsement form

---

## 🗂️ Backend Structure

### Directory Layout

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.js   # Prisma client setup
│   │   ├── email.js      # Nodemailer config
│   │   ├── socket.js     # Socket.IO setup
│   │   ├── cloudinary.js # Cloudinary config
│   │   └── ...
│   ├── controllers/      # Business logic
│   │   ├── auth.js       # Authentication
│   │   ├── jobs.js       # Job management
│   │   ├── applications.js # Application logic
│   │   ├── interviews.js # Interview operations
│   │   └── ...
│   ├── routes/           # Express routes
│   │   ├── auth.js       # Auth endpoints
│   │   ├── jobs.js       # Job endpoints
│   │   └── ...
│   ├── middleware/       # Express middleware
│   │   ├── auth.js       # JWT authentication
│   │   ├── roles.js      # Role-based access control
│   │   └── validation.js # Input validation
│   ├── services/         # External services
│   │   ├── emailService.js # Email sending
│   │   ├── aiService.js  # AI integration
│   │   └── ...
│   ├── utils/            # Utility functions
│   └── workers/          # Background jobs
│       ├── queues.js     # BullMQ queues
│       └── emailWorker.js # Email processing
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeding
└── server.js             # Main entry point
```

### Key Backend Files Explained

#### `server.js` (Main Entry Point)
- Express app initialization
- Middleware setup (CORS, Helmet, Rate Limiting)
- Route registration
- Socket.IO initialization
- Database connection validation
- Scheduled tasks (screening email checker)
- Graceful shutdown handling

**Critical Sections**:
- Environment variable validation (fail-fast)
- Database connection with quota handling
- Rate limiting (different for dev/prod)
- Route mounting order (public routes first)

#### `config/database.js`
- Prisma client singleton
- Connection pool optimization for Render
- Environment variable loading (CRITICAL: loads before Prisma)
- Graceful shutdown handlers
- Error handling utilities

#### `middleware/auth.js`
- JWT token verification
- User attachment to request
- Token generation (access + refresh)
- Refresh token validation

#### `middleware/roles.js`
- Role-based access control
- Permission checks
- Ownership validation
- Profile completion checks

#### `controllers/jobs.js`
- Job CRUD operations
- Eligibility checking
- Status management
- Approval/rejection logic
- Job distribution to students

#### `controllers/applications.js`
- Application creation
- Eligibility validation
- Status updates
- Statistics tracking
- Notification triggers

#### `controllers/interviewScheduling.js`
- Interview session creation
- Round management
- Interviewer invitation
- Candidate evaluation
- Status progression

#### `services/emailService.js`
- OTP emails
- Application notifications
- Job posted notifications
- Screening deadline emails
- Password reset emails

#### `services/screeningEmailService.js`
- Automated deadline checking
- Recruiter email generation
- Token creation for screening
- Runs every 1 minute (scheduled)

---

## 🎨 Frontend Structure

### Directory Layout

```
frontend/
├── src/
│   ├── components/       # Reusable components
│   │   ├── dashboard/    # Dashboard components
│   │   ├── landing/      # Landing page components
│   │   └── ui/           # UI primitives
│   ├── pages/            # Page components
│   │   ├── dashboard/    # Role-specific dashboards
│   │   ├── interview/    # Interview pages
│   │   └── ...
│   ├── services/         # API services
│   │   ├── api.js        # Main API client
│   │   ├── socket.js     # Socket.IO client
│   │   └── ...
│   ├── context/          # React Context
│   │   └── AuthContextJWT.jsx # Auth state
│   ├── hooks/            # Custom hooks
│   │   ├── useAuth.js    # Auth hook
│   │   └── ...
│   ├── config/           # Configuration
│   │   └── api.js        # API URL config
│   └── App.jsx           # Main app component
└── ...
```

### Key Frontend Files Explained

#### `App.jsx`
- Main application component
- Route definitions
- Protected route wrapper
- Landing page structure
- Auth provider integration

**Routes**:
- `/` - Landing page
- `/student` - Student dashboard
- `/recruiter` - Recruiter dashboard
- `/admin` - Admin dashboard
- `/super-admin` - Super Admin dashboard
- `/interview/:token` - Token-based interview access
- `/endorse/:token` - Endorsement form
- `/profile/:publicProfileId` - Public profile

#### `context/AuthContextJWT.jsx`
- Authentication state management
- Login/logout functions
- User data loading
- Token management
- Socket.IO initialization
- Google OAuth integration

**Key Functions**:
- `login()` - Email/password login
- `loginWithGoogle()` - Google OAuth popup
- `registerWithEmail()` - User registration
- `logout()` - Session cleanup
- `loadUser()` - Fetch current user

#### `services/api.js`
- Centralized API client
- Axios-based HTTP client
- Token management
- Error handling
- Request/response interceptors

**Key Methods**:
- `login()`, `register()`, `logout()`
- `getJobs()`, `applyToJob()`
- `getApplications()`, `updateApplication()`
- `createInterviewSession()`, `evaluateCandidate()`
- All API endpoints wrapped

#### `pages/dashboard/StudentDashboard.jsx`
- Student main interface
- Job browsing and filtering
- Application management
- Resume upload/selection
- Profile management
- Statistics display
- Real-time notifications

#### `pages/dashboard/AdminDashboard.jsx`
- Admin main interface
- Job approval queue
- Interview session management
- Candidate tracking
- Application overview
- Calendar integration

#### `pages/dashboard/SuperAdminDashboard.jsx`
- Super Admin interface
- Admin creation/management
- System statistics
- All admin features
- Additional super admin features

#### `pages/interview/InterviewerDashboard.jsx`
- Token-based interviewer access
- Round candidate list
- Evaluation interface
- Status updates
- No authentication required (token-based)

---

## 🔧 Key Services & Integrations

### Email Service
- **Provider**: Nodemailer (SMTP)
- **Templates**: HTML emails with inline styles
- **Types**: OTP, notifications, screening, password reset
- **Async**: Fire-and-forget (non-blocking)

### Socket.IO
- **Purpose**: Real-time updates
- **Events**: Notifications, application updates, job updates
- **Rooms**: User-specific, role-based, global
- **Authentication**: JWT token in handshake

### Google Calendar Integration
- **OAuth Flow**: Popup-based
- **Scopes**: Calendar read/write
- **Token Storage**: Database (persists across logout)
- **Email Validation**: Ensures connected email matches user email

### AI Service (Google Gemini)
- **Purpose**: Resume enhancement
- **Features**: 
  - Project summary generation
  - Skill extraction
  - Bullet point generation
- **Configurable**: Model, temperature, max tokens

### File Storage
- **Primary**: Cloudinary (images, resumes)
- **Secondary**: AWS S3 (optional)
- **Resume Processing**: PDF parsing, text extraction

### Task Queue (BullMQ)
- **Purpose**: Background job processing
- **Queues**: Email, notifications
- **Redis**: Required for queue management

---

## 📝 File-by-File Breakdown

### Critical Backend Files

1. **`server.js`** - Main server entry point
   - Express app setup
   - Middleware configuration
   - Route mounting
   - Server startup

2. **`config/database.js`** - Database connection
   - Prisma client initialization
   - Connection pool optimization
   - Environment variable loading

3. **`middleware/auth.js`** - Authentication
   - JWT verification
   - Token generation
   - User attachment

4. **`middleware/roles.js`** - Authorization
   - Role checking
   - Permission validation

5. **`routes/auth.js`** - Auth endpoints
   - Registration, login, logout
   - OTP verification
   - Password reset
   - Google OAuth

6. **`controllers/jobs.js`** - Job management
   - CRUD operations
   - Eligibility checking
   - Status management

7. **`controllers/applications.js`** - Application logic
   - Application creation
   - Status updates
   - Eligibility validation

8. **`controllers/interviewScheduling.js`** - Interview system
   - Session creation
   - Round management
   - Evaluation handling

9. **`services/emailService.js`** - Email sending
   - Template generation
   - SMTP integration

10. **`services/screeningEmailService.js`** - Automated screening
    - Deadline checking
    - Email generation
    - Token creation

### Critical Frontend Files

1. **`App.jsx`** - Main app component
   - Route definitions
   - Layout structure

2. **`context/AuthContextJWT.jsx`** - Auth state
   - User management
   - Token handling
   - Login/logout

3. **`services/api.js`** - API client
   - HTTP requests
   - Token management
   - Error handling

4. **`pages/dashboard/StudentDashboard.jsx`** - Student UI
   - Job browsing
   - Application management

5. **`pages/dashboard/AdminDashboard.jsx`** - Admin UI
   - Job approval
   - Interview management

6. **`pages/interview/InterviewerDashboard.jsx`** - Interviewer UI
   - Token-based access
   - Evaluation interface

---

## 🔄 Data Flow Examples

### Example 1: Student Applies to Job

```
Frontend (StudentDashboard.jsx)
    ↓ User clicks "Apply"
    ↓ Selects resume (optional)
    ↓ Calls: api.applyToJob(jobId, { resumeId })
    ↓
Backend (routes/applications.js)
    ↓ POST /api/applications/jobs/:jobId
    ↓ authenticate middleware → JWT verified
    ↓ requireRole(['STUDENT']) → Role checked
    ↓
Controller (applications.js)
    ↓ applyToJob() function
    ↓ 1. Get student profile
    ↓ 2. Check if already applied
    ↓ 3. Validate resume (if provided)
    ↓ 4. Get job details
    ↓ 5. Check eligibility (CGPA, backlogs, etc.)
    ↓ 6. Create Application record
    ↓ 7. Update student stats
    ↓ 8. Create notifications
    ↓ 9. Emit Socket.IO events
    ↓ 10. Send emails (async)
    ↓
Database (Prisma)
    ↓ Application.create()
    ↓ Student.update() (stats)
    ↓ Notification.create()
    ↓
Response
    ↓ Application object returned
    ↓ Frontend updates UI
    ↓ Toast notification shown
```

### Example 2: Interview Session Creation

```
Frontend (AdminDashboard.jsx)
    ↓ Admin creates interview session
    ↓ Calls: api.createInterviewSession(jobId, { rounds, interviewers })
    ↓
Backend (routes/interviewScheduling.js)
    ↓ POST /api/admin/interview-scheduling
    ↓ authenticate → requireRole(['ADMIN'])
    ↓
Controller (interviewScheduling.js)
    ↓ createInterviewSession() function
    ↓ 1. Validate job exists
    ↓ 2. Check if session already exists
    ↓ 3. Create InterviewSession
    ↓ 4. Create InterviewRound records
    ↓ 5. Create InterviewerInvite records (with tokens)
    ↓ 6. Send invitation emails
    ↓
Database (Prisma)
    ↓ InterviewSession.create()
    ↓ InterviewRound.createMany()
    ↓ InterviewerInvite.createMany()
    ↓
Response
    ↓ Session object with rounds and invites
    ↓ Frontend updates UI
    ↓ Interviewers receive emails
```

---

## 🚀 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development|production
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=...
EMAIL_PASS=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Google AI
GOOGLE_AI_API_KEY=...
GOOGLE_AI_MODEL=gemini-2.5-flash
AI_ENABLED=true

# Super Admin
SUPER_ADMIN_EMAIL=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...

# Redis (for BullMQ)
REDIS_URL=...
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

---

## 🎯 Key Design Decisions

1. **JWT over Sessions**: Stateless authentication for scalability
2. **Token-based Access**: Interviewers/recruiters can access without login
3. **Prisma ORM**: Type-safe database access
4. **Socket.IO**: Real-time updates without polling
5. **Cloudinary**: Simplified file upload/management
6. **Scheduled Tasks**: Automated email sending (every 1 minute)
7. **Role-based Routing**: Frontend route protection
8. **Magic Links**: Secure token-based access for endorsements/screening
9. **Multi-resume Support**: Students can upload multiple resumes
10. **Public Profiles**: Shareable student profiles via UUID

---

## 🔍 Important Notes

1. **Database Quota Handling**: System gracefully handles Render free tier quota limits
2. **Email Async**: Emails sent asynchronously (fire-and-forget)
3. **Token Expiration**: All tokens have expiration times
4. **Cascade Deletes**: User deletion cascades to related records
5. **Unique Constraints**: Prevent duplicate applications, endorsements
6. **Status Progression**: Strict status flow (e.g., APPLIED → SCREENING → INTERVIEW)
7. **Eligibility Checks**: Multiple validation layers (frontend + backend)
8. **Error Handling**: Comprehensive error handling with logging
9. **Rate Limiting**: Different limits for dev/prod
10. **Environment Validation**: Fail-fast on missing critical env vars

---

## 📚 Additional Resources

- **Prisma Schema**: `backend/prisma/schema.prisma` - Complete database schema
- **API Documentation**: Check `docs/` folder for detailed API docs
- **Migration Scripts**: `backend/scripts/` - Database migration utilities
- **Test Scripts**: `test_*.sh` - Integration test scripts

---

This document provides a comprehensive overview of the entire PWIOI Placement Portal system. Each component is designed to work together seamlessly, providing a robust platform for managing the complete placement lifecycle.
