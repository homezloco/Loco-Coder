import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { verifyToken } from '../../../api/auth';
import logger from '../../../utils/logger';

export const AuthContext = createContext();
const log = logger.ns('auth');

export const AuthProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const response = await verifyToken();
          if (response.success) {
            setAuthenticated(true);
            setUsername(response.username);
            setIsAdmin(response.isAdmin || false);
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('authToken');
          }
        }
      } catch (error) {
        log.error('Authentication check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback((userData) => {
    try {
      const { username, isAdmin = false, token } = userData;
      
      // Update state
      setAuthenticated(true);
      setUsername(username);
      setIsAdmin(isAdmin);
      
      // Store auth token if provided
      if (token) {
        localStorage.setItem('authToken', token);
      }
      
      // Store user data in localStorage for persistence
      localStorage.setItem('user', JSON.stringify({
        username,
        isAdmin,
        lastLogin: Date.now()
      }));
      
      if (import.meta?.env?.DEV) {
        log.info('Login successful', { hasToken: !!token, isAdmin: !!isAdmin });
      }
      
      return true;
    } catch (error) {
      log.error('Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    // Clear auth state
    setAuthenticated(false);
    setUsername('');
    setIsAdmin(false);
    
    // Clear stored data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    if (import.meta?.env?.DEV) {
      log.info('User logged out');
    }
  }, []);

  const value = {
    authenticated,
    username,
    isAdmin,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
