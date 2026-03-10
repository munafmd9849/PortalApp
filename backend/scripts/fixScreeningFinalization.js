/**
 * Fix Screening Finalization Script
 * 
 * For jobs where all candidates have been decided but screening hasn't been finalized,
 * this script ensures TEST_SELECTED candidates are converted to INTERVIEW_ELIGIBLE.
 * 
 * Usage:
 *   node scripts/fixScreeningFinalization.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const COMPANY_NAME = 'CloudVantage Systems';
const JOB_TITLE = 'DevOps Engineer';

async function fixScreeningFinalization() {
  console.log('🔧 Fixing Screening Finalization...\n');
  console.log('='.repeat(80));

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
        applications: true,
      },
    });

    if (!job) {
      console.error(`❌ Job not found: ${JOB_TITLE} at ${COMPANY_NAME}`);
      return;
    }

    console.log(`\n✅ Found job: ${job.jobTitle}`);
    console.log(`   Requires Screening: ${job.requiresScreening}`);
    console.log(`   Requires Test: ${job.requiresTest}\n`);

    // Check current statuses
    const testSelected = job.applications.filter(a => a.screeningStatus === 'TEST_SELECTED');
    const interviewEligible = job.applications.filter(a => a.screeningStatus === 'INTERVIEW_ELIGIBLE');

    console.log(`📊 Current Status:`);
    console.log(`   TEST_SELECTED: ${testSelected.length}`);
    console.log(`   INTERVIEW_ELIGIBLE: ${interviewEligible.length}\n`);

    if (testSelected.length === 0) {
      console.log('✅ No TEST_SELECTED candidates to fix.');
      console.log(`✅ ${interviewEligible.length} candidates already have INTERVIEW_ELIGIBLE status.\n`);
      return;
    }

    console.log(`🔄 Converting ${testSelected.length} TEST_SELECTED → INTERVIEW_ELIGIBLE...\n`);

    // Convert TEST_SELECTED to INTERVIEW_ELIGIBLE
    const result = await prisma.application.updateMany({
      where: {
        jobId: job.id,
        screeningStatus: 'TEST_SELECTED',
      },
      data: {
        screeningStatus: 'INTERVIEW_ELIGIBLE',
        screeningCompletedAt: new Date(),
      },
    });

    console.log(`✅ Updated ${result.count} applications to INTERVIEW_ELIGIBLE\n`);

    // Verify
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

    const finalEligible = updatedJob.applications.filter(a => a.screeningStatus === 'INTERVIEW_ELIGIBLE');
    console.log('📊 Final Status:');
    console.log(`   INTERVIEW_ELIGIBLE: ${finalEligible.length}`);
    console.log('\n✅ Updated candidates:');
    finalEligible.forEach((app, idx) => {
      console.log(`   ${idx + 1}. ${app.student.fullName} (${app.student.email})`);
    });

    console.log('\n✅ Screening status fixed! Candidates should now appear in interview rounds.\n');

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

    await fixScreeningFinalization();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
