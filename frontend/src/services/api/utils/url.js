import logger from '../../../utils/logger';
const urlLog = logger('api:utils:url');
import { API_BASE_URL, FALLBACK_URLS } from '../config';

// Track current URL being used
let currentBaseUrl = API_BASE_URL;
let currentUrlIndex = 0;

/**
 * Get the current base URL, cycling through fallbacks if needed
 * @returns {string} The current base URL
 */
export const getCurrentBaseUrl = () => {
  return currentBaseUrl;
};

/**
 * Try the next fallback URL
 * @returns {boolean} True if switched to a fallback URL, false if no more fallbacks
 */
export const tryNextFallbackUrl = () => {
  if (FALLBACK_URLS.length === 0) return false;
  
  currentUrlIndex = (currentUrlIndex + 1) % FALLBACK_URLS.length;
  currentBaseUrl = FALLBACK_URLS[currentUrlIndex];
  
  urlLog.warn(`[API] Trying fallback URL: ${currentBaseUrl}`);
  return true;
};

/**
 * Create form data from an object
 * @param {Object} data - The data to convert to FormData
 * @returns {FormData} The created FormData object
 */
export const createFormData = (data) => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    
    if (Array.isArray(value)) {
      value.forEach(item => formData.append(key, item));
    } else if (value instanceof File || value instanceof Blob) {
      formData.append(key, value, value.name);
    } else if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value);
    }
  });
  
  return formData;
};

/**
 * Debounce a function
 * @param {string} key - Unique key for the debounced function
 * @param {Function} fn - The function to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} The debounced function
 */
export const debounce = (() => {
  const timeouts = new Map();
  
  return (key, fn, delay = 300) => {
    if (timeouts.has(key)) {
      clearTimeout(timeouts.get(key));
    }
    
    const timeoutId = setTimeout(() => {
      fn();
      timeouts.delete(key);
    }, delay);
    
    timeouts.set(key, timeoutId);
  };
})();

/**
 * Clear cache after TTL
 * @param {string} key - The cache key to clear
 * @param {number} ttl - Time to live in milliseconds
 */
export const clearCacheAfterTTL = (key, ttl) => {
  setTimeout(() => {
    // Clear from any caches if needed
    if (window.caches) {
      caches.delete(key).catch(e => urlLog.error('Failed to delete cache key during cleanup:', e));
    }
  }, ttl);
};

/**
 * Clean up expired cache entries
 */
export const cleanExpiredCache = () => {
  const now = Date.now();
  
  // Clean up any expired caches
  if (window.caches) {
    caches.keys().then(keys => {
      keys.forEach(key => {
        if (key.startsWith('cache-') && key.endsWith(`-${now}`)) {
          caches.delete(key).catch(e => urlLog.error('Failed to delete expired cache key:', e));
        }
      });
    });
  }
};

// Run cleanup every minute
setInterval(cleanExpiredCache, 60 * 1000);

// Export a default object with all functions for backward compatibility
export default {
  getCurrentBaseUrl,
  tryNextFallbackUrl,
  createFormData,
  debounce,
  clearCacheAfterTTL,
  cleanExpiredCache
};
