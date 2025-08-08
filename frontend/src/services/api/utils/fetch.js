import { API_BASE_URL, FALLBACK_URLS } from '../config';
import tokenUtils from '../auth/token';
import logger from '../../../utils/logger';
const fetchLog = logger('api:utils:fetch');

// Track active requests to prevent duplicate calls
const activeRequests = new Map();

/**
 * Enhanced fetch wrapper with timeout, retries, and auth handling
 * @param {string} resource - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} [options.timeout=10000] - Request timeout in ms
 * @param {number} [options.maxRetries=2] - Maximum number of retry attempts
 * @param {number} [options.retryDelay=1000] - Base delay between retries in ms
 * @param {boolean} [options.skipAuth=false] - Skip auth header for auth endpoints
 * @param {Function} [options.onRetry] - Callback before each retry
 * @returns {Promise<Response>} - Fetch response
 */
export const fetchWithTimeout = async (resource, options = {}) => {
  const {
    timeout = 30000, // Increased default timeout to 30s
    maxRetries = 2,
    retryDelay = 1000,
    skipAuth = false,
    onRetry,
    ...fetchOptions
  } = options;

  // Create a request key for deduplication
  const requestKey = `${resource}:${JSON.stringify(fetchOptions.body || {})}`;
  
  // Check for duplicate requests
  if (activeRequests.has(requestKey)) {
    fetchLog.log(`[Fetch] Returning existing request for ${requestKey}`);
    return activeRequests.get(requestKey);
  }

  // Create a promise that will be stored in activeRequests
  const fetchPromise = (async () => {
    const controller = new AbortController();
    let timeoutId;
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      activeRequests.delete(requestKey);
    };

    try {
      // Set up timeout
      timeoutId = setTimeout(() => {
        fetchLog.warn(`[Fetch] Request to ${resource} timed out after ${timeout}ms`);
        controller.abort(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
      
      // Add auth header if not skipped
      if (!skipAuth) {
        const token = await tokenUtils.getAuthToken();
        if (token) {
          fetchOptions.headers = {
            ...fetchOptions.headers,
            'Authorization': `Bearer ${token}`,
          };
        } else if (!skipAuth) {
          fetchLog.warn('[Fetch] No auth token available for request to', resource);
        }
      }

      // Ensure we have proper headers
      fetchOptions.headers = {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      };

      // Ensure credentials are included for cookies
      fetchOptions.credentials = 'include';
      
      // Add signal for timeout/abort
      fetchOptions.signal = controller.signal;

      let attempt = 0;
      let lastError = null;
      
      // Try the primary URL first, then fallbacks
      const urlsToTry = [API_BASE_URL, ...FALLBACK_URLS];
  
      for (const baseUrl of urlsToTry) {
        try {
          const url = resource.startsWith('http') ? resource : `${baseUrl}${resource}`;
          fetchLog.log(`[Fetch] Attempting request to ${url} (attempt ${attempt + 1}/${maxRetries + 1})`);
          
          // Make the request
          const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
          });

          // Clear the timeout
          clearTimeout(timeoutId);
          timeoutId = null;

          // Handle non-2xx responses
          if (!response.ok) {
            const error = new Error(`HTTP error! status: ${response.status}`);
            error.status = response.status;
            error.response = response;
            throw error;
          }

          // Clean up and return the response
          cleanup();
          return response;
        } catch (error) {
          lastError = error;
          
          // Don't retry if the request was aborted
          if (error.name === 'AbortError') {
            fetchLog.warn('[Fetch] Request was aborted:', error.message);
            cleanup();
            throw error;
          }
          
          fetchLog.warn(`[Fetch] Request failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
          
          // If we've reached max retries, throw the last error
          if (attempt >= maxRetries - 1) {
            cleanup();
            throw error;
          }
          
          // Call the onRetry callback if provided
          if (onRetry) {
            onRetry(attempt + 1, error);
          }
          
          // Wait before retrying
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          fetchLog.log(`[Fetch] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
        }
      }
  
      // If we get here, all attempts failed
      cleanup();
      const error = lastError || new Error('All fetch attempts failed');
      error.name = 'NetworkError';
      throw error;
    } catch (error) {
      // Clean up if not already done
      if (activeRequests.get(requestKey) === fetchPromise) {
        activeRequests.delete(requestKey);
      }
      throw error;
    }
  });

  // Store the promise to handle duplicate requests
  activeRequests.set(requestKey, fetchPromise);
  
  try {
    return await fetchPromise;
  } finally {
    // Clean up if not already done
    if (activeRequests.get(requestKey) === fetchPromise) {
      activeRequests.delete(requestKey);
    }
  }
};

/**
 * Makes a GET request to the specified endpoint
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} [options] - Additional fetch options
 * @returns {Promise<any>} The parsed JSON response
 */
export const get = async (endpoint, options = {}) => {
  const response = await fetchWithTimeout(endpoint, {
    method: 'GET',
    ...options,
  });
  return response.json();
};

/**
 * Makes a POST request to the specified endpoint
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} [data] - The data to send in the request body
 * @param {Object} [options] - Additional fetch options
 * @returns {Promise<any>} The parsed JSON response
 */
export const post = async (endpoint, data = {}, options = {}) => {
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options,
  });
  return response.json();
};

/**
 * Makes a PUT request to the specified endpoint
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} [data] - The data to send in the request body
 * @param {Object} [options] - Additional fetch options
 * @returns {Promise<any>} The parsed JSON response
 */
export const put = async (endpoint, data = {}, options = {}) => {
  const response = await fetchWithTimeout(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options,
  });
  return response.json();
};

/**
 * Makes a DELETE request to the specified endpoint
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} [options] - Additional fetch options
 * @returns {Promise<any>} The parsed JSON response
 */
export const del = async (endpoint, options = {}) => {
  const response = await fetchWithTimeout(endpoint, {
    method: 'DELETE',
    ...options,
  });
  return response.json();
};
