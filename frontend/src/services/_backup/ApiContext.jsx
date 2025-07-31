import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useFeedback } from '../components/feedback/FeedbackContext';
import api from '../services/api';

const ApiContext = createContext();

// Create axios instance with base config for legacy code
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ApiProvider = ({ children }) => {
  const { token, logout, user } = useAuth();
  const { showErrorToast } = useFeedback();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize API with auth token when it changes
  useEffect(() => {
    if (token) {
      api.setAuthToken(token, true);
    } else {
      api.clearAuthToken();
    }
  }, [token]);

  // Add request interceptor to include auth token (for legacy code)
  const requestInterceptor = useCallback(() => {
    return axiosInstance.interceptors.request.use(
      (config) => {
        // Add auth token to headers if it exists
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }, [token]);

  // Add response interceptor (for legacy code)
  const responseInterceptor = useCallback(() => {
    return axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 and we haven't already tried to refresh the token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Try to refresh the token
            const newToken = await api.auth.refreshToken();
            if (newToken) {
              // Update the auth header
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              // Retry the original request
              return axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            // If refresh fails, log the user out
            logout();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }, [logout]);

  // Initialize interceptors
  useEffect(() => {
    const reqInterceptor = requestInterceptor();
    const resInterceptor = responseInterceptor();
    
    return () => {
      // Cleanup interceptors
      axiosInstance.interceptors.request.eject(reqInterceptor);
      axiosInstance.interceptors.response.eject(resInterceptor);
    };
  }, [requestInterceptor, responseInterceptor]);

  // Legacy API methods for backward compatibility
  const legacyApi = {
    get: async (url, config = {}) => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(url, config);
        return response.data;
      } catch (error) {
        handleApiError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    
    post: async (url, data = {}, config = {}) => {
      try {
        setLoading(true);
        const response = await axiosInstance.post(url, data, config);
        return response.data;
      } catch (error) {
        handleApiError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    
    put: async (url, data = {}, config = {}) => {
      try {
        setLoading(true);
        const response = await axiosInstance.put(url, data, config);
        return response.data;
      } catch (error) {
        handleApiError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    
    delete: async (url, config = {}) => {
      try {
        setLoading(true);
        const response = await axiosInstance.delete(url, config);
        return response.data;
      } catch (error) {
        handleApiError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    
    // Expose the axios instance for advanced use cases
    axios: axiosInstance
  };

  // Handle API errors consistently
  const handleApiError = (error) => {
    const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred';
    setError(errorMessage);
    showErrorToast(errorMessage);
    
    // Auto-logout on 401 Unauthorized
    if (error.response?.status === 401) {
      logout();
    }
    
    return errorMessage;
  };

  // Combine the new API with legacy API for backward compatibility
  const apiWithContext = {
    ...api,
    ...legacyApi,
    loading,
    error,
    clearError: () => setError(null),
    handleApiError,
    // Add any additional context-specific methods here
  };

  // Set up the context value
  const contextValue = {
    ...apiWithContext,
    // Add any additional context values here
  };

  return (
    <ApiContext.Provider value={contextValue}>
      {children}
    </ApiContext.Provider>
  );
};

// Custom hook to use the API context
export const useApi = () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

export default ApiContext;      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Handle token expiration (401) and retry logic
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // TODO: Implement token refresh logic if needed
            // const response = await api.post('/auth/refresh-token');
            // const { token: newToken } = response.data;
            // localStorage.setItem('token', newToken);
            // originalRequest.headers.Authorization = `Bearer ${newToken}`;
            // return api(originalRequest);
            
            // For now, just log out the user
            logout();
            return Promise.reject(error);
          } catch (refreshError) {
            logout();
            return Promise.reject(refreshError);
          }
        }
        
        // Handle other errors
        if (error.response) {
          // Server responded with a status code outside the 2xx range
          const { status, data } = error.response;
          let errorMessage = 'An error occurred';
          
          if (data && data.message) {
            errorMessage = data.message;
          } else if (status === 404) {
            errorMessage = 'Resource not found';
          } else if (status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          }
          
          showErrorToast(errorMessage);
          setError({ message: errorMessage, status });
        } else if (error.request) {
          // Request was made but no response was received
          const errorMessage = 'No response from server. Please check your connection.';
          showErrorToast(errorMessage);
          setError({ message: errorMessage });
        } else {
          // Something happened in setting up the request
          const errorMessage = error.message || 'An unexpected error occurred';
          showErrorToast(errorMessage);
          setError({ message: errorMessage });
        }
        
        return Promise.reject(error);
      }
    );
  }, [logout, showErrorToast]);

  // Set up interceptors when component mounts
  React.useEffect(() => {
    const reqInterceptor = requestInterceptor();
    const resInterceptor = responseInterceptor();
    
    // Clean up interceptors when component unmounts
    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
    };
  }, [requestInterceptor, responseInterceptor]);

  // API methods
  const get = async (url, config = {}) => {
    try {
      setLoading(true);
      const response = await api.get(url, config);
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const post = async (url, data = {}, config = {}) => {
    try {
      setLoading(true);
      const response = await api.post(url, data, config);
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const put = async (url, data = {}, config = {}) => {
    try {
      setLoading(true);
      const response = await api.put(url, data, config);
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const del = async (url, config = {}) => {
    try {
      setLoading(true);
      const response = await api.delete(url, config);
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const patch = async (url, data = {}, config = {}) => {
    try {
      setLoading(true);
      const response = await api.patch(url, data, config);
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <ApiContext.Provider
      value={{
        loading,
        error,
        clearError,
        get,
        post,
        put,
        delete: del,
        patch,
        // Expose the axios instance as well for advanced use cases
        axios: api,
      }}
    >
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

export default ApiContext;
