/**
 * Database Configuration
 * Prisma Client singleton for database access
 * Replaces Firebase Firestore client
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Ensure .env is loaded before validation
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

function assertPostgresOnlyDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('CRITICAL: DATABASE_URL is required (Neon PostgreSQL only).');
  }

  const lowered = url.toLowerCase().trim();
  // Only check for file: at the start (file:// is the file-based URL scheme)
  if (lowered.startsWith('file:')) {
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

// Run assertion first to ensure DATABASE_URL is valid
assertPostgresOnlyDatabaseUrl();

// Prisma client configuration for Postgres
// Note: Prisma's built-in error logging can't be easily filtered,
// but we handle quota errors gracefully in our code
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
