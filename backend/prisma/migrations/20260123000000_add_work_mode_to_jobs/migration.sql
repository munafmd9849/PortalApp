-- AlterTable
-- Add workMode and jobType columns to jobs table (schema has them, DB may be missing them)
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "workMode" TEXT;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "jobType" TEXT;
