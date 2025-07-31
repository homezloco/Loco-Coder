import { API_BASE_URL, FALLBACK_URLS } from '../config';
import { getAuthToken } from '../auth/token';

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
    timeout = 10000,
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
    return activeRequests.get(requestKey);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Add auth header if needed
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${token}`,
      };
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
    if (attempt > maxRetries) break;
    
    const url = resource.startsWith('http') ? resource : `${baseUrl}${resource}`;
    
    try {
      const response = await fetch(url, fetchOptions);
      
      // If we get a 401, clear the auth token and throw
      if (response.status === 401) {
        await import('../auth').then(({ logout }) => logout());
        throw new Error('Session expired. Please log in again.');
      }
      
      // If successful, clear the active request and return the response
      if (response.ok || attempt >= maxRetries) {
        clearTimeout(timeoutId);
        activeRequests.delete(requestKey);
        return response;
      }
      
      // If not successful, throw to trigger retry
      throw new Error(`HTTP error! status: ${response.status}`);
      
    } catch (error) {
      lastError = error;
      attempt++;
      
      // Don't retry on aborted requests or 4xx errors (except 429)
      if (error.name === 'AbortError' || 
          (error.message.includes('40') && !error.message.includes('429'))) {
        break;
      }
      
      // Call the onRetry callback if provided
      if (onRetry) {
        onRetry(attempt, error);
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt <= maxRetries) {
        await new Promise(resolve => 
          setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
        );
      }
    }
  }
  
  // Clean up and throw the last error
  clearTimeout(timeoutId);
  activeRequests.delete(requestKey);
  
  throw lastError || new Error('Request failed with no error information');
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
