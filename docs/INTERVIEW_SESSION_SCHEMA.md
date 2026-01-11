# Interview Session Schema & Past Applications Tracking

## Overview
This document explains the database schema for the Interview Session system and how past applications tracking works.

---

## Database Schema

### 1. InterviewSession Model
**Purpose**: Represents an interview session for a specific job. One session per job.

```prisma
model InterviewSession {
  id          String   @id @default(uuid())
  jobId       String   @unique           // One session per job
  companyId   String?
  
  status      String   @default("NOT_STARTED")  // NOT_STARTED, ONGOING, COMPLETED
  
  createdBy   String   // Admin user ID who created the session
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  startedAt   DateTime?
  completedAt DateTime?
  
  // Relations
  job                Job                 @relation(...)
  rounds             InterviewRound[]
  interviewerInvites InterviewerInvite[]
}
```

**Key Points:**
- `jobId` is **unique** - only one session per job
- Status flows: `NOT_STARTED` → `ONGOING` → `COMPLETED`
- Session automatically becomes `ONGOING` when first round starts
- Session becomes `COMPLETED` when final round ends

---

### 2. InterviewRound Model
**Purpose**: Represents individual interview rounds within a session.

```prisma
model InterviewRound {
  id          String @id @default(uuid())
  sessionId   String
  roundNumber Int    // 1, 2, 3, etc. (sequential)
  name        String // e.g., "Technical Round 1", "HR Round"
  
  status      String @default("LOCKED")  // LOCKED, ACTIVE, ENDED
  
  startedAt   DateTime?
  endedAt     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  session     InterviewSession  @relation(...)
  evaluations RoundEvaluation[]
  
  @@unique([sessionId, roundNumber])  // Unique round number per session
  @@unique([sessionId, name])         // Unique round name per session
}
```

**Key Points:**
- Rounds are **sequential** (1, 2, 3...)
- Status flows: `LOCKED` → `ACTIVE` → `ENDED`
- Only one round can be `ACTIVE` at a time
- Rounds must be started/ended in order

---

### 3. InterviewerInvite Model
**Purpose**: Token-based access for interviewers (no login required).

```prisma
model InterviewerInvite {
  id        String    @id @default(uuid())
  sessionId String
  email     String    // Interviewer's email
  token     String    @unique  // JWT token for access
  expiresAt DateTime  // Token expiration (30 days)
  
  used      Boolean   @default(false)  // Marked as used when session completes
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  
  // Relations
  session InterviewSession @relation(...)
  
  @@unique([sessionId, email])  // One invite per email per session
}
```

**Key Points:**
- Token-based access (JWT) - no login required
- Tokens are invalidated when session completes
- One unique invite per email per session

---

### 4. RoundEvaluation Model
**Purpose**: Stores individual candidate evaluations for each round.

```prisma
model RoundEvaluation {
  id               String @id @default(uuid())
  roundId          String
  applicationId    String
  interviewerEmail String
  
  status  String?  // SELECTED, REJECTED, ON_HOLD
  remarks String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  round       InterviewRound @relation(...)
  application Application    @relation(...)
  
  @@unique([roundId, applicationId])  // One evaluation per candidate per round
}
```

**Key Points:**
- One evaluation per candidate per round
- Status determines if candidate proceeds to next round
- Only `SELECTED` candidates proceed to next round

---

### 5. Application Model (Extended)
**Purpose**: Application model extended with interview tracking fields.

```prisma
model Application {
  id        String  @id @default(uuid())
  studentId String
  jobId     String
  companyId String?
  
  status        String    @default("APPLIED")  // Standard application status
  appliedDate   DateTime  @default(now())
  interviewDate DateTime?
  
  // Interview status tracking (NEW SYSTEM)
  interviewStatus  String?  // Final status: "SELECTED", "REJECTED_IN_ROUND_1", etc.
  lastRoundReached Int?     @default(0)  // Last round number reached (0 = not started)
  
  notes String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  student          Student           @relation(...)
  job              Job               @relation(...)
  roundEvaluations RoundEvaluation[]  // Link to round evaluations
}
```

**Key Points:**
- `interviewStatus`: Final interview outcome
  - `"SELECTED"` - Selected in final round
  - `"REJECTED_IN_ROUND_1"`, `"REJECTED_IN_ROUND_2"`, etc. - Rejected in specific round
- `lastRoundReached`: Tracks how far candidate progressed
  - `0` = Not started
  - `1` = Completed Round 1
  - `2` = Completed Round 2, etc.

---

## How Past Applications Tracking Works

### 1. Application Creation
When a student applies for a job:
- An `Application` record is created
- `status` = `"APPLIED"`
- `interviewStatus` = `null`
- `lastRoundReached` = `0`

### 2. Session Creation
When admin creates an interview session:
- `InterviewSession` record created for the job
- `status` = `"NOT_STARTED"`
- Rounds are configured (`InterviewRound` records)
- Interviewers are invited (`InterviewerInvite` records)

### 3. Round Progression

#### Round 1 Start:
- Session status: `NOT_STARTED` → `ONGOING`
- Round status: `LOCKED` → `ACTIVE`
- Candidates: All applications for the job

#### Round Evaluation:
- Interviewer evaluates each candidate
- `RoundEvaluation` records created with status:
  - `SELECTED` - Proceeds to next round
  - `REJECTED` - Eliminated
  - `ON_HOLD` - Hold for later decision

#### Round End:
When a round ends, **Application statuses are updated**:

**For REJECTED candidates:**
```javascript
Application.interviewStatus = `REJECTED_IN_ROUND_${roundNumber}`
Application.lastRoundReached = roundNumber
```

**For SELECTED candidates (not final round):**
```javascript
Application.lastRoundReached = roundNumber
// interviewStatus remains null (will be set later)
```

**For SELECTED candidates (final round):**
```javascript
Application.interviewStatus = "SELECTED"
Application.lastRoundReached = roundNumber
```

#### Next Round Start:
- Only `SELECTED` candidates from previous round proceed
- Round status: `LOCKED` → `ACTIVE`
- Process repeats

### 4. Session Completion
When the final round ends:
- Session status: `ONGOING` → `COMPLETED`
- All interviewer tokens are invalidated (`used = true`)
- All selected candidates have `interviewStatus = "SELECTED"`

---

## Querying Past Applications (Student View)

### API Endpoint: `GET /api/applications/student`

**Process:**
1. Fetch all applications for the student
2. Fetch interview sessions for those jobs
3. Fetch all round evaluations for those applications
4. Map evaluations to build interview history

**Response Format:**
```javascript
{
  id: "app-id",
  studentId: "student-id",
  jobId: "job-id",
  companyId: "company-id",
  status: "APPLIED",  // Standard status
  appliedDate: "2024-01-15",
  interviewDate: null,
  company: { name: "Company Name" },
  job: { jobTitle: "Software Engineer", ... },
  interviewStatus: {
    hasSession: true,              // Whether interview session exists
    statusText: "Rejected in Technical Round 1",  // Human-readable status
    lastRoundStatus: "Rejected in Technical Round 1",  // Detailed status
    lastRoundReached: 1            // Last round number reached
  }
}
```

**Status Text Examples:**
- `"Selected"` - Selected in final round
- `"Rejected in Technical Round 1"` - Rejected in Round 1
- `"Rejected in HR Round"` - Rejected in HR Round
- `"On Hold in Technical Round 2"` - On hold in Round 2
- `"Interview Ongoing - Technical Round 2"` - Currently in progress
- `"Interview Not Started"` - Session created but not started
- `"Applied"` - No interview session yet

---

## Data Flow Diagram

```
Application Created
    ↓
Interview Session Created (NOT_STARTED)
    ↓
Rounds Configured (LOCKED)
    ↓
Interviewers Invited
    ↓
Round 1 Started (ACTIVE)
    ↓
Candidates Evaluated → RoundEvaluation Created
    ↓
Round 1 Ended (ENDED)
    ├─→ REJECTED → Application.interviewStatus = "REJECTED_IN_ROUND_1"
    └─→ SELECTED → Application.lastRoundReached = 1
        ↓
    Round 2 Started (ACTIVE) [Only SELECTED candidates]
        ↓
    Candidates Evaluated → RoundEvaluation Created
        ↓
    Round 2 Ended (ENDED)
        ├─→ REJECTED → Application.interviewStatus = "REJECTED_IN_ROUND_2"
        └─→ SELECTED → Application.lastRoundReached = 2
            ↓
        ... (more rounds if any)
            ↓
        Final Round Ended
            ├─→ REJECTED → Application.interviewStatus = "REJECTED_IN_ROUND_N"
            └─→ SELECTED → Application.interviewStatus = "SELECTED"
                ↓
            Session Completed (COMPLETED)
            └─→ All tokens invalidated
```

---

## Key Relationships

1. **Job → InterviewSession**: One-to-one (unique jobId)
2. **InterviewSession → InterviewRound**: One-to-many (multiple rounds)
3. **InterviewSession → InterviewerInvite**: One-to-many (multiple interviewers)
4. **InterviewRound → RoundEvaluation**: One-to-many (multiple candidates)
5. **Application → RoundEvaluation**: One-to-many (one per round)
6. **Student → Application**: One-to-many (multiple applications)

---

## Status Enums

### InterviewSession Status:
- `NOT_STARTED` - Session created but no rounds started
- `ONGOING` - At least one round has started
- `COMPLETED` - All rounds completed

### InterviewRound Status:
- `LOCKED` - Round not yet started
- `ACTIVE` - Round currently in progress
- `ENDED` - Round completed

### RoundEvaluation Status:
- `SELECTED` - Candidate selected for next round (or final selection)
- `REJECTED` - Candidate rejected in this round
- `ON_HOLD` - Candidate on hold (decision pending)

### Application.interviewStatus:
- `"SELECTED"` - Selected in final round
- `"REJECTED_IN_ROUND_1"` - Rejected in round 1
- `"REJECTED_IN_ROUND_2"` - Rejected in round 2
- ... (pattern continues for each round)

---

## Important Business Rules

1. **One Session Per Job**: Enforced by unique constraint on `jobId`
2. **Sequential Round Unlocking**: Round N+1 can only start after Round N ends
3. **One Active Round**: Only one round can be `ACTIVE` at a time
4. **Candidate Filtering**: Only `SELECTED` candidates from previous round proceed
5. **All Candidates Must Be Evaluated**: Cannot end a round until all candidates have evaluations
6. **Token Invalidation**: All interviewer tokens are invalidated when session completes
7. **Automatic Session Completion**: Session completes automatically when final round ends

---

## Query Examples

### Get all interview history for a student:
```sql
SELECT 
  a.id,
  a.interviewStatus,
  a.lastRoundReached,
  j.jobTitle,
  c.name as companyName
FROM applications a
JOIN jobs j ON a.jobId = j.id
LEFT JOIN companies c ON j.companyId = c.id
WHERE a.studentId = ?
ORDER BY a.appliedDate DESC
```

### Get round evaluations for an application:
```sql
SELECT 
  re.status,
  re.remarks,
  ir.roundNumber,
  ir.name as roundName
FROM round_evaluations re
JOIN interview_rounds ir ON re.roundId = ir.id
WHERE re.applicationId = ?
ORDER BY ir.roundNumber ASC
```

### Get session status and rounds:
```sql
SELECT 
  is.status as sessionStatus,
  ir.roundNumber,
  ir.name as roundName,
  ir.status as roundStatus
FROM interview_sessions is
LEFT JOIN interview_rounds ir ON is.id = ir.sessionId
WHERE is.jobId = ?
ORDER BY ir.roundNumber ASC
```

---

## Summary

The interview session system tracks:
1. **Session-level** progress (NOT_STARTED → ONGOING → COMPLETED)
2. **Round-level** progress (LOCKED → ACTIVE → ENDED)
3. **Candidate-level** progress (via RoundEvaluation)
4. **Application-level** final status (via interviewStatus and lastRoundReached)

This allows students to see:
- Which rounds they completed
- Where they were rejected
- Whether they were selected
- Overall interview progress for each application
