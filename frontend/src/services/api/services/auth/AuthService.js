import { TOKEN_KEYS } from '../../config';
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
    
    // Bind methods
    this.initAuthToken = this.initAuthToken.bind(this);
    this.getAuthToken = this.getAuthToken.bind(this);
    this.setAuthToken = this.setAuthToken.bind(this);
    this.clearAuthToken = this.clearAuthToken.bind(this);
    this.validateToken = this.validateToken.bind(this);
    this.onAuthStateChanged = this.onAuthStateChanged.bind(this);
    this.notifyAuthStateChanged = this.notifyAuthStateChanged.bind(this);
    
    // Initialize auth state
    if (typeof window !== 'undefined') {
      this.initAuthToken();
    }
  }

  /**
   * Initialize auth token from available sources
   */
  async initAuthToken() {
    try {
      const token = await this.getAuthToken();
      if (token) {
        this.authToken = token;
        this.notifyAuthStateChanged({ isAuthenticated: true });
      }
    } catch (error) {
      console.error('[AuthService] Error initializing auth token:', error);
    }
  }

  /**
   * Get auth token from storage
   * @param {boolean} skipValidation - Skip token validation
   * @returns {Promise<string|null>} The auth token or null if not found/expired
   */
  async getAuthToken(skipValidation = false) {
    // Implementation from original api.js getAuthToken
    // ... (to be implemented)
    return null;
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
