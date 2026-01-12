/**
 * GLOBAL MOCK DATA
 * Realistic mock data for jobs, applications, screening, and interviews
 */

const MOCK_DATA = {
  // Job with deadline passed
  job: {
    id: 'job-001',
    title: 'Software Engineer',
    company: 'Tech Corp Inc.',
    description: 'Full-stack development role requiring React, Node.js, and database expertise.',
    deadline: '2024-01-15', // Past deadline
    postedDate: '2024-01-01'
  },

  // Students who applied
  students: [
    {
      id: 'student-001',
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@example.com',
      cgpa: 8.5,
      resumeUrl: '#resume-rajesh',
      appliedDate: '2024-01-10'
    },
    {
      id: 'student-002',
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      cgpa: 9.2,
      resumeUrl: '#resume-priya',
      appliedDate: '2024-01-11'
    },
    {
      id: 'student-003',
      name: 'Amit Patel',
      email: 'amit.patel@example.com',
      cgpa: 7.8,
      resumeUrl: '#resume-amit',
      appliedDate: '2024-01-12'
    },
    {
      id: 'student-004',
      name: 'Sneha Reddy',
      email: 'sneha.reddy@example.com',
      cgpa: 9.0,
      resumeUrl: '#resume-sneha',
      appliedDate: '2024-01-13'
    },
    {
      id: 'student-005',
      name: 'Vikram Singh',
      email: 'vikram.singh@example.com',
      cgpa: 8.0,
      resumeUrl: '#resume-vikram',
      appliedDate: '2024-01-14'
    },
    {
      id: 'student-006',
      name: 'Ananya Das',
      email: 'ananya.das@example.com',
      cgpa: 8.7,
      resumeUrl: '#resume-ananya',
      appliedDate: '2024-01-15'
    }
  ],

  // Initial applications (all start as APPLIED)
  applications: [
    { studentId: 'student-001', jobId: 'job-001', status: 'APPLIED', appliedDate: '2024-01-10' },
    { studentId: 'student-002', jobId: 'job-001', status: 'APPLIED', appliedDate: '2024-01-11' },
    { studentId: 'student-003', jobId: 'job-001', status: 'APPLIED', appliedDate: '2024-01-12' },
    { studentId: 'student-004', jobId: 'job-001', status: 'APPLIED', appliedDate: '2024-01-13' },
    { studentId: 'student-005', jobId: 'job-001', status: 'APPLIED', appliedDate: '2024-01-14' },
    { studentId: 'student-006', jobId: 'job-001', status: 'APPLIED', appliedDate: '2024-01-15' }
  ],

  // Screening decisions (updated by recruiter)
  screening: {
    resumeShortlisted: [], // Array of studentIds
    testPassed: [], // Array of studentIds
    rejected: [] // Array of { studentId, reason }
  },

  // Interview session configuration
  interviewSession: {
    id: null,
    jobId: 'job-001',
    status: 'NOT_STARTED', // NOT_STARTED, ONGOING, COMPLETED
    rounds: [],
    createdAt: null,
    startedAt: null,
    endedAt: null
  },

  // Round evaluations (updated by interviewer)
  roundEvaluations: {} // { roundId: { studentId: { status: 'SELECTED'|'REJECTED'|'ON_HOLD', remarks: '' } } }
};

// Helper to get student by ID
function getStudentById(studentId) {
  return MOCK_DATA.students.find(s => s.id === studentId);
}

// Helper to get application by student ID
function getApplicationByStudentId(studentId) {
  return MOCK_DATA.applications.find(a => a.studentId === studentId);
}
