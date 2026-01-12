/**
 * Applications Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

/**
 * Generate mock applications for development/demo
 */
function generateMockApplications() {
  const companies = [
    { name: 'Google', location: 'Bangalore, India', color: 'bg-blue-500' },
    { name: 'Microsoft', location: 'Hyderabad, India', color: 'bg-orange-500' },
    { name: 'Amazon', location: 'Bangalore, India', color: 'bg-yellow-500' },
    { name: 'Infosys', location: 'Mysore, India', color: 'bg-purple-500' },
    { name: 'TCS', location: 'Chennai, India', color: 'bg-green-500' },
    { name: 'Wipro', location: 'Bangalore, India', color: 'bg-red-500' },
    { name: 'Accenture', location: 'Pune, India', color: 'bg-pink-500' },
    { name: 'Cognizant', location: 'Coimbatore, India', color: 'bg-indigo-500' },
    { name: 'HCL Technologies', location: 'Noida, India', color: 'bg-teal-500' },
    { name: 'Capgemini', location: 'Mumbai, India', color: 'bg-cyan-500' },
  ];

  const jobTitles = [
    'Software Engineer',
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'DevOps Engineer',
    'Data Engineer',
    'Cloud Architect',
    'Product Manager',
    'QA Engineer',
    'Machine Learning Engineer',
  ];

  const statuses = ['applied', 'shortlisted', 'interviewed', 'offered', 'rejected'];
  const statusWeights = [0.3, 0.25, 0.2, 0.15, 0.1]; // More applied, fewer offers

  const skills = [
    'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'SQL',
    'MongoDB', 'AWS', 'Docker', 'Kubernetes', 'TypeScript', 'Angular',
    'Vue.js', 'Express.js', 'PostgreSQL', 'Redis', 'GraphQL', 'REST API'
  ];

  const getRandomStatus = () => {
    const rand = Math.random();
    let sum = 0;
    for (let i = 0; i < statusWeights.length; i++) {
      sum += statusWeights[i];
      if (rand <= sum) return statuses[i];
    }
    return statuses[0];
  };

  const getRandomDate = (daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  };

  const getInterviewDate = (status, appliedDate) => {
    if (status === 'interviewed' || status === 'offered') {
      const applied = new Date(appliedDate);
      applied.setDate(applied.getDate() + Math.floor(Math.random() * 14) + 7); // 7-21 days after application
      return applied.toISOString();
    }
    return null;
  };

  return Array.from({ length: 12 }, (_, index) => {
    const company = companies[index % companies.length];
    const status = getRandomStatus();
    const appliedDaysAgo = Math.floor(Math.random() * 60) + 1; // 1-60 days ago
    const appliedDate = getRandomDate(appliedDaysAgo);
    const interviewDate = getInterviewDate(status, appliedDate);
    const numSkills = Math.floor(Math.random() * 8) + 4; // 4-12 skills
    const selectedSkills = skills.sort(() => 0.5 - Math.random()).slice(0, numSkills);

    return {
      id: `mock_app_${index + 1}`,
      jobId: `mock_job_${index + 1}`,
      studentId: 'mock_student',
      status: status,
      appliedDate: appliedDate,
      interviewDate: interviewDate,
      company: {
        id: `company_${index + 1}`,
        name: company.name,
        location: company.location,
      },
      job: {
        id: `job_${index + 1}`,
        jobTitle: jobTitles[index % jobTitles.length],
        jobType: Math.random() > 0.5 ? 'Full-Time' : 'Internship',
        location: company.location,
        experienceLevel: ['Entry Level', 'Mid Level', 'Senior Level'][Math.floor(Math.random() * 3)],
        salaryRange: status === 'offered' 
          ? `₹${Math.floor(Math.random() * 20 + 10)} LPA`
          : 'Not disclosed',
        description: `We are looking for a talented ${jobTitles[index % jobTitles.length]} to join our team. You will work on cutting-edge projects, collaborate with cross-functional teams, and contribute to innovative solutions. Strong problem-solving skills and passion for technology are essential.`,
        requiredSkills: selectedSkills,
        deadline: getRandomDate(Math.floor(Math.random() * 30) - 15), // -15 to +15 days from now
      },
      createdAt: appliedDate,
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Get student applications
 */
export const getStudentApplications = async (studentId) => {
  try {
    // Use real API to fetch applications
    const applications = await api.getStudentApplications();
    
    // If API returns data, format it for frontend components
    if (applications && Array.isArray(applications) && applications.length > 0) {
      // Ensure data structure matches what components expect
      const formattedApplications = applications.map(app => {
        // Parse dates - backend returns ISO strings from Prisma DateTime
        const parseDate = (dateValue) => {
          if (!dateValue) return null;
          // If already a string (ISO format from backend), return as-is
          if (typeof dateValue === 'string') return dateValue;
          // Handle Firebase Timestamp (legacy)
          if (dateValue.toDate) return dateValue.toDate().toISOString();
          // Handle Date objects
          if (dateValue instanceof Date) return dateValue.toISOString();
          // Try to parse as date
          try {
            return new Date(dateValue).toISOString();
          } catch {
            return null;
          }
        };

        // Parse requiredSkills if it's a JSON string
        const parseSkills = (skills) => {
          if (!skills) return [];
          if (Array.isArray(skills)) return skills;
          if (typeof skills === 'string') {
            try {
              const parsed = JSON.parse(skills);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              // If not valid JSON, try splitting by comma
              return skills.split(',').map(s => s.trim()).filter(s => s);
            }
          }
          return [];
        };

        return {
          ...app,
          appliedDate: parseDate(app.appliedDate) || app.appliedDate,
          interviewDate: parseDate(app.interviewDate) || app.interviewDate || null,
          // Ensure company object exists with name
          company: app.company || app.job?.company || { 
            name: app.companyName || 'Unknown Company',
            location: app.companyLocation || null,
          },
          // Ensure job object exists with jobTitle and parsed requiredSkills
          job: {
            ...app.job,
            jobTitle: app.job?.jobTitle || app.job?.title || 'Unknown Position',
            id: app.job?.id || app.jobId,
            requiredSkills: parseSkills(app.job?.requiredSkills),
          },
        };
      });
      
      return formattedApplications;
    }
    
    // Return empty array if no applications
    return [];
  } catch (error) {
    console.error('getStudentApplications error:', error);
    // Return empty array on error (don't use mock data)
    return [];
  }
};

/**
 * Apply to job
 */
export const applyToJob = async (studentId, jobId, applicationData = {}) => {
  try {
    console.log('📝 [applyToJob] Calling API with:', { jobId, applicationData });
    // Include resumeId and companyId in the request body
    const application = await api.applyToJob(jobId, applicationData);
    console.log('✅ [applyToJob] Application created:', application);
    return application;
  } catch (error) {
    // Don't log "Already applied" errors - they're handled gracefully
    const errorData = error.response?.data || {};
    if (errorData.error !== 'Already applied to this job') {
      console.error('❌ [applyToJob] Error:', error);
    }
    throw error;
  }
};

/**
 * Update application status (admin/recruiter only)
 */
export const updateApplicationStatus = async (applicationId, status, interviewDate) => {
  try {
    const application = await api.updateApplicationStatus(applicationId, status, interviewDate);
    return application;
  } catch (error) {
    console.error('updateApplicationStatus error:', error);
    throw error;
  }
};

/**
 * Get single application by ID
 */
export const getApplication = async (applicationId) => {
  try {
    // TODO: Backend needs GET /api/applications/:applicationId endpoint
    console.warn('getApplication: Backend endpoint needed');
    return null;
  } catch (error) {
    console.error('getApplication error:', error);
    throw error;
  }
};

/**
 * Subscribe to student applications (replaced with load-once pattern)
 * For real-time updates, use Socket.IO instead
 * This function now returns an empty unsubscribe for backward compatibility
 */
export const subscribeStudentApplications = (studentId, callback) => {
  // Load applications once instead of real-time subscription
  (async () => {
    try {
      const applications = await getStudentApplications(studentId);
      callback(applications);
    } catch (error) {
      console.error('subscribeStudentApplications error:', error);
      callback([]);
    }
  })();
  
  // Return empty unsubscribe function for backward compatibility
  return () => {};
};

/**
 * Subscribe to applications (alias)
 */
export const subscribeToApplications = subscribeStudentApplications;

/**
 * Get student interview history with rounds and evaluation details
 */
export const getStudentInterviewHistory = async (studentId) => {
  try {
    const history = await api.getStudentInterviewHistory();
    return history || [];
  } catch (error) {
    console.error('getStudentInterviewHistory error:', error);
    return [];
  }
};
