# Job Description Page - Mock Data Issue Analysis & Action Plan

## Issue Summary
The Job Description page is showing mock/fallback data instead of real job data for every job. All jobs display the same generic content regardless of what was actually entered during job creation.

---

## Question 1: Screening Link Expiration

**Answer: 14 days**

The screening link sent to recruiters is active for **14 days** from the date it's generated.

**Location:**
- `backend/src/services/screeningEmailService.js` (line 16): JWT token expires in `14d`
- `backend/src/services/screeningEmailService.js` (line 94): Session expires in 14 days

---

## Question 2: Mock Data Issue - Root Cause Analysis

### Problems Identified

#### 1. **Field Mapping Mismatch in JobContent.jsx**

**Location:** `frontend/src/components/dashboard/student/JobContent.jsx` (lines 214-244)

**Issue:** The normalization function doesn't map backend fields to frontend expected fields:

- ❌ **Job Description**: Frontend checks `displayJob.jobDescription` (line 330), but backend returns `description`
- ❌ **Responsibilities**: Frontend checks `displayJob.responsibilities` (line 351), but backend returns `description` (same field)
- ❌ **Skills**: Frontend expects array, but backend returns `requiredSkills` as JSON string (line 225 doesn't parse it)
- ❌ **Interview Rounds**: Frontend checks `displayJob.interviewRounds` (line 387), but backend stores rounds in `requirements` field as text

#### 2. **Mock Data Fallbacks Are Too Aggressive**

**Location:** `frontend/src/components/dashboard/student/JobContent.jsx`

- **Line 329-345**: Uses mock job description if `jobDescription` is empty (but should check `description`)
- **Line 347-380**: Uses mock responsibilities if `responsibilities` is empty (but should check `description`)
- **Line 272-326**: Uses default skills if `skills` is empty (but `requiredSkills` JSON string isn't parsed)
- **Line 383-489**: Falls back to `defaultInterviewTimeline` if rounds not found (but rounds are in `requirements` text)

#### 3. **Backend Response Structure**

**Location:** `backend/src/controllers/jobs.js` (line 199-236)

Backend returns:
```javascript
{
  success: true,
  data: {
    description: "...",           // Job description text
    requiredSkills: "[...]",       // JSON string array
    requirements: "I Round: DSA\nII Round: HR\n...",  // Interview rounds as text
    // ... other fields
  }
}
```

But frontend expects:
```javascript
{
  jobDescription: "...",          // ❌ Not mapped
  responsibilities: "...",          // ❌ Not mapped
  skills: [...],                   // ❌ Not parsed from JSON string
  interviewRounds: [...],          // ❌ Not parsed from requirements text
}
```

#### 4. **API Response Wrapper**

**Location:** `frontend/src/services/jobs.js` (line 63-71)

The `getJob()` function calls `api.getJob(jobId)` which returns:
```javascript
{
  success: true,
  data: { ...jobData }
}
```

But the code might be expecting just `jobData` directly, causing the actual data to be nested under `.data`.

---

## Action Plan

### Step 1: Fix Field Mapping in JobContent.jsx Normalization

**File:** `frontend/src/components/dashboard/student/JobContent.jsx` (lines 214-244)

**Changes Needed:**
1. Map `description` → `jobDescription` AND `responsibilities`
2. Parse `requiredSkills` JSON string → `skills` array
3. Parse `requirements` text → `interviewRounds` array (using the Roman numeral regex we already added)
4. Ensure all backend fields are properly mapped

### Step 2: Fix API Response Handling

**File:** `frontend/src/services/jobs.js` (line 63-71)

**Changes Needed:**
1. Check if response has `data` wrapper: `response.data || response`
2. Return the actual job object, not the wrapper

### Step 3: Update JobContent.jsx to Use Correct Fields

**File:** `frontend/src/components/dashboard/student/JobContent.jsx`

**Changes Needed:**
1. Line 330: Check `displayJob.description` instead of `displayJob.jobDescription`
2. Line 351: Check `displayJob.description` for responsibilities (or map it properly)
3. Line 272: Ensure `requiredSkills` JSON string is parsed before use
4. Line 436: The requirements parsing for rounds should work (already has Roman numeral support)

### Step 4: Verify Backend Returns All Fields

**File:** `backend/src/controllers/jobs.js` (line 199-236)

**Verification Needed:**
1. Ensure `description` field is returned
2. Ensure `requiredSkills` is returned (as JSON string)
3. Ensure `requirements` field contains interview rounds text
4. Ensure all job fields are included in the response

### Step 5: Test Data Flow

1. Create a job with:
   - Description: "JOB DESCRIPTION Job Title: Backend Engineer..."
   - Skills: "Python, SQL, PostgreSQL..."
   - Rounds: "I Round: DSA, II Round: HR, III Round: FINAL"
2. View job description page
3. Verify all fields show real data, not mock data

---

## Specific Code Locations to Fix

### Priority 1: Critical Field Mappings

1. **JobContent.jsx line 215-244**: Add proper field mapping
   ```javascript
   // Add to normalization:
   jobDescription: job.description || job.jobDescription,
   responsibilities: job.description || job.responsibilities,  // Same as description
   skills: (() => {
     const skills = job.requiredSkills || job.skills || [];
     if (typeof skills === 'string') {
       try { return JSON.parse(skills); } catch { return []; }
     }
     return Array.isArray(skills) ? skills : [];
   })(),
   interviewRounds: job.interviewRounds || parseRoundsFromRequirements(job.requirements),
   ```

2. **JobContent.jsx line 330**: Change check from `jobDescription` to `description`
3. **JobContent.jsx line 351**: Change check to use `description` field
4. **jobs.js line 65**: Handle `response.data` wrapper

### Priority 2: Interview Rounds Parsing

The Roman numeral parsing we added to `JobDescription.jsx` needs to be added to `JobContent.jsx` as well (line 436 area).

---

## Expected Outcome

After fixes:
- ✅ Job description shows actual entered text
- ✅ Skills show actual entered skills (Python, SQL, etc.)
- ✅ Interview rounds show actual rounds (I Round: DSA, II Round: HR, III Round: FINAL)
- ✅ Responsibilities show actual job description content
- ✅ No more generic mock data for every job

---

## Testing Checklist

- [ ] Create job with custom description
- [ ] Create job with custom skills
- [ ] Create job with custom interview rounds
- [ ] View job description page
- [ ] Verify description matches input
- [ ] Verify skills match input
- [ ] Verify rounds match input
- [ ] Verify no mock/fallback data appears

