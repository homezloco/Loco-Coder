// Get API configuration from environment variables with fallbacks
const getApiConfig = () => {
  // Debug environment variables
  console.log('Environment Variables:', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_API_FALLBACK_URLS: import.meta.env.VITE_API_FALLBACK_URLS,
    NODE_ENV: import.meta.env.MODE,
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV
  });

  // Default base URL - use relative URL for Vite proxy in production
  const defaultBaseUrl = import.meta.env.DEV ? 'http://localhost:8000' : '/api';
  
  // Get base URL from environment or use default
  const baseUrl = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;
  
  // Default fallback URLs for different environments
  const defaultFallbackUrls = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://0.0.0.0:8000',
    'http://[::1]:8000',
    'http://localhost:5173', // Vite dev server
    'http://127.0.0.1:5173',
    'https://localhost:8000',
    'https://127.0.0.1:8000'
  ];

  // Get fallback URLs from environment or use defaults
  let fallbackUrls = [...defaultFallbackUrls];
  
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

  // Remove duplicates and empty strings
  fallbackUrls = [...new Set(fallbackUrls.filter(url => url && typeof url === 'string'))];
  
  console.log('API Configuration:', { baseUrl, fallbackUrls });
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
const getTokenConfig = () => {
  // Debug token config
  console.log('Token Configuration Environment:', {
    VITE_TOKEN_STORAGE_KEY: import.meta.env.VITE_TOKEN_STORAGE_KEY,
    VITE_TOKEN_REFRESH_KEY: import.meta.env.VITE_TOKEN_REFRESH_KEY,
    VITE_TOKEN_EXPIRES_IN: import.meta.env.VITE_TOKEN_EXPIRES_IN
  });

  // Default token configuration
  const defaultConfig = {
    storageKey: 'auth_token',
    refreshKey: 'refresh_token',
    expiresIn: 3600 * 24 * 7, // 1 week by default
    storageType: 'localStorage', // 'localStorage', 'sessionStorage', or 'memory'
    autoRefresh: true,
    refreshThreshold: 300, // 5 minutes before token expires
    cookieOptions: {
      path: '/',
      secure: window.location.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    }
  };

  // Get token config from environment variables with fallbacks
  const config = {
    storageKey: import.meta.env.VITE_TOKEN_STORAGE_KEY || defaultConfig.storageKey,
    refreshKey: import.meta.env.VITE_TOKEN_REFRESH_KEY || defaultConfig.refreshKey,
    expiresIn: parseInt(import.meta.env.VITE_TOKEN_EXPIRES_IN, 10) || defaultConfig.expiresIn,
    storageType: import.meta.env.VITE_TOKEN_STORAGE_TYPE || defaultConfig.storageType,
    autoRefresh: import.meta.env.VITE_TOKEN_AUTO_REFRESH 
      ? import.meta.env.VITE_TOKEN_AUTO_REFRESH === 'true' 
      : defaultConfig.autoRefresh,
    refreshThreshold: parseInt(import.meta.env.VITE_TOKEN_REFRESH_THRESHOLD, 10) || defaultConfig.refreshThreshold,
    cookieOptions: {
      ...defaultConfig.cookieOptions,
      secure: window.location.protocol === 'https:'
    }
  };

  console.log('Token Configuration:', config);
  return config;
};

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
