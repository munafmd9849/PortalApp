/**
 * Redis Configuration
 * Used for BullMQ job queues and caching
 * Replaces Firebase real-time subscriptions for background jobs
 */

import Redis from 'ioredis';

// Create Redis client with lazy connection (only connects when used)
// This prevents Redis errors from crashing the server if Redis is not available
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    // Stop retrying after 5 attempts to prevent endless retries
    if (times > 5) {
      return null; // Stop retrying
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null, // Disable automatic retries to prevent blocking
  lazyConnect: true, // Don't connect immediately - only when needed
  enableOfflineQueue: false, // Don't queue commands if Redis is down
  connectTimeout: 5000, // 5 second timeout
  enableReadyCheck: false, // Don't wait for ready check
  autoResubscribe: false, // Don't auto-resubscribe
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  // Log error but don't crash - Redis is optional for basic features
  console.error('❌ Redis connection error (server will continue without Redis):', err.message);
});

// Don't fail if Redis connection fails - server can run without it
redis.on('ready', () => {
  console.log('✅ Redis ready');
});

/**
 * Check if Redis is available (non-blocking)
 */
export async function isRedisAvailable() {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    return false;
  }
}

export default redis;
