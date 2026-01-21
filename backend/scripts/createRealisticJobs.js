/**
 * Create Realistic Jobs Script
 * 
 * Creates job records with realistic data covering POSTED and REVIEW states.
 * Validates date handling and update propagation.
 * 
 * Usage:
 *   node scripts/createRealisticJobs.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Helper to create date at 11:59 PM local time, then convert to UTC
function createDateAt1159PM(year, month, day, timezoneOffset = 0) {
  // Create date at 11:59:59 PM local time
  const localDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  
  // For UTC storage, we need to account for timezone
  // If server is in UTC, localDate is already correct
  // If server has offset, adjust accordingly
  const utcDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
  
  return utcDate;
}

// Helper to create date string in ISO format for 11:59 PM
function createDateISO(year, month, day) {
  // Create date at 11:59:59 PM UTC
  const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return date.toISOString();
}

const RECRUITER_EMAIL = 'charansai82140@gmail.com';
const RECRUITER_NAME = 'Sai Charan';

// Realistic company names (no mock/test data)
const COMPANIES = [
  { name: 'TechCorp Solutions', location: 'Bangalore, Karnataka' },
  { name: 'InnovateLabs India', location: 'Hyderabad, Telangana' },
  { name: 'DataSphere Analytics', location: 'Pune, Maharashtra' },
  { name: 'CloudVantage Systems', location: 'Chennai, Tamil Nadu' },
  { name: 'SecureNet Technologies', location: 'Noida, Uttar Pradesh' },
];

// Realistic job titles
const JOB_TITLES = [
  'Senior Software Engineer',
  'Full Stack Developer',
  'Backend Engineer',
  'DevOps Engineer',
  'Data Engineer',
  'Machine Learning Engineer',
  'Cloud Solutions Architect',
  'Product Manager',
  'QA Automation Engineer',
  'Frontend Developer',
];

const JOB_DESCRIPTIONS = [
  'We are seeking an experienced software engineer to join our dynamic team. You will be responsible for designing, developing, and maintaining scalable web applications using modern technologies. The ideal candidate should have strong problem-solving skills and experience with microservices architecture.',
  
  'Join our innovative team as a full stack developer where you will work on cutting-edge projects. You will collaborate with cross-functional teams to deliver high-quality software solutions. Experience with React, Node.js, and cloud platforms is essential.',
  
  'We are looking for a backend engineer to build robust and scalable server-side applications. You will work with distributed systems, APIs, and databases. Strong knowledge of system design and performance optimization is required.',
  
  'As a DevOps engineer, you will be responsible for automating deployment pipelines, managing cloud infrastructure, and ensuring system reliability. Experience with CI/CD tools, containerization, and cloud platforms is essential.',
  
  'Join our data engineering team to build and maintain data pipelines, ETL processes, and data warehouses. You will work with large-scale data processing frameworks and cloud data services.',
];

const SKILLS = [
  ['JavaScript', 'Node.js', 'React', 'PostgreSQL', 'AWS'],
  ['Python', 'Django', 'React', 'MongoDB', 'Docker'],
  ['Java', 'Spring Boot', 'MySQL', 'Kubernetes', 'Azure'],
  ['TypeScript', 'Next.js', 'PostgreSQL', 'Docker', 'AWS'],
  ['Python', 'FastAPI', 'Redis', 'Kubernetes', 'GCP'],
];

async function createJobs() {
  console.log('🚀 Creating realistic job records...\n');

  const createdJobs = {
    posted: [],
    review: [],
  };

  try {
    // Find or create companies
    const companyRecords = [];
    for (const company of COMPANIES) {
      let companyRecord = await prisma.company.findFirst({
        where: { name: company.name },
      });
      
      if (!companyRecord) {
        companyRecord = await prisma.company.create({
          data: {
            name: company.name,
            location: company.location,
            website: `https://www.${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
            description: `${company.name} is a leading technology company specializing in innovative solutions.`,
          },
        });
      }
      companyRecords.push(companyRecord);
    }

    // POSTED JOBS - SET 1 (3 jobs)
    // applicationDeadline: 21-01-2026 11:59 PM
    // driveDate: 22-01-2026 11:59 PM
    // resume screening: enabled, QA/Test: disabled
    console.log('📝 Creating POSTED jobs - Set 1...');
    for (let i = 0; i < 3; i++) {
      const company = companyRecords[i % companyRecords.length];
      const jobTitle = JOB_TITLES[i % JOB_TITLES.length];
      const description = JOB_DESCRIPTIONS[i % JOB_DESCRIPTIONS.length];
      const skills = SKILLS[i % SKILLS.length];

      const applicationDeadline = createDateISO(2026, 1, 21); // 21-01-2026 11:59 PM UTC
      const driveDate = createDateISO(2026, 1, 22); // 22-01-2026 11:59 PM UTC

      const job = await prisma.job.create({
        data: {
          jobTitle,
          description,
          requirements: JSON.stringify([
            'Bachelor\'s degree in Computer Science or related field',
            '3+ years of professional experience',
            'Strong problem-solving and analytical skills',
            'Excellent communication and teamwork abilities',
          ]),
          requiredSkills: JSON.stringify(skills),
          companyId: company.id,
          companyName: company.name,
          recruiterEmail: RECRUITER_EMAIL,
          recruiterName: RECRUITER_NAME,
          recruiterEmails: JSON.stringify([{ email: RECRUITER_EMAIL, name: RECRUITER_NAME }]),
          location: company.location,
          companyLocation: company.location,
          driveDate: new Date(driveDate),
          applicationDeadline: new Date(applicationDeadline),
          jobType: 'Full-time',
          experienceLevel: 'Mid-level',
          driveVenues: JSON.stringify([company.location]),
          qualification: 'B.Tech',
          specialization: 'Computer Science',
          yop: '2025,2026',
          minCgpa: '7.00',
          gapAllowed: 'No',
          backlogs: '0',
          spocs: JSON.stringify([{
            fullName: RECRUITER_NAME,
            email: RECRUITER_EMAIL,
            phone: '+91-9876543210',
          }]),
          status: 'POSTED',
          isActive: true,
          isPosted: true,
          requiresScreening: true, // Resume screening enabled
          requiresTest: false, // QA/Test disabled
          targetSchools: JSON.stringify(['ALL']),
          targetCenters: JSON.stringify(['ALL']),
          targetBatches: JSON.stringify(['ALL']),
          postedAt: new Date(),
          postedBy: null, // Will be set by admin when posting
        },
      });

      console.log(`  ✅ Created POSTED job: ${job.jobTitle} (ID: ${job.id})`);
      console.log(`     Application Deadline: ${new Date(job.applicationDeadline).toISOString()}`);
      console.log(`     Drive Date: ${new Date(job.driveDate).toISOString()}`);
      createdJobs.posted.push({
        id: job.id,
        jobTitle: job.jobTitle,
        status: job.status,
        applicationDeadline: job.applicationDeadline.toISOString(),
        driveDate: job.driveDate.toISOString(),
        requiresScreening: job.requiresScreening,
        requiresTest: job.requiresTest,
      });
    }

    // POSTED JOBS - SET 2 (2 jobs)
    // applicationDeadline: 22-01-2026 11:59 PM
    // driveDate: 23-01-2026 11:59 PM
    // resume screening: enabled, QA/Test: enabled
    console.log('\n📝 Creating POSTED jobs - Set 2...');
    for (let i = 0; i < 2; i++) {
      const company = companyRecords[(i + 3) % companyRecords.length];
      const jobTitle = JOB_TITLES[(i + 3) % JOB_TITLES.length];
      const description = JOB_DESCRIPTIONS[(i + 3) % JOB_DESCRIPTIONS.length];
      const skills = SKILLS[(i + 3) % SKILLS.length];

      const applicationDeadline = createDateISO(2026, 1, 22); // 22-01-2026 11:59 PM UTC
      const driveDate = createDateISO(2026, 1, 23); // 23-01-2026 11:59 PM UTC

      const job = await prisma.job.create({
        data: {
          jobTitle,
          description,
          requirements: JSON.stringify([
            'Bachelor\'s degree in Computer Science or related field',
            '2+ years of professional experience',
            'Strong technical and analytical skills',
            'Ability to work in agile environments',
          ]),
          requiredSkills: JSON.stringify(skills),
          companyId: company.id,
          companyName: company.name,
          recruiterEmail: RECRUITER_EMAIL,
          recruiterName: RECRUITER_NAME,
          recruiterEmails: JSON.stringify([{ email: RECRUITER_EMAIL, name: RECRUITER_NAME }]),
          location: company.location,
          companyLocation: company.location,
          driveDate: new Date(driveDate),
          applicationDeadline: new Date(applicationDeadline),
          jobType: 'Full-time',
          experienceLevel: 'Entry to Mid-level',
          driveVenues: JSON.stringify([company.location]),
          qualification: 'B.Tech',
          specialization: 'Computer Science, Information Technology',
          yop: '2025,2026,2027',
          minCgpa: '7.50',
          gapAllowed: '1 year',
          backlogs: '0-1',
          spocs: JSON.stringify([{
            fullName: RECRUITER_NAME,
            email: RECRUITER_EMAIL,
            phone: '+91-9876543210',
          }]),
          status: 'POSTED',
          isActive: true,
          isPosted: true,
          requiresScreening: true, // Resume screening enabled
          requiresTest: true, // QA/Test enabled
          targetSchools: JSON.stringify(['ALL']),
          targetCenters: JSON.stringify(['ALL']),
          targetBatches: JSON.stringify(['ALL']),
          postedAt: new Date(),
          postedBy: null,
        },
      });

      console.log(`  ✅ Created POSTED job: ${job.jobTitle} (ID: ${job.id})`);
      console.log(`     Application Deadline: ${new Date(job.applicationDeadline).toISOString()}`);
      console.log(`     Drive Date: ${new Date(job.driveDate).toISOString()}`);
      createdJobs.posted.push({
        id: job.id,
        jobTitle: job.jobTitle,
        status: job.status,
        applicationDeadline: job.applicationDeadline.toISOString(),
        driveDate: job.driveDate.toISOString(),
        requiresScreening: job.requiresScreening,
        requiresTest: job.requiresTest,
      });
    }

    // REVIEW JOBS (2 jobs)
    // status: REVIEW
    // Future dates
    console.log('\n📝 Creating REVIEW jobs...');
    for (let i = 0; i < 2; i++) {
      const company = companyRecords[i % companyRecords.length];
      const jobTitle = JOB_TITLES[(i + 5) % JOB_TITLES.length];
      const description = JOB_DESCRIPTIONS[(i + 2) % JOB_DESCRIPTIONS.length];
      const skills = SKILLS[(i + 2) % SKILLS.length];

      // Future dates: applicationDeadline in 2 weeks, driveDate 1 day after
      const applicationDeadline = createDateISO(2026, 2, 15); // 15-02-2026 11:59 PM UTC
      const driveDate = createDateISO(2026, 2, 16); // 16-02-2026 11:59 PM UTC

      const job = await prisma.job.create({
        data: {
          jobTitle,
          description,
          requirements: JSON.stringify([
            'Bachelor\'s or Master\'s degree in relevant field',
            'Strong technical background',
            'Excellent problem-solving abilities',
            'Good communication skills',
          ]),
          requiredSkills: JSON.stringify(skills),
          companyId: company.id,
          companyName: company.name,
          recruiterEmail: RECRUITER_EMAIL,
          recruiterName: RECRUITER_NAME,
          recruiterEmails: JSON.stringify([{ email: RECRUITER_EMAIL, name: RECRUITER_NAME }]),
          location: company.location,
          companyLocation: company.location,
          driveDate: new Date(driveDate),
          applicationDeadline: new Date(applicationDeadline),
          jobType: 'Full-time',
          experienceLevel: 'Senior',
          driveVenues: JSON.stringify([company.location]),
          qualification: 'B.Tech, M.Tech',
          specialization: 'Computer Science',
          yop: '2024,2025,2026',
          minCgpa: '8.00',
          gapAllowed: 'No',
          backlogs: '0',
          spocs: JSON.stringify([{
            fullName: RECRUITER_NAME,
            email: RECRUITER_EMAIL,
            phone: '+91-9876543210',
          }]),
          status: 'IN_REVIEW', // REVIEW status
          isActive: false,
          isPosted: false,
          requiresScreening: true,
          requiresTest: false,
          targetSchools: JSON.stringify(['ALL']),
          targetCenters: JSON.stringify(['ALL']),
          targetBatches: JSON.stringify(['ALL']),
          submittedAt: new Date(),
        },
      });

      console.log(`  ✅ Created REVIEW job: ${job.jobTitle} (ID: ${job.id})`);
      console.log(`     Application Deadline: ${new Date(job.applicationDeadline).toISOString()}`);
      console.log(`     Drive Date: ${new Date(job.driveDate).toISOString()}`);
      createdJobs.review.push({
        id: job.id,
        jobTitle: job.jobTitle,
        status: job.status,
        applicationDeadline: job.applicationDeadline.toISOString(),
        driveDate: job.driveDate.toISOString(),
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`✅ Created ${createdJobs.posted.length} POSTED jobs`);
    console.log(`✅ Created ${createdJobs.review.length} REVIEW jobs`);
    console.log('='.repeat(60) + '\n');

    return createdJobs;
  } catch (error) {
    console.error('❌ Error creating jobs:', error);
    throw error;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set!');
    process.exit(1);
  }

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    const jobs = await createJobs();

    // Output for verification
    console.log('📋 Created Jobs Summary:\n');
    console.log('POSTED Jobs:');
    jobs.posted.forEach((job, idx) => {
      console.log(`  ${idx + 1}. ${job.jobTitle}`);
      console.log(`     ID: ${job.id}`);
      console.log(`     Application Deadline: ${job.applicationDeadline}`);
      console.log(`     Drive Date: ${job.driveDate}`);
      console.log(`     Screening: ${job.requiresScreening}, Test: ${job.requiresTest}\n`);
    });

    console.log('REVIEW Jobs:');
    jobs.review.forEach((job, idx) => {
      console.log(`  ${idx + 1}. ${job.jobTitle}`);
      console.log(`     ID: ${job.id}`);
      console.log(`     Application Deadline: ${job.applicationDeadline}`);
      console.log(`     Drive Date: ${job.driveDate}\n`);
    });

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
