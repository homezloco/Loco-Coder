import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '../components/feedback/FeedbackContext';
import api from '../services/api';

// Create the context
const NewAuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(() => {
    // Initialize token from localStorage
    const tokenKey = api.TOKEN_KEYS?.storageKey || 'auth_token';
    return localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey) || null;
  });
  
  const { showErrorToast, showSuccessToast } = useFeedback();
  const navigate = useNavigate();

  // Initialize auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // First, try to get token from API service
        let currentToken = await api.getAuthToken();
        
        // If no token in API service, check localStorage directly as fallback
        if (!currentToken) {
          const tokenKey = api.TOKEN_KEYS?.storageKey || 'auth_token';
          currentToken = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
          
          // If we found a token in storage, set it in the API service
          if (currentToken) {
            await api.setAuthToken(currentToken);
            // If we have a token, try to get user data
            try {
              const userData = await api.auth.me();
              setUser(userData);
              setIsAuthenticated(true);
            } catch (error) {
              console.warn('[Auth] Failed to fetch user data:', error);
              // Clear invalid token
              await api.clearAuthToken();
            }
          }
        } else {
          // We have a token, try to get user data
          try {
            const userData = await api.auth.me();
            setUser(userData);
            setIsAuthenticated(true);
          } catch (error) {
            console.warn('[Auth] Failed to fetch user data:', error);
            // Clear invalid token
            await api.clearAuthToken();
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('[Auth] Error initializing auth:', error);
        // Ensure clean state on error
        setUser(null);
        setIsAuthenticated(false);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    
    // Initialize auth state
    checkAuth();
    
    // Listen for storage events to handle token changes across tabs
    const handleStorageChange = (e) => {
      if (e.key === api.TOKEN_KEYS.storageKey) {
        console.log('[Auth] Token changed in storage, revalidating...');
        checkAuth();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Login function
  const login = async (username, password, rememberMe = false) => {
    try {
      setLoading(true);
      
      // Clear any existing auth state
      await api.clearAuthToken();
      
      // Call API login with skipValidation to avoid circular validation
      const { token, user } = await api.auth.login(username, password);
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Store token using the API service which handles all storage locations
      // Pass the rememberMe flag to control storage persistence
      await api.setAuthToken(token, { 
        persist: rememberMe,
        skipValidation: true // Skip initial validation since we just got this token
      });
      
      // Update state
      setUser(user);
      setIsAuthenticated(true);
      
      console.log('[Auth] Login successful');
      showSuccessToast('Successfully logged in');
      return { success: true };
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      // Ensure clean state on failure
      await logout();
      
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Login failed. Please try again.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear token using the API service which handles all storage locations
      await api.clearAuthToken();
      
      // Clear state
      setUser(null);
      setIsAuthenticated(false);
      
      console.log('[Auth] Logout successful');
      
      // Show success message
      showSuccessToast('Successfully logged out');
      
      // Navigate to login with a small delay to ensure state is updated
      setTimeout(() => {
        navigate('/login', { replace: true });
        // Force a hard refresh to ensure all state is cleared
        window.location.href = '/login';
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      showErrorToast('Error during logout. Please try again.');
      return false;
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      const { user: registeredUser, token: authToken } = await api.auth.register(userData);
      
      setUser(registeredUser);
      setToken(authToken);
      showSuccessToast('Registration successful');
      return registeredUser;
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      showErrorToast(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (updates) => {
    try {
      setLoading(true);
      const updatedUser = await api.auth.updateProfile(updates);
      setUser(updatedUser);
      showSuccessToast('Profile updated successfully');
      return updatedUser;
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update profile.';
      showErrorToast(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      await api.auth.changePassword(currentPassword, newPassword);
      showSuccessToast('Password changed successfully');
      return true;
    } catch (error) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to change password.';
      showErrorToast(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const contextValue = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    register,
    updateProfile,
    changePassword,
  };

  return (
    <NewAuthContext.Provider value={contextValue}>
      {!loading && children}
    </NewAuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(NewAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default NewAuthContext;
