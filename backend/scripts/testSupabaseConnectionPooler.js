/**
 * Test Supabase connection with pooler port (6543)
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

// Try pooler connection (port 6543)
const originalUrl = process.env.DATABASE_URL || '';
const poolerUrl = originalUrl.replace(':5432/', ':6543/');

console.log('🔍 Testing Supabase connection with pooler port (6543)...\n');
console.log('Original URL:', originalUrl?.replace(/:[^:@]+@/, ':****@') || 'NOT SET');
console.log('Pooler URL:', poolerUrl?.replace(/:[^:@]+@/, ':****@') || 'NOT SET');
console.log('');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: poolerUrl,
    },
  },
});

async function test() {
  try {
    console.log('⏳ Connecting via pooler (port 6543)...');
    await prisma.$connect();
    console.log('✅ Connected successfully via pooler!');
    
    console.log('⏳ Testing query...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Query successful!');
    
    console.log('⏳ Testing table access...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database accessible! Found ${userCount} users.`);
    
    console.log('\n✅ Pooler connection works!');
    console.log('\n💡 Update your .env DATABASE_URL to use port 6543:');
    console.log(`   DATABASE_URL="${poolerUrl}"`);
  } catch (error) {
    console.error('\n❌ Pooler connection also failed:');
    console.error('Error:', error.message);
    
    // Try direct connection as fallback
    console.log('\n🔄 Trying direct connection (port 5432)...');
    const directPrisma = new PrismaClient({
      datasources: {
        db: {
          url: originalUrl,
        },
      },
    });
    
    try {
      await directPrisma.$connect();
      await directPrisma.$queryRaw`SELECT 1`;
      console.log('✅ Direct connection works!');
    } catch (directError) {
      console.error('❌ Direct connection also failed:', directError.message);
      console.error('\n💡 Please check:');
      console.error('   1. Supabase database is active in dashboard');
      console.error('   2. Connection string is correct');
      console.error('   3. Password is correct');
      console.error('   4. IP restrictions (if any)');
    } finally {
      await directPrisma.$disconnect();
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

test()
  .catch(() => process.exit(1));
