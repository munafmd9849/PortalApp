#!/bin/bash
# Complete Student Dashboard Flow Test Script

API_URL="${API_URL:-http://localhost:3001}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== STEP 5: Student Dashboard Flows Testing ==="
echo ""

# Step 1: Create test user
TEST_EMAIL="student_test_$(date +%s)@gmail.com"
TEST_PASSWORD="TestPassword123!"
ENROLLMENT_ID="STU$(date +%s)"

echo "Step 1: Create test user"
echo "Email: $TEST_EMAIL"

# Send OTP
echo "1.1: Sending OTP..."
OTP_RESPONSE=$(curl -s -X POST $API_URL/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

if echo "$OTP_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ OTP sent${NC}"
else
  echo -e "${RED}❌ OTP send failed${NC}"
  echo "$OTP_RESPONSE"
  exit 1
fi

sleep 4

# Get OTP from database
echo "1.2: Getting OTP from database..."
cd /Users/saicharan/Downloads/Portal-main/backend
OTP_CODE=$(node -e "
import('./src/config/database.js').then(({default: prisma}) => {
  prisma.oTP.findFirst({
    where: { email: '$TEST_EMAIL', isUsed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }
  }).then(otp => {
    if (otp) {
      console.log(otp.otp);
      require('fs').writeFileSync('/tmp/test_otp.txt', otp.otp);
    } else {
      console.error('No OTP found');
      process.exit(1);
    }
    prisma.\$disconnect();
  });
});
" 2>&1 | grep -E "^[0-9]{6}$" || echo "")

if [ -z "$OTP_CODE" ]; then
  OTP_CODE=$(cat /tmp/test_otp.txt 2>/dev/null)
fi

if [ -z "$OTP_CODE" ]; then
  echo -e "${RED}❌ Could not get OTP${NC}"
  exit 1
fi

echo "OTP Code: $OTP_CODE"

# Verify OTP
echo "1.3: Verifying OTP..."
VERIFY_RESPONSE=$(curl -s -X POST $API_URL/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"otp\": \"$OTP_CODE\"}")

VERIFICATION_TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r '.verificationToken' 2>/dev/null)

if [ -z "$VERIFICATION_TOKEN" ] || [ "$VERIFICATION_TOKEN" = "null" ]; then
  echo -e "${RED}❌ OTP verification failed${NC}"
  echo "$VERIFY_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ OTP verified${NC}"

# Register
echo "1.4: Registering user..."
REGISTER_DATA=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD",
  "role": "STUDENT",
  "verificationToken": "$VERIFICATION_TOKEN",
  "profile": {
    "fullName": "Student Test User",
    "enrollmentId": "$ENROLLMENT_ID",
    "phone": "1234567890",
    "batch": "25-29",
    "center": "BANGALORE",
    "school": "SOT"
  }
}
EOF
)

REGISTER_RESPONSE=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA")

USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id' 2>/dev/null)

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
  echo -e "${RED}❌ Registration failed${NC}"
  echo "$REGISTER_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ User registered: $USER_ID${NC}"

# Login
echo "1.5: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken' 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "Access Token: ${ACCESS_TOKEN:0:50}..."

# Save tokens
echo "TEST_EMAIL=$TEST_EMAIL" >> /tmp/full_test.txt
echo "USER_ID=$USER_ID" >> /tmp/full_test.txt
echo "ACCESS_TOKEN=$ACCESS_TOKEN" >> /tmp/full_test.txt

# Step 2: Test Profile
echo ""
echo "=== TEST 2: Get Student Profile ==="
PROFILE_RESPONSE=$(curl -s -X GET $API_URL/api/students/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$PROFILE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Profile loaded${NC}"
  echo "$PROFILE_RESPONSE" | jq '{id, fullName, email, skillsCount: (.skills | length), educationCount: (.education | length), projectsCount: (.projects | length), achievementsCount: (.achievements | length)}' 2>/dev/null
else
  echo -e "${RED}❌ Profile load failed${NC}"
  echo "$PROFILE_RESPONSE" | head -5
  exit 1
fi

# Step 3: Test Profile Update
echo ""
echo "=== TEST 3: Update Profile ==="
UPDATE_RESPONSE=$(curl -s -X PUT $API_URL/api/students/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"bio": "Updated bio", "headline": "Test Headline", "cgpa": 8.5}')

if echo "$UPDATE_RESPONSE" | jq -e '.bio' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Profile updated${NC}"
  echo "$UPDATE_RESPONSE" | jq '{bio, headline, cgpa}' 2>/dev/null
else
  echo -e "${RED}❌ Profile update failed${NC}"
  echo "$UPDATE_RESPONSE" | head -3
fi

# Step 4: Test Skills CRUD
echo ""
echo "=== TEST 4: Skills CRUD ==="

echo "4.1: Add Skill"
SKILL_RESPONSE=$(curl -s -X POST $API_URL/api/students/skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"skillName": "React", "rating": 5}')

SKILL_ID=$(echo "$SKILL_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -n "$SKILL_ID" ] && [ "$SKILL_ID" != "null" ]; then
  echo -e "${GREEN}✅ Skill added: $SKILL_ID${NC}"
  
  echo "4.2: Update Skill"
  UPDATE_SKILL=$(curl -s -X POST $API_URL/api/students/skills \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"skillName": "React", "rating": 4}')
  
  echo "4.3: Delete Skill"
  DELETE_SKILL=$(curl -s -X DELETE $API_URL/api/students/skills/$SKILL_ID \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  if echo "$DELETE_SKILL" | jq -e '.message' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Skill deleted${NC}"
  fi
else
  echo -e "${RED}❌ Skill add failed${NC}"
fi

# Step 5: Test Education CRUD
echo ""
echo "=== TEST 5: Education CRUD ==="

echo "5.1: Add Education"
EDU_RESPONSE=$(curl -s -X POST $API_URL/api/students/education \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"degree": "B.Tech", "institution": "Test University", "startYear": 2021, "endYear": 2025, "cgpa": 8.5}')

EDU_ID=$(echo "$EDU_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -n "$EDU_ID" ] && [ "$EDU_ID" != "null" ]; then
  echo -e "${GREEN}✅ Education added: $EDU_ID${NC}"
  
  echo "5.2: Update Education"
  UPDATE_EDU=$(curl -s -X PUT $API_URL/api/students/education/$EDU_ID \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"cgpa": 9.0}')
  
  echo "5.3: Delete Education"
  DELETE_EDU=$(curl -s -X DELETE $API_URL/api/students/education/$EDU_ID \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  if echo "$DELETE_EDU" | jq -e '.message' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Education deleted${NC}"
  fi
else
  echo -e "${RED}❌ Education add failed${NC}"
fi

# Step 6: Test Projects CRUD
echo ""
echo "=== TEST 6: Projects CRUD ==="

echo "6.1: Add Project"
PROJ_RESPONSE=$(curl -s -X POST $API_URL/api/students/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"title": "Test Project", "description": "Test desc", "technologies": "React, Node.js"}')

PROJ_ID=$(echo "$PROJ_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -n "$PROJ_ID" ] && [ "$PROJ_ID" != "null" ]; then
  echo -e "${GREEN}✅ Project added: $PROJ_ID${NC}"
  
  echo "6.2: Update Project"
  UPDATE_PROJ=$(curl -s -X PUT $API_URL/api/students/projects/$PROJ_ID \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"title": "Updated Project"}')
  
  echo "6.3: Delete Project"
  DELETE_PROJ=$(curl -s -X DELETE $API_URL/api/students/projects/$PROJ_ID \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  if echo "$DELETE_PROJ" | jq -e '.message' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Project deleted${NC}"
  fi
else
  echo -e "${RED}❌ Project add failed${NC}"
fi

# Step 7: Test Achievements CRUD
echo ""
echo "=== TEST 7: Achievements CRUD ==="

echo "7.1: Add Achievement"
ACH_RESPONSE=$(curl -s -X POST $API_URL/api/students/achievements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"title": "Test Achievement", "description": "Test desc", "date": "2024-01-15T00:00:00Z"}')

ACH_ID=$(echo "$ACH_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -n "$ACH_ID" ] && [ "$ACH_ID" != "null" ]; then
  echo -e "${GREEN}✅ Achievement added: $ACH_ID${NC}"
  
  echo "7.2: Update Achievement"
  UPDATE_ACH=$(curl -s -X PUT $API_URL/api/students/achievements/$ACH_ID \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"title": "Updated Achievement"}')
  
  echo "7.3: Delete Achievement"
  DELETE_ACH=$(curl -s -X DELETE $API_URL/api/students/achievements/$ACH_ID \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  if echo "$DELETE_ACH" | jq -e '.message' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Achievement deleted${NC}"
  fi
else
  echo -e "${RED}❌ Achievement add failed${NC}"
fi

echo ""
echo -e "${GREEN}=== Student Dashboard Tests Complete ===${NC}"

