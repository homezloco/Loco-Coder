import { API_BASE_URL, FALLBACK_URLS, TOKEN_KEYS } from './config';

// Token management
let authToken = null;
let currentBaseUrl = API_BASE_URL;

// Store token
const storeToken = (token) => {
  if (!token) return;
  authToken = token;
  try {
    localStorage.setItem(TOKEN_KEYS.storageKey, token);
  } catch (e) {
    console.warn('Failed to store token:', e);
  }
};

// Clear auth data
const clearAuthData = () => {
  authToken = null;
  try {
    localStorage.removeItem(TOKEN_KEYS.storageKey);
    sessionStorage.removeItem(TOKEN_KEYS.storageKey);
  } catch (e) {
    console.warn('Failed to clear auth data:', e);
  }
};

// Initialize token from storage
const initAuthToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEYS.storageKey) || 
                 sessionStorage.getItem(TOKEN_KEYS.storageKey);
    if (token) authToken = token;
  } catch (e) {
    console.warn('Failed to init token:', e);
  }
};

// Enhanced fetch with auth
const fetchWithAuth = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${currentBaseUrl}${url}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401) {
      clearAuthData();
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { isAuthenticated: false } 
      }));
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const error = new Error(`Request failed: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Initialize on import
initAuthToken();

export {
  fetchWithAuth as fetch,
  storeToken,
  clearAuthData,
  initAuthToken,
  authToken,
};
