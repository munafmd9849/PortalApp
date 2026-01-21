/**
 * Database Configuration
 * Prisma Client singleton for database access
 * Uses SQLite database
 */

import { PrismaClient } from '@prisma/client';

function assertDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('CRITICAL: DATABASE_URL is required.');
  }

  const lowered = url.toLowerCase();
  // SQLite uses file: protocol
  if (!lowered.startsWith('file:')) {
    throw new Error('CRITICAL: DATABASE_URL must start with file: for SQLite database.');
  }
}

assertDatabaseUrl();

// Prisma client configuration for SQLite
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['error', 'warn'] // Removed 'query' to reduce noise, keep errors/warnings
    : ['error'],
});

// We connect/validate from server startup (fail-fast). Exporting the client here.

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
