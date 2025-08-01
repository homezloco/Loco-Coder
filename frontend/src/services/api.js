// Import configuration and services
import { API_BASE_URL, FALLBACK_URLS, TOKEN_KEYS } from './config';
import createAiService from '../api/modules/ai.js';

// Debug configuration
console.group('[API] Initializing API Service');
console.log('Base URL:', API_BASE_URL);
console.log('Fallback URLs:', FALLBACK_URLS);
console.log('Token Configuration:', TOKEN_KEYS);
console.groupEnd();

// Token management
let authToken = null;
let refreshToken = null;
let tokenExpiration = null;
let isRefreshing = false;
let refreshSubscribers = [];

// Track last token check time to prevent excessive logging
let lastTokenCheck = 0;

// Track current URL being used
let currentBaseUrl = API_BASE_URL;
let currentUrlIndex = 0;

/**
 * Get the current base URL, cycling through fallbacks if needed
 */
const getCurrentBaseUrl = () => {
  return currentBaseUrl;
};

/**
 * Try the next fallback URL
 */
const tryNextFallbackUrl = () => {
  if (FALLBACK_URLS.length === 0) return false;
  
  currentUrlIndex = (currentUrlIndex + 1) % FALLBACK_URLS.length;
  currentBaseUrl = FALLBACK_URLS[currentUrlIndex];
  
  console.warn(`[API] Trying fallback URL: ${currentBaseUrl}`);
  return true;
};

/**
 * Check if a token is expired or about to expire
 */
const isTokenExpired = (token, threshold = TOKEN_KEYS.refreshThreshold) => {
  if (!tokenExpiration) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = tokenExpiration - now;
  
  return timeUntilExpiry < threshold;
};

/**
 * Store token information
 */
const storeToken = (token, refreshTokenValue = null, expiresIn = null) => {
  if (!token) return;
  
  authToken = token;
  
  // Set token expiration if provided
  if (expiresIn) {
    tokenExpiration = Math.floor(Date.now() / 1000) + expiresIn;
  }
  
  // Store refresh token if provided
  if (refreshTokenValue) {
    refreshToken = refreshTokenValue;
    try {
      localStorage.setItem(TOKEN_KEYS.refreshKey, refreshTokenValue);
    } catch (e) {
      console.warn('Failed to store refresh token in localStorage:', e);
    }
  }
  
  // Store token in the appropriate storage
  try {
    if (TOKEN_KEYS.storageType === 'localStorage') {
      localStorage.setItem(TOKEN_KEYS.storageKey, token);
      if (expiresIn) {
        localStorage.setItem(`${TOKEN_KEYS.storageKey}_expires`, tokenExpiration);
      }
    } else if (TOKEN_KEYS.storageType === 'sessionStorage') {
      sessionStorage.setItem(TOKEN_KEYS.storageKey, token);
      if (expiresIn) {
        sessionStorage.setItem(`${TOKEN_KEYS.storageKey}_expires`, tokenExpiration);
      }
    }
  } catch (e) {
    console.warn('Failed to store token:', e);
  }
};

/**
 * Clear all authentication data
 */
const clearAuthData = () => {
  authToken = null;
  refreshToken = null;
  tokenExpiration = null;
  
  // Clear from all storage locations
  try {
    localStorage.removeItem(TOKEN_KEYS.storageKey);
    localStorage.removeItem(`${TOKEN_KEYS.storageKey}_expires`);
    localStorage.removeItem(TOKEN_KEYS.refreshKey);
    
    sessionStorage.removeItem(TOKEN_KEYS.storageKey);
    sessionStorage.removeItem(`${TOKEN_KEYS.storageKey}_expires`);
  } catch (e) {
    console.warn('Failed to clear auth data:', e);
  }
};

// Initialize auth token from available sources
async function initAuthToken() {
  console.group('[API] initAuthToken');
  try {
    // Skip if not in browser environment
    if (typeof window === 'undefined') {
      console.log('[API] Not in browser environment, skipping token initialization');
      return;
    }

    // Log storage availability
    console.log('[API] Storage availability:', {
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      document: typeof document !== 'undefined',
      documentCookie: typeof document !== 'undefined' && 'cookie' in document
    });

    // Check if we already have a valid token in memory
    if (authToken && !isTokenExpired(authToken)) {
      console.log('[API] Valid auth token already initialized in memory');
      return;
    }

    console.log('[API] Initializing auth token from available sources...');
    
    // Try to load token from storage based on configuration
    try {
      let token = null;
      let storedExpiration = null;
      
      // Try localStorage first if configured
      if (TOKEN_KEYS.storageType === 'localStorage' && typeof localStorage !== 'undefined') {
        token = localStorage.getItem(TOKEN_KEYS.storageKey);
        const expires = localStorage.getItem(`${TOKEN_KEYS.storageKey}_expires`);
        storedExpiration = expires ? parseInt(expires, 10) : null;
        
        if (token && storedExpiration) {
          const now = Math.floor(Date.now() / 1000);
          if (now >= storedExpiration) {
            console.log('[API] Stored token has expired');
            token = null;
            localStorage.removeItem(TOKEN_KEYS.storageKey);
            localStorage.removeItem(`${TOKEN_KEYS.storageKey}_expires`);
          }
        }
      }
        },
        set: (token) => {
          try {
            const cookieValue = `token=${encodeURIComponent(token)}; path=/; max-age=2592000; samesite=strict`;
            document.cookie = cookieValue;
            console.log('[API] Stored token in cookie');
          } catch (e) {
            console.error('[API] Error storing in cookie:', e);
            throw e;
          }
        }
      }
    ];

    // Try each source in order
    for (const source of tokenSources) {
      try {
        console.log(`[API] Checking token source: ${source.name}`);
        const token = source.get();
        
        if (token && typeof token === 'string' && token.split('.').length === 3) {
          console.log(`[API] Found valid JWT token in ${source.name}`);
          
          // Update in-memory token
          authToken = token;
          console.log('[API] Updated in-memory auth token');
          
          // Store in all token locations for consistency
          for (const dest of tokenSources) {
            if (dest !== source) {
              try {
                dest.set(token);
                console.log(`[API] Synced token to ${dest.name}`);
              } catch (setError) {
                console.warn(`[API] Failed to sync token to ${dest.name}:`, setError);
              }
            }
          }
          
          // Validate the token with the server (non-blocking)
          console.log('[API] Validating token with server...');
          validateToken(token)
            .then(isValid => {
              console.log(`[API] Token validation ${isValid ? 'succeeded' : 'failed'}`);
              if (!isValid) {
                console.warn('[API] Token validation failed, but keeping it for now');
              }
            })
            .catch(err => {
              console.error('[API] Error during token validation:', err);
            });
          
          console.log('[API] Token initialization complete');
          return;
        } else if (token) {
          console.warn(`[API] Invalid token format in ${source.name}:`, 
            token.length > 20 ? token.substring(0, 20) + '...' : token);
        }
      } catch (error) {
        console.warn(`[API] Error checking ${source.name}:`, error);
      }
    }
    
    // No valid token found
    console.log('[API] No valid auth token found in any source');
    
  } catch (error) {
    console.error('[API] Critical error during token initialization:', error);
  } finally {
    // Notify the app about auth state
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const isAuthenticated = !!authToken;
        console.log(`[API] Dispatching authStateChanged: ${isAuthenticated ? 'authenticated' : 'not authenticated'}`);
        window.dispatchEvent(new CustomEvent('authStateChanged', { 
          detail: { isAuthenticated } 
        }));
      }
    } catch (e) {
      console.error('[API] Error dispatching authStateChanged event:', e);
    }
    console.groupEnd();
  }
}

// Helper function to validate a token with the server
async function validateToken(token) {
  if (!token) return false;
  
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      skipAuth: true // Skip auth header for this request
    });
    
    if (!response.ok) {
      console.warn('[API] Token validation failed, clearing invalid token...');
      clearAuthToken();
      return false;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] Token validation successful');
    }
    return true;
    
  } catch (error) {
    console.error('[API] Error validating token:', error);
    // Don't clear the token on network errors, as the server might be down
    return false;
  }
}

// Clear all auth tokens from all storage locations
function clearAuthToken() {
  authToken = '';
  
  try {
    // Clear from all possible storage locations
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authToken');
    
    // Clear from cookies
    document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
  } catch (error) {
    console.error('[API] Error clearing auth token:', error);
  }
};

// Call the initialization function immediately when the module loads
initAuthToken();

// Also re-initialize when the page becomes visible again (in case of token changes in other tabs)
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('[API] Page became visible, reinitializing token...');
      initAuthToken();
    }
  });
}

// Request cache with TTL
const requestCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting state
let rateLimitReset = 0;
let remainingRequests = 30; // Default rate limit
let isRefreshingToken = false;
let refreshPromise = null;

// Debounce timers
const debounceTimers = new Map();

// Clean up expired cache entries
const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, { timestamp }] of requestCache.entries()) {
    if (now - timestamp > CACHE_TTL) {
      requestCache.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanExpiredCache, 60 * 1000);

// Helper to clear cache after TTL
const clearCacheAfterTTL = (key) => {
  setTimeout(() => {
    requestCache.delete(key);
  }, CACHE_TTL);
};

// Debounce function
const debounce = (key, fn, delay = 300) => {
  if (debounceTimers.has(key)) {
    clearTimeout(debounceTimers.get(key));
  }
  return new Promise((resolve) => {
    debounceTimers.set(key, setTimeout(async () => {
      const result = await fn();
      debounceTimers.delete(key);
      resolve(result);
    }, delay));
  });
};

/**
 * Enhanced fetch wrapper with timeout, retries, rate limiting, and auth handling
 * @param {string} resource - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} [options.timeout=10000] - Request timeout in ms
 * @param {number} [options.maxRetries=2] - Maximum number of retry attempts
 * @param {number} [options.retryDelay=1000] - Base delay between retries in ms
 * @param {boolean} [options.skipAuth=false] - Skip auth header for auth endpoints
 * @param {Function} [options.onRetry] - Callback before each retry
 * @returns {Promise<Response>} - Fetch response
 */
async function fetchWithTimeout(resource, options = {}) {
  const { 
    timeout = 30000,      // 30 second default timeout (increased from 10s)
    maxRetries = 1,       // Reduced retry attempts to fail faster to local fallback
    retryDelay = 1000,    // Base delay between retries
    skipAuth = false,     // Skip auth for auth endpoints
    onRetry = null,       // Optional retry callback
    ...fetchOptions 
  } = options;
  
  let lastError;
  let attempt = 0;
  let response = null;
  
  // Generate a unique request ID for tracking
  const requestId = Math.random().toString(36).substring(2, 9);
  const isAbsoluteUrl = resource.startsWith('http');
  const url = isAbsoluteUrl ? resource : `${API_BASE_URL}${resource}`;
  
  const logPrefix = `[API][${requestId}]`;
  
  // Check if we're offline
  const isOffline = () => {
    return !navigator.onLine;
  };

  // Log request details (excluding sensitive data)
  const logRequest = () => {
    if (isOffline()) {
      console.warn(`${logPrefix} Device is offline, will attempt to use cached data`);
      return;
    }
    
    const safeHeaders = { ...(fetchOptions.headers || {}) };
    if (safeHeaders.Authorization) {
      safeHeaders.Authorization = 'Bearer [REDACTED]';
    }
    
    console.log(`${logPrefix} ${fetchOptions.method || 'GET'} ${url}`, {
      attempt: `${attempt}/${maxRetries + 1}`,
      timeout: `${timeout}ms`,
      headers: safeHeaders,
      skipAuth,
      hasBody: !!fetchOptions.body
    });
  };
  
  // Handle rate limiting
  const checkRateLimit = () => {
    const now = Date.now();
    if (now < rateLimitReset) {
      const waitTime = rateLimitReset - now + 1000; // 1s buffer
      console.warn(`${logPrefix} Rate limited. Waiting ${waitTime}ms...`);
      return new Promise(resolve => setTimeout(resolve, waitTime));
    }
    return Promise.resolve();
  };
  
  // Handle retry with exponential backoff
  const waitForRetry = (error) => {
    lastError = error;
    
    if (attempt <= maxRetries) {
      const delay = Math.min(
        retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000, // jitter
        30000 // max 30s delay
      );
      
      console.warn(`${logPrefix} Attempt ${attempt} failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`);
      
      if (typeof onRetry === 'function') {
        onRetry(attempt, delay, error);
      }
      
      return new Promise(resolve => setTimeout(resolve, delay));
    }
    
    return Promise.reject(error);
  };
  
  // Main request loop
  while (attempt <= maxRetries) {
    attempt++;
    
    // Check if we're offline before making the request
    if (isOffline()) {
      throw new Error('Device is offline');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      // Wait if rate limited
      await checkRateLimit();
      
      // Prepare headers
      const headers = new Headers({
        'Accept': 'application/json',
        'X-Request-Id': requestId,
        'X-Requested-With': 'XMLHttpRequest',
        ...(fetchOptions.headers || {})
      });
      
      // Set Content-Type for requests with body
      if (fetchOptions.body && !headers.has('Content-Type')) {
        if (fetchOptions.body instanceof FormData) {
          // Don't set Content-Type for FormData, let the browser set it with the boundary
        } else if (typeof fetchOptions.body === 'string') {
          // If it's a string, assume JSON
          headers.set('Content-Type', 'application/json');
        } else {
          headers.set('Content-Type', 'application/json');
        }
      }
      
      // Handle authentication
      if (!skipAuth) {
        try {
          // Get the token from the most reliable source
          let token = headers.get('Authorization');
          
          if (!token) {
            if (authToken) {
              token = `Bearer ${authToken}`;
            } else {
              // Use the module-level getAuthToken function directly
              const tokenFromStorage = await api.getAuthToken();
              if (tokenFromStorage) {
                token = `Bearer ${tokenFromStorage}`;
              }
            }
          }
          
          if (!token && !url.includes('/auth/') && !url.includes('/health')) {
            console.warn('[API] No authentication token available for protected endpoint:', url);
            const error = new Error('Authentication required');
            error.code = 'AUTH_REQUIRED';
            error.status = 401;
            throw error;
          }
          
          if (token) {
            const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers.set('Authorization', authHeader);
            console.log('[API] Added authorization header to request');
          } else if (url.includes('/auth/')) {
            console.log('[API] No auth token but endpoint appears to be an auth endpoint, proceeding');
          }
        } catch (authError) {
          console.error('[API] Error during auth token processing:', authError);
          if (!url.includes('/auth/')) {
            throw authError; // Re-throw for non-auth endpoints
          }
        }
      }
      
      // Log the request
      logRequest();
      
      // Make the request
      response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers,
        credentials: skipAuth ? 'same-origin' : 'include',
        mode: 'cors',
        cache: 'no-store',
        redirect: 'follow',
        referrerPolicy: 'no-referrer-when-downgrade'
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      clearTimeout(timeoutId);
      
      // Update rate limiting info
      if (response.headers.has('X-RateLimit-Remaining')) {
        remainingRequests = parseInt(response.headers.get('X-RateLimit-Remaining'), 10);
        console.debug(`${logPrefix} Rate limit remaining: ${remainingRequests}`);
      }
      
      if (response.headers.has('X-RateLimit-Reset')) {
        const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'), 10) * 1000;
        if (resetTime > Date.now()) {
          rateLimitReset = resetTime;
          console.debug(`${logPrefix} Rate limit resets at: ${new Date(resetTime).toISOString()}`);
        }
      }
      
      // Handle auth errors specifically
      if (response.status === 401) {
        // Clear invalid auth data
        authToken = '';
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
        
        const error = new Error('Session expired or invalid');
        error.code = 'AUTH_EXPIRED';
        error.status = 401;
        
        // Notify the app about auth state change
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { isAuthenticated: false } 
          }));
        }
        
        throw error;
      }
      
      // Handle rate limiting from response
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '5';
        rateLimitReset = Date.now() + (parseInt(retryAfter, 10) * 1000);
        
        const error = new Error('Rate limit exceeded');
        error.code = 'RATE_LIMIT_EXCEEDED';
        error.retryAfter = parseInt(retryAfter, 10);
        error.retryAt = new Date(rateLimitReset).toISOString();
        
        throw error;
      }
      
      // If we get here, the request was successful
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle abort errors specifically
      if (error.name === 'AbortError') {
        // Create a new error object to avoid modifying read-only properties
        const abortError = new Error(`Request timed out after ${timeout}ms`);
        abortError.name = 'RequestTimeoutError';
        abortError.code = 'REQUEST_TIMEOUT';
        error = abortError;
      }
      
      // If this was the last attempt, rethrow the error
      if (attempt > maxRetries) {
        console.error(`${logPrefix} All ${maxRetries + 1} attempts failed. Last error:`, {
          message: error.message,
          code: error.code,
          status: error.status,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        
        // Enhance the error with response data if available
        if (response) {
          try {
            const errorData = await response.clone().json().catch(() => ({}));
            error.response = {
              status: response.status,
              statusText: response.statusText,
              url: response.url,
              data: errorData
            };
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
        
        throw error;
      }
      
      // Wait before retrying
      await waitForRetry(error);
    }
  }
  
  // If we get here, all retries failed
  console.error(`[API] All retries failed for ${resource}`, lastError);
  throw lastError || new Error('Request failed after multiple attempts');
}

// Helper function to handle form data
function createFormData(data) {
  const formData = new FormData();
  if (!data) return formData;
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File || value instanceof Blob) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          formData.append(`${key}[]`, item);
        });
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }
  });
  return formData;
}
const api = {
  // Auth methods
  login: async function(username, password) {
    // Input validation
    const sanitizedUsername = username?.trim();
    if (!sanitizedUsername) {
      const error = new Error('Username is required');
      error.code = 'MISSING_USERNAME';
      throw error;
    }
    
    if (!password) {
      const error = new Error('Password is required');
      error.code = 'MISSING_PASSWORD';
      throw error;
    }

    // Rate limiting check
    const loginAttempts = parseInt(localStorage.getItem('loginAttempts') || '0', 10);
    const lastAttempt = parseInt(localStorage.getItem('lastLoginAttempt') || '0', 10);
    const now = Date.now();
    
    if (loginAttempts >= 5 && (now - lastAttempt) < 5 * 60 * 1000) {
      const error = new Error('Too many login attempts. Please try again later.');
      error.code = 'RATE_LIMIT_EXCEEDED';
      error.retryAfter = Math.ceil((5 * 60 * 1000 - (now - lastAttempt)) / 1000);
      throw error;
    }

    console.log(`[API] Login attempt for user: ${sanitizedUsername}`);
    
    try {
      // Track login attempts
      localStorage.setItem('loginAttempts', (loginAttempts + 1).toString());
      localStorage.setItem('lastLoginAttempt', now.toString());
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          username: sanitizedUsername,
          password: password
        }),
        credentials: 'include',
        skipAuth: true,
        timeout: 15000, // 15 second timeout for login
        maxRetries: 2
      });

      const responseData = await response.json().catch(() => ({
        message: 'Invalid server response',
        code: 'INVALID_RESPONSE'
      }));
      
      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          code: responseData?.code || 'LOGIN_FAILED',
          message: responseData?.message || 'Login failed'
        };
        
        console.error('[API] Login failed:', errorDetails);
        
        const error = new Error(errorDetails.message);
        error.code = errorDetails.code;
        error.status = errorDetails.status;
        error.details = errorDetails;
        
        throw error;
      }
      
      // Reset login attempts on successful login
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('lastLoginAttempt');
      
      // Extract and validate token
      const token = responseData.token || responseData.access_token;
      if (!token) {
        const error = new Error('No authentication token received from server');
        error.code = 'NO_TOKEN';
        error.response = responseData;
        throw error;
      }
      
      // Store the token
      api.setAuthToken(token);
      
      // Store in localStorage if available
      if (typeof localStorage !== 'undefined') {
        try {
          console.log('[API] Storing token in localStorage...');
          // Store token and user data
          localStorage.setItem(TOKEN_STORAGE_KEY, token);
          console.log('[API] Token stored in localStorage');
          
          // Verify token was stored correctly
          const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
          if (storedToken !== token) {
// ... (rest of the code remains the same)
            console.error('[API] Token verification failed: stored token does not match');
          } else {
            console.log('[API] Token verified in localStorage');
          }
          
          // Store minimal user data
          if (responseData.user) {
            const { id, username, email, role } = responseData.user;
            const userData = { id, username, email, role };
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('[API] User data stored in localStorage');
          }
          
          console.log('[API] Authentication data stored successfully');
          console.log('[API] Current localStorage contents:', Object.entries(localStorage));
        } catch (storageError) {
          console.error('[API] Error storing authentication data:', storageError);
          // Continue with login even if storage fails
        }
      } else {
        console.error('[API] localStorage is not available in this environment');
      }
      
      // Validate the token by fetching user info
      try {
        const userResponse = await fetchWithTimeout(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!userResponse.ok) {
          throw new Error('Failed to validate user session');
        }
        
        const userData = await userResponse.json();
        responseData.user = userData; // Update with full user data
        
        // Update stored user data with validated information
        if (typeof localStorage !== 'undefined') {
          const { id, username, email, role } = userData;
          localStorage.setItem('user', JSON.stringify({ id, username, email, role }));
        }
      } catch (validationError) {
        console.warn('[API] Token validation warning:', validationError);
        // Continue with login even if validation fails
      }
      
      // Notify the application about the auth state change
      if (typeof window !== 'undefined') {
        const authEvent = new CustomEvent('authStateChanged', { 
          detail: { 
            isAuthenticated: true,
            user: responseData.user || { username: sanitizedUsername },
            token: token,
            timestamp: new Date().toISOString()
          } 
        });
        window.dispatchEvent(authEvent);
      }
      
      console.log(`[API] Login successful for user: ${sanitizedUsername}`);
      
      return {
        success: true,
        token: token,
        user: responseData.user || { username: sanitizedUsername },
        message: 'Login successful',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('[API] Login error:', {
        error: error.message,
        code: error.code,
        status: error.status,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      // Enhance error with more context
      if (!error.code) {
        error.code = 'LOGIN_ERROR';
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem('auth_credentials');
      }
      authToken = '';
      
      // Re-throw the error for the caller to handle
      throw error;
    }
  },

  /**
   * Logs out the current user by clearing authentication state
   * @returns {Promise<Object>} Result of the logout operation
   */
  async logout() {
    // Store the current token before clearing it
    const token = authToken;
    
    // Clear in-memory token first to prevent race conditions
    authToken = '';
    
    // Clear all auth-related data from storage
    const clearAuthData = () => {
      try {
        if (typeof localStorage !== 'undefined') {
          // Clear all auth-related items
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          localStorage.removeItem('auth_credentials');
          localStorage.removeItem('session_expiry');
          
          // Clear any cached auth data
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('auth_') || key.endsWith('_token')) {
              localStorage.removeItem(key);
            }
          });
        }
        
        // Clear session storage as well
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
        
        return true;
      } catch (error) {
        console.error('[API] Error clearing auth data:', error);
        return false;
      }
    };
    
    // Clear local auth data immediately for better UX
    const localClearSuccess = clearAuthData();
    
    // Notify the application about the auth state change
    if (typeof window !== 'undefined') {
      const authEvent = new CustomEvent('authStateChanged', { 
        detail: { 
          isAuthenticated: false,
          timestamp: new Date().toISOString()
        } 
      });
      window.dispatchEvent(authEvent);
    }
    
    // If we have a token, try to invalidate it on the server
    if (token) {
      try {
        await fetchWithTimeout(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          skipAuth: true,
          timeout: 5000 // Shorter timeout for logout
        }).catch(() => {
          // Ignore network errors during logout
          return { ok: true };
        });
      } catch (error) {
        console.warn('[API] Error during server-side logout:', error);
        // Continue with local cleanup even if server logout fails
      }
    }
    
    return {
      success: true,
      localClearSuccess,
      timestamp: new Date().toISOString(),
      message: 'Logout completed successfully'
    };
  },

  // Health check
  async healthCheck() {
    return fetchWithTimeout(`${API_BASE_URL}/health`, { 
      timeout: 3000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  },

  // Ollama API
  async testOllamaConnection(prompt = 'Test connection') {
    try {
      console.log('[Ollama] Testing connection with prompt:', prompt);
      
      // First check if Ollama server is reachable
      const healthCheck = await fetchWithTimeout(`${API_BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000, // Shorter timeout for health check
        maxRetries: 1
      });
      
      console.log('[Ollama] Health check:', healthCheck);
      
      // Then test the chat endpoint
      const response = await fetchWithTimeout(`${API_BASE_URL}/chat`, {
        method: 'POST',
        body: JSON.stringify({ 
          prompt,
          model: 'codellama:instruct', // Default model
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_ctx: 2048
          }
        }),
        timeout: 30000, // 30s timeout for generation
        maxRetries: 1
      });
      
      console.log('[Ollama] Chat response:', response);
      return response;
      
    } catch (error) {
      console.error('[Ollama] Connection test failed:', error);
      
      // Provide more specific error messages
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to Ollama server. Make sure it\'s running.');
      } else if (error.message.includes('timed out')) {
        throw new Error('Ollama server is not responding. It may be busy or not properly configured.');
      } else if (error.message.includes('404')) {
        throw new Error('Ollama endpoint not found. The API may have changed.');
      }
      
      throw error;
    }
  },

  // Project management
  async getProjects(forceRefresh = false) {
    const cacheKey = 'getProjects';
    
    // Return cached response if available and not forcing refresh
    if (!forceRefresh && requestCache.has(cacheKey)) {
      const { data, timestamp } = requestCache.get(cacheKey);
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log('[API] Returning cached projects');
        return data;
      }
    }
    
    // Get the auth token but don't fail if not available
    const token = await this.getAuthToken();
    
    // Prepare headers with auth if available
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('[API] No authentication token available for getProjects - proceeding without authentication');
    }
    
    // Use debounced version to prevent rapid successive calls
    const fetchProjects = async () => {
      // Try the primary URL first (localhost)
      try {
        const url = `${API_BASE_URL}/api/v1/projects`;
        console.log(`[API] Fetching projects from ${url}`);
        const response = await fetchWithTimeout(url, { 
          headers: headers,
          skipAuth: false, // Always require auth for projects endpoint
          credentials: 'include' // Include cookies for session-based auth
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const result = Array.isArray(data) ? data : [];
        
        // Cache the successful response
        requestCache.set(cacheKey, { 
          data: result, 
          timestamp: Date.now() 
        });
        clearCacheAfterTTL(cacheKey);
        
        console.log('[API] Received projects data');
        return result;
      } catch (error) {
        console.warn('[API] Primary endpoint failed, trying fallbacks...', error);
      }
      
      // If primary URL fails, try fallbacks
      for (const baseUrl of FALLBACK_URLS) {
        try {
          const url = baseUrl.startsWith('http') 
            ? `${baseUrl}/api/v1/projects`
            : `${baseUrl}/v1/projects`;
            
          console.log(`[API] Trying fallback: ${url}`);
          const response = await fetchWithTimeout(url, {
            headers: headers,
            skipAuth: false, // Always require auth for projects endpoint
            credentials: 'include' // Include cookies for session-based auth
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          const result = Array.isArray(data) ? data : [];
          
          // Cache the successful response
          requestCache.set(cacheKey, { 
            data: result, 
            timestamp: Date.now() 
          });
          clearCacheAfterTTL(cacheKey);
          
          console.log('[API] Success with fallback URL:', baseUrl);
          return result;
        } catch (error) {
          console.warn(`[API] Fallback ${baseUrl} failed:`, error.message);
        }
      }
      
      console.error('[API] All endpoints failed for getProjects');
      return [];
    };
    
    // Use debounce for rapid successive calls
    return debounce(cacheKey, fetchProjects, 300);
  },

  async getProject(projectId) {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/projects/${projectId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching project ${projectId}:`, error);
      throw error; // Re-throw to allow handling in the component
    }
  },

  /**
   * Creates a new project with the provided data
   * @param {Object} projectData - Project creation data
   * @param {string} projectData.name - Project name (required)
   * @param {string} [projectData.description] - Project description
   * @param {string} [projectData.template] - Project template type
   * @param {Object} [projectData.config] - Project configuration
   * @param {Array} [projectData.tags] - Project tags
   * @returns {Promise<Object>} The created project data
   */
  async createProject(projectData) {
    console.group('[API] createProject');
    try {
      // Input validation
      if (!projectData || !projectData.name) {
        const error = new Error('Project name is required');
        error.code = 'MISSING_PROJECT_NAME';
        console.error('[API] Invalid project data:', { projectData, error });
        throw error;
      }

      // Log project data (sensitive data redacted)
      console.log('[API] Creating project with data:', {
        ...projectData,
        config: projectData.config ? '[CONFIG_REDACTED]' : undefined,
        name: projectData.name
      });

      // Get auth token with detailed logging
      console.log('[API] Retrieving auth token for project creation...');
      const token = await this.getAuthToken();
      
      // Log token status for debugging
      const tokenInfo = {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPrefix: token ? `${token.substring(0, 5)}...` : 'none',
        storageStatus: {
          localStorage: typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_STORAGE_KEY) ? 'exists' : 'not found',
          sessionStorage: typeof sessionStorage !== 'undefined' && sessionStorage.getItem('token') ? 'exists' : 'not found',
          cookie: typeof document !== 'undefined' && document.cookie.includes('token=') ? 'exists' : 'not found'
        },
        inMemoryToken: !!authToken,
        timestamp: new Date().toISOString()
      };
      
      console.log('[API] Auth token status:', tokenInfo);
      
      // Validate token presence
      if (!token) {
        const error = new Error('Authentication required. Please sign in to create a project.');
        error.code = 'AUTH_REQUIRED';
        error.redirectTo = '/login';
        console.error('[API] Authentication failed:', error);
        throw error;
      }

      // Prepare request data with defaults
      const requestData = {
        name: projectData.name.trim(),
        description: (projectData.description || '').trim(),
        project_type: projectData.template || 'web',
        config: projectData.config || {},
        tags: Array.isArray(projectData.tags) ? projectData.tags : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Log request details (sensitive data redacted)
      console.log('[API] Sending create project request to:', `${API_BASE_URL}/api/v1/projects`);
      console.log('[API] Request payload (sanitized):', {
        ...requestData,
        config: requestData.config ? '[CONFIG_REDACTED]' : undefined
      });
      
      // Make the API request
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest',
          'X-Request-ID': `frontend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify(requestData),
        credentials: 'include', // Include cookies for session-based auth
        timeout: 30000, // 30 second timeout for project creation
        maxRetries: 3,
        retryDelay: 2000
      });
      
      // Log response status
      console.log('[API] Create project response status:', response.status);
      
      // Handle error responses
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('[API] Error creating project:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            headers: Object.fromEntries(response.headers.entries())
          });
        } catch (e) {
          console.error('[API] Error parsing error response:', e);
          errorData = { 
            detail: 'Failed to create project',
            status: response.status,
            statusText: response.statusText
          };
        }
        
        const error = new Error(errorData.detail || 'Failed to create project');
        error.code = errorData.code || 'PROJECT_CREATION_FAILED';
        error.status = response.status;
        error.details = errorData;
        
        // Handle specific error cases
        if (response.status === 401) {
          error.code = 'UNAUTHORIZED';
          error.redirectTo = '/login';
          // Clear invalid token
          this.clearAuthToken();
        } else if (response.status === 409) {
          error.code = 'PROJECT_EXISTS';
        }
        
        throw error;
      }
      
      // Process successful response
      try {
        const result = await response.json();
        console.log('[API] Project created successfully:', {
          id: result.id,
          name: result.name,
          project_type: result.project_type,
          created_at: result.created_at
        });
        
        // Invalidate projects cache
        requestCache.delete('projects');
        
        return result;
      } catch (e) {
        console.error('[API] Error parsing success response:', e);
        const error = new Error('Failed to parse project creation response');
        error.code = 'INVALID_RESPONSE';
        error.originalError = e;
        throw error;
      }
    } catch (error) {
      // Enhance error with additional context if not already present
      if (!error.code) {
        error.code = 'UNKNOWN_ERROR';
      }
      
      console.error('[API] Error in createProject:', {
        error: error.message,
        code: error.code,
        stack: error.stack,
        projectName: projectData?.name,
        timestamp: new Date().toISOString()
      });
      
      // Re-throw with enhanced error information
      throw error;
    } finally {
      console.groupEnd();
    }
  },

  async updateProject(projectId, updates) {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('[API] Error updating project:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
        } catch (e) {
          console.error('[API] Error parsing error response:', e);
          errorData = { detail: 'Failed to update project' };
        }
        throw new Error(errorData.detail || 'Failed to update project');
      }
      
      try {
        const result = await response.json();
        console.log('[API] Project updated successfully:', result);
        return result;
      } catch (e) {
        console.error('[API] Error parsing success response:', e);
        throw new Error('Failed to parse project update response');
      }
    } catch (error) {
      console.error(`Error updating project ${projectId}:`, error);
      throw error;
    }
  },

  async deleteProject(projectId) {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete project');
      }

      return true;
    } catch (error) {
      console.error(`Error deleting project ${projectId}:`, error);
      throw error;
    }
  },

  // File operations
  async getProjectFiles(projectId) {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/project/${projectId}/files`);
      if (!response.ok) {
        throw new Error(`Failed to fetch project files: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching files for project ${projectId}:`, error);
      return [];
    }
  },

  async readFile(projectId, filePath) {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/project/file/read`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: projectId,
            file_path: filePath,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.content || '';
    } catch (error) {
      console.error(`Error reading file ${filePath} in project ${projectId}:`, error);
      throw error;
    }
  },

  async writeFile(projectId, filePath, content) {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/project/file/write`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: projectId,
            file_path: filePath,
            content: content,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to write file');
      }

      return await response.json();
    } catch (error) {
      console.error(`Error writing to file ${filePath} in project ${projectId}:`, error);
      throw error;
    }
  },

  // Templates
  async getTemplates() {
    return fetchWithTimeout(`${API_BASE_URL}/templates`);
  },

  // Execute code
  async executeCode(code, language = 'python') {
    return fetchWithTimeout(`${API_BASE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: `code.${language}`,
        content: code
      })
    });
  },

  // Set auth token (for testing or manual token management)
  setAuthToken: function(token) {
    console.group('[API] setAuthToken');
    try {
      console.log('Token info:', { 
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        currentInMemory: authToken ? '***' : 'none',
        storageAvailable: {
          localStorage: typeof localStorage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined',
          document: typeof document !== 'undefined'
        }
      });
      
      if (!token) {
        console.warn('[API] Clearing authentication');
        authToken = '';
        
        // Clear from all storage locations
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            console.log('[API] Removed token from localStorage');
          } catch (e) {
            console.error('[API] Error removing token from localStorage:', e);
          }
        }
        
        if (typeof sessionStorage !== 'undefined') {
          try {
            sessionStorage.removeItem('token');
            console.log('[API] Removed token from sessionStorage');
          } catch (e) {
            console.error('[API] Error removing token from sessionStorage:', e);
          }
        }
        
        if (typeof document !== 'undefined' && document.cookie) {
          try {
            document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            console.log('[API] Removed token from cookies');
          } catch (e) {
            console.error('[API] Error removing token from cookies:', e);
          }
        }
        
        return;
      }
      
      // Update in-memory token
      authToken = token;
      console.log('[API] Updated in-memory token');
      
      // Store in all available storage locations
      const storageTargets = [
        {
          name: 'localStorage',
          set: (t) => localStorage.setItem('token', t),
          get: () => localStorage.getItem('token')
        },
        {
          name: 'sessionStorage',
          set: (t) => sessionStorage.setItem('token', t),
          get: () => sessionStorage.getItem('token')
        },
        {
          name: 'cookie',
          set: (t) => {
            document.cookie = `token=${encodeURIComponent(t)}; path=/; max-age=2592000; samesite=strict`;
          },
          get: () => {
            const match = document.cookie.match(/token=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : null;
          }
        }
      ];
      
      // Update all storage locations and verify
      for (const target of storageTargets) {
        try {
          if (typeof target.set === 'function') {
            target.set(token);
            console.log(`[API] Stored token in ${target.name}`);
            
            // Verify storage
            const storedToken = target.get();
            if (storedToken !== token) {
              console.error(`[API] Token verification failed for ${target.name}: stored token does not match`);
            } else {
              console.log(`[API] ${target.name} storage verified`);
            }
          }
        } catch (error) {
          console.error(`[API] Failed to store token in ${target.name}:`, error);
        }
      }
      
      // Notify other parts of the app
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const event = new CustomEvent('authTokenUpdated', { 
          detail: { 
            token,
            timestamp: new Date().toISOString() 
          } 
        });
        window.dispatchEvent(event);
        console.log('[API] Dispatched authTokenUpdated event');
      }
    } catch (error) {
      console.error('[API] Error in setAuthToken:', error);
    } finally {
      console.groupEnd();
    }
  },

  // Helper function to get auth token from various sources
  getAuthToken: async () => {
    console.group('[API] getAuthToken');
    try {
      // If we already have a valid token in memory, use it
      if (authToken) {
        console.log('[API] Using in-memory auth token');
        return authToken;
      }

      // Token sources array with proper formatting
      const tokenSources = [
        {
          name: 'localStorage',
          description: `localStorage.${TOKEN_STORAGE_KEY}`,
          get: () => localStorage.getItem(TOKEN_STORAGE_KEY)
        },
        {
          name: 'sessionStorage',
          description: `sessionStorage.${TOKEN_STORAGE_KEY}`,
          get: () => sessionStorage.getItem(TOKEN_STORAGE_KEY)
        },
        { 
          name: 'cookie',
          description: 'document.cookie',
          get: () => {
            if (typeof document !== 'undefined') {
              const match = document.cookie.match(/token=([^;]+)/);
              return match ? decodeURIComponent(match[1]) : null;
            }
            return null;
          }
        }
      ];

      // Try each source in order
      for (const source of tokenSources) {
        try {
          console.log(`[API] Checking token source: ${source.name}`);
          const token = source.get();
          
          if (token && typeof token === 'string' && token.split('.').length === 3) {
            console.log(`[API] Found valid JWT token in ${source.name}`);
            
            // Cache the token in memory for future use
            authToken = token;
            
            // Ensure the token is in all storage locations for consistency
            try {
              localStorage.setItem(TOKEN_STORAGE_KEY, token);
              sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
              document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=2592000; samesite=strict`;
              console.log('[API] Synced token across all storage locations');
            } catch (storageError) {
              console.warn('[API] Error syncing token across storage locations:', storageError);
            }
            
            // Validate the token with the server if we're online
            if (navigator.onLine) {
              try {
                const isValid = await validateToken(token);
                if (!isValid) {
                  console.warn('[API] Token validation failed, clearing invalid token');
                  clearAuthToken();
                  return null;
                }
              } catch (validationError) {
                console.warn('[API] Error validating token, proceeding with cached token:', validationError);
                // Continue with the token even if validation fails (might be offline)
              }
            }
            
            console.log('[API] Returning valid auth token');
            return token;
          }
        } catch (error) {
          console.warn(`[API] Error checking ${source.name}:`, error);
        }
      }
      
      console.log('[API] No valid auth token found in any source');
      return null;
    } finally {
      console.groupEnd();
    }
    
    return null;
  },
  
  // Set auth token (for testing or manual token management)
  setAuthToken: (token) => {
    try {
      console.group('[API] Setting auth token');
      
      if (!token) {
        console.log('[API] No token provided, clearing auth token');
        clearAuthToken();
        return;
      }
      
      // Validate token format (JWT has 3 parts)
      if (typeof token !== 'string' || token.split('.').length !== 3) {
        console.error('[API] Invalid token format');
        throw new Error('Invalid token format');
      }
      
      // Store in memory
      authToken = token;
      
      // Persist to storage using consistent key
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      
      // Set cookie (if in browser)
      if (typeof document !== 'undefined') {
        document.cookie = `${TOKEN_STORAGE_KEY}=${token}; path=/; max-age=2592000; samesite=lax`; // 30 days
      }
      
      // Notify listeners
      const event = new CustomEvent('authTokenUpdated', { 
        detail: { 
          token,
          timestamp: new Date().toISOString() 
        } 
      });
      window.dispatchEvent(event);
      
      console.log('[API] Auth token set successfully');
    } catch (error) {
      console.error('[API] Error setting auth token:', error);
      throw error;
    } finally {
      console.groupEnd();
    }
  },
  
  // Get current auth token
  getAuthToken: () => {
    return authToken;
  },
  
  // Clear authentication token
  clearAuthToken: () => {
    return clearAuthToken();
  }
};

// Add AI service to the API client
// The imported aiService is already an instance, so we can attach it directly
api.ai = createAiService;

// Add waitForAiService method to the API client
api.waitForAiService = async () => {
  if (api.ai && typeof api.ai.waitForAiService === 'function') {
    return api.ai.waitForAiService();
  }
  
  // Fallback implementation if the method is not available on the AI service
  return new Promise((resolve, reject) => {
    const check = () => {
      if (api.ai) {
        resolve(api.ai);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
    
    // Add a timeout
    setTimeout(() => {
      if (!api.ai) {
        reject(new Error('Timeout waiting for AI service to initialize'));
      }
    }, 5000);
  });
};

// Make the API client available globally for token management
if (typeof window !== 'undefined') {
  window.api = api;
  
  // For debugging
  window.__api = api;
  
  // Log AI service attachment
  console.log('[API] AI service attached to API client:', {
    hasAiService: !!api.ai,
    aiMethods: api.ai ? Object.keys(api.ai) : []
  });
}

export { api };
export default api;
