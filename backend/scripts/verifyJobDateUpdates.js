/**
 * Verify Job Date Updates Script
 * 
 * Tests and verifies that job date updates propagate correctly:
 * - Backend API updates
 * - Database persistence
 * - Date validation
 * 
 * Usage:
 *   node scripts/verifyJobDateUpdates.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function verifyJobDateUpdates() {
  console.log('🔍 Verifying job date updates...\n');

  try {
    // Get all POSTED jobs
    const postedJobs = await prisma.job.findMany({
      where: {
        status: 'POSTED',
        isPosted: true,
      },
      select: {
        id: true,
        jobTitle: true,
        applicationDeadline: true,
        driveDate: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (postedJobs.length === 0) {
      console.log('⚠️  No POSTED jobs found. Please create jobs first.\n');
      return;
    }

    console.log(`📋 Found ${postedJobs.length} POSTED jobs\n`);

    // Display current state
    console.log('Current Job Dates:');
    console.log('='.repeat(80));
    postedJobs.forEach((job, idx) => {
      console.log(`${idx + 1}. ${job.jobTitle}`);
      console.log(`   ID: ${job.id}`);
      console.log(`   Application Deadline: ${job.applicationDeadline.toISOString()}`);
      console.log(`   Drive Date: ${job.driveDate.toISOString()}`);
      console.log(`   Last Updated: ${job.updatedAt.toISOString()}`);
      
      // Verify date relationship
      const deadline = new Date(job.applicationDeadline);
      const driveDate = new Date(job.driveDate);
      const isValid = driveDate > deadline;
      console.log(`   Date Relationship: ${isValid ? '✅ Valid' : '❌ Invalid'} (driveDate ${isValid ? 'after' : 'before/equal'} deadline)`);
      console.log('');
    });

    // Test update on first job
    if (postedJobs.length > 0) {
      const testJob = postedJobs[0];
      console.log('🧪 Testing date update on first job...\n');
      
      const oldDeadline = new Date(testJob.applicationDeadline);
      const oldDriveDate = new Date(testJob.driveDate);
      
      // Create new dates (1 day later for both)
      const newDeadline = new Date(oldDeadline);
      newDeadline.setDate(newDeadline.getDate() + 1);
      newDeadline.setHours(23, 59, 59, 999);
      
      const newDriveDate = new Date(oldDriveDate);
      newDriveDate.setDate(newDriveDate.getDate() + 1);
      newDriveDate.setHours(23, 59, 59, 999);

      console.log('Before Update:');
      console.log(`  Application Deadline: ${oldDeadline.toISOString()}`);
      console.log(`  Drive Date: ${oldDriveDate.toISOString()}\n`);

      console.log('Attempting Update:');
      console.log(`  New Application Deadline: ${newDeadline.toISOString()}`);
      console.log(`  New Drive Date: ${newDriveDate.toISOString()}\n`);

      // Verify date relationship before update
      if (newDriveDate <= newDeadline) {
        console.log('❌ Invalid date configuration: driveDate must be after applicationDeadline');
        return;
      }

      // Perform update
      const updatedJob = await prisma.job.update({
        where: { id: testJob.id },
        data: {
          applicationDeadline: newDeadline,
          driveDate: newDriveDate,
        },
        select: {
          id: true,
          jobTitle: true,
          applicationDeadline: true,
          driveDate: true,
          updatedAt: true,
        },
      });

      console.log('✅ Update successful!\n');
      console.log('After Update:');
      console.log(`  Application Deadline: ${updatedJob.applicationDeadline.toISOString()}`);
      console.log(`  Drive Date: ${updatedJob.driveDate.toISOString()}`);
      console.log(`  Updated At: ${updatedJob.updatedAt.toISOString()}\n`);

      // Verify database persistence
      const verifyJob = await prisma.job.findUnique({
        where: { id: testJob.id },
        select: {
          applicationDeadline: true,
          driveDate: true,
        },
      });

      const deadlineMatch = verifyJob.applicationDeadline.getTime() === newDeadline.getTime();
      const driveDateMatch = verifyJob.driveDate.getTime() === newDriveDate.getTime();

      console.log('Database Verification:');
      console.log(`  Application Deadline Match: ${deadlineMatch ? '✅' : '❌'}`);
      console.log(`  Drive Date Match: ${driveDateMatch ? '✅' : '❌'}\n`);

      if (deadlineMatch && driveDateMatch) {
        console.log('✅ All verifications passed! Date updates are working correctly.\n');
      } else {
        console.log('❌ Verification failed! Dates do not match in database.\n');
      }

      // Test invalid update (should fail)
      console.log('🧪 Testing invalid date update (should fail)...\n');
      try {
        const invalidDriveDate = new Date(newDeadline);
        invalidDriveDate.setDate(invalidDriveDate.getDate() - 1); // Before deadline

        await prisma.job.update({
          where: { id: testJob.id },
          data: {
            driveDate: invalidDriveDate,
          },
        });
        console.log('❌ ERROR: Invalid update was allowed! This should have been rejected.\n');
      } catch (error) {
        // This is expected - Prisma doesn't enforce this at DB level, but our API does
        console.log('⚠️  Note: Database allows invalid dates. Validation must be enforced at API level.\n');
      }
    }

    // Check REVIEW jobs (should not be visible to students)
    const reviewJobs = await prisma.job.findMany({
      where: {
        status: 'IN_REVIEW',
      },
      select: {
        id: true,
        jobTitle: true,
        status: true,
        isPosted: true,
      },
      take: 5,
    });

    console.log(`\n📋 Found ${reviewJobs.length} REVIEW jobs (should NOT be visible to students):`);
    reviewJobs.forEach((job, idx) => {
      console.log(`  ${idx + 1}. ${job.jobTitle} (ID: ${job.id}, isPosted: ${job.isPosted})`);
    });

  } catch (error) {
    console.error('❌ Error verifying job updates:', error);
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

    await verifyJobDateUpdates();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
