import { TOKEN_KEYS } from '../config';

/**
 * @typedef {Object} TokenInfo
 * @property {string} token - The JWT token
 * @property {number} [exp] - Optional expiration timestamp
 */

// Debug log
console.log('[Auth] Token module loading with TOKEN_KEYS:', TOKEN_KEYS);

// In-memory token cache
let authToken = {
  value: null,
  expires: null,
  lastChecked: null
};

// Track token operations to prevent redundant calls
let tokenOperations = {
  clearCount: 0,
  lastClear: null,
  setCount: 0,
  lastSet: null,
  getCount: 0,
  lastGet: null
};

/**
 * Parses a JWT token to extract its payload
 * @param {string} token - The JWT token to parse
 * @returns {Object|null} The decoded token payload or null if invalid
 */
const parseToken = (token) => {
  if (!token) return null;
  
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

/**
 * Checks if a token is expired
 * @param {number} exp - Token expiration timestamp (in seconds)
 * @returns {boolean} True if token is expired or invalid
 */
const isTokenExpired = (exp) => {
  if (!exp) return true;
  return Date.now() >= exp * 1000;
};

/**
 * Stores the authentication token in memory and persistent storage
 * @param {string} token - The JWT token to store
 * @param {boolean} [remember=true] - Whether to persist in localStorage (true) or sessionStorage (false)
 * @returns {boolean} True if storage was successful, false otherwise
 */
export const setAuthToken = (token, remember = true) => {
  try {
    // Track token setting operations
    tokenOperations.setCount++;
    tokenOperations.lastSet = Date.now();
    
    if (!token) {
      return clearAuthToken();
    }
    
    // If token is the same as current token, don't do anything
    if (authToken.value === token) {
      return true;
    }

    const decoded = parseToken(token);
    if (!decoded) {
      console.error('Invalid token format');
      return false;
    }

    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : null;
    
    // Update in-memory cache
    authToken = {
      value: token,
      expires: expiresAt?.getTime() || null
    };
    
    // Store in appropriate storage
    const storage = remember ? localStorage : sessionStorage;
    
    try {
      // Store token in localStorage for persistence
      if (remember) {
        localStorage.setItem(TOKEN_KEYS.storageKey, token);
      }
      
      // For session-only tokens, store in sessionStorage as well
      if (!remember) {
        sessionStorage.setItem(TOKEN_KEYS.storageKey, token);
      }
      
      // Set HTTP-only cookie for API requests
      if (typeof document !== 'undefined') {
        const expires = expiresAt ? `; expires=${expiresAt.toUTCString()}` : '';
        document.cookie = `${TOKEN_KEYS.storageKey}=${token}${expires}; path=/; SameSite=Lax${remember ? '; Secure' : ''}`;
      }
      
      return true;
    } catch (storageError) {
      console.error('Error storing token in storage:', storageError);
      // Clear partial storage on error
      clearAuthToken();
      return false;
    }
  } catch (error) {
    console.error('Error setting auth token:', error);
    return false;
  }
};

/**
 * Clears all authentication tokens from all storage locations
 * @returns {boolean} True if all tokens were cleared successfully
 */
const clearAuthToken = () => {
  // Track token clearing operations
  tokenOperations.clearCount++;
  const now = Date.now();
  
  // Prevent redundant clear calls (don't clear more than once every 500ms)
  if (tokenOperations.lastClear && (now - tokenOperations.lastClear) < 500) {
    return true;
  }
  
  tokenOperations.lastClear = now;
  console.log('[API] Auth token cleared');
  
  // Clear in-memory token
  authToken = { value: null, expires: null, lastChecked: now };
  
  let success = true;
  
  try {
    // Clear from all storage locations
    [localStorage, sessionStorage].forEach(storage => {
      try {
        // Use the correct property name from TOKEN_KEYS
        storage.removeItem(TOKEN_KEYS.storageKey);
        storage.removeItem(TOKEN_KEYS.refreshKey);
      } catch (error) {
        console.error('Error clearing storage:', error);
        success = false;
      }
    });
    
    // Clear cookie
    if (typeof document !== 'undefined') {
      document.cookie = `${TOKEN_KEYS.storageKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
    
    return success;
  } catch (error) {
    console.error('Error in clearAuthToken:', error);
    return false;
  }
};

/**
 * Retrieves the current authentication token with multi-layered fallback
 * @returns {string} The authentication token or empty string if not found
 */
const getAuthToken = () => {
  try {
    // Track token retrieval operations
    tokenOperations.getCount++;
    tokenOperations.lastGet = Date.now();
    
    // Throttle frequent token checks (don't check more than once every 500ms)
    const now = Date.now();
    if (authToken.lastChecked && (now - authToken.lastChecked) < 500) {
      return authToken.value || '';
    }
    
    authToken.lastChecked = now;
    
    // Check in-memory cache first
    if (authToken?.value) {
      // Verify token is not expired
      if (!authToken.expires || authToken.expires > Date.now()) {
        return authToken.value;
      }
      console.log('[Auth] Cached token expired, checking other sources');
    }

    // Define all possible token sources with validation
    const tokenSources = [
      { 
        name: 'localStorage', 
        get: () => {
          try {
            // Use the correct property name from TOKEN_KEYS
            return localStorage.getItem(TOKEN_KEYS.storageKey);
          } catch (error) {
            console.warn('Error accessing localStorage:', error);
            return null;
          }
        },
        validate: (token) => token && token.length > 10 // Basic validation
      },
      { 
        name: 'sessionStorage', 
        get: () => {
          try {
            // Use the correct property name from TOKEN_KEYS
            return sessionStorage.getItem(TOKEN_KEYS.storageKey);
          } catch (error) {
            console.warn('Error accessing sessionStorage:', error);
            return null;
          }
        },
        validate: (token) => token && token.length > 10
      },
      {
        name: 'cookie',
        get: () => {
          if (typeof document === 'undefined') return null;
          try {
            // Use the correct property name from TOKEN_KEYS
            const match = document.cookie.match(new RegExp(`(^| )${TOKEN_KEYS.storageKey}=([^;]+)`));
            return match ? decodeURIComponent(match[2]) : null;
          } catch (error) {
            console.warn('Error reading cookie:', error);
            return null;
          }
        },
        validate: (token) => token && token.length > 10
      }
    ];

    // Try each source in order
    for (const source of tokenSources) {
      try {
        const token = source.get();
        if (token && source.validate(token)) {
          // Parse token to get expiration
          const decoded = parseToken(token);
          if (decoded && !isTokenExpired(decoded.exp)) {
            // Cache the validated token in memory
            const expires = decoded.exp ? new Date(decoded.exp * 1000) : null;
            authToken = {
              value: token,
              expires: expires?.getTime() || null
            };
            
            console.log(`[Auth] Using token from ${source.name}`);
            return token;
          }
          console.log(`[Auth] Token from ${source.name} is invalid or expired`);
        }
      } catch (error) {
        console.warn(`Error getting token from ${source.name}:`, error);
      }
    }
    
    // No valid token found in any source
    if (tokenOperations.getCount % 5 === 0) {
      // Only log every 5th attempt to reduce noise
      console.log('[Auth] No valid authentication token found');
    }
    return '';
  } catch (error) {
    console.error('Error in getAuthToken:', error);
    return '';
  }
};

/**
 * Validates if the current token is valid
 * @returns {Promise<boolean>} True if token is valid, false otherwise
 */
export const validateToken = async () => {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    // TODO: Implement actual token validation with the server
    // For now, just check if it looks like a JWT
    return token.split('.').length === 3;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

// Export all public methods as default for backward compatibility
export default {
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  validateToken,
  parseToken,
  isTokenExpired
};
