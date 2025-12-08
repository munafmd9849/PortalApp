## SQLite Table Queries Reference

Use the macOS terminal inside the workspace root (`/Users/saicharan/Downloads/Portal-main`) to inspect each schema table. Replace `<table>` with the table name below:

```bash
sqlite3 backend/prisma/dev.db '.tables'
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("<table>");'
sqlite3 backend/prisma/dev.db 'SELECT * FROM <table> LIMIT 5;'
```

### Available Tables

| Table | Purpose |
|---|---|
| `_prisma_migrations` | Prisma migration history. |
| `achievements` | Student achievements metadata. |
| `admin_requests` | Pending administrator access requests. |
| `admins` | Application admin users. |
| `applications` | Student job application records. |
| `certifications` | Student certifications. |
| `coding_profiles` | Coding profile links (GitHub, LeetCode, etc.). |
| `companies` | Partner company metadata. |
| `education` | Student education history. |
| `email_notifications` | Email queue records for notifications. |
| `job_tracking` | Job moderation workflow tracking. |
| `jobs` | Recruiter-created job postings. |
| `notifications` | Notification feed data delivered to users. |
| `otps` | One-time passcodes for login flows. |
| `projects` | Student project metadata. |
| `recruiters` | Recruiter directory records. |
| `refresh_tokens` | Refresh tokens for JWT sessions. |
| `resumes` | Resume metadata/storage references. |
| `skills` | Master list of student skills. |
| `student_queries` | Student query submissions. |
| `students` | Student profiles. |
| `users` | Authenticated user accounts. |

### Example: inspect the `notifications` table

```bash
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("notifications");'
sqlite3 backend/prisma/dev.db 'SELECT id, title, body, data, isRead, createdAt FROM notifications ORDER BY createdAt DESC LIMIT 10;'
```

Repeat the pattern for any table above. Always run the `PRAGMA table_info("<table>")` command first so you know the actual column names before writing a `SELECT`.

### Query snippets per table

Use these exact commands to explore each table (line breaks only for readability):

```bash
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("<table>");'
sqlite3 backend/prisma/dev.db 'SELECT * FROM <table> LIMIT 5;'
```

Below are the table-specific commands you can paste directly. Replace `<table>` from the name shown in the header (no angle brackets).

#### `_prisma_migrations`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("_prisma_migrations");'
sqlite3 backend/prisma/dev.db 'SELECT id, finished_at, migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;'
```

#### `achievements`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("achievements");'
sqlite3 backend/prisma/dev.db 'SELECT id, name, studentId, organization FROM achievements LIMIT 5;'
```

#### `admin_requests`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("admin_requests");'
sqlite3 backend/prisma/dev.db 'SELECT id, userId, reason, status FROM admin_requests ORDER BY createdAt DESC LIMIT 5;'
```

#### `admins`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("admins");'
sqlite3 backend/prisma/dev.db 'SELECT id, userId, name, email FROM admins LIMIT 5;'
```

#### `applications`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("applications");'
sqlite3 backend/prisma/dev.db 'SELECT id, studentId, jobId, status FROM applications ORDER BY createdAt DESC LIMIT 5;'
```

#### `certifications`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("certifications");'
sqlite3 backend/prisma/dev.db 'SELECT id, name, issuedBy, studentId FROM certifications LIMIT 5;'
```

#### `coding_profiles`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("coding_profiles");'
sqlite3 backend/prisma/dev.db 'SELECT id, platform, url, studentId FROM coding_profiles LIMIT 5;'
```

#### `companies`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("companies");'
sqlite3 backend/prisma/dev.db 'SELECT id, name, website, domain FROM companies LIMIT 5;'
```

#### `education`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("education");'
sqlite3 backend/prisma/dev.db 'SELECT id, school, degree, studentId FROM education LIMIT 5;'
```

#### `email_notifications`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("email_notifications");'
sqlite3 backend/prisma/dev.db 'SELECT id, recipient, subject, status FROM email_notifications ORDER BY createdAt DESC LIMIT 5;'
```

#### `job_tracking`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("job_tracking");'
sqlite3 backend/prisma/dev.db 'SELECT id, jobId, status, updatedAt FROM job_tracking ORDER BY updatedAt DESC LIMIT 5;'
```

#### `jobs`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("jobs");'
sqlite3 backend/prisma/dev.db 'SELECT id, title, companyName, status FROM jobs ORDER BY createdAt DESC LIMIT 5;'
```

#### `notifications`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("notifications");'
sqlite3 backend/prisma/dev.db 'SELECT id, title, body, isRead, createdAt FROM notifications ORDER BY createdAt DESC LIMIT 5;'
```

#### `otps`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("otps");'
sqlite3 backend/prisma/dev.db 'SELECT id, code, userId, expiresAt FROM otps ORDER BY createdAt DESC LIMIT 5;'
```

#### `projects`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("projects");'
sqlite3 backend/prisma/dev.db 'SELECT id, title, studentId, link FROM projects LIMIT 5;'
```

#### `recruiters`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("recruiters");'
sqlite3 backend/prisma/dev.db 'SELECT id, userId, companyId, companyName, location FROM recruiters ORDER BY createdAt DESC LIMIT 5;'
```

#### `refresh_tokens`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("refresh_tokens");'
sqlite3 backend/prisma/dev.db 'SELECT id, userId, expiresAt FROM refresh_tokens LIMIT 5;'
```

#### `resumes`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("resumes");'
sqlite3 backend/prisma/dev.db 'SELECT id, studentId, fileName FROM resumes ORDER BY createdAt DESC LIMIT 5;'
```

#### `skills`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("skills");'
sqlite3 backend/prisma/dev.db 'SELECT id, name, level FROM skills LIMIT 5;'
```

#### `student_queries`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("student_queries");'
sqlite3 backend/prisma/dev.db 'SELECT id, subject, type, status FROM student_queries ORDER BY createdAt DESC LIMIT 5;'
```

#### `students`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("students");'
sqlite3 backend/prisma/dev.db 'SELECT id, userId, placementCellId FROM students LIMIT 5;'
```

#### `users`
```
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("users");'
sqlite3 backend/prisma/dev.db 'SELECT id, email, role, createdAt FROM users ORDER BY createdAt DESC LIMIT 5;'
```

