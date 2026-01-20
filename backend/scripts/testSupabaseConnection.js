/**
 * Test Supabase database connection
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔍 Testing Supabase connection...\n');
console.log('Connection string:', DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'NOT SET');
console.log('');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
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
    
    console.log('⏳ Testing table access...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database accessible! Found ${userCount} users.`);
    
    console.log('\n✅ All connection tests passed!');
  } catch (error) {
    console.error('\n❌ Connection failed:');
    console.error('Error:', error.message);
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check if Supabase database is running');
    console.error('   2. Verify connection string in Supabase dashboard');
    console.error('   3. Check if IP is whitelisted (if required)');
    console.error('   4. Try connection pooler port (6543) instead of direct (5432)');
    console.error('   5. Ensure database password is correct');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

test()
  .catch(() => process.exit(1));
