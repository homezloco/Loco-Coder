import logger from '../../utils/logger';
const configLog = logger.ns('api:config');

// Get API configuration from environment variables with fallbacks
const getApiConfig = () => {
  // Use process.env for Node.js (Jest) or import.meta.env for Vite
  const env = (() => {
    try {
      if (typeof process !== 'undefined' && process.env) return process.env;
      // eslint-disable-next-line no-undef
      return import.meta.env;
    } catch {
      return {};
    }
  })();
  
  // Debug environment variables
  if (process.env.NODE_ENV !== 'test') {
    configLog.info('Environment Variables:', {
      VITE_API_BASE_URL: env.VITE_API_BASE_URL,
      VITE_API_FALLBACK_URLS: env.VITE_API_FALLBACK_URLS,
      NODE_ENV: env.MODE || env.NODE_ENV,
      PROD: env.PROD || (env.NODE_ENV === 'production'),
      DEV: env.DEV || (env.NODE_ENV === 'development')
    });
  }

  // Default base URL - use relative URL for Vite proxy in production
  const isDev = !!(env.DEV || env.NODE_ENV === 'development');
  const defaultBaseUrl = isDev ? 'http://localhost:8000' : '/api';
  
  // Get base URL from environment or use default
  const baseUrl = env.VITE_API_BASE_URL || defaultBaseUrl;
  
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
    if (env.VITE_API_FALLBACK_URLS) {
      const parsed = JSON.parse(env.VITE_API_FALLBACK_URLS);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any empty strings and ensure unique URLs
        fallbackUrls = [...new Set([
          ...parsed.filter(url => url && typeof url === 'string'),
          ...fallbackUrls
        ])];
      }
    }
  } catch (e) {
    configLog.warn('Failed to parse VITE_API_FALLBACK_URLS, using default fallback URLs', e);
  }

  // Remove duplicates and empty strings
  fallbackUrls = [...new Set(fallbackUrls.filter(url => url && typeof url === 'string'))];
  
  configLog.info('API Configuration:', { baseUrl, fallbackUrls });
  return { baseUrl, fallbackUrls };
};

const { baseUrl, fallbackUrls } = getApiConfig();

export const API_BASE_URL = baseUrl;
export const FALLBACK_URLS = fallbackUrls;

// API endpoints
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/v1/auth/login',
    LOGOUT: '/v1/auth/logout',
    VALIDATE: '/v1/auth/validate',
    ERROR: '/v1/auth/error',
    ME: '/v1/auth/me',
    REFRESH: '/v1/auth/refresh',
    REGISTER: '/v1/auth/register'
  },
  PROJECTS: {
    BASE: '/v1/projects',
    BY_ID: (id) => `/v1/projects/${id}`,
    FILES: (id) => `/v1/projects/${id}/files`,
    FILE: (projectId, filePath) => `/v1/projects/${projectId}/files/${encodeURIComponent(filePath)}`
  },
  TEMPLATES: '/v1/templates',
  EXECUTE: '/v1/execute'
};

// Get token configuration from environment variables with fallbacks
const getTokenConfig = () => {
  // Use process.env for Node.js (Jest) or import.meta.env for Vite
  const env = (() => {
    try {
      if (typeof process !== 'undefined' && process.env) return process.env;
      // eslint-disable-next-line no-undef
      return import.meta.env;
    } catch {
      return {};
    }
  })();
  // Debug token config
  configLog.info('Token Configuration Environment:', {
    VITE_TOKEN_STORAGE_KEY: env.VITE_TOKEN_STORAGE_KEY,
    VITE_TOKEN_REFRESH_KEY: env.VITE_TOKEN_REFRESH_KEY,
    VITE_TOKEN_EXPIRES_IN: env.VITE_TOKEN_EXPIRES_IN
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
    storageKey: env.VITE_TOKEN_STORAGE_KEY || defaultConfig.storageKey,
    refreshKey: env.VITE_TOKEN_REFRESH_KEY || defaultConfig.refreshKey,
    expiresIn: parseInt(env.VITE_TOKEN_EXPIRES_IN, 10) || defaultConfig.expiresIn,
    storageType: env.VITE_TOKEN_STORAGE_TYPE || defaultConfig.storageType,
    autoRefresh: env.VITE_TOKEN_AUTO_REFRESH 
      ? env.VITE_TOKEN_AUTO_REFRESH === 'true' 
      : defaultConfig.autoRefresh,
    refreshThreshold: parseInt(env.VITE_TOKEN_REFRESH_THRESHOLD, 10) || defaultConfig.refreshThreshold,
    cookieOptions: {
      ...defaultConfig.cookieOptions,
      secure: (typeof window !== 'undefined' && window.location) ? (window.location.protocol === 'https:') : false
    }
  };

  configLog.info('Token Configuration:', config);
  return config;
};

// Get cache configuration from environment variables with fallbacks
const getCacheConfig = () => {
  const env = (() => {
    try {
      if (typeof process !== 'undefined' && process.env) return process.env;
      // eslint-disable-next-line no-undef
      return import.meta.env;
    } catch {
      return {};
    }
  })();
  return {
    DEFAULT_TTL: parseInt(env.VITE_CACHE_TTL || '300000', 10), // 5 minutes
    CLEANUP_INTERVAL: parseInt(env.VITE_CACHE_CLEANUP_INTERVAL || '60000', 10), // 1 minute
    ENABLED: !(env.VITE_CACHE_ENABLED === 'false')
  };
};

// Token storage keys
export const TOKEN_KEYS = getTokenConfig();

// Cache configuration
export const CACHE_CONFIG = getCacheConfig();
