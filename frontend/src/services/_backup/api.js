// /project-root/frontend/src/api.js
import axios from 'axios';
import dbFallback from './utils/database-fallback';
import connectivityService from './utils/connectivity-service';
const { initFallbackDatabase, saveToFallbackDB, getFromFallbackDB, queryFallbackDB, syncFallbackData, STORES } = dbFallback;

// Add project file stores to our fallback database
STORES.FILE_CONTENTS = "file_contents";
STORES.FILE_LISTS = "file_lists";
STORES.PENDING_WRITES = "pending_writes";

// Auth token storage
const TOKEN_STORAGE_KEY = 'local_ai_platform_auth_token';
const USERNAME_STORAGE_KEY = 'local_ai_platform_username';
const FORCE_ONLINE_KEY = 'force_online_mode';

// Check for force online mode
const checkForceOnlineMode = () => {
  try {
    return localStorage.getItem(FORCE_ONLINE_KEY) === 'true';
  } catch (e) {
    return false;
  }
};

// Base API URL with multiple fallback options (ordered by preference)
const API_ENDPOINTS = [
  'http://localhost:8000',    // Primary: Direct connection to local backend
  'http://127.0.0.1:8000',    // Fallback 1: Alternative local IP
  'http://172.28.112.1:8000', // Fallback 2: WSL host IP
  '/api',                     // Fallback 3: Vite proxy (if needed)
  window.location.origin      // Fallback 4: Same-origin if deployed together
].filter(Boolean); // Remove any falsy values

// Function to determine the best available API endpoint with health checking
const determineBestEndpoint = async () => {
  // If in force online mode, use the first endpoint
  if (checkForceOnlineMode()) {
    console.log('Force online mode active, using first API endpoint');
    return API_ENDPOINTS[0];
  }
  
  // Try to use cached working endpoint first
  const cachedEndpoint = localStorage.getItem('working_api_endpoint');
  if (cachedEndpoint) {
    try {
      // Test the cached endpoint with a simple request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch(`${cachedEndpoint}/health`, { method: 'GET', mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      console.log(`Using cached API endpoint: ${cachedEndpoint}`);
      return cachedEndpoint;
    } catch (e) {
      console.log(`Cached endpoint failed: ${cachedEndpoint}`);
      // Continue to try other endpoints
    }
  }

  // Try each endpoint until one works
  for (const endpoint of API_ENDPOINTS) {
    try {
      await fetch(`${endpoint}/health`, { method: 'GET', mode: 'no-cors', timeout: 2000 });
      console.log(`Found working API endpoint: ${endpoint}`);
      localStorage.setItem('working_api_endpoint', endpoint);
      return endpoint;
    } catch (e) {
      console.log(`Endpoint failed: ${endpoint}`);
      // Continue to next endpoint
    }
  }

  // If all fail, return the first one and hope for the best
  console.warn('All API endpoints failed, using default');
  return API_ENDPOINTS[0];
};

// Initialize with the first endpoint, will be updated asynchronously
let API_BASE_URL = API_ENDPOINTS[0];

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second initial delay
const TIMEOUT = 60000; // 60 seconds

// Create axios instance with all configurations
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Request-Id': `frontend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  withCredentials: true,
  validateStatus: (status) => status < 500, // Only retry on 5xx errors
  transformRequest: [(data, headers) => {
    // Handle circular references in request data
    const getCircularReplacer = () => {
      const seen = new WeakSet();
      return (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      };
    };
    
    if (data) {
      return JSON.stringify(data, getCircularReplacer());
    }
    return data;
  }]
});

// Clear any existing interceptors to avoid duplicates
apiClient.interceptors.request.handlers = [];
apiClient.interceptors.response.handlers = [];

// Add request interceptor for retry logic and logging
apiClient.interceptors.request.use(
  (config) => {
    // Add retry count if not set
    config.retryCount = config.retryCount || 0;
    
    // Add timestamp for request timing
    config.metadata = { startTime: new Date() };
    
    // Log request details
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      retry: config.retryCount,
      timeout: config.timeout || TIMEOUT
    });
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling with retry logic
apiClient.interceptors.response.use(
  (response) => {
    const endTime = new Date();
    const duration = endTime - (response.config.metadata?.startTime || endTime);
    
    // Log successful response with timing
    console.log(`[API] Response ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`, {
      status: response.status,
      statusText: response.statusText,
      data: response.data ? (typeof response.data === 'string' 
        ? response.data.substring(0, 200) + (response.data.length > 200 ? '...' : '')
        : response.data)
        : 'No data'
    });
    
    return response;
  },
  async (error) => {
    const config = error.config || {};
    const response = error.response || {};
    const endTime = new Date();
    const duration = endTime - (config.metadata?.startTime || endTime);
    
    // Skip retry for these status codes
    const skipRetryCodes = [400, 401, 402, 403, 404, 422];
    const shouldRetry = 
      !skipRetryCodes.includes(response.status) && // Don't retry client errors
      (!config.retryCount || config.retryCount < MAX_RETRIES); // Check retry count
    
    // Log error details
    console.error(`[API] Error ${response.status || error.code || 'UNKNOWN'} ${config.method?.toUpperCase() || 'UNKNOWN'} ${config.url || 'unknown-url'} (${duration}ms)`, {
      message: error.message,
      code: error.code,
      status: response.status,
      statusText: response.statusText,
      retryCount: config.retryCount || 0,
      maxRetries: MAX_RETRIES,
      timeout: config.timeout || TIMEOUT,
      shouldRetry,
      errorData: response.data || error.message
    });
    
    // If we shouldn't retry, or no config, reject immediately
    if (!shouldRetry || !config) {
      return Promise.reject(error);
    }
    
    // Calculate exponential backoff delay
    const delay = Math.min(
      RETRY_DELAY * Math.pow(2, config.retryCount || 0) + 
      Math.random() * 1000, // Add jitter
      30000 // Max 30 seconds
    );
    
    // Update retry count
    config.retryCount = (config.retryCount || 0) + 1;
    
    console.log(`[API] Retrying (${config.retryCount}/${MAX_RETRIES}) in ${Math.round(delay)}ms`);
    
    // Create a promise that resolves after the delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(apiClient(config));
      }, delay);
    });
  }
);

// Keep track of offline status from connectivity service
let isOfflineMode = !connectivityService.getConnectionState().isOnline;

// Subscribe to connectivity changes
connectivityService.subscribeToConnectivity(state => {
  isOfflineMode = !state.isOnline;
  console.log(`Connectivity changed: ${state.isOnline ? 'ONLINE' : 'OFFLINE'} (source: ${state.source})`);
  
  // If coming back online, attempt to sync pending changes
  if (state.isOnline) {
    // Sync each store type that needs synchronization
    Promise.all([
      // Projects store
      syncFallbackData('projects', async (item) => {
        return await syncProjectToServer(item);
      }),
      // Files store
      syncFallbackData('files', async (item) => {
        return await syncFileToServer(item);
      }),
      // Settings store
      syncFallbackData('settings', async (item) => {
        return await syncSettingsToServer(item);
      })
    ]).catch(err => console.warn('Error syncing data:', err));
  }
});

// Determine the best endpoint asynchronously
// Update the base URL when the best endpoint is determined
determineBestEndpoint().then(endpoint => {
  API_BASE_URL = endpoint;
  apiClient.defaults.baseURL = API_BASE_URL;
  console.log(`API base URL set to: ${API_BASE_URL}`);
});

// Get accurate online status (considering force online mode)
const getOnlineStatus = () => {
  return checkForceOnlineMode() || !isOfflineMode;
};

// Add auth token to requests if available
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Error handler middleware
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    // Check if error is due to network/server unavailability
    if (!error.response) {
      return Promise.reject({
        message: 'Network error: Unable to connect to the API. Please check if the backend server is running.',
        originalError: error
      });
    }
    
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      // Clear stored auth data on unauthorized
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USERNAME_STORAGE_KEY);
    }
    
    return Promise.reject(error);
  }
);

// Helper method to get current base URL
function getBaseUrl() {
  return API_BASE_URL;
}

// Health check function with multiple endpoints and robust error handling
export async function checkHealth(options = {}) {
  const startTime = Date.now();
  const timeout = options.timeout || 8000; // Default 8s timeout, configurable per call
  const maxRetries = options.retries || 2; // Reduced retries since we have better fallbacks
  const checkType = options.checkType || 'full'; // 'full', 'liveness', 'readiness', or 'startup'
  
  // List of endpoints to try in order - prioritize direct backend URL first
  const endpoints = [
    'http://localhost:8000',  // Direct to backend (most reliable)
    'http://127.0.0.1:8000',  // Alternative localhost
    'http://172.28.112.1:8000',  // WSL host IP
    '/api',  // Try proxy as last resort
    ''       // Fallback to relative URL (least reliable)
  ];

  // Health check paths based on check type
  const healthPaths = {
    full: '/api/health',
    liveness: '/api/health/liveness',
    readiness: '/api/health/readiness',
    startup: '/api/health/startup',
    component: (component) => `/api/health/components/${component}`
  };

  // Determine the health check path to use
  const healthPath = options.component 
    ? healthPaths.component(options.component)
    : healthPaths[checkType] || healthPaths.full;

  let lastError;
  let lastResponse;
  
  // Try each endpoint with retries
  for (const endpoint of endpoints) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      const cancelTokenSource = axios.CancelToken.source();
      const requestTimeout = Math.min(timeout, 3000 * attempt); // Progressive timeout
      
      const timeoutId = setTimeout(() => {
        const elapsed = Date.now() - attemptStartTime;
        const error = new Error(`Request to ${endpoint}${healthPath} timed out after ${elapsed}ms`);
        error.code = 'ETIMEDOUT';
        error.attempt = attempt;
        error.maxRetries = maxRetries;
        cancelTokenSource.cancel(error);
      }, requestTimeout);

      try {
        const url = endpoint ? `${endpoint.replace(/\/+$/, '')}${healthPath}` : healthPath;
        
        console.log(`[HealthCheck][Attempt ${attempt}/${maxRetries}] Checking: ${url} (timeout: ${requestTimeout}ms)`);
        
        const response = await axios.get(url, {
          timeout: requestTimeout,
          cancelToken: cancelTokenSource.token,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Accept': 'application/json'
          },
          validateStatus: (status) => status < 500 // Only retry on 5xx errors
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        lastResponse = response.data;

        // Log the response for debugging
        console.debug(`[HealthCheck] Response from ${url} (${responseTime}ms):`, {
          status: response.status,
          data: response.data,
          attempt,
          maxRetries
        });

        // If we got a successful response, format and return it
        if (response.status >= 200 && response.status < 300) {
          const result = {
            ...response.data,
            responseTime,
            status: response.data?.status || 'healthy',
            endpoint: url,
            attempt,
            timestamp: new Date().toISOString(),
            httpStatus: response.status
          };
          
          console.log(`[HealthCheck] Health check successful for ${url}:`, {
            status: result.status,
            responseTime: `${responseTime}ms`,
            attempt
          });
          
          return result;
        }
        
        // For rate limiting, suggest waiting
        if (response.status === 429) {
          const retryAfter = response.headers['retry-after'] || 5;
          return {
            status: 'rate_limited',
            message: `Rate limited. Please try again in ${retryAfter} seconds.`,
            retryAfter: parseInt(retryAfter, 10),
            responseTime: Date.now() - startTime,
            endpoint: url,
            timestamp: new Date().toISOString()
          };
        }
        
        // For other errors, throw to trigger retry
        const error = new Error(`Health check failed with status ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        throw error;
        
      } catch (error) {
        clearTimeout(timeoutId);
        const errorTime = Date.now();
        const attemptDuration = errorTime - attemptStartTime;
        lastError = error;
        
        // Log detailed error information
        const errorDetails = {
          endpoint: endpoint + healthPath,
          attempt,
          maxRetries,
          error: {
            name: error.name,
            message: error.message,
            code: error.code,
            status: error.status,
            stack: error.stack,
            isAxiosError: error.isAxiosError,
            response: error.response ? {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
              headers: error.response.headers
            } : undefined,
            config: error.config ? {
              url: error.config.url,
              method: error.config.method,
              timeout: error.config.timeout,
              headers: error.config.headers
            } : undefined
          },
          attemptDuration: `${attemptDuration}ms`,
          timestamp: new Date().toISOString()
        };
        
        // Only log full error details in development
        if (import.meta.env.DEV) {
          console.error(`[HealthCheck] Attempt ${attempt} failed after ${attemptDuration}ms:`, errorDetails);
        } else {
          console.error(`[HealthCheck] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        }
        
        // If we have a response with status < 500, don't retry
        if (error.response && error.response.status && error.response.status < 500) {
          console.warn(`[HealthCheck] Non-retryable error (${error.response.status}), not retrying`);
          break;
        }
        
        // If we have more attempts, wait before retrying
        if (attempt < maxRetries) {
          const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff with max 10s
          console.warn(`[HealthCheck] Waiting ${backoffTime}ms before next attempt (${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
  }
  
  // If we get here, all endpoints and retries failed
  const errorTime = Date.now() - startTime;
  const errorDetails = {
    error: lastError?.code || 'all_endpoints_failed',
    message: lastError?.message || 'All health check endpoints failed',
    responseTime: errorTime,
    timestamp: new Date().toISOString(),
    attemptedEndpoints: endpoints.length * maxRetries,
    lastEndpointTried: endpoints[endpoints.length - 1],
    lastError: lastError ? {
      name: lastError.name,
      message: lastError.message,
      code: lastError.code,
      status: lastError.status,
      stack: import.meta.env.DEV ? lastError.stack : undefined
    } : undefined,
    lastResponse
  };

  console.error('[HealthCheck] All health check attempts failed:', {
    ...errorDetails,
    lastError: errorDetails.lastError ? {
      ...errorDetails.lastError,
      stack: undefined // Don't log stack in production
    } : undefined
  });
  
  // Return a degraded status with error details
  const result = {
    status: 'degraded',
    message: 'Unable to connect to any backend service',
    ...errorDetails,
    userFriendlyMessage: 'The application is running in a degraded mode. Some features may be limited.',
    shouldRetry: true,
    retryAfter: 10, // Suggest retrying after 10 seconds
    components: lastResponse?.components || {},
    checks: lastResponse?.checks || {}
  };
  
  // Cache the failed result briefly to prevent thundering herd
  const cacheKey = `health_check_${checkType}${options.component ? `_${options.component}` : ''}`;
  const cacheTtl = 5; // 5 seconds for failure cache
  
  try {
    await saveToCache('health_checks', {
      key: cacheKey,
      value: result,
      timestamp: Date.now(),
      ttl: cacheTtl * 1000
    });
  } catch (cacheError) {
    console.warn('Failed to cache health check result:', cacheError);
  }
  
  return result;
}

// Import modelFallbackManager for tracking model usage and health
import modelFallbackManager from './utils/modelFallbackManager';

/**
 * Chat with AI with robust fallbacks and detailed diagnostics
 * 
 * @param {string} prompt - User message to send to AI
 * @param {Object} options - Additional options for the chat request
 * @param {boolean} options.health_check - If true, this is just a health check ping
 * @param {number} options.timeout - Custom timeout in ms
 * @param {boolean} options.skip_fallbacks - Skip fallback models for this request
 * @param {Array} options.preferred_models - List of specific models to try first
 * @returns {Object} Normalized response with text, status, provider info and diagnostics
 */
export async function chat(prompt, options = {}) {
  // Start timing for response time tracking
  const startTime = Date.now();
  const requestId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  
  console.log(`[Chat ${requestId}] Starting chat request`, { 
    prompt: prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt,
    options
  });
  
  try {
    // Load settings for model preference and fallback configuration
    let userSettings = {};
    try {
      const savedSettings = localStorage.getItem('chatSettings');
      if (savedSettings) {
        userSettings = JSON.parse(savedSettings);
      }
    } catch (settingsError) {
      console.warn(`[Chat ${requestId}] Failed to load user chat settings:`, settingsError);
    }
    
    // Get user-configured model priority order
    const modelPriorityOrder = userSettings.modelPriorityOrder || [];
    
    // For health checks, use a simple prompt
    if (options.health_check) {
      prompt = 'health_check';
    }
    
    // Create request with model preferences and user-configured fallback options
    const chatRequest = {
      prompt,
      model: userSettings.activeProvider || 'ollama', // Default to ollama if not set
      use_fallbacks: options.skip_fallbacks ? false : (userSettings.useFallbackModels !== false), // Default to true if not set
      model_priority: options.preferred_models || modelPriorityOrder,
      is_health_check: !!options.health_check,
      request_id: requestId, // Add request ID for tracking
      timestamp: new Date().toISOString()
    };
    
    console.log(`[Chat ${requestId}] Sending chat request`, { 
      model: chatRequest.model,
      use_fallbacks: chatRequest.use_fallbacks,
      is_health_check: chatRequest.is_health_check,
      model_priority: chatRequest.model_priority
    });
    
    // Create request options with enhanced timeout and retry settings
    const requestOptions = {
      timeout: options.timeout || 30000, // Default 30s timeout
      headers: {
        'X-Request-Id': requestId,
        'X-Retry-Count': options.retryCount || 0
      },
      metadata: {
        startTime: new Date(),
        requestId,
        isHealthCheck: !!options.health_check
      }
    };
    
    // Send the request to the API with retry logic
    const response = await apiClient.post('/chat', chatRequest, requestOptions);
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Normalize response format based on the new backend response structure
    let normalizedResponse;
    
    if (typeof response.data === 'object' && response.data !== null) {
      // New format with 'text' field and additional metadata
      if (response.data.text !== undefined) {
        normalizedResponse = {
          text: response.data.text,
          status: response.data.status || 'success',
          provider: response.data.provider,
          model: response.data.model,
          codeBlocks: response.data.codeBlocks || [], 
          diagnostics: response.data.diagnostics
        };
      }
      // Legacy format with 'response' field
      else if (response.data.response) {
        normalizedResponse = {
          text: response.data.response,
          status: response.data.status || 'success',
          provider: response.data.provider || 'unknown',
          model: response.data.model || 'unknown',
          codeBlocks: response.data.codeBlocks || []
        };
      }
      // Simple object with no recognized fields
      else {
        normalizedResponse = {
          text: JSON.stringify(response.data),
          status: 'success',
          provider: 'unknown',
          model: 'unknown',
          codeBlocks: []
        };
      }
    }
    // Simple string response (very legacy format)
    else {
      normalizedResponse = {
        text: typeof response.data === 'string' ? response.data : 'No response from AI service',
        status: 'success',
        provider: 'unknown',
        model: 'unknown',
        codeBlocks: []
      };
    }
    
    // Update model health status in the fallback manager
    if (normalizedResponse.provider && normalizedResponse.model) {
      const modelId = `${normalizedResponse.provider}:${normalizedResponse.model}`;
      modelFallbackManager.recordSuccess(modelId, normalizedResponse, responseTime);
    }
    
    // Add response time to diagnostics
    if (!normalizedResponse.diagnostics) {
      normalizedResponse.diagnostics = {};
    }
    normalizedResponse.diagnostics.responseTime = responseTime;
    
    console.log(`Chat response (${responseTime}ms):`, normalizedResponse);
    return normalizedResponse;
  } catch (error) {
    // Calculate response time even for errors
    const responseTime = Date.now() - startTime;
    console.error(`Chat API error (${responseTime}ms):`, error);
    
    // Try to extract backend error details
    let errorDetails = error.message || 'Unknown error';
    let errorStatus = 'error';
    
    try {
      if (error.response && error.response.data) {
        // Extract error details from the backend response
        const errorData = error.response.data;
        
        if (typeof errorData === 'object') {
          errorDetails = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData);
          
          // If the backend reports a specific provider error, mark it
          if (errorData.provider && errorData.error_type) {
            // Record model failure
            const modelId = `${errorData.provider}:${errorData.model || 'default'}`;
            modelFallbackManager.recordFailure(modelId, new Error(errorDetails));
            
            // Set status based on error type
            if (errorData.error_type === 'connection') {
              errorStatus = 'connection_error';
            } else if (errorData.error_type === 'auth') {
              errorStatus = 'auth_error';
            } else {
              errorStatus = 'provider_error';
            }
          }
        } else if (typeof errorData === 'string') {
          errorDetails = errorData;
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse error response:', parseError);
    }
    
    // Enhanced error message with diagnostics
    return {
      text: options.health_check ? 
        "AI service health check failed. Please verify your configuration and ensure the backend is running." :
        errorDetails.includes('Ollama') ? 
          `${errorDetails}` :
          `Sorry, I couldn't connect to the AI service. Error: ${errorDetails}`,
      status: errorStatus,
      provider: 'none',
      model: 'none',
      codeBlocks: [],
      diagnostics: {
        error: errorDetails,
        errorObject: error.toString(),
        timestamp: new Date().toISOString(),
        responseTime: responseTime
      }
    };
  }
}

// Execute code with multiple fallback methods and robust error handling
export async function execute(code, language = 'python') {
  // Language configurations with fallbacks and extensions
  const languageConfig = {
    python: { extension: '.py', supportsFallbacks: true, clientLibrary: 'pyodide' },
    javascript: { extension: '.js', supportsFallbacks: true, clientLibrary: 'eval' },
    typescript: { extension: '.ts', supportsFallbacks: false },
    html: { extension: '.html', supportsFallbacks: true, clientLibrary: 'iframe' },
    css: { extension: '.css', supportsFallbacks: true, clientLibrary: 'iframe' },
    java: { extension: '.java', supportsFallbacks: false },
    csharp: { extension: '.cs', supportsFallbacks: false },
    ruby: { extension: '.rb', supportsFallbacks: false },
    go: { extension: '.go', supportsFallbacks: false },
    rust: { extension: '.rs', supportsFallbacks: false },
    swift: { extension: '.swift', supportsFallbacks: false },
    kotlin: { extension: '.kt', supportsFallbacks: false },
    dart: { extension: '.dart', supportsFallbacks: false },
    cpp: { extension: '.cpp', supportsFallbacks: true, clientLibrary: 'jscpp' },
    'c++': { extension: '.cpp', supportsFallbacks: true, clientLibrary: 'jscpp' }, // Alias for cpp
    // Mobile frameworks
    'react-native': { extension: '.jsx', supportsFallbacks: true, clientLibrary: 'eval' }, // Using JS eval as fallback
    flutter: { extension: '.dart', supportsFallbacks: false },
    xamarin: { extension: '.cs', supportsFallbacks: false },
    'maui': { extension: '.cs', supportsFallbacks: false },
  };

  // Create appropriate filename based on language configuration
  const config = languageConfig[language] || { extension: `.${language}`, supportsFallbacks: false };
  const filename = `code${config.extension}`;
  
  // Backend execution attempts counter
  let attemptCount = 0;
  const maxAttempts = 3;
  
  // Track execution method for debugging
  let executionMethod = 'backend-primary';
  
  // First try the primary backend execution with retry logic
  async function tryBackendExecution() {
    for (let i = 0; i < maxAttempts; i++) {
      attemptCount++;
      try {
        // Try different endpoints in rotation if retrying
        const endpoint = API_ENDPOINTS[i % API_ENDPOINTS.length];
        const url = `${endpoint}/execute`;
        
        console.log(`Attempt ${attemptCount}: Trying ${url}`);
        
        // Use axios for first attempt, fetch as alternative method
        let response;
        if (i === 0) {
          response = await apiClient.post('/execute', {
            filename,
            content: code
          });
          executionMethod = 'backend-axios';
          return response.data;
        } else {
          const fetchResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, content: code })
          });
          
          if (!fetchResponse.ok) {
            throw new Error(`HTTP error ${fetchResponse.status}`);
          }
          
          executionMethod = `backend-fetch-${i}`;
          return await fetchResponse.json();
        }
      } catch (error) {
        console.warn(`Backend execution attempt ${attemptCount} failed:`, error);
        
        // On last attempt, don't wait - continue to next fallback
        if (i < maxAttempts - 1) {
          // Exponential backoff delay between retries
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 300));
        }
      }
    }
    
    // All backend attempts failed
    throw new Error('All backend execution attempts failed');
  }
  
  // Try backend execution first
  try {
    return await tryBackendExecution();
  } catch (backendError) {
    console.warn('All backend execution methods failed, trying fallbacks:', backendError);
    
    // Only proceed to client-side execution if language supports it
    if (!config.supportsFallbacks) {
      return {
        output: '',
        error: `Backend execution failed and ${language} does not support client-side execution fallbacks.`,
        execution_time: 0,
        success: false,
        method_used: executionMethod
      };
    }
    
    // Try client-side fallbacks based on language
    try {
      if (language === 'python' && window.pyodide) {
        // Pyodide execution - NOTE: requires pyodide to be loaded
        executionMethod = 'client-pyodide';
        console.log('Attempting Pyodide execution fallback');
        // This is a placeholder - actual implementation would require pyodide loading
        return {
          output: 'Client-side Python execution not fully implemented yet',
          error: null,
          execution_time: 0,
          success: false,
          method_used: executionMethod
        };
      } else if (language === 'javascript') {
        // JavaScript client-side execution
        executionMethod = 'client-js-eval';
        console.log('Attempting JavaScript client-side execution');
        
        // Capture console.log output
        const originalLog = console.log;
        const logs = [];
        
        console.log = (...args) => {
          logs.push(args.join(' '));
          originalLog.apply(console, args);
        };
        
        // Execute with timeout and error handling
        const startTime = performance.now();
        try {
          // Using Function is slightly safer than eval
          new Function(code)();
          
          // Restore console.log
          console.log = originalLog;
          
          return {
            output: logs.join('\n'),
            error: null,
            execution_time: (performance.now() - startTime) / 1000,
            success: true,
            method_used: executionMethod
          };
        } catch (jsError) {
          // Restore console.log
          console.log = originalLog;
          
          return {
            output: logs.join('\n'),
            error: jsError.toString(),
            execution_time: (performance.now() - startTime) / 1000,
            success: false,
            method_used: executionMethod
          };
        }
      } else if (language === 'html' || language === 'css') {
        // HTML/CSS preview is handled by the CodeEditor component
        executionMethod = 'client-iframe';
        return {
          output: 'HTML/CSS preview handled by UI component',
          error: null,
          execution_time: 0,
          success: true,
          method_used: executionMethod
        };
      } else if (language === 'cpp' || language === 'c++') {
        // C++ client-side execution using JSCPP
        executionMethod = 'client-jscpp';
        console.log('Attempting C++ client-side execution');
        
        // We'll need to dynamically load JSCPP if it's not already loaded
        if (!window.JSCPP) {
          console.log('Loading JSCPP library...');
          try {
            // First try to load from CDN
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/npm/jscpp@3.0.0/dist/JSCPP.es5.min.js';
              script.onload = resolve;
              script.onerror = () => reject(new Error('Failed to load JSCPP from CDN'));
              document.head.appendChild(script);
            });
          } catch (cdnError) {
            console.warn('Failed to load JSCPP from CDN, trying fallback local copy', cdnError);
            // Fallback to local copy if available
            try {
              await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = '/lib/jscpp.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
            } catch (localError) {
              return {
                output: '',
                error: 'C++ execution failed: Could not load JSCPP library',
                execution_time: 0,
                success: false,
                method_used: executionMethod
              };
            }
          }
        }
        
        // Execute C++ code with JSCPP
        const startTime = performance.now();
        try {
          // Capture stdout using our custom config
          let output = '';
          const config = {
            stdio: {
              write: function(s) {
                output += s;
                return s.length;
              }
            }
          };
          
          // Add standard C++ main function wrapper if not provided
          let fullCode = code;
          if (!code.includes('int main')) {
            fullCode = `
#include <iostream>

int main() {
${code}
  return 0;
}
`;
          }
          
          // Execute the C++ code
          const exitCode = window.JSCPP.run(fullCode, '', config);
          
          return {
            output: output,
            exitCode: exitCode,
            execution_time: (performance.now() - startTime) / 1000,
            success: true,
            method_used: executionMethod
          };
        } catch (cppError) {
          return {
            output: '',
            error: cppError.toString(),
            execution_time: (performance.now() - startTime) / 1000,
            success: false,
            method_used: executionMethod
          };
        }
      }
    } catch (clientError) {
      console.error('Client-side execution failed:', clientError);
    }
    
    // If all fallbacks failed, return formatted error
    return {
      output: '',
      error: `All execution methods failed. Backend error: ${backendError.message || 'Connection failed'}`,
      execution_time: 0,
      success: false,
      method_used: 'all-failed'
    };
  }
}

// Get file listing with fallback to local cache
export async function loadFiles() {
  try {
    const response = await apiClient.get('/files');
    
    // Cache the results locally for offline access
    if (response.data && Array.isArray(response.data.files)) {
      // Store each file's metadata separately for better offline access
      await Promise.all(response.data.files.map(async (file) => {
        await saveToFallbackDB(STORES.FILES, {
          path: file.path,
          name: file.name,
          language: file.language,
          projectId: file.projectId,
          updatedAt: file.updatedAt,
          size: file.size,
          _lastUpdated: new Date().getTime(),
          _isCachedMetadataOnly: true,
          _pendingSync: false
        });
      }));
    }
    
    return response.data;
  } catch (error) {
    console.error('Error loading files:', error);
    
    // Try direct fetch as fallback
    try {
      const response = await fetch(`${getBaseUrl()}/files`);
      const data = await response.json();
      return data;
    } catch (fetchError) {
      console.error('Backend fetch failed, using local cache:', fetchError);
      
      // Fall back to local cache
      try {
        // Query local DB for all cached files
        const cachedFiles = await queryFallbackDB(STORES.FILES);
        
        // Filter out files that are just pending syncs or temp
        const validFiles = cachedFiles.filter(file => 
          !file._tempFile && (!file._pendingSync || file._created_offline)
        );
        
        return {
          files: validFiles.map(file => ({
            path: file.path,
            name: file.name || file.path.split('/').pop(),
            language: file.language,
            projectId: file.projectId,
            updatedAt: file._lastUpdated,
            size: file.content ? file.content.length : 0,
            fromCache: true
          })),
          fromCache: true
        };
      } catch (dbError) {
        console.error('All file listing fallbacks failed:', dbError);
        throw new Error('Failed to load files using all available methods');
      }
    }
  }
}

// Import the sync manager for robust file operations
import { fileSyncManager, SYNC_STATUS } from './utils/file-sync-manager';

// Load a specific file with comprehensive fallbacks
export async function loadFile(filename) {
  try {
    // Try to get file from backend
    const response = await apiClient.get(`/load/${encodeURIComponent(filename)}`);
    
    // Cache the result for offline use
    await saveToFallbackDB(STORES.FILES, {
      path: filename,
      name: filename.split('/').pop(),
      content: response.data,
      language: getLanguageFromFilename(filename),
      _lastUpdated: new Date().getTime(),
      _pendingSync: false,
      _syncError: null,
      _lastRemoteUpdate: new Date().getTime()
    });
    
    return response.data;
  } catch (error) {
    console.error('Load file API error:', error);
    
    // Try direct fetch as fallback
    try {
      const response = await fetch(`${getBaseUrl()}/load/${encodeURIComponent(filename)}`);
      if (response.ok) {
        const data = await response.text();
        
        // Cache successful fetch result
        await saveToFallbackDB(STORES.FILES, {
          path: filename,
          name: filename.split('/').pop(),
          content: data,
          language: getLanguageFromFilename(filename),
          _lastUpdated: new Date().getTime(),
          _pendingSync: false,
          _syncError: null,
          _lastRemoteUpdate: new Date().getTime()
        });
        
        return data;
      }
      
      // Handle 404 from fetch
      if (response.status === 404) {
        throw new Error(`File not found: ${filename}`);
      }
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    } catch (fetchError) {
      console.warn(`Backend connection failed, trying local cache for ${filename}`, fetchError);
      
      // Try local cache as final fallback
      try {
        const cachedFile = await getFromFallbackDB(STORES.FILES, filename);
        
        if (cachedFile && cachedFile.content) {
          console.log(`Retrieved ${filename} from local cache`);
          return cachedFile.content;
        }
      } catch (cacheError) {
        console.error('Local cache access failed:', cacheError);
      }
      
      // All fallbacks failed
      if (error.response && error.response.status === 404) {
        return `// File not found: ${filename}\n// Create a new file here.`;
      }
      return `// Error loading file: ${filename}\n// Backend is unreachable and file is not in local cache.\n// You can still create a new file here.`;
    }
  }
}

/**
 * Helper to determine language from filename
 */
export function getLanguageFromFilename(filename) {
  if (!filename) return 'plaintext';
  
  const extension = filename.split('.').pop().toLowerCase();
  
  const extensionMap = {
    // Core languages
    'py': 'python',
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'java': 'java',
    'cs': 'csharp',
    'rb': 'ruby',
    'go': 'go',
    'md': 'markdown',
    'json': 'json',
    'txt': 'plaintext',
    'cpp': 'cpp',
    'cc': 'cpp',
    // New backend languages
    'rs': 'rust',
    // Mobile development languages
    'swift': 'swift',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'dart': 'dart',
    'cxx': 'cpp',
    'c++': 'cpp',
    'h': 'cpp',      // Header files typically use C++ syntax highlighting
    'hpp': 'cpp',
    'hxx': 'cpp',
    'h++': 'cpp'
  };
  
  return extensionMap[extension] || 'plaintext';
}

// Save a file with comprehensive fallbacks
export async function saveFile(fileData) {
  // Support both object format and legacy format (filename, content)
  const file = typeof fileData === 'string' 
    ? { path: arguments[0], content: arguments[1] } 
    : fileData;
    
  if (!file || !file.path) {
    throw new Error('Invalid file data: path is required');
  }
  
  // Add metadata if missing
  const fileWithMeta = {
    ...file,
    name: file.name || file.path.split('/').pop(),
    language: file.language || getLanguageFromFilename(file.path),
    updatedAt: new Date().toISOString()
  };
  
  // Use file sync manager if available
  try {
    if (fileSyncManager) {
      return await fileSyncManager.saveFile(fileWithMeta, true); // Force sync now
    }
  } catch (syncError) {
    console.warn('File sync manager error, falling back to direct API calls:', syncError);
  }
  
  // Traditional API saving with fallbacks
  try {
    const response = await apiClient.post('/save', { 
      filename: file.path, 
      content: file.content,
      language: fileWithMeta.language,
      projectId: file.projectId
    });
    
    // Cache result locally for offline access
    try {
      await saveToFallbackDB(STORES.FILES, {
        ...fileWithMeta,
        _lastUpdated: new Date().getTime(),
        _pendingSync: false,
        _syncError: null,
        _lastRemoteUpdate: new Date().getTime()
      });
    } catch (cacheError) {
      console.warn('Failed to cache file locally:', cacheError);
    }
    
    return response.data;
  } catch (error) {
    console.error('Save file API error:', error);
    
    // Try direct fetch as fallback
    try {
      const response = await fetch(`${getBaseUrl()}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename: file.path, 
          content: file.content,
          language: fileWithMeta.language
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache successful result
      await saveToFallbackDB(STORES.FILES, {
        ...fileWithMeta,
        _lastUpdated: new Date().getTime(),
        _pendingSync: false,
        _syncError: null,
        _lastRemoteUpdate: new Date().getTime()
      });
      
      return data;
    } catch (fetchError) {
      console.warn('Backend connection failed, saving to local cache only:', fetchError);
      
      // Save locally for later sync
      try {
        await saveToFallbackDB(STORES.FILES, {
          ...fileWithMeta,
          _lastUpdated: new Date().getTime(),
          _pendingSync: true,
          _created_offline: !navigator.onLine,
          _syncError: fetchError.message,
          _syncAttempts: 0
        });
        
        // Return success but indicate it's cached only
        return { 
          success: true, 
          message: 'Saved to local cache only. Will sync when backend is available.',
          path: file.path,
          cached_only: true
        };
      } catch (localError) {
        console.error('All save methods failed:', localError);
        throw new Error(`Failed to save file: ${localError.message}`);
      }
    }
  }
}

// ---------- Authentication Functions ----------

// Login and store token
export async function login(username, password) {
  try {
    const response = await apiClient.post('/auth/login', { username, password });
    const { token, is_admin } = response.data;
    
    // Store auth data
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USERNAME_STORAGE_KEY, username);
    
    return { 
      success: true, 
      username,
      isAdmin: is_admin || false,
      token 
    };
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      message: error.response?.data?.detail || 'Login failed. Please try again.' 
    };
  }
}

// Verify stored token
export async function verifyToken() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) {
    return { success: false, message: 'No authentication token found' };
  }
  
  try {
    const response = await apiClient.post('/auth/verify', { token });
    return { 
      success: true, 
      username: response.data.username,
      isAdmin: response.data.is_admin || false 
    };
  } catch (error) {
    console.error('Token verification error:', error);
    // Clear invalid token
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USERNAME_STORAGE_KEY);
    return { 
      success: false, 
      message: error.response?.data?.detail || 'Session expired. Please login again.' 
    };
  }
}

// Logout
export async function logout() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    try {
      await apiClient.post('/auth/logout', { token });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  
  // Always clear local storage, even if API call fails
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USERNAME_STORAGE_KEY);
  
  return { success: true };
}

// Check if user is logged in
export function isLoggedIn() {
  return !!localStorage.getItem(TOKEN_STORAGE_KEY);
}

// Get current username
export function getUsername() {
  return localStorage.getItem(USERNAME_STORAGE_KEY) || '';
}

// ---------- Template Management Functions ----------

// Get all templates
export async function getTemplates() {
  try {
    const response = await apiClient.get('/templates');
    return response.data.templates || {};
  } catch (error) {
    console.error('Get templates error:', error);
    // Return empty templates object as fallback
    return {};
  }
}

// Get specific template
export async function getTemplate(templateId) {
  try {
    const response = await apiClient.get(`/templates/${encodeURIComponent(templateId)}`);
    return response.data;
  } catch (error) {
    console.error(`Get template error for ${templateId}:`, error);
    return { success: false, message: `Template '${templateId}' not found` };
  }
}

// Create project from template
export async function createProject(templateId, projectName, outputDir = null) {
  try {
    const response = await apiClient.post('/create_project', {
      template_id: templateId,
      project_name: projectName,
      output_dir: outputDir
    });
    return response.data;
  } catch (error) {
    console.error('Create project error:', error);
    throw new Error(error.response?.data?.detail || `Failed to create project: ${error.message}`);
  }
}

// Open a folder as a project root (VS Code-like experience)
export async function openProjectFolder(folderPath) {
  try {
    console.log(`Opening project folder: ${folderPath}`);
    
    // Save to IndexedDB for recent folders history
    try {
      await saveToFallbackDB(STORES.PROJECTS, {
        id: `folder_${Date.now()}`,
        name: folderPath.split(/[\\/]/).pop(), // Get folder name from path
        path: folderPath,
        type: 'folder',
        dateOpened: new Date().toISOString()
      });
    } catch (dbErr) {
      console.warn('Failed to save folder to history:', dbErr);
    }
    
    // Send to backend API
    const response = await apiClient.post('/project/open_folder', 
      { folder_path: folderPath }, 
      { headers }
    );
    
    // If successful, cache project info in local storage for quick access
    if (response.data && response.data.success) {
      // Store basic info for recently opened projects
      const recentProjects = JSON.parse(localStorage.getItem('recentProjects') || '[]');
      const projectInfo = {
        id: response.data.project_id,
        name: response.data.name,
        path: response.data.path,
        dateOpened: new Date().toISOString()
      };
      
      // Add to start of array and keep most recent 10
      const updatedProjects = [projectInfo, 
        ...recentProjects.filter(p => p.path !== folderPath)
      ].slice(0, 10);
      
      localStorage.setItem('recentProjects', JSON.stringify(updatedProjects));
      localStorage.setItem('lastOpenedProject', response.data.project_id);
    }
    
    return response.data;
  } catch (e) {
    console.error('Error opening project folder:', e);
    return { 
      success: false, 
      error: e.response?.data?.error || e.message || 'Failed to open folder',
      message: 'Failed to open project folder. Please check path and try again.'
    };
  }
}

// Get project files for an opened project
export async function getProjectFiles(projectId) {
  try {
    // Try to get from backend API
    const response = await apiClient.get(`/project/${projectId}/files`);
    
    // Cache file list in IndexedDB for offline access
    if (response.data && response.data.success) {
      try {
        await saveToFallbackDB(STORES.FILE_LISTS, {
          id: projectId,
          files: response.data.files,
          path: response.data.path,
          name: response.data.name,
          timestamp: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('Failed to cache project files:', dbErr);
      }
    }
    
    return response.data;
  } catch (e) {
    console.error(`Error getting project files for ${projectId}:`, e);
    
    // Try to load from cached IndexedDB
    try {
      const cachedData = await getFromFallbackDB(STORES.FILE_LISTS, projectId);
      if (cachedData) {
        console.log(`Using cached project files for ${projectId}`);
        return {
          success: true,
          files: cachedData.files,
          project_id: projectId,
          path: cachedData.path,
          name: cachedData.name,
          fromCache: true
        };
      }
    } catch (dbErr) {
      console.warn('Failed to get cached project files:', dbErr);
    }
    
    return { 
      success: false, 
      error: e.response?.data?.error || e.message || 'Failed to get project files',
      message: 'Failed to load project files. Using empty list as fallback.',
      files: []
    };
  }
}

// Read a file from an opened project
export async function readProjectFile(projectId, filePath) {
  try {
    // Generate a cache key for this specific file
    const cacheKey = `${projectId}:${filePath}`;
    
    // Try to get from backend API
    const response = await apiClient.post(
      '/project/file/read', 
      { project_id: projectId, file_path: filePath }, 
      { headers }
    );
    
    // Cache file content in IndexedDB for offline access
    if (response.data && response.data.success) {
      try {
        await saveToFallbackDB(STORES.FILE_CONTENTS, {
          id: cacheKey,
          content: response.data.content,
          path: filePath,
          project_id: projectId,
          size: response.data.file?.size,
          modified: response.data.file?.modified || new Date().toISOString(),
          timestamp: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('Failed to cache file content:', dbErr);
      }
    }
    
    return response.data;
  } catch (e) {
    console.error(`Error reading project file ${filePath}:`, e);
    
    // Try to load from cached IndexedDB
    try {
      const cacheKey = `${projectId}:${filePath}`;
      const cachedData = await getFromFallbackDB(STORES.FILE_CONTENTS, cacheKey);
      if (cachedData) {
        console.log(`Using cached content for ${filePath}`);
        return {
          success: true,
          content: cachedData.content,
          path: filePath,
          project_id: projectId,
          size: cachedData.size,
          modified: cachedData.modified,
          fromCache: true
        };
      }
    } catch (dbErr) {
      console.warn('Failed to get cached file content:', dbErr);
    }
    
    return { 
      success: false, 
      error: e.response?.data?.error || e.message || 'Failed to read file',
      message: 'Failed to read file. Please try again.'
    };
  }
}

// Write a file to an opened project
export async function writeProjectFile(projectId, filePath, content) {
  try {
    // Generate a cache key for this specific file
    const cacheKey = `${projectId}:${filePath}`;
    
    // Store in pending writes queue if offline
    if (!getOnlineStatus()) {
      console.log(`Offline: Queuing write for ${filePath}`);
      try {
        await saveToFallbackDB(STORES.PENDING_WRITES, {
          id: `${Date.now()}-${cacheKey}`,
          project_id: projectId,
          path: filePath,
          content: content,
          timestamp: new Date().toISOString()
        });
        
        // Update cache with new content
        await saveToFallbackDB(STORES.FILE_CONTENTS, {
          id: cacheKey,
          content: content,
          path: filePath,
          project_id: projectId,
          modified: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          pendingSync: true
        });
        
        return {
          success: true,
          message: 'File saved locally. Will sync when online.',
          pendingSync: true,
          path: filePath,
          project_id: projectId
        };
      } catch (dbErr) {
        console.error('Failed to queue offline write:', dbErr);
        return {
          success: false,
          error: 'Failed to save file offline',
          message: 'Failed to save file while offline.'
        };
      }
    }
    
    // Send to backend API if online
    const response = await apiClient.post(
      '/project/file/write', 
      { 
        project_id: projectId, 
        file_path: filePath,
        content: content 
      }, 
      { headers }
    );
    
    // Update cache with new content
    if (response.data && response.data.success) {
      try {
        await saveToFallbackDB(STORES.FILE_CONTENTS, {
          id: cacheKey,
          content: content,
          path: filePath,
          project_id: projectId,
          size: response.data.file?.size,
          modified: response.data.file?.modified || new Date().toISOString(),
          timestamp: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('Failed to update cached file content:', dbErr);
      }
    }
    
    return response.data;
  } catch (e) {
    console.error(`Error writing project file ${filePath}:`, e);
    return { 
      success: false, 
      error: e.response?.data?.error || e.message || 'Failed to write file',
      message: 'Failed to save file. Please try again.'
    };
  }
}

// Get list of recently opened projects
export async function getRecentProjects() {
  // First try localStorage for quick access
  const recentProjects = JSON.parse(localStorage.getItem('recentProjects') || '[]');
  
  // Also get from IndexedDB which might have more data
  try {
    const dbProjects = await queryFallbackDB(STORES.PROJECTS, project => project.type === 'folder');
    
    // Merge and deduplicate projects by path
    const uniqueProjects = {};
    
    [...recentProjects, ...dbProjects].forEach(project => {
      if (project && project.path) {
        // Keep the most recently opened one
        if (!uniqueProjects[project.path] || 
            new Date(project.dateOpened) > new Date(uniqueProjects[project.path].dateOpened)) {
          uniqueProjects[project.path] = project;
        }
      }
    });
    
    // Convert back to array and sort by date
    const mergedProjects = Object.values(uniqueProjects);
    mergedProjects.sort((a, b) => new Date(b.dateOpened) - new Date(a.dateOpened));
    
    return {
      success: true,
      projects: mergedProjects.slice(0, 20) // Limit to 20 most recent
    };
  } catch (e) {
    console.warn('Failed to get projects from IndexedDB:', e);
    // Fall back to localStorage list
    return {
      success: true,
      projects: recentProjects,
      fromCache: true
    };
  }
}

// Initialize fallback database on module load
initFallbackDatabase().catch(err => console.warn('Failed to initialize fallback database:', err));

// Create default export with all methods
const api = {
  // HTTP methods
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
  
  // API methods
  getBaseUrl,
  checkHealth,
  chat,
  execute,
  loadFiles,
  loadFile,
  saveFile,
  login,
  logout,
  verifyToken,
  isLoggedIn,
  getUsername,
  getTemplates,
  getTemplate,
  createProject,
  openProjectFolder,
  getProjectFiles,
  readProjectFile,
  writeProjectFile,
  getRecentProjects,
  
  // Sync and offline capabilities
  syncFiles: async () => {
    if (navigator.onLine) {
      try {
        // Try to import fileSyncManager on demand
        const { fileSyncManager } = await import('./utils/file-sync-manager');
        return await fileSyncManager.sync();
      } catch (error) {
        console.error('Failed to sync files:', error);
        return { success: false, error: error.message };
      }
    } else {
      return { success: false, error: 'Offline' };
    }
  },
  
  // Connection status
  isOnline: () => getOnlineStatus(),
  
  // Force online mode
  forceOnlineMode: (enable = true) => {
    try {
      localStorage.setItem(FORCE_ONLINE_KEY, enable ? 'true' : 'false');
      if (enable) {
        connectivityService.forceOnlineMode();
      } else {
        // Trigger a new connectivity check when disabling force online mode
        connectivityService.checkConnectivityNow();
      }
      return { success: true, forceOnline: enable };
    } catch (e) {
      console.error('Error setting force online mode:', e);
      return { success: false, error: e.message };
    }
  },
  
  // Get detailed connectivity status
  getConnectivityStatus: () => {
    const connectivityState = connectivityService.getConnectionState();
    return {
      isOnline: getOnlineStatus(),
      forceOnlineMode: checkForceOnlineMode(),
      browserOnline: navigator.onLine,
      apiConnectivity: connectivityState.isOnline,
      lastCheck: connectivityState.lastCheck,
      source: connectivityState.source
    };
  },
  
  // Database fallbacks
  getFromCache: async (storeName, key) => {
    try {
      return await getFromFallbackDB(storeName, key);
    } catch (error) {
      console.error('Failed to get from cache:', error);
      return null;
    }
  },
  
  saveToCache: async (storeName, data) => {
    try {
      return await saveToFallbackDB(storeName, data);
    } catch (error) {
      console.error('Failed to save to cache:', error);
      return false;
    }
  },
  
  // Get backend health with degraded status awareness
  getBackendStatus: async () => {
    try {
      const health = await checkHealth();
      
      // Check for degraded state (some components failing but core services available)
      if (health && health.components) {
        const failingComponents = Object.entries(health.components)
          .filter(([name, status]) => status === 'failing')
          .map(([name]) => name);
          
        if (failingComponents.length > 0 && health.status !== 'critical') {
          return {
            status: 'degraded',
            message: `System operating in fallback mode. Issues with: ${failingComponents.join(', ')}`,
            failingComponents,
            details: health
          };
        }
      }
      
      return health || { status: 'unknown', message: 'Health check returned no data' };
    } catch (error) {
      console.error('Failed to get backend status:', error);
      return { 
        status: 'offline', 
        message: 'Backend unreachable, operating in offline mode', 
        error: error.message 
      };
    }
  }
};

export default api;
