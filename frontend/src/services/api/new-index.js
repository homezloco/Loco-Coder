// Main API service entry point
import { authService } from './services/auth/AuthService';
import { projectService } from './services/projects/ProjectService';
import { fileService } from './services/files/FileService';
import { templateService } from './services/templates/TemplateService';
import { createAiService } from '../../api/modules/ai';

// Debug logging
console.group('[API] Initializing API services');
console.log('Auth Service:', authService);
console.log('Project Service:', projectService);
console.log('File Service:', fileService);
console.log('Template Service:', templateService);
console.groupEnd();

// AI Service initialization
let aiServiceInstance = null;
let isAiServiceInitialized = false;

// Initialize AI service asynchronously
const initAiService = async () => {
  if (isAiServiceInitialized) {
    return aiServiceInstance;
  }
  
  console.log('[API] Initializing AI service...');
  try {
    aiServiceInstance = createAiService();
    isAiServiceInitialized = true;
    console.log('[API] AI service initialized successfully');
    return aiServiceInstance;
  } catch (error) {
    console.error('[API] Failed to initialize AI service:', error);
    throw error;
  }
};

// Initialize AI service immediately
initAiService().catch(console.error);

// Create a proxy for the AI service that handles initialization
const aiServiceProxy = new Proxy({}, {
  get(target, prop) {
    if (isAiServiceInitialized && aiServiceInstance) {
      const method = aiServiceInstance[prop];
      if (typeof method === 'function') {
        return method.bind(aiServiceInstance);
      }
      return method;
    }
    
    // Return a function that waits for initialization
    return async (...args) => {
      try {
        const service = await initAiService();
        const method = service[prop];
        if (typeof method === 'function') {
          return method.apply(service, args);
        }
        return method;
      } catch (error) {
        console.error(`[API] Error accessing AI service method ${prop}:`, error);
        throw error;
      }
    };
  },
  
  // Handle property existence checks
  has(target, prop) {
    return isAiServiceInitialized && aiServiceInstance 
      ? prop in aiServiceInstance 
      : true; // Assume the property exists until we know otherwise
  },
  
  // Handle Object.keys() and similar operations
  ownKeys() {
    return isAiServiceInitialized && aiServiceInstance 
      ? Reflect.ownKeys(aiServiceInstance) 
      : [];
  },
  
  // Handle property enumeration
  getOwnPropertyDescriptor() {
    return {
      enumerable: true,
      configurable: true
    };
  }
});

// Main API client class
class ApiClient {
  constructor() {
    // Core services
    this.auth = authService;
    this.projects = projectService;
    this.files = fileService;
    this.templates = templateService;
    
    // AI service with lazy initialization
    Object.defineProperty(this, 'ai', {
      get: () => aiServiceProxy,
      enumerable: true,
      configurable: true
    });
    
    // Bind methods
    this.setAuthToken = this.setAuthToken.bind(this);
    this.getAuthToken = this.getAuthToken.bind(this);
    this.clearAuthToken = this.clearAuthToken.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
    this.waitForAiService = this.waitForAiService.bind(this);
    
    console.log('[API] API client initialized');
  }
  
  // Auth methods (delegated to authService)
  async setAuthToken(token, remember = false) {
    return this.auth.setAuthToken(token, remember);
  }
  
  async getAuthToken(skipValidation = false) {
    return this.auth.getAuthToken(skipValidation);
  }
  
  async clearAuthToken() {
    return this.auth.clearAuthToken();
  }
  
  async isAuthenticated() {
    return this.auth.isAuthenticated();
  }
  
  // AI service methods
  async waitForAiService(timeout = 5000) {
    if (isAiServiceInitialized && aiServiceInstance) {
      return aiServiceInstance;
    }
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (isAiServiceInitialized && aiServiceInstance) {
          resolve(aiServiceInstance);
        } else if (Date.now() - startTime >= timeout) {
          reject(new Error('Timeout waiting for AI service to initialize'));
        } else {
          setTimeout(check, 100);
        }
      };
      
      check();
    });
  }
  
  // Debug method to check available methods
  debug() {
    return {
      auth: Object.keys(this.auth).filter(k => typeof this.auth[k] === 'function'),
      projects: Object.keys(this.projects).filter(k => typeof this.projects[k] === 'function'),
      files: Object.keys(this.files).filter(k => typeof this.files[k] === 'function'),
      templates: Object.keys(this.templates).filter(k => typeof this.templates[k] === 'function'),
      ai: isAiServiceInitialized && aiServiceInstance 
        ? Object.keys(aiServiceInstance).filter(k => typeof aiServiceInstance[k] === 'function')
        : 'AI service not initialized'
    };
  }
}

// Create and export singleton instance
const api = new ApiClient();

// For backward compatibility, also export individual services
export {
  authService as auth,
  projectService as projects,
  fileService as files,
  templateService as templates,
  aiServiceProxy as ai
};

// Export the API instance as default
export default api;
