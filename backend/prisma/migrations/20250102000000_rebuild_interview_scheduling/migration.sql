-- Rebuild Interview Scheduling System
-- Migration: 20250102000000_rebuild_interview_scheduling

-- Create interview_sessions table
CREATE TABLE IF NOT EXISTS "interview_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "companyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "interview_sessions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create interview_rounds table
CREATE TABLE IF NOT EXISTS "interview_rounds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOCKED',
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "interview_rounds_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create interviewer_invites table
CREATE TABLE IF NOT EXISTS "interviewer_invites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interviewer_invites_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create round_evaluations table
CREATE TABLE IF NOT EXISTS "round_evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "interviewerEmail" TEXT NOT NULL,
    "status" TEXT,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "round_evaluations_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "interview_rounds" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "round_evaluations_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add columns to applications table (SQLite doesn't support IF NOT EXISTS, so we check first)
-- Note: These columns may already exist, so the migration might fail - that's okay

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "interview_sessions_jobId_key" ON "interview_sessions"("jobId");
CREATE INDEX IF NOT EXISTS "interview_sessions_status_createdAt_idx" ON "interview_sessions"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "interview_sessions_jobId_idx" ON "interview_sessions"("jobId");
CREATE INDEX IF NOT EXISTS "interview_sessions_createdBy_idx" ON "interview_sessions"("createdBy");

CREATE UNIQUE INDEX IF NOT EXISTS "interview_rounds_sessionId_roundNumber_key" ON "interview_rounds"("sessionId", "roundNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "interview_rounds_sessionId_name_key" ON "interview_rounds"("sessionId", "name");
CREATE INDEX IF NOT EXISTS "interview_rounds_sessionId_roundNumber_idx" ON "interview_rounds"("sessionId", "roundNumber");
CREATE INDEX IF NOT EXISTS "interview_rounds_status_idx" ON "interview_rounds"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "interviewer_invites_token_key" ON "interviewer_invites"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "interviewer_invites_sessionId_email_key" ON "interviewer_invites"("sessionId", "email");
CREATE INDEX IF NOT EXISTS "interviewer_invites_token_idx" ON "interviewer_invites"("token");
CREATE INDEX IF NOT EXISTS "interviewer_invites_sessionId_idx" ON "interviewer_invites"("sessionId");
CREATE INDEX IF NOT EXISTS "interviewer_invites_email_idx" ON "interviewer_invites"("email");
CREATE INDEX IF NOT EXISTS "interviewer_invites_used_expiresAt_idx" ON "interviewer_invites"("used", "expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "round_evaluations_roundId_applicationId_key" ON "round_evaluations"("roundId", "applicationId");
CREATE INDEX IF NOT EXISTS "round_evaluations_roundId_idx" ON "round_evaluations"("roundId");
CREATE INDEX IF NOT EXISTS "round_evaluations_applicationId_idx" ON "round_evaluations"("applicationId");
CREATE INDEX IF NOT EXISTS "round_evaluations_status_idx" ON "round_evaluations"("status");

CREATE INDEX IF NOT EXISTS "applications_interviewStatus_idx" ON "applications"("interviewStatus");
