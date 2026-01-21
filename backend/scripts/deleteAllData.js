/**
 * Delete All Data from Database
 * 
 * WARNING: This script will DELETE ALL DATA from the database!
 * Use with caution. This is irreversible.
 * 
 * Usage:
 *   node scripts/deleteAllData.js
 * 
 * What it does:
 *   - Deletes all data from all tables in the correct order
 *   - Respects foreign key constraints
 *   - Keeps the table structure intact
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function deleteAllData() {
  console.log('🗑️  Starting to delete all data from database...\n');
  console.log('⚠️  WARNING: This will delete ALL data!\n');

  try {
    // Delete in order to respect foreign key constraints
    // Start with most dependent tables first

    console.log('1. Deleting Round Evaluations...');
    await prisma.roundEvaluation.deleteMany();
    console.log('   ✅ Deleted');

    console.log('2. Deleting Interview Activities...');
    await prisma.interviewActivity.deleteMany();
    console.log('   ✅ Deleted');

    console.log('3. Deleting Interview Evaluations...');
    await prisma.interviewEvaluation.deleteMany();
    console.log('   ✅ Deleted');

    console.log('4. Deleting Interview Rounds...');
    await prisma.interviewRound.deleteMany();
    console.log('   ✅ Deleted');

    console.log('5. Deleting Interviewer Invites...');
    await prisma.interviewerInvite.deleteMany();
    console.log('   ✅ Deleted');

    console.log('6. Deleting Interview Sessions...');
    await prisma.interviewSession.deleteMany();
    console.log('   ✅ Deleted');

    console.log('7. Deleting Interviews...');
    await prisma.interview.deleteMany();
    console.log('   ✅ Deleted');

    console.log('8. Deleting Recruiter Screening Sessions...');
    await prisma.recruiterScreeningSession.deleteMany();
    console.log('   ✅ Deleted');

    console.log('9. Deleting Applications...');
    await prisma.application.deleteMany();
    console.log('   ✅ Deleted');

    console.log('10. Deleting Job Tracking...');
    await prisma.jobTracking.deleteMany();
    console.log('   ✅ Deleted');

    console.log('11. Deleting Jobs...');
    await prisma.job.deleteMany();
    console.log('   ✅ Deleted');

    console.log('12. Deleting Student Resume Files...');
    await prisma.studentResumeFile.deleteMany();
    console.log('   ✅ Deleted');

    console.log('13. Deleting Resumes...');
    await prisma.resume.deleteMany();
    console.log('   ✅ Deleted');

    console.log('14. Deleting Endorsement Tokens...');
    await prisma.endorsementToken.deleteMany();
    console.log('   ✅ Deleted');

    console.log('15. Deleting Endorsements...');
    await prisma.endorsement.deleteMany();
    console.log('   ✅ Deleted');

    console.log('16. Deleting Student Skills...');
    await prisma.skill.deleteMany();
    console.log('   ✅ Deleted');

    console.log('17. Deleting Education Records...');
    await prisma.education.deleteMany();
    console.log('   ✅ Deleted');

    console.log('18. Deleting Experiences...');
    await prisma.experience.deleteMany();
    console.log('   ✅ Deleted');

    console.log('19. Deleting Projects...');
    await prisma.project.deleteMany();
    console.log('   ✅ Deleted');

    console.log('20. Deleting Achievements...');
    await prisma.achievement.deleteMany();
    console.log('   ✅ Deleted');

    console.log('21. Deleting Certifications...');
    await prisma.certification.deleteMany();
    console.log('   ✅ Deleted');

    console.log('22. Deleting Coding Profiles...');
    await prisma.codingProfile.deleteMany();
    console.log('   ✅ Deleted');

    console.log('23. Deleting Students...');
    await prisma.student.deleteMany();
    console.log('   ✅ Deleted');

    console.log('24. Deleting Recruiters...');
    await prisma.recruiter.deleteMany();
    console.log('   ✅ Deleted');

    console.log('25. Deleting Admins...');
    await prisma.admin.deleteMany();
    console.log('   ✅ Deleted');

    console.log('26. Deleting Companies...');
    await prisma.company.deleteMany();
    console.log('   ✅ Deleted');

    console.log('27. Deleting Email Notifications...');
    await prisma.emailNotification.deleteMany();
    console.log('   ✅ Deleted');

    console.log('28. Deleting Notifications...');
    await prisma.notification.deleteMany();
    console.log('   ✅ Deleted');

    console.log('29. Deleting Student Queries...');
    await prisma.studentQuery.deleteMany();
    console.log('   ✅ Deleted');

    console.log('30. Deleting Admin Requests...');
    await prisma.adminRequest.deleteMany();
    console.log('   ✅ Deleted');

    console.log('31. Deleting Google Calendar Tokens...');
    await prisma.googleCalendarToken.deleteMany();
    console.log('   ✅ Deleted');

    console.log('32. Deleting Refresh Tokens...');
    await prisma.refreshToken.deleteMany();
    console.log('   ✅ Deleted');

    console.log('33. Deleting OTPs...');
    await prisma.oTP.deleteMany();
    console.log('   ✅ Deleted');

    console.log('34. Deleting Users...');
    await prisma.user.deleteMany();
    console.log('   ✅ Deleted');

    console.log('\n✅ All data deleted successfully!');
    console.log('📊 Database is now empty but table structure remains intact.\n');

  } catch (error) {
    console.error('\n❌ Error deleting data:', error.message);
    console.error('Error details:', error);
    throw error;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set!');
    console.error('Please set it in your .env file.\n');
    process.exit(1);
  }

  // Confirm before proceeding
  console.log('='.repeat(60));
  console.log('⚠️  DANGER: This will DELETE ALL DATA from the database!');
  console.log('='.repeat(60));
  console.log('\nDatabase:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  console.log('\nThis action is IRREVERSIBLE!\n');

  // In a script, we'll proceed automatically
  // For safety, you can add a confirmation prompt here if needed
  // const readline = require('readline');
  // const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // const answer = await new Promise(resolve => rl.question('Type "DELETE ALL" to confirm: ', resolve));
  // if (answer !== 'DELETE ALL') { console.log('Cancelled.'); process.exit(0); }

  try {
    await deleteAllData();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
