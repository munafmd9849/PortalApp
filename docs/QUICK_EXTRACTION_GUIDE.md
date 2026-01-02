# Quick Code Extraction Guide

## How to Extract Code from Commits

This guide shows you how to extract specific files/changes from the commits without modifying your current project.

---

## Extract Complete Files

### 1. AdminJobDetail.jsx (from commit dafd7d6)
```bash
cd /Users/saicharan/Downloads/Portal-main
git show dafd7d6d6ae6781c3a0965dfc47470e4f1881a3a:frontend/src/components/dashboard/admin/AdminJobDetail.jsx > extracted/AdminJobDetail.jsx
```

### 2. AdminProfile.jsx (from commit dafd7d6)
```bash
git show dafd7d6d6ae6781c3a0965dfc47470e4f1881a3a:frontend/src/components/dashboard/admin/AdminProfile.jsx > extracted/AdminProfile.jsx
```

### 3. StudentDashboard with Resume Modal (from commit ec43006)
```bash
git show ec4300678b80f58389982b83e0c2c60ab13f7215:frontend/src/pages/dashboard/StudentDashboard.jsx > extracted/StudentDashboard_with_resume_modal.jsx
```

---

## View Diffs (Changes Only)

### 1. Resume Selection Modal Changes
```bash
# See what changed in StudentDashboard.jsx
git diff ec4300678b80f58389982b83e0c2c60ab13f7215^..ec4300678b80f58389982b83e0c2c60ab13f7215 -- frontend/src/pages/dashboard/StudentDashboard.jsx
```

### 2. Admin View Fixes
```bash
# See what changed in StudentDirectory.jsx
git diff 9a63a4ce59eba4c8fdc59ce24e0d963738b500d7^..9a63a4ce59eba4c8fdc59ce24e0d963738b500d7 -- frontend/src/components/dashboard/admin/StudentDirectory.jsx
```

### 3. Backend Admin Profile Editing
```bash
# See what changed in students controller
git diff 9a63a4ce59eba4c8fdc59ce24e0d963738b500d7^..9a63a4ce59eba4c8fdc59ce24e0d963738b500d7 -- backend/src/controllers/students.js
```

---

## View Specific Sections

### Resume Selection Modal Code Only
```bash
# Get just the modal JSX
git show ec4300678b80f58389982b83e0c2c60ab13f7215 -- frontend/src/pages/dashboard/StudentDashboard.jsx | grep -A 100 "Resume Selection Modal"
```

### Resume Loading Function
```bash
# Get the loadResumes function
git show ec4300678b80f58389982b83e0c2c60ab13f7215 -- frontend/src/pages/dashboard/StudentDashboard.jsx | grep -A 30 "loadResumes"
```

---

## Create Comparison Files

### Compare Current vs Commit Version
```bash
# Create a side-by-side comparison
git show ec4300678b80f58389982b83e0c2c60ab13f7215:frontend/src/pages/dashboard/StudentDashboard.jsx > commit_version.jsx
# Then use a diff tool to compare with current file
```

---

## Extract All Changes from a Commit

### All files changed in commit ec43006
```bash
git show ec4300678b80f58389982b83e0c2c60ab13f7215 --name-only
```

### All files changed in commit dafd7d6 (first 20)
```bash
git show dafd7d6d6ae6781c3a0965dfc47470e4f1881a3a --name-only | head -20
```

---

## Useful Git Commands

### View commit details
```bash
git show <commit-hash> --stat
```

### View commit message only
```bash
git log -1 <commit-hash> --pretty=format:"%s"
```

### List all files in a commit
```bash
git diff-tree --no-commit-id --name-only -r <commit-hash>
```

### View commit in a specific directory
```bash
git show <commit-hash> -- frontend/src/components/dashboard/admin/
```

---

## Recommended Workflow

1. **Create extraction directory:**
   ```bash
   mkdir -p extracted
   ```

2. **Extract files you need:**
   ```bash
   # Extract AdminJobDetail
   git show dafd7d6:frontend/src/components/dashboard/admin/AdminJobDetail.jsx > extracted/AdminJobDetail.jsx
   
   # Extract AdminProfile
   git show dafd7d6:frontend/src/components/dashboard/admin/AdminProfile.jsx > extracted/AdminProfile.jsx
   ```

3. **Review extracted files:**
   ```bash
   code extracted/AdminJobDetail.jsx
   ```

4. **Compare with current files:**
   ```bash
   # Use your IDE's diff tool or:
   diff extracted/AdminJobDetail.jsx frontend/src/components/dashboard/admin/AdminJobDetail.jsx
   ```

5. **Manually integrate changes** based on the action plan

---

## Tips

- Always extract to a separate directory first
- Review before copying to actual project
- Test each change incrementally
- Keep backups of original files
- Use version control (git) to track your changes




