#!/bin/bash
# Complete Jobs Flow Test Script

API_URL="${API_URL:-http://localhost:3001}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== STEP 6: Jobs Flow Testing ==="
echo ""

# Step 1: Create test student
echo "Step 1: Create test student"
STUDENT_EMAIL="jobs_student_$(date +%s)@gmail.com"
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
      require('fs').writeFileSync('/tmp/jobs_student_otp.txt', otp.otp);
    }
    prisma.\$disconnect();
  });
});
" 2>&1 | grep -E "^[0-9]{6}$" || cat /tmp/jobs_student_otp.txt 2>/dev/null)

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
ENROLLMENT_ID="JOB$(date +%s)"
REGISTER_DATA=$(cat <<EOF
{
  "email": "$STUDENT_EMAIL",
  "password": "$STUDENT_PASSWORD",
  "role": "STUDENT",
  "verificationToken": "$VERIFICATION_TOKEN",
  "profile": {
    "fullName": "Jobs Test Student",
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
RECRUITER_EMAIL="jobs_recruiter_$(date +%s)@gmail.com"
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
      require('fs').writeFileSync('/tmp/jobs_recruiter_otp.txt', otp.otp);
    }
    prisma.\$disconnect();
  });
});
" 2>&1 | grep -E "^[0-9]{6}$" || cat /tmp/jobs_recruiter_otp.txt 2>/dev/null)

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
    "companyName": "Test Company Inc",
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
  echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"
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

# Step 3: Create a job
echo ""
echo "=== TEST 3: Create Job ==="
echo "3.1: Creating job..."

JOB_DATA=$(cat <<EOF
{
  "jobTitle": "Software Engineer - Test Position",
  "companyName": "Test Company Inc",
  "description": "Test job description for testing purposes",
  "requirements": "[\"React\", \"Node.js\", \"PostgreSQL\"]",
  "requiredSkills": ["React", "Node.js", "PostgreSQL"],
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
echo "$CREATE_JOB_RESPONSE" | jq '{id, title, status, isPosted}' 2>/dev/null

# Update job to POSTED status (normally done by admin, but for testing we'll do it)
echo ""
echo "3.2: Updating job to POSTED status..."
UPDATE_JOB_RESPONSE=$(curl -s -X PUT $API_URL/api/jobs/$JOB_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RECRUITER_TOKEN" \
  -d '{"status": "POSTED", "isPosted": true, "postedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"}')

echo "$UPDATE_JOB_RESPONSE" | jq '{id, status, isPosted}' 2>/dev/null || echo "Updated"

# Step 4: Test Get All Jobs
echo ""
echo "=== TEST 4: Get All Jobs ==="
ALL_JOBS_RESPONSE=$(curl -s -X GET $API_URL/api/jobs \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if echo "$ALL_JOBS_RESPONSE" | jq -e '.jobs' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Get all jobs successful${NC}"
  JOBS_COUNT=$(echo "$ALL_JOBS_RESPONSE" | jq '.jobs | length' 2>/dev/null || echo "0")
  echo "Jobs found: $JOBS_COUNT"
  echo "$ALL_JOBS_RESPONSE" | jq '{jobsCount: (.jobs | length), pagination}' 2>/dev/null
else
  echo -e "${RED}❌ Get all jobs failed${NC}"
  echo "$ALL_JOBS_RESPONSE" | head -5
fi

# Step 5: Test Get Targeted Jobs
echo ""
echo "=== TEST 5: Get Targeted Jobs (Student) ==="
TARGETED_JOBS_RESPONSE=$(curl -s -X GET $API_URL/api/jobs/targeted \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if echo "$TARGETED_JOBS_RESPONSE" | jq -e '.[0].id' > /dev/null 2>&1 || echo "$TARGETED_JOBS_RESPONSE" | jq -e '.length' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Get targeted jobs successful${NC}"
  TARGETED_COUNT=$(echo "$TARGETED_JOBS_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
  echo "Targeted jobs found: $TARGETED_COUNT"
  echo "$TARGETED_JOBS_RESPONSE" | jq '[.[0] | {id, title, company: .company.name}]' 2>/dev/null | head -10
else
  echo -e "${YELLOW}⚠️ No targeted jobs found (this may be expected)${NC}"
  echo "$TARGETED_JOBS_RESPONSE" | head -5
fi

# Step 6: Test Get Single Job
echo ""
echo "=== TEST 6: Get Single Job ==="
SINGLE_JOB_RESPONSE=$(curl -s -X GET $API_URL/api/jobs/$JOB_ID \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if echo "$SINGLE_JOB_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Get single job successful${NC}"
  echo "$SINGLE_JOB_RESPONSE" | jq '{id, title, description, status, company: .company.name}' 2>/dev/null
else
  echo -e "${RED}❌ Get single job failed${NC}"
  echo "$SINGLE_JOB_RESPONSE" | head -5
fi

# Step 7: Test Apply to Job
echo ""
echo "=== TEST 7: Apply to Job ==="
APPLY_RESPONSE=$(curl -s -X POST $API_URL/api/applications/jobs/$JOB_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d '{"coverLetter": "Test cover letter"}')

APPLICATION_ID=$(echo "$APPLY_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -n "$APPLICATION_ID" ] && [ "$APPLICATION_ID" != "null" ]; then
  echo -e "${GREEN}✅ Application submitted: $APPLICATION_ID${NC}"
  echo "$APPLY_RESPONSE" | jq '{id, status, jobId, studentId}' 2>/dev/null
else
  echo -e "${RED}❌ Application submission failed${NC}"
  echo "$APPLY_RESPONSE" | jq . 2>/dev/null || echo "$APPLY_RESPONSE"
fi

# Step 8: Test Get Student Applications
echo ""
echo "=== TEST 8: Get Student Applications ==="
APPLICATIONS_RESPONSE=$(curl -s -X GET $API_URL/api/applications \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if echo "$APPLICATIONS_RESPONSE" | jq -e '.applications' > /dev/null 2>&1 || echo "$APPLICATIONS_RESPONSE" | jq -e '.[0].id' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Get applications successful${NC}"
  if echo "$APPLICATIONS_RESPONSE" | jq -e '.applications' > /dev/null 2>&1; then
    APP_COUNT=$(echo "$APPLICATIONS_RESPONSE" | jq '.applications | length' 2>/dev/null || echo "0")
    echo "Applications found: $APP_COUNT"
    echo "$APPLICATIONS_RESPONSE" | jq '{applicationsCount: (.applications | length), applications: [.applications[0] | {id, status, job: .job.title}]}' 2>/dev/null
  else
    APP_COUNT=$(echo "$APPLICATIONS_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
    echo "Applications found: $APP_COUNT"
    echo "$APPLICATIONS_RESPONSE" | jq '[.[0] | {id, status, job: .job.title}]' 2>/dev/null
  fi
else
  echo -e "${YELLOW}⚠️ No applications found or error${NC}"
  echo "$APPLICATIONS_RESPONSE" | head -5
fi

echo ""
echo -e "${GREEN}=== Jobs Flow Tests Complete ===${NC}"

# Save tokens for cleanup
echo "STUDENT_TOKEN=$STUDENT_TOKEN" >> /tmp/jobs_test_data.txt
echo "RECRUITER_TOKEN=$RECRUITER_TOKEN" >> /tmp/jobs_test_data.txt
echo "JOB_ID=$JOB_ID" >> /tmp/jobs_test_data.txt

