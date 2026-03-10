# Student Recommendation & Sharing Plan
## Filter Best Performers & Share with Recruiters

## Overview
This document outlines the plan to implement a feature where admins can:
1. Filter students based on performance criteria
2. Identify best performers
3. Share/export student lists with recruiters

---

## Current State Analysis

### ✅ What Exists:
1. **Student Directory** (`StudentDirectory.jsx`)
   - Filter by: Center, School, Status, CGPA range
   - Search by: Name, Email, Enrollment ID
   - CSV Export functionality

2. **Recruiter Directory** (`RecruiterDirectory.jsx`)
   - View all recruiters with company info
   - Filter by: Status, Location, Job count
   - Actions: Send Email, View Jobs, Block/Unblock, View History
   - Shows recruiter activity history and job postings
   - **Missing:** No way to share students with recruiters

3. **Student Data Available:**
   - CGPA (Float)
   - Stats: `statsApplied`, `statsShortlisted`, `statsInterviewed`, `statsOffers`
   - Academic: `batch`, `center`, `school`
   - Skills, Projects, Achievements, Certifications
   - Coding Profiles (LeetCode, Codeforces, etc.)

4. **Recruiter Access:**
   - Recruiters can view applications for their jobs
   - No direct access to student directory
   - No "recommended students" feature
   - No way to receive shared student lists

### ❌ What's Missing:
1. Performance-based filtering (best performers)
2. Share/export to specific recruiters
3. Recommended students feature
4. Performance scoring/ranking system

---

## Plan of Action

### Phase 1: Enhanced Filtering & Performance Metrics

#### 1.1 Add Performance-Based Filters
**Location:** `frontend/src/components/dashboard/admin/StudentDirectory.jsx`

**New Filter Options:**
```javascript
// Add to filter state
const [filters, setFilters] = useState({
  center: '',
  school: '',
  status: '',
  minCgpa: '',
  maxCgpa: '',
  // NEW FILTERS:
  minOffers: '',           // Minimum number of offers
  minShortlisted: '',      // Minimum shortlisted count
  hasResume: false,        // Has uploaded resume
  hasCodingProfiles: false, // Has coding profiles filled
  performanceScore: '',    // Performance score range
  placementStatus: '',     // 'placed', 'not_placed', 'in_process'
});
```

#### 1.2 Calculate Performance Score
**Location:** `backend/src/controllers/students.js` or frontend service

**Performance Score Formula:**
```javascript
function calculatePerformanceScore(student) {
  let score = 0;
  
  // CGPA Weight: 30%
  if (student.cgpa) {
    score += (student.cgpa / 10) * 30; // Normalize to 0-30
  }
  
  // Application Success Rate: 25%
  const totalApplied = student.statsApplied || 1;
  const successRate = ((student.statsShortlisted || 0) / totalApplied) * 100;
  score += (successRate / 100) * 25;
  
  // Interview Success: 20%
  const totalInterviewed = student.statsInterviewed || 0;
  const interviewSuccess = totalInterviewed > 0 
    ? ((student.statsOffers || 0) / totalInterviewed) * 100 
    : 0;
  score += (interviewSuccess / 100) * 20;
  
  // Offers Received: 15%
  const offers = student.statsOffers || 0;
  score += Math.min(offers * 3, 15); // Max 15 points
  
  // Profile Completeness: 10%
  let profileScore = 0;
  if (student.resumeUrl) profileScore += 2;
  if (student.linkedin) profileScore += 1;
  if (student.githubUrl) profileScore += 1;
  if (student.skills?.length > 0) profileScore += 2;
  if (student.projects?.length > 0) profileScore += 2;
  if (student.achievements?.length > 0) profileScore += 1;
  if (student.codingProfiles?.length > 0) profileScore += 1;
  score += profileScore;
  
  return Math.round(score * 10) / 10; // Round to 1 decimal
}
```

#### 1.3 Add "Best Performers" Quick Filter
**UI Component:**
```javascript
// Quick filter buttons
<button onClick={() => setQuickFilter('top_performers')}>
  Top Performers (Score > 70)
</button>
<button onClick={() => setQuickFilter('high_cgpa')}>
  High CGPA (> 8.0)
</button>
<button onClick={() => setQuickFilter('multiple_offers')}>
  Multiple Offers (2+)
</button>
<button onClick={() => setQuickFilter('ready_for_placement')}>
  Ready for Placement
</button>
```

---

### Phase 2: Share with Recruiters Feature

#### 2.1 Create "Share Students" Modal
**Location:** `frontend/src/components/dashboard/admin/ShareStudentsModal.jsx`

**Features:**
- Select recruiter(s) from dropdown (with search)
- Preview selected students
- Add custom message/notes
- Options: Email, Export CSV, Generate Share Link
- Can be opened from:
  - Student Directory (with pre-selected students)
  - Recruiter Directory (with pre-selected recruiter)

#### 2.2 Integrate with Recruiter Directory
**Location:** `frontend/src/components/dashboard/admin/RecruiterDirectory.jsx`

**New Features:**
- Add "Share Students" action button for each recruiter
- Show badge/count of shared students per recruiter
- Add "View Shared Students" link (opens modal with shared students)
- Quick share: Click button → Select students → Share

#### 2.2 Backend API Endpoints
**Location:** `backend/src/routes/students.js` & `backend/src/controllers/students.js`

**New Endpoints:**
```javascript
// POST /api/students/share
// Share student list with recruiter
{
  recruiterId: string,
  studentIds: string[],
  message: string,
  shareMethod: 'email' | 'csv' | 'link'
}

// GET /api/students/recommended/:jobId
// Get recommended students for a specific job
// Based on job requirements (skills, CGPA, etc.)

// POST /api/students/export
// Export filtered students with custom format
```

#### 2.3 Database Schema Updates
**Location:** `backend/prisma/schema.prisma`

**New Model:**
```prisma
model StudentShare {
  id          String   @id @default(uuid())
  adminId     String   // Admin who shared
  recruiterId String   // Recruiter receiving the share
  studentIds  String   // JSON array of student IDs
  message     String?
  shareMethod String   // 'email', 'csv', 'link'
  shareLink   String?  // If shareMethod is 'link'
  expiresAt   DateTime?
  viewedAt    DateTime?
  createdAt   DateTime @default(now())
  
  admin       User     @relation(fields: [adminId], references: [id])
  recruiter   User     @relation(fields: [recruiterId], references: [id])
  
  @@index([recruiterId, createdAt(sort: Desc)])
  @@map("student_shares")
}
```

---

### Phase 3: Recommended Students for Jobs

#### 3.1 Job-Based Student Matching
**Location:** `backend/src/controllers/students.js`

**Matching Algorithm:**
```javascript
async function getRecommendedStudentsForJob(jobId) {
  // 1. Get job requirements
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  
  // 2. Parse job requirements
  const requiredSkills = JSON.parse(job.requiredSkills || '[]');
  const minCgpa = job.minCgpa || 0;
  const targetSchools = JSON.parse(job.targetSchools || '[]');
  const targetCenters = JSON.parse(job.targetCenters || '[]');
  const targetBatches = JSON.parse(job.targetBatches || '[]');
  
  // 3. Find matching students
  const students = await prisma.student.findMany({
    where: {
      // Academic filters
      ...(minCgpa && { cgpa: { gte: minCgpa } }),
      ...(targetSchools.length && { school: { in: targetSchools } }),
      ...(targetCenters.length && { center: { in: targetCenters } }),
      ...(targetBatches.length && { batch: { in: targetBatches } }),
      // Not already placed
      status: { not: 'PLACED' },
    },
    include: {
      skills: true,
      applications: {
        where: { jobId },
        select: { id: true }
      }
    }
  });
  
  // 4. Score and rank students
  const scoredStudents = students.map(student => {
    const score = calculateMatchScore(student, job, requiredSkills);
    return { ...student, matchScore: score };
  });
  
  // 5. Sort by match score and return top N
  return scoredStudents
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 50); // Top 50 matches
}

function calculateMatchScore(student, job, requiredSkills) {
  let score = 0;
  
  // Skills match: 40%
  const studentSkills = student.skills.map(s => s.skillName.toLowerCase());
  const matchedSkills = requiredSkills.filter(skill => 
    studentSkills.includes(skill.toLowerCase())
  );
  score += (matchedSkills.length / requiredSkills.length) * 40;
  
  // CGPA match: 30%
  if (student.cgpa && job.minCgpa) {
    const cgpaRatio = Math.min(student.cgpa / job.minCgpa, 1.5);
    score += (cgpaRatio / 1.5) * 30;
  }
  
  // Performance score: 20%
  const perfScore = calculatePerformanceScore(student);
  score += (perfScore / 100) * 20;
  
  // Profile completeness: 10%
  const completeness = calculateProfileCompleteness(student);
  score += (completeness / 100) * 10;
  
  return Math.round(score * 10) / 10;
}
```

#### 3.2 UI Component: "Recommended Students" Tab
**Location:** `frontend/src/components/dashboard/admin/JobDetails.jsx` or new component

**Features:**
- Show recommended students for a job
- Display match score and reasons
- Quick actions: Share, Export, View Profile
- Filter by match score threshold

---

### Phase 4: Implementation Steps

#### Step 1: Backend - Performance Scoring
1. Add `calculatePerformanceScore` function
2. Add endpoint: `GET /api/students/performance-score/:studentId`
3. Add endpoint: `GET /api/students?sortBy=performance&limit=50`

#### Step 2: Frontend - Enhanced Filters
1. Add performance filters to `StudentDirectory.jsx`
2. Add "Best Performers" quick filter buttons
3. Add performance score column to student table
4. Add sorting by performance score

#### Step 3: Backend - Share Feature
1. Create `StudentShare` model in Prisma
2. Add share endpoints
3. Add email notification for shared students
4. Add share link generation (with expiration)

#### Step 4: Frontend - Share Modal
1. Create `ShareStudentsModal.jsx`
2. Add "Share" button in StudentDirectory
3. Add "Share Students" button in RecruiterDirectory (for each recruiter)
4. Integrate with backend share API
5. Add success/error notifications

#### Step 5: Job-Based Recommendations
1. Add recommendation algorithm
2. Add endpoint: `GET /api/students/recommended/:jobId`
3. Create UI component for job recommendations
4. Add "Recommend Students" button in job details

---

## Database Schema Changes

### New Table: `student_shares`
```prisma
model StudentShare {
  id          String   @id @default(uuid())
  adminId     String
  recruiterId String
  studentIds  String   // JSON array: ["id1", "id2", ...]
  message     String?
  shareMethod String   // 'email', 'csv', 'link'
  shareLink   String?  @unique
  expiresAt   DateTime?
  viewedAt    DateTime?
  createdAt   DateTime @default(now())
  
  admin       User     @relation("AdminShares", fields: [adminId], references: [id])
  recruiter   User     @relation("RecruiterShares", fields: [recruiterId], references: [id])
  
  @@index([recruiterId, createdAt(sort: Desc)])
  @@index([adminId, createdAt(sort: Desc)])
  @@map("student_shares")
}
```

### Update User Model:
```prisma
model User {
  // ... existing fields
  sharedStudentsAsAdmin    StudentShare[] @relation("AdminShares")
  receivedStudentShares    StudentShare[] @relation("RecruiterShares")
}
```

---

## API Endpoints to Create

### 1. Performance & Filtering
```
GET  /api/students/performance-score/:studentId
GET  /api/students?sortBy=performance&minScore=70&limit=50
GET  /api/students/best-performers?center=BANGALORE&school=SOT
```

### 2. Share with Recruiters
```
POST /api/students/share
  Body: {
    recruiterId: string,
    studentIds: string[],
    message?: string,
    shareMethod: 'email' | 'csv' | 'link'
  }

GET  /api/students/shares/:shareId
GET  /api/students/shares/recruiter/:recruiterId
GET  /api/recruiters/:recruiterId/shared-students  # Get all students shared with recruiter
DELETE /api/students/shares/:shareId
```

### 3. Job Recommendations
```
GET  /api/students/recommended/:jobId?limit=50
GET  /api/jobs/:jobId/recommended-students
```

---

## UI Components to Create/Modify

### 1. Enhanced StudentDirectory.jsx
- Add performance score column
- Add "Best Performers" filter section
- Add "Share Selected" button
- Add sorting by performance score

### 2. ShareStudentsModal.jsx (New)
- Recruiter selection dropdown (with search)
- Student preview list
- Message/notes textarea
- Share method selection (Email/CSV/Link)
- Preview before sharing
- Can be opened from:
  - Student Directory (share selected students)
  - Recruiter Directory (share students to specific recruiter)

### 3. Enhanced RecruiterDirectory.jsx
- Add "Share Students" action button for each recruiter
- Show indicator if recruiter has received shared students
- Add "View Shared Students" link/button
- Display count of shared students per recruiter

### 3. RecommendedStudentsPanel.jsx (New)
- Show recommended students for a job
- Match score visualization
- Quick share/export actions
- Filter by match score

### 4. PerformanceScoreBadge.jsx (New)
- Visual badge showing performance score
- Color-coded (Green: 70+, Yellow: 50-70, Red: <50)

---

## User Flow

### Admin Flow - From Student Directory:
1. Go to Student Directory
2. Apply filters (Center, School, CGPA, Performance Score)
3. Click "Best Performers" quick filter
4. Select students (checkboxes)
5. Click "Share with Recruiter"
6. Select recruiter(s) from dropdown
7. Add optional message
8. Choose share method (Email/CSV/Link)
9. Click "Share"
10. Recruiter receives notification/email

### Admin Flow - From Recruiter Directory:
1. Go to Recruiter Directory
2. Find target recruiter
3. Click "Share Students" action button
4. Modal opens with student selection/search
5. Filter and select students to share
6. Add optional message
7. Choose share method
8. Click "Share"
9. Recruiter receives notification/email

### Recruiter Flow:
1. Receive notification/email about shared students
2. Click link or download CSV
3. View student profiles (limited access)
4. See shared students in recruiter dashboard (if feature exists)
5. Contact students through portal (if feature exists)

---

## Security & Privacy Considerations

1. **Data Privacy:**
   - Only share necessary information (name, CGPA, skills, resume)
   - Don't share personal contact info without consent
   - Add consent checkbox for students

2. **Access Control:**
   - Only admins can share students
   - Recruiters can only view shared students
   - Share links expire after 30 days
   - Track who viewed shared data

3. **Audit Trail:**
   - Log all share actions
   - Track recruiter access to shared data
   - Maintain history of shares

---

## Future Enhancements

1. **Smart Recommendations:**
   - ML-based matching
   - Learn from successful placements
   - Improve recommendations over time

2. **Bulk Operations:**
   - Share multiple student lists
   - Schedule automatic sharing
   - Recurring recommendations

3. **Analytics:**
   - Track share effectiveness
   - See which students get most interest
   - Placement success rate from shares

4. **Student Consent:**
   - Allow students to opt-in/opt-out
   - Let students see who viewed their profile
   - Privacy controls

---

## Implementation Priority

### High Priority (Phase 1):
1. ✅ Performance score calculation
2. ✅ Enhanced filtering in StudentDirectory
3. ✅ "Best Performers" quick filter
4. ✅ CSV export with performance data

### Medium Priority (Phase 2):
1. ⚠️ Share modal UI
2. ⚠️ Backend share endpoints
3. ⚠️ Email notification for shares
4. ⚠️ Share link generation
5. ⚠️ **Integrate share button in RecruiterDirectory**
6. ⚠️ **Show shared students count in RecruiterDirectory**

### Low Priority (Phase 3):
1. 📋 Job-based recommendations
2. 📋 Match scoring algorithm
3. 📋 Recommended students UI
4. 📋 Analytics dashboard
5. 📋 **Recruiter dashboard view for shared students**

---

## Estimated Effort

- **Phase 1:** 2-3 days (Backend scoring + Frontend filters)
- **Phase 2:** 3-4 days (Share feature + UI)
- **Phase 3:** 4-5 days (Recommendations + Matching)

**Total:** ~9-12 days of development

---

## Notes

- Start with Phase 1 (filtering) as it's most valuable
- CSV export already exists, just enhance it
- Performance scoring can be calculated on-the-fly (no DB changes needed)
- Share feature requires new DB table and API endpoints
- Job recommendations are advanced but very useful
- **Recruiter Directory integration is important** - admins should be able to share students directly from recruiter list
- Consider adding a "Shared Students" tab in RecruiterDirectory for quick access
- Recruiters should see shared students in their dashboard (future enhancement)

