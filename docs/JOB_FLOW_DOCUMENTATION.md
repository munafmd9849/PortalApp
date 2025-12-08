# Job Posting Flow Documentation

## Complete Job Lifecycle Flow

### Stage 1: Recruiter Creates Job
**Action:** Recruiter submits a job posting
- **Status:** `IN_REVIEW`
- **isPosted:** `false`
- **isActive:** `false`

**Where it appears:**
- ✅ **Job Moderation Page** - Shows with status "IN REVIEW" (amber/yellow chip)
- ❌ **Manage Jobs Page** - Does NOT appear (filtered out)

**Available Actions (Admin only):**
- ✅ Approve (changes status to ACCEPTED)
- ✅ Reject (changes status to REJECTED)
- ✅ View Details

---

### Stage 2A: Admin Approves Job
**Action:** Admin clicks "Approve" (tick icon) in Job Moderation
- **Status:** `ACCEPTED` (changed from `IN_REVIEW`)
- **isPosted:** `false` (still not posted to students)
- **isActive:** `false`
- **approvedAt:** Current timestamp
- **approvedBy:** Admin user ID

**Where it appears:**
- ✅ **Job Moderation Page** - Shows with status "Accepted" (green chip)
- ✅ **Manage Jobs Page** - Appears in "In Review" section (Unposted tab)

**Notifications:**
- ✅ Recruiter receives email: "Job Posting Approved"
- ✅ Recruiter receives in-app notification

**Available Actions (Admin only):**
- ✅ Post Job (in Manage Jobs - moves to Posted section)
- ✅ View Details
- ✅ Archive (optional)

---

### Stage 2B: Admin Rejects Job
**Action:** Admin clicks "Reject" (X icon) in Job Moderation
- **Status:** `REJECTED` (changed from `IN_REVIEW`)
- **isPosted:** `false`
- **isActive:** `false`
- **rejectedAt:** Current timestamp
- **rejectedBy:** Admin user ID
- **rejectionReason:** Reason provided by admin

**Where it appears:**
- ✅ **Job Moderation Page** - Shows with status "Rejected" (red chip)
- ❌ **Manage Jobs Page** - Does NOT appear (filtered out)

**Notifications:**
- ✅ Recruiter receives email: "Job Posting Rejected" (with reason)
- ✅ Recruiter receives in-app notification

**Available Actions (Admin only):**
- ✅ View Details
- ✅ Archive (optional)

---

### Stage 3: Admin Posts Job to Students
**Action:** Admin clicks "Post Job" in Manage Jobs page
- **Status:** `POSTED` (changed from `ACCEPTED`)
- **isPosted:** `true`
- **isActive:** `true`
- **postedAt:** Current timestamp
- **postedBy:** Admin user ID

**Where it appears:**
- ❌ **Job Moderation Page** - Does NOT appear (only shows IN_REVIEW, ACCEPTED, REJECTED)
- ✅ **Manage Jobs Page** - Appears in "Posted" section (Posted tab)

**Notifications:**
- ✅ Students receive notifications (if targeting is set)
- ✅ Job becomes visible to targeted students

**Available Actions (Admin only):**
- ✅ Unpost Job (optional - changes back to ACCEPTED)
- ✅ Update Targeting (schools, batches, centers)
- ✅ View Details
- ✅ Archive

---

## Status Summary Table

| Status | Where Appears | isPosted | isActive | Can Post? |
|--------|--------------|----------|----------|-----------|
| `IN_REVIEW` | Job Moderation only | `false` | `false` | ❌ No |
| `ACCEPTED` | Job Moderation + Manage Jobs (Unposted) | `false` | `false` | ✅ Yes |
| `REJECTED` | Job Moderation only | `false` | `false` | ❌ No |
| `POSTED` | Manage Jobs (Posted) only | `true` | `true` | ✅ Already posted |
| `ACTIVE` | Manage Jobs (Posted) only | `true` | `true` | ✅ Already posted |

---

## Page Responsibilities

### Job Moderation Page
**Purpose:** Admin reviews and approves/rejects jobs submitted by recruiters

**Shows:**
- Jobs with status: `IN_REVIEW`, `ACCEPTED`, `REJECTED`
- Default filter: `IN_REVIEW` (pending approval)

**Actions:**
- Approve → Changes status to `ACCEPTED`
- Reject → Changes status to `REJECTED`
- View Details
- Archive

**Does NOT show:**
- `POSTED` or `ACTIVE` jobs (those are in Manage Jobs)

---

### Manage Jobs Page
**Purpose:** Admin manages approved jobs and posts them to students

**Shows:**
- Jobs with status: `ACCEPTED`, `POSTED`, `ACTIVE`
- Two tabs:
  - **"In Review" (Unposted):** `ACCEPTED` jobs (not yet posted to students)
  - **"Posted":** `POSTED` and `ACTIVE` jobs (visible to students)

**Actions:**
- Post Job → Changes status from `ACCEPTED` to `POSTED`
- Update Targeting (schools, batches, centers)
- Unpost Job (optional)
- View Details
- Archive

**Does NOT show:**
- `IN_REVIEW` jobs (those are in Job Moderation)
- `REJECTED` jobs (those are in Job Moderation)

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  RECRUITER CREATES JOB                                       │
│  Status: IN_REVIEW                                           │
│  isPosted: false                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  JOB MODERATION PAGE         │
        │  Status: "IN REVIEW"         │
        │  (Amber/Yellow chip)         │
        └──────────┬───────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐    ┌───────────────┐
│ ADMIN APPROVES│    │ ADMIN REJECTS │
│ (Tick icon)   │    │ (X icon)      │
└───────┬───────┘    └───────┬───────┘
        │                    │
        ▼                    ▼
┌───────────────┐    ┌───────────────┐
│ Status:       │    │ Status:       │
│ ACCEPTED      │    │ REJECTED      │
│ isPosted:     │    │ isPosted:     │
│ false         │    │ false         │
└───────┬───────┘    └───────┬───────┘
        │                    │
        │                    │
        ▼                    ▼
┌───────────────┐    ┌───────────────┐
│ JOB MODERATION│    │ JOB MODERATION│
│ "Accepted"    │    │ "Rejected"    │
│ (Green chip)  │    │ (Red chip)    │
└───────┬───────┘    └───────────────┘
        │
        │
        ▼
┌──────────────────────────────┐
│  MANAGE JOBS PAGE            │
│  "In Review" Tab (Unposted)  │
│  Status: ACCEPTED            │
│  isPosted: false             │
└──────────┬───────────────────┘
           │
           │ Admin clicks "Post Job"
           │
           ▼
┌──────────────────────────────┐
│  Status: POSTED               │
│  isPosted: true               │
│  isActive: true               │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  MANAGE JOBS PAGE             │
│  "Posted" Tab                │
│  Status: POSTED               │
│  (Visible to students)       │
└──────────────────────────────┘
```

---

## Key Rules

1. **Job Moderation** = Pre-approval stage
   - Shows: `IN_REVIEW`, `ACCEPTED`, `REJECTED`
   - Purpose: Review and approve/reject jobs

2. **Manage Jobs** = Post-approval stage
   - Shows: `ACCEPTED`, `POSTED`, `ACTIVE`
   - Purpose: Post approved jobs to students

3. **Status Transitions:**
   - `IN_REVIEW` → `ACCEPTED` (via Approve)
   - `IN_REVIEW` → `REJECTED` (via Reject)
   - `ACCEPTED` → `POSTED` (via Post Job)

4. **No Direct Transitions:**
   - Cannot go from `IN_REVIEW` directly to `POSTED` (must approve first)
   - Cannot go from `REJECTED` to `ACCEPTED` (must create new job)

---

## Current Implementation Status

✅ **Completed:**
- Status changes from `IN_REVIEW` to `ACCEPTED` on approve
- Status changes from `IN_REVIEW` to `REJECTED` on reject
- Job Moderation shows correct status chips
- Filter logic to exclude `IN_REVIEW` from Manage Jobs

🔧 **In Progress:**
- `ACCEPTED` jobs appearing in Manage Jobs "In Review" section
- Debugging to identify why they're not showing up

---

## Questions to Clarify

1. Should `ACCEPTED` jobs remain visible in Job Moderation after approval?
   - Current: Yes, they show with "Accepted" status
   - Alternative: Remove them from Job Moderation after approval

2. Can admins edit jobs after approval?
   - Current: Not clear
   - Suggestion: Allow editing in Manage Jobs before posting

3. What happens to `REJECTED` jobs?
   - Current: They stay in Job Moderation
   - Suggestion: Archive or hide after some time?

4. Can recruiters see the status of their submitted jobs?
   - Current: Not clear
   - Suggestion: Show status in recruiter dashboard

