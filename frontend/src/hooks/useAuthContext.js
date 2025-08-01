import { useMemo, useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useFeedback } from '../components/feedback/FeedbackContext';

// Fallback auth object when context is not available
const FALLBACK_AUTH = {
  isAuthenticated: false,
  user: null,
  token: null,
  login: async () => { 
    console.warn('Auth context not available - login called on fallback');
    throw new Error('Authentication not available'); 
  },
  logout: () => {
    console.warn('Auth context not available - logout called on fallback');
    return Promise.resolve();
  },
  register: async () => {
    console.warn('Auth context not available - register called on fallback');
    throw new Error('Registration not available');
  },
  loading: false,
  error: null
};

/**
 * Custom hook to safely access the auth context with built-in fallback
 * @returns {Object} Auth context with fallback values
 */
export const useAuthContext = () => {
  const [auth, setAuth] = useState(FALLBACK_AUTH);
  const [loading, setLoading] = useState(true);
  const [authModule, setAuthModule] = useState(null);

  // Load the auth module dynamically to avoid circular dependencies
  useEffect(() => {
    let isMounted = true;
    
    const loadAuthModule = async () => {
      try {
        const module = await import('../contexts/NewAuthContext');
        if (isMounted) {
          setAuthModule(module);
        }
      } catch (error) {
        console.warn('Failed to load auth context:', error);
        if (isMounted) {
          setAuth(FALLBACK_AUTH);
          setLoading(false);
        }
      }
    };

    loadAuthModule();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const setupAuth = useCallback(async () => {
    try {
      console.log('[Auth] Initializing auth context...');
      
      // First, try to get any existing token from the API service
      let token = await api.getAuthToken();
      
      // If no token in API service, check localStorage/sessionStorage directly
      if (!token) {
        const tokenKey = api.TOKEN_KEYS?.storageKey || 'auth_token';
        token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
        
        if (token) {
          console.log('[Auth] Found token in storage, setting in API service...');
          await api.setAuthToken(token);
        }
      }
      
      // If we have a token, try to get user data
      if (token) {
        console.log('[Auth] Token found, fetching user data...');
        try {
          const userData = await api.auth.me();
          console.log('[Auth] User data fetched successfully:', userData);
          
          setAuth({
            user: userData,
            token: token,
            isAuthenticated: true,
            loading: false,
            error: null
          });
          return;
        } catch (error) {
          console.warn('[Auth] Failed to fetch user data:', error);
          // Clear invalid token
          await api.clearAuthToken();
        }
      }
      
      // If we get here, either no token or invalid token
      console.log('[Auth] No valid token found, using fallback auth');
      setAuth(FALLBACK_AUTH);
      
    } catch (error) {
      console.error('[Auth] Error initializing auth context:', error);
      setAuth({
        ...FALLBACK_AUTH,
        error: error.message || 'Failed to initialize authentication'
      });
    }
  }, []);

  // Once the auth module is loaded, initialize auth state on mount
  useEffect(() => {
    if (!authModule) return;
    
    console.log('[Auth] Setting up auth...');
    setupAuth();
    
    // Listen for storage events to handle token changes across tabs
    const handleStorageChange = async (e) => {
      if (e.key === (api.TOKEN_KEYS?.storageKey || 'auth_token')) {
        console.log('[Auth] Auth token changed in storage, revalidating...');
        await setupAuth();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [authModule, setupAuth]);

  return useMemo(() => ({
    ...auth,
    loading: loading || auth.loading
  }), [auth, loading]);
};

export default useAuthContext;
