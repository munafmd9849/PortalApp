/**
 * List all tables in the database
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function listTables() {
  try {
    console.log('📋 Fetching all tables from database...\n');
    
    const tables = await prisma.$queryRaw`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log(`✅ Found ${tables.length} tables:\n`);
    console.log('='.repeat(60));
    
    tables.forEach((table, index) => {
      console.log(`${(index + 1).toString().padStart(3)}. ${table.table_name.padEnd(40)} (${table.column_count} columns)`);
    });
    
    console.log('='.repeat(60));
    console.log(`\n✨ Total: ${tables.length} tables created successfully!`);
    
  } catch (error) {
    console.error('❌ Error listing tables:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listTables()
  .catch(() => process.exit(1));
