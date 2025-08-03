/**
 * Main API Client
 * 
 * This is a lightweight wrapper that delegates to individual service modules.
 * All business logic and implementation details are now in the service modules.
 */

// Import service modules
import authService from './api/auth';
import projectService from './api/projects';
import fileService from './api/files';
import templateService from './api/templates';
import tokenModule from './api/auth/token';

// AI service instance
let aiService = null;
let isAiServiceInitializing = false;
let aiServiceInitialization = null;

/**
 * Initialize the AI service with retry logic
 */
const initializeAiService = async (options = {}) => {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  
  // If already initialized, return the existing instance
  if (aiService) return aiService;
  
  // If initialization is in progress, return the pending promise
  if (isAiServiceInitializing) {
    return aiServiceInitialization;
  }
  
  isAiServiceInitializing = true;
  
  // Create a promise that will be resolved when initialization completes
  aiServiceInitialization = (async () => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[API] Initializing AI service (attempt ${attempt}/${maxRetries})`);
        
        // Dynamically import the AI service
        console.log('[API] Creating AI service instance...');
        try {
          // Import the AI service module
          console.log('[API] Importing AI service module...');
          const module = await import('../api/modules/ai.js');
          console.log('[API] AI module imported:', Object.keys(module));
          
          const { createAiService } = module;
          if (!createAiService) {
            throw new Error('createAiService function not found in module');
          }
          
          console.log('[API] Creating AI service instance...');
          const service = await createAiService();
          
          if (!service) {
            throw new Error('createAiService returned undefined');
          }
          
          // Debug: Log all properties of the service
          console.log('[API] AI service instance created. Properties:', {
            ownProperties: Object.getOwnPropertyNames(service),
            prototypeChain: Object.getPrototypeOf(service) ? 
              Object.getOwnPropertyNames(Object.getPrototypeOf(service)) : 'No prototype',
            hasChat: 'chat' in service,
            chatType: typeof service.chat,
            chatIsFunction: typeof service.chat === 'function'
          });
          
          // Verify the service is working
          console.log('[API] Verifying AI service methods...');
          if (service && typeof service.chat === 'function') {
            aiService = service;
            console.log('[API] AI service initialized successfully with chat method');
            return service;
          } else {
            const availableMethods = Object.getOwnPropertyNames(service)
              .filter(prop => typeof service[prop] === 'function');
              
            throw new Error(
              `AI service is missing required chat method. ` +
              `Available methods: ${availableMethods.join(', ')}`
            );
          }
        } catch (error) {
          console.error('[API] Error during AI service creation:', {
            error: error.message,
            stack: error.stack,
            ...(error.debugInfo && { debugInfo: error.debugInfo })
          });
          throw error; // Re-throw to be caught by the outer try-catch
        }
      } catch (error) {
        lastError = error;
        console.warn(`[API] Failed to initialize AI service (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          // Wait before retrying with exponential backoff
          const delay = retryDelay * Math.pow(2, attempt - 1);
          console.log(`[API] Retrying AI service initialization in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all attempts failed
    const error = new Error(`Failed to initialize AI service after ${maxRetries} attempts`);
    error.originalError = lastError;
    throw error;
  })();
  
  try {
    return await aiServiceInitialization;
  } finally {
    isAiServiceInitializing = false;
  }
};

// Start initializing the AI service in the background
initializeAiService().catch(error => {
  console.error('[API] Failed to initialize AI service:', error);
});

// Debug configuration
console.group('[API] Initializing API Service');
console.log('Service modules loaded:', { 
  authService: !!authService, 
  projectService: !!projectService, 
  fileService: !!fileService,
  templateService: !!templateService,
  aiService: !!aiService
});
console.groupEnd();

/**
 * Main API client that delegates to service modules
 */
const api = {
  // Authentication methods
  login: authService.login.bind(authService),
  logout: authService.logout.bind(authService),
  setAuthToken: async (token, options = {}) => {
    if (!token) {
      console.warn('Attempted to set empty auth token');
      return false;
    }
    
    try {
      // Use the centralized token module to store the token
      const success = tokenModule.setAuthToken(token, options.remember);
      
      // Update axios default headers
      if (typeof axios !== 'undefined' && success) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('[API] Auth token set successfully');
      
      // Reinitialize services that depend on authentication
      if (options.initializeServices !== false) {
        try {
          await initializeAiService();
        } catch (error) {
          console.warn('Failed to reinitialize services after token update:', error);
        }
      }
      
      return success;
    } catch (error) {
      console.error('Failed to set auth token:', error);
      return false;
    }
  },
  
  getAuthToken: () => {
    try {
      // Use the centralized token module to get the token
      const token = tokenModule.getAuthToken();
      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  },
  
  clearAuthToken: () => {
    try {
      // Use the centralized token module to clear the token
      const success = tokenModule.clearAuthToken();
      
      // Also clear the Authorization header
      if (typeof axios !== 'undefined') {
        delete axios.defaults.headers.common['Authorization'];
      }
      
      return success;
    } catch (error) {
      console.error('Failed to clear auth token:', error);
      return false;
    }
  },
  
  isAuthenticated: () => {
    try {
      const token = localStorage.getItem('authToken');
      return !!token;
    } catch (error) {
      console.error('Failed to check authentication status:', error);
      return false;
    }
  },
  validateAndSyncToken: async (forceCheck = false) => {
    // Store last check time to prevent frequent checks
    if (!api._lastTokenCheck) {
      api._lastTokenCheck = 0;
    }
    
    // Skip frequent checks unless forced
    const now = Date.now();
    if (!forceCheck && (now - api._lastTokenCheck) < 2000) {
      return api.isAuthenticated();
    }
    
    api._lastTokenCheck = now;
    console.log('[API] Validating and syncing token');
    
    try {
      // First check if we have a token at all
      const token = api.getAuthToken();
      if (!token) {
        return false;
      }
      
      // Try to verify the token with the server
      const result = await authService.checkAuth();
      
      // If server says we're not authenticated but we have a token,
      // clear the token to prevent further failed requests
      if (!result && token) {
        console.log('[API] Token validation failed, clearing token');
        api.clearAuthToken();
      }
      
      return result || false;
    } catch (error) {
      console.error('[API] Token validation failed:', error);
      // Don't clear token on network errors - it might still be valid
      // when connectivity is restored
      return api.isAuthenticated();
    }
  },
  
  // Project management
  getProjects: projectService.getProjects?.bind(projectService) || (() => {
    console.log('[API] getProjects called');
    return Promise.resolve([]);
  }),
  getProject: projectService.getProject?.bind(projectService) || ((id) => {
    console.log(`[API] getProject called with id: ${id}`);
    return Promise.resolve(null);
  }),
  createProject: projectService.createProject?.bind(projectService) || ((data) => {
    console.log('[API] createProject called with data:', data);
    return Promise.reject('Project service not available');
  }),
  updateProject: projectService.updateProject?.bind(projectService) || ((id, data) => {
    console.log(`[API] updateProject called with id: ${id}, data:`, data);
    return Promise.reject('Project service not available');
  }),
  deleteProject: projectService.deleteProject?.bind(projectService) || ((id) => {
    console.log(`[API] deleteProject called with id: ${id}`);
    return Promise.reject('Project service not available');
  }),
  
  // File operations
  getProjectFiles: fileService.getProjectFiles?.bind(fileService) || ((projectId) => {
    console.log(`[API] getProjectFiles called with projectId: ${projectId}`);
    return Promise.resolve([]);
  }),
  readFile: fileService.readFile?.bind(fileService) || ((filePath) => {
    console.log(`[API] readFile called with path: ${filePath}`);
    return Promise.reject('File service not available');
  }),
  writeFile: fileService.writeFile?.bind(fileService) || ((filePath, content) => {
    console.log(`[API] writeFile called with path: ${filePath}`);
    return Promise.reject('File service not available');
  }),
  
  // Templates
  getTemplates: templateService.getTemplates?.bind(templateService) || (() => {
    console.log('[API] getTemplates called');
    return Promise.resolve([]);
  }),
  
  // Execute code
  executeCode: async function(code, language = 'python') {
    if (fileService.executeCode) {
      return fileService.executeCode(code, language);
    }
    console.log(`[API] executeCode called with language: ${language}`);
    return Promise.reject('Code execution service not available');
  },
  
  // AI Service methods with fallbacks
  waitForAiService: async function() {
    if (!aiService) {
      throw new Error('AI service not initialized');
    }
    return aiService.waitForReady?.() || Promise.resolve();
  },
  
  getAiService: async function() {
    // If AI service is not initialized, try to initialize it
    if (!aiService) {
      console.log('[API] AI service not initialized, attempting to initialize...');
      try {
        await initializeAiService();
        if (!aiService) {
          throw new Error('AI service initialization failed');
        }
      } catch (error) {
        console.error('[API] Failed to initialize AI service in getAiService:', {
          message: error.message,
          stack: error.stack,
          ...(error.debugInfo && { debugInfo: error.debugInfo })
        });
        throw new Error(`Failed to initialize AI service: ${error.message}`);
      }
    }
    
    // Verify the chat method is available
    if (aiService && typeof aiService.chat !== 'function') {
      const error = new Error('AI service is missing chat method');
      console.error('[API] AI service is missing chat method. Available methods:', 
        aiService ? Object.getOwnPropertyNames(aiService).filter(p => typeof aiService[p] === 'function') : 'No AI service instance');
      
      // Attempt to recover by reinitializing the service
      try {
        console.log('[API] Attempting to reinitialize AI service...');
        aiService = null;
        await initializeAiService({ maxRetries: 1 }); // Only try once to avoid infinite loops
        
        if (aiService && typeof aiService.chat === 'function') {
          console.log('[API] Successfully recovered AI service');
          return aiService;
        }
      } catch (recoveryError) {
        console.error('[API] Failed to recover AI service:', recoveryError);
      }
      
      throw error;
    }
    
    return aiService;
  }
};

// Make the API client available globally for backward compatibility
if (typeof window !== 'undefined') {
  window.api = api;
}

export default api;
