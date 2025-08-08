// Main API module that combines all services
import * as config from './modules/config/constants.js';
import authService from './modules/auth.js';
import fileService from './modules/files.js';
import templateService from './modules/templates.js';
import logger from '../utils/logger';

// Lazy load aiService to prevent circular dependencies
let _aiService = null;
let _aiServicePromise = null;
const DEV = !!(import.meta && import.meta.env && import.meta.env.DEV);
const log = logger.ns('api');
const aiLog = logger.ns('api:ai');
const connLog = logger.ns('api:connectivity');

// Global singleton guards (handles StrictMode/double-mount and multi-imports)
if (typeof window !== 'undefined') {
  if (window.__AI_SERVICE__) _aiService = window.__AI_SERVICE__;
  if (window.__AI_SERVICE_PROMISE__) _aiServicePromise = window.__AI_SERVICE_PROMISE__;
}

// Function to dynamically import the AI service
const importAiService = async () => {
  try {
    if (DEV && !window.__AI_IMPORT_LOGGED__) {
      aiLog.info('Importing AI service...');
      window.__AI_IMPORT_LOGGED__ = true;
    }
    
    // Import the AI service module
    const module = await import('./modules/ai.js');
    if (DEV && !window.__AI_MODULE_KEYS_LOGGED__) {
      aiLog.debug('AI module imported successfully:', Object.keys(module));
      window.__AI_MODULE_KEYS_LOGGED__ = true;
    }
    
    // Check if the module exports createAiService function
    if (typeof module.createAiService === 'function') {
      if (DEV && !window.__AI_CREATE_LOGGED__) {
        aiLog.info('Found createAiService function, creating AI service instance...');
        window.__AI_CREATE_LOGGED__ = true;
      }
      try {
        // Create an instance of the AI service
        const aiService = await module.createAiService();
        
        if (DEV && !window.__AI_INSTANCE_PROPS_LOGGED__) {
          aiLog.debug('AI service instance created with properties:', {
            properties: Object.getOwnPropertyNames(aiService),
            methods: Object.getOwnPropertyNames(aiService).filter(k => typeof aiService[k] === 'function'),
            hasChat: 'chat' in aiService,
            chatType: typeof aiService.chat
          });
          window.__AI_INSTANCE_PROPS_LOGGED__ = true;
        }
        
        // Validate the service has the required methods
        if (!aiService) {
          throw new Error('AI service creation returned undefined or null');
        }
        
        // If chat method doesn't exist, create a fallback
        if (typeof aiService.chat !== 'function') {
          if (DEV) aiLog.warn('Chat method not found on AI service instance, creating fallback');
          
          // Create a fallback chat method
          aiService.chat = async function(prompt, options = {}) {
            aiLog.info('Using fallback chat method');
            return { response: 'AI service chat method not available', error: true };
          };
          
          if (DEV) aiLog.debug('Added fallback chat method to AI service');
        }
        
        return aiService;
      } catch (createError) {
        aiLog.error('Error creating AI service instance:', createError);
        throw createError;
      }
    } else {
      // Fall back to using the module itself as the service
      if (DEV && !window.__AI_NO_FACTORY_LOGGED__) {
        aiLog.info('No createAiService function found, using module as service');
        window.__AI_NO_FACTORY_LOGGED__ = true;
      }
      
      // Get the default export or the module itself if it's a direct export
      const aiService = module.default || module;
      
      // Log basic info about the imported service
      if (DEV && !window.__AI_METHODS_LOGGED__) {
        aiLog.debug('AI service methods:', 
          Object.keys(aiService).filter(k => typeof aiService[k] === 'function')
        );
        window.__AI_METHODS_LOGGED__ = true;
      }
      
      // Validate the service has the required methods
      if (!aiService) {
        throw new Error('AI service import returned undefined or null');
      }
      
      // If chat method doesn't exist, create a fallback
      if (typeof aiService.chat !== 'function') {
        if (DEV) aiLog.warn('Chat method not found on AI service, creating fallback');
        
        // Create a fallback chat method
        aiService.chat = async function(prompt, options = {}) {
          if (DEV) aiLog.info('Using fallback chat method');
          return { response: 'AI service chat method not available', error: true };
        };
        
        aiLog.debug('Added fallback chat method to AI service');
      }
      
      return aiService;
    }
  } catch (error) {
    aiLog.error('Failed to import AI service:', error);
    throw error;
  }
};

// Initialize the AI service immediately
const initializeAiService = async () => {
  if (typeof window !== 'undefined') {
    if (window.__AI_INIT_IN_PROGRESS__) {
      return _aiServicePromise || Promise.resolve(_aiService);
    }
    window.__AI_INIT_IN_PROGRESS__ = true;
  }
  if (DEV && !window.__AI_INIT_LOGGED__) {
    aiLog.info('Initializing AI service...');
    window.__AI_INIT_LOGGED__ = true;
  }
  
  try {
    const aiService = await importAiService();
    if (typeof window !== 'undefined') {
      window.__AI_SERVICE__ = aiService;
    }
    if (DEV && !window.__AI_INIT_SUCCESS_LOGGED__) {
      aiLog.info('AI service initialized successfully with methods:', 
        Object.keys(aiService).filter(key => typeof aiService[key] === 'function')
      );
      window.__AI_INIT_SUCCESS_LOGGED__ = true;
    }
    
    return aiService;
  } catch (error) {
    aiLog.error('Failed to initialize AI service:', {
      error,
      errorMessage: error.message,
      errorStack: error.stack
    });
    throw new Error('AI service initialization failed: ' + error.message);
  }
};

// Initialize the service immediately and cache the promise
if (!_aiServicePromise) {
  _aiServicePromise = initializeAiService().then(service => {
    _aiService = service;
    if (typeof window !== 'undefined') {
      window.__AI_SERVICE__ = service;
      window.__AI_SERVICE_PROMISE__ = _aiServicePromise;
    }
    return service;
  }).catch(error => {
    aiLog.error('AI service initialization failed:', error);
    _aiServicePromise = null;
    if (typeof window !== 'undefined') {
      window.__AI_INIT_IN_PROGRESS__ = false;
    }
    throw error;
  });
}

const getAiService = async () => {
  if (DEV) aiLog.info('getAiService called');
  try {
    aiLog.debug('Current state:', {
      hasAiService: !!_aiService,
      hasAiServicePromise: !!_aiServicePromise,
      aiServiceType: typeof _aiService,
      aiServicePromiseType: typeof _aiServicePromise,
      isAiServicePromisePending: _aiServicePromise?.[Symbol.toStringTag] === 'Promise' ? 'pending' : 'not a promise'
    });
    
    if (_aiService) {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(_aiService || {})).filter(
        prop => typeof _aiService[prop] === 'function' && prop !== 'constructor'
      );
      
      console.log('[API] Returning cached AI service instance with methods:', methods);
      return _aiService;
    }
    
    if (_aiServicePromise) {
      console.log('[API] Waiting for pending AI service initialization...');
      try {
        const service = await _aiServicePromise;
        console.log('[API] Successfully resolved pending AI service:', {
          hasChat: typeof service?.chat === 'function',
          methods: Object.getOwnPropertyNames(service || {})
        });
        return service;
      } catch (error) {
        console.error('[API] Error in pending AI service initialization:', {
          error: error.message,
          stack: error.stack,
          errorType: error.constructor.name
        });
        _aiServicePromise = null; // Reset promise to allow retry
        throw error;
      }
    }
    
    console.log('[API] No cached AI service, initializing new instance...');
    return _aiServicePromise = (async () => {
      try {
        const service = await initializeAiService();
        _aiService = service; // Cache the resolved service
        console.log('[API] AI service initialized successfully:', {
          hasChat: typeof service?.chat === 'function',
          methods: Object.getOwnPropertyNames(service || {})
        });
        return service;
      } catch (error) {
        aiLog.error('Failed to initialize AI service:', {
          error: error.message,
          stack: error.stack,
          errorType: error.constructor?.name || 'UnknownError'
        });
        _aiServicePromise = null; // Reset promise to allow retry
        throw new Error(`AI service initialization failed: ${error.message}`);
      }
    })();
  } finally {
    if (DEV) aiLog.debug('getAiService finished');
  }
};

import { getFromFallbackDB, saveToFallbackDB, syncFallbackData, queryFallbackDB } from '../utils/database-fallback.js';
import { STORES } from './modules/config/constants.js';
import connectivityService from '../utils/connectivity-service.js';

// Initialize connectivity service with default configuration
// The connectivity service is already initialized on import with default settings
// and will handle the connection monitoring automatically
connectivityService.subscribeToConnectivity(({ isOnline, status }) => {
  connLog.info(`Connectivity status changed: ${isOnline ? 'Online' : 'Offline'}`, status);
  
  // If we're back online, try to sync any pending changes
  if (isOnline) {
    // Only attempt to sync if we have a sync function defined
    if (typeof window.syncPendingChanges === 'function') {
      syncFallbackData('pendingChanges', window.syncPendingChanges).catch(err => 
        connLog.warn('Error syncing fallback data:', err)
      );
    }
  }
});

// Re-export all services for direct import
const api = {
  // Core
  config,
  
  // Services
  auth: authService,
  files: fileService,
  templates: templateService,
  
    // AI Service - initialize and attach directly
  ai: (async () => {
    aiLog.info('Initializing AI service...');
    try {
      // Import the AI service
      const aiService = await importAiService();
      
      if (!aiService) {
        throw new Error('AI service module import returned undefined');
      }
      
      aiLog.info('AI service initialized successfully with methods:', 
        Object.keys(aiService).filter(k => typeof aiService[k] === 'function')
      );
      
      return aiService;
    } catch (error) {
      aiLog.error('Failed to initialize AI service:', error);
      
      // Return a minimal implementation that will throw a helpful error when used
      return new Proxy({}, {
        get(target, prop) {
          aiLog.error(`Attempted to access AI service property '${prop}' but initialization failed`);
          throw new Error(`AI service failed to initialize: ${error.message}`);
        }
      });
    }
  })(),
  
  // Connectivity
  connectivity: {
    isOnline: () => connectivityService.isOnline(),
    forceOnlineMode: (enable = true) => {
      try {
        if (enable) {
          localStorage.setItem(config.FORCE_ONLINE_KEY, 'true');
        } else {
          localStorage.removeItem(config.FORCE_ONLINE_KEY);
        }
        // Trigger a connectivity check
        return connectivityService.checkConnectivityNow();
      } catch (error) {
        connLog.error('Failed to set force online mode:', error);
        return Promise.resolve({ isOnline: false, forced: false });
      }
    },
    getStatus: () => connectivityService.getStatus(),
  },
  
  // Database fallbacks
  cache: {
    get: (storeName, key) => getFromFallbackDB(storeName, key),
    set: (storeName, key, value) => saveToFallbackDB(storeName, key, value),
    query: (storeName, query) => queryFallbackDB(storeName, query),
  },
  
  // Backward compatibility methods (deprecated, will be removed in future versions)
  getBackendStatus: async () => {
    try {
      await connectivityService.checkConnectivityNow();
      const status = connectivityService.getStatus();
      
      return {
        online: status.isOnline,
        degraded: status.isDegraded,
        lastCheck: status.lastCheck,
        endpoint: status.currentEndpoint,
        forced: localStorage.getItem(config.FORCE_ONLINE_KEY) === 'true',
      };
    } catch (error) {
      connLog.error('Error getting backend status:', error);
      return {
        online: false,
        degraded: false,
        lastCheck: new Date().toISOString(),
        endpoint: null,
        forced: false,
        error: error.message,
      };
    }
  },
  
  // Sync and offline capabilities
  syncFiles: async () => {
    try {
      await syncFallbackData();
      return { success: true };
    } catch (error) {
      log.error('Failed to sync files:', error);
      return { success: false, error: error.message };
    }
  },
};

// Set up global error handler
window.addEventListener('unhandledrejection', (event) => {
  log.error('Unhandled promise rejection:', event.reason);
  // Optionally report to error tracking service
});

// Initialize connectivity check
connectivityService.checkConnectivityNow().catch(err => 
  connLog.error('Initial connectivity check failed:', err)
);

export default api;
