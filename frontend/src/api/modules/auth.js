import { TOKEN_STORAGE_KEY, USERNAME_STORAGE_KEY } from './config/constants.js';
import { apiClient } from './config/axios-config.js';

/**
 * Authentication service for handling user login/logout and session management
 */

export const authService = {
  /**
   * Login with username and password
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<Object>} - The response data
   */
  async login(username, password) {
    console.log('[Auth] Starting login process for user:', username);
    try {
      const response = await apiClient.post('/auth/login', {
        username,
        password,
      });

      console.log('[Auth] Login response received:', {
        status: response.status,
        hasToken: !!(response.data && response.data.token),
        responseData: { ...response.data, token: response.data?.token ? '***' : 'none' }
      });

      if (response.data && response.data.token) {
        try {
          // Store the token
          localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
          localStorage.setItem(USERNAME_STORAGE_KEY, username);
          
          // Verify storage
          const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
          if (storedToken !== response.data.token) {
            console.error('[Auth] Token storage verification failed');
            throw new Error('Failed to store authentication token');
          }
          
          // Update axios default headers
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
          console.log('[Auth] Login successful, token stored and headers updated');
        } catch (storageError) {
          console.error('[Auth] Error storing authentication data:', storageError);
          throw new Error('Failed to store authentication data');
        }
      } else {
        console.error('[Auth] No token received in login response');
        throw new Error('No authentication token received');
      }

      return response.data;
    } catch (error) {
      console.error('[Auth] Login failed:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  /**
   * Verify the current authentication token
   * @returns {Promise<Object>} - The verification result
   */
  async verifyToken() {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      return { valid: false };
    }

    try {
      const response = await apiClient.get('/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { valid: response.status === 200, user: response.data };
    } catch (error) {
      console.error('Token verification failed:', error);
      return { valid: false, error };
    }
  },

  /**
   * Logout the current user
   */
  logout() {
    console.log('[Auth] Starting logout process');
    try {
      // Log current token before removal for debugging
      const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      console.log('[Auth] Current token before logout:', currentToken ? '***' : 'none');
      
      // Remove auth data from localStorage
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USERNAME_STORAGE_KEY);
      
      // Remove auth header from axios
      delete apiClient.defaults.headers.common['Authorization'];
      
      // Clear any session data
      if (sessionStorage) {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(USERNAME_STORAGE_KEY);
      }
      
      // Verify removal
      const tokenAfterRemoval = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (tokenAfterRemoval) {
        console.error('[Auth] Failed to remove token from localStorage');
      } else {
        console.log('[Auth] Successfully removed auth data');
      }
    } catch (error) {
      console.error('[Auth] Error during logout:', error);
      throw error; // Re-throw to allow UI to handle the error
    }
  },

  /**
   * Check if a user is logged in
   * @returns {boolean} - True if logged in, false otherwise
   */
  isLoggedIn() {
    return !!localStorage.getItem(TOKEN_STORAGE_KEY);
  },

  /**
   * Get the current username
   * @returns {string|null} - The current username or null if not logged in
   */
  getUsername() {
    return localStorage.getItem(USERNAME_STORAGE_KEY);
  },

  /**
   * Get the current authentication token
   * @returns {string|null} - The current token or null if not logged in
   */
  getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }
};

// Set up request interceptor to add auth token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default authService;
