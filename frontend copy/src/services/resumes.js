/**
 * Resumes Service - PLACEHOLDER
 * TODO: Replace all functions with API calls to backend
 * This file previously used Firebase Firestore operations
 */

// Placeholder functions - will be replaced with API calls
export const getResumeDocRef = (uid, resumeId = 'default') => {
  // TODO: Remove - not needed with API
  console.warn('getResumeDocRef: Placeholder - not needed with API');
  return null;
};

export const ensureResumeDoc = async (uid, resumeId = 'default') => {
  // TODO: Replace with API call
  console.warn('ensureResumeDoc: Placeholder - needs API implementation');
  return null;
};

export const subscribeResume = (uid, resumeId = 'default', callback, error) => {
  // TODO: Replace with Socket.IO subscription
  console.warn('subscribeResume: Placeholder - needs Socket.IO implementation');
  return () => {}; // Return unsubscribe function
};

export const upsertResume = async (uid, resumeId = 'default', partial) => {
  // TODO: Replace with API call
  console.warn('upsertResume: Placeholder - needs API implementation');
  return null;
};

export const getResume = async (uid, resumeId = 'default') => {
  // TODO: Replace with API call to get resume data
  // This should call: api.getStudentProfile() and extract resume info
  console.warn('getResume: Placeholder - needs API implementation');
  return null;
};
