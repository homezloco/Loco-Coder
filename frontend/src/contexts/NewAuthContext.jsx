import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '../components/feedback/FeedbackContext';
import api from '../services/api';

// Create the context
const NewAuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => {
    // Initialize token from localStorage
    return localStorage.getItem('token') || null;
  });
  
  const { showErrorToast, showSuccessToast } = useFeedback();
  const navigate = useNavigate();

  // Initialize auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const currentToken = api.getAuthToken();
        
        if (!currentToken) {
          setLoading(false);
          return;
        }

        // Validate token with backend using our new API
        const userData = await api.getCurrentUser();
        if (userData) {
          setUser(userData);
          setToken(currentToken);
        }
      } catch (error) {
        console.error('Auth validation error:', error);
        // Clear invalid token
        await api.clearAuthToken();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const { user: userData, token: authToken } = await api.auth.login(email, password);
      
      setUser(userData);
      setToken(authToken);
      showSuccessToast('Successfully logged in');
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      showErrorToast(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear local state first for immediate UI update
      setUser(null);
      setToken(null);
      
      // Call the API logout if we have a valid token
      if (token) {
        try {
          await api.auth.logout();
        } catch (error) {
          console.error('API logout error:', error);
          // Continue with local logout even if API call fails
        }
      }
      
      // Clear all auth-related data from storage
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
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

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!token && !!user;
  }, [token, user]);

  // Context value
  const contextValue = {
    user,
    token,
    loading,
    isAuthenticated: isAuthenticated(),
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
