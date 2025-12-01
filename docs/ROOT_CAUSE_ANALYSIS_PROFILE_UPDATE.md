# 🔍 Root Cause Analysis: Profile Update Failure

## **Error Message**
```
Failed to save profile. Failed to update profile
```

## **Exact Failing Flow**

### **1. Frontend Request**
- **File**: `frontend/src/pages/dashboard/StudentDashboard.jsx:658`
- **Line**: 658
- **Code**: `await updateCompleteStudentProfile(user.id, profileData, []);`
- **Payload**: Includes `Headline` (capital H), `profilePhoto`, and trimmed empty strings

### **2. Service Call**
- **File**: `frontend/src/services/students.js:53`
- **Line**: 53
- **Code**: `const updated = await api.updateStudentProfile(profileData);`
- **Calls**: `PUT /api/students/profile`

### **3. API Request**
- **File**: `frontend/src/services/api.js:209`
- **Line**: 209-212
- **Code**: `apiRequest('/students/profile', { method: 'PUT', body: JSON.stringify(data) })`
- **Status**: ✅ Correct endpoint

### **4. Backend Route**
- **File**: `backend/src/routes/students.js:34`
- **Line**: 34
- **Code**: `router.put('/profile', studentController.updateStudentProfile)`
- **Status**: ✅ Correct route

### **5. Backend Controller - THE PROBLEM**
- **File**: `backend/src/controllers/students.js:173`
- **Line**: 173-176
- **Code**: 
  ```javascript
  const student = await prisma.student.update({
    where: { userId },
    data: cleanData,
  });
  ```

## **Root Cause Identified**

### **ISSUE #1: URL Normalization Happens on profileData BEFORE Field Mapping**
- **File**: `backend/src/controllers/students.js:100-106`
- **Problem**: Lines 103-104 modify `profileData[field]` directly, adding `'https://'` prefix
- **Impact**: When we later process `profileData` in the mapping loop (line 129), we're reading from the modified object
- **But this shouldn't cause an error unless...**

### **ISSUE #2: Empty Strings Getting Through Filter**
- **File**: `backend/src/controllers/students.js:142-151`
- **Problem**: Line 148 checks `value !== ''` but this happens AFTER the trim check on line 146
- **Impact**: If a field has an empty string that passes the initial checks but shouldn't be updated

### **ISSUE #3: Normalization Logic Issue**
- **File**: `backend/src/controllers/students.js:103`
- **Problem**: Checks `profileData[field].trim()` but doesn't store the trimmed value back
- **Impact**: Empty strings after trim() still get normalized, causing invalid URLs like `'https://'`

### **THE ACTUAL ROOT CAUSE:**
**Lines 103-104 normalize URLs but don't check if the trimmed value is empty. This creates invalid URLs like `'https://'` for empty fields, which then get included in cleanData and cause the update to fail.**

