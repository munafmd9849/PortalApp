/**
 * Mark All Applicants Script
 * 
 * Marks all students who applied to a specific job.
 * 
 * Usage:
 *   node scripts/markAllApplicants.js
 * 
 * Configuration:
 *   - Find job by company name and role
 *   - Update all applications for that job
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const COMPANY_NAME = 'CloudVantage Systems';
const JOB_TITLE = 'DevOps Engineer';

async function markAllApplicants() {
  console.log(`🔍 Finding job: ${JOB_TITLE} at ${COMPANY_NAME}...\n`);

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
      include: {
        company: true,
        applications: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      console.error(`❌ Job not found: ${JOB_TITLE} at ${COMPANY_NAME}`);
      console.log('\nAvailable jobs:');
      const allJobs = await prisma.job.findMany({
        select: {
          id: true,
          jobTitle: true,
          companyName: true,
          company: { select: { name: true } },
        },
        take: 20,
      });
      allJobs.forEach(j => {
        console.log(`  - ${j.jobTitle} at ${j.company?.name || j.companyName || 'Unknown'}`);
      });
      return;
    }

    console.log(`✅ Found job: ${job.jobTitle}`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Company: ${job.company?.name || job.companyName}`);
    console.log(`   Current Applications: ${job.applications.length}\n`);

    if (job.applications.length === 0) {
      console.log('⚠️  No applications found for this job.');
      console.log('\n💡 To create test applications, you can:');
      console.log('   1. Have students apply through the frontend');
      console.log('   2. Or run a script to create test applications\n');
      console.log('This script will mark all applicants when they exist.\n');
      return;
    }

    // Display current application statuses
    console.log('Current Application Statuses:');
    console.log('='.repeat(80));
    const statusCounts = {};
    job.applications.forEach(app => {
      const status = app.screeningStatus || app.status || 'APPLIED';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} applications`);
    });
    console.log('');

    // Show applicants
    console.log('Applicants:');
    job.applications.forEach((app, idx) => {
      console.log(`  ${idx + 1}. ${app.student?.fullName || 'Unknown'} (${app.student?.email || 'N/A'})`);
      console.log(`     Current Status: ${app.status || 'APPLIED'}`);
      console.log(`     Screening Status: ${app.screeningStatus || 'APPLIED'}`);
      console.log(`     Applied: ${app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : 'N/A'}\n`);
    });

    // Update all applications
    console.log('📝 Updating all applications...\n');

    const updateResults = {
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (const application of job.applications) {
      try {
        // Update application status
        // Options:
        // - Mark as RESUME_SELECTED (passed resume screening)
        // - Mark as TEST_SELECTED (passed test, eligible for interview)
        // - Mark as SHORTLISTED
        // 
        // We'll mark as RESUME_SELECTED for resume screening pass
        // and TEST_SELECTED if test is required (job.requiresTest)

        let newScreeningStatus = 'RESUME_SELECTED';
        if (job.requiresTest) {
          newScreeningStatus = 'TEST_SELECTED'; // Passed both resume and test
        }

        await prisma.application.update({
          where: { id: application.id },
          data: {
            screeningStatus: newScreeningStatus,
            screeningCompletedAt: new Date(),
            // Keep status as 'ONGOING' if it's not already SELECTED/REJECTED
            status: application.status === 'SELECTED' || application.status === 'REJECTED' 
              ? application.status 
              : 'ONGOING',
          },
        });

        console.log(`  ✅ Marked: ${application.student?.fullName || 'Unknown'} as ${newScreeningStatus}`);
        updateResults.updated++;
      } catch (error) {
        console.error(`  ❌ Error updating ${application.student?.fullName || application.id}:`, error.message);
        updateResults.errors.push({
          applicationId: application.id,
          studentName: application.student?.fullName,
          error: error.message,
        });
        updateResults.skipped++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary:');
    console.log(`✅ Successfully updated: ${updateResults.updated} applications`);
    console.log(`⚠️  Errors/Skipped: ${updateResults.skipped}`);
    console.log('='.repeat(80) + '\n');

    if (updateResults.errors.length > 0) {
      console.log('Errors:');
      updateResults.errors.forEach(err => {
        console.log(`  - ${err.studentName || err.applicationId}: ${err.error}`);
      });
      console.log('');
    }

    // Verify updates
    const updatedJob = await prisma.job.findUnique({
      where: { id: job.id },
      include: {
        applications: {
          include: {
            student: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    console.log('✅ Verification - Updated Application Statuses:');
    const newStatusCounts = {};
    updatedJob.applications.forEach(app => {
      const status = app.screeningStatus || app.status || 'APPLIED';
      newStatusCounts[status] = (newStatusCounts[status] || 0) + 1;
    });
    Object.entries(newStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} applications`);
    });
    console.log('');

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

    await markAllApplicants();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
