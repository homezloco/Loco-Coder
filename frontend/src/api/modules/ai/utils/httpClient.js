import axios from 'axios';
import { DEFAULT_CONFIG } from '../config/defaults';

/**
 * Creates a configured axios instance
 * @param {Object} config - Configuration overrides
 * @returns {import('axios').AxiosInstance} Configured axios instance
 */
export function createHttpClient(config = {}) {
  const baseURL = process.env.REACT_APP_OLLAMA_API_URL || 'http://172.28.112.1:11434';
  
  const instance = axios.create({
    baseURL,
    timeout: config.timeout || DEFAULT_CONFIG.requestTimeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // Request interceptor
  instance.interceptors.request.use(
    config => {
      const requestId = Math.random().toString(36).substring(2, 8);
      config.metadata = { requestId, startTime: Date.now() };
      console.log(`[AI Service] [${requestId}] Starting ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    error => {
      console.error('[AI Service] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    response => {
      const { config } = response;
      const endTime = Date.now();
      const duration = endTime - (config.metadata?.startTime || endTime);
      console.log(`[AI Service] [${config.metadata?.requestId || 'unknown'}] Request completed in ${duration}ms`);
      return response;
    },
    error => {
      const { config, response } = error;
      
      if (response) {
        console.error(`[AI Service] Request failed with status ${response.status}:`, response.data);
      } else if (error.request) {
        console.error('[AI Service] No response received:', error.request);
      } else {
        console.error('[AI Service] Request setup error:', error.message);
      }

      // Add retry logic
      if (config && !config.__isRetry) {
        config.retryCount = (config.retryCount || 0) + 1;
        
        if (config.retryCount <= DEFAULT_CONFIG.maxRetries) {
          const delay = Math.min(
            DEFAULT_CONFIG.retryDelay * Math.pow(2, config.retryCount - 1),
            30000 // Max 30s delay
          );
          
          console.log(`[AI Service] Retry ${config.retryCount}/${DEFAULT_CONFIG.maxRetries} in ${delay}ms`);
          
          // Create new config with retry flag
          const newConfig = {
            ...config,
            __isRetry: true
          };
          
          return new Promise(resolve => {
            setTimeout(() => resolve(instance(newConfig)), delay);
          });
        }
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
}

// Export a default instance
export const httpClient = createHttpClient();
