-- CreateTable
CREATE TABLE "interview_sessions" (
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

-- CreateTable
CREATE TABLE "interview_rounds" (
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

-- CreateTable
CREATE TABLE "interviewer_invites" (
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

-- CreateTable
CREATE TABLE "round_evaluations" (
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

-- CreateIndex
CREATE UNIQUE INDEX "interview_sessions_jobId_key" ON "interview_sessions"("jobId");

-- CreateIndex
CREATE INDEX "interview_sessions_status_createdAt_idx" ON "interview_sessions"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "interview_sessions_jobId_idx" ON "interview_sessions"("jobId");

-- CreateIndex
CREATE INDEX "interview_sessions_createdBy_idx" ON "interview_sessions"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "interview_rounds_sessionId_roundNumber_key" ON "interview_rounds"("sessionId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "interview_rounds_sessionId_name_key" ON "interview_rounds"("sessionId", "name");

-- CreateIndex
CREATE INDEX "interview_rounds_sessionId_roundNumber_idx" ON "interview_rounds"("sessionId", "roundNumber");

-- CreateIndex
CREATE INDEX "interview_rounds_status_idx" ON "interview_rounds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "interviewer_invites_token_key" ON "interviewer_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "interviewer_invites_sessionId_email_key" ON "interviewer_invites"("sessionId", "email");

-- CreateIndex
CREATE INDEX "interviewer_invites_token_idx" ON "interviewer_invites"("token");

-- CreateIndex
CREATE INDEX "interviewer_invites_sessionId_idx" ON "interviewer_invites"("sessionId");

-- CreateIndex
CREATE INDEX "interviewer_invites_email_idx" ON "interviewer_invites"("email");

-- CreateIndex
CREATE INDEX "interviewer_invites_used_expiresAt_idx" ON "interviewer_invites"("used", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "round_evaluations_roundId_applicationId_key" ON "round_evaluations"("roundId", "applicationId");

-- CreateIndex
CREATE INDEX "round_evaluations_roundId_idx" ON "round_evaluations"("roundId");

-- CreateIndex
CREATE INDEX "round_evaluations_applicationId_idx" ON "round_evaluations"("applicationId");

-- CreateIndex
CREATE INDEX "round_evaluations_status_idx" ON "round_evaluations"("status");

-- Add columns to applications table
ALTER TABLE "applications" ADD COLUMN "currentStatus" TEXT;
ALTER TABLE "applications" ADD COLUMN "lastRoundReached" INTEGER DEFAULT 0;

-- CreateIndex
CREATE INDEX "applications_currentStatus_idx" ON "applications"("currentStatus");
