/**
 * Setup Script for Render PostgreSQL Database
 * 
 * This script helps set up and verify your Render PostgreSQL database connection.
 * 
 * Usage:
 *   1. Set DATABASE_URL in .env file
 *   2. Run: node scripts/setupRenderDatabase.js
 * 
 * What it does:
 *   - Tests database connection
 *   - Checks if tables exist
 *   - Offers to run migrations
 *   - Offers to seed database
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function checkDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. DATABASE_URL is set in .env file');
    console.error('2. Database URL format: postgresql://user:password@host:port/database');
    console.error('3. Render database is running (not paused)');
    console.error('4. Network/firewall allows connection\n');
    return false;
  }
}

async function checkTables() {
  console.log('📊 Checking database tables...\n');
  
  try {
    // Try to query a table that should exist
    const userCount = await prisma.user.count();
    console.log(`✅ Tables exist! Found ${userCount} users in database.\n`);
    return true;
  } catch (error) {
    if (error.code === 'P2021' || error.message.includes('does not exist')) {
      console.log('⚠️  Tables do not exist yet. You need to run migrations.\n');
      return false;
    }
    throw error;
  }
}

async function checkDataCounts() {
  console.log('📈 Checking data counts...\n');
  
  try {
    const counts = {
      users: await prisma.user.count(),
      students: await prisma.student.count(),
      companies: await prisma.company.count(),
      jobs: await prisma.job.count(),
      applications: await prisma.application.count(),
      recruiters: await prisma.recruiter.count(),
    };
    
    console.log('Current database contents:');
    console.log(`   Users: ${counts.users}`);
    console.log(`   Students: ${counts.students}`);
    console.log(`   Companies: ${counts.companies}`);
    console.log(`   Jobs: ${counts.jobs}`);
    console.log(`   Applications: ${counts.applications}`);
    console.log(`   Recruiters: ${counts.recruiters}\n`);
    
    return counts;
  } catch (error) {
    console.error('Error checking data counts:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Render PostgreSQL Database Setup\n');
  console.log('=' .repeat(50));
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
  console.log('=' .repeat(50) + '\n');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set!');
    console.error('Please set it in your .env file:');
    console.error('DATABASE_URL="postgresql://user:password@host:port/database"\n');
    process.exit(1);
  }
  
  // Test connection
  const connected = await checkDatabaseConnection();
  if (!connected) {
    await prisma.$disconnect();
    process.exit(1);
  }
  
  // Check if tables exist
  const tablesExist = await checkTables();
  
  if (!tablesExist) {
    console.log('📝 Next steps:');
    console.log('   1. Run migrations: npx prisma migrate deploy');
    console.log('   2. Or for development: npx prisma migrate dev\n');
  } else {
    // Check data counts
    await checkDataCounts();
    
    console.log('✅ Database is set up and ready!\n');
    console.log('💡 To seed with sample data, run:');
    console.log('   npm run db:seed\n');
  }
  
  await prisma.$disconnect();
  console.log('✨ Setup check complete!');
}

main().catch(async (error) => {
  console.error('Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
