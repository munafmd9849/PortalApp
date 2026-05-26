# d-PORTAL

Placement portal with role-based dashboards for students, recruiters, admins, and super admins.

## Overview
d-PORTAL is a full-stack placement management system that supports job posting, applications, interview scheduling, endorsements, notifications, calendar integration, and comprehensive analytics. The application has distinct experiences for Students, Recruiters, Admins, and Super Admins, plus public pages for marketing and job descriptions.

## Core Modules (All Roles)
- **Authentication**: Email/password login and verification, OTP-based flows, password reset, and role-based access.
- **Notifications**: In-app notifications with optional email sending.
- **Calendar**: Google Calendar OAuth integration with role-based event management.
- **Job Descriptions**: Dedicated Job Description page with structured job content, tabs, and print/share UI hooks.
- **Email System**: Centralized mail service supports OTP, announcements, job notifications, application updates, endorsements, and reminders.

---

## Student Features (Detailed)

### 1) Dashboard (Overview)
- **Profile Completion Status**: Visual indicators showing completion percentage and prompts for missing information.
- **Career Statistics**: Real-time metrics including:
  - Total applications submitted
  - Shortlisted applications
  - Interview opportunities
  - Job offers received
- **Recent Activity**: Latest applications, job recommendations, and system notifications.
- **Quick Actions**: Direct links to apply for jobs, view application status, and update profile.

### 2) Explore Jobs
- **Advanced Filtering**: Search by company, role, location, salary range, and job type.
- **Eligibility Validation**:
  - CGPA requirements (minimum threshold checks)
  - Year of Passing (batch-based filtering)
  - Application deadlines
  - Profile completion requirements (80% minimum)
- **Application Flow**: Resume selection modal, confirmation steps, and instant feedback.
- **Job Details**: Comprehensive view with company info, requirements, and application status.

### 3) Track Applications
- **Status Tracking**: Visual timeline showing application progress (Applied → Shortlisted → Interview → Offer).
- **Detailed Cards**: Each application displays job details, application date, salary expectations, required skills, and JD preview.
- **Action Buttons**: "View JD", "View Full JD", and status-specific actions.
- **Historical View**: Past applications with final outcomes and feedback.

### 4) Resume Management
- **Multi-Resume Support**: Upload and manage multiple resume versions.
- **Resume Analysis**: ATS compatibility scoring, keyword optimization suggestions, and format recommendations.
- **Text Extraction**: Automatic parsing of resume content for application matching.
- **PDF Generation**: Download optimized resumes with custom formatting.
- **Default Resume**: Set preferred resume for quick applications.

### 5) Calendar Integration
- **Google Calendar OAuth**: Secure connection for event synchronization.
- **Event Management**: View placement-related events, interview schedules, and academic calendar.
- **Personal Events**: Add custom events and reminders.

### 6) Endorsements System
- **Teacher Endorsements**: Request recommendations from faculty members.
- **Token-Based System**: Secure endorsement links with expiration.
- **Status Tracking**: Pending, received, expired, and cancelled requests.
- **Monthly Limits**: Controlled endorsement requests to prevent spam.

### 7) Placement Resources
- **AI-Powered Guidance**: Chatbot for placement preparation advice.
- **Resource Library**: Articles, tips, and preparation materials.
- **Mock Interviews**: Practice sessions and feedback.
- **Cached Responses**: Offline-capable AI responses for reliability.

### 8) Edit Profile
- **Comprehensive Form**: Multi-section profile management including:
  - Personal Information (name, contact, enrollment ID)
  - Academic Details (CGPA, batch, school, center, qualifications)
  - Skills & Technologies (technical and soft skills)
  - Work Experience (internships, projects)
  - Certifications & Achievements
  - Social Links (LinkedIn, GitHub, portfolio)
  - Profile Photo management
- **Data Validation**: Real-time validation and auto-save functionality.

### 9) Raise Query
- **Multiple Categories**:
  - General inquiries
  - CGPA updates (with document upload)
  - Backlog updates (with proof)
  - Calendar block requests
- **Query History**: Full conversation thread with admin responses.
- **File Attachments**: Support for document uploads in queries.

---

## Recruiter Features (Detailed)

### 1) Recruiter Dashboard
- **Company Overview**: Recent job postings, application counts, and hiring metrics.
- **Activity Snapshot**: Daily/weekly statistics on recruitment activity.
- **Quick Stats**: Total jobs posted, active applications, interview schedules.

### 2) Job Postings Management
- **Job Creation**: Comprehensive form with:
  - Job details (title, description, requirements)
  - Eligibility criteria (CGPA, batch, skills)
  - Salary information and benefits
  - Application deadlines and drive dates
- **Bulk Operations**: Excel upload for multiple job postings.
- **Status Management**: Draft, submitted, approved, posted, closed.
- **Job Editing**: Modify deadlines and drive dates for active postings.

### 3) Interview Sessions
- **Session Configuration**: Multi-round interview setup.
- **Candidate Management**: Shortlist candidates, schedule interviews.
- **Calendar Integration**: Automatic calendar event creation.
- **Feedback Collection**: Interview results and candidate evaluations.

### 4) HR Analytics
- **Job Performance**: Application counts, shortlist rates, offer rates per job.
- **Candidate Pipeline**: Funnel analysis from applications to offers.
- **Time Metrics**: Average time to hire, response times.
- **Recruiter Activity**: Personal posting history and success rates.

### 5) Company History & Tracking
- **Historical Data**: Past job postings with outcomes.
- **Performance Trends**: Year-over-year placement statistics.
- **Candidate Notes**: Internal notes and feedback on applicants.
- **JD Access**: Direct links to job description pages.

### 6) Help & Support
- **MOU Management**: Upload and manage partnership documents.
- **FAQ System**: Company-specific frequently asked questions.
- **Support Queries**: Submit queries to admin team.

### 7) Profile Management
- **Company Details**: Update company information, logo, and contact details.
- **Recruiter Profile**: Personal information and contact preferences.

---

## Admin Features (Detailed)

### 1) Admin Dashboard - Analytics & Insights
The admin dashboard provides comprehensive data-driven insights for effective placement management:

#### Core Statistics
- **Total Jobs Posted**: Count of all approved and active job postings.
- **Active Recruiters**: Number of verified and active recruiting companies.
- **Active Students**: Total enrolled students with complete profiles.
- **Pending Queries**: Open support tickets requiring attention.
- **Total Applications**: Overall application submissions across all jobs.
- **Placed Students**: Students who have received job offers.

#### Advanced Analytics & Charts
- **Placement Trends**: 6-month historical data showing placement rates over time.
- **Recruiter Activity**: Top 10 recruiters by jobs posted and applications received.
- **Query Volume Analysis**: Breakdown of support queries by category (General, CGPA Updates, etc.).
- **School Performance Metrics**: Comparative analysis across schools (SOT, SOM, SOH) including:
  - Placement rates (% of students placed)
  - Application rates (% of students applying)
  - Conversion rates (% of applications leading to offers)
  - Interview eligibility rates

#### Filterable Insights
- **Geographic Filtering**: Filter by center (Bangalore, etc.) and school.
- **Batch Analysis**: Quarter-based filtering (Q1 Pre-placement, Q2 Drive, etc.).
- **Real-time Updates**: Live data refresh for current metrics.

### 2) Job Management
- **Create Jobs**: Manual form entry and Excel bulk upload.
- **Job Moderation**: Approve/reject submissions with feedback.
- **Status Control**: Archive, post, or modify job statuses.
- **Targeting**: Set audience filters (school, center, batch, CGPA).

### 3) User Management
- **Student Directory**: Search, filter, view profiles, block/unblock accounts.
- **Recruiter Directory**: Company management, history tracking, email communication.
- **Bulk Operations**: Export student/recruiter data.

### 4) Interview Management
- **Session Oversight**: Full lifecycle management of interview processes.
- **Scheduling**: Coordinate between recruiters and candidates.
- **Results Tracking**: Monitor outcomes and placement success.

### 5) Communication Tools
- **Announcements**: Targeted messaging by school/batch/center with email delivery.
- **Notifications**: System-wide and individual notifications.
- **Query Management**: Respond to student and recruiter support tickets.

### 6) System Administration
- **Calendar Management**: Create institutional events and schedules.
- **Profile Updates**: Admin profile and avatar management.

---

## Super Admin Features (Detailed)

Super Admins inherit all Admin capabilities plus:

- **Admin User Management**: Create, enable/disable admin accounts, approve requests.
- **Enhanced Analytics**: Advanced filtering by center/school/admin with detailed breakdowns.
- **Recruiter Controls**: Block/unblock recruiters (admin-only feature).
- **Interview Session Control**: Freeze/unfreeze interview sessions for compliance.
- **System-wide Overrides**: Full access to all administrative functions.

---

## Data-Driven Capabilities

### Student Portal Data Utilization
- **Personalized Recommendations**: Job suggestions based on profile matching (skills, CGPA, batch).
- **Eligibility Automation**: Real-time validation against job requirements.
- **Progress Tracking**: Statistical dashboard showing career progression metrics.
- **Resume Optimization**: AI-driven suggestions for better ATS compatibility.

### Recruiter Portal Data Insights
- **Candidate Analytics**: Application funnel analysis and candidate quality metrics.
- **Job Performance**: Conversion rates from applications to offers.
- **Market Intelligence**: Salary trends and skill demand analysis.
- **Recruitment ROI**: Cost and time metrics for hiring processes.

### Admin Portal Advanced Analytics
The admin dashboard leverages comprehensive data aggregation for strategic decision-making:

#### Recommended Additional Stats for Enhanced Insights
- **Application Conversion Funnel**: Detailed breakdown (Applied → Shortlisted → Interviewed → Offered → Accepted).
- **Time-to-Placement Metrics**: Average days from application to offer acceptance.
- **Skill Gap Analysis**: Most demanded skills vs. student skill distribution.
- **Geographic Performance**: Placement rates by center/location.
- **Industry Trends**: Popular job sectors and salary ranges.
- **Diversity Metrics**: Placement distribution across schools, batches, and demographics.
- **Recruiter Effectiveness**: Success rates, response times, and quality of hires.
- **Student Engagement**: Profile completion rates, application frequency, resource utilization.
- **System Performance**: Query resolution times, notification delivery rates.
- **Predictive Analytics**: Placement probability models based on student profiles.

#### Data Sources Integration
- **Student Profiles**: Academic records, skills, experience, achievements.
- **Job Market Data**: Industry requirements, salary benchmarks, demand trends.
- **Application History**: Success rates, feedback, improvement areas.
- **Calendar Events**: Interview schedules, drive timelines, academic calendar.
- **Communication Logs**: Email delivery, notification engagement, query patterns.

---

## Public/Shared Pages
- **Landing Page**: Marketing content, placement statistics showcase, success stories, FAQs.
- **Job Description Page**: Publicly accessible detailed job views with application links.
- **Auth Pages**: Secure login/signup with OTP verification.
- **Public Profiles**: Tokenized student profile sharing for recruiters.
- **Endorsement System**: Secure teacher recommendation submissions.

---

## System Services & Integrations

### Email Types (Comprehensive)
- OTP verification and password reset emails.
- Job posting notifications to targeted students.
- Application status updates (shortlisted, interviewed, offered).
- Interview invitations and scheduling confirmations.
- Offer letters and acceptance confirmations.
- Endorsement requests and completion notifications.
- System announcements and newsletters.
- Drive reminders (7-day, 3-day, 24-hour).
- Recruiter feedback requests.
- Admin query responses.

### Calendar Integration
- OAuth-based Google Calendar connection.
- Role-specific event creation and management.
- Automated interview scheduling.
- Academic calendar synchronization.

### Real-Time Features
- Live application status updates.
- Instant notifications via Socket.IO.
- Real-time dashboard metrics.
- Live job posting updates.

---

## Role-Based Access Summary
- **Student**: `/student` - Personal dashboard, job applications, profile management.
- **Recruiter**: `/recruiter` - Job posting, candidate management, analytics.
- **Admin**: `/admin` - System oversight, user management, analytics.
- **Super Admin**: `/super-admin` - Full system control, advanced analytics.

---

## Technology Stack
- **Backend**: Node.js, Express, PostgreSQL (Prisma ORM), Redis, AWS S3.
- **Frontend**: React, Vite, Tailwind CSS, Socket.IO client.
- **Authentication**: JWT with role-based middleware.
- **Email**: Nodemailer with Gmail SMTP.
- **File Storage**: AWS S3 for resumes and documents.
- **Real-Time**: Socket.IO for notifications.
- **Calendar**: Google Calendar API integration.
