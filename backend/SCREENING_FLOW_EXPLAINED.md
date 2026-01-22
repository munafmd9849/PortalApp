# Screening Flow & Interview Candidate Issue - Explained

## Current Status ✅

Based on database checks:
- **5 candidates** have `screeningStatus: 'INTERVIEW_ELIGIBLE'` ✅
- **Job requires**: Screening + Test ✅
- **Backend query** should return 5 candidates ✅

## The Flow

### 1. Screening Process
1. Students apply → `screeningStatus: 'APPLIED'`
2. Resume screening → `'SCREENING_SELECTED'` or `'SCREENING_REJECTED'`
3. Test/QA → `'TEST_SELECTED'` or `'TEST_REJECTED'`
4. **Finalize screening** → `'TEST_SELECTED'` → `'INTERVIEW_ELIGIBLE'`

### 2. Interview Eligibility
- When a candidate passes test (`TEST_SELECTED`), they should be marked as `INTERVIEW_ELIGIBLE`
- This happens automatically when you mark them as "Passed" in screening
- **OR** when you click "Finalize Screening" (it converts remaining `TEST_SELECTED` to `INTERVIEW_ELIGIBLE`)

### 3. Interview Round Candidates
- Backend only returns candidates with `screeningStatus: 'INTERVIEW_ELIGIBLE'` for the first round
- This is enforced in `backend/src/controllers/interviews.js` line 531

## Why Candidates Aren't Showing

### ✅ Database Status: CORRECT
All 5 qualified candidates have `INTERVIEW_ELIGIBLE` status.

### 🔍 Potential Issues

1. **Round Name Mismatch** (MOST LIKELY)
   - Backend expects exact round name match
   - Frontend might be passing URL-encoded or different name
   - **FIX**: Added URL decoding in backend ✅

2. **Screening Not Finalized**
   - Screening page shows "ongoing" status
   - However, candidates can still appear if they have `INTERVIEW_ELIGIBLE` status
   - Finalization just locks decisions, doesn't affect eligibility

3. **API Call Error** (Silent Failure)
   - Frontend might be catching errors silently
   - **FIX**: Added detailed logging ✅

## What Was Fixed

### 1. Backend Round Name Matching
- Added URL decoding for round names
- Checks both encoded and decoded versions
- Added comprehensive logging

### 2. Frontend Error Logging
- Added detailed console logging
- Logs request parameters and responses
- Better error messages

## Testing Steps

1. **Check Browser Console**
   - Open DevTools → Console
   - Navigate to Assessment page
   - Look for:
     - `🔍 [Assessment] Loading candidates: { interviewId, roundName }`
     - `✅ [Assessment] Candidates loaded: { count: 5 }`

2. **Check Backend Logs**
   - Look in terminal where backend is running
   - Should see:
     - `📋 [getRoundCandidates] Request: { interviewId, roundName, decodedRoundName }`
     - `✅ [getRoundCandidates] Round found at index: 0`
     - `✅ [getRoundCandidates] Returning candidates: { count: 5 }`

3. **Check Network Tab**
   - Open DevTools → Network
   - Filter by "candidates"
   - Check the API response
   - Should show 5 candidates in the response

## Expected Behavior

### Screening Page
- Shows all applications with their status
- "Finalize Screening" button locks all decisions
- **Status can remain "ongoing"** - this doesn't prevent candidates from appearing

### Interview Session
- After starting a round, candidates should appear
- All candidates with `INTERVIEW_ELIGIBLE` status should be visible

## Commands Available

```bash
# Check screening status
npm run db:check-screening

# Fix screening finalization (converts TEST_SELECTED → INTERVIEW_ELIGIBLE)
npm run db:fix-screening

# Check interview candidates
npm run db:check-interview-candidates
```

## Summary

✅ **Database is correct** - 5 candidates have `INTERVIEW_ELIGIBLE`  
✅ **Backend logic is correct** - should return 5 candidates  
✅ **Fixes applied** - URL decoding and logging  

🔍 **If still not working**, check:
1. Browser console for frontend errors
2. Backend terminal for API logs
3. Network tab for API response
4. Round name matches exactly (case-sensitive)

The screening page can remain "ongoing" - that's fine. The important thing is that candidates have `INTERVIEW_ELIGIBLE` status, which they do.
