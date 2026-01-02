/**
 * Script to insert mock jobs into the database for recruiters
 * Usage: node backend/scripts/insertMockJobs.js [recruiterEmail]
 * If recruiterEmail is not provided, it will create jobs for all recruiters
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

const jobTitles = [
  'Software Engineer',
  'Senior Software Engineer',
  'Full Stack Developer',
  'Backend Developer',
  'Frontend Developer',
  'DevOps Engineer',
  'Data Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'QA Engineer',
  'Product Manager',
  'Business Analyst',
  'UI/UX Designer',
  'System Administrator',
  'Cloud Architect',
  'Mobile App Developer',
  'Security Engineer',
  'Database Administrator'
];

const jobTypes = ['Full-Time', 'Internship', 'Part-Time'];
const workModes = ['Remote', 'Hybrid', 'On-site'];
const statuses = ['DRAFT', 'IN_REVIEW', 'POSTED'];
const locations = ['Bangalore', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai', 'Noida', 'Delhi', 'Gurgaon'];
const schools = ['SOT', 'SOM', 'SOH'];
const centers = ['BANGALORE', 'NOIDA', 'LUCKNOW', 'PUNE', 'PATNA', 'INDORE'];
const batches = ['23-27', '24-28', '25-29', '26-30'];

const skills = [
  'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'MongoDB',
  'AWS', 'Docker', 'Kubernetes', 'Git', 'TypeScript', 'Angular', 'Vue.js',
  'Express', 'Django', 'Flask', 'Spring Boot', 'PostgreSQL', 'MySQL'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateMockJob(recruiter, company, index) {
  const jobTitle = getRandomElement(jobTitles);
  const jobType = getRandomElement(jobTypes);
  const workMode = getRandomElement(workModes);
  const status = getRandomElement(statuses);
  const location = getRandomElement(locations);
  
  const daysAgo = Math.floor(Math.random() * 180);
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);
  
  const driveDate = new Date();
  driveDate.setDate(driveDate.getDate() + Math.floor(Math.random() * 60) + 7); // 7-67 days from now
  
  const applicationDeadline = new Date(driveDate);
  applicationDeadline.setDate(applicationDeadline.getDate() - Math.floor(Math.random() * 10) + 3); // 3-13 days before drive
  
  const selectedSkills = getRandomElements(skills, Math.floor(Math.random() * 5) + 3); // 3-7 skills
  
  const requirements = [
    `Strong problem-solving skills and ability to work in a team environment`,
    `Excellent communication skills and attention to detail`,
    `Experience with modern development practices and agile methodologies`,
    `Ability to learn new technologies quickly and adapt to changing requirements`,
    `Bachelor's or Master's degree in Computer Science or related field`
  ];
  
  const driveVenues = getRandomElements(locations, Math.floor(Math.random() * 3) + 1); // 1-3 venues
  
  const spocs = [
    {
      fullName: recruiter.user?.displayName || 'HR Manager',
      email: recruiter.user?.email || 'hr@company.com',
      phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`
    }
  ];
  
  // Some jobs target all, some target specific
  const targetAll = Math.random() > 0.7; // 30% chance of targeting all
  const targetSchools = targetAll ? ['ALL'] : getRandomElements(schools, Math.floor(Math.random() * schools.length) + 1);
  const targetCenters = targetAll ? ['ALL'] : getRandomElements(centers, Math.floor(Math.random() * centers.length) + 1);
  const targetBatches = targetAll ? ['ALL'] : getRandomElements(batches, Math.floor(Math.random() * batches.length) + 1);
  
  const salary = jobType === 'Internship' 
    ? null 
    : `₹${Math.floor(Math.random() * 20) + 8}-${Math.floor(Math.random() * 20) + 15} LPA`;
  
  const stipend = jobType === 'Internship'
    ? `₹${Math.floor(Math.random() * 30) + 15}k/month`
    : null;
  
  const description = `We are looking for a talented ${jobTitle} to join our dynamic team. This role offers an excellent opportunity to work on cutting-edge projects and collaborate with experienced professionals.

Key Responsibilities:
• Design, develop, and maintain scalable software applications
• Collaborate with cross-functional teams to deliver high-quality solutions
• Participate in code reviews and contribute to technical discussions
• Troubleshoot and debug applications to ensure optimal performance
• Stay updated with latest technologies and industry best practices

This is a ${workMode.toLowerCase()} position with competitive compensation and excellent growth opportunities.`;

  return {
    jobTitle,
    description,
    requirements: JSON.stringify(requirements),
    requiredSkills: JSON.stringify(selectedSkills),
    companyId: company?.id || null,
    recruiterId: recruiter.id,
    companyName: company?.name || recruiter.companyName || 'Tech Company',
    salary,
    ctc: salary,
    salaryRange: salary,
    location,
    companyLocation: location,
    driveDate,
    applicationDeadline,
    jobType,
    experienceLevel: jobType === 'Internship' ? 'Fresher' : '0-2 years',
    driveVenues: JSON.stringify(driveVenues),
    spocs: JSON.stringify(spocs),
    status,
    isActive: status === 'POSTED',
    isPosted: status === 'POSTED',
    targetSchools: JSON.stringify(targetSchools),
    targetCenters: JSON.stringify(targetCenters),
    targetBatches: JSON.stringify(targetBatches),
    createdAt,
    submittedAt: status !== 'DRAFT' ? createdAt : null,
    postedAt: status === 'POSTED' ? createdAt : null,
  };
}

async function insertMockJobs(recruiterEmail = null) {
  try {
    console.log('🚀 Starting mock jobs insertion...\n');

    // Find recruiters
    let recruiters;
    if (recruiterEmail) {
      console.log(`📧 Looking for recruiter with email: ${recruiterEmail}`);
      const recruiter = await prisma.recruiter.findFirst({
        where: {
          user: {
            email: recruiterEmail,
          },
        },
        include: {
          user: {
            select: {
              email: true,
              displayName: true,
            },
          },
          company: true,
        },
      });

      if (!recruiter) {
        console.error(`❌ Recruiter with email ${recruiterEmail} not found`);
        process.exit(1);
      }
      recruiters = [recruiter];
    } else {
      console.log('📋 Fetching all recruiters...');
      recruiters = await prisma.recruiter.findMany({
        include: {
          user: {
            select: {
              email: true,
              displayName: true,
            },
          },
          company: true,
        },
      });

      if (recruiters.length === 0) {
        console.error('❌ No recruiters found in the database');
        console.log('💡 Please create at least one recruiter user first');
        process.exit(1);
      }
    }

    console.log(`✅ Found ${recruiters.length} recruiter(s)\n`);

    let totalJobsCreated = 0;

    for (const recruiter of recruiters) {
      console.log(`\n👤 Processing recruiter: ${recruiter.user?.email || 'Unknown'}`);
      
      // Check existing jobs count
      const existingJobsCount = await prisma.job.count({
        where: { recruiterId: recruiter.id },
      });

      // Create 5-15 jobs per recruiter (if they don't have many already)
      const jobsToCreate = existingJobsCount < 5 ? Math.floor(Math.random() * 10) + 5 : 0;

      if (jobsToCreate === 0) {
        console.log(`   ⏭️  Skipping (${existingJobsCount} jobs already exist)`);
        continue;
      }

      console.log(`   📝 Creating ${jobsToCreate} mock jobs...`);

      const company = recruiter.company || null;

      for (let i = 0; i < jobsToCreate; i++) {
        const jobData = generateMockJob(recruiter, company, i);
        
        try {
          await prisma.job.create({
            data: jobData,
          });
          totalJobsCreated++;
        } catch (error) {
          console.error(`   ❌ Error creating job ${i + 1}:`, error.message);
        }
      }

      console.log(`   ✅ Created ${jobsToCreate} jobs for ${recruiter.user?.email || 'Unknown'}`);
    }

    console.log('\n✨ Mock jobs insertion completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Recruiters processed: ${recruiters.length}`);
    console.log(`   Total jobs created: ${totalJobsCreated}`);

  } catch (error) {
    console.error('❌ Error inserting mock jobs:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get recruiterEmail from command line arguments
const recruiterEmail = process.argv[2] || null;

// Run the script
insertMockJobs(recruiterEmail);

