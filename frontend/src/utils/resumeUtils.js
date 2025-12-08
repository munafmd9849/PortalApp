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
  // This would be replaced with actual PDF text extraction
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Mock text extraction
      const text = "This is a placeholder for extracted text from the PDF. " +
                  "In a real implementation, this would contain the actual text content " +
                  "extracted from the uploaded PDF file.";
      resolve(text);
    };
    reader.readAsArrayBuffer(file);
  });
};

// Check ATS score (placeholder)
const checkATSScore = async (file) => {
  const text = await extractTextFromPDF(file);
  
  // This is a mock implementation
  // In a real app, this would analyze the text for ATS compatibility
  const keywords = [
    'leadership', 'teamwork', 'problem solving', 'communication',
    'JavaScript', 'React', 'Node.js', 'Python', 'project management'
  ];
  
  const foundKeywords = keywords.filter(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );
  
  const score = Math.min(100, Math.floor((foundKeywords.length / keywords.length) * 100));
  
  const issues = [];
  if (score < 50) {
    issues.push('Consider adding more relevant keywords');
  }
  if (!text.toLowerCase().includes('experience')) {
    issues.push('Add a clear experience section');
  }
  if (!text.toLowerCase().includes('education')) {
    issues.push('Include your education background');
  }
  
  return {
    score,
    issues: issues.length > 0 ? issues : ['Your resume looks good for ATS!'],
    keywords: foundKeywords
  };
};

// AI Enhancement (placeholder)
const enhanceWithAI = async (file) => {
  // This would be replaced with actual AI enhancement logic
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Resume enhanced with AI suggestions',
        suggestions: [
          'Improved action verbs in experience section',
          'Added relevant technical skills',
          'Enhanced formatting for better readability'
        ]
      });
    }, 1500);
  });
};

export {
  validateResumeFile,
  formatFileSize,
  checkATSScore,
  enhanceWithAI,
  extractTextFromPDF
};
