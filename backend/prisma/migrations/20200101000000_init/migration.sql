-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "recruiterVerified" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "profilePhoto" TEXT,
    "blockInfo" TEXT,
    "googleCalendarConnected" BOOLEAN NOT NULL DEFAULT false,
    "connectedGoogleEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'VERIFY_EMAIL',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "profile_completed" BOOLEAN NOT NULL DEFAULT false,
    "cgpa" DECIMAL(65,30),
    "backlogs" TEXT,
    "batch" TEXT NOT NULL,
    "center" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "bio" TEXT,
    "headline" TEXT,
    "summary" TEXT,
    "city" TEXT,
    "stateRegion" TEXT,
    "jobFlexibility" TEXT,
    "profileImageUrl" TEXT,
    "profileImagePublicId" TEXT,
    "linkedin" TEXT,
    "githubUrl" TEXT,
    "youtubeUrl" TEXT,
    "leetcode" TEXT,
    "codeforces" TEXT,
    "gfg" TEXT,
    "hackerrank" TEXT,
    "otherProfiles" TEXT,
    "resumeUrl" TEXT,
    "resumeFileName" TEXT,
    "resumeUploadedAt" TIMESTAMP(3),
    "statsApplied" INTEGER NOT NULL DEFAULT 0,
    "statsShortlisted" INTEGER NOT NULL DEFAULT 0,
    "statsInterviewed" INTEGER NOT NULL DEFAULT 0,
    "statsOffers" INTEGER NOT NULL DEFAULT 0,
    "emailNotificationsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "publicProfileId" TEXT,
    "publicProfileShowEmail" BOOLEAN NOT NULL DEFAULT true,
    "publicProfileShowPhone" BOOLEAN NOT NULL DEFAULT false,
    "endorsementsData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "cgpa" DECIMAL(65,30),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "technologies" TEXT NOT NULL,
    "githubUrl" TEXT,
    "liveUrl" TEXT,
    "ai_summary" TEXT,
    "ai_bullets" TEXT,
    "skills_extracted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "hasCertificate" BOOLEAN NOT NULL DEFAULT false,
    "certificateUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issuedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "issuer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coding_profiles" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coding_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "companyName" TEXT,
    "location" TEXT,
    "relationshipType" TEXT,
    "zone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruiters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_mou_documents" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "publicId" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_mou_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "requiredSkills" TEXT NOT NULL,
    "companyId" TEXT,
    "recruiterId" TEXT,
    "companyName" TEXT,
    "recruiterEmail" TEXT,
    "recruiterName" TEXT,
    "recruiterEmails" TEXT,
    "salary" TEXT,
    "ctc" TEXT,
    "salaryRange" TEXT,
    "location" TEXT,
    "companyLocation" TEXT,
    "driveDate" TIMESTAMP(3),
    "applicationDeadline" TIMESTAMP(3) NOT NULL,
    "jobType" TEXT,
    "workMode" TEXT,
    "experienceLevel" TEXT,
    "driveVenues" TEXT NOT NULL,
    "reportingTime" TEXT,
    "qualification" TEXT,
    "specialization" TEXT,
    "yop" TEXT,
    "minCgpa" TEXT,
    "gapAllowed" TEXT,
    "gapYears" TEXT,
    "backlogs" TEXT,
    "spocs" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_REVIEW',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isPosted" BOOLEAN NOT NULL DEFAULT false,
    "applicationDeadlineMailSent" BOOLEAN NOT NULL DEFAULT false,
    "driveReminder7dSent" BOOLEAN NOT NULL DEFAULT false,
    "driveReminder3dSent" BOOLEAN NOT NULL DEFAULT false,
    "driveReminder24hSent" BOOLEAN NOT NULL DEFAULT false,
    "adminNote" TEXT,
    "recruiterNote" TEXT,
    "interviewRounds" TEXT,
    "requiresScreening" BOOLEAN NOT NULL DEFAULT false,
    "requiresTest" BOOLEAN NOT NULL DEFAULT false,
    "targetSchools" TEXT NOT NULL,
    "targetCenters" TEXT NOT NULL,
    "targetBatches" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archivedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_tracking" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "isNew" BOOLEAN NOT NULL DEFAULT true,
    "viewed" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "companyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "appliedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interviewDate" TIMESTAMP(3),
    "screeningStatus" TEXT DEFAULT 'APPLIED',
    "screeningRemarks" TEXT,
    "screeningCompletedAt" TIMESTAMP(3),
    "interviewStatus" TEXT,
    "lastRoundReached" INTEGER DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL DEFAULT 'default',
    "originalText" TEXT NOT NULL DEFAULT '',
    "enhancedText" TEXT NOT NULL DEFAULT '',
    "previewMode" TEXT NOT NULL DEFAULT 'original',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_resume_files" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "publicId" TEXT NOT NULL,
    "title" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_resume_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_notifications" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recipients" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_queries" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'question',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "metadata" TEXT DEFAULT '{}',
    "response" TEXT,
    "respondedBy" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endorsements" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tokenId" TEXT,
    "endorserName" TEXT NOT NULL,
    "endorserEmail" TEXT NOT NULL,
    "endorserRole" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "context" TEXT,
    "message" TEXT NOT NULL,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "skillRatings" TEXT,
    "overallRating" INTEGER,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endorsement_tokens" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherName" TEXT,
    "teacherRole" TEXT,
    "organization" TEXT,

    CONSTRAINT "endorsement_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,

    CONSTRAINT "admin_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "targetSchools" TEXT,
    "targetBatches" TEXT,
    "targetCenters" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_calendar_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiryDate" TIMESTAMP(3),
    "scope" TEXT,
    "connectedGoogleEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_calendar_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "companyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "currentRound" TEXT,
    "rounds" TEXT NOT NULL DEFAULT '[]',
    "totalCandidates" INTEGER NOT NULL DEFAULT 0,
    "doneCandidates" INTEGER NOT NULL DEFAULT 0,
    "pendingCandidates" INTEGER NOT NULL DEFAULT 0,
    "selectedCandidates" INTEGER NOT NULL DEFAULT 0,
    "onHoldCandidates" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "sessionToken" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_evaluations" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "roundName" TEXT NOT NULL,
    "marks" DOUBLE PRECISION,
    "remarks" TEXT,
    "status" TEXT,
    "evaluatedBy" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_activities" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "studentId" TEXT,
    "roundName" TEXT,
    "activityType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_sessions" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "companyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_rounds" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOCKED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviewer_invites" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interviewer_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_evaluations" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "interviewerEmail" TEXT NOT NULL,
    "status" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "round_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_screening_sessions" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_screening_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_name" TEXT,
    "actor_role" TEXT,
    "actor_id" TEXT,
    "action_type" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

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
CREATE UNIQUE INDEX "students_publicProfileId_key" ON "students"("publicProfileId");

-- CreateIndex
CREATE INDEX "students_center_idx" ON "students"("center");

-- CreateIndex
CREATE INDEX "students_school_idx" ON "students"("school");

-- CreateIndex
CREATE INDEX "students_batch_idx" ON "students"("batch");

-- CreateIndex
CREATE INDEX "students_emailNotificationsDisabled_createdAt_idx" ON "students"("emailNotificationsDisabled", "createdAt");

-- CreateIndex
CREATE INDEX "skills_studentId_skillName_idx" ON "skills"("studentId", "skillName");

-- CreateIndex
CREATE UNIQUE INDEX "skills_studentId_skillName_key" ON "skills"("studentId", "skillName");

-- CreateIndex
CREATE INDEX "education_studentId_endYear_idx" ON "education"("studentId", "endYear" DESC);

-- CreateIndex
CREATE INDEX "experiences_studentId_start_idx" ON "experiences"("studentId", "start" DESC);

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
CREATE INDEX "recruiter_mou_documents_recruiterId_idx" ON "recruiter_mou_documents"("recruiterId");

-- CreateIndex
CREATE INDEX "jobs_status_createdAt_idx" ON "jobs"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "jobs_isActive_createdAt_idx" ON "jobs"("isActive", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "jobs_recruiterId_createdAt_idx" ON "jobs"("recruiterId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "jobs_isPosted_createdAt_idx" ON "jobs"("isPosted", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "jobs_applicationDeadline_applicationDeadlineMailSent_status_idx" ON "jobs"("applicationDeadline", "applicationDeadlineMailSent", "status");

-- CreateIndex
CREATE INDEX "jobs_targetSchools_idx" ON "jobs"("targetSchools");

-- CreateIndex
CREATE INDEX "jobs_targetCenters_idx" ON "jobs"("targetCenters");

-- CreateIndex
CREATE INDEX "jobs_targetBatches_idx" ON "jobs"("targetBatches");

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
CREATE INDEX "applications_interviewStatus_idx" ON "applications"("interviewStatus");

-- CreateIndex
CREATE INDEX "applications_screeningStatus_idx" ON "applications"("screeningStatus");

-- CreateIndex
CREATE UNIQUE INDEX "applications_studentId_jobId_key" ON "applications"("studentId", "jobId");

-- CreateIndex
CREATE INDEX "resumes_userId_resumeId_idx" ON "resumes"("userId", "resumeId");

-- CreateIndex
CREATE UNIQUE INDEX "resumes_userId_resumeId_key" ON "resumes"("userId", "resumeId");

-- CreateIndex
CREATE INDEX "student_resume_files_studentId_uploadedAt_idx" ON "student_resume_files"("studentId", "uploadedAt" DESC);

-- CreateIndex
CREATE INDEX "student_resume_files_studentId_isDefault_idx" ON "student_resume_files"("studentId", "isDefault");

-- CreateIndex
CREATE INDEX "student_resume_files_userId_uploadedAt_idx" ON "student_resume_files"("userId", "uploadedAt" DESC);

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
CREATE UNIQUE INDEX "endorsements_tokenId_key" ON "endorsements"("tokenId");

-- CreateIndex
CREATE INDEX "endorsements_studentId_createdAt_idx" ON "endorsements"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "endorsements_endorserEmail_idx" ON "endorsements"("endorserEmail");

-- CreateIndex
CREATE INDEX "endorsements_consent_idx" ON "endorsements"("consent");

-- CreateIndex
CREATE UNIQUE INDEX "endorsement_tokens_token_key" ON "endorsement_tokens"("token");

-- CreateIndex
CREATE INDEX "endorsement_tokens_token_idx" ON "endorsement_tokens"("token");

-- CreateIndex
CREATE INDEX "endorsement_tokens_studentId_createdAt_idx" ON "endorsement_tokens"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "endorsement_tokens_email_idx" ON "endorsement_tokens"("email");

-- CreateIndex
CREATE INDEX "endorsement_tokens_used_expiresAt_idx" ON "endorsement_tokens"("used", "expiresAt");

-- CreateIndex
CREATE INDEX "admin_requests_status_requestedAt_idx" ON "admin_requests"("status", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "announcements_createdAt_idx" ON "announcements"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "admins_userId_key" ON "admins"("userId");

-- CreateIndex
CREATE INDEX "admins_userId_idx" ON "admins"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_tokens_userId_key" ON "google_calendar_tokens"("userId");

-- CreateIndex
CREATE INDEX "google_calendar_tokens_userId_idx" ON "google_calendar_tokens"("userId");

-- CreateIndex
CREATE INDEX "google_calendar_tokens_connectedGoogleEmail_idx" ON "google_calendar_tokens"("connectedGoogleEmail");

-- CreateIndex
CREATE UNIQUE INDEX "interviews_jobId_key" ON "interviews"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "interviews_sessionToken_key" ON "interviews"("sessionToken");

-- CreateIndex
CREATE INDEX "interviews_status_startedAt_idx" ON "interviews"("status", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "interviews_jobId_idx" ON "interviews"("jobId");

-- CreateIndex
CREATE INDEX "interviews_createdBy_idx" ON "interviews"("createdBy");

-- CreateIndex
CREATE INDEX "interviews_sessionToken_idx" ON "interviews"("sessionToken");

-- CreateIndex
CREATE INDEX "interview_evaluations_interviewId_roundName_idx" ON "interview_evaluations"("interviewId", "roundName");

-- CreateIndex
CREATE INDEX "interview_evaluations_studentId_idx" ON "interview_evaluations"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_evaluations_interviewId_studentId_roundName_key" ON "interview_evaluations"("interviewId", "studentId", "roundName");

-- CreateIndex
CREATE INDEX "interview_activities_interviewId_createdAt_idx" ON "interview_activities"("interviewId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "interview_activities_activityType_idx" ON "interview_activities"("activityType");

-- CreateIndex
CREATE UNIQUE INDEX "interview_sessions_jobId_key" ON "interview_sessions"("jobId");

-- CreateIndex
CREATE INDEX "interview_sessions_status_createdAt_idx" ON "interview_sessions"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "interview_sessions_jobId_idx" ON "interview_sessions"("jobId");

-- CreateIndex
CREATE INDEX "interview_sessions_createdBy_idx" ON "interview_sessions"("createdBy");

-- CreateIndex
CREATE INDEX "interview_rounds_sessionId_roundNumber_idx" ON "interview_rounds"("sessionId", "roundNumber");

-- CreateIndex
CREATE INDEX "interview_rounds_status_idx" ON "interview_rounds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "interview_rounds_sessionId_roundNumber_key" ON "interview_rounds"("sessionId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "interview_rounds_sessionId_name_key" ON "interview_rounds"("sessionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "interviewer_invites_token_key" ON "interviewer_invites"("token");

-- CreateIndex
CREATE INDEX "interviewer_invites_token_idx" ON "interviewer_invites"("token");

-- CreateIndex
CREATE INDEX "interviewer_invites_sessionId_idx" ON "interviewer_invites"("sessionId");

-- CreateIndex
CREATE INDEX "interviewer_invites_email_idx" ON "interviewer_invites"("email");

-- CreateIndex
CREATE INDEX "interviewer_invites_used_expiresAt_idx" ON "interviewer_invites"("used", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "interviewer_invites_sessionId_email_key" ON "interviewer_invites"("sessionId", "email");

-- CreateIndex
CREATE INDEX "round_evaluations_roundId_idx" ON "round_evaluations"("roundId");

-- CreateIndex
CREATE INDEX "round_evaluations_applicationId_idx" ON "round_evaluations"("applicationId");

-- CreateIndex
CREATE INDEX "round_evaluations_status_idx" ON "round_evaluations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "round_evaluations_roundId_applicationId_key" ON "round_evaluations"("roundId", "applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_screening_sessions_jobId_key" ON "recruiter_screening_sessions"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_screening_sessions_token_key" ON "recruiter_screening_sessions"("token");

-- CreateIndex
CREATE INDEX "recruiter_screening_sessions_token_idx" ON "recruiter_screening_sessions"("token");

-- CreateIndex
CREATE INDEX "recruiter_screening_sessions_jobId_idx" ON "recruiter_screening_sessions"("jobId");

-- CreateIndex
CREATE INDEX "recruiter_screening_sessions_expiresAt_idx" ON "recruiter_screening_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_actor_role_idx" ON "audit_logs"("actor_role");

-- CreateIndex
CREATE INDEX "audit_logs_action_type_idx" ON "audit_logs"("action_type");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_idx" ON "audit_logs"("target_type");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coding_profiles" ADD CONSTRAINT "coding_profiles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_mou_documents" ADD CONSTRAINT "recruiter_mou_documents_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "recruiters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "recruiters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_tracking" ADD CONSTRAINT "job_tracking_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_tracking" ADD CONSTRAINT "job_tracking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_resume_files" ADD CONSTRAINT "student_resume_files_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_queries" ADD CONSTRAINT "student_queries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "endorsement_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsement_tokens" ADD CONSTRAINT "endorsement_tokens_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_requests" ADD CONSTRAINT "admin_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_tokens" ADD CONSTRAINT "google_calendar_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_evaluations" ADD CONSTRAINT "interview_evaluations_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_evaluations" ADD CONSTRAINT "interview_evaluations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_activities" ADD CONSTRAINT "interview_activities_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_rounds" ADD CONSTRAINT "interview_rounds_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviewer_invites" ADD CONSTRAINT "interviewer_invites_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_evaluations" ADD CONSTRAINT "round_evaluations_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_evaluations" ADD CONSTRAINT "round_evaluations_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "interview_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_screening_sessions" ADD CONSTRAINT "recruiter_screening_sessions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

