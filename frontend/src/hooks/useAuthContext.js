import { useMemo, useEffect, useState } from 'react';

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
  loading: false
};

// This is a placeholder that will be replaced with the actual useAuth hook
let useAuthImpl = () => FALLBACK_AUTH;

// Try to import the actual useAuth hook if available
const loadAuthHook = async () => {
  try {
    // Use dynamic import to avoid circular dependencies
    const module = await import('../contexts/NewAuthContext');
    if (module?.useAuth) {
      useAuthImpl = module.useAuth;
    }
  } catch (error) {
    console.warn('Failed to load auth context:', error);
  }
};

// Load the auth hook when the module is imported
loadAuthHook();

/**
 * Custom hook to safely access the auth context with built-in fallback
 * @returns {Object} Auth context with fallback values
 */
export const useAuthContext = () => {
  const [auth, setAuth] = useState(FALLBACK_AUTH);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupAuth = async () => {
      try {
        const authHook = useAuthImpl();
        const authValue = typeof authHook === 'function' ? authHook() : authHook;
        
        // Ensure we always have the expected methods and properties
        const normalizedAuth = {
          isAuthenticated: !!authValue?.isAuthenticated,
          user: authValue?.user || null,
          token: authValue?.token || null,
          login: authValue?.login || FALLBACK_AUTH.login,
          logout: authValue?.logout || FALLBACK_AUTH.logout,
          register: authValue?.register || FALLBACK_AUTH.register,
          loading: authValue?.loading ?? false
        };
        
        setAuth(normalizedAuth);
      } catch (error) {
        console.warn('Error initializing auth context:', error);
        setAuth(FALLBACK_AUTH);
      } finally {
        setLoading(false);
      }
    };

    setupAuth();
  }, []);

  return useMemo(() => ({
    ...auth,
    loading
  }), [auth, loading]);
};

export default useAuthContext;
