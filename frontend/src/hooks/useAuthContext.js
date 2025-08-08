import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import { useFeedback } from '../components/feedback/FeedbackContext';
import logger from '../utils/logger';
const log = logger.ns('auth');

// Fallback auth object when context is not available
const FALLBACK_AUTH = {
  isAuthenticated: false,
  user: null,
  token: null,
  login: async () => { 
    log.warn('Auth context not available - login called on fallback');
    throw new Error('Authentication not available'); 
  },
  logout: () => {
    log.warn('Auth context not available - logout called on fallback');
    return Promise.resolve();
  },
  register: async () => {
    log.warn('Auth context not available - register called on fallback');
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
  const initRef = useRef(false);
  const DEV = !!(import.meta && import.meta.env && import.meta.env.DEV);
  const storageDebounceRef = useRef(null);

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
        if (DEV) log.warn('Failed to load auth context:', error);
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
      if (DEV && !window.__AUTH_INIT_LOGGED__) {
        log.info('[Auth] Initializing auth context...');
        window.__AUTH_INIT_LOGGED__ = true;
      }
      
      // First, try to get any existing token from the API service
      let token = await api.getAuthToken();
      
      // If no token in API service, check localStorage/sessionStorage directly
      if (!token) {
        const tokenKey = api.TOKEN_KEYS?.storageKey || 'auth_token';
        token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
        
        if (token) {
          if (DEV) log.info('[Auth] Found token in storage, setting in API service...');
          await api.setAuthToken(token);
        }
      }
      
      // If we have a token, try to get user data
      if (token) {
        if (DEV) log.info('[Auth] Token found, fetching user data...');
        try {
          const userData = await api.auth.me();
          if (DEV) log.info('[Auth] User data fetched successfully:', userData);
          
          setAuth({
            user: userData,
            token: token,
            isAuthenticated: true,
            loading: false,
            error: null
          });
          return;
        } catch (error) {
          if (DEV) log.warn('[Auth] Failed to fetch user data:', error);
          // Clear invalid token
          await api.clearAuthToken();
        }
      }
      
      // If we get here, either no token or invalid token
      if (DEV) log.info('[Auth] No valid token found, using fallback auth');
      setAuth(FALLBACK_AUTH);
      
    } catch (error) {
      if (DEV) log.error('[Auth] Error initializing auth context:', error);
      setAuth({
        ...FALLBACK_AUTH,
        error: error.message || 'Failed to initialize authentication'
      });
    }
  }, []);

  // Once the auth module is loaded, initialize auth state on mount
  useEffect(() => {
    if (!authModule) return;
    if (initRef.current) return; // prevent duplicate init in React StrictMode
    initRef.current = true;
    
    if (DEV) log.info('[Auth] Setting up auth...');
    setupAuth();
    
    // Listen for storage events to handle token changes across tabs
    const tokenKey = (api.TOKEN_KEYS?.storageKey || 'auth_token');
    const handleStorageChange = (e) => {
      if (e.key !== tokenKey) return;
      if (DEV && !window.__AUTH_STORAGE_CHANGE_LOGGED__) {
        log.info('[Auth] Auth token changed in storage (debounced revalidation)...');
        window.__AUTH_STORAGE_CHANGE_LOGGED__ = true;
      }
      if (storageDebounceRef.current) clearTimeout(storageDebounceRef.current);
      storageDebounceRef.current = setTimeout(() => {
        setupAuth();
        storageDebounceRef.current = null;
      }, 300);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (storageDebounceRef.current) {
        clearTimeout(storageDebounceRef.current);
        storageDebounceRef.current = null;
      }
    };
  }, [authModule, setupAuth, DEV]);

  return useMemo(() => ({
    ...auth,
    loading: loading || auth.loading
  }), [auth, loading]);
};

export default useAuthContext;
