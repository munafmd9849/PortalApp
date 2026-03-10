/**
 * Test connection to new database
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const NEW_DATABASE_URL = process.env.DATABASE_URL;

if (!NEW_DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env');
  process.exit(1);
}

console.log('🔍 Testing new database connection...\n');
console.log('📊 Database URL:', NEW_DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
console.log('');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: NEW_DATABASE_URL,
    },
  },
});

async function testConnection() {
  try {
    console.log('⏳ Attempting to connect...');
    await prisma.$connect();
    console.log('✅ Connection successful!');
    
    // Try a simple query
    console.log('\n📊 Testing query...');
    const result = await prisma.$queryRaw`SELECT version() as version`;
    console.log('✅ Query successful!');
    console.log('   Database version:', result[0]?.version || 'Unknown');
    
    // Check if tables exist
    console.log('\n📋 Checking tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log(`   Found ${tables.length} tables`);
    if (tables.length > 0) {
      console.log('   Tables:', tables.slice(0, 5).map(t => t.table_name).join(', '));
      if (tables.length > 5) {
        console.log(`   ... and ${tables.length - 5} more`);
      }
    } else {
      console.log('   ⚠️  No tables found - schema may need to be applied');
    }
    
    console.log('\n✅ Database is ready!');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('\nError details:');
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\n💡 Possible solutions:');
      console.error('   1. Database may be suspended - check Neon dashboard');
      console.error('   2. Try activating/waking up the database in Neon dashboard');
      console.error('   3. Verify the connection string is correct');
      console.error('   4. Check if database needs to be created in Neon dashboard');
      console.error('   5. Try using direct connection URL instead of pooler');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Disconnected');
  }
}

testConnection();
