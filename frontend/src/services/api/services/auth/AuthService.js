import { TOKEN_KEYS, API_BASE_URL } from '../../config';
import { fetchWithTimeout } from '../../utils/fetch';

/**
 * Authentication service for handling user authentication state and operations
 */
class AuthService {
  constructor() {
    this.authToken = null;
    this.refreshToken = null;
    this.tokenExpiration = null;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
    this.authStateSubscribers = new Set();
    this.tokenInitializationPromise = null;
    
    // Bind methods
    this.initAuthToken = this.initAuthToken.bind(this);
    this.getAuthToken = this.getAuthToken.bind(this);
    this.setAuthToken = this.setAuthToken.bind(this);
    this.clearAuthToken = this.clearAuthToken.bind(this);
    this.clearAuthData = this.clearAuthData.bind(this);
    this.validateToken = this.validateToken.bind(this);
    this.storeToken = this.storeToken.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.onAuthStateChanged = this.onAuthStateChanged.bind(this);
    this.notifyAuthStateChanged = this.notifyAuthStateChanged.bind(this);
    this.isTokenExpired = this.isTokenExpired.bind(this);
    
    // Initialize auth state
    if (typeof window !== 'undefined') {
      this.initAuthToken();
    }
  }

  /**
   * Check if a token is expired or about to expire
   * @param {string} token - The JWT token to check
   * @param {number} threshold - Threshold in seconds before expiration to consider token expired
   * @returns {boolean} True if token is expired or about to expire
   */
  isTokenExpired(token, threshold = TOKEN_KEYS.refreshThreshold || 300) {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now + threshold;
    } catch (error) {
      console.error('[AuthService] Error checking token expiration:', error);
      return true; // If we can't parse the token, consider it expired
    }
  }

  /**
   * Store token information
   * @param {string} token - The JWT token to store
   * @param {string} refreshTokenValue - Optional refresh token
   * @param {number} expiresIn - Optional expiration time in seconds
   */
  storeToken(token, refreshTokenValue = null, expiresIn = null) {
    if (!token) return;
    
    this.authToken = token;
    
    // Set token expiration if provided
    if (expiresIn) {
      this.tokenExpiration = Math.floor(Date.now() / 1000) + expiresIn;
    }
    
    // Store refresh token if provided
    if (refreshTokenValue) {
      this.refreshToken = refreshTokenValue;
      try {
        localStorage.setItem(TOKEN_KEYS.refreshKey, refreshTokenValue);
      } catch (e) {
        console.warn('[AuthService] Failed to store refresh token in localStorage:', e);
      }
    }
    
    // Store token in the appropriate storage
    try {
      if (TOKEN_KEYS.storageType === 'localStorage') {
        localStorage.setItem(TOKEN_KEYS.storageKey, token);
        if (expiresIn) {
          localStorage.setItem(`${TOKEN_KEYS.storageKey}_expires`, this.tokenExpiration);
        }
      } else if (TOKEN_KEYS.storageType === 'sessionStorage') {
        sessionStorage.setItem(TOKEN_KEYS.storageKey, token);
        if (expiresIn) {
          sessionStorage.setItem(`${TOKEN_KEYS.storageKey}_expires`, this.tokenExpiration);
        }
      }
    } catch (e) {
      console.warn('[AuthService] Failed to store token:', e);
    }
    
    // Notify subscribers of auth state change
    this.notifyAuthStateChanged({ isAuthenticated: true });
  }

  /**
   * Clear all authentication data
   */
  clearAuthData() {
    this.authToken = null;
    this.refreshToken = null;
    this.tokenExpiration = null;
    
    // Clear from all storage locations
    try {
      const tokenKey = TOKEN_KEYS?.storageKey || 'auth_token';
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(`${tokenKey}_expires`);
      localStorage.removeItem(TOKEN_KEYS.refreshKey);
      
      sessionStorage.removeItem(tokenKey);
      sessionStorage.removeItem(`${tokenKey}_expires`);
      
      // Clear cookies
      document.cookie = `${tokenKey}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      document.cookie = `${TOKEN_KEYS.refreshKey}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      
      // Notify subscribers
      this.notifyAuthStateChanged({ isAuthenticated: false });
    } catch (e) {
      console.warn('[AuthService] Failed to clear auth data:', e);
    }
  }

  /**
   * Initialize auth token from available sources
   */
  async initAuthToken() {
    console.group('[AuthService] Initializing auth token');
    
    // If we already have a token in memory, use it
    if (this.authToken && !this.isTokenExpired(this.authToken)) {
      console.log('[AuthService] Using existing valid auth token from memory');
      console.groupEnd();
      return this.authToken;
    }
    
    // If initialization is already in progress, return the promise
    if (this.tokenInitializationPromise) {
      console.log('[AuthService] Token initialization already in progress, waiting...');
      try {
        const token = await this.tokenInitializationPromise;
        console.groupEnd();
        return token;
      } catch (error) {
        console.error('[AuthService] Error during token initialization:', error);
        console.groupEnd();
        return null;
      }
    }
    
    // Start the initialization process
    this.tokenInitializationPromise = (async () => {
      try {
        console.log('[AuthService] Initializing auth token from storage');
        
        // Get the token storage key from config
        const tokenKey = TOKEN_KEYS?.storageKey || 'auth_token';
        
        // Define possible token sources in order of preference
        const tokenSources = [
          {
            name: 'memory',
            get: () => this.authToken
          },
          {
            name: 'sessionStorage',
            get: () => {
              try {
                return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(tokenKey) : null;
              } catch (e) {
                console.warn('[AuthService] Error reading from sessionStorage:', e);
                return null;
              }
            }
          },
          {
            name: 'localStorage',
            get: () => {
              try {
                return typeof localStorage !== 'undefined' ? localStorage.getItem(tokenKey) : null;
              } catch (e) {
                console.warn('[AuthService] Error reading from localStorage:', e);
                return null;
              }
            }
          },
          {
            name: 'cookies',
            get: () => {
              try {
                if (typeof document === 'undefined') return null;
                const match = document.cookie.match(new RegExp('(^| )' + tokenKey + '=([^;]+)'));
                return match ? decodeURIComponent(match[2]) : null;
              } catch (e) {
                console.warn('[AuthService] Error reading from cookies:', e);
                return null;
              }
            }
          }
        ];
        
        // Try each source in order
        let foundToken = null;
        for (const source of tokenSources) {
          try {
            console.log(`[AuthService] Checking token source: ${source.name}`);
            const token = await Promise.resolve(source.get());
            
            // Basic JWT validation (3 parts separated by dots)
            if (token && typeof token === 'string' && token.split('.').length === 3) {
              foundToken = token;
              console.log(`[AuthService] Found token in ${source.name}`);
              break;
            }
          } catch (error) {
            console.warn(`[AuthService] Error checking ${source.name}:`, error);
          }
        }
        
        // If no token was found in any source
        if (!foundToken) {
          console.log('[AuthService] No valid auth token found in any source');
          return null;
        }
        
        // Validate the token
        if (this.isTokenExpired(foundToken)) {
          console.warn('[AuthService] Token is expired');
          await this.clearAuthToken();
          return null;
        }
        
        // If we're online, validate with the server
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          try {
            const isValid = await this.validateToken(foundToken);
            if (!isValid) {
              console.warn('[AuthService] Token validation failed');
              await this.clearAuthToken();
              return null;
            }
            console.log('[AuthService] Token validated successfully');
          } catch (validationError) {
            console.warn('[AuthService] Error validating token:', validationError);
            // Continue with the token even if validation fails (might be offline)
          }
        }
        
        // Cache the token in memory
        this.authToken = foundToken;
        
        // Ensure the token is in all storage locations for consistency
        try {
          // Only sync to storage if token is valid
          if (!this.isTokenExpired(foundToken)) {
            try {
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem(tokenKey, foundToken);
              }
            } catch (e) {
              console.warn('[AuthService] Failed to store token in localStorage:', e);
            }
            
            try {
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(tokenKey, foundToken);
              }
            } catch (e) {
              console.warn('[AuthService] Failed to store token in sessionStorage:', e);
            }
            
            try {
              if (typeof document !== 'undefined') {
                document.cookie = `${tokenKey}=${encodeURIComponent(foundToken)}; path=/; max-age=${TOKEN_KEYS.expiresIn || 604800}; samesite=strict${window.location.protocol === 'https:' ? '; secure' : ''}`;
              }
            } catch (e) {
              console.warn('[AuthService] Failed to store token in cookies:', e);
            }
            
            console.log('[AuthService] Synced token across available storage locations');
          }
        } catch (error) {
          console.warn('[AuthService] Error syncing token to storage:', error);
        }
        
        // Notify subscribers
        this.notifyAuthStateChanged({ isAuthenticated: true });
        
        console.log('[AuthService] Auth token initialized successfully');
        return foundToken;
      } catch (error) {
        console.error('[AuthService] Error initializing auth token:', error);
        return null;
      } finally {
        this.tokenInitializationPromise = null;
      }
    })();
    
    try {
      const token = await this.tokenInitializationPromise;
      console.groupEnd();
      return token;
    } catch (error) {
      console.error('[AuthService] Error during token initialization:', error);
      console.groupEnd();
      return null;
    }
  }

  /**
   * Get auth token from storage
   * @param {boolean} skipValidation - Skip token validation
   * @returns {Promise<string|null>} The auth token or null if not found/expired
   */
  async getAuthToken(skipValidation = false) {
    console.group('[AuthService] getAuthToken');
    try {
      // If we already have a valid token in memory, use it
      if (this.authToken && !this.isTokenExpired(this.authToken)) {
        console.log('[AuthService] Using valid in-memory auth token');
        return this.authToken;
      }
      
      // Initialize the token if not already done
      const token = await this.initAuthToken();
      if (!token) {
        console.log('[AuthService] No valid token found');
        return null;
      }
      
      // Skip validation if requested
      if (skipValidation) {
        console.log('[AuthService] Using token without validation');
        return token;
      }
      
      // Check if token is expired
      if (this.isTokenExpired(token)) {
        console.warn('[AuthService] Token is expired');
        await this.clearAuthToken();
        return null;
      }
      
      // If we're online, validate with the server
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const isValid = await this.validateToken(token);
          if (!isValid) {
            console.warn('[AuthService] Token validation failed');
            await this.clearAuthToken();
            return null;
          }
          console.log('[AuthService] Token validated successfully');
        } catch (validationError) {
          console.warn('[AuthService] Error validating token:', validationError);
          // Continue with the token even if validation fails (might be offline)
        }
      }
      
      return token;
    } catch (error) {
      console.error('[AuthService] Error getting auth token:', error);
      return null;
    } finally {
      console.groupEnd();
    }
  }
  
  /**
   * Set the authentication token
   * @param {string} token - The JWT token to set
   * @param {Object} options - Additional options
   * @param {boolean} options.remember - Whether to persist the token across sessions
   * @returns {Promise<void>}
   */
  async setAuthToken(token, options = {}) {
    console.group('[AuthService] setAuthToken');
    try {
      if (!token) {
        console.warn('[AuthService] No token provided, clearing auth token');
        await this.clearAuthToken();
        return;
      }
      
      // Basic JWT validation (3 parts separated by dots)
      if (typeof token !== 'string' || token.split('.').length !== 3) {
        throw new Error('Invalid token format');
      }
      
      // Store the token
      this.authToken = token;
      
      // Store in the appropriate storage
      const tokenKey = TOKEN_KEYS?.storageKey || 'auth_token';
      const storage = options.remember ? localStorage : sessionStorage;
      
      try {
        storage.setItem(tokenKey, token);
        
        // If it's a remember-me token, also set a cookie
        if (options.remember && typeof document !== 'undefined') {
          const expires = new Date();
          expires.setDate(expires.getDate() + 30); // 30 days
          document.cookie = `${tokenKey}=${token}; expires=${expires.toUTCString()}; path=/; samesite=strict${window.location.protocol === 'https:' ? '; secure' : ''}`;
        }
        
        // Notify subscribers
        this.notifyAuthStateChanged({ isAuthenticated: true });
        
        console.log('[AuthService] Auth token set successfully');
      } catch (storageError) {
        console.error('[AuthService] Error storing token:', storageError);
        // Still keep the token in memory even if storage fails
        this.notifyAuthStateChanged({ isAuthenticated: true });
      }
    } catch (error) {
      console.error('[AuthService] Error setting auth token:', error);
      throw error;
    } finally {
      console.groupEnd();
    }
  }
  
  /**
   * Clear the authentication token from all storage locations
   * @returns {Promise<void>}
   */
  async clearAuthToken() {
    console.group('[AuthService] clearAuthToken');
    try {
      // Clear from memory
      this.authToken = null;
      
      // Clear from all storage locations
      const tokenKey = TOKEN_KEYS?.storageKey || 'auth_token';
      
      try {
        localStorage.removeItem(tokenKey);
        sessionStorage.removeItem(tokenKey);
        
        // Clear cookie
        if (typeof document !== 'undefined') {
          document.cookie = `${tokenKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
        
        console.log('[AuthService] Auth token cleared from all storage locations');
      } catch (storageError) {
        console.error('[AuthService] Error clearing token from storage:', storageError);
      }
      
      // Notify subscribers
      this.notifyAuthStateChanged({ isAuthenticated: false });
      
    } catch (error) {
      console.error('[AuthService] Error clearing auth token:', error);
      throw error;
    } finally {
      console.groupEnd();
    }
  }
  
  /**
   * Validate a token with the server
   * @param {string} token - The token to validate
   * @returns {Promise<boolean>} True if the token is valid
   */
  async validateToken(token) {
    console.group('[AuthService] validateToken');
    try {
      if (!token) {
        console.warn('[AuthService] No token provided for validation');
        return false;
      }
      
      // Skip validation in test environment
      if (process.env.NODE_ENV === 'test') {
        console.log('[AuthService] Skipping token validation in test environment');
        return true;
      }
      
      console.log('[AuthService] Validating token with server...');
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      });
      
      if (!response.ok) {
        console.warn(`[AuthService] Token validation failed with status: ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      console.log('[AuthService] Token validation result:', data);
      
      return data.valid === true;
      
    } catch (error) {
      console.error('[AuthService] Error validating token:', error);
      // If we can't reach the server, assume the token is valid (offline mode)
      return true;
    } finally {
      console.groupEnd();
    }
  }
  
  /**
   * Log in with username and password
   * @param {string} username - The username
   * @param {string} password - The password
   * @param {Object} options - Additional options
   * @param {boolean} options.remember - Whether to remember the login
   * @returns {Promise<Object>} The user data and token
   */
  async login(username, password, options = {}) {
    console.group('[AuthService] login');
    try {
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
      
      console.log(`[AuthService] Attempting login for user: ${sanitizedUsername}`);
      
      // Make the login request
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: sanitizedUsername,
          password: password
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || 'Login failed');
        error.code = errorData.code || 'LOGIN_FAILED';
        error.status = response.status;
        throw error;
      }
      
      const data = await response.json();
      
      // Store the token
      if (data.token) {
        await this.setAuthToken(data.token, { remember: options.remember });
        
        // Store refresh token if provided
        if (data.refreshToken) {
          this.refreshToken = data.refreshToken;
          if (options.remember) {
            localStorage.setItem(TOKEN_KEYS.refreshKey, data.refreshToken);
          } else {
            sessionStorage.setItem(TOKEN_KEYS.refreshKey, data.refreshToken);
          }
        }
        
        // Store user data
        if (data.user) {
          this.currentUser = data.user;
        }
        
        console.log('[AuthService] Login successful');
        return data;
      } else {
        throw new Error('No token received from server');
      }
      
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      
      // Clear any partial auth state on error
      await this.clearAuthToken();
      
      // Re-throw the error for the caller to handle
      throw error;
    } finally {
      console.groupEnd();
    }
  }
  
  /**
   * Log out the current user
   * @returns {Promise<void>}
   */
  async logout() {
    console.group('[AuthService] logout');
    try {
      // Get the token before clearing it
      const token = this.authToken;
      
      // Clear auth data
      await this.clearAuthToken();
      
      // Clear user data
      this.currentUser = null;
      
      // Clear refresh token
      this.refreshToken = null;
      try {
        localStorage.removeItem(TOKEN_KEYS.refreshKey);
        sessionStorage.removeItem(TOKEN_KEYS.refreshKey);
      } catch (e) {
        console.warn('[AuthService] Error clearing refresh token:', e);
      }
      
      // Notify the server (fire and forget)
      if (token && typeof fetch === 'function') {
        fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(e => {
          console.warn('[AuthService] Error notifying server of logout:', e);
        });
      }
      
      // Notify subscribers
      this.notifyAuthStateChanged({ isAuthenticated: false });
      
      console.log('[AuthService] Logout successful');
      
    } catch (error) {
      console.error('[AuthService] Error during logout:', error);
      throw error;
    } finally {
      console.groupEnd();
    }
  }
  
  /**
   * Subscribe to authentication state changes
   * @param {Function} callback - The callback function
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChanged(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    // Add the callback to subscribers
    this.authStateSubscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.authStateSubscribers.delete(callback);
    };
  }
  
  /**
   * Notify all subscribers of auth state changes
   * @private
   */
  notifyAuthStateChanged(state = {}) {
    const authState = {
      isAuthenticated: !!this.authToken && !this.isTokenExpired(this.authToken),
      user: this.currentUser,
      ...state
    };
    
    console.log('[AuthService] Notifying subscribers of auth state change:', authState);
    
    // Call all subscribers
    this.authStateSubscribers.forEach(callback => {
      try {
        callback(authState);
      } catch (error) {
        console.error('[AuthService] Error in auth state subscriber:', error);
      }
    });
  }


  /**
   * Set auth token
   * @param {string} token - The auth token
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async setAuthToken(token, options = {}) {
    // Implementation from original api.js setAuthToken
    // ... (to be implemented)
  }

  /**
   * Clear auth token and related data
   */
  clearAuthToken() {
    // Implementation from original api.js clearAuthToken
    // ... (to be implemented)
  }

  /**
   * Validate token with server
   * @param {string} token - The token to validate
   * @returns {Promise<boolean>} True if token is valid
   */
  async validateToken(token) {
    // Implementation from original api.js validateToken
    // ... (to be implemented)
    return false;
  }

  /**
   * Subscribe to auth state changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChanged(callback) {
    if (typeof callback === 'function') {
      this.authStateSubscribers.add(callback);
      return () => this.authStateSubscribers.delete(callback);
    }
    return () => {};
  }

  /**
   * Notify subscribers of auth state changes
   * @private
   */
  notifyAuthStateChanged(payload) {
    this.authStateSubscribers.forEach(callback => {
      try {
        callback(payload);
      } catch (e) {
        console.error('[AuthService] Error in auth state subscriber:', e);
      }
    });
  }
}

// Create and export a singleton instance
export const authService = new AuthService();

export default authService;
