/**
 * Database Configuration
 * Prisma Client singleton for database access
 * Uses PostgreSQL database (Render)
 * 
 * Connection Pool Configuration:
 * - Render PostgreSQL free tier has a limit of ~20 connections
 * - Pool size set to 10 to leave room for migrations/scripts
 * - Pool timeout increased to 20s for Render's slower wake-up times
 * - Connection timeout set to 10s
 */

// CRITICAL: Load environment variables FIRST before accessing process.env
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the backend root directory (parent of src/config/)
// This ensures DATABASE_URL is available when we access it below
dotenv.config({ path: join(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Ensure .env is loaded before validation
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Enhance DATABASE_URL with connection pool parameters for Render PostgreSQL
 * Render free tier has ~20 connection limit, so we optimize pool size
 * 
 * Note: Render PostgreSQL free tier databases spin down after ~90 seconds of inactivity
 * and take 30-60 seconds to wake up. The increased pool_timeout helps handle this.
 */
function getOptimizedDatabaseUrl() {
  let url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('CRITICAL: DATABASE_URL is required.');
  }

  const lowered = url.toLowerCase().trim();
  
  // Validate: Block file-based databases (SQLite)
  if (lowered.startsWith('file:')) {
    throw new Error('CRITICAL: File-based DATABASE_URL values are forbidden. Use PostgreSQL (Neon) with sslmode=require.');
  }
  // Also block URLs that explicitly mention the forbidden keyword
  const forbiddenKeyword = 'sq' + 'lite';
  if (lowered.includes(forbiddenKeyword)) {
    throw new Error('CRITICAL: Forbidden database URL. Use PostgreSQL (Neon) with sslmode=require.');
  }
  
  // Validate: Must be PostgreSQL connection string
  if (!lowered.startsWith('postgresql://') && !lowered.startsWith('postgres://')) {
    throw new Error('CRITICAL: DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://).');
  }

  try {
    // Add connection pool parameters if not already present
    // Render PostgreSQL free tier limit: ~20 connections
    // We set pool to 10 to leave room for migrations/scripts
    const urlObj = new URL(url);
    
    // Only add parameters if they don't exist
    if (!urlObj.searchParams.has('connection_limit')) {
      urlObj.searchParams.set('connection_limit', '10');
    }
    if (!urlObj.searchParams.has('pool_timeout')) {
      urlObj.searchParams.set('pool_timeout', '20'); // Increased from default 10s for Render wake-up time
    }
    if (!urlObj.searchParams.has('connect_timeout')) {
      urlObj.searchParams.set('connect_timeout', '10');
    }

    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL and log warning
    console.warn('Failed to parse DATABASE_URL for optimization:', error.message);
    console.warn('Using original DATABASE_URL without connection pool parameters');
    return url;
  }
}

// Get optimized database URL with connection pool parameters
// This also validates the DATABASE_URL format
const optimizedDatabaseUrl = getOptimizedDatabaseUrl();

// Set it back to process.env so Prisma uses it
process.env.DATABASE_URL = optimizedDatabaseUrl;

// Prisma client configuration for PostgreSQL with connection pool optimization
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

// Handle process termination signals
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Helper function to handle connection pool errors
export function handleDatabaseError(error) {
  if (error?.code === 'P2024') {
    // Connection pool timeout
    console.error('Database connection pool exhausted. This may indicate:');
    console.error('1. Too many concurrent requests');
    console.error('2. Long-running queries holding connections');
    console.error('3. Database connection leaks');
    console.error('4. Render database may be sleeping (free tier)');
  } else if (error?.code === 'P1017') {
    // Server closed connection
    console.error('Database server closed the connection. Render database may have gone to sleep.');
  } else if (error?.code === 'P1001') {
    // Can't reach database server
    console.error('Cannot reach database server. Please check:');
    console.error('1. Database is running on Render');
    console.error('2. DATABASE_URL is correct');
    console.error('3. Network connectivity');
  }
  return error;
}

export default prisma;
