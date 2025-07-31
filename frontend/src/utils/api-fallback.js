/**
 * API Fallback System
 * 
 * Provides robust fallback mechanisms for API failures:
 * - Automatic retry with exponential backoff
 * - Local cache fallback for GET requests
 * - Offline request queuing for POST/PUT/DELETE
 * - Background synchronization when connectivity returns
 * - Circuit breaker to prevent overwhelming failed services
 */

import { STORES, getFromFallbackDB, saveToFallbackDB } from './database-fallback';

// Alias the functions for backward compatibility
const getFromLocalStorage = (key) => getFromFallbackDB(STORES.API_QUEUE, key);
const saveToLocalStorage = (key, value) => saveToFallbackDB(STORES.API_QUEUE, key, value);

// Configuration
const API_FALLBACK_CONFIG = {
  maxRetries: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 30000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeMs: 60000,
  cacheTtlMs: 1000 * 60 * 60, // 1 hour
};

// Circuit breaker state
const circuitState = {
  failures: 0,
  lastFailure: null,
  isOpen: false,
};

// Request queue for offline operations
const requestQueue = [];

// Check if circuit breaker is open (service considered down)
function isCircuitOpen() {
  if (!circuitState.isOpen) return false;
  
  // Check if it's time to try again (half-open state)
  const now = Date.now();
  if ((now - circuitState.lastFailure) > API_FALLBACK_CONFIG.circuitBreakerResetTimeMs) {
    circuitState.isOpen = false;
    return false;
  }
  
  return true;
}

// Record a failure in the circuit breaker
function recordFailure() {
  circuitState.failures++;
  circuitState.lastFailure = Date.now();
  
  // Open the circuit if threshold reached
  if (circuitState.failures >= API_FALLBACK_CONFIG.circuitBreakerThreshold) {
    console.warn('API circuit breaker opened - too many failures');
    circuitState.isOpen = true;
  }
}

// Record a success in the circuit breaker
function recordSuccess() {
  // Reset failure count on success
  circuitState.failures = 0;
  circuitState.isOpen = false;
}

// Cache response for GET requests
async function cacheResponse(url, response) {
  try {
    const cacheKey = `api-cache:${url}`;
    const cacheData = {
      data: await response.clone().json(),
      timestamp: Date.now(),
    };
    await saveToLocalStorage(cacheKey, cacheData);
  } catch (error) {
    console.error('Error caching API response:', error);
  }
}

// Get cached response
async function getCachedResponse(url) {
  try {
    const cacheKey = `api-cache:${url}`;
    const cacheData = await getFromLocalStorage(cacheKey);
    
    if (cacheData && cacheData.timestamp) {
      // Check if cache is still valid
      const now = Date.now();
      if ((now - cacheData.timestamp) < API_FALLBACK_CONFIG.cacheTtlMs) {
        return cacheData.data;
      }
    }
  } catch (error) {
    console.error('Error getting cached API response:', error);
  }
  
  return null;
}

// Queue a request for later execution
function queueRequest(method, url, data) {
  const queueItem = {
    method,
    url,
    data,
    timestamp: Date.now(),
  };
  
  requestQueue.push(queueItem);
  
  // Store queue in persistent storage
  saveToLocalStorage('api-queue', requestQueue)
    .catch(err => console.error('Error storing API queue:', err));
  
  return {
    queued: true,
    queuePosition: requestQueue.length,
    timestamp: queueItem.timestamp,
  };
}

// Process queued requests when back online
export async function processQueue() {
  // Load queue from storage
  const storedQueue = await getFromLocalStorage('api-queue') || [];
  
  if (storedQueue.length > 0) {
    console.log(`Processing ${storedQueue.length} queued API requests`);
    
    // Process in order (FIFO)
    for (const request of [...storedQueue]) {
      try {
        await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: request.data ? JSON.stringify(request.data) : undefined,
        });
        
        // Remove from queue on success
        const index = requestQueue.findIndex(item => 
          item.url === request.url && 
          item.timestamp === request.timestamp
        );
        
        if (index !== -1) {
          requestQueue.splice(index, 1);
        }
      } catch (error) {
        console.error('Error processing queued request:', error);
        // Leave in queue to try again later
      }
    }
    
    // Update stored queue
    await saveToLocalStorage('api-queue', requestQueue);
  }
}

// Main API request function with fallbacks
export async function apiFetch(url, options = {}) {
  const method = options.method || 'GET';
  const isReadOperation = method === 'GET';
  
  // Check circuit breaker first
  if (isCircuitOpen()) {
    console.warn('API circuit breaker is open, using fallback');
    
    // For GET requests, try to use cache
    if (isReadOperation) {
      const cachedData = await getCachedResponse(url);
      if (cachedData) {
        return { 
          data: cachedData, 
          source: 'cache',
          stale: true 
        };
      }
    } else {
      // For write operations, queue for later
      return queueRequest(method, url, options.body);
    }
    
    throw new Error('Service unavailable and no cached data available');
  }
  
  // Implement retry with exponential backoff
  let lastError = null;
  let backoffMs = API_FALLBACK_CONFIG.initialBackoffMs;
  
  for (let attempt = 0; attempt <= API_FALLBACK_CONFIG.maxRetries; attempt++) {
    try {
      // Wait with exponential backoff on retries
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        backoffMs = Math.min(backoffMs * 2, API_FALLBACK_CONFIG.maxBackoffMs);
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      // Record successful API call
      recordSuccess();
      
      // Cache GET responses for future fallback
      if (isReadOperation) {
        await cacheResponse(url, response);
      }
      
      return {
        data: await response.json(),
        source: 'network',
        stale: false,
      };
    } catch (error) {
      lastError = error;
      console.warn(`API attempt ${attempt + 1} failed:`, error);
    }
  }
  
  // All retries failed
  recordFailure();
  
  // For GET requests, try to use cached data
  if (isReadOperation) {
    const cachedData = await getCachedResponse(url);
    if (cachedData) {
      return { 
        data: cachedData, 
        source: 'cache',
        stale: true 
      };
    }
  } else {
    // For write operations, queue for later
    return queueRequest(method, url, options.body);
  }
  
  // No fallbacks worked
  throw lastError || new Error('API request failed with no further fallbacks available');
}

// Listen for online/offline events
export function initApiFallbackSystem() {
  // Process queue when coming back online
  window.addEventListener('online', () => {
    console.log('Network connection restored. Processing queued requests...');
    processQueue();
  });
  
  // Log when going offline
  window.addEventListener('offline', () => {
    console.log('Network connection lost. Requests will be queued.');
  });
  
  // Initialize by loading any existing queue
  const loadQueue = async () => {
    try {
      const queue = await getFromLocalStorage('api-queue');
      if (queue && Array.isArray(queue)) {
        requestQueue.push(...queue);
        console.log(`Loaded ${queue.length} pending API requests`);
      }
    } catch (err) {
      console.warn('Error loading API queue, starting with empty queue:', err);
      // Continue with empty queue if there's an error
      requestQueue = [];
    }
  };
  
  // Load queue on initialization
  loadQueue();
  
  // Try to process queue on startup if we're online
  if (navigator.onLine) {
    processQueue();
  }
  
  return {
    getQueueLength: () => requestQueue.length,
    getCircuitState: () => ({ ...circuitState }),
    resetCircuitBreaker: () => {
      circuitState.failures = 0;
      circuitState.isOpen = false;
      console.log('API circuit breaker manually reset');
    }
  };
}
