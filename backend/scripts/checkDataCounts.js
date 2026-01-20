/**
 * Check data counts in both old and new databases
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const oldPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.OLD_DATABASE_URL,
    },
  },
});

const newPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function checkCounts() {
  console.log('📊 Checking data counts...\n');
  
  const tables = [
    { name: 'Users', old: () => oldPrisma.user.count(), new: () => newPrisma.user.count() },
    { name: 'Students', old: () => oldPrisma.student.count(), new: () => newPrisma.student.count() },
    { name: 'Companies', old: () => oldPrisma.company.count(), new: () => newPrisma.company.count() },
    { name: 'Recruiters', old: () => oldPrisma.recruiter.count(), new: () => newPrisma.recruiter.count() },
    { name: 'Jobs', old: () => oldPrisma.job.count(), new: () => newPrisma.job.count() },
    { name: 'Applications', old: () => oldPrisma.application.count(), new: () => newPrisma.application.count() },
  ];
  
  console.log('='.repeat(70));
  console.log(`${'Table'.padEnd(20)} | ${'Old DB'.padStart(10)} | ${'New DB'.padStart(10)}`);
  console.log('='.repeat(70));
  
  let oldTotal = 0;
  let newTotal = 0;
  
  for (const table of tables) {
    try {
      let oldCount = 'N/A';
      let newCount = 0;
      
      // Try old database
      try {
        oldCount = await table.old();
        oldTotal += oldCount;
      } catch (error) {
        if (error.message && error.message.includes('quota')) {
          oldCount = 'Quota Exceeded';
        } else {
          oldCount = 'Error';
        }
      }
      
      // Check new database
      try {
        newCount = await table.new();
        newTotal += newCount;
      } catch (error) {
        newCount = 'Error';
      }
      
      console.log(`${table.name.padEnd(20)} | ${String(oldCount).padStart(10)} | ${String(newCount).padStart(10)}`);
    } catch (error) {
      console.log(`${table.name.padEnd(20)} | ${'Error'.padStart(10)} | ${'Error'.padStart(10)}`);
    }
  }
  
  console.log('='.repeat(70));
  console.log(`${'TOTAL'.padEnd(20)} | ${String(oldTotal).padStart(10)} | ${String(newTotal).padStart(10)}`);
  console.log('='.repeat(70));
  
  if (oldTotal === 0 && typeof oldTotal === 'number') {
    console.log('\n⚠️  Could not read from old database (quota exceeded or connection issue)');
  }
  
  if (newTotal === 0) {
    console.log('\n⚠️  New database is empty - data migration needed');
  } else {
    console.log('\n✅ New database has some data');
  }
  
  await oldPrisma.$disconnect();
  await newPrisma.$disconnect();
}

checkCounts()
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
