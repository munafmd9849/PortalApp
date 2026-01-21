/**
 * Create Test Applications Script
 * 
 * Creates applications for all students to a specific job.
 * 
 * Usage:
 *   node scripts/createTestApplications.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const COMPANY_NAME = 'CloudVantage Systems';
const JOB_TITLE = 'DevOps Engineer';

async function createTestApplications() {
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
          select: {
            studentId: true,
          },
        },
      },
    });

    if (!job) {
      console.error(`❌ Job not found: ${JOB_TITLE} at ${COMPANY_NAME}`);
      return;
    }

    console.log(`✅ Found job: ${job.jobTitle}`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Company: ${job.company?.name || job.companyName}\n`);

    // Get all students
    const students = await prisma.student.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        userId: true,
      },
    });

    if (students.length === 0) {
      console.log('⚠️  No students found in database.\n');
      return;
    }

    console.log(`📋 Found ${students.length} students\n`);

    // Get existing application student IDs
    const existingStudentIds = new Set(job.applications.map(app => app.studentId));

    // Create applications for students who haven't applied yet
    const results = {
      created: [],
      skipped: [],
      errors: [],
    };

    for (const student of students) {
      if (existingStudentIds.has(student.id)) {
        console.log(`  ⏭️  Skipped: ${student.fullName} (already applied)`);
        results.skipped.push(student);
        continue;
      }

      try {
        const application = await prisma.application.create({
          data: {
            studentId: student.id,
            jobId: job.id,
            companyId: job.companyId || null,
            status: 'APPLIED',
            screeningStatus: 'APPLIED',
            appliedDate: new Date(),
          },
        });

        console.log(`  ✅ Created application for: ${student.fullName} (${student.email})`);
        results.created.push({ student, applicationId: application.id });
      } catch (error) {
        console.error(`  ❌ Error creating application for ${student.fullName}:`, error.message);
        results.errors.push({ student, error: error.message });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary:');
    console.log(`✅ Created: ${results.created.length} applications`);
    console.log(`⏭️  Skipped: ${results.skipped.length} (already applied)`);
    console.log(`❌ Errors: ${results.errors.length}`);
    console.log('='.repeat(80) + '\n');

    if (results.created.length > 0) {
      console.log('Created applications:');
      results.created.forEach(({ student }) => {
        console.log(`  - ${student.fullName} (${student.email})`);
      });
      console.log('');
    }

    return results;
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

    await createTestApplications();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
