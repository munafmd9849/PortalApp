# Merge Plan: Integrating CGPA Validation + Query System with Screening System

## Overview
Merging commits `3d7a263` and `435068f` (from `esha` branch) into current `sai` branch while preserving both:
- **Incoming features**: CGPA validation, salary defaults, query improvements, userId fallback
- **Our features**: Recruiter screening system, screening status tracking, recruiterEmail requirement

## Conflicting Files & Merge Strategy

### 1. `backend/src/controllers/applications.js`
**Incoming changes:**
- CGPA requirement validation in `applyToJob()` function
- Checks student CGPA against job.minCgpa before allowing application

**Our changes:**
- Added `screeningStatus`, `screeningRemarks`, `screeningCompletedAt` fields
- Added `getJobScreeningSummary()` function
- Enhanced `getStudentApplications()` with screening status text

**Merge strategy:**
- ✅ Keep CGPA validation in `applyToJob()` (add it to our version)
- ✅ Keep all screening status fields and functions
- ✅ Ensure CGPA check happens BEFORE creating application
- ✅ Add screening status initialization: `screeningStatus: 'APPLIED'` when creating application

### 2. `backend/src/controllers/jobs.js`
**Incoming changes:**
- Default salary handling ("As per industry standards")
- Salary field processing improvements

**Our changes:**
- `recruiterEmail` validation (required field)
- Email format validation

**Merge strategy:**
- ✅ Keep recruiterEmail validation (must stay)
- ✅ Add salary default handling from incoming
- ✅ Both features are independent, can coexist

### 3. `backend/src/controllers/interviewScheduling.js`
**Incoming changes:**
- userId fallback logic improvements
- Better error handling

**Our changes:**
- `TEST_SELECTED` filtering in `getRoundCandidates()`
- Only candidates with `screeningStatus = 'TEST_SELECTED'` allowed

**Merge strategy:**
- ✅ Keep TEST_SELECTED filtering (critical for screening flow)
- ✅ Add userId fallback improvements
- ✅ Both are independent enhancements

### 4. `frontend/src/pages/dashboard/StudentDashboard.jsx`
**Incoming changes:**
- Query system improvements
- UI enhancements
- Job display improvements

**Our changes:**
- Screening status badges
- Toast notifications (from toast system)
- Application status display with screening priority

**Merge strategy:**
- ✅ Keep screening status display logic
- ✅ Integrate query improvements
- ✅ Keep toast notifications
- ✅ Merge UI enhancements carefully

## Execution Steps

1. **Stash current changes** (toast system)
2. **Create merge branch** from current HEAD
3. **Cherry-pick or merge** the commits
4. **Resolve conflicts** file by file using strategies above
5. **Test** both features work together
6. **Commit** merged result

## Testing Checklist

- [ ] CGPA validation works (blocks application if CGPA too low)
- [ ] Screening status is set to 'APPLIED' on application creation
- [ ] Recruiter email validation still works
- [ ] Salary defaults work
- [ ] TEST_SELECTED filtering works in interview rounds
- [ ] Screening funnel displays correctly
- [ ] Student dashboard shows both screening and interview status
- [ ] Query system improvements work

