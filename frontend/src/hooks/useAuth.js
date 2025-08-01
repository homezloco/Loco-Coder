import { useState, useEffect, useCallback } from 'react';
import api from '../services/api/apiV2';

/**
 * Custom hook for authentication state management
 * @returns {Object} Auth context with user state and auth methods
 */
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Check if we have a valid token
        if (api.isAuthenticated()) {
          // Fetch current user data
          const userData = await api.getCurrentUser();
          setUser(userData);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message || 'Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const handleAuthChange = (event) => {
      if (!event.detail.isAuthenticated) {
        setUser(null);
      }
    };

    window.addEventListener('authStateChanged', handleAuthChange);
    return () => window.removeEventListener('authStateChanged', handleAuthChange);
  }, []);

  /**
   * Login with email/username and password
   */
  const login = useCallback(async (credentials, remember = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.login(credentials, remember);
      setUser(response.user || { username: credentials.username });
      return response;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout the current user
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await api.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message || 'Logout failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if user has a specific role/permission
   */
  const hasRole = useCallback((role) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  }, [user]);

  return {
    // State
    user,
    loading,
    error,
    isAuthenticated: !!user,
    
    // Methods
    login,
    logout,
    hasRole,
    
    // Token management
    getToken: api.getAuthToken,
    setToken: api.storeToken,
    clearToken: api.clearAuthData,
  };
};

export default useAuth;
