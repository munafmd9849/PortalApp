import api from './api.js';

export const QUERY_TYPES = {
  QUESTION: 'question',
  CGPA_UPDATE: 'cgpa',
  CALENDAR_BLOCK: 'calendar',
  ENDORSEMENT: 'endorsement',
  BACKLOG_UPDATE: 'backlog'
};

export const QUERY_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  REJECTED: 'rejected'
};

const statusMap = {
  OPEN: QUERY_STATUS.PENDING,
  PENDING: QUERY_STATUS.PENDING,
  UNDER_REVIEW: QUERY_STATUS.UNDER_REVIEW,
  RESOLVED: QUERY_STATUS.RESOLVED,
  CLOSED: QUERY_STATUS.RESOLVED,
  REJECTED: QUERY_STATUS.REJECTED
};

function generateReferenceId() {
  return `STU${Math.floor(1000 + Math.random() * 9000)}`;
}

function normalizeType(type = 'question') {
  const normalized = (type || 'question').toLowerCase();
  if (['question', 'cgpa', 'calendar', 'endorsement', 'backlog'].includes(normalized)) {
    return normalized;
  }
  return 'question';
}

function transformQuery(query) {
  if (!query) return null;

  const metadata = query.metadata || {};
  const createdAt = query.createdAt || query.date || new Date().toISOString();

  return {
    id: query.id,
    referenceId: query.referenceId || metadata.referenceId,
    type: normalizeType(query.type),
    subject: query.subject,
    message: query.message,
    status: statusMap[(query.status || '').toUpperCase()] || QUERY_STATUS.PENDING,
    adminResponse: query.response,
    responseDate: query.respondedAt || query.responseDate || null,
    date: createdAt,
    cgpa: metadata.cgpa ?? metadata.CGPA ?? null,
    startDate: metadata.startDate || metadata.start_date || null,
    endDate: metadata.endDate || metadata.end_date || null,
    timeSlot: metadata.timeSlot || metadata.time_slot || null,
    reason: metadata.reason || null,
    jobId: metadata.jobId || null, // Include jobId for question type queries
  };
}

function buildPayload(formData, jobs = []) {
  // Ensure required fields are present and not empty
  const type = normalizeType(formData.type);
  let subject = formData.subject?.trim() || '';
  const message = formData.message?.trim() || '';
  
  // For question type, generate subject from selected job
  if (type === QUERY_TYPES.QUESTION && formData.selectedJobId) {
    const selectedJob = jobs.find(j => j.id === formData.selectedJobId);
    if (selectedJob) {
      subject = `Question about ${selectedJob.jobTitle} at ${selectedJob.companyName || selectedJob.company}`;
    }
  }
  
  // Auto-generate subject for CGPA and backlog updates if not provided
  if (type === QUERY_TYPES.CGPA_UPDATE && !subject) {
    const cgpaValue = formData.cgpa ? String(formData.cgpa).trim() : 'CGPA';
    subject = `CGPA Update Request - ${cgpaValue}`;
  }
  
  if (type === QUERY_TYPES.BACKLOG_UPDATE && !subject) {
    const backlogsValue = formData.backlogs ? String(formData.backlogs).trim() : 'Backlogs';
    subject = `Backlog Update Request - ${backlogsValue}`;
  }
  
  // Validate required fields
  if (!subject) {
    throw new Error(type === QUERY_TYPES.QUESTION ? 'Please select a job posting' : 'Subject is required');
  }
  
  // Message validation - not required for endorsement, CGPA update, or backlog update types
  if (type !== QUERY_TYPES.ENDORSEMENT && type !== QUERY_TYPES.CGPA_UPDATE && type !== QUERY_TYPES.BACKLOG_UPDATE) {
    if (!message || message.length < 10) {
      throw new Error('Message must be at least 10 characters');
    }
  }
  
  const payload = {
    subject,
    message: message || '', // Allow empty message for endorsement
    type,
  };

  // Store jobId in metadata for question type
  if (type === QUERY_TYPES.QUESTION && formData.selectedJobId) {
    payload.jobId = formData.selectedJobId;
  }

  if (payload.type === QUERY_TYPES.CGPA_UPDATE) {
    // Preserve CGPA as string to avoid floating point rounding
    // Backend will validate and convert to Decimal
    payload.cgpa = formData.cgpa ? String(formData.cgpa).trim() : null;
  }

  if (payload.type === QUERY_TYPES.BACKLOG_UPDATE) {
    // Preserve backlogs as string
    // Backend will validate format
    payload.backlogs = formData.backlogs ? String(formData.backlogs).trim() : null;
  }

  if (payload.type === QUERY_TYPES.CALENDAR_BLOCK) {
    payload.startDate = formData.startDate || null;
    payload.endDate = formData.endDate || null;
    payload.timeSlot = formData.timeSlot || null;
    payload.reason = formData.reason || null;
  }

  if (payload.type === QUERY_TYPES.ENDORSEMENT) {
    payload.teacherEmail = formData.teacherEmail?.trim() || null;
    payload.endorsementMessage = formData.endorsementMessage?.trim() || null;
    // For endorsement, use endorsementMessage as the message field if provided
    if (formData.endorsementMessage?.trim()) {
      payload.message = formData.endorsementMessage.trim();
    }
  }

  return payload;
}

export async function submitQuery(userId, formData, jobs = []) {
  try {
    const payload = buildPayload(formData, jobs);
    console.log('[Query Service] Submitting query with payload:', payload);
    console.log('[Query Service] Original formData:', formData);
    
    // Extract proof document if present (for CGPA/backlog queries)
    const proofDocument = formData.proof || null;
    
    const response = await api.submitStudentQuery(payload, proofDocument);
    return {
      referenceId: response.referenceId || generateReferenceId(),
      query: transformQuery(response.query)
    };
  } catch (error) {
    console.error('[Query Service] submitQuery error:', error);
    
    // Extract validation errors if available
    if (error.response?.errors && Array.isArray(error.response.errors)) {
      const validationErrors = error.response.errors.map(e => `${e.param}: ${e.msg}`).join(', ');
      console.error('[Query Service] Validation errors:', validationErrors);
      const validationError = new Error(`Validation failed: ${validationErrors}`);
      validationError.response = error.response;
      validationError.status = error.status;
      throw validationError;
    }
    
    // Handle error messages from API
    if (error.message) {
      throw new Error(error.message);
    }
    
    throw error;
  }
}

export async function getQueriesByUser() {
  try {
    const queries = await api.getStudentQueries();
    if (!Array.isArray(queries)) {
      return [];
    }
    return queries.map(transformQuery).filter(Boolean);
  } catch (error) {
    console.error('getQueriesByUser error:', error);
    return [];
  }
}

export async function uploadQueryAttachment() {
  console.warn('uploadQueryAttachment: Backend endpoint not implemented yet.');
  return null;
}

export function subscribeToStudentQueries(userId, callback) {
  let active = true;
  (async () => {
    try {
      const queries = await getQueriesByUser(userId);
      if (active) {
        callback(queries);
      }
    } catch (error) {
      console.error('subscribeToStudentQueries error:', error);
      if (active) {
        callback([]);
      }
    }
  })();

  return () => {
    active = false;
  };
}

/**
 * Respond to a student query (admin only)
 */
export async function respondToStudentQuery(queryId, responseData) {
  try {
    const result = await api.respondToStudentQuery(queryId, responseData);
    return result;
  } catch (error) {
    console.error('respondToStudentQuery error:', error);
    throw error;
  }
}

export { generateReferenceId };
