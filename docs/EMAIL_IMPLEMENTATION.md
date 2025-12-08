# 📧 SMTP Email Implementation Summary

Complete SMTP-based email functionality with OTP verification implemented across the backend.

---

## ✅ Implementation Complete

### 1. Email Service Created

**File:** `backend/src/services/emailService.js`

**Functions:**
- ✅ `sendOTP(email, otp)` - Sends 6-digit OTP via email
- ✅ `sendJobPostedNotification(job, recruiter)` - Notifies recruiter when job is posted
- ✅ `sendApplicationNotification(applicant, job, recruiter)` - Sends to both recruiter and applicant
- ✅ `sendGenericNotification(email, subject, message)` - Generic email notification

**Features:**
- HTML email templates with styling
- Error handling with try/catch
- Logging for all email sends
- Uses nodemailer from `backend/src/config/email.js`

---

### 2. Logger Service Created

**File:** `backend/src/config/logger.js`

**Features:**
- Simple logging utility with timestamps
- Info, error, warn, debug levels
- Used throughout email service and controllers

---

### 3. OTP Model Added to Prisma Schema

**File:** `backend/prisma/schema.prisma`

**Model:**
```prisma
model OTP {
  id        String   @id @default(uuid())
  email     String
  otp       String   // 6-digit OTP
  purpose   String   @default("VERIFY_EMAIL") // VERIFY_EMAIL, RESET_PASSWORD, etc.
  expiresAt DateTime
  isUsed    Boolean  @default(false)
  createdAt DateTime @default(now())
  
  @@index([email, purpose, isUsed])
  @@index([expiresAt])
  @@map("otps")
}
```

**Migration Required:**
```bash
cd backend/
npm run db:migrate
```

---

### 4. OTP Endpoints Added

**File:** `backend/src/routes/auth.js`

#### POST `/api/auth/send-otp`
- Generates 6-digit OTP
- Stores in database with 5-minute expiration
- Invalidates existing OTPs for the email
- Sends OTP via SMTP email
- Returns success response

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "expiresIn": 300
}
```

#### POST `/api/auth/verify-otp`
- Validates OTP (6 digits, not expired, not used)
- Marks OTP as used
- Returns verification token for registration

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "verified": true,
  "email": "user@example.com",
  "verificationToken": "jwt_token_here"
}
```

---

### 5. Registration Flow Updated

**File:** `backend/src/routes/auth.js`

**Changes:**
- Added optional `verificationToken` parameter to `/api/auth/register`
- Verifies OTP token if provided (enforce on frontend)
- Checks that OTP was actually verified before allowing registration

**New Registration Flow:**
1. Frontend calls `/api/auth/send-otp` with email
2. User enters OTP from email
3. Frontend calls `/api/auth/verify-otp` with email + OTP
4. Frontend receives `verificationToken`
5. Frontend calls `/api/auth/register` with `verificationToken` included

---

### 6. Email Triggers Added to Controllers

#### Jobs Controller (`backend/src/controllers/jobs.js`)

**Function:** `postJob()`

**Changes:**
- Added email notification to recruiter when job is posted
- Sends `sendJobPostedNotification()` after job is successfully posted
- Wrapped in try/catch to not fail request if email fails
- Logs success/failure

#### Applications Controller (`backend/src/controllers/applications.js`)

**Function:** `applyToJob()`

**Changes:**
- Added email notifications to both recruiter and applicant
- Sends `sendApplicationNotification()` after application is created
- Recruiter receives: "New application received" email
- Applicant receives: "Application confirmation" email
- Wrapped in try/catch to not fail request if email fails
- Logs success/failure

#### Notifications Controller (`backend/src/controllers/notifications.js`)

**Function:** `createNotification()`

**Changes:**
- Added optional `sendEmail` parameter
- Sends generic email notification when `sendEmail: true`
- Used for admin/system notifications
- Wrapped in try/catch to not fail notification creation if email fails

**Route Added:** `POST /api/notifications`
- Admin/Recruiter can create notifications with email option
- Accepts `sendEmail` boolean parameter

---

### 7. Environment Variables

**File:** `backend/.env.example` (updated)

**Required Variables:**
```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE="false"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
EMAIL_FROM="PWIOI Portal <noreply@pwioi.com>"
```

**Gmail Setup:**
1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password (not regular password) for `EMAIL_PASS`

---

## 📋 Code Changes Summary

### Files Created
1. ✅ `backend/src/services/emailService.js` - Reusable email service
2. ✅ `backend/src/config/logger.js` - Logger utility

### Files Modified
1. ✅ `backend/prisma/schema.prisma` - Added OTP model
2. ✅ `backend/src/routes/auth.js` - Added OTP endpoints, updated registration
3. ✅ `backend/src/controllers/jobs.js` - Added email trigger in `postJob()`
4. ✅ `backend/src/controllers/applications.js` - Added email trigger in `applyToJob()`
5. ✅ `backend/src/controllers/notifications.js` - Added email option to `createNotification()`
6. ✅ `backend/src/routes/notifications.js` - Added POST endpoint for notifications
7. ✅ `backend/.env.example` - Added email configuration

---

## 🔄 Registration Flow (With OTP)

### Frontend Flow

```
1. User enters email → POST /api/auth/send-otp
   ↓
2. User receives OTP email
   ↓
3. User enters OTP → POST /api/auth/verify-otp
   ↓
4. Frontend receives verificationToken
   ↓
5. User fills registration form → POST /api/auth/register
   Body includes: { email, password, role, profile, verificationToken }
   ↓
6. Registration succeeds
```

---

## 📧 Email Trigger Points

### Automatic Email Sends

1. **Job Posted** (Admin posts job)
   - **Trigger:** `POST /api/jobs/:jobId/post`
   - **Recipient:** Recruiter who created the job
   - **Email:** `sendJobPostedNotification()`

2. **Application Submitted** (Student applies)
   - **Trigger:** `POST /api/applications/jobs/:jobId`
   - **Recipients:**
     - Recruiter (new application notification)
     - Applicant (confirmation email)
   - **Email:** `sendApplicationNotification()`

3. **Admin Notification** (Manual)
   - **Trigger:** `POST /api/notifications` (with `sendEmail: true`)
   - **Recipient:** Target user
   - **Email:** `sendGenericNotification()`

---

## 🚀 Setup Instructions

### 1. Database Migration

```bash
cd backend/
npm run db:migrate
```

This creates the `otps` table.

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cd backend/
cp .env.example .env
# Edit .env with your email credentials
```

**Required for Email:**
```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"  # Gmail App Password
EMAIL_FROM="PWIOI Portal <noreply@pwioi.com>"
```

### 3. Test Email Configuration

```bash
cd backend/
# Start backend server
npm run dev

# Test OTP endpoint
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## 📝 API Endpoints

### OTP Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/send-otp` | POST | Send OTP to email | No |
| `/api/auth/verify-otp` | POST | Verify OTP | No |
| `/api/auth/register` | POST | Register (with optional verificationToken) | No |

### Notification Endpoints (Updated)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/notifications` | POST | Create notification (with optional email) | Yes (Admin/Recruiter) |

---

## 🔐 Security Features

1. **OTP Expiration:** 5 minutes
2. **OTP Single Use:** Marked as used after verification
3. **OTP Validation:** 6-digit numeric only
4. **Email Verification:** Required before registration (if verificationToken provided)
5. **Error Handling:** Email failures don't break main flow
6. **Logging:** All email operations logged

---

## ⚠️ Important Notes

1. **OTP Verification is Optional:**
   - Registration still works without `verificationToken`
   - Frontend can enforce OTP verification
   - Backend validates token if provided

2. **Email Failures Don't Break Flow:**
   - All email sends wrapped in try/catch
   - Errors logged but don't fail requests
   - Main functionality continues even if email fails

3. **Database Migration Required:**
   - Run `npm run db:migrate` to create OTP table
   - Old OTPs are automatically cleaned up (expired ones)

4. **Gmail Setup:**
   - Requires App Password (not regular password)
   - Enable 2FA first
   - Use App Password in `EMAIL_PASS`

---

## 🧪 Testing

### Test OTP Flow

```bash
# 1. Send OTP
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Check email for OTP (e.g., "123456")

# 3. Verify OTP
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'

# 4. Register with verificationToken
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "STUDENT",
    "verificationToken": "token_from_verify-otp",
    "profile": {
      "fullName": "Test User",
      "enrollmentId": "TEST123",
      "school": "SOT",
      "center": "BANGALORE",
      "batch": "25-29"
    }
  }'
```

---

## 📊 Email Service Functions

### `sendOTP(email, otp)`
- **Purpose:** Email verification OTP
- **Template:** HTML with styled OTP code
- **Expiry:** 5 minutes (mentioned in email)

### `sendJobPostedNotification(job, recruiter)`
- **Purpose:** Notify recruiter job is live
- **Template:** Job details, company, posted date
- **Triggered:** When admin posts job

### `sendApplicationNotification(applicant, job, recruiter)`
- **Purpose:** Notify both parties of new application
- **Templates:** 
  - Recruiter: New application alert
  - Applicant: Confirmation email
- **Triggered:** When student applies

### `sendGenericNotification(email, subject, message)`
- **Purpose:** Admin/system notifications
- **Template:** Generic HTML wrapper
- **Used:** Manual admin notifications

---

**Status:** ✅ Complete  
**Database Migration:** Required (`npm run db:migrate`)  
**Email Configuration:** Required (update `backend/.env`)

