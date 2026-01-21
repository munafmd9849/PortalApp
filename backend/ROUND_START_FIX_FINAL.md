# Round Start Fix - correctedSession Scope Issue

## Issue
When trying to start rounds after the first round (e.g., Round 2, Round 3), the backend was throwing:
```
ReferenceError: correctedSession is not defined
```

## Root Cause
The `correctedSession` variable was defined inside the `if (round.roundNumber === 1)` block, but it was being used outside that block for subsequent rounds at line 1322.

## Fix Applied
Moved the `correctedSession` definition **before** the first-round check so it's available for **ALL rounds**:

### Before (Broken):
```javascript
if (round.roundNumber === 1) {
  // ... first round checks ...
  const correctedSession = await autoCorrectSessionStatus(...); // ❌ Only defined for round 1
  // ...
}

if (round.roundNumber > 1) {
  // ...
  where: { id: correctedSession.jobId }, // ❌ ReferenceError: correctedSession is not defined
}
```

### After (Fixed):
```javascript
// CRITICAL: Get session with job and auto-correct session status (needed for ALL rounds)
const sessionWithJob = await prisma.interviewSession.findUnique({...});
const correctedSession = await autoCorrectSessionStatus(sessionWithJob, sessionWithJob.job); // ✅ Available for all rounds

// Reject if session is already COMPLETED or INCOMPLETE (applies to ALL rounds)
if (correctedSession.status === 'COMPLETED') {...}
if (correctedSession.status === 'INCOMPLETE') {...}

if (round.roundNumber === 1) {
  // ... first round specific checks ...
}

if (round.roundNumber > 1) {
  // ...
  where: { id: correctedSession.jobId }, // ✅ Now works correctly
}
```

## Impact
✅ **All rounds can now start** - not just the first round  
✅ **Proper validation** - session status is checked for all rounds  
✅ **No more ReferenceError** - variable is in correct scope  

## Files Modified
- `backend/src/controllers/interviewScheduling.js`
  - Moved `correctedSession` definition outside first-round check
  - Added session status validation for all rounds

## Testing
After this fix:
1. First round should start normally
2. Subsequent rounds (Round 2, Round 3, etc.) should start after previous round ends
3. No more "correctedSession is not defined" errors
