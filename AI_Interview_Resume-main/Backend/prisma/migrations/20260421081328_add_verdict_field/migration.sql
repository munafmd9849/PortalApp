-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InterviewReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "jobTitle" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "jobDescription" TEXT NOT NULL,
    "resumeText" TEXT NOT NULL,
    "resumeFileName" TEXT NOT NULL DEFAULT '',
    "atsScore" INTEGER NOT NULL DEFAULT 0,
    "atsBreakdown" TEXT NOT NULL,
    "matchedKeywords" TEXT NOT NULL,
    "missingKeywords" TEXT NOT NULL,
    "atsSuggestions" TEXT NOT NULL,
    "verdict" TEXT NOT NULL DEFAULT '',
    "matchPercentage" INTEGER NOT NULL DEFAULT 0,
    "strengths" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "skillGaps" TEXT NOT NULL,
    "interviewQuestions" TEXT NOT NULL,
    "preparationPlan" TEXT NOT NULL,
    "rawModelOutput" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InterviewReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InterviewReport" ("atsBreakdown", "atsScore", "atsSuggestions", "company", "createdAt", "id", "interviewQuestions", "jobDescription", "jobTitle", "matchPercentage", "matchedKeywords", "missingKeywords", "preparationPlan", "rawModelOutput", "resumeFileName", "resumeText", "skillGaps", "strengths", "updatedAt", "userId", "weaknesses") SELECT "atsBreakdown", "atsScore", "atsSuggestions", "company", "createdAt", "id", "interviewQuestions", "jobDescription", "jobTitle", "matchPercentage", "matchedKeywords", "missingKeywords", "preparationPlan", "rawModelOutput", "resumeFileName", "resumeText", "skillGaps", "strengths", "updatedAt", "userId", "weaknesses" FROM "InterviewReport";
DROP TABLE "InterviewReport";
ALTER TABLE "new_InterviewReport" RENAME TO "InterviewReport";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
