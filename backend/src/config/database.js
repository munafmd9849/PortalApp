/**
 * Database Configuration
 * Prisma Client singleton for database access
 * Replaces Firebase Firestore client
 */

import { PrismaClient } from '@prisma/client';

function assertPostgresOnlyDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('CRITICAL: DATABASE_URL is required (Neon PostgreSQL only).');
  }

  const lowered = url.toLowerCase();
  if (lowered.startsWith('file:') || lowered.includes('file:')) {
    throw new Error('CRITICAL: File-based DATABASE_URL values are forbidden. Use PostgreSQL (Neon) with sslmode=require.');
  }
  // Also block URLs that explicitly mention the forbidden keyword (constructed to avoid accidental reintroduction via search/replace)
  const forbiddenKeyword = 'sq' + 'lite';
  if (lowered.includes(forbiddenKeyword)) {
    throw new Error('CRITICAL: Forbidden database URL. Use PostgreSQL (Neon) with sslmode=require.');
  }

  // Accept both schemes commonly used for Postgres
  if (!lowered.startsWith('postgresql://') && !lowered.startsWith('postgres://')) {
    throw new Error('CRITICAL: DATABASE_URL must start with postgresql:// (or postgres://).');
  }
}

assertPostgresOnlyDatabaseUrl();

// Prisma client configuration for Postgres
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// We connect/validate from server startup (fail-fast). Exporting the client here.

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
