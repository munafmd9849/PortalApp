# Complete Project Folder Structure

Complete directory tree and description of all files in the PWIOI Placement Portal project.

```
Portal-main/                                  # Root project directory
│
├─ 📄 package.json                           # Root package.json - React 19 + Vite 7 dependencies
│                                             #   - Dependencies: react, firebase, tailwindcss
│                                             #   - Dependencies: react-router-dom, chart.js, jspdf
│                                             #   - DevDependencies: vite, eslint, @vitejs/plugin-react
│
├─ 📄 package-lock.json                      # NPM lock file
├─ 📄 vite.config.js                         # Vite configuration (build tool)
├─ 📄 tailwind.config.js                     # Tailwind CSS 4 configuration
├─ 📄 eslint.config.js                       # ESLint configuration
├─ 📄 index.html                             # Main HTML entry point
├─ 📄 .env                                   # Environment variables (local, not in git)
├─ 📄 .env.example                           # Environment variables template
├─ 📄 firestore.indexes.json                 # Firestore database index definitions
│
├─ 📄 README.md                              # Project README
├─ 📄 PROJECT_ANALYSIS.md                    # Complete technical analysis of the project
│
├─ 📁 public/                                # Static public assets
│  └─ 📄 vite.svg                            # Vite logo
│
├─ 📁 node_modules/                          # NPM dependencies (auto-generated, not tracked)
│
├─ 📁 src/                                   # Main source code directory
│  │
│  ├─ 📄 main.jsx                            # React application entry point
│  ├─ 📄 App.jsx                             # Root React component & routing
│  ├─ 📄 App.css                             # Global application styles
│  ├─ 📄 index.css                           # Base CSS styles & Tailwind imports
│  │
│  ├─ 📄 firebase.js                         # Firebase SDK initialization & configuration
│  │                                         #   - Firebase Auth setup
│  │                                         #   - Firestore database setup
│  │                                         #   - Firebase Storage setup
│  │
│  ├─ 📁 context/                            # React Context providers
│  │  └─ 📄 AuthContext.jsx                  # Authentication context (Firebase Auth)
│  │                                         #   - User authentication state
│  │                                         #   - Login, register, logout functions
│  │                                         #   - Role-based access
│  │
│  ├─ 📁 hooks/                              # Custom React hooks
│  │  └─ 📄 useAuth.js                       # Authentication hook (uses AuthContext)
│  │
│  ├─ 📁 services/                           # Firebase service layer & business logic
│  │  ├─ 📄 users.js                         # User management service
│  │  ├─ 📄 students.js                      # Student profile & data operations
│  │  ├─ 📄 recruiters.js                    # Recruiter management service
│  │  ├─ 📄 jobs.js                          # Job posting & management service
│  │  ├─ 📄 applications.js                  # Job application service
│  │  ├─ 📄 notifications.js                 # Notification service
│  │  ├─ 📄 resumes.js                       # Resume management service
│  │  ├─ 📄 resumeStorage.js                 # Firebase Storage operations for resumes
│  │  ├─ 📄 resumeData.js                    # Resume data processing
│  │  ├─ 📄 resumeEnhancer.js                # Resume enhancement logic
│  │  ├─ 📄 adminDashboard.js                # Admin dashboard data service
│  │  ├─ 📄 adminPanelService.js             # Admin panel operations
│  │  ├─ 📄 jobModeration.js                 # Job moderation logic
│  │  ├─ 📄 applicationCleanup.js            # Application cleanup utilities
│  │  ├─ 📄 emailNotifications.js            # Email notification service
│  │  ├─ 📄 notificationActions.js           # Notification action handlers
│  │  ├─ 📄 jdParser.js                      # Job description PDF parser
│  │  ├─ 📄 pdfGenerator.js                  # PDF generation utilities
│  │  ├─ 📄 questionBankService.js           # Question bank service
│  │  └─ 📄 queries.js                       # Common Firestore queries
│  │
│  ├─ 📁 utils/                              # Utility functions
│  │  └─ 📄 resumeUtils.js                   # Resume utility functions
│  │
│  ├─ 📁 components/                         # React components
│  │  │
│  │  ├─ 📄 AuthRedirect.jsx                 # Authentication redirect component
│  │  ├─ 📄 ProtectedRoute.jsx               # Route protection wrapper
│  │  ├─ 📄 Notification.jsx                 # Notification display component
│  │  ├─ 📄 DatabaseTest.jsx                 # Database testing component
│  │  │
│  │  ├─ 📁 auth/                            # Authentication components
│  │  │  ├─ 📄 LoginForm.jsx                 # Login form component
│  │  │  ├─ 📄 RegisterForm.jsx              # Registration form component
│  │  │  ├─ 📄 ResetPasswordForm.jsx         # Password reset form
│  │  │  └─ 📄 EmailVerificationModal.jsx    # Email verification modal
│  │  │
│  │  ├─ 📁 landing/                         # Landing page components
│  │  │  ├─ 📄 Header.jsx                    # Landing page header
│  │  │  ├─ 📄 Footer.jsx                    # Landing page footer
│  │  │  ├─ 📄 Banner.jsx                    # Hero banner section
│  │  │  ├─ 📄 PreLoader.jsx                 # Loading animation
│  │  │  ├─ 📄 WhyPw.jsx                     # Why PWIOI section
│  │  │  ├─ 📄 CareerService.jsx             # Career services section
│  │  │  ├─ 📄 PlacementTimeline.jsx         # Placement timeline component
│  │  │  ├─ 📄 Records.jsx                   # Records/stats section
│  │  │  ├─ 📄 stats.jsx                     # Statistics display
│  │  │  ├─ 📄 SkillsDisplay.jsx             # Skills showcase
│  │  │  ├─ 📄 HealthcareSkills.jsx          # Healthcare skills section
│  │  │  ├─ 📄 ManagementSkills.jsx          # Management skills section
│  │  │  ├─ 📄 OurPartners.jsx               # Partners section
│  │  │  ├─ 📄 HiringBet.jsx                 # Hiring bet section
│  │  │  ├─ 📄 DevTeam.jsx                   # Development team section
│  │  │  ├─ 📄 founder.jsx                   # Founder section
│  │  │  ├─ 📄 FAQs.jsx                      # FAQ section
│  │  │  ├─ 📄 Login.jsx                     # Landing page login component
│  │  │  ├─ 📄 LoginModal.jsx                # Login modal
│  │  │  ├─ 📄 TextStyle.jsx                 # Text styling component
│  │  │  └─ 📄 gsap.jsx                      # GSAP animation utilities
│  │  │
│  │  ├─ 📁 dashboard/                       # Dashboard components
│  │  │  │
│  │  │  ├─ 📁 shared/                       # Shared dashboard components
│  │  │  │  ├─ 📄 DashboardLayout.jsx        # Main dashboard layout
│  │  │  │  ├─ 📄 AdminLayout.jsx            # Admin dashboard layout
│  │  │  │  └─ 📄 RecruiterDashboardLayout.jsx # Recruiter dashboard layout
│  │  │  │
│  │  │  ├─ 📁 student/                      # Student dashboard components
│  │  │  │  ├─ 📄 DashboardHome.jsx          # Student dashboard home page
│  │  │  │  ├─ 📄 DashboardStatsSection.jsx  # Statistics section
│  │  │  │  ├─ 📄 AboutMe.jsx                # Student profile section
│  │  │  │  ├─ 📄 SkillsSection.jsx          # Skills management section
│  │  │  │  ├─ 📄 EducationSection.jsx       # Education history section
│  │  │  │  ├─ 📄 ProjectsSection.jsx        # Projects section
│  │  │  │  ├─ 📄 Achievements.jsx           # Achievements section
│  │  │  │  ├─ 📄 JobPostingsSection.jsx     # Job listings section
│  │  │  │  ├─ 📄 JobDescription.jsx         # Job detail view
│  │  │  │  ├─ 📄 ApplicationTrackerSection.jsx # Application tracking
│  │  │  │  ├─ 📄 Query.jsx                  # Query/help section
│  │  │  │  ├─ 📄 Resources.jsx              # Resources section
│  │  │  │  └─ 📄 StudentFooter.jsx          # Student dashboard footer
│  │  │  │
│  │  │  └─ 📁 admin/                        # Admin dashboard components
│  │  │     ├─ 📄 AdminHome.jsx              # Admin dashboard home
│  │  │     ├─ 📄 AdminPanel.jsx             # Main admin panel
│  │  │     ├─ 📄 ManageJobs.jsx             # Job management interface
│  │  │     ├─ 📄 JobPostingsManager.jsx     # Job postings manager
│  │  │     ├─ 📄 CreateJob.jsx              # Job creation form
│  │  │     ├─ 📄 JDUploader.jsx             # Job description uploader
│  │  │     ├─ 📄 PDFUploader.jsx            # PDF upload utility
│  │  │     ├─ 📄 ExcelUploader.jsx          # Excel file uploader
│  │  │     ├─ 📄 StudentDirectory.jsx       # Student directory/listing
│  │  │     ├─ 📄 RecruiterDirectory.jsx     # Recruiter directory/listing
│  │  │     └─ 📄 Notifications.jsx          # Admin notifications
│  │  │
│  │  ├─ 📁 resume/                          # Resume builder components
│  │  │  ├─ 📄 ResumeManager.jsx             # Main resume management component
│  │  │  ├─ 📄 CustomResumeBuilder.jsx       # Resume builder interface
│  │  │  ├─ 📄 CustomResumeBuilder.backup.jsx # Backup of resume builder
│  │  │  ├─ 📄 ResumePreview.jsx             # Resume preview component
│  │  │  ├─ 📄 ResumeSplitView.jsx           # Split view for resume editing
│  │  │  ├─ 📄 ResumeAnalyzer.jsx            # Resume analysis tool
│  │  │  ├─ 📄 SectionForms.jsx              # Resume section forms
│  │  │  └─ 📄 PDFPreviewErrorBoundary.jsx   # Error boundary for PDF preview
│  │  │
│  │  ├─ 📁 ui/                              # UI components
│  │  │  └─ 📄 Toast.jsx                     # Toast notification component
│  │  │
│  │  └─ 📁 common/                          # Common/shared components
│  │     ├─ 📄 ErrorBoundary.jsx             # React error boundary
│  │     └─ 📄 QueryErrorBoundary.jsx        # Query error boundary
│  │
│  ├─ 📁 pages/                              # Page components (route pages)
│  │  │
│  │  ├─ 📄 Login.jsx                        # Login page
│  │  ├─ 📄 AuthLogin.jsx                    # Alternative login page
│  │  ├─ 📄 AuthRegister.jsx                 # Registration page
│  │  ├─ 📄 AuthForgot.jsx                   # Forgot password page
│  │  ├─ 📄 Unsubscribe.jsx                  # Email unsubscribe page
│  │  │
│  │  ├─ 📁 dashboard/                       # Dashboard pages
│  │  │  ├─ 📄 StudentDashboard.jsx          # Student dashboard page
│  │  │  ├─ 📄 RecruiterDashboard.jsx        # Recruiter dashboard page
│  │  │  ├─ 📄 AdminDashboard.jsx            # Admin dashboard page
│  │  │  └─ 📄 JobPostings.jsx               # Job postings page
│  │  │
│  │  ├─ 📁 admin/                           # Admin pages
│  │  │  └─ 📄 AdminPanel.jsx                # Main admin panel page
│  │  │
│  │  ├─ 📁 recruiter/                       # Recruiter pages
│  │  │  ├─ 📄 dashboard.jsx                 # Recruiter dashboard
│  │  │  ├─ 📄 JobForm.jsx                   # Job creation/edit form
│  │  │  ├─ 📄 JobPostings.jsx               # Recruiter job postings
│  │  │  └─ 📄 RecruiterJobs.jsx             # Recruiter jobs listing
│  │  │
│  │  └─ 📁 jobs/                            # Job-related pages
│  │     ├─ 📄 JobList.jsx                   # Job listings page
│  │     └─ 📄 JobDetail.jsx                 # Job detail page
│  │
│  └─ 📁 assets/                             # Static assets (images, logos, documents)
│     │
│     ├─ 📄 brand_logo.webp                  # Brand logo
│     ├─ 📄 react.svg                        # React logo
│     ├─ 📄 in.svg                           # India flag SVG
│     │
│     ├─ 📄 BannerImg.jpg                    # Banner images
│     ├─ 📄 BannerImg1.png                   # Alternative banner
│     │
│     ├─ 📄 IndiaMap.png                     # India map images
│     ├─ 📄 IndiaMap2.png                    # Alternative India map
│     ├─ 📄 IndiaMap5.png                    # Alternative India map
│     ├─ 📄 IndiaMapBlend.png                # Blended India map
│     ├─ 📄 India2.jpg                       # India landscape image
│     │
│     ├─ 📄 CS1.webp                         # Case study images
│     ├─ 📄 CS2.webp
│     ├─ 📄 CS3.webp
│     ├─ 📄 CS4.png
│     ├─ 📄 CS5.png
│     └─ 📄 CS6.png
│     │
│     ├─ 📄 dev1.jpg                         # Development/team images
│     ├─ 📄 dev1.png
│     ├─ 📄 dev2.jpg
│     ├─ 📄 dev2.png
│     ├─ 📄 dev3.png
│     ├─ 📄 dev4.png
│     ├─ 📄 prof1.png                        # Profile images
│     ├─ 📄 r2.png
│     │
│     ├─ 📄 NEWS.jpg                         # News/banner images
│     ├─ 📄 NEWS1.jpg
│     ├─ 📄 NEWS2.jpg
│     ├─ 📄 NEWS3.jpg
│     │
│     ├─ 📄 N6.jpg                           # Number images
│     ├─ 📄 N7.jpg
│     ├─ 📄 P2.jpg                           # Placeholder images
│     ├─ 📄 P3.jpg
│     ├─ 📄 P4.jpg
│     ├─ 📄 P5.jpg
│     │
│     ├─ 📄 photo1_page-0001.jpg             # Photo pages
│     ├─ 📄 photo2_page-0001.jpg
│     │
│     ├─ 📄 sidebar.jpg                      # Sidebar background
│     ├─ 📄 SOHbanner.png                    # Banner images
│     ├─ 📄 SOTbanner.jpg
│     ├─ 📄 SOTbanner.png
│     ├─ 📄 SOTbanner1.png
│     │
│     ├─ 📄 physics-wallah-seeklogo.png      # Partner logos
│     │
│     ├─ 📄 Rec1.png                         # Recruiter images
│     ├─ 📄 Rec2.png
│     ├─ 📄 Rec3.png
│     │
│     ├─ 📄 JavaScript-Logo.png              # Technology logos
│     ├─ 📄 Java_(programming_language)-Logo.wine.svg
│     ├─ 📄 Python_(programming_language)-Logo.wine.svg
│     ├─ 📄 React_(web_framework)-Logo.wine.svg
│     ├─ 📄 Node.js-Logo.wine.svg
│     ├─ 📄 MongoDB-Logo.wine.svg
│     │
│     ├─ 📄 Adobe_Inc.-Logo.wine.svg         # Company logos
│     ├─ 📄 Advanced_Micro_Devices-Logo.wine.svg
│     ├─ 📄 Amazon_(company)-Logo.wine.svg
│     ├─ 📄 Amazon_Web_Services-Logo.wine.svg
│     ├─ 📄 Apple_Inc.-Logo.wine.svg
│     ├─ 📄 AT&T-Logo.wine.svg
│     ├─ 📄 Google-Logo.wine.svg
│     ├─ 📄 IBM-Logo.wine.svg
│     ├─ 📄 Intel-Logo.wine.svg
│     ├─ 📄 Lenovo_K6_Power-Logo.wine.svg
│     ├─ 📄 Microsoft-Logo.wine.svg
│     ├─ 📄 Netflix-Logo.wine.svg
│     ├─ 📄 Nvidia-Logo.wine.svg
│     ├─ 📄 Ola_Cabs-Logo.wine.svg
│     ├─ 📄 Oracle_Corporation-Logo.wine.svg
│     ├─ 📄 Oracle_SQL_Developer-Logo.wine.svg
│     ├─ 📄 Puma_(brand)-Logo.wine.svg
│     ├─ 📄 Safari_(web_browser)-Logo.wine.svg
│     ├─ 📄 Salesforce.com-Logo.wine.svg
│     ├─ 📄 Samsung-Logo.wine.svg
│     ├─ 📄 Skyscanner-Logo.wine.svg
│     ├─ 📄 Tesla,_Inc.-Logo.wine.svg
│     └─ 📄 Toyota_Canada_Inc.-Logo.wine.svg
│     │
│     └─ 📁 Docs/                            # Document files
│        ├─ 📄 PlacementPolicy.pdf           # Placement policy document
│        └─ 📄 Resume(1).pdf                 # Sample resume
│
└─ 📁 MIGRATION/                             # Migration package (Firebase → PostgreSQL)
   │                                          # (See MIGRATION/FOLDER_STRUCTURE.md for details)
   │
   ├─ 📄 README.md                           # Migration package overview
   ├─ 📄 INDEX.md                            # Migration files index
   ├─ 📄 COMPLETE.md                         # Migration completion checklist
   ├─ 📄 MIGRATION_SUMMARY.md                # Migration summary
   ├─ 📄 MIGRATION_GUIDE.md                  # Step-by-step migration guide
   ├─ 📄 QUICK_START.md                      # Quick setup guide
   ├─ 📄 API_DOCUMENTATION.md                # API endpoint documentation
   ├─ 📄 ARCHITECTURE_DIAGRAMS.md            # Architecture diagrams
   └─ 📄 FOLDER_STRUCTURE.md                 # Migration folder structure
   │
   ├─ 📁 prisma/                             # Database schema
   │  └─ 📄 schema.prisma                    # Prisma schema (PostgreSQL / Neon)
   │
   ├─ 📁 backend/                            # Express backend
   │  ├─ 📄 package.json                     # Backend dependencies
   │  └─ 📁 src/                             # Backend source code
   │     ├─ 📄 server.js                     # Express server entry point
   │     ├─ 📁 config/                       # Configuration (DB, Redis, S3, Email, Socket)
   │     ├─ 📁 middleware/                   # Middleware (auth, roles, validation)
   │     ├─ 📁 routes/                       # API routes
   │     ├─ 📁 controllers/                  # Business logic
   │     └─ 📁 workers/                      # BullMQ background workers
   │
   ├─ 📁 frontend/                           # Frontend migration examples
   │  └─ 📁 src/                             # Frontend migration code
   │     ├─ 📁 services/                     # API & Socket.IO clients
   │     ├─ 📁 context/                      # Migrated AuthContext
   │     └─ 📁 hooks/                        # Custom React hooks
   │
   ├─ 📁 scripts/                            # Migration scripts
   │  └─ 📄 migrate-firestore-to-postgres.js # Data migration script
   │
   └─ 📁 EXAMPLES/                           # Example components
      └─ 📄 StudentDashboard.migrated.jsx    # Example migrated component
```

## 📊 Project Statistics

### **Main Application**
- **Total Source Files**: ~150+ files
- **Components**: ~60+ React components
- **Services**: ~20+ Firebase service files
- **Pages**: ~15+ route pages
- **Assets**: ~70+ images/logos/documents
- **Configuration Files**: 6 config files

### **Migration Package**
- **Backend Files**: ~25 files
- **Frontend Files**: ~5 files
- **Documentation**: 9 markdown files
- **Total Migration Files**: ~40 files

### **Tech Stack (Current)**
- **Frontend**: React 19, Vite 7, Tailwind CSS 4
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Build Tool**: Vite
- **Routing**: React Router DOM 7
- **Charts**: Chart.js, Recharts
- **PDF**: jsPDF, react-pdf, pdf-parse
- **Animations**: GSAP, Framer Motion

### **Tech Stack (Migrated)**
- **Frontend**: React 19, Vite 7, Tailwind CSS 4 (same)
- **Backend**: Node.js 20, Express 5
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma 5
- **Real-time**: Socket.IO
- **Task Queue**: BullMQ + Redis
- **Storage**: AWS S3
- **Email**: Nodemailer/AWS SES

## 🎯 Key Features by Directory

### **Student Features** (`src/components/dashboard/student/`)
- Profile management (About Me, Skills, Education)
- Projects & Achievements tracking
- Job browsing & applications
- Application status tracking
- Resume builder & manager

### **Recruiter Features** (`src/pages/recruiter/`, `src/components/dashboard/admin/`)
- Job posting & management
- Candidate applications review
- JD upload & parsing
- Excel/PDF upload utilities

### **Admin Features** (`src/pages/admin/`, `src/components/dashboard/admin/`)
- Job moderation (approve/reject)
- Student & Recruiter directory
- System-wide notifications
- Dashboard analytics

### **Landing Page** (`src/components/landing/`)
- Hero banner with animations
- Career services showcase
- Skills display
- Partners section
- FAQ section
- Team/founder sections

## 🚀 Development Setup

### **Current Stack (Firebase)**
```bash
npm install
npm run dev          # Start Vite dev server
npm run build        # Build for production
```

### **Migrated Stack (PostgreSQL + Express)**
```bash
# Backend
cd MIGRATION/backend
npm install
npm run dev          # Start Express server

# Frontend
# Use migrated services from MIGRATION/frontend/src/
```

## 📝 Next Steps

1. **Review** this folder structure
2. **Understand** current Firebase implementation
3. **Review** migration package in `MIGRATION/`
4. **Follow** `MIGRATION/MIGRATION_GUIDE.md` for step-by-step migration
5. **Test** each module after migration

---

**Project**: PWIOI Placement Portal  
**Version**: Current (Firebase) + Migration (PostgreSQL)  
**Status**: Production-ready (Firebase) | Migration-ready (PostgreSQL)

