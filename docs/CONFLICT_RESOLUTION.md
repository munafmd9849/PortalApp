# Conflict Resolution Guide

## Files with Conflicts When Merging `sai` into `main`

### 1. `backend/prisma/dev.db`
**Conflict Type:** Binary file
**Resolution:** Keep `sai` version (local database file)
```bash
git checkout --ours backend/prisma/dev.db
git add backend/prisma/dev.db
```

### 2. `frontend/src/components/landing/DevTeam.jsx`
**Conflict Type:** Content conflict
**Issue:** 
- `main` has empty placeholders: `{ name: "", linkedin: "#", img: null }`
- `sai` has actual devs with images and LinkedIn links

**Resolution:** Keep `sai` version (correct implementation)
```bash
git checkout --ours frontend/src/components/landing/DevTeam.jsx
git add frontend/src/components/landing/DevTeam.jsx
```

**Reason:** The sai branch has the correct implementation with:
- Munaf with image `munaf1.png` and LinkedIn link
- Irfan with image `Irfan.png` and LinkedIn link  
- Sai Charan with image `sai1.png` and LinkedIn link

### 3. `frontend/src/components/landing/Records.jsx`
**Conflict Type:** Content conflict
**Issue:**
- `main` has `cardWidth` and `cardGap` variables with complex responsive logic
- `sai` simplified to always show 4 cards, removed unused variables

**Resolution:** Keep `sai` version (simpler, cleaner code)
```bash
git checkout --ours frontend/src/components/landing/Records.jsx
git add frontend/src/components/landing/Records.jsx
```

**Reason:** The sai version is cleaner and the responsive logic in main appears unused.

### 4. `frontend/src/pages/dashboard/StudentDashboard.jsx`
**Conflict Type:** Content conflict
**Issue:**
- Both branches have different interview status implementations
- `sai` has the new interview status badge we just added

**Resolution:** Keep `sai` version (includes latest interview status feature)
```bash
git checkout --ours frontend/src/pages/dashboard/StudentDashboard.jsx
git add frontend/src/pages/dashboard/StudentDashboard.jsx
```

**Reason:** The sai branch includes the interview status display feature that shows session status and last round reached.

## Quick Resolution Commands

If merging `sai` into `main`:

```bash
# Switch to main branch
git checkout main
git pull origin main

# Merge sai
git merge sai --no-commit --no-ff

# Resolve conflicts (keep sai versions)
git checkout --ours backend/prisma/dev.db
git checkout --ours frontend/src/components/landing/DevTeam.jsx
git checkout --ours frontend/src/components/landing/Records.jsx
git checkout --ours frontend/src/pages/dashboard/StudentDashboard.jsx

# Stage resolved files
git add backend/prisma/dev.db
git add frontend/src/components/landing/DevTeam.jsx
git add frontend/src/components/landing/Records.jsx
git add frontend/src/pages/dashboard/StudentDashboard.jsx

# Complete merge
git commit -m "Merge sai into main: Resolved conflicts

- Kept sai version for dev.db (local database)
- Kept sai version for DevTeam.jsx (has actual dev data with images)
- Kept sai version for Records.jsx (simplified, cleaner code)
- Kept sai version for StudentDashboard.jsx (includes interview status feature)"
```

## Verification

After resolving, verify no conflicts remain:
```bash
git status
git diff --check  # Check for conflict markers
```

