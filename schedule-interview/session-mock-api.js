/**
 * Mock API for Interview Scheduling System
 * In-memory storage with sessionStorage persistence for prototype demonstration
 */

// ============================================================================
// SESSION STATUS STATE MACHINE (SINGLE SOURCE OF TRUTH)
// ============================================================================
const SessionStatus = {
  CREATED: 'CREATED',   // Session just created, no recruiters joined yet
  WAITING: 'WAITING',  // Recruiters have joined, waiting for admin to start
  LIVE: 'LIVE',        // Session is active, interview in progress
  ENDED: 'ENDED'       // Session completed or terminated
};

// In-memory storage
const sessions = new Map();
const interviewers = new Map();
const feedbacks = new Map();

// Load sessions from localStorage on initialization
function loadSessionsFromStorage() {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.warn('[API] Cannot load from localStorage - not available');
      return;
    }
    
    const stored = localStorage.getItem('mockSessions');
    if (stored) {
      const data = JSON.parse(stored);
      console.log('[API] Raw data from localStorage:', data);
      
      // Clear existing sessions first
      sessions.clear();
      
      // Reconstruct the Map from stored data
      // Note: We store both sessionId->session and sessionCode->sessionId mappings
      Object.entries(data).forEach(([key, value]) => {
        sessions.set(key, value);
      });
      
      console.log('[API] Loaded', Object.keys(data).length, 'session entries from localStorage');
      console.log('[API] Session keys in memory:', Array.from(sessions.keys()));
      
      // Verify the structure
      const sessionCodes = Array.from(sessions.keys()).filter(k => {
        const val = sessions.get(k);
        return typeof val === 'string' && val.length === 36; // UUID format
      });
      const sessionObjects = Array.from(sessions.keys()).filter(k => {
        const val = sessions.get(k);
        return typeof val === 'object' && val !== null && val.id;
      });
      console.log('[API] Session code mappings:', sessionCodes.length);
      console.log('[API] Session objects:', sessionObjects.length);
    } else {
      console.log('[API] No sessions found in localStorage');
    }
  } catch (e) {
    console.error('[API] Error loading sessions from localStorage:', e);
    console.error('[API] Error details:', e.message, e.stack);
  }
}

// Save sessions to localStorage
function saveSessionsToStorage() {
  try {
    console.log('[API] saveSessionsToStorage() called');
    console.log('[API] sessions.size:', sessions.size);
    console.log('[API] window available:', typeof window !== 'undefined');
    console.log('[API] localStorage available:', typeof localStorage !== 'undefined');
    
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.warn('[API] Cannot save to localStorage - not available');
      return false;
    }
    
    // Test if localStorage is actually writable
    try {
      localStorage.setItem('_test', 'test');
      localStorage.removeItem('_test');
      console.log('[API] localStorage is writable');
    } catch (e) {
      console.error('[API] localStorage is NOT writable:', e);
      return false;
    }
    
    if (sessions.size === 0) {
      console.warn('[API] No sessions to save (Map is empty)');
      return false;
    }
    
    const data = {};
    // Save all entries from the Map
    sessions.forEach((value, key) => {
      // Handle both session objects and sessionId strings
      if (typeof value === 'object' && value !== null) {
        // It's a session object - serialize it
        data[key] = value;
      } else {
        // It's a sessionId string (mapping from code to ID)
        data[key] = value;
      }
    });
    
    console.log('[API] About to save to localStorage. Data keys:', Object.keys(data));
    console.log('[API] Data size:', Object.keys(data).length);
    
    const jsonString = JSON.stringify(data);
    localStorage.setItem('mockSessions', jsonString);
    
    // Verify it was saved
    const verify = localStorage.getItem('mockSessions');
    if (verify) {
      console.log('[API] ✓ Successfully saved', Object.keys(data).length, 'session entries to localStorage');
      console.log('[API] Storage keys saved:', Object.keys(data));
      return true;
    } else {
      console.error('[API] ✗ ERROR: Failed to save - verification read returned null');
      return false;
    }
  } catch (e) {
    console.error('[API] ✗ ERROR saving sessions to localStorage:', e);
    console.error('[API] Error details:', e.message);
    if (e.stack) console.error('[API] Stack:', e.stack);
    return false;
  }
}

// Initialize: Load sessions from localStorage immediately when script loads
// This must happen synchronously before any API calls
(function initializeStorage() {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    // Load immediately - don't wait for DOM
    console.log('[API] Initializing localStorage...');
    loadSessionsFromStorage();
    console.log('[API] Initialization complete. Sessions in memory:', sessions.size);
  } else {
    console.warn('[API] window or localStorage not available, sessions will not persist');
  }
})();

// Mock job postings data
const mockJobs = [
  { id: 'job-1', title: 'Software Engineer', company: 'Tech Corp' },
  { id: 'job-2', title: 'Data Analyst', company: 'Data Inc' },
  { id: 'job-3', title: 'Product Manager', company: 'Product Co' },
];

// Mock rounds data
const mockRounds = {
  'job-1': [
    { id: 'round-1', name: 'Screening', description: 'Initial screening round' },
    { id: 'round-2', name: 'Technical Round 1', description: 'Technical skills assessment' },
    { id: 'round-3', name: 'Technical Round 2', description: 'Advanced technical evaluation' },
    { id: 'round-4', name: 'HR Round', description: 'Cultural fit and communication' },
  ],
  'job-2': [
    { id: 'round-1', name: 'Screening', description: 'Initial screening round' },
    { id: 'round-2', name: 'Technical Round', description: 'Data analysis skills' },
    { id: 'round-3', name: 'HR Round', description: 'Final interview' },
  ],
  'job-3': [
    { id: 'round-1', name: 'Screening', description: 'Initial screening round' },
    { id: 'round-2', name: 'Case Study', description: 'Product case analysis' },
    { id: 'round-3', name: 'HR Round', description: 'Final interview' },
  ],
};

// Mock candidates data
const mockCandidates = [
  { id: 'cand-1', name: 'John Doe', enrollmentId: 'ENR001', email: 'john@example.com', resume: 'Resume link' },
  { id: 'cand-2', name: 'Jane Smith', enrollmentId: 'ENR002', email: 'jane@example.com', resume: 'Resume link' },
  { id: 'cand-3', name: 'Bob Johnson', enrollmentId: 'ENR003', email: 'bob@example.com', resume: 'Resume link' },
  { id: 'cand-4', name: 'Alice Brown', enrollmentId: 'ENR004', email: 'alice@example.com', resume: 'Resume link' },
];

/**
 * Generate session code (6-8 characters, human-readable)
 */
function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create a new interview session
 */
function createSession(jobId, roundId, config) {
  const sessionId = generateUUID();
  const sessionCode = generateSessionCode();
  const expiresAt = new Date(Date.now() + (config.expiryMinutes * 60 * 1000));

  const session = {
    id: sessionId,
    code: sessionCode,
    sessionCode: sessionCode, // Explicit sessionCode field
    sessionId: sessionId, // Explicit sessionId field
    jobId,
    roundId,
    jobTitle: mockJobs.find(j => j.id === jobId)?.title || 'Unknown',
    roundName: mockRounds[jobId]?.find(r => r.id === roundId)?.name || 'Unknown',
    mode: config.mode, // 'panel' or 'parallel'
    maxInterviewers: config.maxInterviewers,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
    status: SessionStatus.CREATED, // STATE MACHINE: Start with CREATED
    locked: false,
    interviewers: [], // Active interviewers (only populated when LIVE)
    waitingRecruiters: [], // Recruiters waiting for session to start
    candidates: [...mockCandidates], // Mock candidates
    currentCandidateIndex: 0,
  };

  console.log('[API] ===== CREATING SESSION =====');
  console.log('[API] Session details:', {
    sessionId,
    sessionCode,
    roundName: session.roundName,
    maxInterviewers: session.maxInterviewers,
    expiresAt: session.expiresAt,
    locked: session.locked
  });

  sessions.set(sessionId, session);
  sessions.set(sessionCode, sessionId); // Index by code for quick lookup

  console.log(`[API] Sessions in memory before save:`, Array.from(sessions.keys()));

  // Save to localStorage
  console.log(`[API] Calling saveSessionsToStorage()...`);
  const saveResult = saveSessionsToStorage();
  console.log(`[API] saveSessionsToStorage() returned:`, saveResult);

  // Verify it was saved immediately
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('mockSessions');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        console.log(`[API] ✓ Verification - mockSessions keys after save:`, Object.keys(data));
        console.log(`[API] ✓ Verification - sessionCode key exists:`, sessionCode in data);
        console.log(`[API] ✓ Verification - sessionId key exists:`, sessionId in data);
        if (sessionCode in data) {
          console.log(`[API] ✓ Verification - sessionCode maps to:`, data[sessionCode]);
        }
        if (sessionId in data) {
          console.log(`[API] ✓ Verification - sessionId maps to object with id:`, data[sessionId]?.id);
        }
      } catch (e) {
        console.error(`[API] ✗ ERROR parsing stored data:`, e);
      }
    } else {
      console.error(`[API] ✗ ERROR: mockSessions not found in storage after save!`);
      console.error(`[API] This is a critical error - session will not persist!`);
    }
  } else {
    console.error(`[API] ✗ ERROR: window or sessionStorage not available!`);
  }

  // Generate join link - handle both file:// and http:// protocols
  let baseUrl = '';
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    pathParts.pop(); // Remove current filename
    const basePath = pathParts.join('/');
    
    if (window.location.protocol === 'file:') {
      // For file:// protocol, use relative path
      baseUrl = basePath || '.';
    } else {
      // For http/https, use full URL
      baseUrl = window.location.origin + basePath;
    }
  }
  
  const secureJoinLink = `${baseUrl}/interviewer-join.html?code=${sessionCode}`;

  return {
    sessionId,
    sessionCode,
    secureJoinLink: secureJoinLink,
    session,
  };
}

/**
 * Validate session exists and is not expired
 */
function validateSession(sessionCode) {
  console.log('[API] ===== VALIDATING SESSION =====');
  console.log('[API] Session code:', sessionCode);
  console.log('[API] Sessions in memory:', sessions.size);
  console.log('[API] All session keys:', Array.from(sessions.keys()));
  
  // Always reload from localStorage to ensure we have latest data
  console.log('[API] Reloading from localStorage before validation...');
  loadSessionsFromStorage();
  
  const sessionId = sessions.get(sessionCode);
  console.log('[API] Session ID from code:', sessionId);
  
  if (!sessionId) {
    console.log('[API] ✗ Session code not found in map');
    return { valid: false, error: 'SESSION_NOT_FOUND' };
  }

  const session = sessions.get(sessionId);
  console.log('[API] Session object found:', session ? 'YES' : 'NO');
  
  if (!session) {
    console.log('[API] ✗ Session ID found but session object not found');
    return { valid: false, error: 'SESSION_NOT_FOUND' };
  }

  // Defensive check - ensure session has required fields
  if (!session.sessionCode || !session.expiresAt || !session.roundName) {
    console.error('[API] ✗ Session missing required fields:', {
      hasSessionCode: !!session.sessionCode,
      hasExpiresAt: !!session.expiresAt,
      hasRoundName: !!session.roundName
    });
    return { valid: false, error: 'SESSION_INVALID' };
  }

  console.log('[API] Session details:', {
    sessionCode: session.sessionCode,
    roundName: session.roundName,
    maxInterviewers: session.maxInterviewers,
    locked: session.locked,
    expiresAt: session.expiresAt
  });

  const now = new Date();
  const expiresAt = new Date(session.expiresAt);

  if (now > expiresAt) {
    console.log('[API] ✗ Session expired');
    return { valid: false, error: 'SESSION_EXPIRED' };
  }

  if (session.locked) {
    console.log('[API] ✗ Session is locked');
    return { valid: false, error: 'SESSION_LOCKED' };
  }

  // STATE MACHINE: Check if session is ended
  if (session.status === SessionStatus.ENDED) {
    console.log('[API] ✗ Session has ended');
    return { valid: false, error: 'SESSION_ENDED' };
  }

  console.log('[API] ✓ Session validation successful');
  console.log('[API] Session status:', session.status);
  return { valid: true, session };
}

/**
 * Join session as interviewer
 * STATE MACHINE TRANSITIONS:
 * - CREATED → WAITING (first recruiter joins)
 * - WAITING → WAITING (subsequent recruiters join)
 * - LIVE → redirect to interview room (handled by frontend)
 * - ENDED → block access (handled by validation)
 */
function joinSession(sessionCode, interviewerData) {
  console.log('[API] ===== INTERVIEWER JOINING SESSION =====');
  console.log('[API] Session code:', sessionCode);
  console.log('[API] Interviewer data:', interviewerData);

  const validation = validateSession(sessionCode);
  if (!validation.valid) {
    console.log('[API] ✗ Join failed - validation error:', validation.error);
    return validation;
  }

  const session = validation.session;
  console.log('[API] Session found. Current status:', session.status);

  // STATE MACHINE: Check current status
  if (session.status === SessionStatus.LIVE) {
    // Frontend should redirect to interview room, but log for debugging
    console.log('[API] Session is LIVE - recruiter should be redirected to interview room');
    return {
      valid: true,
      interviewerId: null,
      session,
      redirectToInterview: true
    };
  }

  if (session.status === SessionStatus.ENDED) {
    return { valid: false, error: 'SESSION_ENDED' };
  }

  // Check max interviewers (count waiting recruiters, not active interviewers)
  const totalRecruiters = session.waitingRecruiters ? session.waitingRecruiters.length : 0;
  if (totalRecruiters >= session.maxInterviewers) {
    return { valid: false, error: 'MAX_INTERVIEWERS_REACHED' };
  }

  // Check for duplicate name
  const allRecruiters = session.waitingRecruiters || [];
  const duplicate = allRecruiters.find(
    inv => inv.name.toLowerCase() === interviewerData.name.toLowerCase()
  );
  if (duplicate) {
    return { valid: false, error: 'DUPLICATE_NAME' };
  }

  const interviewerId = generateUUID();
  const recruiter = {
    id: interviewerId,
    name: interviewerData.name,
    role: interviewerData.role,
    organization: interviewerData.organization || '',
    round: interviewerData.round,
    joinedAt: new Date().toISOString(),
    assignedCandidateId: null,
    feedbackSubmitted: false,
  };

  // Initialize waitingRecruiters array if it doesn't exist
  if (!session.waitingRecruiters) {
    session.waitingRecruiters = [];
  }

  // Add to waiting recruiters
  session.waitingRecruiters.push(recruiter);
  interviewers.set(interviewerId, { ...recruiter, sessionId: session.id });

  // STATE MACHINE TRANSITION: CREATED → WAITING (first recruiter joins)
  if (session.status === SessionStatus.CREATED) {
    console.log('[API] → State transition: CREATED → WAITING');
    session.status = SessionStatus.WAITING;
  }

  // Save updated session to storage
  saveSessionsToStorage();

  console.log(`[API] Recruiter joined: ${recruiter.name} (${interviewerId})`);
  console.log(`[API] Waiting recruiters: ${session.waitingRecruiters.length}`);
  console.log(`[API] Session status: ${session.status}`);

  return {
    valid: true,
    interviewerId,
    session,
  };
}

/**
 * Lock session (prevent new joins)
 */
function lockSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return { success: false, error: 'SESSION_NOT_FOUND' };
  }

  session.locked = true;
  
  // Save updated session to storage
  saveSessionsToStorage();
  
  console.log(`[API] Session locked: ${sessionId}`);

  return { success: true, session };
}

/**
 * Start session (change status to WAITING → LIVE)
 * STATE MACHINE TRANSITION: WAITING → LIVE
 * BACKEND INTEGRATION: This should call POST /api/sessions/:sessionId/start
 */
function startSession(sessionId) {
  console.log('[API] ===== STARTING SESSION =====');
  console.log('[API] Session ID:', sessionId);

  const session = sessions.get(sessionId);
  if (!session) {
    console.error('[API] ✗ Session not found');
    return { success: false, error: 'SESSION_NOT_FOUND' };
  }

  console.log('[API] Current session status:', session.status);
  console.log('[API] Waiting recruiters:', session.waitingRecruiters ? session.waitingRecruiters.length : 0);

  // STATE MACHINE VALIDATION: Can only start from WAITING status
  if (session.status !== SessionStatus.WAITING) {
    console.error(`[API] ✗ Cannot start session. Current status: ${session.status}, required: ${SessionStatus.WAITING}`);
    return { 
      success: false, 
      error: 'INVALID_STATUS',
      message: `Session must be in WAITING status to start. Current status: ${session.status}`
    };
  }

  // Validate that there are waiting recruiters
  const waitingCount = session.waitingRecruiters ? session.waitingRecruiters.length : 0;
  if (waitingCount === 0) {
    console.error('[API] ✗ No waiting recruiters in session');
    return { success: false, error: 'NO_RECRUITERS' };
  }

  // SECURITY: In production, verify admin role here
  // if (!isAdmin(userId)) {
  //   return { success: false, error: 'UNAUTHORIZED' };
  // }

  // STATE MACHINE TRANSITION: WAITING → LIVE
  console.log('[API] → State transition: WAITING → LIVE');
  session.status = SessionStatus.LIVE;
  session.startedAt = new Date().toISOString();
  
  // Move waiting recruiters to active interviewers
  session.interviewers = session.waitingRecruiters || [];
  console.log('[API] ✓ Moved', session.interviewers.length, 'recruiters from waiting to active');

  // Assign candidates based on mode
  if (session.mode === 'panel') {
    // Panel: All interviewers see same candidate
    const currentCandidate = session.candidates[session.currentCandidateIndex];
    session.interviewers.forEach(inv => {
      inv.assignedCandidateId = currentCandidate?.id || null;
    });
  } else if (session.mode === 'parallel') {
    // Parallel: Each interviewer gets different candidate
    session.interviewers.forEach((inv, index) => {
      const candidateIndex = (session.currentCandidateIndex + index) % session.candidates.length;
      inv.assignedCandidateId = session.candidates[candidateIndex]?.id || null;
    });
  }
  
  // Save updated session to storage (after all changes)
  const saveResult = saveSessionsToStorage();
  console.log('[API] Save result:', saveResult ? 'SUCCESS' : 'FAILED');
  
  console.log('[API] ✓ Session started successfully');
  console.log(`[API] Session status: ${session.status}`);
  console.log(`[API] Active interviewers: ${session.interviewers.length}`);

  return { success: true, session };
}

/**
 * Get session details
 */
function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

/**
 * Get session by code
 */
function getSessionByCode(sessionCode) {
  const sessionId = sessions.get(sessionCode);
  if (!sessionId) return null;
  return sessions.get(sessionId);
}

/**
 * Assign next candidate
 */
function assignNextCandidate(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return { success: false, error: 'SESSION_NOT_FOUND' };
  }

  session.currentCandidateIndex++;
  if (session.currentCandidateIndex >= session.candidates.length) {
    return { success: false, error: 'NO_MORE_CANDIDATES' };
  }

  // Reassign based on mode
  if (session.mode === 'panel') {
    const currentCandidate = session.candidates[session.currentCandidateIndex];
    session.interviewers.forEach(inv => {
      if (!inv.feedbackSubmitted) {
        inv.assignedCandidateId = currentCandidate?.id || null;
      }
    });
  } else if (session.mode === 'parallel') {
    session.interviewers.forEach((inv, index) => {
      if (!inv.feedbackSubmitted) {
        const candidateIndex = (session.currentCandidateIndex + index) % session.candidates.length;
        inv.assignedCandidateId = session.candidates[candidateIndex]?.id || null;
      }
    });
  }

  return { success: true, session };
}

/**
 * Submit feedback
 */
function submitFeedback(sessionId, interviewerId, feedback) {
  const session = sessions.get(sessionId);
  if (!session) {
    return { success: false, error: 'SESSION_NOT_FOUND' };
  }

  const interviewer = session.interviewers.find(inv => inv.id === interviewerId);
  if (!interviewer) {
    return { success: false, error: 'INTERVIEWER_NOT_FOUND' };
  }

  if (interviewer.feedbackSubmitted) {
    return { success: false, error: 'FEEDBACK_ALREADY_SUBMITTED' };
  }

  const feedbackId = generateUUID();
  const feedbackData = {
    id: feedbackId,
    sessionId,
    interviewerId,
    interviewerName: interviewer.name,
    candidateId: interviewer.assignedCandidateId,
    roundName: session.roundName,
    rating: feedback.rating,
    notes: feedback.notes,
    recommendation: feedback.recommendation,
    submittedAt: new Date().toISOString(),
  };

  feedbacks.set(feedbackId, feedbackData);
  interviewer.feedbackSubmitted = true;

  console.log(`[API] Feedback submitted: ${feedbackId} by ${interviewer.name}`);

  return { success: true, feedbackId };
}

/**
 * Get feedback (for admin view - not implemented in prototype)
 */
function getFeedback(sessionId) {
  const allFeedback = Array.from(feedbacks.values()).filter(f => f.sessionId === sessionId);
  return allFeedback;
}

/**
 * Get mock jobs
 */
function getMockJobs() {
  return mockJobs;
}

/**
 * Get mock rounds for a job
 */
function getMockRounds(jobId) {
  return mockRounds[jobId] || [];
}

// Export for use in HTML files
if (typeof window !== 'undefined') {
  window.MockAPI = {
    createSession,
    validateSession,
    joinSession,
    lockSession,
    startSession,
    getSession,
    getSessionByCode,
    assignNextCandidate,
    submitFeedback,
    getFeedback,
    getMockJobs,
    getMockRounds,
    reloadSessions: loadSessionsFromStorage, // Expose reload function
    getSessionCount: () => sessions.size, // Debug function
    getAllSessionKeys: () => Array.from(sessions.keys()), // Debug function
    SessionStatus, // Export SessionStatus enum for frontend use
  };
}

