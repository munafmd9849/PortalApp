# MIGRATION Folder Structure

Complete directory tree and description of all files in the migration package.

```
MIGRATION/                                    # Root migration package directory
│
├─ 📄 README.md                              # Migration package overview & quick reference
├─ 📄 INDEX.md                               # Index/navigation for all migration files
├─ 📄 COMPLETE.md                            # Completion checklist & migration status
├─ 📄 MIGRATION_SUMMARY.md                   # High-level migration summary & overview
├─ 📄 MIGRATION_GUIDE.md                     # Detailed step-by-step migration instructions
├─ 📄 QUICK_START.md                         # Quick setup guide for developers
├─ 📄 API_DOCUMENTATION.md                   # Auto-generated API endpoint documentation
├─ 📄 ARCHITECTURE_DIAGRAMS.md               # ASCII-style workflow & architecture diagrams
├─ 📄 FOLDER_STRUCTURE.md                    # This file - complete folder structure
│
├─ 📁 prisma/                                # Prisma ORM schema & migrations
│  └─ 📄 schema.prisma                       # Database schema definition (PostgreSQL/SQLite)
│                                             #   - Models: User, Student, Recruiter, Admin
│                                             #   - Models: Job, Application, Notification
│                                             #   - Models: Company, Skill, Education, Project
│                                             #   - Models: Achievement, CodingProfile, Resume
│
├─ 📁 backend/                               # Express 5 + Node.js 20 backend server
│  ├─ 📄 package.json                        # Backend dependencies & npm scripts
│  │                                         #   - Dependencies: express, prisma, socket.io
│  │                                         #   - Dependencies: bullmq, redis, aws-sdk, nodemailer
│  │                                         #   - Scripts: dev, start, db:migrate, worker
│  │
│  ├─ 📄 .env.example                        # [Should exist] Environment variables template
│  │                                         #   - DATABASE_URL, JWT_SECRET, REDIS_URL
│  │                                         #   - AWS_ACCESS_KEY_ID, S3_BUCKET_NAME
│  │                                         #   - EMAIL_HOST, EMAIL_USER, EMAIL_PASS
│  │                                         #   - PORT, CORS_ORIGIN, NODE_ENV
│  │
│  └─ 📁 src/                                # Backend source code
│     │
│     ├─ 📄 server.js                        # Express server entry point
│     │                                      #   - Initializes Express app
│     │                                      #   - Sets up middleware (helmet, cors, rate-limit)
│     │                                      #   - Mounts API routes
│     │                                      #   - Initializes Socket.IO
│     │                                      #   - Starts HTTP server
│     │
│     ├─ 📁 config/                          # Configuration modules for external services
│     │  ├─ 📄 database.js                   # Prisma Client initialization & configuration
│     │  ├─ 📄 redis.js                      # Redis client setup (for BullMQ & caching)
│     │  ├─ 📄 s3.js                         # AWS S3 client & file upload/download utilities
│     │  ├─ 📄 email.js                      # Nodemailer transporter & email sending utilities
│     │  └─ 📄 socket.js                     # Socket.IO server initialization & middleware
│     │                                      #   - JWT authentication middleware
│     │                                      #   - Room-based connection handling
│     │                                      #   - Exports getIO() for use in controllers
│     │
│     ├─ 📁 middleware/                      # Express middleware functions
│     │  ├─ 📄 auth.js                       # JWT authentication middleware
│     │  │                                   #   - Validates access tokens
│     │  │                                   #   - Handles refresh token rotation
│     │  │                                   #   - Attaches user to req.user
│     │  ├─ 📄 roles.js                      # Role-based access control (RBAC) middleware
│     │  │                                   #   - Checks user role (STUDENT, RECRUITER, ADMIN)
│     │  │                                   #   - Validates permissions for routes
│     │  │                                   #   - Exports: requireRole(), requireAnyRole()
│     │  └─ 📄 validation.js                 # Request validation middleware (express-validator)
│     │                                      #   - Field-level validation rules
│     │                                      #   - Error formatting
│     │
│     ├─ 📁 routes/                          # API route definitions (Express routers)
│     │  ├─ 📄 auth.js                       # Authentication routes
│     │  │                                   #   - POST /api/auth/register
│     │  │                                   #   - POST /api/auth/login
│     │  │                                   #   - POST /api/auth/logout
│     │  │                                   #   - POST /api/auth/refresh
│     │  ├─ 📄 students.js                   # Student profile & data routes
│     │  │                                   #   - GET/PUT /api/students/profile
│     │  │                                   #   - GET/PUT /api/students/skills
│     │  │                                   #   - GET/PUT /api/students/education
│     │  │                                   #   - GET/PUT /api/students/projects
│     │  │                                   #   - GET/PUT /api/students/achievements
│     │  │                                   #   - GET/PUT /api/students/tracked-jobs
│     │  ├─ 📄 jobs.js                       # Job posting & management routes
│     │  │                                   #   - GET/POST /api/jobs
│     │  │                                   #   - GET/PUT/DELETE /api/jobs/:id
│     │  │                                   #   - POST /api/jobs/:id/approve
│     │  │                                   #   - POST /api/jobs/:id/reject
│     │  │                                   #   - POST /api/jobs/:id/post
│     │  │                                   #   - POST /api/jobs/:id/unpost
│     │  ├─ 📄 applications.js               # Job application routes
│     │  │                                   #   - POST /api/applications
│     │  │                                   #   - GET /api/applications
│     │  │                                   #   - PUT /api/applications/:id/status
│     │  └─ 📄 notifications.js              # Notification routes
│     │                                      #   - GET /api/notifications
│     │                                      #   - PUT /api/notifications/:id/read
│     │                                      #   - POST /api/notifications (admin/recruiter)
│     │
│     ├─ 📁 controllers/                     # Business logic & request handlers
│     │  ├─ 📄 students.js                   # Student controller
│     │  │                                   #   - Profile CRUD operations
│     │  │                                   #   - Skills, education, projects management
│     │  │                                   #   - Job tracking functionality
│     │  ├─ 📄 jobs.js                       # Job controller
│     │  │                                   #   - Job creation & updates
│     │  │                                   #   - Status transitions (approve, reject, post)
│     │  │                                   #   - Job listing & filtering
│     │  ├─ 📄 applications.js               # Application controller
│     │  │                                   #   - Apply to jobs
│     │  │                                   #   - Application status updates
│     │  │                                   #   - Emits Socket.IO events for real-time updates
│     │  ├─ 📄 notifications.js              # Notification controller
│     │  │                                   #   - Create notifications
│     │  │                                   #   - Mark as read
│     │  │                                   #   - Emits Socket.IO events for new notifications
│     │  └─ 📄 recruiters.js                 # Recruiter controller
│     │                                      #   - Recruiter profile management
│     │                                      #   - Company management
│     │
│     └─ 📁 workers/                         # BullMQ background job workers
│        ├─ 📄 queues.js                     # BullMQ queue definitions
│        │                                   #   - jobDistributionQueue
│        │                                   #   - emailQueue
│        ├─ 📄 jobDistribution.js            # Worker: Distribute jobs to relevant students
│        │                                   #   - Matches jobs with student skills/preferences
│        │                                   #   - Creates notifications via Socket.IO
│        ├─ 📄 emailWorker.js                # Worker: Send email notifications
│        │                                   #   - Processes email queue jobs
│        │                                   #   - Uses Nodemailer to send emails
│        │                                   #   - Handles retries & failures
│        └─ 📄 index.js                      # Worker entry point
│                                             #   - Starts all BullMQ workers
│                                             #   - Connects to Redis
│                                             #   - Processes queues
│
├─ 📁 frontend/                              # React frontend integration code
│  └─ 📁 src/                                # Frontend source code (example files)
│     │
│     ├─ 📁 services/                        # API client services (replaces Firebase SDK)
│     │  ├─ 📄 api.js                        # HTTP API client wrapper
│     │  │                                   #   - Base fetch utility
│     │  │                                   #   - Request/response interceptors
│     │  │                                   #   - Error handling
│     │  │                                   #   - Token management
│     │  └─ 📄 socket.js                     # Socket.IO client setup
│     │                                      #   - Initializes Socket.IO connection
│     │                                      #   - JWT authentication
│     │                                      #   - Event listeners & emitters
│     │                                      #   - Reconnection handling
│     │
│     ├─ 📁 context/                         # React Context providers
│     │  └─ 📄 AuthContext.migrated.jsx      # Migrated AuthContext
│     │                                      #   - JWT-based authentication
│     │                                      #   - Login, register, logout
│     │                                      #   - Token refresh handling
│     │                                      #   - Replaces Firebase Auth
│     │
│     └─ 📁 hooks/                           # Custom React hooks
│        └─ 📄 useAPI.js                     # Hook for API calls
│                                             #   - Wraps API service
│                                             #   - Loading & error states
│                                             #   - Automatic token injection
│
├─ 📁 scripts/                               # Data migration & utility scripts
│  └─ 📄 migrate-firestore-to-postgres.js    # Firestore → PostgreSQL data migration script
│                                             #   - Reads data from Firestore collections
│                                             #   - Transforms Firestore documents to SQL rows
│                                             #   - Writes to PostgreSQL via Prisma
│                                             #   - Handles relationships & foreign keys
│                                             #   - Preserves data integrity
│
└─ 📁 EXAMPLES/                              # Example migrated React components
   └─ 📄 StudentDashboard.migrated.jsx       # Example: Migrated student dashboard component
                                              #   - Shows how to replace Firebase calls
                                              #   - Demonstrates API integration
                                              #   - Shows Socket.IO usage for real-time updates
```

## 📊 Statistics

- **Total Files**: ~40 files
- **Backend Files**: ~20 files
- **Frontend Files**: ~5 files
- **Documentation**: ~8 markdown files
- **Scripts**: 1 migration script
- **Database Schema**: 1 Prisma schema file

## 🔍 Key Files by Purpose

### **Authentication & Security**
- `backend/src/middleware/auth.js` - JWT authentication
- `backend/src/middleware/roles.js` - RBAC middleware
- `backend/src/routes/auth.js` - Auth endpoints
- `frontend/src/context/AuthContext.migrated.jsx` - Frontend auth context

### **Database & ORM**
- `prisma/schema.prisma` - Complete database schema
- `backend/src/config/database.js` - Prisma Client setup
- `scripts/migrate-firestore-to-postgres.js` - Data migration script

### **Real-time Communication**
- `backend/src/config/socket.js` - Socket.IO server
- `frontend/src/services/socket.js` - Socket.IO client

### **Background Jobs**
- `backend/src/workers/queues.js` - Queue definitions
- `backend/src/workers/jobDistribution.js` - Job distribution worker
- `backend/src/workers/emailWorker.js` - Email sending worker

### **File Storage**
- `backend/src/config/s3.js` - AWS S3 integration

### **API Endpoints**
- `backend/src/routes/*.js` - All route definitions
- `backend/src/controllers/*.js` - All business logic

### **Documentation**
- `README.md` - Package overview
- `MIGRATION_GUIDE.md` - Step-by-step migration guide
- `QUICK_START.md` - Quick setup guide
- `API_DOCUMENTATION.md` - API reference
- `ARCHITECTURE_DIAGRAMS.md` - Architecture & workflow diagrams

## 🚀 Next Steps

1. Review `QUICK_START.md` for setup instructions
2. Check `MIGRATION_GUIDE.md` for detailed migration steps
3. Examine `prisma/schema.prisma` for database structure
4. Run `scripts/migrate-firestore-to-postgres.js` to migrate data
5. Start backend: `cd backend && npm install && npm run dev`
6. Update frontend: Replace Firebase calls with API calls from `frontend/src/services/api.js`

