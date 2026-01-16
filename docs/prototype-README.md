# Interview & Screening Flow Prototype

A standalone, production-grade prototype demonstrating the complete interview and screening flow for a placement platform.

## 📁 File Structure

```
/prototype/
 ├── admin-schedule.html          # Admin interview session management
 ├── recruiter-screening.html     # Recruiter screening portal (no login)
 ├── interviewer-session.html     # Interviewer session (token access)
 ├── student-past-applications.html # Student application tracking
 ├── data.js                      # Mock data (jobs, students, applications)
 ├── state.js                     # Global state manager with business rules
 ├── utils.js                     # Utility functions
 ├── styles.css                   # Global styling
 └── README.md                    # This file
```

## 🚀 Quick Start

1. Open any HTML file in a modern web browser
2. All files share the same state (stored in localStorage)
3. No server required - works completely offline

## 📋 Pages Overview

### 1. Admin Interview Schedule (`admin-schedule.html`)
**Purpose:** Admin manages interview setup and configuration

**Features:**
- View job information and screening summary
- See screening progress (Applied, Shortlisted, Test Passed, Rejected)
- Create interview session with configurable rounds
- View eligible candidates (test-passed students)
- Business rule: Cannot create session until screening is complete

**Flow:**
1. Admin views screening summary
2. Once screening complete, admin can create interview session
3. Configure number of rounds and name each round
4. Send interviewer invites (mock)

### 2. Recruiter Screening (`recruiter-screening.html`)
**Purpose:** Recruiter screens candidates via shared link (no login)

**Features:**
- View all applied candidates
- Review resumes (mock links)
- Shortlist resumes
- Mark tests as passed
- Reject candidates with reason
- Real-time status updates

**Flow:**
1. Recruiter opens shared screening link
2. Reviews each candidate's resume
3. Makes screening decisions:
   - Shortlist Resume → Mark Test Passed → OR Reject
4. Status updates instantly

### 3. Interviewer Session (`interviewer-session.html`)
**Purpose:** Interviewer conducts interviews via email link

**Features:**
- View session and round progress
- Start/end rounds (enforced sequential flow)
- Evaluate candidates per round
- Status dropdown: Selected / Rejected / On Hold
- Remarks field for each candidate
- Only selected candidates move to next round

**Flow:**
1. Interviewer opens session link
2. Starts first round
3. Evaluates all candidates in round
4. Ends round (locks it)
5. Next round unlocks automatically
6. Repeats until all rounds complete
7. Ends entire session

**Business Rules:**
- Previous round must be completed before starting next
- Only selected candidates appear in subsequent rounds
- Interviewer controls rounds, not admin

### 4. Student Past Applications (`student-past-applications.html`)
**Purpose:** Student tracks application status

**Features:**
- View all applications
- See complete interview journey
- Status badges and journey text
- Real-time status updates

**Journey Text Examples:**
- "Rejected in Resume Screening - Insufficient qualifications"
- "Rejected in QA Test"
- "Rejected in Technical Round 1"
- "Interview Ongoing – Technical Round 2"
- "Selected after HR Round"

## 🔄 State Management

All pages share state via `localStorage`. The `state.js` file enforces business rules:

### Screening Rules:
- Screening must complete before interview session creation
- All non-rejected candidates must pass test

### Interview Rules:
- Rounds execute sequentially
- Only selected candidates advance
- One active round at a time
- Session cannot end with active round

### Status Flow:
```
APPLIED → RESUME_SHORTLISTED → TEST_PASSED → INTERVIEW_ONGOING → SELECTED/REJECTED
```

## 🎨 UI/UX Features

- **Clean, production-minded design**
- **Clear disabled states** with tooltips
- **Real-time updates** (auto-refresh every 2-3 seconds)
- **Toast notifications** for user feedback
- **Responsive layout** (mobile-friendly)
- **Status badges** with color coding
- **Empty states** with helpful messages

## 🧪 Testing the Flow

### Complete Flow Test:

1. **Open `recruiter-screening.html`**
   - Shortlist 3-4 candidates
   - Mark 2-3 as test passed
   - Reject 1-2 candidates

2. **Open `admin-schedule.html`**
   - Verify screening summary updates
   - Create interview session with 2 rounds
   - Name rounds (e.g., "Technical Round 1", "HR Round")

3. **Open `interviewer-session.html`**
   - Start Round 1
   - Evaluate candidates (select some, reject others)
   - End Round 1
   - Start Round 2 (only selected candidates appear)
   - Evaluate remaining candidates
   - End Round 2
   - End Session

4. **Open `student-past-applications.html`**
   - View complete journey for each student
   - Verify status text accuracy

## 🔧 Technical Details

- **No frameworks** - Pure HTML, CSS, Vanilla JS
- **No backend** - All state in localStorage
- **No authentication** - Simulated via direct access
- **Business rule enforcement** - State manager validates all actions
- **Deterministic status mapping** - No guessing, clear logic

## 📝 Notes for Integration

When integrating into the real project:

1. **Backend API Contract:**
   - Replace localStorage with API calls
   - Implement proper authentication
   - Add real resume file handling

2. **Database Schema:**
   - Applications table with status field
   - Screening decisions table
   - Interview sessions table
   - Round evaluations table

3. **Auth Token Scopes:**
   - Admin: Full access
   - Recruiter: Screening only
   - Interviewer: Session evaluation only
   - Student: View own applications

4. **Real-time Updates:**
   - Replace polling with WebSocket/SSE
   - Implement proper event system

## ✅ Validation Checklist

- [x] All 4 pages created and functional
- [x] Business rules enforced
- [x] State management working
- [x] UI is clean and clear
- [x] Status flow is correct
- [x] No framework dependencies
- [x] Works offline
- [x] Real-time updates (polling)
- [x] Error handling
- [x] User feedback (toasts)

## 🎯 Next Steps

1. Review prototype with stakeholders
2. Get feedback on UX/flow
3. Define backend API contracts
4. Design database schema
5. Plan authentication strategy
6. Integrate into main project

---

**This prototype demonstrates the complete flow and can be used as a specification for backend development.**

