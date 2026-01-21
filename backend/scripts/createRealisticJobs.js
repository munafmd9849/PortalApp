/**
 * Create Realistic Job Records
 * 
 * Inserts realistic job records directly into the database.
 * No frontend mock data - all data is persisted in the database.
 * 
 * Usage: node backend/scripts/createRealisticJobs.js
 */

import prisma from '../src/config/database.js';

// Helper to create date in local timezone (11:59 PM) and convert to UTC for storage
function createLocalDateTime(year, month, day, hour = 23, minute = 59, second = 59) {
  // Create date in local timezone
  const localDate = new Date(year, month - 1, day, hour, minute, second);
  // Return ISO string (will be converted to UTC by Prisma)
  return localDate.toISOString();
}

async function createCompany(name, website, location) {
  // Find or create company
  let company = await prisma.company.findUnique({
    where: { name },
  });
  
  if (!company) {
    company = await prisma.company.create({
      data: {
        name,
        website,
        location,
      },
    });
    console.log(`✅ Created company: ${name}`);
  } else {
    console.log(`✅ Using existing company: ${name}`);
  }
  
  return company;
}

async function createJobs() {
  console.log('\n📋 Creating realistic job records in database...\n');
  
  // Create companies
  const companies = {
    techVantage: await createCompany(
      'TechVantage Solutions',
      'https://www.techvantagesolutions.com',
      'Bangalore, Karnataka'
    ),
    cloudForge: await createCompany(
      'CloudForge Technologies',
      'https://www.cloudforgetech.com',
      'Hyderabad, Telangana'
    ),
    dataSphere: await createCompany(
      'DataSphere Analytics',
      'https://www.datasphereanalytics.com',
      'Noida, Uttar Pradesh'
    ),
    secureNet: await createCompany(
      'SecureNet Technologies',
      'https://www.securenettech.com',
      'Pune, Maharashtra'
    ),
    innovaTech: await createCompany(
      'InnovaTech Systems',
      'https://www.innovatechsystems.com',
      'Chennai, Tamil Nadu'
    ),
  };
  
  const recruiterEmails = JSON.stringify([{
    email: 'charansai82140@gmail.com',
    name: 'Sai Charan'
  }]);
  
  const jobs = [];
  
  // ============================================
  // POSTED JOBS - SET 1
  // Screening: ENABLED, Test: DISABLED
  // applicationDeadline: 21-01-2026 11:59 PM
  // driveDate: 22-01-2026 11:59 PM
  // ============================================
  console.log('📌 Creating POSTED jobs - Set 1 (Screening: ON, Test: OFF)...');
  
  const posted1_1 = await prisma.job.create({
    data: {
      jobTitle: 'Senior Software Engineer',
      description: 'We are seeking an experienced Senior Software Engineer to design and develop scalable backend systems. You will work with microservices architecture, cloud platforms, and distributed systems. Strong expertise in system design and performance optimization is essential. The role involves collaborating with cross-functional teams to deliver high-quality software solutions.',
      requirements: JSON.stringify([
        '5+ years of software development experience',
        'Expertise in backend technologies and system design',
        'Strong problem-solving and analytical skills',
        'Experience with cloud platforms and microservices'
      ]),
      requiredSkills: JSON.stringify(['Java', 'Spring Boot', 'PostgreSQL', 'Kubernetes', 'AWS', 'Docker', 'Redis']),
      companyId: companies.techVantage.id,
      companyName: companies.techVantage.name,
      recruiterEmail: 'charansai82140@gmail.com',
      recruiterName: 'Sai Charan',
      recruiterEmails: recruiterEmails,
      salary: '₹25-35 LPA',
      jobType: 'Full-Time',
      experienceLevel: 'Mid to Senior',
      location: 'Bangalore, Karnataka',
      companyLocation: 'Bangalore, Karnataka',
      driveVenues: JSON.stringify(['PW IOI Campus, Bangalore']),
      qualification: 'B.Tech, M.Tech',
      specialization: 'Computer Science, Information Technology',
      yop: '2024,2025,2026',
      minCgpa: '8.00',
      gapAllowed: 'Allowed',
      gapYears: '2',
      backlogs: 'Allowed',
      spocs: JSON.stringify([{ fullName: 'Priya Sharma', email: 'priya.sharma@techvantage.com', phone: '+91-9876543210' }]),
      applicationDeadline: createLocalDateTime(2026, 1, 21, 23, 59, 59),
      driveDate: createLocalDateTime(2026, 1, 22, 23, 59, 59),
      status: 'POSTED',
      isPosted: true,
      isActive: true,
      requiresScreening: true,
      requiresTest: false,
      targetSchools: JSON.stringify(['ALL']),
      targetCenters: JSON.stringify(['ALL']),
      targetBatches: JSON.stringify(['ALL']),
      postedAt: new Date(),
    },
  });
  jobs.push({ ...posted1_1, category: 'POSTED Set 1' });
  console.log(`  ✅ ${posted1_1.jobTitle} - ${companies.techVantage.name}`);
  
  const posted1_2 = await prisma.job.create({
    data: {
      jobTitle: 'DevOps Engineer',
      description: 'Join our DevOps team to automate deployment pipelines, manage cloud infrastructure, and ensure system reliability. You will work with CI/CD tools, containerization technologies, and cloud platforms. Experience with monitoring and scaling distributed systems is required. The role involves maintaining production systems and optimizing infrastructure costs.',
      requirements: JSON.stringify([
        '3+ years of DevOps experience',
        'Strong knowledge of cloud platforms and CI/CD pipelines',
        'Experience with containerization and orchestration',
        'Proficiency in infrastructure as code'
      ]),
      requiredSkills: JSON.stringify(['Docker', 'Kubernetes', 'AWS', 'Terraform', 'Jenkins', 'GitLab CI', 'Ansible']),
      companyId: companies.cloudForge.id,
      companyName: companies.cloudForge.name,
      recruiterEmail: 'charansai82140@gmail.com',
      recruiterName: 'Sai Charan',
      recruiterEmails: recruiterEmails,
      salary: '₹18-25 LPA',
      jobType: 'Full-Time',
      experienceLevel: 'Mid-level',
      location: 'Hyderabad, Telangana',
      companyLocation: 'Hyderabad, Telangana',
      driveVenues: JSON.stringify(['PW IOI Campus, Bangalore']),
      qualification: 'B.Tech, M.Tech',
      specialization: 'Computer Science, Electronics',
      yop: '2024,2025,2026',
      minCgpa: '7.50',
      gapAllowed: 'Allowed',
      gapYears: '1',
      backlogs: 'Allowed',
      spocs: JSON.stringify([{ fullName: 'Rahul Verma', email: 'rahul.verma@cloudforge.com', phone: '+91-9876543211' }]),
      applicationDeadline: createLocalDateTime(2026, 1, 21, 23, 59, 59),
      driveDate: createLocalDateTime(2026, 1, 22, 23, 59, 59),
      status: 'POSTED',
      isPosted: true,
      isActive: true,
      requiresScreening: true,
      requiresTest: false,
      targetSchools: JSON.stringify(['ALL']),
      targetCenters: JSON.stringify(['ALL']),
      targetBatches: JSON.stringify(['ALL']),
      postedAt: new Date(),
    },
  });
  jobs.push({ ...posted1_2, category: 'POSTED Set 1' });
  console.log(`  ✅ ${posted1_2.jobTitle} - ${companies.cloudForge.name}`);
  
  // ============================================
  // POSTED JOBS - SET 2
  // Screening: ENABLED, Test: ENABLED
  // applicationDeadline: 22-01-2026 11:59 PM
  // driveDate: 23-01-2026 11:59 PM
  // ============================================
  console.log('\n📌 Creating POSTED jobs - Set 2 (Screening: ON, Test: ON)...');
  
  const posted2_1 = await prisma.job.create({
    data: {
      jobTitle: 'Data Engineer',
      description: 'We are looking for a Data Engineer to build and maintain data pipelines, design data warehouses, and work with big data technologies. You will collaborate with data scientists and analysts to ensure data quality and availability. Strong experience with ETL processes and data modeling is essential. The role involves working with large-scale data processing systems.',
      requirements: JSON.stringify([
        '4+ years of data engineering experience',
        'Experience with big data technologies and ETL processes',
        'Strong SQL and data modeling skills',
        'Knowledge of data warehousing concepts'
      ]),
      requiredSkills: JSON.stringify(['Python', 'Apache Spark', 'SQL', 'Airflow', 'Snowflake', 'PostgreSQL', 'Hadoop']),
      companyId: companies.dataSphere.id,
      companyName: companies.dataSphere.name,
      recruiterEmail: 'charansai82140@gmail.com',
      recruiterName: 'Sai Charan',
      recruiterEmails: recruiterEmails,
      salary: '₹20-28 LPA',
      jobType: 'Full-Time',
      experienceLevel: 'Mid-level',
      location: 'Noida, Uttar Pradesh',
      companyLocation: 'Noida, Uttar Pradesh',
      driveVenues: JSON.stringify(['PW IOI Campus, Bangalore']),
      qualification: 'B.Tech, M.Tech',
      specialization: 'Computer Science, Data Science',
      yop: '2024,2025,2026',
      minCgpa: '8.00',
      gapAllowed: 'Not Allowed',
      gapYears: '',
      backlogs: 'Not Allowed',
      spocs: JSON.stringify([{ fullName: 'Anjali Patel', email: 'anjali.patel@datasphere.com', phone: '+91-9876543212' }]),
      applicationDeadline: createLocalDateTime(2026, 1, 22, 23, 59, 59),
      driveDate: createLocalDateTime(2026, 1, 23, 23, 59, 59),
      status: 'POSTED',
      isPosted: true,
      isActive: true,
      requiresScreening: true,
      requiresTest: true,
      targetSchools: JSON.stringify(['ALL']),
      targetCenters: JSON.stringify(['ALL']),
      targetBatches: JSON.stringify(['ALL']),
      postedAt: new Date(),
    },
  });
  jobs.push({ ...posted2_1, category: 'POSTED Set 2' });
  console.log(`  ✅ ${posted2_1.jobTitle} - ${companies.dataSphere.name}`);
  
  const posted2_2 = await prisma.job.create({
    data: {
      jobTitle: 'Machine Learning Engineer',
      description: 'Join our ML team to develop and deploy machine learning models at scale. You will work on NLP, computer vision, and recommendation systems. Strong background in deep learning frameworks and MLOps is required. Experience with production ML systems is preferred. The role involves end-to-end ML pipeline development and model optimization.',
      requirements: JSON.stringify([
        '3+ years of ML engineering experience',
        'Strong knowledge of deep learning frameworks',
        'Experience with MLOps and model deployment',
        'Proficiency in Python and ML libraries'
      ]),
      requiredSkills: JSON.stringify(['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Docker', 'Kubernetes', 'MLflow']),
      companyId: companies.secureNet.id,
      companyName: companies.secureNet.name,
      recruiterEmail: 'charansai82140@gmail.com',
      recruiterName: 'Sai Charan',
      recruiterEmails: recruiterEmails,
      salary: '₹22-30 LPA',
      jobType: 'Full-Time',
      experienceLevel: 'Mid to Senior',
      location: 'Pune, Maharashtra',
      companyLocation: 'Pune, Maharashtra',
      driveVenues: JSON.stringify(['PW IOI Campus, Bangalore']),
      qualification: 'B.Tech, M.Tech',
      specialization: 'Computer Science, Artificial Intelligence',
      yop: '2024,2025,2026',
      minCgpa: '8.50',
      gapAllowed: 'Not Allowed',
      gapYears: '',
      backlogs: 'Not Allowed',
      spocs: JSON.stringify([{ fullName: 'Vikram Singh', email: 'vikram.singh@securenet.com', phone: '+91-9876543213' }]),
      applicationDeadline: createLocalDateTime(2026, 1, 22, 23, 59, 59),
      driveDate: createLocalDateTime(2026, 1, 23, 23, 59, 59),
      status: 'POSTED',
      isPosted: true,
      isActive: true,
      requiresScreening: true,
      requiresTest: true,
      targetSchools: JSON.stringify(['ALL']),
      targetCenters: JSON.stringify(['ALL']),
      targetBatches: JSON.stringify(['ALL']),
      postedAt: new Date(),
    },
  });
  jobs.push({ ...posted2_2, category: 'POSTED Set 2' });
  console.log(`  ✅ ${posted2_2.jobTitle} - ${companies.secureNet.name}`);
  
  const posted2_3 = await prisma.job.create({
    data: {
      jobTitle: 'Full Stack Developer',
      description: 'Join our product team to build modern web applications using cutting-edge technologies. You will work on both frontend and backend development, ensuring seamless user experiences. Strong knowledge of JavaScript frameworks and RESTful APIs is required. The role involves full-stack development and collaboration with design and product teams.',
      requirements: JSON.stringify([
        '3+ years of full stack development experience',
        'Proficiency in modern JavaScript frameworks',
        'Experience with database design and API development',
        'Strong understanding of web technologies'
      ]),
      requiredSkills: JSON.stringify(['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'MongoDB', 'AWS', 'Express']),
      companyId: companies.innovaTech.id,
      companyName: companies.innovaTech.name,
      recruiterEmail: 'charansai82140@gmail.com',
      recruiterName: 'Sai Charan',
      recruiterEmails: recruiterEmails,
      salary: '₹15-22 LPA',
      jobType: 'Full-Time',
      experienceLevel: 'Mid-level',
      location: 'Chennai, Tamil Nadu',
      companyLocation: 'Chennai, Tamil Nadu',
      driveVenues: JSON.stringify(['PW IOI Campus, Bangalore']),
      qualification: 'B.Tech, M.Tech',
      specialization: 'Computer Science, Information Technology',
      yop: '2024,2025,2026',
      minCgpa: '7.50',
      gapAllowed: 'Allowed',
      gapYears: '1',
      backlogs: 'Allowed',
      spocs: JSON.stringify([{ fullName: 'Arjun Kumar', email: 'arjun.kumar@innovatech.com', phone: '+91-9876543214' }]),
      applicationDeadline: createLocalDateTime(2026, 1, 22, 23, 59, 59),
      driveDate: createLocalDateTime(2026, 1, 23, 23, 59, 59),
      status: 'POSTED',
      isPosted: true,
      isActive: true,
      requiresScreening: true,
      requiresTest: true,
      targetSchools: JSON.stringify(['ALL']),
      targetCenters: JSON.stringify(['ALL']),
      targetBatches: JSON.stringify(['ALL']),
      postedAt: new Date(),
    },
  });
  jobs.push({ ...posted2_3, category: 'POSTED Set 2' });
  console.log(`  ✅ ${posted2_3.jobTitle} - ${companies.innovaTech.name}`);
  
  // ============================================
  // REVIEW JOBS (IN_REVIEW status)
  // Not visible to students
  // ============================================
  console.log('\n📌 Creating IN_REVIEW jobs (not visible to students)...');
  
  const review1 = await prisma.job.create({
    data: {
      jobTitle: 'Cloud Solutions Architect',
      description: 'We are seeking an experienced Cloud Solutions Architect to design scalable cloud infrastructure and migration strategies. You will work with enterprise clients to architect multi-cloud solutions. Strong expertise in AWS, Azure, and GCP is required. The role involves leading cloud transformation initiatives and providing technical guidance to teams.',
      requirements: JSON.stringify([
        '8+ years of cloud architecture experience',
        'Expert-level knowledge of cloud platforms',
        'Strong system design and architecture skills',
        'Experience with cloud migration projects'
      ]),
      requiredSkills: JSON.stringify(['AWS', 'Azure', 'GCP', 'Terraform', 'CloudFormation', 'Docker', 'Kubernetes']),
      companyId: companies.techVantage.id,
      companyName: companies.techVantage.name,
      recruiterEmail: 'charansai82140@gmail.com',
      recruiterName: 'Sai Charan',
      recruiterEmails: recruiterEmails,
      salary: '₹35-45 LPA',
      jobType: 'Full-Time',
      experienceLevel: 'Senior',
      location: 'Mumbai, Maharashtra',
      companyLocation: 'Mumbai, Maharashtra',
      driveVenues: JSON.stringify(['PW IOI Campus, Bangalore']),
      qualification: 'B.Tech, M.Tech',
      specialization: 'Computer Science, Cloud Computing',
      yop: '2024,2025,2026',
      minCgpa: '8.50',
      gapAllowed: 'Not Allowed',
      gapYears: '',
      backlogs: 'Not Allowed',
      spocs: JSON.stringify([{ fullName: 'Meera Desai', email: 'meera.desai@techvantage.com', phone: '+91-9876543215' }]),
      applicationDeadline: createLocalDateTime(2026, 1, 25, 23, 59, 59),
      driveDate: createLocalDateTime(2026, 1, 26, 23, 59, 59),
      status: 'IN_REVIEW',
      isPosted: false,
      isActive: false,
      requiresScreening: true,
      requiresTest: false,
      targetSchools: JSON.stringify(['ALL']),
      targetCenters: JSON.stringify(['ALL']),
      targetBatches: JSON.stringify(['ALL']),
      submittedAt: new Date(),
    },
  });
  jobs.push({ ...review1, category: 'IN_REVIEW' });
  console.log(`  ✅ ${review1.jobTitle} - ${companies.techVantage.name}`);
  
  const review2 = await prisma.job.create({
    data: {
      jobTitle: 'Cybersecurity Specialist',
      description: 'Join our security team to protect our infrastructure and applications from threats. You will work on security assessments, vulnerability management, and incident response. Strong knowledge of security frameworks and penetration testing is required. The role involves implementing security best practices and conducting security audits.',
      requirements: JSON.stringify([
        '4+ years of cybersecurity experience',
        'Strong knowledge of security frameworks and standards',
        'Experience with penetration testing and vulnerability assessment',
        'Proficiency in security tools and technologies'
      ]),
      requiredSkills: JSON.stringify(['Penetration Testing', 'OWASP', 'SIEM', 'Firewall', 'IDS/IPS', 'Security Auditing', 'Compliance']),
      companyId: companies.secureNet.id,
      companyName: companies.secureNet.name,
      recruiterEmail: 'charansai82140@gmail.com',
      recruiterName: 'Sai Charan',
      recruiterEmails: recruiterEmails,
      salary: '₹28-38 LPA',
      jobType: 'Full-Time',
      experienceLevel: 'Mid to Senior',
      location: 'Bangalore, Karnataka',
      companyLocation: 'Bangalore, Karnataka',
      driveVenues: JSON.stringify(['PW IOI Campus, Bangalore']),
      qualification: 'B.Tech, M.Tech',
      specialization: 'Computer Science, Cybersecurity',
      yop: '2024,2025,2026',
      minCgpa: '8.00',
      gapAllowed: 'Not Allowed',
      gapYears: '',
      backlogs: 'Not Allowed',
      spocs: JSON.stringify([{ fullName: 'Rajesh Nair', email: 'rajesh.nair@securenet.com', phone: '+91-9876543216' }]),
      applicationDeadline: createLocalDateTime(2026, 1, 28, 23, 59, 59),
      driveDate: createLocalDateTime(2026, 1, 29, 23, 59, 59),
      status: 'IN_REVIEW',
      isPosted: false,
      isActive: false,
      requiresScreening: true,
      requiresTest: true,
      targetSchools: JSON.stringify(['ALL']),
      targetCenters: JSON.stringify(['ALL']),
      targetBatches: JSON.stringify(['ALL']),
      submittedAt: new Date(),
    },
  });
  jobs.push({ ...review2, category: 'IN_REVIEW' });
  console.log(`  ✅ ${review2.jobTitle} - ${companies.secureNet.name}`);
  
  console.log('\n✅ Job creation complete!\n');
  
  return jobs;
}

async function verifyJobs() {
  console.log('🔍 Verifying created jobs in database...\n');
  
  const allJobs = await prisma.job.findMany({
    where: {
      OR: [
        { status: 'POSTED' },
        { status: 'IN_REVIEW' },
      ],
    },
    select: {
      id: true,
      jobTitle: true,
      companyName: true,
      status: true,
      applicationDeadline: true,
      driveDate: true,
      requiresScreening: true,
      requiresTest: true,
      isPosted: true,
      recruiterEmail: true,
      recruiterName: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  console.log(`📊 Found ${allJobs.length} jobs in database:\n`);
  
  const postedSet1 = allJobs.filter(j => 
    j.status === 'POSTED' && 
    j.requiresScreening === true && 
    j.requiresTest === false
  );
  const postedSet2 = allJobs.filter(j => 
    j.status === 'POSTED' && 
    j.requiresScreening === true && 
    j.requiresTest === true
  );
  const reviewJobs = allJobs.filter(j => j.status === 'IN_REVIEW');
  
  console.log('📌 POSTED Jobs - Set 1 (Screening: ON, Test: OFF):');
  postedSet1.forEach(job => {
    const deadline = new Date(job.applicationDeadline);
    const driveDate = new Date(job.driveDate);
    console.log(`  - ${job.jobTitle} | ${job.companyName}`);
    console.log(`    ID: ${job.id}`);
    console.log(`    Deadline: ${deadline.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`    Drive Date: ${driveDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`    Recruiter: ${job.recruiterName} (${job.recruiterEmail})`);
    console.log('');
  });
  
  console.log('📌 POSTED Jobs - Set 2 (Screening: ON, Test: ON):');
  postedSet2.forEach(job => {
    const deadline = new Date(job.applicationDeadline);
    const driveDate = new Date(job.driveDate);
    console.log(`  - ${job.jobTitle} | ${job.companyName}`);
    console.log(`    ID: ${job.id}`);
    console.log(`    Deadline: ${deadline.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`    Drive Date: ${driveDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`    Recruiter: ${job.recruiterName} (${job.recruiterEmail})`);
    console.log('');
  });
  
  console.log('📌 IN_REVIEW Jobs:');
  reviewJobs.forEach(job => {
    const deadline = new Date(job.applicationDeadline);
    const driveDate = new Date(job.driveDate);
    console.log(`  - ${job.jobTitle} | ${job.companyName}`);
    console.log(`    ID: ${job.id}`);
    console.log(`    Deadline: ${deadline.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`    Drive Date: ${driveDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`    Recruiter: ${job.recruiterName} (${job.recruiterEmail})`);
    console.log(`    Visible to students: ${job.isPosted ? 'YES' : 'NO'}`);
    console.log('');
  });
  
  console.log('='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total jobs created: ${allJobs.length}`);
  console.log(`  - POSTED Set 1: ${postedSet1.length}`);
  console.log(`  - POSTED Set 2: ${postedSet2.length}`);
  console.log(`  - IN_REVIEW: ${reviewJobs.length}`);
  console.log('');
}

async function main() {
  try {
    console.log('🚀 Starting Realistic Job Creation Script');
    console.log('='.repeat(60));
    
    // Create jobs
    const jobs = await createJobs();
    
    // Verify jobs in database
    await verifyJobs();
    
    console.log('✅ Script completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
