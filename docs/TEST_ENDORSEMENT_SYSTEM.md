# Endorsement System Testing Guide

## 🚀 Quick Start Testing

### Prerequisites

1. **Backend Server Running**
   ```bash
   cd backend
   npm run dev
   # Server should be on http://localhost:5000 (or your configured port)
   ```

2. **Frontend Server Running**
   ```bash
   cd frontend
   npm run dev
   # Frontend should be on http://localhost:5173 (or your configured port)
   ```

3. **Database Migrated**
   ```bash
   cd backend
   npx prisma generate
   # Database should already be synced (we did this earlier)
   ```

4. **Environment Variables**
   - `FRONTEND_URL` in `backend/.env` should be set (e.g., `http://localhost:5173`)
   - Email service configured (SMTP settings in `backend/.env`)

---

## 📋 Complete Test Flow

### Test 1: Student Requests Endorsement

**Steps:**
1. Login as a student
2. Navigate to **Endorsements** tab in dashboard
3. Click **"Request Endorsement"** button
4. Fill in the form:
   - Teacher Name: `Dr. John Smith`
   - Teacher Email: `john.smith@university.edu` (use a real email you can access)
   - Role: `Professor` (optional)
   - Organization: `XYZ University` (optional)
5. Click **"Send Request"**

**Expected Result:**
- ✅ Success message: "Endorsement request sent successfully!"
- ✅ Request appears in "Pending Requests" section
- ✅ Email sent to teacher's email address

**Verify:**
- Check email inbox for magic link email
- Email should contain:
  - Student name
  - Magic link button
  - 48-hour expiration notice

---

### Test 2: Teacher Submits Endorsement (Public Page)

**Steps:**
1. Open the magic link from the email (or copy the URL)
2. You should see the endorsement form (no login required)
3. Fill in:
   - **Endorsement Message**: "Excellent student with strong problem-solving skills and great communication abilities. Highly recommended for placements."
   - **Skills**: Select or add skills like "Problem Solving", "Communication", "Leadership"
   - **Strength Rating**: Click 4 or 5 stars
4. Click **"Submit Endorsement"**

**Expected Result:**
- ✅ Success page: "Thank You! Your endorsement has been submitted successfully."
- ✅ Redirects to home page after 3 seconds
- ✅ Token is marked as used (cannot be used again)

**Verify:**
- Try opening the same link again → Should show "This endorsement link has already been used"

---

### Test 3: Student Views Received Endorsement

**Steps:**
1. Go back to student dashboard
2. Navigate to **Endorsements** tab
3. Check **"Received Endorsements"** section

**Expected Result:**
- ✅ Endorsement appears in "Received Endorsements"
- ✅ Shows:
  - Teacher name
  - Role and organization
  - Endorsement message
  - Related skills
  - Strength rating (if provided)
  - Submission date

**Verify:**
- Pending request moved from "Pending" to "Received"
- All details are correct

---

### Test 4: Student Cancels Pending Request

**Steps:**
1. Request a new endorsement (use a different email)
2. In "Pending Requests" section, click the trash icon
3. Confirm deletion

**Expected Result:**
- ✅ Request removed from pending list
- ✅ Success message: "Endorsement request cancelled successfully"

**Verify:**
- Request no longer appears in pending list
- Email link should still work but will show as expired when accessed

---

### Test 5: Token Expiration

**Steps:**
1. Request an endorsement
2. Wait 48 hours (or manually update database to set `expiresAt` to past date)
3. Try to access the magic link

**Expected Result:**
- ✅ Error page: "This endorsement link has expired"
- ✅ Shows expiration date

**Note:** For quick testing, you can manually expire a token in the database:
```sql
UPDATE endorsement_tokens 
SET expiresAt = datetime('now', '-1 day') 
WHERE token = 'YOUR_TOKEN';
```

---

### Test 6: Resume Integration

**Steps:**
1. Go to **Resume** tab in student dashboard
2. In resume builder, add an "Endorsements" section
3. Select endorsements to include (max 3)

**Expected Result:**
- ✅ Endorsements section appears in resume preview
- ✅ Shows:
  - Endorser name
  - Role and organization
  - Endorsement message (quoted)
  - Related skills (up to 5)
- ✅ Styled with template colors

**Verify:**
- Only verified endorsements appear
- Max 3 endorsements displayed
- Format is ATS-friendly

---

## 🔍 API Testing (Using Postman/curl)

### Test Endpoint 1: Request Endorsement

```bash
curl -X POST http://localhost:5000/api/endorsements/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_STUDENT_JWT_TOKEN" \
  -d '{
    "teacherName": "Dr. Jane Doe",
    "teacherEmail": "jane.doe@university.edu",
    "role": "Professor",
    "organization": "ABC University"
  }'
```

**Expected Response:**
```json
{
  "message": "Endorsement request sent successfully",
  "tokenId": "uuid-here",
  "expiresAt": "2024-12-31T12:00:00.000Z"
}
```

---

### Test Endpoint 2: Get Endorsement by Token (Public)

```bash
curl http://localhost:5000/api/endorsements/YOUR_TOKEN_HERE
```

**Expected Response:**
```json
{
  "studentName": "John Student",
  "studentEnrollmentId": "EN12345",
  "studentSchool": "SOT",
  "studentCenter": "BANGALORE",
  "studentBatch": "25-29",
  "teacherEmail": "jane.doe@university.edu",
  "teacherName": "Dr. Jane Doe",
  "teacherRole": "Professor",
  "organization": "ABC University",
  "expiresAt": "2024-12-31T12:00:00.000Z"
}
```

---

### Test Endpoint 3: Submit Endorsement (Public)

```bash
curl -X POST http://localhost:5000/api/endorsements/submit/YOUR_TOKEN_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "endorsementMessage": "Excellent student with great potential.",
    "relatedSkills": ["Problem Solving", "Communication"],
    "strengthRating": 5
  }'
```

**Expected Response:**
```json
{
  "message": "Endorsement submitted successfully. Thank you!",
  "success": true
}
```

---

### Test Endpoint 4: Get Student Endorsements

```bash
curl http://localhost:5000/api/endorsements/student \
  -H "Authorization: Bearer YOUR_STUDENT_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "received": [
    {
      "endorserName": "Dr. Jane Doe",
      "endorserEmail": "jane.doe@university.edu",
      "endorserRole": "Professor",
      "organization": "ABC University",
      "message": "Excellent student...",
      "relatedSkills": ["Problem Solving", "Communication"],
      "strengthRating": 5,
      "verified": true,
      "submittedAt": "2024-12-29T10:30:00.000Z"
    }
  ],
  "pending": [
    {
      "id": "token-id",
      "teacherEmail": "teacher@university.edu",
      "teacherName": "Dr. Smith",
      "expiresAt": "2024-12-31T12:00:00.000Z",
      "requestedAt": "2024-12-29T12:00:00.000Z"
    }
  ],
  "expired": []
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Email Not Sending

**Symptoms:**
- Request created but no email received

**Solutions:**
- Check `backend/.env` for SMTP configuration
- Check backend logs for email errors
- Verify `FRONTEND_URL` is set correctly
- Test email service independently

---

### Issue 2: Token Not Found

**Symptoms:**
- 404 error when accessing magic link

**Solutions:**
- Verify token exists in database:
  ```sql
  SELECT * FROM endorsement_tokens WHERE token = 'YOUR_TOKEN';
  ```
- Check token format (should be base64url)
- Verify route is registered: `/api/endorsements/:token`

---

### Issue 3: Endorsement Not Appearing

**Symptoms:**
- Submitted but not showing in student dashboard

**Solutions:**
- Check `endorsementsData` field in `students` table:
  ```sql
  SELECT endorsementsData FROM students WHERE id = 'STUDENT_ID';
  ```
- Verify JSON is valid
- Check backend logs for errors
- Refresh student dashboard

---

### Issue 4: Rate Limiting

**Symptoms:**
- "Too many requests" error

**Solutions:**
- Wait 15 minutes
- Check rate limit settings in `backend/src/routes/endorsements.js`
- Adjust limits for development if needed

---

## ✅ Test Checklist

- [ ] Student can request endorsement
- [ ] Email is sent with magic link
- [ ] Magic link works (no auth required)
- [ ] Endorsement form displays correctly
- [ ] Form validation works
- [ ] Endorsement submits successfully
- [ ] Token is marked as used
- [ ] Endorsement appears in student dashboard
- [ ] Student can cancel pending requests
- [ ] Expired tokens are rejected
- [ ] Used tokens are rejected
- [ ] Endorsements appear in resume builder
- [ ] Resume preview shows endorsements correctly
- [ ] Rate limiting works
- [ ] Error messages are clear

---

## 🎯 Production Readiness Checklist

Before deploying to production:

- [ ] Set `FRONTEND_URL` to production domain
- [ ] Configure production SMTP server
- [ ] Test email delivery
- [ ] Review rate limiting settings
- [ ] Test with real email addresses
- [ ] Verify database indexes are created
- [ ] Test token expiration
- [ ] Test concurrent requests
- [ ] Review security logs
- [ ] Test resume generation with endorsements

---

## 📊 Database Verification

Check database state:

```sql
-- Check endorsement tokens
SELECT id, email, used, expiresAt, createdAt 
FROM endorsement_tokens 
ORDER BY createdAt DESC 
LIMIT 10;

-- Check student endorsements
SELECT id, fullName, endorsementsData 
FROM students 
WHERE endorsementsData IS NOT NULL;

-- Check token usage
SELECT COUNT(*) as total, 
       SUM(CASE WHEN used = 1 THEN 1 ELSE 0 END) as used_count,
       SUM(CASE WHEN used = 0 AND expiresAt > datetime('now') THEN 1 ELSE 0 END) as pending_count
FROM endorsement_tokens;
```

---

## 🚨 Security Testing

1. **Token Security:**
   - Try accessing with invalid token → Should fail
   - Try reusing used token → Should fail
   - Try accessing expired token → Should fail

2. **Authorization:**
   - Try accessing student endpoints without auth → Should fail
   - Try accessing other student's endorsements → Should fail

3. **Input Validation:**
   - Try submitting empty message → Should fail
   - Try submitting message > 2000 chars → Should fail
   - Try invalid email format → Should fail

---

## 📝 Notes

- **Development:** Use test email addresses you can access
- **Token Format:** Tokens are base64url encoded, 32 bytes
- **Expiration:** 48 hours from creation
- **Storage:** Endorsements stored as JSON in `endorsementsData` field
- **Resume Limit:** Max 3 endorsements displayed in resume

---

## 🎉 Success Criteria

The system is working correctly if:
1. ✅ Students can request endorsements
2. ✅ Teachers receive emails with working links
3. ✅ Teachers can submit without creating accounts
4. ✅ Endorsements appear in student dashboard
5. ✅ Endorsements can be added to resumes
6. ✅ All security checks work
7. ✅ Error handling is graceful

Happy Testing! 🚀

