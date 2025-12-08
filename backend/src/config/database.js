/**
 * Database Configuration
 * Prisma Client singleton for database access
 * Replaces Firebase Firestore client
 */

import { PrismaClient } from '@prisma/client';

// FIX: Enhanced Prisma client configuration for better error handling and SQLite concurrency
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// FIX: Handle connection errors gracefully
prisma.$connect().catch((error) => {
  console.error('❌ Failed to connect to database:', error.message);
  // Don't throw - let individual queries handle errors
});

// FIX: Add connection pool monitoring (commented out - Prisma doesn't expose error event)
// Connection errors will be caught in individual query try-catch blocks
// let connectionErrors = 0;
// const MAX_CONNECTION_ERRORS = 5;

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// FIX: Ensure SQLite uses WAL mode for better concurrency (if using SQLite)
if (process.env.DATABASE_URL?.includes('sqlite')) {
  prisma.$executeRaw`PRAGMA journal_mode = WAL;`.catch((error) => {
    // Silently fail - database might already be in WAL mode or might not support it
    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️ SQLite WAL mode already enabled or not applicable');
    }
  });
}

export default prisma;
