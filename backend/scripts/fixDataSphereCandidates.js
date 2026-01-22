/**
 * Fix DataSphere Analytics Candidates
 * 
 * Converts SCREENING_SELECTED to INTERVIEW_ELIGIBLE for jobs that only require screening.
 * 
 * Usage:
 *   node scripts/fixDataSphereCandidates.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const COMPANY_NAME = 'DataSphere Analytics';
const JOB_TITLE = 'Backend Engineer';

async function fixCandidates() {
  console.log('🔧 Fixing DataSphere Analytics Candidates...\n');
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
          where: {
            screeningStatus: 'SCREENING_SELECTED',
          },
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

    if (!job) {
      console.error(`❌ Job not found: ${JOB_TITLE} at ${COMPANY_NAME}`);
      return;
    }

    console.log(`\n✅ Found job: ${job.jobTitle}`);
    console.log(`   Requires Screening: ${job.requiresScreening}`);
    console.log(`   Requires Test: ${job.requiresTest}`);
    console.log(`   SCREENING_SELECTED candidates: ${job.applications.length}\n`);

    if (job.applications.length === 0) {
      console.log('✅ No SCREENING_SELECTED candidates to fix.\n');
      return;
    }

    if (job.requiresScreening && !job.requiresTest) {
      console.log(`🔄 Converting ${job.applications.length} SCREENING_SELECTED → INTERVIEW_ELIGIBLE...\n`);

      const result = await prisma.application.updateMany({
        where: {
          jobId: job.id,
          screeningStatus: 'SCREENING_SELECTED',
        },
        data: {
          screeningStatus: 'INTERVIEW_ELIGIBLE',
          screeningCompletedAt: new Date(),
        },
      });

      console.log(`✅ Updated ${result.count} applications to INTERVIEW_ELIGIBLE\n`);

      // Show updated candidates
      const updatedApplications = await prisma.application.findMany({
        where: {
          jobId: job.id,
          screeningStatus: 'INTERVIEW_ELIGIBLE',
        },
        include: {
          student: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      });

      console.log('✅ Updated Candidates:');
      updatedApplications.forEach((app, idx) => {
        console.log(`   ${idx + 1}. ${app.student.fullName} (${app.student.email})`);
      });
      console.log(`\n✅ ${updatedApplications.length} candidate(s) now qualified for interview!\n`);
    } else {
      console.log('⚠️  Job requires test, so SCREENING_SELECTED candidates need to pass test first.\n');
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

    await fixCandidates();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
