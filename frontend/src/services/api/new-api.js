// Import configuration and services
import { API_BASE_URL, FALLBACK_URLS, TOKEN_KEYS, ENDPOINTS } from "./config";
import createAiService from './modules/ai';
import { fetchWithTimeout } from './utils/fetch';
import { 
  getAuthToken,
  isTokenExpired,
  storeToken,
  clearAuthData,
  initAuthToken
} from './utils/token';
import {
  getCurrentBaseUrl,
  tryNextFallbackUrl,
  createFormData,
  debounce,
  clearCacheAfterTTL,
  cleanExpiredCache
} from './utils/url';
import { handleApiError } from './utils/errors';

// Debug configuration
console.group('[API] Initializing API Service');
console.log('Base URL:', API_BASE_URL);
console.log('Fallback URLs:', FALLBACK_URLS);
console.log('Token Configuration:', TOKEN_KEYS);
console.groupEnd();

// AI Service instance
let aiService = null;

// Track refresh state
let isRefreshing = false;
let refreshSubscribers = [];

// Track last token check time to prevent excessive logging
let lastTokenCheck = 0;

// Initialize AI service
const initAiService = () => {
  if (!aiService) {
    aiService = createAiService({
      baseUrl: API_BASE_URL,
      getToken: getAuthToken,
      onError: handleApiError
    });
  }
  return aiService;
};

// Wait for AI service to be ready
export const waitForAiService = async () => {
  if (aiService) return aiService;
  
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (aiService) {
        clearInterval(checkInterval);
        resolve(aiService);
      }
    }, 100);
  });
};

// API methods
export const api = {
  // Auth methods
  login: async (username, password) => {
    try {
      const response = await fetchWithTimeout(
        `${getCurrentBaseUrl()}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
          skipAuth: true
        }
      );

      if (!response.ok) {
        const error = await handleApiError(response);
        throw error;
      }

      const data = await response.json();
      
      // Store tokens
      if (data.token) {
        storeToken(
          data.token,
          data.refreshToken,
          data.expiresIn
        );
      }

      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      // Try to invalidate the token on the server
      await fetchWithTimeout(
        `${getCurrentBaseUrl()}/auth/logout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: getAuthToken() })
        }
      );
    } catch (e) {
      console.warn('Failed to invalidate session on server:', e);
    } finally {
      // Always clear local auth data
      clearAuthData();
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await fetchWithTimeout(
        `${getCurrentBaseUrl()}/health`,
        { skipAuth: true }
      );
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },

  // Token management
  getAuthToken,
  setAuthToken: (token, refreshTokenValue = null, expiresIn = null) => {
    storeToken(token, refreshTokenValue, expiresIn);
  },
  clearAuthToken: clearAuthData,
  initAuthToken,

  // AI Service
  ai: {
    execute: async (prompt, options = {}) => {
      const service = initAiService();
      return service.execute(prompt, options);
    },
    getService: () => {
      return initAiService();
    }
  },

  // Utility methods
  getCurrentBaseUrl,
  tryNextFallbackUrl,
  createFormData,
  debounce,
  clearCacheAfterTTL,
  cleanExpiredCache,
  handleApiError
};

// Initialize auth token when the module loads
initAuthToken().then(token => {
  if (token) {
    console.log('[API] Initialized with token');
  } else {
    console.log('[API] No valid token found');
  }
}).catch(error => {
  console.error('[API] Failed to initialize auth token:', error);
});

// Re-initialize when the page becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    initAuthToken().catch(console.error);
  }
});

// Make the API client available globally for debugging
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.api = api;
}

export default api;
