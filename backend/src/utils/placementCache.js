/**
 * Placement AI Response Cache
 * In-memory cache for AI responses to reduce API calls and handle quota limits
 */

// In-memory cache: { normalizedPrompt: { response, timestamp, expiresAt } }
const cache = new Map();

// Cache TTL: 24 hours
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Normalize prompt text for cache key
 * - Lowercase
 * - Trim whitespace
 * - Remove extra spaces
 */
function normalizePrompt(prompt) {
  return prompt
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .substring(0, 500); // Limit key length
}

/**
 * Get cached response if available and not expired
 * @param {string} prompt - The user prompt
 * @returns {string|null} Cached response or null
 */
export function getCachedResponse(prompt) {
  const normalized = normalizePrompt(prompt);
  const cached = cache.get(normalized);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() > cached.expiresAt) {
    cache.delete(normalized);
    return null;
  }

  console.log('[PLACEMENT_CACHE] Cache hit for prompt:', normalized.substring(0, 50));
  return cached.response;
}

/**
 * Store response in cache
 * @param {string} prompt - The user prompt
 * @param {string} response - The AI response
 */
export function setCachedResponse(prompt, response) {
  const normalized = normalizePrompt(prompt);
  const now = Date.now();

  cache.set(normalized, {
    response,
    timestamp: now,
    expiresAt: now + CACHE_TTL_MS,
  });

  console.log('[PLACEMENT_CACHE] Cached response for prompt:', normalized.substring(0, 50));
  
  // Cleanup expired entries periodically (every 1000 entries)
  if (cache.size > 1000) {
    cleanupExpiredEntries();
  }
}

/**
 * Remove expired cache entries
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, value] of cache.entries()) {
    if (now > value.expiresAt) {
      cache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[PLACEMENT_CACHE] Cleaned up ${cleaned} expired entries`);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  let valid = 0;
  let expired = 0;

  for (const value of cache.values()) {
    if (now > value.expiresAt) {
      expired++;
    } else {
      valid++;
    }
  }

  return {
    total: cache.size,
    valid,
    expired,
  };
}


