/**
 * Migration Script: Old Neon Database → New Neon Database
 * Migrates all data from old database to new database
 * 
 * Usage: 
 *   1. Ensure OLD_DATABASE_URL and DATABASE_URL are set in .env
 *   2. Run: node scripts/migrateOldToNewDatabase.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '../.env') });

// Old database (previous Neon)
const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL;
// New database (current Neon)
const NEW_DATABASE_URL = process.env.DATABASE_URL;

if (!OLD_DATABASE_URL || !NEW_DATABASE_URL) {
  console.error('❌ Error: Both OLD_DATABASE_URL and DATABASE_URL must be set in .env');
  console.error('   OLD_DATABASE_URL: Your old Neon database URL');
  console.error('   DATABASE_URL: Your new Neon database URL');
  process.exit(1);
}

if (OLD_DATABASE_URL === NEW_DATABASE_URL) {
  console.error('❌ Error: OLD_DATABASE_URL and DATABASE_URL cannot be the same');
  process.exit(1);
}

console.log('🔄 Starting database migration from old database to new database...\n');
console.log('📊 Old Database:', OLD_DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
console.log('📊 New Database:', NEW_DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
console.log('');

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

    // Process in batches to avoid memory issues
    const batchSize = options.batchSize || 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          await newCreateFn(record);
          migrated++;
        } catch (error) {
          if (error.code === 'P2002') {
            // Unique constraint violation - record already exists
            skipped++;
          } else {
            console.error(`   ❌ Error migrating record:`, error.message);
            stats.errors.push({ table: tableName, error: error.message, record: record.id || 'unknown' });
          }
        }
      }
      
      if ((i + batchSize) % 500 === 0) {
        console.log(`   Progress: ${Math.min(i + batchSize, records.length)}/${records.length} processed`);
      }
    }

    stats[tableName.toLowerCase().replace(/\s+/g, '')] = migrated;
    console.log(`   ✅ Migrated: ${migrated}, Skipped: ${skipped}`);
    return migrated;
    
  } catch (error) {
    console.error(`   ❌ Error migrating ${tableName}:`, error.message);
    stats.errors.push({ table: tableName, error: error.message });
    return 0;
  }
}

async function main() {
  try {
    console.log('🔍 Testing connections...');
    
    // Test old database connection
    await oldPrisma.$connect();
    console.log('✅ Connected to old database');
    
    // Test new database connection
    await newPrisma.$connect();
    console.log('✅ Connected to new database\n');

    // Start migration in correct order (respecting foreign key constraints)
    
    // 1. Users (no dependencies)
    await migrateTable('Users', 
      () => oldPrisma.user.findMany(),
      (record) => newPrisma.user.create({ data: record })
    );

    // 2. Companies (no dependencies)
    await migrateTable('Companies',
      () => oldPrisma.company.findMany(),
      (record) => newPrisma.company.create({ data: record })
    );

    // 3. Students (depends on Users)
    await migrateTable('Students',
      () => oldPrisma.student.findMany(),
      (record) => newPrisma.student.create({ data: record })
    );

    // 4. Recruiters (depends on Users, Companies)
    await migrateTable('Recruiters',
      () => oldPrisma.recruiter.findMany(),
      (record) => newPrisma.recruiter.create({ data: record })
    );

    // 5. Jobs (depends on Companies, Recruiters)
    await migrateTable('Jobs',
      () => oldPrisma.job.findMany(),
      (record) => newPrisma.job.create({ data: record })
    );

    // 6. Skills (depends on Students)
    await migrateTable('Skills',
      () => oldPrisma.skill.findMany(),
      (record) => newPrisma.skill.create({ data: record })
    );

    // 7. Education (depends on Students)
    await migrateTable('Education',
      () => oldPrisma.education.findMany(),
      (record) => newPrisma.education.create({ data: record })
    );

    // 8. Projects (depends on Students)
    await migrateTable('Projects',
      () => oldPrisma.project.findMany(),
      (record) => newPrisma.project.create({ data: record })
    );

    // 9. Experiences (depends on Students)
    await migrateTable('Experiences',
      () => oldPrisma.experience.findMany(),
      (record) => newPrisma.experience.create({ data: record })
    );

    // 10. Achievements (depends on Students)
    await migrateTable('Achievements',
      () => oldPrisma.achievement.findMany(),
      (record) => newPrisma.achievement.create({ data: record })
    );

    // 11. Certifications (depends on Students)
    await migrateTable('Certifications',
      () => oldPrisma.certification.findMany(),
      (record) => newPrisma.certification.create({ data: record })
    );

    // 12. Applications (depends on Students, Jobs)
    await migrateTable('Applications',
      () => oldPrisma.application.findMany(),
      (record) => newPrisma.application.create({ data: record })
    );

    // 13. Notifications (depends on Users)
    await migrateTable('Notifications',
      () => oldPrisma.notification.findMany(),
      (record) => newPrisma.notification.create({ data: record })
    );

    // 14. StudentQueries (depends on Students)
    await migrateTable('StudentQueries',
      () => oldPrisma.studentQuery.findMany(),
      (record) => newPrisma.studentQuery.create({ data: record })
    );

    // 15. AdminRequests (depends on Users)
    await migrateTable('AdminRequests',
      () => oldPrisma.adminRequest.findMany(),
      (record) => newPrisma.adminRequest.create({ data: record })
    );

    // 16. RefreshTokens (depends on Users)
    await migrateTable('RefreshTokens',
      () => oldPrisma.refreshToken.findMany(),
      (record) => newPrisma.refreshToken.create({ data: record })
    );

    // 17. Endorsements (depends on Students)
    await migrateTable('Endorsements',
      () => oldPrisma.endorsement.findMany(),
      (record) => newPrisma.endorsement.create({ data: record })
    );

    // 18. EndorsementTokens (depends on Endorsements)
    await migrateTable('EndorsementTokens',
      () => oldPrisma.endorsementToken.findMany(),
      (record) => newPrisma.endorsementToken.create({ data: record })
    );

    // 19. InterviewSessions (depends on Jobs)
    await migrateTable('InterviewSessions',
      () => oldPrisma.interviewSession.findMany(),
      (record) => newPrisma.interviewSession.create({ data: record })
    );

    // 20. InterviewRounds (depends on InterviewSessions)
    await migrateTable('InterviewRounds',
      () => oldPrisma.interviewRound.findMany(),
      (record) => newPrisma.interviewRound.create({ data: record })
    );

    // 21. Interviews (depends on Applications, InterviewRounds)
    await migrateTable('Interviews',
      () => oldPrisma.interview.findMany(),
      (record) => newPrisma.interview.create({ data: record })
    );

    // 22. RoundEvaluations (depends on Interviews, InterviewRounds)
    await migrateTable('RoundEvaluations',
      () => oldPrisma.roundEvaluation.findMany(),
      (record) => newPrisma.roundEvaluation.create({ data: record })
    );

    // 23. InterviewerInvites (depends on InterviewRounds, Users)
    await migrateTable('InterviewerInvites',
      () => oldPrisma.interviewerInvite.findMany(),
      (record) => newPrisma.interviewerInvite.create({ data: record })
    );

    // 24. RecruiterScreeningSessions (depends on Jobs)
    await migrateTable('RecruiterScreeningSessions',
      () => oldPrisma.recruiterScreeningSession.findMany(),
      (record) => newPrisma.recruiterScreeningSession.create({ data: record })
    );

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    
    const totalMigrated = Object.values(stats).reduce((sum, val) => {
      return typeof val === 'number' ? sum + val : sum;
    }, 0);
    
    console.log(`\n✅ Total records migrated: ${totalMigrated}`);
    console.log('\n📋 Breakdown:');
    Object.entries(stats).forEach(([key, value]) => {
      if (typeof value === 'number') {
        console.log(`   ${key}: ${value}`);
      }
    });
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${stats.errors.length}`);
      stats.errors.slice(0, 10).forEach(err => {
        console.log(`   - ${err.table}: ${err.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`   ... and ${stats.errors.length - 10} more errors`);
      }
    } else {
      console.log('\n✅ No errors during migration!');
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await oldPrisma.$disconnect();
    await newPrisma.$disconnect();
    console.log('\n🔌 Disconnected from databases');
  }
}

main();
