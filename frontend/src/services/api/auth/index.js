/**
 * Authentication module for handling user authentication state and operations
 * @module services/api/auth
 */

import { ENDPOINTS } from '../config';
import { fetchWithTimeout } from '../utils/fetch';
import tokenModule from './token';

// Singleton instance
let authServiceInstance = null;

/**
 * Get the singleton instance of AuthService
 * @returns {AuthService} The auth service instance
 */
const getAuthService = () => {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
};

/**
 * Authentication service class for handling user authentication state and operations
 */
class AuthService {
  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.authStateSubscribers = new Set();
    
    // Bind methods
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.checkAuth = this.checkAuth.bind(this);
    this.getCurrentUser = this.getCurrentUser.bind(this);
    this.onAuthStateChanged = this.onAuthStateChanged.bind(this);
    this.notifyAuthStateChanged = this.notifyAuthStateChanged.bind(this);
    this.getIsAuthenticated = this.getIsAuthenticated.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    
    // Initialize auth state
    if (typeof window !== 'undefined') {
      this.checkAuth().catch(console.error);
    }
  }
  
  /**
   * Notify all subscribers of auth state changes
   * @private
   */
  notifyAuthStateChanged() {
    const user = this.currentUser;
    const isAuth = this.isAuthenticated;
    
    this.authStateSubscribers.forEach(callback => {
      try {
        callback({ user, isAuthenticated: isAuth });
      } catch (error) {
        console.error('Error in auth state callback:', error);
      }
    });
  }
  
  /**
   * Get the current authentication state
   * @returns {boolean} True if authenticated, false otherwise
   */
  getIsAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Log in a user with credentials
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<Object>} The user data if successful
   */
  async login(username, password) {
    try {
      const response = await fetchWithTimeout(ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const { token, user, remember } = await response.json();
      
      // Store the token
      tokenModule.setAuthToken(token, remember);
      
      // Update auth state
      this.isAuthenticated = true;
      this.currentUser = user;
      
      // Notify subscribers
      this.notifyAuthStateChanged();
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Log out the current user
   * @returns {Promise<boolean>} True if logout was successful
   */
  async logout() {
    try {
      // Clear token from storage
      await tokenModule.clearAuthToken();
      
      // Update auth state
      this.isAuthenticated = false;
      this.currentUser = null;
      
      // Notify subscribers
      this.notifyAuthStateChanged();
      
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }
  
  /**
   * Refresh the authentication token
   * @param {boolean} skipServerCheck - If true, skip server validation
   * @returns {Promise<boolean>} True if token was refreshed successfully
   */
  async refreshToken(skipServerCheck = false) {
    console.log('[AuthService] Attempting to refresh token');
    try {
      // Get current token
      const currentToken = tokenModule.getAuthToken();
      if (!currentToken) {
        console.warn('[AuthService] No token to refresh');
        return false;
      }
      
      // Parse token to get refresh token if available
      const decoded = tokenModule.parseToken(currentToken);
      if (!decoded || !decoded.refreshToken) {
        console.warn('[AuthService] No refresh token available');
        return false;
      }
      
      // Skip server check if requested (offline mode)
      if (skipServerCheck) {
        console.log('[AuthService] Skipping server validation for token refresh');
        return true;
      }
      
      // Call refresh endpoint
      const refreshUrl = ENDPOINTS.AUTH.REFRESH;
      const response = await fetchWithTimeout(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ refreshToken: decoded.refreshToken })
      }, 5000);
      
      if (!response.ok) {
        console.error('[AuthService] Token refresh failed:', response.status);
        return false;
      }
      
      // Get new token from response
      const data = await response.json();
      if (!data.token) {
        console.error('[AuthService] No token in refresh response');
        return false;
      }
      
      // Store new token
      await tokenModule.setAuthToken(data.token);
      
      // Update auth state based on new token
      const newDecoded = tokenModule.parseToken(data.token);
      if (newDecoded && newDecoded.user) {
        this.currentUser = newDecoded.user;
        this.isAuthenticated = true;
        this.notifyAuthStateChanged();
      }
      
      // Dispatch token refresh event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('token-refreshed', {
          detail: { success: true }
        }));
      }
      
      console.log('[AuthService] Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('[AuthService] Error refreshing token:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   * @param {boolean} skipServerCheck - If true, skip server validation
   * @returns {Promise<boolean>} True if authenticated
   */
  async checkAuth(skipServerCheck = false) {
    try {
      // Store last check time to prevent frequent checks
      if (!this._lastAuthCheck) {
        this._lastAuthCheck = 0;
      }
      
      // Get token from storage
      const token = tokenModule.getAuthToken();
      if (!token) {
        if (this.isAuthenticated) {
          console.log('[Auth] No token found but was authenticated, updating state');
          this.isAuthenticated = false;
          this.currentUser = null;
          this.notifyAuthStateChanged();
        }
        return false;
      }
      
      // Parse token to check expiration
      const decoded = tokenModule.parseToken(token);
      if (!decoded) {
        console.warn('[Auth] Invalid token format, clearing');
        await tokenModule.clearAuthToken();
        this.isAuthenticated = false;
        this.currentUser = null;
        this.notifyAuthStateChanged();
        return false;
      }
      
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp <= now) {
        console.warn('[Auth] Token expired, attempting refresh');
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          console.warn('[Auth] Token refresh failed, clearing token');
          await tokenModule.clearAuthToken();
          this.isAuthenticated = false;
          this.currentUser = null;
          this.notifyAuthStateChanged();
          return false;
        }
        // If refresh succeeded, continue with validation
      }
      
      // If we have a token and skipServerCheck is true, consider us authenticated
      if (skipServerCheck) {
        if (!this.isAuthenticated) {
          if (decoded && decoded.user) {
            this.currentUser = decoded.user;
          } else {
            this.currentUser = { id: 'local-user' };
          }
          this.isAuthenticated = true;
          this.notifyAuthStateChanged();
        }
        return true;
      }
      
      // Check if we've validated recently (within last 5 minutes)
      const timeSinceLastCheck = now * 1000 - this._lastAuthCheck;
      if (timeSinceLastCheck < 5 * 60 * 1000) { // 5 minutes
        console.log(`[Auth] Skipping validation, last check was ${Math.round(timeSinceLastCheck / 1000)}s ago`);
        return this.isAuthenticated;
      }
      
      // Validate token with server
      console.log('[Auth] Validating token with server');
      const validateUrl = ENDPOINTS.AUTH.VALIDATE;
      const response = await fetchWithTimeout(validateUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }, 5000);
      
      // Update last check time
      this._lastAuthCheck = now * 1000;
      
      if (!response.ok) {
        console.warn(`[Auth] Token validation failed: ${response.status}`);
        
        // Try to refresh token on 401 Unauthorized
        if (response.status === 401) {
          console.log('[Auth] Attempting to refresh token after validation failure');
          const refreshed = await this.refreshToken();
          if (refreshed) {
            console.log('[Auth] Token refreshed successfully after validation failure');
            return true;
          }
          
          // If refresh failed, clear token
          console.warn('[Auth] Token refresh failed after validation failure, clearing token');
          await tokenModule.clearAuthToken();
          this.isAuthenticated = false;
          this.currentUser = null;
          this.notifyAuthStateChanged();
        }
        
        return false;
      }
      
      // Token is valid
      const data = await response.json();
      if (data.user) {
        this.currentUser = data.user;
      } else {
        if (decoded && decoded.user) {
          this.currentUser = decoded.user;
        } else {
          this.currentUser = { id: 'authenticated-user' };
        }
      }
      
      // Check if token needs to be refreshed soon (within 15 minutes)
      if (decoded.exp && decoded.exp - now < 15 * 60) { // 15 minutes
        console.log('[Auth] Token will expire soon, refreshing in background');
        this.refreshToken().catch(error => {
          console.error('[Auth] Background token refresh failed:', error);
        });
      }
      
      if (!this.isAuthenticated) {
        this.isAuthenticated = true;
        this.notifyAuthStateChanged();
      }
      
      return true;
    } catch (error) {
      console.error('[Auth] Error checking auth:', error);
      
      // On network error, don't clear token - just use what we have
      // This allows offline usage when server is unavailable
      if (!this.isAuthenticated) {
        const token = tokenModule.getAuthToken();
        if (token) {
          const decoded = tokenModule.parseToken(token);
          if (decoded && decoded.user) {
            this.currentUser = decoded.user;
          } else {
            this.currentUser = { id: 'offline-user' };
          }
          this.isAuthenticated = true;
          this.notifyAuthStateChanged();
        }
      }
      
      return this.isAuthenticated;
    }
  }

  /**
   * Get the current user
   * @returns {Object|null} The current user or null if not authenticated
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Subscribe to authentication state changes
   * @param {Function} callback - Function to call when auth state changes
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChanged(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    this.authStateSubscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.authStateSubscribers.delete(callback);
    };
  }
}

// Create and export the singleton instance
const authService = getAuthService();

// Export the service instance as default
export default authService;

// Export individual methods for backward compatibility
const {
  login,
  logout,
  checkAuth,
  getCurrentUser,
  onAuthStateChanged,
  getIsAuthenticated
} = authService;

// Export token methods directly
const {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  validateToken
} = tokenModule;

// Export all methods
export {
  login,
  logout,
  checkAuth,
  getCurrentUser,
  onAuthStateChanged,
  getIsAuthenticated,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  validateToken
};

// Debug log the final exports
if (process.env.NODE_ENV === 'development') {
  console.log('Auth module initialized with methods:', {
    login: typeof login,
    logout: typeof logout,
    checkAuth: typeof checkAuth,
    getCurrentUser: typeof getCurrentUser,
    onAuthStateChanged: typeof onAuthStateChanged,
    getAuthToken: typeof getAuthToken,
    setAuthToken: typeof setAuthToken,
    clearAuthToken: typeof clearAuthToken,
    validateToken: typeof validateToken,
    getIsAuthenticated: typeof getIsAuthenticated,
    default: typeof authService
  });
}
