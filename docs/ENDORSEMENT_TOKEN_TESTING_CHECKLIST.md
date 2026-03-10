# Endorsement Token Validation - Complete Testing Checklist

## Prerequisites

1. **Database Setup**
   - Ensure `endorsement_tokens` table exists
   - Verify token column is unique and case-sensitive
   - Check that `expiresAt` column is DateTime type

2. **Backend Setup**
   - Replace `getEndorsementByToken` with enhanced version
   - Ensure logger is configured
   - Set timezone to UTC for consistent date handling

## Test Cases

### Test 1: Generate New Token → Insert in DB → Open Link

**Steps:**
1. Create endorsement request:
   ```bash
   POST /api/endorsements/request
   {
     "teacherEmail": "teacher@example.com",
     "teacherName": "Dr. John Smith"
   }
   ```

2. Check response for token or query database:
   ```sql
   SELECT token, expires_at, used, created_at 
   FROM endorsement_tokens 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

3. Open link:
   ```bash
   GET /api/endorsements/{token}
   ```

4. **Expected Result:**
   - Status: 200
   - Returns student information
   - Logs show: "Token found", "Validation passed"

5. **Check Logs:**
   ```
   [STEP 1] Token receipt verification
   [STEP 2] Token found in database
   [STEP 3] Token validation passed
   === ENDORSEMENT TOKEN VALIDATION SUCCESS ===
   ```

---

### Test 2: Expired Token

**Steps:**
1. Manually update token expiration in database:
   ```sql
   UPDATE endorsement_tokens 
   SET expires_at = datetime('now', '-1 hour')
   WHERE token = '{your-token}';
   ```

2. Open link:
   ```bash
   GET /api/endorsements/{token}
   ```

3. **Expected Result:**
   - Status: 400
   - Response:
     ```json
     {
       "error": "This endorsement link has expired",
       "expired": true,
       "expiresAt": "2024-01-15T10:00:00.000Z"
     }
     ```

4. **Check Logs:**
   ```
   [STEP 3] Token expired
   expiredByHours: 1
   === ENDORSEMENT TOKEN VALIDATION FAILED ===
   ```

---

### Test 3: Already Used Token

**Steps:**
1. Mark token as used:
   ```sql
   UPDATE endorsement_tokens 
   SET used = 1, used_at = datetime('now')
   WHERE token = '{your-token}';
   ```

2. Open link:
   ```bash
   GET /api/endorsements/{token}
   ```

3. **Expected Result:**
   - Status: 400
   - Response:
     ```json
     {
       "error": "This endorsement link has already been used",
       "used": true,
       "usedAt": "2024-01-15T10:30:00.000Z"
     }
     ```

4. **Check Logs:**
   ```
   [STEP 3] Token already used
   usedAt: 2024-01-15T10:30:00.000Z
   === ENDORSEMENT TOKEN VALIDATION FAILED ===
   ```

---

### Test 4: Invalid Random Token

**Steps:**
1. Use a random string as token:
   ```bash
   GET /api/endorsements/random-invalid-token-12345
   ```

2. **Expected Result:**
   - Status: 404
   - Response:
     ```json
     {
       "error": "Invalid endorsement link",
       "tokenReceived": "random-invalid-tok...",
       "message": "The endorsement link you are trying to access is invalid or does not exist."
     }
     ```

3. **Check Logs:**
   ```
   [STEP 2] Token not found in database
   attemptedMethods: ['exact', 'url-decoded']
   === ENDORSEMENT TOKEN VALIDATION FAILED ===
   ```

---

### Test 5: URL Encoding Issues

**Test 5a: Space in Token (URL Encoded as %20)**
```bash
GET /api/endorsements/token%20with%20spaces
```

**Test 5b: Plus Sign (URL Encoded as %2B)**
```bash
GET /api/endorsements/token%2Bwith%2Bplus
```

**Test 5c: Percent Sign (URL Encoded as %25)**
```bash
GET /api/endorsements/token%25with%25percent
```

**Expected:** Token should be decoded and looked up correctly.

**Check Logs:**
```
[STEP 1] URL encoding check: hasEncodedChars: true
[STEP 2] Attempting URL-decoded lookup
[STEP 2] Token found in database (URL-decoded)
```

---

### Test 6: Extra Slashes or Query Parameters

**Test 6a: Extra Slashes**
```bash
GET /api/endorsements//token//with//slashes
```

**Test 6b: Query Parameters**
```bash
GET /api/endorsements/token?param=value&other=123
```

**Test 6c: Fragment Identifier**
```bash
GET /api/endorsements/token#fragment
```

**Expected:** Token should be cleaned and validated correctly.

**Note:** Use `cleanTokenFromUrl()` utility function if needed.

---

### Test 7: Case Sensitivity

**Steps:**
1. Create token (e.g., `AbC123XyZ`)
2. Try with different case:
   ```bash
   GET /api/endorsements/abc123xyz  # lowercase
   GET /api/endorsements/ABC123XYZ  # uppercase
   GET /api/endorsements/AbC123XyZ  # original
   ```

3. **Expected:** Only exact case match should work (case-sensitive).

**Check Logs:**
```
[STEP 2] Token not found with exact match
[STEP 2] Token not found after URL decoding
```

---

### Test 8: Missing Expiration Date

**Steps:**
1. Manually set expiration to NULL:
   ```sql
   UPDATE endorsement_tokens 
   SET expires_at = NULL
   WHERE token = '{your-token}';
   ```

2. Open link:
   ```bash
   GET /api/endorsements/{token}
   ```

3. **Expected Result:**
   - Status: 500
   - Response:
     ```json
     {
       "error": "Invalid token configuration",
       "message": "The endorsement link has an invalid expiration date."
     }
     ```

4. **Check Logs:**
   ```
   [STEP 3] Token missing expiration date
   error: Missing expiresAt field in database
   ```

---

### Test 9: Invalid Expiration Date Format

**Steps:**
1. Manually set invalid date format:
   ```sql
   UPDATE endorsement_tokens 
   SET expires_at = 'invalid-date-string'
   WHERE token = '{your-token}';
   ```

2. Open link:
   ```bash
   GET /api/endorsements/{token}
   ```

3. **Expected Result:**
   - Status: 500
   - Response:
     ```json
     {
       "error": "Invalid token configuration",
       "message": "The endorsement link has an invalid expiration date format."
     }
     ```

---

### Test 10: Server Time vs DB Time (UTC Handling)

**Steps:**
1. Check server timezone:
   ```bash
   node -e "console.log(new Date().toISOString())"
   ```

2. Check database timezone:
   ```sql
   SELECT datetime('now') as db_time, 
          datetime('now', 'utc') as db_utc;
   ```

3. Create token and verify expiration calculation:
   ```sql
   SELECT 
     token,
     expires_at,
     datetime('now') as current_time,
     CASE 
       WHEN datetime('now') > expires_at THEN 'EXPIRED'
       ELSE 'VALID'
     END as status
   FROM endorsement_tokens
   WHERE token = '{your-token}';
   ```

4. **Expected:** Expiration check should use UTC consistently.

**Check Logs:**
```
[STEP 3] Expiration time comparison
expiresAtISO: 2024-01-15T10:00:00.000Z
currentTimeISO: 2024-01-15T11:00:00.000Z
timeDifferenceHours: -1
isExpired: true
```

---

### Test 11: Double-Use Prevention

**Steps:**
1. Submit endorsement successfully:
   ```bash
   POST /api/endorsements/submit/{token}
   {
     "endorsementMessage": "Great student!",
     "strengthRating": 5
   }
   ```

2. Try to access link again:
   ```bash
   GET /api/endorsements/{token}
   ```

3. **Expected Result:**
   - Status: 400
   - Response: "This endorsement link has already been used"

4. **Check Logs:**
   ```
   [STEP 3] Token already used
   usedAt: 2024-01-15T10:30:00.000Z
   ```

---

### Test 12: Token with Whitespace

**Steps:**
1. Try token with leading/trailing spaces:
   ```bash
   GET /api/endorsements/  tokenwithspaces  
   ```

2. **Expected:** Token should be trimmed and looked up correctly.

**Check Logs:**
```
[STEP 1] Token after trimming
wasTrimmed: true
originalLength: 20
trimmedLength: 18
```

---

## Performance Testing

### Test 13: Concurrent Token Lookups

**Steps:**
1. Use load testing tool (e.g., `ab`, `wrk`):
   ```bash
   ab -n 1000 -c 10 http://localhost:3000/api/endorsements/{token}
   ```

2. **Expected:** All requests should complete successfully.

3. **Check Logs:** Verify no race conditions or database locking issues.

---

## Security Testing

### Test 14: SQL Injection Attempt

**Steps:**
1. Try malicious token:
   ```bash
   GET /api/endorsements/' OR '1'='1
   ```

2. **Expected:** Should return 404, not execute SQL.

3. **Check Logs:** Verify Prisma parameterized queries are used.

---

### Test 15: Token Brute Force

**Steps:**
1. Try multiple random tokens rapidly:
   ```bash
   for i in {1..100}; do
     curl http://localhost:3000/api/endorsements/random$i
   done
   ```

2. **Expected:** Should handle gracefully (consider rate limiting).

---

## Monitoring Checklist

After implementing, monitor:

- [ ] Token lookup success rate
- [ ] Average response time
- [ ] Error rate by type (not found, expired, used)
- [ ] URL encoding issues frequency
- [ ] Database query performance
- [ ] Log volume and storage

---

## Example Database Token Document

```sql
-- Example valid token record
INSERT INTO endorsement_tokens (
  id,
  student_id,
  email,
  token,
  expires_at,
  used,
  used_at,
  teacher_name,
  teacher_role,
  organization,
  created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'student-uuid-here',
  'teacher@example.com',
  'abc123xyz789base64urltokenhere',  -- Generated by crypto.randomBytes(32).toString('base64url')
  datetime('now', '+48 hours'),      -- 48 hours from now (UTC)
  0,                                  -- false (not used)
  NULL,                               -- null (not used yet)
  'Dr. John Smith',
  'Professor',
  'University Name',
  datetime('now')                    -- Current UTC time
);

-- Verify token
SELECT 
  id,
  token,
  expires_at,
  used,
  datetime('now') as current_time,
  CASE 
    WHEN datetime('now') > expires_at THEN 'EXPIRED'
    WHEN used = 1 THEN 'USED'
    ELSE 'VALID'
  END as status
FROM endorsement_tokens
WHERE token = 'abc123xyz789base64urltokenhere';
```

---

## Quick Test Script

```bash
#!/bin/bash
# Quick test script for endorsement tokens

TOKEN="your-test-token-here"
BASE_URL="http://localhost:3000"

echo "Test 1: Valid token"
curl -X GET "$BASE_URL/api/endorsements/$TOKEN" | jq

echo -e "\nTest 2: Invalid token"
curl -X GET "$BASE_URL/api/endorsements/invalid-token-123" | jq

echo -e "\nTest 3: URL encoded token"
ENCODED_TOKEN=$(echo "$TOKEN" | jq -rR @uri)
curl -X GET "$BASE_URL/api/endorsements/$ENCODED_TOKEN" | jq
```

---

## Success Criteria

✅ All test cases pass  
✅ Logs show detailed step-by-step validation  
✅ Error messages are clear and actionable  
✅ No security vulnerabilities  
✅ Performance is acceptable (< 100ms for token lookup)  
✅ UTC time handling is consistent  

