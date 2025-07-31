import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '../components/feedback/FeedbackContext';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showErrorToast, showSuccessToast } = useFeedback();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session on initial load
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Validate token with backend
        const response = await fetch('http://localhost:8000/api/v1/auth/validate', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          // Update stored user data
          localStorage.setItem('userData', JSON.stringify(userData));
        } else {
          // Token is invalid or expired
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);
      
      console.log('[Auth] Attempting login with username:', credentials.username);
      
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Auth] Login failed:', response.status, errorData);
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json().catch(() => ({}));
      const { access_token, user } = data;
      
      if (!access_token) {
        console.error('[Auth] No access token in response:', data);
        throw new Error('No access token received from server');
      }
      
      console.log('[Auth] Login successful, storing token');
      
      console.log('[Auth] Storing token in localStorage and API client');
      
      // 1. First store in localStorage
      localStorage.setItem('token', access_token);
      
      // 2. Update API client
      console.log('[Auth] Updating API client with new token');
      api.setAuthToken(access_token);
      
      // 3. Verify token was stored and synced
      const storedToken = localStorage.getItem('token');
      if (storedToken !== access_token) {
        console.error('[Auth] Failed to store token in localStorage');
        throw new Error('Failed to store authentication token');
      }
      
      // 4. Verify API client has the token
      const apiToken = api.getAuthToken();
      if (apiToken !== access_token) {
        console.error('[Auth] Token not properly set in API client');
        console.log('[Auth] Expected token:', access_token ? '***' : 'none');
        console.log('[Auth] API client token:', apiToken ? '***' : 'none');
        throw new Error('Failed to initialize API client with authentication token');
      }
      
      // 3. Update API client
      if (window.api && typeof window.api.setAuthToken === 'function') {
        console.log('[Auth] Updating API client with new token');
        window.api.setAuthToken(access_token);
      } else {
        console.warn('[Auth] API client not available for token update');
      }
      
      // Store user data
      if (user) {
        localStorage.setItem('userData', JSON.stringify(user));
      }
      
      // Update the API client's token
      console.log('[Auth] Updating API client token');
      if (window.api) {
        window.api.setAuthToken(access_token);
        
        // Verify the API client has the token
        const apiToken = window.api.getAuthToken();
        if (!apiToken) {
          console.error('[Auth] Failed to set token in API client');
          throw new Error('Failed to initialize API client with token');
        }
      } else {
        console.warn('[Auth] API client not available on window.api');
      }
      
      setUser(user);
      showSuccessToast('Login successful!');
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      showErrorToast(error.response?.data?.message || 'Login failed. Please try again.');
      return false;
    }
  };

  const logout = () => {
    console.log('[Auth] Logging out, removing token');
    localStorage.removeItem('token');
    
    // Clear token from API client if available
    if (window.api && typeof window.api.setAuthToken === 'function') {
      console.log('[Auth] Clearing token from API client');
      window.api.setAuthToken(null);
    }
    
    setUser(null);
    setLoading(false);
    setError(null);
    navigate('/login');
    showSuccessToast('You have been logged out.');
  };

  const updateUser = (userData) => {
    setUser(prev => ({
      ...prev,
      ...userData
    }));
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        loading,
        login,
        logout,
        updateUser,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
