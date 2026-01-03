# Interview Scheduling System - HTML Prototype

Production-ready interview scheduling system built as standalone HTML/CSS/JS files.

## 📁 File Structure

```
schedule-interview/
├── admin-start-session.html      # Admin: Create new session
├── session-created.html          # Admin: View created session details
├── interviewer-join.html         # Interviewer: Join with session code
├── interviewer-waiting-room.html # Interviewer: Wait for admin to start
├── interviewer-session.html      # Interviewer: Conduct interview
├── access-denied.html            # Error: Access denied
├── expired-session.html          # Error: Session expired
├── styles.css                    # Shared styles
├── session-mock-api.js           # Mock API layer
└── README.md                     # This file
```

## 🚀 Quick Start

1. **Open `admin-start-session.html`** in a web browser
2. Select a job posting and round
3. Configure session settings (mode, max interviewers, expiry)
4. Click "Start Interview Session"
5. Copy the session code/link
6. Open `interviewer-join.html` in a new tab/window
7. Enter the session code and your details
8. Wait in the waiting room until admin starts the session
9. Conduct the interview and submit feedback

## 🔄 Complete Flow

### Admin Flow
1. **admin-start-session.html**
   - Select job posting
   - Select round (one round per session)
   - Choose interview mode (Panel/Parallel)
   - Set max interviewers and expiry time
   - Start session

2. **session-created.html**
   - View session code and join link
   - Copy and share with interviewers
   - Test the join link

### Interviewer Flow
1. **interviewer-join.html**
   - Enter session code (or use link with code in URL)
   - Enter full name, role, round
   - Join session

2. **interviewer-waiting-room.html**
   - View session details
   - See other joined interviewers
   - Wait for admin to start

3. **interviewer-session.html**
   - View candidate information
   - Use timer
   - Submit feedback (rating, recommendation, notes)
   - Feedback is locked after submission

## 🎯 Key Features

### Security & Validation
- ✅ Session code validation
- ✅ Session expiry enforcement
- ✅ Max interviewer limit
- ✅ Duplicate name prevention
- ✅ Session locking capability
- ✅ All actions logged to console

### Multiple Interviewer Support
- **Panel Mode**: All interviewers evaluate the same candidate
- **Parallel Mode**: Each interviewer evaluates different candidates simultaneously

### Interview Modes
- **Panel Interview**: Multiple interviewers → One candidate
- **Parallel Interview**: Same round → Different candidates

### Feedback System
- Independent feedback submission per interviewer
- Private notes (not visible to other interviewers)
- Rating (1-5 scale)
- Recommendation (Selected/On Hold/Rejected)
- Feedback locked after submission

## 📋 Mock Data

The system includes mock data for:
- 3 job postings
- Multiple rounds per job
- 4 sample candidates
- All stored in-memory (sessionStorage/localStorage)

## 🔧 Technical Details

### Mock API Functions
- `createSession()` - Create new interview session
- `validateSession()` - Validate session code
- `joinSession()` - Join as interviewer
- `lockSession()` - Lock session (no more joins)
- `startSession()` - Start active interview
- `submitFeedback()` - Submit interview feedback
- `getSession()` - Get session details

### Data Storage
- Sessions stored in `Map` (in-memory)
- Interviewer data in `sessionStorage`
- All data persists during browser session

## ⚠️ Important Notes

1. **No Backend**: This is a prototype. All data is stored in browser memory.
2. **No Authentication**: Session codes are the only security mechanism.
3. **No Database**: Data is lost on page refresh (except sessionStorage).
4. **Production Use**: Requires backend integration for real deployment.

## 🧪 Testing Scenarios

### Test Multiple Interviewers
1. Create a session with max 3 interviewers
2. Open 3 browser tabs/windows
3. Join as 3 different interviewers
4. Verify all appear in waiting room
5. Try joining as 4th interviewer (should be blocked)

### Test Panel vs Parallel
1. Create Panel session
2. Join as 2 interviewers
3. Start session
4. Both should see same candidate

1. Create Parallel session
2. Join as 2 interviewers
3. Start session
4. Each should see different candidate

### Test Session Expiry
1. Create session with 1 minute expiry
2. Wait 1+ minutes
3. Try to join (should redirect to expired page)

### Test Session Locking
1. Create session
2. Join as interviewer
3. As admin, lock session
4. Try joining in new tab (should be blocked)

## 📝 Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- No external dependencies

## 🔒 Security Considerations (for Production)

When integrating with backend:
- Implement proper authentication
- Use secure session tokens
- Encrypt sensitive data
- Add rate limiting
- Implement audit logging
- Use HTTPS only
- Validate all inputs server-side

---

**Status**: ✅ Production-ready HTML prototype
**Framework**: None (Vanilla JS)
**Dependencies**: None

