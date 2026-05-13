/**
 * Database Configuration
 * Prisma Client singleton for database access
 * Supports SQLite (local dev) and PostgreSQL (production)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';

function getOptimizedDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('CRITICAL: DATABASE_URL is required.');
  }

  const lowered = url.toLowerCase().trim();

  // SQLite: return as-is, no connection pool params needed
  if (lowered.startsWith('file:')) {
    return url;
  }

  // PostgreSQL: add connection pool parameters
  if (lowered.startsWith('postgresql://') || lowered.startsWith('postgres://')) {
    try {
      const urlObj = new URL(url);
      if (!urlObj.searchParams.has('connection_limit')) {
        urlObj.searchParams.set('connection_limit', '10');
      }
      if (!urlObj.searchParams.has('pool_timeout')) {
        urlObj.searchParams.set('pool_timeout', '20');
      }
      if (!urlObj.searchParams.has('connect_timeout')) {
        urlObj.searchParams.set('connect_timeout', '10');
      }
      return urlObj.toString();
    } catch (error) {
      console.warn('Failed to parse DATABASE_URL for optimization:', error.message);
      return url;
    }
  }

  throw new Error('CRITICAL: DATABASE_URL must be a PostgreSQL connection string or a SQLite file: path.');
}

const optimizedDatabaseUrl = getOptimizedDatabaseUrl();
process.env.DATABASE_URL = optimizedDatabaseUrl;

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export function handleDatabaseError(error) {
  if (error?.code === 'P2024') {
    console.error('Database connection pool exhausted.');
  } else if (error?.code === 'P1017') {
    console.error('Database server closed the connection.');
  } else if (error?.code === 'P1001') {
    console.error('Cannot reach database server. Check DATABASE_URL and connectivity.');
  }
  return error;
}

export default prisma;
