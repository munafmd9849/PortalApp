/**
 * Job Description Parser Service
 * Extracts structured data from job description files (PDF, DOC, TXT)
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Set up PDF.js worker - use worker from installed package (Vite-compatible)
// This ensures version match and avoids CDN fetch issues
// Using ?url suffix for Vite to properly handle the worker file as a URL
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Parse job description from various file formats
 * @param {File} file - The job description file
 * @returns {Promise<Object>} Parsed job data
 */
export async function parseJobDescription(file) {
  try {
    console.log('🔄 Parsing job description file:', file.name);
    
    const fileType = file.type;
    let text = '';
    
    if (fileType === 'application/pdf') {
      text = await parsePDF(file);
    } else if (fileType === 'text/plain') {
      text = await parseText(file);
    } else if (fileType.includes('document') || fileType.includes('word')) {
      text = await parseDocument(file);
    } else {
      throw new Error('Unsupported file format. Please use PDF, DOC, or TXT files.');
    }
    
    // Extract structured data from text
    const parsedData = extractJobData(text);
    
    console.log('✅ Job description parsed successfully');
    return {
      success: true,
      data: parsedData,
      originalText: text
    };
    
  } catch (error) {
    console.error('❌ Error parsing job description:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Parse PDF file
 */
async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    text += pageText + '\n';
  }
  
  return text;
}

/**
 * Parse text file
 */
async function parseText(file) {
  return await file.text();
}

/**
 * Parse document file (DOC/DOCX) using mammoth.js
 */
async function parseDocument(file) {
  try {
    // Try to use mammoth.js for proper DOC/DOCX parsing
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.warn('Mammoth.js parsing failed, falling back to text extraction:', error);
    // Fallback to basic text extraction
    return await file.text();
  }
}

/**
 * Extract structured job data from text
 * Supports multiple JD formats and structures
 */
function extractJobData(text) {
  // Normalize text - remove extra whitespace, normalize line breaks
  let normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Clean up special characters that might interfere with parsing
  // Remove common Unicode symbols that PDFs sometimes use (■, ●, ◆, etc.)
  normalizedText = normalizedText.replace(/[■●◆▲▼►◄★☆]/g, '');
  
  // Normalize whitespace - replace multiple spaces with single space
  normalizedText = normalizedText.replace(/[ \t]+/g, ' ');
  
  // Helper function to remove section headers from extracted content
  const removeSectionHeaders = (value) => {
    if (!value) return value;
    // List of common section headers to remove
    const headers = [
      'JOB DESCRIPTION',
      'COMPENSATION',
      'QUALIFICATIONS',
      'REQUIREMENTS',
      'RESPONSIBILITIES',
      'ROLES & RESPONSIBILITIES',
      'ROLES AND RESPONSIBILITIES',
      'SKILLS',
      'BENEFITS',
      'Website',
      'LinkedIn',
      'SALARY',
      'CTC',
      'COST TO COMPANY'
    ];
    
    let cleaned = value;
    // Remove headers at the start (case insensitive)
    for (const header of headers) {
      const regex = new RegExp(`^\\s*${header.replace(/\s+/g, '\\s+')}[:\s]*`, 'i');
      cleaned = cleaned.replace(regex, '').trim();
    }
    
    // Also remove if header appears in the middle (with colon or newline before it)
    for (const header of headers) {
      const regex = new RegExp(`[:\n]\\s*${header.replace(/\s+/g, '\\s+')}[:\s]*`, 'gi');
      cleaned = cleaned.replace(regex, '').trim();
    }
    
    return cleaned;
  };
  
  const data = {
    title: '',
    company: '',
    location: '',
    salary: '',
    stipend: '',
    experience: '',
    skills: [],
    description: text,
    requirements: [],
    benefits: [],
    jobType: '',
    workMode: '',
    qualifications: '',
    responsibilities: '',
    openings: '',
    duration: '',
    website: '',
    linkedin: ''
  };
  
  // Extract job title (look for common patterns - improved)
  const titlePatterns = [
    /job\s*title[:\s]+([^\n]+)/i,
    /position[:\s]+([^\n]+)/i,
    /role[:\s]+([^\n]+)/i,
    /title[:\s]+([^\n]+)/i,
    /^([A-Z][^\n]{5,50}(?:developer|engineer|manager|analyst|specialist|coordinator|architect|designer|consultant|executive|lead|senior|junior|intern|trainee))/im,
    /^([A-Z][^\n]{5,50})\s*\n/i, // First line if it looks like a title
  ];
  
  for (const pattern of titlePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const title = match[1].trim();
      if (title.length > 3 && title.length < 100) {
        data.title = title;
        break;
      }
    }
  }
  
  // Extract company name (improved patterns)
  const companyPatterns = [
    /company[:\s]+([^\n]+)/i,
    /organization[:\s]+([^\n]+)/i,
    /employer[:\s]+([^\n]+)/i,
    /about\s+([^\n]+)/i,
    /at\s+([A-Z][^\n]{2,50})/i, // "Software Engineer at Google"
  ];
  
  for (const pattern of companyPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const company = match[1].trim();
      if (company.length > 1 && company.length < 100) {
        data.company = company;
        break;
      }
    }
  }
  
  // Extract location (improved patterns)
  const locationPatterns = [
    /location[:\s]+([^\n]+)/i,
    /based\s+in[:\s]+([^\n]+)/i,
    /office[:\s]+([^\n]+)/i,
    /work\s+location[:\s]+([^\n]+)/i,
    /city[:\s]+([^\n]+)/i,
    /(?:bangalore|mumbai|delhi|hyderabad|chennai|pune|kolkata|noida|gurgaon|indore|patna|lucknow)[^\n]*/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const location = match[1].trim();
      if (location.length > 2 && location.length < 100) {
        data.location = location;
        break;
      }
    }
  }
  
  // Helper function to clean extracted salary/CTC values
  const cleanSalaryValue = (value) => {
    if (!value) return '';
    // First remove section headers
    let cleaned = removeSectionHeaders(value);
    // Remove special Unicode characters (■, ●, etc.) and normalize
    cleaned = cleaned.replace(/[■●◆▲▼►◄★☆\u25A0-\u25FF]/g, '').trim();
    // Remove leading non-digit, non-hyphen, non-comma characters (but keep currency symbols)
    cleaned = cleaned.replace(/^[^\d\-,\s₹$]+/g, '').trim();
    // Stop at next section header (QUALIFICATIONS, REQUIREMENTS, etc.)
    const sectionHeaders = /(QUALIFICATIONS|REQUIREMENTS|RESPONSIBILITIES|SKILLS|BENEFITS|COMPENSATION|Website|LinkedIn)/i;
    const sectionMatch = cleaned.match(sectionHeaders);
    if (sectionMatch) {
      cleaned = cleaned.substring(0, sectionMatch.index).trim();
    }
    // Normalize multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  };
  
  // Extract salary/CTC (improved patterns - handles Indian formats and special characters)
  // First try to extract CTC separately, then salary
  // Use patterns that stop at section boundaries
  const ctcPatterns = [
    // Try to stop at next section header first (more restrictive)
    /ctc[:\s]+([^\n]+?)(?=\n\s*(?:QUALIFICATIONS|REQUIREMENTS|RESPONSIBILITIES|SKILLS|BENEFITS|COMPENSATION|Website|LinkedIn|$))/i,
    // Fallback to end of line
    /ctc[:\s]+([^\n]+)/i,
    /cost\s+to\s+company[:\s]+([^\n]+?)(?=\n\s*(?:QUALIFICATIONS|REQUIREMENTS|RESPONSIBILITIES|SKILLS|BENEFITS|COMPENSATION|Website|LinkedIn|$))/i,
    /cost\s+to\s+company[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of ctcPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const cleanedCtc = cleanSalaryValue(match[1]);
      // If CTC is found, use it as salary (CTC is more specific)
      if (cleanedCtc) {
        data.salary = cleanedCtc;
        break;
      }
    }
  }
  
  // If CTC not found, try salary patterns
  if (!data.salary) {
    const salaryPatterns = [
      /salary[:\s]+([^\n]+)/i,
      /compensation[:\s]+([^\n]+)/i,
      /pay[:\s]+([^\n]+)/i,
      /package[:\s]+([^\n]+)/i,
      /(?:₹|rs\.?|inr)\s*([\d,]+(?:\s*-\s*[\d,]+)?)\s*(?:lpa|lakh|lakhs|per\s+annum|pa)/i,
      /([\d,]+(?:\s*-\s*[\d,]+)?)\s*(?:lpa|lakh|lakhs|per\s+annum|pa)/i,
      /(?:₹|rs\.?|inr)\s*([\d,]+(?:\s*-\s*[\d,]+)?)/i,
      /(\$[\d,]+(?:\s*-\s*\$[\d,]+)?)/i
    ];
    
    for (const pattern of salaryPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const cleanedSalary = cleanSalaryValue(match[1]);
        if (cleanedSalary) {
          data.salary = cleanedSalary;
          break;
        }
      }
    }
  }
  
  // Extract stipend (for internships)
  const stipendPatterns = [
    /stipend[:\s]+([^\n]+)/i,
    /(?:₹|rs\.?|inr)\s*([\d,]+(?:\s*-\s*[\d,]+)?)\s*(?:per\s+month|pm|monthly)/i,
    /([\d,]+(?:\s*-\s*[\d,]+)?)\s*(?:k|thousand)\s*(?:per\s+month|pm|monthly)/i
  ];
  
  for (const pattern of stipendPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      data.stipend = match[1].trim();
      break;
    }
  }
  
  // Extract job type
  const jobTypePatterns = [
    /job\s*type[:\s]+([^\n]+)/i,
    /type[:\s]+([^\n]+)/i,
    /(full[- ]?time|part[- ]?time|internship|contract|freelance)/i
  ];
  
  for (const pattern of jobTypePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const jobType = match[1].trim();
      if (jobType.toLowerCase().includes('intern')) {
        data.jobType = 'Internship';
      } else if (jobType.toLowerCase().includes('full')) {
        data.jobType = 'Full-Time';
      }
      break;
    }
  }
  
  // Extract work mode
  const workModePatterns = [
    /work\s*mode[:\s]+([^\n]+)/i,
    /(remote|onsite|on[- ]?site|hybrid|work\s+from\s+home|wfh)/i
  ];
  
  for (const pattern of workModePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const mode = match[1].trim().toLowerCase();
      if (mode.includes('remote') || mode.includes('wfh')) {
        data.workMode = 'Remote';
      } else if (mode.includes('hybrid')) {
        data.workMode = 'Hybrid';
      } else if (mode.includes('onsite') || mode.includes('on-site')) {
        data.workMode = 'On-site';
      }
      break;
    }
  }
  
  // Extract experience
  const experiencePatterns = [
    /experience[:\s]+([^\n]+)/i,
    /(\d+\+?\s*years?\s*(?:of\s*)?experience)/i,
    /minimum\s+(\d+\s*years?)/i,
    /(\d+[- ]?\d*\s*years?)/i
  ];
  
  for (const pattern of experiencePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      data.experience = match[1].trim();
      break;
    }
  }
  
  // Extract skills (expanded keyword list)
  const skillKeywords = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue.js',
    'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes',
    'Git', 'REST API', 'GraphQL', 'TypeScript', 'PHP', 'C++', 'C#', '.NET',
    'Spring Boot', 'Django', 'Flask', 'Express.js', 'Firebase', 'Azure',
    'Next.js', 'Redux', 'Vue', 'Svelte', 'Tailwind CSS', 'Bootstrap',
    'MySQL', 'Redis', 'Elasticsearch', 'RabbitMQ', 'Kafka',
    'Jenkins', 'CI/CD', 'Terraform', 'Ansible', 'Linux', 'Unix',
    'Machine Learning', 'AI', 'Deep Learning', 'TensorFlow', 'PyTorch',
    'Data Science', 'Big Data', 'Hadoop', 'Spark', 'Tableau', 'Power BI'
  ];
  
  const foundSkills = [];
  const lowerText = normalizedText.toLowerCase();
  for (const skill of skillKeywords) {
    if (lowerText.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  }
  data.skills = foundSkills;
  
  // Extract requirements/qualifications (improved - handles multiple formats)
  const requirementPatterns = [
    /(?:requirements?|qualifications?)[:\s]*\n((?:[-•*]\s*[^\n]+\n?)+)/i,
    /(?:requirements?|qualifications?)[:\s]*\n((?:\d+[\.\)]\s*[^\n]+\n?)+)/i,
    /(?:requirements?|qualifications?)[:\s]*\n((?:[^\n]+\n?)+?)(?=\n\s*(?:responsibilities|benefits|skills|about|description|$))/i
  ];
  
  for (const pattern of requirementPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const requirements = match[1]
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Remove section headers first
          let cleaned = removeSectionHeaders(line);
          // Remove bullet points, numbers, and special characters
          cleaned = cleaned.replace(/^[-•*\d\.\)]\s*/, '').trim();
          // Remove leading special Unicode characters
          cleaned = cleaned.replace(/^[■●◆▲▼►◄★☆\s]+/, '').trim();
          return cleaned;
        })
        .filter(line => line.length > 5 && !/^(QUALIFICATIONS|REQUIREMENTS|RESPONSIBILITIES|SKILLS|BENEFITS|COMPENSATION)$/i.test(line));
      
      if (requirements.length > 0) {
        data.requirements = requirements;
        break;
      }
    }
  }
  
  // Extract responsibilities (handles "ROLES & RESPONSIBILITIES" and "RESPONSIBILITIES")
  const responsibilityPatterns = [
    // Handle "ROLES & RESPONSIBILITIES" or "ROLES AND RESPONSIBILITIES"
    /(?:roles?\s*(?:&|and)?\s*)?responsibilities?[:\s]*\n((?:[-•*]\s*[^\n]+\n?)+)/i,
    // Handle numbered list
    /(?:roles?\s*(?:&|and)?\s*)?responsibilities?[:\s]*\n((?:\d+[\.\)]\s*[^\n]+\n?)+)/i,
    // Handle section that continues until next major section
    /(?:roles?\s*(?:&|and)?\s*)?responsibilities?[:\s]*\n((?:[^\n]+\n?)+?)(?=\n\s*(?:SKILLS|BENEFITS|QUALIFICATIONS|REQUIREMENTS|COMPENSATION|Website|LinkedIn|$))/i
  ];
  
  for (const pattern of responsibilityPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      let responsibilities = match[1]
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Remove section headers first
          let cleaned = removeSectionHeaders(line);
          // Remove bullet points, numbers, and special characters
          cleaned = cleaned.replace(/^[-•*\d\.\)]\s*/, '').trim();
          // Remove leading special Unicode characters
          cleaned = cleaned.replace(/^[■●◆▲▼►◄★☆\s]+/, '').trim();
          return cleaned;
        })
        .filter(line => line.length > 5 && !/^(QUALIFICATIONS|REQUIREMENTS|RESPONSIBILITIES|ROLES|SKILLS|BENEFITS|COMPENSATION)$/i.test(line));
      
      // Format as bullet points for better readability
      if (responsibilities.length > 0) {
        data.responsibilities = responsibilities
          .map(r => `• ${r}`)
          .join('\n');
        break;
      }
    }
  }
  
  // Extract qualifications
  const qualificationPatterns = [
    /qualification[:\s]+([^\n]+)/i,
    /education[:\s]+([^\n]+)/i,
    /degree[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of qualificationPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      data.qualifications = match[1].trim();
      break;
    }
  }
  
  // Extract website and LinkedIn
  const websiteMatch = normalizedText.match(/(?:website|url)[:\s]+(https?:\/\/[^\s\n]+)/i);
  if (websiteMatch) data.website = websiteMatch[1];
  
  const linkedinMatch = normalizedText.match(/(?:linkedin|linkedin\s+url)[:\s]+(https?:\/\/[^\s\n]+linkedin[^\s\n]*)/i);
  if (linkedinMatch) data.linkedin = linkedinMatch[1];
  
  // Extract openings
  const openingsMatch = normalizedText.match(/(?:openings?|vacancies?|positions?)[:\s]+(\d+)/i);
  if (openingsMatch) data.openings = openingsMatch[1];
  
  // Extract duration (for internships)
  const durationMatch = normalizedText.match(/(?:duration|period)[:\s]+([^\n]+)/i);
  if (durationMatch) data.duration = durationMatch[1].trim();
  
  // Extract benefits
  const benefitPatterns = [
    /(?:benefits?|perks?)[:\s]*\n((?:[-•*]\s*[^\n]+\n?)+)/i,
    /(?:benefits?|perks?)[:\s]*\n((?:\d+[\.\)]\s*[^\n]+\n?)+)/i
  ];
  
  for (const pattern of benefitPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      data.benefits = match[1]
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[-•*\d\.\)]\s*/, '').trim());
      if (data.benefits.length > 0) break;
    }
  }
  
  return data;
}

/**
 * Validate parsed job data
 */
export function validateJobData(data) {
  const errors = [];
  
  if (!data.title || data.title.length < 3) {
    errors.push('Job title is required and must be at least 3 characters');
  }
  
  if (!data.company || data.company.length < 2) {
    errors.push('Company name is required and must be at least 2 characters');
  }
  
  if (!data.description || data.description.length < 50) {
    errors.push('Job description must be at least 50 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format parsed data for job posting
 */
export function formatForJobPosting(parsedData) {
  return {
    title: parsedData.title || '',
    companyName: parsedData.company || '',
    location: parsedData.location || '',
    salaryRange: parsedData.salary || '',
    experienceRequired: parsedData.experience || '',
    skillsRequired: parsedData.skills || [],
    description: parsedData.description || '',
    requirements: parsedData.requirements || [],
    benefits: parsedData.benefits || [],
    jobType: 'Full-time', // Default
    workMode: 'Hybrid', // Default
    applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
  };
}
