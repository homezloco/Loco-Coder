// Main API module that combines all services
import * as config from './modules/config/constants.js';
import authService from './modules/auth.js';
import fileService from './modules/files.js';
import templateService from './modules/templates.js';

// Lazy load aiService to prevent circular dependencies
let _aiService = null;
let _aiServicePromise = null;

// Function to dynamically import the AI service
const importAiService = async () => {
  try {
    console.log('[API] Importing AI service...');
    
    // Import the AI service module
    const module = await import('./modules/ai.js');
    console.log('[API] AI module imported successfully');
    
    // Get the default export or the module itself if it's a direct export
    const aiService = module.default || module;
    
    // Log basic info about the imported service
    console.log('[API] AI service methods:', 
      Object.keys(aiService).filter(k => typeof aiService[k] === 'function')
    );
    
    // Validate the service has the required methods
    if (!aiService) {
      throw new Error('AI service import returned undefined or null');
    }
    
    // Check for chat method (support both direct and nested send)
    const hasChatMethod = typeof aiService.chat === 'function' || 
                         (aiService.chat && typeof aiService.chat.send === 'function');
    
    if (!hasChatMethod) {
      console.error('[API] AI service is missing required chat method');
      throw new Error('AI service is missing required chat method');
    }
    
    return aiService;
  } catch (error) {
    console.error('[API] Failed to import AI service:', error);
    throw error;
  }
};

// Initialize the AI service immediately
const initializeAiService = async () => {
  console.log('[API] Initializing AI service...');
  
  try {
    const aiService = await importAiService();
    
    console.log('[API] AI service initialized successfully with methods:', 
      Object.keys(aiService).filter(key => typeof aiService[key] === 'function')
    );
    
    return aiService;
  } catch (error) {
    console.error('[API] Failed to initialize AI service:', {
      error,
      errorMessage: error.message,
      errorStack: error.stack
    });
    throw new Error('AI service initialization failed: ' + error.message);
  }
};

// Initialize the service immediately and cache the promise
_aiServicePromise = initializeAiService().then(service => {
  _aiService = service;
  return service;
}).catch(error => {
  console.error('[API] AI service initialization failed:', error);
  _aiServicePromise = null;
  throw error;
});

const getAiService = async () => {
  console.group('[API] getAiService called');
  try {
    console.log('[API] Current state:', {
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
        console.error('[API] Failed to initialize AI service:', {
          error: error.message,
          stack: error.stack,
          errorType: error.constructor?.name || 'UnknownError'
        });
        _aiServicePromise = null; // Reset promise to allow retry
        throw new Error(`AI service initialization failed: ${error.message}`);
      }
    })();
  } finally {
    console.groupEnd();
  }
};

import { getFromFallbackDB, saveToFallbackDB, syncFallbackData } from '../utils/database-fallback.js';
import { STORES } from './modules/config/constants.js';
import connectivityService from '../utils/connectivity-service.js';

// Initialize connectivity service with default configuration
// The connectivity service is already initialized on import with default settings
// and will handle the connection monitoring automatically
connectivityService.subscribeToConnectivity(({ isOnline, status }) => {
  console.log(`Connectivity status changed: ${isOnline ? 'Online' : 'Offline'}`, status);
  
  // If we're back online, try to sync any pending changes
  if (isOnline) {
    // Only attempt to sync if we have a sync function defined
    if (typeof window.syncPendingChanges === 'function') {
      syncFallbackData('pendingChanges', window.syncPendingChanges).catch(err => 
        console.error('Error syncing fallback data:', err)
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
    console.log('[API] Initializing AI service...');
    try {
      // Import the AI service
      const aiService = await importAiService();
      
      if (!aiService) {
        throw new Error('AI service module import returned undefined');
      }
      
      console.log('[API] AI service initialized successfully with methods:', 
        Object.keys(aiService).filter(k => typeof aiService[k] === 'function')
      );
      
      return aiService;
    } catch (error) {
      console.error('[API] Failed to initialize AI service:', error);
      
      // Return a minimal implementation that will throw a helpful error when used
      return new Proxy({}, {
        get(target, prop) {
          console.error(`[API] Attempted to access AI service property '${prop}' but initialization failed`);
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
        console.error('Failed to set force online mode:', error);
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
      console.error('Error getting backend status:', error);
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
      console.error('Failed to sync files:', error);
      return { success: false, error: error.message };
    }
  },
};

// Set up global error handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Optionally report to error tracking service
});

// Initialize connectivity check
connectivityService.checkConnectivityNow().catch(err => 
  console.error('Initial connectivity check failed:', err)
);

export default api;
