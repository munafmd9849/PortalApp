# Complete Migration Guide: Firebase → PostgreSQL + Express + Socket.IO

This guide provides step-by-step instructions for migrating the PWIOI Placement Portal from Firebase to a modern stack.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Migration](#frontend-migration)
5. [Data Migration](#data-migration)
6. [Workers Setup](#workers-setup)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Rollback Plan](#rollback-plan)

---

## 1. Prerequisites

### Required Software
- Node.js 20+
- PostgreSQL 14+ (or SQLite for development)
- Redis 7+
- AWS Account (for S3)
- Git

### Environment Variables
Create `.env` files in backend and frontend with required variables (see `.env.example`)

---

## 2. Database Setup

### Step 1: Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE portal_db;

# Exit psql
\q
```

### Step 2: Initialize Prisma

```bash
cd MIGRATION/backend

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### Step 3: Verify Schema

```bash
# Check database connection
npx prisma studio
```

---

## 3. Backend Setup

### Step 1: Install Dependencies

```bash
cd MIGRATION/backend
npm install
```

### Step 2: Configure Environment

Copy `.env.example` to `.env` and fill in values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/portal_db"
JWT_SECRET="your-secret-key"
REDIS_HOST="localhost"
REDIS_PORT=6379
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
S3_BUCKET_NAME="portal-uploads"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
```

### Step 3: Start Backend Server

```bash
# Development
npm run dev

# Production
npm start
```

Backend will run on `http://localhost:3000`

---

## 4. Frontend Migration

### Step 1: Replace Firebase SDK with API Service

1. **Replace `firebase.js`:**
   - Delete or rename old `src/firebase.js`
   - Copy `MIGRATION/frontend/src/services/api.js` to `src/services/api.js`

2. **Update `AuthContext.jsx`:**
   - Replace with `MIGRATION/frontend/src/context/AuthContext.migrated.jsx`
   - Or manually update to use `api` service instead of Firebase Auth

3. **Add Socket.IO client:**
   - Copy `MIGRATION/frontend/src/services/socket.js` to `src/services/socket.js`

### Step 2: Update Environment Variables

Add to `.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### Step 3: Update All Service Calls

Replace Firebase service calls with API calls:

**Before (Firebase):**
```javascript
import { getStudentProfile } from '../services/students';
const profile = await getStudentProfile(userId);
```

**After (API):**
```javascript
import api from '../services/api';
const profile = await api.getStudentProfile();
```

### Step 4: Update Real-Time Subscriptions

**Before (Firestore):**
```javascript
const unsubscribe = onSnapshot(query, (snapshot) => {
  // Handle updates
});
```

**After (Socket.IO):**
```javascript
import { subscribeToUpdates } from '../services/socket';

useEffect(() => {
  const unsubscribe = subscribeToUpdates({
    onApplicationUpdated: (data) => {
      // Handle updates
    },
  });
  return unsubscribe;
}, []);
```

### Step 5: Update File Uploads

**Before (Firebase Storage):**
```javascript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
const storageRef = ref(storage, `resumes/${userId}/${file.name}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
```

**After (S3):**
```javascript
import api from '../services/api';
const result = await api.uploadResume(file, (progress) => {
  console.log(`Upload: ${progress}%`);
});
const url = result.url;
```

---

## 5. Data Migration

### Step 1: Export Firestore Data

The migration script handles this automatically, but you can export manually:

```bash
# Install Firebase Tools
npm install -g firebase-tools

# Export Firestore
firebase firestore:export ./firestore-export
```

### Step 2: Set Up Firebase Admin

1. Download service account JSON from Firebase Console
2. Set `FIREBASE_SERVICE_ACCOUNT` environment variable:

```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

Or create a file and reference it in the script.

### Step 3: Run Migration Script

```bash
cd MIGRATION/scripts
node migrate-firestore-to-postgres.js
```

**Migration Order:**
1. Users
2. Students
3. Companies
4. Recruiters
5. Jobs
6. Applications
7. Notifications
8. Skills, Education, Projects, Achievements

### Step 4: Verify Data

```bash
# Check counts
psql -U postgres -d portal_db -c "SELECT 'users' as table, COUNT(*) FROM users UNION SELECT 'students', COUNT(*) FROM students UNION SELECT 'jobs', COUNT(*) FROM jobs;"
```

---

## 6. Workers Setup

### Step 1: Start Redis

```bash
# Mac (Homebrew)
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7
```

### Step 2: Start Workers

```bash
cd MIGRATION/backend
npm run worker
```

Workers process:
- Job distribution to students
- Email notifications

### Step 3: Monitor Queues

```bash
# Install Bull Board for queue monitoring (optional)
npm install @bull-board/api @bull-board/express

# Add to server.js
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
```

---

## 7. Testing

### Backend API Tests

```bash
cd MIGRATION/backend
npm test
```

### Manual Testing Checklist

#### Authentication
- [ ] Register new user (student/recruiter/admin)
- [ ] Login with email/password
- [ ] Refresh token works
- [ ] Logout clears tokens

#### Student Flow
- [ ] View/edit profile
- [ ] Upload resume
- [ ] View targeted jobs
- [ ] Apply to job
- [ ] Track applications (real-time updates)

#### Recruiter Flow
- [ ] Create job posting
- [ ] View job status
- [ ] View applications

#### Admin Flow
- [ ] Approve/reject jobs
- [ ] Post jobs with targeting
- [ ] View all students
- [ ] View all recruiters

#### Real-Time
- [ ] Application status updates appear instantly
- [ ] Notifications arrive in real-time
- [ ] Job postings appear for students immediately

---

## 8. Deployment

### Backend Deployment (Heroku/EC2/DigitalOcean)

```bash
# Set production environment variables
export NODE_ENV=production
export DATABASE_URL="postgresql://..."
export JWT_SECRET="..."
# ... etc

# Start server
npm start

# Start workers (separate process)
npm run worker
```

### Frontend Deployment (Vercel/Netlify)

```bash
# Build
npm run build

# Deploy
# Update VITE_API_URL and VITE_SOCKET_URL to production URLs
```

### AWS S3 Setup

1. Create S3 bucket
2. Configure CORS:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-frontend-domain.com"],
    "ExposeHeaders": []
  }
]
```

3. Set bucket policy for public read (or use presigned URLs)

---

## 9. Rollback Plan

If issues occur:

1. **Immediate Rollback:**
   - Revert frontend changes
   - Point to Firebase again
   - Database remains intact

2. **Data Backup:**
   - Export PostgreSQL before migration
   - Keep Firestore data intact

3. **Gradual Migration:**
   - Migrate one module at a time
   - Test thoroughly before proceeding
   - Keep both systems running in parallel

---

## 🔄 Migration Flow Diagram

```
┌─────────────────┐
│  Firebase       │
│  (Current)      │
└────────┬────────┘
         │
         │ Export Data
         ▼
┌─────────────────┐
│  Migration      │
│  Script         │
└────────┬────────┘
         │
         │ Import to PostgreSQL
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  (New DB)       │
└────────┬────────┘
         │
         │ Prisma Client
         ▼
┌─────────────────┐
│  Express API    │
│  + Socket.IO    │
└────────┬────────┘
         │
         │ HTTP/WebSocket
         ▼
┌─────────────────┐
│  React Frontend │
│  (Migrated)     │
└─────────────────┘
```

---

## 📝 Key Migration Mappings

| Firebase/Firestore | New Stack |
|-------------------|-----------|
| `createUserWithEmailAndPassword()` | `api.register()` |
| `signInWithEmailAndPassword()` | `api.login()` |
| `signOut()` | `api.logout()` |
| `onAuthStateChanged()` | `api.getCurrentUser()` + Socket.IO |
| `onSnapshot()` | Socket.IO events |
| `getDoc()` / `getDocs()` | `api.getXxx()` |
| `setDoc()` / `addDoc()` | `api.createXxx()` / `api.updateXxx()` |
| `updateDoc()` | `api.updateXxx()` |
| `deleteDoc()` | `api.deleteXxx()` |
| `uploadBytes()` (Storage) | `api.uploadFile()` → S3 |
| `getDownloadURL()` | S3 presigned URLs |

---

## 🚨 Important Notes

1. **Password Migration:** Users need to reset passwords (Firebase passwords cannot be migrated)

2. **Email Verification:** Re-send verification emails after migration

3. **Real-Time Updates:** Socket.IO replaces Firestore listeners - ensure connection is stable

4. **File URLs:** Update all Firebase Storage URLs to S3 URLs (or migrate files)

5. **Indexes:** Prisma creates indexes automatically, but verify query performance

6. **Rate Limiting:** Implement rate limiting to prevent abuse

7. **Monitoring:** Set up logging and monitoring (Winston, Sentry, etc.)

---

## ✅ Post-Migration Checklist

- [ ] All users can log in (may need password reset)
- [ ] All data migrated correctly
- [ ] Real-time updates working
- [ ] File uploads/downloads working
- [ ] Email notifications sending
- [ ] Job distribution working
- [ ] Performance acceptable
- [ ] Error handling robust
- [ ] Logging in place
- [ ] Monitoring configured
- [ ] Backup strategy implemented

---

## 📞 Support

For issues during migration:
1. Check logs (backend and workers)
2. Verify database connections
3. Test API endpoints with Postman/curl
4. Check Socket.IO connection status
5. Verify Redis is running

---

**Migration Version:** 1.0  
**Last Updated:** 2024
