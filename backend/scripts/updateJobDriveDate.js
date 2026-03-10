/**
 * Update Job Drive Date Script
 * 
 * Updates the drive date for a specific job to allow rounds to start immediately.
 * 
 * Usage:
 *   node scripts/updateJobDriveDate.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const COMPANY_NAME = 'CloudVantage Systems';
const JOB_TITLE = 'DevOps Engineer';

async function updateDriveDate() {
  console.log('📅 Updating job drive date...\n');

  try {
    // Find the job
    const job = await prisma.job.findFirst({
      where: {
        jobTitle: { contains: JOB_TITLE, mode: 'insensitive' },
        OR: [
          { companyName: { contains: COMPANY_NAME, mode: 'insensitive' } },
          { company: { name: { contains: COMPANY_NAME, mode: 'insensitive' } } },
        ],
      },
    });

    if (!job) {
      console.error(`❌ Job not found: ${JOB_TITLE} at ${COMPANY_NAME}`);
      return;
    }

    console.log(`✅ Found job: ${job.jobTitle}`);
    console.log(`   Current Drive Date: ${job.driveDate ? new Date(job.driveDate).toISOString() : 'NOT SET'}`);
    console.log(`   Current Application Deadline: ${job.applicationDeadline ? new Date(job.applicationDeadline).toISOString() : 'NOT SET'}\n`);

    // Set drive date to today (end of day UTC)
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    
    // Ensure application deadline is before drive date
    let newApplicationDeadline = job.applicationDeadline ? new Date(job.applicationDeadline) : todayUTC;
    if (newApplicationDeadline >= todayUTC) {
      // Set application deadline to yesterday end of day
      newApplicationDeadline = new Date(todayUTC);
      newApplicationDeadline.setUTCDate(newApplicationDeadline.getUTCDate() - 1);
      newApplicationDeadline.setUTCHours(23, 59, 59, 999);
    }

    console.log('📝 Updating dates:');
    console.log(`   New Application Deadline: ${newApplicationDeadline.toISOString()}`);
    console.log(`   New Drive Date: ${todayUTC.toISOString()}\n`);

    // Update job
    const updatedJob = await prisma.job.update({
      where: { id: job.id },
      data: {
        applicationDeadline: newApplicationDeadline,
        driveDate: todayUTC,
      },
    });

    console.log('✅ Job updated successfully!');
    console.log(`   Application Deadline: ${new Date(updatedJob.applicationDeadline).toISOString()}`);
    console.log(`   Drive Date: ${new Date(updatedJob.driveDate).toISOString()}\n`);
    console.log('💡 Rounds can now be started immediately!\n');

  } catch (error) {
    console.error('❌ Error:', error);
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

    await updateDriveDate();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
