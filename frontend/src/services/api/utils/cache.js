import { CACHE_CONFIG } from '../config';

// In-memory cache
const requestCache = new Map();

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {any} data - The cached data
 * @property {number} timestamp - When the data was cached (in ms since epoch)
 * @property {number} [ttl] - Time to live in milliseconds
 */

/**
 * Gets a value from the cache
 * @param {string} key - The cache key
 * @returns {CacheEntry|undefined} The cached entry or undefined if not found/expired
 */
export const getFromCache = (key) => {
  const entry = requestCache.get(key);
  
  if (!entry) return undefined;
  
  // Check if the entry has expired
  const now = Date.now();
  const ttl = entry.ttl || CACHE_CONFIG.DEFAULT_TTL;
  
  if (now - entry.timestamp > ttl) {
    requestCache.delete(key);
    return undefined;
  }
  
  return entry.data;
};

/**
 * Sets a value in the cache
 * @param {string} key - The cache key
 * @param {any} data - The data to cache
 * @param {number} [ttl] - Optional TTL in milliseconds
 */
export const setInCache = (key, data, ttl) => {
  requestCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttl || CACHE_CONFIG.DEFAULT_TTL,
  });
  
  // Schedule cleanup if not already scheduled
  if (!cacheCleanupInterval) {
    scheduleCacheCleanup();
  }
};

/**
 * Removes a value from the cache
 * @param {string} key - The cache key to remove
 */
export const removeFromCache = (key) => {
  requestCache.delete(key);
};

/**
 * Clears all cached data
 */
export const clearCache = () => {
  requestCache.clear();
};

/**
 * Cleans up expired cache entries
 */
const cleanupExpiredCache = () => {
  const now = Date.now();
  let expiredCount = 0;
  
  for (const [key, entry] of requestCache.entries()) {
    const ttl = entry.ttl || CACHE_CONFIG.DEFAULT_TTL;
    if (now - entry.timestamp > ttl) {
      requestCache.delete(key);
      expiredCount++;
    }
  }
  
  if (expiredCount > 0 && process.env.NODE_ENV === 'development') {
    console.log(`[Cache] Cleaned up ${expiredCount} expired entries`);
  }
};

// Cache cleanup interval
let cacheCleanupInterval = null;

/**
 * Schedules periodic cache cleanup
 */
const scheduleCacheCleanup = () => {
  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
  }
  
  cacheCleanupInterval = setInterval(
    cleanupExpiredCache, 
    CACHE_CONFIG.CLEANUP_INTERVAL
  );
};

// Start the cleanup scheduler
scheduleCacheCleanup();

// Clean up on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (cacheCleanupInterval) {
      clearInterval(cacheCleanupInterval);
      cacheCleanupInterval = null;
    }
  });
}

/**
 * Creates a cache key from request parameters
 * @param {string} endpoint - The API endpoint
 * @param {Object} [params] - The request parameters
 * @returns {string} A cache key
 */
export const createCacheKey = (endpoint, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  
  return `${endpoint}?${sortedParams}`;
};

/**
 * Wraps an async function with caching
 * @param {Function} fn - The async function to cache
 * @param {Object} [options] - Caching options
 * @param {number} [options.ttl] - Time to live in milliseconds
 * @param {Function} [options.getKey] - Function to generate cache key from arguments
 * @returns {Function} A cached version of the function
 */
export const withCache = (fn, options = {}) => {
  return async (...args) => {
    const key = options.getKey 
      ? options.getKey(...args) 
      : createCacheKey(fn.name, args);
    
    // Check cache first
    const cached = getFromCache(key);
    if (cached !== undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Cache] Cache hit for ${key}`);
      }
      return cached;
    }
    
    // Not in cache, call the function
    const result = await fn(...args);
    
    // Cache the result
    setInCache(key, result, options.ttl);
    
    return result;
  };
};
