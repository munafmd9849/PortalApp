/**
 * Check Qualified Candidates for a Job
 * 
 * Checks how many candidates qualified for interview for a specific job.
 * 
 * Usage:
 *   node scripts/checkJobQualifiedCandidates.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const COMPANY_NAME = 'DataSphere Analytics';
const JOB_TITLE = 'Backend Engineer';

async function checkQualifiedCandidates() {
  console.log('🔍 Checking Qualified Candidates for Interview...\n');
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
        company: true,
        applications: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                email: true,
                enrollmentId: true,
                batch: true,
                center: true,
                school: true,
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
      console.log('\n💡 Available jobs:');
      const allJobs = await prisma.job.findMany({
        take: 10,
        include: { company: true },
        orderBy: { createdAt: 'desc' },
      });
      allJobs.forEach(j => {
        console.log(`   - ${j.jobTitle} at ${j.company?.name || j.companyName || 'Unknown'}`);
      });
      return;
    }

    console.log(`\n1️⃣ JOB INFORMATION:`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Title: ${job.jobTitle}`);
    console.log(`   Company: ${job.company?.name || job.companyName}`);
    console.log(`   Drive Date: ${job.driveDate ? new Date(job.driveDate).toLocaleDateString() : 'Not set'}`);
    console.log(`   Application Deadline: ${job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'Not set'}`);
    console.log(`   Requires Screening: ${job.requiresScreening}`);
    console.log(`   Requires Test: ${job.requiresTest}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Is Posted: ${job.isPosted}\n`);

    console.log(`2️⃣ APPLICATIONS SUMMARY:`);
    console.log(`   Total Applications: ${job.applications.length}\n`);

    // Group by screening status
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
        enrollmentId: app.student.enrollmentId || 'N/A',
        batch: app.student.batch,
        center: app.student.center,
        school: app.student.school,
        status: status,
        appliedDate: app.appliedDate,
        screeningCompletedAt: app.screeningCompletedAt,
      };

      if (statusGroups[status]) {
        statusGroups[status].push(studentInfo);
      } else {
        statusGroups.OTHER.push({ ...studentInfo, status });
      }
    });

    console.log('   Screening Status Breakdown:');
    Object.entries(statusGroups).forEach(([status, students]) => {
      if (students.length > 0) {
        console.log(`     ${status}: ${students.length}`);
      }
    });
    console.log('');

    // Show qualified candidates
    const qualifiedCandidates = [
      ...statusGroups.INTERVIEW_ELIGIBLE,
      ...statusGroups.TEST_SELECTED, // Also count TEST_SELECTED as they can proceed
    ];

    console.log(`3️⃣ QUALIFIED FOR INTERVIEW:`);
    console.log(`   Total Qualified: ${qualifiedCandidates.length}\n`);

    if (qualifiedCandidates.length === 0) {
      console.log('   ⚠️  No candidates qualified for interview yet.\n');
      console.log('   Current Status Breakdown:');
      if (statusGroups.APPLIED.length > 0) {
        console.log(`     - ${statusGroups.APPLIED.length} still in APPLIED status`);
      }
      if (statusGroups.SCREENING_SELECTED.length > 0) {
        console.log(`     - ${statusGroups.SCREENING_SELECTED.length} passed screening, waiting for test`);
      }
      if (statusGroups.SCREENING_REJECTED.length > 0) {
        console.log(`     - ${statusGroups.SCREENING_REJECTED.length} rejected in screening`);
      }
      if (statusGroups.TEST_REJECTED.length > 0) {
        console.log(`     - ${statusGroups.TEST_REJECTED.length} rejected in test`);
      }
      console.log('');
    } else {
      console.log('   ✅ Qualified Candidates:');
      qualifiedCandidates.forEach((candidate, idx) => {
        console.log(`     ${idx + 1}. ${candidate.name}`);
        console.log(`        Email: ${candidate.email}`);
        console.log(`        Enrollment ID: ${candidate.enrollmentId}`);
        console.log(`        Batch: ${candidate.batch} | Center: ${candidate.center} | School: ${candidate.school}`);
        console.log(`        Status: ${candidate.status}`);
        if (candidate.screeningCompletedAt) {
          console.log(`        Completed: ${new Date(candidate.screeningCompletedAt).toLocaleString()}`);
        }
        console.log('');
      });
    }

    // Check interview session
    const interviewSession = await prisma.interviewSession.findFirst({
      where: { jobId: job.id },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
        },
      },
    });

    console.log(`4️⃣ INTERVIEW SESSION:`);
    if (interviewSession) {
      console.log(`   Session ID: ${interviewSession.id}`);
      console.log(`   Status: ${interviewSession.status}`);
      console.log(`   Rounds: ${interviewSession.rounds.length}`);
      interviewSession.rounds.forEach((round, idx) => {
        console.log(`     ${idx + 1}. ${round.name} (Round ${round.roundNumber}) - ${round.status}`);
      });
    } else {
      console.log('   ⚠️  No interview session created yet.');
    }
    console.log('');

    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(80));
    console.log(`\n   Job: ${job.jobTitle} at ${job.company?.name || job.companyName}`);
    console.log(`   Total Applications: ${job.applications.length}`);
    console.log(`   ✅ Qualified for Interview: ${qualifiedCandidates.length}`);
    console.log(`   ❌ Rejected: ${statusGroups.SCREENING_REJECTED.length + statusGroups.TEST_REJECTED.length}`);
    console.log(`   ⏳ Pending: ${statusGroups.APPLIED.length + statusGroups.SCREENING_SELECTED.length}`);
    
    if (qualifiedCandidates.length > 0) {
      console.log(`\n   ✅ ${qualifiedCandidates.length} candidate(s) can proceed to interview rounds!`);
    } else {
      console.log(`\n   ⚠️  No candidates qualified yet. Complete screening/test first.`);
    }
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

    await checkQualifiedCandidates();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
