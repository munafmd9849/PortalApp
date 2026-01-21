/**
 * Create Applications for All Students on Posted Jobs
 * 
 * Creates application records for all students for all POSTED jobs.
 * Skips if application already exists.
 * 
 * Usage: node backend/scripts/createApplicationsForPostedJobs.js
 */

import prisma from '../src/config/database.js';

async function createApplicationsForPostedJobs() {
  console.log('\n📋 Creating applications for all students on POSTED jobs...\n');
  
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
        companyName: true,
        companyId: true,
        applicationDeadline: true,
      },
    });
    
    console.log(`📌 Found ${postedJobs.length} POSTED jobs:`);
    postedJobs.forEach(job => {
      console.log(`  - ${job.jobTitle} | ${job.companyName} (${job.id})`);
    });
    
    if (postedJobs.length === 0) {
      console.log('\n⚠️  No POSTED jobs found. Exiting.');
      return;
    }
    
    // Get all students
    const students = await prisma.student.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });
    
    console.log(`\n👥 Found ${students.length} students`);
    
    if (students.length === 0) {
      console.log('\n⚠️  No students found. Exiting.');
      return;
    }
    
    // Create applications
    let totalCreated = 0;
    let totalSkipped = 0;
    const errors = [];
    
    console.log('\n🔄 Creating applications...\n');
    
    for (const job of postedJobs) {
      console.log(`📝 Processing: ${job.jobTitle} | ${job.companyName}`);
      
      // Note: Creating applications for all POSTED jobs regardless of deadline
      const now = new Date();
      const deadline = new Date(job.applicationDeadline);
      const deadlinePassed = now > deadline;
      
      if (deadlinePassed) {
        console.log(`  ⚠️  Note: Application deadline has passed (${deadline.toLocaleString()}), but creating applications anyway.`);
      }
      
      let jobCreated = 0;
      let jobSkipped = 0;
      
      for (const student of students) {
        try {
          // Check if application already exists
          const existingApp = await prisma.application.findUnique({
            where: {
              studentId_jobId: {
                studentId: student.id,
                jobId: job.id,
              },
            },
          });
          
          if (existingApp) {
            jobSkipped++;
            continue;
          }
          
          // Create application
          await prisma.application.create({
            data: {
              studentId: student.id,
              jobId: job.id,
              companyId: job.companyId || null,
              status: 'APPLIED',
              screeningStatus: 'APPLIED',
              appliedDate: new Date(),
            },
          });
          
          jobCreated++;
          totalCreated++;
        } catch (error) {
          if (error.code === 'P2002') {
            // Unique constraint violation - application already exists
            jobSkipped++;
            totalSkipped++;
          } else {
            errors.push({
              student: student.email,
              job: job.jobTitle,
              error: error.message,
            });
            console.error(`  ❌ Error creating application for ${student.email}: ${error.message}`);
          }
        }
      }
      
      console.log(`  ✅ Created: ${jobCreated}, Skipped (existing): ${jobSkipped}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total applications created: ${totalCreated}`);
    console.log(`Total applications skipped (already exist): ${totalSkipped}`);
    console.log(`Total errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(err => {
        console.log(`  - ${err.student} → ${err.job}: ${err.error}`);
      });
    }
    
    // Update student stats
    console.log('\n🔄 Updating student application statistics...');
    
    for (const student of students) {
      const applicationCount = await prisma.application.count({
        where: {
          studentId: student.id,
          status: 'APPLIED',
        },
      });
      
      await prisma.student.update({
        where: { id: student.id },
        data: {
          statsApplied: applicationCount,
        },
      });
    }
    
    console.log('✅ Student statistics updated');
    
    // Verify applications
    console.log('\n🔍 Verifying applications...');
    
    for (const job of postedJobs) {
      const appCount = await prisma.application.count({
        where: { jobId: job.id },
      });
      
      console.log(`  - ${job.jobTitle}: ${appCount} applications`);
    }
    
    console.log('\n✅ Script completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Application Creation Script');
    console.log('='.repeat(60));
    
    await createApplicationsForPostedJobs();
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
