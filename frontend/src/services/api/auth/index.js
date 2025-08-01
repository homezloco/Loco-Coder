import { ENDPOINTS } from '../config';
import { fetchWithTimeout } from '../utils/fetch';
// Import token methods
import * as tokenModule from './token';

// Debug log to check token module
console.log('Auth module loading. Token module exports:', Object.keys(tokenModule));

// Create bound versions of all token methods
const boundTokenMethods = {
  setAuthToken: (token, remember) => {
    if (typeof setAuthTokenImpl === 'function') {
      return setAuthTokenImpl(token, remember);
    }
    console.error('setAuthToken is not a function');
    return false;
  },
  getAuthToken: () => {
    if (typeof getAuthTokenImpl === 'function') {
      return getAuthTokenImpl();
    }
    console.error('getAuthToken is not a function');
    return null;
  },
  clearAuthToken: () => {
    if (typeof clearAuthTokenImpl === 'function') {
      return clearAuthTokenImpl();
    }
    console.error('clearAuthToken is not a function');
    return false;
  },
  validateToken: async () => {
    if (typeof validateTokenImpl === 'function') {
      return validateTokenImpl();
    }
    console.error('validateToken is not a function');
    return false;
  }
};

// Track authentication state
let isAuthenticated = false;
let currentUser = null;

// Helper function to check authentication state
const getIsAuthenticated = () => isAuthenticated;

/**
 * Logs in a user with the provided credentials
 * @param {string} username - The user's username
 * @param {string} password - The user's password
 * @param {boolean} remember - Whether to remember the user's session
 * @returns {Promise<Object>} The user data and token
 */
export const login = async (username, password, remember = true) => {
  try {
    // Convert credentials to URL-encoded form data
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    // Use the token endpoint for OAuth2 password flow
    const response = await fetchWithTimeout(ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
      skipAuth: true, // Don't add auth header for login
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    
    // Store the token
    if (data.token) {
      setAuthToken(data.token, remember);
      isAuthenticated = true;
      currentUser = data.user || { username };
      
      // Initialize the user session
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-state-changed'));
      }
      
      return { user: currentUser, token: data.token };
    }
    
    throw new Error('No token received from server');
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Logs out the current user
 * @returns {Promise<boolean>} True if logout was successful
 */
export const logout = async () => {
  try {
    // Get token before clearing it
    const token = getAuthToken();
    
    // Clear local auth state first to prevent race conditions
    clearAuthToken();
    isAuthenticated = false;
    currentUser = null;
    
    // Try to notify the server (but don't block on it)
    if (token) {
      try {
        await fetchWithTimeout(ENDPOINTS.AUTH.LOGOUT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include' // Include cookies for session-based auth
        }).catch(() => {}); // Ignore errors on logout
      } catch (e) {
        console.warn('Error during server logout:', e);
      }
    }
    
    // Clear any remaining auth data
    if (typeof window !== 'undefined') {
      // Clear all auth-related data from storage
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Notify any listeners
      window.dispatchEvent(new Event('auth-state-changed'));
      
      // Force a hard refresh to ensure all state is cleared
      window.location.href = '/login';
    }
    
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

/**
 * Checks if the current user is authenticated
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export const checkAuth = async () => {
  if (isAuthenticated && currentUser) {
    return true;
  }
  
  const token = getAuthToken();
  if (!token) {
    isAuthenticated = false;
    currentUser = null;
    return false;
  }
  
  // If we have a token but haven't validated it yet
  const isValid = await validateToken();
  if (isValid) {
    try {
      // Optionally, fetch the current user's data
      // This would be a good place to add a /me endpoint call
      isAuthenticated = true;
      return true;
    } catch (error) {
      console.error('Error fetching user data:', error);
      await logout();
      return false;
    }
  } else {
    await logout();
    return false;
  }
};

/**
 * Gets the current user
 * @returns {Object|null} The current user object or null if not authenticated
 */
export const getCurrentUser = () => {
  return currentUser;
};

/**
 * Subscribes to authentication state changes
 * @param {Function} callback - Function to call when auth state changes
 * @returns {Function} Unsubscribe function
 */
export const onAuthStateChanged = (callback) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  
  const handler = () => {
    callback({
      isAuthenticated,
      user: currentUser,
      token: getAuthToken(),
    });
  };
  
  // Call immediately with current state
  handler();
  
  // Add event listener for future changes
  window.addEventListener('auth-state-changed', handler);
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener('auth-state-changed', handler);
  };
};

// Initialize auth state when the module loads
if (typeof window !== 'undefined') {
  checkAuth().catch(console.error);
}

// Export token methods as named exports
export const {
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  validateToken
} = boundTokenMethods;

// Export auth methods as named exports
export {
  login,
  logout,
  checkAuth,
  getCurrentUser,
  onAuthStateChanged,
  getIsAuthenticated
};

// For backward compatibility
export default {
  login,
  logout,
  checkAuth,
  getCurrentUser,
  onAuthStateChanged,
  isAuthenticated: getIsAuthenticated,
  // Export token methods
  setAuthToken: boundTokenMethods.setAuthToken,
  getAuthToken: boundTokenMethods.getAuthToken,
  clearAuthToken: boundTokenMethods.clearAuthToken,
  validateToken: boundTokenMethods.validateToken
};

// Debug log the final exports
console.log('Auth module exports:', {
  setAuthToken: typeof setAuthToken,
  getAuthToken: typeof getAuthToken,
  clearAuthToken: typeof clearAuthToken,
  validateToken: typeof validateToken,
  login: typeof login,
  logout: typeof logout,
  checkAuth: typeof checkAuth,
  getCurrentUser: typeof getCurrentUser,
  onAuthStateChanged: typeof onAuthStateChanged,
  isAuthenticated: typeof getIsAuthenticated
});
