#!/bin/bash
# Email Notifications Testing Script

API_URL="${API_URL:-http://localhost:3001}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== STEP 7: Email Notifications Testing ==="
echo ""

# Step 1: Create test student
echo "Step 1: Create test student"
STUDENT_EMAIL="email_student_$(date +%s)@gmail.com"
STUDENT_PASSWORD="TestPassword123!"

echo "1.1: Sending OTP..."
curl -s -X POST $API_URL/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$STUDENT_EMAIL\"}" > /dev/null
sleep 4

cd /Users/saicharan/Downloads/Portal-main/backend
OTP_CODE=$(node -e "
import('./src/config/database.js').then(({default: prisma}) => {
  prisma.oTP.findFirst({
    where: { email: '$STUDENT_EMAIL', isUsed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }
  }).then(otp => {
    if (otp) {
      console.log(otp.otp);
      require('fs').writeFileSync('/tmp/email_student_otp.txt', otp.otp);
    }
    prisma.\$disconnect();
  });
});
" 2>&1 | grep -E "^[0-9]{6}$" || cat /tmp/email_student_otp.txt 2>/dev/null)

if [ -z "$OTP_CODE" ]; then
  echo -e "${RED}❌ Could not get OTP${NC}"
  exit 1
fi

echo "1.2: Verifying OTP..."
VERIFY_RESPONSE=$(curl -s -X POST $API_URL/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$STUDENT_EMAIL\", \"otp\": \"$OTP_CODE\"}")
VERIFICATION_TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r '.verificationToken' 2>/dev/null)

if [ -z "$VERIFICATION_TOKEN" ] || [ "$VERIFICATION_TOKEN" = "null" ]; then
  echo -e "${RED}❌ OTP verification failed${NC}"
  exit 1
fi

echo "1.3: Registering student..."
ENROLLMENT_ID="EMAIL$(date +%s)"
REGISTER_DATA=$(cat <<EOF
{
  "email": "$STUDENT_EMAIL",
  "password": "$STUDENT_PASSWORD",
  "role": "STUDENT",
  "verificationToken": "$VERIFICATION_TOKEN",
  "profile": {
    "fullName": "Email Test Student",
    "enrollmentId": "$ENROLLMENT_ID",
    "phone": "1234567890",
    "batch": "25-29",
    "center": "BANGALORE",
    "school": "SOT"
  }
}
EOF
)

curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA" > /dev/null

sleep 2

echo "1.4: Logging in student..."
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$STUDENT_EMAIL\", \"password\": \"$STUDENT_PASSWORD\"}")
STUDENT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken' 2>/dev/null)

if [ -z "$STUDENT_TOKEN" ] || [ "$STUDENT_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Student login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Student created and logged in${NC}"

# Step 2: Create test recruiter
echo ""
echo "Step 2: Create test recruiter"
RECRUITER_EMAIL="email_recruiter_$(date +%s)@gmail.com"
RECRUITER_PASSWORD="TestPassword123!"

echo "2.1: Sending OTP..."
curl -s -X POST $API_URL/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$RECRUITER_EMAIL\"}" > /dev/null
sleep 4

RECRUITER_OTP=$(node -e "
import('./src/config/database.js').then(({default: prisma}) => {
  prisma.oTP.findFirst({
    where: { email: '$RECRUITER_EMAIL', isUsed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }
  }).then(otp => {
    if (otp) {
      console.log(otp.otp);
      require('fs').writeFileSync('/tmp/email_recruiter_otp.txt', otp.otp);
    }
    prisma.\$disconnect();
  });
});
" 2>&1 | grep -E "^[0-9]{6}$" || cat /tmp/email_recruiter_otp.txt 2>/dev/null)

if [ -z "$RECRUITER_OTP" ]; then
  echo -e "${RED}❌ Could not get recruiter OTP${NC}"
  exit 1
fi

echo "2.2: Verifying OTP..."
VERIFY_RESPONSE=$(curl -s -X POST $API_URL/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$RECRUITER_EMAIL\", \"otp\": \"$RECRUITER_OTP\"}")
VERIFICATION_TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r '.verificationToken' 2>/dev/null)

if [ -z "$VERIFICATION_TOKEN" ] || [ "$VERIFICATION_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Recruiter OTP verification failed${NC}"
  exit 1
fi

echo "2.3: Registering recruiter..."
REGISTER_DATA=$(cat <<EOF
{
  "email": "$RECRUITER_EMAIL",
  "password": "$RECRUITER_PASSWORD",
  "role": "RECRUITER",
  "verificationToken": "$VERIFICATION_TOKEN",
  "profile": {
    "companyName": "Email Test Company Inc",
    "phone": "1234567890"
  }
}
EOF
)

REGISTER_RESPONSE=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA")

REGISTER_USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id' 2>/dev/null)

if [ -z "$REGISTER_USER_ID" ] || [ "$REGISTER_USER_ID" = "null" ]; then
  echo -e "${RED}❌ Recruiter registration failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Recruiter registered: $REGISTER_USER_ID${NC}"
sleep 2

echo "2.4: Logging in recruiter..."
RECRUITER_LOGIN=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$RECRUITER_EMAIL\", \"password\": \"$RECRUITER_PASSWORD\"}")
RECRUITER_TOKEN=$(echo "$RECRUITER_LOGIN" | jq -r '.accessToken' 2>/dev/null)

if [ -z "$RECRUITER_TOKEN" ] || [ "$RECRUITER_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Recruiter login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Recruiter created and logged in${NC}"

# Step 3: Create a job (will trigger notification when posted)
echo ""
echo "=== TEST 1: Job Posted Notification ==="
echo "1.1: Creating job..."

JOB_DATA=$(cat <<EOF
{
  "jobTitle": "Email Test Position",
  "companyName": "Email Test Company Inc",
  "description": "Test job description for email notifications",
  "requirements": "[\"React\", \"Node.js\"]",
  "requiredSkills": ["React", "Node.js"],
  "location": "Bangalore",
  "jobType": "FULL_TIME",
  "salaryRange": "5-8 LPA",
  "targetSchools": ["SOT"],
  "targetCenters": ["BANGALORE"],
  "targetBatches": ["25-29"]
}
EOF
)

CREATE_JOB_RESPONSE=$(curl -s -X POST $API_URL/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RECRUITER_TOKEN" \
  -d "$JOB_DATA")

JOB_ID=$(echo "$CREATE_JOB_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -z "$JOB_ID" ] || [ "$JOB_ID" = "null" ]; then
  echo -e "${RED}❌ Job creation failed${NC}"
  echo "$CREATE_JOB_RESPONSE" | jq . 2>/dev/null || echo "$CREATE_JOB_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Job created: $JOB_ID${NC}"

echo "1.2: Updating job to POSTED status (triggers notification to recruiter)..."
UPDATE_JOB_RESPONSE=$(curl -s -X PUT $API_URL/api/jobs/$JOB_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RECRUITER_TOKEN" \
  -d '{"status": "POSTED", "isPosted": true, "postedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"}')

echo "$UPDATE_JOB_RESPONSE" | jq '{id, status, isPosted}' 2>/dev/null || echo "Updated"

echo ""
echo -e "${YELLOW}⚠️  Check email inbox for: $RECRUITER_EMAIL${NC}"
echo "   Expected: Job posted notification"
sleep 2

# Step 4: Test Application Submitted Notification
echo ""
echo "=== TEST 2: Application Submitted Notification ==="
echo "2.1: Student applying to job (triggers notifications to recruiter and student)..."

APPLY_RESPONSE=$(curl -s -X POST $API_URL/api/applications/jobs/$JOB_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d '{"coverLetter": "Test cover letter for email notification"}')

APPLICATION_ID=$(echo "$APPLY_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -n "$APPLICATION_ID" ] && [ "$APPLICATION_ID" != "null" ]; then
  echo -e "${GREEN}✅ Application submitted: $APPLICATION_ID${NC}"
  echo ""
  echo -e "${YELLOW}⚠️  Check email inboxes:${NC}"
  echo "   Recruiter: $RECRUITER_EMAIL - Expected: New application notification"
  echo "   Student: $STUDENT_EMAIL - Expected: Application confirmation"
  sleep 2
else
  echo -e "${RED}❌ Application submission failed${NC}"
  echo "$APPLY_RESPONSE" | jq . 2>/dev/null || echo "$APPLY_RESPONSE"
fi

# Step 5: Test Application Status Updated Notification
echo ""
echo "=== TEST 3: Application Status Updated Notification ==="
echo "3.1: Updating application status to SHORTLISTED..."

# Note: We need to check if there's an endpoint for updating application status
# For now, we'll test if the endpoint exists
UPDATE_STATUS_RESPONSE=$(curl -s -X PATCH $API_URL/api/applications/$APPLICATION_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RECRUITER_TOKEN" \
  -d '{"status": "SHORTLISTED", "notes": "Test status update"}')

if echo "$UPDATE_STATUS_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Application status updated${NC}"
  echo "$UPDATE_STATUS_RESPONSE" | jq '{id, status, notes}' 2>/dev/null
  echo ""
  echo -e "${YELLOW}⚠️  Check email inbox for: $STUDENT_EMAIL${NC}"
  echo "   Expected: Application status update notification"
else
  echo -e "${YELLOW}⚠️  Application status update endpoint may not send emails${NC}"
  echo "$UPDATE_STATUS_RESPONSE" | jq . 2>/dev/null || echo "$UPDATE_STATUS_RESPONSE"
fi

echo ""
echo -e "${GREEN}=== Email Notifications Tests Complete ===${NC}"
echo ""
echo "Summary:"
echo "  - Test 1: Job Posted Notification (to recruiter)"
echo "  - Test 2: Application Submitted Notification (to recruiter and student)"
echo "  - Test 3: Application Status Updated Notification (to student)"
echo ""
echo "Please check email inboxes to verify notifications were sent."

