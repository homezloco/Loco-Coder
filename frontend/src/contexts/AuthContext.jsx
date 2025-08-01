import React, { createContext, useContext, useMemo } from 'react';
import useAuth from '../hooks/useAuth';

// Create the auth context
const AuthContext = createContext(null);

/**
 * AuthProvider component that wraps your app and makes auth object available to any child component.
 */
export const AuthProvider = ({ children }) => {
  const auth = useAuth();
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    ...auth,
    // Add any additional auth methods or state here
  }), [auth]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use the auth context
 * @returns {Object} Auth context with user state and auth methods
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
