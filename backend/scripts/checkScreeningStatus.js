/**
 * Check Screening Status Script
 * 
 * Verifies the actual screening status of candidates for a specific job.
 * 
 * Usage:
 *   node scripts/checkScreeningStatus.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const COMPANY_NAME = 'CloudVantage Systems';
const JOB_TITLE = 'DevOps Engineer';

async function checkScreeningStatus() {
  console.log('🔍 Checking Screening Status...\n');
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
          orderBy: {
            appliedDate: 'desc',
          },
        },
      },
    });

    if (!job) {
      console.error(`❌ Job not found: ${JOB_TITLE} at ${COMPANY_NAME}`);
      return;
    }

    console.log(`\n1️⃣ JOB INFORMATION:`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Title: ${job.jobTitle}`);
    console.log(`   Company: ${job.company?.name || job.companyName}`);
    console.log(`   Requires Screening: ${job.requiresScreening}`);
    console.log(`   Requires Test: ${job.requiresTest}\n`);

    console.log(`2️⃣ APPLICATIONS STATUS (${job.applications.length} total):\n`);

    const statusGroups = {
      APPLIED: [],
      SCREENING_SELECTED: [],
      SCREENING_REJECTED: [],
      TEST_SELECTED: [],
      TEST_REJECTED: [],
      INTERVIEW_ELIGIBLE: [],
      OTHER: [],
    };

    job.applications.forEach(app => {
      const status = app.screeningStatus || 'APPLIED';
      const studentInfo = {
        name: app.student.fullName,
        email: app.student.email,
        status: status,
        screeningCompletedAt: app.screeningCompletedAt,
      };

      if (statusGroups[status]) {
        statusGroups[status].push(studentInfo);
      } else {
        statusGroups.OTHER.push({ ...studentInfo, status });
      }
    });

    Object.entries(statusGroups).forEach(([status, students]) => {
      if (students.length > 0) {
        console.log(`   ${status} (${students.length}):`);
        students.forEach((s, idx) => {
          console.log(`     ${idx + 1}. ${s.name} (${s.email})`);
          if (s.screeningCompletedAt) {
            console.log(`        Completed: ${new Date(s.screeningCompletedAt).toISOString()}`);
          }
        });
        console.log('');
      }
    });

    // Check what's required for interviews
    console.log(`3️⃣ INTERVIEW REQUIREMENTS:`);
    const requiresScreening = job.requiresScreening || false;
    const requiresTest = job.requiresTest || false;

    if (requiresScreening && requiresTest) {
      console.log(`   ✅ Requires BOTH Screening + Test`);
      console.log(`   ✅ Candidates must have: screeningStatus = 'INTERVIEW_ELIGIBLE'`);
      console.log(`   📊 Current INTERVIEW_ELIGIBLE count: ${statusGroups.INTERVIEW_ELIGIBLE.length}\n`);
      
      if (statusGroups.TEST_SELECTED.length > 0) {
        console.log(`   ⚠️  FOUND ${statusGroups.TEST_SELECTED.length} candidates with TEST_SELECTED:`);
        console.log(`      These need to be finalized to INTERVIEW_ELIGIBLE!\n`);
        statusGroups.TEST_SELECTED.forEach((s, idx) => {
          console.log(`      ${idx + 1}. ${s.name} (${s.email})`);
        });
        console.log('');
      }
    } else if (requiresTest) {
      console.log(`   ✅ Requires Test only`);
      console.log(`   ✅ Candidates must have: screeningStatus = 'INTERVIEW_ELIGIBLE'`);
    } else if (requiresScreening) {
      console.log(`   ✅ Requires Screening only`);
      console.log(`   ✅ Candidates must have: screeningStatus = 'INTERVIEW_ELIGIBLE' or 'SCREENING_SELECTED'`);
    } else {
      console.log(`   ✅ No screening requirements`);
      console.log(`   ✅ All applications can proceed to interview`);
    }

    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(80));

    const eligibleCount = statusGroups.INTERVIEW_ELIGIBLE.length;
    const testSelectedCount = statusGroups.TEST_SELECTED.length;

    if (requiresScreening || requiresTest) {
      if (eligibleCount === 0 && testSelectedCount > 0) {
        console.log('\n❌ PROBLEM IDENTIFIED:');
        console.log(`   ${testSelectedCount} candidates have passed screening/test but are NOT marked as INTERVIEW_ELIGIBLE`);
        console.log('\n💡 SOLUTION:');
        console.log('   Finalize screening to convert TEST_SELECTED → INTERVIEW_ELIGIBLE');
        console.log('   OR update candidates directly:\n');
        console.log('   Run: npm run db:fix-screening-status\n');
      } else if (eligibleCount > 0) {
        console.log(`\n✅ ${eligibleCount} candidates are eligible for interview`);
        console.log('   They should appear in interview rounds.\n');
      } else {
        console.log('\n⚠️  No candidates eligible for interview yet');
        console.log('   Complete screening/test first.\n');
      }
    } else {
      console.log(`\n✅ All ${job.applications.length} applications can proceed to interview\n`);
    }

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

    await checkScreeningStatus();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
