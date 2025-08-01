import { API_BASE_URL, FALLBACK_URLS, TOKEN_KEYS } from './config';

// Token management
let authToken = null;
let currentBaseUrl = API_BASE_URL;

/**
 * Store the authentication token
 * @param {string} token - The JWT token
 * @param {boolean} remember - Whether to persist the token across sessions
 */
const storeToken = (token, remember = true) => {
  if (!token) return;
  authToken = token;
  try {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEYS.storageKey, token);
  } catch (e) {
    console.warn('Failed to store token:', e);
  }
};

/**
 * Clear all authentication data
 */
const clearAuthData = () => {
  authToken = null;
  try {
    localStorage.removeItem(TOKEN_KEYS.storageKey);
    sessionStorage.removeItem(TOKEN_KEYS.storageKey);
  } catch (e) {
    console.warn('Failed to clear auth data:', e);
  }
};

/**
 * Initialize token from storage
 */
const initAuthToken = () => {
  try {
    // Try localStorage first, then sessionStorage
    const token = localStorage.getItem(TOKEN_KEYS.storageKey) || 
                 sessionStorage.getItem(TOKEN_KEYS.storageKey);
    if (token) {
      authToken = token;
      return true;
    }
  } catch (e) {
    console.warn('Failed to initialize token:', e);
  }
  return false;
};

/**
 * Enhanced fetch with auth and error handling
 */
const fetchWithAuth = async (url, options = {}) => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(options.headers || {})
  });

  // Add auth header if we have a token and it's not an auth endpoint
  if (authToken && !url.includes('/auth/') && !options.skipAuth) {
    headers.append('Authorization', `Bearer ${authToken}`);
  }

  try {
    const response = await fetch(`${currentBaseUrl}${url}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      clearAuthData();
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { isAuthenticated: false } 
      }));
      throw new Error('Session expired. Please log in again.');
    }

    // Handle other error statuses
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      
      const error = new Error(errorData.message || 'Request failed');
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Auth methods
const auth = {
  async login(credentials, remember = true) {
    const response = await fetchWithAuth('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true
    });
    
    const data = await response.json();
    if (data.token) {
      storeToken(data.token, remember);
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { isAuthenticated: true, user: data.user } 
      }));
    }
    return data;
  },
  
  async logout() {
    try {
      await fetchWithAuth('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      clearAuthData();
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { isAuthenticated: false } 
      }));
    }
  },
  
  async getCurrentUser() {
    const response = await fetchWithAuth('/api/v1/auth/me');
    return response.json();
  }
};

// Project methods
const projects = {
  async getAll() {
    const response = await fetchWithAuth('/api/v1/projects');
    return response.json();
  },
  
  async getById(id) {
    const response = await fetchWithAuth(`/api/v1/projects/${id}`);
    return response.json();
  },
  
  async create(projectData) {
    const response = await fetchWithAuth('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
    return response.json();
  }
};

// Initialize token on import
initAuthToken();

export default {
  // Core methods
  fetch: fetchWithAuth,
  setBaseUrl: (url) => { currentBaseUrl = url; },
  getBaseUrl: () => currentBaseUrl,
  
  // Auth
  ...auth,
  isAuthenticated: () => !!authToken,
  
  // Resources
  projects,
  
  // Token management
  storeToken,
  clearAuthData,
  initAuthToken
};
