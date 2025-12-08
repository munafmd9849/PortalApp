# System Architecture Diagrams

## Current Architecture (Firebase)

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Components  │  │   Context    │  │   Services   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          │ Firebase SDK     │ Firebase Auth    │ Firestore Listeners
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────────┐
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Firebase Services                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐ │   │
│  │  │   Auth     │  │ Firestore  │  │   Storage    │ │   │
│  │  │  (Users)   │  │ (Database) │  │   (Files)    │ │   │
│  │  └────────────┘  └────────────┘  └──────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## New Architecture (Migrated)

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Components  │  │   Context    │  │   API Service│     │
│  │  (Unchanged) │  │  (Updated)   │  │  + Socket.IO │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          │ HTTP/REST        │ JWT Tokens       │ WebSocket
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────────┐
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Express API Server                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐     │   │
│  │  │  Routes  │→ │Controllers│→ │  Prisma ORM  │     │   │
│  │  └──────────┘  └──────────┘  └──────┬───────┘     │   │
│  │                                      │              │   │
│  │  ┌──────────────┐          ┌────────▼────────┐     │   │
│  │  │  Socket.IO   │          │   PostgreSQL    │     │   │
│  │  │  (Real-time) │          │   (Database)    │     │   │
│  │  └──────────────┘          └─────────────────┘     │   │
│  └──────────┬──────────────────────┬───────────────────┘   │
└─────────────┼──────────────────────┼───────────────────────┘
              │                      │
              │                      │
┌─────────────▼──────────────────────▼───────────────────────┐
│         Background Workers (BullMQ)                        │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ Job Dist.    │  │ Email Queue  │                       │
│  │  Worker      │  │   Worker     │                       │
│  └──────┬───────┘  └──────┬───────┘                       │
│         │                 │                                 │
│         └────────┬────────┘                                 │
│                  │                                           │
│                  ▼                                           │
│         ┌──────────────────┐                                │
│         │      Redis       │                                │
│         │   (Job Queue)    │                                │
│         └──────────────────┘                                │
└─────────────────────────────────────────────────────────────┘
              │
              │
┌─────────────▼───────────────────────────────────────────────┐
│              External Services                              │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │   AWS S3     │  │   Nodemailer │                       │
│  │ (File Store) │  │  (Email API) │                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow: Job Posting

### Before (Firebase)
```
Admin → Create Job → Firestore (jobs/{id})
Admin → Post Job → Update status + 
       → Query all students (client-side)
       → Update students/{uid}.availableJobs (one by one)
       → Send emails (synchronous)
```

### After (New Stack)
```
Admin → POST /api/jobs/:id/post
  ↓
Express Controller → Update job status in PostgreSQL
  ↓
Add to BullMQ Queue (async)
  ↓
Worker Process:
  ├─ Query students with Prisma (WHERE clauses)
  ├─ Batch create job_tracking records
  ├─ Add email notifications to queue
  └─ Emit Socket.IO events to targeted students
  ↓
Email Worker → Send emails asynchronously
```

## Authentication Flow

### Before (Firebase)
```
User → Firebase Auth SDK
  ↓
Firebase Auth → Verify credentials
  ↓
Firebase Auth → Return token
  ↓
Frontend → Store token
  ↓
onAuthStateChanged → Listen for changes
  ↓
Firestore → Fetch user role
```

### After (New Stack)
```
User → POST /api/auth/login
  ↓
Express Controller → Verify credentials (bcrypt)
  ↓
Generate JWT tokens (access + refresh)
  ↓
Return tokens → Frontend stores in localStorage
  ↓
GET /api/auth/me → Fetch user + role
  ↓
Socket.IO → Connect with token
  ↓
Real-time updates via WebSocket
```

## Real-Time Updates

### Before (Firestore)
```
Frontend → onSnapshot(collection, callback)
  ↓
Firestore → Stream updates
  ↓
Frontend → Receive updates automatically
```

### After (Socket.IO)
```
Frontend → socket.emit('subscribe:applications')
  ↓
Socket.IO Server → Join room `applications:{userId}`
  ↓
Backend → Application updated
  ↓
Socket.IO → io.to(`applications:{userId}`).emit('application:updated', data)
  ↓
Frontend → socket.on('application:updated', callback)
```

## Job Distribution Flow

### Before (Firebase)
```
Admin posts job
  ↓
Frontend → Fetch ALL students
  ↓
Client-side filtering (slow, expensive)
  ↓
For each student → Update students/{uid} (one by one)
  ↓
Synchronous email sending (blocks request)
```

### After (New Stack)
```
Admin posts job
  ↓
POST /api/jobs/:id/post
  ↓
Update job status
  ↓
Add to BullMQ queue (async)
  ↓
Worker → Query students with WHERE clauses (fast)
  ↓
Batch insert job_tracking records
  ↓
Add email notifications to queue
  ↓
Email worker processes queue (async)
```

## File Upload Flow

### Before (Firebase Storage)
```
Frontend → uploadBytes(storageRef, file)
  ↓
Firebase Storage → Upload file
  ↓
getDownloadURL() → Get public URL
  ↓
Update Firestore → Store URL
```

### After (S3)
```
Frontend → POST /api/students/resume (multipart/form-data)
  ↓
Express → Multer middleware → Parse file
  ↓
S3 SDK → uploadToS3(fileBuffer, key)
  ↓
S3 → Store file
  ↓
Return public URL
  ↓
Prisma → Update students table
```

## Error Handling

### Before (Firebase)
```
try {
  await setDoc(...);
} catch (error) {
  // Firebase error codes
  if (error.code === 'permission-denied') { ... }
}
```

### After (Express)
```
try {
  await api.createJob(...);
} catch (error) {
  // HTTP status codes
  if (error.response?.status === 403) { ... }
}
```

---

## Performance Comparison

| Operation | Firebase | New Stack | Improvement |
|-----------|----------|-----------|-------------|
| Job distribution | Client-side filtering | Database queries | 10-100x faster |
| List students | No pagination | Pagination | Scales to 100k+ |
| Real-time updates | Firestore listeners | Socket.IO | Lower latency |
| File uploads | Firebase Storage | S3 | Better scalability |
| Email sending | Synchronous | Async queue | Non-blocking |

---

## Scalability Improvements

1. **Database:** PostgreSQL scales better than Firestore for complex queries
2. **Caching:** Redis ready for caching frequently accessed data
3. **Queue System:** BullMQ handles background jobs efficiently
4. **File Storage:** S3 provides better performance and cost efficiency
5. **Real-Time:** Socket.IO supports clustering for horizontal scaling

---

**Architecture Version:** 2.0 (Migrated)  
**Migration Date:** 2024
