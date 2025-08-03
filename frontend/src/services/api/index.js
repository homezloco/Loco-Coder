// Import all API modules
import * as auth from './auth';
import * as token from './auth/token';
import * as projects from './projects';
import * as files from './files';
import * as templates from './templates';

// Import AI service factory function with debug logging
console.log('[API] Importing AI service factory...');
import { createAiService } from '../../api/modules/ai';
console.log('[API] AI service import complete, type:', typeof createAiService);

// Create AI service instance
let aiServiceInstance = null;
let isAiServiceInitialized = false;
let aiServiceInitializationError = null;
let aiServiceInitializationPromise = null;

// Helper function to get all methods from an object's prototype chain
const getAllMethods = (obj) => {
  let methods = new Set();
  let current = obj;
  
  while (current && current !== Object.prototype) {
    const props = Object.getOwnPropertyNames(current)
      .filter(prop => typeof current[prop] === 'function' && prop !== 'constructor');
    props.forEach(method => methods.add(method));
    current = Object.getPrototypeOf(current);
  }
  
  return Array.from(methods);
};

// Initialize AI service asynchronously
const initializeAiService = async (options = {}) => {
  const { retry = false } = options;
  
  console.log(`[API] ${retry ? 'Retrying' : 'Initializing'} AI service...`);
  
  // If already initialized and not retrying, return the existing instance
  if (isAiServiceInitialized && aiServiceInstance && !retry) {
    console.log('[API] Using existing AI service instance');
    return aiServiceInstance;
  }
  
  // If initialization is in progress and not retrying, return the existing promise
  if (aiServiceInitializationPromise && !retry) {
    console.log('[API] AI service initialization already in progress');
    return aiServiceInitializationPromise;
  }
  
  // If there was a previous error and we're not retrying, throw it
  if (aiServiceInitializationError && !retry) {
    console.log('[API] Re-throwing previous AI service initialization error');
    throw aiServiceInitializationError;
  }
  
  // Reset error if retrying
  if (retry) {
    aiServiceInitializationError = null;
  }
  
  // Create a new initialization promise
  aiServiceInitializationPromise = (async () => {
    try {
      console.log('[API] Creating new AI service instance...');
      
      // Create the AI service instance
      console.log('[API] Calling createAiService()...');
      const service = await createAiService();
      console.log('[API] createAiService() completed');
      
      if (!service) {
        throw new Error('createAiService() returned undefined');
      }
      
      // Log available methods for debugging
      const methods = [];
      let current = service;
      while (current && current !== Object.prototype) {
        const props = Object.getOwnPropertyNames(current)
          .filter(prop => typeof current[prop] === 'function' && prop !== 'constructor');
        methods.push(...props);
        current = Object.getPrototypeOf(current);
      }
      
      const uniqueMethods = [...new Set(methods)];
      console.log('[API] AI service methods:', uniqueMethods);
      
      // Verify chat method exists and is a function
      if (typeof service.chat !== 'function') {
        const error = new Error(`AI service is missing required 'chat' method. Available methods: ${uniqueMethods.join(', ')}`);
        error.availableMethods = uniqueMethods;
        throw error;
      }
      
      // Perform a health check (non-blocking)
      service.checkHealth()
        .then(isHealthy => {
          if (!isHealthy) {
            console.warn('[API] AI service health check failed');
          } else {
            console.log('[API] AI service health check passed');
          }
        })
        .catch(healthError => {
          console.warn('[API] AI service health check failed:', healthError);
        });
      
      // Store the initialized service
      aiServiceInstance = service;
      isAiServiceInitialized = true;
      aiServiceInitializationError = null;
      
      console.log('[API] AI service initialized successfully');
      
      return service;
    } catch (error) {
      console.error('[API] Failed to initialize AI service:', error);
      aiServiceInitializationError = error;
      
      // Add retry logic for transient errors
      if (error.message.includes('timeout') || error.message.includes('connection')) {
        console.log('[API] Will retry AI service initialization after delay...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return initializeAiService({ retry: true });
      }
      
      throw error;
    } finally {
      // Reset the initialization promise so we can retry if needed
      if (!retry) {
        aiServiceInitializationPromise = null;
      }
    }
  })();
  
  return aiServiceInitializationPromise;
};

// Create a proxy for the AI service that handles initialization
const aiServiceProxy = new Proxy({}, {
  get(target, prop) {
    // Special handling for 'then' to support await
    if (prop === 'then') {
      return undefined;
    }
    
    // If the property exists on the target, return it
    if (prop in target) {
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    }
    
    // If the AI service is already initialized, try to get the property from it
    if (isAiServiceInitialized && aiServiceInstance) {
      const value = aiServiceInstance[prop];
      if (typeof value === 'function') {
        return value.bind(aiServiceInstance);
      }
      return value;
    }
    
    // If we get here, the property doesn't exist on the target or the AI service isn't initialized yet
    // Return a function that will wait for initialization and then call the method
    return async function(...args) {
      try {
        // Wait for the AI service to be initialized
        const service = await initializeAiService();
        
        // Check if the method exists on the service
        if (typeof service[prop] !== 'function') {
          throw new Error(`Method '${prop}' does not exist on AI service`);
        }
        
        // Call the method with the provided arguments
        return service[prop](...args);
      } catch (error) {
        console.error(`[API] Error accessing AI service method '${prop}':`, error);
        throw error;
      }
    };
  },
  
  // Handle property existence checks
  has(target, prop) {
    // If the AI service is initialized, check if the property exists on it
    if (isAiServiceInitialized && aiServiceInstance) {
      return prop in aiServiceInstance || prop in target;
    }
    // Otherwise, assume the property exists (will be checked when accessed)
    return true;
  },
  
  // Handle Object.keys() and similar operations
  ownKeys() {
    // Return a list of all available methods on the AI service
    if (aiServiceInstance) {
      return Reflect.ownKeys(aiServiceInstance)
        .filter(prop => typeof aiServiceInstance[prop] === 'function' && prop !== 'constructor');
    }
    return [];
  },
  
  // Handle property enumeration
  getOwnPropertyDescriptor(target, prop) {
    // If the AI service is initialized, get the property descriptor from it
    if (isAiServiceInitialized && aiServiceInstance && prop in aiServiceInstance) {
      return Object.getOwnPropertyDescriptor(aiServiceInstance, prop);
    }
    
    // Otherwise, return a default descriptor
    return {
      configurable: true,
      enumerable: true,
      writable: true
    };
  }
});

// Initialize AI service immediately
initializeAiService().catch(console.error);

// Debug log to verify token methods are imported
console.log('API Module - Token methods:', {
  setAuthToken: typeof token.setAuthToken,
  getAuthToken: typeof token.getAuthToken,
  clearAuthToken: typeof token.clearAuthToken,
  validateToken: typeof token.validateToken,
  isAuthenticated: typeof token.isAuthenticated
});

/**
 * API Client Class
 * Centralized API client with proper method binding
 */
class ApiClient {
  constructor() {
    // Core modules
    // Initialize core modules with method binding
    this.auth = auth;
    
    // Bind projects methods to ensure proper 'this' context
    this.projects = {};
    Object.entries(projects).forEach(([key, value]) => {
      if (typeof value === 'function') {
        this.projects[key] = value.bind(this);
      } else {
        this.projects[key] = value;
      }
    });
    
    this.files = files;
    this.templates = templates;
    
        // Initialize AI service with proxy
    // Use Object.defineProperty to make it non-enumerable
    Object.defineProperty(this, 'ai', {
      get: () => {
        // This will be called every time the property is accessed
        if (!isAiServiceInitialized || !aiServiceInstance) {
          console.warn('[API] AI service accessed before initialization');
        }
        return aiServiceProxy;
      },
      enumerable: false,
      configurable: true
    });
    
    // Also add a method to check if AI is available
    this.isAiAvailable = async () => {
      if (!isAiServiceInitialized || !aiServiceInstance) {
        try {
          await initializeAiService();
          return true;
        } catch (error) {
          console.error('[API] AI service not available:', error);
          return false;
        }
      }
      return true;
    };
    
    // Add a method to wait for AI service to be ready
    this.waitForAiService = async () => {
      if (isAiServiceInitialized && aiServiceInstance) {
        return aiServiceInstance;
      }
      return new Promise((resolve, reject) => {
        const check = () => {
          if (isAiServiceInitialized && aiServiceInstance) {
            resolve(aiServiceInstance);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
        
        // Add a timeout
        setTimeout(() => {
          if (!isAiServiceInitialized || !aiServiceInstance) {
            reject(new Error('Timeout waiting for AI service to initialize'));
          }
        }, 5000);
      });
    };
    
    console.log('[API] AI service proxy attached to API client');
    
    // Debug log to verify projects methods are properly bound
    console.log('[API] Projects methods:', {
      methods: Object.keys(this.projects).filter(k => typeof this.projects[k] === 'function'),
      hasGetProjects: typeof this.projects.getProjects === 'function'
    });
    
    // Bind all methods to ensure proper 'this' context
    this.setAuthToken = this.setAuthToken.bind(this);
    this.getAuthToken = this.getAuthToken.bind(this);
    this.clearAuthToken = this.clearAuthToken.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
    this.validateToken = this.validateToken.bind(this);
    
    // Bind auth methods
    this.login = this.wrapMethod('login', auth.login);
    this.logout = this.wrapMethod('logout', auth.logout);
    this.checkAuth = this.wrapMethod('checkAuth', auth.checkAuth);
    this.getCurrentUser = this.wrapMethod('getCurrentUser', auth.getCurrentUser);
    this.onAuthStateChanged = this.wrapMethod('onAuthStateChanged', auth.onAuthStateChanged);
  }
  
  // Helper to wrap methods with error handling
  wrapMethod(name, method) {
    if (typeof method !== 'function') {
      console.warn(`Method ${name} is not a function`);
      return () => Promise.reject(new Error(`${name} is not implemented`));
    }
    return method.bind(this);
  }
  
  // Auth token methods
  async setAuthToken(token, remember = false) {
    console.log('API.setAuthToken called');
    if (typeof token.setAuthToken === 'function') {
      return token.setAuthToken(token, remember);
    }
    throw new Error('setAuthToken is not available');
  }
  
  getAuthToken() {
    console.log('API.getAuthToken called');
    if (typeof token.getAuthToken === 'function') {
      return token.getAuthToken();
    }
    console.error('getAuthToken is not available');
    return null;
  }
  
  clearAuthToken() {
    console.log('API.clearAuthToken called');
    if (typeof token.clearAuthToken === 'function') {
      return token.clearAuthToken();
    }
    console.error('clearAuthToken is not available');
    return false;
  }
  
  isAuthenticated() {
    if (typeof token.isAuthenticated === 'function') {
      return token.isAuthenticated();
    }
    console.warn('isAuthenticated is not available');
    return false;
  }
  
  validateToken(tokenToValidate) {
    if (typeof token.validateToken === 'function') {
      return token.validateToken(tokenToValidate);
    }
    console.warn('validateToken is not available');
    return Promise.resolve(false);
  }
  
  // Initialize method
  init(config = {}) {
    console.log('API initialized with config:', config);
    // Initialize modules if they have an init method
    [this.auth, this.projects, this.files, this.templates].forEach(module => {
      if (module && typeof module.init === 'function') {
        module.init(config);
      }
    });
    return this;
  }
  
  // Debug method to check available methods
  debug() {
    return {
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(this))
        .filter(prop => typeof this[prop] === 'function' && prop !== 'constructor')
        .sort(),
      modules: {
        auth: !!this.auth,
        projects: !!this.projects,
        files: !!this.files,
        templates: !!this.templates
      }
    };
  }
}

// Create the singleton instance
const api = new ApiClient();

// Debug log the API instance
console.log('API instance created with methods:', Object.keys(api));

// Export the singleton instance as default
export default api;

// Export the API object with direct method references
export const apiObject = {
  // Core modules
  auth,
  projects,
  files,
  templates,
  
  // Auth methods - using directly imported implementations
  setAuthToken: (token, remember) => {
    console.log('API.setAuthToken called');
    if (typeof setAuthTokenImpl === 'function') {
      return setAuthTokenImpl(token, remember);
    }
    console.error('setAuthToken is not a function');
    return false;
  },
  
  getAuthToken: () => {
    console.log('API.getAuthToken called');
    if (typeof getAuthTokenImpl === 'function') {
      return getAuthTokenImpl();
    }
    console.error('getAuthToken is not a function');
    return null;
  },
  
  clearAuthToken: () => {
    console.log('API.clearAuthToken called');
    if (typeof clearAuthTokenImpl === 'function') {
      return clearAuthTokenImpl();
    }
    console.error('clearAuthToken is not a function');
    return false;
  },
  
  isAuthenticated: () => {
    if (typeof isAuthenticatedImpl === 'function') {
      return isAuthenticatedImpl();
    }
    console.warn('isAuthenticated is not a function');
    return false;
  },
  
  getCurrentUser: () => {
    if (typeof getCurrentUser === 'function') {
      return getCurrentUser();
    }
    console.warn('getCurrentUser is not a function');
    return null;
  },
  
  onAuthStateChanged: (callback) => {
    console.log('API.onAuthStateChanged called');
    if (typeof onAuthStateChanged === 'function') {
      return onAuthStateChanged(callback);
    }
    console.warn('onAuthStateChanged is not a function');
    return () => {}; // Return empty unsubscribe function
  },
  
  login: typeof login === 'function' ? login : (() => {
    console.warn('login not implemented');
    return Promise.reject(new Error('Login not implemented'));
  }),
  
  logout: typeof logout === 'function' ? logout : (() => {
    console.warn('logout not implemented');
    return Promise.resolve();
  }),
  
  checkAuth: typeof checkAuth === 'function' ? checkAuth : (() => {
    console.warn('checkAuth not implemented');
    return Promise.resolve({ isAuthenticated: false });
  }),
  
  // Initialize method
  init(config = {}) {
    console.log('API.init called with config:', config);
    
    // Initialize auth if available
    if (typeof auth.init === 'function') {
      auth.init(config);
    }
    
    // Initialize other modules if needed
    [projects, files, templates].forEach(module => {
      if (module.init && typeof module.init === 'function') {
        module.init(config);
      }
    });
    
    return this;
  },
  
  // Add a debug method to check available methods
  debug() {
    return {
      authMethods: Object.keys(auth),
      apiMethods: Object.keys(api),
      hasClearAuthToken: 'clearAuthToken' in auth,
      clearAuthToken: typeof auth.clearAuthToken,
      windowApi: typeof window !== 'undefined' ? window.api : undefined
    };
  }
};

// Debug log the API object
console.log('API object created', {
  apiMethods: Object.keys(api),
  hasClearAuthToken: 'clearAuthToken' in api,
  clearAuthToken: typeof api.clearAuthToken,
  authModule: auth
});

// Debug log the API object
console.log('API object created', {
  apiMethods: Object.keys(api),
  hasClearAuthToken: 'clearAuthToken' in api,
  clearAuthToken: typeof api.clearAuthToken,
  authModule: auth
});

// Make the API available globally for debugging
if (typeof window !== 'undefined') {
  window.api = api;
  console.log('API attached to window.api', {
    methods: Object.keys(api),
    hasClearAuthToken: 'clearAuthToken' in api,
    clearAuthToken: typeof api.clearAuthToken
  });
}

// Re-export all modules for direct import if needed
export { auth, projects, files, templates, ai as aiService };
