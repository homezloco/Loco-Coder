// Get API configuration from environment variables with fallbacks
const getApiConfig = () => {
  // Default base URL - use relative URL for Vite proxy
  const defaultBaseUrl = '/api';
  
  // Get base URL from environment or use default
  const baseUrl = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;
  
  // Get fallback URLs from environment or use defaults
  let fallbackUrls = [
    'http://localhost:8000',
    'http://127.0.0.1:8000'
  ];
  
  try {
    if (import.meta.env.VITE_API_FALLBACK_URLS) {
      const parsed = JSON.parse(import.meta.env.VITE_API_FALLBACK_URLS);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any empty strings and ensure unique URLs
        fallbackUrls = [...new Set([
          ...parsed.filter(url => url && typeof url === 'string'),
          ...fallbackUrls
        ])];
      }
    }
  } catch (e) {
    console.warn('Failed to parse VITE_API_FALLBACK_URLS, using default fallback URLs', e);
  }
  
  return { baseUrl, fallbackUrls };
};

const { baseUrl, fallbackUrls } = getApiConfig();

export const API_BASE_URL = baseUrl;
export const FALLBACK_URLS = fallbackUrls;

// API endpoints
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    VALIDATE: '/api/v1/auth/validate'
  },
  PROJECTS: {
    BASE: '/api/v1/projects',
    BY_ID: (id) => `/api/v1/projects/${id}`,
    FILES: (id) => `/api/v1/projects/${id}/files`,
    FILE: (projectId, filePath) => `/api/v1/projects/${projectId}/files/${encodeURIComponent(filePath)}`
  },
  TEMPLATES: '/api/v1/templates',
  EXECUTE: '/api/v1/execute'
};

// Get token configuration from environment variables with fallbacks
const getTokenConfig = () => ({
  LOCAL_STORAGE: import.meta.env.VITE_TOKEN_STORAGE_KEY || 'token',
  SESSION_STORAGE: import.meta.env.VITE_TOKEN_SESSION_KEY || 'token',
  COOKIE: import.meta.env.VITE_TOKEN_COOKIE_KEY || 'token',
  HEADER: import.meta.env.VITE_TOKEN_HEADER || 'Authorization'
});

// Get cache configuration from environment variables with fallbacks
const getCacheConfig = () => ({
  DEFAULT_TTL: parseInt(import.meta.env.VITE_CACHE_TTL || '300000', 10), // 5 minutes
  CLEANUP_INTERVAL: parseInt(import.meta.env.VITE_CACHE_CLEANUP_INTERVAL || '60000', 10), // 1 minute
  ENABLED: !(import.meta.env.VITE_CACHE_ENABLED === 'false')
});

// Token storage keys
export const TOKEN_KEYS = getTokenConfig();

// Cache configuration
export const CACHE_CONFIG = getCacheConfig();
