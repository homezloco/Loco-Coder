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
import logger from '../utils/logger';
import axios from 'axios';

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
        logger.ns('api').info(`Initializing AI service (attempt ${attempt}/${maxRetries})`);
        
        // Dynamically import the AI service
        logger.ns('api').info('Creating AI service instance...');
        try {
          // Import the AI service module
          logger.ns('api').debug('Importing AI service module...');
          const module = await import('../api/modules/ai.js');
          logger.ns('api').debug('AI module imported', { keys: Object.keys(module) });
          
          const { createAiService } = module;
          if (!createAiService) {
            throw new Error('createAiService function not found in module');
          }
          
          logger.ns('api').info('Creating AI service instance...');
          const service = await createAiService();
          
          if (!service) {
            throw new Error('createAiService returned undefined');
          }
          
          // Debug: Log all properties of the service
          logger.ns('api').debug('AI service instance created. Properties', {
            ownProperties: Object.getOwnPropertyNames(service),
            prototypeChain: Object.getPrototypeOf(service) ? 
              Object.getOwnPropertyNames(Object.getPrototypeOf(service)) : 'No prototype',
            hasChat: 'chat' in service,
            chatType: typeof service.chat,
            chatIsFunction: typeof service.chat === 'function'
          });
          
          // Verify the service is working
          logger.ns('api').debug('Verifying AI service methods...');
          if (service && typeof service.chat === 'function') {
            aiService = service;
            logger.ns('api').info('AI service initialized successfully with chat method');
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
          logger.ns('api').error('Error during AI service creation', {
            error: error.message,
            stack: error.stack,
            ...(error.debugInfo && { debugInfo: error.debugInfo })
          });
          throw error; // Re-throw to be caught by the outer try-catch
        }
      } catch (error) {
        lastError = error;
        logger.ns('api').warn(`Failed to initialize AI service (attempt ${attempt}/${maxRetries})`, { error });
        
        if (attempt < maxRetries) {
          // Wait before retrying with exponential backoff
          const delay = retryDelay * Math.pow(2, attempt - 1);
          logger.ns('api').info(`Retrying AI service initialization in ${delay}ms...`);
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
  logger.ns('api').error('Failed to initialize AI service', { error });
});

// Debug configuration
logger.ns('api').info('Initializing API Service (start)');
logger.ns('api').debug('Service modules loaded', { 
  authService: !!authService, 
  projectService: !!projectService, 
  fileService: !!fileService,
  templateService: !!templateService,
  aiService: !!aiService
});
logger.ns('api').info('Initializing API Service (end)');

/**
 * Main API client that delegates to service modules
 */
const api = {
  // Authentication methods
  login: authService.login.bind(authService),
  logout: authService.logout.bind(authService),
  setAuthToken: async (token, options = {}) => {
    if (!token) {
      logger.ns('api').warn('Attempted to set empty auth token');
      return false;
    }
    
    try {
      // Use the centralized token module to store the token
      const success = tokenModule.setAuthToken(token, options.remember);
      
      // Update axios default headers
      if (typeof axios !== 'undefined' && success) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      logger.ns('api').info('Auth token set successfully');
      
      // Reinitialize services that depend on authentication
      if (options.initializeServices !== false) {
        try {
          await initializeAiService();
        } catch (error) {
          logger.ns('api').warn('Failed to reinitialize services after token update', { error });
        }
      }
      
      return success;
    } catch (error) {
      logger.ns('api').error('Failed to set auth token', { error });
      return false;
    }
  },
  
  getAuthToken: () => {
    try {
      // Use the centralized token module to get the token
      const token = tokenModule.getAuthToken();
      return token;
    } catch (error) {
      logger.ns('api').error('Failed to get auth token', { error });
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
      logger.ns('api').error('Failed to clear auth token', { error });
      return false;
    }
  },
  
  isAuthenticated: () => {
    try {
      const token = localStorage.getItem('authToken');
      return !!token;
    } catch (error) {
      logger.ns('api').error('Failed to check authentication status', { error });
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
    logger.ns('api').info('Validating and syncing token');
    
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
        logger.ns('api').info('Token validation failed, clearing token');
        api.clearAuthToken();
      }
      
      return result || false;
    } catch (error) {
      logger.ns('api').error('Token validation failed', { error });
      // Don't clear token on network errors - it might still be valid
      // when connectivity is restored
      return api.isAuthenticated();
    }
  },
  
  // Project management
  getProjects: projectService.getProjects?.bind(projectService) || (() => {
    logger.ns('api').debug('getProjects called');
    return Promise.resolve([]);
  }),
  getProject: projectService.getProject?.bind(projectService) || ((id) => {
    logger.ns('api').debug(`getProject called`, { id });
    return Promise.resolve(null);
  }),
  createProject: projectService.createProject?.bind(projectService) || ((data) => {
    logger.ns('api').debug('createProject called', { data });
    return Promise.reject('Project service not available');
  }),
  updateProject: projectService.updateProject?.bind(projectService) || ((id, data) => {
    logger.ns('api').debug('updateProject called', { id, data });
    return Promise.reject('Project service not available');
  }),
  deleteProject: projectService.deleteProject?.bind(projectService) || ((id) => {
    logger.ns('api').debug('deleteProject called', { id });
    return Promise.reject('Project service not available');
  }),
  
  // File operations
  getProjectFiles: fileService.getProjectFiles?.bind(fileService) || ((projectId) => {
    logger.ns('api').debug('getProjectFiles called', { projectId });
    return Promise.resolve([]);
  }),
  readFile: fileService.readFile?.bind(fileService) || ((filePath) => {
    logger.ns('api').debug('readFile called', { filePath });
    return Promise.reject('File service not available');
  }),
  writeFile: fileService.writeFile?.bind(fileService) || ((filePath, content) => {
    // Avoid logging raw content; only log metadata like size/type
    const contentSize = typeof content === 'string'
      ? content.length
      : (content && typeof content.size === 'number')
        ? content.size
        : undefined;
    const contentType = content && content.type ? content.type : undefined;
    logger.ns('api').debug('writeFile called', { filePath, contentSize, contentType });
    return Promise.reject('File service not available');
  }),
  
  // Templates
  getTemplates: templateService.getTemplates?.bind(templateService) || (() => {
    logger.ns('api').debug('getTemplates called');
    return Promise.resolve([]);
  }),
  
  // Execute code
  executeCode: async function(code, language = 'python') {
    if (fileService.executeCode) {
      return fileService.executeCode(code, language);
    }
    logger.ns('api').debug('executeCode called', { language });
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
      logger.ns('api').info('AI service not initialized, attempting to initialize...');
      try {
        await initializeAiService();
        if (!aiService) {
          throw new Error('AI service initialization failed');
        }
      } catch (error) {
        logger.ns('api').error('Failed to initialize AI service in getAiService', {
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
      logger.ns('api').error('AI service is missing chat method. Available methods', 
        { methods: aiService ? Object.getOwnPropertyNames(aiService).filter(p => typeof aiService[p] === 'function') : 'No AI service instance' });
      
      // Attempt to recover by reinitializing the service
      try {
        logger.ns('api').info('Attempting to reinitialize AI service...');
        aiService = null;
        await initializeAiService({ maxRetries: 1 }); // Only try once to avoid infinite loops
        
        if (aiService && typeof aiService.chat === 'function') {
          logger.ns('api').info('Successfully recovered AI service');
          return aiService;
        }
      } catch (recoveryError) {
        logger.ns('api').error('Failed to recover AI service', { error: recoveryError });
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
