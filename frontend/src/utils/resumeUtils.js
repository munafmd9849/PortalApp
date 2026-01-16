// File validation
const validateResumeFile = (file) => {
  const errors = [];
  
  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors };
  }

  // Check file type
  if (!file.type.includes('pdf')) {
    errors.push('Only PDF files are allowed');
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push('File size must be less than 10MB');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Format file size for display
const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '0 Bytes';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Extract text from PDF (placeholder)
const extractTextFromPDF = async (file) => {
  throw new Error('PDF text extraction is not available in the client.');
};

// Check ATS score (placeholder)
const checkATSScore = async (file) => {
  throw new Error('ATS scoring is not available.');
};

// AI Enhancement (placeholder)
const enhanceWithAI = async (file) => {
  throw new Error('AI enhancement is not available.');
};

export {
  validateResumeFile,
  formatFileSize,
  checkATSScore,
  enhanceWithAI,
  extractTextFromPDF
};
