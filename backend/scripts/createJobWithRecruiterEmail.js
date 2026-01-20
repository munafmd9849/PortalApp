/**
 * Script to create a job with recruiter email charansai82140@gmail.com
 * Run with: node backend/scripts/createJobWithRecruiterEmail.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
const prisma = new PrismaClient();

async function createJobWithRecruiterEmail() {
  try {
    console.log('🚀 Creating job with recruiter email charansai82140@gmail.com...');

    // Set application deadline to January 19, 2026 (end of day in UTC)
    const deadline = new Date('2026-01-19T23:59:59.999Z'); // End of day UTC
    
    // Set drive date to January 20, 2026
    const driveDate = new Date('2026-01-20');
    driveDate.setHours(10, 0, 0, 0); // 10 AM

    // Find or create a company
    let company = await prisma.company.findFirst({
      where: { name: 'Test Company' }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'Test Company',
          website: 'https://testcompany.com'
        }
      });
      console.log('✅ Created company:', company.name);
    }

    // Create the job with recruiter email
    const job = await prisma.job.create({
      data: {
        jobTitle: 'Software Engineer',
        description: 'We are looking for a talented Software Engineer to join our team. You will be responsible for developing and maintaining web applications using modern technologies.',
        requirements: JSON.stringify([
          'B.Tech in Computer Science or related field',
          '2+ years of experience in software development',
          'Strong problem-solving skills',
          'Good communication skills'
        ]),
        requiredSkills: JSON.stringify([
          'JavaScript',
          'React',
          'Node.js',
          'PostgreSQL',
          'TypeScript'
        ]),
        companyId: company.id,
        companyName: company.name,
        recruiterEmail: 'charansai82140@gmail.com',
        recruiterName: 'Recruiter',
        recruiterEmails: JSON.stringify([
          { email: 'charansai82140@gmail.com', name: 'Recruiter' }
        ]),
        salary: '10-15 LPA',
        ctc: '10-15 LPA',
        salaryRange: '10-15 LPA',
        location: 'Bangalore',
        companyLocation: 'Bangalore',
        driveDate: driveDate,
        applicationDeadline: deadline,
        jobType: 'Full-time',
        experienceLevel: 'Mid Level',
        driveVenues: JSON.stringify(['Bangalore Office']),
        qualification: 'B.Tech',
        specialization: 'Computer Science',
        yop: '2025',
        minCgpa: '7.00',
        gapAllowed: 'No',
        backlogs: '0',
        spocs: JSON.stringify([
          {
            fullName: 'HR Contact',
            email: 'hr@testcompany.com',
            phone: '+91-1234567890'
          }
        ]),
        status: 'POSTED',
        isActive: true,
        isPosted: true,
        targetSchools: JSON.stringify(['ALL']),
        targetCenters: JSON.stringify(['ALL']),
        targetBatches: JSON.stringify(['ALL']),
        postedAt: new Date(),
        approvedAt: new Date(),
      }
    });

    console.log('✅ Job created successfully!');
    console.log('📋 Job Details:');
    console.log('   ID:', job.id);
    console.log('   Title:', job.jobTitle);
    console.log('   Company:', job.companyName);
    console.log('   Recruiter Email:', job.recruiterEmail);
    console.log('   Application Deadline:', job.applicationDeadline);
    console.log('   Drive Date:', job.driveDate);
    console.log('   Status:', job.status);
    console.log('   Is Active:', job.isActive);
    console.log('   Is Posted:', job.isPosted);

    await prisma.$disconnect();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error creating job:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createJobWithRecruiterEmail();
