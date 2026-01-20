/**
 * Attempt data migration and retry if quota is exceeded
 * This script will attempt migration and show clear status
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function attemptMigration() {
  console.log('🔄 Attempting data migration...\n');
  
  try {
    const { stdout, stderr } = await execAsync('node scripts/migrateNeonToSupabase.js', {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });
    
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    if (error.message && error.message.includes('quota')) {
      console.log('\n⏸️  Migration paused: Database quota exceeded');
      console.log('\n📋 What to do:');
      console.log('   1. Wait for Neon quota to reset (usually daily)');
      console.log('   2. Run this script again: node scripts/migrateDataWhenReady.js');
      console.log('   3. Or manually export from Neon dashboard');
      console.log('\n⏰ The script will work once quota resets.');
    } else {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    }
  }
}

attemptMigration();
