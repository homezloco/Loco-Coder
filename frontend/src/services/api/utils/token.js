import { TOKEN_KEYS } from '../config';
import logger from '../../../utils/logger';
const tokenLog = logger.ns('api:utils:token');

// Track token state
let authToken = null;
let refreshToken = null;
let tokenExpiration = null;
const DEV = !!(import.meta && import.meta.env && import.meta.env.DEV);

// Internal helpers
const hasCookie = (name) => {
  try {
    return document?.cookie?.split('; ').some(c => c.startsWith(`${name}=`));
  } catch {
    return false;
  }
};

const isAuthDataInStorage = () => {
  try {
    const ls = typeof localStorage !== 'undefined' ? localStorage : null;
    const ss = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
    const inLS = ls && (ls.getItem(TOKEN_KEYS.storageKey) || ls.getItem(TOKEN_KEYS.refreshKey) || ls.getItem(`${TOKEN_KEYS.storageKey}_expires`));
    const inSS = ss && (ss.getItem(TOKEN_KEYS.storageKey) || ss.getItem(TOKEN_KEYS.refreshKey) || ss.getItem(`${TOKEN_KEYS.storageKey}_expires`));
    const inCookies = hasCookie(TOKEN_KEYS.storageKey) || hasCookie(TOKEN_KEYS.refreshKey);
    return !!(inLS || inSS || inCookies);
  } catch {
    return false;
  }
};

const isAuthDataPresent = () => {
  return !!(authToken || refreshToken || tokenExpiration || isAuthDataInStorage());
};

/**
 * Get the current authentication token
 * @returns {string|null} The current auth token or null if not available
 */
export const getAuthToken = () => {
  return authToken;
};

/**
 * Check if a token is expired or about to expire
 * @param {number} threshold - Seconds before expiration to consider token expired
 * @returns {boolean} True if token is expired or about to expire
 */
export const isTokenExpired = (threshold = TOKEN_KEYS.refreshThreshold) => {
  if (!tokenExpiration) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = tokenExpiration - now;
  
  return timeUntilExpiry < threshold;
};

/**
 * Store token information
 * @param {string} token - The authentication token
 * @param {string} [refreshTokenValue] - Optional refresh token
 * @param {number} [expiresIn] - Optional token expiration time in seconds
 */
export const storeToken = (token, refreshTokenValue = null, expiresIn = null) => {
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
      tokenLog.warn('Failed to store refresh token in localStorage:', e);
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
    tokenLog.warn('Failed to store token:', e);
  }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = () => {
  // No-op guard to prevent repeated clears/log spam
  if (!isAuthDataPresent()) {
    if (DEV && typeof window !== 'undefined' && !window.__TOKEN_CLEAR_NOOP_LOGGED__) {
      tokenLog.info('[Token] clearAuthData: nothing to clear (noop)');
      window.__TOKEN_CLEAR_NOOP_LOGGED__ = true;
    }
    return;
  }

  authToken = null;
  refreshToken = null;
  tokenExpiration = null;
  
  // Clear from all storage locations
  try {
    localStorage.removeItem(TOKEN_KEYS.storageKey);
    localStorage.removeItem(TOKEN_KEYS.refreshKey);
    localStorage.removeItem(`${TOKEN_KEYS.storageKey}_expires`);
    
    sessionStorage.removeItem(TOKEN_KEYS.storageKey);
    sessionStorage.removeItem(TOKEN_KEYS.refreshKey);
    sessionStorage.removeItem(`${TOKEN_KEYS.storageKey}_expires`);
    
    // Clear any cookies that might be set
    document.cookie = `${TOKEN_KEYS.storageKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${TOKEN_KEYS.refreshKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (e) {
    tokenLog.warn('Failed to clear auth data:', e);
  }
};

// Debounced clear to coalesce bursts (e.g., storage event storms)
export const debouncedClearAuthData = (() => {
  let timer = null;
  return (wait = 250) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        clearAuthData();
      } finally {
        timer = null;
      }
    }, Math.max(0, wait | 0));
  };
})();

/**
 * Initialize auth token from available sources
 * @returns {Promise<string|null>} The initialized token or null if not found
 */
export const initAuthToken = async () => {
  // Try to get token from memory first
  if (authToken && !isTokenExpired()) {
    return authToken;
  }
  
  // Try to get token from storage
  try {
    let storedToken = null;
    let storedExpiration = null;
    
    // Check localStorage
    if (TOKEN_KEYS.storageType === 'localStorage') {
      storedToken = localStorage.getItem(TOKEN_KEYS.storageKey);
      const expires = localStorage.getItem(`${TOKEN_KEYS.storageKey}_expires`);
      storedExpiration = expires ? parseInt(expires, 10) : null;
    } 
    // Check sessionStorage
    else if (TOKEN_KEYS.storageType === 'sessionStorage') {
      storedToken = sessionStorage.getItem(TOKEN_KEYS.storageKey);
      const expires = sessionStorage.getItem(`${TOKEN_KEYS.storageKey}_expires`);
      storedExpiration = expires ? parseInt(expires, 10) : null;
    }
    
    // If we have a stored token and it's not expired, use it
    if (storedToken && (!storedExpiration || storedExpiration > Math.floor(Date.now() / 1000))) {
      authToken = storedToken;
      tokenExpiration = storedExpiration;
      return authToken;
    }
    
    // Try to get refresh token
    const storedRefreshToken = localStorage.getItem(TOKEN_KEYS.refreshKey);
    if (storedRefreshToken) {
      try {
        // Try to refresh the token
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken: storedRefreshToken
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          storeToken(data.token, data.refreshToken, data.expiresIn);
          return authToken;
        }
      } catch (e) {
        tokenLog.warn('Failed to refresh token:', e);
      }
    }
    
    return null;
  } catch (e) {
    tokenLog.warn('Failed to initialize auth token:', e);
    return null;
  }
};

// Export a default object with all functions for backward compatibility
export default {
  getAuthToken,
  isTokenExpired,
  storeToken,
  clearAuthData,
  debouncedClearAuthData,
  initAuthToken
};
