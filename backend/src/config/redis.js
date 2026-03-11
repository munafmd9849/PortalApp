/**
 * Redis Configuration
 * Used for BullMQ job queues and caching
 * Replaces Firebase real-time subscriptions for background jobs
 */

import Redis from 'ioredis';

// Use REDIS_URL (Upstash, etc.) when set; otherwise host/port for local dev
const redisConfig = process.env.REDIS_URL
  ? process.env.REDIS_URL
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        if (times > 5) return null;
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      enableReadyCheck: false,
      autoResubscribe: false,
    };

const redis = typeof redisConfig === 'string'
  ? new Redis(redisConfig, {
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 50, 2000)),
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    })
  : new Redis(redisConfig);

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
    // We already have a redis instance. If it says it's ready, we are good.
    if (redis.status === 'ready') return true;

    // Instead of forcing the main connection to wake up (which causes race conditions),
    // Use a temporary fast-failing connection to ping the server cleanly.
    const tempConfig = process.env.REDIS_URL
      ? [process.env.REDIS_URL, { maxRetriesPerRequest: 0, connectTimeout: 500, lazyConnect: false }]
      : [{ host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT) || 6379, password: process.env.REDIS_PASSWORD, maxRetriesPerRequest: 0, connectTimeout: 500, lazyConnect: false }];
    const tempRedis = new Redis(...tempConfig);

    await tempRedis.ping();
    tempRedis.disconnect();
    return true;
  } catch (error) {
    return false;
  }
}

export default redis;
