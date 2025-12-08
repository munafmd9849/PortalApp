import api from './api.js';

export const QUERY_TYPES = {
  QUESTION: 'question',
  CGPA_UPDATE: 'cgpa',
  CALENDAR_BLOCK: 'calendar'
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
  if (['question', 'cgpa', 'calendar'].includes(normalized)) {
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
    reason: metadata.reason || null
  };
}

function buildPayload(formData) {
  // Ensure required fields are present and not empty
  const subject = formData.subject?.trim() || '';
  const message = formData.message?.trim() || '';
  const type = normalizeType(formData.type);
  
  // Validate required fields
  if (!subject) {
    throw new Error('Subject is required');
  }
  
  if (!message || message.length < 10) {
    throw new Error('Message must be at least 10 characters');
  }
  
  const payload = {
    subject,
    message,
    type,
  };

  if (payload.type === QUERY_TYPES.CGPA_UPDATE) {
    payload.cgpa = formData.cgpa ? Number(formData.cgpa) : null;
  }

  if (payload.type === QUERY_TYPES.CALENDAR_BLOCK) {
    payload.startDate = formData.startDate || null;
    payload.endDate = formData.endDate || null;
    payload.timeSlot = formData.timeSlot || null;
    payload.reason = formData.reason || null;
  }

  return payload;
}

export async function submitQuery(userId, formData) {
  try {
    const payload = buildPayload(formData);
    console.log('[Query Service] Submitting query with payload:', payload);
    console.log('[Query Service] Original formData:', formData);
    
    const response = await api.submitStudentQuery(payload);
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
