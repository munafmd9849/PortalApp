# d-PORTAL

Placement portal with role-based dashboards for students, recruiters, admins, and super admins.

## Overview
d-PORTAL is a full-stack placement management system that supports job posting, applications, interview scheduling, endorsements, notifications, and analytics. The application has distinct experiences for Students, Recruiters, Admins, and Super Admins, plus public pages for marketing and job descriptions.

## Core Modules (All Roles)
- **Authentication**: Email/password login and verification, OTP-based flows, password reset, and role-based access.
- **Notifications**: In-app notifications with optional email sending.
- **Calendar**: Google Calendar OAuth integration with role-based event management.
- **Job Descriptions**: Dedicated Job Description page with structured job content, tabs, and print/share UI hooks.
- **Email System**: Centralized mail service supports OTP, announcements, job notifications, application updates, endorsements, and reminders.

---

## Student Features (Detailed)

### 1) Dashboard (Overview)
- Profile completion status and prompts.
- Career stats (applied, shortlisted, interviewed, offers).
- Recent applications and job suggestions.
- Quick access to core actions (apply, view details, track progress).

### 2) Explore Jobs
- Paginated job list with filters.
- Eligibility checks before apply:
  - CGPA requirement.
  - Year of Passing (derived from batch).
  - Application deadline.
  - Profile completion.
- Apply flow with resume selection modal.
- Job Description page link for full details.

### 3) Track Applications
- Current and past views.
- Application status badges and stage labels.
- Expandable cards with job details, dates, salary, skills, and JD preview.
- "View JD" and "View Full JD" actions.

### 4) Resume Management
- Upload multiple resumes.
- Set default resume.
- Delete resumes.
- Resume text extraction.
- ATS analysis.
- PDF generation.

### 5) Calendar
- Connect Google Calendar (OAuth).
- View events and session-related schedule information.

### 6) Endorsements
- Request endorsement emails to teachers.
- View pending, received, expired endorsements.
- Cancel pending requests.
- Monthly request limits enforced.

### 7) Placement Resources
- AI-assisted guidance for placement preparation.
- Cached fallback responses if AI is unavailable.

### 8) Edit Profile
- Comprehensive profile editing:
  - Personal details.
  - Academic details (CGPA, batch, qualifications).
  - Skills and certifications.
  - Experience, projects, achievements.
  - Social links.
  - Profile image upload/delete.

### 9) Raise Query
- Multiple request types:
  - General questions.
  - CGPA update (with proof upload).
  - Backlog update (with proof upload).
  - Calendar block request.
- Full query history with admin responses.

---

## Recruiter Features (Detailed)

### 1) Recruiter Dashboard
- Recruiter-specific metrics and recent applications for posted jobs.
- Snapshot of hiring activity.

### 2) Job Postings
- Create and submit job postings.
- View job lists (drafts/posted).
- Edit deadlines and drive dates for posted jobs.

### 3) Interview Sessions
- Manage interview sessions for recruiter's jobs.
- Configure rounds and scheduling flow.

### 4) HR Analytics
- Metrics on recruiter's job activity, postings, and drive outcomes.

### 5) Company History / Job Track
- Historical view of posted jobs.
- Add recruiter notes after drives.
- Link to JD view.

### 6) Help & Support
- MOU document upload and management.
- FAQ content.

### 7) Raise Query
- Submit queries and track admin responses.

### 8) Recruiter Profile
- Update recruiter profile and company details.

> Note: Recruiter calendar UI exists but currently uses placeholder data in the UI layer.

---

## Admin Features (Detailed)

### 1) Admin Dashboard
- Global stats, trends, and activity metrics.
- Placement and recruiter activity snapshots.

### 2) Create Job
- Manual creation form.
- JD parsing via file upload.
- Excel bulk upload.
- Validation for deadline/drive date relationships.
- Draft and submission flow.

### 3) Manage Jobs
- In-review vs posted job lists.
- Approve, reject, archive.
- Target audience selection.
- Edit posted job dates.

### 4) Applicants Hub
- Company/job-based applicant listing.
- Filters, pagination, and job notes.
- Links to student profiles.

### 5) Interview Scheduling
- Full interview session management.
- Round configuration, invites, and session lifecycle.

### 6) Calendar
- Create, update, and delete events (role-gated).

### 7) Student Directory
- Search, filter, and manage student profiles.
- Block/unblock students.
- Export support.

### 8) Recruiter Directory
- Search/filter recruiters.
- View recruiter history and jobs.
- Send recruiter emails.
- Block/unblock (Super Admin only).

### 9) Announcements
- Targeted announcements (school/batch/center).
- Optional email delivery.
- History of announcements.

### 10) Notifications
- Review queries and respond.
- Admin notifications management.

### 11) Admin Profile
- Update profile details and avatar.

---

## Super Admin Features (Detailed)

Super Admins have all Admin capabilities plus:
- **Admin Management**: Create, enable, disable admin accounts.
- **Admin Requests**: Approve or reject admin requests.
- **Advanced Analytics**: Enhanced filter panels and statistics by center/school/admin.
- **Recruiter Block/Unblock**: Explicit super-admin-only controls.
- **Interview Session Freeze/Unfreeze**: Super-admin-only workflow.

---

## Public/Shared Pages
- **Landing Page**: Marketing content, placements showcase, FAQs, and call-to-actions.
- **Job Description Page**: Publicly accessible detailed job view.
- **Auth Pages**: Login, signup, and password reset flows.
- **Public Profile**: View student public profiles (tokenized/ID-based).
- **Endorsement Links**: Tokenized endorsement submission.

---

## System Services & Integrations

### Email Types (Implemented)
- OTP verification email.
- Password reset OTP email.
- Recruiter job posted notification.
- Application notifications (recruiter + applicant).
- New job notification to students (bulk).
- Application status updates.
- Generic notification emails.
- Endorsement magic link email.
- Endorsement request email.
- Drive thank-you email.
- Announcements email.
- Drive reminders (7d/3d/24h).
- Interviewer invite emails.
- Screening/deadline recruiter emails.

### Calendar
- OAuth connection flow.
- Role-based event creation and updates.

---

## Role-Based Access Summary
- **Student**: `/student`
- **Recruiter**: `/recruiter`
- **Admin**: `/admin`
- **Super Admin**: `/super-admin`
- Role gating enforced at routing and backend middleware.

---

## Notes / Known UI Placeholders
- Recruiter calendar UI currently uses placeholder data (no real API wiring).
