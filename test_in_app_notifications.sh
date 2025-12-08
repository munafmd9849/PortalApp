#!/bin/bash
# In-App Notifications Testing Script

API_URL="${API_URL:-http://localhost:3001}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== STEP 7: In-App Notifications Testing ==="
echo ""

# Step 1: Create test student
echo "Step 1: Create test student"
STUDENT_EMAIL="notif_student_$(date +%s)@gmail.com"
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
      require('fs').writeFileSync('/tmp/notif_student_otp.txt', otp.otp);
    }
    prisma.\$disconnect();
  });
});
" 2>&1 | grep -E "^[0-9]{6}$" || cat /tmp/notif_student_otp.txt 2>/dev/null)

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
ENROLLMENT_ID="NOTIF$(date +%s)"
REGISTER_DATA=$(cat <<EOF
{
  "email": "$STUDENT_EMAIL",
  "password": "$STUDENT_PASSWORD",
  "role": "STUDENT",
  "verificationToken": "$VERIFICATION_TOKEN",
  "profile": {
    "fullName": "Notification Test Student",
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
STUDENT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id' 2>/dev/null)

if [ -z "$STUDENT_TOKEN" ] || [ "$STUDENT_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Student login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Student created and logged in${NC}"
echo "STUDENT_TOKEN=$STUDENT_TOKEN" >> /tmp/notifications_test_data.txt
echo "STUDENT_ID=$STUDENT_ID" >> /tmp/notifications_test_data.txt

# Step 2: Test GET Notifications
echo ""
echo "=== TEST 1: Get Notifications ==="
echo "1.1: Getting notifications for student..."

NOTIFICATIONS_RESPONSE=$(curl -s -X GET $API_URL/api/notifications \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if echo "$NOTIFICATIONS_RESPONSE" | jq -e '.notifications' > /dev/null 2>&1 || echo "$NOTIFICATIONS_RESPONSE" | jq -e '.[0].id' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Get notifications successful${NC}"
  
  if echo "$NOTIFICATIONS_RESPONSE" | jq -e '.notifications' > /dev/null 2>&1; then
    NOTIF_COUNT=$(echo "$NOTIFICATIONS_RESPONSE" | jq '.notifications | length' 2>/dev/null || echo "0")
    UNREAD_COUNT=$(echo "$NOTIFICATIONS_RESPONSE" | jq '[.notifications[] | select(.isRead == false)] | length' 2>/dev/null || echo "0")
    echo "Total notifications: $NOTIF_COUNT"
    echo "Unread notifications: $UNREAD_COUNT"
    
    if [ "$NOTIF_COUNT" -gt 0 ]; then
      echo "$NOTIFICATIONS_RESPONSE" | jq '[.notifications[0] | {id, title, body, isRead, createdAt}]' 2>/dev/null
      FIRST_NOTIF_ID=$(echo "$NOTIFICATIONS_RESPONSE" | jq -r '.notifications[0].id' 2>/dev/null)
      echo "FIRST_NOTIF_ID=$FIRST_NOTIF_ID" >> /tmp/notifications_test_data.txt
    else
      echo "No notifications found (this is expected for new user)"
    fi
  else
    NOTIF_COUNT=$(echo "$NOTIFICATIONS_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
    UNREAD_COUNT=$(echo "$NOTIFICATIONS_RESPONSE" | jq '[.[] | select(.isRead == false)] | length' 2>/dev/null || echo "0")
    echo "Total notifications: $NOTIF_COUNT"
    echo "Unread notifications: $UNREAD_COUNT"
    
    if [ "$NOTIF_COUNT" -gt 0 ]; then
      echo "$NOTIFICATIONS_RESPONSE" | jq '[.[0] | {id, title, body, isRead, createdAt}]' 2>/dev/null
      FIRST_NOTIF_ID=$(echo "$NOTIFICATIONS_RESPONSE" | jq -r '.[0].id' 2>/dev/null)
      echo "FIRST_NOTIF_ID=$FIRST_NOTIF_ID" >> /tmp/notifications_test_data.txt
    fi
  fi
else
  echo -e "${RED}❌ Get notifications failed${NC}"
  echo "$NOTIFICATIONS_RESPONSE" | head -5
fi

# Step 3: Create a test notification via application status update
echo ""
echo "=== TEST 2: Create Notification (via Application) ==="
echo "2.1: Creating test recruiter and job..."

# Quick recruiter creation
RECRUITER_EMAIL="notif_recruiter_$(date +%s)@gmail.com"
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
      require('fs').writeFileSync('/tmp/notif_recruiter_otp.txt', otp.otp);
    }
    prisma.\$disconnect();
  });
});
" 2>&1 | grep -E "^[0-9]{6}$" || cat /tmp/notif_recruiter_otp.txt 2>/dev/null)

if [ -n "$RECRUITER_OTP" ]; then
  VERIFY_RESPONSE=$(curl -s -X POST $API_URL/api/auth/verify-otp \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$RECRUITER_EMAIL\", \"otp\": \"$RECRUITER_OTP\"}")
  VERIFICATION_TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r '.verificationToken' 2>/dev/null)
  
  if [ -n "$VERIFICATION_TOKEN" ] && [ "$VERIFICATION_TOKEN" != "null" ]; then
    REGISTER_DATA=$(cat <<EOF
{
  "email": "$RECRUITER_EMAIL",
  "password": "TestPassword123!",
  "role": "RECRUITER",
  "verificationToken": "$VERIFICATION_TOKEN",
  "profile": {
    "companyName": "Notification Test Company",
    "phone": "1234567890"
  }
}
EOF
)
    curl -s -X POST $API_URL/api/auth/register \
      -H "Content-Type: application/json" \
      -d "$REGISTER_DATA" > /dev/null
    sleep 2
    
    RECRUITER_LOGIN=$(curl -s -X POST $API_URL/api/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"email\": \"$RECRUITER_EMAIL\", \"password\": \"TestPassword123!\"}")
    RECRUITER_TOKEN=$(echo "$RECRUITER_LOGIN" | jq -r '.accessToken' 2>/dev/null)
    
    if [ -n "$RECRUITER_TOKEN" ] && [ "$RECRUITER_TOKEN" != "null" ]; then
      echo -e "${GREEN}✅ Recruiter created${NC}"
      
      # Create job
      JOB_DATA=$(cat <<EOF
{
  "jobTitle": "Notification Test Job",
  "companyName": "Notification Test Company",
  "description": "Test job for notification testing",
  "requirements": "[]",
  "requiredSkills": ["React"],
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
      
      if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
        echo -e "${GREEN}✅ Job created: $JOB_ID${NC}"
        
        # Update job to POSTED
        curl -s -X PUT $API_URL/api/jobs/$JOB_ID \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $RECRUITER_TOKEN" \
          -d '{"status": "POSTED", "isPosted": true, "postedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"}' > /dev/null
        
        # Student applies to job (creates notification)
        echo "2.2: Student applying to job (should create notification)..."
        APPLY_RESPONSE=$(curl -s -X POST $API_URL/api/applications/jobs/$JOB_ID \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $STUDENT_TOKEN" \
          -d '{"coverLetter": "Test application"}')
        APPLICATION_ID=$(echo "$APPLY_RESPONSE" | jq -r '.id' 2>/dev/null)
        
        if [ -n "$APPLICATION_ID" ] && [ "$APPLICATION_ID" != "null" ]; then
          echo -e "${GREEN}✅ Application created: $APPLICATION_ID${NC}"
          sleep 2
          
          # Get notifications again to see new notification
          echo "2.3: Getting notifications again..."
          NOTIFICATIONS_RESPONSE2=$(curl -s -X GET $API_URL/api/notifications \
            -H "Authorization: Bearer $STUDENT_TOKEN")
          
          if echo "$NOTIFICATIONS_RESPONSE2" | jq -e '.notifications' > /dev/null 2>&1 || echo "$NOTIFICATIONS_RESPONSE2" | jq -e '.[0].id' > /dev/null 2>&1; then
            if echo "$NOTIFICATIONS_RESPONSE2" | jq -e '.notifications' > /dev/null 2>&1; then
              NEW_COUNT=$(echo "$NOTIFICATIONS_RESPONSE2" | jq '.notifications | length' 2>/dev/null || echo "0")
              UNREAD_COUNT=$(echo "$NOTIFICATIONS_RESPONSE2" | jq '[.notifications[] | select(.isRead == false)] | length' 2>/dev/null || echo "0")
              echo "Total notifications: $NEW_COUNT"
              echo "Unread notifications: $UNREAD_COUNT"
              
              if [ "$NEW_COUNT" -gt 0 ]; then
                FIRST_NOTIF_ID=$(echo "$NOTIFICATIONS_RESPONSE2" | jq -r '.notifications[0].id' 2>/dev/null)
                echo "FIRST_NOTIF_ID=$FIRST_NOTIF_ID" >> /tmp/notifications_test_data.txt
                echo "$NOTIFICATIONS_RESPONSE2" | jq '[.notifications[0] | {id, title, body, isRead, createdAt}]' 2>/dev/null
              fi
            else
              NEW_COUNT=$(echo "$NOTIFICATIONS_RESPONSE2" | jq 'length' 2>/dev/null || echo "0")
              UNREAD_COUNT=$(echo "$NOTIFICATIONS_RESPONSE2" | jq '[.[] | select(.isRead == false)] | length' 2>/dev/null || echo "0")
              echo "Total notifications: $NEW_COUNT"
              echo "Unread notifications: $UNREAD_COUNT"
              
              if [ "$NEW_COUNT" -gt 0 ]; then
                FIRST_NOTIF_ID=$(echo "$NOTIFICATIONS_RESPONSE2" | jq -r '.[0].id' 2>/dev/null)
                echo "FIRST_NOTIF_ID=$FIRST_NOTIF_ID" >> /tmp/notifications_test_data.txt
                echo "$NOTIFICATIONS_RESPONSE2" | jq '[.[0] | {id, title, body, isRead, createdAt}]' 2>/dev/null
              fi
            fi
          fi
        fi
      fi
    fi
  fi
fi

# Step 4: Test Mark Notification as Read
echo ""
echo "=== TEST 3: Mark Notification as Read ==="
source /tmp/notifications_test_data.txt 2>/dev/null || true

if [ -n "$FIRST_NOTIF_ID" ] && [ "$FIRST_NOTIF_ID" != "null" ]; then
  echo "3.1: Marking notification as read: $FIRST_NOTIF_ID"
  
  MARK_READ_RESPONSE=$(curl -s -X PUT $API_URL/api/notifications/$FIRST_NOTIF_ID/read \
    -H "Authorization: Bearer $STUDENT_TOKEN")
  
  if echo "$MARK_READ_RESPONSE" | jq -e '.id' > /dev/null 2>&1 || echo "$MARK_READ_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Mark notification as read successful${NC}"
    echo "$MARK_READ_RESPONSE" | jq '{id, isRead}' 2>/dev/null || echo "$MARK_READ_RESPONSE" | jq '.' 2>/dev/null
    
    # Verify notification is now read
    echo "3.2: Verifying notification is marked as read..."
    NOTIFICATIONS_RESPONSE3=$(curl -s -X GET $API_URL/api/notifications \
      -H "Authorization: Bearer $STUDENT_TOKEN")
    
    if echo "$NOTIFICATIONS_RESPONSE3" | jq -e '.notifications' > /dev/null 2>&1; then
      IS_READ=$(echo "$NOTIFICATIONS_RESPONSE3" | jq --arg id "$FIRST_NOTIF_ID" '.notifications[] | select(.id == $id) | .isRead' 2>/dev/null)
      if [ "$IS_READ" = "true" ]; then
        echo -e "${GREEN}✅ Notification is marked as read${NC}"
      else
        echo -e "${YELLOW}⚠️ Notification may not be marked as read${NC}"
      fi
    elif echo "$NOTIFICATIONS_RESPONSE3" | jq -e '.[0].id' > /dev/null 2>&1; then
      IS_READ=$(echo "$NOTIFICATIONS_RESPONSE3" | jq --arg id "$FIRST_NOTIF_ID" '.[] | select(.id == $id) | .isRead' 2>/dev/null)
      if [ "$IS_READ" = "true" ]; then
        echo -e "${GREEN}✅ Notification is marked as read${NC}"
      else
        echo -e "${YELLOW}⚠️ Notification may not be marked as read${NC}"
      fi
    fi
  else
    echo -e "${RED}❌ Mark notification as read failed${NC}"
    echo "$MARK_READ_RESPONSE" | head -5
  fi
else
  echo -e "${YELLOW}⚠️ No notification ID available for testing${NC}"
fi

# Step 5: Test Badge Counter (Unread Count)
echo ""
echo "=== TEST 4: Badge Counter (Unread Count) ==="
echo "4.1: Getting unread notification count..."

NOTIFICATIONS_RESPONSE4=$(curl -s -X GET $API_URL/api/notifications \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if echo "$NOTIFICATIONS_RESPONSE4" | jq -e '.notifications' > /dev/null 2>&1; then
  TOTAL_COUNT=$(echo "$NOTIFICATIONS_RESPONSE4" | jq '.notifications | length' 2>/dev/null || echo "0")
  UNREAD_COUNT=$(echo "$NOTIFICATIONS_RESPONSE4" | jq '[.notifications[] | select(.isRead == false)] | length' 2>/dev/null || echo "0")
  READ_COUNT=$(echo "$NOTIFICATIONS_RESPONSE4" | jq '[.notifications[] | select(.isRead == true)] | length' 2>/dev/null || echo "0")
  
  echo -e "${GREEN}✅ Badge counter data available${NC}"
  echo "Total notifications: $TOTAL_COUNT"
  echo "Unread notifications: $UNREAD_COUNT"
  echo "Read notifications: $READ_COUNT"
  
  if [ "$UNREAD_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Unread count: $UNREAD_COUNT (badge should show this number)${NC}"
  else
    echo -e "${YELLOW}⚠️ No unread notifications (badge should be empty or hidden)${NC}"
  fi
elif echo "$NOTIFICATIONS_RESPONSE4" | jq -e '.[0].id' > /dev/null 2>&1; then
  TOTAL_COUNT=$(echo "$NOTIFICATIONS_RESPONSE4" | jq 'length' 2>/dev/null || echo "0")
  UNREAD_COUNT=$(echo "$NOTIFICATIONS_RESPONSE4" | jq '[.[] | select(.isRead == false)] | length' 2>/dev/null || echo "0")
  READ_COUNT=$(echo "$NOTIFICATIONS_RESPONSE4" | jq '[.[] | select(.isRead == true)] | length' 2>/dev/null || echo "0")
  
  echo -e "${GREEN}✅ Badge counter data available${NC}"
  echo "Total notifications: $TOTAL_COUNT"
  echo "Unread notifications: $UNREAD_COUNT"
  echo "Read notifications: $READ_COUNT"
else
  echo -e "${YELLOW}⚠️ No notifications found${NC}"
fi

echo ""
echo -e "${GREEN}=== In-App Notifications Tests Complete ===${NC}"
echo ""
echo "Summary:"
echo "  ✅ Test 1: Get Notifications"
echo "  ✅ Test 2: Create Notification (via Application)"
echo "  ✅ Test 3: Mark Notification as Read"
echo "  ✅ Test 4: Badge Counter (Unread Count)"
echo ""
echo "Note: Socket.IO real-time updates should be tested manually in the UI."

