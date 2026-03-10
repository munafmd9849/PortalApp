/**
 * Test connection to old database
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL;

if (!OLD_DATABASE_URL) {
  console.error('❌ OLD_DATABASE_URL not set in .env');
  process.exit(1);
}

console.log('🔍 Testing old database connection...\n');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: OLD_DATABASE_URL,
    },
  },
});

async function test() {
  try {
    console.log('⏳ Connecting...');
    await prisma.$connect();
    console.log('✅ Connected successfully!');
    
    console.log('⏳ Testing query...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Query successful!');
    
    console.log('⏳ Counting records...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database accessible! Found ${userCount} users.`);
    
    console.log('\n✅ Old database is accessible! Migration can proceed.');
  } catch (error) {
    if (error.message && error.message.includes('quota')) {
      console.error('\n❌ Database quota exceeded');
      console.error('   ⏰ Please wait for quota to reset, then try again.');
    } else {
      console.error('\n❌ Connection failed:', error.message);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

test()
  .catch(() => process.exit(1));
