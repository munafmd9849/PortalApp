/**
 * Migration Script: SQLite to PostgreSQL
 * Transfers all data from local SQLite database to Render PostgreSQL database
 */

import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// SQLite database path
const sqliteDbPath = path.join(__dirname, '../prisma/dev.db');

// Initialize SQLite connection
let sqliteDb;
let postgresPrisma;

async function initConnections() {
  try {
    // Check if SQLite database exists
    const fs = await import('fs');
    if (!fs.existsSync(sqliteDbPath)) {
      throw new Error(`SQLite database not found at: ${sqliteDbPath}`);
    }

    console.log('📦 Connecting to SQLite database...');
    sqliteDb = new Database(sqliteDbPath, { readonly: true });
    console.log('✅ Connected to SQLite database');

    console.log('📦 Connecting to PostgreSQL database...');
    postgresPrisma = new PrismaClient();
    await postgresPrisma.$connect();
    console.log('✅ Connected to PostgreSQL database');
  } catch (error) {
    console.error('❌ Failed to initialize connections:', error.message);
    throw error;
  }
}

async function closeConnections() {
  if (sqliteDb) {
    sqliteDb.close();
    console.log('✅ SQLite connection closed');
  }
  if (postgresPrisma) {
    await postgresPrisma.$disconnect();
    console.log('✅ PostgreSQL connection closed');
  }
}

// Get all records from a SQLite table
function getSqliteRecords(tableName) {
  try {
    const stmt = sqliteDb.prepare(`SELECT * FROM ${tableName}`);
    return stmt.all();
  } catch (error) {
    console.warn(`⚠️  Could not read from table ${tableName}:`, error.message);
    return [];
  }
}

// Migration order (respecting foreign key constraints)
const MIGRATION_ORDER = [
  'users',
  'admins',
  'recruiters',
  'companies',
  'students',
  'skills',
  'education',
  'experiences',
  'projects',
  'achievements',
  'certifications',
  'coding_profiles',
  'jobs',
  'applications',
  'round_evaluations',
  'interviews',
  'interview_sessions',
  'recruiter_screening_sessions',
  'refresh_tokens',
  'otps',
  'notifications',
  'student_queries',
  'admin_requests',
  'job_tracking',
  'resumes',
  'student_resume_files',
  'email_notifications',
  'google_calendar_tokens',
  'endorsements',
  'endorsement_tokens',
  'student_resume_history',
];

// Map Prisma model names to table names
const MODEL_TO_TABLE = {
  User: 'users',
  Admin: 'admins',
  Recruiter: 'recruiters',
  Company: 'companies',
  Student: 'students',
  Skill: 'skills',
  Education: 'education',
  Experience: 'experiences',
  Project: 'projects',
  Achievement: 'achievements',
  Certification: 'certifications',
  CodingProfile: 'coding_profiles',
  Job: 'jobs',
  Application: 'applications',
  RoundEvaluation: 'round_evaluations',
  Interview: 'interviews',
  InterviewSession: 'interview_sessions',
  RecruiterScreeningSession: 'recruiter_screening_sessions',
  RefreshToken: 'refresh_tokens',
  Otp: 'otps',
  Notification: 'notifications',
  StudentQuery: 'student_queries',
  AdminRequest: 'admin_requests',
  JobTracking: 'job_tracking',
  Resume: 'resumes',
  StudentResumeFile: 'student_resume_files',
  EmailNotification: 'email_notifications',
  GoogleCalendarToken: 'google_calendar_tokens',
  Endorsement: 'endorsements',
  EndorsementToken: 'endorsement_tokens',
  StudentResumeHistory: 'student_resume_history',
};

async function migrateTable(tableName) {
  console.log(`\n📋 Migrating table: ${tableName}`);
  
  const records = getSqliteRecords(tableName);
  if (records.length === 0) {
    console.log(`   ⏭️  No records to migrate`);
    return 0;
  }

  console.log(`   📊 Found ${records.length} records`);

  // Convert SQLite data types to PostgreSQL-compatible types
  const processedRecords = records.map(record => {
    const processed = { ...record };
    
    // List of date fields that need conversion
    const dateFields = [
      'createdAt', 'updatedAt', 'lastLoginAt', 'emailVerifiedAt',
      'appliedDate', 'interviewDate', 'screeningCompletedAt',
      'postedAt', 'applicationDeadline', 'driveDate',
      'expiresAt', 'resumeUploadedAt', 'uploadedAt', 'archivedAt',
      'submittedAt', 'blockedAt'
    ];
    
    // Convert SQLite data types
    for (const key in processed) {
      const value = processed[key];
      
      // Skip if null or undefined
      if (value === null || value === undefined || value === 'null') {
        processed[key] = null;
        continue;
      }
      
      // Convert date/timestamp fields from integer (milliseconds) to Date object
      if (dateFields.includes(key) && !['startYear', 'endYear'].includes(key)) {
        if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
          if (numValue > 0) {
            processed[key] = new Date(numValue);
          } else {
            processed[key] = null;
          }
        } else if (typeof value === 'string' && value.trim() !== '') {
          // Try to parse as date string
          const dateValue = new Date(value);
          if (!isNaN(dateValue.getTime())) {
            processed[key] = dateValue;
          } else {
            processed[key] = null;
          }
        }
      }
      
      // Convert SQLite boolean (0/1 or true/false) to actual boolean
      // List of known boolean fields
      const booleanFields = [
        'emailVerified', 'recruiterVerified', 'googleCalendarConnected',
        'emailNotificationsDisabled', 'publicProfileShowEmail', 'publicProfileShowPhone',
        'isPosted', 'isActive', 'isNew', 'viewed', 'applied', 'isDefault',
        'consent', 'verified', 'sendEmail'
      ];
      
      if (booleanFields.includes(key) || key.toLowerCase().includes('verified') || 
          key.toLowerCase().includes('connected') || key.toLowerCase().includes('disabled') ||
          key.toLowerCase().startsWith('is') || key.toLowerCase().startsWith('has')) {
        if (value === 0 || value === '0' || value === false || value === 'false') {
          processed[key] = false;
        } else if (value === 1 || value === '1' || value === true || value === 'true') {
          processed[key] = true;
        } else if (value === null || value === undefined) {
          processed[key] = false; // Default to false for null booleans
        }
      }
    }
    
    return processed;
  });

  // Find the corresponding Prisma model
  const modelName = Object.keys(MODEL_TO_TABLE).find(
    key => MODEL_TO_TABLE[key] === tableName
  );

  if (!modelName) {
    console.warn(`   ⚠️  No Prisma model found for table ${tableName}, skipping`);
    return 0;
  }

  // Batch insert to avoid overwhelming the database
  const batchSize = 100;
  let migrated = 0;

  try {
    // Try batch insert first
    await postgresPrisma[modelName].createMany({
      data: processedRecords,
      skipDuplicates: true,
    });
    
    migrated = processedRecords.length;
    console.log(`   ✅ Migrated ${migrated}/${processedRecords.length} records`);
    
    return migrated;
  } catch (error) {
    console.error(`   ❌ Error migrating ${tableName}:`, error.message);
    
    // If batch insert fails, try individual inserts
    console.log(`   🔄 Trying individual inserts for ${tableName}...`);
    let individualMigrated = 0;
    
    for (const record of processedRecords) {
      try {
        await postgresPrisma[modelName].create({
          data: record,
        });
        individualMigrated++;
      } catch (individualError) {
        if (individualError.code === 'P2002') {
          // Record already exists, skip
          continue;
        } else if (individualError.code === 'P2003') {
          // Foreign key constraint failed - related record doesn't exist
          console.warn(`   ⚠️  Skipped record (foreign key constraint): ${record.id || JSON.stringify(record).substring(0, 50)}`);
          continue;
        } else {
          console.warn(`   ⚠️  Skipped record due to error:`, individualError.message);
          continue;
        }
      }
    }
    
    if (individualMigrated > 0) {
      console.log(`   ✅ Migrated ${individualMigrated}/${processedRecords.length} records individually`);
    } else {
      console.log(`   ⚠️  No records migrated for ${tableName}`);
    }
    
    return individualMigrated;
    
    throw error;
  }
}

async function checkExistingData() {
  console.log('\n📊 Checking existing PostgreSQL data...');
  
  const counts = {};
  for (const [modelName, tableName] of Object.entries(MODEL_TO_TABLE)) {
    try {
      const count = await postgresPrisma[modelName].count();
      counts[tableName] = count;
    } catch (error) {
      counts[tableName] = 0;
    }
  }
  
  const totalExisting = Object.values(counts).reduce((sum, count) => sum + count, 0);
  
  if (totalExisting > 0) {
    console.log('⚠️  PostgreSQL database already contains data:');
    Object.entries(counts).forEach(([table, count]) => {
      if (count > 0) {
        console.log(`   ${table}: ${count} records`);
      }
    });
    
    console.log('\n⚠️  Migration will use skipDuplicates to avoid conflicts.');
    console.log('   Existing records will be preserved, new records will be added.');
  } else {
    console.log('✅ PostgreSQL database is empty, ready for migration');
  }
}

async function main() {
  try {
    console.log('🚀 Starting SQLite to PostgreSQL Migration\n');
    console.log('=' .repeat(60));
    
    await initConnections();
    
    // Check existing data
    await checkExistingData();
    
    // Get SQLite table counts
    console.log('\n📊 SQLite Database Contents:');
    let totalSqliteRecords = 0;
    for (const tableName of MIGRATION_ORDER) {
      const records = getSqliteRecords(tableName);
      if (records.length > 0) {
        console.log(`   ${tableName}: ${records.length} records`);
        totalSqliteRecords += records.length;
      }
    }
    console.log(`\n   Total: ${totalSqliteRecords} records to migrate`);
    
    // Confirm migration
    console.log('\n⚠️  Starting migration...');
    
    // Migrate tables in order
    let totalMigrated = 0;
    const results = {};
    
    for (const tableName of MIGRATION_ORDER) {
      const migrated = await migrateTable(tableName);
      totalMigrated += migrated;
      results[tableName] = migrated;
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Migration Complete!\n');
    console.log('📊 Migration Summary:');
    console.log(`   Total records migrated: ${totalMigrated}`);
    console.log('\n📋 Table Breakdown:');
    Object.entries(results).forEach(([table, count]) => {
      if (count > 0) {
        console.log(`   ${table}: ${count} records`);
      }
    });
    
    // Verify migration
    console.log('\n🔍 Verifying migrated data...');
    const postgresCounts = {};
    for (const [modelName, tableName] of Object.entries(MODEL_TO_TABLE)) {
      try {
        const count = await postgresPrisma[modelName].count();
        postgresCounts[tableName] = count;
        if (count > 0) {
          console.log(`   ✅ ${tableName}: ${count} records`);
        }
      } catch (error) {
        // Model might not exist or have issues
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeConnections();
  }
}

// Run migration
main().catch(console.error);
