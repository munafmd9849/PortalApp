-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" DATETIME,
    "recruiterVerified" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "profilePhoto" TEXT,
    "blockInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'VERIFY_EMAIL',
    "expiresAt" DATETIME NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "cgpa" REAL,
    "batch" TEXT NOT NULL,
    "center" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "bio" TEXT,
    "headline" TEXT,
    "city" TEXT,
    "stateRegion" TEXT,
    "jobFlexibility" TEXT,
    "linkedin" TEXT,
    "githubUrl" TEXT,
    "youtubeUrl" TEXT,
    "leetcode" TEXT,
    "codeforces" TEXT,
    "gfg" TEXT,
    "hackerrank" TEXT,
    "resumeUrl" TEXT,
    "resumeFileName" TEXT,
    "resumeUploadedAt" DATETIME,
    "statsApplied" INTEGER NOT NULL DEFAULT 0,
    "statsShortlisted" INTEGER NOT NULL DEFAULT 0,
    "statsInterviewed" INTEGER NOT NULL DEFAULT 0,
    "statsOffers" INTEGER NOT NULL DEFAULT 0,
    "emailNotificationsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "skills_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "education" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "cgpa" REAL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "education_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "technologies" TEXT NOT NULL,
    "githubUrl" TEXT,
    "liveUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "projects_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" DATETIME,
    "hasCertificate" BOOLEAN NOT NULL DEFAULT false,
    "certificateUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "achievements_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issuedDate" DATETIME,
    "expiryDate" DATETIME,
    "certificateUrl" TEXT,
    "issuer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "certifications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "coding_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "username" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "coding_profiles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "location" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "recruiters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "companyName" TEXT,
    "location" TEXT,
    "relationshipType" TEXT,
    "zone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recruiters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recruiters_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "requiredSkills" TEXT NOT NULL,
    "companyId" TEXT,
    "recruiterId" TEXT,
    "companyName" TEXT,
    "salary" TEXT,
    "ctc" TEXT,
    "salaryRange" TEXT,
    "location" TEXT,
    "companyLocation" TEXT,
    "driveDate" DATETIME,
    "applicationDeadline" DATETIME,
    "jobType" TEXT,
    "experienceLevel" TEXT,
    "driveVenues" TEXT NOT NULL,
    "spocs" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isPosted" BOOLEAN NOT NULL DEFAULT false,
    "targetSchools" TEXT NOT NULL,
    "targetCenters" TEXT NOT NULL,
    "targetBatches" TEXT NOT NULL,
    "submittedAt" DATETIME,
    "postedAt" DATETIME,
    "postedBy" TEXT,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "rejectedAt" DATETIME,
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "archivedAt" DATETIME,
    "archivedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "jobs_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "recruiters" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_tracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "isNew" BOOLEAN NOT NULL DEFAULT true,
    "viewed" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" DATETIME,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_tracking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "job_tracking_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "companyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "appliedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interviewDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "applications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL DEFAULT 'default',
    "originalText" TEXT NOT NULL DEFAULT '',
    "enhancedText" TEXT NOT NULL DEFAULT '',
    "previewMode" TEXT NOT NULL DEFAULT 'original',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "email_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recipients" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "error" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "student_queries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "respondedBy" TEXT,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "student_queries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admin_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "rejectedAt" DATETIME,
    "rejectedBy" TEXT,
    CONSTRAINT "admin_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "otps_email_purpose_isUsed_idx" ON "otps"("email", "purpose", "isUsed");

-- CreateIndex
CREATE INDEX "otps_expiresAt_idx" ON "otps"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "students_userId_key" ON "students"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_enrollmentId_key" ON "students"("enrollmentId");

-- CreateIndex
CREATE INDEX "students_center_batch_idx" ON "students"("center", "batch");

-- CreateIndex
CREATE INDEX "students_school_batch_idx" ON "students"("school", "batch");

-- CreateIndex
CREATE INDEX "students_emailNotificationsDisabled_createdAt_idx" ON "students"("emailNotificationsDisabled", "createdAt");

-- CreateIndex
CREATE INDEX "skills_studentId_skillName_idx" ON "skills"("studentId", "skillName");

-- CreateIndex
CREATE UNIQUE INDEX "skills_studentId_skillName_key" ON "skills"("studentId", "skillName");

-- CreateIndex
CREATE INDEX "education_studentId_endYear_idx" ON "education"("studentId", "endYear" DESC);

-- CreateIndex
CREATE INDEX "projects_studentId_createdAt_idx" ON "projects"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "achievements_studentId_createdAt_idx" ON "achievements"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "certifications_studentId_issuedDate_idx" ON "certifications"("studentId", "issuedDate" DESC);

-- CreateIndex
CREATE INDEX "coding_profiles_studentId_platform_idx" ON "coding_profiles"("studentId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "coding_profiles_studentId_platform_key" ON "coding_profiles"("studentId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "recruiters_userId_key" ON "recruiters"("userId");

-- CreateIndex
CREATE INDEX "recruiters_userId_idx" ON "recruiters"("userId");

-- CreateIndex
CREATE INDEX "jobs_status_createdAt_idx" ON "jobs"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "jobs_isActive_createdAt_idx" ON "jobs"("isActive", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "jobs_recruiterId_createdAt_idx" ON "jobs"("recruiterId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "jobs_isPosted_createdAt_idx" ON "jobs"("isPosted", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "job_tracking_studentId_createdAt_idx" ON "job_tracking"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "job_tracking_jobId_idx" ON "job_tracking"("jobId");

-- CreateIndex
CREATE INDEX "job_tracking_studentId_viewed_idx" ON "job_tracking"("studentId", "viewed");

-- CreateIndex
CREATE UNIQUE INDEX "job_tracking_studentId_jobId_key" ON "job_tracking"("studentId", "jobId");

-- CreateIndex
CREATE INDEX "applications_studentId_appliedDate_idx" ON "applications"("studentId", "appliedDate" DESC);

-- CreateIndex
CREATE INDEX "applications_studentId_createdAt_idx" ON "applications"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "applications_jobId_createdAt_idx" ON "applications"("jobId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "applications_status_createdAt_idx" ON "applications"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "applications_studentId_jobId_key" ON "applications"("studentId", "jobId");

-- CreateIndex
CREATE INDEX "resumes_userId_resumeId_idx" ON "resumes"("userId", "resumeId");

-- CreateIndex
CREATE UNIQUE INDEX "resumes_userId_resumeId_key" ON "resumes"("userId", "resumeId");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "email_notifications_status_createdAt_idx" ON "email_notifications"("status", "createdAt");

-- CreateIndex
CREATE INDEX "email_notifications_jobId_createdAt_idx" ON "email_notifications"("jobId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "student_queries_studentId_createdAt_idx" ON "student_queries"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "student_queries_status_createdAt_idx" ON "student_queries"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "admin_requests_status_requestedAt_idx" ON "admin_requests"("status", "requestedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "admins_userId_key" ON "admins"("userId");

-- CreateIndex
CREATE INDEX "admins_userId_idx" ON "admins"("userId");
