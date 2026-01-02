-- CreateTable: EndorsementToken
CREATE TABLE "endorsement_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" DATETIME,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherName" TEXT,
    "teacherRole" TEXT,
    "organization" TEXT,
    CONSTRAINT "endorsement_tokens_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex: Unique token
CREATE UNIQUE INDEX "endorsement_tokens_token_key" ON "endorsement_tokens"("token");

-- CreateIndex: Token lookup
CREATE INDEX "endorsement_tokens_token_idx" ON "endorsement_tokens"("token");

-- CreateIndex: Student tokens
CREATE INDEX "endorsement_tokens_studentId_createdAt_idx" ON "endorsement_tokens"("studentId", "createdAt" DESC);

-- CreateIndex: Email lookup
CREATE INDEX "endorsement_tokens_email_idx" ON "endorsement_tokens"("email");

-- CreateIndex: Used and expiration
CREATE INDEX "endorsement_tokens_used_expiresAt_idx" ON "endorsement_tokens"("used", "expiresAt");

-- AlterTable: Add endorsementsData to students
-- Note: This is a no-op if the column already exists (db push may have added it)
-- SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS, so we check first
-- If column exists, this will be a no-op in production migrations
