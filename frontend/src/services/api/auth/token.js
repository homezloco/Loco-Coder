import { TOKEN_KEYS } from '../config';

// Debug log
console.log('Token module loading with TOKEN_KEYS:', TOKEN_KEYS);

// In-memory token cache
let authToken = null;

/**
 * Stores the authentication token in memory and persistent storage
 * @param {string} token - The JWT token to store
 * @param {boolean} remember - Whether to store in localStorage (true) or sessionStorage (false)
 */
export const setAuthToken = (token, remember = true) => {
  try {
    authToken = token;
    
    if (token) {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEYS.LOCAL_STORAGE, token);
      
      // Also set in session storage for consistency
      if (!remember) {
        sessionStorage.setItem(TOKEN_KEYS.SESSION_STORAGE, token);
      }
      
      // Set cookie with 1 day expiration
      const date = new Date();
      date.setTime(date.getTime() + (24 * 60 * 60 * 1000));
      const expires = "; expires=" + date.toUTCString();
      document.cookie = `${TOKEN_KEYS.COOKIE}=${token}${expires}; path=/; SameSite=Lax`;
    } else {
      // Clear all tokens if token is null/undefined/empty
      clearAuthToken();
    }
    
    return true;
  } catch (error) {
    console.error('Error setting auth token:', error);
    return false;
  }
};

/**
 * Clears all authentication tokens from all storage locations
 */
console.log('clearAuthToken called - start');

export const clearAuthToken = () => {
  console.log('clearAuthToken executing - clearing tokens');
  try {
    authToken = null;
    
    // Clear from all storage locations
    localStorage.removeItem(TOKEN_KEYS.LOCAL_STORAGE);
    sessionStorage.removeItem(TOKEN_KEYS.SESSION_STORAGE);
    
    // Clear cookie by setting expiration in the past
    document.cookie = `${TOKEN_KEYS.COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    
    return true;
  } catch (error) {
    console.error('Error clearing auth token:', error);
    return false;
  }
};

/**
 * Retrieves the current authentication token with multi-layered fallback
 * @returns {string} The authentication token or empty string if not found
 */
export const getAuthToken = () => {
  try {
    // 1. Check in-memory token first (fastest)
    if (authToken) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] Using in-memory token');
      }
      return authToken;
    }

    // 2. Check all possible token locations
    const tokenSources = [
      { 
        name: 'localStorage', 
        get: () => localStorage.getItem(TOKEN_KEYS.LOCAL_STORAGE)
      },
      { 
        name: 'sessionStorage', 
        get: () => sessionStorage.getItem(TOKEN_KEYS.SESSION_STORAGE)
      },
      { 
        name: 'cookie', 
        get: () => {
          const match = document.cookie.match(new RegExp(`(^| )${TOKEN_KEYS.COOKIE}=([^;]+)`));
          return match ? match[2] : null;
        }
      }
    ];

    // Try each source in order
    for (const source of tokenSources) {
      try {
        const token = source.get();
        if (token && typeof token === 'string' && token.split('.').length === 3) {
          // Cache the token in memory for future use
          authToken = token;
          
          // Also ensure it's in localStorage for persistence
          if (source.name !== 'localStorage') {
            localStorage.setItem(TOKEN_KEYS.LOCAL_STORAGE, token);
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`[API] Retrieved token from ${source.name}`);
          }
          
          return token;
        }
      } catch (error) {
        console.warn(`[API] Error checking ${source.name}:`, error);
      }
    }
    
    // No valid token found
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] No valid authentication token found in any source');
    }
    
    return '';
  } catch (error) {
    console.error('Error getting auth token:', error);
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

// Explicitly export all methods
export {
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  validateToken
};
