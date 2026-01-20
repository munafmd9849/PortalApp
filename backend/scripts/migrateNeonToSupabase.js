/**
 * Migration Script: Neon PostgreSQL → Supabase PostgreSQL
 * Migrates all data from Neon database to Supabase database
 * 
 * Usage: 
 *   1. Set OLD_DATABASE_URL in .env (Neon)
 *   2. Set DATABASE_URL in .env (Supabase - already done)
 *   3. Run: node scripts/migrateNeonToSupabase.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '../.env') });

// Old database (Neon)
const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL || process.env.DATABASE_URL;
// New database (Supabase)
const NEW_DATABASE_URL = process.env.DATABASE_URL;

if (!OLD_DATABASE_URL || !NEW_DATABASE_URL) {
  console.error('❌ Error: Both OLD_DATABASE_URL and DATABASE_URL must be set in .env');
  console.error('   OLD_DATABASE_URL: Your Neon database URL');
  console.error('   DATABASE_URL: Your Supabase database URL (already set)');
  process.exit(1);
}

if (OLD_DATABASE_URL === NEW_DATABASE_URL) {
  console.error('❌ Error: OLD_DATABASE_URL and DATABASE_URL cannot be the same');
  process.exit(1);
}

console.log('🔄 Starting database migration from Neon to Supabase...\n');

// Create Prisma clients for both databases
const oldPrisma = new PrismaClient({
  datasources: {
    db: {
      url: OLD_DATABASE_URL,
    },
  },
});

const newPrisma = new PrismaClient({
  datasources: {
    db: {
      url: NEW_DATABASE_URL,
    },
  },
});

// Migration statistics
const stats = {
  users: 0,
  students: 0,
  companies: 0,
  recruiters: 0,
  jobs: 0,
  applications: 0,
  skills: 0,
  education: 0,
  projects: 0,
  experiences: 0,
  achievements: 0,
  certifications: 0,
  notifications: 0,
  queries: 0,
  adminRequests: 0,
  refreshTokens: 0,
  endorsements: 0,
  endorsementTokens: 0,
  interviews: 0,
  interviewSessions: 0,
  interviewRounds: 0,
  roundEvaluations: 0,
  interviewerInvites: 0,
  recruiterScreeningSessions: 0,
  errors: [],
};

async function migrateTable(tableName, oldFetchFn, newCreateFn, options = {}) {
  try {
    console.log(`\n📦 Migrating ${tableName}...`);
    
    // Fetch from old database
    const records = await oldFetchFn();
    console.log(`   Found ${records.length} records in source database`);
    
    if (records.length === 0) {
      console.log(`   ✅ Skipped (no data)`);
      return 0;
    }

    let migrated = 0;
    let skipped = 0;
    const batchSize = options.batchSize || 100;

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          await newCreateFn(record);
          migrated++;
          if (migrated % 50 === 0) {
            process.stdout.write(`   Progress: ${migrated}/${records.length}\r`);
          }
        } catch (error) {
          // Skip if record already exists (unique constraint)
          if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
            skipped++;
          } else {
            stats.errors.push({ table: tableName, error: error.message, record: record.id || 'unknown' });
            console.error(`\n   ⚠️  Error migrating ${tableName} record:`, error.message);
          }
        }
      }
    }

    console.log(`   ✅ Migrated ${migrated} records${skipped > 0 ? `, skipped ${skipped} duplicates` : ''}`);
    return migrated;
  } catch (error) {
    if (error.message && error.message.includes('quota')) {
      console.error(`   ❌ Cannot migrate ${tableName}: Database quota exceeded`);
      stats.errors.push({ table: tableName, error: 'Database quota exceeded' });
      return 0;
    }
    console.error(`   ❌ Error migrating ${tableName}:`, error.message);
    stats.errors.push({ table: tableName, error: error.message });
    return 0;
  }
}

async function main() {
  console.log('🔍 Testing database connections...\n');

  // Test old database connection
  try {
    await oldPrisma.$connect();
    await oldPrisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected to old database (Neon)');
  } catch (error) {
    if (error.message && error.message.includes('quota')) {
      console.error('❌ Cannot connect to old database: Quota exceeded');
      console.error('   💡 Options:');
      console.error('      1. Wait for quota to reset');
      console.error('      2. Export data from Neon dashboard');
      console.error('      3. Use pg_dump to export data');
      process.exit(1);
    }
    console.error('❌ Failed to connect to old database:', error.message);
    process.exit(1);
  }

  // Test new database connection
  try {
    await newPrisma.$connect();
    await newPrisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected to new database (Supabase)\n');
  } catch (error) {
    console.error('❌ Failed to connect to new database:', error.message);
    await oldPrisma.$disconnect();
    process.exit(1);
  }

  console.log('🚀 Starting data migration...\n');
  console.log('='.repeat(60));

  try {
    // 1. Users (must be first due to foreign key constraints)
    stats.users = await migrateTable(
      'Users',
      () => oldPrisma.user.findMany(),
      (user) => newPrisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      })
    );

    // 2. RefreshTokens (depends on Users)
    stats.refreshTokens = await migrateTable(
      'RefreshTokens',
      () => oldPrisma.refreshToken.findMany(),
      (token) => newPrisma.refreshToken.upsert({
        where: { id: token.id },
        update: token,
        create: token,
      })
    );

    // 3. Companies (independent)
    stats.companies = await migrateTable(
      'Companies',
      () => oldPrisma.company.findMany(),
      (company) => newPrisma.company.upsert({
        where: { id: company.id },
        update: company,
        create: company,
      })
    );

    // 4. Students (depends on Users)
    stats.students = await migrateTable(
      'Students',
      () => oldPrisma.student.findMany(),
      (student) => newPrisma.student.upsert({
        where: { id: student.id },
        update: student,
        create: student,
      })
    );

    // 5. Recruiters (depends on Users, Companies)
    stats.recruiters = await migrateTable(
      'Recruiters',
      () => oldPrisma.recruiter.findMany(),
      (recruiter) => newPrisma.recruiter.upsert({
        where: { id: recruiter.id },
        update: recruiter,
        create: recruiter,
      })
    );

    // 6. Admin (depends on Users)
    stats.admin = await migrateTable(
      'Admin',
      () => oldPrisma.admin.findMany(),
      (admin) => newPrisma.admin.upsert({
        where: { id: admin.id },
        update: admin,
        create: admin,
      })
    );

    // 7. Skills (depends on Students)
    stats.skills = await migrateTable(
      'Skills',
      () => oldPrisma.skill.findMany(),
      (skill) => newPrisma.skill.upsert({
        where: { id: skill.id },
        update: skill,
        create: skill,
      }),
      { batchSize: 500 }
    );

    // 8. Education (depends on Students)
    stats.education = await migrateTable(
      'Education',
      () => oldPrisma.education.findMany(),
      (edu) => newPrisma.education.upsert({
        where: { id: edu.id },
        update: edu,
        create: edu,
      })
    );

    // 9. Projects (depends on Students)
    stats.projects = await migrateTable(
      'Projects',
      () => oldPrisma.project.findMany(),
      (project) => newPrisma.project.upsert({
        where: { id: project.id },
        update: project,
        create: project,
      })
    );

    // 10. Experiences (depends on Students)
    stats.experiences = await migrateTable(
      'Experiences',
      () => oldPrisma.experience.findMany(),
      (exp) => newPrisma.experience.upsert({
        where: { id: exp.id },
        update: exp,
        create: exp,
      })
    );

    // 11. Achievements (depends on Students)
    stats.achievements = await migrateTable(
      'Achievements',
      () => oldPrisma.achievement.findMany(),
      (ach) => newPrisma.achievement.upsert({
        where: { id: ach.id },
        update: ach,
        create: ach,
      })
    );

    // 12. Certifications (depends on Students)
    stats.certifications = await migrateTable(
      'Certifications',
      () => oldPrisma.certification.findMany(),
      (cert) => newPrisma.certification.upsert({
        where: { id: cert.id },
        update: cert,
        create: cert,
      })
    );

    // 13. CodingProfiles (depends on Students)
    stats.codingProfiles = await migrateTable(
      'CodingProfiles',
      () => oldPrisma.codingProfile.findMany(),
      (profile) => newPrisma.codingProfile.upsert({
        where: { id: profile.id },
        update: profile,
        create: profile,
      })
    );

    // 14. Jobs (depends on Companies, Recruiters)
    stats.jobs = await migrateTable(
      'Jobs',
      () => oldPrisma.job.findMany(),
      (job) => newPrisma.job.upsert({
        where: { id: job.id },
        update: job,
        create: job,
      })
    );

    // 15. Applications (depends on Students, Jobs)
    stats.applications = await migrateTable(
      'Applications',
      () => oldPrisma.application.findMany(),
      (app) => newPrisma.application.upsert({
        where: { id: app.id },
        update: app,
        create: app,
      }),
      { batchSize: 500 }
    );

    // 16. JobTracking (depends on Students, Jobs)
    stats.jobTracking = await migrateTable(
      'JobTracking',
      () => oldPrisma.jobTracking.findMany(),
      (tracking) => newPrisma.jobTracking.upsert({
        where: { id: tracking.id },
        update: tracking,
        create: tracking,
      }),
      { batchSize: 500 }
    );

    // 17. Notifications (depends on Users)
    stats.notifications = await migrateTable(
      'Notifications',
      () => oldPrisma.notification.findMany(),
      (notif) => newPrisma.notification.upsert({
        where: { id: notif.id },
        update: notif,
        create: notif,
      }),
      { batchSize: 500 }
    );

    // 18. StudentQueries (depends on Users)
    stats.queries = await migrateTable(
      'StudentQueries',
      () => oldPrisma.studentQuery.findMany(),
      (query) => newPrisma.studentQuery.upsert({
        where: { id: query.id },
        update: query,
        create: query,
      })
    );

    // 19. AdminRequests (depends on Users)
    stats.adminRequests = await migrateTable(
      'AdminRequests',
      () => oldPrisma.adminRequest.findMany(),
      (req) => newPrisma.adminRequest.upsert({
        where: { id: req.id },
        update: req,
        create: req,
      })
    );

    // 20. Endorsements (depends on Students)
    stats.endorsements = await migrateTable(
      'Endorsements',
      () => oldPrisma.endorsement.findMany(),
      (endorsement) => newPrisma.endorsement.upsert({
        where: { id: endorsement.id },
        update: endorsement,
        create: endorsement,
      })
    );

    // 21. EndorsementTokens (depends on Students)
    stats.endorsementTokens = await migrateTable(
      'EndorsementTokens',
      () => oldPrisma.endorsementToken.findMany(),
      (token) => newPrisma.endorsementToken.upsert({
        where: { id: token.id },
        update: token,
        create: token,
      })
    );

    // 22. StudentResumeFiles (depends on Students)
    stats.resumeFiles = await migrateTable(
      'StudentResumeFiles',
      () => oldPrisma.studentResumeFile.findMany(),
      (file) => newPrisma.studentResumeFile.upsert({
        where: { id: file.id },
        update: file,
        create: file,
      })
    );

    // 23. InterviewSessions (depends on Jobs)
    stats.interviewSessions = await migrateTable(
      'InterviewSessions',
      () => oldPrisma.interviewSession.findMany(),
      (session) => newPrisma.interviewSession.upsert({
        where: { id: session.id },
        update: session,
        create: session,
      })
    );

    // 24. InterviewRounds (depends on InterviewSessions)
    stats.interviewRounds = await migrateTable(
      'InterviewRounds',
      () => oldPrisma.interviewRound.findMany(),
      (round) => newPrisma.interviewRound.upsert({
        where: { id: round.id },
        update: round,
        create: round,
      })
    );

    // 25. InterviewerInvites (depends on InterviewSessions)
    stats.interviewerInvites = await migrateTable(
      'InterviewerInvites',
      () => oldPrisma.interviewerInvite.findMany(),
      (invite) => newPrisma.interviewerInvite.upsert({
        where: { id: invite.id },
        update: invite,
        create: invite,
      })
    );

    // 26. RoundEvaluations (depends on InterviewRounds, Applications)
    stats.roundEvaluations = await migrateTable(
      'RoundEvaluations',
      () => oldPrisma.roundEvaluation.findMany(),
      (evaluation) => newPrisma.roundEvaluation.upsert({
        where: { id: evaluation.id },
        update: evaluation,
        create: evaluation,
      })
    );

    // 27. RecruiterScreeningSessions (depends on Jobs)
    stats.recruiterScreeningSessions = await migrateTable(
      'RecruiterScreeningSessions',
      () => oldPrisma.recruiterScreeningSession.findMany(),
      (session) => newPrisma.recruiterScreeningSession.upsert({
        where: { id: session.id },
        update: session,
        create: session,
      })
    );

    // 28. GoogleCalendarTokens (depends on Users)
    stats.googleCalendarTokens = await migrateTable(
      'GoogleCalendarTokens',
      () => oldPrisma.googleCalendarToken.findMany(),
      (token) => newPrisma.googleCalendarToken.upsert({
        where: { id: token.id },
        update: token,
        create: token,
      })
    );

    // 29. OTPs (independent, but may want to skip expired ones)
    stats.otps = await migrateTable(
      'OTPs',
      () => oldPrisma.oTP.findMany({
        where: {
          expiresAt: { gte: new Date() }, // Only migrate non-expired OTPs
        },
      }),
      (otp) => newPrisma.oTP.upsert({
        where: { id: otp.id },
        update: otp,
        create: otp,
      })
    );

    // 30. Interviews (legacy, depends on Jobs)
    stats.interviews = await migrateTable(
      'Interviews (Legacy)',
      () => oldPrisma.interview.findMany(),
      (interview) => newPrisma.interview.upsert({
        where: { id: interview.id },
        update: interview,
        create: interview,
      })
    );

    // 31. InterviewEvaluations (legacy, depends on Interviews, Students)
    stats.interviewEvaluations = await migrateTable(
      'InterviewEvaluations (Legacy)',
      () => oldPrisma.interviewEvaluation.findMany(),
      (evaluation) => newPrisma.interviewEvaluation.upsert({
        where: { id: evaluation.id },
        update: evaluation,
        create: evaluation,
      })
    );

    // 32. InterviewActivities (legacy, depends on Interviews)
    stats.interviewActivities = await migrateTable(
      'InterviewActivities (Legacy)',
      () => oldPrisma.interviewActivity.findMany(),
      (activity) => newPrisma.interviewActivity.upsert({
        where: { id: activity.id },
        update: activity,
        create: activity,
      })
    );

    // 33. EmailNotifications (optional)
    stats.emailNotifications = await migrateTable(
      'EmailNotifications',
      () => oldPrisma.emailNotification.findMany(),
      (notif) => newPrisma.emailNotification.upsert({
        where: { id: notif.id },
        update: notif,
        create: notif,
      })
    );

    // 34. Resumes (legacy)
    stats.resumes = await migrateTable(
      'Resumes (Legacy)',
      () => oldPrisma.resume.findMany(),
      (resume) => newPrisma.resume.upsert({
        where: { id: resume.id },
        update: resume,
        create: resume,
      })
    );

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await oldPrisma.$disconnect();
    await newPrisma.$disconnect();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ Migration Summary:');
  console.log('='.repeat(60));
  console.log(`   👥 Users: ${stats.users}`);
  console.log(`   🎓 Students: ${stats.students}`);
  console.log(`   🏢 Companies: ${stats.companies}`);
  console.log(`   💼 Recruiters: ${stats.recruiters}`);
  console.log(`   📋 Jobs: ${stats.jobs}`);
  console.log(`   📝 Applications: ${stats.applications}`);
  console.log(`   💡 Skills: ${stats.skills}`);
  console.log(`   🎓 Education: ${stats.education}`);
  console.log(`   💼 Projects: ${stats.projects}`);
  console.log(`   💼 Experiences: ${stats.experiences}`);
  console.log(`   🏆 Achievements: ${stats.achievements}`);
  console.log(`   📜 Certifications: ${stats.certifications}`);
  console.log(`   🔔 Notifications: ${stats.notifications}`);
  console.log(`   📞 Queries: ${stats.queries}`);
  console.log(`   🔐 Refresh Tokens: ${stats.refreshTokens}`);
  console.log(`   ✅ Endorsements: ${stats.endorsements || 0}`);
  console.log(`   📅 Interview Sessions: ${stats.interviewSessions || 0}`);
  console.log(`   🔄 Interview Rounds: ${stats.interviewRounds || 0}`);
  console.log(`   📊 Round Evaluations: ${stats.roundEvaluations || 0}`);
  console.log(`   📧 Recruiter Screening Sessions: ${stats.recruiterScreeningSessions || 0}`);

  const totalMigrated = Object.values(stats).reduce((sum, val) => {
    return sum + (typeof val === 'number' ? val : 0);
  }, 0);

  console.log('='.repeat(60));
  console.log(`   📊 Total Records Migrated: ${totalMigrated}`);
  
  if (stats.errors.length > 0) {
    console.log(`   ⚠️  Errors: ${stats.errors.length}`);
    console.log('\n❌ Migration Errors:');
    stats.errors.forEach(err => {
      console.log(`   - ${err.table}: ${err.error}`);
    });
  } else {
    console.log(`   ✅ No errors`);
  }

  console.log('\n✅ Migration completed!');
  console.log('   Your Supabase database is now ready to use.');
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  });
