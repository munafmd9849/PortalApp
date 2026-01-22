/**
 * Check Interview Candidates Script
 * 
 * Diagnoses why candidates aren't showing up in interview rounds.
 * 
 * Usage:
 *   node scripts/checkInterviewCandidates.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const COMPANY_NAME = 'CloudVantage Systems';
const JOB_TITLE = 'DevOps Engineer';

async function checkCandidates() {
  console.log('🔍 Checking Interview Candidates...\n');
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
        interviews: {
          include: {
            job: true,
          },
        },
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
      return;
    }

    console.log(`\n1️⃣ JOB INFORMATION:`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Title: ${job.jobTitle}`);
    console.log(`   Company: ${job.company?.name || job.companyName}`);
    console.log(`   Requires Screening: ${job.requiresScreening}`);
    console.log(`   Requires Test: ${job.requiresTest}\n`);

    // Check all applications
    console.log(`2️⃣ APPLICATIONS STATUS:`);
    console.log(`   Total Applications: ${job.applications.length}\n`);

    const screeningStatusCounts = {};
    job.applications.forEach(app => {
      const status = app.screeningStatus || 'NOT_SET';
      screeningStatusCounts[status] = (screeningStatusCounts[status] || 0) + 1;
    });

    console.log('   Screening Status Breakdown:');
    Object.entries(screeningStatusCounts).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}`);
    });
    console.log('');

    // Check interview record
    const interview = job.interviews?.[0];
    if (!interview) {
      console.log('❌ No interview record found!');
      return;
    }

    console.log(`3️⃣ INTERVIEW RECORD:`);
    console.log(`   Interview ID: ${interview.id}`);
    console.log(`   Status: ${interview.status}`);

    let rounds = [];
    try {
      rounds = JSON.parse(interview.rounds || '[]');
      console.log(`   Rounds: ${rounds.length}`);
      rounds.forEach((round, idx) => {
        console.log(`     ${idx + 1}. ${round.name} - ${round.status || 'pending'}`);
      });
    } catch (e) {
      console.log(`   ❌ Error parsing rounds: ${e.message}`);
      return;
    }

    if (rounds.length === 0) {
      console.log('   ❌ No rounds configured!');
      return;
    }

    const firstRound = rounds[0];
    console.log(`\n4️⃣ FIRST ROUND REQUIREMENTS:`);
    console.log(`   Round Name: ${firstRound.name}`);

    // Check what the backend expects
    const requiresScreening = job.requiresScreening || false;
    const requiresTest = job.requiresTest || false;

    console.log(`   Job Requirements:`);
    console.log(`     Requires Screening: ${requiresScreening}`);
    console.log(`     Requires Test: ${requiresTest}\n`);

    if (requiresScreening || requiresTest) {
      console.log(`   ⚠️  Backend expects: screeningStatus = 'INTERVIEW_ELIGIBLE'`);
      console.log(`   Current candidate statuses:`);
      
      // Check which candidates would qualify
      const eligibleCandidates = job.applications.filter(app => {
        return app.screeningStatus === 'INTERVIEW_ELIGIBLE';
      });

      const testSelectedCandidates = job.applications.filter(app => {
        return app.screeningStatus === 'TEST_SELECTED';
      });

      const resumeSelectedCandidates = job.applications.filter(app => {
        return app.screeningStatus === 'RESUME_SELECTED';
      });

      console.log(`     INTERVIEW_ELIGIBLE: ${eligibleCandidates.length}`);
      console.log(`     TEST_SELECTED: ${testSelectedCandidates.length}`);
      console.log(`     RESUME_SELECTED: ${resumeSelectedCandidates.length}\n`);

      if (eligibleCandidates.length === 0 && (testSelectedCandidates.length > 0 || resumeSelectedCandidates.length > 0)) {
        console.log(`   ❌ ISSUE FOUND: Candidates have TEST_SELECTED/RESUME_SELECTED but need INTERVIEW_ELIGIBLE!`);
        console.log(`\n   💡 SOLUTION: Update candidate statuses to INTERVIEW_ELIGIBLE`);
        console.log(`      Run: npm run db:fix-candidate-status\n`);
      }
    } else {
      console.log(`   ✅ No screening required - all applications should appear\n`);
    }

    // Test the actual query that backend uses
    console.log(`5️⃣ BACKEND QUERY SIMULATION:`);
    let applicationsWhere = { jobId: job.id };
    
    if (requiresScreening || requiresTest) {
      applicationsWhere = {
        ...applicationsWhere,
        screeningStatus: 'INTERVIEW_ELIGIBLE'
      };
    }

    const simulatedResults = await prisma.application.findMany({
      where: applicationsWhere,
      include: {
        student: {
          include: { user: true },
        },
      },
    });

    console.log(`   Query would return: ${simulatedResults.length} candidates\n`);

    if (simulatedResults.length === 0) {
      console.log(`   ❌ NO CANDIDATES WOULD BE RETURNED BY BACKEND!\n`);
    } else {
      console.log(`   ✅ Candidates that would appear:`);
      simulatedResults.forEach((app, idx) => {
        console.log(`     ${idx + 1}. ${app.student.fullName} (${app.student.email}) - ${app.screeningStatus}`);
      });
      console.log('');
    }

    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(80));

    if (simulatedResults.length === 0) {
      console.log('\n❌ PROBLEM IDENTIFIED:');
      console.log('   No candidates match the backend query criteria.');
      console.log('\n💡 FIX REQUIRED:');
      if (requiresScreening || requiresTest) {
        console.log('   Update candidate screeningStatus to "INTERVIEW_ELIGIBLE"');
        console.log('   Candidates with TEST_SELECTED or RESUME_SELECTED need to be updated.');
      } else {
        console.log('   Check if applications exist for this job.');
      }
      console.log('');
    } else {
      console.log(`\n✅ ${simulatedResults.length} candidates would appear in the round.`);
      console.log('   If they still don\'t show, check:');
      console.log('   - Frontend API call is working');
      console.log('   - Round name matches exactly');
      console.log('   - Interview ID is correct\n');
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

    await checkCandidates();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
