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
      tokenModule.clearAuthToken();
      
      // Update auth state
      this.isAuthenticated = false;
      this.currentUser = null;
      
      // Notify subscribers
      this.notifyAuthStateChanged();
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Check if the current user is authenticated
   * @returns {Promise<boolean>} True if authenticated
   */
  async checkAuth() {
    try {
      const token = tokenModule.getAuthToken();
      if (!token) {
        this.isAuthenticated = false;
        this.currentUser = null;
        return false;
      }
      
      // Validate token with server
      const response = await fetchWithTimeout(ENDPOINTS.VALIDATE_TOKEN, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const user = await response.json();
        this.isAuthenticated = true;
        this.currentUser = user;
        return true;
      }
      
      // Token is invalid, clear it
      this.isAuthenticated = false;
      this.currentUser = null;
      tokenModule.clearAuthToken();
      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      this.isAuthenticated = false;
      this.currentUser = null;
      return false;
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
