/**
 * Recruiters Service - API Implementation
 * Replaces Firebase Firestore operations with backend API calls
 */

import api from './api.js';

// Mock data generator for recruiters
function generateMockRecruiters() {
  const companies = [
    { name: 'TCS', location: 'Mumbai', zone: 'West Zone' },
    { name: 'Infosys', location: 'Bangalore', zone: 'South Zone' },
    { name: 'Wipro', location: 'Bangalore', zone: 'South Zone' },
    { name: 'Accenture', location: 'Pune', zone: 'West Zone' },
    { name: 'Cognizant', location: 'Chennai', zone: 'South Zone' },
    { name: 'Capgemini', location: 'Mumbai', zone: 'West Zone' },
    { name: 'Tech Mahindra', location: 'Pune', zone: 'West Zone' },
    { name: 'HCL Technologies', location: 'Noida', zone: 'North Zone' },
    { name: 'LTI (Larsen & Toubro Infotech)', location: 'Mumbai', zone: 'West Zone' },
    { name: 'Mindtree', location: 'Bangalore', zone: 'South Zone' },
    { name: 'Amazon', location: 'Hyderabad', zone: 'South Zone' },
    { name: 'Microsoft', location: 'Hyderabad', zone: 'South Zone' },
    { name: 'Google', location: 'Bangalore', zone: 'South Zone' },
    { name: 'IBM', location: 'Bangalore', zone: 'South Zone' },
    { name: 'Oracle', location: 'Bangalore', zone: 'South Zone' },
    { name: 'Deloitte', location: 'Mumbai', zone: 'West Zone' },
    { name: 'EY (Ernst & Young)', location: 'Gurgaon', zone: 'North Zone' },
    { name: 'PwC', location: 'Mumbai', zone: 'West Zone' },
    { name: 'KPMG', location: 'Mumbai', zone: 'West Zone' },
    { name: 'JP Morgan', location: 'Mumbai', zone: 'West Zone' },
    { name: 'Goldman Sachs', location: 'Bangalore', zone: 'South Zone' },
    { name: 'Morgan Stanley', location: 'Mumbai', zone: 'West Zone' },
    { name: 'Barclays', location: 'Pune', zone: 'West Zone' },
    { name: 'Deutsche Bank', location: 'Pune', zone: 'West Zone' },
    { name: 'SAP', location: 'Bangalore', zone: 'South Zone' },
  ];

  const firstNames = ['Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rahul', 'Kavita', 'Suresh', 'Meera', 'Arjun', 'Divya', 'Kiran', 'Pooja', 'Nikhil'];
  const lastNames = ['Kumar', 'Sharma', 'Patel', 'Singh', 'Reddy', 'Gupta', 'Verma', 'Joshi', 'Malhotra', 'Agarwal', 'Mehta', 'Iyer', 'Nair', 'Rao', 'Desai'];

  const statuses = ['Active', 'Active', 'Active', 'Active', 'Blocked']; // 80% active, 20% blocked
  const relationshipTypes = ['Partner Company', 'Premium Partner', 'Strategic Partner', 'Regular Partner'];

  return companies.map((company, index) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[index % lastNames.length];
    const recruiterName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.name.toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '')}.com`;
    
    const totalJobs = Math.floor(Math.random() * 50) + 5; // 5-55 jobs
    const activeJobs = Math.floor(totalJobs * (0.3 + Math.random() * 0.4)); // 30-70% active
    const daysAgo = Math.floor(Math.random() * 90); // Last job posted 0-90 days ago
    const lastJobDate = new Date();
    lastJobDate.setDate(lastJobDate.getDate() - daysAgo);
    
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isBlocked = status === 'Blocked';
    
    return {
      id: `recruiter-${index + 1}`,
      companyName: company.name,
      recruiterName: recruiterName,
      email: email,
      location: company.location,
      lastJobPostedAt: daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`,
      lastJobPostedDate: lastJobDate,
      totalJobPostings: totalJobs,
      activeJobPostings: activeJobs,
      status: status,
      blockInfo: isBlocked ? {
        blocked: true,
        blockedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Blocked 0-30 days ago
        reason: ['Violation of terms', 'Inappropriate job postings', 'Spam activity', 'Non-compliance'][Math.floor(Math.random() * 4)],
        blockedBy: 'Admin User'
      } : null,
      relationshipType: relationshipTypes[Math.floor(Math.random() * relationshipTypes.length)],
      zone: company.zone,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Joined 0-365 days ago
    };
  });
}

// Placeholder functions - will be replaced with API calls
export function subscribeRecruiterDirectory(onChange, options = {}) {
  let intervalId = null;
  let socket = null;
  
  // Try to use real API, fallback to mock data
  const loadRecruiters = async () => {
    try {
      // Try to call the actual API endpoint
      const { API_BASE_URL } = await import('../config/api.js');
      const apiBaseUrl = API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/recruiters/directory`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          onChange(data);
          return true;
        }
      }
    } catch (error) {
      console.warn('API call failed, using mock data:', error);
    }
    
    // Fallback to mock data
    const mockRecruiters = generateMockRecruiters();
    onChange(mockRecruiters);
    return false;
  };
  
  // Try to set up Socket.IO subscription
  try {
    // Dynamic import to avoid circular dependencies
    import('./socket.js').then((socketModule) => {
      const { initSocket } = socketModule;
      socket = initSocket();
      
      // Listen for new recruiter events
      socket.on('recruiter:new', (newRecruiter) => {
        console.log('📢 New recruiter registered:', newRecruiter);
        // Reload the directory to get updated list
        loadRecruiters();
      });
      
      // Listen for recruiter updates
      socket.on('recruiter:updated', () => {
        console.log('📢 Recruiter updated');
        loadRecruiters();
      });
    }).catch((error) => {
      console.warn('Socket.IO not available, using polling:', error);
    });
  } catch (error) {
    console.warn('Socket.IO not available, using polling:', error);
  }
  
  // Initial load
  (async () => {
    await loadRecruiters();
    
    // Set up polling as fallback (every 30 seconds)
    // This ensures updates even if Socket.IO fails
    intervalId = setInterval(() => {
      loadRecruiters();
    }, 30000);
  })();
  
  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (socket) {
      socket.off('recruiter:new');
      socket.off('recruiter:updated');
    }
  };
}

export async function getRecruiter(recruiterId) {
  try {
    // TODO: Replace with API call
    console.warn('getRecruiter: Backend endpoint needed');
    return null;
  } catch (error) {
    console.error('getRecruiter error:', error);
    throw error;
  }
}

export async function updateRecruiterStatus(recruiterId, status) {
  try {
    // TODO: Replace with admin API call
    console.warn('updateRecruiterStatus: Backend endpoint needed');
    return null;
  } catch (error) {
    console.error('updateRecruiterStatus error:', error);
    throw error;
  }
}

/**
 * Block or unblock a recruiter (admin only)
 */
export async function blockUnblockRecruiter(recruiterId, blockData, user = null) {
  try {
    // TODO: Replace with admin API call
    console.warn('blockUnblockRecruiter: Backend endpoint needed');
    const { recruiter, isUnblocking, reason } = blockData;
    
    // For now, simulate success
    // In real implementation, call: api.updateRecruiterStatus(recruiterId, { blocked: !isUnblocking, reason })
    const action = isUnblocking ? 'unblocked' : 'blocked';
    return { 
      success: true, 
      action,
      recruiterId,
      blocked: !isUnblocking
    };
  } catch (error) {
    console.error('blockUnblockRecruiter error:', error);
    throw error;
  }
}

/**
 * Get jobs posted by a recruiter
 */
export async function getRecruiterJobs(recruiterEmail) {
  try {
    // Generate mock jobs for the recruiter
    const jobTitles = [
      'Software Engineer', 'Senior Software Engineer', 'Full Stack Developer',
      'Backend Developer', 'Frontend Developer', 'DevOps Engineer',
      'Data Engineer', 'Data Scientist', 'Machine Learning Engineer',
      'QA Engineer', 'Product Manager', 'Business Analyst',
      'UI/UX Designer', 'System Administrator', 'Cloud Architect'
    ];
    
    const jobTypes = ['Full-Time', 'Internship', 'Part-Time'];
    const workModes = ['Remote', 'Hybrid', 'On-site'];
    const statuses = ['posted', 'draft', 'in_review', 'archived'];
    
    const numJobs = Math.floor(Math.random() * 15) + 5; // 5-20 jobs
    const jobs = [];
    
    for (let i = 0; i < numJobs; i++) {
      const daysAgo = Math.floor(Math.random() * 180);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      
      const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)];
      const jobType = jobTypes[Math.floor(Math.random() * jobTypes.length)];
      const workMode = workModes[Math.floor(Math.random() * workModes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      jobs.push({
        id: `job-${i + 1}`,
        jobTitle: jobTitle,
        company: recruiterEmail.split('@')[1].split('.')[0],
        companyLocation: ['Mumbai', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Noida'][Math.floor(Math.random() * 6)],
        jobType: jobType,
        workMode: workMode,
        status: status,
        salary: jobType === 'Internship' ? null : `₹${Math.floor(Math.random() * 20) + 8}-${Math.floor(Math.random() * 20) + 15} LPA`,
        stipend: jobType === 'Internship' ? `₹${Math.floor(Math.random() * 30) + 15}k/month` : null,
        openings: Math.floor(Math.random() * 10) + 1,
        duration: jobType === 'Internship' ? `${Math.floor(Math.random() * 6) + 3} months` : null,
        createdAt: createdAt,
        responsibilities: `• Build and maintain scalable applications\n• Collaborate with cross-functional teams\n• Write clean, maintainable code\n• Participate in code reviews\n• Troubleshoot and debug applications`,
        skills: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS'].slice(0, Math.floor(Math.random() * 4) + 3),
        qualification: 'B.Tech / M.Tech in Computer Science',
        specialization: 'Computer Science, IT, or related field',
        yop: '2024, 2025',
        minCgpa: (7 + Math.random() * 1.5).toFixed(1),
        gapAllowed: Math.random() > 0.5 ? 'Yes' : 'No',
        backlogs: Math.random() > 0.7 ? '0' : '1-2',
        website: `https://${recruiterEmail.split('@')[1]}`,
        linkedin: `https://linkedin.com/company/${recruiterEmail.split('@')[1].split('.')[0]}`,
        driveDate: Math.random() > 0.5 ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
        driveVenues: Math.random() > 0.5 ? ['Campus A', 'Campus B'] : null,
        interviewRounds: [
          { title: 'Online Assessment', detail: 'Technical and Aptitude test' },
          { title: 'Technical Interview', detail: 'Coding and problem-solving' },
          { title: 'HR Interview', detail: 'Cultural fit and communication' }
        ]
      });
    }
    
    // Sort by creation date (newest first)
    jobs.sort((a, b) => b.createdAt - a.createdAt);
    
    return jobs;
  } catch (error) {
    console.error('getRecruiterJobs error:', error);
    return [];
  }
}

/**
 * Get recruiter history (audit log of actions)
 */
export async function getRecruiterHistory(recruiterId) {
  try {
    // Generate mock history data
    const numJobPostings = Math.floor(Math.random() * 20) + 5;
    const jobPostings = [];
    
    const jobTitles = ['Software Engineer', 'Data Scientist', 'Full Stack Developer', 'DevOps Engineer', 'Product Manager'];
    
    for (let i = 0; i < numJobPostings; i++) {
      const daysAgo = Math.floor(Math.random() * 180);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      jobPostings.push({
        id: `job-${i + 1}`,
        jobTitle: jobTitles[Math.floor(Math.random() * jobTitles.length)],
        company: 'Company Name',
        date: { toMillis: () => date.getTime() },
        location: ['Mumbai', 'Bangalore', 'Pune'][Math.floor(Math.random() * 3)],
        status: ['active', 'draft', 'archived'][Math.floor(Math.random() * 3)]
      });
    }
    
    // Sort by date (newest first)
    jobPostings.sort((a, b) => b.date.toMillis() - a.date.toMillis());
    
    const numEmails = Math.floor(Math.random() * 5) + 2;
    const notifications = [];
    
    const emailSubjects = [
      'Welcome to Placement Portal',
      'Job Posting Approved',
      'New Application Received',
      'Reminder: Complete Your Profile',
      'Placement Drive Schedule'
    ];
    
    for (let i = 0; i < numEmails; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      notifications.push({
        id: `email-${i + 1}`,
        type: 'email_sent',
        date: { toMillis: () => date.getTime() },
        data: {
          subject: emailSubjects[Math.floor(Math.random() * emailSubjects.length)],
          adminName: 'Admin User'
        }
      });
    }
    
    const numStatusChanges = Math.floor(Math.random() * 3);
    const statusChanges = [];
    
    for (let i = 0; i < numStatusChanges; i++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      statusChanges.push({
        id: `status-${i + 1}`,
        type: Math.random() > 0.5 ? 'recruiter_blocked' : 'recruiter_unblocked',
        date: { toMillis: () => date.getTime() },
        data: {
          adminName: 'Admin User',
          reason: 'Administrative review'
        }
      });
    }
    
    return {
      jobPostings: jobPostings,
      notifications: notifications,
      statusChanges: statusChanges
    };
  } catch (error) {
    console.error('getRecruiterHistory error:', error);
    return {
      jobPostings: [],
      notifications: [],
      statusChanges: []
    };
  }
}

/**
 * Send email to recruiter
 */
export async function sendEmailToRecruiter(recruiterId, emailData, user = null) {
  try {
    // TODO: Replace with API call to email service
    console.warn('sendEmailToRecruiter: Backend endpoint needed');
    // For now, simulate success
    // In real implementation: api.sendEmail({ to: recruiter.email, ...emailData })
    return { success: true };
  } catch (error) {
    console.error('sendEmailToRecruiter error:', error);
    throw error;
  }
}

/**
 * Get recruiter summary (stats, job count, etc.)
 */
export async function getRecruiterSummary(recruiterId) {
  try {
    // Generate mock summary data
    const centers = ['Lucknow', 'Pune', 'Bangalore', 'Noida', 'Indore', 'Patna'];
    const schools = ['SOT', 'SOH', 'SOM'];
    
    const jobsPerCenter = {};
    centers.forEach(center => {
      jobsPerCenter[center] = Math.floor(Math.random() * 15);
    });
    
    const jobsPerSchool = {};
    schools.forEach(school => {
      jobsPerSchool[school] = Math.floor(Math.random() * 20);
    });
    
    const totalJobs = Object.values(jobsPerCenter).reduce((sum, count) => sum + count, 0);
    const activeJobs = Math.floor(totalJobs * (0.4 + Math.random() * 0.3)); // 40-70% active
    
    const relationshipTypes = ['Partner Company', 'Premium Partner', 'Strategic Partner', 'Regular Partner'];
    const zones = ['North Zone', 'South Zone', 'East Zone', 'West Zone'];
    
    const daysAgo = Math.floor(Math.random() * 30);
    const lastActivity = new Date();
    lastActivity.setDate(lastActivity.getDate() - daysAgo);
    
    const joinDaysAgo = Math.floor(Math.random() * 365) + 30;
    const joinDate = new Date();
    joinDate.setDate(joinDate.getDate() - joinDaysAgo);
    
    return {
      jobsPerCenter: jobsPerCenter,
      jobsPerSchool: jobsPerSchool,
      totalJobs: totalJobs,
      activeJobs: activeJobs,
      relationshipType: relationshipTypes[Math.floor(Math.random() * relationshipTypes.length)],
      zone: zones[Math.floor(Math.random() * zones.length)],
      emailsSent: Math.floor(Math.random() * 20) + 5,
      statusChanges: Math.floor(Math.random() * 5),
      lastActivity: { toMillis: () => lastActivity.getTime() },
      joinDate: { toMillis: () => joinDate.getTime() }
    };
  } catch (error) {
    console.error('getRecruiterSummary error:', error);
    return {
      jobsPerCenter: { 'Lucknow': 0, 'Pune': 0, 'Bangalore': 0, 'Noida': 0, 'Indore': 0, 'Patna': 0 },
      jobsPerSchool: { 'SOT': 0, 'SOH': 0, 'SOM': 0 },
      totalJobs: 0,
      activeJobs: 0,
      relationshipType: 'Partner Company',
      zone: 'North Zone',
      emailsSent: 0,
      statusChanges: 0
    };
  }
}

// Export all other functions as placeholders
export async function blockRecruiter(recruiterId, reason) {
  console.warn('blockRecruiter: Placeholder - use blockUnblockRecruiter instead');
  return blockUnblockRecruiter(recruiterId, { recruiter: { id: recruiterId }, isUnblocking: false, reason });
}
