/**
 * Resume Storage Service - PLACEHOLDER
 * TODO: Replace all functions with API calls to backend (S3 upload)
 * This file previously used Firebase Storage
 */

// Placeholder functions - will be replaced with API calls
export const uploadResumeFile = async (userId, file) => {
  // TODO: Replace with: api.uploadResume(file, onProgress)
  console.warn('uploadResumeFile: Placeholder - needs API implementation');
  return { url: null, metadata: {} };
};

export const getResumeFile = async (userId, resumeId) => {
  // TODO: Replace with API call
  console.warn('getResumeFile: Placeholder - needs API implementation');
  return null;
};

export const deleteResumeFile = async (userId, resumeId) => {
  // TODO: Replace with API call
  console.warn('deleteResumeFile: Placeholder - needs API implementation');
  return null;
};

// Placeholder for getResumeInfo - gets resume info from student profile
export const getResumeInfo = async (userId) => {
  // TODO: Replace with API call to get student profile (includes resume info)
  console.warn('getResumeInfo: Placeholder - needs API implementation');
  // Returns resume info from student profile
  return {
    resumeUrl: null,
    resumeFileName: null,
    resumeUploadedAt: null,
    hasResume: false,
  };
};
