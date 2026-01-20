/**
 * Script to create a job that expires today (January 19, 2026)
 * Run with: node backend/scripts/createExpiringJob.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
const prisma = new PrismaClient();

async function createExpiringJob() {
  try {
    console.log('🚀 Creating job that expires today...');

    // Set today's date as January 19, 2026 (end of day in UTC)
    const today = new Date('2026-01-19T23:59:59.999Z'); // End of day UTC
    
    // Set drive date to tomorrow (January 20, 2026)
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

    // Create the job with today's expiration
    const job = await prisma.job.create({
      data: {
        jobTitle: 'Software Engineer - Expiring Today',
        description: 'This is a test job that expires today (January 19, 2026). Apply before the deadline!',
        requirements: JSON.stringify([
          'B.Tech in Computer Science or related field',
          'Strong problem-solving skills',
          'Good communication skills'
        ]),
        requiredSkills: JSON.stringify([
          'JavaScript',
          'React',
          'Node.js',
          'PostgreSQL'
        ]),
        companyId: company.id,
        companyName: company.name,
        recruiterEmail: 'recruiter@testcompany.com',
        recruiterName: 'HR Team',
        recruiterEmails: JSON.stringify([
          { email: 'recruiter@testcompany.com', name: 'HR Team' }
        ]),
        salary: '8-12 LPA',
        ctc: '8-12 LPA',
        salaryRange: '8-12 LPA',
        location: 'Bangalore',
        companyLocation: 'Bangalore',
        driveDate: driveDate,
        applicationDeadline: today, // Expires today!
        jobType: 'Full-time',
        experienceLevel: 'Entry Level',
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

createExpiringJob();
