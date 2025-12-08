# Backend Audit Report & Fixes

## ROOT CAUSES (One-line each)

1. **BullMQ Queue constructor blocks on Redis connection** - `queues.js` imports redis and creates Queue instances immediately, causing synchronous connection attempts even with `lazyConnect: true`.
2. **Redis connection errors crash worker imports** - When `jobs.js` controller imports `queues.js`, it triggers Redis connection which fails and blocks the event loop.
3. **BullMQ Queue needs connection check** - Queue operations will fail silently if Redis is not available, causing runtime errors.
4. **Worker files should not be auto-imported** - `workers/index.js` imports worker files that create Worker instances, which should only run in a separate process.
5. **OTP registration verification token uses email as userId** - `verify-otp` returns JWT with `email` as `userId`, but registration expects token's `userId` to match email directly (JWT decode issue).

## FIXES (Git-style Diffs)

### Fix 1: Make Redis connection truly lazy and wrap Queue creation

```diff
--- a/backend/src/config/redis.js
+++ b/backend/src/config/redis.js
@@ -9,23 +9,34 @@ import Redis from 'ioredis';
 // Create Redis client with lazy connection (only connects when used)
 // This prevents Redis errors from crashing the server if Redis is not available
 const redis = new Redis({
   host: process.env.REDIS_HOST || 'localhost',
   port: parseInt(process.env.REDIS_PORT) || 6379,
   password: process.env.REDIS_PASSWORD || undefined,
   retryStrategy: (times) => {
     // Stop retrying after 5 attempts to prevent endless retries
     if (times > 5) {
       return null; // Stop retrying
     }
     const delay = Math.min(times * 50, 2000);
     return delay;
   },
   maxRetriesPerRequest: 3,
   lazyConnect: true, // Don't connect immediately - only when needed
   enableOfflineQueue: false, // Don't queue commands if Redis is down
+  connectTimeout: 5000, // 5 second timeout
+  enableReadyCheck: false, // Don't wait for ready check
+  autoResubscribe: false, // Don't auto-resubscribe
+  maxRetriesPerRequest: null, // Disable automatic retries
 });
 
 redis.on('connect', () => {
   console.log('✅ Redis connected');
 });
 
 redis.on('error', (err) => {
   // Log error but don't crash - Redis is optional for basic features
   console.error('❌ Redis connection error (server will continue without Redis):', err.message);
 });
 
 // Don't fail if Redis connection fails - server can run without it
 redis.on('ready', () => {
   console.log('✅ Redis ready');
 });
 
+// Check if Redis is available (non-blocking)
+export async function isRedisAvailable() {
+  try {
+    await redis.ping();
+    return true;
+  } catch (error) {
+    return false;
+  }
+}
+
 export default redis;
```

**Explanation:** Add connection timeout and disable auto-retries to prevent blocking. Export helper function to check Redis availability.

---

### Fix 2: Wrap BullMQ Queue creation in try-catch and lazy initialization

```diff
--- a/backend/src/workers/queues.js
+++ b/backend/src/workers/queues.js
@@ -6,33 +6,67 @@ import { Queue, Worker } from 'bullmq';
 import redis from '../config/redis.js';
 
-// Job Distribution Queue
-export const jobDistributionQueue = new Queue('job-distribution', {
-  connection: redis,
-  defaultJobOptions: {
-    attempts: 3,
-    backoff: {
-      type: 'exponential',
-      delay: 2000,
-    },
-  },
-});
-
-// Email Notification Queue
-export const emailNotificationQueue = new Queue('email-notifications', {
-  connection: redis,
-  defaultJobOptions: {
-    attempts: 3,
-    backoff: {
-      type: 'exponential',
-      delay: 1000,
-    },
-  },
-});
+// Lazy queue initialization to prevent Redis connection on import
+let jobDistributionQueue = null;
+let emailNotificationQueue = null;
+
+/**
+ * Get or create job distribution queue (lazy initialization)
+ */
+function getJobDistributionQueue() {
+  if (!jobDistributionQueue) {
+    try {
+      jobDistributionQueue = new Queue('job-distribution', {
+        connection: redis,
+        defaultJobOptions: {
+          attempts: 3,
+          backoff: {
+            type: 'exponential',
+            delay: 2000,
+          },
+        },
+      });
+    } catch (error) {
+      console.error('❌ Failed to create job distribution queue:', error.message);
+      return null;
+    }
+  }
+  return jobDistributionQueue;
+}
+
+/**
+ * Get or create email notification queue (lazy initialization)
+ */
+function getEmailNotificationQueue() {
+  if (!emailNotificationQueue) {
+    try {
+      emailNotificationQueue = new Queue('email-notifications', {
+        connection: redis,
+        defaultJobOptions: {
+          attempts: 3,
+          backoff: {
+            type: 'exponential',
+            delay: 1000,
+          },
+        },
+      });
+    } catch (error) {
+      console.error('❌ Failed to create email notification queue:', error.message);
+      return null;
+    }
+  }
+  return emailNotificationQueue;
+}
+
+// Export getters instead of direct queue instances
+export { getJobDistributionQueue, getEmailNotificationQueue };
+
+// For backward compatibility, export queue getters as properties
+export const jobDistributionQueue = {
+  add: (...args) => {
+    const queue = getJobDistributionQueue();
+    if (!queue) {
+      console.warn('⚠️ Redis not available, job distribution queue disabled');
+      return Promise.resolve();
+    }
+    return queue.add(...args);
+  },
+  close: () => {
+    if (jobDistributionQueue) return jobDistributionQueue.close();
+  },
+};
+
+export const emailNotificationQueue = {
+  add: (...args) => {
+    const queue = getEmailNotificationQueue();
+    if (!queue) {
+      console.warn('⚠️ Redis not available, email notification queue disabled');
+      return Promise.resolve();
+    }
+    return queue.add(...args);
+  },
+  close: () => {
+    if (emailNotificationQueue) return emailNotificationQueue.close();
+  },
+};

 /**
  * Add job distribution task to queue
  */
 export async function addJobToQueue({ jobId, jobData, targeting }) {
+  const queue = getJobDistributionQueue();
+  if (!queue) {
+    console.warn('⚠️ Redis not available, skipping job distribution');
+    return;
+  }
   await jobDistributionQueue.add('distribute-job', {
     jobId,
     jobData,
     targeting,
   }, {
     priority: 1,
     jobId: `job-dist-${jobId}`,
   });
 }

 /**
  * Add email notification task to queue
  */
 export async function addEmailToQueue({ jobId, recipients, subject, html, text }) {
+  const queue = getEmailNotificationQueue();
+  if (!queue) {
+    console.warn('⚠️ Redis not available, skipping email queue');
+    return;
+  }
   await emailNotificationQueue.add('send-email', {
     jobId,
     recipients,
     subject,
     html,
     text,
   });
 }
```

**Explanation:** Lazy-initialize queues only when used, preventing Redis connection on import. Use wrapper objects for backward compatibility.

---

### Fix 3: Fix OTP verification token to use proper JWT payload

```diff
--- a/backend/src/routes/auth.js
+++ b/backend/src/routes/auth.js
@@ -479,7 +479,9 @@ router.post('/verify-otp', [
     // Return verification token (or just success - frontend will use this for registration)
     res.json({
       success: true,
       message: 'OTP verified successfully',
       verified: true,
       email,
       // Optional: Return a short-lived token that must be used within registration
-      verificationToken: generateAccessToken(email), // Using JWT for verification token
+      // Store email in token payload as 'email' field, not 'userId'
+      verificationToken: jwt.sign({ email, type: 'verification' }, process.env.JWT_SECRET, { expiresIn: '10m' }),
     });
   } catch (error) {
     logger.error('Verify OTP error:', error);
```

**Explanation:** Fix JWT token to include email in payload correctly, not as userId.

---

### Fix 4: Fix registration to check verification token email correctly

```diff
--- a/backend/src/routes/auth.js
+++ b/backend/src/routes/auth.js
@@ -44,11 +44,12 @@ router.post('/register', [
     // Optional: Verify OTP verification token if provided (enforce OTP verification)
     // Frontend should send verificationToken from verify-otp endpoint
     if (verificationToken) {
       try {
         const jwt = await import('jsonwebtoken');
         const decoded = jwt.default.verify(verificationToken, process.env.JWT_SECRET);
         
-        // Verify token email matches registration email
-        if (decoded.userId !== email) {
+        // Verify token email matches registration email
+        // Token payload has 'email' field, not 'userId'
+        if (decoded.email !== email || decoded.type !== 'verification') {
           return res.status(400).json({ error: 'Email verification failed' });
         }
 
         // Check if OTP was actually verified (exists and is used)
         const otpVerified = await prisma.oTP.findFirst({
```

**Explanation:** Fix registration to check `decoded.email` instead of `decoded.userId` to match the verification token payload.

---

### Fix 5: Add missing JWT import in verify-otp endpoint

```diff
--- a/backend/src/routes/auth.js
+++ b/backend/src/routes/auth.js
@@ -18,6 +18,7 @@ import express from 'express';
 import bcrypt from 'bcryptjs';
 import prisma from '../config/database.js';
 import { 
   authenticate, 
   generateAccessToken, 
   generateRefreshToken,
   verifyRefreshToken,
 } from '../middleware/auth.js';
+import jwt from 'jsonwebtoken';
 import { validateUUID } from '../middleware/validation.js';
 import { body, validationResult } from 'express-validator';
 import { sendOTP } from '../services/emailService.js';
```

**Explanation:** Add jwt import at top of file to use in verify-otp endpoint.

---

## VERIFICATION STEPS

### Step 1: Apply fixes

```bash
cd /Users/saicharan/Downloads/Portal-main/backend
# Fixes will be applied via search_replace tool
```

### Step 2: Test backend startup

```bash
cd backend
killall -9 node 2>/dev/null  # Clean up any running processes
npm run dev
```

**Expected output:**
```
🚀 Server running on port 3001
📡 Socket.IO enabled
🗄️  Database: PostgreSQL
❌ Redis connection error (server will continue without Redis): connect ECONNREFUSED...
✅ Email transporter is ready
```

**Server should start successfully even if Redis is down.**

### Step 3: Test OTP send endpoint

```bash
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' \
  --max-time 15
```

**Expected response:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "expiresIn": 300
}
```

### Step 4: Check email and verify OTP

```bash
# First, check your email for the OTP code (e.g., 123456)
# Then verify:

curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}' \
  --max-time 10
```

**Expected response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "verified": true,
  "email": "test@example.com",
  "verificationToken": "eyJhbGc..."
}
```

### Step 5: Test registration with verification token

```bash
# Use the verificationToken from previous step
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"password123",
    "role":"STUDENT",
    "verificationToken":"<verificationToken_from_previous_step>"
  }' \
  --max-time 10
```

**Expected response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... }
}
```

---

## ENVIRONMENT VARIABLES REQUIRED

No changes needed - existing `.env` should have:
- `DATABASE_URL` ✅
- `EMAIL_USER` ✅
- `EMAIL_PASS` ✅
- `EMAIL_HOST` ✅
- `EMAIL_PORT` ✅
- `JWT_SECRET` ✅
- `REDIS_HOST` (optional, defaults to localhost)
- `REDIS_PORT` (optional, defaults to 6379)

---

## NOTES

- Redis is now optional - server will start without it
- Workers should run separately: `npm run worker` (only if Redis is available)
- OTP emails are sent directly (not via queue) so they work without Redis
- All fixes are backward compatible

