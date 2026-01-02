/**
 * Mock Data for Student Dashboard
 * Used for development and testing when real data is not available
 */

export const mockApplications = [
  {
    id: 'mock-app-1',
    status: 'applied',
    appliedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    job: {
      id: 'mock-job-1',
      jobTitle: 'Software Development Engineer',
      company: { name: 'Tech Corp', id: 'mock-company-1' }
    },
    company: { name: 'Tech Corp', id: 'mock-company-1' }
  },
  {
    id: 'mock-app-2',
    status: 'shortlisted',
    appliedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    job: {
      id: 'mock-job-2',
      jobTitle: 'Full Stack Developer',
      company: { name: 'Innovate Solutions', id: 'mock-company-2' }
    },
    company: { name: 'Innovate Solutions', id: 'mock-company-2' }
  },
  {
    id: 'mock-app-3',
    status: 'interviewed',
    appliedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    job: {
      id: 'mock-job-3',
      jobTitle: 'Frontend Developer',
      company: { name: 'Digital Innovations', id: 'mock-company-3' }
    },
    company: { name: 'Digital Innovations', id: 'mock-company-3' }
  }
];

export const mockJobs = [
  {
    id: 'mock-job-1',
    jobTitle: 'Software Development Engineer',
    companyName: 'Tech Corp',
    company: { name: 'Tech Corp', id: 'mock-company-1' },
    driveDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    salary: '800000',
    ctc: '8 LPA',
    location: 'Bangalore',
    description: 'We are looking for a talented Software Development Engineer to join our team.',
    requiredSkills: ['Java', 'Spring Boot', 'React', 'SQL'],
    minCgpa: 7.0
  },
  {
    id: 'mock-job-2',
    jobTitle: 'Full Stack Developer',
    companyName: 'Innovate Solutions',
    company: { name: 'Innovate Solutions', id: 'mock-company-2' },
    driveDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    salary: '1000000',
    ctc: '10 LPA',
    location: 'Hyderabad',
    description: 'Join our dynamic team as a Full Stack Developer working on cutting-edge projects.',
    requiredSkills: ['Node.js', 'React', 'MongoDB', 'Express'],
    minCgpa: 7.5
  },
  {
    id: 'mock-job-3',
    jobTitle: 'Frontend Developer',
    companyName: 'Digital Innovations',
    company: { name: 'Digital Innovations', id: 'mock-company-3' },
    driveDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    salary: '900000',
    ctc: '9 LPA',
    location: 'Pune',
    description: 'Exciting opportunity for a Frontend Developer to build beautiful user interfaces.',
    requiredSkills: ['React', 'TypeScript', 'CSS', 'JavaScript'],
    minCgpa: 7.0
  },
  {
    id: 'mock-job-4',
    jobTitle: 'Backend Developer',
    companyName: 'Cloud Systems',
    company: { name: 'Cloud Systems', id: 'mock-company-4' },
    driveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    salary: '850000',
    ctc: '8.5 LPA',
    location: 'Mumbai',
    description: 'Looking for a Backend Developer to design and implement scalable systems.',
    requiredSkills: ['Python', 'Django', 'PostgreSQL', 'AWS'],
    minCgpa: 7.2
  },
  {
    id: 'mock-job-5',
    jobTitle: 'DevOps Engineer',
    companyName: 'Infrastructure Tech',
    company: { name: 'Infrastructure Tech', id: 'mock-company-5' },
    driveDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
    salary: '950000',
    ctc: '9.5 LPA',
    location: 'Chennai',
    description: 'Join our DevOps team to manage cloud infrastructure and CI/CD pipelines.',
    requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'Jenkins'],
    minCgpa: 7.0
  }
];

export const mockEducation = [
  {
    id: 'mock-edu-1',
    degree: 'Bachelor of Technology',
    institution: 'PW Institute of Innovation',
    startYear: 2021,
    endYear: 2025,
    cgpa: '8.5',
    description: 'Computer Science and Engineering'
  },
  {
    id: 'mock-edu-2',
    degree: 'Higher Secondary',
    institution: 'ABC School',
    startYear: 2019,
    endYear: 2021,
    cgpa: '85%',
    description: 'Science Stream'
  }
];

export const mockSkills = [
  { id: 'mock-skill-1', skillName: 'JavaScript', rating: 4 },
  { id: 'mock-skill-2', skillName: 'React', rating: 4 },
  { id: 'mock-skill-3', skillName: 'Node.js', rating: 3 },
  { id: 'mock-skill-4', skillName: 'Python', rating: 4 },
  { id: 'mock-skill-5', skillName: 'Java', rating: 3 },
  { id: 'mock-skill-6', skillName: 'SQL', rating: 4 },
  { id: 'mock-skill-7', skillName: 'MongoDB', rating: 3 },
  { id: 'mock-skill-8', skillName: 'Git', rating: 4 }
];

export const mockProjects = [
  {
    id: 'mock-project-1',
    title: 'E-Commerce Platform',
    description: 'A full-stack e-commerce application with user authentication, product catalog, shopping cart, and payment integration. Built with React for frontend and Node.js for backend.',
    technologies: JSON.stringify(['React', 'Node.js', 'MongoDB', 'Express', 'Stripe']),
    githubUrl: 'https://github.com/username/ecommerce-platform',
    liveUrl: 'https://ecommerce-demo.vercel.app'
  },
  {
    id: 'mock-project-2',
    title: 'Task Management App',
    description: 'A collaborative task management application with real-time updates, drag-and-drop functionality, and team collaboration features.',
    technologies: JSON.stringify(['React', 'TypeScript', 'Firebase', 'Material-UI']),
    githubUrl: 'https://github.com/username/task-manager',
    liveUrl: 'https://taskmanager-demo.netlify.app'
  },
  {
    id: 'mock-project-3',
    title: 'Weather Dashboard',
    description: 'A responsive weather dashboard that displays current weather conditions and forecasts using weather API integration.',
    technologies: JSON.stringify(['JavaScript', 'HTML', 'CSS', 'OpenWeather API']),
    githubUrl: 'https://github.com/username/weather-dashboard',
    liveUrl: 'https://weather-demo.github.io'
  }
];

export const mockAchievements = [
  {
    id: 'mock-achievement-1',
    title: 'Hackathon Winner',
    description: 'Won first place in the annual college hackathon for developing an innovative solution.',
    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    hasCertificate: false
  },
  {
    id: 'mock-achievement-2',
    title: 'Best Project Award',
    description: 'Received best project award for outstanding work in the final year project.',
    date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    hasCertificate: true,
    certificateUrl: 'https://example.com/certificate.pdf'
  }
];

export const mockCertifications = [
  {
    id: 'mock-cert-1',
    title: 'AWS Certified Cloud Practitioner',
    description: 'Validated cloud expertise and knowledge of AWS services.',
    issuedDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    issuer: 'Amazon Web Services',
    certificateUrl: 'https://example.com/aws-cert.pdf'
  },
  {
    id: 'mock-cert-2',
    title: 'React Developer Certification',
    description: 'Completed comprehensive React development course with hands-on projects.',
    issuedDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    issuer: 'Online Learning Platform',
    certificateUrl: 'https://example.com/react-cert.pdf'
  }
];

export const mockExperience = [
  {
    id: 'mock-exp-1',
    title: 'Software Development Intern',
    company: 'Tech Startup',
    start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Worked on developing RESTful APIs, implemented new features, and fixed bugs in the existing codebase. Collaborated with a team of 5 developers.'
  },
  {
    id: 'mock-exp-2',
    title: 'Frontend Developer Intern',
    company: 'Web Solutions Inc',
    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() - 210 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Developed responsive web applications using React and Redux. Improved application performance by 30% through code optimization.'
  }
];

export const mockQueries = [
  {
    id: 'mock-query-1',
    type: 'question',
    subject: 'Regarding CGPA Update',
    message: 'I would like to update my CGPA after the recent semester results.',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-query-2',
    type: 'cgpa',
    subject: 'CGPA Update Request',
    message: 'Please update my CGPA to 8.5',
    status: 'resolved',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-query-3',
    type: 'calendar',
    subject: 'Calendar Block Request',
    message: 'I need to block my calendar for personal reasons from Jan 15-20.',
    status: 'pending',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const mockEndorsements = [
  {
    endorserName: 'Dr. Sarah Johnson',
    endorserEmail: 'sarah.johnson@university.edu',
    endorserRole: 'Professor',
    organization: 'Computer Science Department',
    message: 'An exceptional student with strong problem-solving skills and dedication to learning. Consistently demonstrated excellence in coursework and projects.',
    relatedSkills: ['Problem Solving', 'Technical Skills', 'Communication'],
    strengthRating: 5,
    submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    verified: true
  },
  {
    endorserName: 'Prof. Michael Chen',
    endorserEmail: 'michael.chen@university.edu',
    endorserRole: 'Associate Professor',
    organization: 'Software Engineering Department',
    message: 'Outstanding performance in software development projects. Shows great potential for a successful career in technology.',
    relatedSkills: ['Software Development', 'Teamwork', 'Leadership'],
    strengthRating: 4,
    submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    verified: true
  }
];

// Helper function to check if we should use mock data
// Always return true to show mock data when real data is empty (for development/demo purposes)
export const shouldUseMockData = () => {
  // Always enable mock data for student panel
  return true;
  // Original check (commented out):
  // return process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_MOCK_DATA === 'true';
};

